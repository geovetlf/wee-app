/**
 * F1-C · WEË FILMMAKER — EL SERVICIO DE CLIENTE, LA ÚNICA FRONTERA CON `productions`.
 *
 * Se carga `services/filmmakerService.ts` tal cual, con Firebase sustituido por un
 * doble que apunta lo que se manda y contesta lo que el servidor contestaría —las
 * formas salen de `functions/src/productions/puerta.ts`—. Lo que se demuestra:
 *
 *   A · Las siete operaciones: qué se manda, y qué vuelve.
 *   B · Lo que NUNCA se manda ni vuelve: la cuenta, Firestore, un tipo de Firebase.
 *   C · Los fallos: cada código del servidor, la red y una respuesta rota.
 *   D · CAS: la revisión esperada y el id del lote viajan tal cual; nada se reintenta solo.
 *   E · La frontera: nadie más en la app habla con `productions`.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, archivosDeLaApp, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

const require = createRequire(import.meta.url);
let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── El doble de Firebase: apunta cada llamada y contesta lo que se le diga ── */
const llamadas = [];
let contestar = async () => ({});
const firebaseFunctions = {
  httpsCallable: (fns, nombre, opciones) => async (datos) => {
    llamadas.push({ fns, nombre, opciones, datos: JSON.parse(JSON.stringify(datos)) });
    return { data: await contestar(datos) };
  },
};
const FUNCIONES = { soyElDoble: true };
const cargar = crearCargador({ dobles: { 'firebase/functions': firebaseFunctions, '../config/firebase': { functions: FUNCIONES } } });
const S = cargar('services/filmmakerService.ts');
const svc = S.filmmakerService;
/** Un error como los que lanza el SDK de una callable: `functions/<código>`, y `details` si el servidor los puso. */
const errorDeCallable = (codigo, details) => Object.assign(new Error(details?.code ?? codigo), { code: `functions/${codigo}`, ...(details ? { details } : {}) });

const PROD = (extra = {}) => ({
  version: 1, id: 'abcdefghijklmnopqrstuvwx', title: 'El día de una panadería', intent: { freeText: 'El día de una panadería' },
  creativeDirection: {}, format: { aspectRatio: '4:5', resolution: '1080p', preset: 'ads' }, duration: { targetSec: 15 },
  scenes: [], characters: [], locations: [], objects: [], references: [], audio: { cues: [] }, generation: {}, editPlan: {},
  exportPlan: { targets: [] }, metadata: { revision: 0 }, ...extra,
});
const VISTA = (extra = {}) => ({ productionId: 'abcdefghijklmnopqrstuvwx', revision: 0, status: 'active', createdAt: 1000, updatedAt: 1000, production: PROD(), ...extra });
const persistencia = require(path.resolve(RAIZ, 'functions/lib/productions/index.js'));
const modelo = require(path.resolve(RAIZ, 'functions/lib/filmmaker/modelo.js'));

/* ═══ A · LAS SIETE OPERACIONES ════════════════════════════════════════════ */
console.log('\n── A · Las siete operaciones ──');

contestar = async () => ({ created: true, ...VISTA(), ownerAccountId: 'cuenta-ajena', _campoRaro: { seconds: 1, nanoseconds: 2 } });
const creada = await svc.createProduction({ title: 'El día de una panadería', preset: 'ads' });
const c0 = llamadas.at(-1);
check('A1) crear: una sola llamada a `productions` con `op: create`, el id generado y lo pedido',
  c0.nombre === 'productions' && c0.fns === FUNCIONES && c0.datos.op === 'create' && persistencia.FORMA_DE_ID_DE_PRODUCCION.test(c0.datos.productionId)
  && c0.datos.title === 'El día de una panadería' && c0.datos.preset === 'ads' && !('aspectRatio' in c0.datos) && !('production' in c0.datos),
  JSON.stringify(c0.datos));
check('A2) y vuelve la producción creada, con `created`', creada.ok && creada.valor.created === true && creada.valor.produccion.revision === 0
  && creada.valor.produccion.production.format.aspectRatio === '4:5');
