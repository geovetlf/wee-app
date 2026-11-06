/*
 * BOOST — EL FLUJO COMPLETO CONTRA EL EMULADOR DE FIRESTORE (transacciones reales, Admin SDK real).
 *
 * Mismo motor de Boost y mismo Credit Engine que en producción, sobre el emulador: reservar → servir → liquidar →
 * devolver, el doble clic simultáneo y el cuadre final del saldo. Usa su PROPIO proyecto demo
 * (`demo-wee-boost-flujo`) y lo borra al terminar: no toca los datos de nadie.
 *
 * DEPENDENCIA PENDIENTE (docs/BOOST.md §7): `social_boost` todavía no está en el catálogo del Credit Engine. Esta
 * prueba lo registra en memoria en su propio proceso —como quedará cuando el Credit Engine lo incorpore— para poder
 * ejercitar la reserva real. El código de producción no se toca.
 *
 * No está en `npm test`: necesita el emulador y Java. Desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee-boost-flujo "node functions/test/boost-flujo.emulator.mjs"
 *
 * O contra un emulador ya levantado: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-wee-boost-flujo
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const admin = require('firebase-admin');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
if (admin.apps.length === 0) admin.initializeApp({ projectId: PROY });
const db = getFirestore();

const costes = lib('credits/creditCosts.js');
const { createCreditEngine } = lib('credits/creditEngine.js');
const modelo = lib('boost/modelo.js');
const { createBoostEngine } = lib('boost/motor.js');
costes.CREDIT_COSTS.social_boost = 1;
costes.SERVICE_LABEL.social_boost = 'Boost de una publicación';
if (!costes.CREDIT_SERVICES.includes('social_boost')) costes.CREDIT_SERVICES.push('social_boost');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (!cond && extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

let ahora = Date.now();
const creditos = createCreditEngine({ db: () => db, increment: (n) => FieldValue.increment(n), now: () => Timestamp.fromMillis(ahora), welcomeCredits: 0, loadCosts: async () => {} });
const motor = createBoostEngine({ db: () => db, creditos, servicioRegistrado: () => costes.isCreditService('social_boost'), ahora: () => ahora, config: async () => modelo.leerConfig({ enabled: true }) });

const saldo = async (uid) => (await db.collection('users').doc(uid).get()).data().creditsBalance;
const ANA = 'anaFlujo0000000000000001';
const CARLA = 'carlaFlujo00000000000003';
await db.collection('users').doc(ANA).set({ uid: ANA, profileType: 'real', displayName: 'Ana', country: 'PE' });
await db.collection('users').doc(`hidi_${ANA}`).set({ uid: `hidi_${ANA}`, profileType: 'hidi', linkedAccountId: ANA, displayName: 'Ana Weë' });
await db.collection('users').doc(CARLA).set({ uid: CARLA, profileType: 'real', displayName: 'Carla', country: 'PE' });
await creditos.ensureAccount(ANA);
await creditos.ensureAccount(CARLA);
await creditos.grantCredits({ userId: ANA, amount: 5000, reason: 'prueba', source: 'test', requestId: 'carga_flujo_ana' });
await db.collection('posts').doc('pf1').set({ userId: `hidi_${ANA}`, content: 'desde mi Perfil Weë', isPrivate: false, createdAt: Timestamp.fromMillis(ahora) });

console.log(`── Flujo en ${PROY} ──`);
const pet = { requestId: 'flujo_req_0001', postId: 'pf1', objective: 'reach', segment: 'everyone', budgetCredits: 1500, durationDays: 3 };
const [r1, r2] = await Promise.all([motor.crear(ANA, pet), motor.crear(ANA, pet)]);
check('F1) doble clic simultáneo sobre Firestore real: una sola reserva de 1500', (await saldo(ANA)) === 3500 && [r1, r2].filter((r) => !r.duplicate).length >= 1);
const usos = await db.collection('creditTransactions').where('userId', '==', ANA).where('type', '==', 'usage').get();
check('F2) un solo movimiento de uso en creditTransactions', usos.size === 1 && usos.docs[0].data().status === 'AUTHORIZED');
const servida = await motor.servir(CARLA);
check('F3) Carla recibe la publicación promocionada (de la cara Weë de Ana)', servida.promoted?.post?.id === 'pf1');
const c1 = (await db.collection('boostCampaigns').doc('bst_flujo_req_0001').get()).data();
check('F4) impresión real registrada', c1.metrics.impressions === 1 && c1.metrics.reach === 1);
ahora += modelo.DIA_MS + 1000;
const fin = await motor.terminar(ANA, { campaignId: 'bst_flujo_req_0001' });
check('F5) cancelada el día 2 con 1 día entregado: consume 500, devuelve 1000', fin.campaign.status === 'ended' && fin.campaign.settlement.consumed === 500 && (await saldo(ANA)) === 4500);
const uso = (await db.collection('creditTransactions').doc('usage_bst_flujo_req_0001').get()).data();
const ajuste = (await db.collection('creditTransactions').doc('adjust_bst_flujo_req_0001').get()).data();
check('F6) en el libro: COMPLETED por 500 y ajuste de +1000', uso.status === 'COMPLETED' && uso.finalAmount === 500 && ajuste.amount === 1000);
await motor.terminar(ANA, { campaignId: 'bst_flujo_req_0001' });
await motor.barrer();
check('F7) repetir y barrer no mueve nada más', (await saldo(ANA)) === 4500);

await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
