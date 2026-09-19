/*
 * ENCUESTAS DE WEË — el único punto de escritura de votos (Bloque A).
 * ---------------------------------------------------------------------------
 *
 * Una encuesta es un campo del post, no una colección aparte: `posts/{id}.poll`.
 * Así hereda gratis todo lo demás —`destinations[]`, paginación, muros de
 * sección— sin que nada de eso tenga que enterarse de que existen encuestas.
 *
 * Los contadores viven en el post y NADIE los escribe desde el cliente: las
 * reglas de Firestore prohíben tocar `poll` incluso al autor. La única puerta
 * es la callable `votePoll`, que corre con el Admin SDK y por tanto pasa por
 * encima de las reglas. Lo que el cliente manda es una intención —"quiero votar
 * esta opción de este post"—; todo lo demás lo decide el servidor.
 *
 * El voto de cada persona es un documento propio:
 *
 *     posts/{postId}/pollVotes/{voterUid}   →   { optionId, createdAt, updatedAt }
 *
 * y nada más. No hay arrays `votedBy` públicos dentro del post: quién votó qué
 * solo lo puede leer esa misma persona. Además el post deja de engordar con
 * cada voto, que era el otro problema de guardarlos dentro.
 *
 * UNA PERSONA = UN VOTO
 * ---------------------
 * `voterUid` es SIEMPRE `request.auth.uid`: la cuenta de Firebase Auth. Los
 * perfiles Weë (`hidi_<uid>`) no son personas distintas: son la otra cara de la
 * misma cuenta —así los crea `usersService`, que graba `linkedAccountId`
 * apuntando a la cuenta raíz, y así lo comprueban ya las reglas de `users`—.
 * Las dos comparten un único voto porque comparten una única cuenta. El cliente no envía identidad: no se le pregunta, y por eso
 * no puede mentir.
 *
 * La lógica vive en `createPollEngine` para poder ejecutarla de verdad en los
 * tests (`functions/test/encuestas.test.mjs`) con un Firestore de mentira,
 * igual que hace el Credit Engine.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

// ─── Modelo ──────────────────────────────────────────────────────────────────

/** Una opción de encuesta del modelo nuevo: el id es lo que se vota, no la posición. */
export interface PollOptionModel {
  id: string;
  text: string;
}

export interface PollModel {
  question?: string;
  options?: PollOptionModel[];
  /** Recuento por id de opción. Ausente = todo a cero. */
  counts?: Record<string, number>;
  totalVotes?: number;
  endsAt?: unknown;
  /** Política aprobada: se puede cambiar el voto mientras la encuesta esté abierta. */
  allowChange?: boolean;
  /** Las encuestas históricas traen otros campos dentro de cada opción. */
  [extra: string]: unknown;
}

export interface VotoPrevio {
  optionId: string;
}

/** Motivos por los que un voto no se acepta. Cada uno tiene su mensaje en español. */
export type MotivoRechazo =
  | 'sin-encuesta'
  | 'encuesta-invalida'
  | 'encuesta-antigua'
  | 'opcion-inexistente'
  | 'encuesta-cerrada'
  | 'ya-votaste';

export type DecisionVoto =
  | { ok: false; motivo: MotivoRechazo }
  | {
      ok: true;
      /** true si la persona ya había votado y está cambiando su voto. */
      cambio: boolean;
      /** Opción que deja de tener su voto, si cambia. */
      anterior: string | null;
      /** Cuánto se mueve cada contador. Vacío = no hay nada que escribir. */
      incrementos: Record<string, number>;
      /** +1 en el primer voto, 0 al cambiar. Nunca negativo. */
      deltaTotal: number;
    };

export const MENSAJES: Record<MotivoRechazo, string> = {
  'sin-encuesta': 'Esta publicación no tiene encuesta.',
  'encuesta-invalida': 'Esta encuesta no es válida.',
  'encuesta-antigua': 'Esta encuesta es de una versión anterior de Weë y ya no admite votos.',
  'opcion-inexistente': 'Esa opción no existe en esta encuesta.',
  'encuesta-cerrada': 'Esta encuesta ya ha finalizado.',
  'ya-votaste': 'Ya has votado en esta encuesta.',
};

const CODIGOS: Record<MotivoRechazo, 'failed-precondition' | 'invalid-argument'> = {
  'sin-encuesta': 'failed-precondition',
  'encuesta-invalida': 'failed-precondition',
  'encuesta-antigua': 'failed-precondition',
  'opcion-inexistente': 'invalid-argument',
  'encuesta-cerrada': 'failed-precondition',
  'ya-votaste': 'failed-precondition',
};

// ─── Utilidades ──────────────────────────────────────────────────────────────

