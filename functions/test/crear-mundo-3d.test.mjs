/**
 * «CREAR MUNDO 3D» — WEË STUDIO → 3D WORLD, EN LA APP (`utils/crearMundo3D.ts`).
 *
 * El compositor de la experiencia, probado con el código de verdad y sin red:
 *
 *   A · El contrato de la capacidad: lo que se pide es de Weë (`world.generate`), nunca de un proveedor.
 *   B · Lo que pone la persona: una imagen suya y unas palabras; validar antes de enviar, como el servidor.
 *   C · Los errores, en claves: «no disponible» es neutro, no se reintenta y no deja ver nada de dentro.
 *   D · El ciclo de vida: la máquina hace exactamente lo que dice su tabla, ni un salto más.
 *   E · Del trabajo de `CreatorFlow` (el camino de hoy) a los eventos.
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
const NUCLEO_SERVIDOR = cargar('functions/src/core/escena3d.ts');
const CATALOGO_SERVIDOR = cargar('functions/src/core/registry/capabilities.ts');
const CREATOR = cargar('services/creatorService.ts');
const CREDITS = cargar('services/creditsService.ts');

const CUENTA = 'cuentaA1b2C3';
const enStorage = (ruta) => `https://firebasestorage.googleapis.com/v0/b/get-wee.firebasestorage.app/o/${encodeURIComponent(ruta)}?alt=media&token=t0k3n`;
const FOTO = enStorage(`users/${CUENTA}/creator-inputs/1700000000000-ab12cd.jpg`);
const ENTRADA = { imagen: { tipo: 'storage', url: FOTO }, descripcion: 'Un pueblo de pescadores al atardecer', projectId: null };
const CTX = { cuenta: CUENTA, camino: M.CAMINO_DE_CREATORFLOW };
const ASINCRONO = { cuenta: CUENTA, camino: M.CAMINO_ASINCRONO_DEL_CORE };
const ASSET = 'asset_0123456789abcdef0123456789abcdef';

/** Lo que nunca puede verse en lo que se enseña: proveedores, modelos, jurisdicciones, escalones de elegibilidad. */
const DE_DENTRO = /\b(fal|hunyuan|tencent|gemini|seedance|seedream|flux|elevenlabs|deepseek|minimax|openai|anthropic|replicate|byteplus|bytedance)\b|BLOCKED|JURISDICTION|REVIEW_REQUIRED|APPROVED|ACTIVE\b|elegib|sin_modelo|jurisdic|labels_fg|export_drc|image_url|providerModel|"(ES|EU|GB|KR|US)"/i;

/* ═══ A · EL CONTRATO DE LA CAPACIDAD ══════════════════════════════════════ */
console.log('\n── A · Lo que se pide es una capacidad de Weë, no un proveedor ──');
seccion('A', () => {
  const entrada = CATALOGO_SERVIDOR.CAPABILITY_CATALOG.find((c) => c.id === M.CAPACIDAD_DEL_MUNDO_3D);
  const espejo = N3D.CAPABILITY_CATALOG.find((c) => c.id === M.CAPACIDAD_DEL_MUNDO_3D);
  check('A1) la capacidad es `world.generate`, del catálogo del Core: enrutable, de imagen y texto a 3D, igual en el espejo',
    M.CAPACIDAD_DEL_MUNDO_3D === 'world.generate' && entrada?.status === 'ROUTABLE' && iguales(entrada?.accepts, ['image', 'text'])
    && entrada?.produces === '3d' && iguales(entrada, espejo));
  const r = M.peticionDelMundo3D(ENTRADA, CUENTA);
  check('A2) la petición lleva la capacidad, la imagen de la persona y sus palabras, y NADA más',
    r.ok && iguales(Object.keys(r.peticion).sort(), ['capacidad', 'descripcion', 'imagen']) && r.peticion.capacidad === 'world.generate'
    && iguales(r.peticion.imagen, { tipo: 'storage', url: FOTO }) && r.peticion.descripcion === ENTRADA.descripcion && r.descripcionRecortada === false);
  const claves = (o, acc = []) => { for (const [k, v] of Object.entries(o)) { acc.push(k); if (v && typeof v === 'object') claves(v, acc); } return acc; };
  const PROHIBIDOS = ['labels_fg1', 'labels_fg2', 'classes', 'export_drc', 'image_url', 'prompt', 'model', 'modelId', 'provider', 'quality', 'jurisdicciones', 'endpoint', 'seed'];
  const conMaterial = M.peticionDelMundo3D({ imagen: { tipo: 'material', assetId: ASSET, kind: 'image' }, descripcion: '', projectId: 'proyecto_7' }, CUENTA);
  check('A3) ni un campo de un proveedor ni de la ruta: ni etiquetas de escena, ni prompt, ni modelo, ni calidad, ni jurisdicción',
    [r, conMaterial].every((x) => x.ok && claves(x.peticion).every((k) => !PROHIBIDOS.includes(k))),
    claves(r.peticion).join(', '));
  check('A4) un material viaja por su id (sin su tipo ni su dirección) y el proyecto, si lo hay; sin palabras, no se inventan',
    conMaterial.ok && iguales(conMaterial.peticion, { capacidad: 'world.generate', imagen: { tipo: 'material', assetId: ASSET }, projectId: 'proyecto_7' }));
  const larga = `${'a'.repeat(299)}😀 y más`;
  const recortada = M.peticionDelMundo3D({ ...ENTRADA, descripcion: `   ${larga}   ` }, CUENTA);
  check(`A5) las palabras viajan tal cual (recortadas en los bordes) y hasta ${M.LIMITE_DE_LA_DESCRIPCION}, sin partir un emoji, y se dice si se recortaron`,
    M.LIMITE_DE_LA_DESCRIPCION === 300 && recortada.ok && recortada.peticion.descripcion === 'a'.repeat(299) && recortada.descripcionRecortada === true
    && M.peticionDelMundo3D({ ...ENTRADA, descripcion: `${'b'.repeat(298)}😀` }, CUENTA).peticion.descripcion.length === 300);
  check('A6) el límite es el del servidor: `creatorChat` guarda 300 caracteres del objetivo',
    /String\(data\.goal \|\| ''\)\.trim\(\)\.slice\(0, 300\)/.test(leer('functions/src/creator/index.ts')));
  check('A7) la petición sale congelada: un reintento no puede mandar otra cosa',
    Object.isFrozen(r.peticion) && Object.isFrozen(r.peticion.imagen));
});

