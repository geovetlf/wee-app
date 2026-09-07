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
    /** Reserva cupo para las generaciones pedidas; lanza RATE_LIMITED si alguna modalidad se pasa. */
    async reserve(userId: string, counts: Partial<Record<Modality, number>>, limits: UsageLimits = DEFAULT_LIMITS): Promise<void> {
      const wanted = Object.entries(counts).filter(([, n]) => (n || 0) > 0) as [Modality, number][];
      if (!wanted.length) return;
      const ref = deps.db().collection('aiRateLimits').doc(`${userId}_${dayKey()}`);
      await deps.db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const used = (snap.data() || {}) as Record<string, number>;
        const patch: Record<string, unknown> = { userId, day: dayKey(), updatedAt: now() };
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
