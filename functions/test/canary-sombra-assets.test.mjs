/*
 * CANARY DE LA SOMBRA — DE QUIÉN ES CADA MATERIAL (#4). S1.5.
 *
 * La regla #4 del monitor (`scripts/canary-sombra.mjs`) decidía por la CUENTA, y
 * además en `userId`/`ownerId`/`accountId`, que un material del Content Core no
 * tiene: su dueño es `ownerAccountId`. Con eso, un material de Legacy de la cuenta
 * de la canary podía colarse como «de la sombra» (si llevara `userId`) o no verse
 * nunca (como lleva `ownerAccountId`). Ahora decide su PROCEDENCIA —la que escribe
 * quien lo produce (`core/content/asset.ts`)— contra la identidad que pone el código
 * de la sombra (`<jobId>:algoritmo`, `sombra`, `sombra-puente`).
 *
 * Todo local y sintético: ni Firestore, ni red, ni materiales de verdad.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const S = require(path.resolve(RAIZ, 'functions/lib/creator/sombra.js'));
const A = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/canary-sombra-atribucion.mjs')).href);

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const ID = A.identidadDeLaSombra(S);
const CUENTA = 'cuenta-de-la-canary';
const OTRA = 'otra-cuenta';
const J = 'trabajoDeLaCanary01';
const RUN = `${J}:algoritmo`;
const c4 = (h) => A.condicionAssets(h, ID, CUENTA);
/* Los hechos: todos los materiales, cuáles son nuevos, las filas del libro, los trabajos del motor. */
const hechos = ({ assets = [], nuevos, objetos = [], filas = [], jobsDelMotor = [] } = {}) => ({
  idsDeLaSombra: new Set([RUN]),
  filas,
  assetsTodos: assets,
  assetsNuevos: new Set(nuevos ?? assets.map((a) => a.assetId)),
  objetosNuevos: objetos,
  jobsDelMotor: new Set(jobsDelMotor),
});
/* Formas reales de procedencia, tal como las escribe cada productor. */
const deCreatorRun = (assetId, owner = CUENTA) => ({ assetId, ownerAccountId: owner, provenance: { createdAt: 1, generationId: `gen-${assetId}`, jobId: J, stepId: 'image', requestId: `${J}:image`, capability: 'image.generate', provider: 'gemini' }, metadata: { experienceId: 'design' } });
const filaDeCreatorRun = (assetId) => ({ id: `gen-${assetId}`, jobId: J, userId: CUENTA, stepId: 'image', requestId: `${J}:image`, capability: 'image.generate', creditTransactionId: `usage_${J}` });
const deLaSombra = (assetId, provenance, owner = CUENTA) => ({ assetId, ownerAccountId: owner, provenance: { createdAt: 1, ...provenance } });
const subida = (assetId, owner = CUENTA) => ({ assetId, ownerAccountId: owner, provenance: { createdAt: 1 } });

console.log('\n── Request 4 (Japón) y B · sin materiales ──');
{
  const r = c4(hechos());
  check('R4 · el Request 4 no creó materiales: shadowAssetsCreated = 0, legacyAssetsCreated = 0, #4 = OK', r.estado === 'OK' && r.shadowAssetsCreated === 0 && r.legacyAssetsCreated === 0 && r.shadowMediaObjects === 0, r.estado);
  const b = c4(hechos({ filas: [{ id: 'fila-brain', jobId: J, stepId: S.SELLO_DE_LA_SOMBRA, requestId: `${J}:${S.SELLO_DE_LA_SOMBRA}`, capability: S.CAPACIDAD_DEL_ENTENDIMIENTO }] }));
  check('B · evidencia de la sombra (su fila del libro) y ningún material: OK con ceros', b.estado === 'OK' && b.shadowAssetsCreated === 0 && b.materiales.length === 0);
}

