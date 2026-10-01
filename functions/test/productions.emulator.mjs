/**
 * F1-B · LAS PRODUCCIONES CONTRA FIRESTORE DE VERDAD.
 *
 * Lo que no se comprueba leyendo un archivo, y por eso está aquí:
 *
 *   1 · LAS REGLAS. Que una cuenta no lea lo de otra y que el cliente no escriba
 *       en producciones, escenas ni registro se sabe INTENTÁNDOLO con una sesión.
 *   2 · LAS TRANSACCIONES. Que el CAS aguante dos lotes a la vez, que `create`
 *       no pise y que la consulta de la lista funcione, contra el Firestore de
 *       verdad del emulador y con el Admin SDK, como en producción.
 *
 * Lo demás ya está en `productions-runtime.test.mjs`, con una base de mentira, y
 * no se repite aquí.
 *
 * NO está en `npm test` a propósito: necesita el emulador y Java 21. Desde la raíz
 * del proyecto, con un proyecto de demostración que no existe fuera del emulador:
 *
 *   firebase emulators:exec --only firestore --project demo-wee-filmmaker \
 *     "node functions/test/productions.emulator.mjs"
 *
 * Se NIEGA a correr sin emulador (`FIRESTORE_EMULATOR_HOST`) y contra el proyecto
 * de producción: el Admin SDK sin emulador hablaría con una base real.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const PROY = process.env.GCLOUD_PROJECT || 'demo-wee-filmmaker';
if (!host) { console.log('✘ sin emulador no se corre: falta FIRESTORE_EMULATOR_HOST'); process.exit(1); }
if (!PROY.startsWith('demo-')) { console.log(`✘ solo contra un proyecto de demostración, nunca contra «${PROY}»`); process.exit(1); }

const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Sesiones y reglas, como en las demás pruebas de emulador ─────────────── */

const cargarReglas = async (contenido) => {
  const res = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  return res.status;
};
/** Una sesión de Firebase Auth sin firmar: el emulador no verifica firmas. */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const ahora = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: ahora,
    user_id: uid, sub: uid, iat: ahora, exp: ahora + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
  })}.`;
};
const comoCliente = async (metodo, ruta, uid, cuerpo) => {
  const res = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { ...(uid ? { Authorization: `Bearer ${sesion(uid)}` } : {}), 'Content-Type': 'application/json' },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  return res.status;
};
const consultaComoCliente = async (uid, owner) => {
  const res = await fetch(`${base}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sesion(uid)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'productions' }],
        where: { compositeFilter: { op: 'AND', filters: [
          { fieldFilter: { field: { fieldPath: 'ownerAccountId' }, op: 'EQUAL', value: { stringValue: owner } } },
          { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } },
        ] } },
        orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'DESCENDING' }],
        limit: 20,
      },
    }),
  });
  return { status: res.status, cuerpo: await res.json().catch(() => null) };
};
const documento = (owner) => ({ fields: { ownerAccountId: { stringValue: owner }, status: { stringValue: 'active' } } });

/* ── El mundo, escrito por el servidor (Admin SDK, como en producción) ────── */

const admin = require(path.resolve(RAIZ, 'functions/node_modules/firebase-admin/lib/index.js'));
if (!admin.apps.length) admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const P = require(path.resolve(RAIZ, 'functions/lib/productions/index.js'));
const M = require(path.resolve(RAIZ, 'functions/lib/filmmaker/modelo.js'));

const A = 'cuentaAemu';
const B = 'cuentaBemu';
const HOY = 1_800_000_000_000;
const sufijo = String(Date.now()).padStart(16, '0');
const pid = (k) => `prod${k}${sufijo}`;
const IMG = `asset_${'a'.repeat(32)}`;
const FICHAS = { [IMG]: { assetId: IMG, ownerAccountId: A, kind: 'image', status: 'ready' } };
const deps = { db, material: async (id) => FICHAS[id] ?? null };

const produccion = () => ({
  ...M.produccionVacia({ title: 'Emulador', aspectRatio: '9:16' }),
  references: [{ id: 'ref-luna', kind: 'image', role: 'character', assetId: IMG }],
  scenes: [
    { id: 'sc-0001', order: 0, shots: [{ id: 'sh-0101', order: 0, durationSec: 4, description: 'Uno', advanced: { prompt: 'solo para su dueña' } }] },
    { id: 'sc-0002', order: 1, shots: [{ id: 'sh-0201', order: 0, durationSec: 4, description: 'Dos' }] },
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════ */

console.log('\n── A · El servicio, contra Firestore de verdad ──');
const c = await P.crearProduccion({ accountId: A, productionId: pid(1), production: produccion(), at: HOY }, deps);
check('crear escribe la raíz, sus escenas y la revisión 0 en una transacción', c.ok && c.created
  && (await db.doc(`productions/${pid(1)}`).get()).exists && (await db.collection(`productions/${pid(1)}/productionScenes`).get()).size === 2
  && (await db.doc(`productions/${pid(1)}/productionRevisions/0000000000`).get()).data()?.kind === 'create');
const otra = await P.crearProduccion({ accountId: A, productionId: pid(1), title: 'Otra', aspectRatio: '1:1', at: HOY }, deps);
check('`create` no pisa: el mismo id con otra cosa es `production_id_taken`', otra.ok === false && otra.code === 'production_id_taken'
  && (await db.doc(`productions/${pid(1)}`).get()).data()?.title === 'Emulador');
const a1 = await P.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }], at: HOY + 1 }, deps);
check('un lote sube una revisión y deja su entrada', a1.ok && a1.view.revision === 1 && (await db.doc(`productions/${pid(1)}/productionRevisions/0000000001`).get()).exists);
const [x, y] = await Promise.all([
  P.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(1), expectedRevision: 1, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }], at: HOY + 2 }, deps),
  P.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(1), expectedRevision: 1, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'snow' }], at: HOY + 3 }, deps),
]);
const g = await P.leerProduccion(A, pid(1), deps);
check('dos lotes a la vez con transacciones de verdad: uno entra, el otro choca, y la revisión sube una vez',
  [x, y].filter((r) => r.ok).length === 1 && [x, y].filter((r) => !r.ok && r.code === 'revision_conflict').length === 1 && g.ok && g.view.revision === 2);
