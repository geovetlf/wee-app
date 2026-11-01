/**
 * LA SEGURIDAD DE ADMINISTRACIÓN CONTRA AUTH Y FIRESTORE DE VERDAD (emulados): lo que `admin-seguridad.test.mjs` prueba con
 * dobles, aquí con los claims reales, el libro real de Credits y las consultas reales.
 *
 *   firebase emulators:exec --only auth,firestore --project demo-wee "node functions/test/admin-seguridad.emulator.mjs"
 *
 *   A · Los scripts de `ops/admin`, ejecutados de verdad: `intento` y `ok` en orden, con su actor.
 *   B · Un token ANTIGUO de owner deja de valer en cuanto cambia Auth: rol rebajado, cuenta deshabilitada, sesiones revocadas.
 *   C · Una operación de dinero real: se mueve el saldo y queda constancia, enlazada por `requestId`; un rol limitado no mueve nada.
 *   D · Las consultas con cursores, fechas y la cola contra Firestore real.
 *   E · Los clientes no pueden leer ni escribir `adminAudit`, con las reglas de verdad.
 *   F · La transición del legado, paso a paso: inventario, asignar, retirar sin ampliar, cerrar y recuperar.
 *   G · La conciliación: cada caso con el libro de verdad, sin mover nada.
 *
 * El emulador NO exige índices compuestos: que el nuevo está declarado lo fija `admin-seguridad.test.mjs`.
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(here, '../lib', p));
const mod = (p) => require(path.resolve(here, '../node_modules', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const intentar = (fn) => fn().then((v) => ({ ok: true, v }), (e) => ({ ok: false, code: e?.code, message: e?.message }));

const { initializeApp } = mod('firebase-admin/lib/app/index.js');
const { getAuth } = mod('firebase-admin/lib/auth/index.js');
const { getFirestore, Timestamp } = mod('firebase-admin/lib/firestore/index.js');
initializeApp({ projectId: PROY });
const auth = getAuth();
const db = getFirestore();

const credits = lib('credits/index.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { opsAdmin, accountsAdmin } = lib('admin/index.js');

const script = (nombre, ...args) => spawnSync(process.execPath, [path.join(RAIZ, 'ops/admin', nombre), '--proyecto', PROY, ...args], { env: process.env, encoding: 'utf8' });
const entradas = async (correlacionOUid) => {
  const snap = await db.collection('adminAudit').orderBy('en', 'asc').get();
  return snap.docs.map((d) => d.data()).filter((e) => e.recurso?.id === correlacionOUid || e.correlationId === correlacionOUid);
};
/* El token tal como lo entrega onCall: lo que decía cuando se emitió, aunque ya no sea verdad. */
const tokenAntiguo = (uid, claims, hace = 600) => ({ uid, token: { ...claims, auth_time: Math.floor(Date.now() / 1000) - hace } });
const yaEnElReloj = () => new Promise((r) => setTimeout(r, 1100));

console.log('\n── A · Los scripts de roles ──');
const UID = 'duena-prueba';
await auth.createUser({ uid: UID, email: 'duena@demo-wee.local' });
{
  const sinAdmin = script('asignar-owner.mjs', '--uid', UID);
  check('A1) sin el claim admin, asignar-owner no hace nada', sinAdmin.status === 1 && !(await auth.getUser(UID)).customClaims?.weeRole, sinAdmin.stderr.trim().slice(0, 120));
  check('A2) y no deja constancia de algo que no intentó', (await entradas(UID)).length === 0);
  await auth.setCustomUserClaims(UID, { admin: true, otro: 1 });
  const r = script('asignar-owner.mjs', '--uid', UID, '--actor', 'persona-duena', '--motivo', 'prueba de emulador');
  check('A3) con admin, lo asigna y conserva los demás claims', r.status === 0 && JSON.stringify((await auth.getUser(UID)).customClaims) === JSON.stringify({ admin: true, otro: 1, weeRole: 'owner' }), r.stderr.slice(0, 200));
  const log = await entradas(UID);
  check('A4) M2: `intento` y luego `ok`, misma correlación, con quien lo ejecutó', log.map((e) => e.resultado).join() === 'intento,ok' && log[0].correlationId === log[1].correlationId && log[0].actorUid === 'persona-duena' && log[0].accion === 'admin.asignarRol', JSON.stringify(log.map((e) => [e.resultado, e.actorUid])));
}

