/**
 * LÍNEA B · EL DINERO DE `creatorRun` CONTRA FIRESTORE DE VERDAD — 2026-10-14.
 *
 * Aquí lo de Weë es de verdad —`creatorRun` compilado, el reclamo, el cierre, el
 * Credit Engine con sus transacciones, el limitador y el barrido legacy
 * (`creator/barrido.ts`)— y lo único de mentira es EL PROVEEDOR: `runCapability`
 * sustituido por uno que cuenta llamadas y al que se le puede pedir que tarde,
 * que espere a una señal o que falle. La red está cortada: cualquier `fetch` es
 * un fallo de la prueba. Ni claves ni proveedores reales.
 *
 *   S1 dos solicitudes simultáneas con el mismo trabajo
 *   S2 reintento del cliente mientras el primero sigue (timeout del cliente)
 *   S3 caída del proceso entre la llamada al proveedor y el registro del resultado
 *      (reintento + barrido a la vez; y el control: un proceso que aún liquida no se toca)
 *   S4 liquidación repetida (el «webhook duplicado»: dos cierres del mismo desenlace)
 *   S5 reanudación de un trabajo parcial (falla el paso 2: no se re-ejecuta el 1)
 *   S6 liquidación pendiente anotada → la cierra el barrido, una vez
 *   S7 reserva de un trabajo que nunca arrancó → la devuelve el barrido, una vez
 *   S8 saldo insuficiente → nada se reserva, nada se llama, saldo intacto
 *   S9 resultados demo → no se cobran (B4-03)
 *   S10 vídeo apagado → rechazo antes de reservar y de llamar (X2)
 *   R  conciliación final: trabajo ↔ transacción ↔ saldo, sin reservas abiertas
 *
 *   firebase emulators:exec --only firestore --project demo-wee-fin "node functions/test/creator-finanzas.emulator.mjs"
 *   (o con el jar directo y FIRESTORE_EMULATOR_HOST + GCLOUD_PROJECT=demo-wee-fin). Menos de 300 s.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.log('✘ sin el emulador de Firestore no se corre'); process.exit(2); }
const empezo = Date.now();

const fetchReal = globalThis.fetch;
let salidasALaRed = 0;
globalThis.fetch = async () => { salidasALaRed++; throw new Error('red cortada en la prueba'); };

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const { Timestamp } = require('firebase-admin/firestore');
const lib = (p) => require(path.resolve(here, '../lib', p));

const { creditEngine } = lib('credits/creditEngine.js');
const creditos = lib('creator/credits.js');
const gatewayMod = lib('gateway/index.js');
const creatorMod = lib('creator/index.js');
const { barrerTrabajosLegacy } = lib('creator/barrido.js');
const { liquidacionDeWee } = lib('runtime/index.js');
const { ADAPTERS } = lib('engine/registry.js');
const { PLAZO_DE_EJECUCION_MS } = lib('creator/cierre.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const intento = async (fn) => { try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, e }; } };

/* ── El proveedor de mentira ────────────────────────────────────────────── */
const proveedor = { llamadas: 0, porPaso: {}, demo: false, falla: null, puerta: null };
gatewayMod.runCapability = async (cap, input, ctx) => {
  proveedor.llamadas++;
  proveedor.porPaso[ctx.requestId] = (proveedor.porPaso[ctx.requestId] ?? 0) + 1;
  if (proveedor.puerta) await proveedor.puerta;
  await new Promise((r) => setTimeout(r, 30));
  if (proveedor.falla && proveedor.falla(ctx)) throw Object.assign(new Error('el proveedor falló'), { code: 'PROVIDER_ERROR' });
  const demo = typeof proveedor.demo === 'function' ? proveedor.demo(ctx) : proveedor.demo;
  return { output: { kind: 'text', content: 'hecho' }, usage: {}, costUSD: demo ? 0 : 0.01, latencyMs: 30, provider: demo ? 'mock' : 'gemini', credits: demo ? 0 : 5, generationId: `gen_${ctx.requestId}`, demo, attempts: 1 };
};
const reiniciarProveedor = () => Object.assign(proveedor, { llamadas: 0, porPaso: {}, demo: false, falla: null, puerta: null });

