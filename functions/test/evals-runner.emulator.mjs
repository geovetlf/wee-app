/*
 * WEË AI EVALUATION ENGINE — F2-C1: el corredor REAL contra el emulador de Firestore (COSTE $0, con el adaptador mock).
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/evals-runner.emulator.mjs"
 *
 * Valida la infraestructura real sin proveedor real: llama a `ejecutarEvalRun` (la lógica del callable) contra el
 * emulador de Firestore; sin claves, el motor cae en `mock` (providerCost 0). Un cargo REAL de proveedor se SIMULA
 * escribiendo exactamente lo que escribirían el adaptador y el libro (`providerCost` en el intento de aiGenerations y
 * `byProvider` en evalUsage/{día}) y se lee con el lector de VERDAD (`costeRealDelCaso`): sigue costando $0.
 *
 * Comprueba (hardening de F2-C1): permisos, kill switch y presupuesto fail-closed; RESERVA del techo antes de
 * generar y su LIBERACIÓN; el ejemplo del dueño (gastado 8 + techo 3 > 10 → no se inicia); CONCURRENCIA (reservas
 * simultáneas, una corrida dentro de la ventana de otra, dos corridas en paralelo); RECONCILIACIÓN con el coste real;
 * coste real mayor que el techo → COST_OVERRUN y detención; coste desconocido → detención; presupuesto restante;
 * idempotencia; cancelación cooperativa; attribution 'eval' en aiGenerations; evalUsage frente a aiUsage; y que NO se
 * tocan los Credits del usuario. Se niega a correr sin emulador o contra un proyecto que no sea demo-*. Sin secretos.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const PROY = process.env.GCLOUD_PROJECT || 'demo-wee';
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.log('✘ sin FIRESTORE_EMULATOR_HOST no se corre'); process.exit(1); }
if (!PROY.startsWith('demo-')) { console.log(`✘ solo contra un proyecto demo-*, nunca «${PROY}»`); process.exit(1); }

const admin = require(path.resolve(RAIZ, 'functions/node_modules/firebase-admin/lib/index.js'));
if (!admin.apps.length) admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const { FieldValue } = require(path.resolve(RAIZ, 'functions/node_modules/firebase-admin/lib/firestore/index.js'));
const { ejecutarEvalRun, reservarTecho, liberarTecho, costeRealDelCaso, TECHO_POR_CASO_POR_DEFECTO_USD, MAX_OUTPUT_TOKENS_POR_DEFECTO } =
  require(path.resolve(RAIZ, 'functions/lib/evals/index.js'));

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const ADMIN = { uid: 'adminEval', token: { admin: true } };
const lanza = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const ahora = new Date();
const hoy = `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}-${String(ahora.getUTCDate()).padStart(2, '0')}`;
const idDe = (requestKey) => `evalrun_${createHash('sha256').update(requestKey).digest('hex').slice(0, 24)}`;
const dia = () => db.doc(`evalUsage/${hoy}`);
const reservadoHoy = async () => Number((await dia().get()).data()?.reservedUsd ?? 0);
const reiniciarDia = async () => { await dia().delete().catch(() => {}); };
const presupuesto = (campos) => db.doc('aiSettings/evalBudget').set({ habilitado: true, ...campos });
const generacionesDe = async (evalRunId) => (await db.collection('aiGenerations').where('evalRunId', '==', evalRunId).get()).docs;
const casoDe = async (evalRunId, caso) => (await db.doc(`evalRuns/${evalRunId}/casos/${caso}`).get()).data();
const corridas = new Set();
const correr = async (data, lector) => { const r = await ejecutarEvalRun(ADMIN, data, undefined, lector); if (r?.evalRunId) corridas.add(r.evalRunId); return r; };
const cerca = (a, b) => Math.abs(a - b) < 1e-9;
/** Lo que escribirían el adaptador (providerCost del intento) y el libro (byProvider) tras un cargo REAL de `usd`; lee con el lector de verdad. */
const cargoReal = (usd) => async (requestId) => {
  const intentos = (await db.collection('aiGenerations').where('requestId', '==', requestId).get()).docs;
  const ultimo = intentos[intentos.length - 1];
  if (ultimo) await ultimo.ref.set({ providerCost: usd }, { merge: true });
  await dia().set({ byProvider: { simulado: { usd: FieldValue.increment(usd) } } }, { merge: true });
  return costeRealDelCaso(requestId);
};