/**
 * Milisegundos de un `endsAt`, venga como venga: Timestamp del Admin SDK,
 * Timestamp serializado, Date o número. Devuelve null si no se entiende, y una
 * fecha que no se entiende cierra la encuesta en vez de abrirla.
 */
export const milisDe = (valor: unknown): number | null => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor !== 'object') return null;
  const obj = valor as Record<string, any>;
  if (typeof obj.toMillis === 'function') {
    const ms = obj.toMillis();
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
  }
  const seg = typeof obj.seconds === 'number' ? obj.seconds : obj._seconds;
  if (typeof seg === 'number' && Number.isFinite(seg)) {
    const nanos = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : obj._nanoseconds;
    return seg * 1000 + Math.floor((typeof nanos === 'number' ? nanos : 0) / 1e6);
  }
  return null;
};

/**
 * Una encuesta histórica es la que guarda los votos dentro de cada opción
 * (`votes` / `votedBy`) en vez de en `counts`. No se migran ni se modifican:
 * quedan en solo lectura, que además es lo único honesto —nunca llegaron a
 * funcionar para terceros, porque las reglas bloqueaban la escritura—.
 */
export const esEncuestaHistorica = (poll: PollModel): boolean => {
  const opciones = poll.options;
  if (!Array.isArray(opciones) || opciones.length === 0) return false;
  return opciones.some((opt) => {
    const o = opt as unknown as Record<string, unknown> | null;
    if (!o) return true;
    return typeof o.id !== 'string' || o.id === '' || Array.isArray(o.votedBy) || typeof o.votes === 'number';
  });
};