const borrador = PROD({ scenes: [{ id: 'sc_1', order: 0, shots: [{ id: 'sh_1', order: 0, durationSec: 3 }] }] });
contestar = async () => ({ created: false, ...VISTA({ production: borrador }) });
const conId = await svc.createProduction({ productionId: 'abcdefghijklmnopqrstuvwx', operationId: 'op_12345678', production: borrador });
check('A3) crear con un borrador entero y un id propio: se mandan tal cual, y `created: false` es «ya estaba»',
  llamadas.at(-1).datos.productionId === 'abcdefghijklmnopqrstuvwx' && llamadas.at(-1).datos.operationId === 'op_12345678'
  && llamadas.at(-1).datos.production.scenes.length === 1 && conId.ok && conId.valor.created === false);

contestar = async () => VISTA({ revision: 7 });
const leida = await svc.getProduction('abcdefghijklmnopqrstuvwx');
check('A4) abrir: `op: get` con el id, y vuelve con su revisión', llamadas.at(-1).datos.op === 'get' && llamadas.at(-1).datos.productionId === 'abcdefghijklmnopqrstuvwx'
  && leida.ok && leida.valor.revision === 7 && Object.keys(llamadas.at(-1).datos).sort().join() === 'op,productionId');

contestar = async () => ({ productions: [{ productionId: 'abcdefghijklmnopqrstuvwx', title: 'Una', status: 'active', aspectRatio: '9:16', preset: 'tiktok', revision: 2, createdAt: 1, updatedAt: 5 }], nextCursor: 'abcdefghijklmnopqrstuvwx' });
const lista = await svc.listProductions({ status: 'active', limit: 20 });
check('A5) listar: `op: list` con estado y tope; vuelven resúmenes y el cursor', llamadas.at(-1).datos.op === 'list' && llamadas.at(-1).datos.status === 'active'
  && llamadas.at(-1).datos.limit === 20 && !('after' in llamadas.at(-1).datos) && lista.ok && lista.valor.producciones[0].preset === 'tiktok' && lista.valor.nextCursor);
contestar = async () => ({ productions: [] });
const vacia = await svc.listProductions();
check('A6) y una lista vacía es una respuesta, no un fallo', vacia.ok && vacia.valor.producciones.length === 0 && !('nextCursor' in vacia.valor)
  && Object.keys(llamadas.at(-1).datos).join() === 'op');

const OPS = [{ op: 'change_weather', sceneId: 'sc_1', weather: 'rain' }];
contestar = async () => ({ ...VISTA({ revision: 8 }), applied: 1, pending: { scenes: ['sc_1'], shots: ['sh_1'], audio: [], removed: [] }, timelineChanged: false, operationId: 'op_abcdefgh', alreadyApplied: false });
const aplicado = await svc.applyProductionOperations({ productionId: 'abcdefghijklmnopqrstuvwx', expectedRevision: 7, operations: OPS, operationId: 'op_abcdefgh' });
const ca = llamadas.at(-1).datos;
check('A7) aplicar: `op: apply` con la revisión esperada, las operaciones y el id del lote, sin nada más',
  ca.op === 'apply' && ca.expectedRevision === 7 && ca.operationId === 'op_abcdefgh' && JSON.stringify(ca.operations) === JSON.stringify(OPS)
  && Object.keys(ca).sort().join() === 'expectedRevision,op,operationId,operations,productionId');
check('A8) y vuelve la nueva revisión, lo que se aplicó y lo pendiente', aplicado.ok && aplicado.valor.produccion.revision === 8 && aplicado.valor.applied === 1
  && aplicado.valor.pending.shots[0] === 'sh_1' && aplicado.valor.alreadyApplied === false);

const RES = { productionId: 'abcdefghijklmnopqrstuvwx', title: 'Una', status: 'archived', aspectRatio: '9:16', revision: 8, createdAt: 1, updatedAt: 9, archivedAt: 9 };
contestar = async () => ({ changed: true, summary: RES });
const archivada = await svc.archiveProduction('abcdefghijklmnopqrstuvwx');
check('A9) archivar: `op: archive`, y vuelve el resumen archivado', llamadas.at(-1).datos.op === 'archive' && archivada.ok && archivada.valor.changed
  && archivada.valor.resumen.status === 'archived' && archivada.valor.resumen.archivedAt === 9);
