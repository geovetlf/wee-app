import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { Plan } from './types';
import { SIMULATED_PRICING } from '../engine/pricing';
import { engine } from '../engine';

/**
 * Credits de Weë Creator: reservar al empezar, ajustar al terminar.
 * Precios por capacidad en pricing/{capabilityId}.credits. Mientras la tabla
 * esté vacía (fase 0, modo demo) todo cuesta 0: los precios no se inventan.
 */
const db = () => getFirestore();

/**
 * Precios de PRUEBA por capacidad: viven en el engine (functions/src/engine/pricing.ts).
 * En modo real, la estimación la da el AI Router (mejor candidato disponible).
 */

/** Credits de bienvenida en modo simulado (la referencia muestra 240). */
const WELCOME_CREDITS = 240;

export const pricingMode = (): 'simulated' | 'real' => (process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated');

export async function estimatePlanCredits(plan: Plan, userId = 'anonymous'): Promise<number> {
  if (pricingMode() === 'simulated') {
    return plan.steps.reduce((sum, s) => sum + (SIMULATED_PRICING[s.capability] ?? 1), 0);
  }
  // Modo real: lo que costaría el mejor proveedor disponible para cada paso
  let total = 0;
  for (const step of plan.steps) {
    const input = step.input || {};
    const decision = await engine.route({
      capability: step.capability,
      input,
      userId,
      goal: plan.goal,
      experienceId: plan.experience,
      prefs: { quality: (input.quality as any) || 'auto', durationSec: input.durationSec ? Number(input.durationSec) : undefined },
    });
    total += decision.candidates[0]?.estimatedCredits ?? 0;
  }
  return total;
}

/** En modo simulado, cada persona empieza con Credits de bienvenida para probar Weë Creator. */
export async function ensureDemoWallet(userId: string): Promise<void> {
  if (pricingMode() !== 'simulated') return;
  const walletRef = db().collection('wallets').doc(userId);
  await db().runTransaction(async (tx) => {
    const wallet = await tx.get(walletRef);
    if (wallet.exists && wallet.data()?.welcomeGranted) return;
    const now = Timestamp.now();
    const balance = (wallet.exists ? Number(wallet.data()?.balance ?? 0) : 0) + WELCOME_CREDITS;
    tx.set(
      walletRef,
      {
        userId,
        balance,
        totalPurchased: FieldValue.increment(WELCOME_CREDITS),
        totalSpent: wallet.exists ? Number(wallet.data()?.totalSpent ?? 0) : 0,
        welcomeGranted: true,
        createdAt: wallet.exists ? wallet.data()?.createdAt ?? now : now,
        updatedAt: now,
      },
      { merge: true }
    );
    tx.set(db().collection('transactions').doc(), {
      userId,
      type: 'purchase',
      amount: WELCOME_CREDITS,
      balance,
      description: 'Credits de bienvenida (simulados)',
      createdAt: now,
    });
  });
}

/** Reserva Credits al empezar un trabajo (cobro provisional). */
export async function holdCredits(userId: string, amount: number, description: string): Promise<void> {
  if (amount <= 0) return;
  const walletRef = db().collection('wallets').doc(userId);
  await db().runTransaction(async (tx) => {
    const wallet = await tx.get(walletRef);
    const balance = wallet.exists ? Number(wallet.data()?.balance ?? 0) : 0;
    if (balance < amount) {
      throw new HttpsError('failed-precondition', 'insufficient-credits');
    }
    const now = Timestamp.now();
    tx.set(
      walletRef,
      {
        userId,
        balance: balance - amount,
        totalSpent: FieldValue.increment(amount),
        updatedAt: now,
      },
      { merge: true }
    );
    tx.set(db().collection('transactions').doc(), {
      userId,
      type: 'spend',
      amount: -amount,
      balance: balance - amount,
      description,
      createdAt: now,
    });
  });
}

/** Ajusta al terminar: devuelve lo reservado que no se usó (o todo, si falló). */
export async function settleCredits(userId: string, held: number, used: number, description: string): Promise<void> {
  const refund = held - Math.max(0, used);
  if (refund <= 0) return;
  const walletRef = db().collection('wallets').doc(userId);
  await db().runTransaction(async (tx) => {
    const wallet = await tx.get(walletRef);
    const balance = wallet.exists ? Number(wallet.data()?.balance ?? 0) : 0;
    const now = Timestamp.now();
    tx.set(
      walletRef,
      {
        userId,
        balance: balance + refund,
        totalSpent: FieldValue.increment(-refund),
        updatedAt: now,
      },
      { merge: true }
    );
    tx.set(db().collection('transactions').doc(), {
      userId,
      type: 'refund',
      amount: refund,
      balance: balance + refund,
      description: `${description} · devolución`,
      createdAt: now,
    });
  });
}
