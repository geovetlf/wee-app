import { createHash } from 'crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { EngineError } from './errors';
import { Modality, UsageLimits } from './types';

/**
 * Límites de uso (docs/AI-ENGINE.md §Límites): por persona y día, por modalidad
 * (imagen, video, voz…). Se reservan ANTES de cobrar y de llamar a la IA, en
 * una transacción sobre aiRateLimits/{uid}_{día}; si se supera el límite se
 * responde RATE_LIMITED sin tocar Credits. Los límites por proveedor
 * (aiProviders/{id}.limits.maxCallsPerDay) los aplica el router con aiUsage/{día}.
 */
export const DEFAULT_LIMITS: UsageLimits = {
  /* 3D: pocas y caras. Es un valor de partida; se cambia en aiSettings/global.limits sin tocar código. */
  perUserPerDay: { text: 400, vision: 200, image: 80, video: 12, voice: 60, doc: 100, '3d': 5 },
};

interface LimiterDoc {
  exists: boolean;
  data(): Record<string, any> | undefined;
}
interface LimiterRef {
  get(): Promise<LimiterDoc>;
}
interface LimiterTx {
  get(ref: LimiterRef): Promise<LimiterDoc>;
  set(ref: LimiterRef, data: Record<string, unknown>, options?: { merge?: boolean }): void;
}
export interface LimiterDb {
  collection(path: string): { doc(id: string): LimiterRef };
  runTransaction<T>(fn: (tx: LimiterTx) => Promise<T>): Promise<T>;
}

export const dayKey = (date = new Date()): string => date.toISOString().slice(0, 10);

/** Un día como lo escribe `dayKey`. El de una operación viaja con ella para devolverle el hueco al día en que lo ocupó. */
const FORMA_DE_DIA = /^\d{4}-\d{2}-\d{2}$/;
/**
 * EL DÍA DE UNA OPERACIÓN. Sin día, hoy. Uno con otra forma es un error de quien llama y se dice: convertirlo en «hoy»
 * en silencio ocuparía un hueco que después, con ese mismo día, no se podría devolver.
 */
const diaDe = (dia?: string): string => {
  if (dia === undefined) return dayKey();
  if (typeof dia === 'string' && FORMA_DE_DIA.test(dia)) return dia;
  throw new Error('limiter: el día de la operación no tiene la forma AAAA-MM-DD');
};

/** Por su resumen: un `requestId` lleva puntos, y un punto en una clave de Firestore es un camino. */
const claveDeOperacion = (operacion: string): string => createHash('sha256').update(operacion, 'utf8').digest('hex').slice(0, 32);

/**
 * ── LO QUE UNA OPERACIÓN OCUPA EN EL CUPO DEL DÍA ──────────────────────────
 *
 * Dos mapas en el documento del día, con la misma clave (el resumen del nombre de la operación):
 *
 *   operaciones[clave]   true          contada: ocupa sus huecos (la forma de siempre; el código de antes la entiende).
 *                        'devuelta'    no salió el resultado (fallo técnico, plazo, proveedor caído, nada llegó a
 *                                      nadie): sus huecos volvieron al día. Si la MISMA operación vuelve a reservar,
 *                                      vuelve a contar.
 *                        'consumida'   la persona pidió cancelar cuando el proveedor ya trabajaba: se quedan gastados.
 *   cuentas[clave]       QUÉ contó, por modalidad, para que devolverla devuelva exactamente eso. Una operación de antes
 *                        (sin `cuentas`) cuenta, pero no se puede devolver: no se sabe qué ocupó.
 *
 * La clave es el resumen de la operación TAL COMO LA NOMBRA quien llama, y cada puerta la nombra a su manera (el vídeo,
 * por su `requestId`; el mundo, con su capacidad y un carácter que un requestId no admite): ninguna operación de una
 * puede ser la de otra. Y si aun así una operación contada no cubre lo que se le pide, es un conflicto, no «ya está».
 * Solo se devuelve lo contado, una vez: devolver dos veces no regala dos huecos.
 */
