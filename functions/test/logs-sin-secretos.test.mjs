/**
 * Gran Motor S2 · B — LO QUE DE VERDAD SALE AL LOG no lleva secretos (F-03 + F-04).
 *
 * `sanitize-huecos` prueba la función; esta suite prueba la SALIDA: intercepta
 * `console.*` y formatea los argumentos con `util.format`, que es lo que hace
 * Node (un `Error` pasado entero sale con `util.inspect`: mensaje, pila, `cause`
 * y lo que un SDK le cuelgue, como `config.headers` o `response.data`).
 *
 *   A · el Router (engine/router.ts) registra el fallo de un proveedor saneado,
 *       también con las formas que antes se escapaban (URL firmada, PEM, JSON
 *       escapado, refresh_token, token suelto, correo), y la fila FAILED igual;
 *   B · `toEngineHttpsError` (engine/errors.ts) registra lo interno saneado;
 *   C · WeeTalk (social/weetalk.ts): un error de Storage con cabeceras ya no se
 *       vuelca entero (antes: `console.error(…, error)` crudo → fallaba);
 *   D · las correcciones de riesgo ALTO fuera del motor, por fuente (vertexAI,
 *       index.ts/push, content, planner): prompts, respuestas del proveedor,
 *       token de push y errores crudos de SDK ya no van al log.
 *
 * Solo valores SINTÉTICOS, partidos en tiempo de ejecución para el escáner.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import util from 'node:util';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/** Lo que Node escribiría: `util.format` de los argumentos, igual que console.*. */
const capturar = async (fn) => {
  const lineas = [];
  const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info, debug: console.debug };
  for (const k of Object.keys(orig)) console[k] = (...a) => lineas.push(util.format(...a));
  try { return { valor: await fn(), lineas }; } catch (e) { return { error: e, lineas }; } finally { Object.assign(console, orig); }
};

/* Secretos sintéticos: cada uno con una marca única para buscarlo en la salida. */
const Q = '\\"';
const PEM_INI = '-----BEGIN ' + 'PRIVATE KEY-----';
const PEM_FIN = '-----END ' + 'PRIVATE KEY-----';
const S = {
  firmaGoog: 'gooSIG' + 'sintetico0001',
  firmaTos: 'tosSIG' + 'sintetico0002',
  pem: 'MIIEpem' + 'sintetico0003',
  jsonEscapado: 'jsonESC' + 'sintetico0004',
  refresh: 'refTOK' + 'sintetico0005',
  tokenSuelto: 'tokSUELTO' + 'sintetico0006',
  correo: 'persona.' + 'sintetica@example.com',
  bearer: 'bearerTOK' + 'sintetico0007',
};
const CUERPO = [
  `403 {"error":{"message":"bad request","request":"{${Q}api_key${Q}:${Q}${S.jsonEscapado}${Q}}"}}`,
  `url=https://storage.googleapis.com/b/o.mp4?X-Goog-Signature=${S.firmaGoog}&X-Goog-Expires=600`,
  `video=https://tos.example.com/v.mp4?X-Tos-Signature=${S.firmaTos}`,
  `"refresh_token":"${S.refresh}"`,
  `{"token":"${S.tokenSuelto}"}`,
  `echo ${S.correo}`,
  `${PEM_INI}\n${S.pem}\n${PEM_FIN}`,
].join(' · ');
const sucio = (texto) => Object.entries(S).filter(([, v]) => texto.includes(v)).map(([k]) => k);

