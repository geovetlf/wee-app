/*
 * SEGURIDAD DE `users` (2026-10-07) — LAS REGLAS, EJECUTADAS.
 *
 * Siembra como administrador un Perfil Real (`users/abc`, con saldo, país, idioma, enlace y campos heredados) y su
 * Perfil Weë (`users/hidi_abc`, con `linkedAccountId`), más sus copias públicas, y prueba cada lectura con: sin
 * sesión, la cuenta dueña y otra cuenta. Datos SINTÉTICOS en un proyecto `demo-*`.
 *
 * DOS FASES (correcciones 1–5): las comprobaciones 1–21 cargan la FASE 2 (el archivo dado con el cierre de
 * ops/despliegue/reglas/users-cierre.fase2.rules compuesto); las 22–25, la FASE 1 tal cual (lo que se puede
 * publicar hoy: `users` legible como en producción, `publicProfiles` igual de cerrada a escritura).
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/users-privado.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import { proyectoDeEmulador } from './_emulador.mjs';
import { componerFase2, RUTA_FASE_2 } from '../../ops/despliegue/cierre-users.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const reglasFase1 = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8');
const reglasFase2 = componerFase2(reglasFase1, fs.readFileSync(RUTA_FASE_2, 'utf8'));

const cargar = async (reglas) => {
  const put = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
  });
  if (put.status !== 200) { console.log(`✘ no se pudieron cargar las reglas: HTTP ${put.status}`); process.exitCode = 2; }
};
await cargar(reglasFase2);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
  }) + '.';
};
const cab = (quien) => ({ 'Content-Type': 'application/json', ...(quien === null ? {} : { Authorization: `Bearer ${quien === 'owner' ? 'owner' : sesion(quien)}` }) });
const v = (x) => (typeof x === 'number' ? { integerValue: String(x) } : { stringValue: x });
const campos = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)]));

const sembrar = async (col, id, datos) => {
  const r = await fetch(`${base}/${col}?documentId=${id}`, { method: 'POST', headers: cab('owner'), body: JSON.stringify({ fields: campos(datos) }) });
  if (r.status !== 200) console.log(`siembra ${col}/${id}: HTTP ${r.status}`);
};
await sembrar('users', 'abc', { uid: 'abc', profileType: 'real', displayName: 'Persona Real', creditsBalance: 240, country: 'ES',
  language: 'es-ES', linkedAccountId: 'hidi_abc', email: 'sintetico@ejemplo.test', birthDate: '2000-01-01', realName: 'Sintética' });
await sembrar('users', 'hidi_abc', { uid: 'hidi_abc', profileType: 'hidi', displayName: 'Nube', linkedAccountId: 'abc' });
await sembrar('publicProfiles', 'abc', { uid: 'abc', profileType: 'real', displayName: 'Persona Real' });
await sembrar('publicProfiles', 'hidi_abc', { uid: 'hidi_abc', profileType: 'hidi', displayName: 'Nube' });

const leer = async (ruta, quien) => (await fetch(`${base}/${ruta}`, { headers: cab(quien) })).status;
const consultar = async (col, quien, { uid, limite } = {}) => {
  const r = await fetch(`${base}:runQuery`, {
    method: 'POST', headers: cab(quien),
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: col }],
      ...(uid ? { where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } } } : {}),
      ...(limite ? { limit: limite } : {}),
    } }),
  });
  const t = await r.text();
  let docs = [];
  try { docs = (JSON.parse(t) || []).filter((x) => x.document).map((x) => x.document); } catch { /* error */ }
  return { status: r.status, docs };
};

