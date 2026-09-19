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
  /**
   * Cómo se llama el paquete.
   *
   * `nombreClave` cuando es una palabra —«Básico»— y hay que traducirla;
   * `name` cuando es un nombre de producto —«Plus», «Black Pro»— que se escribe
   * igual en todos los idiomas. Nunca los dos a la vez.
   */
  name?: string;
  nombreClave?: string;
  credits: number;
  priceUsd: number;
  priceLabel: string;
  popular?: boolean;
  /** La etiqueta del paquete, como clave: «Popular», «Mejor valor». */
  badgeClave?: string;
  productId: string; // IAP product ID for App Store / Play Store
}

/** Compatibilidad con código anterior (alias del saldo). */
export type Wallet = CreditsBalance;
export type Transaction = CreditTransaction;

// ─── Paquetes (para mostrar; el servidor es la autoridad al acreditar) ───

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'basic', nombreClave: 'credits.pkgBasic', credits: 40, priceUsd: 4.99, priceLabel: '$4.99', productId: 'zone.wee.credits.basic' },
  { id: 'plus', name: 'Plus', credits: 90, priceUsd: 9.99, priceLabel: '$9.99', popular: true, badgeClave: 'credits.badgePopular', productId: 'zone.wee.credits.plus' },
  { id: 'blackpro', name: 'Black Pro', credits: 200, priceUsd: 19.9, priceLabel: '$19.90', badgeClave: 'credits.badgeBestValue', productId: 'zone.wee.credits.blackpro' },
];

// ─── Helpers ───

/*
 * LOS CREDITS SON POR CUENTA, Y LA CUENTA NO SE ADIVINA.
 *
 * El Perfil Weë comparte el saldo del perfil real porque los dos son la misma
 * cuenta: la de Firebase Auth. Aquí había una función que «deducía» la cuenta
 * quitándole el prefijo heredado al uid de un perfil —identidad legacy →
 * recorte de texto → cuenta—. Se ha ido. La regla es la contraria:
 *
 *   IDENTIDAD AUTENTICADA → resolutor canónico → CUENTA
 *
 * En el cliente la identidad autenticada es `user.uid`, que ES la cuenta, así
 * que no hay nada que resolver: quien llama pasa la cuenta y este servicio la
 * usa tal cual. En el servidor el Credit Engine hace lo mismo con
 * `request.auth.uid` y `users.where('uid', '==', …)`. Quien necesite la cuenta
 * de OTRA identidad —una cara, una Página— la resuelve con `cuentaDeIdentidad`
 * (`utils/econtactModel.ts`), que LEE `users.linkedAccountId`, y nunca con un
 * `replace` sobre el uid.
 */
const cuentaValida = (accountUid?: string | null): accountUid is string =>
  typeof accountUid === 'string' && accountUid.length > 0 && !accountUid.includes('/');

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

  /** Saldo en tiempo real. `accountUid` es la CUENTA (uid de Firebase Auth), no un perfil. */
  subscribeToBalance(accountUid: string, callback: (account: CreditsBalance) => void): () => void {
    if (!cuentaValida(accountUid) || !db) {
      callback(emptyBalance(accountUid || ''));
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

  /** Historial en tiempo real (creditTransactions, más recientes primero). `accountUid` es la CUENTA. */
  subscribeToTransactions(accountUid: string, callback: (transactions: CreditTransaction[]) => void, maxResults = 50): () => void {
    if (!cuentaValida(accountUid) || !db) {
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
      /*
       * Los precios y los Credits los manda el servidor; el nombre y la
       * etiqueta son cosa de la interfaz y salen del catálogo local, como
       * CLAVES. Así un paquete nuevo del servidor no llega sin traducir.
       */
      return {
        ...pkg,
        priceLabel: `$${pkg.priceUsd.toFixed(2)}`,
        popular: local?.popular,
        name: local?.name,
        nombreClave: local?.nombreClave,
        badgeClave: local?.badgeClave,
      };
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
  /** Lo que mandó el servidor, ya escrito. Contenido: se pinta tal cual. */
  title: string | null;
  /** Qué decir cuando el servidor no mandó nada. Clave de i18n, no frase. */
  tituloClave: string | null;
  /** El estado del movimiento —devuelto, en proceso—, también como clave. */
  detalleClave?: string;
  /** Monto con signo tal como se muestra (−10, +40). */
  amount: number;
  positive: boolean;
  /** Saldo resultante tras el movimiento. */
  balanceAfter: number;
}

/*
 * DEVUELVE CLAVES, NO FRASES.
 *
 * Este archivo se importa fuera de React, donde no hay traductor: llamar a `t()`
 * aquí congelaría el idioma del arranque. Así que dice QUÉ hay que decir y deja
 * que lo diga quien pinta, que es el patrón del §8 —el mismo de
 * `constants/specialists.ts`—.
 *
 * `tituloClave` es null cuando el servidor mandó su propia razón en `tx.reason`:
 * eso es contenido, viene ya escrito y no se traduce.
 *
 * No se toca ni un número: `amount`, `positive` y `balanceAfter` salen igual que
 * antes. Lo único que cambia es que el texto deja de estar en español fijo.
 */
export const describeTransaction = (tx: CreditTransaction): TransactionView => {
  const amount = typeof tx.amount === 'number' ? tx.amount : 0;
  const positive = amount >= 0;
  let detalleClave: string | undefined;
  if (tx.type === 'usage') {
    if (tx.status === 'REFUNDED' || tx.status === 'FAILED') detalleClave = 'credits.txRefunded';
    else if (tx.status === 'AUTHORIZED' || tx.status === 'PENDING') detalleClave = 'credits.txPending';
  } else if (tx.type === 'refund') {
    detalleClave = 'credits.txRefund';
  }
  const tituloClave = tx.type === 'purchase' ? 'credits.txPurchase'
    : tx.type === 'grant' ? 'credits.txGrant'
      : tx.type === 'refund' ? 'credits.txRefund'
        : 'credits.txUsage';
  return {
    /** La razón que mandó el servidor, si la mandó. Es contenido: no se traduce. */
    title: tx.reason || null,
    tituloClave: tx.reason ? null : tituloClave,
    detalleClave,
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
