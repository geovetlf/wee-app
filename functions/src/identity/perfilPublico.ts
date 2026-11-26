/*
 * LO PÚBLICO DE UN PERFIL, Y SOLO ESO: `publicProfiles/{id}` (seguridad de `users`, 2026-10-07).
 *
 * `users/{id}` mezclaba el perfil social con lo de la cuenta —el saldo de Credits, el país, el idioma,
 * `linkedAccountId` (que une el Perfil Weë seudónimo con la cuenta real), las elecciones del avatar y, en
 * documentos antiguos, email, nombre real y fecha de nacimiento— y lo leía y LISTABA cualquiera sin sesión.
 * Firestore no proyecta campos por reglas: quien puede leer un documento lo lee entero. Así que lo público se
 * copia, campo por campo y con lista BLANCA, a una colección aparte que es lo único que ven los demás, y
 * `users` queda para su dueño y para el servidor (Admin SDK, por encima de las reglas).
 *
 * Nada se mueve ni se borra de `users`: el Credit Engine sigue escribiendo `creditsBalance` donde siempre y
 * cada lector del servidor sigue leyendo donde siempre. Esto solo AÑADE la copia pública.
 *
 * Un campo nuevo NO se publica por defecto: hay que añadirlo aquí a sabiendas.
 *
 * LO QUE ESTO NO OCULTA (deuda declarada, docs/DECISIONES-PENDIENTES.md): la copia no lleva `linkedAccountId`,
 * pero el id y el `uid` de un Perfil Weë son `hidi_<uid de la cuenta>`, y el Perfil Real usa ese mismo uid; así
 * que quien lea las dos copias públicas sigue pudiendo unir las dos caras. No es seudonimato: arreglarlo exige
 * migrar los identificadores `hidi_`, que no se renombran sin migración.
 *
 * Despliegue por fases: esta copia y su relleno van ANTES de cerrar la lectura de `users`
 * (ops/despliegue/cierre-users.mjs).
 */
import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { sanitizeForLog } from '../engine/sanitize';

export const COLECCION_PERFILES_PUBLICOS = 'publicProfiles';

/** Lo que las pantallas sociales pintan de OTRA persona (tarjetas, perfil, búsqueda, avisos, ËContact). */
export const CAMPOS_PUBLICOS_DEL_PERFIL = Object.freeze([
  'uid', 'entityId', 'profileType',
  'displayName', 'username', 'bio', 'website', 'verified',
  'photoURL', 'photoURLThumbnail', 'coverPhotoURL', 'bannerURL', 'avatarType', 'avatarId',
  'followers', 'following', 'posts',
  'createdAt',
] as const);

/** Pura: la proyección pública de un documento de `users`. Lo que no está en la lista no pasa. */
export const proyectarPerfilPublico = (datos: Record<string, unknown> | null | undefined): Record<string, unknown> | null => {
  if (!datos || typeof datos !== 'object') return null;
  if (typeof datos.uid !== 'string' || !datos.uid) return null;
  const publico: Record<string, unknown> = {};
  for (const campo of CAMPOS_PUBLICOS_DEL_PERFIL) {
    if (datos[campo] !== undefined) publico[campo] = datos[campo];
  }
  return publico;
};

/**
 * Forma CANÓNICA de un valor para compararlo: las claves de cada objeto ordenadas (Firestore no garantiza el orden
 * en que devuelve los campos) y los Timestamp como segundos + nanosegundos. Así «ya coincide» no depende del orden.
 */
const canonico = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === 'object') {
    const ts = v as { seconds?: unknown; nanoseconds?: unknown; toMillis?: unknown };
    if (typeof ts.toMillis === 'function' && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
      return { $ts: [ts.seconds, ts.nanoseconds] };
    }
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, canonico(o[k])]));
  }
  return v;
};

/** Mismo contenido (comparación determinista, sin depender del orden de las claves). */
export const mismoContenido = (a: Record<string, unknown> | null | undefined, b: Record<string, unknown> | null | undefined): boolean =>
  JSON.stringify(canonico(a ?? null)) === JSON.stringify(canonico(b ?? null));

/**
 * Pura (la usa scripts/rellenar-perfiles-publicos.mjs): qué copias hay que sincronizar, de una lectura de `users`
 * y otra de `publicProfiles` como pares [id, datos]. Compara de forma canónica; los perfiles sin uid no tienen copia.
 */
