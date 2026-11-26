import { Timestamp } from 'firebase-admin/firestore';
import { EngineError } from '../engine/errors';
import { dayKey } from '../engine/limits';

/**
 * LÍMITES DE `creatorChat` — la conversación de creación es GRATUITA, y por eso tiene tope (decisión del dueño, 2026-10-14).
 *
 * `creatorChat` no cobra Credits: cada turno hace, como mucho, UNA llamada `text.structure` (creator/planner.ts,
 * `inferAnswers`, 512 tokens de salida) y crea o actualiza un trabajo en `creatorJobs`. Sin tope, una persona —o un guion—
 * podía gastar modelo y llenar Firestore sin límite. Hay cuatro, todos por persona:
 *
 *   porMinuto     turnos en los últimos 60 s            frena un guion o un bucle del cliente
 *   porDia        turnos en el día (UTC)                tope de uso
 *   nuevosPorDia  conversaciones NUEVAS en el día       tope de documentos `creatorJobs` que una persona puede abrir
 *   usdPorDia     coste estimado de modelo en el día    tope de CONSUMO, valga lo que valga el modelo que elija el router
 *
 * El de consumo es el que de verdad protege: el coste de un turno depende del modelo (de 0,0008 a 0,011 USD en el peor
 * caso medido, `scripts/medir-coste-chat.mjs`) y un tope de turnos no lo ve. Se mide con el `costUSD` que ya anota cada
 * llamada (`UsageEntry`); en modo demo vale 0 y no gasta cupo de consumo.
 *
 * Se aplica ANTES de nada que cueste: antes de crear el trabajo y de llamar al modelo. Pasarse es `RATE_LIMITED` con el
 * motivo en los detalles (`chat_por_minuto`, `chat_por_dia`, `chat_nuevos_por_dia`, `chat_consumo_por_dia`), para que la
 * app diga la verdad —«espera unos segundos» o «vuelve mañana»— en vez de una frase única.
 *
 * Los valores de partida son ESTRICTOS a propósito. La administración los cambia en `aiSettings/chat` sin tocar código,
 * pero nunca por encima de `TOPES_DEL_CHAT`: un valor mayor se recorta, y uno inválido se ignora (rige el de partida).
 * No es un límite de dinero de la persona (eso son los Credits) ni sustituye al tope global de gasto del motor.
 */
export interface LimitesDelChat {
  porMinuto: number;
  porDia: number;
  nuevosPorDia: number;
  usdPorDia: number;
}

export const LIMITES_DEL_CHAT: Readonly<LimitesDelChat> = Object.freeze({ porMinuto: 8, porDia: 60, nuevosPorDia: 15, usdPorDia: 0.05 });

/** Lo más alto que se puede configurar. Por encima de esto hace falta cambiar el código, a propósito. */
export const TOPES_DEL_CHAT: Readonly<LimitesDelChat> = Object.freeze({ porMinuto: 30, porDia: 300, nuevosPorDia: 100, usdPorDia: 1 });

export type MotivoDeLimiteDelChat = 'chat_por_minuto' | 'chat_por_dia' | 'chat_nuevos_por_dia' | 'chat_consumo_por_dia';

/** Lo que se lleva contado de la persona en el día. */
export interface EstadoDelChat {
  turnos: number;
  nuevos: number;
  usd: number;
  /** Instantes (ms) de los turnos de los últimos 60 s; nunca más de `porMinuto` entradas. */
  recientes: number[];
}

const VENTANA_MS = 60_000;

const numeroValido = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** PURA. La configuración de la administración, validada: lo inválido se ignora y lo excesivo se recorta. */
export const limitesDelChat = (valor: unknown): LimitesDelChat => {
  const crudo = valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
  const uno = (clave: keyof LimitesDelChat): number => {
    const v = crudo[clave];
    if (!numeroValido(v)) return LIMITES_DEL_CHAT[clave];
    return Math.min(v, TOPES_DEL_CHAT[clave]);
  };
  return {
    porMinuto: Math.floor(uno('porMinuto')) || LIMITES_DEL_CHAT.porMinuto,
    porDia: Math.floor(uno('porDia')) || LIMITES_DEL_CHAT.porDia,
    nuevosPorDia: Math.floor(uno('nuevosPorDia')) || LIMITES_DEL_CHAT.nuevosPorDia,
    usdPorDia: uno('usdPorDia'),
  };
};

/** PURA. El estado guardado, leído con cuidado: lo que no tiene la forma esperada cuenta como cero. */
export const leerEstadoDelChat = (datos: Record<string, unknown> | undefined): EstadoDelChat => {
  const entero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const recientes = Array.isArray(datos?.recientes) ? (datos!.recientes as unknown[]).filter((t): t is number => typeof t === 'number' && Number.isFinite(t)) : [];
  return {
    turnos: entero(datos?.turnos),
    nuevos: entero(datos?.nuevos),
    usd: typeof datos?.usd === 'number' && Number.isFinite(datos.usd) && datos.usd > 0 ? datos.usd : 0,
    recientes,
  };
};