contestar = async () => ({ changed: false, summary: { ...RES, status: 'active', archivedAt: undefined } });
const desarchivada = await svc.unarchiveProduction('abcdefghijklmnopqrstuvwx');
check('A10) desarchivar: `op: unarchive`; hacerlo dos veces es un «no cambió», no un fallo', llamadas.at(-1).datos.op === 'unarchive'
  && desarchivada.ok && desarchivada.valor.changed === false && desarchivada.valor.resumen.status === 'active');

contestar = async (d) => ({ created: true, source: { productionId: 'abcdefghijklmnopqrstuvwx', revision: 8 }, ...VISTA({ productionId: d.newProductionId }) });
const copia = await svc.duplicateProduction({ productionId: 'abcdefghijklmnopqrstuvwx', title: 'Una (copia)' });
const cd = llamadas.at(-1).datos;
check('A11) duplicar: `op: duplicate` con un id nuevo generado aquí, distinto del original, y el título pedido',
  cd.op === 'duplicate' && persistencia.FORMA_DE_ID_DE_PRODUCCION.test(cd.newProductionId) && cd.newProductionId !== cd.productionId && cd.title === 'Una (copia)'
  && copia.ok && copia.valor.source.revision === 8 && copia.valor.produccion.productionId === cd.newProductionId);
check('A12) cada llamada da su plazo: un poco más que el del servidor', llamadas.every((l) => l.opciones?.timeout >= 60_000));

/* ═══ B · LO QUE NUNCA SE MANDA NI VUELVE ══════════════════════════════════ */
console.log('\n── B · Lo que nunca se manda ni vuelve ──');
const mandado = JSON.stringify(llamadas.map((l) => l.datos));
check('B1) nunca se manda la cuenta: ni `ownerAccountId`, ni `accountId`, ni un uid', !/ownerAccountId|accountId|"uid"|userId/.test(mandado));
check('B2) lo que el servidor añada de más no pasa: ni la cuenta ni un campo desconocido llegan a la app',
  creada.ok && !('ownerAccountId' in creada.valor.produccion) && !('_campoRaro' in creada.valor.produccion));
const fuente = sinComentarios(leer('services/filmmakerService.ts'));
check('B3) el servicio no tiene dónde poner una cuenta: la palabra no aparece en su código', !/ownerAccountId|accountId/.test(fuente));
check('B4) ningún tipo de Firebase sale del servicio: ni Timestamp, ni DocumentSnapshot, ni DocumentReference',
  !/Timestamp|DocumentSnapshot|DocumentReference|QuerySnapshot|firebase\/firestore/.test(fuente));
check('B5) ni un precio ni un Credit: el servicio no cotiza', !/credit|precio|price|cost/i.test(fuente));
check('B6) y no genera nada: ni vídeo, ni Brain, ni el motor', !/generateVideo|creatorRun|brainChat|creatorChat|engine|seedance|gemini/i.test(fuente));

/* ═══ C · LOS FALLOS ═══════════════════════════════════════════════════════ */
console.log('\n── C · Los fallos: códigos, no frases ──');
const falla = async (error) => { contestar = async () => { throw error; }; return svc.getProduction('abcdefghijklmnopqrstuvwx'); };
const conflicto = await falla(errorDeCallable('aborted', {
  code: 'revision_conflict', messageKey: 'filmmaker.persistence.revision_conflict', currentRevision: 9,
  problems: [{ code: 'revision_conflict', severity: 'error', path: 'metadata.revision', parameters: { expected: 7, current: 9 }, messageKey: 'filmmaker.persistence.revision_conflict' }],
}));
check('C1) `aborted` por revisión: un conflicto, con la revisión que hay y la clave del dominio', !conflicto.ok && conflicto.fallo.tipo === 'conflicto'
  && conflicto.fallo.currentRevision === 9 && conflicto.fallo.messageKey === 'filmmaker.persistence.revision_conflict' && conflicto.fallo.problems.length === 1);
