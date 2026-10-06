/**
 * «CREAR MUNDO 3D» DE PUNTA A PUNTA, CONTRA FIRESTORE Y STORAGE DE VERDAD (misión mundo3d, FASES 3, 4, 5, 11 y 12).
 *
 * `mundo3d-asincrono.test.mjs` recorre el ciclo con un almacén en memoria. Aquí lo de Weë es TODO de verdad —la puerta
 * `generateWorld`, el contrato, la jurisdicción del Perfil Real, el Router, el conductor, el Gateway, el adaptador de
 * fal, el Job Engine, el almacén, la reconciliación, la parada, el materializador y el Credit Engine— y lo único de
 * mentira es fal: un servidor HTTP local que acepta, contesta estados, cancela y sirve el mundo y su vista previa.
 *
 *   no disponible (puerta cerrada, región, sin país) sin mover nada · cotizar · crear (ACEPTADO, sin esperar) ·
 *   el mismo requestId otra vez · otra petición con su requestId · trabajo lento · completado: un MUNDO con sus
 *   derechos, su nombre y su vista previa, y un cobro · aviso tardío · el mundo de otra cuenta · cancelar · el proveedor
 *   falla · la parada por plazo · el precio que cambió · un campo de un proveedor.
 *
 * NINGUNA petición sale de esta máquina: la cola de fal apunta a 127.0.0.1 y la prueba se niega a correr si no. La
 * clave es de mentira y no se imprime. El modelo de mundo se APRUEBA solo en memoria y solo en esta prueba (en EE. UU.):
 * los datos de verdad no cambian —Hunyuan World sigue DISABLED y en revisión, lo comprueba el final—. No está en
 * `npm test`: necesita los emuladores y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee-mundo \
 *     "node functions/test/mundo3d.emulator.mjs"
 */
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROY = process.env.GCLOUD_PROJECT || '';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  console.log('✘ sin los emuladores de Firestore y Storage no se corre'); process.exit(1);
}
if (!PROY.startsWith('demo-')) { console.log('✘ solo contra un proyecto de demostración'); process.exit(1); }

