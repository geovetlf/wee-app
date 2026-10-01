/**
 * PRE-F1-D · LA RUTA ASÍNCRONA DE VÍDEO CONTRA FIRESTORE Y STORAGE DE VERDAD.
 *
 * `video-asincrono.test.mjs` recorre la ruta con una base en memoria y con lo
 * de la red de mentira. Aquí lo de Weë es TODO de verdad —la puerta, el
 * adaptador de Seedance, el conductor, el Job Engine, el almacén, el
 * resolutor de Seedance, el materializador, el barrido y el Credit Engine—, y
 * lo único de mentira es MODELARK: un servidor HTTP local que acepta, rechaza,
 * contesta estados y sirve el vídeo como lo haría el de verdad.
 *
 *   ACCEPTED · PROCESSING · SUCCEEDED · FAILED · un plazo largo sin terminar
 *   · un error temporal al preguntar · una descarga que falla · dos
 *   reconciliaciones a la vez · un reinicio · un reintento del cliente
 *   · un POST rechazado · un POST que sale y se queda sin respuesta.
 *
 * Y lo que cerró el PUENTE PRE-F1-D, contra el almacén de verdad: el material
 * que deja el Core es `asset_<32 hex>` como cualquier otro, así que lo leen
 * `leerMaterial`, productions y `deleteAsset` —que borra el objeto del
 * Storage—, y llegar otra vez a él no lo vuelve a descargar.
 *
 * NINGUNA petición sale de esta máquina: la base de ModelArk apunta a
 * 127.0.0.1 y la prueba se niega a correr si no. La clave es de mentira y no
 * se imprime. No está en `npm test`: necesita los emuladores y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee-filmmaker \
 *     "node functions/test/video-asincrono.emulator.mjs"
 */
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROY = process.env.GCLOUD_PROJECT || '';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  console.log('✘ sin los emuladores de Firestore y Storage no se corre'); process.exit(1);
}
if (!PROY.startsWith('demo-')) { console.log('✘ solo contra un proyecto de demostración'); process.exit(1); }

/* ── ModelArk de mentira, en esta máquina ─────────────────────────────────── */
const tareas = new Map(); /* id → { status, error?, videoFalla? } */
const cuenta = { post: 0, get: 0, video: 0, apiConClave: true, videoSinClave: true };
let modoPost = 'aceptar'; /* aceptar · rechazar · colgar: crea la tarea y corta la conexión sin contestar */
let getFalla = false;
let serie = 0;
const BYTES = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(4096, 7)]);
const servidor = http.createServer((req, res) => {
  const enviar = (codigo, cuerpo, tipo = 'application/json') => { res.writeHead(codigo, { 'content-type': tipo }); res.end(tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo); };
  const esVideo = req.url.startsWith('/videos/');
  /* A la API se le habla con la clave; al enlace del vídeo, sin ninguna: la clave no viaja a donde está el resultado. */
  if (!esVideo && req.headers.authorization !== 'Bearer clave-de-prueba-que-no-es-real') cuenta.apiConClave = false;
  if (esVideo && req.headers.authorization !== undefined) cuenta.videoSinClave = false;
  if (req.method === 'POST' && req.url === '/api/v3/contents/generations/tasks') {
    cuenta.post++;
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      if (modoPost === 'rechazar') return enviar(400, { error: { code: 'InvalidParameter', message: 'the parameter is invalid' } });
      const id = `cgt-emu-${String(++serie).padStart(4, '0')}`;
      tareas.set(id, { status: 'queued', version: 0 });
      /* La tarea EXISTE en ModelArk, y la respuesta no llega nunca: la conexión se corta. */
      if (modoPost === 'colgar') return req.socket.destroy();
      return enviar(200, { id });
    });
    return;
  }
  const t = req.url.match(/^\/api\/v3\/contents\/generations\/tasks\/([A-Za-z0-9-]+)$/);
  if (req.method === 'GET' && t) {
    cuenta.get++;
    if (getFalla) return enviar(503, { error: { message: 'service unavailable' } });
    const tarea = tareas.get(t[1]);
    if (!tarea) return enviar(404, { error: { message: 'task not found' } });
    const puerto = servidor.address().port;
    return enviar(200, {
      id: t[1], status: tarea.status, updated_at: Math.floor(Date.now() / 1000) + tarea.version,
      ...(tarea.status === 'succeeded' ? { content: { video_url: `http://127.0.0.1:${puerto}/videos/${t[1]}.mp4` }, usage: { completion_tokens: 40594 } } : {}),
      ...(tarea.error ? { error: tarea.error } : {}),
    });
  }
  const v = req.url.match(/^\/videos\/([A-Za-z0-9-]+)\.mp4$/);
  if (req.method === 'GET' && v) {
    cuenta.video++;
    if (tareas.get(v[1])?.videoFalla) return enviar(503, 'no disponible', 'text/plain');
    return enviar(200, BYTES, 'video/mp4');
  }
  enviar(404, { error: { message: 'no existe' } });
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
process.env.ARK_BASE_URL = `http://127.0.0.1:${servidor.address().port}/api/v3`;
process.env.ARK_API_KEY = 'clave-de-prueba-que-no-es-real';
if (!/^http:\/\/127\.0\.0\.1:\d+\/api\/v3$/.test(process.env.ARK_BASE_URL)) { console.log('✘ ModelArk no apunta a esta máquina'); process.exit(1); }
const pasar = (id, status, extra = {}) => { const t = tareas.get(id); tareas.set(id, { ...t, ...extra, status, version: (t?.version ?? 0) + 1 }); };