console.log('\n── B · Un token antiguo deja de valer ──');
{
  const VIEJO = tokenAntiguo(UID, { admin: true, weeRole: 'owner' });
  const quien = await intentar(() => opsAdmin.run({ auth: VIEJO, data: { action: 'quienSoy' } }));
  check('B1) CONTROL: con Auth al día, el token vale', quien.ok && quien.v.rol === 'owner', quien.code);

  await auth.setCustomUserClaims(UID, { admin: true, weeRole: 'support' });
  const rebajada = await intentar(() => opsAdmin.run({ auth: VIEJO, data: { action: 'trabajos' } }));
  const dar = await intentar(() => credits.grantCredits.run({ auth: VIEJO, data: { userId: 'nadie', amount: 1, requestId: 'r-rebajada' } }));
  check('B2) rol rebajado con el token de antes: la SIGUIENTE llamada ya no pasa', rebajada.code === 'permission-denied' && dar.code === 'permission-denied', `${rebajada.code}, ${dar.code}`);

  await auth.setCustomUserClaims(UID, { admin: true, weeRole: 'owner' });
  await auth.updateUser(UID, { disabled: true });
  const deshabilitada = await intentar(() => opsAdmin.run({ auth: VIEJO, data: { action: 'trabajos' } }));
  check('B3) cuenta deshabilitada: fuera', deshabilitada.code === 'permission-denied', deshabilitada.code);
  await auth.updateUser(UID, { disabled: false });

  await yaEnElReloj();
  await auth.revokeRefreshTokens(UID);
  const revocada = await intentar(() => opsAdmin.run({ auth: VIEJO, data: { action: 'trabajos' } }));
  check('B4) M3: sesiones revocadas: un token ya emitido se rechaza, no espera a caducar', revocada.code === 'unauthenticated', revocada.code);
  await yaEnElReloj();
  const nueva = await intentar(() => opsAdmin.run({ auth: tokenAntiguo(UID, { admin: true, weeRole: 'owner' }, -2), data: { action: 'trabajos' } }));
  check('B5) CONTROL: una sesión iniciada después sí vale', nueva.ok, nueva.code);

  const UID2 = 'soporte-prueba';
  await auth.createUser({ uid: UID2 });
  await auth.setCustomUserClaims(UID2, { admin: true, weeRole: 'support', otro: 1 });
  const r = script('retirar-rol.mjs', '--uid', UID2, '--actor', 'persona-duena', '--motivo', 'deja el equipo');
  const u2 = await auth.getUser(UID2);
  check('B6) retirar-rol quita rol y admin, conserva lo demás y revoca', r.status === 0 && JSON.stringify(u2.customClaims) === '{"otro":1}' && !!u2.tokensValidAfterTime, r.stderr.slice(0, 200));
  const log = await entradas(UID2);
  check('B7) con su constancia en dos tiempos', log.map((e) => e.resultado).join() === 'intento,ok' && log[0].actorUid === 'persona-duena' && log[0].metadatos.rolAnterior === 'support');
  const fuera = await intentar(() => accountsAdmin.run({ auth: tokenAntiguo(UID2, { admin: true, weeRole: 'support' }), data: { action: 'buscar', uid: UID } }));
  check('B8) y su token de ayer ya no entra', fuera.ok === false, fuera.code);
}