/* ── fal de mentira, en esta máquina ───────────────────────────────────── */
const MODELO = 'fal-ai/hunyuan_world/image-to-world';
const CLAVE = 'clave-de-prueba-que-no-es-real';
const tareas = new Map(); /* id → { status, falla?, cancelada? } */
const cuenta = { post: 0, estado: 0, resultado: 0, cancelar: 0, archivos: 0, ajenas: 0, conClave: true, sinDesvio: true, sinGuardar: true, fotoEnLinea: true, cuerpos: [] };
let serie = 0;
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const MUNDO = Buffer.concat([Buffer.from('MUNDO3D'), Buffer.alloc(2048, 3)]);
const servidor = http.createServer((req, res) => {
  const enviar = (codigo, cuerpo, tipo = 'application/json') => { res.writeHead(codigo, { 'content-type': tipo }); res.end(tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo); };
  const base = `http://127.0.0.1:${servidor.address().port}`;
  if (req.url.startsWith('/files/')) {
    cuenta.archivos++;
    return /vista\.png$/.test(req.url) ? enviar(200, PNG, 'image/png') : enviar(200, MUNDO, 'application/octet-stream');
  }
  /* Un «Storage» que no es el nuestro: si el servidor viniera a buscar aquí una foto, se cuenta (y no debe pasar nunca). */
  if (req.url.startsWith('/v0/b/')) { cuenta.ajenas++; return enviar(200, PNG, 'image/png'); }
  if (req.headers.authorization !== `Key ${CLAVE}`) cuenta.conClave = false;
  if (req.headers['x-app-fal-disable-fallback'] !== 'true') cuenta.sinDesvio = false;
  if (req.headers['x-fal-store-io'] !== '0') cuenta.sinGuardar = false;
  if (req.method === 'POST' && req.url === `/${MODELO}`) {
    cuenta.post++;
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      const b = JSON.parse(cuerpo || '{}');
      cuenta.cuerpos.push(b);
      if (!/^data:image\//.test(String(b.image_url))) cuenta.fotoEnLinea = false;
      const id = `req-emu-${String(++serie).padStart(4, '0')}`;
      tareas.set(id, { status: 'IN_QUEUE' });
      return enviar(200, { request_id: id, status_url: `${base}/${MODELO}/requests/${id}/status`, response_url: `${base}/${MODELO}/requests/${id}`, cancel_url: `${base}/${MODELO}/requests/${id}/cancel` });
    });
    return;
  }
  const m = req.url.match(new RegExp(`^/${MODELO}/requests/([A-Za-z0-9-]+)(/status|/cancel)?$`));
  const tarea = m && tareas.get(m[1]);
  if (!m || !tarea) return enviar(404, { detail: 'no existe' });
  if (m[2] === '/status') { cuenta.estado++; return enviar(200, { status: tarea.status }); }
  if (m[2] === '/cancel' && req.method === 'PUT') {
    cuenta.cancelar++;
    if (tarea.status === 'COMPLETED') return enviar(400, { status: 'ALREADY_COMPLETED' });
    tareas.set(m[1], { status: 'COMPLETED', cancelada: true });
    return enviar(202, { status: 'CANCELLATION_REQUESTED' });
  }
  cuenta.resultado++;
  if (tarea.cancelada) return enviar(400, { detail: 'Request was cancelled' });
  if (tarea.falla) return enviar(422, { detail: 'la generación falló' });
  return enviar(200, {
    world_file: { url: `${base}/files/${m[1]}/world.bin`, content_type: 'application/octet-stream', file_name: 'world.bin', file_size: MUNDO.length },
    preview_image: { url: `${base}/files/${m[1]}/vista.png`, content_type: 'image/png', file_name: 'vista.png', file_size: PNG.length },
  });
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
process.env.FAL_QUEUE_URL = `http://127.0.0.1:${servidor.address().port}`;
process.env.FAL_KEY = CLAVE;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.FAL_QUEUE_URL)) { console.log('✘ la cola de fal no apunta a esta máquina'); process.exit(1); }
const pasar = (id, status, extra = {}) => tareas.set(id, { ...tareas.get(id), ...extra, status });

/* ── Weë, de verdad ───────────────────────────────────────────────────── */
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: `${PROY}.appspot.com` });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));
const mundo = lib('creator/mundo.js');
const rt = lib('runtime/index.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const F = lib('engine/providers/fal.js');
const FM = lib('engine/providers/fal-modelos.js');
const HW = FM.HUNYUAN_WORLD_IMAGEN_A_MUNDO;

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };
const codigo = (r) => (r.ok ? (r.valor.status ?? r.valor.estado) : `${r.error.code} · ${r.error.details?.code ?? ''}${r.error.details?.reason ? ` · ${r.error.details.reason}` : ''}`);

const relojReal = Date.now.bind(Date);
let adelanto = 0;
Date.now = () => relojReal() + adelanto;

/*
 * EL MODELO APROBADO SOLO AQUÍ: la misma entrada del catálogo de fal, con la revisión legal aprobada para EE. UU., activo
 * y declarando además una vista previa (para probar el papel PREVIEW). SUSTITUYE a la de verdad en el catálogo del
 * adaptador —que es el mismo que lee el registro— con el mismo id, así que el mapeo de la entrada de Weë es el de verdad.
 * La entrada de verdad (congelada) no se toca: solo la lista en memoria de este proceso.
 */
const APROBADO = {
  ...HW,
  territorio: { ...HW.territorio, aprobadas: ['US'] },
  gobierno: {
    ...HW.gobierno, reviewStatus: 'APPROVED', active: 'ACTIVE',
    outputSchema: [...HW.gobierno.outputSchema, { nombre: 'preview_image', tipo: 'file', requerido: false, papel: 'preview' }],
  },
};
F.falAdapter.models.splice(F.falAdapter.models.findIndex((m) => m.id === HW.id), 1, APROBADO);

