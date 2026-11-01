/*
 * FIRMA DE TOKENS CON EL SDK REAL, SIN EMULADOR.
 *
 * Qué demuestra: firebase-admin (y `onCall`, que lo llama) rechaza tokens forjados frente a las claves públicas REALES de
 * Google. Sin proyecto, sin credenciales y sin ninguna cuenta: solo descarga las claves públicas, que son públicas.
 * Qué NO demuestra: nada de una Function desplegada. Falta su variable de entorno, su versión y que un token de verdad
 * se acepte. Eso es de `proyecto-real.mjs`.
 *
 * La trampa que evita: un rechazo por falta de red también parecería «firma rechazada». Por eso cada caso exige el MOTIVO,
 * y hay un control: el mismo token, con una clave que el verificador sí conoce, se acepta. Así el único motivo del
 * rechazo es la firma.
 *
 * Uso: node firma-sdk.mjs <ruta a functions> [--sin-oncall]
 */
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const FUNCTIONS = path.resolve(process.argv[2] ?? '.');
const SIN_ONCALL = process.argv.includes('--sin-oncall');
for (const v of ['FIREBASE_AUTH_EMULATOR_HOST', 'FUNCTIONS_EMULATOR', 'FIREBASE_DEBUG_MODE', 'FIREBASE_DEBUG_FEATURES', 'FIRESTORE_EMULATOR_HOST']) delete process.env[v];
const PROYECTO = 'demo-wee-firma';
process.env.GCLOUD_PROJECT = PROYECTO;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: PROYECTO });

const requerir = createRequire(path.join(FUNCTIONS, 'package.json'));
const { initializeApp } = requerir('firebase-admin/app');
const { getAuth } = requerir('firebase-admin/auth');
const app = initializeApp({ projectId: PROYECTO });
const auth = getAuth(app);

let fallos = 0;
const comprobar = (nombre, ok, detalle = '') => { if (!ok) fallos++; console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`); };

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const CERT_FALSO = publicKey.export({ type: 'spki', format: 'pem' });
const ahora = Math.floor(Date.now() / 1000);
const claims = (extra = {}) => ({
  iss: `https://securetoken.google.com/${PROYECTO}`, aud: PROYECTO, auth_time: ahora - 60, user_id: 'atacante', sub: 'atacante',
  iat: ahora - 60, exp: ahora + 3000, admin: true, weeRole: 'owner', firebase: { identities: {}, sign_in_provider: 'password' }, ...extra,
});
const rs256 = (cabecera, cuerpo) => {
  const base = `${b64({ alg: 'RS256', typ: 'JWT', ...cabecera })}.${b64(cuerpo)}`;
  return `${base}.${crypto.sign('RSA-SHA256', Buffer.from(base), privateKey).toString('base64url')}`;
};