/* ═══ B · LO QUE PONE LA PERSONA ═══════════════════════════════════════════ */
console.log('\n── B · Una imagen suya, de Weë; validar antes de enviar ──');
seccion('B', () => {
  const codigos = (entrada) => M.validarEntradaDelMundo3D(entrada, CUENTA).map((p) => p.codigo);
  check('B1) una foto de su carpeta del Storage de Weë sirve; sin imagen, no', iguales(codigos(ENTRADA), []) && iguales(codigos({ ...ENTRADA, imagen: null }), ['falta_imagen']));
  const CASOS = [
    ['una foto de otra cuenta', { tipo: 'storage', url: enStorage('users/otraCuenta/creator-inputs/x.jpg') }, 'imagen_ajena'],
    ['una foto fuera de una carpeta de persona', { tipo: 'storage', url: enStorage('public/x.jpg') }, 'imagen_ajena'],
    ['una dirección de internet cualquiera', { tipo: 'storage', url: 'https://ejemplo.com/foto.jpg' }, 'imagen_sin_subir'],
    ['una foto del teléfono sin subir', { tipo: 'storage', url: 'file:///storage/emulated/0/DCIM/x.jpg' }, 'imagen_sin_subir'],
    ['un blob del navegador', { tipo: 'storage', url: 'blob:http://localhost:8081/1234' }, 'imagen_sin_subir'],
    ['una imagen en línea', { tipo: 'storage', url: 'data:image/png;base64,AAAA' }, 'imagen_sin_subir'],
    ['una dirección de más de 2000 caracteres', { tipo: 'storage', url: enStorage(`users/${CUENTA}/creator-inputs/${'x'.repeat(2000)}.jpg`) }, 'imagen_sin_subir'],
    ['un material con un id que no es un id', { tipo: 'material', assetId: 'https://cdn.ejemplo/x.png' }, 'material_no_valido'],
    ['un material que es un vídeo', { tipo: 'material', assetId: ASSET, kind: 'video' }, 'material_no_es_imagen'],
    ['un tipo de fuente inventado', { tipo: 'url', url: FOTO }, 'falta_imagen'],
  ];
  const mal = CASOS.filter(([, imagen, esperado]) => !iguales(codigos({ ...ENTRADA, imagen }), [esperado])).map(([nombre]) => nombre);
  check(`B2) ${CASOS.length} imágenes que no sirven, cada una con su motivo`, mal.length === 0, mal.join(', '));
  check('B3) sirven también la forma gs:// , la del emulador y la de Cloud Storage, y un material suyo que es imagen',
    [`gs://get-wee.firebasestorage.app/users/${CUENTA}/creator-inputs/x.jpg`, `http://127.0.0.1:9199/v0/b/demo-wee/o/users%2F${CUENTA}%2Fai-generations%2Fx.png?alt=media`,
      `https://storage.googleapis.com/get-wee/users/${CUENTA}/ai-generations/x.png`].every((url) => codigos({ ...ENTRADA, imagen: { tipo: 'storage', url } }).length === 0)
    && codigos({ ...ENTRADA, imagen: { tipo: 'material', assetId: ASSET, kind: 'image' } }).length === 0
    && codigos({ ...ENTRADA, imagen: { tipo: 'material', assetId: ASSET } }).length === 0);
  check('B4) un proyecto con un id que el núcleo 3D no admite se dice antes de crear nada',
    iguales(codigos({ ...ENTRADA, projectId: 'mi proyecto/1' }), ['proyecto_no_valido']) && iguales(codigos({ ...ENTRADA, projectId: 'Abc123XyZ' }), []));
  check('B5) sin cuenta no hay carpeta propia: ninguna foto es suya', iguales(M.validarEntradaDelMundo3D(ENTRADA, '').map((p) => p.codigo), ['imagen_ajena']));
  check('B6) cada problema lleva su clave, y para la imagen es siempre la misma frase accionable: subir una foto a Weë',
    CASOS.every(([, imagen]) => M.validarEntradaDelMundo3D({ ...ENTRADA, imagen }, CUENTA).every((p) => p.clave === 'weeai.uploadToWork'))
    && M.validarEntradaDelMundo3D({ ...ENTRADA, projectId: '/' }, CUENTA)[0].clave === 'weeai.couldNotSaveToProject');

  /* La dirección se lee como la lee el servidor: su `parseStorageUrl`, extraído de su fuente y comparado caso a caso. */
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
    'https://storage.googleapis.com/b/', 'https://ejemplo.com/v0/b/x/o/', 'https://ejemplo.com/foto.jpg', 'file:///x.jpg', 'blob:x', 'data:image/png;base64,AA', '',
    'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fx%E0%A4%A.png',
  ];
  const como = (f, url) => { try { return f(url); } catch { return null; } };
  const distintas = DIRECCIONES.filter((url) => !iguales(como(delServidor, url), M.rutaEnElStorage(url)));
  check(`B7) la dirección se lee EXACTAMENTE como en el servidor (${DIRECCIONES.length} formas, también las rotas): una copia comprobada, no una segunda verdad`,
    inicio > 0 && distintas.length === 0, distintas.join(' | '));
  check('B8) y la carpeta propia es la misma regla que aplica el servidor a una foto de entrada (`users/{uid}/`)',
    /parsed\.path\.startsWith\(`users\/\$\{uid\}\/`\)/.test(leer('functions/src/creator/inputs.ts')));
});

