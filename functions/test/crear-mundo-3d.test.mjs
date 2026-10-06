/**
 * «CREAR MUNDO 3D» — WEË STUDIO → 3D WORLD → CREAR MUNDO 3D, EN LA APP (`utils/crearMundo3D.ts`).
 *
 * El compositor de la experiencia, probado con el código de verdad y sin red:
 *
 *   A · Lo que se pide: la PETICIÓN CANÓNICA del contrato (`PeticionDeMundo3D`), leída por el mismo lector que el servidor.
 *   B · Lo que pone la persona: una foto suya, unas palabras y «abierto / cerrado / No sé»; validar como el servidor.
 *   C · Los errores, en claves: «no disponible» es neutro y dice su motivo público; el precio que cambió se vuelve a enseñar.
 *   D · El ciclo de vida: la máquina hace exactamente lo que dice su tabla, con en cola, parar y cancelado de verdad.
 *   E · De lo que contesta la puerta asíncrona (`generateWorld`) a los eventos.
 *   F · Del mundo a la escena: el núcleo 3D único, por id, idéntico al del servidor.
 *   G · Lo que se enseña: claves que existen, en los dieciséis diccionarios, sin frases propias.
 *   H · Fronteras: puro, sin proveedores, sin Credits, sin reloj, y en la cadena.
 *
 * Sin red, sin Firebase (doblado) y sin el compilado: se cargan las fuentes. $0.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/** Una sección que lanza no tumba la suite: su excepción es una comprobación fallida, con el motivo. */