const marca = relojReal().toString(36);
const cuentaDe = (letra) => `emumundo${letra}${marca}`;
const PAISES = { A: 'US', B: 'US', C: 'US', D: 'US', E: 'US', P: 'US', S: 'ES', N: null, X: 'US' };
const SALDO = 5000;
for (const [letra, pais] of Object.entries(PAISES)) {
  const uid = cuentaDe(letra);
  await db.collection('users').doc(`doc_${uid}`).set({ uid, displayName: uid, ...(pais ? { country: pais } : {}) });
  await creditEngine.ensureAccount(uid);
  await db.collection('users').doc(`doc_${uid}`).update({ creditsBalance: SALDO });
}
/* La puerta, abierta SOLO para las cuentas de la prueba (X se queda fuera); fal, encendido en la configuración. */
await db.collection('aiSettings').doc('runtime').set({ habilitado: true, capacidades: ['world.generate'], cuentas: Object.keys(PAISES).filter((l) => l !== 'X').map(cuentaDe), experiencias: ['studio'] });
await db.collection('aiProviders').doc('fal').set({ enabled: true });
olvidarLaPuerta();

const bucket = admin.storage().bucket();
const foto = async (uid) => {
  const ruta = `users/${uid}/creator-inputs/plaza.png`;
  await bucket.file(ruta).save(PNG, { contentType: 'image/png', resumable: false });
  return `gs://${bucket.name}/${ruta}`;
};
const peticion = async (uid, extra = {}) => ({ contract: '1.0', modo: 'desde_imagen', imagen: { tipo: 'storage', url: await foto(uid) }, descripcion: 'Una plaza medieval abandonada', ...extra });
const llamar = (uid, data) => intento(() => mundo.generateWorld.run({ auth: { uid }, data }));
const uso = async (requestId) => (await db.collection('creditTransactions').doc(`usage_${requestId}`).get()).data();
const saldo = async (uid) => (await db.collection('users').doc(`doc_${uid}`).get()).get('creditsBalance');
const reembolsos = async (requestId) => (await db.collection('creditTransactions').where('requestId', '==', requestId).get()).docs.filter((d) => d.get('type') === 'refund');
const trabajo = (uid, requestId) => rt.trabajoDelMedioDeWee(db, uid, requestId);
/* El cupo del día (misión de gobernanza): cuántos mundos ocupan hueco hoy y en qué quedó cada operación. */
const HOY = new Date().toISOString().slice(0, 10);
const huecos = async (uid) => (await db.collection('aiRateLimits').doc(`${uid}_${HOY}`).get()).data() ?? {};
/* La operación del mundo en el cupo tiene nombre propio: la capacidad, «#» y el requestId. Su marca y lo que contó. */
const claveDelMundo = (requestId) => createHash('sha256').update(`world.generate#${requestId}`, 'utf8').digest('hex').slice(0, 32);
const enElCupo = async (uid, requestId) => (await huecos(uid)).operaciones?.[claveDelMundo(requestId)];
const cuentaEnElCupo = async (uid, requestId) => (await huecos(uid)).cuentas?.[claveDelMundo(requestId)];
const tareaDe = async (uid, requestId) => F.leerOperacion((await trabajo(uid, requestId))?.attempts?.[0]?.providerRef?.operationId)?.requestId;
const pasada = () => rt.mantenimientoDeWee({
  db,
  reconciliacion: () => rt.reconciliacionDeWee({ db, quietoDesdeMs: 0 })(),
  liquidacion: () => rt.barridoDeLiquidacionDeWee({ db })(),
})();

