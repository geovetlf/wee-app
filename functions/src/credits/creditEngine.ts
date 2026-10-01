import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CreditService, getCreditCost, loadCostOverrides, SERVICE_LABEL, WELCOME_CREDITS } from './creditCosts';
import { assertAmount, assertFingerprint, assertLimit, assertRequestId, assertService, assertUserId, cleanText, CreditError } from './creditValidation';
import { cuentaDeIdentidad, PerfilDeIdentidad } from '../social/econtact';
import {
  adjustmentTransactionId,
  CreditTransaction,
  dailyStatsId,
  grantTransactionId,
  migrationTransactionId,
  purchaseTransactionId,
  refundTransactionId,
  STATS_DOC,
  StatsDelta,
  statsUpdate,
  TransactionStatus,
  usageTransactionId,
  welcomeTransactionId,
} from './creditTransactions';

/**
 * CREDIT ENGINE (docs/CREDITS.md).
 *
 *   Cliente → Firebase Auth → Cloud Functions → Credit Engine → Firestore
 *
 * Único responsable de leer y mover Credits. El saldo vive en el perfil real
 * de la persona (users/{doc con uid == auth.uid}: creditsBalance,
 * creditsLifetimeEarned, creditsLifetimeSpent) y cada movimiento queda en
 * creditTransactions/{id}. Todo cambio de saldo ocurre dentro de una
 * transacción de Firestore; el saldo nunca baja de cero; cada operación tiene
 * un id determinista (requestId) para que repetirla no cobre dos veces.
 */

// ── Interfaz mínima de Firestore (permite un doble en memoria para las pruebas) ──
export interface CreditDocSnap {
  exists: boolean;
  id: string;
  ref: CreditDocRef;
  data(): Record<string, any> | undefined;
}
export interface CreditDocRef {
  id: string;
  path: string;
  get(): Promise<CreditDocSnap>;
}
export interface CreditQuery {
  where(field: string, op: '==', value: unknown): CreditQuery;
  orderBy(field: string, direction?: 'asc' | 'desc'): CreditQuery;
  limit(n: number): CreditQuery;
  get(): Promise<{ docs: CreditDocSnap[]; empty: boolean }>;
}
export interface CreditCollection extends CreditQuery {
  doc(id?: string): CreditDocRef;
}
export interface CreditTx {
  get(target: CreditDocRef): Promise<CreditDocSnap>;
  get(target: CreditQuery): Promise<{ docs: CreditDocSnap[]; empty: boolean }>;
  set(ref: CreditDocRef, data: Record<string, unknown>, options?: { merge?: boolean }): void;
  update(ref: CreditDocRef, data: Record<string, unknown>): void;
}
export interface CreditDb {
  collection(path: string): CreditCollection;
  runTransaction<T>(fn: (tx: CreditTx) => Promise<T>): Promise<T>;
}

export interface CreditEngineDeps {
  db: () => CreditDb;
  increment: (n: number) => unknown;
  now: () => unknown;
  welcomeCredits?: number;
  /** Carga las sobreescrituras de costos (Firestore). Las pruebas pasan un no-op. */
  loadCosts?: () => Promise<unknown>;
}

// ── Contratos ──
export interface AccountBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface SpendInput {
  userId: string;
  service: CreditService;
  requestId: string;
  /** Solo código de servidor de confianza (p. ej. el plan de Weë Creator); nunca del cliente. */
  amount?: number;
  reason?: string;
  source: string;
  generationId?: string;
  meta?: Record<string, unknown>;
  /**
   * LA HUELLA DE LA OPERACIÓN. Solo código de servidor, y solo quien sabe
   * exactamente qué se pide —`generateVideo`: el vídeo pedido—. Se guarda con la
   * reserva, y entonces un `requestId` repetido solo es la MISMA operación si
   * trae la misma huella y el mismo importe. Sin huella, la identidad es la
   * cuenta y el servicio.
   */
  fingerprint?: string;
}