const seccion = (letra, fn) => {
  try { fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ts = createRequire(path.resolve(RAIZ, 'package.json'))('typescript');

/* ── Firebase, doblado: nada de esto debe llamarse; solo hace falta para cargar los servicios y compararse con ellos ── */
const nada = () => { throw new Error('no se llama a Firebase'); };
const cargar = crearCargador({
  dobles: {
    'firebase/functions': { httpsCallable: nada },
    'firebase/firestore': new Proxy({}, { get: () => nada }),
    '../config/firebase': { db: {}, functions: {}, storage: {} },
    'react-native': { Platform: { OS: 'web', select: (o) => o.web ?? o.default } },
  },
});

const M = cargar('utils/crearMundo3D.ts');
const N3D = cargar('services/escena3d.ts');
const CONTRATO_SERVIDOR = cargar('functions/src/core/mundo3d.ts');
const NUCLEO_SERVIDOR = cargar('functions/src/core/escena3d.ts');
const CATALOGO_SERVIDOR = cargar('functions/src/core/registry/capabilities.ts');
const CREATOR = cargar('services/creatorService.ts');
const CREDITS = cargar('services/creditsService.ts');

const CUENTA = 'cuentaA1b2C3';
const enStorage = (ruta) => `https://firebasestorage.googleapis.com/v0/b/get-wee.firebasestorage.app/o/${encodeURIComponent(ruta)}?alt=media&token=t0k3n`;
const FOTO = enStorage(`users/${CUENTA}/creator-inputs/1700000000000-ab12cd.jpg`);
const ENTRADA = { imagen: { tipo: 'storage', url: FOTO }, descripcion: 'Un pueblo de pescadores al atardecer', espacio: null, projectId: null };
const CTX = { cuenta: CUENTA };
const ASSET = 'asset_0123456789abcdef0123456789abcdef';
const DERECHOS = { usoComercial: 'RESTRICTED', atribucion: true, jurisdiccionesBloqueadas: ['EU', 'GB', 'KR'] };

/** Lo que nunca puede verse en lo que se enseña: proveedores, modelos, jurisdicciones, escalones de elegibilidad. */
const DE_DENTRO = /\b(fal|hunyuan|tencent|gemini|seedance|seedream|flux|elevenlabs|deepseek|minimax|openai|anthropic|replicate|byteplus|bytedance)\b|BLOCKED|JURISDICTION|REVIEW_REQUIRED|APPROVED|ACTIVE\b|elegib|sin_modelo|jurisdic|labels_fg|export_drc|image_url|providerModel|"(ES|EU|GB|KR|US)"/i;

/* ═══ A · LA PETICIÓN CANÓNICA ═════════════════════════════════════════════ */
console.log('\n── A · Lo que se pide es la petición canónica de Weë, no la de un proveedor ──');
seccion('A', () => {
  const entrada = CATALOGO_SERVIDOR.CAPABILITY_CATALOG.find((c) => c.id === M.CAPACIDAD_DEL_MUNDO_3D);
  const espejo = N3D.CAPABILITY_CATALOG.find((c) => c.id === M.CAPACIDAD_DEL_MUNDO_3D);
  check('A1) la capacidad es `world.generate`, la del contrato y del catálogo del Core: enrutable, de imagen y texto a 3D, igual en el espejo',
    M.CAPACIDAD_DEL_MUNDO_3D === 'world.generate' && M.CAPACIDAD_DEL_MUNDO_3D === CONTRATO_SERVIDOR.CAPACIDAD_DE_MUNDO
    && entrada?.status === 'ROUTABLE' && iguales(entrada?.accepts, ['image', 'text']) && entrada?.produces === '3d' && iguales(entrada, espejo));
  const r = M.peticionDelMundo3D(ENTRADA, CUENTA);
  check('A2) la petición es la CANÓNICA del contrato: versión, modo, la foto de la persona y sus palabras, y NADA más',
    r.ok && iguales(Object.keys(r.peticion).sort(), ['contract', 'descripcion', 'imagen', 'modo']) && r.peticion.contract === '1.0'
    && r.peticion.modo === 'desde_imagen' && iguales(r.peticion.imagen, { tipo: 'storage', url: FOTO }) && r.peticion.descripcion === ENTRADA.descripcion
    && r.descripcionRecortada === false);
  check('A3) y es EXACTAMENTE lo que el lector del SERVIDOR lee de ella: la app nunca manda algo que la puerta rechace por su forma',
    r.ok && iguales(CONTRATO_SERVIDOR.leerPeticionDeMundo3D(JSON.parse(JSON.stringify(r.peticion)), CUENTA), { ok: true, peticion: r.peticion }));
  const claves = (o, acc = []) => { for (const [k, v] of Object.entries(o)) { acc.push(k); if (v && typeof v === 'object') claves(v, acc); } return acc; };
  const PROHIBIDOS = ['labels_fg1', 'labels_fg2', 'classes', 'export_drc', 'image_url', 'prompt', 'model', 'modelId', 'provider', 'quality', 'jurisdicciones', 'endpoint', 'seed', 'capacidad'];
  const conMaterial = M.peticionDelMundo3D({ imagen: { tipo: 'material', assetId: ASSET }, descripcion: '', espacio: 'interior', projectId: 'proyecto_7' }, CUENTA);
  check('A4) ni un campo de un proveedor ni de la ruta: ni etiquetas de escena, ni prompt, ni modelo, ni calidad, ni jurisdicción',
    [r, conMaterial].every((x) => x.ok && claves(x.peticion).every((k) => !PROHIBIDOS.includes(k))), claves(r.peticion).join(', '));
  check('A5) un material viaja por su id, el espacio elegido y el proyecto, si los hay; sin palabras, no se inventan',
    conMaterial.ok && iguales(conMaterial.peticion, { contract: '1.0', modo: 'desde_imagen', imagen: { tipo: 'material', assetId: ASSET }, espacio: 'interior', projectId: 'proyecto_7' }));
  check('A6) «🤷 No sé» no viaja: sin espacio, lo decide Weë en el servidor (`ESPACIO_POR_DEFECTO`)',
    r.ok && !('espacio' in r.peticion) && CONTRATO_SERVIDOR.entradaDeMundo3D(r.peticion, FOTO).espacio === CONTRATO_SERVIDOR.ESPACIO_POR_DEFECTO);
  const larga = `${'a'.repeat(299)}😀 y más`;
  const recortada = M.peticionDelMundo3D({ ...ENTRADA, descripcion: `   ${larga}   ` }, CUENTA);
  check(`A7) las palabras viajan hasta el límite del contrato (${CONTRATO_SERVIDOR.MAX_LARGO_DE_LA_DESCRIPCION}), sin partir un emoji, y se dice si se recortaron`,
    CONTRATO_SERVIDOR.MAX_LARGO_DE_LA_DESCRIPCION === 300 && recortada.ok && recortada.peticion.descripcion === 'a'.repeat(299) && recortada.descripcionRecortada === true
    && M.peticionDelMundo3D({ ...ENTRADA, descripcion: `${'b'.repeat(298)}😀` }, CUENTA).peticion.descripcion.length === 300);
  check('A8) la petición sale congelada: un reintento no puede mandar otra cosa', Object.isFrozen(r.peticion) && Object.isFrozen(r.peticion.imagen));
  check('A9) las palabras que VIAJAN, para enseñarlas: recortadas igual que en la petición, sin partir un emoji',
    M.palabrasQueViajan({ ...ENTRADA, descripcion: `   ${larga}   ` }) === recortada.peticion.descripcion && M.palabrasQueViajan({ ...ENTRADA, descripcion: '  hola  ' }) === 'hola'
    && M.palabrasQueViajan(M.ENTRADA_VACIA) === '');
});

/* ═══ B · LO QUE PONE LA PERSONA ═══════════════════════════════════════════ */
console.log('\n── B · Una foto suya, de Weë; validar antes de enviar, con la regla del servidor ──');
seccion('B', () => {
  const motivos = (entrada) => M.validarEntradaDelMundo3D(entrada, CUENTA).map((p) => p.motivo);
  check('B1) una foto de su carpeta del Storage de Weë sirve; sin foto, no', iguales(motivos(ENTRADA), []) && iguales(motivos({ ...ENTRADA, imagen: null }), ['falta_imagen']));
  const CASOS = [
    ['una foto de otra cuenta', { tipo: 'storage', url: enStorage('users/otraCuenta/creator-inputs/x.jpg') }, 'imagen_ajena'],
    ['una foto fuera de una carpeta de persona', { tipo: 'storage', url: enStorage('public/x.jpg') }, 'imagen_ajena'],
    ['una dirección de internet cualquiera', { tipo: 'storage', url: 'https://ejemplo.com/foto.jpg' }, 'imagen_sin_subir'],
    ['una foto del teléfono sin subir', { tipo: 'storage', url: 'file:///storage/emulated/0/DCIM/x.jpg' }, 'imagen_sin_subir'],
    ['un blob del navegador', { tipo: 'storage', url: 'blob:http://localhost:8081/1234' }, 'imagen_sin_subir'],
    ['una imagen en línea', { tipo: 'storage', url: 'data:image/png;base64,AAAA' }, 'imagen_sin_subir'],
    ['una dirección de más de 2000 caracteres', { tipo: 'storage', url: enStorage(`users/${CUENTA}/creator-inputs/${'x'.repeat(2000)}.jpg`) }, 'imagen_sin_subir'],
    ['un material con un id que no es un id', { tipo: 'material', assetId: 'https://cdn.ejemplo/x.png' }, 'material_no_valido'],
    ['un tipo de fuente inventado', { tipo: 'url', url: FOTO }, 'falta_imagen'],
  ];
  const mal = CASOS.filter(([, imagen, esperado]) => !iguales(motivos({ ...ENTRADA, imagen }), [esperado])).map(([nombre]) => nombre);
  check(`B2) ${CASOS.length} fotos que no sirven, cada una con el motivo del contrato`, mal.length === 0, mal.join(', '));
  check('B3) sirven también la forma gs:// , la del emulador y la de Cloud Storage, y un material suyo',
    [`gs://get-wee.firebasestorage.app/users/${CUENTA}/creator-inputs/x.jpg`, `http://127.0.0.1:9199/v0/b/demo-wee/o/users%2F${CUENTA}%2Fai-generations%2Fx.png?alt=media`,
      `https://storage.googleapis.com/get-wee/users/${CUENTA}/ai-generations/x.png`].every((url) => motivos({ ...ENTRADA, imagen: { tipo: 'storage', url } }).length === 0)
    && motivos({ ...ENTRADA, imagen: { tipo: 'material', assetId: ASSET } }).length === 0);
  check('B4) un proyecto con un id que el núcleo 3D no admite se dice antes de crear nada; un espacio inventado, también',
    iguales(motivos({ ...ENTRADA, projectId: 'mi proyecto/1' }), ['proyecto_no_valido']) && iguales(motivos({ ...ENTRADA, projectId: 'Abc123XyZ' }), [])
    && iguales(motivos({ ...ENTRADA, espacio: 'playa' }), ['espacio_no_valido']) && iguales(motivos({ ...ENTRADA, espacio: 'exterior' }), []));
  check('B5) sin cuenta no hay carpeta propia: ninguna foto es suya', iguales(M.validarEntradaDelMundo3D(ENTRADA, '').map((p) => p.motivo), ['imagen_ajena']));
  check('B6) cada problema lleva su campo y su clave; para la foto es siempre la misma frase accionable: subir una foto a Weë',
    CASOS.every(([, imagen]) => M.validarEntradaDelMundo3D({ ...ENTRADA, imagen }, CUENTA).every((p) => p.clave === 'weeai.uploadToWork' && p.campo === 'imagen'))
    && M.validarEntradaDelMundo3D({ ...ENTRADA, projectId: '/' }, CUENTA)[0].clave === 'weeai.couldNotSaveToProject');
  /* La dirección se lee como la lee el motor: su `parseStorageUrl`, extraído de su fuente y comparado caso a caso con el contrato. */
  const fuente = leer('functions/src/engine/http.ts');
  const inicio = fuente.indexOf('export function parseStorageUrl');
  const fin = fuente.indexOf('\n}\n', inicio) + 3;
  const js = ts.transpileModule(fuente.slice(inicio, fin).replace('export function', 'function'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const delServidor = new Function(`${js}; return parseStorageUrl;`)();
  const DIRECCIONES = [
    FOTO, enStorage('users/otra/x.png'), enStorage(`users/${CUENTA}/../otra/x.png`), `gs://b/users/${CUENTA}/x.jpg`, 'gs://b/',
    `http://localhost:9199/v0/b/demo/o/users%2F${CUENTA}%2Fx.png`, `https://storage.googleapis.com/b/users/${CUENTA}/x%20y.png`,
    'https://storage.googleapis.com/b/', 'https://ejemplo.com/v0/b/x/o/', 'https://ejemplo.com/foto.jpg', 'file:///x.jpg', 'blob:x', 'data:image/png;base64,AA',
    'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fx%E0%A4%A.png',
  ];
  const como = (f, url) => { try { return f(url); } catch { return null; } };
  const distintas = DIRECCIONES.filter((url) => !iguales(como(delServidor, url), N3D.rutaEnElStorageDeWee(url)));
  check(`B7) la dirección se lee EXACTAMENTE como en el motor (${DIRECCIONES.length} formas, también las rotas), con el lector del contrato`,
    inicio > 0 && distintas.length === 0, distintas.join(' | '));
});

/* ═══ C · LOS ERRORES, EN CLAVES ═══════════════════════════════════════════ */
console.log('\n── C · Los errores, en claves: «no disponible» es neutro ──');
const err = (code, details, message = 'Ahora mismo no hay una IA disponible para esto. Inténtalo más tarde.') => ({ code: `functions/${code}`, message, details });
/* Un servidor de ANTES (con los escalones, el proveedor y «inténtalo más tarde»): lo que traiga de dentro no pasa. */
const NO_ELEGIBLE = err('failed-precondition', { code: 'NOT_AVAILABLE', capability: 'world.generate', reason: 'sin_modelo_elegible', elegibilidad: ['BLOCKED_FOR_JURISDICTION', 'JURISDICTION_UNKNOWN'], provider: 'fal' });
const noDisponible = (reason) => err('failed-precondition', { code: 'NOT_AVAILABLE', reason }, 'Esta función no está disponible.');
const ERRORES = [
  ['no disponible en la región', noDisponible('en_tu_region'), 'no_disponible', 'weeai.errNotAvailableRegion', false],
  ['falta el país de la cuenta', noDisponible('falta_tu_pais'), 'no_disponible', 'weeai.errNotAvailableCountry', false],
  ['no con estas opciones', noDisponible('con_estas_opciones'), 'no_disponible', 'weeai.errNotAvailableOptions', false],
  ['no disponible, sin más', noDisponible('no_disponible'), 'no_disponible', 'weeai.errNotAvailable', false],
  ['ahora no (pasajero): esto sí se reintenta', noDisponible('ahora_no'), 'reintentable', 'weeai.errNotAvailableNow', true],
  ['un servidor de antes (escalones y proveedor en los detalles)', NO_ELEGIBLE, 'no_disponible', 'weeai.errNotAvailable', false],
  ['sin motivo', err('failed-precondition', { code: 'NOT_AVAILABLE' }), 'no_disponible', 'weeai.errNotAvailable', false],
  ['el SDK nativo deja los detalles en customData', { code: 'functions/failed-precondition', message: 'x', customData: { details: { code: 'NOT_AVAILABLE', reason: 'en_tu_region' } } }, 'no_disponible', 'weeai.errNotAvailableRegion', false],
  ['sin Credits', err('resource-exhausted', { code: 'INSUFFICIENT_CREDITS', required: 39, available: 12 }, 'INSUFFICIENT_CREDITS'), 'sin_credits', 'weeai.errNotEnoughCredits', false],
  ['el precio cambió', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'price_changed', credits: 45 }), 'precio_cambiado', 'studio.worldPriceChanged', false],
  ['el precio cambió, sin un precio que se pueda enseñar', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'price_changed', credits: 'mucho' }), 'reintentable', 'weeai.errGeneric', true],
  ['falta la foto', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'needs_image' }), 'entrada', 'weeai.uploadToWork', false],
  ['la foto no es de Weë', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'bad_image_url' }), 'entrada', 'weeai.uploadToWork', false],
  ['la foto es de otra cuenta (motivo del contrato)', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'imagen_ajena', field: 'imagen' }), 'entrada', 'weeai.uploadToWork', false],
  ['la foto se rechazó', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'input_rejected' }), 'entrada', 'motor.inputRejected', false],
  ['un campo que el contrato no tiene', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'campo_desconocido', field: 'labels_fg1' }), 'entrada', 'motor.invalidRequest', false],
  ['falta algo', err('invalid-argument', { code: 'INVALID_REQUEST' }), 'entrada', 'motor.invalidRequest', false],
  ['sin sesión', err('unauthenticated', { code: 'UNAUTHORIZED' }), 'sesion', 'weeai.errSignIn', false],
  ['sin sesión, sin código', { code: 'functions/unauthenticated', message: 'x' }, 'sesion', 'weeai.errSignIn', false],
  ['sin perfil', err('failed-precondition', { code: 'ACCOUNT_NOT_FOUND' }), 'sesion', 'weeai.errNoAccount', false],
  ['ya en marcha', err('already-exists', { code: 'DUPLICATE_REQUEST' }), 'duplicado', 'weeai.errDuplicate', false],
  ['demasiadas seguidas', err('resource-exhausted', { code: 'RATE_LIMITED' }), 'reintentable', 'weeai.errRateLimited', true],
  /* Misión de gobernanza (2026-10-06): el cupo de mundos es del DÍA; reintentar en un momento no sirve, y se dice. */
  ['el cupo de mundos del día', err('resource-exhausted', { code: 'RATE_LIMITED', modality: '3d', limit: 5, used: 5 }), 'cupo_del_dia', 'studio.worldDailyLimit', false],
  ['el intento anterior se quedó sin tiempo', err('deadline-exceeded', { code: 'TIMEOUT' }), 'reintentable', 'weeai.errTimeout', true],
  ['el proveedor falló', err('unavailable', { code: 'PROVIDER_ERROR', provider: 'fal', retryable: true }), 'reintentable', 'weeai.errGeneric', true],
  ['no se terminó', err('aborted', { code: 'GENERATION_FAILED' }), 'reintentable', 'weeai.errGeneric', true],
  ['sin conexión', { code: 'functions/unavailable', message: 'x' }, 'sin_conexion', 'weeai.errOffline', true],
  ['sin red, la callable dice internal', { code: 'functions/internal', message: 'internal' }, 'sin_conexion', 'weeai.errOffline', true],
  /* La FRASE no se lee nunca: un error suelto sin código es «algo salió mal», diga lo que diga su mensaje. */
  ['un error suelto, sin código', { message: 'Failed to fetch' }, 'desconocido', 'weeai.errGeneric', true],
  ['algo raro', { message: 'x' }, 'desconocido', 'weeai.errGeneric', true],
];
/** Un error de la tabla por su nombre, no por su posición: la tabla crece. */
const errorLlamado = (nombre) => ERRORES.find(([nombre2]) => nombre2 === nombre)[1];
seccion('C', () => {
  const mal = ERRORES.filter(([, e, tipo, clave, reintentable]) => {
    const r = M.errorDelMundo3D(e);
    return !r || r.tipo !== tipo || r.clave !== clave || r.reintentable !== reintentable;
  }).map(([nombre]) => nombre);
  check(`C1) ${ERRORES.length} errores del servidor y de la red, cada uno con su tipo, su clave y si tiene sentido reintentar`, mal.length === 0, mal.join(', '));
  check('C2) cansarse de esperar en la app no es un error: lo pedido puede existir y se pregunta por su estado',
    M.errorDelMundo3D({ code: 'functions/deadline-exceeded', message: 'deadline-exceeded' }) === null);
  check('C3) sin Credits trae cuánto hacía falta y cuánto había; el precio que cambió trae el precio nuevo',
    iguales(M.errorDelMundo3D(errorLlamado('sin Credits')).faltan, { required: 39, available: 12 }) && M.errorDelMundo3D(errorLlamado('el precio cambió')).creditos === 45);
  const r = M.errorDelMundo3D(NO_ELEGIBLE);
  check('C4) «no disponible» no deja pasar NADA de dentro: ni escalones, ni jurisdicciones, ni proveedor, ni la frase de «inténtalo más tarde»',
    !DE_DENTRO.test(JSON.stringify(r)) && !/Inténtalo más tarde/.test(JSON.stringify(r)), JSON.stringify(r));
  check('C5) CONTROL: el detector sí ve lo que no puede salir',
    DE_DENTRO.test(JSON.stringify(NO_ELEGIBLE.details)) && DE_DENTRO.test('"ES"') && !DE_DENTRO.test(JSON.stringify({ clave: 'motor.notAvailable' })));
  /* Lo que se lee del error es lo mismo que leen los servicios de siempre: no hay una segunda forma de leerlo. */
  const TODOS = [...ERRORES.map(([, e]) => e), { code: 'functions/deadline-exceeded', message: 'x' }, { code: 'functions/deadline-exceeded', message: 'x', details: { code: 'TIMEOUT' } }, null, undefined, 'texto'];
  const distintos = TODOS.filter((e) => M.leerErrorDelServidor(e).codigo !== CREATOR.creatorErrorCode(e)
    || (M.errorDelMundo3D(e) === null) !== CREATOR.isClientTimeout(e)
    || (M.errorDelMundo3D(e)?.tipo === 'sin_credits') !== (CREDITS.creditsShortfall(e) !== null));
  check(`C6) el código, el tiempo agotado en la app y la falta de Credits se leen como \`creatorErrorCode\`, \`isClientTimeout\` y \`creditsShortfall\` (${TODOS.length} formas)`,
    distintos.length === 0, distintos.map((e) => JSON.stringify(e)).join(' | '));
  check('C7) y los motivos de «no disponible» que entiende la app son EXACTAMENTE los que el motor manda (`MOTIVOS_DE_NO_DISPONIBLE`)',
    iguales(Object.keys(cargar('utils/noDisponible.ts').CLAVE_DE_NO_DISPONIBLE).sort(), [...createRequire(import.meta.url)(path.resolve(RAIZ, 'functions/lib/engine/errors.js')).MOTIVOS_DE_NO_DISPONIBLE].sort()));
  /* Revisión de código (2026-10-06): qué errores NO dicen cómo acabó una creación. */
  const inciertos = ERRORES.filter(([, e]) => M.esDesenlaceIncierto(M.errorDelMundo3D(e))).map(([nombre]) => nombre).sort();
  check('C7b) inciertos —se pregunta por ESA petición y se reintenta con el MISMO id—: la red, sin código, el fallo genérico del motor y el tiempo agotado en la app; los demás son ciertos (no se reservó o se devolvió)',
    iguales(inciertos, ['algo raro', 'el precio cambió, sin un precio que se pueda enseñar', 'el proveedor falló', 'no se terminó', 'sin conexión', 'sin red, la callable dice internal', 'un error suelto, sin código'].sort())
    && M.esDesenlaceIncierto(null) === true && M.esDesenlaceIncierto(M.errorDelMundo3D(errorLlamado('sin Credits'))) === false
    && M.esDesenlaceIncierto(M.errorDelMundo3D(noDisponible('ahora_no'))) === false && M.esDesenlaceIncierto(M.errorDelMundo3D(errorLlamado('el intento anterior se quedó sin tiempo'))) === false,
    inciertos.join(' | '));
  check('C8) el precio que cambió es el que dice la puerta: `price_changed` con `credits`, antes de reservar nada',
    /throw new EngineError\('INVALID_REQUEST', undefined, \{ reason: 'price_changed', credits: p\.credits \}\)/.test(leer('functions/src/creator/mundo.ts')));
});