export type DecisionDelTurno =
  | { ok: true; siguiente: EstadoDelChat }
  | { ok: false; motivo: MotivoDeLimiteDelChat; limite: number; usado: number };

/**
 * PURA. ¿Cabe un turno más ahora? Y, si cabe, cómo queda la cuenta. El orden de las comprobaciones es el de lo más barato
 * de explicar: primero la prisa, luego el día, luego las conversaciones nuevas y por último el consumo.
 */
export const decidirTurno = (estado: EstadoDelChat, ahora: number, esNuevo: boolean, limites: LimitesDelChat): DecisionDelTurno => {
  const recientes = estado.recientes.filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= limites.porMinuto) return { ok: false, motivo: 'chat_por_minuto', limite: limites.porMinuto, usado: recientes.length };
  if (estado.turnos >= limites.porDia) return { ok: false, motivo: 'chat_por_dia', limite: limites.porDia, usado: estado.turnos };
  if (esNuevo && estado.nuevos >= limites.nuevosPorDia) return { ok: false, motivo: 'chat_nuevos_por_dia', limite: limites.nuevosPorDia, usado: estado.nuevos };
  if (estado.usd >= limites.usdPorDia) return { ok: false, motivo: 'chat_consumo_por_dia', limite: limites.usdPorDia, usado: estado.usd };
  return {
    ok: true,
    siguiente: { turnos: estado.turnos + 1, nuevos: estado.nuevos + (esNuevo ? 1 : 0), usd: estado.usd, recientes: [...recientes, ahora].slice(-limites.porMinuto) },
  };
};

/* Lo mínimo que se necesita de Firestore: la misma forma que usa el limitador del motor, para poder probarlo con una base en memoria. */
interface DocRef { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }> }
interface Tx {
  get(ref: DocRef): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(ref: DocRef, data: Record<string, unknown>, options?: { merge?: boolean }): void;
}
export interface BaseDelChat {
  collection(path: string): { doc(id: string): DocRef };
  runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

/** Un documento por persona y día: `aiRateLimits` es de servidor (ningún cliente lo lee ni lo escribe). */
const docDelDia = (db: BaseDelChat, uid: string, dia: string): DocRef => db.collection('aiRateLimits').doc(`chat:${uid}:${dia}`);

/**
 * Reserva un turno de conversación o lanza `RATE_LIMITED` con el motivo. Atómico: dos turnos a la vez no se cuelan.
 * `esNuevo` es una conversación que empieza (sin `jobId`).
 */
export const reservarTurnoDelChat = async (
  db: BaseDelChat,
  uid: string,
  esNuevo: boolean,
  limites: LimitesDelChat,
  ahora: number = Date.now(),
): Promise<void> => {
  const dia = dayKey(new Date(ahora));
  const ref = docDelDia(db, uid, dia);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const decision = decidirTurno(leerEstadoDelChat(snap.data()), ahora, esNuevo, limites);
    if (!decision.ok) {
      throw new EngineError('RATE_LIMITED', undefined, { modality: 'chat', reason: decision.motivo, limit: decision.limite, used: decision.usado });
    }
    tx.set(ref, { userId: uid, day: dia, ...decision.siguiente, updatedAt: Timestamp.now() }, { merge: true });
  });
};

/**
 * Apunta el coste estimado de una llamada de modelo del turno. Nunca lanza: medir no puede romper la conversación. Un
 * coste que no es un número positivo no suma (el demo y los fallos valen 0).
 */
export const anotarConsumoDelChat = async (db: BaseDelChat, uid: string, costeUsd: number, ahora: number = Date.now()): Promise<void> => {
  if (!(typeof costeUsd === 'number' && Number.isFinite(costeUsd) && costeUsd > 0)) return;
  const dia = dayKey(new Date(ahora));
  const ref = docDelDia(db, uid, dia);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const estado = leerEstadoDelChat(snap.data());
      tx.set(ref, { userId: uid, day: dia, usd: estado.usd + costeUsd, updatedAt: Timestamp.now() }, { merge: true });
    });
  } catch (error) {
    console.warn('creatorChat: no se pudo anotar el consumo estimado', (error as Error)?.message);
  }
};

/** Lee `aiSettings/chat` y lo valida. Se cachea un minuto, como la configuración del motor. */
let cache: { at: number; limites: LimitesDelChat } | null = null;
const CACHE_MS = 60_000;
export const limitesDelChatActuales = async (db: BaseDelChat, ahora: number = Date.now()): Promise<LimitesDelChat> => {
  if (cache && ahora - cache.at < CACHE_MS) return cache.limites;
  let limites: LimitesDelChat;
  try {
    const snap = await db.collection('aiSettings').doc('chat').get();
    limites = limitesDelChat(snap.exists ? snap.data() : undefined);
  } catch {
    /* Sin poder leerla, rigen los de partida —los estrictos—, nunca «sin límite». */
    limites = { ...LIMITES_DEL_CHAT };
  }
  cache = { at: ahora, limites };
  return limites;
};

/** Solo para las pruebas: olvida la caché. */
export const olvidarLimitesDelChat = (): void => {
  cache = null;
};