export const planDeRelleno = (
  usuarios: ReadonlyArray<readonly [string, Record<string, unknown>]>,
  publicos: ReadonlyArray<readonly [string, Record<string, unknown>]>,
): { ids: string[]; sinUid: number; conUid: number; huerfanos: number; publicos: number } => {
  const yaHay = new Map(publicos.map(([id, datos]) => [id, datos]));
  const conPerfil = new Set<string>();
  let sinUid = 0;
  const ids: string[] = [];
  for (const [id, datos] of usuarios) {
    const p = proyectarPerfilPublico(datos);
    if (!p) { sinUid++; continue; }
    conPerfil.add(id);
    if (mismoContenido(yaHay.get(id) ?? null, p)) continue;
    ids.push(id);
  }
  /*
   * Las copias HUÉRFANAS (en publicProfiles sin un perfil con uid en users) también entran: la sincronización las
   * borra dentro de su transacción, que relee users/{id}; si el espejo acaba de crear ese perfil, escribe su copia
   * en vez de borrarla.
   */
  let huerfanos = 0;
  for (const [id] of publicos) {
    if (conPerfil.has(id)) continue;
    huerfanos++;
    ids.push(id);
  }
  return { ids, sinUid, conUid: conPerfil.size, huerfanos, publicos: publicos.length };
};

/**
 * Pura: ¿el relleno dejó publicProfiles exactamente igual a users? Exige perfiles con uid (> 0), los mismos
 * recuentos, la copia al día de cada perfil y CERO huérfanas. Cualquier otra cosa es un fallo con su motivo: nunca
 * «OK» por defecto.
 */
export const verificarRelleno = (
  usuarios: ReadonlyArray<readonly [string, Record<string, unknown>]>,
  publicos: ReadonlyArray<readonly [string, Record<string, unknown>]>,
): { ok: boolean; motivos: string[]; conUid: number; publicos: number; desfasadas: number; huerfanos: number } => {
  const plan = planDeRelleno(usuarios, publicos);
  const desfasadas = plan.ids.length - plan.huerfanos;
  const motivos: string[] = [];
  if (plan.conUid <= 0) motivos.push('no hay perfiles con uid en users');
  if (plan.publicos !== plan.conUid) motivos.push('los recuentos de users (con uid) y publicProfiles no coinciden');
  if (desfasadas > 0) motivos.push('hay perfiles sin su copia pública al día');
  if (plan.huerfanos > 0) motivos.push('hay copias públicas sin perfil en users');
  return { ok: motivos.length === 0, motivos, conUid: plan.conUid, publicos: plan.publicos, desfasadas, huerfanos: plan.huerfanos };
};

/** Lo mínimo de Firestore que usa la sincronización (el Admin SDK lo cumple; las pruebas, un doble). */
interface DocLeido { exists: boolean; data(): Record<string, unknown> | undefined }
interface TxMinima {
  get(ref: unknown): Promise<DocLeido>;
  set(ref: unknown, datos: Record<string, unknown>): unknown;
  delete(ref: unknown): unknown;
}
export interface DbMinima {
  collection(nombre: string): { doc(id: string): unknown };
  runTransaction<T>(fn: (tx: TxMinima) => Promise<T>): Promise<T>;
}

export type ResultadoDeSincronizacion = 'igual' | 'escrita' | 'borrada';

/**
 * LA ÚNICA FORMA DE ESCRIBIR UNA COPIA PÚBLICA (la usan el espejo y el relleno). Dentro de una transacción relee
 * `users/{id}` —el estado ACTUAL, no el de un evento ni el de una instantánea— y su copia, y escribe solo si
 * difieren. Como siempre se proyecta lo que hay ahora, un evento fuera de orden, un reintento o un relleno que corre
 * a la vez que el espejo no pueden dejar una copia vieja: el último en confirmar escribe el estado más reciente, y la
 * transacción se repite sola si `users/{id}` cambia mientras tanto. Idempotente.
 */