type EstadoEnElCupo = 'contada' | 'devuelta' | 'consumida';
interface EntradaDelCupo {
  estado: EstadoEnElCupo;
  cuenta?: Partial<Record<Modality, number>>;
}
const leerEntrada = (marca: unknown, cuentaCruda: unknown): EntradaDelCupo | undefined => {
  const estado: EstadoEnElCupo | undefined = marca === true ? 'contada' : marca === 'devuelta' || marca === 'consumida' ? marca : undefined;
  if (!estado) return undefined;
  const cuenta = cuentaCruda && typeof cuentaCruda === 'object'
    ? Object.fromEntries(Object.entries(cuentaCruda as Record<string, unknown>).filter(([, n]) => typeof n === 'number' && Number.isInteger(n) && n > 0)) as Partial<Record<Modality, number>>
    : {};
  return { estado, ...(Object.keys(cuenta).length ? { cuenta } : {}) };
};
/** ¿Ocupa sus huecos? Contada o gastada; una devuelta, no. */
const ocupa = (entrada: EntradaDelCupo | undefined): boolean => entrada?.estado === 'contada' || entrada?.estado === 'consumida';
/** ¿Lo que contó cubre lo que se pide? Una de antes, sin desglose, se da por buena (es la forma de siempre del vídeo). */
const cubre = (entrada: EntradaDelCupo, wanted: [Modality, number][]): boolean =>
  !entrada.cuenta || wanted.every(([modality, n]) => Number(entrada.cuenta?.[modality] || 0) >= n);

const pedidas = (counts: Partial<Record<Modality, number>>): [Modality, number][] =>
  Object.entries(counts).filter(([, n]) => (n || 0) > 0) as [Modality, number][];

export function createLimiter(deps: { db: () => LimiterDb; now?: () => unknown }) {
  const now = deps.now || (() => Timestamp.now());
  const docDelDia = (userId: string, dia: string) => deps.db().collection('aiRateLimits').doc(`${userId}_${dia}`);
  const entradaDe = (datos: Record<string, unknown> | undefined, operacion: string): EntradaDelCupo | undefined => {
    const clave = claveDeOperacion(operacion);
    return leerEntrada(((datos?.operaciones || {}) as Record<string, unknown>)[clave], ((datos?.cuentas || {}) as Record<string, unknown>)[clave]);
  };
  /** Una operación ya contada que no cubre lo pedido: es otra cosa con el mismo nombre, y no se toma por hecha. */
  const yaContada = (entrada: EntradaDelCupo | undefined, wanted: [Modality, number][]): boolean => {
    if (!ocupa(entrada)) return false;
    if (cubre(entrada as EntradaDelCupo, wanted)) return true;
    throw new EngineError('INVALID_REQUEST', undefined, { reason: 'operacion_de_otro_cupo' });
  };
  const pasaDelLimite = (used: Record<string, unknown>, wanted: [Modality, number][], limits: UsageLimits): void => {
    for (const [modality, n] of wanted) {
      const limit = limits.perUserPerDay[modality];
      const current = Number(used[modality] || 0);
      if (limit && limit > 0 && current + n > limit) {
        throw new EngineError('RATE_LIMITED', undefined, { modality, limit, used: current });
      }
    }
  };
  return {
    /**
     * Reserva cupo para las generaciones pedidas; lanza RATE_LIMITED si alguna modalidad se pasa.
     *
     * Con `operacion` —como la nombre quien pide— la misma operación cuenta UNA
     * vez en el día, aunque llegue dos veces a la vez: la segunda la encuentra
     * apuntada dentro de la misma transacción y no suma; y queda anotado QUÉ contó.
     * Sin ella, todo es como siempre. Con `dia`, el cupo de ESE día.
     */
    async reserve(userId: string, counts: Partial<Record<Modality, number>>, limits: UsageLimits = DEFAULT_LIMITS, operacion?: string, dia?: string): Promise<void> {
      const wanted = pedidas(counts);
      if (!wanted.length) return;
      const elDia = diaDe(dia);
      const ref = docDelDia(userId, elDia);
      await deps.db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const used = (snap.data() || {}) as Record<string, number>;
        const anterior = operacion ? entradaDe(snap.data(), operacion) : undefined;
        if (operacion && yaContada(anterior, wanted)) return;
        pasaDelLimite(used, wanted, limits);
        /* Lo que cuenta AHORA, entero: lo que contó antes y ya no, a cero (un merge no puede dejar restos de otra vez). */
        const cuenta = { ...Object.fromEntries(Object.keys(anterior?.cuenta ?? {}).map((m) => [m, 0])), ...Object.fromEntries(wanted) };
        const clave = operacion ? claveDeOperacion(operacion) : undefined;
        const patch: Record<string, unknown> = {
          userId, day: elDia, updatedAt: now(),
          ...(clave ? { operaciones: { [clave]: true }, cuentas: { [clave]: cuenta } } : {}),
        };
        for (const [modality, n] of wanted) patch[modality] = Number(used[modality] || 0) + n;
        tx.set(ref, patch, { merge: true });
      });
    },

    /**
     * ¿CABE? Lo mismo que `reserve`, sin apuntar nada: para decir «hoy ya no» ANTES de tocar Credits o de enseñar un
     * precio. Una operación que ya ocupa sus huecos, cabe (son los suyos).
     */
    async comprobar(userId: string, counts: Partial<Record<Modality, number>>, limits: UsageLimits = DEFAULT_LIMITS, operacion?: string, dia?: string): Promise<void> {
      const wanted = pedidas(counts);
      if (!wanted.length) return;
      const snap = await docDelDia(userId, diaDe(dia)).get();
      if (operacion && yaContada(entradaDe(snap.data(), operacion), wanted)) return;
      pasaDelLimite((snap.data() || {}) as Record<string, unknown>, wanted, limits);
    },

    /**
     * DEVOLVER LOS HUECOS de una operación que no dio su resultado, al día en que los ocupó: exactamente los que contó
     * (su `cuenta`), no los que diga quien llama. Idempotente: solo una operación contada se devuelve, y una vez; una
     * `consumida` no vuelve nunca, y una de antes (sin desglose) no se puede devolver. Contesta si devolvió.
     */
    async liberar(userId: string, operacion: string, dia: string): Promise<boolean> {
      const ref = docDelDia(userId, diaDe(dia));
      return deps.db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const entrada = entradaDe(snap.data(), operacion);
        if (entrada?.estado !== 'contada' || !entrada.cuenta) return false;
        const used = (snap.data() || {}) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: now(), operaciones: { [claveDeOperacion(operacion)]: 'devuelta' } };
        for (const [modality, n] of Object.entries(entrada.cuenta)) patch[modality] = Math.max(0, Number(used[modality] || 0) - Number(n));
        tx.set(ref, patch, { merge: true });
        return true;
      });
    },

    /**
     * LOS HUECOS SE QUEDAN GASTADOS: la persona pidió cancelar cuando el proveedor ya trabajaba. Desde aquí, `liberar`
     * no los devuelve. Solo una operación contada cambia; contesta si cambió.
     */
    async consumir(userId: string, operacion: string, dia: string): Promise<boolean> {
      const ref = docDelDia(userId, diaDe(dia));
      return deps.db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (entradaDe(snap.data(), operacion)?.estado !== 'contada') return false;
        tx.set(ref, { updatedAt: now(), operaciones: { [claveDeOperacion(operacion)]: 'consumida' } }, { merge: true });
        return true;
      });
    },
  };
}