/* ── Weë, de verdad ───────────────────────────────────────────────────────── */
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: `${PROY}.appspot.com` });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));
const video = lib('creator/video.js');
const rt = lib('runtime/index.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const contenido = lib('content/index.js');
const { materializadorDeWee } = lib('content/materializador.js');
const producciones = lib('productions/index.js');
const M = lib('filmmaker/modelo.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

const relojReal = Date.now.bind(Date);
let adelanto = 0;
Date.now = () => relojReal() + adelanto;

const marca = relojReal().toString(36);
const cuentaDe = (letra) => `emuvideo${letra}${marca}`;
const CUENTAS = ['B', 'F', 'D', 'E', 'I', 'H', 'A', 'C', 'P'].map(cuentaDe);
const SALDO = 5000;
for (const uid of CUENTAS) {
  await db.collection('users').doc(`doc_${uid}`).set({ uid, displayName: uid });
  await creditEngine.ensureAccount(uid);
  await db.collection('users').doc(`doc_${uid}`).update({ creditsBalance: SALDO });
}
await db.collection('aiSettings').doc('runtime').set({ habilitado: true, capacidades: ['video.generate'], cuentas: CUENTAS, experiencias: ['studio'] });
olvidarLaPuerta();

const PETICION = { prompt: 'Un faro al amanecer, olas suaves', durationSec: 5, aspectRatio: '16:9' };
const pedir = (uid, requestId) => intento(() => video.generateVideo.run({ auth: { uid }, data: { ...PETICION, requestId } }));
const saldo = async (uid) => (await db.collection('users').doc(`doc_${uid}`).get()).get('creditsBalance');
const uso = async (requestId) => (await db.collection('creditTransactions').doc(`usage_${requestId}`).get()).data();
const reembolsos = async (requestId) => (await db.collection('creditTransactions').where('requestId', '==', requestId).get()).docs.filter((d) => d.get('type') === 'refund').map((d) => d.data());
const trabajo = (uid, requestId) => rt.trabajoDelMedioDeWee(db, uid, requestId);
const tareaDe = async (uid, requestId) => (await trabajo(uid, requestId))?.attempts?.[0]?.providerRef?.operationId;
/* El barrido desplegado, con su composición de verdad; solo se le dice que no espere a que un trabajo lleve un minuto quieto. */
const pasada = () => rt.mantenimientoDeWee({
  db,
  reconciliacion: () => rt.reconciliacionDeWee({ db, quietoDesdeMs: 0 })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db })(),
})();
const codigo = (r) => (r.ok ? r.valor.status : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);

console.log('\n── ACCEPTED, PROCESSING, SUCCEEDED ──');
const rB = await pedir(cuentaDe('B'), 'emu-vid-B');
const precio = Math.abs((await uso('emu-vid-B'))?.amount ?? 0);
const tB = await tareaDe(cuentaDe('B'), 'emu-vid-B');
check('ACCEPTED: el adaptador de verdad hizo UN POST a ModelArk y la llamada contesta con su trabajo',
  rB.ok && rB.valor.status === 'ACCEPTED' && typeof rB.valor.jobId === 'string' && cuenta.post === 1 && /^cgt-emu-/.test(tB ?? '') && precio > 0, codigo(rB));
