/*
 * WEETALK — EL BLOQUEO DE CONTACTOS (docs/WEETALK-BLOQUEO.md).
 * ---------------------------------------------------------------------------
 *
 * Decisiones DEFINITIVAS del dueño (2026-11-07), vinculantes:
 *
 *   1 · WeeTalk no inspecciona ni modera conversaciones privadas. Este archivo no lee NINGÚN mensaje: ni su texto, ni
 *       sus archivos, ni la colección `messages`. Decide con dos cosas: quién contacta y con quién.
 *   2 · El bloqueo es una herramienta de PRIVACIDAD, no de moderación. No crea reportes, ni casos, ni sanciones, y no
 *       toca el Moderation Core ni sus contratos (el «BLOCK» de la moderación es otra cosa: el desenlace de una revisión).
 *   3 · Se aplica a nivel de CUENTA y cubre las dos identidades, Real y Weë. Si A bloquea a B, B no puede contactar con
 *       NINGUNA identidad de A, y no lo evade cambiando de identidad.
 *   4 · Impide mensajes, conversaciones nuevas, solicitudes de ËContact y llamadas directas (si existen). Las solicitudes
 *       pendientes entre las dos cuentas se anulan.
 *   5 · Desbloquear deja volver a contactar según las reglas normales, sin restaurar las solicitudes anteriores.
 *   6 · No se revelan identidades alternativas: ninguna respuesta, lista, error ni aviso dice de qué cuenta es una cara,
 *       ni que existe otra. B no sabe que está bloqueada: nadie le avisa y no tiene lista.
 *
 * QUÉ PROTEGE EXACTAMENTE (la regla común, `puedeEscribir`)
 * --------------------------------------------------------
 * Una cuenta bloquea a otra DESDE una de sus caras y viendo una cara de la otra. Cada bloqueo guarda esa pareja como
 * una ENTRADA de la relación entre las dos cuentas (es lo que enseña la lista de quien bloquea):
 *
 *     entrada = { caraQueBloquea: a, caraBloqueada: b }
 *
 * Mientras la relación tenga al menos una entrada, el bloqueo es de CUENTA A CUENTA y en los DOS sentidos:
 *
 *   · NINGUNA cara de B contacta con NINGUNA cara de A (decisión 3). Cambiar de cara no lo evade.
 *   · NINGUNA cara de A contacta con NINGUNA cara de B, hasta que A desbloquee. Si A pudiera escribir desde su otra
 *     cara a la otra cara de B, la respuesta de B fallaría y le diría a B que esa cara es de quien la bloqueó: lo que
 *     la decisión 6 prohíbe. Y desbloquear es «volver a las reglas normales» (decisión 5): mientras dura, nadie habla.
 *
 * Lo que queda, y no se puede quitar con un bloqueo que funcione (docs/WEETALK-BLOQUEO.md § 8): quien PRUEBE a
 * escribir a perfiles sueltos verá que con uno no puede. Ese fallo es el genérico de siempre, nada lo nombra y ninguna
 * respuesta lleva la cuenta de nadie; el dueño eligió proteger todas las caras sabiendo que esa inferencia existe.
 *
 * Todo esto sale de UNA función pura, sin Firestore, y de ella sale también el índice que leen las reglas propuestas y
 * ËContact (`paresBloqueados`): lo que dice una lo dice el otro, por construcción, y las pruebas lo comprueban caso por
 * caso.
 *
 * DÓNDE SE CUMPLE (docs/WEETALK-BLOQUEO.md § 5)
 * ---------------------------------------------
 *   · En el servidor, ya: el push de un mensaje (`sendMessagePushNotification`) y el de los avisos de ËContact
 *     (`sendPushNotification`, solo `econtact_request` y `econtact_accepted`) no suenan; `requestEContact` y
 *     `acceptEContact` se niegan (econtact.ts, dentro de su transacción); y al bloquear se anulan las solicitudes
 *     pendientes entre las dos cuentas (abajo, `bloquear`).
 *   · Los mensajes, las conversaciones y los avisos los escribe el CLIENTE directamente, con `firestore.rules`. Que no
 *     se puedan escribir exige cambiar las reglas, y eso NO se ha aplicado: está PROPUESTO y revisado
 *     (ops/propuestas/weetalk-bloqueo/) y espera la autorización del dueño. Hasta entonces el bloqueo no impide que un
 *     mensaje o un aviso se guarden: solo que suenen.
 *
 * LAS CARAS DE UNA CUENTA se componen en un solo sitio, la frontera de compatibilidad
 * (`identidadesHeredadasDeLaCuenta`, identity/compatibilidad.ts), y siempre a partir de una cuenta que o es la de la
 * sesión o se ha LEÍDO de `users` con el resolutor canónico (`cuentaDeIdentidad`, que lee `linkedAccountId`). Nunca se
 * quita un prefijo para saber de quién es una cara.
 *
 *   weetalkBloqueos/{cuentaQueBloquea}~{cuentaBloqueada}   la relación y sus entradas (la verdad)
 *   weetalkBloqueosPorPar/{de}~{para}                      «la cara `de` no puede contactar con `para`» (derivado;
 *                                                          su nombre y su clave viven en bloqueosIndice.ts)
 *   weetalkBloqueosCupo/{cuenta}                           cuántas cuentas ha bloqueado (el tope)
 *
 * Las tres son SOLO del servidor: `firestore.rules` no las nombra, así que ningún cliente las lee ni las escribe.
 * Sin IA, sin Credits, sin proveedores.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { sanitizeForLog } from '../engine/sanitize';
import { identidadesHeredadasDeLaCuenta } from '../identity/compatibilidad';
import { CUENTA_REQUERIDA, esCuentaAutenticada } from '../identity/sesion';
import { PARES_BLOQUEADOS, SEPARADOR_DE_PAR, claveDePar } from './bloqueosIndice';
import { cuentaDeIdentidad, esIdentidadDePersona, idDeContacto, PerfilDeIdentidad } from './econtact';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

export const BLOQUEOS = 'weetalkBloqueos';
export const PARES = PARES_BLOQUEADOS;
export const CUPOS = 'weetalkBloqueosCupo';
/** Las relaciones de ËContact (econtact.ts). Aquí solo se ANULAN las pendientes entre dos cuentas al bloquear. */
export const ECONTACTS = 'econtacts';
const PERFILES = 'users';