console.log('\n── C · Dinero real, con rastro ──');
{
  const OWNER = tokenAntiguo(UID, { admin: true, weeRole: 'owner' }, -3);
  const PERSONA = 'AbCdEfGhIjKlMnOpQrStUvWxYz02';
  await db.collection('users').doc(PERSONA).set({ uid: PERSONA, profileType: 'real' });
  await creditEngine.ensureAccount(PERSONA);
  const antes = (await creditEngine.readBalance(PERSONA)).balance;
  const dio = await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: PERSONA, amount: 7, reason: 'prueba', requestId: 'grant_prueba_0001' } }));
  const despues = (await creditEngine.readBalance(PERSONA)).balance;
  check('C1) grantCredits mueve el saldo una vez', dio.ok && despues === antes + 7, dio.ok ? `${antes}→${despues}` : `${dio.code} ${dio.message}`);
  const log = (await entradas(PERSONA)).filter((e) => e.accion === 'grantCredits');
  check('C2) intento y ok, con la llave para conciliar', log.map((e) => e.resultado).join() === 'intento,ok' && log[0].metadatos.requestId === 'grant_prueba_0001' && log[0].actorRol === 'owner', JSON.stringify(log.map((e) => e.resultado)));
  const otra = await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: PERSONA, amount: 7, requestId: 'grant_prueba_0001' } }));
  check('C3) la idempotencia del motor sigue intacta: el mismo requestId no paga dos veces', otra.ok && (await creditEngine.readBalance(PERSONA)).balance === despues, otra.code);
  await auth.setCustomUserClaims(UID, { admin: true, weeRole: 'finance' });
  const finanzas = await intentar(() => credits.grantCredits.run({ auth: tokenAntiguo(UID, { admin: true, weeRole: 'finance' }, -3), data: { userId: PERSONA, amount: 7, requestId: 'grant_prueba_0002' } }));
  check('C4) finanzas no da Credits: rechazado, y el saldo no se mueve', finanzas.code === 'permission-denied' && (await creditEngine.readBalance(PERSONA)).balance === despues);
  const leyo = await intentar(() => credits.creditsAdmin.run({ auth: tokenAntiguo(UID, { admin: true, weeRole: 'finance' }, -3), data: { action: 'balance', userId: PERSONA } }));
  check('C5) pero sí lo lee, y consta a quién miró', leyo.ok && leyo.v.balance === despues && (await entradas(PERSONA)).some((e) => e.accion === 'creditsAdmin.balance' && e.actorRol === 'finance' && e.resultado === 'ok'));
  await auth.setCustomUserClaims(UID, { admin: true, weeRole: 'owner' });
}

