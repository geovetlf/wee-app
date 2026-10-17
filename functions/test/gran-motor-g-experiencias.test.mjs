/**
 * GRAN MOTOR · PAQUETE G — LAS EXPERIENCIAS DE PUNTA A PUNTA, EN MODO DEMO Y CON UN «REAL» DE PRUEBA.
 *
 * Recorre `creatorChat` → `creatorRun` COMPILADOS (el camino de todas las experiencias hoy: Legacy) con Firestore en
 * memoria, el Credit Engine de verdad y el proveedor `mock`; sin claves, sin red (fetch y sockets cortados y contados).
 * No abre ninguna puerta del Core: `aiSettings/runtime` no existe en la base de prueba, así que todo es Legacy.
 *
 *   A  los 35 planes distintos que puede armar Weë AI (uno por experiencia y por cadena de capacidades), ejecutados:
 *      cuáles terminan en demo, cuáles piden foto y cuáles NO pueden terminar en demo (hueco conocido, G-6);
 *   B  con la foto de la cuenta, los que la piden terminan; la de otra cuenta se rechaza;
 *   C  consumo de Credits: la demo no cobra; con un «real» de prueba se cobra lo cotizado, una vez;
 *   D  repetir, fallar, reintentar y la carrera de dos ejecuciones: sin doble cobro, con reembolso exacto;
 *   E  cancelar: NO existe en el camino de las experiencias (hueco conocido, igual que en las tomas).
 *
 * Qué NO se puede medir aquí (NO VERIFICABLE CON EL ENTORNO DISPONIBLE): lo que un proveedor real devolvería
 * —calidad, latencia, coste del proveedor, formato de sus respuestas— y la entrega final a la interfaz en un dispositivo.
 *
 * Usa el compilado: `npm run build` antes.
 */
import net from 'node:net';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { acelerarLasEsperasCortas, apuntarLaConsola, crearComprobador } from './_aceptacion.mjs';
import { todosLosPlanes } from './_planes.mjs';

for (const k of ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'FAL_KEY', 'GEMINI_API_KEY',
  'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'SEEDANCE_CALLBACK_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'GOOGLE_CLOUD_PROJECT']) delete process.env[k];
process.env.GCLOUD_PROJECT = 'demo-gm-g-exp';
process.env.METADATA_SERVER_DETECTION = 'none';
process.env.STORAGE_BUCKET = 'demo-gm-g-exp.firebasestorage.app';
const intentosDeRed = [];
globalThis.fetch = async (u) => { intentosDeRed.push(`fetch ${String(u).slice(0, 60)}`); throw new Error('sin red'); };
const conectarOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { intentosDeRed.push('socket'); throw new Error('sin red'); };

const base = new BaseEnMemoria();
instalarLaBase(() => base);
acelerarLasEsperasCortas();
const consola = apuntarLaConsola();
const { check, hueco, titulo, terminar } = crearComprobador();

const creator = lib('creator/index.js');
const { ADAPTERS } = lib('engine/registry.js');
const U = 'DemoUsuarioGGGGGGGGGGGGGGGG1';
const OTRO = 'DemoUsuarioHHHHHHHHHHHHHHHH2';
await darDeAlta(base, U);
await darDeAlta(base, OTRO);

const foto = (uid) => `https://firebasestorage.googleapis.com/v0/b/demo-gm-g-exp.firebasestorage.app/o/users%2F${uid}%2Fcreator-inputs%2Ffoto.jpg?alt=media&token=t`;
const chat = (uid, data) => creator.creatorChat.run({ auth: { uid }, data: { locale: 'es', ...data } });
const correr = (uid, jobId) => creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } });
const trabajo = (id) => base.leer(`creatorJobs/${id}`);
const asientos = (uid) => base.de('creditTransactions').filter((t) => t.userId === uid && t.type === 'usage').map((t) => `${t.status}:${t.amount}`);
const codigo = async (fn) => { try { await fn(); return 'ok'; } catch (e) { return e.code || e.message; } };