/** Cuántas cuentas distintas puede bloquear una cuenta. Muy por encima de cualquier uso real; acota el abuso. */
export const MAX_CUENTAS_BLOQUEADAS = 1000;

const SEPARADOR = SEPARADOR_DE_PAR;

/** Los avisos que forman parte de una solicitud de ËContact: los únicos avisos que el bloqueo silencia (decisión 4). */
export const TIPOS_DE_AVISO_DE_ECONTACT: readonly string[] = Object.freeze(['econtact_request', 'econtact_accepted']);
export const esAvisoDeEContact = (tipo: unknown): boolean => typeof tipo === 'string' && TIPOS_DE_AVISO_DE_ECONTACT.includes(tipo);

// ─── El modelo ───────────────────────────────────────────────────────────────

export interface EntradaDeBloqueo {
  /** La cara con la que la cuenta bloqueó: queda PROTEGIDA. */
  caraQueBloquea: string;
  /** La cara de la otra cuenta que se vio y se bloqueó. Es la única que sale en la lista. */
  caraBloqueada: string;
  /** Milisegundos desde la época. */
  desde: number;
}

export interface RelacionDeBloqueo {
  cuentaQueBloquea: string;
  cuentaBloqueada: string;
  entradas: readonly EntradaDeBloqueo[];
}

/** Las caras de una cuenta. En producción, `identidadesHeredadasDeLaCuenta`; vacío si no es una cuenta. */
export type CarasDeLaCuenta = (cuenta: string) => readonly string[];

export interface CaraConCuenta {
  identidad: string;
  cuenta: string;
}

export const claveDeRelacion = (cuentaQueBloquea: string, cuentaBloqueada: string): string =>
  `${cuentaQueBloquea}${SEPARADOR}${cuentaBloqueada}`;

export { claveDePar };

const milisDe = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const conMillis = v as { toMillis?: () => unknown } | null;
  if (conMillis && typeof conMillis.toMillis === 'function') {
    const ms = conMillis.toMillis();
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : 0;
  }
  return 0;
};

/**
 * LO GUARDADO, LEÍDO CON DESCONFIANZA. La relación entre estas dos cuentas, o null.
 *
 * Solo cuentan las entradas cuyas dos caras son de verdad de las cuentas que dice el documento; las demás se
 * ignoran (no las escribe nadie más que este archivo, pero un documento que se contradice no decide nada).
 */