console.log('\n── A · Router: el fallo de un proveedor llega al log y al libro saneado ──');
{
  const { createRouter, memoryHealth } = lib('engine/router.js');
  const { memoryLedger } = lib('engine/ledger.js');
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');
  const verificacion = lib('engine/verification.js');
  verificacion.recordRealSuccess = async () => {};
  const alfa = {
    id: 'alfa', name: 'alfa', modalities: ['text'],
    models: [{ id: 'alfa-1', provider: 'alfa', capabilities: ['text.generate'], quality: 4, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
    isConfigured: () => true, supports: (c) => c === 'text.generate',
    run: async () => { throw new Error(CUERPO); },
  };
  const ledger = memoryLedger();
  const router = createRouter({
    adapters: { alfa },
    loadConfig: async () => ({
      providers: { alfa: { enabled: true, priority: 1 } },
      routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alfa' }], policy: 'balanced' } },
      settings: { ...DEFAULT_SETTINGS, allowMockFallback: false },
      source: 'test',
    }),
    ledger, health: memoryHealth(() => 1), now: () => 1,
  });
  const pedido = { capability: 'text.generate', input: { prompt: 'hola' }, context: { userId: 'uSintetico', experienceId: 'brain', requestId: 'req-s2-0001' } };
  const { lineas, error } = await capturar(() => router.execute(pedido));
  const todo = lineas.join('\n');
  check('A1) el fallo se registra y la petición acaba en error controlado', lineas.some((l) => /falló en text\.generate/.test(l)) && !!error, lineas.join(' | ').slice(0, 300));
  check('A2) ninguna línea del log lleva un secreto (firma, PEM, JSON escapado, refresh_token, token suelto, correo)', sucio(todo).length === 0, sucio(todo).join(', '));
  const filas = Object.values(ledger.records);
  check('A3) la fila FAILED del libro tampoco', filas.length >= 1 && filas.every((f) => sucio(String(f.error ?? '')).length === 0), filas.map((f) => sucio(String(f.error ?? ''))).flat().join(', '));
  check('A4) y se conserva lo que sirve para depurar (host y parámetro firmado, sin valor)', /storage\.googleapis\.com\/b\/o\.mp4\?X-Goog-Signature=\[credencial omitida\]/.test(todo + filas.map((f) => f.error).join(' ')) || /X-Goog-Signature=\[credencial omitida\]/.test(todo));
}

console.log('\n── B · errors.ts: lo interno, al registro saneado ──');
{
  const { toEngineHttpsError } = lib('engine/errors.js');
  const interno = new Error(CUERPO);
  interno.config = { headers: { Authorization: `Bearer ${S.bearer}` } };
  const { lineas, valor } = await capturar(() => toEngineHttpsError(interno));
  const todo = lineas.join('\n');
  check('B1) se registra una línea y la app recibe un HttpsError genérico', lineas.length === 1 && valor && !sucio(String(valor.message)).length, todo.slice(0, 200));
  check('B2) la línea no lleva ningún secreto, ni las cabeceras que cuelga el error', sucio(todo).length === 0, sucio(todo).join(', '));
}

console.log('\n── C · WeeTalk: un error de Storage con cabeceras ya no se vuelca entero ──');
{
  const weetalk = lib('social/weetalk.js');
  const BUCKET = 'demo-wee.firebasestorage.app';
  const CLAVE = 'users/uAna/weetalk/c1/1700000000000-abc123.jpg';
  const URL_WEE = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(CLAVE)}?alt=media&token=t-1`;
  const errorDeSdk = () => {
    const e = new Error('storage caído');
    e.code = 503;
    e.config = { url: `https://storage.googleapis.com/x?X-Goog-Signature=${S.firmaGoog}`, headers: { Authorization: `Bearer ${S.bearer}` } };
    e.response = { data: { echo: S.correo } };
    return e;
  };
  const docs = { m1: { type: 'image', viewOnce: true, senderId: 'uAna', imageUrl: URL_WEE } };
  const quemador = weetalk.crearQuemador({
    bucketDeWee: () => BUCKET,
    cuentaDelRemitente: async (id) => id,
    leerConversacion: async () => ({ participants: ['uAna', 'uBea'] }),
    leerMensaje: async (c, m) => (docs[m] ? { ...docs[m] } : null),
    quemarFicha: async (c, m) => { docs[m] = { ...docs[m], viewOnceOpened: true }; },
    anotarPendiente: async () => {},
    borrarObjeto: async () => { throw errorDeSdk(); },
    ahora: () => 1_700_000_500_000,
  });
  const { lineas, valor, error } = await capturar(() => quemador.quemar('uBea', 'c1', 'm1'));
  const todo = lineas.join('\n');
  check('C1) el borrado fallido se registra y la foto queda pendiente (comportamiento intacto)', !error && valor?.status === 'quemada' && lineas.some((l) => /no se pudo borrar la foto única/.test(l)), `${error?.message ?? ''} ${JSON.stringify(valor)}`);
  check('C2) la línea no lleva la cabecera, la URL firmada ni el cuerpo que colgó el SDK', sucio(todo).length === 0, sucio(todo).join(', '));
  check('C3) y conserva el mensaje del error para depurar', /storage caído/.test(todo));
}