console.log('\n── A y E · materiales de Legacy, con la sombra al lado ──');
{
  const a = c4(hechos({ assets: [deCreatorRun('mat-legacy')], filas: [filaDeCreatorRun('mat-legacy')] }));
  check('A · evidencia de la sombra (su shadowRunId guardado) + un material de creatorRun: shadowAssets = 0, #4 = OK', a.estado === 'OK' && a.shadowAssetsCreated === 0 && a.legacyAssetsCreated === 1, `${a.estado} · ${a.shadowAssetsCreated}/${a.legacyAssetsCreated}`);
  check('E · el material de creatorRun es LEGACY por su generationId (una generación que no es de la sombra)', a.materiales[0].de === 'LEGACY' && /generationId/.test(a.materiales[0].por), a.materiales[0].por);
  const sinFila = c4(hechos({ assets: [deCreatorRun('mat-legacy-2')] }));
  check('E · sin la fila del libro, lo reconoce su procedencia de paso de creatorRun (<jobId>:<paso>)', sinFila.estado === 'OK' && sinFila.materiales[0].de === 'LEGACY' && /creatorRun/.test(sinFila.materiales[0].por), sinFila.materiales[0].por);
  const estudio = c4(hechos({ assets: [{ assetId: 'video-estudio', ownerAccountId: CUENTA, provenance: { createdAt: 1, generationId: 'gen-video', requestId: 'studio-req-1', provider: 'seedance', model: 'seedance-2.0' } }], filas: [{ id: 'gen-video', jobId: null, stepId: null, requestId: 'studio-req-1', capability: 'video.generate' }] }));
  check('E · un vídeo de Weë Studio (generationId de una generación sin sello) es LEGACY', estudio.estado === 'OK' && estudio.materiales[0].de === 'LEGACY', estudio.materiales[0].por);
  const runtime = c4(hechos({ assets: [{ assetId: 'video-runtime', ownerAccountId: CUENTA, provenance: { createdAt: 1, runId: 'run-1', stepId: 'clip', requestId: 'req-rt', traceId: 'trace-1', jobId: 'job-del-motor', operationId: 'op-1', capability: 'video.generate', provider: 'seedance' } }] }));
  check('E · uno del runtime (runId / operationId) es LEGACY: ejecución conocida que no es la sombra', runtime.estado === 'OK' && runtime.materiales[0].de === 'LEGACY' && /runtime/.test(runtime.materiales[0].por), runtime.materiales[0].por);
  const motor = c4(hechos({ assets: [{ assetId: 'doc-runtime', ownerAccountId: CUENTA, provenance: { createdAt: 1, jobId: 'job-del-motor', stepId: 'texto', requestId: 'req-sync' } }], jobsDelMotor: ['job-del-motor'] }));
  check('E · y uno del runtime síncrono, por su jobId del motor', motor.materiales[0].de === 'LEGACY' && motor.estado === 'OK');
}

