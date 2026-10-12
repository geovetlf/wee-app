/**
 * «CREAR» EN WEË DESIGN Y EN WEË HOME DE PUNTA A PUNTA, CONTRA FIRESTORE Y STORAGE DE VERDAD (CL-18, propuesta P10).
 *
 * `aceptacion-recorrido-servidor.test.mjs` recorre `creatorChat → creatorQuote → creatorRun` con una Firestore en MEMORIA.
 * Aquí lo de Weë es todo de verdad —los tres callables compilados, el planificador, el Router del motor, el libro de
 * generaciones, el limitador de cupo, el reclamo del trabajo y el Credit Engine— sobre las transacciones, las consultas y
 * el Storage del emulador, y lo único de mentira es la IA: el proveedor de PRUEBA (`mock`), el único que queda configurado
 * (sin claves y sin red: la prueba se niega a correr si algún `fetch` saliera de esta máquina).
 *
 *   el precio llega antes de cobrar · la reserva AUTHORIZED a medias · se cobra lo mostrado · doble pulsación y tres a la
 *   vez · un reclamo a medias (el reciente es de otra llamada, el viejo de un proceso muerto) · el trabajo de otra cuenta ·
 *   fallo del proveedor → reembolso íntegro · un trabajo que murió «en marcha» · saldo corto · Home sin foto y con foto
 *   (subida al Storage de verdad).
 *
 * Lo que NO mide, y por qué:
 *   · La IA de verdad ni sus precios en cifras (son de prueba y cambian): se prueba que lo cobrado es lo mostrado.
 *   · Que se CREEN MATERIALES. Con `mock` los resultados son `demo` y `materialesDeResultado` sale en `if (run.demo) return []`
 *     (creator/index.ts): ni la ficha en `assets`, ni su procedencia, ni sus derechos se ejercitan. Lo que se anota aquí es
 *     el negativo (cero materiales), para que cambiar esa regla obligue a tocar esta suite.
 *   · La capa HTTP: los callables se invocan en proceso (`creatorRun.run({ auth: { uid }, data })`). No hay token de Auth,
 *     ni emulador de Functions, ni App Check, ni el `timeoutSeconds` real de la función.
 *   · Un proceso que MUERE: «un trabajo que quedó en marcha» se arma escribiendo lo que dejaría —la reserva de verdad y el
 *     trabajo `running` con su plazo vencido—, no matando una función. Y solo se repara si la persona vuelve a pulsar
 *     «Crear»: ninguna tarea programada lee `creatorJobs` (hueco ACE-T-04 de aceptacion-recorrido-servidor).
 *   · Las reglas de seguridad de Firestore y Storage (el servidor escribe con el Admin SDK): las ejercitan `fronteras-rules`,
 *     `fronteras-storage` y `urls-del-storage`.
 *   · Weë Chef y las demás experiencias: solo Design y Home.
 *
 * No está en `npm test`: necesita los emuladores y Java 21. Se repite con `node functions/test/_emuladores.mjs --solo design-recorrido`.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee-design \
 *     "node functions/test/design-recorrido.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  console.log('✘ sin los emuladores de Firestore y Storage no se corre'); process.exit(1);
}

/* ── Sin proveedores y sin red: antes de cargar nada de Weë ────────────── */
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
/* Ni una clave del entorno, ni un cubo, ni un modo de precio heredados del portátil o del runner. */
for (const k of [...lib('secrets.js').PROVIDER_SECRET_NAMES, 'FAL_KEY', 'STORAGE_BUCKET']) delete process.env[k];
process.env.CREATOR_PRICING_MODE = 'simulated';

const salidas = []; /* los hosts a los que algún `fetch` quiso llegar fuera de esta máquina */
const fetchReal = globalThis.fetch.bind(globalThis);
globalThis.fetch = (entrada, opciones) => {
  const url = String(entrada?.url ?? entrada);
  let host = '';
  try { host = new URL(url).hostname; } catch { /* una dirección rara se apunta igual */ }
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
    salidas.push(host || url.slice(0, 60));
    return Promise.reject(new Error(`sin red: esta suite no sale de la máquina (${host || url.slice(0, 60)})`));
  }
  return fetchReal(entrada, opciones);
};