/* ── Personas y trabajos ────────────────────────────────────────────────── */
const marca = Date.now().toString(36);
const personas = [];
const persona = async (nombre, saldo = 1000) => {
  const uid = `emuFin${nombre}${marca}`.slice(0, 40);
  await db.collection('users').doc(`doc_${uid}`).set({ uid, displayName: nombre });
  await creditEngine.ensureAccount(uid);
  const inicial = (await creditEngine.getBalance(uid)).balance;
  if (saldo > inicial) await creditEngine.grantCredits({ userId: uid, amount: saldo - inicial, requestId: `regalo_${uid}`, reason: 'saldo de prueba' });
  personas.push(uid);
  return uid;
};
const saldo = async (uid) => (await creditEngine.getBalance(uid)).balance;
const tx = async (id) => (await db.collection('creditTransactions').doc(id).get()).data();
const trabajo = async (uid, id, pasos, extra = {}) => {
  const ref = db.collection('creatorJobs').doc(id);
  const plan = { experience: 'writer', goal: 'un texto', steps: pasos };
  await ref.set({
    id, userId: uid, experienceId: 'writer', goal: 'un texto', questions: [], answers: [], plan,
    steps: pasos.map((s) => ({ ...s, status: 'pending' })), results: [], status: 'planned', progressText: '',
    creditsEstimated: 20, creditsCharged: 0, demo: false, pricingMode: 'simulated', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), ...extra,
  });
  return ref;
};
const DOS_PASOS = [
  { id: 'idea', capability: 'text.generate', purpose: 'idea', input: { prompt: 'una idea' } },
  { id: 'texto', capability: 'text.generate', purpose: 'texto', input: { prompt: 'el texto' }, dependsOn: ['idea'] },
];
const correr = (uid, jobId) => intento(() => creatorMod.creatorRun.run({ auth: { uid }, data: { jobId } }));
const estado = async (id) => (await db.collection('creatorJobs').doc(id).get()).data();
const reembolsos = async (rid) => (await db.collection('creditTransactions').where('requestId', '==', rid).where('type', '==', 'refund').get()).docs.map((d) => d.data());

/* ══ S1 · dos a la vez ═══════════════════════════════════════════════════ */
console.log('\n── S1 · dos solicitudes simultáneas ──');
{
  reiniciarProveedor();
  const u = await persona('S1');
  const antes = await saldo(u);
  await trabajo(u, `s1_${marca}`, DOS_PASOS);
  const [a, b] = await Promise.all([correr(u, `s1_${marca}`), correr(u, `s1_${marca}`)]);
  const hechas = [a, b].filter((r) => r.ok && r.v.status === 'done').length;
  const dup = [a, b].filter((r) => !r.ok && /already-exists/.test(String(r.e?.code))).length;
  /* La otra contesta «en marcha» o, si llegó cuando ya había terminado, `done` sin ejecutar: lo que no puede es ejecutar otra vez (S1b). */
  check('S1a) cada llamada contesta `done` o «ya está en marcha», y al menos una ejecuta', hechas + dup === 2 && hechas >= 1, JSON.stringify([a.ok, b.ok, a.e?.code, b.e?.code]));
  check('S1b) el proveedor se llama UNA vez por paso (2), no 4', proveedor.llamadas === 2, String(proveedor.llamadas));
  const u1 = await tx(`usage_s1_${marca}`);
  check('S1c) una reserva, COMPLETED por 20; saldo −20 exacto', u1?.status === 'COMPLETED' && u1.finalAmount === 20 && (await saldo(u)) === antes - 20, `${u1?.status} ${u1?.finalAmount} ${antes}→${await saldo(u)}`);
}