/* ═══ C · LOS ERRORES, EN CLAVES ═══════════════════════════════════════════ */
console.log('\n── C · Los errores, en claves: «no disponible» es neutro ──');
const err = (code, details, message = 'Ahora mismo no hay una IA disponible para esto. Inténtalo más tarde.') => ({ code: `functions/${code}`, message, details });
const NO_ELEGIBLE = err('failed-precondition', { code: 'NOT_AVAILABLE', capability: 'world.generate', reason: 'sin_modelo_elegible', elegibilidad: ['BLOCKED_FOR_JURISDICTION', 'JURISDICTION_UNKNOWN'], provider: 'fal' });
const ERRORES = [
  ['sin modelo elegible (bloqueado en la jurisdicción)', NO_ELEGIBLE, 'no_disponible', 'motor.notAvailable', false],
  ['sin proveedor ahora (apagado, sin clave o en pausa)', err('failed-precondition', { code: 'NOT_AVAILABLE', capability: 'world.generate' }), 'no_disponible', 'motor.notAvailable', false],
  ['el SDK nativo deja los detalles en customData', { code: 'functions/failed-precondition', message: 'x', customData: { details: { code: 'NOT_AVAILABLE', reason: 'sin_modelo_elegible' } } }, 'no_disponible', 'motor.notAvailable', false],
  ['sin Credits', err('resource-exhausted', { code: 'INSUFFICIENT_CREDITS', required: 39, available: 12 }, 'INSUFFICIENT_CREDITS'), 'sin_credits', 'weeai.errNotEnoughCredits', false],
  ['falta la foto', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'needs_image' }), 'entrada', 'weeai.uploadToWork', false],
  ['la foto no es de Weë', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'bad_image_url' }), 'entrada', 'weeai.uploadToWork', false],
  ['la foto se rechazó', err('invalid-argument', { code: 'INVALID_REQUEST', reason: 'input_rejected' }), 'entrada', 'motor.inputRejected', false],
  ['falta algo', err('invalid-argument', { code: 'INVALID_REQUEST' }), 'entrada', 'motor.invalidRequest', false],
  ['sin sesión', err('unauthenticated', { code: 'UNAUTHORIZED' }), 'sesion', 'weeai.errSignIn', false],
  ['sin sesión, sin código', { code: 'functions/unauthenticated', message: 'x' }, 'sesion', 'weeai.errSignIn', false],
  ['sin perfil', err('failed-precondition', { code: 'ACCOUNT_NOT_FOUND' }), 'sesion', 'weeai.errNoAccount', false],
  ['ya en marcha', err('already-exists', { code: 'DUPLICATE_REQUEST' }), 'duplicado', 'weeai.errDuplicate', false],
  ['demasiadas seguidas', err('resource-exhausted', { code: 'RATE_LIMITED' }), 'reintentable', 'weeai.errRateLimited', true],
  ['tardó demasiado', err('deadline-exceeded', { code: 'TIMEOUT' }), 'reintentable', 'weeai.errTimeout', true],
  ['el proveedor falló', err('unavailable', { code: 'PROVIDER_ERROR', provider: 'fal', retryable: true }), 'reintentable', 'weeai.errGeneric', true],
  ['no se terminó', err('aborted', { code: 'GENERATION_FAILED' }), 'reintentable', 'weeai.errGeneric', true],
  ['sin conexión', { code: 'functions/unavailable', message: 'x' }, 'sin_conexion', 'weeai.errOffline', true],
  ['sin red, la callable dice internal', { code: 'functions/internal', message: 'internal' }, 'sin_conexion', 'weeai.errOffline', true],
  /* La FRASE no se lee nunca: un error suelto sin código es «algo salió mal», diga lo que diga su mensaje. */
  ['un error suelto, sin código', { message: 'Failed to fetch' }, 'desconocido', 'weeai.errGeneric', true],
  ['algo raro', { message: 'x' }, 'desconocido', 'weeai.errGeneric', true],
];
seccion('C', () => {
  const mal = ERRORES.filter(([, e, tipo, clave, reintentable]) => {
    const r = M.errorDelMundo3D(e);
    return !r || r.tipo !== tipo || r.clave !== clave || r.reintentable !== reintentable;
  }).map(([nombre]) => nombre);
  check(`C1) ${ERRORES.length} errores del servidor y de la red, cada uno con su tipo, su clave y si tiene sentido reintentar`, mal.length === 0, mal.join(', '));
  check('C2) cansarse de esperar en la app no es un error: el trabajo sigue en el servidor y llega por su documento',
    M.errorDelMundo3D({ code: 'functions/deadline-exceeded', message: 'deadline-exceeded' }) === null);
  check('C3) sin Credits trae cuánto hacía falta y cuánto había, para el aviso de saldo de siempre',
    iguales(M.errorDelMundo3D(ERRORES[3][1]).faltan, { required: 39, available: 12 }));
  const r = M.errorDelMundo3D(NO_ELEGIBLE);
  check('C4) «no disponible» no deja pasar NADA de dentro: ni escalones, ni jurisdicciones, ni proveedor, ni la frase de «inténtalo más tarde»',
    !DE_DENTRO.test(JSON.stringify(r)) && r.clave !== 'motor.sinProveedor' && !/Inténtalo más tarde/.test(JSON.stringify(r)), JSON.stringify(r));
  check('C5) CONTROL: el detector sí ve lo que no puede salir',
    DE_DENTRO.test(JSON.stringify(NO_ELEGIBLE.details)) && DE_DENTRO.test('"ES"') && !DE_DENTRO.test(JSON.stringify({ clave: 'motor.notAvailable' })));
  /* Lo que se lee del error es lo mismo que leen los servicios de siempre: no hay una segunda forma de leerlo. */
  const TODOS = [...ERRORES.map(([, e]) => e), { code: 'functions/deadline-exceeded', message: 'x' }, { code: 'functions/deadline-exceeded', message: 'x', details: { code: 'TIMEOUT' } }, null, undefined, 'texto'];
  const distintos = TODOS.filter((e) => M.leerErrorDelServidor(e).codigo !== CREATOR.creatorErrorCode(e)
    || (M.errorDelMundo3D(e) === null) !== CREATOR.isClientTimeout(e)
    || (M.errorDelMundo3D(e)?.tipo === 'sin_credits') !== (CREDITS.creditsShortfall(e) !== null));
  check(`C6) el código, el tiempo agotado en la app y la falta de Credits se leen como \`creatorErrorCode\`, \`isClientTimeout\` y \`creditsShortfall\` (${TODOS.length} formas)`,
    distintos.length === 0, distintos.map((e) => JSON.stringify(e)).join(' | '));
  check('C7) y «no disponible» es lo que el motor llama NOT_AVAILABLE con `sin_modelo_elegible`: el contrato del Router es ese',
    /reason: 'sin_modelo_elegible', elegibilidad: estados/.test(leer('functions/src/engine/router.ts')) && /NOT_AVAILABLE/.test(leer('functions/src/engine/errors.ts')));
  check('C8) la falta de Credits se reconoce por su código sin leer la frase: el Credit Engine lo pone SIEMPRE en los detalles',
    /new HttpsError\(map\[error\.code\], error\.code, \{ code: error\.code, \.\.\.error\.details \}\)/.test(leer('functions/src/credits/creditValidation.ts')));
});

