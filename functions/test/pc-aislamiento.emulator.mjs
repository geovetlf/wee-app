/**
 * MIS PROYECTOS / MIS CREACIONES — LA BIBLIOTECA DE UNA CUENTA NO LA VE NI LA TOCA OTRA (R9 · línea D), contra el emulador.
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/pc-aislamiento.emulator.mjs"
 *
 * No está en `npm test`: necesita el emulador de Firestore. La parte estática de las mismas reglas (y sus controles por
 * mutación) está en `pc-regresion.test.mjs` § C; aquí las evalúa el motor de reglas de verdad, por REST y sin SDK de
 * cliente (el patrón de `comunidades-siembra.emulator.mjs`). El proyecto tiene que ser `demo-*` (`_emulador.mjs`).
 *
 *   A · assets: Ana lee lo suyo; Beto, ni lo lee ni lo lista (ni con su filtro ni sin él); sin sesión, nada. Nadie lo
 *       escribe ni lo borra desde el cliente, tampoco su dueña.
 *   B · creatorProjects: Ana crea a su nombre, lee, renombra y borra lo suyo; Beto no lo lee, no lo lista, no lo edita,
 *       no lo borra, no crea uno a nombre de Ana; y Ana no puede regalar su proyecto (cambiar userId).
 *   C · creatorJobs: Ana lee su trabajo y lo mueve de proyecto (solo projectId/updatedAt); no cambia su estado ni sus
 *       resultados; no lo crea ni lo borra; Beto no lo lee ni lo mueve.
 *   D · users/{uid}/bookmarks y users/{uid}/writerDocuments: solo el propio uid.
 *   E · CONTROL: con una copia de las reglas en la que `assets` se lee con cualquier sesión, Beto SÍ lee lo de Ana —el
 *       detector no es un verde vacío—, y al volver a cargar las reglas de verdad deja de poder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
let failures = 0;
let total = 0;
const check = (name, cond, extra = '') => {
  total++;
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { sign_in_provider: 'password', identities: {} },
  }) + '.';
};
const ANA = sesion('ana');
const BETO = sesion('beto');
const SERVIDOR = 'owner'; // el emulador trata «Bearer owner» como administración: sin reglas

const valor = (v) => {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valor) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)])) } };
};
const cuerpo = (o) => JSON.stringify({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, valor(v)])) });
const cabeceras = (aut) => ({ 'Content-Type': 'application/json', ...(aut ? { Authorization: `Bearer ${aut}` } : {}) });

/* ruta = 'assets/a1' o 'users/ana/bookmarks/p1' */
const crear = async (ruta, datos, aut) => {
  const i = ruta.lastIndexOf('/');
  const r = await fetch(`${base}/${ruta.slice(0, i)}?documentId=${ruta.slice(i + 1)}`, { method: 'POST', headers: cabeceras(aut), body: cuerpo(datos) });
  return r.status;
};
const leer = async (ruta, aut) => (await fetch(`${base}/${ruta}`, { headers: cabeceras(aut) })).status;
const editar = async (ruta, campos, aut) => {
  const mascara = Object.keys(campos).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${base}/${ruta}?${mascara}&currentDocument.exists=true`, { method: 'PATCH', headers: cabeceras(aut), body: cuerpo(campos) });
  return r.status;
};
const borrar = async (ruta, aut) => (await fetch(`${base}/${ruta}`, { method: 'DELETE', headers: cabeceras(aut) })).status;
/* Una consulta de lista, como la de la app. Devuelve { permitida, docs }. */
const consultar = async (coleccion, filtro, aut, padre = '') => {
  const structuredQuery = { from: [{ collectionId: coleccion }], limit: 50 };
  if (filtro) structuredQuery.where = { fieldFilter: { field: { fieldPath: filtro[0] }, op: 'EQUAL', value: valor(filtro[1]) } };
  const r = await fetch(`${base}${padre ? `/${padre}` : ''}:runQuery`, { method: 'POST', headers: cabeceras(aut), body: JSON.stringify({ structuredQuery }) });
  let j = null;
  try { j = await r.json(); } catch { j = null; }
  const conError = !Array.isArray(j) || j.some((x) => x && x.error);
  const docs = Array.isArray(j) ? j.filter((x) => x && x.document).map((x) => x.document.name.split('/').pop()) : [];
  return { permitida: r.status === 200 && !conError, docs, status: r.status };
};
const NEGADO = (s) => s === 403 || s === 401;
const OK = (s) => s === 200;

const vaciar = async () => fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
const cargarReglas = async (contenido) => {
  const r = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  return r.status;
};
const REGLAS = fs.readFileSync(path.join(raiz, 'firestore.rules'), 'utf8');

const sembrar = async () => {
  await vaciar();
  const s = [
    await crear('assets/a_ana', { ownerAccountId: 'ana', kind: 'image', status: 'ready', createdAt: 1 }, SERVIDOR),
    await crear('assets/a_beto', { ownerAccountId: 'beto', kind: 'video', status: 'ready', createdAt: 2 }, SERVIDOR),
    await crear('creatorProjects/p_ana', { userId: 'ana', name: 'Mi restaurante', emoji: '🍔', createdAt: 1, updatedAt: 1 }, SERVIDOR),
    await crear('creatorJobs/j_ana', { userId: 'ana', experienceId: 'design', status: 'done', projectId: 'p_ana', results: [], createdAt: 1, updatedAt: 1 }, SERVIDOR),
    await crear('users/ana/bookmarks/post1', { postId: 'post1', createdAt: 1 }, SERVIDOR),
    await crear('users/ana/writerDocuments/d1', { title: 'borrador', updatedAt: 1 }, SERVIDOR),
  ];
  return s.every(OK);
};

console.log(`\nProyecto del emulador: ${PROY} (${host})`);
check('0) el emulador acepta las reglas de verdad (firestore.rules)', OK(await cargarReglas(REGLAS)));
check('0b) siembra como servidor (sin reglas)', await sembrar());

console.log('\n── A · assets ──');
check('1) Ana lee su material', OK(await leer('assets/a_ana', ANA)));
check('2) Beto NO lee el material de Ana', NEGADO(await leer('assets/a_ana', BETO)));
check('3) sin sesión, nadie lee material', NEGADO(await leer('assets/a_ana', null)));
{
  const propia = await consultar('assets', ['ownerAccountId', 'ana'], ANA);
  check('4) Ana lista lo suyo (ownerAccountId == ana) y solo ve lo suyo', propia.permitida && propia.docs.join() === 'a_ana', JSON.stringify(propia));
  const ajena = await consultar('assets', ['ownerAccountId', 'ana'], BETO);
  check('5) Beto NO puede listar el material de Ana', !ajena.permitida && ajena.docs.length === 0, JSON.stringify(ajena));
  const todo = await consultar('assets', null, BETO);
  check('6) Beto NO puede listar la colección sin filtro', !todo.permitida && todo.docs.length === 0, JSON.stringify(todo));
}
check('7) ni su dueña crea una ficha de material desde el cliente', NEGADO(await crear('assets/a_nueva', { ownerAccountId: 'ana', kind: 'image', status: 'ready' }, ANA)));
check('8) ni su dueña cambia una ficha (p. ej. el estado)', NEGADO(await editar('assets/a_ana', { status: 'deleted' }, ANA)));
check('9) ni su dueña la borra directamente (se pide a deleteAsset)', NEGADO(await borrar('assets/a_ana', ANA)));
check('10) Beto no se apropia del material de Ana', NEGADO(await editar('assets/a_ana', { ownerAccountId: 'beto' }, BETO)));

console.log('\n── B · creatorProjects ──');
check('11) Ana crea un proyecto a su nombre', OK(await crear('creatorProjects/p_ana2', { userId: 'ana', name: 'Viaje', emoji: '✈️', createdAt: 2, updatedAt: 2 }, ANA)));
check('12) Beto NO crea un proyecto a nombre de Ana', NEGADO(await crear('creatorProjects/p_falso', { userId: 'ana', name: 'x', emoji: '📁', createdAt: 2, updatedAt: 2 }, BETO)));
check('13) Ana lee su proyecto; Beto no', OK(await leer('creatorProjects/p_ana', ANA)) && NEGADO(await leer('creatorProjects/p_ana', BETO)));
{
  const propia = await consultar('creatorProjects', ['userId', 'ana'], ANA);
  check('14) Ana lista sus proyectos y solo los suyos', propia.permitida && propia.docs.sort().join() === 'p_ana,p_ana2', JSON.stringify(propia));
  const ajena = await consultar('creatorProjects', ['userId', 'ana'], BETO);
  check('15) Beto NO lista los proyectos de Ana', !ajena.permitida && ajena.docs.length === 0, JSON.stringify(ajena));
}
check('16) Ana renombra su proyecto', OK(await editar('creatorProjects/p_ana', { name: 'Mi restaurante 2', updatedAt: 3 }, ANA)));
check('17) Ana NO puede regalar su proyecto (cambiar userId)', NEGADO(await editar('creatorProjects/p_ana', { userId: 'beto' }, ANA)));
check('18) Beto NO edita ni borra el proyecto de Ana', NEGADO(await editar('creatorProjects/p_ana', { name: 'mío' }, BETO)) && NEGADO(await borrar('creatorProjects/p_ana', BETO)));
check('19) Ana borra su proyecto', OK(await borrar('creatorProjects/p_ana2', ANA)));

console.log('\n── C · creatorJobs ──');
check('20) Ana lee su trabajo; Beto no; sin sesión no', OK(await leer('creatorJobs/j_ana', ANA)) && NEGADO(await leer('creatorJobs/j_ana', BETO)) && NEGADO(await leer('creatorJobs/j_ana', null)));
check('21) Ana mueve su trabajo de proyecto (solo projectId + updatedAt)', OK(await editar('creatorJobs/j_ana', { projectId: 'p_ana', updatedAt: 4 }, ANA)));
check('22) Ana NO cambia el estado ni los resultados de su trabajo', NEGADO(await editar('creatorJobs/j_ana', { status: 'final' }, ANA)) && NEGADO(await editar('creatorJobs/j_ana', { results: [] }, ANA)));
check('23) Ana NO crea ni borra trabajos desde el cliente', NEGADO(await crear('creatorJobs/j_nuevo', { userId: 'ana', status: 'done' }, ANA)) && NEGADO(await borrar('creatorJobs/j_ana', ANA)));
check('24) Beto NO mueve el trabajo de Ana', NEGADO(await editar('creatorJobs/j_ana', { projectId: 'p_beto', updatedAt: 5 }, BETO)));
{
  const ajena = await consultar('creatorJobs', ['userId', 'ana'], BETO);
  check('25) Beto NO lista los trabajos de Ana', !ajena.permitida && ajena.docs.length === 0, JSON.stringify(ajena));
}

console.log('\n── D · users/{uid}/… ──');
check('26) Ana lee y escribe sus guardados; Beto no los lee ni escribe', OK(await leer('users/ana/bookmarks/post1', ANA))
  && NEGADO(await leer('users/ana/bookmarks/post1', BETO)) && NEGADO(await crear('users/ana/bookmarks/post2', { postId: 'post2' }, BETO)));
check('27) los documentos de Writer de Ana: solo Ana', OK(await leer('users/ana/writerDocuments/d1', ANA)) && NEGADO(await leer('users/ana/writerDocuments/d1', BETO)));
{
  const ajena = await consultar('bookmarks', null, BETO, 'users/ana');
  check('28) Beto NO lista los guardados de Ana', !ajena.permitida && ajena.docs.length === 0, JSON.stringify(ajena));
}

console.log('\n── E · CONTROL ──');
{
  const mutadas = REGLAS.replace(/(match \/assets\/\{assetId\} \{\s*allow read: if isAuthenticated\(\))[^;]*;/, '$1;');
  check('29) la copia mutada es distinta de las reglas de verdad', mutadas !== REGLAS);
  check('30) CONTROL: el emulador acepta la copia mutada', OK(await cargarReglas(mutadas)));
  check('31) CONTROL: con la regla mutada, Beto SÍ lee el material de Ana (el detector no es vacío)', OK(await leer('assets/a_ana', BETO)));
  check('32) al volver a las reglas de verdad, Beto deja de leerlo', OK(await cargarReglas(REGLAS)) && NEGADO(await leer('assets/a_ana', BETO)));
}

await vaciar();
console.log(`\n${failures === 0 ? '✔' : '✘'} pc-aislamiento (emulador): ${total - failures}/${total}${failures ? ` — ${failures} fallo(s)` : ''}`);
process.exit(failures ? 1 : 0);