/* ═══ D · EL CICLO DE VIDA ═════════════════════════════════════════════════ */
console.log('\n── D · La máquina hace lo que dice su tabla ──');
const MUNDO_DE_LA_PUERTA = { assetId: ASSET, kind: 'world', conVistaPrevia: true, derechos: DERECHOS };
const ev = {
  editarBien: { tipo: 'editar', entrada: ENTRADA },
  editarVacia: { tipo: 'editar', entrada: M.ENTRADA_VACIA },
  enviar: { tipo: 'enviar' },
  presupuesto: { tipo: 'presupuesto', creditos: 39 },
  confirmar: { tipo: 'confirmar' },
  enCola: { tipo: 'trabajo', estado: 'en_cola' },
  generando: { tipo: 'trabajo', estado: 'generando' },
  cancelando: { tipo: 'trabajo', estado: 'cancelando' },
  completado: { tipo: 'trabajo', estado: 'completado', mundo: MUNDO_DE_LA_PUERTA },
  completadoSinMundo: { tipo: 'trabajo', estado: 'completado' },
  fallidoDelTrabajo: { tipo: 'trabajo', estado: 'fallido' },
  cancelado: { tipo: 'trabajo', estado: 'cancelado' },
  noDisponible: { tipo: 'fallo', error: M.errorDelMundo3D(noDisponible('en_tu_region')) },
  sinCredits: { tipo: 'fallo', error: M.errorDelMundo3D(errorLlamado('sin Credits')) },
  reintentable: { tipo: 'fallo', error: M.errorDelMundo3D(errorLlamado('demasiadas seguidas')) },
  duplicado: { tipo: 'fallo', error: M.errorDelMundo3D(errorLlamado('ya en marcha')) },
  precioCambiado: { tipo: 'fallo', error: M.errorDelMundo3D(errorLlamado('el precio cambió')) },
  reintentar: { tipo: 'reintentar' },
  empezar: { tipo: 'empezar_de_nuevo' },
};
const avanzar = (estado, ...eventos) => eventos.reduce((e, x) => M.avanzar(e, x, CTX), estado);
const enviado = avanzar(M.ESTADO_INICIAL, ev.editarBien, ev.enviar);
const creando = avanzar(enviado, ev.presupuesto, ev.confirmar);
seccion('D', () => {
  const FASES = Object.keys(M.TRANSICIONES_DEL_MUNDO_3D);
  check('D1) doce fases, y ahora SÍ «en cola», «parando» y «cancelado»: la puerta asíncrona los sabe decir de verdad (y no hay pasos)',
    FASES.length === 12 && ['en_cola', 'cancelando', 'cancelado'].every((f) => FASES.includes(f)) && !FASES.includes('preguntando'));
  /* Un estado de cada fase, para probar cada evento en cada una. */
  const UNO_POR_FASE = {
    quieto: M.ESTADO_INICIAL,
    entrada_invalida: avanzar(M.ESTADO_INICIAL, ev.enviar),
    enviando: enviado,
    presupuestado: avanzar(enviado, ev.presupuesto),
    creando,
    en_cola: avanzar(creando, ev.enCola),
    generando: avanzar(creando, ev.generando),
    cancelando: avanzar(creando, ev.generando, ev.cancelando),
    completado: avanzar(creando, ev.completado),
    fallido: avanzar(creando, ev.reintentable),
    cancelado: avanzar(creando, ev.generando, ev.cancelando, ev.cancelado),
    no_disponible: avanzar(creando, ev.noDisponible),
  };
  const saltos = [];
  for (const [fase, estado] of Object.entries(UNO_POR_FASE)) {
    for (const [nombre, x] of Object.entries(ev)) {
      const despues = M.avanzar(estado, x, CTX);
      if (despues !== estado && !M.TRANSICIONES_DEL_MUNDO_3D[fase].includes(despues.fase)) saltos.push(`${fase} --${nombre}--> ${despues.fase}`);
    }
  }
  check(`D2) ningún evento, en ninguna fase, da un salto que no esté en la tabla (${Object.keys(UNO_POR_FASE).length} × ${Object.keys(ev).length})`, saltos.length === 0, saltos.join(' | '));
  check('D3) y desde el principio se llega a las doce fases', iguales(Object.entries(UNO_POR_FASE).filter(([f, e]) => e.fase !== f).map(([f]) => f), []));
  const fin = avanzar(creando, ev.generando, ev.completado);
  check('D4) poner → enviar → precio → confirmar → generando → completado, con el precio del servidor y el mundo POR ID con sus derechos visibles',
    fin.fase === 'completado' && fin.creditos === 39 && iguales(fin.mundo, { assetId: ASSET, conVistaPrevia: true, derechos: DERECHOS }) && fin.error === null);
  const sinFoto = avanzar(M.ESTADO_INICIAL, ev.enviar);
  check('D5) enviar sin foto no envía: dice qué falta, y al corregirlo se puede enviar',
    sinFoto.fase === 'entrada_invalida' && sinFoto.problemas[0].motivo === 'falta_imagen' && avanzar(sinFoto, ev.editarBien, ev.enviar).fase === 'enviando');
  const enCamino = ['enviando', 'creando', 'en_cola', 'generando', 'cancelando'].map((f) => UNO_POR_FASE[f]);
  check('D6) mientras algo está en camino, editar, empezar de nuevo, volver a enviar o confirmar no hacen nada (mismo objeto)',
    enCamino.every((e) => [ev.editarVacia, ev.empezar, ev.enviar, ev.confirmar].every((x) => M.avanzar(e, x, CTX) === e)));
  check('D7) un precio que no es un número entero de Credits no es un precio: se ignora',
    [1.5, -1, NaN, Infinity].every((c) => M.avanzar(enviado, { tipo: 'presupuesto', creditos: c }, CTX) === enviado));
  check('D8) las respuestas que llegan tarde no hacen retroceder: ni «en cola» después de «generando», ni «generando» después de pedir parar, ni nada después de un final',
    M.avanzar(UNO_POR_FASE.generando, ev.enCola, CTX) === UNO_POR_FASE.generando && M.avanzar(UNO_POR_FASE.cancelando, ev.generando, CTX) === UNO_POR_FASE.cancelando
    && M.avanzar(UNO_POR_FASE.completado, ev.fallidoDelTrabajo, CTX) === UNO_POR_FASE.completado && M.avanzar(UNO_POR_FASE.cancelado, ev.completado, CTX) === UNO_POR_FASE.cancelado);
  const parado = avanzar(creando, ev.generando, ev.cancelando, ev.cancelado);
  const ganaElMundo = avanzar(creando, ev.generando, ev.cancelando, ev.completado);
  check('D9) parar: «parando» hasta que la puerta lo confirma; cancelado, sin error. Y si el mundo llega antes, gana el mundo',
    UNO_POR_FASE.cancelando.fase === 'cancelando' && parado.fase === 'cancelado' && parado.error === null && ganaElMundo.fase === 'completado' && ganaElMundo.mundo?.assetId === ASSET);
  const fallo = avanzar(creando, ev.generando, ev.fallidoDelTrabajo);
  check('D10) un trabajo que falla en el servidor: «no me salió, no te cobré», y tiene sentido reintentar',
    fallo.fase === 'fallido' && fallo.error.clave === 'weeai.itDidNotWork' && fallo.error.reintentable === true);
  const nuevoPrecio = avanzar(creando, ev.precioCambiado);
  check('D11) si el precio cambió al crear, se vuelve a enseñar el NUEVO (y se avisa); no se crea nada hasta confirmar otra vez',
    nuevoPrecio.fase === 'presupuestado' && nuevoPrecio.creditos === 45 && nuevoPrecio.precioCambiado === true && avanzar(nuevoPrecio, ev.confirmar).fase === 'creando');
  check('D12) «ya está en marcha» al crear no es un fallo: es la misma creación, que espera', avanzar(creando, ev.duplicado).fase === 'en_cola');
  check('D13) con el trabajo aceptado, un error al PREGUNTAR no es un desenlace: el trabajo sigue en el servidor',
    ['en_cola', 'generando', 'cancelando'].every((f) => M.avanzar(UNO_POR_FASE[f], ev.reintentable, CTX) === UNO_POR_FASE[f]
      && M.avanzar(UNO_POR_FASE[f], ev.noDisponible, CTX) === UNO_POR_FASE[f]));
  check('D14) «no disponible» es una fase propia, sin reintento: reintentar no hace nada, y solo se puede volver',
    UNO_POR_FASE.no_disponible.fase === 'no_disponible' && M.avanzar(UNO_POR_FASE.no_disponible, ev.reintentar, CTX) === UNO_POR_FASE.no_disponible
    && avanzar(enviado, ev.noDisponible).fase === 'no_disponible');
  const reintento = avanzar(UNO_POR_FASE.fallido, ev.reintentar);
  check('D15) reintentar vuelve a pedir EXACTAMENTE lo mismo y el precio se vuelve a enseñar antes de cobrar',
    reintento.fase === 'enviando' && reintento.peticion === UNO_POR_FASE.fallido.peticion && reintento.creditos === null && reintento.error === null);
  check('D16) sin Credits no se reintenta solo: se consiguen Credits o se cambia algo',
    M.avanzar(avanzar(creando, ev.sinCredits), ev.reintentar, CTX).fase === 'fallido');
  const congelar = (o) => { Object.freeze(o); for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) congelar(v); return o; };
  const intactos = Object.values(UNO_POR_FASE).map((e) => congelar(JSON.parse(JSON.stringify(e))));
  let muta = false;
  try { for (const e of intactos) for (const x of Object.values(ev)) M.avanzar(e, x, CTX); } catch { muta = true; }
  check('D17) la máquina no muta lo que recibe: el estado de partida sale intacto de todos los eventos', !muta);
  /* Los estados de la experiencia, con los nombres del dueño. */
  const NOMBRES = ['IDLE', 'INPUT', 'SUBMITTING', 'QUEUED', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED', 'NOT_AVAILABLE'];
  const vistos = new Set([M.estadoDeLaExperiencia(M.ESTADO_INICIAL), ...Object.values(UNO_POR_FASE).map(M.estadoDeLaExperiencia)]);
  check('D18) los nueve estados del dueño: IDLE, INPUT, SUBMITTING, QUEUED, GENERATING, COMPLETED, FAILED, CANCELLED y NOT_AVAILABLE, todos alcanzables',
    NOMBRES.every((x) => vistos.has(x)) && vistos.size === 9 && iguales([...new Set(Object.values(M.ESTADO_DE_LA_EXPERIENCIA))].sort(), NOMBRES.filter((x) => x !== 'IDLE').sort()));
  check('D19) IDLE es no haber puesto nada todavía; con algo puesto ya es INPUT; parando sigue siendo GENERATING hasta que la puerta lo confirma',
    M.estadoDeLaExperiencia(M.ESTADO_INICIAL) === 'IDLE' && M.estadoDeLaExperiencia(avanzar(M.ESTADO_INICIAL, ev.editarBien)) === 'INPUT'
    && M.estadoDeLaExperiencia(avanzar(M.ESTADO_INICIAL, { tipo: 'editar', entrada: { ...M.ENTRADA_VACIA, espacio: 'interior' } })) === 'INPUT'
    && M.estadoDeLaExperiencia(UNO_POR_FASE.cancelando) === 'GENERATING' && M.estadoDeLaExperiencia(UNO_POR_FASE.presupuestado) === 'SUBMITTING');
});