/* ── Weë, de verdad ───────────────────────────────────────────────────── */
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: `${PROY}.appspot.com` });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const creator = lib('creator/index.js');
const { holdCredits } = lib('creator/credits.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { ADAPTERS } = lib('engine/registry.js');
const { ProviderError } = lib('engine/http.js');
const medidas = lib('engine/imageMeta.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };
const codigo = (r) => (r.ok ? (r.valor?.status ?? r.valor?.estado ?? 'ok') : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);
const suma = (xs) => xs.reduce((a, b) => a + b, 0);
/* Con su reloj VIVO (sin `unref`): si lo que se espera no llega, el proceso no se va en silencio —sale con 13— sino que lo dice. */
const esperarA = (promesa, ms, queEs) => {
  let reloj;
  const limite = new Promise((_, no) => { reloj = setTimeout(() => no(new Error(`no llegó: ${queEs}`)), ms); });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
};
/* Un escenario que se rompe a medias no se lleva por delante a los demás: se apunta como fallo y se sigue. */
const escenario = async (titulo, fn) => {
  console.log(`\n── ${titulo} ──`);
  try { await fn(); } catch (error) { check('el escenario no pudo terminar', false, String(error?.stack ?? error).split('\n').slice(0, 3).join(' | ')); }
};

/* El proveedor de prueba, con dos asas: fallar en una capacidad y quedarse parado en ella (para ver el trabajo a medias). */
const CLAVE = ['sk', 'f'.repeat(24)].join('-'); /* una clave de mentira para ver que no se cuela en nada de lo guardado */
const apuntes = [];
const modo = { fallaEn: null, compuerta: null };
const compuerta = (en, jobId) => {
  const c = { en, jobId };
  c.espera = new Promise((ok) => { c.suelta = ok; });
  c.alLlegar = new Promise((ok) => { c.llego = ok; });
  return c;
};
const mockReal = ADAPTERS.mock.run;
ADAPTERS.mock.run = async (req) => {
  apuntes.push({ jobId: req.ctx?.jobId, capability: req.capability, foto: req.input?.imageUrl });
  if (modo.fallaEn === req.capability) throw new ProviderError(`el proveedor respondió 503: overloaded (clave ${CLAVE})`, 'mock', 503, true);
  const c = modo.compuerta;
  if (c && c.en === req.capability && c.jobId === req.ctx?.jobId) { c.llego(); await c.espera; }
  return mockReal.call(ADAPTERS.mock, req);
};
const deJob = (id) => apuntes.filter((a) => a.jobId === id);
/* El tamaño de la foto, leído de verdad del Storage emulado: se apunta lo que contesta el servidor. */
const lecturas = [];
const medirReal = medidas.imageDimensions;
medidas.imageDimensions = async (url) => { const m = await medirReal(url); lecturas.push(m); return m; };

/* ── Las cuentas: cada escenario, la suya ─────────────────────────────── */
const marca = Date.now().toString(36);
const cuentaDe = (letra) => `emudis${letra}${marca}`;
const SALDO = 5000;
for (const letra of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
  const uid = cuentaDe(letra);
  await db.collection('users').doc(`doc_${uid}`).set({ uid, displayName: uid });
  await creditEngine.ensureAccount(uid);
  await db.collection('users').doc(`doc_${uid}`).update({ creditsBalance: SALDO });
}
const HOY = new Date().toISOString().slice(0, 10);

const llamar = (callable, uid, data) => intento(() => callable.run({ auth: { uid }, data }));
const chat = (uid, data) => llamar(creator.creatorChat, uid, { locale: 'es', ...data });
const cotizar = (uid, data) => llamar(creator.creatorQuote, uid, data);
const crear = (uid, data) => llamar(creator.creatorRun, uid, { locale: 'es', ...data });
/** Lo que haría quien contesta lo justo: lo que trae preparado; si no, «No sé»; si no, la primera opción; si no, un texto. */
const conversar = async (uid, inicio, preparadas = {}) => {
  let r = await chat(uid, inicio);
  const preguntas = [];
  for (let vueltas = 0; r.ok && r.valor.status === 'asking' && vueltas < 8; vueltas++) {
    const q = r.valor.question;
    preguntas.push(q);
    const sola = q.options.some((o) => o.id === 'idk') ? { optionId: 'idk' } : q.options.length ? { optionId: q.options[0].id } : { text: 'La Espiga' };
    r = await chat(uid, { jobId: r.valor.jobId, answer: { questionId: q.id, ...(preparadas[q.id] ?? sola) } });
  }
  if (!r.ok) throw new Error(`la conversación se rompió: ${codigo(r)} · ${r.error.message}`);
  return { plan: r.valor, preguntas };
};

const trabajo = async (id) => (await db.collection('creatorJobs').doc(id).get()).data();
const uso = async (id) => (await db.collection('creditTransactions').doc(`usage_${id}`).get()).data();
const delTrabajo = async (id) => (await db.collection('creditTransactions').where('requestId', '==', id).get()).docs.map((d) => d.data());
const reembolsos = async (id) => (await delTrabajo(id)).filter((t) => t.type === 'refund');
const libro = async (id) => (await db.collection('aiGenerations').where('creditTransactionId', '==', `usage_${id}`).get()).docs.map((d) => d.data());
const saldo = async (uid) => (await db.collection('users').doc(`doc_${uid}`).get()).get('creditsBalance');
const ponerSaldo = (uid, creditsBalance) => db.collection('users').doc(`doc_${uid}`).update({ creditsBalance });
const cupo = async (uid) => (await db.collection('aiRateLimits').doc(`${uid}_${HOY}`).get()).data() ?? {};
const materiales = async (uid) => (await db.collection('assets').where('ownerAccountId', '==', uid).get()).size;
const pasos = (plan) => plan.plan.steps.map((s) => s.capability).join('>');

/* Una foto de verdad en el Storage emulado, como la sube la app: en la carpeta de la cuenta, con su testigo de descarga. */
const png = (ancho, alto) => { const b = Buffer.alloc(33); Buffer.from('89504e470d0a1a0a', 'hex').copy(b, 0); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'ascii'); b.writeUInt32BE(ancho, 16); b.writeUInt32BE(alto, 20); b[24] = 8; b[25] = 6; return b; };
const subirFoto = async (uid, nombre, bytes) => {
  const ruta = `users/${uid}/creator-inputs/${nombre}`;
  const token = `tok-${marca}-${nombre.replace(/\W/g, '')}`;
  await bucket.file(ruta).save(bytes, { resumable: false, metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: token } } });
  return `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST.replace(/^https?:\/\//, '')}/v0/b/${bucket.name}/o/${encodeURIComponent(ruta)}?alt=media&token=${token}`;
};

