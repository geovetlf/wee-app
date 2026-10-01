/*
 * LA CREACIÓN DEL PERFIL REAL, CON FIRESTORE DE VERDAD (Fase 11.x).
 *
 * El mismo protocolo que usa la app (`utils/perfilCanonico.ts`), cableado a
 * los mismos puertos que el servicio —`where('uid', '==')` y `runTransaction`
 * del SDK web—, contra el emulador de Firestore con las REGLAS del repositorio
 * y sesiones de verdad del emulador de Auth. Aquí no hay base de datos de
 * mentira: las transacciones que chocan son las de Firestore.
 *
 * No está en `npm test` a propósito: necesita los emuladores y Java 21.
 * Se lanza así, desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only auth,firestore --project demo-wee \
 *     "node functions/test/creacion-de-perfil.emulator.mjs"
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, runTransaction, getDocs, getDoc, query, collection, where, limit, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
/* `127.0.0.1`, no `localhost`: el `fetch` de Node resuelve `localhost` a `::1` y el emulador de Auth escucha en IPv4. */
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const [fsHost, fsPort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');

const RAIZ = new URL('../../', import.meta.url);
const leer = (p) => fs.readFileSync(new URL(p, RAIZ), 'utf8');
const ts = createRequire(import.meta.url)('typescript');
const js = ts.transpileModule(leer('utils/perfilCanonico.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { asegurarPerfilReal, asegurarPerfilWee, idDelPerfilReal, idDelPerfilWee } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Una sesión = una app del SDK con su Auth y su Firestore, como un aparato. */
let apps = 0;
const sesion = async (modo) => {
  const app = initializeApp({ projectId: PROY, apiKey: 'clave-del-emulador' }, 'sesion' + apps++);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, fsHost, Number(fsPort));
  const cred = modo.token ? await signInWithCustomToken(auth, modo.token) : await signInAnonymously(auth);
  return { db, uid: cred.user.uid };
};
/* Un token personalizado sin firma: el emulador de Auth no verifica firmas. */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const tokenDe = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  const cuenta = `firebase-adminsdk@${PROY}.iam.gserviceaccount.com`;
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ iss: cuenta, sub: cuenta, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat: now, exp: now + 3600, uid }) + '.';
};

