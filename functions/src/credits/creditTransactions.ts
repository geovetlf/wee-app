import { CreditService } from './creditCosts';
import { ServicioMicro } from './microCreditos';

/**
 * Transacciones de Credits: creditTransactions/{transactionId} (docs/CREDITS.md §2).
 * Cada movimiento deja un documento inmutable salvo su estado.
 */
export type TransactionType = 'purchase' | 'usage' | 'grant' | 'refund';
export type TransactionStatus = 'PENDING' | 'AUTHORIZED' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface CreditTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  /** Con signo: negativo para usage, positivo para purchase / grant / refund. */
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  /** Concepto legible para la persona: "Generación de imagen", "Compra de Credits". */
  reason: string;
  /** Quién originó el movimiento: weë-creator, wee-avatar, store:test, apple, google, stripe, welcome, migration, admin. */
  source: string;
  service?: CreditService | ServicioMicro;
  generationId?: string;
  purchaseId?: string;
  status: TransactionStatus;
  statusHistory: { status: TransactionStatus; at: unknown }[];
  /** Identificador único de la operación (idempotencia). */
  requestId?: string;
  /** Para usage: monto autorizado y final; para refund: la transacción que reembolsa. */
  authorizedAmount?: number;
  /** Para usage: la huella de la operación, si quien cobró la dio (ver `SpendInput.fingerprint`). */
  fingerprint?: string;
  finalAmount?: number;
  refundOf?: string;
  /*
   * µCREDITS (autorización del dueño, 2026-11-07). Solo en los asientos de los servicios con precisión fraccionaria
   * (`SERVICIOS_MICRO`: la traducción). En ellos `amount` vale 0 y lo que cuenta va en µCredits (1 Credit = 10⁶):
   * `amountMicro` con signo como `amount`, lo autorizado y lo final, y el saldo total antes y después. `balanceBefore` y
   * `balanceAfter` siguen siendo los Credits ENTEROS del saldo. Los asientos enteros no llevan ninguno de estos campos.
   */
  unidad?: 'micro';
  amountMicro?: number;
  authorizedAmountMicro?: number;
  finalAmountMicro?: number;
  balanceBeforeMicro?: number;
  balanceAfterMicro?: number;
  meta?: Record<string, unknown>;
  createdAt: unknown;
  updatedAt: unknown;
  completedAt?: unknown;
  refundedAt?: unknown;
}

/** Ids deterministas: la misma operación siempre cae en el mismo documento (idempotencia). */
export const usageTransactionId = (requestId: string) => `usage_${requestId}`;
export const refundTransactionId = (requestId: string) => `refund_${requestId}`;
export const adjustmentTransactionId = (requestId: string) => `adjust_${requestId}`;
export const grantTransactionId = (requestId: string) => `grant_${requestId}`;
export const purchaseTransactionId = (purchaseId: string) => `purchase_${purchaseId}`;
export const welcomeTransactionId = (userId: string) => `grant_welcome_${userId}`;
export const migrationTransactionId = (userId: string) => `migration_${userId}`;

export const STATS_DOC = 'global';
export const dailyStatsId = (date = new Date()) => `daily_${date.toISOString().slice(0, 10)}`;

/**
 * Acumulados para el panel de administración (creditStats/global y creditStats/daily_YYYY-MM-DD):
 * totalPurchased · totalGranted · totalSpent · totalRefunded · circulating · revenueUsd ·
 * byService.{servicio}.{spent, count, refunded} · transactions.{type} · failed
 * y, de los servicios en µCredits, totalSpentMicro · totalRefundedMicro · circulatingMicro · byService.{servicio}.{spentMicro, refundedMicro}
 */
export interface StatsDelta {
  totalPurchased?: number;
  totalGranted?: number;
  totalSpent?: number;
  totalRefunded?: number;
  circulating?: number;
  revenueUsd?: number;
  failed?: number;
  totalSpentMicro?: number;
  totalRefundedMicro?: number;
  circulatingMicro?: number;
  byService?: Partial<Record<CreditService | ServicioMicro, { spent?: number; count?: number; refunded?: number; spentMicro?: number; refundedMicro?: number }>>;
  transactions?: Partial<Record<TransactionType, number>>;
}

/** Convierte un delta en un objeto de incrementos anidados (se escribe con merge). */
export function statsUpdate(delta: StatsDelta, inc: (n: number) => unknown, now: () => unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { updatedAt: now() };
  for (const key of ['totalPurchased', 'totalGranted', 'totalSpent', 'totalRefunded', 'circulating', 'revenueUsd', 'failed', 'totalSpentMicro', 'totalRefundedMicro', 'circulatingMicro'] as const) {
    const value = delta[key];
    if (value) out[key] = inc(value);
  }
  if (delta.byService) {
    out.byService = Object.fromEntries(
      Object.entries(delta.byService).map(([service, v]) => [
        service,
        Object.fromEntries(Object.entries(v || {}).filter(([, n]) => n).map(([k, n]) => [k, inc(n as number)])),
      ])
    );
  }
  if (delta.transactions) {
    out.transactions = Object.fromEntries(Object.entries(delta.transactions).filter(([, n]) => n).map(([k, n]) => [k, inc(n as number)]));
  }
  return out;
}