/* ═══ D · EL CICLO DE VIDA ═════════════════════════════════════════════════ */
console.log('\n── D · La máquina hace lo que dice su tabla ──');
const MUNDO = { stepId: 'world', worldAssetId: ASSET };
const ev = {
  editarBien: { tipo: 'editar', entrada: ENTRADA },
  editarVacia: { tipo: 'editar', entrada: M.ENTRADA_VACIA },
  enviar: { tipo: 'enviar' },
  pregunta: { tipo: 'pregunta' },
  responder: { tipo: 'responder' },
  presupuesto: { tipo: 'presupuesto', creditos: 39 },
  presupuestoMalo: { tipo: 'presupuesto', creditos: 1.5 },
  presupuestoNegativo: { tipo: 'presupuesto', creditos: -1 },
  confirmar: { tipo: 'confirmar' },
  generando: { tipo: 'generando', pasos: { hechos: 0, total: 1 } },
  generandoSinPasos: { tipo: 'generando' },
  completado: { tipo: 'completado', mundo: MUNDO },
  completadoSinMundo: { tipo: 'completado', mundo: null },
  noDisponible: { tipo: 'fallo', error: M.errorDelMundo3D(NO_ELEGIBLE) },
  reintentable: { tipo: 'fallo', error: M.errorDelMundo3D(err('resource-exhausted', { code: 'RATE_LIMITED' })) },
  duplicado: { tipo: 'fallo', error: M.errorDelMundo3D(err('already-exists', { code: 'DUPLICATE_REQUEST' })) },
  sinCredits: { tipo: 'fallo', error: M.errorDelMundo3D(ERRORES[3][1]) },
  reintentar: { tipo: 'reintentar' },
  empezar: { tipo: 'empezar_de_nuevo' },
};
const avanzar = (estado, ...eventos) => eventos.reduce((e, x) => M.avanzar(e, x, CTX), estado);
seccion('D', () => {
  const FASES = Object.keys(M.TRANSICIONES_DEL_MUNDO_3D);
  check('D1) diez fases, y entre ellas ni «en cola» ni «cancelar»: ningún camino de hoy los sabe decir de verdad',
    FASES.length === 10 && !FASES.some((f) => /cola|queue|cancel/.test(f)) && !Object.keys(M.CLAVE_DE_ACCION).some((a) => /cancel/.test(a)));
  /* Recorrer la máquina entera desde el principio con todos los eventos: lo que se alcanza y cómo. */
  /* Tres contextos: los dos caminos de hoy y una sesión sin cuenta (con ella, una foto «ajena» deja de serlo al entrar). */
  const SIN_CUENTA = { cuenta: '', camino: M.CAMINO_DE_CREATORFLOW };
  const vistas = new Set(); const saltos = new Set(); const fuera = [];
  const visitados = new Set(); const cola = [[M.ESTADO_INICIAL, 0]];
  while (cola.length) {
    const [estado, profundidad] = cola.shift();
    const huella = JSON.stringify(estado);
    if (visitados.has(huella) || profundidad > 9) continue;
    visitados.add(huella); vistas.add(estado.fase);
    for (const [nombre, evento] of Object.entries(ev)) {
      for (const ctx of [CTX, ASINCRONO, SIN_CUENTA]) {
        const siguiente = M.avanzar(estado, evento, ctx);
        if (siguiente === estado) continue;
        if (!M.TRANSICIONES_DEL_MUNDO_3D[estado.fase].includes(siguiente.fase)) fuera.push(`${estado.fase} -${nombre}-> ${siguiente.fase}`);
        saltos.add(`${estado.fase}>${siguiente.fase}`);
        cola.push([siguiente, profundidad + 1]);
      }
    }
  }
  check('D2) ningún evento, en ninguna fase, da un salto que no esté en la tabla', fuera.length === 0, [...new Set(fuera)].slice(0, 5).join(' · '));
  check('D3) y desde el principio se llega a las diez fases', iguales([...vistas].sort(), [...FASES].sort()), [...vistas].join(', '));
  const declarados = FASES.flatMap((f) => M.TRANSICIONES_DEL_MUNDO_3D[f].map((g) => `${f}>${g}`));
  const muertos = declarados.filter((s) => !saltos.has(s));
  check(`D4) y la tabla no promete nada que la máquina no haga: los ${declarados.length} saltos declarados ocurren`, muertos.length === 0, muertos.join(', '));

  /* El camino de hoy, de punta a punta. */
  const escrito = avanzar(M.ESTADO_INICIAL, ev.editarBien);
  const enviado = M.avanzar(escrito, ev.enviar, CTX);
  const final = avanzar(enviado, ev.presupuesto, ev.confirmar, ev.generando, { tipo: 'generando', pasos: { hechos: 1, total: 1 } }, ev.completado);
  check('D5) escribir → enviar → precio → confirmar → generando → completado, con el precio del servidor y el mundo por id',
    escrito.fase === 'quieto' && enviado.fase === 'enviando' && enviado.peticion?.capacidad === 'world.generate'
    && avanzar(enviado, ev.presupuesto).creditos === 39 && final.fase === 'completado' && iguales(final.mundo, MUNDO) && final.creditos === 39);
  const sinImagen = M.avanzar(M.ESTADO_INICIAL, ev.enviar, CTX);
  check('D6) enviar sin imagen no envía: dice qué falta, y al corregirlo se puede enviar',
    sinImagen.fase === 'entrada_invalida' && sinImagen.peticion === null && sinImagen.problemas[0]?.codigo === 'falta_imagen'
    && avanzar(sinImagen, ev.editarBien, ev.enviar).fase === 'enviando');
  const generando = avanzar(enviado, ev.presupuesto, ev.confirmar, ev.generando);
  check('D7) mientras algo está en camino, editar, empezar de nuevo, volver a enviar o confirmar no hacen nada (mismo objeto)',
    [ev.editarBien, ev.empezar, ev.enviar, ev.confirmar, ev.presupuesto].every((x) => M.avanzar(generando, x, CTX) === generando)
    && [ev.editarBien, ev.empezar, ev.confirmar].every((x) => M.avanzar(enviado, x, CTX) === enviado));
  check('D8) un precio que no es un número entero de Credits no es un precio: se ignora',
    M.avanzar(enviado, ev.presupuestoMalo, CTX) === enviado && M.avanzar(enviado, ev.presupuestoNegativo, CTX) === enviado);
  const pasos = (ctx, p) => M.avanzar(avanzar(enviado, ev.presupuesto, ev.confirmar), { tipo: 'generando', pasos: p }, ctx).pasos;
  check('D9) el progreso son pasos hechos de los que hay, solo si el camino los escribe de verdad; nunca uno inventado',
    iguales(pasos(CTX, { hechos: 1, total: 2 }), { hechos: 1, total: 2 }) && pasos(ASINCRONO, { hechos: 1, total: 2 }) === null
    && [{ hechos: 3, total: 2 }, { hechos: -1, total: 2 }, { hechos: 0.5, total: 2 }, { hechos: 0, total: 0 }, undefined].every((p) => pasos(CTX, p) === null));
  const noDisp = M.avanzar(generando, ev.noDisponible, CTX);
  check('D10) «no disponible» es una fase propia, sin reintento: reintentar no hace nada, y solo se puede volver',
    noDisp.fase === 'no_disponible' && M.avanzar(noDisp, ev.reintentar, CTX) === noDisp && avanzar(noDisp, ev.empezar).fase === 'quieto');
  const fallido = M.avanzar(generando, ev.reintentable, CTX);
  const otraVez = M.avanzar(fallido, ev.reintentar, CTX);
  check('D11) reintentar vuelve a pedir EXACTAMENTE lo mismo y el precio se vuelve a enseñar antes de cobrar',
    fallido.fase === 'fallido' && otraVez.fase === 'enviando' && otraVez.peticion === fallido.peticion && otraVez.creditos === null && otraVez.error === null);
  check('D12) «ya está en marcha» no es un fallo mientras se crea: se sigue la que hay',
    M.avanzar(generando, ev.duplicado, CTX).fase === 'generando' && M.avanzar(avanzar(enviado, ev.presupuesto, ev.confirmar), ev.duplicado, CTX).fase === 'generando');
  const sinCredits = M.avanzar(avanzar(enviado, ev.presupuesto, ev.confirmar), ev.sinCredits, CTX);
  check('D13) sin Credits no se reintenta solo: se consiguen Credits o se cambia algo',
    sinCredits.fase === 'fallido' && M.avanzar(sinCredits, ev.reintentar, CTX) === sinCredits);
  check('D14) las respuestas que llegan tarde no mueven nada: un completado en reposo o un fallo después de terminar',
    M.avanzar(M.ESTADO_INICIAL, ev.completado, CTX) === M.ESTADO_INICIAL && M.avanzar(final, ev.reintentable, CTX) === final && M.avanzar(final, ev.generando, CTX) === final);
  const antes = JSON.stringify(enviado);
  for (const x of Object.values(ev)) M.avanzar(enviado, x, CTX);
  check('D15) la máquina no muta lo que recibe: el estado de partida sale intacto de todos los eventos',
    JSON.stringify(enviado) === antes && Object.isFrozen(M.ESTADO_INICIAL) && Object.isFrozen(M.ESTADO_INICIAL.entrada));
});