check('con la clave de su sitio, que no es la de nadie', cuenta.apiConClave);
const jB = await trabajo(cuentaDe('B'), 'emu-vid-B');
check('el trabajo, en Firestore, espera con la referencia de ModelArk, un intento y 2 h 15 min de vida',
  jB?.state === 'waiting' && jB.policy.retry.maxAttempts === 1 && jB.policy.maxLifetimeMs === 8_100_000 && jB.attempts[0].providerRef?.providerId === 'seedance');
check('la reserva queda autorizada: ni cobrada ni devuelta', (await uso('emu-vid-B'))?.status === 'AUTHORIZED' && (await saldo(cuentaDe('B'))) === SALDO - precio);
const rJ = await pedir(cuentaDe('B'), 'emu-vid-B');
check('REINTENTO del cliente: DUPLICATE_REQUEST, sin un segundo POST', !rJ.ok && rJ.error.details?.code === 'DUPLICATE_REQUEST' && cuenta.post === 1, codigo(rJ));
pasar(tB, 'running');
await pasada();
check('PROCESSING: ModelArk dice que sigue; el barrido pregunta de verdad y no toca nada',
  cuenta.get >= 1 && (await trabajo(cuentaDe('B'), 'emu-vid-B'))?.state === 'waiting' && (await uso('emu-vid-B'))?.status === 'AUTHORIZED');
pasar(tB, 'succeeded');
await pasada();
const hecho = await trabajo(cuentaDe('B'), 'emu-vid-B');
const assetId = hecho?.result?.outputRefs?.[0];
const ficha = assetId ? (await db.collection('assets').doc(assetId).get()).data() : undefined;
const objeto = ficha?.storageRef?.objectKey ? await admin.storage().bucket().file(ficha.storageRef.objectKey).exists() : [false];
check('SUCCEEDED: el vídeo se trae a Storage, con ficha a nombre de la cuenta, y el trabajo se completa',
  hecho?.state === 'completed' && ficha?.ownerAccountId === cuentaDe('B') && ficha?.kind === 'video' && objeto[0] === true
  && ficha.storageRef.objectKey.startsWith(`users/${cuentaDe('B')}/`), `${hecho?.state} · ${assetId}`);
check('y se cobra lo reservado, una vez', (await uso('emu-vid-B'))?.status === 'COMPLETED' && (await saldo(cuentaDe('B'))) === SALDO - precio && (await reembolsos('emu-vid-B')).length === 0);

console.log('\n── El material del Core es un material más: asset_, leerMaterial, productions, deleteAsset ──');
const leido = await contenido.leerMaterial(assetId);
check('se llama asset_ y 32 hexadecimales, y `leerMaterial` lo encuentra con su dueño', /^asset_[0-9a-f]{32}$/.test(assetId ?? '') && leido?.ownerAccountId === cuentaDe('B') && leido?.status === 'ready', assetId);
const bajadasAntes = cuenta.video;
const otraVez = await materializadorDeWee.guardar({ assetId, userId: cuentaDe('B'), kind: 'video', recurso: `http://127.0.0.1:${servidor.address().port}/videos/${tB}.mp4`, provenance: { createdAt: Date.now(), jobId: hecho.jobId } });
check('llegar otra vez al mismo resultado lo ENCUENTRA: sin volver a descargarlo', otraVez.ok && otraVez.yaEstaba === true && otraVez.assetId === assetId && cuenta.video === bajadasAntes);
const postsDeB = cuenta.post;
const rOtra = await pedir(cuentaDe('B'), 'emu-vid-B');
check('reintentar lo terminado devuelve SU material, sin POST y sin cobrar', rOtra.ok && rOtra.valor.status === 'COMPLETED' && rOtra.valor.assetId === assetId
  && rOtra.valor.url === leido?.delivery?.url && rOtra.valor.credits === 0 && cuenta.post === postsDeB && (await saldo(cuentaDe('B'))) === SALDO - precio, codigo(rOtra));