const cuenta = (counts: Record<string, number> | undefined, id: string): number => {
  const n = counts ? counts[id] : 0;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

// ─── La decisión, sin Firestore de por medio ─────────────────────────────────

/**
 * Decide qué hay que mover para registrar un voto. No escribe nada: devuelve
 * los incrementos, y quien la llama los aplica dentro de una transacción.
 *
 * Aquí está todo lo que la UI NO puede validar por su cuenta: que la opción
 * exista de verdad, que la encuesta siga abierta según el reloj del servidor y
 * que la persona no vote dos veces.
 */
export const decidirVoto = (args: {
  poll: PollModel | null | undefined;
  votoPrevio: VotoPrevio | null;
  optionId: string;
  ahoraMs: number;
}): DecisionVoto => {
  const { poll, votoPrevio, optionId, ahoraMs } = args;

  if (!poll || typeof poll !== 'object') return { ok: false, motivo: 'sin-encuesta' };

  const opciones = poll.options;
  if (!Array.isArray(opciones) || opciones.length === 0) return { ok: false, motivo: 'encuesta-invalida' };
  if (esEncuestaHistorica(poll)) return { ok: false, motivo: 'encuesta-antigua' };

  // La opción se identifica por id, nunca por posición: un índice fuera de
  // rango no es un voto raro, es una opción que no existe.
  const existe = typeof optionId === 'string' && optionId !== '' && opciones.some((opt) => opt && opt.id === optionId);
  if (!existe) return { ok: false, motivo: 'opcion-inexistente' };

  // El reloj es el del servidor. Que la UI desactive los botones está bien,
  // pero no es una defensa.
  const finMs = milisDe(poll.endsAt);
  if (finMs === null || ahoraMs >= finMs) return { ok: false, motivo: 'encuesta-cerrada' };

  const permiteCambio = poll.allowChange !== false;

  if (!votoPrevio) {
    return { ok: true, cambio: false, anterior: null, incrementos: { [optionId]: 1 }, deltaTotal: 1 };
  }

  if (!permiteCambio) return { ok: false, motivo: 'ya-votaste' };

  // Volver a votar lo mismo no mueve ningún contador: se acepta y no se escribe.
  if (votoPrevio.optionId === optionId) {
    return { ok: true, cambio: true, anterior: votoPrevio.optionId, incrementos: {}, deltaTotal: 0 };
  }

  // Cambio de voto: una opción baja, la otra sube y el total no se mueve.
  const incrementos: Record<string, number> = {};
  incrementos[votoPrevio.optionId] = -1;
  incrementos[optionId] = 1;
  return { ok: true, cambio: true, anterior: votoPrevio.optionId, incrementos, deltaTotal: 0 };
};

// ─── El motor, con Firestore inyectado ───────────────────────────────────────

export interface PollDeps {
  db: () => any;
  /** Milisegundos del servidor. Dentro de una Cloud Function, `Date.now()` ya lo es. */
  ahora: () => number;
  /** Cómo se guarda una fecha. En producción, un Timestamp. */
  sello: (ms: number) => unknown;
}

export interface ResultadoVoto {
  optionId: string;
  cambio: boolean;
  counts: Record<string, number>;
  totalVotes: number;
}

export class PollError extends Error {
  constructor(public motivo: MotivoRechazo) {
    super(MENSAJES[motivo]);
    this.name = 'PollError';
  }
}

export class PostNoEncontrado extends Error {
  constructor() {
    super('Esta publicación ya no existe.');
    this.name = 'PostNoEncontrado';
  }
}

export const createPollEngine = (deps: PollDeps) => ({
  /**
   * Registra el voto de una persona. Todo dentro de una transacción: o se
   * escriben el voto y los contadores, o no se escribe nada. Bajo votos
   * simultáneos Firestore reintenta la transacción, así que la lectura de
   * `counts` sobre la que sumamos siempre es la buena.
   */
  vote: async (args: { postId: string; optionId: string; voterUid: string }): Promise<ResultadoVoto> => {
    const { postId, optionId, voterUid } = args;
    const db = deps.db();
    const postRef = db.collection('posts').doc(postId);
    const voteRef = postRef.collection('pollVotes').doc(voterUid);

    return db.runTransaction(async (tx: any) => {
      // Admin SDK: todas las lecturas antes que las escrituras.
      const postSnap = await tx.get(postRef);
      const voteSnap = await tx.get(voteRef);

      if (!postSnap.exists) throw new PostNoEncontrado();

      const post = (postSnap.data() || {}) as Record<string, any>;
      const poll = post.poll as PollModel | undefined;
      const votoGuardado = (voteSnap.exists ? voteSnap.data() : null) as Record<string, any> | null;
      const votoPrevio: VotoPrevio | null =
        votoGuardado && typeof votoGuardado.optionId === 'string' ? { optionId: votoGuardado.optionId } : null;

      const decision = decidirVoto({ poll, votoPrevio, optionId, ahoraMs: deps.ahora() });
      if (!decision.ok) throw new PollError(decision.motivo);

      // Los contadores se recalculan sobre lo leído en esta misma transacción y
      // nunca bajan de cero, pase lo que pase con los datos de partida.
      const counts: Record<string, number> = { ...((poll && poll.counts) || {}) };
      for (const [id, delta] of Object.entries(decision.incrementos)) {
        counts[id] = Math.max(0, cuenta(counts, id) + delta);
      }
      const totalPrevio =
        poll && typeof poll.totalVotes === 'number' && Number.isFinite(poll.totalVotes) ? poll.totalVotes : 0;
      const totalVotes = Math.max(0, totalPrevio + decision.deltaTotal);

      const ms = deps.ahora();
      const voto: Record<string, unknown> = { optionId, updatedAt: deps.sello(ms) };
      if (!votoPrevio) voto.createdAt = deps.sello(ms);

      tx.set(voteRef, voto, { merge: true });
      tx.update(postRef, { 'poll.counts': counts, 'poll.totalVotes': totalVotes });

      return { optionId, cambio: decision.cambio, counts, totalVotes };
    });
  },
});

/** Instancia de producción. `getFirestore()` va dentro: al Admin SDK lo inicializa `index.ts`. */
export const pollEngine = createPollEngine({
  db: () => getFirestore(),
  ahora: () => Date.now(),
  sello: (ms) => Timestamp.fromMillis(ms),
});

// ─── La callable ─────────────────────────────────────────────────────────────

const textoLimpio = (valor: unknown, maximo: number): string => {
  if (typeof valor !== 'string') return '';
  const s = valor.trim();
  return s.length > maximo ? '' : s;
};

/**
 * `votePoll({ postId, optionId })` — la ÚNICA forma de que un voto llegue a
 * Firestore. No acepta índices, no acepta contadores y no acepta identidad:
 * quién vota lo dice Firebase Auth, no el cliente.
 */
export const votePoll = onCall(OPTS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para votar.');
  const voterUid = request.auth.uid;

  const data = (request.data || {}) as { postId?: unknown; optionId?: unknown };
  const postId = textoLimpio(data.postId, 200);
  const optionId = textoLimpio(data.optionId, 200);
  if (!postId) throw new HttpsError('invalid-argument', 'Falta la publicación.');
  if (!optionId) throw new HttpsError('invalid-argument', 'Falta la opción.');

  try {
    return await pollEngine.vote({ postId, optionId, voterUid });
  } catch (error) {
    if (error instanceof PollError) throw new HttpsError(CODIGOS[error.motivo], error.message);
    if (error instanceof PostNoEncontrado) throw new HttpsError('not-found', error.message);
    if (error instanceof HttpsError) throw error;
    console.error('votePoll falló', error);
    throw new HttpsError('internal', 'No se pudo registrar tu voto. Inténtalo de nuevo.');
  }
});
