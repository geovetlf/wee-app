/*
 * SEGURIDAD DE `users` (2026-10-07): LO PÚBLICO DE UN PERFIL Y SOLO ESO.
 *
 * Determinista, sin red. Comprueba la proyección con lista blanca (functions/lib), que las reglas de FASE 2 cierran
 * `users` (las de fase 1 lo dejan como en producción: ops/despliegue/cierre-users.mjs), que el cliente lee lo ajeno
 * de `publicProfiles`, y el espejo y el relleno (correcciones 1–5): releen el perfil ACTUAL en una transacción,
 * comparan de forma canónica, reintentan lo pasajero y no se tragan los errores. Las reglas EJECUTADAS están en
 * `users-privado.emulator.mjs` y el relleno contra el emulador en `relleno-perfiles.emulator.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const PP = require(path.join(RAIZ, 'functions/lib/identity/perfilPublico.js'));
const { proyectarPerfilPublico, CAMPOS_PUBLICOS_DEL_PERFIL, COLECCION_PERFILES_PUBLICOS } = PP;
const { componerFase2, RUTA_FASE_2 } = await import(pathToFileURL(path.join(RAIZ, 'ops/despliegue/cierre-users.mjs')).href);

let ok = 0; let mal = 0;
const check = (n, c, extra = '') => { if (c) { ok++; console.log(`✔ ${n}`); } else { mal++; console.log(`✘ ${n} ${extra}`); } };

const PRIVADOS = ['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent', 'linkedAccountId', 'country', 'countryName',
  'language', 'email', 'realName', 'birthDate', 'gender', 'aiAvatarSelections', 'aiAvatarGenerationCount', 'pushToken',
  'joinedCommunities', 'hasCompletedCommunityOnboarding'];
const completo = {
  uid: 'hidi_abc', entityId: 'ent_x', profileType: 'hidi', displayName: 'Nube', bio: 'hola', photoURL: 'u', followers: 1,
  creditsBalance: 240, linkedAccountId: 'abc', country: 'ES', countryName: 'España', language: 'es-ES', email: 'a@b.test',
  realName: 'R', birthDate: '2000-01-01', gender: 'other', aiAvatarSelections: { gender: 'x' }, aiAvatarGenerationCount: 2,
  pushToken: 't', joinedCommunities: ['c'], hasCompletedCommunityOnboarding: true, campoNuevoDesconocido: 1,
};
const p = proyectarPerfilPublico(completo);

check('1) ningún campo privado pasa a la copia pública', PRIVADOS.every((k) => !(k in p)), PRIVADOS.filter((k) => k in p).join(','));
check('2) lo social sí pasa (uid, entityId, profileType, displayName, bio, foto, contadores)',
  p.uid === 'hidi_abc' && p.entityId === 'ent_x' && p.profileType === 'hidi' && p.displayName === 'Nube' && p.photoURL === 'u' && p.followers === 1);
check('3) un campo nuevo NO se publica por defecto (lista blanca)', !('campoNuevoDesconocido' in p));
check('4) la lista blanca no contiene ningún campo privado', PRIVADOS.every((k) => !CAMPOS_PUBLICOS_DEL_PERFIL.includes(k)));
check('5) sin uid o sin documento → sin copia', proyectarPerfilPublico({ displayName: 'x' }) === null && proyectarPerfilPublico(null) === null);
check('6) la colección es publicProfiles', COLECCION_PERFILES_PUBLICOS === 'publicProfiles');

const reglasFase1 = leer('firestore.rules');
const reglas = componerFase2(reglasFase1, leer(RUTA_FASE_2));
const inicio1 = reglasFase1.indexOf('match /users/{userId} {');
const bloqueUsers1 = reglasFase1.slice(inicio1, reglasFase1.indexOf('allow create:', inicio1));
check('7a) FASE 1 (firestore.rules): la lectura de users sigue como en producción, entre las marcas, sin get/list cerrados',
  /\/\/ <fase-1:lectura-de-users>\s*\n\s*allow read: if true;\s*\n\s*\/\/ <\/fase-1:lectura-de-users>/.test(bloqueUsers1) && !/allow get: if isAuthenticated\(\)/.test(bloqueUsers1));
const bloqueUsers = reglas.slice(reglas.indexOf('match /users/{userId} {'), reglas.indexOf('allow create:', reglas.indexOf('match /users/{userId} {')));
check('7) FASE 2 (compuesta): users ya no se lee en público (sin `allow read: if true`) y get/list exigen sesión',
  !/allow read: if true/.test(bloqueUsers) && /allow get: if isAuthenticated\(\)/.test(bloqueUsers) && /allow list: if isAuthenticated\(\) && esCaraDeLaCuenta/.test(bloqueUsers));
const bloquePub = reglas.slice(reglas.indexOf('match /publicProfiles/{perfilId} {'), reglas.indexOf('// === USUARIOS ==='));
check('8) publicProfiles: nadie la escribe y el listado lleva techo', /allow write: if false;/.test(bloquePub) && /request\.query\.limit != null/.test(bloquePub));

const servicio = leer('services/firestoreService.ts');
check('9) el buscador ya no lista users entero', !/collection\(db, 'users'\), limit\(100\)/.test(servicio));
check('10) lo ajeno (por referencia pública y por tandas) sale de publicProfiles',
  /\{ field: 'entityId', operator: '==', value: referencia \};\s*const users = await perfilesPublicos\(\[filtro\], 1\)/.test(servicio) && /perfilesPublicos\(\[\{ field: 'uid', operator: 'in', value: tanda \}\], 30\)/.test(servicio));

const indice = leer('functions/src/index.ts');
const gruposDespliegue = JSON.parse(leer('ops/despliegue/grupos.json'));
const espejoEnGrupos = (gruposDespliegue.primeros_despliegues || []).find((n) => n.funciones.includes('espejoDelPerfilPublico'));
check('11) el espejo está exportado, es NUEVA (fuera de los grupos de las vivas y de «no se despliegan») y tiene su PRIMER DESPLIEGUE declarado: SOLA, paso 1 de la fase 2',
  /espejoDelPerfilPublico/.test(indice) && !!espejoEnGrupos && JSON.stringify(espejoEnGrupos.funciones) === '["espejoDelPerfilPublico"]'
  && espejoEnGrupos.paso === 1 && /SOLA/.test(espejoEnGrupos.porque) && /functions:espejoDelPerfilPublico/.test(espejoEnGrupos.porque)
  && !gruposDespliegue.grupos.some((g) => g.funciones.includes('espejoDelPerfilPublico'))
  && !gruposDespliegue.no_se_despliegan.some((n) => n.funcion === 'espejoDelPerfilPublico'));

/* ── El espejo y el relleno (correcciones 1–5) ── */
const dbDeMentira = (inicial = {}) => {
  const docs = new Map(Object.entries(inicial).map(([k, v]) => [k, structuredClone(v)]));
  let escrituras = 0;
  return {
    docs, get escrituras() { return escrituras; },
    collection: (c) => ({ doc: (id) => ({ path: `${c}/${id}` }) }),
    runTransaction: async (fn) => {
      const pendientes = [];
      const tx = {
        get: async (r) => ({ exists: docs.has(r.path), data: () => (docs.has(r.path) ? structuredClone(docs.get(r.path)) : undefined) }),
        set: (r, d) => pendientes.push(['set', r.path, d]),
        delete: (r) => pendientes.push(['del', r.path]),
      };
      const out = await fn(tx);
      for (const [k, p, d] of pendientes) { escrituras++; if (k === 'set') docs.set(p, structuredClone(d)); else docs.delete(p); }
      return out;
    },
  };
};
const evento = (id, antes, despues) => ({
  params: { perfilId: id },
  data: { before: { exists: !!antes, data: () => antes || undefined }, after: { exists: !!despues, data: () => despues || undefined } },
});