let fallos = 0;
const espera = (nombre, permite, status) => {
  const ok = (status < 400 || status === 404) === permite; // 404 = la regla dejó leer y no hay documento
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre} → ${status} (${status < 400 ? 'permite' : 'deniega'})`);
};

// ── users: privado ──
espera('1) GET users/abc sin sesión → DENY', false, await leer('users/abc', null));
espera('2) LIST users sin sesión → DENY', false, (await consultar('users', null, { limite: 50 })).status);
espera('3) LIST users con sesión ajena, sin filtro → DENY', false, (await consultar('users', 'xyz', { limite: 50 })).status);
espera('4) GET users/abc con sesión ajena → DENY', false, await leer('users/abc', 'xyz'));
espera('5) GET users/hidi_abc (lleva linkedAccountId) con sesión ajena → DENY', false, await leer('users/hidi_abc', 'xyz'));
espera('6) LIST users where uid==abc con sesión ajena → DENY', false, (await consultar('users', 'xyz', { uid: 'abc', limite: 1 })).status);
espera('7) GET users/abc/private/account con sesión ajena → DENY', false, await leer('users/abc/private/account', 'xyz'));
// ── users: lo legítimo del dueño ──
espera('8) GET users/abc la propia cuenta → PASS', true, await leer('users/abc', 'abc'));
espera('9) GET users/hidi_abc la propia cuenta (su Perfil Weë) → PASS', true, await leer('users/hidi_abc', 'abc'));
const propio = await consultar('users', 'abc', { uid: 'abc', limite: 1 });
espera('10) LIST users where uid==<la suya> (saldo, contexto) → PASS', true, propio.status);
espera('11) LIST users where uid==hidi_<la suya> → PASS', true, (await consultar('users', 'abc', { uid: 'hidi_abc', limite: 1 })).status);
espera('12) GET users/<su id> aún inexistente (creación idempotente) → PASS', true, await leer('users/nuevo', 'nuevo'));
espera('13) GET users/<id ajeno> inexistente → DENY', false, await leer('users/otro', 'nuevo'));
// ── publicProfiles: lo social ──
const pubAnon = await consultar('publicProfiles', null, { uid: 'hidi_abc', limite: 1 });
espera('14) GET publicProfiles/abc sin sesión (el muro) → PASS', true, await leer('publicProfiles/abc', null));
espera('15) LIST publicProfiles sin sesión con techo 30 (autores por tandas) → PASS', true, pubAnon.status);
espera('16) LIST publicProfiles sin sesión y sin límite → DENY', false, (await consultar('publicProfiles', null)).status);
espera('17) LIST publicProfiles sin sesión con 100 → DENY', false, (await consultar('publicProfiles', null, { limite: 100 })).status);
espera('18) LIST publicProfiles con sesión y 100 (buscador) → PASS', true, (await consultar('publicProfiles', 'xyz', { limite: 100 })).status);
espera('19) LIST publicProfiles con sesión y 101 → DENY', false, (await consultar('publicProfiles', 'xyz', { limite: 101 })).status);
const w = await fetch(`${base}/publicProfiles/abc?updateMask.fieldPaths=displayName`, { method: 'PATCH', headers: cab('abc'), body: JSON.stringify({ fields: campos({ displayName: 'x' }) }) });
espera('20) escribir publicProfiles, ni siquiera el dueño → DENY', false, w.status);
const visibles = new Set(pubAnon.docs.flatMap((d) => Object.keys(d.fields || {})));
const sensibles = ['linkedAccountId', 'creditsBalance', 'country', 'language', 'email', 'birthDate', 'realName'];
const ok21 = sensibles.every((k) => !visibles.has(k)) && visibles.has('displayName');
if (!ok21) fallos++;
console.log(`${ok21 ? '✔' : '✘'} 21) lo que ve un anónimo no trae ${sensibles.join('/')} (visibles: ${[...visibles].sort().join(', ')})`);

// ── FASE 1 (firestore.rules tal cual): lo que se puede publicar ANTES del espejo, el relleno y el cliente ──
await cargar(reglasFase1);
espera('22) FASE 1: GET users/abc sin sesión → PASS (como hoy en producción: no rompe muro ni apps instaladas)', true, await leer('users/abc', null));
espera('23) FASE 1: LIST users con sesión ajena → PASS (exposición actual, ni mejor ni peor)', true, (await consultar('users', 'xyz', { limite: 50 })).status);
const w1 = await fetch(`${base}/publicProfiles/abc?updateMask.fieldPaths=displayName`, { method: 'PATCH', headers: cab('abc'), body: JSON.stringify({ fields: campos({ displayName: 'x' }) }) });
espera('24) FASE 1: escribir publicProfiles sigue cerrado → DENY', false, w1.status);
espera('25) FASE 1: GET users/abc/private/account con sesión ajena → DENY', false, await leer('users/abc/private/account', 'xyz'));

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ 25/25');
process.exitCode = fallos ? 1 : process.exitCode ?? 0;