console.log('\n── C y D · un material de la sombra (sintético) → STOP ──');
{
  const c = c4(hechos({ assets: [deLaSombra('mat-c', { requestId: RUN })] }));
  check('C · procedencia con el shadowRunId → STOP, 1 material de la sombra', c.estado === 'STOP' && c.shadowAssetsCreated === 1, `${c.estado} · ${c.shadowAssetsCreated}`);
  const d1 = c4(hechos({ assets: [deLaSombra('mat-d1', { generationId: 'fila-s' })], filas: [{ id: 'fila-s', jobId: J, stepId: S.SELLO_DE_LA_SOMBRA, requestId: `${J}:${S.SELLO_DE_LA_SOMBRA}`, capability: 'text.structure' }] }));
  check('D · su generationId es una fila del libro de la sombra → STOP', d1.estado === 'STOP' && d1.materiales[0].de === 'SOMBRA' && /fila del libro de la sombra/.test(d1.materiales[0].por), d1.materiales[0].por);
  const d2 = c4(hechos({ assets: [deLaSombra('mat-origen', { runId: `${J}:${S.SELLO_DEL_PUENTE}` }), deCreatorRun('mat-derivado')].map((a) => (a.assetId === 'mat-derivado' ? { ...a, provenance: { ...a.provenance, sourceAssetIds: ['mat-origen'] } } : a)), nuevos: ['mat-derivado'], filas: [filaDeCreatorRun('mat-derivado')] }));
  check('D · un material que SALE de uno de la sombra (sourceAssetIds) también es de la sombra → STOP', d2.estado === 'STOP' && d2.materiales[0].de === 'SOMBRA' && /sale de un material de la sombra/.test(d2.materiales[0].por), d2.materiales[0].por);
  for (const [campo, valor] of [['traceId', RUN], ['operationId', `${J}:algoritmo`], ['stepId', S.SELLO_DE_LA_SOMBRA]]) {
    const r = c4(hechos({ assets: [deLaSombra(`mat-${campo}`, { [campo]: valor })] }));
    check(`D · ${campo} con la identidad de la sombra → STOP`, r.estado === 'STOP' && r.shadowAssetsCreated === 1);
  }
  const meta = c4(hechos({ assets: [{ ...subida('mat-meta'), metadata: { origen: RUN } }] }));
  check('D · su metadata nombra el shadowRunId → STOP', meta.estado === 'STOP');
  const obj = c4(hechos({ assets: [deLaSombra('mat-obj', { requestId: RUN })], nuevos: [], objetos: [{ id: 'obj-1', accountId: CUENTA, assetId: 'mat-obj', objectKey: 'cualquiera' }] }));
  check('D · un objeto del almacén de un material de la sombra (aunque el material sea viejo) → STOP', obj.estado === 'STOP' && obj.shadowMediaObjects === 1 && obj.shadowAssetsCreated === 0);
}

console.log('\n── F · de la cuenta de la canary, pero sin dueño causal ──');
{
  const f = c4(hechos({ assets: [subida('subida-1')] }));
  check('F · una subida de la cuenta de la canary (sin linaje): INVESTIGAR, nunca SOMBRA', f.estado === 'INVESTIGAR' && f.shadowAssetsCreated === 0 && f.materiales[0].de === 'SIN_ATRIBUIR' && f.sinAtribuirDeLaCuenta === 1, f.estado);
  const soloTrabajo = c4(hechos({ assets: [{ assetId: 'con-trabajo', ownerAccountId: CUENTA, provenance: { createdAt: 1, jobId: J } }] }));
  check('F · el jobId del trabajo de la canary, a secas, no lo hace de la sombra (ni de nadie): INVESTIGAR', soloTrabajo.estado === 'INVESTIGAR' && soloTrabajo.shadowAssetsCreated === 0 && soloTrabajo.materiales[0].de === 'SIN_ATRIBUIR');
  const objSinDueno = c4(hechos({ objetos: [{ id: 'obj-2', accountId: CUENTA, assetId: 'desconocido' }] }));
  check('F · un objeto del almacén de la canary sin material conocido: INVESTIGAR', objSinDueno.estado === 'INVESTIGAR' && objSinDueno.shadowMediaObjects === 0);
}

console.log('\n── G · de otra cuenta ──');
{
  const g1 = c4(hechos({ assets: [subida('subida-ajena', OTRA), deCreatorRun('legacy-ajeno', OTRA)] }));
  check('G · materiales de otra cuenta sin identidad de la sombra: no se le atribuyen, OK', g1.estado === 'OK' && g1.shadowAssetsCreated === 0 && g1.legacyAssetsCreated === 0 && g1.sinAtribuirDeLaCuenta === 0, g1.estado);
  const g2 = c4(hechos({ assets: [deLaSombra('sombra-ajena', { requestId: RUN }, OTRA)] }));
  check('G · pero si lleva la identidad de la sombra, STOP aunque sea de otra cuenta: decide la identidad, no el dueño', g2.estado === 'STOP');
}

