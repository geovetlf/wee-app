/*
 * COMUNIDADES POR IDENTIDAD — contra el emulador de verdad (docs/COMUNIDADES-IDENTIDAD.md).
 *
 * Lo que se demuestra, intentando cada cosa y mirando qué queda escrito:
 *
 *   A · Crear: 1 miembro (no 3), la identidad que crea es la dueña, lo público sin cuentas ni uids, idempotente.
 *   B · Unirse y salir: cada cara es una membresía independiente; el contador cuenta perfiles; el dueño transfiere antes.
 *   C · Permisos: Real no hereda los de Weë ni al revés; papeles owner/admin/moderator/member; transferencia.
 *   D · Heredadas: `createdBy` intacto, nunca se inventa la identidad dueña; reclamarla es un acto explícito.
 *   E · Reglas: ningún cliente escribe contadores, miembros, papeles, dueño ni la lista del perfil; nadie lee lo privado.
 *   F · Autoría existente (publicaciones, comentarios, avisos): la cara tiene que ser de la sesión y no se reescribe.
 *   G · Aislamiento: una cara no lee, ni cambia, ni administra lo privado o los permisos de la otra.
 *
 * Usa un proyecto demo PROPIO (`demo-wee-comunidades`) en el MISMO emulador que la demo en vivo: las reglas se cargan
 * solo para ese proyecto y sus datos se borran al empezar; la demo (`demo-wee-migracion`) no se toca. Desde functions/:
 *
 *   GCLOUD_PROJECT=demo-wee-comunidades FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     node test/comunidades-identidad.emulator.mjs [ruta/a/firestore.rules]
 *
 * O con un emulador propio y efímero (lo que usa el corredor de suites de emulador, `test/_emuladores.mjs`), desde la raíz:
 *
 *   firebase emulators:exec --only firestore --project demo-wee-comunidades "node functions/test/comunidades-identidad.emulator.mjs"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const PROY = proyectoDeEmulador();
if (PROY === 'demo-wee-migracion') { console.error('✘ este es el proyecto de la demo en vivo: usa otro (demo-wee-comunidades)'); process.exit(2); }
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const mod = require(path.join(RAIZ, 'functions/lib/social/comunidades.js'));

/* ── Reglas solo para este proyecto, y datos limpios ─────────────────────── */
const reglas = fs.readFileSync(process.argv[2] || path.join(RAIZ, 'firestore.rules'), 'utf8');
const carga = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
});
if (carga.status !== 200) { console.error('✘ las reglas no compilaron', carga.status, await carga.text()); process.exit(1); }
/* Una transacción abortada de una pasada anterior puede dejar un bloqueo unos segundos (409): se reintenta. */
for (let i = 0; i < 30; i++) {
  const r = await fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
  if (r.status === 200) break;
  await new Promise((ok) => setTimeout(ok, 2000));
}
const quedan = await (await fetch(`${base}/communities?pageSize=1`, { headers: { Authorization: 'Bearer owner' } })).json();
if (quedan.documents?.length) { console.error('✘ no se pudieron borrar los datos del proyecto de pruebas'); process.exit(1); }

const app = initializeApp({ projectId: PROY }, `comunidades-${Date.now()}`);
const db = getFirestore(app);
const motor = mod.createComunidadesEngine({
  db: () => db, ahora: () => Date.now(), sello: (ms) => Timestamp.fromMillis(ms),
  unirALista: (v) => FieldValue.arrayUnion(v), quitarDeLista: (v) => FieldValue.arrayRemove(v),
});