console.log('\n── D · Las correcciones de riesgo ALTO fuera del motor (por fuente) ──');
{
  const vertex = leer('functions/src/vertexAI.ts');
  const llamadas = (s) => [...s.matchAll(/console\.(?:log|warn|error|info|debug)\(([^;]*)\);/g)].map((m) => m[1]);
  const vx = llamadas(vertex);
  check('D1) vertexAI: el prompt del avatar no va al log (solo su longitud)', !vx.some((a) => /\bprompt\b(?!\.length)/.test(a.replace(/'[^']*'/g, ''))), vx.filter((a) => /prompt/.test(a)).join(' | '));
  check('D2) vertexAI: ni la respuesta de Gemini (JSON.stringify de response/candidates) ni su texto (part.text)', !vx.some((a) => /JSON\.stringify\((?:response|candidates)/.test(a) || /part\.text\)?\s*$/.test(a.trim()) || /,\s*part\.text\b(?!\)\.length)/.test(a)), vx.filter((a) => /response|part\.text/.test(a)).join(' | '));
  check('D3) vertexAI: el error del SDK pasa por sanitizeForLog', (vertex.match(/console\.error\('Gemini generateContent failed:', sanitizeForLog\(err, 300\)\);/g) || []).length === 2 && !/err\.message \|\| err/.test(vertex));
  const idx = leer('functions/src/index.ts');
  check('D4) push: el mensaje de error de Expo (que lleva el token del aparato) no va al log; solo estado y código', !/console\.error\('Error en push:', result\.data\.message\)/.test(idx) && /console\.error\('Error en push:', resumenDeRespuestaDeExpo\(result\)\);/.test(idx));
  const content = leer('functions/src/content/index.ts');
  check('D5) content: los errores de Storage (metadata y borrado) se registran saneados',
    /console\.warn\('Content: no se pudo leer la metadata del objeto', ref\.objectKey, sanitizeForLog\(error, 300\)\);/.test(content)
    && /console\.error\('Content: no se pudo borrar el objeto', r\.objectKey, sanitizeForLog\(error, 300\)\);/.test(content));
  const planner = leer('functions/src/creator/planner.ts');
  check('D6) planner: un JSON roto no vuelca su trozo de respuesta; lo demás, saneado', /error instanceof SyntaxError \? 'la respuesta no es JSON' : sanitizeForLog\(error, 300\)/.test(planner)
    && !/console\.warn\('Weë Brain: no pude interpretar el texto; pregunto normalmente\.', error\);/.test(planner));
  const weetalk = leer('functions/src/social/weetalk.ts');
  check('D7) weetalk: el borrado fallido, saneado', /console\.error\('WeeTalk: no se pudo borrar la foto única', ref\.objectKey, sanitizeForLog\(error, 300\)\);/.test(weetalk));
}

check('esta suite está en la cadena de `npm test`', /logs-sin-secretos\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ logs-sin-secretos: la salida real del log va saneada');
process.exit(failures ? 1 : 0);
