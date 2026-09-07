import { collection, limit, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';

/**
 * Credits en la app (docs/CREDITS.md).
 *
 *   Cliente → Firebase Auth → Cloud Functions → Credit Engine → Firestore
 *
 * La app NUNCA suma, resta ni modifica Credits: solo lee su saldo (perfil real,
 * campos creditsBalance…) y su historial (creditTransactions), y pide al
 * servidor lo demás (inicializar la cuenta, costos, compras, gastos).
 */

// ─── Tipos (espejo de functions/src/credits) ───

export type CreditService =
  | 'ai_image'
  | 'ai_image_enhance'
  | 'ai_video'
  | 'ai_video_advanced'
  | 'ai_video_edit'
  | 'ai_audio'
  | 'ai_music'
  | 'ai_text'
  | 'ai_book'
  | 'wee_avatar';

export type TransactionType = 'purchase' | 'usage' | 'grant' | 'refund';
export type TransactionStatus = 'PENDING' | 'AUTHORIZED' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface CreditsBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  /** false mientras el servidor no haya creado la cuenta (bienvenida / migración). */
  initialized: boolean;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  /** Con signo: negativo para usage, positivo para purchase / grant / refund. */
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  source: string;
  service?: CreditService;
  generationId?: string;
  purchaseId?: string;
  status: TransactionStatus;
  requestId?: string;
  authorizedAmount?: number;
  finalAmount?: number;
  refundOf?: string;
  createdAt: Timestamp | null;
  completedAt?: Timestamp | null;
  refundedAt?: Timestamp | null;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  priceLabel: string;
  popular?: boolean;
  badge?: string;
  productId: string; // IAP product ID for App Store / Play Store
}

/** Compatibilidad con código anterior (alias del saldo). */
export type Wallet = CreditsBalance;
export type Transaction = CreditTransaction;

// ─── Paquetes (para mostrar; el servidor es la autoridad al acreditar) ───

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'basic', name: 'Básico', credits: 40, priceUsd: 4.99, priceLabel: '$4.99', productId: 'zone.wee.credits.basic' },
  { id: 'plus', name: 'Plus', credits: 90, priceUsd: 9.99, priceLabel: '$9.99', popular: true, badge: 'Popular', productId: 'zone.wee.credits.plus' },
  { id: 'blackpro', name: 'Black Pro', credits: 200, priceUsd: 19.9, priceLabel: '$19.90', badge: 'Mejor valor', productId: 'zone.wee.credits.blackpro' },
];

// ─── Helpers ───

/** Los Credits son por cuenta: el Perfil Weë (hidi_<uid>) comparte el saldo del perfil real. */
export const accountUidOf = (uid?: string | null): string | null => (uid ? uid.replace(/^hidi_/, '') : null);

export interface CreditsShortfall {
  required: number;
  available: number;
  service?: string;
}

/** Si el error viene del Credit Engine por saldo insuficiente, devuelve cuánto falta. */
export const creditsShortfall = (error: unknown): CreditsShortfall | null => {
  const anyError = error as any;
  const details = anyError?.details || anyError?.customData?.details || {};
  const code = String(details?.code || '');
  const message = String(anyError?.message || '');
  if (code === 'INSUFFICIENT_CREDITS' || message.includes('INSUFFICIENT_CREDITS') || message.includes('insufficient-credits')) {
    return {
      required: Number(details?.required ?? 0) || 0,
      available: Number(details?.available ?? 0) || 0,
      service: typeof details?.service === 'string' ? details.service : undefined,
    };
  }
  return null;
};

const call = async <T>(name: string, data?: Record<string, unknown>): Promise<T> => {
  if (!functions) throw new Error('Firebase Functions no está inicializado');
  const fn = httpsCallable<Record<string, unknown>, T>(functions, name, { timeout: 30_000 });
  const result = await fn(data || {});
  return result.data;
};

const emptyBalance = (userId: string): CreditsBalance => ({ userId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, initialized: false });

// ─── Servicio ───

class CreditsService {
  private ensuring = new Set<string>();

  /**
   * Pide al servidor la cuenta de Credits (la crea, migra la billetera anterior y
   * otorga la bienvenida la primera vez). Devuelve null si el servidor no responde.
   */
  async ensureAccount(): Promise<CreditsBalance | null> {
    try {
      const data = await call<{ userId: string; balance: number; lifetimeEarned: number; lifetimeSpent: number }>('getCreditsBalance');
      return { ...data, initialized: true };
    } catch (error) {
      console.warn('Credit Engine: no se pudo inicializar la cuenta:', error);
      return null;
    }
  }