/* ═══ E · DE LA PUERTA A LOS EVENTOS ═══════════════════════════════════════ */
console.log('\n── E · Lo que contesta `generateWorld`, como eventos ──');
seccion('E', () => {
  const ESTADOS = CONTRATO_SERVIDOR.ESTADOS_DE_MUNDO3D;
  check(`E1) cada estado del contrato (${ESTADOS.length}) es un evento, igual en el espejo; uno que no existe, o nada, no se adivina`,
    ESTADOS.length === 6 && iguales(ESTADOS, N3D.ESTADOS_DE_MUNDO3D) && ESTADOS.every((estado) => iguales(M.eventoDelTrabajoDeMundo({ estado }), { tipo: 'trabajo', estado }))
    && M.eventoDelTrabajoDeMundo({ estado: 'running' }) === null && M.eventoDelTrabajoDeMundo(null) === null && M.eventoDelTrabajoDeMundo(undefined) === null);
  const aceptado = { contract: '1.0', status: 'ACCEPTED', requestId: 'mundo3d_x', estado: 'generando', credits: 39, duplicate: false };
  check('E2) lo que contesta `crear` (aceptado, sin esperar al mundo) es un «generando»; lo que sobra no viaja',
    iguales(M.eventoDelTrabajoDeMundo(aceptado), { tipo: 'trabajo', estado: 'generando' }));
  const terminado = { contract: '1.0', requestId: 'mundo3d_x', estado: 'completado', mundo: MUNDO_DE_LA_PUERTA };
  check('E3) terminado: el mundo POR ID; uno sin un id de material de verdad termina sin mundo —nunca una URL en su sitio—',
    avanzar(creando, M.eventoDelTrabajoDeMundo(terminado)).mundo?.assetId === ASSET
    && avanzar(creando, M.eventoDelTrabajoDeMundo({ ...terminado, mundo: { ...MUNDO_DE_LA_PUERTA, assetId: 'https://x/y.spz' } })).mundo === null);
  check('E4) cada estado del Job Engine tiene su estado de mundo en el contrato (lo comprueba su suite) y la máquina sabe ir a todos',
    ESTADOS.every((estado) => avanzar(creando, { tipo: 'trabajo', estado, ...(estado === 'completado' ? { mundo: MUNDO_DE_LA_PUERTA } : {}) }).fase === estado));
});

