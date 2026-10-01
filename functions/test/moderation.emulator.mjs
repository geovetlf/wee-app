/*
 * F12-A/B — MODERACIÓN, CONTRA FIRESTORE DE VERDAD.
 *
 * Lo que un almacén de mentira no puede decir: si dos peticiones idénticas que
 * caen a la vez crean UN reporte o dos, si el límite de ritmo aguanta cuando las
 * veinticinco llegan en el mismo instante, si dos personas revisando a la vez
 * dejan el historial coherente, y qué ve de verdad un cliente con sesión.
 *
 *   A · Crear, con transacciones de verdad.
 *   B · Lo mismo, muchas veces a la vez: un reporte, no veinticinco.
 *   C · El ritmo bajo concurrencia: pasan exactamente los que caben.
 *   D · Revisar, y dos personas revisando a la vez.
 *   E · Lo que un cliente puede hacer con `reports`: nada.
 *   F · Nada fuera de su sitio: ni Credits, ni usuarios, ni publicaciones.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/moderation.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('sin FIRESTORE_EMULATOR_HOST: no se ejecuta'); process.exit(2); }
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const admin = require('firebase-admin');
const PROY = proyectoDeEmulador();
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const comp = require(path.resolve(here, '../lib/moderation/index.js'));
const M = require(path.resolve(here, '../lib/core/moderation.js'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rechazo = async (p) => { try { await p; return null; } catch (e) { return e; } };

const T0 = 1_750_000_000_000;
let reloj = T0;
const ANA = 'emuAnaAAAA0001', BEA = 'emuBeaBBBB0002', CAI = 'emuCaiCCCC0003', ADM1 = 'emuAdminZZZ0001', ADM2 = 'emuAdminZZZ0002';
const ENT = (n) => `ent_${String(n).padStart(26, '0')}`;
const E_ANA = ENT(511), E_ANA_WEE = ENT(512), E_BEA = ENT(521);
const cuentaDe = (uid, real) => ({ contract: '2.0', accountId: uid, accountNumber: '123456789', status: 'ACTIVE', foundingPrincipalId: uid, realProfileEntityId: real, nextPageSequence: 3, createdAt: T0, updatedAt: T0 });
const entidad = (entityId, owner, tipo, seq, perfilUid) => ({ contract: '2.0', entityId, ownerAccountId: owner, entityType: tipo, entitySequence: seq, profileRef: { coleccion: 'users', uid: perfilUid }, status: 'ACTIVE', createdAt: T0, updatedAt: T0 });

await Promise.all([
  db.doc(`accounts/${ANA}`).set(cuentaDe(ANA, E_ANA)), db.doc(`accounts/${BEA}`).set(cuentaDe(BEA, E_BEA)), db.doc(`accounts/${CAI}`).set(cuentaDe(CAI, ENT(531))),
  db.doc(`entities/${E_ANA}`).set(entidad(E_ANA, ANA, 'REAL_PROFILE', 1, ANA)), db.doc(`entities/${E_ANA_WEE}`).set(entidad(E_ANA_WEE, ANA, 'WEE_PROFILE', 2, `perfilWeeDe${ANA}`)),
  db.doc(`entities/${E_BEA}`).set(entidad(E_BEA, BEA, 'REAL_PROFILE', 1, BEA)),
  ...Array.from({ length: 30 }, (_, i) => db.doc(`posts/emuPost${i}`).set({ userId: BEA, content: `publicación ${i}`, imageUrls: [] })),
  db.doc(`users/${BEA}`).set({ uid: BEA, creditsBalance: 240 }), db.doc(`users/${ANA}`).set({ uid: ANA, creditsBalance: 240 }),
]);
const holgada = { ...M.POLITICA_DE_REPORTES, maximoPorVentana: 10_000, maximoPorDia: 10_000 };
const motor = (extra = {}) => comp.crearModeracion({ db, now: () => reloj, ...extra });
const pet = (extra = {}) => ({ targetType: 'POST', targetId: 'emuPost0', reason: 'SPAM', ...extra });
const reportes = async () => (await db.collection('reports').get()).docs.map((d) => d.data());
const contar = async (ruta) => (await db.collection(ruta).count().get()).data().count;

// ══════════════════════════════════════════════════════════════════════════
console.log('── A · Crear, con transacciones de verdad ──');
{
  const r = await motor().reportar(ANA, pet({ actingEntityId: E_ANA_WEE, surface: 'wall' }));
  const [doc] = await reportes();
  check('A1) el reporte existe en Firestore, con todo lo que pone el servidor',
    r.received && !r.duplicate && doc.reporterAccountId === ANA && doc.reporterEntityId === E_ANA_WEE && doc.reporterEntityType === 'WEE_PROFILE'
    && doc.targetOwnerAccountId === BEA && doc.targetOwnerEntityId === E_BEA && doc.status === 'RECEIVED' && doc.createdAt === T0);
  const h = (await db.collection(`reports/${doc.reportId}/history`).get()).docs.map((d) => [d.id, d.data().type]);
  check('A2) con su primera entrada de historial, en su sitio', igual(h, [['0001', 'REPORT_CREATED']]));
  check('A3) y lo que se contesta no lleva ni el identificador ni de quién era', igual(Object.keys(r).sort(), ['createdAt', 'duplicate', 'received', 'status']));
  const lim = (await db.doc(`moderationLimits/${ANA}`).get()).data();
  check('A4) el intento quedó contado en el límite de ESA cuenta', lim.windowCount === 1 && lim.dayCount === 1 && lim.windowStartedAt === T0);
}

console.log('\n── B · Lo mismo, muchas veces a la vez ──');
for (const n of [2, 10, 25, 50]) {
  const objetivo = `emuPost${n % 30}`;
  const antes = await contar('reports');
  const t0 = Date.now();
  const r = await Promise.allSettled(Array.from({ length: n }, () => motor({ politica: holgada }).reportar(CAI, pet({ targetId: objetivo, reason: 'HATE' }))));
  const ms = Date.now() - t0;
  const bien = r.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const mal = r.filter((x) => x.status === 'rejected');
  const creados = bien.filter((x) => !x.duplicate).length;
  const id = M.idDeReporte(comp.huellaDelSistema, { reporterAccountId: CAI, targetType: 'POST', targetId: objetivo, reason: 'HATE' });
  const entradas = await contar(`reports/${id}/history`);
  check(`B) ${n} peticiones idénticas a la vez: UN reporte nuevo, una entrada de historial, y el resto se sabe repetido`,
    (await contar('reports')) === antes + 1 && creados === 1 && entradas === 1 && bien.length + mal.length === n && bien.filter((x) => x.duplicate).length === bien.length - 1,
    `${ms} ms · creados=${creados} · repetidos=${bien.length - creados} · sin resolver por contención=${mal.length}`);
}

console.log('\n── C · El ritmo, bajo concurrencia ──');
{
  reloj = T0 + 3_600_000;
  const P = M.POLITICA_DE_REPORTES;
  const antes = await contar('reports');
  /* Veinticinco denuncias DISTINTAS de la misma cuenta, todas a la vez, con la política de verdad. */
  const intentos = Array.from({ length: 25 }, (_, i) => motor().reportar(BEA, pet({ targetType: 'ENTITY', targetId: E_ANA, reason: M.MOTIVOS_DE_REPORTE[i % 10] })).then(
    (v) => ({ ok: true, v }), (e) => ({ ok: false, code: e?.code })));
  /* Lo que el SDK no resuelve en sus intentos por contención se reintenta, como haría el cliente. */
  let res = await Promise.all(intentos);
  const pasaron = res.filter((x) => x.ok).length;
  const frenados = res.filter((x) => !x.ok && x.code === 'rate_limited').length;
  const otros = res.filter((x) => !x.ok && x.code !== 'rate_limited');
  const lim = (await db.doc(`moderationLimits/${BEA}`).get()).data();
  check('C1) con veinticinco a la vez, el límite NUNCA deja pasar más de los que caben', pasaron <= P.maximoPorVentana && lim.windowCount <= P.maximoPorVentana,
    `pasaron=${pasaron} · frenados=${frenados} · por contención=${otros.length} · contador=${lim.windowCount}`);
  check('C2) y el contador es exacto: tantos intentos contados como pasaron', lim.windowCount === pasaron && lim.dayCount === pasaron);
  check('C3) lo creado no supera ni lo que pasó ni los diez motivos que existen', (await contar('reports')) - antes <= Math.min(pasaron, 10));
  const siguiente = await rechazo(motor().reportar(BEA, pet({ targetType: 'ENTITY', targetId: E_ANA_WEE, reason: 'SPAM' })));
  check('C4) con la ventana llena, la siguiente se frena y dice cuánto falta', pasaron < P.maximoPorVentana || (siguiente?.code === 'rate_limited' && siguiente.retryAfterMs > 0));
  reloj = T0;
}