/** Crea un trabajo con respuestas ya elegidas y lo lleva hasta tener plan. */
const planear = async (uid, experienceId, goal, answers, extra = {}) => {
  const presetAnswers = answers.map((a) => ({ questionId: a.questionId, ...(a.optionId ? { optionId: a.optionId } : { text: a.text }) }));
  let r = await chat(uid, { experienceId, goal, presetAnswers, ...extra });
  let guarda = 0;
  while (r.question && guarda++ < 12) {
    const q = r.question;
    r = await chat(uid, { jobId: r.jobId, answer: q.options?.length ? { questionId: q.id, optionId: q.options[0].id } : { questionId: q.id, text: 'texto' } });
  }
  return r;
};

/* ═══ A · los 35 planes ═══════════════════════════════════════════════════════ */
titulo('A · Todas las experiencias, un plan por cadena de capacidades, ejecutadas en demo');
const planes = await todosLosPlanes();
const vistos = new Set();
const firmas = [];
for (const p of planes) {
  const firma = `${p.experienceId}|${p.plan.steps.map((s) => s.capability).join('>')}`;
  if (!vistos.has(firma)) { vistos.add(firma); firmas.push({ ...p, firma }); }
}
check('A1) hay 35 cadenas distintas de capacidades entre las 11 experiencias', firmas.length === 35, String(firmas.length));

const resultados = [];
for (const p of firmas) {
  const r = await planear(U, p.experienceId, p.goal, p.answers);
  const pasos = (r.plan?.steps ?? []).map((s) => s.capability).join('>') || p.firma.split('|')[1];
  const antes = saldoDe(base, U);
  const error = await codigo(() => correr(U, r.jobId));
  const j = trabajo(r.jobId);
  resultados.push({ ...p, jobId: r.jobId, pasos, error, estado: j.status, cobrado: j.creditsCharged, demo: j.demo, resultados: (j.results ?? []).length, pasosDelPlan: (j.steps ?? []).length, saldoIgual: saldoDe(base, U) === antes });
}
const pideFoto = (x) => x.estado === 'planned' && x.error === 'invalid-argument';
const terminaron = resultados.filter((x) => x.estado === 'done');
const sinFoto = resultados.filter(pideFoto);
const fallidos = resultados.filter((x) => x.estado === 'failed');
check('A2) 21 terminan en demo, 14 piden una foto antes de empezar y ninguna falla (G-6 cerrado: el guion de muestra trae su «NARRACIÓN:»): ninguna se queda a medias',
  terminaron.length === 21 && sinFoto.length === 14 && fallidos.length === 0, `done=${terminaron.length} foto=${sinFoto.length} failed=${fallidos.length}`);
check('A3) las que terminan en demo: marcadas demo, cobran 0 y entregan un resultado por paso',
  terminaron.every((x) => x.demo === true && x.cobrado === 0 && x.resultados === x.pasosDelPlan && x.resultados > 0));
check('A4) las que piden foto no reservan ni cobran nada: el trabajo sigue `planned`', sinFoto.every((x) => x.cobrado === 0 && x.saldoIgual));
check('A5) ninguna falla en demo, y si alguna fallara no cobraría y devolvería lo reservado', fallidos.length === 0 && fallidos.every((x) => x.cobrado === 0 && x.saldoIgual));
check('A6) y el saldo de la persona sigue entero (240) después de los 35 recorridos', saldoDe(base, U) === 240, String(saldoDe(base, U)));
check('A7) cada una de las 11 experiencias tiene al menos un camino que termina en demo sin foto, salvo Beauty (Studio ya termina por guion→vídeo→voz)',
  ['design', 'photo', 'writer', 'music', 'chef', 'home', 'business', 'travel', 'brain', 'studio'].every((e) => terminaron.some((x) => x.experienceId === e))
  && !terminaron.some((x) => x.experienceId === 'beauty'));