/* ── Semillas ─────────────────────────────────────────────────────────────── */
await db.doc('aiSettings/global').set({ allowMockFallback: true, pricingMode: 'simulated', defaultPolicy: 'balanced', creditsPerUsd: 1000, margin: 0 }, { merge: true });
await db.doc('users/evalUserTest').set({ creditsBalance: 100 }); // para comprobar que NO se toca
await reiniciarDia();

/* ── Permisos: admin-only ─────────────────────────────────────────────────── */
const sinAuth = await lanza(() => ejecutarEvalRun(undefined, {}));
check('sin sesión → unauthenticated', sinAuth && /sesión|unauthenticated/i.test(sinAuth.message || ''));
const noAdmin = await lanza(() => ejecutarEvalRun({ uid: 'x', token: {} }, {}));
check('sin admin → permission-denied', noAdmin && /administraci|permission/i.test(noAdmin.message || ''));

/* ── Kill switch y presupuesto, fail-closed ───────────────────────────────── */
await db.doc('aiSettings/evalBudget').delete().catch(() => {});
const apagado = await lanza(() => ejecutarEvalRun(ADMIN, {}));
check('kill switch: sin evalBudget habilitado → evals_deshabilitado (fail-closed)', apagado && /evals_deshabilitado/.test(apagado.message || ''), apagado && apagado.message);
await presupuesto({ maxUsdPerDay: 0 });
const sinTope = await lanza(() => ejecutarEvalRun(ADMIN, {}));
check('presupuesto maxUsdPerDay 0 → eval_sin_presupuesto (fail-closed)', sinTope && /eval_sin_presupuesto/.test(sinTope.message || ''));

/* ── C · Imposible reservar por encima del límite ─────────────────────────── */
await presupuesto({ maxUsdPerDay: 10 });
const enorme = await correr({ maxCasos: 1, requestKey: 'techo-enorme', costeEstimadoPorCasoUsd: 999 });
check('C) un techo mayor que el tope → BUDGET_EXCEEDED sin generar ni reservar', enorme.status === 'BUDGET_EXCEEDED' && enorme.metrics.n === 0
  && (await generacionesDe(enorme.evalRunId)).length === 0 && (await reservadoHoy()) === 0, `${enorme.status} n=${enorme.metrics?.n}`);
await presupuesto({ maxUsdPerDay: 10, maxUsdPerCaso: 999 });
const bajado = await correr({ maxCasos: 1, requestKey: 'techo-bajado', costeEstimadoPorCasoUsd: 0.001 });
check('C) quien llama no puede BAJAR el techo: con 999 configurado, pedir 0,001 sigue reservando 999 → no cabe, no se genera',
  bajado.status === 'BUDGET_EXCEEDED' && bajado.techoPorCasoUsd === 999 && (await generacionesDe(bajado.evalRunId)).length === 0, `${bajado.status} techo=${bajado.techoPorCasoUsd}`);