{
  /* Dos escrituras: «Viejo» y luego «Nuevo». Llega TARDE el evento de «Viejo»: el espejo relee y deja «Nuevo». */
  const db = dbDeMentira({ 'users/abc': { uid: 'abc', displayName: 'Nuevo', creditsBalance: 9 }, 'publicProfiles/abc': { uid: 'abc', displayName: 'Nuevo' } });
  await PP.alEscribirPerfil(evento('abc', { uid: 'abc', displayName: 'Inicial' }, { uid: 'abc', displayName: 'Viejo' }), db);
  check('12) un evento fuera de orden NO deja la copia vieja: el espejo relee users y proyecta el estado actual',
    db.docs.get('publicProfiles/abc').displayName === 'Nuevo' && !('creditsBalance' in db.docs.get('publicProfiles/abc')));
}
{
  const db = dbDeMentira({ 'users/abc': { uid: 'abc', displayName: 'Ana' }, 'publicProfiles/abc': { displayName: 'Vieja', uid: 'abc', bio: 'quitada' } });
  const r = await PP.alEscribirPerfil(evento('abc', { uid: 'abc', displayName: 'Vieja' }, { uid: 'abc', displayName: 'Ana' }), db);
  check('13) el espejo escribe la copia del perfil actual, sin merge (lo que ya no es público desaparece)',
    r === null && db.docs.get('publicProfiles/abc').displayName === 'Ana' && !('bio' in db.docs.get('publicProfiles/abc')));
  const db2 = dbDeMentira({ 'publicProfiles/abc': { uid: 'abc' } });
  await PP.alEscribirPerfil(evento('abc', { uid: 'abc', displayName: 'Ana' }, null), db2);
  check('14) si el perfil ya no existe, se borra SOLO su copia pública', !db2.docs.has('publicProfiles/abc'));
  const db3 = dbDeMentira({ 'users/abc': { uid: 'abc', displayName: 'Ana', creditsBalance: 5 } });
  await PP.alEscribirPerfil(evento('abc', { uid: 'abc', displayName: 'Ana', creditsBalance: 4 }, { uid: 'abc', displayName: 'Ana', creditsBalance: 5 }), db3);
  check('15) un cambio que no toca lo público (un cobro) no lee ni escribe nada', db3.escrituras === 0 && !db3.docs.has('publicProfiles/abc'));
}
{
  const errores = [];
  const original = console.error;
  console.error = (...a) => errores.push(a.map(String).join(' '));
  const rota = (code) => ({
    collection: (c) => ({ doc: (id) => ({ path: `${c}/${id}` }) }),
    runTransaction: async () => { const e = new Error('fallo con Bearer abcdefghijklmnopqrstuvwxyz0123456789'); e.code = code; throw e; },
  });
  let relanzado = false;
  try { await PP.alEscribirPerfil(evento('abc', null, { uid: 'abc', displayName: 'Ana' }), rota(14)); } catch { relanzado = true; }
  let noRelanzado = true;
  try { await PP.alEscribirPerfil(evento('abc', null, { uid: 'abc', displayName: 'Ana' }), rota(7)); } catch { noRelanzado = false; }
  console.error = original;
  check('16) un error pasajero (UNAVAILABLE) se registra y SE RELANZA para que la plataforma reintente', relanzado);
  check('17) uno que no se arregla reintentando (PERMISSION_DENIED) se registra y no entra en bucle', noRelanzado);
  check('18) nada se traga en silencio: los dos quedan registrados, saneados (sin la credencial)',
    errores.length === 2 && errores.every((e) => /Perfil público/.test(e) && !/abcdefghijklmnopqrstuvwxyz0123456789/.test(e)), errores.join(' | '));
  check('19) clasificación de errores: pasajeros sí, permisos/argumentos no',
    [4, 8, 10, 13, 14, 'unavailable', 'aborted'].every((c) => PP.esErrorRecuperable({ code: c }))
    && ![3, 5, 7, 'permission-denied', undefined].some((c) => PP.esErrorRecuperable({ code: c })) && !PP.esErrorRecuperable(null));
}
{
  const fn = PP.espejoDelPerfilPublico.__endpoint || {};
  check('20) el disparador tiene el reintento activado sobre users/{perfilId}',
    fn.eventTrigger?.retry === true && /users\/\{perfilId\}/.test(JSON.stringify(fn.eventTrigger)), JSON.stringify(fn.eventTrigger || {}));
}
{
  check('21) la comparación es canónica: el orden de las claves no importa (ni anidadas)',
    PP.mismoContenido({ a: 1, b: { y: 2, x: 1 } }, { b: { x: 1, y: 2 }, a: 1 }) && !PP.mismoContenido({ a: 1 }, { a: 2 }) && PP.mismoContenido(null, undefined));
  const ts = (s, n) => ({ seconds: s, nanoseconds: n, toMillis: () => s * 1000 });
  check('22) y compara Timestamps por su valor', PP.mismoContenido({ createdAt: ts(1, 2) }, { createdAt: ts(1, 2) }) && !PP.mismoContenido({ createdAt: ts(1, 2) }, { createdAt: ts(1, 3) }));
  const usuarios = [['a', { uid: 'a', displayName: 'A', bio: 'x' }], ['b', { uid: 'b', displayName: 'B' }], ['c', { displayName: 'sin uid' }]];
  const publicos = [['a', { bio: 'x', displayName: 'A', uid: 'a' }]];
  const plan = PP.planDeRelleno(usuarios, publicos);
  check('23) el relleno no reescribe una copia igual con las claves en otro orden; solo la que falta',
    JSON.stringify(plan.ids) === '["b"]' && plan.sinUid === 1 && plan.conUid === 2, JSON.stringify(plan));
}
{
  /* El relleno leyó una instantánea vieja de «a»; el espejo ya escribió la versión nueva: el relleno NO la pisa. */
  const db = dbDeMentira({ 'users/a': { uid: 'a', displayName: 'Nueva' }, 'publicProfiles/a': { uid: 'a', displayName: 'Nueva' } });
  const plan = PP.planDeRelleno([['a', { uid: 'a', displayName: 'Vieja' }]], []);
  const r = await PP.sincronizarPerfilPublico(db, plan.ids[0]);
  check('24) el relleno no pisa un cambio reciente del espejo (sincroniza contra el perfil ACTUAL)',
    r === 'igual' && db.docs.get('publicProfiles/a').displayName === 'Nueva' && db.escrituras === 0);
  const db2 = dbDeMentira({ 'users/a': { uid: 'a', displayName: 'A' }, 'users/b': { uid: 'b', displayName: 'B' } });
  for (const id of ['a', 'b']) await PP.sincronizarPerfilPublico(db2, id);
  const primera = db2.escrituras;
  for (const id of ['a', 'b']) await PP.sincronizarPerfilPublico(db2, id);
  check('25) idempotente: una segunda pasada no escribe nada', primera === 2 && db2.escrituras === 2);
}
const relleno = leer('scripts/rellenar-perfiles-publicos.mjs');
check('26) el relleno usa la sincronización del espejo (con reintento acotado) y la comparación canónica (sin set() ciego ni JSON.stringify) y verifica al final',
  /sincronizarConReintento\(db, id\)/.test(relleno) && /planDeRelleno\(/.test(relleno) && !/lote\.set\(|\.batch\(|JSON\.stringify\(/.test(relleno)
  && /VERIFICACIÓN/.test(relleno) && /verificarRelleno\(/.test(relleno) && /'FAILED'/.test(relleno) && !/pendiente\.ids\.length === 0/.test(relleno));

/* ── Nota LOW 3 (ronda 2): huérfanas, recuentos y verificación que nunca da OK por defecto ── */
const pares = (db, col) => [...db.docs].filter(([k]) => k.startsWith(`${col}/`)).map(([k, v]) => [k.slice(col.length + 1), structuredClone(v)]);
/* El mismo recorrido que el script: plan → sincronizar con reintento → verificar sobre una lectura nueva. */
const rellenar = async (db, opciones) => {
  const plan = PP.planDeRelleno(pares(db, 'users'), pares(db, 'publicProfiles'));
  const cuenta = { igual: 0, escrita: 0, borrada: 0, fallida: 0 };
  for (const id of plan.ids) cuenta[await PP.sincronizarConReintento(db, id, opciones)]++;
  const v = PP.verificarRelleno(pares(db, 'users'), pares(db, 'publicProfiles'));
  return { plan, cuenta, v, ok: v.ok && cuenta.fallida === 0 };
};
const sinEspera = { esperar: async () => {} };
{
  const db = dbDeMentira({ 'users/a': { uid: 'a', displayName: 'A' }, 'publicProfiles/a': { uid: 'a', displayName: 'A' } });
  const r = await rellenar(db, sinEspera);
  check('N3-A) recuentos iguales y todo al día → OK sin escribir', r.ok && db.escrituras === 0 && r.v.conUid === 1 && r.v.publicos === 1);
}
{
  const db = dbDeMentira({ 'users/a': { uid: 'a', displayName: 'A' }, 'users/b': { uid: 'b', displayName: 'B', email: 'x' }, 'publicProfiles/a': { uid: 'a', displayName: 'A' } });
  const r = await rellenar(db, sinEspera);
  check('N3-B) falta una copia → se crea (con lista blanca) y queda OK', r.ok && r.cuenta.escrita === 1 && db.docs.get('publicProfiles/b').displayName === 'B' && !('email' in db.docs.get('publicProfiles/b')));
}
{
  const db = dbDeMentira({ 'users/a': { uid: 'a', displayName: 'Nueva' }, 'publicProfiles/a': { uid: 'a', displayName: 'Vieja' } });
  /* Instantánea vieja del relleno (users todavía «Vieja»), pero users ya es «Nueva»: sincroniza al estado ACTUAL. */
  const plan = PP.planDeRelleno([['a', { uid: 'a', displayName: 'Vieja2' }]], [['a', { uid: 'a', displayName: 'Vieja' }]]);
  const res = await PP.sincronizarConReintento(db, plan.ids[0], sinEspera);
  check('N3-C) desactualizada → se sincroniza con el perfil actual, sin pisar lo más reciente', res === 'escrita' && db.docs.get('publicProfiles/a').displayName === 'Nueva');
}
{
  const db = dbDeMentira({ 'users/a': { uid: 'a', displayName: 'A' }, 'publicProfiles/a': { uid: 'a', displayName: 'A' }, 'publicProfiles/z': { uid: 'z', displayName: 'Huérfana' } });
  const antes = PP.verificarRelleno(pares(db, 'users'), pares(db, 'publicProfiles'));
  const r = await rellenar(db, sinEspera);
  check('N3-D) una huérfana: la verificación previa NO da OK; el relleno la borra (solo la copia) y queda OK',
    !antes.ok && antes.huerfanos === 1 && r.plan.huerfanos === 1 && r.cuenta.borrada === 1 && !db.docs.has('publicProfiles/z') && db.docs.has('users/a') && r.ok);
}
{
  const db = dbDeMentira({ 'users/a': { uid: 'a' }, 'users/s': { displayName: 'sin uid' }, 'publicProfiles/a': { uid: 'a' },
    'publicProfiles/x': { uid: 'x' }, 'publicProfiles/y': { uid: 'y' }, 'publicProfiles/s': { displayName: 'sin uid' } });
  const r = await rellenar(db, sinEspera);
  check('N3-E) varias huérfanas (incluida la copia de un perfil sin uid) → se borran todas', r.plan.huerfanos === 3 && r.cuenta.borrada === 3 && r.ok
    && pares(db, 'publicProfiles').length === 1 && db.docs.has('users/s'));
}
{
  const v1 = PP.verificarRelleno([['a', { uid: 'a' }], ['b', { uid: 'b' }]], [['a', { uid: 'a' }]]);
  const v2 = PP.verificarRelleno([], []);
  const v3 = PP.verificarRelleno([['s', { displayName: 'sin uid' }]], []);
  const v4 = PP.verificarRelleno([['a', { uid: 'a' }]], [['a', { uid: 'a' }], ['b', { uid: 'b' }]]);
  const v5 = PP.verificarRelleno([['a', { uid: 'a', displayName: 'N' }]], [['a', { uid: 'a', displayName: 'V' }]]);
  check('N3-F) recuentos distintos, users vacío (o solo sin uid), huérfanas o desfasadas → NUNCA OK',
    !v1.ok && !v2.ok && !v3.ok && !v4.ok && !v5.ok && v2.motivos.some((m) => /no hay perfiles/.test(m)) && v4.motivos.some((m) => /recuentos/.test(m)) && v5.desfasadas === 1);
}
{
  /* Carrera: el relleno planificó borrar «n» como huérfana, pero el espejo acaba de crear users/n: NO se borra. */
  const db = dbDeMentira({ 'publicProfiles/n': { uid: 'n', displayName: 'Viejo' } });
  const plan = PP.planDeRelleno(pares(db, 'users'), pares(db, 'publicProfiles'));
  db.docs.set('users/n', { uid: 'n', displayName: 'Recién creado' });
  const res = await PP.sincronizarConReintento(db, plan.ids[0], sinEspera);
  const v = PP.verificarRelleno(pares(db, 'users'), pares(db, 'publicProfiles'));
  check('N3-G) carrera espejo/relleno: una «huérfana» cuyo perfil acaba de aparecer converge al estado actual (escrita, no borrada)',
    plan.huerfanos === 1 && res === 'escrita' && db.docs.get('publicProfiles/n').displayName === 'Recién creado' && v.ok);
}
{
  const db = dbDeMentira({ 'users/a': { uid: 'a' }, 'users/b': { uid: 'b' }, 'publicProfiles/h': { uid: 'h' } });
  const r1 = await rellenar(db, sinEspera);
  const tras1 = db.escrituras;
  const r2 = await rellenar(db, sinEspera);
  check('N3-H) idempotente: la segunda pasada no tiene nada que hacer ni escribe', r1.ok && r2.ok && r2.plan.ids.length === 0 && db.escrituras === tras1);
}
{
  let fallos = 2; let esperas = 0;
  const base = dbDeMentira({ 'users/a': { uid: 'a' } });
  const intermitente = { ...base, collection: base.collection, runTransaction: async (fn) => { if (fallos-- > 0) { const e = new Error('x'); e.code = 14; throw e; } return base.runTransaction(fn); } };
  const res = await PP.sincronizarConReintento(intermitente, 'a', { esperar: async () => { esperas++; } });
  check('N3-I) error recuperable → se reintenta (acotado) y termina bien', res === 'escrita' && esperas === 2 && base.docs.has('publicProfiles/a'));
  let llamadas = 0;
  const siempreCae = { collection: base.collection, runTransaction: async () => { llamadas++; const e = new Error('x'); e.code = 14; throw e; } };
  const agotado = await PP.sincronizarConReintento(siempreCae, 'a', { intentos: 3, esperar: async () => {} });
  check('N3-I2) …y si el error pasajero no cesa, se rinde tras los intentos (fallida), sin bucle', agotado === 'fallida' && llamadas === 3);
}
{
  let llamadas = 0;
  const base = dbDeMentira({ 'users/a': { uid: 'a' } });
  const denegado = { collection: base.collection, runTransaction: async () => { llamadas++; const e = new Error('x'); e.code = 7; throw e; } };
  const res = await PP.sincronizarConReintento(denegado, 'a', sinEspera);
  const r = await rellenar(denegado.runTransaction && { ...base, runTransaction: denegado.runTransaction }, sinEspera);
  check('N3-J) error permanente → un solo intento, fallida, y el relleno termina FAILED (no OK)', res === 'fallida' && llamadas === 2 && r.cuenta.fallida === 1 && !r.ok);
}
{
  const PRIV = { email: 'e', creditsBalance: 9, country: 'ES', language: 'es', linkedAccountId: 'l', birthDate: 'd', realName: 'r', avatarChoices: {} };
  const db = dbDeMentira({ 'users/a': { uid: 'a', displayName: 'A', ...PRIV }, 'users/b': { uid: 'b', ...PRIV }, 'publicProfiles/z': { uid: 'z', ...PRIV } });
  await rellenar(db, sinEspera);
  const copias = pares(db, 'publicProfiles');
  check('N3-K) lista blanca: después del relleno ninguna copia lleva un campo privado (ni de las huérfanas, que se borran)',
    copias.length === 2 && copias.every(([, d]) => Object.keys(d).every((k) => PP.CAMPOS_PUBLICOS_DEL_PERFIL.includes(k))));
}

console.log(`\n${ok} ✔ · ${mal} ✘`);
process.exitCode = mal ? 1 : 0;