export interface SpendResult {
  transactionId: string;
  status: TransactionStatus;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  /** true si la misma operación ya se había cobrado (no se volvió a cobrar). */
  duplicate: boolean;
  /**
   * CUÁNDO SE AUTORIZÓ, en milisegundos. Solo cuando es duplicada.
   *
   * Sirve para una pregunta que no se podía responder: una operación que sigue
   * en `AUTHORIZED` ¿está en marcha o se quedó colgada porque el proceso que la
   * ejecutaba murió? Las dos se ven igual, y tratarlas igual —«es un
   * duplicado»— deja los Credits retenidos para siempre. Con la antigüedad se
   * pueden distinguir.
   */
  authorizedAt?: number;
}

export interface CompleteInput {
  userId: string;
  requestId: string;
  /** Costo final si fue menor que el autorizado: la diferencia se devuelve. */
  finalAmount?: number;
  /** Datos del resultado (p. ej. la URL generada) para responder igual si se repite la operación. */
  meta?: Record<string, unknown>;
}

export interface RefundInput {
  userId: string;
  requestId: string;
  reason?: string;
  source?: string;
  /** Permite reembolsar una operación COMPLETED (solo administración). */
  force?: boolean;
}

export interface RefundResult {
  transactionId: string;
  amount: number;
  balanceAfter: number;
  duplicate: boolean;
}

export interface GrantInput {
  userId: string;
  amount: number;
  reason: string;
  source: string;
  type?: 'grant' | 'purchase';
  requestId?: string;
  purchaseId?: string;
  priceUsd?: number;
  meta?: Record<string, unknown>;
}

export interface GrantResult {
  transactionId: string;
  amount: number;
  balanceAfter: number;
  duplicate: boolean;
}

const CREDIT_FIELDS = ['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent'] as const;

/** Objeto plano: se puede recorrer sin romper nada que Firestore trate especial. */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Quita los `undefined` EN PROFUNDIDAD antes de escribir en Firestore, que los
 * rechaza. Limpiar solo el primer nivel no bastaba: el presupuesto de un trabajo
 * viaja anidado en `meta.steps[]`, así que una operación de una sola imagen metía
 * `volumeDiscount: undefined` dentro del array y tumbaba la reserva entera antes
 * de llamar a ningún proveedor.
 *
 * Solo se entra en objetos planos y arrays. Los Timestamp y los valores especiales
 * de Firestore (increment, serverTimestamp) se devuelven intactos: recorrerlos los
 * convertiría en objetos corrientes y perderían su significado.
 */
export const strip = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => strip(item)) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = strip(v);
    return out as T;
  }
  return value;
};