console.log('\n── No disponible, sin mover nada ──');
{
  const cerrada = await llamar(cuentaDe('X'), { op: 'cotizar', peticion: await peticion(cuentaDe('X')) });
  const region = await llamar(cuentaDe('S'), { op: 'crear', requestId: 'emu-mundo-S', creditosCotizados: 39, peticion: await peticion(cuentaDe('S')) });
  const sinPais = await llamar(cuentaDe('N'), { op: 'cotizar', peticion: await peticion(cuentaDe('N')) });
  check('puerta cerrada para la cuenta → «no disponible»; en España (bloqueada, aprobado en EE. UU.) → «no disponible en tu región»; sin país declarado → «falta tu país»',
    codigo(cerrada) === 'failed-precondition · NOT_AVAILABLE · no_disponible' && codigo(region) === 'failed-precondition · NOT_AVAILABLE · en_tu_region'
    && codigo(sinPais) === 'failed-precondition · NOT_AVAILABLE · falta_tu_pais', [cerrada, region, sinPais].map(codigo).join(' | '));
  check('…y ninguno movió nada: ni una reserva, ni un Credit, ni un POST, ni un nombre de proveedor en lo que llega a la app',
    !(await uso('emu-mundo-S')) && (await saldo(cuentaDe('S'))) === SALDO && cuenta.post === 0
    /* «falta_tu_pais» lleva «fal» dentro: se busca el nombre del proveedor como palabra, y el país como valor exacto. */
    && [cerrada, region, sinPais].every((r) => !/\bfal\b|fal[._-]ai|hunyuan|tencent/i.test(JSON.stringify(r.error?.details ?? {}))
      && !/"(ES|US)"/.test(JSON.stringify(r.error?.details ?? {}))));
}

console.log('\n── Cotizar y crear: aceptado, sin esperar ──');
const A = cuentaDe('A');
const cot = await llamar(A, { op: 'cotizar', peticion: await peticion(A) });
check('cotizar: el precio de la capacidad (Credits de prueba) sin reservar nada', cot.ok && cot.valor.status === 'QUOTED' && cot.valor.credits === 39 && !(await uso('emu-mundo-A')), codigo(cot));
const t0 = relojReal();
const rA = await llamar(A, { op: 'crear', requestId: 'emu-mundo-A', creditosCotizados: 39, peticion: await peticion(A) });
check('crear: UN POST a la cola de fal y la llamada contesta en el acto con el trabajo aceptado —el mundo se hace sin nadie esperando—',
  rA.ok && rA.valor.status === 'ACCEPTED' && rA.valor.estado === 'generando' && cuenta.post === 1 && relojReal() - t0 < 30_000, codigo(rA));
check('con su clave, SIN desvío a otro modelo, SIN que fal guarde nada, la foto EN LÍNEA y la entrada de Weë traducida (exterior → outdoor)',
  cuenta.conClave && cuenta.sinDesvio && cuenta.sinGuardar && cuenta.fotoEnLinea && cuenta.cuerpos[0]?.classes === 'outdoor'
  && Object.keys(cuenta.cuerpos[0] ?? {}).sort().join() === 'classes,image_url,labels_fg1,labels_fg2');
const jA = await trabajo(A, 'emu-mundo-A');
check('el trabajo espera en Firestore con la operación de fal (sin «/»), UN intento y 45 min de vida; la reserva, retenida',
  jA?.state === 'waiting' && jA.policy.retry.maxAttempts === 1 && jA.policy.maxLifetimeMs === 45 * 60_000
  && jA.attempts[0].providerRef?.providerId === 'fal' && !jA.attempts[0].providerRef.operationId.includes('/')
  && (await uso('emu-mundo-A'))?.status === 'AUTHORIZED' && (await saldo(A)) === SALDO - 39);
const est = await llamar(A, { op: 'estado', requestId: 'emu-mundo-A' });
check('el estado se pregunta por el requestId: «generando»', est.ok && est.valor.estado === 'generando', codigo(est));
const repetida = await llamar(A, { op: 'crear', requestId: 'emu-mundo-A', creditosCotizados: 39, peticion: await peticion(A) });
check('el MISMO requestId otra vez (un doble toque, otra pestaña): cuenta cómo va la misma creación, sin otro POST ni otro cobro',
  repetida.ok && repetida.valor.duplicate === true && repetida.valor.estado === 'generando' && cuenta.post === 1 && (await saldo(A)) === SALDO - 39, codigo(repetida));
const otra = await llamar(A, { op: 'crear', requestId: 'emu-mundo-A', creditosCotizados: 39, peticion: await peticion(A, { espacio: 'interior' }) });
check('y OTRA petición con ese requestId no se cuela: el Credit Engine la rechaza por su huella, sin POST', !otra.ok && cuenta.post === 1, codigo(otra));