/* ══ S2 · reintento tras timeout del cliente ═════════════════════════════ */
console.log('\n── S2 · reintento mientras el primero sigue ──');
{
  reiniciarProveedor();
  const u = await persona('S2');
  const antes = await saldo(u);
  await trabajo(u, `s2_${marca}`, DOS_PASOS);
  let soltar; proveedor.puerta = new Promise((r) => { soltar = r; });
  const primero = correr(u, `s2_${marca}`);
  for (let i = 0; i < 100 && proveedor.llamadas === 0; i++) await new Promise((r) => setTimeout(r, 20));
  const reintento = await correr(u, `s2_${marca}`);
  check('S2a) el reintento (el cliente dio la llamada por perdida) contesta «en marcha» sin tocar nada', !reintento.ok && /already-exists/.test(String(reintento.e?.code)) && proveedor.llamadas === 1, `${reintento.e?.code} llamadas=${proveedor.llamadas}`);
  soltar(); proveedor.puerta = null;
  const r1 = await primero;
  check('S2b) el primero termina; 2 llamadas al proveedor y un solo cobro de 20', r1.ok && proveedor.llamadas === 2 && (await saldo(u)) === antes - 20);
  const r3 = await correr(u, `s2_${marca}`);
  check('S2c) un reintento después de terminar devuelve `done` sin volver a ejecutar ni cobrar', r3.ok && r3.v.status === 'done' && proveedor.llamadas === 2 && (await saldo(u)) === antes - 20);
}

/* ══ S3 · caída entre el proveedor y el registro ═════════════════════════ */
console.log('\n── S3 · el proceso muere después de pagar al proveedor ──');
{
  reiniciarProveedor();
  const u = await persona('S3');
  const antes = await saldo(u);
  const id = `s3_${marca}`;
  /* Lo que deja un proceso muerto: reserva AUTHORIZED, trabajo `running` con el paso 1 hecho (pagado) y sin cierre. */
  await trabajo(u, id, DOS_PASOS);
  await creditos.holdCredits(u, id, { steps: DOS_PASOS }, 20, 'WEË AI · prueba');
  const muerto = Date.now() - PLAZO_DE_EJECUCION_MS - 120_000;
  await db.collection('creatorJobs').doc(id).update({ status: 'running', runId: 'proceso-muerto', deadlineAt: muerto, steps: [{ ...DOS_PASOS[0], status: 'done', generationId: 'gen_pagada' }, { ...DOS_PASOS[1], status: 'running' }] });
  check('S3a) mientras tanto los Credits están retenidos', (await saldo(u)) === antes - 20 && (await tx(`usage_${id}`))?.status === 'AUTHORIZED');
  const [reintento, informe] = await Promise.all([correr(u, id), barrerTrabajosLegacy({ db })]);
  const rs = await reembolsos(id);
  check('S3b) reintento y barrido a la vez: UNA transición, UNA devolución, saldo restaurado exacto',
    rs.length === 1 && rs[0].amount === 20 && (await saldo(u)) === antes && (await tx(`usage_${id}`))?.status === 'REFUNDED' && (await estado(id)).status === 'failed',
    `reembolsos=${rs.length} saldo ${antes}→${await saldo(u)}`);
  check('S3c) el reintento contesta TIMEOUT («te devolví los Credits») y NO vuelve a llamar al proveedor', !reintento.ok && /deadline-exceeded/.test(String(reintento.e?.code)) && proveedor.llamadas === 0, `${reintento.e?.code} llamadas=${proveedor.llamadas}`);
  const informe2 = await barrerTrabajosLegacy({ db });
  check('S3d) un segundo barrido no mueve nada', informe2.abandonados === 0 && (await reembolsos(id)).length === 1 && (await saldo(u)) === antes);
  check('S3e) el coste de proveedor ya pagado queda contado para la conciliación (lo pierde Weë, no la persona)', informe.conCosteDeProveedor + informe2.conCosteDeProveedor <= 1);

  /* Control: el proceso pasó su `deadlineAt` hace 10 s, pero aún puede estar liquidando: nadie lo toca. */
  const vivo = `s3v_${marca}`;
  await trabajo(u, vivo, DOS_PASOS);
  await creditos.holdCredits(u, vivo, { steps: DOS_PASOS }, 20, 'WEË AI · prueba');
  await db.collection('creatorJobs').doc(vivo).update({ status: 'running', runId: 'vivo', deadlineAt: Date.now() - 10_000 });
  const rv = await correr(u, vivo);
  const iv = await barrerTrabajosLegacy({ db });
  check('S3f) CONTROL: con el proceso aún dentro de su reserva para liquidar, ni el reintento ni el barrido devuelven nada',
    !rv.ok && /already-exists/.test(String(rv.e?.code)) && (await tx(`usage_${vivo}`))?.status === 'AUTHORIZED' && (await estado(vivo)).status === 'running' && iv.abandonados === 0);
  /* Y cuando el proceso ya no puede vivir, el barrido lo cierra. */
  const tarde = await barrerTrabajosLegacy({ db, ahora: Date.now() + 120_000 });
  check('S3g) …pasado el fin del proceso, el barrido lo cierra y devuelve', tarde.abandonados >= 1 && (await tx(`usage_${vivo}`))?.status === 'REFUNDED');
}

