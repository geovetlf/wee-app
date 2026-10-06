/*
 * LAS DIRECCIONES DEL STORAGE, CONTRA EL EMULADOR (revisión de seguridad 2026-10-06, seguridad/urls-del-storage).
 *
 * `urls-del-storage.test.mjs` lo comprueba con un cubo de mentira y `fetch` sustituido. Aquí va con el Storage de
 * verdad del emulador, el Admin SDK de verdad y un ATACANTE de verdad: un servidor HTTP en esta máquina que apunta
 * cada petición que le llega. Antes de la revisión, una dirección con la ruta «correcta» que apuntara a él hacía que
 * el servidor fuera a buscarla (SSRF); ahora no le llega nada.
 *
 *   A · lo que hace la app: sube su foto y manda la dirección de `getDownloadURL` → la puerta la acepta y la reescribe,
 *       el lector la lee con el Admin SDK (los mismos bytes), sus medidas salen del mismo cubo, y la dirección reescrita
 *       se sigue abriendo con su testigo (la app la enseña en la conversación y en el «antes»);
 *   B · el ataque: la ruta «correcta» con el host del atacante —por la puerta y saltándose la puerta—, el mismo con un
 *       cubo ajeno, y el avatar: al atacante no le llega ninguna petición.
 *
 * No está en `npm test` a propósito: necesita el emulador de Storage y Java 21.
 *
 *   firebase emulators:exec --only storage --project demo-wee "node functions/test/urls-del-storage.emulator.mjs"
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
const EMULADOR = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
if (!EMULADOR) {
  console.error('✘ Sin FIREBASE_STORAGE_EMULATOR_HOST: esta suite corre dentro de `firebase emulators:exec --only storage`.');
  process.exit(2);
}

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });

const http_ = lib('engine/http.js');
const inputs = lib('creator/inputs.js');
const { imageDimensions } = lib('engine/imageMeta.js');
const vertex = lib('vertexAI.js');

/* ── El atacante: cuenta lo que le llega y contesta con una «foto» ─────────── */
const golpes = [];
const atacante = http.createServer((req, res) => {
  golpes.push(req.url);
  /* Sin conexiones que se queden abiertas: al terminar no hay nada a medio cerrar (Windows lo lleva mal). */
  res.writeHead(200, { 'content-type': 'image/png', connection: 'close' });
  res.end(Buffer.from('lo-que-diga-el-atacante'));
});
await new Promise((ok) => atacante.listen(0, '127.0.0.1', ok));
const ATACANTE = `http://127.0.0.1:${atacante.address().port}`;

/* ── La foto de la persona, en el Storage del emulador, con su testigo ─────── */
/* Un PNG de 1 × 1: cabecera de verdad, para que las medidas se puedan leer del propio archivo. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const RUTA = 'users/uAna/creator-inputs/1700000000000-abc123.png';
const TESTIGO = '8c1f0a5e-1b2c-4d3e-9f40-123456789abc';
await admin.storage().bucket().file(RUTA).save(PNG, {
  metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: TESTIGO } },
  resumable: false,
});
/* Lo que devuelve `getDownloadURL` en la app cuando corre contra el emulador (EXPO_PUBLIC_STORAGE_EMULATOR_HOST=localhost). */
const puertoDelEmulador = EMULADOR.split(':').pop();
const enStorage = (ruta, { host = `http://localhost:${puertoDelEmulador}`, cubo = BUCKET, testigo = TESTIGO } = {}) =>
  `${host}/v0/b/${cubo}/o/${encodeURIComponent(ruta)}?alt=media${testigo ? `&token=${testigo}` : ''}`;
const DE_LA_APP = enStorage(RUTA);

const intentar = async (fn) => {
  try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, e }; }
};

console.log('\n── A · Lo que hace la app ──');
{
  const reescrita = inputs.assertInputImageUrl(DE_LA_APP, 'uAna');
  check('A1) la puerta acepta la foto de la app y la reescribe con el host del emulador de este entorno, el cubo y la ruta',
    reescrita === `http://${EMULADOR}/v0/b/${BUCKET}/o/${encodeURIComponent(RUTA)}?alt=media&token=${TESTIGO}`, reescrita);
  const leida = await intentar(() => http_.readImage(reescrita, 'emulador'));
  check('A2) el lector la lee del cubo con el Admin SDK: los mismos bytes y su tipo',
    leida.ok && Buffer.compare(leida.v.buffer, PNG) === 0 && leida.v.contentType === 'image/png', leida.e && leida.e.message);
  const medidas = await imageDimensions(reescrita);
  check('A3) sus medidas salen del mismo cubo (del propio archivo: no traía metadatos)', medidas && medidas.width === 1 && medidas.height === 1 && medidas.source === 'file', JSON.stringify(medidas));
  const abierta = await fetch(reescrita);
  const bytes = Buffer.from(await abierta.arrayBuffer());
  check('A4) y la dirección reescrita se sigue abriendo con su testigo, como la abre la app', abierta.status === 200 && Buffer.compare(bytes, PNG) === 0, `HTTP ${abierta.status}`);
  check('A5) el atacante no se ha enterado de nada', golpes.length === 0, JSON.stringify(golpes));
}

