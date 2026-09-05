import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { Plan } from './types';

/**
 * Credits de Weë Creator: reservar al empezar, ajustar al terminar.
 * Precios por capacidad en pricing/{capabilityId}.credits. Mientras la tabla
 * esté vacía (fase 0, modo demo) todo cuesta 0: los precios no se inventan.
 */
const db = () => getFirestore();

/**
 * Precios SIMULADOS por capacidad (docs/CREATOR-BUILD.md §16): sirven para
 * probar la experiencia completa. No son costos reales; los reales se fijan
 * en pricing/{capabilityId} cuando se midan las APIs (CREATOR_PRICING_MODE=real).
 */
const SIMULATED_PRICING: Record<string, number> = {
  'text.generate': 1,
  'text.structure': 0,
  'image.generate': 3,
  'image.edit': 2,
  'image.background_remove': 2,
  'image.upscale': 2,
  'image.object_remove': 2,
  'image.identity_edit': 4,
  'image.space_restyle': 4,
  'vision.describe': 1,
  'video.generate': 10,
  'video.image_to_video': 8,
  'video.compose': 6,
  'voice.tts': 2,
  'music.generate': 6,
  'doc.render': 1,
};

/** Credits de bienvenida en modo simulado (la referencia muestra 240). */
const WELCOME_CREDITS = 240;

export const pricingMode = (): 'simulated' | 'real' => (process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated');

export async function estimatePlanCredits(plan: Plan): Promise<number> {
  if (pricingMode() === 'simulated') {
    return plan.steps.reduce((sum, s) => sum + (SIMULATED_PRICING[s.capability] ?? 1), 0);
  }
  const ids = Array.from(new Set(plan.steps.map((s) => s.capability)));
  const snaps = await Promise.all(ids.map((id) => db().collection('pricing').doc(id).get()));
  const price: Record<string, number> = {};
  snaps.forEach((snap, index) => {
    price[ids[index]] = snap.exists ? Number(snap.data()?.credits ?? 0) : 0;
  });
  return plan.steps.reduce((sum, s) => sum + (price[s.capability] || 0), 0);
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