/* ═══ E · DEL TRABAJO DE CREATORFLOW A LOS EVENTOS ═════════════════════════ */
console.log('\n── E · Lo que dice el documento del trabajo (el camino de hoy) ──');
seccion('E', () => {
  const pasoMundo = { id: 'world', capability: 'world.generate', purpose: 'Crear tu mundo', status: 'done' };
  const trabajo = (extra) => ({ status: 'running', steps: [pasoMundo], results: [], creditsEstimated: 39, progressText: '', ...extra });
  const resultado = (extra) => ({ stepId: 'world', kind: 'world', title: 'Crear tu mundo', url: 'https://firebasestorage.googleapis.com/v0/b/b/o/x', ...extra });
  check('E1) pregunta, precio y en marcha con sus pasos, leídos del documento',
    iguales(M.eventoDelTrabajo(trabajo({ status: 'asking' })), { tipo: 'pregunta' })
    && iguales(M.eventoDelTrabajo(trabajo({ status: 'planned' })), { tipo: 'presupuesto', creditos: 39 })
    && iguales(M.eventoDelTrabajo(trabajo({ status: 'running', steps: [pasoMundo, { ...pasoMundo, id: 'b', status: 'running' }] })), { tipo: 'generando', pasos: { hechos: 1, total: 2 } }));
  const hecho = M.eventoDelTrabajo(trabajo({ status: 'done', results: [resultado({ assetIds: [ASSET] })] }));
  check('E2) terminado: el mundo por el id de su material, del paso que hace mundos; la dirección no se lee',
    iguales(hecho, { tipo: 'completado', mundo: { stepId: 'world', worldAssetId: ASSET } }) && !/http/.test(JSON.stringify(hecho)));
  check('E3) sin ficha de material (o con una dirección en su lugar) no hay id: nunca una URL en su sitio',
    M.eventoDelTrabajo(trabajo({ status: 'done', results: [resultado({})] })).mundo.worldAssetId === null
    && M.eventoDelTrabajo(trabajo({ status: 'done', results: [resultado({ assetIds: ['https://x/y.glb'] })] })).mundo.worldAssetId === null
    && M.eventoDelTrabajo(trabajo({ status: 'done', results: [{ ...resultado({ assetIds: [ASSET] }), kind: 'image' }] })).mundo === null);
  check('E4) si hay varios resultados, manda el del paso `world.generate`',
    M.mundoDelTrabajo({ steps: [{ ...pasoMundo, id: 'b' }], results: [resultado({ assetIds: ['asset_aaaa'] }), resultado({ stepId: 'b', assetIds: ['asset_bbbb'] })] }).worldAssetId === 'asset_bbbb');
  const fallido = M.eventoDelTrabajo(trabajo({ status: 'failed', progressText: 'No me salió bien esta vez. No te cobré: inténtalo de nuevo en un momento.' }));
  check('E5) fallido: con la frase que dejó el servidor (se pinta con `textoDelServidor`) y su clave de respaldo; se reembolsó entero',
    fallido.tipo === 'fallo' && fallido.error.clave === 'weeai.itDidNotWork' && fallido.error.reintentable === true && /No te cobré/.test(fallido.error.fraseDelServidor)
    && /settleCredits\(uid, jobId, job\.creditsEstimated, 0, description\)/.test(leer('functions/src/creator/index.ts')));
  check('E6) cancelado y un estado que no se conoce: el primero con su clave, el segundo no se adivina',
    M.eventoDelTrabajo(trabajo({ status: 'cancelled' })).error.clave === 'weeai.jobCancelled' && M.eventoDelTrabajo(trabajo({ status: 'raro' })) === null);
  const ESTADOS_DEL_TRABAJO = (leer('services/creatorService.ts').match(/export type JobStatus = ([^;]+);/)?.[1] ?? '').match(/'[a-z]+'/g)?.map((s) => s.slice(1, -1)) ?? [];
  check(`E7) cada estado del trabajo de la app (${ESTADOS_DEL_TRABAJO.length}) tiene su evento`,
    ESTADOS_DEL_TRABAJO.length === 6 && ESTADOS_DEL_TRABAJO.every((s) => M.eventoDelTrabajo(trabajo({ status: s })) !== null));
  /* El tipo del resultado en la app es espejo del del servidor: incluye `world`, que es lo que lee el compositor. */
  const union = (src, re) => (src.match(re)?.[1] ?? '').match(/'[a-z0-9]+'/g)?.map((s) => s.slice(1, -1)).sort() ?? [];
  const cliente = union(leer('services/creatorService.ts'), /export type ResultKind = ([^;]+);/);
  const servidor = union(leer('functions/src/creator/types.ts'), /export type ResultKind = ([^;]+);/);
  check('E8) el tipo de resultado de la app es el del servidor, `world` incluido', servidor.includes('world') && iguales(cliente, servidor), cliente.join(','));
});