console.log('\n── H · identidad mal formada: falla cerrada ──');
{
  let lanzaCodigo = false;
  try { A.identidadDeLaSombra({ ...S, peticionDeLaSombra: () => ({ shadowRunId: 'sin-forma' }) }); } catch { lanzaCodigo = true; }
  check('H · si el código cambia la forma del shadowRunId, no hay identidad (lanza)', lanzaCodigo);
  /* Con hechos VACÍOS: así solo la guarda puede hacerlo lanzar (con materiales, lanzaría un TypeError por otra razón). */
  let lanzaSin = false;
  try { A.condicionAssets(hechos(), undefined, CUENTA); } catch { lanzaSin = true; }
  check('H · sin identidad, #4 no dice OK: lanza', lanzaSin);
  let lanzaVacia = false;
  try { A.condicionAssets(hechos(), { ...ID, sufijos: [] }, CUENTA); } catch { lanzaVacia = true; }
  check('H · con una identidad vacía, tampoco', lanzaVacia);
  const huerfano = c4(hechos({ assets: [deLaSombra('mat-h', { requestId: 'otroTrabajo:algoritmo' })] }));
  check('H · un id con el sello de la sombra de un trabajo sin private/sombra: se trata como sombra (STOP), no se deja pasar', huerfano.estado === 'STOP');
}

console.log('\n── I · sombra y Legacy en el mismo trabajo de la canary ──');
{
  const i = c4(hechos({ assets: [deCreatorRun('mat-legacy-i'), deLaSombra('mat-sombra-i', { jobId: J, requestId: RUN })], filas: [filaDeCreatorRun('mat-legacy-i')] }));
  check('I · STOP, y cada uno en su cuenta: 1 de la sombra y 1 de Legacy', i.estado === 'STOP' && i.shadowAssetsCreated === 1 && i.legacyAssetsCreated === 1, `${i.shadowAssetsCreated}/${i.legacyAssetsCreated}`);
  check('I · el de Legacy sigue siendo LEGACY aunque comparta trabajo con el de la sombra', i.materiales.find((m) => m.assetId === 'mat-legacy-i')?.de === 'LEGACY' && i.materiales.find((m) => m.assetId === 'mat-sombra-i')?.de === 'SOMBRA');
}

console.log('\n── J · ni la cuenta, ni el trabajo, ni la hora bastan ──');
{
  const muchos = c4(hechos({ assets: [1, 2, 3, 4, 5].map((n) => subida(`subida-${n}`)) }));
  check('J · cinco materiales de la cuenta de la canary sin linaje: ninguno de la sombra, nunca STOP', muchos.estado === 'INVESTIGAR' && muchos.shadowAssetsCreated === 0 && muchos.sinAtribuirDeLaCuenta === 5);
  const trasLaSombra = c4(hechos({ assets: [{ ...deCreatorRun('despues'), provenance: { ...deCreatorRun('despues').provenance, createdAt: 9_999_999_999_999 } }], filas: [filaDeCreatorRun('despues')] }));
  check('J · uno creado después de la sombra, en su mismo trabajo, con linaje de creatorRun: LEGACY', trasLaSombra.estado === 'OK' && trasLaSombra.materiales[0].de === 'LEGACY');
  /* CONTROL: la regla vieja (cuenta en userId/ownerId/accountId). */
  const vieja = (assets) => (assets.some((a) => [a.userId, a.ownerId, a.accountId].includes(CUENTA)) ? 'STOP' : assets.length ? 'INVESTIGAR' : 'OK');
  check('J · CONTROL: la regla vieja NO veía un material de verdad de la canary (su dueño es ownerAccountId)', vieja([deCreatorRun('real')]) === 'INVESTIGAR');
  check('J · CONTROL: y culpaba a la sombra de uno de Legacy que llevara la cuenta en userId', vieja([{ ...deCreatorRun('otro'), userId: CUENTA }]) === 'STOP'
    && c4(hechos({ assets: [{ ...deCreatorRun('otro'), userId: CUENTA }], filas: [filaDeCreatorRun('otro')] })).estado === 'OK');
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
