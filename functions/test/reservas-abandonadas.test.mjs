/*
 * NINGUNA RESERVA DE CREDITS SE QUEDA ABIERTA PARA SIEMPRE — revisión post-auditoría 2026-10-01.
 *
 *   node test/reservas-abandonadas.test.mjs        (usa el compilado: `npm run build` antes)
 *
 * La regla de Weë no cambia: reservar → ejecutar → si se ENTREGÓ, se cobra; si no, se devuelve; y lo que sigue
 * «en marcha» después de lo que puede vivir quien lo ejecuta está ABANDONADO y se devuelve (`operacionAbandonada`,
 * la que ya usaba el vídeo). Lo que esta suite vigila son los tres sitios donde esa regla se quedaba a medias:
 *
 *  A. money/reserva-colgada-avatar — el avatar dejaba reservas en AUTHORIZED para siempre: si el proceso moría o el
 *     reembolso fallaba, nadie las cerraba (el barrido solo mira los trabajos del Core y la app pide cada avatar con
 *     un requestId nuevo). Y un duplicado ya REEMBOLSADO contestaba «en marcha» para siempre.
 *  B. server/credits/creator/brain.ts#brainChat — la decisión del cobro de Weë Brain cuando algo falla después de
 *     generar (su prueba ejecutada vive en brain-canary; aquí, el caso que faltaba: entregada = cobrada).
 *  C. server/reembolso/creator/video.ts#generateVideo — en el camino del Core, un fallo ANTES de que existiera el
 *     trabajo dejaba la reserva colgada: ahora se devuelve si (y solo si) no hay trabajo.
 *
 * Se EJECUTA el compilado con el Credit Engine, el proveedor y el almacén de trabajos sustituidos.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const motor = lib('credits/creditEngine.js').creditEngine;
const vertexMod = lib('vertexAI.js');
const avatarMod = lib('generateAvatar.js');
const originales = { ...motor, gen: vertexMod.generateAvatarWithImagen, subir: vertexMod.uploadImageToStorage };

const MIN = 60 * 1000;
const ahora = Date.now();
const hace = (min) => ({ toMillis: () => ahora - min * MIN });

/* ── A · El avatar ──────────────────────────────────────────────────────── */
console.log('\n── A · Las reservas del avatar ──');
{
  /* Si faltan (código anterior), las comprobaciones fallan en vez de romper la suite: así el sabotaje se ve entero. */
  const { reservasDelAvatarAbandonadas = () => [], reservaAbandonada = () => undefined } = avatarMod;
  const historial = [
    { type: 'usage', status: 'AUTHORIZED', source: 'wee-avatar', requestId: 'avatar_viejo', createdAt: hace(30) },
    { type: 'usage', status: 'AUTHORIZED', source: 'wee-avatar', requestId: 'avatar_reciente', createdAt: hace(2) },
    { type: 'usage', status: 'COMPLETED', source: 'wee-avatar', requestId: 'avatar_hecho', createdAt: hace(60) },
    { type: 'usage', status: 'AUTHORIZED', source: 'weë-brain', requestId: 'brain_viejo', createdAt: hace(60) },
    { type: 'refund', status: 'COMPLETED', source: 'wee-avatar', requestId: 'avatar_x', createdAt: hace(60) },
    { type: 'usage', status: 'AUTHORIZED', source: 'wee-avatar', requestId: 'avatar_segundos', createdAt: { seconds: Math.floor((ahora - 45 * MIN) / 1000) } },
  ];
  const abandonadas = reservasDelAvatarAbandonadas(historial, ahora);
  check('1) una reserva del avatar en AUTHORIZED más vieja que lo que vive la función está abandonada',
    abandonadas.includes('avatar_viejo') && abandonadas.includes('avatar_segundos'), abandonadas.join(','));
  check('2) …una reciente NO (puede seguir generando), ni una COMPLETED, ni una de otro servicio, ni un reembolso',
    !abandonadas.includes('avatar_reciente') && !abandonadas.includes('avatar_hecho') && !abandonadas.includes('brain_viejo') && !abandonadas.includes('avatar_x'));
  check('3) sin fecha no se da nada por abandonado (no se devuelve a ciegas)', reservaAbandonada(undefined, ahora) === false
    && reservasDelAvatarAbandonadas([{ type: 'usage', status: 'AUTHORIZED', source: 'wee-avatar', requestId: 'r' }], ahora).length === 0);

  /* El manejador de verdad, con el motor y el proveedor sustituidos (el mismo arnés que avatar-duplicados). */
  let c = {};
  let gasto = () => ({ transactionId: 'usage_x', status: 'AUTHORIZED', amount: 5, duplicate: false });
  let hist = [];
  const reembolsados = [];
  const reiniciar = () => { c = { gasta: 0, genera: 0, completa: 0, reembolsa: 0 }; reembolsados.length = 0; };
  motor.ensureAccount = async () => ({});
  motor.spendCredits = async () => { c.gasta++; return gasto(); };
  motor.getCreditHistory = async () => hist;
  motor.completeCredits = async () => { c.completa++; return { status: 'COMPLETED', refunded: 0, balanceAfter: 0 }; };
  motor.refundCredits = async (i) => { c.reembolsa++; reembolsados.push(i.requestId); return { transactionId: 'refund_x', amount: 5, balanceAfter: 0, duplicate: false }; };
  vertexMod.generateAvatarWithImagen = async () => { c.genera++; return 'data:image/png;base64,AAAA'; };
  vertexMod.uploadImageToStorage = async () => 'https://firebasestorage.googleapis.com/v0/b/get-wee.firebasestorage.app/o/nuevo.png';
  const pedir = (data) => avatarMod.generateAvatarWithGemini.run({ auth: { uid: 'u1' }, data }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  const SEL = { selections: { gender: 'female' } };

  reiniciar();
  hist = [{ type: 'usage', status: 'AUTHORIZED', source: 'wee-avatar', requestId: 'avatar_colgado', createdAt: hace(30) }];
  const r1 = await pedir({ ...SEL, requestId: 'avatar_nuevo' });
  check('4) al pedir otro avatar se devuelve lo que el anterior dejó colgado, y el nuevo se genera normal',
    r1.ok && reembolsados.join(',') === 'avatar_colgado' && c.genera === 1 && c.completa === 1, JSON.stringify({ c, reembolsados }));

  reiniciar();
  hist = [];
  gasto = () => ({ transactionId: 'usage_avatar_b', status: 'AUTHORIZED', amount: 5, duplicate: true, authorizedAt: ahora - 30 * MIN });
  const r2 = await pedir({ ...SEL, requestId: 'avatar_b' });
  check('5) la MISMA operación en AUTHORIZED pasado su plazo: se devuelve una vez y se dice que falló, sin generar',
    !r2.ok && r2.e.details?.reason === 'generation_failed' && reembolsados.join(',') === 'avatar_b' && c.genera === 0 && c.completa === 0, JSON.stringify({ c, reembolsados }));

  reiniciar();
  gasto = () => ({ transactionId: 'usage_avatar_c', status: 'AUTHORIZED', amount: 5, duplicate: true, authorizedAt: ahora - 1 * MIN });
  const r3 = await pedir({ ...SEL, requestId: 'avatar_c' });
  check('6) CONTROL: dentro de su plazo sigue siendo «en marcha», sin tocar su reserva (H0 #11 intacto)',
    !r3.ok && r3.e.details?.reason === 'in_progress' && c.reembolsa === 0 && c.genera === 0);

  reiniciar();
  gasto = () => ({ transactionId: 'usage_avatar_d', status: 'REFUNDED', amount: 5, duplicate: true });
  const r4 = await pedir({ ...SEL, requestId: 'avatar_d' });
  check('7) un duplicado ya REEMBOLSADO ya no contesta «en marcha» para siempre: dice que falló, sin generar ni devolver dos veces',
    !r4.ok && r4.e.details?.reason === 'generation_failed' && c.genera === 0 && c.reembolsa === 0, String(r4.e?.details?.reason));

  reiniciar();
  hist = [{ type: 'usage', status: 'AUTHORIZED', source: 'wee-avatar', requestId: 'avatar_colgado', createdAt: hace(30) }];
  motor.getCreditHistory = async () => { throw new Error('Firestore no contesta'); };
  gasto = () => ({ transactionId: 'usage_x', status: 'AUTHORIZED', amount: 5, duplicate: false });
  const r5 = await pedir({ ...SEL, requestId: 'avatar_e' });
  check('8) si no se puede revisar lo abandonado, la persona NO se queda sin su avatar (best effort)', r5.ok && c.genera === 1);
  motor.getCreditHistory = async () => hist;
}

/* ── B · Weë Brain: entregada = cobrada ─────────────────────────────────── */
console.log('\n── B · El cobro de Weë Brain cuando algo falla después de generar ──');
{
  const { queHacerConElCobro } = lib('creator/brainUsage.js');
  const d = (o) => queHacerConElCobro(o);
  const todas = [true, false].flatMap((cobrado) => [true, false].flatMap((entregada) => [true, false].flatMap((devolverEsSeguro) =>
    [true, false].map((contadaAqui) => ({ cobrado, entregada, devolverEsSeguro, contadaAqui, r: d({ cobrado, entregada, devolverEsSeguro, contadaAqui }) })))));
  check('9) nunca se devuelve una respuesta ENTREGADA', todas.filter((x) => x.entregada).every((x) => !x.r.reembolsar && !x.r.deshacerBloque));
  check('10) nunca se devuelve si devolver no es seguro', todas.filter((x) => !x.devolverEsSeguro).every((x) => !x.r.reembolsar));
  check('11) nunca se completa ni se devuelve lo que no se cobró', todas.filter((x) => !x.cobrado).every((x) => !x.r.reembolsar && !x.r.completar));
  check('12) nunca se completa y se devuelve a la vez', todas.every((x) => !(x.r.completar && x.r.reembolsar)));
  check('13) el bloque solo se deshace si ESTA invocación lo contó y no entregó', todas.every((x) => x.r.deshacerBloque === (x.contadaAqui && !x.entregada && x.devolverEsSeguro)));
}

/* ── C · El vídeo del Core: una reserva sin trabajo se devuelve ─────────── */
console.log('\n── C · La reserva del vídeo cuando el camino del Core falla antes del trabajo ──');
{
  const { initializeApp, getApps } = require('firebase-admin/app');
  if (!getApps().length) initializeApp({ projectId: 'demo-wee' });
  const runtime = lib('runtime/index.js');
  const ledger = lib('engine/ledger.js');
  const video = lib('creator/video.js');
  const originalTrabajo = runtime.trabajoDelMedioDeWee;
  const originalSettle = ledger.firestoreLedger.settle;
  const devueltos = [];
  motor.refundCredits = async (i) => { devueltos.push(i.requestId); return { transactionId: 'refund_x', amount: 5, balanceAfter: 0, duplicate: false }; };
  ledger.firestoreLedger.settle = async () => ({});
  const falla = async () => { throw new Error('no se pudo montar el conductor'); };

  runtime.trabajoDelMedioDeWee = async () => undefined;
  const a = await video.sinReservaHuerfana('u1', 'video_a', falla).then(() => 'ok', (e) => e.message);
  check('14) falla antes de que exista el trabajo → se devuelve la reserva y el error sigue subiendo',
    a === 'no se pudo montar el conductor' && devueltos.join(',') === 'video_a', devueltos.join(','));

  devueltos.length = 0;
  runtime.trabajoDelMedioDeWee = async () => ({ id: 'job_1', status: 'running' });
  await video.sinReservaHuerfana('u1', 'video_b', falla).catch(() => {});
  check('15) CONTROL: si el trabajo YA existe, no se toca: su dinero lo cierra la liquidación', devueltos.length === 0);

  runtime.trabajoDelMedioDeWee = async () => { throw new Error('Firestore no contesta'); };
  await video.sinReservaHuerfana('u1', 'video_c', falla).catch(() => {});
  check('16) si ni siquiera se puede saber si hay trabajo, NO se devuelve a ciegas (se reconcilia)', devueltos.length === 0);

  const b = await video.sinReservaHuerfana('u1', 'video_d', async () => 'hecho');
  check('17) CONTROL: si no falla, no hace nada más que devolver el resultado', b === 'hecho' && devueltos.length === 0);

  runtime.trabajoDelMedioDeWee = originalTrabajo;
  ledger.firestoreLedger.settle = originalSettle;
}

Object.assign(motor, originales);
vertexMod.generateAvatarWithImagen = originales.gen;
vertexMod.uploadImageToStorage = originales.subir;

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