const studioVoz = resultados.find((x) => x.experienceId === 'studio' && x.pasos === 'text.generate>video.generate>voice.tts');
check('G-6) Weë Studio con narración (guion→vídeo→voz) termina en modo demo: el guion de muestra trae «NARRACIÓN:» como el contrato real',
  studioVoz?.estado === 'done' && studioVoz?.cobrado === 0, `estado=${studioVoz?.estado}`);
{
  /* Y la guarda NO se ha debilitado: un guion sin «NARRACIÓN:» sigue sin narración que leer, así que la voz se pararía antes de pagar el vídeo. */
  const { narrationFrom } = lib('creator/prompts.js');
  const guionSinMarca = ['🎬 Guion · prueba', '', 'Escena 1 (0–4 s): plano cercano.', 'Escena 2 (4–8 s): manos.'].join(String.fromCharCode(10));
  check('G-6b) la guarda sigue en pie: un guion SIN «NARRACIÓN:» no da narración (vozSinNarracion pararía la voz)', narrationFrom([guionSinMarca], 'prueba') === '', JSON.stringify(narrationFrom([guionSinMarca], 'prueba')));
}

/* ═══ B · adjuntos ════════════════════════════════════════════════════════════ */
titulo('B · Adjuntos: la foto de la cuenta abre los planes que la piden; la de otra cuenta no');
{
  const conFoto = [];
  for (const p of sinFoto) {
    const r = await planear(U, p.experienceId, p.goal, p.answers, { imageUrl: foto(U) });
    const error = await codigo(() => correr(U, r.jobId));
    const j = trabajo(r.jobId);
    conFoto.push({ experienceId: p.experienceId, pasos: p.pasos, error, estado: j.status, cobrado: j.creditsCharged, resultados: (j.results ?? []).length, pasosDelPlan: (j.steps ?? []).length });
  }
  check('B1) con la foto de la cuenta, los 14 planes que la piden terminan en demo, sin cobrar y con un resultado por paso',
    conFoto.length === 14 && conFoto.every((x) => x.estado === 'done' && x.cobrado === 0 && x.resultados === x.pasosDelPlan), conFoto.filter((x) => x.estado !== 'done').map((x) => `${x.experienceId}:${x.pasos}:${x.error}`).join(' | '));
  check('B2) también terminan Studio y Beauty (que sin foto no tenían camino)',
    conFoto.some((x) => x.experienceId === 'studio' && x.estado === 'done') && conFoto.some((x) => x.experienceId === 'beauty' && x.estado === 'done'));
  const ajena = await codigo(() => chat(U, { experienceId: 'photo', goal: 'x', imageUrl: foto(OTRO) }));
  check('B3) la foto de OTRA cuenta se rechaza al crear el trabajo', ajena === 'invalid-argument');
  const fuera = await codigo(() => chat(U, { experienceId: 'photo', goal: 'x', imageUrl: 'https://ejemplo.com/foto.jpg' }));
  check('B4) y una dirección que no es del almacén de Weë, también', fuera === 'invalid-argument');
}

/* ═══ C · consumo de Credits ═════════════════════════════════════════════════ */
titulo('C · Consumo de Credits: la demo no cobra; con un «real» de prueba se cobra lo cotizado, una vez');
const corre = ADAPTERS.mock.run;
const original = Object.fromEntries(['deepseek', 'gemini'].map((id) => [id, { isConfigured: ADAPTERS[id].isConfigured, run: ADAPTERS[id].run }]));
const conIaReal = (run = (q) => corre.call(ADAPTERS.mock, q)) => { for (const id of ['deepseek', 'gemini']) { ADAPTERS[id].isConfigured = () => true; ADAPTERS[id].run = run; } };
const sinIaReal = () => { for (const id of ['deepseek', 'gemini']) Object.assign(ADAPTERS[id], original[id]); };
let writer;
{
  const antes = saldoDe(base, U);
  const nAsientos = asientos(U).length;
  writer = await planear(U, 'writer', 'un poema', []);
  conIaReal();
  const k = await correr(U, writer.jobId);
  const j = trabajo(writer.jobId);
  check('C1) con un proveedor «real» el texto se entrega, NO es demo y cobra exactamente lo cotizado',
    k.status === 'done' && j.demo === false && j.creditsCharged === j.creditsEstimated && j.creditsCharged > 0, `cobrado=${j.creditsCharged} cotizado=${j.creditsEstimated}`);
  check('C2) el saldo baja en esa cantidad y hay UN asiento COMPLETED por ese trabajo', saldoDe(base, U) === antes - j.creditsCharged && asientos(U).length === nAsientos + 1 && asientos(U).at(-1) === `COMPLETED:${-j.creditsCharged}`, asientos(U).at(-1));
  const saldo = saldoDe(base, U);
  const otra = await correr(U, writer.jobId);
  check('C3) volver a ejecutar un trabajo terminado devuelve done y no cobra otra vez', otra.status === 'done' && saldoDe(base, U) === saldo && asientos(U).length === nAsientos + 1);
}