/* ── El ejemplo del dueño: gastado 8, techo 3, tope 10 ────────────────────── */
await reiniciarDia();
await dia().set({ byProvider: { previo: { usd: 8 } } }, { merge: true });
await presupuesto({ maxUsdPerDay: 10, maxUsdPerCaso: 3 });
const dueno3 = await correr({ maxCasos: 1, requestKey: 'dueno-techo-3' });
check('el ejemplo del dueño: gastado 8 + techo 3 = 11 > 10 → BUDGET_EXCEEDED, el caso NO se inicia',
  dueno3.status === 'BUDGET_EXCEEDED' && dueno3.metrics.n === 0 && (await generacionesDe(dueno3.evalRunId)).length === 0
  && dueno3.budgetUsed === 8 && dueno3.budgetReserved === 0 && dueno3.budgetRemaining === 2, JSON.stringify({ s: dueno3.status, u: dueno3.budgetUsed, r: dueno3.budgetReserved, q: dueno3.budgetRemaining }));
await presupuesto({ maxUsdPerDay: 10, maxUsdPerCaso: 2 });
const dueno2 = await correr({ maxCasos: 1, requestKey: 'dueno-techo-2' });
check('… y con techo 2 (8 + 2 = 10 ≤ 10) sí cabe y se ejecuta', dueno2.status === 'COMPLETED' && dueno2.metrics.n === 1 && dueno2.budgetRemaining === 2, `${dueno2.status} q=${dueno2.budgetRemaining}`);

/* ── A · Reserva visible durante el caso y liberada después (camino feliz, $0) ── */
await reiniciarDia();
await presupuesto({ maxUsdPerDay: 10 });
const vistoDurante = [];
const run = await correr({ maxCasos: 2, requestKey: 'run-ok' }, async (rid) => { vistoDurante.push(await reservadoHoy()); return costeRealDelCaso(rid); });
check('A) durante cada caso su techo está RESERVADO en evalUsage/{día}.reservedUsd',
  vistoDurante.length === 2 && vistoDurante.every((v) => cerca(v, TECHO_POR_CASO_POR_DEFECTO_USD)), JSON.stringify(vistoDurante));
check('A) y al terminar la reserva está LIBERADA (reservedUsd 0)', (await reservadoHoy()) === 0 && run.budgetReserved === 0);
check('COMPLETED con 2 casos aprobados (mock, $0)', run.status === 'COMPLETED' && run.metrics.n === 2 && run.metrics.aprobados === 2, `${run.status} ${JSON.stringify(run.metrics)}`);
check('presupuesto reportado: limit 10, used 0, reserved 0, remaining 10, techo y tokens por defecto',
  run.budgetLimit === 10 && run.budgetUsed === 0 && run.budgetRemaining === 10 && run.techoPorCasoUsd === TECHO_POR_CASO_POR_DEFECTO_USD && run.maxOutputTokens === MAX_OUTPUT_TOKENS_POR_DEFECTO,
  JSON.stringify({ l: run.budgetLimit, u: run.budgetUsed, q: run.budgetRemaining, t: run.techoPorCasoUsd, k: run.maxOutputTokens }));
const doc = (await db.doc(`evalRuns/${run.evalRunId}`).get()).data();
check('evalRuns persistido: identidad eval, COMPLETED, requestedBy admin, techo y tokens registrados', doc && doc.identidad === 'eval' && doc.status === 'COMPLETED'
  && doc.requestedBy === 'adminEval' && doc.budgetLimit === 10 && doc.techoPorCasoUsd === TECHO_POR_CASO_POR_DEFECTO_USD && doc.maxOutputTokens === MAX_OUTPUT_TOKENS_POR_DEFECTO);
const casosSnap = await db.collection(`evalRuns/${run.evalRunId}/casos`).get();
check('rastro de auditoría: un doc por caso con reserva, coste real, graders y veredicto', casosSnap.size === 2
  && casosSnap.docs.every((d) => Array.isArray(d.data().graders) && d.data().aprobado === true && d.data().reservaUsd === TECHO_POR_CASO_POR_DEFECTO_USD && d.data().providerCost === 0 && d.data().sobrecoste === false));