const conRef = (id) => ({ ...M.produccionVacia({ title: 'Puente', aspectRatio: '16:9' }), references: [{ id: 'ref-video', kind: 'video', role: 'motion', assetId: id }] });
const pid = `prodemu${marca}`.padEnd(24, '0');
const prod = await producciones.crearProduccion({ accountId: cuentaDe('B'), productionId: pid, production: conRef(assetId), at: Date.now() }, { db });
check('productions lo acepta como referencia', prod.ok === true, prod.ok ? 'ok' : prod.code);
const ajeno = await intento(() => contenido.deleteAsset.run({ auth: { uid: cuentaDe('F') }, data: { assetId } }));
check('`deleteAsset` de otra cuenta no lo encuentra, y el objeto sigue', !ajeno.ok && ajeno.error.code === 'not-found' && (await admin.storage().bucket().file(ficha.storageRef.objectKey).exists())[0] === true);
const borrado = await intento(() => contenido.deleteAsset.run({ auth: { uid: cuentaDe('B') }, data: { assetId } }));
const sigue = await admin.storage().bucket().file(ficha.storageRef.objectKey).exists();
check('`deleteAsset` de su dueño lo retira y BORRA el objeto del Storage', borrado.ok && borrado.valor.status === 'deleted' && sigue[0] === false
  && (await contenido.leerMaterial(assetId))?.status === 'deleted', borrado.ok ? borrado.valor.status : borrado.error.code);

console.log('\n── FAILED ──');
await pedir(cuentaDe('F'), 'emu-vid-F');
const tF = await tareaDe(cuentaDe('F'), 'emu-vid-F');
pasar(tF, 'failed', { error: { code: 'InternalServiceError', message: 'the task failed' } });
const postsAntes = cuenta.post;
await pasada();
check('FAILED: el trabajo termina `failed` con un intento, y NO hay un segundo POST', (await trabajo(cuentaDe('F'), 'emu-vid-F'))?.state === 'failed' && cuenta.post === postsAntes);
check('y la reserva vuelve EXACTA', (await uso('emu-vid-F'))?.status === 'REFUNDED' && (await reembolsos('emu-vid-F')).length === 1
  && (await reembolsos('emu-vid-F'))[0].amount === precio && (await saldo(cuentaDe('F'))) === SALDO);
await pasada();
check('y otra pasada no devuelve dos veces', (await reembolsos('emu-vid-F')).length === 1 && (await saldo(cuentaDe('F'))) === SALDO);

console.log('\n── Un plazo largo, un error temporal y una descarga que falla ──');
await pedir(cuentaDe('C'), 'emu-vid-C');
const tC = await tareaDe(cuentaDe('C'), 'emu-vid-C');
pasar(tC, 'running');
adelanto += 40 * 60_000;
await pasada();
adelanto -= 40 * 60_000;
check('cuarenta minutos en marcha —lo que antes vencía el sondeo—: nada se cierra ni se devuelve',
  (await trabajo(cuentaDe('C'), 'emu-vid-C'))?.state === 'waiting' && (await uso('emu-vid-C'))?.status === 'AUTHORIZED' && (await reembolsos('emu-vid-C')).length === 0);
await pedir(cuentaDe('D'), 'emu-vid-D');
const tD = await tareaDe(cuentaDe('D'), 'emu-vid-D');
pasar(tD, 'succeeded');
getFalla = true;
await pasada();
getFalla = false;
check('ModelArk contesta 503 al preguntar: no saber no es fallar, y no se devuelve nada',
  (await trabajo(cuentaDe('D'), 'emu-vid-D'))?.state === 'waiting' && (await uso('emu-vid-D'))?.status === 'AUTHORIZED' && (await reembolsos('emu-vid-D')).length === 0);
await pasada();
check('y cuando vuelve a contestar, se cierra y se cobra', (await trabajo(cuentaDe('D'), 'emu-vid-D'))?.state === 'completed' && (await uso('emu-vid-D'))?.status === 'COMPLETED');
await pedir(cuentaDe('E'), 'emu-vid-E');
const tE = await tareaDe(cuentaDe('E'), 'emu-vid-E');
pasar(tE, 'succeeded', { videoFalla: true });
await pasada();
check('terminó y la descarga falla: se aplaza, sin cerrar y sin devolver',
  (await trabajo(cuentaDe('E'), 'emu-vid-E'))?.state === 'waiting' && (await uso('emu-vid-E'))?.status === 'AUTHORIZED' && (await reembolsos('emu-vid-E')).length === 0);
pasar(tE, 'succeeded', { videoFalla: false });
await pasada();
check('la pasada siguiente la trae y la cobra', (await trabajo(cuentaDe('E'), 'emu-vid-E'))?.state === 'completed' && (await uso('emu-vid-E'))?.status === 'COMPLETED' && (await saldo(cuentaDe('E'))) === SALDO - precio);