const certificados = await (await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')).json();
const kidReal = Object.keys(certificados)[0];
comprobar('claves públicas reales de Google descargadas', Object.keys(certificados).length > 0, `${Object.keys(certificados).length} claves`);

const motivo = async (token) => {
  try { await auth.verifyIdToken(token); return { aceptado: true }; }
  catch (e) { return { aceptado: false, codigo: e.code, mensaje: String(e.message).split('.')[0].slice(0, 90) }; }
};

/* Con las claves reales de Google. */
const casos = [
  ['RS256 con clave propia y kid REAL de Google', rs256({ kid: kidReal }, claims()), /invalid signature/i],
  ['RS256 con clave propia y kid inventado', rs256({ kid: 'kid-inventado' }, claims()), /no-matching-kid|public key/i],
  ['RS256 sin kid', rs256({}, claims()), /kid/i],
  ['alg none con kid real', `${b64({ alg: 'none', typ: 'JWT', kid: kidReal })}.${b64(claims())}.`, /algorithm|alg/i],
  ['HS256 usando el certificado público como secreto (confusión de algoritmo)', (() => {
    const base = `${b64({ alg: 'HS256', typ: 'JWT', kid: kidReal })}.${b64(claims())}`;
    return `${base}.${crypto.createHmac('sha256', certificados[kidReal]).update(base).digest('base64url')}`;
  })(), /algorithm|alg/i],
  ['firma de un token real recortada', `${rs256({ kid: kidReal }, claims()).split('.').slice(0, 2).join('.')}.`, /signature|invalid/i],
];
for (const [nombre, token, esperado] of casos) {
  const r = await motivo(token);
  comprobar(`rechaza: ${nombre}`, !r.aceptado && esperado.test(`${r.codigo} ${r.mensaje}`), r.aceptado ? 'ACEPTADO' : `${r.codigo} · ${r.mensaje}`);
}

/* El control: con una clave que el verificador conoce, el mismo token se acepta. Solo cambia la clave. */
const verificador = auth.idTokenVerifier.signatureVerifier.keyFetcher;
const original = verificador.fetchPublicKeys.bind(verificador);
verificador.fetchPublicKeys = async () => ({ 'kid-control': CERT_FALSO });
const control = await motivo(rs256({ kid: 'kid-control' }, claims()));
comprobar('CONTROL: el mismo token se acepta si la clave es conocida (el rechazo de arriba es por la firma)', control.aceptado === true, JSON.stringify(control).slice(0, 120));
const contenido = [
  ['token caducado', claims({ exp: ahora - 10, iat: ahora - 4000 }), /expired/i],
  ['otro proyecto (aud)', claims({ aud: 'otro-proyecto' }), /aud/i],
  ['otro emisor (iss)', claims({ iss: 'https://securetoken.google.com/otro' }), /iss/i],
  ['sin sujeto', claims({ sub: '' }), /sub/i],
  ['emitido en el futuro: se documenta lo que hace el SDK', claims({ iat: ahora + 3600 }), null],
];
for (const [nombre, c, esperado] of contenido) {
  const r = await motivo(rs256({ kid: 'kid-control' }, c));
  if (esperado) comprobar(`con firma válida, rechaza: ${nombre}`, !r.aceptado && esperado.test(`${r.codigo} ${r.mensaje}`), r.aceptado ? 'ACEPTADO' : `${r.codigo}`);
  else console.log(`· OBSERVADO ${nombre}: ${r.aceptado ? 'aceptado' : `rechazado (${r.codigo})`}`);
}
verificador.fetchPublicKeys = original;

/* Por `onCall`, con la callable compilada de verdad. */
if (!SIN_ONCALL) {
  const { opsAdmin } = requerir(path.join(FUNCTIONS, 'lib/admin/index.js'));
  const express = requerir('express');
  const ex = express();
  ex.use(express.json());
  ex.post('/', (q, s) => opsAdmin(q, s));
  const srv = http.createServer(ex);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const llamar = async (token) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data: { action: 'quienSoy' } }) });
    let j = {}; try { j = await r.json(); } catch { /* cuerpo vacío */ }
    return { estado: r.status, codigo: j?.error?.status, datos: j?.result !== undefined };
  };
  for (const [nombre, token] of casos) {
    const r = await llamar(token);
    comprobar(`onCall real → 401 y sin datos: ${nombre}`, r.estado === 401 && !r.datos, `${r.estado} ${r.codigo ?? ''}`);
  }
  /* El control por `onCall`: con clave conocida el token pasa la firma. Lo que ocurre después depende de la rama. */
  const { getApp } = requerir(path.join(path.dirname(requerir.resolve('firebase-functions/v2/https')), '../../common/app.js'));
  const verificadorFn = getAuth(getApp()).idTokenVerifier.signatureVerifier.keyFetcher;
  const orig2 = verificadorFn.fetchPublicKeys.bind(verificadorFn);
  verificadorFn.fetchPublicKeys = async () => ({ 'kid-control': CERT_FALSO });
  const r = await llamar(rs256({ kid: 'kid-control' }, claims()));
  verificadorFn.fetchPublicKeys = orig2;
  console.log(`· OBSERVADO control por onCall (firma aceptada, sin credenciales para leer Auth): ${r.estado} ${r.codigo ?? ''} datos=${r.datos}`);
  comprobar('CONTROL por onCall: pasa de la verificación de firma (no es 401)', r.estado !== 401);
  await new Promise((s) => srv.close(s));
}
console.log(`\nResultado: ${fallos === 0 ? 'todo correcto' : `${fallos} FALLO(S)`}. Esto prueba el SDK, no una Function desplegada.`);
process.exit(fallos ? 1 : 0);