/* Los puertos del servicio, uno a uno (services/firestoreService.ts · ensureRealProfile). */
const puertosDe = (db) => ({
  buscarPorUid: async (uid) => {
    const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid), limit(1)));
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  },
  enTransaccion: (cuerpo) => runTransaction(db, (tx) => cuerpo({
    leer: async (id) => { const s = await tx.get(doc(db, 'users', id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    crear: (id, datos) => { const { id: _sinId, ...campos } = datos; tx.set(doc(db, 'users', id), campos); },
    actualizar: (id, campos) => { tx.update(doc(db, 'users', id), campos); },
  })),
});
/* La cara Weë, con su identificador heredado como DATO (en la app lo compone `identidadWeeDe`). */
const caraDe = (cuenta) => 'hidi_' + cuenta;
const weeDe = (cuenta, extra = {}) => () => ({ id: idDelPerfilWee(caraDe(cuenta)), uid: caraDe(cuenta), displayName: 'Cara Weë', bio: '', followers: 0, following: 0, posts: 0, joinedCommunities: [], hasCompletedCommunityOnboarding: true, profileType: 'hidi', linkedAccountId: cuenta, avatarType: 'predefined', avatarId: 'ghost', ...extra });
const vinculoDe = (cuenta) => ({ cuenta, identidadWee: caraDe(cuenta), idDelPerfilReal: idDelPerfilReal(cuenta) });
const perfilDe = (uid, extra = {}) => () => ({ id: idDelPerfilReal(uid), uid, displayName: 'Persona', bio: '', followers: 0, following: 0, posts: 0, joinedCommunities: [], profileType: 'real', avatarType: 'predefined', avatarId: 'male', ...extra });
const documentosDe = async (db, uid) => (await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))).docs.map((d) => d.id);
const deniega = async (fn) => { try { await fn(); return false; } catch (e) { return /permission-denied|PERMISSION_DENIED/i.test(String(e.code) + String(e.message)); } };

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Peticiones a la vez, transacciones de verdad ──');
// ════════════════════════════════════════════════════════════════════════════
for (const n of [1, 2, 5, 10]) {
  const { db, uid } = await sesion({});
  const resultados = await Promise.all(Array.from({ length: n }, () => asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid))));
  const docs = await documentosDe(db, uid);
  check(`${n}) ${n} petición(es) a la vez → un solo documento users/<uid>, todos ven el mismo, uno solo lo creó`,
    docs.length === 1 && docs[0] === uid && new Set(resultados.map((r) => r.perfil.id)).size === 1 && resultados.filter((r) => r.creado).length === 1, `${docs.length} documento(s) · ${resultados.filter((r) => r.creado).length} creado(s)`);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Idempotencia, fallos y reintentos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { db, uid } = await sesion({});
  const primera = await asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid));
  const antes = (await getDoc(doc(db, 'users', uid))).data();
  const segunda = await asegurarPerfilReal(puertosDe(db), uid, () => ({ ...perfilDe(uid)(), displayName: 'Otro nombre' }));
  const despues = (await getDoc(doc(db, 'users', uid))).data();
  check('11) la segunda ejecución devuelve el mismo perfil, no crea otro y no toca el documento',
    primera.creado && !segunda.creado && segunda.perfil.id === uid && JSON.stringify(antes) === JSON.stringify(despues) && (await documentosDe(db, uid)).length === 1);
}
{
  /* El primer intento lo rechazan las reglas (lleva `email`, un campo de cuenta): no queda nada; el reintento limpio crea uno. */
  const { db, uid } = await sesion({});
  const fallo = await deniega(() => asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid, { email: 'a@b.c' })));
  const tras = await documentosDe(db, uid);
  const reintento = await asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid));
  check('12) si el primer intento falla (las reglas lo rechazan) no queda nada a medias, y el reintento crea uno solo',
    fallo && tras.length === 0 && reintento.creado && (await documentosDe(db, uid)).length === 1);
}
{
  /* Un perfil antiguo con id automático: se devuelve y no se crea users/<uid> al lado. Se siembra con el propio dueño, como lo creaba la app antigua… salvo que las reglas ya no lo permiten, así que se siembra como un documento previo a las reglas (regla de creación relajada no hay): lo escribe una transacción del dueño en un id automático NO es posible; se comprueba en cambio que el resolutor prefiere lo que ya hay. */
  const { db, uid } = await sesion({});
  await asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid));
  const diez = await Promise.all(Array.from({ length: 10 }, () => asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid))));
  check('13) con el perfil ya creado, diez arranques a la vez no escriben nada', diez.every((r) => !r.creado && r.perfil.id === uid) && (await documentosDe(db, uid)).length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Anónimo, con proveedor, y registro simultáneo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const anonimo = await sesion({});
  const autenticado = await sesion({ token: tokenDe('cuentaConProveedor000000001') });
  const [a, b] = await Promise.all([
    Promise.all(Array.from({ length: 5 }, () => asegurarPerfilReal(puertosDe(anonimo.db), anonimo.uid, perfilDe(anonimo.uid, { displayName: 'Usuario Anónimo' })))),
    Promise.all(Array.from({ length: 5 }, () => asegurarPerfilReal(puertosDe(autenticado.db), autenticado.uid, perfilDe(autenticado.uid, { displayName: 'Con proveedor', photoURL: 'https://foto', avatarType: 'custom' })))),
  ]);
  check('14) usuario anónimo: un perfil', (await documentosDe(anonimo.db, anonimo.uid)).length === 1 && a.filter((r) => r.creado).length === 1);
  check('15) usuario con proveedor (token personalizado): un perfil, con su uid y no otro',
    autenticado.uid === 'cuentaConProveedor000000001' && (await documentosDe(autenticado.db, autenticado.uid)).length === 1 && b.filter((r) => r.creado).length === 1);
}
{
  /* Registro simultáneo: dos arranques y el onboarding escribiendo sobre el id que le devolvieron. */
  const { db, uid } = await sesion({});
  const [a, b] = await Promise.all([asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid)), asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid))]);
  await updateDoc(doc(db, 'users', a.perfil.id), { displayName: 'Nombre elegido', hasCompletedCommunityOnboarding: true });
  const final = (await getDoc(doc(db, 'users', b.perfil.id))).data();
  check('16) registro simultáneo: los dos arranques reciben el mismo id y el onboarding cae en un único documento',
    a.perfil.id === b.perfil.id && final.displayName === 'Nombre elegido' && final.hasCompletedCommunityOnboarding === true && (await documentosDe(db, uid)).length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Seguridad: lo que las reglas no dejan hacer ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ana = await sesion({});
  const beto = await sesion({});
  await asegurarPerfilReal(puertosDe(ana.db), ana.uid, perfilDe(ana.uid));
  const sinId = (perfil) => { const { id: _id, ...campos } = perfil; return campos; };
  check('17) nadie crea un perfil para otro uid',
    await deniega(() => setDoc(doc(beto.db, 'users', ana.uid + 'x'), sinId(perfilDe(ana.uid)())))
    && await deniega(() => setDoc(doc(beto.db, 'users', beto.uid), sinId(perfilDe(ana.uid)()))));
  check('18) ni un perfil real en un id que no sea su cuenta (adiós a los duplicados por id automático)',
    await deniega(() => setDoc(doc(beto.db, 'users', 'idAutomatico'), { uid: beto.uid, displayName: 'Beto', profileType: 'real' }))
    && await deniega(() => addDoc(collection(beto.db, 'users'), { uid: beto.uid, displayName: 'Beto', profileType: 'real' })));
  check('19) el dueño no puede cambiar el uid de su perfil', await deniega(() => updateDoc(doc(ana.db, 'users', ana.uid), { uid: beto.uid })));
  check('20) ni su profileType', await deniega(() => updateDoc(doc(ana.db, 'users', ana.uid), { profileType: 'hidi' })));
  check('21) ni apuntar linkedAccountId a otra cuenta', await deniega(() => updateDoc(doc(ana.db, 'users', ana.uid), { linkedAccountId: beto.uid })));
  check('22) pero sí a su propia cara Weë, que es lo que hace crear el Perfil Weë', !(await deniega(() => updateDoc(doc(ana.db, 'users', ana.uid), { linkedAccountId: 'hidi_' + ana.uid, profileType: 'real' }))));
  check('23) y sigue pudiendo editar lo suyo', !(await deniega(() => updateDoc(doc(ana.db, 'users', ana.uid), { bio: 'Hola', displayName: 'Ana' }))));
  check('24) otra cuenta no toca su perfil', await deniega(() => updateDoc(doc(beto.db, 'users', ana.uid), { bio: 'intruso' })));
  /*
   * El Perfil Weë conserva su forma heredada —documento aparte, uid con prefijo,
   * `profileType: 'hidi'` y vínculo a la cuenta— pero desde la Fase 11.x-2 vive
   * en su propio identificador: las reglas ya no admiten una cara con id automático
   * (lo comprueba W15).
   */
  const weeRef = doc(ana.db, 'users', 'hidi_' + ana.uid);
  await setDoc(weeRef, { uid: 'hidi_' + ana.uid, displayName: 'Cara Weë', bio: '', followers: 0, following: 0, posts: 0, joinedCommunities: [], profileType: 'hidi', linkedAccountId: ana.uid, avatarType: 'predefined', avatarId: 'male' });
  check('25) el Perfil Weë se sigue creando con su forma heredada, ahora en su propio identificador', (await getDoc(weeRef)).exists());
  check('26) y su vínculo con la cuenta tampoco se reescribe', await deniega(() => updateDoc(weeRef, { linkedAccountId: beto.uid })) && await deniega(() => updateDoc(weeRef, { uid: ana.uid })));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · El Perfil Weë: una cara por cuenta, enlazada, con transacciones de verdad ──');
// ════════════════════════════════════════════════════════════════════════════
for (const n of [1, 2, 5, 10]) {
  const { db, uid } = await sesion({});
  await asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid));
  const resultados = await Promise.all(Array.from({ length: n }, () => asegurarPerfilWee(puertosDe(db), vinculoDe(uid), weeDe(uid))));
  const caras = await documentosDe(db, caraDe(uid));
  const real = (await getDoc(doc(db, 'users', uid))).data();
  check(`W${n}) ${n} petición(es) a la vez → UNA cara en users/<su identificador>, enlazada desde el Perfil Real, todos ven la misma`,
    caras.length === 1 && caras[0] === caraDe(uid) && new Set(resultados.map((r) => r.perfil.id)).size === 1 && resultados.filter((r) => r.creado).length === 1 && real.linkedAccountId === caraDe(uid),
    `${caras.length} cara(s) · ${resultados.filter((r) => r.creado).length} creada(s)`);
}
{
  const { db, uid } = await sesion({ token: tokenDe('cuentaConCaraYProveedor0001') });
  await asegurarPerfilReal(puertosDe(db), uid, perfilDe(uid));
  const r = await Promise.all(Array.from({ length: 5 }, () => asegurarPerfilWee(puertosDe(db), vinculoDe(uid), weeDe(uid))));
  const segunda = await asegurarPerfilWee(puertosDe(db), vinculoDe(uid), weeDe(uid, { displayName: 'Otro nombre' }));
  const cara = (await getDoc(doc(db, 'users', caraDe(uid)))).data();
  check('W11) usuario con proveedor: una cara, y la segunda ejecución devuelve la misma sin tocarla',
    (await documentosDe(db, caraDe(uid))).length === 1 && r.filter((x) => x.creado).length === 1 && !segunda.creado && cara.displayName === 'Cara Weë' && cara.linkedAccountId === uid);
  const cuenta = (await getDoc(doc(db, 'users', uid))).data();
  check('W12) el enlace Real ↔ Weë queda en los dos sentidos: la cara declara su cuenta y la cuenta apunta a su cara',
    cara.profileType === 'hidi' && cara.linkedAccountId === uid && cuenta.linkedAccountId === caraDe(uid) && cuenta.profileType === 'real');
}
{
  /* Sin Perfil Real: la transacción cae entera y no queda cara suelta. */
  const { db, uid } = await sesion({});
  const fallo = await (async () => { try { await asegurarPerfilWee(puertosDe(db), vinculoDe(uid), weeDe(uid)); return false; } catch { return true; } })();
  check('W13) sin Perfil Real que enlazar no nace la cara: nada queda a medias', fallo && (await documentosDe(db, caraDe(uid))).length === 0);
}
{
  /* Apropiación: otra cuenta no puede crear ni reclamar mi cara, ni yo la suya. */
  const ana = await sesion({});
  const beto = await sesion({});
  await asegurarPerfilReal(puertosDe(ana.db), ana.uid, perfilDe(ana.uid));
  await asegurarPerfilReal(puertosDe(beto.db), beto.uid, perfilDe(beto.uid));
  await asegurarPerfilWee(puertosDe(ana.db), vinculoDe(ana.uid), weeDe(ana.uid));
  const sinId = (perfil) => { const { id: _id, ...campos } = perfil; return campos; };
  check('W14) Beto no puede crear la cara de Ana ni una cara que declare la cuenta de Ana',
    await deniega(() => setDoc(doc(beto.db, 'users', caraDe(ana.uid) + 'x'), sinId(weeDe(ana.uid)())))
    && await deniega(() => setDoc(doc(beto.db, 'users', caraDe(beto.uid)), sinId(weeDe(beto.uid, { linkedAccountId: ana.uid })())))
    && await deniega(() => setDoc(doc(beto.db, 'users', caraDe(beto.uid)), sinId(weeDe(ana.uid)()))));
  check('W15) ni una cara suya en un id que no sea su identificador (adiós a las caras duplicadas por id automático)',
    await deniega(() => addDoc(collection(beto.db, 'users'), sinId(weeDe(beto.uid)()))) && await deniega(() => setDoc(doc(beto.db, 'users', 'idAutomaticoWee'), sinId(weeDe(beto.uid)()))));
  check('W16) Beto no puede enlazar el Perfil Real de Ana a su cara, ni Ana el suyo a la cara de Beto',
    await deniega(() => updateDoc(doc(beto.db, 'users', ana.uid), { linkedAccountId: caraDe(beto.uid) }))
    && await deniega(() => updateDoc(doc(ana.db, 'users', ana.uid), { linkedAccountId: caraDe(beto.uid) })));
  check('W17) la cara de Ana no cambia de cuenta ni de tipo, ni siquiera por Ana',
    await deniega(() => updateDoc(doc(ana.db, 'users', caraDe(ana.uid)), { linkedAccountId: beto.uid }))
    && await deniega(() => updateDoc(doc(ana.db, 'users', caraDe(ana.uid)), { profileType: 'real' }))
    && await deniega(() => updateDoc(doc(ana.db, 'users', caraDe(ana.uid)), { uid: ana.uid })));
  check('W18) pero Ana sigue editando su cara y Beto no', !(await deniega(() => updateDoc(doc(ana.db, 'users', caraDe(ana.uid)), { bio: 'Hola' }))) && await deniega(() => updateDoc(doc(beto.db, 'users', caraDe(ana.uid)), { bio: 'intruso' })));
  /* Identity Core: cuentas, entidades y contador son del servidor. */
  check('W19) nadie escribe accounts, entities ni el contador desde el cliente',
    await deniega(() => setDoc(doc(ana.db, 'accounts', ana.uid), { accountNumber: '0000001' }))
    && await deniega(() => setDoc(doc(ana.db, 'entities', '00000011'), { ownerAccountId: ana.uid }))
    && await deniega(() => setDoc(doc(ana.db, 'contadores', 'cuentas'), { ultimaPosicion: 999 })));
  check('W20) ni lee la cuenta de otro', await deniega(() => getDoc(doc(beto.db, 'accounts', ana.uid))));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
