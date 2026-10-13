/*
 * R9 · LÍNEA A — LAS REGLAS REALES DE `creations` Y DEL ARCHIVO DE PROYECTOS, EN EL EMULADOR.
 *
 *   PREPARADA, NO EJECUTADA (la línea A no arranca emuladores). La corre el coordinador, desde la raíz del proyecto:
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/pc-dominio-reglas.emulator.mjs firestore.rules"
 *
 * Con CONTROLES: cada «deniega» tiene al lado el «permite» que demuestra que la prueba no deniega por otra razón.
 */
import fs from 'node:fs';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const cargarReglas = async (contenido) => (await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
})).status;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
  }) + '.';
};
/*
 * `admin: true` = la credencial de administrador del emulador (`Bearer owner`), que se salta las reglas: solo para
 * SEMBRAR. Sin `uid` ni `admin` la petición va SIN sesión de verdad (sin cabecera Authorization); antes caía en
 * `owner` y la 3) «sin sesión» leía como administrador.
 */
const pedir = async (metodo, ruta, { uid, body, admin } = {}) => (await fetch(base + ruta, {
  method: metodo,
  headers: { ...(uid ? { Authorization: `Bearer ${sesion(uid)}` } : admin ? { Authorization: 'Bearer owner' } : {}), 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
})).status;
const v = (x) => {
  if (typeof x === 'string') return { stringValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { nullValue: null };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });
const sembrar = (ruta, datos) => pedir('PATCH', ruta, { admin: true, body: doc(datos) });
const escribir = (ruta, uid, datos) => pedir('PATCH', `${ruta}?${Object.keys(datos).map((k) => `updateMask.fieldPaths=${k}`).join('&')}`, { uid, body: doc(datos) });

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const esperar = async (nombre, esperado, status) => check(nombre, (status < 400) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);

const ANA = 'ana000000000000000000000001';
const BETO = 'beto00000000000000000000002';

const estado = await cargarReglas(fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8'));
if (estado !== 200) { console.error('✘ las reglas no compilaron:', estado); process.exit(1); }

await sembrar('/creations/creation_ana', { ownerAccountId: ANA, assetIds: ['asset_a'], status: 'final', finalizadaEn: 1 });
await sembrar('/creatorProjects/proj_ana', { userId: ANA, name: 'Mi marca', emoji: '📁', createdAt: new Date(), updatedAt: new Date() });

console.log('── creations ──');
await esperar('1) Ana lee su creación', 'PERMITE', await pedir('GET', '/creations/creation_ana', { uid: ANA }));
await esperar('2) Beto NO lee la creación de Ana', 'DENIEGA', await pedir('GET', '/creations/creation_ana', { uid: BETO }));
await esperar('3) sin sesión, nadie la lee', 'DENIEGA', await pedir('GET', '/creations/creation_ana', {}));
/* CONTROL de la 3): la misma lectura como administrador del emulador SÍ pasa; prueba que la 3) mide la regla y no la cabecera. */
await esperar('3b) CONTROL · como administrador del emulador sí se lee (se salta las reglas)', 'PERMITE', await pedir('GET', '/creations/creation_ana', { admin: true }));
await esperar('4) Ana NO crea una creación desde el cliente (solo el callable)', 'DENIEGA',
  await pedir('PATCH', '/creations/creation_falsa', { uid: ANA, body: doc({ ownerAccountId: ANA, assetIds: ['asset_a'], status: 'final' }) }));
await esperar('5) Ana NO se cambia el estado (finalizar/eliminar es del servidor)', 'DENIEGA', await escribir('/creations/creation_ana', ANA, { status: 'eliminada' }));
await esperar('6) Ana NO la borra desde el cliente', 'DENIEGA', await pedir('DELETE', '/creations/creation_ana', { uid: ANA }));

console.log('── archivo de proyectos ──');
await esperar('7) Ana archiva su proyecto (archivedAt + updatedAt)', 'PERMITE', await escribir('/creatorProjects/proj_ana', ANA, { archivedAt: new Date(), updatedAt: new Date() }));
await esperar('8) y lo desarchiva (archivedAt null)', 'PERMITE', await escribir('/creatorProjects/proj_ana', ANA, { archivedAt: null, updatedAt: new Date() }));
await esperar('9) Beto NO archiva el proyecto de Ana', 'DENIEGA', await escribir('/creatorProjects/proj_ana', BETO, { archivedAt: new Date() }));
await esperar('10) CONTROL · Ana tampoco se lo regala a Beto al archivar', 'DENIEGA', await escribir('/creatorProjects/proj_ana', ANA, { archivedAt: new Date(), userId: BETO }));

console.log('── mover un trabajo de proyecto ──');
await sembrar('/creatorProjects/proj_beto', { userId: BETO, name: 'Lo de Beto', emoji: '📁', createdAt: new Date(), updatedAt: new Date() });
await sembrar('/creatorJobs/job_ana', { userId: ANA, experienceId: 'design', status: 'done' });
await esperar('11) Ana mueve su trabajo a SU proyecto', 'PERMITE', await escribir('/creatorJobs/job_ana', ANA, { projectId: 'proj_ana', updatedAt: new Date() }));
await esperar('12) Ana NO mueve su trabajo al proyecto de Beto', 'DENIEGA', await escribir('/creatorJobs/job_ana', ANA, { projectId: 'proj_beto', updatedAt: new Date() }));
await esperar('13) ni a un proyecto que no existe', 'DENIEGA', await escribir('/creatorJobs/job_ana', ANA, { projectId: 'proj_fantasma', updatedAt: new Date() }));
await esperar('14) CONTROL · sacarlo del proyecto (null) sigue permitido', 'PERMITE', await escribir('/creatorJobs/job_ana', ANA, { projectId: null, updatedAt: new Date() }));
await esperar('15) CONTROL · Beto no toca el trabajo de Ana aunque el proyecto sea suyo', 'DENIEGA', await escribir('/creatorJobs/job_ana', BETO, { projectId: 'proj_beto', updatedAt: new Date() }));

console.log(failures === 0 ? '\nOK pc-dominio-reglas (emulador)' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