/* ══ S4 · la misma liquidación dos veces (el «webhook duplicado») ════════ */
console.log('\n── S4 · liquidación repetida ──');
{
  const u = await persona('S4');
  const antes = await saldo(u);
  const rid = `s4_${marca}`;
  await creditEngine.spendCredits({ userId: u, service: 'ai_text', amount: 10, requestId: rid, source: 'weë-runtime' });
  const L = liquidacionDeWee();
  const reserva = { requestId: rid, transactionId: `usage_${rid}`, importe: 10 };
  const dos = await Promise.all([L.liquidar({ userId: u, reserva, importe: 10, jobId: 'j' }), L.liquidar({ userId: u, reserva, importe: 10, jobId: 'j' })]);
  /* El Credit Engine contesta COMPLETED a la repetición (inofensiva): lo que importa es que el dinero se movió UNA vez. */
  const u4 = await tx(`usage_${rid}`);
  check('S4a) dos avisos del mismo desenlace a la vez: un solo cobro de 10, sin ajuste ni reembolso',
    dos.every((d) => d.desenlace !== 'fallo') && u4?.status === 'COMPLETED' && u4.finalAmount === 10 && (await saldo(u)) === antes - 10 && (await reembolsos(rid)).length === 0,
    `${dos.map((d) => d.desenlace).join()} ${antes}→${await saldo(u)}`);
  const tarde = await L.reembolsar({ userId: u, reserva });
  check('S4b) un aviso de fallo que llega tarde no devuelve lo ya cobrado', tarde.desenlace === 'ya_estaba' && (await saldo(u)) === antes - 10);
  const rid2 = `s4r_${marca}`;
  await creditEngine.spendCredits({ userId: u, service: 'ai_text', amount: 7, requestId: rid2, source: 'weë-creator' });
  const r = await Promise.all([1, 2, 3].map(() => creditEngine.refundCredits({ userId: u, requestId: rid2, reason: 'prueba' })));
  check('S4c) tres reembolsos a la vez: uno de verdad, dos duplicados, saldo exacto', r.filter((x) => !x.duplicate).length === 1 && (await reembolsos(rid2)).length === 1 && (await saldo(u)) === antes - 10);
  const otra = await intento(() => creditEngine.spendCredits({ userId: u, service: 'ai_text', amount: 7, requestId: rid2 }));
  check('S4d) un requestId reembolsado no se reutiliza para generar gratis', !otra.ok && otra.e?.code === 'ALREADY_REFUNDED');
}