/* ═══ F · DEL MUNDO A LA ESCENA ════════════════════════════════════════════ */
console.log('\n── F · Del mundo a la escena: el núcleo 3D único ──');
seccion('F', () => {
  const MUNDO = { assetId: ASSET, conVistaPrevia: false };
  const r = M.escenaDelMundo({ mundo: MUNDO, cuenta: CUENTA, projectId: 'proyecto_7', ahora: 1700000000000 });
  check('F1) un mundo da una escena del núcleo 3D, perfil `world`, con el mundo de entorno, de la cuenta y en su proyecto',
    r.ok && r.escena.modo === 'world' && r.escena.contract === '1.0' && r.escena.entorno.worldAssetId === ASSET && r.escena.ownerAccountId === CUENTA
    && r.escena.projectId === 'proyecto_7' && r.escena.createdAt === 1700000000000 && r.escena.nodos.length === 0);
  check('F2) válida para el espejo Y para el servidor: el mismo núcleo, la misma regla',
    r.ok && N3D.validarEscena3D(r.escena).length === 0 && NUCLEO_SERVIDOR.validarEscena3D(r.escena).length === 0
    && iguales(r.escena, NUCLEO_SERVIDOR.crearEscena3D({ sceneId: r.escena.sceneId, modo: 'world', ownerAccountId: CUENTA, projectId: 'proyecto_7', ahora: 1700000000000, entorno: { worldAssetId: ASSET } })));
  check('F3) por id y nunca por dirección: la escena no lleva ni una URL, y sus materiales son el mundo',
    r.ok && !/https?:|gs:\/\//.test(JSON.stringify(r.escena)) && iguales(N3D.materialesDeLaEscena3D(r.escena), [ASSET]));
  check('F4) determinista: el mismo mundo da la misma escena, con un id que sale del material (guardarla dos veces no duplica)',
    iguales(r, M.escenaDelMundo({ mundo: MUNDO, cuenta: CUENTA, projectId: 'proyecto_7', ahora: 1700000000000 })) && r.escena.sceneId === M.idDeEscenaDelMundo(ASSET) && r.escena.sceneId === `mundo_${ASSET}`);
  check('F5) sin material no hay escena, sin cuenta tampoco, y un proyecto que el núcleo no admite no la rompe: se dice',
    iguales(M.escenaDelMundo({ mundo: null, cuenta: CUENTA, ahora: 1 }), { ok: false, motivo: 'sin_material' })
    && iguales(M.escenaDelMundo({ mundo: MUNDO, cuenta: '', ahora: 1 }), { ok: false, motivo: 'sin_cuenta' })
    && iguales(M.escenaDelMundo({ mundo: MUNDO, cuenta: CUENTA, projectId: 'no vale', ahora: 1 }), { ok: false, motivo: 'escena_no_valida' }));
  const IDS = ['asset_ok', 'a'.repeat(122), 'a'.repeat(123), 'con/barra', 'con espacio', 'acentuadó', ASSET];
  const lanza = (f) => { try { f(); return false; } catch { return true; } };
  const difieren = IDS.filter((id) => (M.idDeEscenaDelMundo(id) !== null)
    === lanza(() => NUCLEO_SERVIDOR.crearEscena3D({ sceneId: `mundo_${id}`, modo: 'world', ownerAccountId: CUENTA, ahora: 1 })));
  check('F6) qué id de escena cabe lo decide la misma forma que el núcleo del servidor', difieren.length === 0, difieren.join(', '));
  check('F7) ampliar un mundo no se ofrece: `world.expand` no está en el catálogo; si estuviera, solo en un mundo (no en Design)',
    r.ok && M.ampliacionDelMundo(r.escena) === 'no_existe' && M.ampliacionDelMundo(r.escena, [{ id: 'world.expand' }]) === 'en_el_catalogo'
    && M.ampliacionDelMundo({ ...r.escena, modo: 'design' }, [{ id: 'world.expand' }]) === 'no_existe'
    && !CATALOGO_SERVIDOR.CAPABILITY_CATALOG.some((c) => c.id === 'world.expand'));
});

/* ═══ G · LO QUE SE ENSEÑA ═════════════════════════════════════════════════ */
console.log('\n── G · Lo que se enseña: claves que existen, en todos los diccionarios ──');
seccion('G', () => {
  const ESTADOS = {
    quieto: M.ESTADO_INICIAL,
    quietoListo: avanzar(M.ESTADO_INICIAL, ev.editarBien),
    entrada_invalida: avanzar(M.ESTADO_INICIAL, ev.enviar),
    enviando: enviado,
    presupuestado: avanzar(enviado, ev.presupuesto),
    precioNuevo: avanzar(creando, ev.precioCambiado),
    creando,
    en_cola: avanzar(creando, ev.enCola),
    generando: avanzar(creando, ev.generando),
    cancelando: avanzar(creando, ev.generando, ev.cancelando),
    completado: avanzar(creando, ev.completado),
    completadoSinMaterial: avanzar(creando, ev.completadoSinMundo),
    cancelado: avanzar(creando, ev.generando, ev.cancelando, ev.cancelado),
    no_disponible: avanzar(creando, ev.noDisponible),
    fallidoDelTrabajo: avanzar(creando, ev.generando, ev.fallidoDelTrabajo),
    ...Object.fromEntries(ERRORES.filter(([, , tipo]) => !['no_disponible', 'precio_cambiado'].includes(tipo)).map(([nombre, e]) => [`fallido: ${nombre}`, avanzar(enviado, { tipo: 'fallo', error: M.errorDelMundo3D(e) })])),
  };
  const P = Object.fromEntries(Object.entries(ESTADOS).map(([k, e]) => [k, M.presentacionDelMundo3D(e, CTX)]));
  check('G1) cada fase tiene su presentación, y todas las fases salen', iguales([...new Set(Object.values(ESTADOS).map((e) => e.fase))].sort(), Object.keys(M.TRANSICIONES_DEL_MUNDO_3D).sort()));
  check('G2) en reposo, solo «Crear», y se puede crear cuando hay una foto que sirve',
    iguales(P.quieto.acciones, ['crear']) && P.quieto.sePuedeCrear === false && P.quietoListo.sePuedeCrear === true && P.quieto.claveTitulo === null);
  check('G3) el precio se enseña antes de crear, con confirmar y cambiar (y se avisa si es nuevo); mientras algo está en camino, nada crea otra vez',
    P.presupuestado.creditos === 39 && iguales(P.presupuestado.acciones, ['confirmar', 'cambiar']) && P.presupuestado.claveMensaje === null
    && P.precioNuevo.creditos === 45 && P.precioNuevo.claveMensaje === 'studio.worldPriceChanged'
    && ['enviando', 'creando', 'en_cola', 'generando', 'cancelando'].every((k) => P[k].ocupado && !P[k].acciones.includes('crear') && !P[k].acciones.includes('confirmar'))
    && !P.presupuestado.ocupado);
  check('G4) en cola y generando se puede pedir parar; parando, ya no hay nada que pulsar; y siempre «lo encontrarás en Mis creaciones»',
    iguales(P.en_cola.acciones, ['cancelar']) && iguales(P.generando.acciones, ['cancelar']) && iguales(P.cancelando.acciones, [])
    && ['creando', 'en_cola', 'generando'].every((k) => P[k].claveMensaje === 'creaciones.progressFindLater') && P.cancelando.claveMensaje === 'studio.worldStoppingNote');
  check('G5) «no disponible»: título y frase neutros, y solo volver (ni reintentar, ni otra IA, ni por qué)',
    P.no_disponible.claveTitulo === 'common.notAvailable' && /^weeai\.errNotAvailable/.test(P.no_disponible.claveMensaje) && iguales(P.no_disponible.acciones, ['volver'])
    && !DE_DENTRO.test(JSON.stringify(P.no_disponible)) && !DE_DENTRO.test(JSON.stringify(ESTADOS.no_disponible.error)));
  check('G6) ningún porcentaje ni pasos inventados: la puerta no los sabe',
    Object.values(P).every((p) => !Object.keys(p).some((k) => /porcent|percent|progreso|pasos/i.test(k))));
  check('G7) terminado con su mundo: verlo en Mis creaciones y volver; sin mundo, solo volver',
    iguales(P.completado.acciones, ['ver_creaciones', 'volver']) && P.completado.claveMensaje === 'creaciones.savedInCreations'
    && iguales(P.completadoSinMaterial.acciones, ['volver']) && P.completadoSinMaterial.claveMensaje === null);
  check('G8) cancelado: «paré y te devolví los Credits», y se puede cambiar algo o volver',
    P.cancelado.claveTitulo === 'weeai.jobCancelled' && P.cancelado.claveMensaje === 'studio.worldCancelledNote' && iguales(P.cancelado.acciones, ['cambiar', 'volver']));
  check('G9) cada fallo con su salida: Credits, sesión, seguir la que hay, reintentar o cambiar',
    iguales(P['fallido: sin Credits'].acciones, ['conseguir_credits', 'cambiar']) && iguales(P['fallido: sin sesión'].acciones, ['iniciar_sesion'])
    && iguales(P['fallido: ya en marcha'].acciones, ['ver_creaciones']) && iguales(P['fallido: demasiadas seguidas'].acciones, ['reintentar', 'cambiar'])
    && iguales(P['fallido: la foto se rechazó'].acciones, ['cambiar']) && iguales(P.fallidoDelTrabajo.acciones, ['reintentar', 'cambiar']));
  /* Todas las claves que esto puede pedir, en los diccionarios de verdad. */
  const claves = new Set(Object.values(M.CLAVE_DE_ACCION));
  for (const p of Object.values(P)) for (const k of [p.claveTitulo, p.claveMensaje]) if (k) claves.add(k);
  for (const e of Object.values(ESTADOS)) { for (const pr of e.problemas) claves.add(pr.clave); if (e.error) claves.add(e.error.clave); }
  for (const [, e] of ERRORES) claves.add(M.errorDelMundo3D(e).clave);
  for (const entrada of [{ ...ENTRADA, imagen: null }, { ...ENTRADA, projectId: '/' }, { ...ENTRADA, espacio: 'playa' }]) for (const pr of M.validarEntradaDelMundo3D(entrada, CUENTA)) claves.add(pr.clave);
  const DICCIONARIOS = cargar('i18n/diccionarios.ts').DICCIONARIOS;
  const unicos = []; for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!unicos.some(([, otro]) => otro === d)) unicos.push([codigo, d]);
  const valor = (d, clave) => clave.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), d);
  const delServidor = [...claves].filter((k) => k.startsWith('motor.'));
  const deLaApp = [...claves].filter((k) => !k.startsWith('motor.'));
  const faltanApp = unicos.flatMap(([codigo, d]) => deLaApp.filter((k) => typeof valor(d, k) !== 'string' || !valor(d, k).trim()).map((k) => `${codigo}:${k}`));
  check(`G10) las ${deLaApp.length} claves de la app existen y tienen texto en los ${unicos.length} diccionarios`,
    unicos.length === 16 && faltanApp.length === 0, faltanApp.slice(0, 6).join(' '));
  const faltanServidor = ['es', 'en', 'da'].flatMap((c) => delServidor.filter((k) => typeof valor(DICCIONARIOS[c], k) !== 'string').map((k) => `${c}:${k}`));
  check(`G11) las ${delServidor.length} del servidor (\`motor.*\`) están en los idiomas que traducen su catálogo (es, en, da)`,
    delServidor.length >= 2 && faltanServidor.length === 0, faltanServidor.join(' '));
  /* Y pintadas con el traductor de verdad: en español, en inglés y en portugués de Brasil. */
  const { crearTraductor } = cargar('i18n/traducir.ts');
  const faltan = [];
  const tr = (locale) => crearTraductor(locale, DICCIONARIOS, { alFaltarUnaClave: (k) => faltan.push(`${locale}:${k}`) });
  const [tEs, tEn, tPt] = ['es', 'en', 'pt'].map(tr);
  for (const p of Object.values(P)) for (const t of [tEs, tEn, tPt]) { for (const k of [p.claveTitulo, p.claveMensaje]) if (k) t(k); for (const a of p.acciones) t(M.CLAVE_DE_ACCION[a], { credits: 39 }); }
  check('G12) pintado con el traductor de la app en es, en y pt-BR no falta ninguna, y el precio va dentro del botón',
    faltan.length === 0 && tEs(M.CLAVE_DE_ACCION.confirmar, { credits: 39 }) === 'Crear por 39 Credits' && tEn(M.CLAVE_DE_ACCION.confirmar, { credits: 39 }) === 'Create for 39 Credits'
    && /39/.test(tPt(M.CLAVE_DE_ACCION.confirmar, { credits: 39 })) && tEs('common.notAvailable') === 'No disponible' && tPt('common.notAvailable') === 'Indisponível', faltan.join(' '));
});

