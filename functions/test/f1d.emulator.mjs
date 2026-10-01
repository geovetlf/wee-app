/**
 * F1-D · LA TOMA DE UN PLANO CONTRA FIRESTORE Y STORAGE DE VERDAD.
 *
 * `f1d-generacion.test.mjs` recorre la toma con una base en memoria y el
 * adaptador de Seedance doblado. Aquí lo de Weë es TODO de verdad —productions,
 * F1-A, la puerta del vídeo, el adaptador de Seedance con su cuerpo real, el
 * conductor, el Job Engine, el barrido, el materializador, el Content Core,
 * `shots` y el Credit Engine— y lo único de mentira es MODELARK: un servidor HTTP
 * local que acepta, contesta estados y sirve el vídeo.
 *
 *   cotizar · dos pestañas a la vez (cupo y reserva con transacciones de verdad)
 *   · el cuerpo que de verdad sale hacia ModelArk (texto compuesto, 1080p sin
 *   rebajar, sonido, plazo de plazos.ts) · SUCCEEDED → material marcado en
 *   Storage · el enlace verificado por la callable `shots` · un vídeo en Storage
 *   sin ficha, adoptado sin volver a descargarlo, y uno con la marca de otro,
 *   no · `expired` → reembolso exacto, una vez.
 *
 * NINGUNA petición sale de esta máquina: la base de ModelArk apunta a 127.0.0.1
 * y la prueba se niega a correr si no. La clave es de mentira y no se imprime.
 * No está en `npm test`: necesita los emuladores y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee-filmmaker \
 *     "node functions/test/f1d.emulator.mjs"
 */
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROY = process.env.GCLOUD_PROJECT || '';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST || !PROY.startsWith('demo-')) {
  console.log('✘ solo contra los emuladores de Firestore y Storage, y en un proyecto demo-');
  process.exit(1);
}

/* ── ModelArk, de mentira y en esta máquina ─────────────────────────────── */
const tareas = new Map();
const cuerpos = [];
const cuenta = { post: 0, video: 0 };
let serie = 0;
const BYTES = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(4096, 5)]);
const servidor = http.createServer((req, res) => {
  const enviar = (codigo, cuerpo, tipo = 'application/json') => { res.writeHead(codigo, { 'content-type': tipo }); res.end(tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo); };
  if (req.method === 'POST' && req.url === '/api/v3/contents/generations/tasks') {
    cuenta.post++;
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      cuerpos.push(JSON.parse(cuerpo));
      const id = `cgt-f1d-${String(++serie).padStart(4, '0')}`;
      tareas.set(id, { status: 'queued', version: 0 });
      enviar(200, { id });
    });
    return;
  }
  const t = req.url.match(/^\/api\/v3\/contents\/generations\/tasks\/([A-Za-z0-9-]+)$/);
  if (req.method === 'GET' && t) {
    const tarea = tareas.get(t[1]);
    if (!tarea) return enviar(404, { error: { message: 'task not found' } });
    const puerto = servidor.address().port;
    return enviar(200, {
      id: t[1], status: tarea.status, updated_at: Math.floor(Date.now() / 1000) + tarea.version,
      ...(tarea.status === 'succeeded' ? { content: { video_url: `http://127.0.0.1:${puerto}/videos/${t[1]}.mp4` } } : {}),
      ...(tarea.status === 'expired' ? { error: { code: 'TaskExpired', message: 'the task expired' } } : {}),
    });
  }
  const v = req.url.match(/^\/videos\/([A-Za-z0-9-]+)\.mp4$/);
  if (req.method === 'GET' && v) { cuenta.video++; return enviar(200, BYTES, 'video/mp4'); }
  enviar(404, { error: { message: 'no existe' } });
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
process.env.ARK_BASE_URL = `http://127.0.0.1:${servidor.address().port}/api/v3`;
process.env.ARK_API_KEY = 'clave-de-prueba-que-no-es-real';
if (!/^http:\/\/127\.0\.0\.1:\d+\/api\/v3$/.test(process.env.ARK_BASE_URL)) { console.log('✘ ModelArk no apunta a esta máquina'); process.exit(1); }
const pasar = (id, status) => { const t = tareas.get(id); tareas.set(id, { ...t, status, version: (t?.version ?? 0) + 1 }); };