export const relacionGuardada = (
  datos: unknown,
  cuentaQueBloquea: string,
  cuentaBloqueada: string,
  carasDe: CarasDeLaCuenta,
): RelacionDeBloqueo | null => {
  if (!datos || typeof datos !== 'object') return null;
  const d = datos as { cuentaQueBloquea?: unknown; cuentaBloqueada?: unknown; entradas?: unknown };
  if (d.cuentaQueBloquea !== cuentaQueBloquea || d.cuentaBloqueada !== cuentaBloqueada || cuentaQueBloquea === cuentaBloqueada) return null;
  const propias = carasDe(cuentaQueBloquea);
  const ajenas = carasDe(cuentaBloqueada);
  if (!propias.length || !ajenas.length) return null;
  const entradas: EntradaDeBloqueo[] = [];
  for (const cruda of Array.isArray(d.entradas) ? d.entradas : []) {
    const e = (cruda && typeof cruda === 'object' ? cruda : {}) as { caraQueBloquea?: unknown; caraBloqueada?: unknown; desde?: unknown };
    if (typeof e.caraQueBloquea !== 'string' || !propias.includes(e.caraQueBloquea)) continue;
    if (typeof e.caraBloqueada !== 'string' || !ajenas.includes(e.caraBloqueada)) continue;
    if (entradas.some((x) => x.caraQueBloquea === e.caraQueBloquea && x.caraBloqueada === e.caraBloqueada)) continue;
    entradas.push({ caraQueBloquea: e.caraQueBloquea, caraBloqueada: e.caraBloqueada, desde: milisDe(e.desde) });
  }
  return entradas.length ? { cuentaQueBloquea, cuentaBloqueada, entradas } : null;
};

/** ¿Es esta relación, de verdad, la de `cuentaQueBloquea` hacia `cuentaBloqueada`, con al menos una entrada? */
const esRelacionEntre = (r: RelacionDeBloqueo | null, cuentaQueBloquea: string, cuentaBloqueada: string): boolean =>
  !!r && r.cuentaQueBloquea === cuentaQueBloquea && r.cuentaBloqueada === cuentaBloqueada && r.entradas.length > 0;

// ─── La regla común: ¿puede X contactar con Y? ───────────────────────────────

/*
 * `motivo` es para el servidor y para quien bloqueó (que ya lo sabe). Nunca se le dice a quien está bloqueado: para
 * él, si algún día una pantalla lo necesita, es el mismo «no se pudo enviar» de cualquier otro fallo.
 */
export type DecisionDeEscritura = { puede: true } | { puede: false; motivo: 'bloqueo-del-destino' | 'bloqueo-propio' };

const PUEDE: DecisionDeEscritura = Object.freeze({ puede: true as const });

/**
 * ¿PUEDE LA CARA `de` CONTACTAR CON LA CARA `para`? Pura, por CUENTAS, sin leer nada y sin mirar ningún mensaje.
 *
 * `bloqueoDelDestino` es la relación en la que la cuenta de `para` bloqueó a la de `de`; `bloqueoPropio`, la
 * contraria. Una relación que no hable de esas dos cuentas, en ese orden, no cuenta. Si cualquiera de las dos existe,
 * ninguna cara de una cuenta contacta con ninguna de la otra (decisiones 3 y 6): da igual desde qué cara se bloqueó y
 * qué cara se vio.
 */
export const puedeEscribir = (a: {
  de: CaraConCuenta;
  para: CaraConCuenta;
  bloqueoDelDestino: RelacionDeBloqueo | null;
  bloqueoPropio: RelacionDeBloqueo | null;
}): DecisionDeEscritura => {
  const { de, para } = a;
  /* Las dos caras de una misma persona no se bloquean entre sí. */
  if (de.cuenta === para.cuenta) return PUEDE;
  /* La cuenta de `para` bloqueó a la de `de`: ninguna cara de `de` le llega a ninguna de `para`. Cambiar de cara no lo evade. */
  if (esRelacionEntre(a.bloqueoDelDestino, para.cuenta, de.cuenta)) return { puede: false, motivo: 'bloqueo-del-destino' };
  /* Quien bloqueó tampoco contacta, desde ninguna de sus caras, con ninguna de la cuenta que bloqueó: hasta desbloquear. */
  if (esRelacionEntre(a.bloqueoPropio, de.cuenta, para.cuenta)) return { puede: false, motivo: 'bloqueo-propio' };
  return PUEDE;
};

/**
 * EL ÍNDICE QUE LEEN LAS REGLAS PROPUESTAS Y ËCONTACT: cada «`de` no puede contactar con `para`» de estas relaciones,
 * como `de~para`.
 *
 * Es la misma regla que `puedeEscribir`, escrita como conjunto: para dos caras de cuentas distintas,
 * `puedeEscribir(x → y).puede` es exactamente `!pares.includes(x~y)`. Una relación con entradas cierra los ocho pares
 * posibles entre sus dos cuentas (2 caras × 2 caras × 2 sentidos). Incluye la cara Weë de una cuenta aunque todavía no
 * exista: el día que la cree ya estará cubierta, que es lo que pide «cambiar de identidad no lo evade».
 */
