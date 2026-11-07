/*
 * MODERATION CORE, CONTRA FIRESTORE Y AUTH DE VERDAD (emuladores, proyecto demo-*, datos ficticios).
 *
 * Lo que un almacén de mentira no puede decir:
 *
 *   A · Muchas señales a la vez sobre el mismo contenido: UN caso, contadores exactos, ninguna señal perdida.
 *   B · Acciones a la vez: dos personas no cogen lo mismo, dos ocultaciones no se pisan, y la misma petición
 *       repetida a la vez deja UNA acción.
 *   C · La custodia con tipos de verdad: marcas de tiempo, puntos geográficos, mapas y subcolecciones vuelven
 *       idénticos al restaurar, y nada se destruye.
 *   D · La puerta de administración con Auth de verdad: cuenta deshabilitada, sesiones revocadas o claim retirado
 *       no entran aunque el token diga otra cosa.
 *   E · Apelación y barrido de punta a punta, con consultas de rango y agregados de verdad.
 *   F · Las reglas del árbol: ningún cliente lee ni escribe NADA del Moderation Core, ni con claim de administración.
 *   G · Nada fuera de su sitio: ni avisos de verdad, ni Credits, ni colecciones que no sean suyas.
 *
 * No está en `npm test` a propósito: necesita los emuladores y Java 21 (nivel 2 de la CI, `_emuladores.mjs`).
 *
 *   firebase emulators:exec --only firestore,auth --project demo-wee-moderacion \
 *     "node functions/test/moderation-core.emulator.mjs firestore.rules"
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
const { Timestamp, GeoPoint } = require('firebase-admin/firestore');
const comp = require(path.resolve(here, '../lib/moderation/index.js'));
const N = require(path.resolve(here, '../lib/moderation/nucleo.js'));
const K = require(path.resolve(here, '../lib/moderation/consola.js'));
const M = require(path.resolve(here, '../lib/core/moderation.js'));
const C = require(path.resolve(here, '../lib/core/moderation-case.js'));
const A = require(path.resolve(here, '../lib/core/moderation-action.js'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rechazo = async (p) => { try { await p; return null; } catch (e) { return e; } };

const T0 = 1_762_000_000_000;
let reloj = T0;
const BEA = 'emuBeaBBBB0002', ANA = 'emuAnaAAAA0001', ADM = 'emuAdminZZ0001', ADM2 = 'emuAdminZZ0002';
const ENT = (n) => `ent_${String(n).padStart(26, '0')}`;
const cuentaDe = (uid, real) => ({ contract: '2.0', accountId: uid, accountNumber: '123456789', status: 'ACTIVE', foundingPrincipalId: uid, realProfileEntityId: real, nextPageSequence: 3, createdAt: T0, updatedAt: T0 });
const entidad = (entityId, owner, tipo, seq, perfilUid) => ({ contract: '2.0', entityId, ownerAccountId: owner, entityType: tipo, entitySequence: seq, profileRef: { coleccion: 'users', uid: perfilUid }, status: 'ACTIVE', createdAt: T0, updatedAt: T0 });
const DENUNCIANTES = Array.from({ length: 25 }, (_, i) => `emuDen${String(i).padStart(4, '0')}x`);

await Promise.all([
  db.doc(`accounts/${BEA}`).set(cuentaDe(BEA, ENT(21))), db.doc(`entities/${ENT(21)}`).set(entidad(ENT(21), BEA, 'REAL_PROFILE', 1, BEA)),
  db.doc(`accounts/${ANA}`).set(cuentaDe(ANA, ENT(11))), db.doc(`entities/${ENT(11)}`).set(entidad(ENT(11), ANA, 'REAL_PROFILE', 1, ANA)),
  db.doc(`entities/${ENT(12)}`).set(entidad(ENT(12), ANA, 'WEE_PROFILE', 2, `perfilWeeDe${ANA}`)),
  ...DENUNCIANTES.flatMap((uid, i) => [db.doc(`accounts/${uid}`).set(cuentaDe(uid, ENT(100 + i))), db.doc(`entities/${ENT(100 + i)}`).set(entidad(ENT(100 + i), uid, 'REAL_PROFILE', 1, uid))]),
  ...Array.from({ length: 8 }, (_, i) => db.doc(`posts/emuPost${i}`).set({ userId: BEA, content: `publicación ${i}`, imageUrls: [], createdAt: T0 })),
  db.doc(`users/${BEA}`).set({ uid: BEA, creditsBalance: 240 }), db.doc(`users/${ANA}`).set({ uid: ANA, creditsBalance: 240 }),
]);

const holgada = { ...M.POLITICA_DE_REPORTES, maximoPorVentana: 10_000, maximoPorDia: 10_000 };
const denunciador = () => comp.crearModeracion({ db, now: () => reloj, resolutores: comp.RESOLUTORES_DEL_NUCLEO, politica: holgada });
const nucleo = (extra = {}) => N.crearNucleoDeModeracion({ db, now: () => reloj, sesionVigente: async (a) => a, ...extra });
const sesion = (uid, claims = { admin: true }, authTime = Math.floor(Date.now() / 1000) - 60) => ({ uid, token: { ...claims, firebase: { sign_in_provider: 'password' }, auth_time: authTime } });
const idCaso = (tipo, id) => C.idDeCaso(comp.huellaDelSistema, C.claveDeObjetivo(tipo, id));
const idRep = (cuenta, tipo, objetivo, motivo) => M.idDeReporte(comp.huellaDelSistema, { reporterAccountId: cuenta, targetType: tipo, targetId: objetivo, reason: motivo });
let n = 0;
const pet = (extra = {}) => ({ requestId: `emu-req-${String(++n).padStart(6, '0')}`, justification: 'Revisión en el emulador', ...extra });
const contar = async (ruta) => (await db.collection(ruta).count().get()).data().count;

// ══════════════════════════════════════════════════════════════════════════
console.log('── A · Muchas señales a la vez: un caso ──');
{
  const objetivo = 'emuPost0';
  await Promise.all(DENUNCIANTES.map((uid) => denunciador().reportar(uid, { targetType: 'POST', targetId: objetivo, reason: 'HATE' })));
  const ids = DENUNCIANTES.map((uid) => idRep(uid, 'POST', objetivo, 'HATE'));
  const t0 = Date.now();
  const r = await Promise.allSettled(ids.map((id) => nucleo().adjuntarReporte(id)));
  const contencion = r.filter((x) => x.status === 'rejected').length;
  /* Lo que la contención dejó sin caso lo recoge el barrido, como en producción. */
  const barrido = await nucleo().barrer(reloj);
  const cid = idCaso('POST', objetivo);
  const caso = (await db.doc(`moderationCases/${cid}`).get()).data();
  check('A1) veinticinco denuncias a la vez del mismo contenido: UN caso, veinticinco señales y veinticinco denunciantes, exactos',
    (await contar('moderationCases')) === 1 && caso.counters.reports === 25 && caso.counters.reporters === 25 && (await contar(`moderationCases/${cid}/signals`)) === 25 && (await contar(`moderationCases/${cid}/reporters`)) === 25,
    `${Date.now() - t0} ms · por contención=${contencion} · recogidos por el barrido=${barrido.adjuntados}`);
  const reportes = await Promise.all(ids.map((id) => db.doc(`reports/${id}`).get()));
  check('A2) y cada reporte sabe su caso, con su entrada de historial y una sola', reportes.every((d) => d.data().caseId === cid && d.data().historyCount === 2));
  const h = (await db.collection(`moderationCases/${cid}/history`).orderBy('seq').get()).docs.map((d) => d.data().seq);
  check('A3) el historial del caso no tiene huecos ni repetidos', igual(h, Array.from({ length: caso.historyCount }, (_, i) => i + 1)));
  /* Una persona con dos caras y diez motivos, todo a la vez. */
  const motivos = M.MOTIVOS_DE_REPORTE;
  await Promise.all(motivos.map((m, i) => denunciador().reportar(ANA, { targetType: 'POST', targetId: 'emuPost1', reason: m, ...(i % 2 ? { actingEntityId: ENT(12) } : {}) })));
  await Promise.allSettled(motivos.map((m) => nucleo().adjuntarReporte(idRep(ANA, 'POST', 'emuPost1', m))));
  await nucleo().barrer(reloj);
  const c1 = (await db.doc(`moderationCases/${idCaso('POST', 'emuPost1')}`).get()).data();
  check('A4) una persona con sus dos caras y diez motivos a la vez: diez señales, UN denunciante', c1.counters.reports === 10 && c1.counters.reporters === 1);
  check('A5) y nada de eso tocó la publicación', igual((await db.doc('posts/emuPost0').get()).data(), { userId: BEA, content: 'publicación 0', imageUrls: [], createdAt: T0 }));
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── B · Acciones a la vez ──');
{
  const cid = idCaso('POST', 'emuPost0');
  const dos = await Promise.allSettled([nucleo().ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid })), nucleo().ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: cid }))]);
  const caso = (await db.doc(`moderationCases/${cid}`).get()).data();
  check('B1) dos personas cogen el mismo caso a la vez: UNA lo tiene, la otra recibe que ya no toca',
    dos.filter((x) => x.status === 'fulfilled').length === 1 && caso.status === 'UNDER_REVIEW' && [ADM, ADM2].includes(caso.assignee.uid)
    && dos.filter((x) => x.status === 'rejected').every((x) => ['invalid_transition', 'ABORTED'].includes(x.reason?.code) || /contention|ABORTED/i.test(String(x.reason?.message))));
  const quien = caso.assignee.uid;
  const misma = pet({ caseId: cid });
  const diez = await Promise.allSettled(Array.from({ length: 10 }, () => nucleo().ejecutar('HIDE_CONTENT', sesion(quien), misma)));
  const bien = diez.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const ocultaciones = (await db.collection('moderationActions').where('operation', '==', 'HIDE_CONTENT').get()).size;
  check('B2) la MISMA petición diez veces a la vez: UNA acción, y las demás se saben repetidas', ocultaciones === 1 && bien.filter((x) => !x.duplicate).length === 1 && bien.every((x) => x.actionId === bien[0].actionId),
    `bien=${bien.length} · por contención=${diez.length - bien.length}`);
  const otra = await rechazo(nucleo().ejecutar('HIDE_CONTENT', sesion(quien), pet({ caseId: cid })));
  check('B3) y otra ocultación distinta del mismo contenido se rechaza con su motivo', otra?.code === 'content_already_hidden');
  const auditOk = (await db.collection('moderationAudit').where('actionId', '==', bien[0].actionId).where('result', '==', 'OK').get()).size;
  check('B4) la acción tiene UNA entrada de auditoría de éxito', auditOk === 1);
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── C · La custodia, con tipos de verdad ──');
{
  const datos = {
    userId: BEA, content: 'con tipos de verdad', createdAt: Timestamp.fromMillis(T0), editedAt: Timestamp.fromMillis(T0 + 1234),
    location: new GeoPoint(40.4168, -3.7038), meta: { tags: ['a', 'b'], nested: { n: 1, at: Timestamp.fromMillis(T0 + 9) } }, likes: 7,
  };
  await db.doc('posts/emuTipos').set(datos);
  await db.doc('posts/emuTipos/pollVotes/votante1').set({ option: 2 });
  await denunciador().reportar(ANA, { targetType: 'POST', targetId: 'emuTipos', reason: 'SPAM' });
  await nucleo().adjuntarReporte(idRep(ANA, 'POST', 'emuTipos', 'SPAM'));
  const cid = idCaso('POST', 'emuTipos');
  await nucleo().ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: cid }));
  await nucleo().ejecutar('HIDE_CONTENT', sesion(ADM2), pet({ caseId: cid }));
  const vault = (await db.doc(`moderationVault/${A.idDeCustodia(comp.huellaDelSistema, 'POST:emuTipos')}`).get()).data();
  check('C1) ocultada: fuera de `posts`, y la custodia guarda las marcas de tiempo y el punto como tales',
    !(await db.doc('posts/emuTipos').get()).exists && vault.data.createdAt instanceof Timestamp && vault.data.location instanceof GeoPoint && vault.data.meta.nested.at instanceof Timestamp);
  check('C2) su subcolección sigue ahí: ocultar no borra nada', (await db.doc('posts/emuTipos/pollVotes/votante1').get()).data().option === 2);
  await nucleo().ejecutar('RESTORE_CONTENT', sesion(ADM2), pet({ caseId: cid }));
  const vuelta = (await db.doc('posts/emuTipos').get()).data();
  check('C3) restaurada: IDÉNTICA, tipo por tipo',
    vuelta.createdAt.isEqual(datos.createdAt) && vuelta.editedAt.isEqual(datos.editedAt) && vuelta.location.isEqual(datos.location) && vuelta.meta.nested.at.isEqual(datos.meta.nested.at)
    && igual(vuelta.meta.tags, ['a', 'b']) && vuelta.likes === 7 && vuelta.content === datos.content && Object.keys(vuelta).sort().join() === Object.keys(datos).sort().join());
  const v2 = (await db.doc(`moderationVault/${A.idDeCustodia(comp.huellaDelSistema, 'POST:emuTipos')}`).get()).data();
  check('C4) y la custodia suelta la copia y guarda el rastro', v2.state === 'RESTORED' && !('data' in v2));
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── D · La puerta con Auth de verdad ──');
{
  const auth = admin.auth();
  await auth.createUser({ uid: ADM, email: 'adm1@ejemplo.invalido' });
  await auth.setCustomUserClaims(ADM, { admin: true });
  const real = () => N.crearNucleoDeModeracion({ db, now: () => reloj });
  await denunciador().reportar(ANA, { targetType: 'POST', targetId: 'emuPost3', reason: 'SPAM' });
  await nucleo().adjuntarReporte(idRep(ANA, 'POST', 'emuPost3', 'SPAM'));
  const cid = idCaso('POST', 'emuPost3');
  const ok = await real().ejecutar('TAKE_CASE', sesion(ADM), pet({ caseId: cid }));
  check('D1) con la cuenta habilitada y el claim de AHORA, entra', ok.caseStatus === 'UNDER_REVIEW');
  await auth.updateUser(ADM, { disabled: true });
  check('D2) deshabilitada en Auth: no entra, aunque su token diga que es administración', (await rechazo(real().ejecutar('RELEASE_CASE', sesion(ADM), pet({ caseId: cid }))))?.code === 'admin_required');
  await auth.updateUser(ADM, { disabled: false });
  await auth.setCustomUserClaims(ADM, null);
  check('D3) el claim retirado surte efecto en la siguiente llamada, con el token viejo', (await rechazo(real().ejecutar('RELEASE_CASE', sesion(ADM), pet({ caseId: cid }))))?.code === 'admin_required');
  await auth.setCustomUserClaims(ADM, { admin: true });
  await auth.revokeRefreshTokens(ADM);
  check('D4) sesiones revocadas: un token emitido antes no vale', (await rechazo(real().ejecutar('RELEASE_CASE', sesion(ADM, { admin: true }, Math.floor(T0 / 1000)), pet({ caseId: cid }))))?.code === 'session_revoked');
  check('D5) una cuenta que no existe en Auth no es nadie', (await rechazo(real().ejecutar('RELEASE_CASE', sesion('emuNadie000001'), pet({ caseId: cid }))))?.code === 'admin_required');
  const denegadas = (await db.collection('moderationAudit').where('result', '==', 'DENIED').get()).docs.map((d) => d.data());
  check('D6) cada denegación a quien SÍ era administración queda en la auditoría', denegadas.length >= 3 && denegadas.every((d) => d.actor.id && d.operation === 'RELEASE_CASE'));
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── E · Apelación y barrido, de punta a punta ──');
{
  await denunciador().reportar(ANA, { targetType: 'POST', targetId: 'emuPost4', reason: 'HARASSMENT' });
  await nucleo().adjuntarReporte(idRep(ANA, 'POST', 'emuPost4', 'HARASSMENT'));
  const cid = idCaso('POST', 'emuPost4');
  await nucleo().ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: cid }));
  reloj = T0 + 1000;
  const su = await nucleo().ejecutar('SUSPEND_ACCOUNT', sesion(ADM2), pet({ caseId: cid, durationHours: 1 }));
  const usuario = { uid: BEA, token: { firebase: { sign_in_provider: 'password' } } };
  const ap = await nucleo().apelar(usuario, { actionId: su.actionId, reason: 'Fue un malentendido' });
  await nucleo().ejecutar('TAKE_APPEAL', sesion(ADM), pet({ appealId: ap.appealId }));
  const dec = await nucleo().ejecutar('DECIDE_APPEAL', sesion(ADM), pet({ appealId: ap.appealId, outcome: 'UPHELD' }));
  const s = (await db.doc(`moderationSanctions/${su.sanctionId}`).get()).data();
  check('E1) apelación aceptada: la suspensión se levanta en la misma transacción y el caso queda RESTORED',
    dec.appealStatus === 'UPHELD' && s.status === 'LIFTED' && s.liftActionId === dec.actionId && (await db.doc(`moderationCases/${cid}`).get()).data().status === 'RESTORED');
  const h = (await db.collection(`moderationAppeals/${ap.appealId}/history`).orderBy('seq').get()).docs.map((d) => d.data().type);
  check('E2) la apelación conserva sus tres pasos, en orden', igual(h, ['APPEAL_SUBMITTED', 'APPEAL_TAKEN', 'APPEAL_UPHELD']));
  await denunciador().reportar(ANA, { targetType: 'POST', targetId: 'emuPost5', reason: 'SPAM' });
  await nucleo().adjuntarReporte(idRep(ANA, 'POST', 'emuPost5', 'SPAM'));
  const su2 = await rechazo(nucleo().ejecutar('SUSPEND_ACCOUNT', sesion(ADM2), pet({ caseId: idCaso('POST', 'emuPost5'), durationHours: 1 })));
  check('E3) sobre un caso que nadie cogió no se sanciona', su2?.code === 'invalid_transition' && (await contar('moderationSanctions')) === 1);
  await nucleo().ejecutar('TAKE_CASE', sesion(ADM2), pet({ caseId: idCaso('POST', 'emuPost1') }));
  const su3 = await nucleo().ejecutar('SUSPEND_ACCOUNT', sesion(ADM2), pet({ caseId: idCaso('POST', 'emuPost1'), durationHours: 1 }));
  const informe = await nucleo().barrer(T0 + 1000 + 3_600_001);
  check('E4) el barrido cierra lo vencido con una consulta de rango de verdad', informe.vencidas >= 1 && (await db.doc(`moderationSanctions/${su3.sanctionId}`).get()).data().status === 'EXPIRED');
  const st = await K.crearConsolaDeModeracion(nucleo(), { db }).leer(sesion(ADM2), { view: 'stats' });
  check('E5) las estadísticas de la Consola salen de agregados de verdad', typeof st.cases.UNDER_REVIEW === 'number' && st.cases.RESTORED >= 1 && st.reports.last24h >= 0);
  reloj = T0;
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── F · Lo que un cliente puede hacer con el Moderation Core: nada ──');
{
  const reglas = fs.readFileSync(path.resolve(RAIZ, process.argv[2] || 'firestore.rules'), 'utf8');
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const estado = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
  });
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = (u, extra = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: u, sub: u, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'password' }, ...extra })}.`;
  };
  const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
  const pedir = async (metodo, ruta, u, cuerpo, extra) => (await fetch(base + ruta, {
    method: metodo, headers: { 'Content-Type': 'application/json', ...(u ? { Authorization: `Bearer ${jwt(u, extra)}` } : {}) }, ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  })).status;
  check('F0) las reglas del árbol compilan en el emulador', estado.status === 200, `HTTP ${estado.status}`);
  const cid = idCaso('POST', 'emuPost0');
  const unDoc = async (col) => (await db.collection(col).limit(1).get()).docs[0]?.id ?? 'x';
  const rutas = [
    `/moderationCases/${cid}`, `/moderationCases/${cid}/signals/${await unDoc(`moderationCases/${cid}/signals`)}`, `/moderationCases/${cid}/reporters/${DENUNCIANTES[0]}`,
    `/moderationCases/${cid}/history/0001`, `/moderationActions/${await unDoc('moderationActions')}`, `/moderationAudit/${await unDoc('moderationAudit')}`,
    `/moderationVault/${await unDoc('moderationVault')}`, `/moderationSanctions/${await unDoc('moderationSanctions')}`, `/moderationStanding/${BEA}`,
    `/moderationAppeals/${await unDoc('moderationAppeals')}`, `/moderationNotices/${await unDoc('moderationNotices')}`, '/moderationPolicies/preventiveHiding',
  ];
  const quienes = [[DENUNCIANTES[0], {}], [BEA, {}], [ANA, {}], [ADM, { admin: true }], [null, {}]];
  const abiertas = [];
  for (const ruta of rutas) {
    for (const [u, extra] of quienes) {
      const lectura = await pedir('GET', ruta, u, null, extra);
      const escritura = await pedir('PATCH', ruta, u, { fields: { status: { stringValue: 'HACKED' } } }, extra);
      const borrado = await pedir('DELETE', ruta, u, null, extra);
      if (lectura < 400 || escritura < 400 || borrado < 400) abiertas.push(`${ruta} (${u ?? 'sin sesión'}: ${lectura}/${escritura}/${borrado})`);
    }
  }
  check('F1) ni quien denunció, ni el denunciado, ni nadie, ni sin sesión, ni con el claim de administración: ni leer, ni escribir, ni borrar', abiertas.length === 0, abiertas.slice(0, 4).join(' · '));
  const listas = [];
  for (const col of ['/moderationCases', '/moderationActions', '/moderationAudit', '/moderationVault', '/moderationSanctions', '/moderationStanding', '/moderationAppeals', '/moderationNotices', '/moderationPolicies']) {
    if ((await pedir('GET', col, ADM, null, { admin: true })) < 400 || (await pedir('GET', col, BEA)) < 400) listas.push(col);
  }
  check('F2) nadie lista ninguna colección del Moderation Core', listas.length === 0, listas.join(', '));
  check('F3) nadie se fabrica una política ni una sanción desde el cliente',
    (await pedir('PATCH', '/moderationPolicies/preventiveHiding', ADM, { fields: { habilitada: { booleanValue: true } } }, { admin: true })) >= 400
    && (await pedir('POST', '/moderationSanctions', BEA, { fields: { status: { stringValue: 'LIFTED' } } })) >= 400
    && !(await db.doc('moderationPolicies/preventiveHiding').get()).exists);
  const caso = (await db.doc(`moderationCases/${cid}`).get()).data();
  check('F4) y tras todos esos intentos, el caso sigue exactamente como estaba', caso.status !== 'HACKED' && caso.counters.reports === 25);
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── G · Nada fuera de su sitio ──');
{
  const colecciones = (await db.listCollections()).map((c) => c.id).sort();
  const PERMITIDAS = ['accounts', 'entities', 'posts', 'reports', 'users', 'moderationLimits', ...N.COLECCIONES_DEL_NUCLEO.filter((c) => c !== 'moderationPolicies')];
  check('G1) el Moderation Core escribe en sus colecciones y en ninguna otra: ni `notifications`, ni Credits, ni billeteras',
    colecciones.every((c) => PERMITIDAS.includes(c)) && !colecciones.includes('notifications') && !colecciones.includes('creditTransactions'), colecciones.join(', '));
  check('G2) los saldos siguen igual: moderar no cuesta Credits', (await db.doc(`users/${BEA}`).get()).data().creditsBalance === 240 && (await db.doc(`users/${ANA}`).get()).data().creditsBalance === 240);
  const avisos = (await db.collection('moderationNotices').get()).docs.map((d) => d.data());
  check('G3) los avisos están escritos y SIN ENVIAR', avisos.length > 0 && avisos.every((a) => a.delivery === 'PENDING_INTEGRATION' && typeof a.kind === 'string'));
  const acciones = (await db.collection('moderationActions').get()).docs.map((d) => d.data());
  check('G4) toda acción guardada es válida: identificador, operación conocida, justificación y actor', acciones.length > 0 && acciones.every((a) => A.FORMA_DE_ID_DE_ACCION.test(a.actionId) && a.justification && a.actor?.id));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
