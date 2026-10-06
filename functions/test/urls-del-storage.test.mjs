/*
 * LAS DIRECCIONES DEL STORAGE QUE LLEGAN DE FUERA (revisión de seguridad 2026-10-06, rama seguridad/urls-del-storage).
 *
 * ── El fallo (preexistente, en las Functions desplegadas) ───────────────────
 *
 * `brainChat` (y `brainQuote`, `creatorChat`, `creatorRun`, `generateVideo`, `avatarReplacement`) aceptan una foto,
 * un documento o un audio por su dirección. La puerta (`assertInputImageUrl` / `assertAttachmentUrl`) solo comprobaba
 * que `parseStorageUrl` la entendiera y que la RUTA empezara por `users/<uid>/`, y devolvía la dirección TAL CUAL.
 * `parseStorageUrl` acepta cualquier host con la forma `/v0/b/<cubo>/o/<ruta>`, y el cubo lo pone quien la escribe.
 * Después, `readImage` (el lector de los adaptadores) probaba el Admin SDK con ESE cubo y, si fallaba —un cubo que no
 * existe, un objeto que no existe—, la pedía por HTTP con la dirección original; y el avatar (`urlToBase64`) la pedía
 * por HTTP siempre. Con la ruta «correcta» y un host ajeno, el servidor iba a buscar a donde dijera la persona (SSRF),
 * y lo que trajera viajaba en línea a un modelo de IA.
 *
 * ── Lo que se comprueba, EJECUTANDO el código compilado y SIN RED ───────────
 *
 *   A · la puerta: solo el host del Storage de Weë, el cubo de Weë y la carpeta de la cuenta, sin trucos de ruta;
 *   B · lo que sale de la puerta es la dirección REESCRITA desde piezas comprobadas, nunca la cadena de la persona;
 *   C · quien lee (`readImage`, `imageDimensions`, `urlToBase64`, un adaptador de verdad) no sale nunca por la red con
 *       algo que tenga forma de Storage; lo único que sigue yendo por HTTPS es lo que arma el propio servidor;
 *   D · las puertas de verdad (callables) rechazan una dirección ajena ANTES de cobrar, leer o pedir nada;
 *   E · una sola regla, en el código: quién la usa y quién no puede saltársela.
 *
 * `fetch` está sustituido (cada petición queda anotada) y el cubo es de mentira: aquí no sale nada a ningún sitio.
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* El cubo de Weë de esta prueba, sin Firebase: `nombreDelCuboDeWee` lo lee de STORAGE_BUCKET. Sin emulador. */
const CUBO = 'get-wee.firebasestorage.app';
const entornoAntes = { cubo: process.env.STORAGE_BUCKET, emulador: process.env.FIREBASE_STORAGE_EMULATOR_HOST, clave: process.env.DEEPSEEK_API_KEY };
process.env.STORAGE_BUCKET = CUBO;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