export const paresBloqueados = (relaciones: readonly (RelacionDeBloqueo | null)[], carasDe: CarasDeLaCuenta): string[] => {
  const pares = new Set<string>();
  for (const r of relaciones) {
    if (!r || !esRelacionEntre(r, r.cuentaQueBloquea, r.cuentaBloqueada)) continue;
    for (const clave of paresPosibles(r.cuentaQueBloquea, r.cuentaBloqueada, carasDe)) pares.add(clave);
  }
  return [...pares].sort();
};

/** Todos los pares que pueden existir entre dos cuentas, en los dos sentidos: lo que se reescribe en cada cambio. */
export const paresPosibles = (cuentaA: string, cuentaB: string, carasDe: CarasDeLaCuenta): string[] => {
  const a = carasDe(cuentaA);
  const b = carasDe(cuentaB);
  if (!a.length || !b.length || cuentaA === cuentaB) return [];
  const todos = new Set<string>();
  for (const x of a) for (const y of b) {
    todos.add(claveDePar(x, y));
    todos.add(claveDePar(y, x));
  }
  return [...todos].sort();
};

// ─── ËContact: las solicitudes que se anulan al bloquear ─────────────────────

/**
 * LAS SOLICITUDES DE ËCONTACT QUE PUEDE HABER ENTRE DOS CUENTAS: una por pareja de caras, con el id que calcula
 * econtact.ts (`idDeContacto`, conmutativo). Son las únicas que se miran al bloquear: no hay consultas.
 */
export const solicitudesPosibles = (cuentaA: string, cuentaB: string, carasDe: CarasDeLaCuenta): string[] => {
  const a = carasDe(cuentaA);
  const b = carasDe(cuentaB);
  if (!a.length || !b.length || cuentaA === cuentaB) return [];
  const ids = new Set<string>();
  for (const x of a) for (const y of b) ids.add(idDeContacto(x, y));
  return [...ids].sort();
};

/**
 * ¿Hay que ANULAR este documento de `econtacts` al bloquear? Solo si es una solicitud PENDIENTE cuyas dos caras son
 * una de cada cuenta. Una conexión ya aceptada no se toca: no es una solicitud (docs/WEETALK-BLOQUEO.md § 9).
 */
export const esSolicitudPendienteEntre = (datos: unknown, carasA: readonly string[], carasB: readonly string[]): boolean => {
  if (!datos || typeof datos !== 'object') return false;
  const d = datos as { status?: unknown; users?: unknown };
  if (d.status !== 'pending' || !Array.isArray(d.users) || d.users.length !== 2) return false;
  const [x, y] = d.users as unknown[];
  if (typeof x !== 'string' || typeof y !== 'string') return false;
  return (carasA.includes(x) && carasB.includes(y)) || (carasB.includes(x) && carasA.includes(y));
};

// ─── Las transiciones, puras ─────────────────────────────────────────────────

/** Añade una entrada. Si ya estaba esa misma pareja de caras, la relación no cambia (idempotente). */
export const conEntrada = (
  r: RelacionDeBloqueo | null,
  cuentaQueBloquea: string,
  cuentaBloqueada: string,
  e: EntradaDeBloqueo,
): RelacionDeBloqueo => {
  const previas = r && r.cuentaQueBloquea === cuentaQueBloquea && r.cuentaBloqueada === cuentaBloqueada ? r.entradas : [];
  if (previas.some((x) => x.caraQueBloquea === e.caraQueBloquea && x.caraBloqueada === e.caraBloqueada)) {
    return { cuentaQueBloquea, cuentaBloqueada, entradas: previas };
  }
  return { cuentaQueBloquea, cuentaBloqueada, entradas: [...previas, e] };
};

/** Quita todas las entradas de esa cara bloqueada, desde cualquier cara de quien bloquea. null si no queda ninguna. */
export const sinCaraBloqueada = (r: RelacionDeBloqueo | null, caraBloqueada: string): RelacionDeBloqueo | null => {
  if (!r) return null;
  const quedan = r.entradas.filter((e) => e.caraBloqueada !== caraBloqueada);
  return quedan.length ? { ...r, entradas: quedan } : null;
};

// ─── Lo que ve quien bloquea ─────────────────────────────────────────────────

export interface ContactoBloqueado {
  /** La cara que se bloqueó, tal como se vio. Nunca la otra cara de esa persona, nunca su cuenta. */
  identidad: string;
  /** Las caras PROPIAS desde las que se bloqueó (información de quien mira, que ya la sabe). */
  desdeIdentidades: string[];
  /** Cuándo se bloqueó por primera vez (milisegundos). */
  desde: number;
}

/**
 * LA LISTA DE BLOQUEADOS DE UNA CUENTA. Una fila por cara bloqueada: si una cuenta bloqueó dos caras que resultan
 * ser de la misma persona, salen como dos filas, porque juntarlas le diría que son la misma. La cuenta bloqueada no
 * sale nunca.
 */