const gens = await generacionesDe(run.evalRunId);
check('aiGenerations enlazadas por evalRunId y con attribution "eval"', gens.length === 2 && gens.every((d) => d.data().attribution === 'eval' && d.data().evalRunId === run.evalRunId), `${gens.length}`);
const evalUso = (await dia().get()).data();
check('el gasto de eval se contabiliza en evalUsage/{día}', !!evalUso && !!evalUso.byProvider, JSON.stringify(evalUso && Object.keys(evalUso)));
check('NO cae en aiUsage/{día} (el tope del usuario no lo ve)', !(await db.doc(`aiUsage/${hoy}`).get()).exists);

/* ── D · Reconciliación con el coste REAL (cargo simulado de 0,004 con techo 0,05) ── */
await reiniciarDia();
await presupuesto({ maxUsdPerDay: 10, maxUsdPerCaso: 0.05 });
const rec = await correr({ maxCasos: 1, requestKey: 'reconcilia' }, cargoReal(0.004));
const casoRec = await casoDe(rec.evalRunId, 'saludo');
check('D) se registra el coste REAL (0,004), no el techo (0,05): costUsd, budgetUsed y el caso lo dicen',
  rec.status === 'COMPLETED' && rec.costUsd === 0.004 && rec.budgetUsed === 0.004 && casoRec?.providerCost === 0.004 && casoRec?.reservaUsd === 0.05,
  JSON.stringify({ s: rec.status, c: rec.costUsd, u: rec.budgetUsed, p: casoRec?.providerCost }));
check('D) la reserva se libera entera (reservedUsd 0) tras reconciliar', rec.budgetReserved === 0 && (await reservadoHoy()) === 0);
check('G) presupuesto restante = tope − gastado real − reservado = 9,996', rec.budgetRemaining === 9.996, `${rec.budgetRemaining}`);

/* ── E + F · Coste real MAYOR que el techo → COST_OVERRUN y detención ──────── */
await reiniciarDia();
await presupuesto({ maxUsdPerDay: 10, maxUsdPerCaso: 0.05 });
const sob = await correr({ maxCasos: 3, requestKey: 'sobrecoste' }, cargoReal(0.08));
check('E) un coste real (0,08) por encima del techo (0,05) marca la corrida COST_OVERRUN con su exceso exacto',
  sob.status === 'COST_OVERRUN' && sob.sobrecoste?.caso === 'saludo' && sob.sobrecoste.techoUsd === 0.05 && sob.sobrecoste.realUsd === 0.08
  && sob.sobrecoste.excesoUsd === 0.03 && sob.sobrecoste.motivo === 'coste_real_mayor_que_el_techo', JSON.stringify(sob.sobrecoste));
check('F) tras el sobrecoste se DETIENE: solo el primer caso generó; el 2.º y el 3.º no se iniciaron',
  (await generacionesDe(sob.evalRunId)).length === 1 && (await casoDe(sob.evalRunId, 'saludo'))?.sobrecoste === true
  && !(await casoDe(sob.evalRunId, 'numero')) && !(await casoDe(sob.evalRunId, 'color')));
const docSob = (await db.doc(`evalRuns/${sob.evalRunId}`).get()).data();
check('F) el registro de la corrida guarda COST_OVERRUN y el detalle del sobrecoste; reserva liberada; gasto real contabilizado',
  docSob?.status === 'COST_OVERRUN' && docSob?.sobrecoste?.excesoUsd === 0.03 && sob.budgetReserved === 0 && sob.budgetUsed === 0.08);
await reiniciarDia();
const desc = await correr({ maxCasos: 2, requestKey: 'coste-desconocido' }, async () => NaN);
check('F) un coste real que no se puede saber también DETIENE (fail-closed): COST_OVERRUN «coste_real_desconocido»',
  desc.status === 'COST_OVERRUN' && desc.sobrecoste?.motivo === 'coste_real_desconocido' && (await generacionesDe(desc.evalRunId)).length === 1 && (await reservadoHoy()) === 0,
  JSON.stringify(desc.sobrecoste));