export function createCreditEngine(deps: CreditEngineDeps) {
  const { increment, now } = deps;
  const db = () => deps.db();
  const welcome = deps.welcomeCredits ?? WELCOME_CREDITS;
  const loadCosts = deps.loadCosts ?? loadCostOverrides;

  const users = () => db().collection('users');
  const transactions = () => db().collection('creditTransactions');
  const stats = () => db().collection('creditStats');

  const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

  /*
   * EL DOCUMENTO QUE GUARDA EL SALDO TIENE QUE SER EL PERFIL REAL DE ESA CUENTA
   * (Fase 11.x-4A). Lo decide el resolutor canónico, el mismo de ËContact y del
   * push: el documento dice ser esa identidad y es de tipo real. Un documento
   * que diga otra cosa —otro tipo, otro uid— no guarda Credits de nadie.
   */
  const esElPerfilDeLaCuenta = (userId: string, account: CreditDocSnap): boolean =>
    cuentaDeIdentidad(userId, (account.data() || {}) as PerfilDeIdentidad) === userId;

  /*
   * QUÉ PERFIL GUARDA EL SALDO CUANDO HAY MÁS DE UNO (revisión post-auditoría 2026-10-01,
   * money/remigracion-por-segundo-perfil).
   *
   * Una cuenta puede tener más de un Perfil Real: en producción hay cuentas así
   * (utils/perfilCanonico.ts), y las reglas dejan crear `users/<uid>` aunque ya
   * exista uno con id automático, porque no pueden consultar. Firestore devuelve
   * la consulta por `uid` ordenada por id de documento; quedarse con «el primero»
   * podía saltar a un perfil vacío y dejar el saldo de verdad inalcanzable (y
   * `ensureAccount` volvía a migrar la billetera antigua). El saldo vive en el
   * perfil que YA está inicializado: ese manda. Si ninguno lo está, el primero,
   * como siempre; si varios lo están, el primero de ellos, como siempre.
   */
  const PERFILES_POR_CUENTA = 10;
  const perfilDelSaldo = (userId: string, docs: CreditDocSnap[]): CreditDocSnap | undefined => {
    const suyos = docs.filter((d) => esElPerfilDeLaCuenta(userId, d));
    return suyos.find((d) => typeof (d.data() || {}).creditsBalance === 'number') ?? suyos[0];
  };

  /** Perfil real de la persona (uid == auth uid). Los Credits son por cuenta, no por identidad. */
  const findAccount = async (tx: CreditTx, userId: string): Promise<CreditDocSnap> => {
    const snap = await tx.get(users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA));
    const perfil = perfilDelSaldo(userId, snap.docs);
    if (!perfil) {
      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });
    }
    return perfil;
  };

  const balanceOf = (account: CreditDocSnap): AccountBalance => {
    const data = account.data() || {};
    return {
      userId: String(data.uid),
      balance: num(data.creditsBalance),
      lifetimeEarned: num(data.creditsLifetimeEarned),
      lifetimeSpent: num(data.creditsLifetimeSpent),
    };
  };

  const writeStats = (tx: CreditTx, delta: StatsDelta) => {
    const update = statsUpdate(delta, increment, now);
    tx.set(stats().doc(STATS_DOC), update, { merge: true });
    tx.set(stats().doc(dailyStatsId()), update, { merge: true });
  };

  const record = (tx: CreditTx, id: string, data: Omit<CreditTransaction, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'> & { statusHistory?: TransactionStatus[] }) => {
    const at = now();
    const history = (data.statusHistory || [data.status]).map((status) => ({ status, at }));
    tx.set(transactions().doc(id), strip({ ...data, id, statusHistory: history, createdAt: at, updatedAt: at }));
  };

  // ── Cuenta ─────────────────────────────────────────────────────────────
  /**
   * Garantiza que el perfil tenga los campos de Credits. La primera vez migra el
   * saldo de la billetera anterior (wallets/{uid}) y otorga los Credits de bienvenida.
   */
  const ensureAccount = async (rawUserId: string): Promise<AccountBalance & { migrated: number; welcomeGranted: boolean }> => {
    const userId = assertUserId(rawUserId);
    return db().runTransaction(async (tx) => {
      const account = await findAccount(tx, userId);
      const data = account.data() || {};
      const initialized = typeof data.creditsBalance === 'number';
      /*
       * La billetera antigua se migra UNA vez por cuenta, no una vez por perfil: si
       * ya hay un `migration_<uid>`, no se vuelve a acreditar (antes se sobrescribía).
       */
      const yaMigrada = initialized ? true : (await tx.get(transactions().doc(migrationTransactionId(userId)))).exists;
      const legacy = initialized || yaMigrada ? null : await tx.get(db().collection('wallets').doc(userId));
      const welcomeDoc = welcome > 0 ? await tx.get(transactions().doc(welcomeTransactionId(userId))) : null;

      let balance = num(data.creditsBalance);
      let earned = num(data.creditsLifetimeEarned);
      let spent = num(data.creditsLifetimeSpent);
      let migrated = 0;
      let welcomeGranted = false;
      let granted = 0;
      let grantCount = 0;
      const patch: Record<string, unknown> = {};

      if (!initialized) {
        const wallet = legacy && legacy.exists ? legacy.data() || {} : {};
        migrated = Math.max(0, Math.floor(num(wallet.balance)));
        balance = migrated;
        earned = Math.max(0, Math.floor(num(wallet.totalPurchased)));
        spent = Math.max(0, Math.floor(num(wallet.totalSpent)));
        patch.creditsInitializedAt = now();
        if (migrated > 0) {
          granted += migrated;
          grantCount += 1;
          record(tx, migrationTransactionId(userId), {
            userId,
            type: 'grant',
            amount: migrated,
            balanceBefore: 0,
            balanceAfter: migrated,
            reason: 'Saldo anterior',
            source: 'migration',
            status: 'COMPLETED',
            requestId: migrationTransactionId(userId),
          });
        }
      }

      if (welcomeDoc && !welcomeDoc.exists) {
        const before = balance;
        balance += welcome;
        earned += welcome;
        welcomeGranted = true;
        record(tx, welcomeTransactionId(userId), {
          userId,
          type: 'grant',
          amount: welcome,
          balanceBefore: before,
          balanceAfter: balance,
          reason: 'Credits de bienvenida',
          source: 'welcome',
          status: 'COMPLETED',
          requestId: welcomeTransactionId(userId),
        });
        granted += welcome;
        grantCount += 1;
      }

      // Un solo incremento de acumulados por transacción (migración + bienvenida)
      if (granted > 0) writeStats(tx, { totalGranted: granted, circulating: granted, transactions: { grant: grantCount } });
      if (!initialized || welcomeGranted) {
        tx.update(account.ref, { ...patch, creditsBalance: balance, creditsLifetimeEarned: earned, creditsLifetimeSpent: spent, updatedAt: now() });
      }
      return { userId, balance, lifetimeEarned: earned, lifetimeSpent: spent, migrated, welcomeGranted };
    });
  };

  const getBalance = async (rawUserId: string): Promise<AccountBalance> => {
    const userId = assertUserId(rawUserId);
    const snap = await users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA).get();
    const perfil = perfilDelSaldo(userId, snap.docs);
    if (!perfil) {
      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });
    }
    const data = perfil.data() || {};
    if (typeof data.creditsBalance !== 'number') {
      const created = await ensureAccount(userId);
      return { userId, balance: created.balance, lifetimeEarned: created.lifetimeEarned, lifetimeSpent: created.lifetimeSpent };
    }
    return balanceOf(perfil);
  };

  /**
   * ¿ES LA RESERVA GUARDADA LA DE ESTA OPERACIÓN?
   *
   * El mismo servicio, siempre. Y si alguno de los dos lados trae huella, la
   * misma huella y el mismo importe autorizado. Es la regla que el Core ya
   * escribió para la misma clave con otro contenido —`idempotency_conflict` en
   * el Financial Core y en el Job Engine—, aplicada al motor que cobra de verdad.
   *
   * El importe solo cuenta con huella, y a propósito: sin ella, quien cobra no
   * dice qué operación es, y hay puertas —Weë Brain— donde el precio del mismo
   * mensaje puede moverse de un intento a otro porque el historial ya lo incluye.
   */
  const esLaMismaOperacion = (guardada: Record<string, unknown>, service: CreditService, amount: number, fingerprint: string | undefined): boolean => {
    if (guardada.service !== service) return false;
    const suya = typeof guardada.fingerprint === 'string' ? guardada.fingerprint : undefined;
    if (suya === undefined && fingerprint === undefined) return true;
    const autorizado = num(guardada.authorizedAmount) || Math.abs(num(guardada.amount));
    return suya === fingerprint && autorizado === amount;
  };

  // ── Gastar (REQUEST → PENDING → AUTHORIZED) ─────────────────────────────
  const spendCredits = async (input: SpendInput): Promise<SpendResult> => {
    const userId = assertUserId(input.userId);
    const service = assertService(input.service);
    const requestId = assertRequestId(input.requestId);
    const fingerprint = input.fingerprint !== undefined ? assertFingerprint(input.fingerprint) : undefined;
    await loadCosts();
    const amount = input.amount !== undefined ? assertAmount(input.amount) : assertAmount(getCreditCost(service));
    const reason = cleanText(input.reason, 140, SERVICE_LABEL[service]);
    const source = cleanText(input.source, 60, 'wee');
    const id = usageTransactionId(requestId);

    return db().runTransaction(async (tx) => {
      const existing = await tx.get(transactions().doc(id));
      if (existing.exists) {
        // Misma operación repetida (doble clic, reintento): no se cobra de nuevo
        const data = existing.data() || {};
        if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
        if (data.status === 'REFUNDED' || data.status === 'FAILED') {
          // Un requestId reembolsado no se reutiliza: evita generar gratis con una operación ya devuelta
          throw new CreditError('ALREADY_REFUNDED', 'Esta operación ya fue reembolsada; inicia una nueva', { requestId, status: data.status });
        }
        /*
         * LA MISMA CLAVE TIENE QUE SER LA MISMA OPERACIÓN.
         *
         * Antes bastaba con que el `requestId` existiera: una respuesta de Weë
         * Brain ya cobrada (`brain_<messageId>`, COMPLETED) servía de pase para un
         * vídeo, porque la reserva decía «ya está pagado» y nadie volvía a cobrar.
         * Una clave prestada de otra operación no es un reintento: se rechaza sin
         * tocar nada, ni la reserva de antes ni el saldo.
         */
        if (!esLaMismaOperacion(data, service, amount, fingerprint)) {
          throw new CreditError('INVALID_REQUEST', 'Ese requestId pertenece a otra operación; inicia una nueva', { requestId, reason: 'idempotency_conflict' });
        }
        const creado = data.createdAt;
        const authorizedAt = typeof creado?.toMillis === 'function' ? creado.toMillis()
          : typeof creado === 'number' ? creado : undefined;
        return {
          transactionId: id,
          status: data.status as TransactionStatus,
          amount: Math.abs(num(data.amount)),
          balanceBefore: num(data.balanceBefore),
          balanceAfter: num(data.balanceAfter),
          duplicate: true,
          ...(authorizedAt !== undefined ? { authorizedAt } : {}),
        };
      }

      const account = await findAccount(tx, userId);
      const current = balanceOf(account);
      if (typeof (account.data() || {}).creditsBalance !== 'number') {
        throw new CreditError('ACCOUNT_NOT_FOUND', 'La cuenta de Credits todavía no está inicializada', { userId });
      }
      if (current.balance < amount) {
        // Saldo insuficiente: no se modifica nada
        throw new CreditError('INSUFFICIENT_CREDITS', 'No tienes suficientes Credits', { required: amount, available: current.balance, service });
      }

      const balanceAfter = current.balance - amount;
      record(tx, id, {
        userId,
        type: 'usage',
        amount: -amount,
        balanceBefore: current.balance,
        balanceAfter,
        reason,
        source,
        service,
        generationId: input.generationId,
        status: 'AUTHORIZED',
        statusHistory: ['PENDING', 'AUTHORIZED'],
        requestId,
        authorizedAmount: amount,
        fingerprint,
        meta: strip(input.meta),
      });
      tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: current.lifetimeSpent + amount, updatedAt: now() });
      writeStats(tx, { totalSpent: amount, circulating: -amount, byService: { [service]: { spent: amount, count: 1 } }, transactions: { usage: 1 } });
      return { transactionId: id, status: 'AUTHORIZED', amount, balanceBefore: current.balance, balanceAfter, duplicate: false };
    });
  };

  // ── Completar (AUTHORIZED → COMPLETED, con ajuste si costó menos) ─────────
  const completeCredits = async (input: CompleteInput): Promise<{ status: TransactionStatus; refunded: number; balanceAfter: number }> => {
    const userId = assertUserId(input.userId);
    const requestId = assertRequestId(input.requestId);
    const id = usageTransactionId(requestId);

    return db().runTransaction(async (tx) => {
      const usage = await tx.get(transactions().doc(id));
      if (!usage.exists) throw new CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });
      const data = usage.data() || {};
      if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
      const status = data.status as TransactionStatus;
      if (status !== 'AUTHORIZED') {
        // COMPLETED: repetición inofensiva. FAILED/REFUNDED: ya se devolvió; no hay nada que completar.
        return { status, refunded: 0, balanceAfter: num(data.balanceAfter) };
      }
      const authorized = num(data.authorizedAmount) || Math.abs(num(data.amount));
      const final = input.finalAmount === undefined ? authorized : Math.min(authorized, Math.max(0, Math.floor(input.finalAmount)));
      const diff = authorized - final;
      const account = await findAccount(tx, userId);
      const current = balanceOf(account);

      const history = [...(data.statusHistory || []), { status: 'COMPLETED', at: now() }];
      const meta = input.meta ? { ...(data.meta || {}), ...strip(input.meta) } : data.meta;
      tx.update(usage.ref, strip({ status: 'COMPLETED', finalAmount: final, statusHistory: history, completedAt: now(), updatedAt: now(), meta }));

      let balanceAfter = current.balance;
      if (diff > 0) {
        balanceAfter = current.balance + diff;
        record(tx, adjustmentTransactionId(requestId), {
          userId,
          type: 'refund',
          amount: diff,
          balanceBefore: current.balance,
          balanceAfter,
          reason: 'Ajuste: costó menos de lo reservado',
          source: cleanText(data.source, 60, 'wee'),
          service: data.service,
          generationId: data.generationId,
          status: 'COMPLETED',
          requestId,
          refundOf: id,
        });
        tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: Math.max(0, current.lifetimeSpent - diff), updatedAt: now() });
        writeStats(tx, { totalRefunded: diff, circulating: diff, byService: data.service ? { [data.service as CreditService]: { refunded: diff } } : undefined, transactions: { refund: 1 } });
      }
      return { status: 'COMPLETED', refunded: diff, balanceAfter };
    });
  };

  // ── Reembolsar (AUTHORIZED → FAILED → REFUNDED), sin doble reembolso ──────
  const refundCredits = async (input: RefundInput): Promise<RefundResult> => {
    const userId = assertUserId(input.userId);
    const requestId = assertRequestId(input.requestId);
    const usageId = usageTransactionId(requestId);
    const refundId = refundTransactionId(requestId);

    return db().runTransaction(async (tx) => {
      const usage = await tx.get(transactions().doc(usageId));
      if (!usage.exists) throw new CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });
      const data = usage.data() || {};
      if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
      const status = data.status as TransactionStatus;

      if (status === 'REFUNDED') {
        const previous = await tx.get(transactions().doc(refundId));
        const prev = previous.data() || {};
        return { transactionId: refundId, amount: num(prev.amount), balanceAfter: num(prev.balanceAfter), duplicate: true };
      }
      if (status === 'COMPLETED' && !input.force) {
        throw new CreditError('NOT_REFUNDABLE', 'Esta operación ya se completó', { requestId, status });
      }

      // Se devuelve exactamente lo que se cobró (lo autorizado menos ajustes ya devueltos)
      const authorized = num(data.authorizedAmount) || Math.abs(num(data.amount));
      const alreadyAdjusted = status === 'COMPLETED' && typeof data.finalAmount === 'number' ? authorized - num(data.finalAmount) : 0;
      const amount = Math.max(0, authorized - alreadyAdjusted);
      const account = await findAccount(tx, userId);
      const current = balanceOf(account);
      const balanceAfter = current.balance + amount;

      const history = [...(data.statusHistory || []), ...(status === 'FAILED' ? [] : [{ status: 'FAILED', at: now() }]), { status: 'REFUNDED', at: now() }];
      tx.update(usage.ref, { status: 'REFUNDED', statusHistory: history, refundedAt: now(), updatedAt: now(), failureReason: cleanText(input.reason, 140, undefined) });
      record(tx, refundId, {
        userId,
        type: 'refund',
        amount,
        balanceBefore: current.balance,
        balanceAfter,
        reason: cleanText(input.reason, 140, 'Reembolso por generación fallida'),
        source: cleanText(input.source, 60, cleanText(data.source, 60, 'wee')),
        service: data.service,
        generationId: data.generationId,
        status: 'COMPLETED',
        requestId,
        refundOf: usageId,
      });
      if (amount > 0) {
        tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: Math.max(0, current.lifetimeSpent - amount), updatedAt: now() });
      }
      writeStats(tx, { totalRefunded: amount, circulating: amount, failed: 1, byService: data.service ? { [data.service as CreditService]: { refunded: amount } } : undefined, transactions: { refund: 1 } });
      return { transactionId: refundId, amount, balanceAfter, duplicate: false };
    });
  };

  // ── Otorgar (compra validada, regalo, bienvenida) ────────────────────────
  const grantCredits = async (input: GrantInput): Promise<GrantResult> => {
    const userId = assertUserId(input.userId);
    const amount = assertAmount(input.amount);
    const type = input.type === 'purchase' ? 'purchase' : 'grant';
    if (type === 'purchase' && !input.purchaseId) throw new CreditError('INVALID_REQUEST', 'Una compra necesita purchaseId');
    const requestId = input.purchaseId ? assertRequestId(input.purchaseId) : assertRequestId(input.requestId);
    const id = type === 'purchase' ? purchaseTransactionId(requestId) : grantTransactionId(requestId);
    const reason = cleanText(input.reason, 140, type === 'purchase' ? 'Compra de Credits' : 'Credits de regalo');
    const source = cleanText(input.source, 60, type);

    return db().runTransaction(async (tx) => {
      const existing = await tx.get(transactions().doc(id));
      if (existing.exists) {
        const data = existing.data() || {};
        if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
        return { transactionId: id, amount: num(data.amount), balanceAfter: num(data.balanceAfter), duplicate: true };
      }
      const account = await findAccount(tx, userId);
      const current = balanceOf(account);
      const balanceAfter = current.balance + amount;
      record(tx, id, {
        userId,
        type,
        amount,
        balanceBefore: current.balance,
        balanceAfter,
        reason,
        source,
        purchaseId: input.purchaseId,
        status: 'COMPLETED',
        requestId,
        meta: strip({ ...(input.meta || {}), priceUsd: input.priceUsd }),
      });
      tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeEarned: current.lifetimeEarned + amount, updatedAt: now() });
      writeStats(tx, {
        totalPurchased: type === 'purchase' ? amount : 0,
        totalGranted: type === 'grant' ? amount : 0,
        circulating: amount,
        revenueUsd: type === 'purchase' && input.priceUsd ? Number(input.priceUsd) : 0,
        transactions: { [type]: 1 },
      });
      return { transactionId: id, amount, balanceAfter, duplicate: false };
    });
  };

  // ── Consultas ──────────────────────────────────────────────────────────
  const getCreditHistory = async (rawUserId: string, limit?: number): Promise<CreditTransaction[]> => {
    const userId = assertUserId(rawUserId);
    const snap = await transactions().where('userId', '==', userId).orderBy('createdAt', 'desc').limit(assertLimit(limit)).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }) as CreditTransaction);
  };

  const getCost = async (service: CreditService): Promise<number> => {
    await loadCosts();
    return getCreditCost(assertService(service));
  };

  return { ensureAccount, getBalance, spendCredits, completeCredits, refundCredits, grantCredits, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS };
}

export type CreditEngine = ReturnType<typeof createCreditEngine>;

/** Instancia de producción (Firestore real, inicializado por functions/src/index.ts). */
export const creditEngine: CreditEngine = createCreditEngine({
  db: () => getFirestore() as unknown as CreditDb,
  increment: (n) => FieldValue.increment(n),
  now: () => Timestamp.now(),
  welcomeCredits: WELCOME_CREDITS,
  loadCosts: () => loadCostOverrides(),
});