console.log('\n── D · Consultas reales ──');
{
  const OWNER = tokenAntiguo(UID, { admin: true, weeRole: 'owner' }, -3);
  const t = Date.now();
  const lote = db.batch();
  for (let i = 0; i < 3; i++) lote.set(db.collection('jobs').doc(`j.viejo${i}`), { jobId: `j.viejo${i}`, state: 'running', terminal: false, updatedAt: t - 7_200_000 - i * 1000, json: 'SECRETO' });
  lote.set(db.collection('jobs').doc('j.vivo'), { jobId: 'j.vivo', state: 'running', terminal: false, updatedAt: t });
  lote.set(db.collection('creatorJobs').doc('sinPlazo'), { userId: PERSONA_UID(), status: 'running', createdAt: Timestamp.fromMillis(t - 9e6), updatedAt: Timestamp.fromMillis(t - 9e6) });
  lote.set(db.collection('creatorJobs').doc('alDia'), { userId: PERSONA_UID(), status: 'running', createdAt: Timestamp.fromMillis(t), updatedAt: Timestamp.fromMillis(t) });
  lote.set(db.collection('jobQueue').doc('q1'), { jobId: 'q1', reason: 'created', enqueuedAt: t - 1000, visibleEn: t - 1000, disponibleEn: t - 1000, particion: 1, entregas: 0, revision: 1 });
  await lote.commit();
  const a1 = await opsAdmin.run({ auth: OWNER, data: { action: 'atascados', minutos: 30, limit: 2 } });
  check('D1) atascados: solo los que no se mueven, y dice que hay más', a1.items.map((x) => x.jobId).join() === 'j.viejo0,j.viejo1' && a1.truncado === true && !!a1.cursor, a1.items.map((x) => x.jobId).join());
  const a2 = await opsAdmin.run({ auth: OWNER, data: { action: 'atascados', minutos: 30, limit: 2, cursor: a1.cursor } });
  check('D2) el cursor sigue donde se quedó', a2.items.map((x) => x.jobId).join() === 'j.viejo2' && a2.truncado === false);
  check('D3) sin el `json` del trabajo', !/SECRETO/.test(JSON.stringify([a1, a2])));
  const ca = await opsAdmin.run({ auth: OWNER, data: { action: 'creacionesAtascadas', minutos: 30 } });
  check('D4) creaciones atascadas, también sin plazo', ca.items.map((x) => x.id).join() === 'sinPlazo', ca.items.map((x) => x.id).join());
  const c = await opsAdmin.run({ auth: OWNER, data: { action: 'cola' } });
  check('D5) la cola se lee', c.items.length === 1 && c.items[0].retrasado === true);
  const uidBuscado = PERSONA_UID();
  await opsAdmin.run({ auth: OWNER, data: { action: 'creaciones', uid: uidBuscado } });
  check('D6) M1: buscar creaciones de una cuenta deja esa cuenta en la auditoría', (await entradas(uidBuscado)).some((e) => e.accion === 'opsAdmin.creaciones' && e.resultado === 'ok'));
  const leida = await opsAdmin.run({ auth: OWNER, data: { action: 'auditoria', limit: 50 } });
  const resultados = new Set(leida.items.map((e) => e.resultado));
  check('D7) el registro se lee con todos sus resultados, sin secretos', resultados.has('intento') && resultados.has('ok') && resultados.has('denegado') && !/SECRETO|authorization|idToken/i.test(JSON.stringify(leida.items)), [...resultados].join());
}