console.log('\n── El proveedor tarda, y termina sin nadie esperando ──');
const tA = await tareaDe(A, 'emu-mundo-A');
pasar(tA, 'IN_PROGRESS');
await pasada();
check('trabajo lento: el barrido le pregunta de verdad a fal, oye «en marcha» y no toca nada',
  cuenta.estado >= 1 && (await trabajo(A, 'emu-mundo-A'))?.state === 'waiting' && (await uso('emu-mundo-A'))?.status === 'AUTHORIZED');
pasar(tA, 'COMPLETED');
await pasada();
const hecho = await trabajo(A, 'emu-mundo-A');
const assetId = hecho?.result?.outputRefs?.[0];
const ficha = assetId ? (await db.collection('assets').doc(assetId).get()).data() : undefined;
const variante = ficha?.variants?.find((v) => v.kind === 'preview');
const objetos = ficha ? await Promise.all([bucket.file(ficha.storageRef.objectKey).exists(), variante ? bucket.file(variante.storageRef.objectKey).exists() : [false]]) : [[false], [false]];
check('completado: el MUNDO está en Storage, con ficha de la cuenta `kind: world` y el nombre que le puso la persona',
  hecho?.state === 'completed' && ficha?.ownerAccountId === A && ficha?.kind === 'world' && ficha?.name === 'Una plaza medieval abandonada'
  && objetos[0][0] === true && ficha.storageRef.objectKey.startsWith(`users/${A}/`), `${hecho?.state} · ${ficha?.kind} · ${ficha?.name}`);
check('con los DERECHOS de su modelo en el material (Asset.derechos): su licencia y dónde no se puede usar ni mostrar',
  JSON.stringify(ficha?.derechos?.jurisdiccionesBloqueadas) === '["EU","GB","KR"]' && ficha?.derechos?.atribucion === true && ficha?.derechos?.licencias?.length === 2);
check('y su VISTA PREVIA como variante del mundo (no otro material), guardada en su carpeta', variante?.mimeType === 'image/png' && objetos[1][0] === true
  && variante.storageRef.objectKey.startsWith(`users/${A}/`) && (await db.collection('assets').where('ownerAccountId', '==', A).get()).size === 1);
check('se cobra lo reservado, UNA vez', (await uso('emu-mundo-A'))?.status === 'COMPLETED' && (await saldo(A)) === SALDO - 39 && (await reembolsos('emu-mundo-A')).length === 0);
check('un mundo que SALE ocupa su hueco del día, y el reintento con el mismo requestId no ocupó otro',
  (await huecos(A))['3d'] === 1 && (await enElCupo(A, 'emu-mundo-A')) === true && (await cuentaEnElCupo(A, 'emu-mundo-A'))?.['3d'] === 1
  && (await uso('emu-mundo-A'))?.meta?.quotaDay === HOY);
const fin = await llamar(A, { op: 'estado', requestId: 'emu-mundo-A' });
/* Los derechos que llegan a la app son los VISIBLES: sin las licencias, cuyo nombre y dirección nombran al modelo. */
check('el estado lo cuenta: completado, el mundo por su id, con vista previa y sus derechos visibles (ni URL, ni proveedor, ni modelo, ni licencias)',
  fin.ok && fin.valor.estado === 'completado' && fin.valor.mundo?.assetId === assetId && fin.valor.mundo.kind === 'world' && fin.valor.mundo.conVistaPrevia === true
  && fin.valor.mundo.derechos?.atribucion === true && JSON.stringify(fin.valor.mundo.derechos?.jurisdiccionesBloqueadas) === '["EU","GB","KR"]'
  && !('licencias' in (fin.valor.mundo.derechos ?? {})) && !('revision' in (fin.valor.mundo.derechos ?? {}))
  && !/\bfal\b|fal[._-]ai|hunyuan|tencent|https?:/i.test(JSON.stringify(fin.valor)), fin.ok ? JSON.stringify(fin.valor) : codigo(fin));
await pasada();
const tarde = await rt.atenderAviso(rt.atencionDeWee({ db }), F.leerAvisoDeFal({ request_id: tA, status: 'OK', payload: {} }, MODELO));
check('otra pasada y un aviso TARDÍO de fal: ni otro material, ni otro cobro', tarde.estado === 'repetido' && (await saldo(A)) === SALDO - 39
  && (await db.collection('assets').where('ownerAccountId', '==', A).get()).size === 1);