const { MAX_INTENTOS_POR_CASO } = require(path.resolve(RAIZ, 'functions/lib/evals/index.js'));
const sembrarIntentos = async (requestId, cuantos) => {
  const lote = db.batch();
  for (let i = 0; i < cuantos; i++) lote.set(db.collection('aiGenerations').doc(), { requestId, attribution: 'eval', evalRunId: 'evalrun_acotado', providerCost: 0.001 });
  await lote.commit();
};
await sembrarIntentos('evalrun_acotado:justo', MAX_INTENTOS_POR_CASO);
await sembrarIntentos('evalrun_acotado:desborda', MAX_INTENTOS_POR_CASO + 1);
const justo = await costeRealDelCaso('evalrun_acotado:justo');
const desborda = await costeRealDelCaso('evalrun_acotado:desborda');
check(`F) la consulta del coste está ACOTADA y falla cerrada: ${MAX_INTENTOS_POR_CASO} intentos se suman; uno más → coste desconocido (NaN → detener)`,
  cerca(justo, MAX_INTENTOS_POR_CASO * 0.001) && Number.isNaN(desborda), `justo=${justo} desborda=${desborda}`);

/* ── B · Concurrencia ─────────────────────────────────────────────────────── */
await reiniciarDia();
const simultaneas = await Promise.allSettled([1, 2, 3, 4].map(() => reservarTecho(hoy, 0.10, 0.03)));
const concedidas = simultaneas.filter((r) => r.status === 'fulfilled' && r.value.reservado).length;
const rechazadas = simultaneas.filter((r) => r.status === 'rejected').length;
const tras4 = await reservadoHoy();
check('B) 4 reservas SIMULTÁNEAS de 0,03 con tope 0,10: exactamente 3 concedidas, 0,09 reservado, nunca por encima del tope',
  concedidas === 3 && rechazadas === 0 && cerca(tras4, 0.09), `concedidas=${concedidas} rechazadas=${rechazadas} reservado=${tras4}`);
for (let i = 0; i < concedidas; i++) await liberarTecho(hoy, 0.03);
check('B) liberadas las 3, lo reservado vuelve a 0', (await reservadoHoy()) === 0);

await reiniciarDia();
await presupuesto({ maxUsdPerDay: 0.10, maxUsdPerCaso: 0.06 });
let dentro = null;
const ventana = await correr({ maxCasos: 1, requestKey: 'ventana-a' }, async (rid) => {
  dentro = await correr({ maxCasos: 1, requestKey: 'ventana-b' }); // otra corrida, MIENTRAS la primera tiene su techo reservado
  return costeRealDelCaso(rid);
});
check('B) una segunda corrida dentro de la ventana de la primera ve su reserva: 0,06 + 0,06 > 0,10 → BUDGET_EXCEEDED sin generar',
  dentro?.status === 'BUDGET_EXCEEDED' && dentro.metrics.n === 0 && (await generacionesDe(dentro.evalRunId)).length === 0, `${dentro?.status}`);
check('B) … y la primera termina COMPLETED; al final no queda nada reservado', ventana.status === 'COMPLETED' && (await reservadoHoy()) === 0, ventana.status);

await reiniciarDia();
await presupuesto({ maxUsdPerDay: 0.10, maxUsdPerCaso: 0.06 });
const observado = [];
/*
 * Sin ventanas de tiempo fijas (en una máquina fría dos corridas pueden no llegar a solaparse): quien reserva primero
 * RETIENE su techo hasta que la otra corrida ha terminado (o 5 s, por si algo se cuelga). Mientras lo retiene, la otra no
 * cabe (0,06 + 0,06 > 0,10): tiene que acabar BUDGET_EXCEEDED sin generar.
 */