export const sincronizarPerfilPublico = (db: DbMinima, perfilId: string): Promise<ResultadoDeSincronizacion> =>
  db.runTransaction(async (tx) => {
    const perfilRef = db.collection('users').doc(perfilId);
    const copiaRef = db.collection(COLECCION_PERFILES_PUBLICOS).doc(perfilId);
    const perfil = await tx.get(perfilRef);
    const copia = await tx.get(copiaRef);
    const deseada = perfil.exists ? proyectarPerfilPublico(perfil.data()) : null;
    const actual = copia.exists ? (copia.data() ?? null) : null;
    if (mismoContenido(deseada, actual)) return 'igual';
    /* Sin `merge`: un campo que deja de ser público desaparece de la copia. */
    if (deseada) { tx.set(copiaRef, deseada); return 'escrita'; }
    tx.delete(copiaRef);
    return 'borrada';
  });

/** Códigos gRPC de Firestore que son pasajeros: se reintenta. El resto (p. ej. un permiso) no se arregla reintentando. */
const RECUPERABLES = new Set([2, 4, 8, 10, 13, 14, 'unknown', 'deadline-exceeded', 'resource-exhausted', 'aborted', 'internal', 'unavailable',
  'UNKNOWN', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED', 'ABORTED', 'INTERNAL', 'UNAVAILABLE']);
export const esErrorRecuperable = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  return code !== undefined && RECUPERABLES.has(code as never);
};

/**
 * Sincroniza una copia con reintentos ACOTADOS (la usa el relleno): un error pasajero se reintenta hasta `intentos`
 * veces en total; uno permanente, o el último pasajero, se devuelve como 'fallida' sin más vueltas. Nunca en bucle.
 */
export const sincronizarConReintento = async (
  db: DbMinima,
  perfilId: string,
  { intentos = 3, esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) }:
    { intentos?: number; esperar?: (ms: number) => Promise<void> } = {},
): Promise<ResultadoDeSincronizacion | 'fallida'> => {
  for (let i = 1; ; i++) {
    try {
      return await sincronizarPerfilPublico(db, perfilId);
    } catch (error) {
      if (!esErrorRecuperable(error) || i >= intentos) return 'fallida';
      await esperar(200 * 2 ** (i - 1));
    }
  }
};

/*
 * EL ESPEJO. Mantiene `publicProfiles/{id}` igual a la proyección ACTUAL de `users/{id}` (relee el documento: no se
 * fía del payload del evento, que puede llegar fuera de orden); si el perfil desaparece, su copia pública también
 * (borra solo la COPIA, nunca el perfil). Un error pasajero se registra saneado y SE RELANZA para que la plataforma
 * reintente (`retry: true`); uno que no se arregla reintentando se registra saneado y no se repite en bucle: la
 * copia la repara el relleno (scripts/rellenar-perfiles-publicos.mjs), que usa la misma sincronización. Un fallo
 * aquí nunca rompe la escritura del perfil: es otro proceso.
 */
/** Lo que el espejo lee del evento (el de `onDocumentWritten`; las pruebas pasan uno de mentira). */
export interface EventoDePerfil {
  params: { perfilId: string };
  data?: {
    before?: { exists: boolean; data(): Record<string, unknown> | undefined };
    after?: { exists: boolean; data(): Record<string, unknown> | undefined };
  };
}

/** El cuerpo del espejo, separado del disparador para probarlo con un Firestore de mentira. */
export const alEscribirPerfil = async (event: EventoDePerfil, db: DbMinima): Promise<null> => {
  const perfilId = event.params.perfilId;
  const antes = proyectarPerfilPublico(event.data?.before?.data());
  const despues = proyectarPerfilPublico(event.data?.after?.data());
  /* Lo público no cambió en ESTE evento (p. ej. un cobro de Credits): nada que copiar. */
  if (event.data?.before?.exists && event.data?.after?.exists && mismoContenido(antes, despues)) return null;
  try {
    /* Relee `users/{id}`: el payload del evento puede ser viejo (eventos fuera de orden, reintentos). */
    await sincronizarPerfilPublico(db, perfilId);
  } catch (error) {
    const recuperable = esErrorRecuperable(error);
    console.error(`Perfil público: no se pudo sincronizar la copia (${recuperable ? 'se reintenta' : 'no recuperable; la repara el relleno'})`,
      sanitizeForLog(error, 300));
    if (recuperable) throw error;
  }
  return null;
};

export const espejoDelPerfilPublico = onDocumentWritten(
  { document: 'users/{perfilId}', region: 'us-central1', retry: true },
  (event) => alEscribirPerfil(event as unknown as EventoDePerfil, admin.firestore() as unknown as DbMinima),
);