const ajeno = await llamar(cuentaDe('B'), { op: 'estado', requestId: 'emu-mundo-A' });
check('el mundo de otra cuenta no se encuentra: ni su estado, ni que exista', !ajeno.ok && ajeno.error.details?.reason === 'no_existe', codigo(ajeno));

console.log('\n── Cancelar ──');
const C = cuentaDe('C');
await llamar(C, { op: 'crear', requestId: 'emu-mundo-C', creditosCotizados: 39, peticion: await peticion(C) });
const cancelada = await llamar(C, { op: 'cancelar', requestId: 'emu-mundo-C' });
check('cancelar mientras fal lo tiene: «cancelando» y se le pide parar (un PUT a su cola)', cancelada.ok && cancelada.valor.estado === 'cancelando' && cuenta.cancelar === 1, codigo(cancelada));
await pasada();
check('su final (cancelado en fal) CONSUMA la parada: «cancelado» y la reserva vuelve exacta, una vez',
  (await trabajo(C, 'emu-mundo-C'))?.state === 'cancelled' && (await uso('emu-mundo-C'))?.status === 'REFUNDED' && (await saldo(C)) === SALDO
  && (await llamar(C, { op: 'estado', requestId: 'emu-mundo-C' })).valor?.estado === 'cancelado');
check('la persona canceló con el proveedor trabajando: el dinero volvió, pero su hueco del día se queda GASTADO',
  (await huecos(C))['3d'] === 1 && (await enElCupo(C, 'emu-mundo-C')) === 'consumida');

console.log('\n── El proveedor falla ──');
const D = cuentaDe('D');
await llamar(D, { op: 'crear', requestId: 'emu-mundo-D', creditosCotizados: 39, peticion: await peticion(D) });
pasar(await tareaDe(D, 'emu-mundo-D'), 'COMPLETED', { falla: true });
const postsAntes = cuenta.post;
await pasada(); await pasada();
check('fal termina con error: «fallido», sin un segundo POST, y la reserva vuelve EXACTA una sola vez aunque pasen dos barridos',
  (await trabajo(D, 'emu-mundo-D'))?.state === 'failed' && cuenta.post === postsAntes && (await reembolsos('emu-mundo-D')).length === 1 && (await saldo(D)) === SALDO);
check('un FALLO del proveedor no gasta ninguno de los cinco mundos del día: el hueco volvió con la reserva, una vez',
  (await huecos(D))['3d'] === 0 && (await enElCupo(D, 'emu-mundo-D')) === 'devuelta');

console.log('\n── La parada por plazo: Weë lo hace cumplir ──');
const E = cuentaDe('E');
await llamar(E, { op: 'crear', requestId: 'emu-mundo-E', creditosCotizados: 39, peticion: await peticion(E) });
pasar(await tareaDe(E, 'emu-mundo-E'), 'IN_PROGRESS');
const cancelacionesAntes = cuenta.cancelar;
adelanto += 31 * 60_000;
await pasada();
const pedidaPorPlazo = await trabajo(E, 'emu-mundo-E');
check('pasados los 30 min concedidos, el barrido oye «en marcha» y pide PARAR (fal no acepta que le digamos cuánto puede tardar)',
  pedidaPorPlazo?.state === 'cancel_requested' && cuenta.cancelar === cancelacionesAntes + 1, pedidaPorPlazo?.state);
await pasada();
adelanto -= 31 * 60_000;
check('y su final cierra la parada y devuelve lo retenido', (await trabajo(E, 'emu-mundo-E'))?.state === 'cancelled' && (await saldo(E)) === SALDO);
check('la parada la pidió Weë por PLAZO (no la persona): es un fallo técnico, y el hueco vuelve',
  (await huecos(E))['3d'] === 0 && (await enElCupo(E, 'emu-mundo-E')) === 'devuelta');