console.log('\n── E · Los clientes, con las reglas de verdad ──');
{
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sesion = (uid, claims = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'password', identities: {} }, ...claims })}.`;
  };
  const leer = (tok) => fetch(`${base}/adminAudit?pageSize=1`, { headers: { Authorization: `Bearer ${tok}` } }).then((r) => r.status);
  const escribir = (tok) => fetch(`${base}/adminAudit?documentId=colado`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { resultado: { stringValue: 'ok' } } }) }).then((r) => r.status);
  check('E1) ni una sesión normal ni el owner leen adminAudit por el cliente', (await leer(sesion('ana'))) === 403 && (await leer(sesion(UID, { admin: true, weeRole: 'owner' }))) === 403);
  check('E2) ni escriben', (await escribir(sesion('ana'))) === 403 && (await escribir(sesion(UID, { admin: true, weeRole: 'owner' }))) === 403);
}

console.log('\n── F · Transición del legado ──');
{
  const crearCuenta = async (uid, claims) => { await auth.createUser({ uid }); if (claims) await auth.setCustomUserClaims(uid, claims); };
  const inventario = (lista = '') => JSON.parse(script('inventario.mjs', '--uids-lista', lista || 'ninguno').stdout);
  const vivo = (uid, claims) => tokenAntiguo(uid, claims, -3);
  const puede = async (ses, callable, data) => { const r = await intentar(() => callable.run({ auth: ses, data })); return r.ok || (r.code !== 'permission-denied' && r.code !== 'unauthenticated'); };

  /* Parte de cero: nadie es owner. */
  await auth.setCustomUserClaims(UID, {});
  await crearCuenta('legado-claim', { admin: true });
  await crearCuenta('legado-lista');
  await crearCuenta('soporte-solo', { admin: true, weeRole: 'support' });
  await crearCuenta('soporte-lista', { admin: true, weeRole: 'support' });
  process.env.WEE_ADMIN_UIDS = 'legado-lista,soporte-lista';
  const lista = process.env.WEE_ADMIN_UIDS;

  const i1 = inventario(lista);
  const sit = (inv, uid) => inv.cuentas.find((c) => c.uid === uid)?.situacion;
  check('F1) inventario: cada cuenta en su situación', sit(i1, 'legado-claim') === 'legado-por-claim' && sit(i1, 'legado-lista') === 'legado-solo-por-lista' && sit(i1, 'soporte-solo') === 'rol-limitado', JSON.stringify(i1.cuentas.map((c) => [c.uid, c.situacion])));
  check('F2) sin owner activo, no se puede cerrar', i1.cierre.sePuedeCerrar === false && i1.cierre.pierdenElAcceso.includes('legado-claim'));
  const antesDeAuth = (await auth.getUser('legado-claim')).customClaims;
  check('F3) el inventario no toca nada ni enseña correos', JSON.stringify(antesDeAuth) === '{"admin":true}' && !/@/.test(JSON.stringify(i1)) && !/email|phone|password/i.test(JSON.stringify(i1)));

  const sinFlag = script('asignar-owner.mjs', '--uid', 'legado-lista');
  check('F4) una cuenta solo de lista no se asciende sin decirlo', sinFlag.status === 1 && !(await auth.getUser('legado-lista')).customClaims?.weeRole);
  const conFlag = script('asignar-owner.mjs', '--uid', 'legado-lista', '--conceder-admin', '--actor', 'persona-duena', '--motivo', 'transicion');
  const u = await auth.getUser('legado-lista');
  check('F5) con --conceder-admin: claim y rol, y consta', conFlag.status === 0 && u.customClaims.admin === true && u.customClaims.weeRole === 'owner' && (await entradas('legado-lista')).some((e) => e.resultado === 'ok' && e.metadatos.concedeAdmin === true), conFlag.stderr.slice(0, 160));
  const i2 = inventario(lista);
  check('F6) ya hay owner: se puede cerrar, y dice quién pierde el acceso', i2.cierre.sePuedeCerrar === true && i2.cierre.owners.includes('legado-lista') && i2.cierre.pierdenElAcceso.includes('legado-claim'), JSON.stringify(i2.cierre));
  const duena = vivo('legado-lista', { admin: true, weeRole: 'owner' });
  check('F7) la cuenta asignada funciona', await puede(duena, credits.creditsAdmin, { action: 'stats' }) && await puede(duena, opsAdmin, { action: 'trabajos' }));

  /* Retirar no amplía. */
  const ses = (uid) => vivo(uid, { admin: true, weeRole: 'support' });
  const antes = [await puede(ses('soporte-solo'), credits.grantCredits, { userId: 'x', amount: 1, requestId: 'r-t-1' }), await puede(ses('soporte-solo'), accountsAdmin, { action: 'buscar', uid: UID })];
  check('F8) CONTROL: soporte busca y no da Credits', antes[0] === false && antes[1] === true);
  await yaEnElReloj();
  const r1 = script('retirar-rol.mjs', '--uid', 'soporte-solo', '--actor', 'persona-duena');
  check('F9) retirar-rol termina bien', r1.status === 0, r1.stderr.slice(0, 160));
  await yaEnElReloj();
  const despues = vivo('soporte-solo', {});
  check('F10) retirar el rol NO amplía: sin admin ni lista no puede nada, ni antiguo ni nuevo', !(await puede(despues, credits.grantCredits, { userId: 'x', amount: 1, requestId: 'r-t-2' })) && !(await puede(despues, accountsAdmin, { action: 'buscar', uid: UID })) && !(await puede(despues, credits.creditsAdmin, { action: 'stats' })));
  await yaEnElReloj();
  const r2 = script('retirar-rol.mjs', '--uid', 'soporte-lista', '--actor', 'persona-duena');
  await yaEnElReloj();
  const enLista = vivo('soporte-lista', {});
  check('F11) H2, el caso peligroso, a la vista: con su uid en la lista, retirar el rol lo deja como legado. Por eso el script exige --fuera-de-la-lista en real', r2.status === 0 && await puede(enLista, credits.creditsAdmin, { action: 'stats' }));
  await auth.setCustomUserClaims('soporte-solo', { admin: true, weeRole: 'support' });
  await yaEnElReloj();
  const r3 = script('retirar-rol.mjs', '--uid', 'soporte-solo', '--actor', 'persona-duena', '--mantener-admin');
  await yaEnElReloj();
  check('F12) --mantener-admin también lo deja como legado: es un acto expreso, y lo avisa', r3.status === 0 && /Sigue teniendo/.test(r3.stdout) && await puede(vivo('soporte-solo', { admin: true }), credits.creditsAdmin, { action: 'stats' }));

  /* Cerrar el puente. */
  const legadoClaim = vivo('legado-claim', { admin: true });
  check('F13) CONTROL: el legado puede antes de cerrar', await puede(legadoClaim, credits.creditsAdmin, { action: 'stats' }));
  process.env.WEE_ADMIN_SIN_ROL = 'cerrado';
  check('F14) puente cerrado: ni el legado por claim ni el de la lista', !(await puede(legadoClaim, credits.creditsAdmin, { action: 'stats' })) && !(await puede(enLista, credits.creditsAdmin, { action: 'stats' })));
  check('F15) el owner sigue dentro', await puede(duena, credits.creditsAdmin, { action: 'stats' }) && await puede(duena, opsAdmin, { action: 'auditoria' }));
  process.env.WEE_ADMIN_UIDS = '';
  check('F16) y también con la lista vacía: tiene el claim', await puede(duena, credits.creditsAdmin, { action: 'stats' }));

  /* Recuperar: sin ninguna callable, con el Admin SDK. */
  await auth.setCustomUserClaims('legado-lista', {});
  check('F17) si el owner pierde el claim, se queda fuera', !(await puede(duena, credits.creditsAdmin, { action: 'stats' })));
  const rec = script('asignar-owner.mjs', '--uid', 'legado-lista', '--conceder-admin', '--actor', 'persona-duena', '--motivo', 'recuperacion');
  check('F18) la recuperación no depende de ninguna callable: el script la hace con el puente cerrado', rec.status === 0 && await puede(duena, credits.creditsAdmin, { action: 'stats' }), rec.stderr.slice(0, 160));
  delete process.env.WEE_ADMIN_SIN_ROL;
  check('F19) y cerrar es reversible', await puede(legadoClaim, credits.creditsAdmin, { action: 'stats' }));
  delete process.env.WEE_ADMIN_UIDS;
}

console.log('\n── G · Conciliación ──');
{
  const PERSONA = 'AbCdEfGhIjKlMnOpQrStUvWxYz03';
  await db.collection('users').doc(PERSONA).set({ uid: PERSONA, profileType: 'real' });
  await creditEngine.ensureAccount(PERSONA);
  const viejo = Date.now() - 3_600_000;
  const anota = (correlationId, resultado, accion, requestId, en = viejo) => db.collection('adminAudit').doc().create({ v: 1, en, entorno: PROY, actorUid: 'duena', actorRol: 'owner', accion, recurso: { tipo: 'creditAccount', id: PERSONA }, resultado, correlationId, metadatos: requestId ? { requestId } : {} });
  /* Ocurrió, y el cierre no llegó: falló la auditoría o murió el proceso. */
  await creditEngine.grantCredits({ userId: PERSONA, amount: 3, reason: 'g', source: 'admin', requestId: 'g-ocurrio' });
  await anota('g1', 'intento', 'grantCredits', 'g-ocurrio');
  /* No ocurrió. */
  await anota('g2', 'intento', 'grantCredits', 'g-no-consta');
  /* Sin libro donde mirar. */
  await anota('g3', 'intento', 'engineAdmin.setSettings');
  /* Se dijo error y el dinero se movió. */
  await creditEngine.grantCredits({ userId: PERSONA, amount: 2, reason: 'g', source: 'admin', requestId: 'g-error' });
  await anota('g4', 'intento', 'grantCredits', 'g-error');
  await anota('g4', 'error', 'grantCredits', 'g-error');
  /* Cerrado bien: no es un hallazgo. */
  await creditEngine.grantCredits({ userId: PERSONA, amount: 1, reason: 'g', source: 'admin', requestId: 'g-bien' });
  await anota('g5', 'intento', 'grantCredits', 'g-bien');
  await anota('g5', 'ok', 'grantCredits', 'g-bien');
  /* Aún puede estar en marcha. */
  await anota('g6', 'intento', 'grantCredits', 'g-reciente', Date.now());
  /* Por fuera de la puerta. */
  await creditEngine.grantCredits({ userId: PERSONA, amount: 4, reason: 'g', source: 'admin', requestId: 'g-fuera' });

  const fotografia = async () => JSON.stringify({ audit: (await db.collection('adminAudit').get()).size, libro: (await db.collection('creditTransactions').get()).size, saldo: (await creditEngine.readBalance(PERSONA)).balance });
  const antes = await fotografia();
  const r = script('intentos-sin-cierre.mjs', '--horas', '6', '--minutos', '30');
  const informe = JSON.parse(r.stdout);
  const de = (id) => informe.hallazgos.find((h) => h.correlationId === id)?.clase;
  check('G1) ocurrió sin cierre', de('g1') === 'ocurrio-sin-cierre', JSON.stringify(informe.hallazgos.map((h) => [h.correlationId ?? h.transaccion, h.clase])));
  check('G2) no consta', de('g2') === 'no-consta');
  check('G3) sin libro: a mano', de('g3') === 'revisar-a-mano');
  check('G4) error con movimiento', de('g4') === 'error-con-movimiento');
  check('G5) lo bien cerrado no aparece, ni lo que aún puede estar en marcha', !de('g5') && !de('g6'));
  check('G6) un movimiento de administración sin constancia se ve', informe.hallazgos.some((h) => h.clase === 'movimiento-sin-constancia' && h.transaccion === 'grant_g-fuera'));
  check('G7) la herramienta no ha movido nada', (await fotografia()) === antes, antes);
  const OWNER = tokenAntiguo(UID, { admin: true, weeRole: 'owner' }, -3);
  await auth.setCustomUserClaims(UID, { admin: true, weeRole: 'owner' });
  const saldo = (await creditEngine.readBalance(PERSONA)).balance;
  const repetida = await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: PERSONA, amount: 3, requestId: 'g-ocurrio' } }));
  check('G8) repetir lo que ya ocurrió, con el MISMO requestId, no paga dos veces', repetida.ok && repetida.v.duplicate === true && (await creditEngine.readBalance(PERSONA)).balance === saldo);
  const pendiente = await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: PERSONA, amount: 5, requestId: 'g-no-consta' } }));
  const pendiente2 = await intentar(() => credits.grantCredits.run({ auth: OWNER, data: { userId: PERSONA, amount: 5, requestId: 'g-no-consta' } }));
  check('G9) hacer lo que no constaba paga una vez, aunque se reintente', pendiente.ok && pendiente.v.duplicate === false && pendiente2.v.duplicate === true && (await creditEngine.readBalance(PERSONA)).balance === saldo + 5);
}

function PERSONA_UID() { return 'AbCdEfGhIjKlMnOpQrStUvWxYz01'; }

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
/* Sin process.exit: en Windows, cortar con conexiones de fetch abiertas aborta el proceso (libuv) con todo en verde. */
process.exitCode = failures ? 1 : 0;
await db.terminate();