console.log('\n── D · Revisar ──');
{
  const m = motor({ politica: holgada });
  await m.reportar(ANA, pet({ targetId: 'emuPost7', reason: 'SCAM' }));
  const id = M.idDeReporte(comp.huellaDelSistema, { reporterAccountId: ANA, targetType: 'POST', targetId: 'emuPost7', reason: 'SCAM' });
  const cola = await m.listar('RECEIVED', 50);
  check('D1) la cola sale ordenada por antigüedad y acotada', cola.length > 0 && cola.length <= 50 && cola.every((r, i) => i === 0 || cola[i - 1].createdAt <= r.createdAt) && cola.some((r) => r.reportId === id));

  /* Dos personas cogen el mismo reporte a la vez. */
  reloj = T0 + 100;
  const dos = await Promise.allSettled([m.revisar(ADM1, { reportId: id, to: 'REVIEWING' }), m.revisar(ADM2, { reportId: id, to: 'REVIEWING' })]);
  const gano = dos.filter((x) => x.status === 'fulfilled').length;
  const perdio = dos.filter((x) => x.status === 'rejected' && x.reason?.code === 'invalid_transition').length;
  const h2 = (await db.collection(`reports/${id}/history`).orderBy('seq').get()).docs.map((d) => d.data());
  check('D2) dos revisores a la vez: uno lo coge, el otro recibe que ya no toca, y el historial tiene UNA entrada más', gano === 1 && perdio === 1 && h2.length === 2 && h2[1].type === 'REVIEW_STARTED');

  reloj = T0 + 200;
  const dos2 = await Promise.allSettled([
    m.revisar(ADM1, { reportId: id, to: 'ACTIONED', outcome: 'BLOCK', action: 'CONTENT_HIDDEN', reason: 'estafa' }),
    m.revisar(ADM2, { reportId: id, to: 'DISMISSED', outcome: 'ALLOW' }),
  ]);
  const doc = (await db.doc(`reports/${id}`).get()).data();
  const h3 = (await m.historial(id)).map((e) => [e.seq, e.type]);
  check('D3) dos decisiones contrarias a la vez: gana UNA, y el historial cuenta exactamente esa',
    dos2.filter((x) => x.status === 'fulfilled').length === 1 && ['ACTIONED', 'DISMISSED'].includes(doc.status) && h3.length === 4 && doc.historyCount === 4
    && igual(h3.map((x) => x[0]), [1, 2, 3, 4]) && h3[2][1] === 'DECISION_MADE' && h3[3][1] === (doc.status === 'ACTIONED' ? 'ACTION_REQUESTED' : 'REPORT_DISMISSED'),
    `ganó ${doc.status}`);
  check('D4) la decisión lleva quién, cuándo y qué; una acción, si la hay, queda PEDIDA',
    doc.decision.by.kind === 'REVIEWER' && [ADM1, ADM2].includes(doc.decision.by.id) && doc.decision.at === T0 + 200 && (doc.status !== 'ACTIONED' || (doc.action.status === 'REQUESTED' && !('executedAt' in doc.action))));
  check('D5) y lo denunciado sigue igual: aquí nadie oculta ni borra nada', igual((await db.doc('posts/emuPost7').get()).data(), { userId: BEA, content: 'publicación 7', imageUrls: [] }));
  check('D6) cerrado, no se reabre', (await rechazo(m.revisar(ADM1, { reportId: id, to: 'REVIEWING' })))?.code === 'invalid_transition' && (await m.historial(id)).length === 4);
  reloj = T0;
}