/* ═══ D · fallos, reintentos, carrera ════════════════════════════════════════ */
titulo('D · Un fallo devuelve lo reservado; un trabajo fallido no se re-ejecuta; dos ejecuciones a la vez cobran una');
{
  conIaReal(async () => { throw new Error('boom del proveedor de prueba'); });
  const f = await planear(U, 'writer', 'otro texto', []);
  const saldo = saldoDe(base, U);
  const e = await codigo(() => correr(U, f.jobId));
  const j = trabajo(f.jobId);
  check('D1) si el proveedor falla: error a la persona, trabajo `failed`, 0 cobrado y la reserva REFUNDED',
    e !== 'ok' && j.status === 'failed' && j.creditsCharged === 0 && saldoDe(base, U) === saldo && asientos(U).at(-1) === `REFUNDED:${-j.creditsEstimated}`, `${e} · ${j.status} · ${asientos(U).at(-1)}`);
  check('D2) el texto del fallo que lee la persona no nombra al proveedor ni el error técnico', !/boom|deepseek|gemini|mock|seedance|elevenlabs/i.test(j.progressText ?? ''), j.progressText);
  const otra = await codigo(() => correr(U, f.jobId));
  check('D3) reintentar el MISMO trabajo fallido no se admite (se crea uno nuevo): invalid-argument, y no se mueve dinero', otra === 'invalid-argument' && saldoDe(base, U) === saldo);
  conIaReal(async (q) => { await new Promise((res) => setImmediate(res)); return corre.call(ADAPTERS.mock, q); });
  const c = await planear(U, 'writer', 'tercer texto', []);
  const antes = saldoDe(base, U);
  const dos = await Promise.allSettled([correr(U, c.jobId), correr(U, c.jobId)]);
  const buenas = dos.filter((x) => x.status === 'fulfilled');
  const malas = dos.filter((x) => x.status === 'rejected');
  const jc = trabajo(c.jobId);
  check('D4) dos ejecuciones a la vez del mismo trabajo: una corre y la otra es duplicado; se cobra UNA vez',
    buenas.length === 1 && malas.length === 1 && malas[0].reason.code === 'already-exists' && saldoDe(base, U) === antes - jc.creditsCharged && jc.creditsCharged > 0, `${buenas.length}/${malas.length}`);
  sinIaReal();
}

/* ═══ E · cancelar ═══════════════════════════════════════════════════════════ */
titulo('E · Cancelar: no existe en el camino de las experiencias');
{
  const cancelable = 'cancel' in creator || Object.keys(creator).some((k) => /cancel/i.test(k));
  hueco('G-7', 'una persona puede cancelar un trabajo de Weë AI en marcha (creatorRun no tiene operación de cancelar; el estado `cancelled` está declarado y nadie lo escribe)', cancelable);
}

/* ═══ Cierre ═════════════════════════════════════════════════════════════════ */
check('ninguna conexión fuera del proceso en toda la suite', intentosDeRed.length === 0, `intentos=${intentosDeRed.length}`);
net.Socket.prototype.connect = conectarOriginal;
consola.restaurar();
terminar();
