import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { creditEngine } from './creditEngine';
import { allCreditCosts, CREDIT_PACKAGES, invalidateCostOverrides, isCreditService, loadCostOverrides } from './creditCosts';
import { assertLimit, assertRequestId, cleanText, toHttpsError } from './creditValidation';
import { assertAdmin } from '../shared/admin';
import { PaymentProvider, restorePurchases, validatePurchase } from '../payments/purchaseValidation';

/**
 * Cloud Functions del Credit Engine (docs/CREDITS.md §10).
 * El cliente solo pasa por aquí; nunca escribe Credits en Firestore.
 */
const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

const uidOf = (request: { auth?: { uid: string } | null }): string => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  return request.auth.uid;
};

const run = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw toHttpsError(error);
  }
};

/** Saldo de la cuenta (inicializa la cuenta, migra el saldo anterior y otorga la bienvenida la primera vez). */
export const getCreditsBalance = onCall(OPTS, async (request) =>
  run(async () => {
    const userId = uidOf(request);
    const balance = await creditEngine.getBalance(userId);
    return balance;
  })
);

export const getCreditHistory = onCall(OPTS, async (request) =>
  run(async () => {
    const userId = uidOf(request);
    const data = (request.data || {}) as { limit?: number };
    const items = await creditEngine.getCreditHistory(userId, data.limit);
    return { items };
  })
);

/** Costo de un servicio, o de todos si no se indica ninguno. */
export const getCreditCost = onCall(OPTS, async (request) =>
  run(async () => {
    uidOf(request);
    await loadCostOverrides();
    const data = (request.data || {}) as { service?: string };
    const costs = allCreditCosts();
    if (data.service) {
      if (!isCreditService(data.service)) throw new HttpsError('invalid-argument', `Servicio desconocido: ${data.service}`);
      return { service: data.service, credits: costs[data.service] };
    }
    return { costs, packages: CREDIT_PACKAGES };
  })
);

/**
 * Gastar Credits por un servicio. El monto lo decide el servidor (catálogo);
 * requestId hace la operación idempotente. Devuelve la autorización; quien
 * ejecute la IA debe completarla o reembolsarla.
 *
 * ── RESERVADO: NO HABILITADO COMO RUTA DE PRODUCTO ─────────────────────────
 *
 * Esto AUTORIZA Credits y no los liquida: deja la transacción en `AUTHORIZED`
 * confiando en que quien llame la complete o la reembolse después. Ninguna
 * pantalla de Weë lo usa —`creditsService.spend()` existe en el cliente y no lo
 * invoca nadie— y por eso hoy no hay ninguna operación que pueda quedarse
 * retenida por aquí.
 *
 * Si algún día se habilita, necesita lo mismo que las demás operaciones, que ya
 * está escrito y probado en otro sitio: un plazo del que derivar el presupuesto
 * (`presupuestoDeIntento`), y una forma de distinguir «en marcha» de
 * «abandonada» (`operacionAbandonada`) para poder devolver lo retenido. Sin
 * eso, un cliente que autorice y no vuelva deja el saldo mermado sin
 * contrapartida y sin forma de recuperarlo salvo administración.
 *
 * Mientras tanto: autorizar desde el cliente no sirve para nada que Weë haga,
 * porque quien ejecuta la IA es el servidor y cobra él.
 *
 * ── CERRADO AL CLIENTE (2026-09-30, auditoría H0, escenario #24) ───────────
 *
 * Abierto, sí servía para algo: para pagar menos. Un cliente modificado podía
 * reservar aquí 1 Credit con el `requestId` de una operación cara suya (el
 * `jobId` de creatorRun, el de un avatar o el de una búsqueda de Brain). El
 * servidor, al reservar después con ese mismo id, recibía «duplicado» y
 * completaba contra lo ya reservado, así que la operación entera costaba 1.
 * Por eso solo administración puede llamarlo, igual que `grantCredits` y
 * `refundCredits`. Ese candado vive aquí, en el código, porque firebase-tools
 * vuelve a poner el invocador público de Cloud Run en cada despliegue de un
 * callable; quitarlo por IAM (hecho el 2026-09-30) es solo una segunda barrera.
 * La prueba es `test/credits-cliente-cerrado.test.mjs`.
 */