/* ══ S5 · trabajo parcial ════════════════════════════════════════════════ */
console.log('\n── S5 · falla el paso 2 ──');
{
  reiniciarProveedor();
  const u = await persona('S5');
  const antes = await saldo(u);
  const id = `s5_${marca}`;
  await trabajo(u, id, DOS_PASOS);
  proveedor.falla = (ctx) => ctx.stepId === 'texto';
  const r = await correr(u, id);
  check('S5a) falla, se devuelve entero una vez, el trabajo queda `failed` con el paso 1 hecho',
    !r.ok && (await estado(id)).status === 'failed' && (await reembolsos(id)).length === 1 && (await saldo(u)) === antes && (await estado(id)).steps[0].status === 'done');
  proveedor.falla = null;
  const r2 = await correr(u, id);
  check('S5b) «reanudar» no re-ejecuta ni re-cobra: el paso 1 se llamó UNA vez, sin reserva nueva',
    !r2.ok && proveedor.porPaso[`${id}:idea`] === 1 && proveedor.llamadas === 2 && (await saldo(u)) === antes && (await reembolsos(id)).length === 1, JSON.stringify(proveedor.porPaso));
}

/* ══ S6 · liquidación pendiente ══════════════════════════════════════════ */
console.log('\n── S6 · la liquidación falló y quedó anotada ──');
{
  const u = await persona('S6');
  const antes = await saldo(u);
  const id = `s6_${marca}`;
  await trabajo(u, id, DOS_PASOS);
  await creditos.holdCredits(u, id, { steps: DOS_PASOS }, 20, 'WEË AI · prueba');
  await db.collection('creatorJobs').doc(id).update({ status: 'done', creditsCharged: 15, liquidacionPendiente: { accion: 'completar', retenido: 20, usado: 15, motivo: 'Firestore no respondió', at: Timestamp.fromMillis(Date.now() - 10 * 60_000) } });
  const [i1, i2] = await Promise.all([barrerTrabajosLegacy({ db }), barrerTrabajosLegacy({ db })]);
  const u6 = await tx(`usage_${id}`);
  check('S6a) dos barridos a la vez: COMPLETED por 15, se devuelven los 5 de diferencia UNA vez',
    u6?.status === 'COMPLETED' && u6.finalAmount === 15 && (await saldo(u)) === antes - 15, `${u6?.status} ${u6?.finalAmount} ${antes}→${await saldo(u)}`);
  check('S6b) y la anotación desaparece (no se reintenta para siempre)', !(await estado(id)).liquidacionPendiente && i1.errores + i2.errores === 0);
}