await escenario('Antes de empezar: solo el proveedor de prueba, y ninguna petición sale de esta máquina', async () => {
  const reales = Object.entries(ADAPTERS).filter(([id]) => id !== 'mock');
  check('CONTROL · los adaptadores de proveedores de verdad existen (se les mira) y ninguno está configurado; solo lo está el de prueba',
    reales.length >= 8 && reales.every(([, a]) => !a.isConfigured()) && ADAPTERS.mock.isConfigured(), reales.map(([id]) => id).join(','));
  const quisoSalir = await intento(() => fetch('https://ejemplo.invalid/'));
  check('CONTROL · la guardia de red está armada: un fetch hacia fuera se bloquea y se apunta (después se borra el apunte)', !quisoSalir.ok && salidas.length === 1, salidas.join(','));
  salidas.length = 0;
});

/* ═══ WEË DESIGN · UN LOGO, DE LA PRIMERA FRASE AL DINERO ════════════════ */
await escenario('Weë Design · un logo: el precio antes, la reserva, el cobro, la doble pulsación', async () => {
  const A = cuentaDe('A');
  const { plan, preguntas } = await conversar(A, { experienceId: 'design', goal: 'Un logo para mi cafetería La Espiga, natural' }, { name: { text: 'La Espiga' }, feel: { optionId: 'natural' } });
  const id = plan.jobId;
  check('la conversación llega a un plan: lo dicho no se vuelve a preguntar («un logo» se entiende de la frase) y las preguntas son pocas',
    plan.status === 'planned' && !preguntas.some((q) => q.id === 'what') && preguntas.length <= 3, preguntas.map((q) => q.id).join());
  check('el plan es un concepto y tres logos, con el nombre de la marca a la vista',
    pasos(plan) === 'text.generate>image.generate' && plan.plan.steps[1].input.count === 3 && plan.plan.steps[1].input.kind === 'logo' && /La Espiga/.test(plan.plan.explainToUser), plan.plan.explainToUser);
  const guardado = await trabajo(id);
  check('el PRECIO llega con el plan, ANTES de crear: el total es la suma de sus pasos y es el que el trabajo guarda; es un precio de prueba',
    plan.pricing.total > 0 && plan.pricing.total === suma(plan.pricing.steps.map((s) => s.credits)) && plan.pricing.total === plan.creditsEstimated
    && guardado.creditsEstimated === plan.pricing.total && guardado.pricingMode === 'simulated' && plan.demo === true, `total ${plan.pricing.total}`);
  check('mirar el plan no cuesta nada: ni un Credit, ni una reserva, ni una fila en el libro, ni un hueco del cupo',
    (await saldo(A)) === SALDO && !(await uso(id)) && (await libro(id)).length === 0 && !(await cupo(A)).image);

  const masCara = [...(plan.pricing.options ?? [])].sort((a, b) => b.credits - a.credits)[0];
  const q = await cotizar(A, { jobId: id, quality: masCara?.quality ?? 'high' });
  const precio = q.valor?.creditsEstimated;
  const cotizado = await trabajo(id);
  check('elegir otro nivel reprecia al momento y lo guarda en el trabajo (lo cotizado es lo que se va a cobrar), y tampoco cobra',
    q.ok && precio === q.valor.pricing.total && cotizado.creditsEstimated === precio && cotizado.quality === q.valor.quality && (!masCara || precio === masCara.credits)
    && (await saldo(A)) === SALDO && !(await uso(id)), `nivel ${q.valor?.quality} · total ${precio}`);

  /* «Crear», parado a la mitad: en el paso de la imagen, con el concepto ya hecho. */
  const parada = compuerta('image.generate', id);
  modo.compuerta = parada;
  const primera = crear(A, { jobId: id });
  await esperarA(parada.alLlegar, 30_000, 'el paso de la imagen del logo');
  const aMedias = await trabajo(id);
  const reserva = await uso(id);
  check('A MEDIAS: la reserva ya está AUTHORIZED por el precio cotizado, con la clave del trabajo; el saldo bajó SOLO esa vez; el trabajo está en marcha, con su plazo y su reclamo',
    reserva?.status === 'AUTHORIZED' && reserva.type === 'usage' && reserva.amount === -precio && reserva.requestId === id && reserva.userId === A
    && (await saldo(A)) === SALDO - precio && aMedias.status === 'running' && aMedias.deadlineAt > Date.now() && typeof aMedias.runId === 'string'
    && aMedias.steps.map((s) => s.status).join() === 'done,running', `${reserva?.status} · ${aMedias.status}`);
  const otraPulsacion = await crear(A, { jobId: id });
  const otraCotizacion = await cotizar(A, { jobId: id, quality: 'standard' });
  check('DOBLE PULSACIÓN: otro «Crear» con el trabajo en marcha contesta «ya está en marcha», y cotizar otra vez tampoco cambia el precio: ni segunda reserva ni segundo cobro',
    codigo(otraPulsacion) === 'already-exists · DUPLICATE_REQUEST' && /ya está en marcha/.test(otraPulsacion.error?.message ?? '')
    && codigo(otraCotizacion) === 'already-exists · DUPLICATE_REQUEST' && (await saldo(A)) === SALDO - precio && (await delTrabajo(id)).length === 1
    && (await trabajo(id)).creditsEstimated === precio, [otraPulsacion, otraCotizacion].map(codigo).join(' | '));
  parada.suelta();
  modo.compuerta = null;
  const fin = await primera;

  const hecho = await trabajo(id);
  const cobro = await uso(id);
  check('termina: el concepto y las tres propuestas, y se cobra EXACTAMENTE lo cotizado, una vez (trabajo, asiento y saldo cuentan lo mismo); el proveedor solo trabajó una vez por paso',
    fin.ok && fin.valor.status === 'done' && hecho.status === 'done' && hecho.results.map((r) => r.kind).join() === 'text,image' && hecho.results[1].urls?.length === 3
    && hecho.creditsCharged === precio && cobro.status === 'COMPLETED' && cobro.finalAmount === precio && (await saldo(A)) === SALDO - precio && (await reembolsos(id)).length === 0
    && deJob(id).map((a) => a.capability).join() === 'text.generate,image.generate', codigo(fin));
  const filas = await libro(id);
  check('el libro de generaciones reparte ese MISMO importe entre los pasos: dos filas completadas, ligadas a la reserva y atendidas por el proveedor de prueba',
    filas.length === 2 && filas.every((f) => f.status === 'COMPLETED' && f.provider === 'mock') && suma(filas.map((f) => f.creditsCharged)) === precio, JSON.stringify(filas.map((f) => f.creditsCharged)));
  const dia = await cupo(A);
  check('el cupo del día lo cuenta UNA vez (un texto y una imagen), no una por cada pulsación', dia.text === 1 && dia.image === 1, JSON.stringify({ text: dia.text, image: dia.image }));

  const antes = { saldo: await saldo(A), llamadas: apuntes.length, filas: (await libro(id)).length, asientos: (await delTrabajo(id)).length };
  const otraVez = await crear(A, { jobId: id });
  check('volver a pulsar «Crear» sobre lo hecho contesta «hecho» sin generar ni cobrar otra vez',
    otraVez.ok && otraVez.valor.status === 'done' && (await saldo(A)) === antes.saldo && apuntes.length === antes.llamadas && (await libro(id)).length === antes.filas && (await delTrabajo(id)).length === antes.asientos);
  check('(lo que NO se mide) con el proveedor de prueba no se crea ningún material: ni ficha en `assets` ni `assetIds` en el resultado; los resultados son `demo`',
    (await materiales(A)) === 0 && hecho.results.every((r) => r.demo === true && !r.assetIds));
});