const l = await P.listarProducciones({ accountId: A }, deps);
check('la consulta de la lista funciona con su forma real', l.ok && l.productions.some((p) => p.productionId === pid(1)));
const reg = await P.leerRegistro(A, pid(1), deps);
const r2 = reg.ok ? P.reconstruirRevision(reg.entries, 2) : { ok: false };
check('el registro guardado reconstruye la revisión de hoy', r2.ok && M.canonico(r2.production) === M.canonico(g.view.production));
await P.archivarProduccion(A, pid(1), HOY + 4, deps);
const archivada = await P.aplicarOperacionesGuardadas({ accountId: A, productionId: pid(1), expectedRevision: 2, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }], at: HOY + 5 }, deps);
check('archivada, no admite lotes', archivada.ok === false && archivada.code === 'production_archived');
const d = await P.duplicarProduccion({ accountId: A, productionId: pid(1), newProductionId: pid(2), at: HOY + 6 }, deps);
check('y se duplica en otra producción activa', d.ok && d.view.status === 'active' && (await db.doc(`productions/${pid(2)}`).get()).data()?.status === 'active');

console.log('\n── B · Las reglas, intentadas de verdad ──');
{
  const estado = await cargarReglas(fs.readFileSync(path.resolve(RAIZ, 'firestore.rules'), 'utf8'));
  check('las reglas del repositorio se cargan en el emulador', estado === 200, `HTTP ${estado}`);
  const RUTAS = [`/productions/${pid(1)}`, `/productions/${pid(1)}/productionScenes/sc-0001`, `/productions/${pid(1)}/productionRevisions/0000000000`];
  const deLaDuena = await Promise.all(RUTAS.map((r) => comoCliente('GET', r, A)));
  check('la DUEÑA lee su producción, sus escenas y su registro', deLaDuena.every((s) => s === 200), deLaDuena.join(','));
  const deOtra = await Promise.all(RUTAS.map((r) => comoCliente('GET', r, B)));
  check('OTRA cuenta no lee ninguna de las tres: la regla la para', deOtra.every((s) => s === 403), deOtra.join(','));
  const sinSesion = await Promise.all(RUTAS.map((r) => comoCliente('GET', r, null)));
  check('sin sesión, tampoco', sinSesion.every((s) => s === 403), sinSesion.join(','));
  const crearCli = await Promise.all([
    comoCliente('POST', `/productions?documentId=${pid(9)}`, A, documento(A)),
    comoCliente('POST', `/productions/${pid(1)}/productionScenes?documentId=sc-9999`, A, documento(A)),
    comoCliente('POST', `/productions/${pid(1)}/productionRevisions?documentId=0000000099`, A, documento(A)),
  ]);
  check('el cliente no CREA nada: ni producción, ni escena, ni entrada del registro', crearCli.every((s) => s === 403), crearCli.join(','));
  const cambiarCli = await Promise.all(RUTAS.map((r) => comoCliente('PATCH', `${r}?updateMask.fieldPaths=status`, A, documento(A))));
  check('no CAMBIA nada, aunque sea suyo', cambiarCli.every((s) => s === 403), cambiarCli.join(','));
  const borrarCli = await Promise.all(RUTAS.map((r) => comoCliente('DELETE', r, A)));
  check('y no BORRA nada: el registro solo lo añade el servidor', borrarCli.every((s) => s === 403), borrarCli.join(','));
  const suya = await consultaComoCliente(A, A);
  check('la lista de la dueña, con la forma del índice, se puede pedir', suya.status === 200 && Array.isArray(suya.cuerpo) && suya.cuerpo.some((r) => r.document?.name?.endsWith(`/productions/${pid(1)}`) || r.document?.name?.endsWith(`/productions/${pid(2)}`)));
  const ajena = await consultaComoCliente(B, A);
  check('y la de otra cuenta, no', ajena.status === 403, `HTTP ${ajena.status}`);
}

console.log('\n── C · Limpieza ──');
for (const k of [1, 2]) await db.recursiveDelete(db.doc(`productions/${pid(k)}`));
check('lo escrito por esta prueba se borra del emulador', !(await db.doc(`productions/${pid(1)}`).get()).exists && !(await db.doc(`productions/${pid(2)}`).get()).exists);

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ F1-B contra el emulador: ${n} comprobaciones`);
process.exit(failures ? 1 : 0);