export const spendCredits = onCall(OPTS, async (request) =>
  run(async () => {
    assertAdmin(request.auth as any);
    const userId = uidOf(request);
    const data = (request.data || {}) as { service?: string; requestId?: string; reason?: string; generationId?: string };
    if (!isCreditService(data.service)) throw new HttpsError('invalid-argument', `Servicio desconocido: ${String(data.service)}`);
    await creditEngine.ensureAccount(userId);
    return creditEngine.spendCredits({
      userId,
      service: data.service,
      requestId: assertRequestId(data.requestId),
      reason: cleanText(data.reason, 140, undefined) || undefined,
      source: 'client',
      generationId: data.generationId ? cleanText(data.generationId, 160) : undefined,
    });
  })
);

/** Otorgar Credits (solo administración; las compras llegan por validatePurchase). */
export const grantCredits = onCall(OPTS, async (request) =>
  run(async () => {
    assertAdmin(request.auth as any);
    const data = (request.data || {}) as { userId?: string; amount?: number; reason?: string; requestId?: string };
    return creditEngine.grantCredits({
      userId: String(data.userId || ''),
      amount: Number(data.amount),
      reason: cleanText(data.reason, 140, 'Credits de regalo'),
      source: 'admin',
      requestId: data.requestId || `admin_${Date.now()}`,
    });
  })
);

/** Reembolsar una operación (solo administración; los flujos de IA reembolsan solos al fallar). */
export const refundCredits = onCall(OPTS, async (request) =>
  run(async () => {
    assertAdmin(request.auth as any);
    const data = (request.data || {}) as { userId?: string; requestId?: string; reason?: string; force?: boolean };
    return creditEngine.refundCredits({
      userId: String(data.userId || ''),
      requestId: String(data.requestId || ''),
      reason: cleanText(data.reason, 140, 'Reembolso por administración'),
      source: 'admin',
      force: data.force === true,
    });
  })
);

/** Compra: el proveedor valida el comprobante y el Credit Engine acredita el paquete. */
export const validatePurchaseCallable = onCall(OPTS, async (request) =>
  run(async () => {
    const userId = uidOf(request);
    const data = (request.data || {}) as { provider?: PaymentProvider; packageId?: string; payload?: Record<string, unknown> };
    const provider = data.provider || 'test';
    await creditEngine.ensureAccount(userId);
    return validatePurchase({ userId, provider, packageId: data.packageId, payload: data.payload });
  })
);

export const restorePurchaseCallable = onCall(OPTS, async (request) =>
  run(async () => {
    const userId = uidOf(request);
    const data = (request.data || {}) as { provider?: PaymentProvider; payload?: Record<string, unknown> };
    return restorePurchases({ userId, provider: data.provider || 'apple', payload: data.payload });
  })
);

/** Panel de administración (docs/CREDITS.md §12): estadísticas, historial de una persona, fallidas, costos. */
export const creditsAdmin = onCall(OPTS, async (request) =>
  run(async () => {
    assertAdmin(request.auth as any);
    const data = (request.data || {}) as Record<string, any>;
    const db = getFirestore();
    switch (String(data.action || 'stats')) {
      case 'stats': {
        const [global, daily] = await Promise.all([
          db.collection('creditStats').doc('global').get(),
          db.collection('creditStats').orderBy('updatedAt', 'desc').limit(31).get(),
        ]);
        return { global: global.data() || {}, daily: daily.docs.filter((d) => d.id.startsWith('daily_')).map((d) => ({ id: d.id, ...d.data() })) };
      }
      case 'userHistory':
        return { items: await creditEngine.getCreditHistory(String(data.userId || ''), data.limit) };
      case 'balance':
        /* Una consulta de administración no escribe: sin inicializar, 0 y `initialized: false` (nada de bienvenida). */
        return creditEngine.readBalance(String(data.userId || ''));
      case 'failed': {
        /* El techo de siempre (`assertLimit`: 50 por defecto, 200 como mucho): un número cualquiera del panel no lee la colección entera. */
        const snap = await db.collection('creditTransactions').where('status', '==', 'REFUNDED').orderBy('createdAt', 'desc').limit(assertLimit(data.limit)).get();
        return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
      }
      case 'costs': {
        await loadCostOverrides(true);
        return { costs: allCreditCosts(), packages: CREDIT_PACKAGES };
      }
      case 'setCost': {
        if (!isCreditService(data.service)) throw new HttpsError('invalid-argument', 'Servicio desconocido');
        const credits = Math.floor(Number(data.credits));
        if (!Number.isFinite(credits) || credits < 0) throw new HttpsError('invalid-argument', 'credits inválido');
        await db.collection('creditCosts').doc(data.service).set({ credits, updatedAt: new Date() }, { merge: true });
        invalidateCostOverrides();
        return { ok: true };
      }
      default:
        throw new HttpsError('invalid-argument', `Acción desconocida: ${data.action}`);
    }
  })
);
