/*
 * WEETALK — EL BLOQUEO DE CONTACTOS (docs/WEETALK-BLOQUEO.md).
 * ---------------------------------------------------------------------------
 *
 * Decisiones del dueño (vinculantes):
 *
 *   1 · WeeTalk es mensajería PRIVADA. Las conversaciones no se inspeccionan ni se moderan, y no hay denuncias de
 *       mensajes privados. Este archivo no lee NINGÚN mensaje: ni su texto, ni sus archivos, ni la colección
 *       `messages`. Decide con dos cosas: quién escribe y a quién.
 *   2 · Bloquear es una decisión personal de privacidad. No crea reportes, ni casos, ni sanciones, y no toca el
 *       Moderation Core ni sus contratos (el «BLOCK» de la moderación es otra cosa: el desenlace de una revisión).
 *   3 · El bloqueo es de CUENTA y cubre las dos caras: si la cuenta A bloquea a la B, quedan bloqueadas la cara
 *       Real y la cara Weë de B, y cambiar de cara no lo evade.
 *   4 · No se le revela a B la otra cara de A, y B no sabe que está bloqueada: nadie le avisa, no hay lista suya,
 *       y ninguna respuesta de este archivo le dice a nadie nada de una cuenta que no es la suya.
 *   5 · La lista de bloqueados solo la ve quien bloquea, y desbloquear no restaura nada ni genera nada retroactivo:
 *       borra el bloqueo y punto.
 *
 * QUÉ PROTEGE EXACTAMENTE (la regla común, `puedeEscribir`)
 * --------------------------------------------------------
 * Una cuenta bloquea a otra DESDE una de sus caras y viendo una cara de la otra. Cada bloqueo guarda esa pareja como
 * una ENTRADA de la relación entre las dos cuentas:
 *
 *     entrada = { caraQueBloquea: a, caraBloqueada: b }
 *
 * y de ahí salen las dos prohibiciones, las dos por CUENTA en el lado que no puede delatar a nadie:
 *
 *   · NINGUNA cara de B escribe a la cara `a` (la protegida). Cambiar de cara no lo evade.
 *   · NINGUNA cara de A escribe a la cara `b` (la bloqueada): para volver a escribirle hay que desbloquear.
 *
 * Lo que NO se prohíbe es justo lo que delataría la otra cara de alguien:
 *
 *   · B sí puede escribir a la OTRA cara de A (la que A no usó para bloquear). Si eso fallara, B tendría un oráculo:
 *     «a esa cara no le puedo escribir → es la otra cara de quien me bloqueó». La decisión 4 lo prohíbe. Si A quiere
 *     protegerla también, la bloquea desde ella y queda como otra entrada.
 *   · A sí puede escribir a la OTRA cara de B (la que no vio). Si fallara, A sabría cuál es la otra cara de B.
 *
 * Todo esto sale de UNA función pura, sin Firestore, y de ella sale también el índice que leerían las reglas
 * (`paresBloqueados`): lo que dice una lo dice el otro, por construcción, y las pruebas lo comprueban caso por caso.
 *
 * DÓNDE SE CUMPLE (docs/WEETALK-BLOQUEO.md § 5)
 * ---------------------------------------------
 *   · Hoy, en el servidor: el aviso push de un mensaje (`sendMessagePushNotification`, functions/src/index.ts) no
 *     suena si esta regla dice que no.
 *   · Los mensajes y las conversaciones los escribe el CLIENTE directamente, con `firestore.rules`. Que no se puedan
 *     escribir exige cambiar las reglas, y eso no se ha hecho: está PROPUESTO (ops/propuestas/weetalk-bloqueo/) y
 *     espera la autorización del dueño. Hasta entonces el bloqueo no impide que el mensaje se guarde.
 *
 * LAS CARAS DE UNA CUENTA se componen en un solo sitio, la frontera de compatibilidad
 * (`identidadesHeredadasDeLaCuenta`, identity/compatibilidad.ts), y siempre a partir de una cuenta que o es la de la
 * sesión o se ha LEÍDO de `users` con el resolutor canónico (`cuentaDeIdentidad`, que lee `linkedAccountId`). Nunca se
 * quita un prefijo para saber de quién es una cara.
 *
 *   weetalkBloqueos/{cuentaQueBloquea}~{cuentaBloqueada}   la relación y sus entradas (la verdad)
 *   weetalkBloqueosPorPar/{de}~{para}                      «la cara `de` no puede escribir a `para`» (derivado)
 *   weetalkBloqueosCupo/{cuenta}                           cuántas cuentas ha bloqueado (el tope)
 *
 * Las tres son SOLO del servidor: `firestore.rules` no las nombra, así que ningún cliente las lee ni las escribe.
 * Sin IA, sin Credits, sin proveedores.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { sanitizeForLog } from '../engine/sanitize';
import { identidadesHeredadasDeLaCuenta } from '../identity/compatibilidad';
import { CUENTA_REQUERIDA, esCuentaAutenticada } from '../identity/sesion';
import { cuentaDeIdentidad, esIdentidadDePersona, PerfilDeIdentidad } from './econtact';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

export const BLOQUEOS = 'weetalkBloqueos';
export const PARES = 'weetalkBloqueosPorPar';
export const CUPOS = 'weetalkBloqueosCupo';
const PERFILES = 'users';

/** Cuántas cuentas distintas puede bloquear una cuenta. Muy por encima de cualquier uso real; acota el abuso. */
export const MAX_CUENTAS_BLOQUEADAS = 1000;