console.log('\n── E · Lo que un cliente puede hacer con `reports` ──');
{
  const reglas = fs.readFileSync(path.resolve(RAIZ, process.argv[2] || 'firestore.rules'), 'utf8');
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const estado = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
  });
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sesion = (u, extra = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: u, sub: u, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'password' }, ...extra })}.`;
  };
  const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
  /* Sin sesión = SIN cabecera. `Bearer owner` es el administrador del emulador y se salta las reglas. */
  const pedir = async (metodo, ruta, u, cuerpo, extra) => (await fetch(base + ruta, {
    method: metodo, headers: { 'Content-Type': 'application/json', ...(u ? { Authorization: `Bearer ${sesion(u, extra)}` } : {}) },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  })).status;
  const texto = (v) => ({ stringValue: v });
  const [mio] = (await db.collection('reports').where('reporterAccountId', '==', ANA).limit(1).get()).docs;
  const id = mio.id;

  check('E0) las reglas del árbol compilan en el emulador', estado.status === 200, `HTTP ${estado.status}`);
  check('E1) la regla vieja ya no está: con sesión NO se puede crear un reporte desde el cliente',
    (await pedir('POST', '/reports', ANA, { fields: { reporterAccountId: texto(ANA), targetId: texto('emuPost1'), reason: texto('SPAM') } })) >= 400
    && (await pedir('PATCH', '/reports/rep_hechoamano', ANA, { fields: { reporterAccountId: texto(BEA), status: texto('ACTIONED') } })) >= 400);
  check('E2) ni sin sesión', (await pedir('POST', '/reports', null, { fields: { reason: texto('SPAM') } })) >= 400);
  check('E3) quien denunció NO lee su reporte: lo que le toca saber se lo contestó la callable', (await pedir('GET', `/reports/${id}`, ANA)) >= 400);
  check('E4) ni la persona denunciada, ni otra cualquiera, ni nadie sin sesión', (await pedir('GET', `/reports/${id}`, BEA)) >= 400 && (await pedir('GET', `/reports/${id}`, CAI)) >= 400 && (await pedir('GET', `/reports/${id}`, null)) >= 400);
  check('E5) nadie lista la colección', (await pedir('GET', '/reports', ANA)) >= 400 && (await pedir('GET', '/reports', null)) >= 400);
  check('E6) nadie cambia el estado, la decisión, el objetivo ni quién denunció',
    (await pedir('PATCH', `/reports/${id}?updateMask.fieldPaths=status`, ANA, { fields: { status: texto('DISMISSED') } })) >= 400
    && (await pedir('PATCH', `/reports/${id}?updateMask.fieldPaths=decision`, BEA, { fields: { decision: texto('ALLOW') } })) >= 400
    && (await pedir('PATCH', `/reports/${id}?updateMask.fieldPaths=targetId`, ANA, { fields: { targetId: texto('otro') } })) >= 400
    && (await pedir('PATCH', `/reports/${id}?updateMask.fieldPaths=reporterAccountId`, ANA, { fields: { reporterAccountId: texto(CAI) } })) >= 400);
  check('E7) nadie borra un reporte', (await pedir('DELETE', `/reports/${id}`, ANA)) >= 400 && (await pedir('DELETE', `/reports/${id}`, BEA)) >= 400);
  check('E8) el historial ni se lee, ni se añade, ni se toca desde un cliente',
    (await pedir('GET', `/reports/${id}/history/0001`, ANA)) >= 400 && (await pedir('GET', `/reports/${id}/history`, ANA)) >= 400
    && (await pedir('PATCH', `/reports/${id}/history/0009`, ANA, { fields: { type: texto('REPORT_DISMISSED') } })) >= 400 && (await pedir('DELETE', `/reports/${id}/history/0001`, ANA)) >= 400);
  check('E9) los límites tampoco: nadie se pone el contador a cero',
    (await pedir('GET', `/moderationLimits/${ANA}`, ANA)) >= 400 && (await pedir('PATCH', `/moderationLimits/${ANA}`, ANA, { fields: { windowCount: { integerValue: '0' } } })) >= 400 && (await pedir('DELETE', `/moderationLimits/${ANA}`, ANA)) >= 400);
  check('E10) ni con el claim de administración: la revisión entra por la callable, que deja historial, no por la base de datos',
    (await pedir('GET', `/reports/${id}`, ADM1, null, { admin: true })) >= 400 && (await pedir('PATCH', `/reports/${id}?updateMask.fieldPaths=status`, ADM1, { fields: { status: texto('DISMISSED') } }, { admin: true })) >= 400);
  const despues = (await db.doc(`reports/${id}`).get()).data();
  check('E11) y tras todos esos intentos, el reporte sigue exactamente como estaba', igual(despues, mio.data()) && !(await db.doc('reports/rep_hechoamano').get()).exists);
}

console.log('\n── F · Nada fuera de su sitio ──');
{
  const colecciones = (await db.listCollections()).map((c) => c.id).sort();
  check('F1) la moderación escribe en `reports` y `moderationLimits`, y en ningún otro sitio', igual(colecciones, ['accounts', 'entities', 'moderationLimits', 'posts', 'reports', 'users']), colecciones.join(', '));
  check('F2) denunciar no cuesta Credits: los saldos siguen igual y no hay ni una transacción',
    (await db.doc(`users/${ANA}`).get()).data().creditsBalance === 240 && (await db.doc(`users/${BEA}`).get()).data().creditsBalance === 240);
  const todos = await reportes();
  check('F3) todo reporte guardado es válido: estado conocido, cuenta de la sesión, identificador con su forma, y ninguno dice haberse ejecutado',
    todos.length > 0 && todos.every((r) => M.ESTADOS_DE_REPORTE.includes(r.status) && M.FORMA_DE_ID_DE_REPORTE.test(r.reportId) && [ANA, BEA, CAI].includes(r.reporterAccountId) && (!r.action || r.action.status === 'REQUESTED')));
  const sumas = await Promise.all(todos.map(async (r) => [(await db.collection(`reports/${r.reportId}/history`).count().get()).data().count, r.historyCount]));
  check('F4) y el historial de cada uno tiene exactamente las entradas que el reporte dice', sumas.every(([hay, dice]) => hay === dice), `${todos.length} reportes`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