/* ══ S7 · reserva de un trabajo que nunca arrancó ════════════════════════ */
console.log('\n── S7 · reservó y murió antes de arrancar ──');
{
  const u = await persona('S7');
  const antes = await saldo(u);
  const id = `s7_${marca}`;
  await trabajo(u, id, DOS_PASOS, { runId: 'muerto', claimedAt: Date.now() - 3_600_000 });
  await creditos.holdCredits(u, id, { steps: DOS_PASOS }, 20, 'WEË AI · prueba');
  const r0 = await barrerTrabajosLegacy({ db });
  check('S7a) recién hecha, el barrido NO la toca (un creatorRun vivo podría estar arrancando)', (await tx(`usage_${id}`))?.status === 'AUTHORIZED' && r0.sinArrancar === 0);
  await db.collection('creditTransactions').doc(`usage_${id}`).update({ createdAt: Timestamp.fromMillis(Date.now() - PLAZO_DE_EJECUCION_MS - 5 * 60_000) });
  const [a, b] = await Promise.all([barrerTrabajosLegacy({ db }), barrerTrabajosLegacy({ db })]);
  check('S7b) vieja: dos barridos a la vez la devuelven UNA vez y el trabajo queda `failed`',
    (await tx(`usage_${id}`))?.status === 'REFUNDED' && (await reembolsos(id)).length === 1 && (await saldo(u)) === antes && (await estado(id)).status === 'failed', `${a.sinArrancar}+${b.sinArrancar}`);
  const r = await correr(u, id);
  check('S7c) y ya no se puede arrancar con esa reserva devuelta (no se genera gratis)', !r.ok && (await saldo(u)) === antes);
  /* Terminado y entregado, pero su cobro nunca se cerró ni quedó anotado: se cobra lo que dice el trabajo, una vez. */
  const hecho = `s7d_${marca}`;
  await trabajo(u, hecho, DOS_PASOS);
  await creditos.holdCredits(u, hecho, { steps: DOS_PASOS }, 20, 'WEË AI · prueba');
  await db.collection('creatorJobs').doc(hecho).update({ status: 'done', creditsCharged: 12 });
  await db.collection('creditTransactions').doc(`usage_${hecho}`).update({ createdAt: Timestamp.fromMillis(Date.now() - PLAZO_DE_EJECUCION_MS - 5 * 60_000) });
  await Promise.all([barrerTrabajosLegacy({ db }), barrerTrabajosLegacy({ db })]);
  const ud = await tx(`usage_${hecho}`);
  check('S7d) terminado con la reserva abierta y sin anotación: se cobra `creditsCharged` (12 de 20) una vez',
    ud?.status === 'COMPLETED' && ud.finalAmount === 12 && (await saldo(u)) === antes - 12, `${ud?.status} ${ud?.finalAmount} ${antes}→${await saldo(u)}`);
}

/* ══ S8 · saldo insuficiente ═════════════════════════════════════════════ */
console.log('\n── S8 · no alcanza ──');
{
  reiniciarProveedor();
  const u = await persona('S8', 0);
  const id = `s8_${marca}`;
  /* La bienvenida pudo dar saldo: se gasta hasta dejar 5. */
  const s0 = await saldo(u);
  if (s0 > 5) await creditEngine.spendCredits({ userId: u, service: 'ai_text', amount: s0 - 5, requestId: `gasto_${marca}`, source: 'prueba' }).then(() => creditEngine.completeCredits({ userId: u, requestId: `gasto_${marca}` }));
  await trabajo(u, id, DOS_PASOS);
  const r = await correr(u, id);
  check('S8a) INSUFFICIENT: sin reserva, sin llamada al proveedor, saldo 5 y nunca negativo, trabajo `planned` y sin reclamo',
    !r.ok && !(await tx(`usage_${id}`)) && proveedor.llamadas === 0 && (await saldo(u)) === 5 && (await estado(id)).status === 'planned' && !(await estado(id)).runId, `${r.e?.code} saldo=${await saldo(u)}`);
}

/* ══ S9 · demo ═══════════════════════════════════════════════════════════ */
console.log('\n── S9 · resultados de muestra ──');
{
  reiniciarProveedor();
  const u = await persona('S9');
  const antes = await saldo(u);
  const id = `s9_${marca}`;
  await trabajo(u, id, [{ id: 'cancion', capability: 'music.generate', purpose: 'canción', input: {} }, { id: 'efecto', capability: 'audio.sfx', purpose: 'efecto', input: {} }]);
  proveedor.demo = true;
  const r = await correr(u, id);
  check('S9a) música y efectos atendidos por el demo: termina, cobra 0 y el saldo queda intacto',
    r.ok && (await estado(id)).creditsCharged === 0 && (await saldo(u)) === antes && ['REFUNDED', 'COMPLETED'].includes((await tx(`usage_${id}`))?.status), `${(await estado(id))?.creditsCharged} ${antes}→${await saldo(u)}`);
  reiniciarProveedor();
  const id2 = `s9m_${marca}`;
  await trabajo(u, id2, DOS_PASOS);
  proveedor.demo = (ctx) => ctx.stepId === 'texto';
  const r2 = await correr(u, id2);
  const cobrado = (await estado(id2)).creditsCharged;
  check('S9b) mixto (idea real + texto demo): cobra solo la parte real, menos que lo cotizado', r2.ok && cobrado > 0 && cobrado < 20 && (await saldo(u)) === antes - cobrado, `cobrado=${cobrado}`);
}