/* ═══ H · FRONTERAS ════════════════════════════════════════════════════════ */
console.log('\n── H · Fronteras: puro, sin proveedores, sin Credits ──');
seccion('H', () => {
  const RUTA = 'utils/crearMundo3D.ts';
  const fuente = leer(RUTA);
  const codigo = sinComentarios(fuente);
  check('H1) puro: sin Firebase, sin React, sin red, sin reloj y sin azar',
    !/firebase|from 'react|fetch\(|XMLHttpRequest|\brequire\(|Date\.now\(|new Date\(|Math\.random\(/.test(codigo));
  const imports = [...fuente.matchAll(/^import (type )?\{[^}]*\} from '([^']+)';$/gm)].map((m) => `${m[1] ? 'tipo' : 'valor'}:${m[2]}`);
  check('H2) importa solo el contrato y el núcleo 3D por su puerta, y el «no disponible» puro: ningún servicio',
    iguales(imports.sort(), ['tipo:../services/escena3d', 'valor:../services/escena3d', 'valor:./noDisponible'])
    && !/^import /m.test(leer('utils/noDisponible.ts')), imports.join(', '));
  check('H3) no nombra ningún proveedor, modelo, endpoint ni campo de un proveedor, ni siquiera en los comentarios',
    !/\b(fal|hunyuan|tencent|gemini|seedance|seedream|flux|elevenlabs|deepseek|minimax|openai|replicate|byteplus|bytedance)\b|\blabels_fg|\bexport_drc\b|\bimage_url\b|queue\.|FAL_KEY/i.test(fuente)
    && /\bimage_url\b/.test('{ image_url: x }') && !/\bimage_url\b/.test('bad_image_url'));
  check('H4) ni cobra, ni pone precio, ni sabe de jurisdicciones: el precio lo dice el servidor y la jurisdicción la pone el servidor',
    !/spendCredits|refundCredits|completeCredits|creditCosts|usdToCredits|aiPricing|creditsBalance|jurisdicciones\s*:/.test(codigo));
  /* Ni una frase: todo literal de cadena del código es una clave, un id o un trozo de ruta (sin espacios ni tildes). */
  const sf = ts.createSourceFile(RUTA, fuente, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const literales = [];
  const andar = (nodo) => {
    if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) literales.push(nodo.text);
    if (ts.isTemplateExpression(nodo)) { literales.push(nodo.head.text); for (const s of nodo.templateSpans) literales.push(s.literal.text); }
    ts.forEachChild(nodo, andar);
  };
  andar(sf);
  const frases = literales.filter((s) => /\s|[áéíóúñü¿¡]/i.test(s));
  check(`H5) ni una frase escrita a mano: los ${literales.length} literales son claves, ids o rutas`, literales.length > 50 && frases.length === 0, frases.slice(0, 3).join(' | '));
  check('H6) y la frase de un error no se lee nunca (ni para enseñarla ni para buscar en ella)', !/\.message\b|\bmessage\b/.test(codigo));
  check('H7) CONTROL: el detector de frases sí ve una', ['Sube una foto', 'No disponible'].every((s) => /\s|[áéíóúñü¿¡]/i.test(s)));
  check('H8) y ninguna callable se nombra aquí: las llama su servicio, y solo él',
    !/['"](creatorChat|creatorRun|creatorQuote|generateVideo|generateWorld|brainChat)['"]/.test(fuente));
  check('H9) la caja sigue siendo la del Studio: este módulo no pinta ni trae otra caja, otro Brain ni otro router',
    !/CajaDePrompt|CajaQueCrece|TextInput|brainService|useBrainChat|router|Router/.test(codigo));
  check('esta suite está en la cadena de `npm test`', /crear-mundo-3d\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} comprobación(es) fallaron` : `\n✔ «Crear mundo 3D»: el compositor de 3D World (${n} comprobaciones, $0)`);
process.exit(failures ? 1 : 0);