/* ── Sesiones de cliente sin firmar (el emulador no verifica firmas) ─────── */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'custom' } }) + '.';
};
const v = (x) => {
  if (x === null || x === undefined) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
};
const docRest = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });
const pedir = async (metodo, ruta, uid, body) => (await fetch(base + ruta, {
  method: metodo, headers: { ...(uid ? { Authorization: `Bearer ${sesion(uid)}` } : {}), 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
})).status;
const crearCli = (ruta, uid, datos) => pedir('PATCH', `${ruta}?currentDocument.exists=false`, uid, docRest(datos));
const escribirCli = (ruta, uid, datos) => pedir('PATCH', `${ruta}?${Object.keys(datos).map((k) => `updateMask.fieldPaths=${k}`).join('&')}&currentDocument.exists=true`, uid, docRest(datos));
const leerCli = (ruta, uid) => pedir('GET', ruta, uid);
const borrarCli = (ruta, uid) => pedir('DELETE', ruta, uid);

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => { console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`); if (!cond) failures++; };
const permite = (s) => s < 400;
const deniega = (s) => s >= 400;
const motivoDe = async (p) => { try { await p; return 'ok'; } catch (e) { return e?.motivo || `!${e?.message}`; } };
const leerDoc = async (ruta) => { const s = await db.doc(ruta).get(); return s.exists ? s.data() : null; };

/* ── Personas: dos cuentas con sus dos caras, y una sin entidad ──────────── */
const A = 'anaAAAAAAAAAAAAAAAAAAAAAAAA1';
const B = 'betoBBBBBBBBBBBBBBBBBBBBBBB2';
const C = 'carlaCCCCCCCCCCCCCCCCCCCCCC3';
const WA = `hidi_${A}`;
const WB = `hidi_${B}`;
const ENT = { A: 'ent_0000000000000000000000000a', WA: 'ent_000000000000000000000000wa', B: 'ent_0000000000000000000000000b', WB: 'ent_000000000000000000000000wb' };
const perfiles = [
  [A, { uid: A, profileType: 'real', displayName: 'Ana', entityId: ENT.A, joinedCommunities: [] }],
  [WA, { uid: WA, profileType: 'hidi', linkedAccountId: A, displayName: 'Nébula', entityId: ENT.WA, joinedCommunities: [] }],
  [B, { uid: B, profileType: 'real', displayName: 'Beto', entityId: ENT.B, joinedCommunities: [] }],
  [WB, { uid: WB, profileType: 'hidi', linkedAccountId: B, displayName: 'Cometa', entityId: ENT.WB, joinedCommunities: [] }],
  [C, { uid: C, profileType: 'real', displayName: 'Carla', joinedCommunities: [] }],
  /* Una cara Weë que dice ser de Ana pero su vínculo no cuadra: no es de nadie. */
  ['impostora', { uid: `hidi_${C}`, profileType: 'hidi', linkedAccountId: A, displayName: 'Falsa' }],
];
for (const [id, d] of perfiles) await db.doc(`users/${id}`).set(d);
const lista = async (perfilId) => (await leerDoc(`users/${perfilId}`))?.joinedCommunities || [];
const miembro = (c, id) => leerDoc(`communities/${c}/members/${id}`);
const contador = async (c) => (await leerDoc(`communities/${c}`))?.memberCount;

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── A · Crear: la cara que crea es la dueña, 1 miembro, nada de la cuenta en lo público ──');
// ═══════════════════════════════════════════════════════════════════════════
const r1 = await motor.crear({ cuentaDeLaSesion: A, comoIdentidad: WA, peticion: 'peticion-ana-0001', datos: { name: 'Cine Nocturno', description: 'Películas de madrugada' } });
const K = r1.communityId;
const publica = await leerDoc(`communities/${K}`);
const propiedad = await leerDoc(`communities/${K}/private/ownership`);
check('crear desde el Perfil Weë deja UN miembro (no 3)', publica.memberCount === 1 && (await db.collection(`communities/${K}/members`).get()).size === 1, `memberCount=${publica.memberCount}`);
check('y ese miembro es la cara Weë, de dueña; el Perfil Real NO es miembro', (await miembro(K, WA))?.role === 'owner' && (await miembro(K, A)) === null);
check('lo público lleva la referencia pública y el tipo del creador y del dueño',
  publica.creatorProfile?.ref === ENT.WA && publica.creatorProfile?.type === 'wee' && publica.ownerProfile?.ref === ENT.WA && publica.ownerProfile?.type === 'wee' && publica.governance === 'identity');
check('lo público NO lleva la cuenta, ni el uid de la cara, ni `createdBy`, ni moderadores por uid',
  !JSON.stringify(publica).includes(A) && !('createdBy' in publica) && Array.isArray(publica.moderators) && publica.moderators.length === 0, JSON.stringify(publica).slice(0, 120));
check('la cuenta y la cara del creador y del dueño viven en private/ownership', propiedad?.creatorAccountId === A && propiedad?.creatorIdentity === WA && propiedad?.ownerAccountId === A && propiedad?.ownerIdentity === WA);
check('la comunidad se apunta en la lista del Perfil Weë y NO en la del Real («Mis comunidades» de Weë)', (await lista(WA)).includes(K) && !(await lista(A)).includes(K));
const misWee = await motor.misComunidades({ cuentaDeLaSesion: A, comoIdentidad: WA });
const misReal = await motor.misComunidades({ cuentaDeLaSesion: A, comoIdentidad: A });
check('listMyCommunities(Weë) la da como dueña; listMyCommunities(Real) no la da', misWee.memberships.some((m) => m.communityId === K && m.role === 'owner') && !misReal.memberships.some((m) => m.communityId === K));
const r1bis = await motor.crear({ cuentaDeLaSesion: A, comoIdentidad: WA, peticion: 'peticion-ana-0001', datos: { name: 'Cine Nocturno' } });
check('idempotente: la misma petición devuelve la misma comunidad y no suma miembros', r1bis.communityId === K && r1bis.repetida === true && (await contador(K)) === 1
  && (await db.collection('communities').where('slug', '==', 'cine-nocturno').get()).size === 1);
check('la misma petición con la OTRA cara de la cuenta no reutiliza la operación', (await motivoDe(motor.crear({ cuentaDeLaSesion: A, comoIdentidad: A, peticion: 'peticion-ana-0001', datos: { name: 'Cine Nocturno' } }))) === 'operacion-de-otra-identidad');
const dobles = await Promise.allSettled([1, 2, 3].map(() => motor.crear({ cuentaDeLaSesion: B, comoIdentidad: WB, peticion: 'peticion-beto-carrera', datos: { name: 'Carrera' } })));
const idsDobles = new Set(dobles.filter((x) => x.status === 'fulfilled').map((x) => x.value.communityId));
check('tres creaciones simultáneas con la misma petición: UNA comunidad, UN miembro', idsDobles.size === 1
  && (await db.collection('communities').where('slug', '==', 'carrera').get()).size === 1 && (await contador([...idsDobles][0])) === 1);
check('un slug ocupado no se repite', (await motivoDe(motor.crear({ cuentaDeLaSesion: B, comoIdentidad: B, peticion: 'peticion-beto-0002', datos: { name: 'Cine  nocturno' } }))) === 'ya-existe');
check('el de una oficial está reservado', (await motivoDe(motor.crear({ cuentaDeLaSesion: B, comoIdentidad: B, peticion: 'peticion-beto-0003', datos: { name: 'Tecnología IA' } }))) === 'nombre-reservado');
check('Ana no crea con una cara de Beto (ni la Real ni la Weë)',
  (await motivoDe(motor.crear({ cuentaDeLaSesion: A, comoIdentidad: B, peticion: 'peticion-ana-0004', datos: { name: 'Robo' } }))) === 'identidad-ajena'
  && (await motivoDe(motor.crear({ cuentaDeLaSesion: A, comoIdentidad: WB, peticion: 'peticion-ana-0005', datos: { name: 'Robo dos' } }))) === 'identidad-ajena');
check('una cara cuyo vínculo no cuadra no es de nadie', (await motivoDe(motor.crear({ cuentaDeLaSesion: A, comoIdentidad: `hidi_${C}`, peticion: 'peticion-ana-0006', datos: { name: 'Impostora' } }))) === 'identidad-desconocida');
check('datos malos se rechazan (sin nombre, petición corta, icono raro)',
  (await motivoDe(motor.crear({ cuentaDeLaSesion: A, comoIdentidad: A, peticion: 'peticion-ana-0007', datos: { name: '   ' } }))) === 'datos-invalidos'
  && (await motivoDe(motor.crear({ cuentaDeLaSesion: A, comoIdentidad: A, peticion: 'corta', datos: { name: 'Hola' } }))) === 'datos-invalidos'
  && (await motivoDe(motor.crear({ cuentaDeLaSesion: A, comoIdentidad: A, peticion: 'peticion-ana-0008', datos: { name: 'Hola', icon: '<script>' } }))) === 'datos-invalidos');
const rC = await motor.crear({ cuentaDeLaSesion: C, comoIdentidad: C, peticion: 'peticion-carla-001', datos: { name: 'Sin entidad' } });
const pubC = await leerDoc(`communities/${rC.communityId}`);
check('un perfil sin entidad pública queda con ref null: nunca se cae al uid', pubC.ownerProfile.ref === null && pubC.ownerProfile.type === 'real' && !JSON.stringify(pubC).includes(C));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── B · Unirse y salir: cada cara es una membresía; el contador cuenta perfiles ──');
// ═══════════════════════════════════════════════════════════════════════════
await motor.unirse({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K });
check('el Perfil Real de Ana se une a la comunidad de su cara Weë: dos membresías independientes', (await miembro(K, A))?.role === 'member' && (await miembro(K, WA))?.role === 'owner' && (await contador(K)) === 2);
await motor.unirse({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K });
check('unirse otra vez no cuenta dos veces', (await contador(K)) === 2);
await Promise.all([1, 2, 3].map(() => motor.unirse({ cuentaDeLaSesion: B, comoIdentidad: WB, communityId: K }).catch(() => null)));
check('tres uniones simultáneas de la misma cara cuentan UNA', (await contador(K)) === 3 && (await miembro(K, WB))?.role === 'member');
check('unirse desde el Perfil Weë escribe en el Perfil Weë (el fallo de antes)', (await lista(WB)).includes(K) && !(await lista(B)).includes(K) && (await miembro(K, B)) === null);
await motor.unirse({ cuentaDeLaSesion: B, comoIdentidad: B, communityId: K });
check('Beto Real también: cuatro perfiles, cuatro miembros', (await contador(K)) === 4);
check('una comunidad que no existe no se une', (await motivoDe(motor.unirse({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: 'noexiste' }))) === 'no-existe');
check('la dueña no se va sin transferir', (await motivoDe(motor.salir({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: K }))) === 'dueno-debe-transferir' && (await contador(K)) === 4);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── C · Permisos por identidad: ninguna cara hereda los de la otra ──');
// ═══════════════════════════════════════════════════════════════════════════
const papel = (como, cuenta, objetivo, role) => motivoDe(motor.cambiarPapel({ cuentaDeLaSesion: cuenta, comoIdentidad: como, communityId: K, objetivo, papel: role }));
check('Ana REAL (miembro) no administra aunque su cara Weë sea la dueña: no cambia papeles', (await papel(A, A, B, 'moderator')) === 'sin-permiso');
check('ni transfiere', (await motivoDe(motor.transferir({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K, objetivo: B }))) === 'sin-permiso');
check('ni edita', (await motivoDe(motor.editar({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K, datos: { name: 'Mía' } }))) === 'sin-permiso');
check('ni expulsa', (await motivoDe(motor.expulsar({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K, objetivo: B }))) === 'sin-permiso');
check('ni se asciende a sí misma', (await papel(A, A, A, 'admin')) === 'sin-permiso' && (await miembro(K, A))?.role === 'member');
check('la dueña (Ana Weë) nombra admin a Beto Weë', (await papel(WA, A, WB, 'admin')) === 'ok' && (await miembro(K, WB))?.role === 'admin');
check('Beto REAL no hereda el admin de su cara Weë', (await papel(B, B, A, 'moderator')) === 'sin-permiso' && (await miembro(K, B))?.role === 'member');
check('el admin (Beto Weë) nombra moderadora a Ana Real', (await papel(WB, B, A, 'moderator')) === 'ok' && (await miembro(K, A))?.role === 'moderator');
check('pero no nombra admins, ni toca a la dueña, ni hace dueño a nadie',
  (await papel(WB, B, B, 'admin')) === 'sin-permiso' && (await papel(WB, B, WA, 'member')) === 'no-al-dueno' && (await papel(WA, A, WB, 'owner')) === 'usa-transferencia');
check('Ana Real, ahora moderadora, saca a un miembro (Beto Real)…', (await motivoDe(motor.expulsar({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K, objetivo: B }))) === 'ok'
  && (await miembro(K, B)) === null && (await contador(K)) === 3 && !(await lista(B)).includes(K));
check('…pero no a un admin, ni a la dueña', (await motivoDe(motor.expulsar({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K, objetivo: WB }))) === 'sin-permiso'
  && (await motivoDe(motor.expulsar({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: K, objetivo: WA }))) === 'no-al-dueno');
check('Ana no actúa con una cara de Beto aunque Beto sea admin', (await papel(WB, A, A, 'admin')) === 'identidad-ajena');
check('el admin edita la descripción', (await motivoDe(motor.editar({ cuentaDeLaSesion: B, comoIdentidad: WB, communityId: K, datos: { description: 'Nueva' } }))) === 'ok' && (await leerDoc(`communities/${K}`)).description === 'Nueva');
check('transferir a quien no es miembro no vale', (await motivoDe(motor.transferir({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: K, objetivo: C }))) === 'no-es-miembro');
check('la dueña transfiere a Beto Weë', (await motivoDe(motor.transferir({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: K, objetivo: WB }))) === 'ok');
const trasTransferir = await leerDoc(`communities/${K}`);
const propTras = await leerDoc(`communities/${K}/private/ownership`);
check('tras transferir: Beto Weë dueño, Ana Weë admin; lo público con la ref de Beto Weë y sin cuentas',
  (await miembro(K, WB))?.role === 'owner' && (await miembro(K, WA))?.role === 'admin' && trasTransferir.ownerProfile.ref === ENT.WB && trasTransferir.creatorProfile.ref === ENT.WA
  && !JSON.stringify(trasTransferir).includes(A) && !JSON.stringify(trasTransferir).includes(B));
check('y lo privado con la cuenta nueva y el historial', propTras.ownerAccountId === B && propTras.ownerIdentity === WB && propTras.creatorAccountId === A && propTras.history.length === 1);
check('Ana Weë ya no es dueña: no puede transferir otra vez', (await motivoDe(motor.transferir({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: K, objetivo: A }))) === 'sin-permiso');
check('y ahora sí puede salir; Beto Weë (dueño) no', (await motivoDe(motor.salir({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: K }))) === 'ok'
  && (await motivoDe(motor.salir({ cuentaDeLaSesion: B, comoIdentidad: WB, communityId: K }))) === 'dueno-debe-transferir');
check('salir con la cara Weë deja la membresía de la Real intacta', (await miembro(K, WA)) === null && (await miembro(K, A))?.role === 'moderator' && (await contador(K)) === 2
  && !(await lista(WA)).includes(K) && (await lista(A)).includes(K));
check('salir sin ser miembro no descuenta', (await motivoDe(motor.salir({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: K }))) === 'ok' && (await contador(K)) === 2);

await db.doc('communities/oficial-tec').set({ name: 'Tecnología', slug: 'tecnologia-ia', isOfficial: true, status: 'active', memberCount: 10, postCount: 0, moderators: [] });
await motor.unirse({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: 'oficial-tec' });
check('a una oficial se une cualquiera, pero no se administra por identidad', (await contador('oficial-tec')) === 11
  && (await motivoDe(motor.cambiarPapel({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: 'oficial-tec', objetivo: WA, papel: 'admin' }))) === 'comunidad-oficial');

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── D · Heredadas: lo que hay no se reescribe ni se inventa ──');
// ═══════════════════════════════════════════════════════════════════════════
await db.doc('communities/vieja').set({ name: 'Vieja', slug: 'vieja', isOfficial: false, status: 'active', memberCount: 5, postCount: 3, moderators: [A], createdBy: A });
await db.doc(`communities/vieja/members/${A}`).set({ userId: A, postCount: 0, reputation: 0 });
await db.doc(`users/${A}`).update({ joinedCommunities: FieldValue.arrayUnion('vieja') });
const lr = await motor.unirse({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: 'vieja' });
check('la membresía heredada se reconoce: unirse no la duplica ni suma', lr.yaEra === true && (await contador('vieja')) === 5);
const misRealV = await motor.misComunidades({ cuentaDeLaSesion: A, comoIdentidad: A });
check('el miembro heredado es `member`: NO se deduce de `createdBy` que el Perfil Real sea el dueño', misRealV.memberships.find((m) => m.communityId === 'vieja')?.role === 'member');
check('la cara Weë no aparece en una heredada a la que nunca entró', !(await motor.misComunidades({ cuentaDeLaSesion: A, comoIdentidad: WA })).memberships.some((m) => m.communityId === 'vieja'));
check('una heredada no se administra por identidad hasta que se reclama', (await motivoDe(motor.cambiarPapel({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: 'vieja', objetivo: A, papel: 'admin' }))) === 'comunidad-heredada');
check('reclamarla solo puede la cuenta de `createdBy`', (await motivoDe(motor.reclamarHeredada({ cuentaDeLaSesion: B, comoIdentidad: WB, communityId: 'vieja' }))) === 'no-la-creaste');
check('Ana la reclama ELIGIENDO su cara Weë', (await motivoDe(motor.reclamarHeredada({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: 'vieja' }))) === 'ok');
const vieja = await leerDoc('communities/vieja');
check('`createdBy` y `moderators` heredados quedan intactos; dueña = Ana Weë; +1 miembro (la cara nueva)',
  vieja.createdBy === A && JSON.stringify(vieja.moderators) === JSON.stringify([A]) && vieja.ownerProfile.ref === ENT.WA && vieja.memberCount === 6
  && (await miembro('vieja', WA))?.role === 'owner' && (await miembro('vieja', A))?.role === undefined && (await leerDoc('communities/vieja/private/ownership'))?.claimedFromLegacy === true);
check('y no se reclama dos veces', (await motivoDe(motor.reclamarHeredada({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: 'vieja' }))) === 'ya-tiene-dueno');

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── E · Reglas: los caminos directos del cliente, cerrados ──');
// ═══════════════════════════════════════════════════════════════════════════
const forma = { name: 'Directa', slug: 'directa', description: '', icon: 'people', rules: [], memberCount: 1, postCount: 0, isOfficial: false, status: 'active', moderators: [A], createdBy: A };
check('crear una comunidad directamente: denegado (con la forma de antes, con la de ahora)',
  deniega(await crearCli('/communities/directa1', A, forma)) && deniega(await crearCli('/communities/directa2', A, { ...forma, createdBy: undefined, moderators: [], governance: 'identity', ownerProfile: { ref: ENT.A, type: 'real' } })));
check('sumar o restar `memberCount`: denegado (también de uno en uno)', deniega(await escribirCli(`/communities/${K}`, A, { memberCount: 3 })) && deniega(await escribirCli(`/communities/${K}`, B, { memberCount: 1 })));
check('cambiar dueño, creador, moderadores, gobierno o nombre: denegado, también a quien administra',
  deniega(await escribirCli(`/communities/${K}`, B, { ownerProfile: { ref: ENT.B, type: 'real' } })) && deniega(await escribirCli(`/communities/${K}`, A, { creatorProfile: { ref: ENT.A, type: 'real' } }))
  && deniega(await escribirCli('/communities/vieja', A, { moderators: [A, B] })) && deniega(await escribirCli('/communities/vieja', A, { name: 'Renombrada' }))
  && deniega(await escribirCli(`/communities/${K}`, B, { governance: 'otra' })) && deniega(await escribirCli('/communities/vieja', A, { createdBy: B })));
check('`postCount` sigue de uno en uno (es de las publicaciones, sin cambios)', permite(await escribirCli(`/communities/${K}`, A, { postCount: 1 })) && deniega(await escribirCli(`/communities/${K}`, A, { postCount: 50 })));
check('ningún cliente lee los miembros, ni los suyos', deniega(await leerCli(`/communities/${K}/members/${A}`, A)) && deniega(await leerCli(`/communities/${K}/members/${WB}`, B)) && deniega(await leerCli(`/communities/${K}/members/${A}`)));
check('ni escribe ni borra un miembro (ni con su propia cara)', deniega(await crearCli(`/communities/${K}/members/${WA}`, A, { userId: WA, role: 'owner' }))
  && deniega(await escribirCli(`/communities/${K}/members/${A}`, A, { role: 'owner' })) && deniega(await borrarCli(`/communities/${K}/members/${WB}`, B)));
check('ni lee ni escribe la propiedad privada (tampoco el dueño)', deniega(await leerCli(`/communities/${K}/private/ownership`, B)) && deniega(await escribirCli(`/communities/${K}/private/ownership`, B, { ownerAccountId: B })));
check('ni las reservas de slug ni las operaciones', deniega(await leerCli('/communitySlugs/cine-nocturno', A)) && deniega(await crearCli('/communitySlugs/libre', A, { communityId: 'x' })));
check('la lista de comunidades de un perfil no la escribe el cliente; el resto del perfil sí', deniega(await escribirCli(`/users/${WA}`, A, { joinedCommunities: [K, 'vieja'] })) && permite(await escribirCli(`/users/${WA}`, A, { bio: 'hola' })));
check('el documento público se lee sin sesión', permite(await leerCli(`/communities/${K}`)));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── F · Autoría existente: la cara es de la sesión y no se reescribe (posts, comentarios, avisos) ──');
// ═══════════════════════════════════════════════════════════════════════════
const post = (userId) => ({ userId, content: 'hola', isPrivate: false, communitySlug: 'cine-nocturno', createdAt: new Date() });
check('Ana publica con su cara Weë y con la Real', permite(await crearCli('/posts/pw', A, post(WA))) && permite(await crearCli('/posts/pr', A, post(A))));
check('pero no con una cara de Beto', deniega(await crearCli('/posts/px', A, post(WB))) && deniega(await crearCli('/posts/py', A, post(B))));
check('la identidad histórica no se reescribe: la publicación Weë no pasa a la Real', deniega(await escribirCli('/posts/pw', A, { userId: A })) && permite(await escribirCli('/posts/pw', A, { content: 'editado' })));
check('comentarios: cara propia sí, ajena no, y la autoría no se cambia', permite(await crearCli('/comments/cw', A, { userId: WA, postId: 'pw', content: 'c', createdAt: new Date() }))
  && deniega(await crearCli('/comments/cx', A, { userId: WB, postId: 'pw', content: 'c', createdAt: new Date() })) && deniega(await escribirCli('/comments/cw', A, { userId: A })));
const aviso = (senderId, recipientId) => ({ type: 'like', recipientId, senderId, senderName: 'x', read: false, createdAt: new Date() });
check('avisos: firmar con la cara propia sí, con la ajena no', permite(await crearCli('/notifications/n1', A, aviso(WA, B))) && deniega(await crearCli('/notifications/n2', A, aviso(WB, C))));
await db.doc('notifications/paraWB').set(aviso(A, WB));
check('un aviso para Beto Weë no lo lee Ana', deniega(await leerCli('/notifications/paraWB', A)) && permite(await leerCli('/notifications/paraWB', B)));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── G · Aislamiento: una cara no lee, cambia ni administra lo de la otra ──');
// ═══════════════════════════════════════════════════════════════════════════
await motor.unirse({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: rC.communityId });
const soloWee = await motor.misComunidades({ cuentaDeLaSesion: A, comoIdentidad: WA });
const soloReal = await motor.misComunidades({ cuentaDeLaSesion: A, comoIdentidad: A });
check('lo que ve la cara Weë son SOLO sus membresías y papeles', soloWee.identityType === 'wee' && !soloWee.memberships.some((m) => m.communityId === rC.communityId) && soloWee.memberships.some((m) => m.communityId === 'vieja' && m.role === 'owner'));
check('lo que ve la Real, SOLO las suyas (moderadora en la de Beto Weë, miembro en la de Carla)', soloReal.identityType === 'real'
  && soloReal.memberships.find((m) => m.communityId === K)?.role === 'moderator' && soloReal.memberships.some((m) => m.communityId === rC.communityId));
check('Beto no lee las membresías de ninguna cara de Ana', (await motivoDe(motor.misComunidades({ cuentaDeLaSesion: B, comoIdentidad: A }))) === 'identidad-ajena'
  && (await motivoDe(motor.misComunidades({ cuentaDeLaSesion: B, comoIdentidad: WA }))) === 'identidad-ajena');
check('ser dueña con la cara Weë en «vieja» no da nada a Ana Real allí (sigue siendo miembro: no edita)', (await motivoDe(motor.editar({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: 'vieja', datos: { name: 'Toma' } }))) === 'sin-permiso');
check('y la moderación de Ana Real en la de Beto no da nada a Ana Weë (que ya no es miembro)', (await motivoDe(motor.expulsar({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: K, objetivo: WB }))) === 'no-es-miembro');
check('un papel entre caras de la misma cuenta solo existe si la dueña lo da a propósito…', (await motivoDe(motor.cambiarPapel({ cuentaDeLaSesion: A, comoIdentidad: WA, communityId: 'vieja', objetivo: A, papel: 'admin' }))) === 'ok' && (await miembro('vieja', A))?.role === 'admin');
check('…y aun así esa cara no toca a la dueña ni se hace dueña', (await motivoDe(motor.cambiarPapel({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: 'vieja', objetivo: WA, papel: 'member' }))) === 'no-al-dueno'
  && (await motivoDe(motor.transferir({ cuentaDeLaSesion: A, comoIdentidad: A, communityId: 'vieja', objetivo: A }))) === 'sin-permiso');

console.log(failures ? `\n✘ ${failures} fallos de ${n - 1}` : `\n✔ comunidades por identidad, contra el emulador: ${n - 1} comprobaciones`);
process.exit(failures ? 1 : 0);