export const vistaDeLaLista = (relaciones: readonly (RelacionDeBloqueo | null)[], cuentaQueBloquea: string): ContactoBloqueado[] => {
  const porCara = new Map<string, { desde: number; desdeIdentidades: Set<string> }>();
  for (const r of relaciones) {
    if (!r || r.cuentaQueBloquea !== cuentaQueBloquea) continue;
    for (const e of r.entradas) {
      const fila = porCara.get(e.caraBloqueada) || { desde: e.desde, desdeIdentidades: new Set<string>() };
      fila.desde = Math.min(fila.desde, e.desde);
      fila.desdeIdentidades.add(e.caraQueBloquea);
      porCara.set(e.caraBloqueada, fila);
    }
  }
  return [...porCara.entries()]
    .map(([identidad, f]) => ({ identidad, desdeIdentidades: [...f.desdeIdentidades].sort(), desde: f.desde }))
    .sort((x, y) => y.desde - x.desde || (x.identidad < y.identidad ? -1 : x.identidad > y.identidad ? 1 : 0));
};

const cuentaDelCupo = (datos: unknown): number => {
  const n = (datos as { relaciones?: unknown } | null)?.relaciones;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

// ─── Qué puede salir mal ─────────────────────────────────────────────────────

export type MotivoDeBloqueo = 'identidad-invalida' | 'identidad-desconocida' | 'identidad-ajena' | 'misma-persona' | 'demasiados';

const CODIGOS: Record<MotivoDeBloqueo, 'invalid-argument' | 'not-found' | 'permission-denied' | 'resource-exhausted'> = {
  'identidad-invalida': 'invalid-argument',
  'identidad-desconocida': 'not-found',
  'identidad-ajena': 'permission-denied',
  'misma-persona': 'invalid-argument',
  demasiados: 'resource-exhausted',
};

export class BloqueoError extends Error {
  constructor(public readonly motivo: MotivoDeBloqueo) {
    /* El mensaje ES el código: la app lo traduce con su diccionario (services/weetalkBloqueosService.ts). */
    super(motivo);
    this.name = 'BloqueoError';
  }
}

// ─── El motor, con Firestore inyectado ───────────────────────────────────────

export interface BloqueosDeps {
  db: () => Firestore;
  ahora: () => number;
  /** Cómo se guarda un instante: `Timestamp` en producción. */
  sello: (ms: number) => unknown;
  carasDe: CarasDeLaCuenta;
}

export const createBloqueosEngine = (deps: BloqueosDeps) => {
  const coleccion = (nombre: string) => deps.db().collection(nombre);
  const refDeRelacion = (cuentaQueBloquea: string, cuentaBloqueada: string) => coleccion(BLOQUEOS).doc(claveDeRelacion(cuentaQueBloquea, cuentaBloqueada));
  const refDePar = (clave: string) => coleccion(PARES).doc(clave);
  const refDeCupo = (cuenta: string) => coleccion(CUPOS).doc(cuenta);

  /**
   * De qué cuenta es una cara, LEÍDO de `users` por el campo `uid` y con el resolutor canónico. `users` no garantiza
   * unicidad: se miran hasta cinco y, si no cuentan la misma historia, no hay cuenta. Y la cara tiene que ser una de
   * las que esa cuenta puede tener.
   */
  const cuentaDe = async (identidad: string): Promise<string | null> => {
    const snap = await coleccion(PERFILES).where('uid', '==', identidad).limit(5).get();
    const cuentas = new Set<string>();
    for (const d of snap.docs) {
      const c = cuentaDeIdentidad(identidad, d.data() as PerfilDeIdentidad);
      if (c) cuentas.add(c);
    }
    if (cuentas.size !== 1) return null;
    const cuenta = [...cuentas][0];
    return deps.carasDe(cuenta).includes(identidad) ? cuenta : null;
  };

  /** Las relaciones en las que esta cuenta bloquea. Acotado por el mismo tope que se aplica al bloquear. */
  const relacionesDe = async (cuenta: string): Promise<RelacionDeBloqueo[]> => {
    const snap = await coleccion(BLOQUEOS).where('cuentaQueBloquea', '==', cuenta).limit(MAX_CUENTAS_BLOQUEADAS + 1).get();
    const relaciones: RelacionDeBloqueo[] = [];
    for (const d of snap.docs) {
      const datos = d.data() as { cuentaBloqueada?: unknown } | undefined;
      if (typeof datos?.cuentaBloqueada !== 'string') continue;
      const r = relacionGuardada(datos, cuenta, datos.cuentaBloqueada, deps.carasDe);
      if (r) relaciones.push(r);
    }
    return relaciones;
  };

  const documentoDeRelacion = (r: RelacionDeBloqueo, ahora: number, creadoEn: unknown) => ({
    cuentaQueBloquea: r.cuentaQueBloquea,
    cuentaBloqueada: r.cuentaBloqueada,
    entradas: r.entradas.map((e) => ({ caraQueBloquea: e.caraQueBloquea, caraBloqueada: e.caraBloqueada, desde: deps.sello(e.desde) })),
    creadoEn: creadoEn ?? deps.sello(ahora),
    actualizadoEn: deps.sello(ahora),
  });

  /** La cuenta de la sesión tiene que tener forma de cuenta: de ella salen sus caras. */
  const exigirCuenta = (cuenta: string): readonly string[] => {
    const caras = deps.carasDe(cuenta);
    if (!caras.length) throw new BloqueoError('identidad-ajena');
    return caras;
  };

  /**
   * El índice de dos cuentas, reescrito ENTERO desde sus dos relaciones: lo que tiene que existir se escribe y todo
   * lo demás que podría existir entre ellas se borra. Así un bloqueo y su contrario (B también bloqueó a A) comparten
   * pares sin pisarse, y desbloquear uno no abre lo que el otro sigue cerrando.
   */
  const escribirIndice = (tx: Transaction, cuentaA: string, cuentaB: string, relaciones: readonly (RelacionDeBloqueo | null)[]): void => {
    const quedan = new Set(paresBloqueados(relaciones, deps.carasDe));
    for (const clave of paresPosibles(cuentaA, cuentaB, deps.carasDe)) {
      if (quedan.has(clave)) {
        const [de, para] = clave.split(SEPARADOR);
        tx.set(refDePar(clave), { de, para });
      } else {
        tx.delete(refDePar(clave));
      }
    }
  };

  return {
    /**
     * `bloquear` — la cuenta de la sesión, actuando con `comoIdentidad`, bloquea a la persona de `identidad`.
     *
     * Una transacción: relee las dos relaciones entre las dos cuentas, el cupo y las solicitudes de ËContact que puede
     * haber entre ellas; añade la entrada, REESCRIBE el índice entero de esas dos cuentas desde las relaciones (se cura
     * solo si alguna vez se desvió) y anula las solicitudes pendientes. Repetirlo no cambia nada. No avisa a nadie.
     */
    bloquear: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; identidad: unknown }) => {
      const yo = a.cuentaDeLaSesion;
      const misCaras = exigirCuenta(yo);
      if (!esIdentidadDePersona(a.comoIdentidad as string) || !esIdentidadDePersona(a.identidad as string)) throw new BloqueoError('identidad-invalida');
      const comoIdentidad = a.comoIdentidad as string;
      const identidad = a.identidad as string;
      if (!misCaras.includes(comoIdentidad)) throw new BloqueoError('identidad-ajena');
      if (misCaras.includes(identidad)) throw new BloqueoError('misma-persona');

      /* La cara con la que actúo tiene que existir y ser mía según `users`; la otra, existir y ser de otra cuenta. */
      const mia = await cuentaDe(comoIdentidad);
      if (mia !== yo) throw new BloqueoError(mia ? 'identidad-ajena' : 'identidad-desconocida');
      const suya = await cuentaDe(identidad);
      if (!suya) throw new BloqueoError('identidad-desconocida');
      if (suya === yo) throw new BloqueoError('misma-persona');

      return deps.db().runTransaction(async (tx) => {
        const ab = await tx.get(refDeRelacion(yo, suya));
        const ba = await tx.get(refDeRelacion(suya, yo));
        const cupo = await tx.get(refDeCupo(yo));
        /* Las solicitudes de ËContact entre las dos cuentas, leídas ANTES de escribir nada (así lo exige una transacción). */
        const solicitudes: { ref: DocumentReference; datos: unknown }[] = [];
        for (const id of solicitudesPosibles(yo, suya, deps.carasDe)) {
          const ref = coleccion(ECONTACTS).doc(id);
          const snap = await tx.get(ref);
          if (snap.exists) solicitudes.push({ ref, datos: snap.data() });
        }
        const antes = ab.exists ? relacionGuardada(ab.data(), yo, suya, deps.carasDe) : null;
        const contraria = ba.exists ? relacionGuardada(ba.data(), suya, yo, deps.carasDe) : null;
        const yaEstaba = !!antes && antes.entradas.some((e) => e.caraBloqueada === identidad);
        const usadas = cuentaDelCupo(cupo.exists ? cupo.data() : null);
        if (!ab.exists && usadas >= MAX_CUENTAS_BLOQUEADAS) throw new BloqueoError('demasiados');

        const ms = deps.ahora();
        const despues = conEntrada(antes, yo, suya, { caraQueBloquea: comoIdentidad, caraBloqueada: identidad, desde: ms });
        tx.set(refDeRelacion(yo, suya), documentoDeRelacion(despues, ms, ab.exists ? (ab.data() as { creadoEn?: unknown } | undefined)?.creadoEn : undefined));
        if (!ab.exists) tx.set(refDeCupo(yo), { relaciones: usadas + 1, actualizadoEn: deps.sello(ms) });
        escribirIndice(tx, yo, suya, [despues, contraria]);
        /*
         * Las solicitudes PENDIENTES entre las dos cuentas se anulan (decisión 4), en cualquier sentido y entre cualesquiera
         * de sus caras. Anular es BORRAR, que es justo lo que hacen «cancelar» y «rechazar» en ËContact: para la otra
         * persona es indistinguible de un «no» corriente, y no queda nada que desbloquear después (decisión 5). La
         * respuesta no dice cuántas había: lo delataría.
         */
        const susCaras = deps.carasDe(suya);
        for (const s of solicitudes) if (esSolicitudPendienteEntre(s.datos, misCaras, susCaras)) tx.delete(s.ref);
        return { identidad, bloqueado: true as const, yaEstaba };
      });
    },

    /**
     * `desbloquear` — quita esa cara de la lista de la cuenta de la sesión, se bloqueara desde la cara que fuera.
     *
     * No hace falta saber de qué cuenta es (puede que ya ni exista): se buscan las relaciones de quien llama que
     * nombran esa cara. No toca conversaciones ni mensajes, y no restaura las solicitudes de ËContact que el bloqueo
     * anuló: lo borrado sigue borrado y no aparece nada retroactivo. Desde ahí, las reglas normales (decisión 5).
     * Si no estaba, no es un error.
     *
     * Si la cuenta bloqueó DOS caras de la misma persona (sin saberlo), quitar una no abre a esa persona: la relación
     * de cuenta sigue mientras le quede una entrada, y la lista sigue enseñando la otra fila.
     */
    desbloquear: async (a: { cuentaDeLaSesion: string; identidad: unknown }) => {
      const yo = a.cuentaDeLaSesion;
      exigirCuenta(yo);
      if (!esIdentidadDePersona(a.identidad as string)) throw new BloqueoError('identidad-invalida');
      const identidad = a.identidad as string;
      const cuentas = (await relacionesDe(yo))
        .filter((r) => r.entradas.some((e) => e.caraBloqueada === identidad))
        .map((r) => r.cuentaBloqueada);
      let estaba = false;
      for (const suya of cuentas) {
        const quitada = await deps.db().runTransaction(async (tx) => {
          const ab = await tx.get(refDeRelacion(yo, suya));
          const ba = await tx.get(refDeRelacion(suya, yo));
          const cupo = await tx.get(refDeCupo(yo));
          const antes = ab.exists ? relacionGuardada(ab.data(), yo, suya, deps.carasDe) : null;
          const contraria = ba.exists ? relacionGuardada(ba.data(), suya, yo, deps.carasDe) : null;
          if (!antes || !antes.entradas.some((e) => e.caraBloqueada === identidad)) return false;
          const ms = deps.ahora();
          const despues = sinCaraBloqueada(antes, identidad);
          if (despues) {
            tx.set(refDeRelacion(yo, suya), documentoDeRelacion(despues, ms, (ab.data() as { creadoEn?: unknown } | undefined)?.creadoEn));
          } else {
            tx.delete(refDeRelacion(yo, suya));
            tx.set(refDeCupo(yo), { relaciones: Math.max(0, cuentaDelCupo(cupo.exists ? cupo.data() : null) - 1), actualizadoEn: deps.sello(ms) });
          }
          escribirIndice(tx, yo, suya, [despues, contraria]);
          return true;
        });
        estaba = estaba || quitada;
      }
      return { identidad, bloqueado: false as const, estaba };
    },

    /** `listar` — la lista de bloqueados de la cuenta de la sesión. Solo la suya: no hay forma de pedir la de otra. */
    listar: async (a: { cuentaDeLaSesion: string }) => {
      exigirCuenta(a.cuentaDeLaSesion);
      return { bloqueados: vistaDeLaLista(await relacionesDe(a.cuentaDeLaSesion), a.cuentaDeLaSesion) };
    },

    /**
     * ¿PUEDE SONAR EN EL TELÉFONO DE `para` ALGO QUE FIRMÓ `de`? La regla común, por cuentas, para el push: la usan el
     * push de mensajes y el de los avisos de ËContact (functions/src/index.ts).
     *
     * Recibe las cuentas ya resueltas por quien llama (el disparador las lee con el resolutor canónico) y NO recibe
     * el mensaje ni el aviso. Falla cerrada: sin las dos cuentas, con una cara que no es de su cuenta, o si los
     * bloqueos no se pueden leer, no suena. Un aviso de menos es mejor que un aviso de quien te bloqueó.
     */
    permiteAviso: async (
      de: { identidad: string; cuenta: string | null },
      para: { identidad: string; cuenta: string | null },
    ): Promise<boolean> => {
      if (!de.cuenta || !para.cuenta) return false;
      if (!deps.carasDe(de.cuenta).includes(de.identidad) || !deps.carasDe(para.cuenta).includes(para.identidad)) return false;
      if (de.cuenta === para.cuenta) return true;
      try {
        const [delDestino, propio] = await Promise.all([
          refDeRelacion(para.cuenta, de.cuenta).get(),
          refDeRelacion(de.cuenta, para.cuenta).get(),
        ]);
        return puedeEscribir({
          de: { identidad: de.identidad, cuenta: de.cuenta },
          para: { identidad: para.identidad, cuenta: para.cuenta },
          bloqueoDelDestino: delDestino.exists ? relacionGuardada(delDestino.data(), para.cuenta, de.cuenta, deps.carasDe) : null,
          bloqueoPropio: propio.exists ? relacionGuardada(propio.data(), de.cuenta, para.cuenta, deps.carasDe) : null,
        }).puede;
      } catch (error) {
        console.error('WeeTalk: no se pudieron leer los bloqueos; el aviso no suena', sanitizeForLog(error, 300));
        return false;
      }
    },
  };
};

