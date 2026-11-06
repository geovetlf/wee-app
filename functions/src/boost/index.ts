/**
 * BOOST — LAS PUERTAS (docs/BOOST.md).
 *
 *   `boost`       callable única con `action`: options · estimate · myPosts · create · end · list · get · serve · click
 *   `boostSweep`  programada: cierra lo vencido, liquida lo pendiente y devuelve reservas huérfanas
 *
 * Quién pide lo dice Firebase Auth (`request.auth.uid` = la cuenta). La cuenta tiene UNA billetera para sus dos caras,
 * así que da igual desde qué perfil se entre: se reserva y se devuelve en la misma. Nada de esto lo escribe el
 * cliente: `boostCampaigns`, `boostPostLocks` y `boostSettings` están cerradas en `firestore.rules`.
 *
 * El dinero, solo por el Credit Engine (`creditEngine`): esta puerta no suma ni resta nada por su cuenta.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Query } from 'firebase-admin/firestore';
import { creditEngine } from '../credits/creditEngine';
import { isCreditService } from '../credits/creditCosts';
import { cuentaDeIdentidad, PerfilDeIdentidad } from '../social/econtact';
import { AudienciaPotencial, createBoostEngine } from './motor';
import { BoostError, ConfigDeBoost, leerConfig, MotivoDeBoost, SERVICIO_DE_CREDITS, Segmento } from './modelo';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 60 };

/* La configuración se lee como mucho una vez por minuto por instancia: es un documento pequeño y cambia poco. */
let cache: { at: number; config: ConfigDeBoost } | null = null;
const leerConfiguracion = async (): Promise<ConfigDeBoost> => {
  if (cache && Date.now() - cache.at < 60_000) return cache.config;
  const snap = await getFirestore().collection('boostSettings').doc('config').get();
  const config = leerConfig(snap.exists ? (snap.data() as Record<string, unknown>) : null);
  cache = { at: Date.now(), config };
  return config;
};

/** Hasta cuántos documentos se leen para contar un público. Por encima, «al menos N». */
const TOPE = 2000;

/**
 * EL PÚBLICO POTENCIAL, CONTADO. Cuentas distintas cuyo Perfil Real cumple el público (es el perfil que usa `serve`),
 * sin la de quien promociona. Con los contactos, las identidades con un ËContact aceptado.
 */
const contarAudiencia = async (a: { segment: Segmento; country: string | null; communityId: string | null; identityId: string; ownerAccountId: string }): Promise<AudienciaPotencial> => {
  const db = getFirestore();
  if (a.segment === 'contacts') {
    const snap = await db.collection('econtacts').where('users', 'array-contains', a.identityId).limit(TOPE).get();
    const otros = new Set<string>();
    for (const d of snap.docs) {
      const x = d.data();
      if (x.status !== 'accepted' || !Array.isArray(x.users)) continue;
      for (const u of x.users) if (typeof u === 'string' && u !== a.identityId) otros.add(u);
    }
    return { cuentas: otros.size, tope: snap.size >= TOPE };
  }
  let q: Query = db.collection('users');
  if (a.segment === 'community') q = q.where('joinedCommunities', 'array-contains', a.communityId);
  else if (a.country) q = q.where('country', '==', a.country);
  const snap = await q.select('uid', 'profileType', 'linkedAccountId', 'country').limit(TOPE).get();
  const cuentas = new Set<string>();
  for (const d of snap.docs) {
    const x = d.data() as PerfilDeIdentidad & { country?: string };
    const uid = typeof x.uid === 'string' ? x.uid : '';
    if (!uid || cuentaDeIdentidad(uid, x) !== uid) continue; // solo Perfiles Reales válidos
    if (uid === a.ownerAccountId) continue;
    if (a.country && x.country !== a.country) continue;
    cuentas.add(uid);
  }
  return { cuentas: cuentas.size, tope: snap.size >= TOPE };
};

export const motorDeBoost = createBoostEngine({
  db: () => getFirestore() as any,
  creditos: creditEngine as any,
  servicioRegistrado: () => isCreditService(SERVICIO_DE_CREDITS),
  ahora: () => Date.now(),
  config: leerConfiguracion,
  contarAudiencia,
});

const CODIGOS: Record<MotivoDeBoost, 'unauthenticated' | 'invalid-argument' | 'not-found' | 'permission-denied' | 'already-exists' | 'failed-precondition' | 'resource-exhausted' | 'internal'> = {
  'no-autenticado': 'unauthenticated',
  cerrado: 'failed-precondition',
  'servicio-pendiente': 'failed-precondition',
  peticion: 'invalid-argument',
  objetivo: 'invalid-argument',
  segmento: 'invalid-argument',
  pais: 'invalid-argument',
  duracion: 'invalid-argument',
  presupuesto: 'invalid-argument',
  publicacion: 'not-found',
  ajena: 'permission-denied',
  'no-promocionable': 'failed-precondition',
  'sin-comunidad': 'failed-precondition',
  'ya-promocionada': 'already-exists',
  saldo: 'resource-exhausted',
  conflicto: 'already-exists',
  'operacion-cerrada': 'failed-precondition',
  'no-existe': 'not-found',
  'no-activa': 'failed-precondition',
  interno: 'internal',
};

/* El mensaje es el motivo: el cliente lo traduce con `boost.err_<motivo>`. Nunca una frase del servidor. */
const traducir = (error: unknown): never => {
  if (error instanceof BoostError) throw new HttpsError(CODIGOS[error.motivo], error.motivo, { motivo: error.motivo, ...error.detalle });
  if (error instanceof HttpsError) throw error;
  console.error('[boost] error interno', error instanceof Error ? error.message : String(error));
  throw new HttpsError('internal', 'interno', { motivo: 'interno' });
};

export const boost = onCall(OPTS, async (request) => {
  const cuenta = request.auth?.uid;
  if (!cuenta) throw new HttpsError('unauthenticated', 'no-autenticado', { motivo: 'no-autenticado' });
  const data = (request.data || {}) as Record<string, unknown>;
  try {
    switch (data.action) {
      case 'options': return await motorDeBoost.opciones(cuenta);
      case 'estimate': return await motorDeBoost.estimar(cuenta, data);
      case 'myPosts': return await motorDeBoost.misPublicaciones(cuenta);
      case 'create': return await motorDeBoost.crear(cuenta, data);
      case 'end': return await motorDeBoost.terminar(cuenta, data);
      case 'list': return await motorDeBoost.listar(cuenta);
      case 'get': return await motorDeBoost.detalle(cuenta, data);
      case 'serve': return await motorDeBoost.servir(cuenta);
      case 'click': return await motorDeBoost.interaccion(cuenta, data);
      default: throw new BoostError('peticion', { campo: 'action' });
    }
  } catch (error) {
    return traducir(error);
  }
});

export const boostSweep = onSchedule(
  /* Sin techo propio (usa el global): cada paso es idempotente —congelar es una transacción, y `completeCredits` /
   * `refundCredits` no devuelven dos veces—, así que dos pasadas solapadas no mueven dinero de más. */
  { schedule: 'every 15 minutes', region: 'us-central1', timeoutSeconds: 300, memory: '256MiB' },
  async () => {
    const informe = await motorDeBoost.barrer();
    console.log('[boost] barrido', JSON.stringify(informe));
  },
);