console.log('\n── B · El ataque ──');
{
  const ATAQUE = enStorage('users/uAna/no-existe.png', { host: ATACANTE, testigo: '' });

  /* Por la puerta: con el emulador, un host de esta máquina tiene la forma de su Storage… y por eso se REESCRIBE. */
  const porLaPuerta = await intentar(async () => http_.readImage(inputs.assertInputImageUrl(ATAQUE, 'uAna'), 'emulador'));
  check('B1) por la puerta: la dirección se reescribe al Storage de verdad, el objeto no existe, falla… y al atacante no le llega nada',
    !porLaPuerta.ok && porLaPuerta.e instanceof http_.ProviderError && golpes.length === 0, `${porLaPuerta.e && porLaPuerta.e.message} · ${JSON.stringify(golpes)}`);

  /* Saltándose la puerta, como si una dirección se colara hasta un adaptador: el lector tampoco sale a buscarla. */
  const directa = await intentar(() => http_.readImage(ATAQUE, 'emulador'));
  check('B2) saltándose la puerta: el lector lee del cubo por la ruta, falla, y NO pide nada al host de la dirección',
    !directa.ok && directa.e instanceof http_.ProviderError && directa.e.retryable === false && golpes.length === 0, `${directa.e && directa.e.message} · ${JSON.stringify(golpes)}`);

  const cuboAjeno = await intentar(() => http_.readImage(enStorage(RUTA, { host: ATACANTE, cubo: 'cubo-del-atacante' }), 'emulador'));
  const portaAjena = await intentar(async () => inputs.assertInputImageUrl(enStorage(RUTA, { host: ATACANTE, cubo: 'cubo-del-atacante' }), 'uAna'));
  check('B3) un cubo ajeno no se lee de ningún sitio, ni la puerta lo acepta', !cuboAjeno.ok && !portaAjena.ok && golpes.length === 0, JSON.stringify(golpes));

  const ajena = await intentar(async () => inputs.assertInputImageUrl(DE_LA_APP, 'uBea'));
  check('B4) la foto de otra cuenta, en el mismo cubo: «no es tuya»', !ajena.ok && ajena.e && ajena.e.message === 'Esa foto no es tuya.');

  /* El avatar: antes `fetch(url)` a lo que llegara. */
  const avatar = await intentar(() => vertex.urlToBase64(ATAQUE));
  const avatarPropio = await intentar(() => vertex.urlToBase64(inputs.assertInputImageUrl(DE_LA_APP, 'uAna')));
  check('B5) el avatar tampoco sale a buscarla; su foto propia sale del cubo',
    !avatar.ok && avatarPropio.ok && avatarPropio.v.base64 === PNG.toString('base64') && golpes.length === 0, `${avatar.e && avatar.e.message} · ${JSON.stringify(golpes)}`);

  /* CONTROL: el atacante está escuchando de verdad. Si esta petición no le llega, las de arriba no prueban nada. */
  await fetch(`${ATACANTE}/control`).then((r) => r.arrayBuffer());
  check('B6) CONTROL: el atacante está escuchando (esta petición, hecha a mano, sí le llega)', golpes.length === 1 && golpes[0] === '/control', JSON.stringify(golpes));
}

await admin.storage().bucket().file(RUTA).delete({ ignoreNotFound: true });
atacante.close();
await admin.app().delete();
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ Las direcciones del Storage, contra el emulador: al atacante solo le llegó el control');
/*
 * Sin `process.exit()` a secas: en Windows, salir de golpe mientras el SDK todavía cierra una descarga fallida rompe
 * libuv (`UV_HANDLE_CLOSING`) y la suite saldría en rojo con todo en verde. Se deja que el bucle termine solo; si algo
 * lo sujetara, se sale igualmente a los 10 s con el mismo código.
 */
process.exitCode = failures ? 1 : 0;
setTimeout(() => process.exit(process.exitCode), 10_000).unref();