/* ── Weë, de verdad ──────────────────────────────────────────────────────── */
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: `${PROY}.appspot.com` });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));
const video = lib('creator/video.js');
const toma = lib('creator/toma.js');
const rt = lib('runtime/index.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const contenido = lib('content/index.js');
const { materializadorDeWee, MARCA_DE_MATERIAL } = lib('content/materializador.js');
const { identidadDelMaterial } = lib('runtime/materializacion.js');
const producciones = lib('productions/index.js');
const shotsPuerta = lib('shots/puerta.js');
const M = lib('filmmaker/modelo.js');
const Rq = lib('filmmaker/requisitos.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };
const codigo = (r) => (r.ok ? r.valor?.status ?? 'ok' : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);

const marca = Date.now().toString(36);
const A = `emuf1dA${marca}`;
const SALDO = 5000;
await db.collection('users').doc(`doc_${A}`).set({ uid: A, displayName: A });
await creditEngine.ensureAccount(A);
await db.collection('users').doc(`doc_${A}`).update({ creditsBalance: SALDO });
await db.collection('aiSettings').doc('runtime').set({ habilitado: true, capacidades: ['video.generate'], cuentas: [A], experiencias: ['studio'] });
olvidarLaPuerta();

const saldo = async () => (await db.collection('users').doc(`doc_${A}`).get()).get('creditsBalance');
const uso = async (rid) => (await db.collection('creditTransactions').doc(`usage_${rid}`).get()).data();
const reembolsos = async (rid) => (await db.collection('creditTransactions').where('requestId', '==', rid).get()).docs.filter((d) => d.get('type') === 'refund').map((d) => d.data());
const pasada = () => rt.mantenimientoDeWee({
  db,
  reconciliacion: () => rt.reconciliacionDeWee({ db, quietoDesdeMs: 0 })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db })(),
})();

const clon = (x) => JSON.parse(JSON.stringify(x));
const faro = () => clon({
  ...M.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '1080p' }),
  intent: { objective: 'Un faro al amanecer' },
  creativeDirection: { visualStyle: 'cinematográfico', cinematography: { version: 1, lighting: { type: 'golden_hour' }, shot: { type: 'wide' } } },
  characters: [{ id: 'char-mar', name: 'Marina', identityDescription: 'farera de sesenta años' }],
  scenes: [{ id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', characterIds: ['char-mar'], shots: [
    { id: 'sh-0101', order: 0, durationSec: 5, description: 'Marina sube la escalera del faro', audio: { withSound: true } },
  ] }],
});
const pid = (k) => `prodemuf1d${k}${marca}`.padEnd(24, '0').slice(0, 40);
const crear = async (k) => {
  const r = await producciones.crearProduccion({ accountId: A, productionId: pid(k), production: faro(), at: Date.now() }, { db });
  if (!r.ok) throw new Error(`no se creó la producción: ${r.code}`);
  return r.view;
};
const plan = async (k, extra = {}) => {
  const v = (await producciones.leerProduccion(A, pid(k), { db })).view;
  const req = Rq.requisitosDeProduccion(v.production).requirements.shots.find((s) => s.unitId === 'sh-0101');
  return { productionId: pid(k), sceneId: 'sc-0001', unitId: 'sh-0101', revision: v.revision, quality: 'high', requirement: req, ...extra };
};
const llamar = (data) => intento(() => video.generateVideo.run({ auth: { uid: A }, data }));

/* ═══ 1 · COTIZAR Y GENERAR, CON TRANSACCIONES DE VERDAD ══════════════════ */
console.log('\n── Cotizar y generar: dos pestañas a la vez, un POST, un cupo, una reserva ──');
await crear(1);
const pl = await plan(1);
const sinCalidad = await llamar({ plano: { ...pl, quality: undefined }, cotizar: true });
check('consultar sin calidad: quality_required, con las tomas del plano, y nada reservado',
  sinCalidad.ok && sinCalidad.valor.reason === 'quality_required' && sinCalidad.valor.takes?.next?.take === 1 && cuenta.post === 0, codigo(sinCalidad));
const q = await llamar({ plano: pl, cotizar: true });
check('cotizar con «alta»: el precio y lo que se genera —5 s, 16:9, 1080p, con sonido—', q.ok && q.valor.allowed && q.valor.credits > 0
  && q.valor.effective.durationSec === 5 && q.valor.effective.resolution === '1080p' && q.valor.effective.withSound === true, JSON.stringify(q.valor?.effective));
const rid = toma.requestIdDeToma(A, pid(1), 'sh-0101', 1);
const dos = await Promise.all([llamar({ plano: { ...pl, take: 1 }, creditosCotizados: q.valor.credits }), llamar({ plano: { ...pl, take: 1 }, creditosCotizados: q.valor.credits })]);
const cupo = (await db.collection('aiRateLimits').where('userId', '==', A).get()).docs.map((d) => d.data());
check('dos pestañas a la vez: una ACCEPTED y otra duplicado, UN POST, UNA reserva', dos.filter((r) => r.ok && r.valor.status === 'ACCEPTED').length === 1
  && dos.some((r) => !r.ok && r.error.details?.code === 'DUPLICATE_REQUEST') && cuenta.post === 1 && (await uso(rid))?.status === 'AUTHORIZED'
  && (await saldo()) === SALDO - q.valor.credits, dos.map(codigo).join(' / '));