/** Instancia de producción. `getFirestore()` va dentro: al Admin SDK lo inicializa `index.ts`. */
export const bloqueosEngine = createBloqueosEngine({
  db: () => getFirestore(),
  ahora: () => Date.now(),
  sello: (ms) => Timestamp.fromMillis(ms),
  carasDe: identidadesHeredadasDeLaCuenta,
});

// ─── Las callables ───────────────────────────────────────────────────────────

/*
 * QUIÉN LLAMA: una cuenta con sesión de verdad. WeeTalk es «de una persona» —el invitado no entra (la app lo manda a
 * registrarse)—, así que la sesión anónima no bloquea ni lista: es la barrera del invitado (`esCuentaAutenticada`,
 * identity/sesion.ts), que solo mira el token. La de «cuenta Weë válida» (edad y país del registro) es para las puertas
 * que generan o cobran; bloquear es protegerse, y no se le pone delante.
 */
export const cuentaDeLaLlamada = (auth: { uid?: unknown; token?: unknown } | null | undefined): string => {
  if (!auth || typeof auth.uid !== 'string' || !auth.uid) throw new HttpsError('unauthenticated', 'unauthenticated', { motivo: 'unauthenticated' });
  if (!esCuentaAutenticada(auth)) throw new HttpsError('unauthenticated', CUENTA_REQUERIDA, { motivo: CUENTA_REQUERIDA });
  return auth.uid;
};