/* ═══ WEË DESIGN · UN AFICHE: OTRA CUENTA Y TRES «CREAR» A LA VEZ ════════ */
await escenario('Weë Design · un afiche: otra cuenta, y tres «Crear» a la vez', async () => {
  const B = cuentaDe('B'); const C = cuentaDe('C');
  const { plan } = await conversar(C, { experienceId: 'design', goal: 'Un afiche para anunciar una promoción en Instagram', presetAnswers: [{ questionId: 'message', optionId: 'promo' }, { questionId: 'where', optionId: 'feed' }] });
  const id = plan.jobId;
  check('un afiche sale de la frase y de lo ya elegido, con su precio antes y sin cobrar nada',
    plan.status === 'planned' && pasos(plan) === 'text.generate>image.generate' && plan.pricing.total === plan.creditsEstimated && (await saldo(C)) === SALDO && !(await uso(id)), `total ${plan.pricing.total}`);

  const antes = JSON.stringify(await trabajo(id));
  const ajeno = await Promise.all([chat(B, { jobId: id, answer: { questionId: 'message', text: 'robado' } }), cotizar(B, { jobId: id, quality: 'max' }), crear(B, { jobId: id })]);
  check('OTRA CUENTA: no puede conversar, cotizar ni crear el trabajo de C (y al cotizar ni siquiera se confirma que exista)',
    ajeno.every((r) => !r.ok && ['UNAUTHORIZED', 'INVALID_REQUEST'].includes(r.error.details?.code)) && ajeno[1].error.details.code === 'INVALID_REQUEST', ajeno.map(codigo).join(' | '));
  check('…y no cambia nada: ni el trabajo (sin reclamo), ni el saldo de ninguna de las dos, ni una reserva, ni una llamada al proveedor',
    JSON.stringify(await trabajo(id)) === antes && (await saldo(C)) === SALDO && (await saldo(B)) === SALDO && !(await uso(id)) && deJob(id).length === 0);

  const tres = await Promise.all([crear(C, { jobId: id }), crear(C, { jobId: id }), crear(C, { jobId: id })]);
  check('TRES «Crear» A LA VEZ (transacciones de verdad): al menos uno lo hace y el resto contesta «ya está en marcha» (o lo encuentra hecho), nunca un fallo técnico; y el trabajo de C estaba intacto',
    tres.some((r) => r.ok && r.valor.status === 'done') && tres.filter((r) => !r.ok).every((r) => codigo(r) === 'already-exists · DUPLICATE_REQUEST'), tres.map(codigo).join(' | '));
  const hecho = await trabajo(id);
  const dia = await cupo(C);
  check('y se ejecutó UNA vez y se cobró UNA vez: dos llamadas al proveedor (no seis), una transacción de uso COMPLETADA, un solo descuento, un solo hueco del cupo',
    hecho.status === 'done' && deJob(id).length === 2 && (await delTrabajo(id)).length === 1 && (await uso(id)).status === 'COMPLETED' && (await saldo(C)) === SALDO - plan.creditsEstimated
    && hecho.creditsCharged === plan.creditsEstimated && dia.text === 1 && dia.image === 1, `${deJob(id).length} llamadas · saldo ${await saldo(C)}`);
});