/* ══ S10 · vídeo apagado ═════════════════════════════════════════════════ */
console.log('\n── S10 · vídeo apagado ──');
{
  reiniciarProveedor();
  const u = await persona('S10');
  const antes = await saldo(u);
  const id = `s10_${marca}`;
  const conf = ADAPTERS.seedance.isConfigured;
  ADAPTERS.seedance.isConfigured = () => true;
  await trabajo(u, id, [{ id: 'clip', capability: 'video.generate', purpose: 'clip', input: { prompt: 'un tren', durationSec: 5 } }]);
  const r = await correr(u, id);
  ADAPTERS.seedance.isConfigured = conf;
  check('S10a) sin `videoHabilitado`: rechazo antes del cupo, la reserva y el proveedor; saldo intacto; el trabajo sigue `planned`',
    !r.ok && r.e?.code === 'failed-precondition' && !(await tx(`usage_${id}`)) && proveedor.llamadas === 0 && (await saldo(u)) === antes && (await estado(id)).status === 'planned', `${r.e?.code}`);
}

/* ══ R · conciliación ════════════════════════════════════════════════════ */
console.log('\n── R · conciliación trabajo ↔ transacción ↔ saldo ──');
{
  await barrerTrabajosLegacy({ db, ahora: Date.now() + 2 * PLAZO_DE_EJECUCION_MS });
  const descuadres = [];
  for (const uid of personas) {
    const jobs = (await db.collection('creatorJobs').where('userId', '==', uid).get()).docs.map((d) => d.data());
    const txs = (await db.collection('creditTransactions').where('userId', '==', uid).get()).docs.map((d) => d.data());
    const neto = txs.reduce((s, t) => {
      if (t.type === 'usage') return s + (t.status === 'REFUNDED' || t.status === 'FAILED' ? 0 : t.status === 'COMPLETED' && typeof t.finalAmount === 'number' ? -t.finalAmount : t.amount);
      if (t.type === 'refund' && t.refundOf) return s; /* ya contado en el estado del uso */
      return s + (Number(t.amount) || 0);
    }, 0);
    const bal = await saldo(uid);
    if (bal < 0) descuadres.push(`${uid}: saldo negativo ${bal}`);
    if (bal !== neto) descuadres.push(`${uid}: saldo ${bal} ≠ libro ${neto}`);
    for (const j of jobs) {
      const u = txs.find((t) => t.type === 'usage' && t.requestId === j.id);
      if (u?.status === 'AUTHORIZED') descuadres.push(`${j.id}: reserva abierta`);
      if (j.status === 'done' && u && u.status === 'COMPLETED' && (u.finalAmount ?? u.authorizedAmount) !== j.creditsCharged) descuadres.push(`${j.id}: cobrado ${u.finalAmount} ≠ trabajo ${j.creditsCharged}`);
      if (j.status === 'failed' && u && u.status !== 'REFUNDED') descuadres.push(`${j.id}: fallido y ${u.status}`);
      const devoluciones = txs.filter((t) => t.type === 'refund' && t.requestId === j.id && !String(t.id || '').startsWith('adjust'));
      if (devoluciones.length > 1) descuadres.push(`${j.id}: ${devoluciones.length} reembolsos`);
    }
  }
  check('R1) ninguna reserva abierta, ningún saldo negativo, saldo = libro, trabajo = transacción, ≤1 reembolso por trabajo', descuadres.length === 0, descuadres.join(' | '));
}

check('Z) ninguna petición salió a la red', salidasALaRed === 0, String(salidasALaRed));
globalThis.fetch = fetchReal;
const s = Math.round((Date.now() - empezo) / 1000);
check('Z2) por debajo de 300 s', s < 300, `${s} s`);
console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