const traducir = (error: unknown, queFallo: string): never => {
  if (error instanceof BloqueoError) throw new HttpsError(CODIGOS[error.motivo], error.motivo, { motivo: error.motivo });
  if (error instanceof HttpsError) throw error;
  console.error(`${queFallo} falló`, sanitizeForLog(error, 300));
  throw new HttpsError('internal', 'internal', { motivo: 'internal' });
};

const datosDe = (request: { data?: unknown }): Record<string, unknown> =>
  (request.data && typeof request.data === 'object' ? request.data as Record<string, unknown> : {});

/** `blockWeeTalkContact({ asIdentity, targetIdentity })` → `{ identidad, bloqueado: true, yaEstaba }` */
export const blockWeeTalkContact = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = cuentaDeLaLlamada(request.auth);
  const d = datosDe(request);
  try {
    return await bloqueosEngine.bloquear({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, identidad: d.targetIdentity });
  } catch (e) {
    return traducir(e, 'blockWeeTalkContact');
  }
});

/** `unblockWeeTalkContact({ targetIdentity })` → `{ identidad, bloqueado: false, estaba }` */
export const unblockWeeTalkContact = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = cuentaDeLaLlamada(request.auth);
  const d = datosDe(request);
  try {
    return await bloqueosEngine.desbloquear({ cuentaDeLaSesion, identidad: d.targetIdentity });
  } catch (e) {
    return traducir(e, 'unblockWeeTalkContact');
  }
});

/** `listWeeTalkBlocks({})` → `{ bloqueados: [{ identidad, desdeIdentidades, desde }] }` */
export const listWeeTalkBlocks = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = cuentaDeLaLlamada(request.auth);
  try {
    return await bloqueosEngine.listar({ cuentaDeLaSesion });
  } catch (e) {
    return traducir(e, 'listWeeTalkBlocks');
  }
});