/* ═══ UN TRABAJO RECLAMADO A MEDIAS ══════════════════════════════════════ */
await escenario('Un trabajo reclamado a medias: el reclamo reciente es de otra llamada; el viejo, de un proceso muerto', async () => {
  const G = cuentaDe('G');
  const { plan } = await conversar(G, { experienceId: 'design', goal: 'Un afiche para anunciar una promoción en Instagram', presetAnswers: [{ questionId: 'message', optionId: 'promo' }, { questionId: 'where', optionId: 'feed' }] });
  const id = plan.jobId;
  /* Lo que ve una segunda llamada mientras la primera ya reclamó el trabajo y todavía está reservando (aún no está «en marcha»). */
  await db.collection('creatorJobs').doc(id).update({ runId: 'otra-llamada', claimedAt: Date.now() - 5_000 });
  const reciente = await crear(G, { jobId: id });
  const j = await trabajo(id);
  check('un reclamo de hace segundos es de otra llamada que está reservando: «ya está en marcha», sin tocar el cupo, el dinero ni al proveedor, y el reclamo ajeno queda como estaba',
    codigo(reciente) === 'already-exists · DUPLICATE_REQUEST' && j.runId === 'otra-llamada' && j.status === 'planned' && !(await uso(id)) && !(await cupo(G)).image
    && (await saldo(G)) === SALDO && deJob(id).length === 0, codigo(reciente));
  await db.collection('creatorJobs').doc(id).update({ runId: 'proceso-muerto', claimedAt: Date.now() - 120_000 });
  const viejo = await crear(G, { jobId: id });
  const hecho = await trabajo(id);
  check('CONTROL · uno de hace dos minutos, que nunca pasó a «en marcha», es de un proceso muerto: se retoma, se crea y se cobra UNA vez, con otro reclamo',
    viejo.ok && viejo.valor.status === 'done' && hecho.status === 'done' && hecho.runId !== 'proceso-muerto' && (await uso(id))?.status === 'COMPLETED'
    && (await saldo(G)) === SALDO - plan.creditsEstimated && deJob(id).length === 2, codigo(viejo));
});