/* ── La red, vigilada: ningún `fetch` de verdad sale de esta prueba ─────────── */
const peticiones = [];
const opcionesDeRed = [];
const fetchAntes = globalThis.fetch;
const RESPUESTA_DE_DEEPSEEK = { choices: [{ message: { content: 'Veo un faro.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 12, completion_tokens: 4 } };
globalThis.fetch = async (url, opciones) => {
  peticiones.push(String(url));
  opcionesDeRed.push(opciones || {});
  const deDeepseek = String(url).startsWith('https://api.deepseek.com/');
  return {
    ok: true,
    status: 200,
    headers: new Map([['content-type', deDeepseek ? 'application/json' : 'image/png']]),
    text: async () => (deDeepseek ? JSON.stringify(RESPUESTA_DE_DEEPSEEK) : ''),
    arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
  };
};
const sinRed = () => peticiones.length === 0;
const limpiarRed = () => { peticiones.length = 0; opcionesDeRed.length = 0; };

const http = lib('engine/http.js');
const inputs = lib('creator/inputs.js');
const { EngineError } = lib('engine/errors.js');

/* ── El cubo de mentira: qué objetos hay, qué se lee y cómo falla ─────────── */
const FOTO_RUTA = 'users/uAna/creator-inputs/1700000000000-abc123.jpg';
const objetos = new Map([
  [FOTO_RUTA, { bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), contentType: 'image/jpeg', metadata: { width: '1200', height: '800' } }],
]);
const leidos = [];
let falloDelCubo = null;
const cuboFalso = {
  name: CUBO,
  file: (ruta) => ({
    download: async () => {
      leidos.push(ruta);
      if (falloDelCubo) throw Object.assign(new Error('el Storage no contestó'), { code: falloDelCubo });
      const o = objetos.get(ruta);
      if (!o) throw Object.assign(new Error(`No such object: ${CUBO}/${ruta}`), { code: 404 });
      return [o.bytes];
    },
    getMetadata: async () => {
      const o = objetos.get(ruta);
      if (!o) throw Object.assign(new Error('No such object'), { code: 404 });
      return [{ contentType: o.contentType, metadata: o.metadata }];
    },
  }),
};
const storageBucketReal = http.storageBucket;
http.storageBucket = () => cuboFalso;

/* ── Direcciones ───────────────────────────────────────────────────────────── */
const TESTIGO = '8c1f0a5e-1b2c-4d3e-9f40-123456789abc';
const GOOGLE = 'https://firebasestorage.googleapis.com';
/* La dirección tal como la da `getDownloadURL` (Firebase JS SDK): host, cubo y ruta codificados, `alt=media` y el testigo. */
const enStorage = (ruta, { cubo = CUBO, host = GOOGLE, testigo = TESTIGO, crudo = false } = {}) =>
  `${host}/v0/b/${cubo}/o/${crudo ? ruta : encodeURIComponent(ruta)}?alt=media${testigo ? `&token=${testigo}` : ''}`;
const FOTO = enStorage(FOTO_RUTA);

const NO_ES_DE_WEE = 'La foto debe subirse a Weë antes de usarla.';
const NO_ES_TUYA = 'Esa foto no es tuya.';
const NO_VALIDA = 'La dirección de la foto no es válida.';
/** Lo que dice la puerta de la foto: la dirección reescrita, o su frase (o el error que no es de la puerta, a la vista). */
const puerta = (url, cuenta = 'uAna') => {
  try {
    return inputs.assertInputImageUrl(url, cuenta);
  } catch (e) {
    return e instanceof EngineError ? `✗ ${e.message}` : `✗✗ ${e && e.constructor && e.constructor.name}: ${e && e.message}`;
  }
};
const todas = (lista, esperado) => lista.filter((u) => puerta(u) !== `✗ ${esperado}`);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La puerta: host del Storage de Weë, cubo de Weë y carpeta de la cuenta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('A1) la foto propia, tal como la da getDownloadURL, entra y sale IGUAL (ni la huella de la petición ni lo que enseña la app cambian)', puerta(FOTO) === FOTO, puerta(FOTO));
  const sinTestigo = enStorage(FOTO_RUTA, { testigo: '' });
  check('A2) sin testigo también es suya, y sale igual', puerta(sinTestigo) === sinTestigo, puerta(sinTestigo));

  const HOSTS_AJENOS = [
    enStorage(FOTO_RUTA, { host: 'https://evil.example' }),
    enStorage(FOTO_RUTA, { host: 'https://firebasestorage.googleapis.com.evil.example' }),
    enStorage(FOTO_RUTA, { host: 'https://firebasestorage.googleapis.com@evil.example' }),
    enStorage(FOTO_RUTA, { host: 'https://firebasestorage.googleapis.com:8443' }),
    enStorage(FOTO_RUTA, { host: 'http://firebasestorage.googleapis.com' }),
    enStorage(FOTO_RUTA, { host: 'HTTPS://FIREBASESTORAGE.GOOGLEAPIS.COM' }),
    enStorage(FOTO_RUTA, { host: 'http://169.254.169.254' }),
    enStorage(FOTO_RUTA, { host: 'http://metadata.google.internal' }),
    enStorage(FOTO_RUTA, { host: 'http://10.0.0.7:8080' }),
    enStorage(FOTO_RUTA, { host: 'http://localhost:8080' }),
    enStorage(FOTO_RUTA, { host: 'http://127.0.0.1:9199' }),
    `https://storage.googleapis.com.evil.example/${CUBO}/${FOTO_RUTA}`,
  ];
  const pasan = todas(HOSTS_AJENOS, NO_ES_DE_WEE);
  check(`A3) un host ajeno con la ruta «correcta» no es del Storage de Weë (${HOSTS_AJENOS.length} formas: otro dominio, parecidos, puerto, usuario, http, el servidor de metadatos, la red interna, esta máquina sin emulador)`,
    pasan.length === 0, pasan.map((u) => `${u} → ${puerta(u)}`).join(' | ') || 'todas rechazadas');

  const CUBOS_AJENOS = [
    enStorage(FOTO_RUTA, { cubo: 'otro-proyecto.appspot.com' }),
    enStorage(FOTO_RUTA, { cubo: `${CUBO}.evil` }),
    `gs://cubo-ajeno/${FOTO_RUTA}`,
    `https://storage.googleapis.com/cubo-ajeno/${FOTO_RUTA}`,
    `gs://${CUBO}x/${FOTO_RUTA}`,
  ];
  const pasanCubos = todas(CUBOS_AJENOS, NO_ES_DE_WEE);
  check(`A4) un cubo ajeno con la ruta «correcta» tampoco (${CUBOS_AJENOS.length}: el de otro proyecto, parecidos, gs:// y Cloud Storage de otro cubo)`,
    pasanCubos.length === 0, pasanCubos.map((u) => `${u} → ${puerta(u)}`).join(' | ') || 'todos rechazados');

  const AJENAS = [enStorage('users/uBea/creator-inputs/a.jpg'), enStorage('users/uAnaX/creator-inputs/a.jpg'), `gs://${CUBO}/users/uBea/a.jpg`, enStorage('assets/plantillas/a.jpg')];
  const pasanAjenas = todas(AJENAS, NO_ES_TUYA);
  check('A5) la carpeta de otra cuenta, o una que se le parece, no es tuya (prefijo entero: `users/uAnaX/` no es de `uAna`)',
    pasanAjenas.length === 0, pasanAjenas.map((u) => `${u} → ${puerta(u)}`).join(' | ') || 'todas rechazadas');

  const TRUCOS = [
    enStorage('users/uAna/../uBea/secreto.jpg'),
    enStorage('users/uAna/creator-inputs/%2E%2E/%2E%2E/uBea/secreto.jpg', { crudo: true }),
    enStorage('users%2FuAna%2F..%2FuBea%2Fsecreto.jpg', { crudo: true }),
    enStorage('users%2FuAna%2F%2E%2E%2FuBea%2Fsecreto.jpg', { crudo: true }),
    enStorage('users%2FuAna%2F%252E%252E%2FuBea%2Fsecreto.jpg', { crudo: true }),
    enStorage('users/uAna/../../../../computeMetadata/v1/', { crudo: true }),
    enStorage('users/uAna/./a.jpg'),
    enStorage('users/uAna//a.jpg'),
    enStorage('users/uAna/a\\..\\..\\uBea.jpg'),
    enStorage('users/uAna/a\u0000.jpg'),
    enStorage('users/uAna/a%0A.jpg', { crudo: true }),
    `gs://${CUBO}/users/uAna/../uBea/a.jpg`,
    `https://storage.googleapis.com/${CUBO}/users/uAna/%2e%2e/uBea/a.jpg`,
  ];
  const pasanTrucos = todas(TRUCOS, NO_VALIDA);
  check(`A6) los trucos de ruta no pasan (${TRUCOS.length}: \`..\` en claro y codificado, %2F, %2E, doble codificación, \`.\`, \`//\`, barras invertidas, caracteres de control)`,
    pasanTrucos.length === 0, pasanTrucos.map((u) => `${u} → ${puerta(u)}`).join(' | ') || 'todos rechazados');
  check('A6b) y una dirección que no se puede decodificar (un % roto) ya no rompe la puerta con un error interno: no es del Storage de Weë',
    puerta(enStorage('users%2FuAna%2Fx%E0%A4%A.png', { crudo: true })) === `✗ ${NO_ES_DE_WEE}`);

  const TESTIGOS_RAROS = [`${FOTO}&token=otro`, enStorage(FOTO_RUTA, { testigo: '../../x' }), enStorage(FOTO_RUTA, { testigo: 'a b' }), enStorage(FOTO_RUTA, { testigo: 'x%2F..%2F' })];
  const pasanTestigos = todas(TESTIGOS_RAROS, NO_VALIDA);
  check('A7) un testigo que no es un testigo (dos, con barras, con espacios) no se arrastra a la dirección reescrita',
    pasanTestigos.length === 0, pasanTestigos.map((u) => `${u} → ${puerta(u)}`).join(' | ') || 'todos rechazados');

  const NO_DIRECCIONES = ['data:image/png;base64,iVBORw0KGgo=', 'blob:https://wee.zone/1234', 'file:///etc/passwd', 'javascript:alert(1)', 'https://example.com/foto.jpg', 'ftp://evil.example/v0/b/x/o/y'];
  const pasanOtras = todas(NO_DIRECCIONES, NO_ES_DE_WEE);
  check('A8) data:, blob:, file:, javascript:, una URL de internet y otros esquemas: nada de eso es del Storage de Weë',
    pasanOtras.length === 0, pasanOtras.map((u) => `${u} → ${puerta(u)}`).join(' | ') || 'todas rechazadas');
  check('A8b) la puerta sigue pidiendo la foto cuando falta y cortando las direcciones enormes, con sus frases de siempre',
    puerta('') === '✗ Sube una foto para que Weë pueda trabajar con ella.' && puerta(undefined) === '✗ Sube una foto para que Weë pueda trabajar con ella.'
    && puerta(enStorage(`users/uAna/${'a'.repeat(2100)}.jpg`)) === `✗ ${NO_VALIDA}`);

  /* Documentos y audio: la MISMA regla, con sus palabras de siempre. */
  const adjunto = (url, cuenta, clase) => {
    try { return inputs.assertAttachmentUrl(url, cuenta, clase); } catch (e) { return e instanceof EngineError ? `✗ ${e.message}` : `✗✗ ${e && e.message}`; }
  };
  const PDF = enStorage('users/uAna/brain-attachments/informe.pdf');
  check('A9) un documento propio entra y sale igual', adjunto(PDF, 'uAna', 'document') === PDF);
  check('A9) un documento con host ajeno: «debe subirse a Weë»', adjunto(enStorage('users/uAna/brain-attachments/x.pdf', { host: 'https://evil.example' }), 'uAna', 'document') === '✗ El documento debe subirse a Weë antes de usarlo.');
  check('A9) un documento de un cubo ajeno, igual', adjunto(`gs://cubo-ajeno/users/uAna/x.pdf`, 'uAna', 'document') === '✗ El documento debe subirse a Weë antes de usarlo.');
  check('A9) un audio de otra cuenta: «no es tuyo»', adjunto(enStorage('users/uBea/brain-attachments/nota.mp3'), 'uAna', 'audio') === '✗ Ese audio no es tuyo.');
  check('A9) un audio con trucos de ruta: «no es válida»', adjunto(enStorage('users%2FuAna%2F..%2FuBea%2Fnota.mp3', { crudo: true }), 'uAna', 'audio') === '✗ La dirección del audio no es válida.');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Lo que sale de la puerta: la dirección REESCRITA, nunca la de la persona ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const conBasura = `${FOTO}&evil=1&alt=json#https://evil.example/`;
  const limpia = puerta(conBasura);
  check('B1) lo que sobra en la consulta o el fragmento no viaja: sale la dirección de siempre', limpia === FOTO, limpia);
  const gs = puerta(`gs://${CUBO}/users/uAna/creator-inputs/a b.png`);
  check('B2) una gs:// propia sale como gs:// del cubo de Weë, y se lee exactamente la misma ruta',
    gs === `gs://${CUBO}/users/uAna/creator-inputs/a%20b.png` && http.parseStorageUrl(gs)?.path === 'users/uAna/creator-inputs/a b.png', gs);
  const gcs = puerta(`https://storage.googleapis.com/${CUBO}/users/uAna/creator-inputs/a.png`);
  check('B3) la de Cloud Storage propia, también como gs://', gcs === `gs://${CUBO}/users/uAna/creator-inputs/a.png`, gcs);
  const ACEPTADAS = [FOTO, enStorage(FOTO_RUTA, { testigo: '' }), conBasura, `gs://${CUBO}/${FOTO_RUTA}`, `https://storage.googleapis.com/${CUBO}/${FOTO_RUTA}`, enStorage(FOTO_RUTA, { crudo: true })];
  const fuera = ACEPTADAS.map((u) => puerta(u)).filter((r) => !(r.startsWith(`${GOOGLE}/v0/b/${CUBO}/o/`) || r.startsWith(`gs://${CUBO}/`)));
  check('B4) todo lo que la puerta deja pasar sale con el host de Google y el cubo de Weë: ni un host, ni un cubo, ni un parámetro de la persona', fuera.length === 0, fuera.join(' | '));
  check('B5) la regla es UNA: lo que devuelve la puerta es lo que devuelve `direccionDeLaCuenta`',
    typeof http.direccionDeLaCuenta === 'function' && ACEPTADAS.every((u) => http.direccionDeLaCuenta(u, 'uAna').url === puerta(u)));

  /* El emulador cuenta SOLO cuando este proceso corre contra él, y sale con la dirección del emulador de ESTE entorno. */
  const local = enStorage(FOTO_RUTA, { host: 'http://localhost:9199' });
  check('B6) sin emulador, una dirección de esta máquina no es del Storage de Weë', puerta(local) === `✗ ${NO_ES_DE_WEE}`);
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
  const enElEmulador = puerta(local);
  const enElEmulador2 = puerta(enStorage(FOTO_RUTA, { host: 'http://127.0.0.1:9199' }));
  const ajenaEnElEmulador = puerta(enStorage(FOTO_RUTA, { host: 'http://10.0.0.7:9199' }));
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  check('B6) con el emulador, la suya entra y sale con el host del emulador de este entorno',
    enElEmulador === `http://127.0.0.1:9199/v0/b/${CUBO}/o/${encodeURIComponent(FOTO_RUTA)}?alt=media&token=${TESTIGO}` && enElEmulador2 === enElEmulador, `${enElEmulador} | ${enElEmulador2}`);
  check('B6) y ni con el emulador vale otra máquina de la red', ajenaEnElEmulador === `✗ ${NO_ES_DE_WEE}`, ajenaEnElEmulador);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Quien lee no sale por la red con nada que tenga forma de Storage ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const leer_ = async (url, quien = 'prueba') => {
    try { return { ok: true, v: await http.readImage(url, quien) }; } catch (e) { return { ok: false, e }; }
  };
  limpiarRed(); leidos.length = 0;
  const propia = await leer_(FOTO);
  check('C1) la foto propia se lee del cubo de Weë con el Admin SDK, sin red', propia.ok && propia.v.contentType === 'image/jpeg' && leidos.join() === FOTO_RUTA && sinRed(), JSON.stringify({ leidos, peticiones }));

  limpiarRed(); leidos.length = 0;
  const hostAjenoQueExiste = await leer_(enStorage(FOTO_RUTA, { host: 'https://evil.example' }));
  check('C2) con un host ajeno y el cubo de Weë, el lector no va a ese host: lee el objeto del cubo, por su ruta',
    hostAjenoQueExiste.ok && leidos.join() === FOTO_RUTA && sinRed(), JSON.stringify({ leidos, peticiones }));

  limpiarRed(); leidos.length = 0;
  const elAtaque = await leer_(enStorage('users/uAna/no-existe.png', { host: 'https://evil.example' }));
  check('C3) EL ATAQUE: host ajeno + ruta que no existe. Antes se pedía por HTTP a ese host; ahora falla y NO sale nada a la red',
    !elAtaque.ok && elAtaque.e instanceof http.ProviderError && elAtaque.e.retryable === false && elAtaque.e.status === 400 && sinRed(),
    JSON.stringify({ peticiones, error: elAtaque.e && elAtaque.e.message }));

  limpiarRed(); leidos.length = 0;
  const cuboAjeno = await leer_(enStorage(FOTO_RUTA, { host: 'https://evil.example', cubo: 'cubo-del-atacante' }));
  const gsAjeno = await leer_(`gs://cubo-del-atacante/${FOTO_RUTA}`);
  const gcsAjeno = await leer_(`https://storage.googleapis.com/cubo-del-atacante/${FOTO_RUTA}`);
  check('C4) un cubo ajeno, por cualquiera de las tres formas, no se lee de NINGÚN sitio: ni del Admin SDK ni de la red',
    [cuboAjeno, gsAjeno, gcsAjeno].every((r) => !r.ok && r.e instanceof http.ProviderError && r.e.retryable === false && r.e.status === 400) && leidos.length === 0 && sinRed(),
    JSON.stringify({ leidos, peticiones }));

  limpiarRed();
  const rota = await leer_(enStorage('users%2FuAna%2Fx%E0%A4%A.png', { crudo: true }));
  check('C5) una dirección con forma de Storage que no se puede decodificar tampoco sale a la red', !rota.ok && rota.e instanceof http.ProviderError && sinRed());

  limpiarRed();
  const INTERNAS = ['http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token', 'http://localhost:8080/', 'http://metadata.google.internal/', 'ftp://evil.example/x', 'file:///etc/passwd'];
  const internas = await Promise.all(INTERNAS.map((u) => leer_(u)));
  check('C6) lo que no es del Storage solo se descarga por HTTPS: ni el servidor de metadatos, ni esta máquina, ni otros esquemas',
    internas.every((r) => !r.ok && r.e instanceof http.ProviderError) && sinRed(), JSON.stringify(peticiones));

  limpiarRed();
  const R2 = 'https://cuenta.r2.cloudflarestorage.com/medios/users/uAna/foto.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc';
  const entrega = await leer_(R2);
  check('C7) CONTROL: la entrega firmada que arma el propio servidor (Media Cloud) sigue leyéndose por HTTPS, una vez',
    entrega.ok && peticiones.length === 1 && peticiones[0] === R2, JSON.stringify(peticiones));
  check('C7) …y SIN seguir redirecciones: una entrega firmada no redirige, y una redirección podría llevar a http:// o a otra máquina',
    opcionesDeRed.length === 1 && opcionesDeRed[0].redirect === 'manual', JSON.stringify(opcionesDeRed.map((o) => o.redirect)));

  limpiarRed();
  const enLinea = await leer_('data:image/png;base64,iVBORw0KGgo=');
  check('C8) CONTROL: una imagen en línea se decodifica aquí, sin red', enLinea.ok && enLinea.v.contentType === 'image/png' && sinRed());

  limpiarRed(); leidos.length = 0;
  falloDelCubo = 503;
  const caido = await leer_(FOTO);
  falloDelCubo = 403;
  const sinPermiso = await leer_(FOTO);
  falloDelCubo = null;
  check('C9) si el Storage falla de verdad (503), el error se puede reintentar… y tampoco se intenta por la red',
    !caido.ok && caido.e instanceof http.ProviderError && caido.e.retryable === true && sinRed(), caido.e && caido.e.message);
  check('C9) un permiso que falta (403) no se arregla reintentando, y el porqué queda en el mensaje para el registro',
    !sinPermiso.ok && sinPermiso.e instanceof http.ProviderError && sinPermiso.e.retryable === false && /no se pudo leer el archivo del Storage de Weë/.test(sinPermiso.e.message));

  /*
   * Lo que el lector rechaza o no consigue leer pasa ANTES de mandarle nada al proveedor: no es un fallo SUYO. El libro
   * lo apunta a coste cero, y el Gateway no convierte un 403 del Storage en una credencial rechazada del proveedor.
   */
  const { costeTrasUnFallo } = lib('engine/router.js');
  const { normalizarErrorDelMotor } = lib('engine/gateway.js');
  const antesDeEnviar = [elAtaque, cuboAjeno, rota, caido, sinPermiso, ...internas].map((r) => r.e);
  check('C9b) todo lo que falla en el lector se apunta a coste CERO: no salió nada hacia el proveedor',
    antesDeEnviar.every((e) => e instanceof http.ProviderError && e.status === 400 && costeTrasUnFallo(e, false) === 'cero'),
    antesDeEnviar.map((e) => `${e && e.status}:${costeTrasUnFallo(e, false)}`).join(' '));
  check('C9b) y un 403 del Storage no se cuenta como una credencial rechazada del proveedor',
    normalizarErrorDelMotor(sinPermiso.e, 'gemini').details?.reason !== 'provider_auth_failed', JSON.stringify(normalizarErrorDelMotor(sinPermiso.e, 'gemini').details));

  /*
   * La rama HTTPS (la entrega firmada) y los topes de tamaño, igual: lo que falla ahí también pasa antes de mandarle
   * nada al proveedor. Una firma caducada (403) no es una credencial del proveedor; una redirección (que llega como su
   * 3xx: no se sigue) no se arregla reintentando; un fallo de red, sí.
   */
  const respuestaAntes = globalThis.fetch;
  const conLaRed = async (fn, respuesta) => {
    globalThis.fetch = async (url, opciones) => { peticiones.push(String(url)); opcionesDeRed.push(opciones || {}); return respuesta(); };
    try { return await fn(); } finally { globalThis.fetch = respuestaAntes; }
  };
  const fallo = (status) => () => ({ ok: false, status, headers: new Map(), text: async () => 'no', arrayBuffer: async () => new ArrayBuffer(0) });
  limpiarRed();
  const caducada = await conLaRed(() => leer_(R2), fallo(403));
  const redirigida = await conLaRed(() => leer_(R2), fallo(302));
  const sinRespuesta = await conLaRed(() => leer_(R2), () => { throw new TypeError('fetch failed'); });
  const enorme = await leer_(`data:image/png;base64,${Buffer.alloc(20 * 1024 * 1024 + 1).toString('base64')}`);
  const deLaEntrega = [caducada, redirigida, sinRespuesta, enorme].map((r) => r.e);
  check('C9c) en la entrega firmada y en los topes de tamaño, también: 400 y coste cero',
    deLaEntrega.every((e) => e instanceof http.ProviderError && e.status === 400 && costeTrasUnFallo(e, false) === 'cero'),
    deLaEntrega.map((e) => `${e && e.status}:${costeTrasUnFallo(e, false)}`).join(' '));
  check('C9c) una firma caducada no es una credencial del proveedor, y una redirección no se reintenta; un fallo de red, sí',
    normalizarErrorDelMotor(caducada.e, 'seedance').details?.reason !== 'provider_auth_failed'
    && caducada.e.retryable === false && redirigida.e.retryable === false && sinRespuesta.e.retryable === true && enorme.e.retryable === false
    && opcionesDeRed.slice(0, 3).every((o) => o.redirect === 'manual'),
    `${caducada.e && caducada.e.retryable} ${redirigida.e && redirigida.e.retryable} ${sinRespuesta.e && sinRespuesta.e.retryable}`);

  /* El tamaño de la foto (para el precio) se lee del mismo cubo, con la misma regla. */
  const { imageDimensions } = lib('engine/imageMeta.js');
  limpiarRed(); leidos.length = 0;
  const medidas = await imageDimensions(FOTO).catch((e) => ({ error: e.message }));
  const medidasAjenas = await imageDimensions(enStorage(FOTO_RUTA, { cubo: 'cubo-del-atacante' })).catch((e) => ({ error: e.message }));
  check('C10) las medidas de la foto se leen del cubo de Weë; las de un cubo ajeno no se leen de ningún sitio',
    medidas && medidas.width === 1200 && medidas.height === 800 && medidasAjenas === null && sinRed(), JSON.stringify({ medidas, medidasAjenas, peticiones }));

  /* El avatar: antes `fetch(url)` a lo que llegara. */
  const vertex = lib('vertexAI.js');
  limpiarRed(); leidos.length = 0;
  const avatarAtaque = await vertex.urlToBase64(enStorage('users/uAna/face-swap/no-existe.jpg', { host: 'https://evil.example' })).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  const avatarPropio = await vertex.urlToBase64(FOTO).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  check('C11) el avatar lee sus dos fotos con el lector común: la ajena falla sin red, la propia sale del cubo',
    !avatarAtaque.ok && avatarPropio.ok && avatarPropio.v.base64 === Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64') && avatarPropio.v.mimeType === 'image/jpeg' && sinRed(),
    JSON.stringify({ peticiones, error: avatarAtaque.e && avatarAtaque.e.message }));

  /* Un adaptador de verdad (DeepSeek, el de Weë Brain), con la API sustituida: la única petición es a su API. */
  const { deepseekAdapter } = lib('engine/providers/deepseek.js');
  const modelo = deepseekAdapter.models.find((m) => m.capabilities.includes('text.generate'));
  process.env.DEEPSEEK_API_KEY = 'de-prueba-no-es-una-clave';
  const conFoto = (imageUrl) => deepseekAdapter.run({
    capability: 'text.generate', model: modelo, input: { system: 'prueba', prompt: '¿Qué ves?', imageUrl }, ctx: { userId: 'uAna' }, prefs: {}, timeoutMs: 5_000,
  }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  limpiarRed();
  const conLaPropia = await conFoto(puerta(FOTO));
  const soloLaApi = peticiones.slice();
  limpiarRed();
  const conLaAjena = await conFoto(enStorage('users/uAna/no-existe.png', { host: 'https://evil.example' }));
  check('C12) Weë Brain con la foto propia: la foto se lee del cubo y la ÚNICA petición es a la API de DeepSeek',
    conLaPropia.ok && soloLaApi.length === 1 && soloLaApi[0].startsWith('https://api.deepseek.com/'), JSON.stringify(soloLaApi));
  check('C12) y si una dirección ajena se colara hasta el adaptador, falla antes de cualquier petición (ni al host ajeno ni a la API)',
    !conLaAjena.ok && sinRed(), JSON.stringify(peticiones));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Las puertas de verdad rechazan una dirección ajena antes de cobrar o pedir nada ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const AJENA = enStorage('users/uAna/no-existe.png', { host: 'https://evil.example' });
  const intento = (callable, data, uid = 'uAna') => callable.run({ auth: { uid }, data }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  const rechazo = (r, frase) => !r.ok && r.e && r.e.message === frase && (r.e.code === 'invalid-argument' || r.e instanceof EngineError);

  const { brainChat, brainQuote } = lib('creator/brain.js');
  limpiarRed();
  const chat = await intento(brainChat, { message: '¿Qué hay en esta foto?', messageId: 'msg_ssrf_0001', imageUrl: AJENA });
  check('D1) brainChat: una foto con host ajeno se rechaza en la puerta, sin red', rechazo(chat, NO_ES_DE_WEE) && sinRed(), `${chat.e && chat.e.code}: ${chat.e && chat.e.message}`);
  const doc = await intento(brainChat, { message: 'Léelo', messageId: 'msg_ssrf_0002', webSearch: true, documentUrl: `gs://cubo-ajeno/users/uAna/x.pdf` });
  check('D2) brainChat con búsqueda: un documento de un cubo ajeno, igual', rechazo(doc, 'El documento debe subirse a Weë antes de usarlo.') && sinRed(), `${doc.e && doc.e.code}: ${doc.e && doc.e.message}`);
  const cotiza = await intento(brainQuote, { message: 'Transcribe', audioUrl: enStorage('users/uBea/brain-attachments/nota.mp3') });
  check('D3) brainQuote: un audio de otra cuenta, «no es tuyo»', rechazo(cotiza, 'Ese audio no es tuyo.') && sinRed(), `${cotiza.e && cotiza.e.code}: ${cotiza.e && cotiza.e.message}`);

  const { generateVideo } = lib('creator/video.js');
  const video = await intento(generateVideo, { prompt: 'Un faro al amanecer', requestId: 'video_ssrf_0001', inputImage: AJENA });
  const referencia = await intento(generateVideo, { prompt: 'Un faro al amanecer', requestId: 'video_ssrf_0002', references: { videos: [enStorage('users/uAna/r.mp4', { host: 'https://evil.example' })] } });
  check('D4) generateVideo: la foto de partida y los vídeos de referencia, con la misma regla', rechazo(video, NO_ES_DE_WEE) && rechazo(referencia, NO_ES_DE_WEE) && sinRed(),
    `${video.e && video.e.message} | ${referencia.e && referencia.e.message}`);

  /* El avatar: el Credit Engine y la configuración, sustituidos y contados. */
  const configMod = lib('engine/config.js');
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');
  const motor = lib('credits/creditEngine.js').creditEngine;
  const avatar = lib('generateAvatar.js');
  const antes = { config: configMod.loadConfig, cuenta: motor.ensureAccount, gasta: motor.spendCredits, historial: motor.getCreditHistory, reembolsa: motor.refundCredits };
  let cobros = 0;
  configMod.loadConfig = async () => ({ settings: { ...DEFAULT_SETTINGS } });
  motor.ensureAccount = async () => ({});
  motor.getCreditHistory = async () => [];
  motor.spendCredits = async () => { cobros++; return { transactionId: 'usage_x', status: 'AUTHORIZED', amount: 5, duplicate: false }; };
  motor.refundCredits = async () => ({ transactionId: 'refund_x', amount: 5, balanceAfter: 0, duplicate: false });
  limpiarRed();
  const reemplazo = await intento(avatar.avatarReplacement, { requestId: 'avatar_ssrf_0001', selfieUrl: AJENA, avatarUrl: FOTO });
  Object.assign(configMod, { loadConfig: antes.config });
  Object.assign(motor, { ensureAccount: antes.cuenta, spendCredits: antes.gasta, getCreditHistory: antes.historial, refundCredits: antes.reembolsa });
  check('D5) avatarReplacement: la selfie con host ajeno se rechaza ANTES de cobrar, y no sale nada a la red',
    !reemplazo.ok && reemplazo.e && reemplazo.e.message === NO_ES_DE_WEE && cobros === 0 && sinRed(), `${reemplazo.e && reemplazo.e.message} · cobros ${cobros} · ${JSON.stringify(peticiones)}`);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Una sola regla, en el código ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const HTTP = sinComentarios(leer('functions/src/engine/http.ts'));
  const INPUTS = sinComentarios(leer('functions/src/creator/inputs.ts'));
  const lector = HTTP.slice(HTTP.indexOf('export async function readImage'));
  check('E1) la puerta usa la regla común y devuelve SIEMPRE la dirección reescrita, nunca la que llegó',
    (INPUTS.match(/direccionDeLaCuenta\(url, uid\)/g) || []).length === 2 && (INPUTS.match(/return direccion\.url;/g) || []).length === 2
    && !/parseStorageUrl|return url;/.test(INPUTS));
  check('E2) el lector no elige el cubo que diga la dirección y solo pide por la red lo que NO tiene forma de Storage, por HTTPS y sin redirecciones',
    !/\.bucket\(own\.bucket\)|getStorage\(\)\.bucket\(/.test(lector)
    && lector.indexOf('objetoDelStorageDeWee(url)') > 0 && lector.indexOf("startsWith('https://')") > lector.indexOf('objetoDelStorageDeWee(url)')
    && lector.indexOf("fetchBytes(url, { provider, timeoutMs: 60_000, redirect: 'manual' })") > lector.indexOf("startsWith('https://')"));
  check('E3) las medidas de la foto, con la misma regla y del mismo cubo',
    /objetoDelStorageDeWee\(url\)/.test(leer('functions/src/engine/imageMeta.ts')) && !/getStorage|parseStorageUrl/.test(sinComentarios(leer('functions/src/engine/imageMeta.ts'))));
  const VERTEX = sinComentarios(leer('functions/src/vertexAI.ts'));
  check('E4) el avatar ya no tiene un `fetch` propio: lee con el lector común, importado a la vista (sin `import()`)',
    !/\bfetch\(/.test(VERTEX) && /await readImage\(url, 'avatar'\)/.test(VERTEX)
    && /import \{ downloadUrlFor, readImage \} from '\.\/engine\/http';/.test(VERTEX) && !/import\('\.\/engine\/http'\)/.test(VERTEX));
  check('E5) WeeTalk usa los mismos hosts: la regla vive en un solo sitio',
    /import \{ esDireccionDelStorageDeWee, storageBucket \} from '\.\.\/engine\/http';/.test(leer('functions/src/social/weetalk.ts'))
    && !/FORMA_DE_DIRECCION_DE_WEE/.test(sinComentarios(leer('functions/src/social/weetalk.ts'))));

  /* Cada puerta que recibe una dirección de la persona la pasa por la regla común. */
  const BRAIN = leer('functions/src/creator/brain.ts');
  const CREATOR = leer('functions/src/creator/index.ts');
  const VIDEO = leer('functions/src/creator/video.ts');
  const AVATAR = leer('functions/src/generateAvatar.ts');
  check('E6) brainQuote y brainChat: la foto, el documento y el audio, los tres por la puerta (las dos veces)',
    (BRAIN.match(/assertInputImageUrl\(data\.imageUrl, uid\)/g) || []).length === 2
    && (BRAIN.match(/assertAttachmentUrl\(data\.documentUrl, uid, 'document'\)/g) || []).length === 2
    && (BRAIN.match(/assertAttachmentUrl\(data\.audioUrl, uid, 'audio'\)/g) || []).length === 2);
  check('E6) creatorChat (al crear y al adjuntar), generateVideo (partida, último cuadro y referencias) y avatarReplacement (las dos fotos)',
    (CREATOR.match(/assertInputImageUrl\(data\.imageUrl, uid\)/g) || []).length === 2
    && /assertInputImageUrl\(inputImage, uid\)/.test(VIDEO) && /assertInputImageUrl\(data\.lastFrameImage, uid\)/.test(VIDEO)
    && /values\.slice\(0, 30\)\.map\(\(value\) => assertInputImageUrl\(value, uid\)\)/.test(VIDEO)
    && /assertInputImageUrl\(request\.data\?\.selfieUrl, request\.auth\.uid\)/.test(AVATAR) && /assertInputImageUrl\(request\.data\?\.avatarUrl, request\.auth\.uid\)/.test(AVATAR));

  /*
   * NADIE MÁS SALE A LA RED CON LO QUE DIGA OTRO. `fetch(` solo en el motor (fetchJson/fetchBytes) y en el aviso push
   * (host de Expo, fijo); `fetchBytes(` solo en el motor, en la voz (la API de ElevenLabs) y en el materializador (lo
   * que devuelve un proveedor). Un `fetch` nuevo en cualquier otro sitio tiene que pasar por aquí y decir de dónde viene
   * su dirección.
   */
  const SRC = path.resolve(here, '../src');
  const todos = fs.readdirSync(SRC, { recursive: true }).map((f) => String(f).split(path.sep).join('/')).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
  const quienes = (re) => todos.filter((f) => re.test(sinComentarios(fs.readFileSync(path.join(SRC, f), 'utf8')))).sort();
  check('E7) `fetch(` solo en el motor y en el aviso push', JSON.stringify(quienes(/\bfetch\(/)) === JSON.stringify(['engine/http.ts', 'index.ts']), quienes(/\bfetch\(/).join(', '));
  check('E7) `fetchBytes(` solo en el motor, en la voz y en el materializador',
    JSON.stringify(quienes(/\bfetchBytes\(/)) === JSON.stringify(['content/materializador.ts', 'engine/http.ts', 'engine/providers/elevenlabs.ts']), quienes(/\bfetchBytes\(/).join(', '));
  /* Y quién lee archivos de entrada: los adaptadores y el avatar. Uno nuevo tiene que pasar por aquí. */
  check('E7) `readImage(` solo en los adaptadores que leen archivos de entrada y en el avatar',
    JSON.stringify(quienes(/\breadImage\(/)) === JSON.stringify(['engine/http.ts', 'engine/providers/deepseek.ts', 'engine/providers/fal.ts', 'engine/providers/flux.ts',
      'engine/providers/gemini.ts', 'engine/providers/seedance.ts', 'engine/providers/seedream.ts', 'vertexAI.ts']), quienes(/\breadImage\(/).join(', '));
  /*
   * Y quién reconoce la FORMA de una dirección de Firebase (`/v0/b/…`): el motor y, como deuda registrada en el informe
   * de esta revisión, el contrato del mundo 3D (`rutaEnElStorageDeWee`, que la app espeja). Un tercer lector, no.
   */
  check('E8) la forma `/v0/b/` solo se lee en engine/http.ts (y en core/mundo3d.ts, deuda registrada): ni un lector más',
    JSON.stringify(quienes(/v0\\?\/b\\?\//)) === JSON.stringify(['core/mundo3d.ts', 'engine/http.ts']), quienes(/v0\\?\/b\\?\//).join(', '));
}

/* ── Se deja todo como estaba ─────────────────────────────────────────────── */
http.storageBucket = storageBucketReal;
globalThis.fetch = fetchAntes;
for (const [clave, valor] of [['STORAGE_BUCKET', entornoAntes.cubo], ['FIREBASE_STORAGE_EMULATOR_HOST', entornoAntes.emulador], ['DEEPSEEK_API_KEY', entornoAntes.clave]]) {
  if (valor === undefined) delete process.env[clave];
  else process.env[clave] = valor;
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nUna dirección del Storage que llega de fuera solo vale si es de Weë y de la cuenta, y nada de lo que la lee sale a buscarla fuera');
process.exit(failures ? 1 : 0);