const fin = {};
const terminadaA = new Promise((ok) => { fin.a = ok; });
const terminadaB = new Promise((ok) => { fin.b = ok; });
const retenerHasta = (otra) => async (rid) => {
  observado.push(await reservadoHoy());
  await Promise.race([otra, new Promise((ok) => setTimeout(ok, 5000))]);
  return costeRealDelCaso(rid);
};
const [pa, pb] = await Promise.all([
  correr({ maxCasos: 1, requestKey: 'paralela-a' }, retenerHasta(terminadaB)).finally(() => fin.a()),
  correr({ maxCasos: 1, requestKey: 'paralela-b' }, retenerHasta(terminadaA)).finally(() => fin.b()),
]);
const estados = [pa.status, pb.status].sort();
check('B) dos corridas EN PARALELO que no caben juntas: lo reservado nunca supera el tope y al final vuelve a 0',
  observado.every((v) => v <= 0.10 + 1e-9) && (await reservadoHoy()) === 0 && estados.every((s) => s === 'COMPLETED' || s === 'BUDGET_EXCEEDED'),
  `observado=${JSON.stringify(observado)} estados=${estados.join(',')}`);
check('B) (quien reserva primero retiene su techo hasta que la otra termina: una gana y la otra se queda fuera)', JSON.stringify(estados) === JSON.stringify(['BUDGET_EXCEEDED', 'COMPLETED']), estados.join(','));

await reiniciarDia();
await presupuesto({ maxUsdPerDay: 1, maxUsdPerCaso: 0.06 });
const [qa, qb] = await Promise.all([correr({ maxCasos: 2, requestKey: 'paralela-holgada-a' }), correr({ maxCasos: 2, requestKey: 'paralela-holgada-b' })]);
check('B) dos corridas en paralelo CON presupuesto para ambas: las dos COMPLETED, 4 generaciones, nada colgado',
  qa.status === 'COMPLETED' && qb.status === 'COMPLETED' && (await generacionesDe(qa.evalRunId)).length + (await generacionesDe(qb.evalRunId)).length === 4 && (await reservadoHoy()) === 0);

/* ── H · Idempotencia ─────────────────────────────────────────────────────── */
const reservadoAntes = await reservadoHoy();
const otra = await correr({ maxCasos: 2, requestKey: 'run-ok' });
check('H) misma requestKey → misma corrida reanudada: sin generar, sin reservar otra vez',
  otra.reanudado === true && otra.evalRunId === run.evalRunId && (await generacionesDe(run.evalRunId)).length === 2 && (await reservadoHoy()) === reservadoAntes,
  `reanudado=${otra.reanudado}`);

/* ── Límite de casos ──────────────────────────────────────────────────────── */
await reiniciarDia();
await presupuesto({ maxUsdPerDay: 10 });
const tope = await correr({ maxCasos: 99, requestKey: 'run-limite' });
check('el límite duro de casos por ejecución se respeta (≤3)', tope.metrics.n <= 3 && tope.metrics.n >= 1, `n=${tope.metrics.n}`);

/* ── I · Cancelación ──────────────────────────────────────────────────────── */
const canc = await ejecutarEvalRun(ADMIN, { cancelar: true, evalRunId: run.evalRunId });
const docCanc = (await db.doc(`evalRuns/${run.evalRunId}`).get()).data();
check('I) cancelar marca la corrida (cancelSolicitado) por un admin', canc.cancelSolicitado === true && docCanc.cancelSolicitado === true && docCanc.canceladoPor === 'adminEval');
await reiniciarDia();
const cancelada = await correr({ maxCasos: 3, requestKey: 'cancela-a-mitad' }, async (rid) => {
  await ejecutarEvalRun(ADMIN, { cancelar: true, evalRunId: idDe('cancela-a-mitad') }); // la cancelación llega DURANTE el primer caso
  return costeRealDelCaso(rid);
});
check('I) cancelación cooperativa: llega durante el 1.er caso → CANCELLED («cancelada») antes del 2.º; solo 1 generación; nada reservado',
  cancelada.status === 'CANCELLED' && cancelada.motivoDeParada === 'cancelada' && cancelada.metrics.n === 1 && (await generacionesDe(cancelada.evalRunId)).length === 1 && (await reservadoHoy()) === 0,
  `${cancelada.status}/${cancelada.motivoDeParada} n=${cancelada.metrics?.n}`);