/* ═══ WEË HOME · EL ESPACIO DE LA PERSONA NECESITA SU FOTO ═══════════════ */
await escenario('Weë Home · sin foto no hay trabajo; con su foto del Storage, sí', async () => {
  const H = cuentaDe('H'); const B = cuentaDe('B');
  const { plan } = await conversar(H, { experienceId: 'home', goal: 'Quiero renovar mi sala con un estilo moderno' });
  const id = plan.jobId;
  check('el plan es mirar la foto, rediseñar el espacio en dos propuestas y armar la lista de compras, con su precio antes, sin foto todavía y sin cobrar',
    plan.status === 'planned' && pasos(plan) === 'vision.describe>image.space_restyle>text.generate' && plan.plan.steps[1].input.count === 2 && plan.pricing.total === plan.creditsEstimated
    && !plan.inputImageUrl && (await saldo(H)) === SALDO && !(await uso(id)), `total ${plan.pricing.total}`);

  const sinFoto = await crear(H, { jobId: id });
  const intacto = await trabajo(id);
  check('CREAR SIN FOTO se rechaza con su motivo («sube una foto») y NO reserva nada: el trabajo sigue planificado y sin reclamo, sin libro, sin saldo tocado, sin una llamada al proveedor',
    codigo(sinFoto) === 'invalid-argument · INVALID_REQUEST · needs_image' && /foto/i.test(sinFoto.error?.message ?? '') && intacto.status === 'planned' && !intacto.runId
    && !(await uso(id)) && (await libro(id)).length === 0 && (await saldo(H)) === SALDO && deJob(id).length === 0, codigo(sinFoto));

  const deOtra = await subirFoto(B, 'ajena.png', png(640, 480));
  const ajena = await chat(H, { jobId: id, imageUrl: deOtra });
  const otroCubo = await chat(H, { jobId: id, imageUrl: `gs://otro-cubo/users/${H}/creator-inputs/sala.png` });
  check('una foto de OTRA cuenta (que sí existe en el Storage) o de OTRO cubo no se acepta —«bad_image_url»— y el trabajo sigue sin foto',
    codigo(ajena) === 'invalid-argument · INVALID_REQUEST · bad_image_url' && codigo(otroCubo) === 'invalid-argument · INVALID_REQUEST · bad_image_url' && !(await trabajo(id)).inputImageUrl,
    [ajena, otroCubo].map(codigo).join(' | '));

  const suya = await subirFoto(H, 'sala.png', png(640, 480));
  const conFoto = await chat(H, { jobId: id, imageUrl: suya });
  check('con SU foto: el plan y el precio se conservan, el trabajo guarda la dirección, y el servidor LEE la foto del Storage para medirla (640 × 480, del propio archivo)',
    conFoto.ok && conFoto.valor.status === 'planned' && conFoto.valor.inputImageUrl === suya && conFoto.valor.pricing.total === plan.pricing.total && (await trabajo(id)).inputImageUrl === suya
    && lecturas.length >= 1 && lecturas.every((m) => m?.width === 640 && m.height === 480 && m.source === 'file'), JSON.stringify(lecturas[0]));

  const hecho = await crear(H, { jobId: id });
  const j = await trabajo(id);
  const conLaFoto = deJob(id).filter((a) => a.capability === 'vision.describe' || a.capability === 'image.space_restyle');
  check('crear: el trabajo se hace —la descripción, dos imágenes y la lista— y los pasos que trabajan sobre el espacio reciben SU foto',
    hecho.ok && hecho.valor.status === 'done' && j.status === 'done' && j.results.map((r) => r.kind).join() === 'text,image,text' && j.results[1].urls?.length === 2
    && conLaFoto.length === 2 && conLaFoto.every((a) => a.foto === suya), codigo(hecho));
  const cobro = await uso(id);
  const filas = await libro(id);
  check('se cobra lo mostrado, una vez: asiento COMPLETADO por el precio, saldo coherente, y el libro reparte ese importe entre sus tres pasos',
    cobro?.status === 'COMPLETED' && cobro.finalAmount === plan.pricing.total && j.creditsCharged === plan.pricing.total && (await saldo(H)) === SALDO - plan.pricing.total
    && filas.length === 3 && suma(filas.map((f) => f.creditsCharged)) === plan.pricing.total, `precio ${plan.pricing.total}`);
  check('(lo que NO se mide) tampoco aquí se crea material con el proveedor de prueba', (await materiales(H)) === 0 && j.results.every((r) => !r.assetIds));
});

/* ═══ CUANDO NO ALCANZAN LOS CREDITS ═════════════════════════════════════ */
await escenario('Cuando no alcanzan los Credits: nada se mueve, y con Credits el MISMO trabajo sigue', async () => {
  const F = cuentaDe('F');
  const { plan } = await conversar(F, { experienceId: 'design', goal: 'Un afiche para anunciar una promoción en Instagram', presetAnswers: [{ questionId: 'message', optionId: 'promo' }, { questionId: 'where', optionId: 'feed' }] });
  const id = plan.jobId; const precio = plan.creditsEstimated;
  await ponerSaldo(F, precio - 1);
  const corto = await crear(F, { jobId: id });
  const j = await trabajo(id);
  check('saldo corto: el error dice cuánto hace falta y cuánto hay; el trabajo sigue planificado y SIN reclamo (la vista de progreso no parpadea), sin reserva, sin libro y sin llamada al proveedor',
    codigo(corto) === 'failed-precondition · INSUFFICIENT_CREDITS' && corto.error.details.required === precio && corto.error.details.available === precio - 1
    && j.status === 'planned' && j.runId === null && j.steps.every((s) => s.status === 'pending') && !(await uso(id)) && (await libro(id)).length === 0 && deJob(id).length === 0 && (await saldo(F)) === precio - 1, codigo(corto));
  const cupoTrasElRechazo = await cupo(F);
  await ponerSaldo(F, precio + 10);
  const luego = await crear(F, { jobId: id });
  check('con Credits, el MISMO trabajo se crea sin volver a empezar y se cobra su precio', luego.ok && luego.valor.status === 'done' && (await saldo(F)) === 10 && (await uso(id))?.status === 'COMPLETED', codigo(luego));
  const cupoTrasCrearlo = await cupo(F);
  console.log(`   · observación (no es una comprobación): el cupo del día de F cuenta ${JSON.stringify({ text: cupoTrasElRechazo.text, image: cupoTrasElRechazo.image })} tras el «Crear» rechazado por saldo corto, y ${JSON.stringify({ text: cupoTrasCrearlo.text, image: cupoTrasCrearlo.image })} tras crear de verdad ese mismo trabajo`);
});