check('y el cupo, con la transacción de verdad, la cuenta UNA vez', cupo.length === 1 && cupo[0].video === 1 && Object.keys(cupo[0].operaciones ?? {}).length === 1, JSON.stringify(cupo.map((c) => c.video)));
const cuerpo = cuerpos[0];
check('lo que sale hacia ModelArk: el texto compuesto en el servidor, 5 s, 16:9 y 1080p sin rebajar, con sonido',
  /Marina sube la escalera del faro/.test(cuerpo?.content?.[0]?.text ?? '') && cuerpo.duration === 5 && cuerpo.ratio === '16:9' && cuerpo.resolution === '1080p' && cuerpo.generate_audio === true,
  JSON.stringify({ duration: cuerpo?.duration, ratio: cuerpo?.ratio, resolution: cuerpo?.resolution, audio: cuerpo?.generate_audio }));
check('y el plazo de plazos.ts, en segundos: la tarea no vive en ModelArk más que el trabajo aquí', cuerpo?.execution_expires_after === 7200 && cuerpo.execution_expires_after * 1000 <= rt.PLAZOS_DE_VIDEO.vidaDelTrabajoMs);

/* ═══ 2 · TERMINA: MATERIAL MARCADO Y ENLACE VERIFICADO ══════════════════ */
console.log('\n── SUCCEEDED: el material, marcado en Storage, y el plano del Core, por `shots` ──');
const job = await rt.trabajoDelMedioDeWee(db, A, rid);
pasar(job.attempts[0].providerRef.operationId, 'succeeded');
await pasada();
const hecho = await rt.trabajoDelMedioDeWee(db, A, rid);
const assetId = hecho?.result?.outputRefs?.[0];
const ficha = assetId ? (await db.collection('assets').doc(assetId).get()).data() : undefined;
const [meta] = ficha?.storageRef?.objectKey ? await admin.storage().bucket().file(ficha.storageRef.objectKey).getMetadata() : [{}];
check('el vídeo, en Storage con su ficha asset_ a nombre de la cuenta, y cobrado una vez', /^asset_[0-9a-f]{32}$/.test(assetId ?? '') && ficha?.ownerAccountId === A && ficha?.status === 'ready'
  && (await uso(rid))?.status === 'COMPLETED' && (await reembolsos(rid)).length === 0, assetId);
check('el objeto lleva la marca de SU material en los metadatos de Storage', meta?.metadata?.[MARCA_DE_MATERIAL] === assetId, JSON.stringify(meta?.metadata ?? {}).slice(0, 120));
const enlace = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.result', productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 } }));
const nodoId = toma.idDeNodoDePlano(A, pid(1), 'sh-0101');
const nodo = (await db.collection('shots').doc(nodoId).get()).data();
check('`shot.result` por la callable: el plano del Core, generado, con SU vídeo, en su producción',
  enlace.ok && enlace.valor.result.status === 'linked' && nodo?.producedAssetId === assetId && nodo?.state === 'generated' && nodo?.ownerAccountId === A && nodo?.projectId === pid(1),
  JSON.stringify(enlace.valor?.result ?? enlace.error?.message));
const otraVez = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.result', productionId: pid(1), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 } }));
check('y otra vez: ya estaba, sin otra versión', otraVez.ok && otraVez.valor.result.status === 'already' && (await db.collection('shots').doc(nodoId).get()).data()?.version === nodo?.version);

/* ═══ 3 · UN VÍDEO EN STORAGE SIN SU FICHA ═══════════════════════════════ */
console.log('\n── Un vídeo en Storage sin su ficha: se adopta el suyo, sin descargar; el de otro, no ──');
const puerto = servidor.address().port;
const adoptable = identidadDelMaterial(`job-adopcion-${marca}`, `job-adopcion-${marca}#1`);
const ruta = `users/${A}/ai-generations/${adoptable}.mp4`;
await admin.storage().bucket().file(ruta).save(BYTES, { resumable: false, metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: 'tok-emu-1', [MARCA_DE_MATERIAL]: adoptable } } });
const bajadas0 = cuenta.video;
const adoptado = await materializadorDeWee.guardar({ assetId: adoptable, userId: A, kind: 'video', recurso: `http://127.0.0.1:${puerto}/videos/nunca-descargado.mp4`, provenance: { createdAt: Date.now(), jobId: `job-adopcion-${marca}` } });
const fichaAdoptada = await contenido.leerMaterial(adoptable);
check('el objeto que ya está, con SU marca: una ficha, el mismo objeto, CERO descargas',
  adoptado.ok && adoptado.assetId === adoptable && cuenta.video === bajadas0 && fichaAdoptada?.status === 'ready' && fichaAdoptada?.storageRef?.objectKey === ruta, JSON.stringify(adoptado));
