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
  perUserPerDay: { text: 400, vision: 200, image: 80, video: 12, voice: 60, doc: 100 },
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

export function createLimiter(deps: { db: () => LimiterDb; now?: () => unknown }) {
  const now = deps.now || (() => Timestamp.now());
  return {
    /**
     * Reserva cupo para las generaciones pedidas; lanza RATE_LIMITED si alguna modalidad se pasa.
     *
     * Con `operacion` —el `requestId` de quien pide— la misma operación cuenta UNA
     * vez en el día, aunque llegue dos veces a la vez: la segunda la encuentra
     * apuntada dentro de la misma transacción y no suma. Sin ella, todo es como
     * siempre.
     */
    async reserve(userId: string, counts: Partial<Record<Modality, number>>, limits: UsageLimits = DEFAULT_LIMITS, operacion?: string): Promise<void> {
      const wanted = Object.entries(counts).filter(([, n]) => (n || 0) > 0) as [Modality, number][];
      if (!wanted.length) return;
      const ref = deps.db().collection('aiRateLimits').doc(`${userId}_${dayKey()}`);
      await deps.db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const used = (snap.data() || {}) as Record<string, number>;
        /* Por su resumen: un `requestId` lleva puntos, y un punto en una clave de Firestore es un camino. */
        const clave = operacion ? createHash('sha256').update(operacion, 'utf8').digest('hex').slice(0, 32) : undefined;
        const contadas = (snap.data()?.operaciones || {}) as Record<string, unknown>;
        if (clave && contadas[clave] === true) return;
        const patch: Record<string, unknown> = { userId, day: dayKey(), updatedAt: now(), ...(clave ? { operaciones: { [clave]: true } } : {}) };
        for (const [modality, n] of wanted) {
          const limit = limits.perUserPerDay[modality];
          const current = Number(used[modality] || 0);
          if (limit && limit > 0 && current + n > limit) {
            throw new EngineError('RATE_LIMITED', undefined, { modality, limit, used: current });
          }
          patch[modality] = current + n;
        }
        tx.set(ref, patch, { merge: true });
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