/* ═══ CUANDO EL PROVEEDOR FALLA ══════════════════════════════════════════ */
await escenario('Cuando el proveedor falla: «no te cobré», y el dinero vuelve exacto', async () => {
  const D = cuentaDe('D');
  const { plan } = await conversar(D, { experienceId: 'design', goal: 'Una casa moderna' });
  const id = plan.jobId; const precio = plan.creditsEstimated;
  modo.fallaEn = 'image.generate';
  const fallo = await crear(D, { jobId: id });
  modo.fallaEn = null;
  const todoLoDicho = `${fallo.error?.message} ${JSON.stringify(fallo.error?.details ?? {})}`;
  check('el fallo llega a la persona como un error CONTROLADO y reintentable que dice «No te cobré», sin proveedor, sin la clave ni el texto interno que dijo el proveedor',
    !fallo.ok && fallo.error.details?.code === 'PROVIDER_ERROR' && fallo.error.details.retryable === true && /No te cobré/.test(fallo.error.message)
    && !/gemini|flux|seedance|seedream|openai|claude|deepseek|elevenlabs|minimax|\bmock\b/i.test(todoLoDicho) && !todoLoDicho.includes(CLAVE) && !/overloaded|503/.test(todoLoDicho), fallo.error?.message);
  check('CONTROL · el fallo lo puso el doble y no un accidente: el texto corrió antes y la imagen llegó al proveedor de prueba, donde falló',
    deJob(id)[0]?.capability === 'text.generate' && deJob(id).some((a) => a.capability === 'image.generate'), deJob(id).map((a) => a.capability).join());
  const j = await trabajo(id);
  check('el trabajo queda «fallido», con una frase amable y SIN cobro, con el primer paso hecho y el que falló marcado',
    j.status === 'failed' && j.creditsCharged === 0 && /No te cobré/.test(j.progressText) && j.steps.map((s) => s.status).join() === 'done,failed', `${j.status} · ${j.steps.map((s) => s.status)}`);
  const devueltos = await reembolsos(id);
  check('la reserva se reembolsa ÍNTEGRA y una sola vez: REFUNDED, un reembolso por lo reservado, ligado a ella, y el saldo es el de antes',
    (await uso(id))?.status === 'REFUNDED' && devueltos.length === 1 && devueltos[0].amount === precio && devueltos[0].refundOf === `usage_${id}` && (await saldo(D)) === SALDO, `${precio} Credits`);
  const filas = await libro(id);
  const guardado = JSON.stringify([j, filas, await delTrabajo(id)]);
  check('en el libro, el paso que falló está FAILED y nada queda cobrado; y la clave de mentira no está en NADA de lo guardado (trabajo, libro, asientos)',
    filas.some((f) => f.status === 'FAILED') && suma(filas.map((f) => f.creditsCharged || 0)) === 0 && !guardado.includes(CLAVE), JSON.stringify(filas.map((f) => f.status)));
  const otraVez = await crear(D, { jobId: id });
  const reutilizada = await intento(() => holdCredits(D, id, j.plan, precio, 'WEË AI · Weë Design'));
  check('pulsar «Crear» sobre el trabajo fallido se rechaza sin mover dinero; y la reserva devuelta no se reutiliza (ALREADY_REFUNDED): no se genera gratis con una operación ya devuelta',
    !otraVez.ok && (await saldo(D)) === SALDO && (await reembolsos(id)).length === 1 && !reutilizada.ok && reutilizada.error.details?.code === 'ALREADY_REFUNDED',
    `${[otraVez, reutilizada].map(codigo).join(' | ')} · «${otraVez.error?.message}»`);
  const cupoTrasElFallo = await cupo(D);

  /* Reintentar es empezar OTRO trabajo con la misma frase. */
  const { plan: otro } = await conversar(D, { experienceId: 'design', goal: 'Una casa moderna' });
  const hecho = await crear(D, { jobId: otro.jobId });
  check('reintentar funciona: es otro trabajo, que cobra UNA vez su precio, sin tocar el reembolso del anterior',
    hecho.ok && hecho.valor.status === 'done' && otro.jobId !== id && (await saldo(D)) === SALDO - otro.creditsEstimated && (await reembolsos(id)).length === 1 && (await reembolsos(otro.jobId)).length === 0, codigo(hecho));
  const cupoTrasElReintento = await cupo(D);
  console.log(`   · observación (no es una comprobación): el cupo del día de D cuenta ${JSON.stringify({ text: cupoTrasElFallo.text, image: cupoTrasElFallo.image })} tras el trabajo fallido y reembolsado, y ${JSON.stringify({ text: cupoTrasElReintento.text, image: cupoTrasElReintento.image })} tras el reintento`);
});