/*
 * ¿APLICA ESTE STORAGE `ifGenerationMatch: 0`? El materializador guarda «solo si no existe» y la biblioteca lo manda
 * en la subida; GCS contesta 412 si ya hay objeto. El emulador puede no aplicarlo: se mide aquí, y lo que se comprueba
 * después depende de la respuesta. El camino del 412 se prueba en memoria (`f1d-generacion`, U) en cualquier caso.
 */
const sonda = admin.storage().bucket().file(`users/${A}/sonda-${marca}.bin`);
await sonda.save(Buffer.from('uno'), { resumable: false });
const segunda = await intento(() => sonda.save(Buffer.from('dos'), { resumable: false, preconditionOpts: { ifGenerationMatch: 0 } }));
const aplicaPrecondicion = !segunda.ok && Number(segunda.error?.code) === 412;
console.log(`   · este Storage ${aplicaPrecondicion ? 'SÍ' : 'NO'} aplica ifGenerationMatch: 0`);
const ajeno = identidadDelMaterial(`job-ajeno-${marca}`, `job-ajeno-${marca}#1`);
const rutaAjena = `users/${A}/ai-generations/${ajeno}.mp4`;
await admin.storage().bucket().file(rutaAjena).save(BYTES, { resumable: false, metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: 'tok-emu-2', [MARCA_DE_MATERIAL]: 'asset_de_otro' } } });
const bajadas1 = cuenta.video;
const noAdoptado = await materializadorDeWee.guardar({ assetId: ajeno, userId: A, kind: 'video', recurso: `http://127.0.0.1:${puerto}/videos/ajeno.mp4`, provenance: { createdAt: Date.now(), jobId: `job-ajeno-${marca}` } });
const [metaAjena] = await admin.storage().bucket().file(rutaAjena).getMetadata();
if (aplicaPrecondicion) {
  check('CONTROL · con la marca de otro material no se adopta, y el 412 no deja inventar la ficha', !noAdoptado.ok && !(await contenido.leerMaterial(ajeno)), JSON.stringify(noAdoptado));
} else {
  check('CONTROL · con la marca de otro material no se adopta: se descarga lo suyo y el objeto queda con SU marca (sin el 412, que este emulador no aplica)',
    cuenta.video === bajadas1 + 1 && metaAjena?.metadata?.[MARCA_DE_MATERIAL] === ajeno && metaAjena?.metadata?.firebaseStorageDownloadTokens !== 'tok-emu-2', JSON.stringify(noAdoptado));
}

/* ═══ 4 · MODELARK VENCE LA TAREA ════════════════════════════════════════ */
console.log('\n── `expired`: reembolso exacto, una vez, y nada que enlazar ──');
await crear(2);
const pl2 = await plan(2);
const q2 = await llamar({ plano: pl2, cotizar: true });
const r2 = await llamar({ plano: { ...pl2, take: 1 }, creditosCotizados: q2.valor.credits });
const rid2 = toma.requestIdDeToma(A, pid(2), 'sh-0101', 1);
const job2 = await rt.trabajoDelMedioDeWee(db, A, rid2);
pasar(job2.attempts[0].providerRef.operationId, 'expired');
await pasada();
await pasada();
const reembolso = await reembolsos(rid2);
const enlace2 = await intento(() => shotsPuerta.shots.run({ auth: { uid: A }, data: { op: 'shot.result', productionId: pid(2), sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 } }));
check('vencida: FAILED, la reserva vuelve EXACTA y una sola vez', r2.ok && (await uso(rid2))?.status === 'REFUNDED' && reembolso.length === 1 && reembolso[0].amount === q2.valor.credits, codigo(r2));
check('y no hay nada que enlazar', enlace2.ok && enlace2.valor.result.status === 'failed' && !(await db.collection('shots').doc(toma.idDeNodoDePlano(A, pid(2), 'sh-0101')).get()).exists);

check('ninguna petición salió de esta máquina', /^http:\/\/127\.0\.0\.1:/.test(process.env.ARK_BASE_URL) && cuenta.post === 2);

servidor.close();
console.log(failures ? `\n✘ ${failures} fallos · ${n} comprobaciones` : `\n✔ F1-D contra los emuladores: ${n} comprobaciones`);
process.exit(failures ? 1 : 0);
