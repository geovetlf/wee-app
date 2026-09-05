import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { Plan } from './types';

/**
 * Credits de WEE Creator: reservar al empezar, ajustar al terminar.
 * Precios por capacidad en pricing/{capabilityId}.credits. Mientras la tabla
 * esté vacía (fase 0, modo demo) todo cuesta 0: los precios no se inventan.
 */
const db = () => getFirestore();

export async function estimatePlanCredits(plan: Plan): Promise<number> {
  const ids = Array.from(new Set(plan.steps.map((s) => s.capability)));
  const snaps = await Promise.all(ids.map((id) => db().collection('pricing').doc(id).get()));
  const price: Record<string, number> = {};
  snaps.forEach((snap, index) => {
    price[ids[index]] = snap.exists ? Number(snap.data()?.credits ?? 0) : 0;
  });
  return plan.steps.reduce((sum, s) => sum + (price[s.capability] || 0), 0);
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