console.log('\n── Lo que no entra ──');
const P = cuentaDe('P');
const caro = await llamar(P, { op: 'crear', requestId: 'emu-mundo-P', creditosCotizados: 1, peticion: await peticion(P) });
const deFal = await llamar(P, { op: 'crear', requestId: 'emu-mundo-P2', creditosCotizados: 39, peticion: { ...(await peticion(P)), labels_fg1: 'faro' } });
const fotoAjena = await llamar(P, { op: 'crear', requestId: 'emu-mundo-P3', creditosCotizados: 39, peticion: await peticion(A) });
check('el precio que cambió, un campo de un proveedor o la foto de otra cuenta: INVALID_REQUEST con su motivo, sin reserva y sin POST',
  codigo(caro) === 'invalid-argument · INVALID_REQUEST · price_changed' && codigo(deFal) === 'invalid-argument · INVALID_REQUEST · campo_desconocido'
  && codigo(fotoAjena) === 'invalid-argument · INVALID_REQUEST · imagen_ajena' && !(await uso('emu-mundo-P')) && !(await uso('emu-mundo-P2')) && (await saldo(P)) === SALDO,
  [caro, deFal, fotoAjena].map(codigo).join(' | '));

/* Revisión de seguridad (2026-10-06): la ruta «correcta» con un host o un cubo ajenos. Antes, el lector de la foto caía a HTTP. */
const postsSinAjenas = cuenta.post;
const otroHost = `http://127.0.0.1:${servidor.address().port}/v0/b/otro-cubo/o/${encodeURIComponent(`users/${P}/creator-inputs/plaza.png`)}?alt=media`;
const hostAjeno = await llamar(P, { op: 'crear', requestId: 'emu-mundo-P4', creditosCotizados: 39, peticion: { ...(await peticion(P)), imagen: { tipo: 'storage', url: otroHost } } });
const cuboAjeno = await llamar(P, { op: 'crear', requestId: 'emu-mundo-P5', creditosCotizados: 39, peticion: { ...(await peticion(P)), imagen: { tipo: 'storage', url: `gs://otro-cubo/users/${P}/creator-inputs/plaza.png` } } });
check('una foto con la ruta de la cuenta pero de OTRO host o de OTRO cubo: «sube una foto», sin reserva, sin POST y sin que el servidor la vaya a buscar fuera',
  codigo(hostAjeno) === 'invalid-argument · INVALID_REQUEST · needs_image' && codigo(cuboAjeno) === 'invalid-argument · INVALID_REQUEST · needs_image'
  && cuenta.ajenas === 0 && cuenta.post === postsSinAjenas && !(await uso('emu-mundo-P4')) && !(await uso('emu-mundo-P5')) && (await saldo(P)) === SALDO,
  [hostAjeno, cuboAjeno].map(codigo).join(' | '));

/* Revisión de código (2026-10-06). */
console.log('\n── Lo que no se sabe, y lo que se quedó a medias ──');
{
  const postsAntesDeLasReservas = cuenta.post;
  const opRara = await llamar(P, { op: 'estados', requestId: 'emu-mundo-P6', creditosCotizados: 39, peticion: await peticion(P) });
  check('una operación que no existe no se toma por «crear»: INVALID_REQUEST, sin reserva y sin POST',
    codigo(opRara) === 'invalid-argument · INVALID_REQUEST · op_desconocida' && !(await uso('emu-mundo-P6')) && cuenta.post === postsAntesDeLasReservas, codigo(opRara));
  /* Lo que deja una invocación que muere después de reservar y antes de crear el trabajo: la reserva, sola. */
  await creditEngine.spendCredits({ userId: P, service: 'ai_world', amount: 39, requestId: 'emu-mundo-P7', reason: 'Weë Studio · mundo 3D', source: 'weë-studio', fingerprint: 'cafe'.repeat(16) });
  const reciente = await llamar(P, { op: 'estado', requestId: 'emu-mundo-P7' });
  await db.collection('creditTransactions').doc('usage_emu-mundo-P7').update({ createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - 3 * 60_000) });
  const vieja = await llamar(P, { op: 'estado', requestId: 'emu-mundo-P7' });
  check('una reserva SIN trabajo: «en cola» mientras se puede estar creando; pasado el plazo de la puerta, al PREGUNTAR se devuelve exacta y se cuenta como fallida',
    reciente.ok && reciente.valor.estado === 'en_cola' && vieja.ok && vieja.valor.estado === 'fallido'
    && (await uso('emu-mundo-P7'))?.status === 'REFUNDED' && (await saldo(P)) === SALDO, `${reciente.valor?.estado} → ${vieja.valor?.estado}`);
  const otraVez = await llamar(P, { op: 'estado', requestId: 'emu-mundo-P7' });
  check('y preguntar otra vez no devuelve nada más: fallida, una sola devolución', otraVez.ok && otraVez.valor.estado === 'fallido' && (await reembolsos('emu-mundo-P7')).length <= 1 && (await saldo(P)) === SALDO);
}