const CASOS = [
  ['not-found', 'production_not_found', 'no_encontrada'],
  ['failed-precondition', 'production_archived', 'archivada'],
  ['invalid-argument', 'operations_invalid', 'rechazada'],
  ['already-exists', 'production_id_taken', 'rechazada'],
  ['data-loss', 'production_corrupted', 'rechazada'],
  ['failed-precondition', 'element_binding_not_supported', 'rechazada'],
  ['unauthenticated', 'session_required', 'sin_sesion'],
  ['permission-denied', 'account_not_found', 'sin_cuenta'],
  ['invalid-argument', 'operation_unknown', 'rechazada'],
];
const malos = [];
for (const [codigo, code, tipo] of CASOS) {
  const r = await falla(errorDeCallable(codigo, { code, messageKey: `filmmaker.persistence.${code}`, problems: [] }));
  if (r.ok || r.fallo.tipo !== tipo || r.fallo.code !== code || r.fallo.reintentable) malos.push(`${code}→${r.ok ? 'ok' : r.fallo.tipo}`);
}
check(`C2) cada código del servidor cae en su sitio (${CASOS.length})`, malos.length === 0, malos.join(', '));
/* Cada código de la puerta tiene su tipo de fallo en el servicio, sin huecos. */
const puerta = require(path.resolve(RAIZ, 'functions/lib/productions/puerta.js'));
const sinTipo = [];
for (const [code, http] of Object.entries(puerta.CODIGO_DE_CALLABLE)) {
  const r = await falla(errorDeCallable(http, { code, messageKey: `filmmaker.persistence.${code}`, problems: [] }));
  if (r.ok || r.fallo.code !== code || r.fallo.messageKey !== `filmmaker.persistence.${code}`) sinTipo.push(code);
}
check(`C3) los ${Object.keys(puerta.CODIGO_DE_CALLABLE).length} códigos de la puerta conservan su código y su clave`, sinTipo.length === 0, sinTipo.join(', '));
const red = [];
for (const codigo of ['unavailable', 'deadline-exceeded', 'internal']) {
  const r = await falla(errorDeCallable(codigo));
  if (r.ok || r.fallo.tipo !== 'sin_conexion' || !r.fallo.reintentable) red.push(codigo);
}
check('C4) la red y el plazo: sin conexión y reintentable —repetir LA MISMA es seguro—', red.length === 0, red.join(', '));
const sinFuncion = await falla(errorDeCallable('not-found'));
check('C5) un `not-found` sin palabra del servidor es que la función no está: no disponible, no «no existe»', !sinFuncion.ok && sinFuncion.fallo.tipo === 'no_disponible');
contestar = async () => ({ productionId: 'x', revision: 'uno' });
const rota = await svc.getProduction('abcdefghijklmnopqrstuvwx');
check('C6) una respuesta sin la forma esperada no llega a la pantalla: es un fallo', !rota.ok && rota.fallo.code === 'response_invalid');
contestar = async () => { throw 'algo que no es un error'; };
const raro = await svc.listProductions();
check('C7) cualquier otra cosa es «desconocido», y el servicio nunca lanza', !raro.ok && raro.fallo.tipo === 'desconocido');
check('C8) el mapeo de fallos es puro: se exporta y no llama a nada', typeof S.falloDeProducciones === 'function'
  && S.falloDeProducciones(errorDeCallable('aborted', { code: 'revision_conflict', problems: [] })).tipo === 'conflicto');