/** Ni una cuenta ni una cara de Weë llevan `~`: las cuentas son alfanuméricas y las caras salen de ellas. */
const SEPARADOR = '~';

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

export const claveDePar = (de: string, para: string): string => `${de}${SEPARADOR}${para}`;

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

const carasProtegidas = (r: RelacionDeBloqueo | null): ReadonlySet<string> => new Set((r?.entradas || []).map((e) => e.caraQueBloquea));
const carasBloqueadas = (r: RelacionDeBloqueo | null): ReadonlySet<string> => new Set((r?.entradas || []).map((e) => e.caraBloqueada));

// ─── La regla común: ¿puede X escribir a Y? ──────────────────────────────────

/*
 * `motivo` es para el servidor y para quien bloqueó (que ya lo sabe). Nunca se le dice a quien está bloqueado: para
 * él, si algún día una pantalla lo necesita, es el mismo «no se pudo enviar» de cualquier otro fallo.
 */
export type DecisionDeEscritura = { puede: true } | { puede: false; motivo: 'cara-protegida' | 'cara-bloqueada' };

const PUEDE: DecisionDeEscritura = Object.freeze({ puede: true as const });

/**
 * ¿PUEDE LA CARA `de` ESCRIBIR A LA CARA `para`? Pura, por CUENTAS, sin leer nada y sin mirar ningún mensaje.
 *
 * `bloqueoDelDestino` es la relación en la que la cuenta de `para` bloqueó a la de `de`; `bloqueoPropio`, la
 * contraria. Una relación que no hable de esas dos cuentas, en ese orden, no cuenta.
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
  const delDestino = a.bloqueoDelDestino
    && a.bloqueoDelDestino.cuentaQueBloquea === para.cuenta && a.bloqueoDelDestino.cuentaBloqueada === de.cuenta
    ? a.bloqueoDelDestino : null;
  /* Cualquier cara de la cuenta bloqueada, hacia la cara protegida: no. Cambiar de cara no lo evade. */
  if (carasProtegidas(delDestino).has(para.identidad)) return { puede: false, motivo: 'cara-protegida' };
  const propio = a.bloqueoPropio
    && a.bloqueoPropio.cuentaQueBloquea === de.cuenta && a.bloqueoPropio.cuentaBloqueada === para.cuenta
    ? a.bloqueoPropio : null;
  /* Quien bloqueó, desde cualquiera de sus caras, hacia la cara que bloqueó: no, hasta que desbloquee. */
  if (carasBloqueadas(propio).has(para.identidad)) return { puede: false, motivo: 'cara-bloqueada' };
  return PUEDE;
};

/**
 * EL ÍNDICE QUE LEERÍAN LAS REGLAS: cada «`de` no puede escribir a `para`» de estas relaciones, como `de~para`.
 *
 * Es la misma regla que `puedeEscribir`, escrita como conjunto: para dos caras de cuentas distintas,
 * `puedeEscribir(x → y).puede` es exactamente `!pares.includes(x~y)`. Incluye la cara Weë de una cuenta aunque
 * todavía no exista: el día que la cree ya estará cubierta, que es lo que pide «cambiar de cara no lo evade».
 */
export const paresBloqueados = (relaciones: readonly (RelacionDeBloqueo | null)[], carasDe: CarasDeLaCuenta): string[] => {
  const pares = new Set<string>();
  for (const r of relaciones) {
    if (!r) continue;
    for (const protegida of carasProtegidas(r)) for (const x of carasDe(r.cuentaBloqueada)) pares.add(claveDePar(x, protegida));
    for (const bloqueada of carasBloqueadas(r)) for (const x of carasDe(r.cuentaQueBloquea)) pares.add(claveDePar(x, bloqueada));
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
     * Una transacción: relee las dos relaciones entre las dos cuentas y el cupo, añade la entrada y REESCRIBE el
     * índice entero de esas dos cuentas desde las relaciones (se cura solo si alguna vez se desvió). Repetirlo no
     * cambia nada. No avisa a nadie.
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
        return { identidad, bloqueado: true as const, yaEstaba };
      });
    },

    /**
     * `desbloquear` — quita esa cara de la lista de la cuenta de la sesión, se bloqueara desde la cara que fuera.
     *
     * No hace falta saber de qué cuenta es (puede que ya ni exista): se buscan las relaciones de quien llama que
     * nombran esa cara. No toca conversaciones ni mensajes: lo borrado sigue borrado y no aparece nada retroactivo.
     * Si no estaba, no es un error.
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
     * ¿PUEDE SONAR EN EL TELÉFONO DE `para` UN MENSAJE QUE FIRMÓ `de`? La regla común, por cuentas, para el push.
     *
     * Recibe las cuentas ya resueltas por quien llama (el disparador las lee con el resolutor canónico) y NO recibe
     * el mensaje. Falla cerrada: sin las dos cuentas, con una cara que no es de su cuenta, o si los bloqueos no se
     * pueden leer, no suena. Un aviso de menos es mejor que un aviso de quien te bloqueó.
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