console.log('\n── Dos reconciliaciones a la vez, un reinicio, un POST rechazado ──');
await pedir(cuentaDe('I'), 'emu-vid-I');
const tI = await tareaDe(cuentaDe('I'), 'emu-vid-I');
pasar(tI, 'succeeded');
const descargasAntes = cuenta.video;
await Promise.all([pasada(), pasada()]);
const assetsI = (await db.collection('assets').where('ownerAccountId', '==', cuentaDe('I')).get()).size;
check('dos pasadas a la vez: un trabajo completado, un material, UNA liquidación',
  (await trabajo(cuentaDe('I'), 'emu-vid-I'))?.state === 'completed' && (await uso('emu-vid-I'))?.status === 'COMPLETED'
  && (await saldo(cuentaDe('I'))) === SALDO - precio && assetsI === 1, `descargas del mismo vídeo: ${cuenta.video - descargasAntes}`);
await pedir(cuentaDe('H'), 'emu-vid-H');
const tH = await tareaDe(cuentaDe('H'), 'emu-vid-H');
pasar(tH, 'succeeded');
olvidarLaPuerta();
await rt.mantenimientoDeWee({ db, reconciliacion: () => rt.reconciliacionDeWee({ db, quietoDesdeMs: 0 })() })();
check('REINICIO: otra composición, sin nada en memoria, lo continúa y lo cierra desde Firestore',
  (await trabajo(cuentaDe('H'), 'emu-vid-H'))?.state === 'completed' && (await uso('emu-vid-H'))?.status === 'COMPLETED');
modoPost = 'rechazar';
const rA = await pedir(cuentaDe('A'), 'emu-vid-A');
modoPost = 'aceptar';
const jA = await trabajo(cuentaDe('A'), 'emu-vid-A');
check('POST rechazado antes de existir la tarea: falla sin referencia y devuelve la reserva EXACTA',
  !rA.ok && jA?.state === 'failed' && !jA.attempts[0].providerRef && (await uso('emu-vid-A'))?.status === 'REFUNDED' && (await saldo(cuentaDe('A'))) === SALDO, codigo(rA));
await pasada();
check('y el barrido no la devuelve otra vez', (await reembolsos('emu-vid-A')).length === 1 && (await saldo(cuentaDe('A'))) === SALDO);

console.log('\n── Un POST que sale y se queda sin respuesta ──');
const postsAntesP = cuenta.post;
const tareasAntesP = tareas.size;
modoPost = 'colgar';
const rP = await pedir(cuentaDe('P'), 'emu-vid-P');
modoPost = 'aceptar';
const jP = await trabajo(cuentaDe('P'), 'emu-vid-P');
check('ModelArk creó la tarea y la conexión se cortó: UN POST, la tarea existe allí y aquí no hay referencia inventada',
  cuenta.post === postsAntesP + 1 && tareas.size === tareasAntesP + 1 && jP?.state === 'waiting' && jP.attempts[0].outcome === 'unknown' && !jP.attempts[0].providerRef,
  `${codigo(rP)} · ${jP?.state}/${jP?.attempts?.[0]?.outcome}`);
check('la reserva NO se devuelve: puede que ModelArk la esté haciendo', (await uso('emu-vid-P'))?.status === 'AUTHORIZED' && (await reembolsos('emu-vid-P')).length === 0 && (await saldo(cuentaDe('P'))) === SALDO - precio);
const getsAntesP = cuenta.get;
await pasada();
const docP = (await db.collection('jobs').where('jobId', '==', jP?.jobId ?? '-').get()).docs[0]?.data();
check('el barrido lo aparta para reconciliar: ni lo devuelve, ni pregunta sin referencia, ni repite el POST',
  (await uso('emu-vid-P'))?.status === 'AUTHORIZED' && (await reembolsos('emu-vid-P')).length === 0 && docP?.liquidacion === 'hecha' && cuenta.post === postsAntesP + 1 && cuenta.get === getsAntesP);
const rP2 = await pedir(cuentaDe('P'), 'emu-vid-P');
check('y reintentar no vuelve a llamar a ModelArk', !rP2.ok && rP2.error.details?.code === 'DUPLICATE_REQUEST' && cuenta.post === postsAntesP + 1, codigo(rP2));

check('ninguna petición salió de esta máquina: la API con la clave de mentira y el vídeo sin ninguna', cuenta.apiConClave && cuenta.videoSinClave &&/^http:\/\/127\.0\.0\.1:/.test(process.env.ARK_BASE_URL));

servidor.close();
console.log(failures ? `\n✘ ${failures} fallos · ${n} comprobaciones` : `\n✔ la ruta asíncrona contra los emuladores: ${n} comprobaciones`);
process.exit(failures ? 1 : 0);