await reiniciarDia();
await presupuesto({ maxUsdPerDay: 10 });
const apagadaEnVuelo = await correr({ maxCasos: 3, requestKey: 'apagada-en-vuelo' }, async (rid) => {
  await db.doc('aiSettings/evalBudget').set({ habilitado: false }, { merge: true }); // el dueño apaga las evals DURANTE el 1.er caso
  return costeRealDelCaso(rid);
});
check('I) apagar el interruptor DURANTE una corrida la detiene antes del siguiente caso (CANCELLED «evals_deshabilitado»), sin reservar ni generar más',
  apagadaEnVuelo.status === 'CANCELLED' && apagadaEnVuelo.motivoDeParada === 'evals_deshabilitado' && apagadaEnVuelo.metrics.n === 1
  && (await generacionesDe(apagadaEnVuelo.evalRunId)).length === 1 && (await reservadoHoy()) === 0, `${apagadaEnVuelo.status}/${apagadaEnVuelo.motivoDeParada} n=${apagadaEnVuelo.metrics?.n}`);
const trasApagar = await lanza(() => ejecutarEvalRun(ADMIN, { maxCasos: 1, requestKey: 'tras-apagar' }));
check('I) … y con el interruptor apagado, una corrida NUEVA ni empieza (evals_deshabilitado)', trasApagar && /evals_deshabilitado/.test(trasApagar.message || ''));
await reiniciarDia();
await presupuesto({ maxUsdPerDay: 10, maxUsdPerCaso: 0.05 });
const topeBajado = await correr({ maxCasos: 3, requestKey: 'tope-bajado-en-vuelo' }, async (rid) => {
  await db.doc('aiSettings/evalBudget').set({ maxUsdPerDay: 0.04 }, { merge: true }); // el dueño baja el tope por debajo de un techo
  return costeRealDelCaso(rid);
});
check('G) bajar el tope DURANTE una corrida vale para la siguiente reserva: 0,05 > 0,04 → BUDGET_EXCEEDED tras el 1.er caso; el informe dice el tope vigente',
  topeBajado.status === 'BUDGET_EXCEEDED' && topeBajado.metrics.n === 1 && topeBajado.budgetLimit === 0.04 && (await generacionesDe(topeBajado.evalRunId)).length === 1,
  `${topeBajado.status} n=${topeBajado.metrics?.n} tope=${topeBajado.budgetLimit}`);

/* ── J · Credits del usuario intactos ─────────────────────────────────────── */
const saldo = (await db.doc('users/evalUserTest').get()).data();
const txEval = await db.collection('creditTransactions').where('userId', '==', 'eval').get();
const txUser = await db.collection('creditTransactions').where('userId', '==', 'evalUserTest').get();
check('J) ningún Credit de usuario tocado: saldo intacto y cero transacciones de eval/usuario', saldo.creditsBalance === 100 && txEval.empty && txUser.empty);

/* ── Limpieza ─────────────────────────────────────────────────────────────── */
for (const id of corridas) await db.recursiveDelete(db.doc(`evalRuns/${id}`));
for (const d of (await db.collection('aiGenerations').where('attribution', '==', 'eval').get()).docs) await d.ref.delete();
await reiniciarDia();
await db.doc('users/evalUserTest').delete().catch(() => {});
await db.doc('aiSettings/evalBudget').delete().catch(() => {});
await db.doc('aiSettings/global').delete().catch(() => {});
check('limpieza: no quedan generaciones de eval de esta prueba', (await db.collection('aiGenerations').where('attribution', '==', 'eval').get()).empty);

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ corredor real de evals (emulador Firestore, $0): ${n} comprobaciones`);
process.exit(failures ? 1 : 0);