/* ═══ UN TRABAJO QUE MURIÓ «EN MARCHA» ═══════════════════════════════════ */
await escenario('Un trabajo que murió «en marcha»: se cierra y devuelve lo retenido, sin cobrar dos veces', async () => {
  const E = cuentaDe('E');
  const nuevo = async () => {
    const { plan } = await conversar(E, { experienceId: 'design', goal: 'Un logo para mi cafetería La Espiga' }, { name: { text: 'La Espiga' } });
    return { id: plan.jobId, precio: plan.creditsEstimated, plan: (await trabajo(plan.jobId)).plan };
  };
  /* Lo que deja un proceso que muere después de reservar y de arrancar: la reserva de verdad y el trabajo `running`. */
  const dejarEnMarcha = async (t, estado) => {
    const reserva = await holdCredits(E, t.id, t.plan, t.precio, 'WEË AI · Weë Design');
    await db.collection('creatorJobs').doc(t.id).update({ status: 'running', runId: 'proceso-muerto', claimedAt: Date.now() - 120_000, progressText: 'Empezando…', ...estado });
    return reserva;
  };
  const muerto = await nuevo();
  const reserva = await dejarEnMarcha(muerto, { deadlineAt: Date.now() - 60_000 });
  const otraReserva = await holdCredits(E, muerto.id, muerto.plan, muerto.precio, 'WEË AI · Weë Design');
  check('(preparación) la reserva existe, y reservar LA MISMA otra vez no cobra otra vez: idempotencia del Credit Engine, con el Firestore de verdad',
    reserva.duplicate === false && reserva.status === 'AUTHORIZED' && otraReserva.duplicate === true && otraReserva.status === 'AUTHORIZED' && otraReserva.amount === muerto.precio
    && (await saldo(E)) === SALDO - muerto.precio && (await delTrabajo(muerto.id)).length === 1);

  const r = await crear(E, { jobId: muerto.id });
  const j = await trabajo(muerto.id);
  const devueltos = await reembolsos(muerto.id);
  check('«Crear» sobre un trabajo en marcha con el plazo vencido NO lo toma por duplicado: lo cierra y le dice a la persona que se quedó sin tiempo y que le devolvió los Credits',
    !r.ok && r.error.details?.code === 'TIMEOUT' && /te devolví los Credits/.test(r.error.message) && /intentarlo/.test(r.error.message), codigo(r));
  check('el trabajo queda fallido y sin cobro, diciendo por qué; la reserva, REFUNDED con UN reembolso por lo retenido; el saldo es el de antes; nadie llamó a ningún proveedor',
    j.status === 'failed' && j.creditsCharged === 0 && /sin tiempo/i.test(j.progressText) && (await uso(muerto.id))?.status === 'REFUNDED'
    && devueltos.length === 1 && devueltos[0].amount === muerto.precio && (await saldo(E)) === SALDO && deJob(muerto.id).length === 0, `${j.status} · ${j.progressText}`);
  const otraVez = await crear(E, { jobId: muerto.id });
  check('y pulsar otra vez no devuelve nada más: sin segundo reembolso y el mismo saldo', !otraVez.ok && (await reembolsos(muerto.id)).length === 1 && (await saldo(E)) === SALDO);

  /* CONTROLES: lo que se parece a un trabajo muerto y NO lo es no se toca. */
  const vivo = await nuevo();
  await dejarEnMarcha(vivo, { deadlineAt: Date.now() + 600_000 });
  const sinPlazo = await nuevo();
  await dejarEnMarcha(sinPlazo, {});
  const saldoAntes = await saldo(E);
  const [enPlazo, anterior] = [await crear(E, { jobId: vivo.id }), await crear(E, { jobId: sinPlazo.id })];
  check('CONTROL · uno en marcha DENTRO de su plazo es un duplicado, y uno anterior a esta corrección, sin plazo guardado, no se reembolsa por sorpresa: las dos reservas siguen retenidas',
    [enPlazo, anterior].every((x) => codigo(x) === 'already-exists · DUPLICATE_REQUEST') && (await uso(vivo.id)).status === 'AUTHORIZED' && (await uso(sinPlazo.id)).status === 'AUTHORIZED'
    && (await saldo(E)) === saldoAntes && (await reembolsos(vivo.id)).length === 0 && (await reembolsos(sinPlazo.id)).length === 0 && (await trabajo(vivo.id)).status === 'running', [enPlazo, anterior].map(codigo).join(' | '));
});

/* ═══ Y NADA DE ESTO SALIÓ DE ESTA MÁQUINA ═══════════════════════════════ */
await escenario('Y nada de esto salió de esta máquina', async () => {
  const todo = (await db.collection('aiGenerations').get()).docs.map((d) => d.data());
  check('todo lo que el libro apunta lo atendió el proveedor de prueba, con coste cero para el proveedor', todo.length >= 12 && todo.every((f) => f.provider === 'mock' && f.providerCost === 0), `${todo.length} filas`);
  check('ninguna petición HTTP intentó salir de esta máquina', salidas.length === 0 && /^demo-/.test(PROY), salidas.join(',') || PROY);
});

console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ Weë Design y Weë Home contra los emuladores: ${n}/${n}`);
process.exit(failures ? 1 : 0);