export const limiter = createLimiter({ db: () => getFirestore() as unknown as LimiterDb });

/**
 * Dólares de coste real de proveedor gastados hoy, según aiUsage/{día}.byProvider
 * (el libro los suma al CERRAR cada generación). Es una cuenta aproximada: lo que
 * está en marcha todavía no cuenta y la lectura se cachea un minuto, así que un
 * tope basado en esto es blando: corta en cuanto lo ve, no al céntimo.
 *
 * Cuenta también `usdEnRiesgo` (H0 #22): el coste ESTIMADO de los fallos que
 * llegaron al proveedor y pudieron cobrarse. Sin él, una racha de vídeos aceptados
 * y fallidos gastaba sin que el tope lo viera.
 */
export function providerUsdToday(usage: Record<string, any> | undefined, provider: string): number {
  const fila = usage?.byProvider?.[provider];
  const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return numero(fila?.usd) + numero(fila?.usdEnRiesgo);
}

/** Dólares gastados hoy en todos los proveedores juntos (ver `providerUsdToday`). */
export function usdToday(usage: Record<string, any> | undefined): number {
  const porProveedor = usage?.byProvider;
  if (!porProveedor || typeof porProveedor !== 'object') return 0;
  return Object.keys(porProveedor).reduce((total, p) => total + providerUsdToday(usage, p), 0);
}

/** Llamadas hechas hoy por un proveedor según aiUsage/{día}. */
export function providerCallsToday(usage: Record<string, any> | undefined, provider: string): number {
  if (!usage) return 0;
  const direct = usage.byProvider?.[provider]?.calls;
  if (typeof direct === 'number') return direct;
  let total = 0;
  for (const [key, value] of Object.entries(usage)) {
    if (key === 'byProvider' || key === 'updatedAt' || !value || typeof value !== 'object') continue;
    const calls = (value as Record<string, any>)[provider]?.calls;
    if (typeof calls === 'number') total += calls;
  }
  return total;
}
