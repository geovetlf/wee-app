/**
 * LA SIEMBRA AUTORIZADA FUNCIONA; UN CLIENTE SIN PERMISO NO PUEDE — contra el emulador de Firestore.
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node test/comunidades-siembra.emulator.mjs"
 *
 *   A · La administración (scripts/sembrar-comunidades.mjs, SDK de administración) siembra las ocho oficiales; una
 *       segunda vez no crea ninguna; y si ya existe una con id automático y el mismo slug, no la duplica.
 *   B · Con las reglas de verdad (firestore.rules), lo que intentaba la app —una oficial sin createdBy, con
 *       moderators: []— se DENIEGA a una sesión normal y a quien no tiene sesión; una oficial a su nombre, también;
 *       solo una sesión con el claim `admin` puede.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid, claims = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { sign_in_provider: 'password', identities: {} }, ...claims,
  }) + '.';
};
const valor = (v) => {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valor) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)])) } };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, valor(v)])) });
const crear = async (id, cuerpo, autorizacion) => {
  const headers = { 'Content-Type': 'application/json' };
  if (autorizacion) headers.Authorization = `Bearer ${autorizacion}`;
  const r = await fetch(`${base}/communities?documentId=${id}`, { method: 'POST', headers, body: JSON.stringify(doc(cuerpo)) });
  return r.status;
};
const listar = async () => {
  const r = await fetch(`${base}/communities?pageSize=100`, { headers: { Authorization: 'Bearer owner' } });
  const j = await r.json();
  return (j.documents || []).map((d) => ({ id: d.name.split('/').pop(), slug: d.fields?.slug?.stringValue, oficial: d.fields?.isOfficial?.booleanValue }));
};
const vaciar = async () => fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
const cargarReglas = async () => {
  const r = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: fs.readFileSync(path.join(raiz, 'firestore.rules'), 'utf8') }] } }),
  });
  return r.status;
};
const sembrar = () => spawnSync(process.execPath, [path.join(raiz, 'scripts/sembrar-comunidades.mjs'), '--project', PROY, '--ejecutar'], { cwd: raiz, encoding: 'utf8', env: process.env });

await vaciar();
check('0) las reglas de verdad están cargadas', (await cargarReglas()) === 200);

console.log('\n── A · La siembra de la administración ──');
/* Como en producción: una oficial que ya existe con id automático. */
await fetch(`${base}/communities?documentId=AbC123automatico`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify(doc({ name: 'Cine & Animación', slug: 'cine-animacion', isOfficial: true, status: 'active', memberCount: 50, postCount: 3 })) });
const primera = sembrar();
let todas = await listar();
const slugs = todas.map((d) => d.slug);
check('1) siembra las oficiales que faltan', primera.status === 0 && /creadas: 7/.test(primera.stdout), primera.stdout.split('\n').slice(-3).join(' '));
check('2) ocho en total, una por slug, todas oficiales', todas.length === 8 && new Set(slugs).size === 8 && todas.every((d) => d.oficial === true));
check('3) la que ya existía con id automático no se duplica ni se toca', todas.filter((d) => d.slug === 'cine-animacion').length === 1 && todas.some((d) => d.id === 'AbC123automatico'));
const segunda = sembrar();
todas = await listar();
check('4) una segunda vez no crea ninguna', segunda.status === 0 && /creadas: 0/.test(segunda.stdout) && todas.length === 8);

console.log('\n── B · Un cliente sin permiso no puede ──');
/* Exactamente lo que intentaba la app: sin createdBy, moderators vacío, isOfficial: true. */
const comoLaApp = { name: 'Futuro y sociedad', slug: 'futuro-x', description: 'x', icon: 'planet', rules: [], memberCount: 0, postCount: 0, isOfficial: true, moderators: [], status: 'active' };
check('5) una sesión normal no puede crear la oficial que intentaba la app', (await crear('intento1', comoLaApp, sesion('ana'))) === 403);
check('6) ni quien no tiene sesión', (await crear('intento2', comoLaApp, null)) === 403);
check('7) ni una oficial a su propio nombre', (await crear('intento3', { ...comoLaApp, createdBy: 'ana', moderators: ['ana'] }, sesion('ana'))) === 403);
check('8) una comunidad de usuario, a su nombre y no oficial, sí', (await crear('mia', { ...comoLaApp, isOfficial: false, createdBy: 'ana', moderators: ['ana'], slug: 'mia' }, sesion('ana'))) === 200);
check('9) y una sesión de administración (claim admin) sí puede sembrar una oficial', (await crear('oficialAdmin', { ...comoLaApp, slug: 'admin-x' }, sesion('jefa', { admin: true }))) === 200);

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