/* ═══ D · CAS ══════════════════════════════════════════════════════════════ */
console.log('\n── D · CAS: la revisión esperada viaja tal cual ──');
llamadas.length = 0;
contestar = async () => { throw errorDeCallable('aborted', { code: 'revision_conflict', currentRevision: 12, problems: [] }); };
const cas = await svc.applyProductionOperations({ productionId: 'abcdefghijklmnopqrstuvwx', expectedRevision: 11, operations: OPS, operationId: 'op_zzzzzzzz' });
check('D1) un conflicto no se reintenta solo: una llamada, y el fallo con la revisión que hay', llamadas.length === 1 && !cas.ok && cas.fallo.currentRevision === 12);
check('D2) la revisión y el id del lote son los que se pidieron: el servicio no los cambia', llamadas[0].datos.expectedRevision === 11 && llamadas[0].datos.operationId === 'op_zzzzzzzz');
contestar = async () => ({ ...VISTA({ revision: 12 }), applied: 1, pending: {}, timelineChanged: false, operationId: 'op_zzzzzzzz', alreadyApplied: true });
const reintento = await svc.applyProductionOperations({ productionId: 'abcdefghijklmnopqrstuvwx', expectedRevision: 11, operations: OPS, operationId: 'op_zzzzzzzz' });
check('D3) un reintento que ya estaba aplicado se dice (`alreadyApplied`) y trae lo que hay', reintento.ok && reintento.valor.alreadyApplied
  && reintento.valor.produccion.revision === 12 && reintento.valor.pending.shots.length === 0);

/* Los ids que genera el cliente tienen la forma que el servidor exige. */
const ids = Array.from({ length: 200 }, () => [S.nuevoIdDeProduccion(), S.nuevoIdDeOperacion(), S.nuevoIdDeEscena(), S.nuevoIdDePlano()]);
check('D4) los ids de producción, de lote, de escena y de plano tienen la forma que el servidor exige',
  ids.every(([p, o, e, s]) => persistencia.FORMA_DE_ID_DE_PRODUCCION.test(p) && persistencia.FORMA_DE_ID_DE_OPERACION.test(o) && modelo.esId(e) && modelo.esId(s)));
check('D5) y no se repiten', new Set(ids.flat()).size === ids.length * 4);

/* ═══ E · LA FRONTERA ══════════════════════════════════════════════════════ */
console.log('\n── E · La frontera: nadie más habla con `productions` ──');
const app = archivosDeLaApp().map((r) => ({ r, s: leer(r) }));
const nombranLaCallable = app.filter((a) => /['"]productions['"]/.test(sinComentarios(a.s)) && /httpsCallable/.test(a.s)).map((a) => a.r);
check('E1) solo `services/filmmakerService.ts` llama a la callable `productions`', JSON.stringify(nombranLaCallable) === JSON.stringify(['services/filmmakerService.ts']),
  nombranLaCallable.join(', '));
const leenFirestore = app.filter((a) => /collection\(\s*db\s*,\s*['"](productions|productionScenes|productionRevisions)['"]|doc\(\s*db\s*,\s*['"](productions|productionScenes|productionRevisions)['"]/.test(a.s)).map((a) => a.r);
check('E2) nadie en la app lee ni escribe las colecciones de producciones en Firestore', leenFirestore.length === 0, leenFirestore.join(', '));
const deFilmmaker = app.filter((a) => /filmmaker|produccion|Production/i.test(a.r) && a.r !== 'services/filmmakerService.ts' && !a.r.startsWith('services/filmmaker/'));
const conFirebase = deFilmmaker.filter((a) => /from 'firebase\/|config\/firebase/.test(a.s)).map((a) => a.r);
check('E3) ni la pantalla, ni sus piezas, ni el reductor tocan Firebase: pasan por el servicio', conFirebase.length === 0, conFirebase.join(', ') || `${deFilmmaker.length} archivos`);
/* Quien usa el servicio de verdad —el valor, no sus tipos— es la capa que lleva la producción, no un componente suelto. */
const usanElServicio = app.filter((a) => /import \{[^}]*\bfilmmakerService\b[^}]*\} from '[^']*services\/filmmakerService'/.test(a.s)).map((a) => a.r);
check('E4) el servicio lo usan los hooks de la producción, no cada componente suelto',
  usanElServicio.length > 0 && usanElServicio.every((r) => /^hooks\//.test(r)), usanElServicio.join(', '));
check('E5) esta suite está en la cadena de `npm test`', /filmmaker-servicio\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Filmmaker F1-C: el servicio es la única frontera con productions (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
