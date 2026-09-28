/**
 * FILMMAKER ENGINE · FASE 8 — EL RENDER CONTRA FIRESTORE Y STORAGE DE VERDAD.
 *
 * `filmmaker-render.test.mjs` recorre el render entero con una base en memoria y
 * un almacén de objetos de mentira. Aquí el almacén de trabajos, el Content Core y
 * el Storage son los de los emuladores, y lo que se prueba es lo que la memoria no
 * puede decir: que el ejecutor habla bien con el SDK de verdad —baja con
 * `download`, sube con `upload` y lee la metadata con `getMetadata`—, que el
 * almacén sirve la búsqueda de la pasada y que el vídeo guardado es un montaje.
 *
 *   el render de punta a punta, con FFmpeg de verdad · el objeto sin ficha,
 *   adoptado sin montar · un plano que no se puede bajar · mirar un objeto que
 *   no existe.
 *
 * Lo que NO se puede probar aquí: la precondición «solo si no existe» —el
 * emulador de Storage NO aplica `ifGenerationMatch: 0` (lección de F1-D)—. La
 * suite en memoria la cubre, y la biblioteca de verdad la manda.
 *
 * NINGUNA petición sale de esta máquina y no se usa ninguna credencial. No está
 * en `npm test`: necesita los emuladores y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee-filmmaker \
 *     "node functions/test/render.emulator.mjs"
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROY = process.env.GCLOUD_PROJECT || '';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  console.log('✘ sin los emuladores de Firestore y Storage no se corre'); process.exit(1);
}
if (!PROY.startsWith('demo-')) { console.log('✘ solo contra un proyecto de demostración'); process.exit(1); }

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: `${PROY}.appspot.com` });
const lib = (p) => require(path.resolve(here, '../lib', p));
const R = lib('creator/render.js');
const RZ = lib('creator/renderizador.js');
const RS = lib('creator/renders.js');
const comp = lib('creator/composicion.js');
const contenido = lib('content/index.js');
const http = lib('engine/http.js');
const jobIdx = lib('job/index.js');
const almacen = lib('runtime/almacen.js');
const core = lib('core/index.js');
const FFMPEG = require('ffmpeg-static');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const db = admin.firestore();
const bucket = http.storageBucket();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'render-emu-'));
const UID = `rendEmu${Date.now().toString(36)}`;
const hex32 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 32);

/* ── Vídeos de verdad, subidos al Storage del emulador como materiales de la cuenta ── */
const generar = (nombre, { w = 1280, h = 720, sonido = false } = {}) => {
  const salida = path.join(TMP, nombre);
  const args = ['-hide_banner', '-nostdin', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=24:duration=4`];
  if (sonido) args.push('-f', 'lavfi', '-i', 'sine=frequency=440:duration=4');
  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', ...(sonido ? ['-c:a', 'aac', '-shortest'] : ['-an']), salida);
  if (spawnSync(FFMPEG, args).status !== 0) throw new Error(`no se generó ${nombre}`);
  return fs.readFileSync(salida);
};
const material = async (bytes, clave) => {
  const assetId = `asset_${hex32(`${UID}|${clave}`)}`;
  const ruta = `users/${UID}/ai-generations/${assetId}.mp4`;
  const token = randomUUID();
  await bucket.file(ruta).save(bytes, { resumable: false, metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token, weeMaterial: assetId } } });
  const m = await contenido.crearMaterialDesdeUrl({ ownerAccountId: UID, assetId, url: http.downloadUrlFor(bucket.name, ruta, token), kind: 'video', provenance: { createdAt: Date.now() } });
  if (!m) throw new Error('no se creó el material de prueba');
  return assetId;
};
const a1 = await material(generar('a.mp4'), 'a');
const a2 = await material(generar('b.mp4', { sonido: true }), 'b');
const a3 = await material(generar('c.mp4', { w: 720, h: 1280, sonido: true }), 'c');

/* ── Un manifiesto y su trabajo, como los deja `pedirRender` ── */
const salida = { aspectRatio: '16:9', resolution: '720p', ancho: 1280, alto: 720, fps: 24, contenedor: 'mp4', video: 'h264', audio: 'aac' };
const manifiesto = (productionId, conFundido) => {
  const clips = [
    { unitId: 'sh-0101', sceneId: 'sc-0001', assetId: a1, inicioSec: 0, finSec: 4, duracionSec: 4, conSonido: false, salida: conFundido ? { tipo: 'dissolve', como: 'crossfade', duracionSec: 0.5 } : { tipo: 'cut', como: 'cut', duracionSec: 0 } },
    { unitId: 'sh-0102', sceneId: 'sc-0001', assetId: a2, inicioSec: 4, finSec: 8, duracionSec: 4, conSonido: true, salida: { tipo: 'cut', como: 'cut', duracionSec: 0 } },
    { unitId: 'sh-0103', sceneId: 'sc-0001', assetId: a3, inicioSec: 8, finSec: 12, duracionSec: 4, conSonido: false },
  ];
  const sinHuella = { version: 'fm-montaje-1', productionId, revision: 1, salida, clips, duracionSec: conFundido ? 11.5 : 12, duracionDeLaLineaDeTiempoSec: 12 };
  return { ...sinHuella, huella: comp.huellaDelManifiesto(sinHuella) };
};
const store = almacen.almacenDeTrabajos(db);
const { motor } = jobIdx.crearMotorDeTrabajosDeWee(R.POLITICA_DEL_RENDER);
const encargar = async (m) => {
  const requestId = R.requestIdDeRender(UID, m.productionId, m.huella, 1);
  const alta = await jobIdx.crearTrabajo(store, motor, {
    contract: core.JOB_ENGINE_CONTRACT_VERSION, principal: { userId: UID }, at: Date.now(), task: { name: 'media.render' },
    input: R.paqueteDeRender(UID, requestId, m), trace: { traceId: `render-${m.huella.slice(0, 32)}`, requestId, userId: UID, accountId: UID },
    idempotencyKey: requestId, policy: R.POLITICA_DEL_RENDER, context: { appId: 'studio', operationId: requestId },
  });
  if (!alta.ok) throw new Error('el Job Engine no admitió el render');
  return { requestId, assetId: R.materialDelRender(requestId), jobId: alta.job.jobId };
};
let montajes = 0;
const real = RZ.lanzarFfmpegDeWee(FFMPEG);
const lanzar = (argv) => { if (argv.includes('-filter_complex')) montajes++; return real(argv); };
const pasada = () => RS.pasadaDeRender({ db, presupuestoMs: 25 * 60_000, ejecutor: RZ.crearEjecutorDeRender({ lanzar }) });
const sonda = (bytes) => { const f = path.join(TMP, `s-${randomUUID()}.mp4`); fs.writeFileSync(f, bytes); return RZ.leerSonda(spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', f], { encoding: 'utf8' }).stderr); };

/* ═══ 1 · De punta a punta ═══════════════════════════════════════════════ */
console.log('\n── 1 · El render, con el almacén de trabajos, el Content Core y el Storage de los emuladores ──');
const r1 = await encargar(manifiesto('prodEmulador000000000001', true));
const informe = await pasada();
const j1 = await R.trabajoDelRender(db, UID, r1.requestId);
const m1 = await contenido.leerMaterial(r1.assetId);
/* Contra SU trabajo, no contra el total: el Firestore de los emuladores puede ser compartido y guardar renders de otra ejecución. */
check('1) la pasada lo encuentra en el almacén de verdad, lo monta una vez y lo termina', informe.completados >= 1 && montajes === 1 && j1.state === 'completed' && j1.attempts.length === 1, JSON.stringify(informe));
check('2) el material, en el Content Core de verdad: listo, de la cuenta, derivado de sus tres planos',
  m1?.status === 'ready' && m1.ownerAccountId === UID && m1.kind === 'video' && m1.mimeType === 'video/mp4' && m1.storageRef?.provider === 'wee'
  && JSON.stringify([...m1.provenance.sourceAssetIds].sort()) === JSON.stringify([a1, a2, a3].sort()) && m1.bytes > 0);
const ruta1 = `users/${UID}/ai-generations/${r1.assetId}.mp4`;
const [meta1] = await bucket.file(ruta1).getMetadata();
const [bytes1] = await bucket.file(ruta1).download();
const visto = sonda(bytes1);
check('3) el objeto, subido con `upload` al Storage del emulador: mp4, con la marca de su material y su token', meta1.contentType === 'video/mp4' && meta1.metadata?.weeMaterial === r1.assetId && !!meta1.metadata?.firebaseStorageDownloadTokens && Number(meta1.size) === m1.bytes);
check('4) y es el montaje: 11,5 s, 1280×720, h264, con sonido', visto.video === 'h264' && visto.ancho === 1280 && visto.alto === 720 && Math.abs(visto.duracionSec - 11.5) <= 0.1 && visto.conSonido, JSON.stringify(visto));

/* ═══ 2 · El objeto sin ficha, adoptado ══════════════════════════════════ */
console.log('\n── 2 · Un objeto que se guardó y no llegó a ficharse ──');
const r2 = await encargar(manifiesto('prodEmulador000000000002', false));
const ruta2 = `users/${UID}/ai-generations/${r2.assetId}.mp4`;
await bucket.file(ruta2).save(bytes1, { resumable: false, metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: randomUUID(), weeMaterial: r2.assetId } } });
const antes = montajes;
await pasada();
const j2 = await R.trabajoDelRender(db, UID, r2.requestId);
const m2 = await contenido.leerMaterial(r2.assetId);
check('5) el ejecutor mira el objeto con `getMetadata`, reconoce su marca y lo ficha SIN montar', j2.state === 'completed' && m2?.status === 'ready' && montajes === antes);

/* ═══ 3 · Lo que falla con el SDK de verdad ══════════════════════════════ */
console.log('\n── 3 · Bajar lo que no está y mirar lo que no existe ──');
const alm = RZ.almacenDelRenderDeWee();
check('6) mirar un objeto que no existe es `null`, no un error', (await alm.mirar(`users/${UID}/ai-generations/asset_${'0'.repeat(32)}.mp4`)) === null);
const huerfano = `asset_${hex32(`${UID}|huerfano`)}`;
await db.collection('assets').doc(huerfano).set({ ...(await contenido.leerMaterial(a1)), assetId: huerfano, storageRef: { provider: 'wee', objectKey: `users/${UID}/ai-generations/${huerfano}.mp4` } });
const m3 = manifiesto('prodEmulador000000000003', true);
const conHuerfano = { ...m3, clips: m3.clips.map((c, i) => (i === 0 ? { ...c, assetId: huerfano } : c)) };
const { huella: _h, ...sinH } = conHuerfano;
const r3 = await encargar({ ...conHuerfano, huella: comp.huellaDelManifiesto(sinH) });
await pasada();
const j3 = await R.trabajoDelRender(db, UID, r3.requestId);
check('7) un plano cuya ficha existe y cuyo objeto no: `clip_download_failed`, reintentable y sin material',
  j3.attempts[0]?.error?.details?.reason === 'clip_download_failed' && !(await contenido.leerMaterial(r3.assetId)), `${j3.state} ${j3.attempts[0]?.error?.details?.reason}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ render contra los emuladores (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
