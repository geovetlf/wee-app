/*
 * EL WEBHOOK DE SEEDANCE NO ESCRIBE RESULTADOS — auditoría H0, escenario #21 (paso 1).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * `seedanceCallback` (desplegado, sin uso hoy porque get-wee no tiene
 * SEEDANCE_CALLBACK_URL) comparaba el testigo con `!==`, no medía el cuerpo,
 * usaba un id sin validar como id de documento y guardaba el cuerpo ENTERO,
 * URL firmada incluida. Y el sondeo de `seedance.ts` aceptaba ese documento
 * como resultado: un «failed» falsificado hacía abandonar —y reembolsar— una
 * tarea que el proveedor seguía haciendo y cobrando.
 *
 * Aquí se EJECUTA el handler compilado con una petición, una respuesta y una
 * Firestore de mentira, y se comprueba en el código que el sondeo solo cree al
 * GET del proveedor.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../', p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const firestore = require('firebase-admin/firestore');
const escritos = new Map();
const baseFalsa = { collection: (c) => ({ doc: (id) => ({ set: async (d) => { escritos.set(`${c}/${id}`, d); } }) }) };
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;

const TESTIGO = 'testigo-de-prueba-0123456789';
process.env.SEEDANCE_CALLBACK_TOKEN = TESTIGO;
const { seedanceCallback } = lib('engine/webhooks.js');

const llamar = async ({ method = 'POST', token = TESTIGO, body, headers = {} } = {}) => {
  const cabeceras = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const req = { method, query: token === null ? {} : { token }, body, headers: cabeceras, get: (h) => cabeceras[String(h).toLowerCase()], header: (h) => cabeceras[String(h).toLowerCase()] };
  const res = {
    statusCode: 200, cuerpo: undefined, headersSent: false,
    status(c) { this.statusCode = c; return this; },
    send(b) { this.cuerpo = b; this.headersSent = true; return this; },
    json(b) { this.cuerpo = b; this.headersSent = true; return this; },
    set() { return this; }, setHeader() {}, getHeader() {}, on() {}, end() { this.headersSent = true; },
  };
  await seedanceCallback(req, res);
  return res;
};
const VALIDO = { id: 'cgt-20260930-abc', status: 'Succeeded', content: { video_url: 'https://ark-cdn.example/firmada.mp4?X-Tos-Signature=s' }, usage: { completion_tokens: 10 } };

/* ── A. Lo que se rechaza, sin escribir nada ────────────────────────────── */
escritos.clear();
check('1) solo POST', (await llamar({ method: 'GET' })).statusCode === 405);
check('2) testigo equivocado (misma longitud) → 401', (await llamar({ token: 'testigo-de-prueba-9876543210', body: VALIDO })).statusCode === 401);
check('3) testigo de otra longitud o ausente → 401',
  (await llamar({ token: 'corto', body: VALIDO })).statusCode === 401 && (await llamar({ token: null, body: VALIDO })).statusCode === 401);
check('4) un cuerpo que declara más de 64 KB → 413 antes de mirar nada', (await llamar({ body: VALIDO, headers: { 'Content-Length': String(65 * 1024) } })).statusCode === 413);
check('5) un cuerpo que mide más de 64 KB → 413', (await llamar({ body: { ...VALIDO, relleno: 'x'.repeat(70 * 1024) } })).statusCode === 413);
check('6) sin cuerpo, o sin id o sin estado → 400',
  (await llamar({ body: undefined })).statusCode === 400 && (await llamar({ body: { status: 'succeeded' } })).statusCode === 400
  && (await llamar({ body: { id: 'x1' } })).statusCode === 400);
check('7) un id que no sirve como id de documento (con «/») → 400', (await llamar({ body: { ...VALIDO, id: 'a/../../users/x' } })).statusCode === 400);
check('8) ninguna de esas peticiones escribió nada', escritos.size === 0, [...escritos.keys()].join(', '));

/* ── B. Lo que se guarda de un aviso válido ─────────────────────────────── */
const r = await llamar({ body: VALIDO });
const guardado = escritos.get('aiProviderCallbacks/cgt-20260930-abc');
check('9) un aviso válido se acepta (200)', r.statusCode === 200);
check('10) y solo se guarda que hubo aviso: proveedor, estado y cuándo',
  guardado && Object.keys(guardado).sort().join(',') === 'provider,receivedAt,status' && guardado.status === 'succeeded', JSON.stringify(Object.keys(guardado || {})));
check('11) nunca el cuerpo ni la URL firmada del vídeo', !JSON.stringify(guardado).includes('firmada.mp4') && !('payload' in (guardado || {})));

/* ── C. El código ───────────────────────────────────────────────────────── */
const webhooks = sinComentarios(leer('functions/src/engine/webhooks.ts'));
const handler = webhooks.slice(webhooks.indexOf('export const seedanceCallback'), webhooks.indexOf('export const MAX_CUERPO_DE_AVISO'));
check('12) el handler compara el testigo en tiempo constante (mismoTestigo), nunca con !==',
  /mismoTestigo\(request\.query\.token/.test(handler) && !/token[^\n]*!==|!==[^\n]*SEEDANCE_CALLBACK_TOKEN/.test(handler));
const seedance = sinComentarios(leer('functions/src/engine/providers/seedance.ts'));
check('13) el sondeo de Seedance ya no lee los avisos guardados: el estado y el vídeo vienen del GET al proveedor',
  !/aiProviderCallbacks|callbackResult/.test(seedance) && /const state = await fetchJson<any>\(`\$\{arkBase\(\)\}\/contents\/generations\/tasks\/\$\{taskId\}`/.test(seedance));

firestore.getFirestore = getFirestoreReal;
delete process.env.SEEDANCE_CALLBACK_TOKEN;
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