console.log('\n── La lista de cuentas y el cupo del día ──');
{
  const B = cuentaDe('B');
  const conPuerta = async (config) => { await db.collection('aiSettings').doc('runtime').set(config); olvidarLaPuerta(); };
  const LISTA = Object.keys(PAISES).filter((l) => l !== 'X').map(cuentaDe);
  await conPuerta({ habilitado: true, capacidades: ['world.generate'], experiencias: ['studio'] });
  const sinLista = await llamar(B, { op: 'cotizar', peticion: await peticion(B) });
  await conPuerta({ habilitado: true, capacidades: ['world.generate'], cuentas: [], experiencias: ['studio'] });
  const vacia = await llamar(B, { op: 'cotizar', peticion: await peticion(B) });
  await conPuerta({ habilitado: true, capacidades: ['world.generate'], cuentas: LISTA, experiencias: ['studio'] });
  const conLista = await llamar(B, { op: 'cotizar', peticion: await peticion(B) });
  check('la lista de cuentas es OBLIGATORIA: abierta sin lista, o con la lista vacía, «no disponible» para TODOS; con la lista, la cuenta nombrada cotiza',
    codigo(sinLista) === 'failed-precondition · NOT_AVAILABLE · no_disponible' && codigo(vacia) === 'failed-precondition · NOT_AVAILABLE · no_disponible'
    && conLista.ok && conLista.valor.status === 'QUOTED', [sinLista, vacia, conLista].map(codigo).join(' | '));

  /* Cinco mundos que salieron hoy (escritos como los deja el limitador): el sexto no cabe, y no toca ni un Credit. */
  await db.collection('aiRateLimits').doc(`${B}_${HOY}`).set({ userId: B, day: HOY, '3d': 5 });
  const postsAntesDelSexto = cuenta.post;
  const sexto = await llamar(B, { op: 'crear', requestId: 'emu-mundo-B6', creditosCotizados: 39, peticion: await peticion(B) });
  check('con cinco mundos hechos hoy, el sexto: RATE_LIMITED, sin reserva, sin un Credit y sin POST',
    codigo(sexto) === 'resource-exhausted · RATE_LIMITED' && !(await uso('emu-mundo-B6')) && (await saldo(B)) === SALDO && cuenta.post === postsAntesDelSexto,
    codigo(sexto));
  const cotizarSexto = await llamar(B, { op: 'cotizar', peticion: await peticion(B) });
  check('y ya al COTIZAR se dice que hoy no cabe otro (con la modalidad, para que la app diga «hoy ya no»), antes de enseñar un precio',
    codigo(cotizarSexto) === 'resource-exhausted · RATE_LIMITED' && cotizarSexto.error?.details?.modality === '3d', codigo(cotizarSexto));
}

console.log('\n── Y nada de esto cambió los datos de verdad ──');
check('Hunyuan World sigue DISABLED y en revisión legal en su catálogo: lo aprobado vivió solo en la memoria de esta prueba',
  HW.gobierno.active === 'DISABLED' && HW.gobierno.reviewStatus === 'REVIEW_REQUIRED' && HW.territorio.aprobadas.length === 0 && Object.isFrozen(HW));

servidor.close();
console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ «Crear mundo 3D» contra los emuladores: ${n}/${n}`);
process.exit(failures ? 1 : 0);