/* ═══ F · DEL MUNDO A LA ESCENA ════════════════════════════════════════════ */
console.log('\n── F · Del mundo a la escena: el núcleo 3D único ──');
seccion('F', () => {
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
    iguales(M.escenaDelMundo({ mundo: { stepId: 'world', worldAssetId: null }, cuenta: CUENTA, ahora: 1 }), { ok: false, motivo: 'sin_material' })
    && iguales(M.escenaDelMundo({ mundo: null, cuenta: CUENTA, ahora: 1 }), { ok: false, motivo: 'sin_material' })
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
  /* Cada estado que la máquina puede tener, con su presentación. */
  const enviado = M.avanzar(M.avanzar(M.ESTADO_INICIAL, ev.editarBien, CTX), ev.enviar, CTX);
  const ESTADOS = {
    quieto: M.ESTADO_INICIAL,
    quietoListo: M.avanzar(M.ESTADO_INICIAL, ev.editarBien, CTX),
    entrada_invalida: M.avanzar(M.ESTADO_INICIAL, ev.enviar, CTX),
    enviando: enviado,
    preguntando: M.avanzar(enviado, ev.pregunta, CTX),
    presupuestado: M.avanzar(enviado, ev.presupuesto, CTX),
    creando: avanzar(enviado, ev.presupuesto, ev.confirmar),
    generando: avanzar(enviado, ev.presupuesto, ev.confirmar, { tipo: 'generando', pasos: { hechos: 1, total: 2 } }),
    completado: avanzar(enviado, ev.presupuesto, ev.confirmar, ev.completado),
    completadoSinMaterial: avanzar(enviado, ev.presupuesto, ev.confirmar, ev.completadoSinMundo),
    no_disponible: avanzar(enviado, ev.presupuesto, ev.confirmar, ev.noDisponible),
    ...Object.fromEntries(ERRORES.filter(([, , tipo]) => tipo !== 'no_disponible').map(([nombre, e]) => [`fallido: ${nombre}`, avanzar(enviado, { tipo: 'fallo', error: M.errorDelMundo3D(e) })])),
    fallidoConFrase: avanzar(enviado, ev.presupuesto, ev.confirmar, M.eventoDelTrabajo({ status: 'failed', steps: [], results: [], creditsEstimated: 39, progressText: 'No me salió bien.' })),
  };
  const P = Object.fromEntries(Object.entries(ESTADOS).map(([k, e]) => [k, M.presentacionDelMundo3D(e, CTX)]));
  check('G1) cada fase tiene su presentación, y todas las fases salen', iguales([...new Set(Object.values(ESTADOS).map((e) => e.fase))].sort(), Object.keys(M.TRANSICIONES_DEL_MUNDO_3D).sort()));
  check('G2) en reposo manda la caja: solo «Crear», y se puede crear cuando hay una imagen que sirve',
    iguales(P.quieto.acciones, ['crear']) && P.quieto.sePuedeCrear === false && P.quietoListo.sePuedeCrear === true && P.quieto.claveTitulo === null);
  check('G3) el precio se enseña antes de crear, con confirmar y cambiar; mientras algo está en camino, el botón no acepta otro toque',
    P.presupuestado.creditos === 39 && iguales(P.presupuestado.acciones, ['confirmar', 'cambiar'])
    && ['enviando', 'creando', 'generando'].every((k) => P[k].ocupado && P[k].acciones.length === 0) && !P.presupuestado.ocupado);
  check('G4) «no disponible»: título y frase neutros, y solo volver (ni reintentar, ni otra IA, ni por qué)',
    P.no_disponible.claveTitulo === 'common.notAvailable' && P.no_disponible.claveMensaje === 'motor.notAvailable' && iguales(P.no_disponible.acciones, ['volver'])
    && !DE_DENTRO.test(JSON.stringify(P.no_disponible)) && !DE_DENTRO.test(JSON.stringify(ESTADOS.no_disponible.error)));
  check('G5) el progreso, en pasos y con la frase de siempre; nunca un porcentaje',
    iguales(P.generando.progreso, { hechos: 1, total: 2 }) && M.CLAVE_DEL_PROGRESO === 'creaciones.progressSteps'
    && Object.values(P).every((p) => !Object.keys(p).some((k) => /porcent|percent/i.test(k)) && (p.progreso === null || iguales(Object.keys(p.progreso).sort(), ['hechos', 'total'])))
    && M.presentacionDelMundo3D(ESTADOS.generando, ASINCRONO).progreso === null);
  check('G6) terminado con su material: guardar en un proyecto, ver en Mis creaciones y volver; sin material, solo volver',
    iguales(P.completado.acciones, ['guardar_en_proyecto', 'ver_creaciones', 'volver']) && P.completado.claveMensaje === 'creaciones.savedInCreations'
    && iguales(P.completadoSinMaterial.acciones, ['volver']) && P.completadoSinMaterial.claveMensaje === null);
  check('G7) cada fallo con su salida: Credits, sesión, seguir la que hay, reintentar o cambiar; y la frase del servidor cuando es lo que hay',
    iguales(P['fallido: sin Credits'].acciones, ['conseguir_credits', 'cambiar']) && iguales(P['fallido: sin sesión'].acciones, ['iniciar_sesion'])
    && iguales(P['fallido: ya en marcha'].acciones, ['ver_creaciones']) && iguales(P['fallido: demasiadas seguidas'].acciones, ['reintentar', 'cambiar'])
    && iguales(P['fallido: la foto se rechazó'].acciones, ['cambiar']) && P.fallidoConFrase.fraseDelServidor === 'No me salió bien.' && P.fallidoConFrase.claveMensaje === null);

  /* Todas las claves que esto puede pedir, en los diccionarios de verdad. */
  const claves = new Set([...Object.values(M.CLAVE_DE_ACCION), M.CLAVE_DEL_PROGRESO]);
  for (const p of Object.values(P)) for (const k of [p.claveTitulo, p.claveMensaje]) if (k) claves.add(k);
  for (const e of Object.values(ESTADOS)) { for (const pr of e.problemas) claves.add(pr.clave); if (e.error) claves.add(e.error.clave); }
  for (const [, e] of ERRORES) claves.add(M.errorDelMundo3D(e).clave);
  for (const codigo of ['falta_imagen', 'imagen_sin_subir', 'imagen_ajena', 'material_no_valido', 'material_no_es_imagen', 'proyecto_no_valido']) {
    const entrada = { falta_imagen: { ...ENTRADA, imagen: null }, imagen_sin_subir: { ...ENTRADA, imagen: { tipo: 'storage', url: 'x' } },
      imagen_ajena: { ...ENTRADA, imagen: { tipo: 'storage', url: enStorage('users/otra/x.jpg') } }, material_no_valido: { ...ENTRADA, imagen: { tipo: 'material', assetId: '/' } },
      material_no_es_imagen: { ...ENTRADA, imagen: { tipo: 'material', assetId: ASSET, kind: 'audio' } }, proyecto_no_valido: { ...ENTRADA, projectId: '/' } }[codigo];
    for (const pr of M.validarEntradaDelMundo3D(entrada, CUENTA)) claves.add(pr.clave);
  }
  const DICCIONARIOS = cargar('i18n/diccionarios.ts').DICCIONARIOS;
  const unicos = []; for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!unicos.some(([, otro]) => otro === d)) unicos.push([codigo, d]);
  const valor = (d, clave) => clave.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), d);
  const delServidor = [...claves].filter((k) => k.startsWith('motor.'));
  const deLaApp = [...claves].filter((k) => !k.startsWith('motor.'));
  const faltanApp = unicos.flatMap(([codigo, d]) => deLaApp.filter((k) => typeof valor(d, k) !== 'string' || !valor(d, k).trim()).map((k) => `${codigo}:${k}`));
  check(`G8) las ${deLaApp.length} claves de la app existen y tienen texto en los ${unicos.length} diccionarios (ni una nueva: son las de Weë AI de siempre)`,
    unicos.length === 16 && faltanApp.length === 0, faltanApp.slice(0, 6).join(' '));
  const faltanServidor = ['es', 'en', 'da'].flatMap((c) => delServidor.filter((k) => typeof valor(DICCIONARIOS[c], k) !== 'string').map((k) => `${c}:${k}`));
  check(`G9) las ${delServidor.length} del servidor (\`motor.*\`) están en los idiomas que traducen su catálogo (es, en, da); los demás caen al inglés por la cadena de siempre`,
    delServidor.length >= 3 && faltanServidor.length === 0, faltanServidor.join(' '));
  /* Y pintadas con el traductor de verdad: en español, en inglés y en portugués de Brasil. */
  const { crearTraductor } = cargar('i18n/traducir.ts');
  const faltan = [];
  const tr = (locale) => crearTraductor(locale, DICCIONARIOS, { alFaltarUnaClave: (k) => faltan.push(`${locale}:${k}`) });
  const [tEs, tEn, tPt] = ['es', 'en', 'pt'].map(tr);
  for (const p of Object.values(P)) for (const t of [tEs, tEn, tPt]) { for (const k of [p.claveTitulo, p.claveMensaje]) if (k) t(k); for (const a of p.acciones) t(M.CLAVE_DE_ACCION[a]); }
  check('G10) pintado con el traductor de la app en es, en y pt-BR no falta ninguna',
    faltan.length === 0 && tEs('common.notAvailable') === 'No disponible' && tEs('motor.notAvailable') === 'Esta función todavía no está disponible.'
    && tPt('common.notAvailable') === 'Indisponível' && tEs(M.CLAVE_DEL_PROGRESO, P.generando.progreso) === '1 de 2 pasos listos', faltan.join(' '));
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
  check('H2) importa solo el núcleo 3D por su puerta y TIPOS de los servicios (nada que se ejecute de ellos)',
    iguales(imports.sort(), ['tipo:../services/creatorService', 'tipo:../services/escena3d', 'valor:../services/escena3d']), imports.join(', '));
  check('H3) no nombra ningún proveedor, modelo, endpoint ni campo de un proveedor, ni siquiera en los comentarios',
    /* `bad_image_url` es un motivo de Weë (servidor), no el campo de un proveedor: por eso los límites de palabra. */
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
  check('H5b) y la frase de un error no se lee nunca (ni para enseñarla ni para buscar en ella)', !/\.message\b|\bmessage\b/.test(codigo));
  check('H6) CONTROL: el detector de frases sí ve una', ['Sube una foto', 'No disponible'].every((s) => /\s|[áéíóúñü¿¡]/i.test(s)));
  check('H7) y ninguna callable se nombra aquí: las llama su servicio, y solo él',
    !/['"](creatorChat|creatorRun|creatorQuote|generateVideo|brainChat)['"]/.test(fuente));
  check('H8) la caja sigue siendo la de siempre: este módulo no pinta ni trae otra caja, otro Brain ni otro router',
    !/CajaDePrompt|CajaQueCrece|TextInput|brainService|useBrainChat|router|Router/.test(codigo));
  check('esta suite está en la cadena de `npm test`', /crear-mundo-3d\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} comprobación(es) fallaron` : `\n✔ «Crear mundo 3D»: el compositor de 3D World (${n} comprobaciones, $0)`);
process.exit(failures ? 1 : 0);