  /** Saldo en tiempo real (perfil real de la cuenta). */
  subscribeToBalance(uid: string, callback: (account: CreditsBalance) => void): () => void {
    const accountUid = accountUidOf(uid);
    if (!accountUid || !db) {
      callback(emptyBalance(uid));
      return () => {};
    }
    const q = query(collection(db, 'users'), where('uid', '==', accountUid), limit(1));
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          callback(emptyBalance(accountUid));
          return;
        }
        const data = snap.docs[0].data() as Record<string, unknown>;
        const initialized = typeof data.creditsBalance === 'number';
        callback({
          userId: accountUid,
          balance: initialized ? (data.creditsBalance as number) : 0,
          lifetimeEarned: typeof data.creditsLifetimeEarned === 'number' ? (data.creditsLifetimeEarned as number) : 0,
          lifetimeSpent: typeof data.creditsLifetimeSpent === 'number' ? (data.creditsLifetimeSpent as number) : 0,
          initialized,
        });
        if (!initialized && !this.ensuring.has(accountUid)) {
          this.ensuring.add(accountUid);
          this.ensureAccount().finally(() => this.ensuring.delete(accountUid));
        }
      },
      () => callback(emptyBalance(accountUid))
    );
  }

  /** Historial en tiempo real (creditTransactions, más recientes primero). */
  subscribeToTransactions(uid: string, callback: (transactions: CreditTransaction[]) => void, maxResults = 50): () => void {
    const accountUid = accountUidOf(uid);
    if (!accountUid || !db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, 'creditTransactions'), where('userId', '==', accountUid), orderBy('createdAt', 'desc'), limit(maxResults));
    return onSnapshot(
      q,
      (snap) => {
        const items: CreditTransaction[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<CreditTransaction, 'id'>) }));
        callback(items);
      },
      () => callback([])
    );
  }

  /** Historial por Cloud Function (misma información; útil sin escucha en tiempo real). */
  async getHistory(maxResults = 50): Promise<CreditTransaction[]> {
    const data = await call<{ items: CreditTransaction[] }>('getCreditHistory', { limit: maxResults });
    return data.items;
  }

  /** Costos vigentes de todos los servicios y paquetes (los decide el servidor). */
  async getCosts(): Promise<{ costs: Record<CreditService, number>; packages: CreditPackage[] }> {
    const data = await call<{ costs: Record<CreditService, number>; packages: Omit<CreditPackage, 'priceLabel'>[] }>('getCreditCost');
    const packages = data.packages.map((pkg) => {
      const local = CREDIT_PACKAGES.find((p) => p.id === pkg.id);
      return { ...pkg, priceLabel: `$${pkg.priceUsd.toFixed(2)}`, popular: local?.popular, badge: local?.badge };
    });
    return { costs: data.costs, packages };
  }

  async getCost(service: CreditService): Promise<number> {
    const data = await call<{ service: CreditService; credits: number }>('getCreditCost', { service });
    return data.credits;
  }

  /**
   * Compra de un paquete. El servidor valida el comprobante con el proveedor y
   * acredita los Credits; el proveedor "test" (recarga de prueba) solo existe en dev.
   */
  async purchase(packageId: string, provider: 'test' | 'apple' | 'google' | 'stripe' = 'test', payload?: Record<string, unknown>) {
    return call<{ transactionId: string; amount: number; balanceAfter: number; duplicate: boolean; credits: number; packageId: string }>('validatePurchase', {
      provider,
      packageId,
      payload: payload || {},
    });
  }

  /**
   * Gasta Credits por un servicio (el costo lo decide el servidor). requestId
   * identifica la operación: repetirla no cobra dos veces.
   */
  async spend(service: CreditService, requestId: string, reason?: string) {
    return call<{ transactionId: string; status: TransactionStatus; amount: number; balanceBefore: number; balanceAfter: number; duplicate: boolean }>('spendCredits', {
      service,
      requestId,
      reason,
    });
  }
}

export const creditsService = new CreditsService();

// ─── Presentación del historial ───

export interface TransactionView {
  title: string;
  detail?: string;
  /** Monto con signo tal como se muestra (−10, +40). */
  amount: number;
  positive: boolean;
  /** Saldo resultante tras el movimiento. */
  balanceAfter: number;
}

export const describeTransaction = (tx: CreditTransaction): TransactionView => {
  const amount = typeof tx.amount === 'number' ? tx.amount : 0;
  const positive = amount >= 0;
  let detail: string | undefined;
  if (tx.type === 'usage') {
    if (tx.status === 'REFUNDED' || tx.status === 'FAILED') detail = 'Reembolsado';
    else if (tx.status === 'AUTHORIZED' || tx.status === 'PENDING') detail = 'En proceso';
  } else if (tx.type === 'refund') {
    detail = 'Reembolso';
  }
  return {
    title: tx.reason || (tx.type === 'purchase' ? 'Compra de Credits' : tx.type === 'grant' ? 'Credits recibidos' : tx.type === 'refund' ? 'Reembolso' : 'Uso de Credits'),
    detail,
    amount,
    positive,
    balanceAfter: typeof tx.balanceAfter === 'number' ? tx.balanceAfter : 0,
  };
};

/** Un requestId único por operación (idempotencia del cobro). */
export const newRequestId = (prefix = 'req'): string => {
  const random = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
};
