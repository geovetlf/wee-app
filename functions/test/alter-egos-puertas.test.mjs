/*
 * ALTER EGOS — LAS PUERTAS (plan multi alter ego, fase F4, 2026-11-23).
 *
 * `crearAlterEgo` y `retirarAlterEgo` (`functions/src/identity/alterEgos.ts`), EJECUTADAS con el Core de verdad sobre
 * un almacén de mentira y con el resto de Weë de mentira (el plan de borrado se ejecuta paso a paso):
 *
 *   A · Crear: cuenta válida, nace si hacía falta, gratis, límite, idempotente y NUNCA la cuenta en lo devuelto.
 *   B · Retirar: confirmación, sesión reciente, ajeno = no existe, borrado INMEDIATO de UNA sola cara.
 *   C · La cara heredada: se le da entidad, se retira y se le quita el vínculo; repetir retoma.
 *   D · El push dice a qué cara va (D11).
 *   E · El repo: exportadas, sin IA ni Credits, en la cadena.
 *
 * Requiere `functions/lib` recién compilado (`npm run build`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const lib = (p) => require(path.resolve(here, '../lib/' + p));

const C = lib('core/account-identity.js');
const compat = lib('identity/compatibilidad.js');
const A = lib('identity/alterEgos.js');
const avisos = lib('social/avisos.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const motivo = async (fn) => { try { await fn(); return 'ok'; } catch (e) { return e?.motivo ?? e?.code ?? e?.message; } };

let semilla = 7;
const azar = { bytes: (n) => { const out = new Uint8Array(n); for (let i = 0; i < n; i++) { semilla ^= semilla << 13; semilla ^= semilla >>> 17; semilla ^= semilla << 5; semilla >>>= 0; out[i] = semilla & 255; } return out; } };

/* El almacén de mentira del Core (como alter-egos-core), con la forma mínima de Firestore para el resolutor. */
class Base {
  constructor() { this.docs = new Map(); }
  leer(r) { const d = this.docs.get(r); return d === undefined ? null : JSON.parse(JSON.stringify(d)); }
  escribir(r, d) { this.docs.set(r, JSON.parse(JSON.stringify(d))); }
  async enTransaccion(cuerpo) {
    const escrituras = [];
    const tx = {
      leerCuenta: async (id) => this.leer(`accounts/${id}`),
      numeroTomado: async (n) => this.leer(`accountNumbers/${n}`) !== null,
      leerEntidad: async (id) => this.leer(`entities/${id}`),
      leerOperacion: async (id, k) => this.leer(`accounts/${id}/operations/${k}`),
      guardarCuenta: (c) => escrituras.push([`accounts/${c.accountId}`, c]),
      tomarNumero: (n, id, at) => escrituras.push([`accountNumbers/${n}`, { accountId: id, createdAt: at }]),
      guardarMembresia: (m) => escrituras.push([`accounts/${m.accountId}/members/${m.principalId}`, m]),
      guardarEntidad: (e) => escrituras.push([`entities/${e.entityId}`, e]),
      guardarOperacion: (id, k, entityId, at) => escrituras.push([`accounts/${id}/operations/${k}`, { entityId, createdAt: at }]),
      actualizarCuenta: (id, c) => escrituras.push([`accounts/${id}`, { ...this.leer(`accounts/${id}`), ...c }]),
      actualizarEntidad: (id, c) => escrituras.push([`entities/${id}`, { ...this.leer(`entities/${id}`), ...c }]),
      guardarPerfil: (uid, p) => escrituras.push([`users/${uid}`, p]),
    };
    const r = await cuerpo(tx);
    for (const [ruta, d] of escrituras) this.escribir(ruta, d);
    return r;
  }
  collection(n) { return { doc: (id) => ({ get: async () => { const d = this.leer(`${n}/${id}`); return { exists: d !== null, data: () => d }; } }) }; }
}

const CUENTA = 'anaAAAAAAAAAAAAAAAAAAAAAAAA1';
const OTRA = 'betoBBBBBBBBBBBBBBBBBBBBBB02';
const HEREDADA = 'hidi_' + CUENTA;
const AHORA = 1763900000000;
const AHORA_S = AHORA / 1000;

/* Un mundo: el Core de verdad + el resto de Weë (contenido por cara) que el plan de borrado va vaciando. */
function mundo({ valida = true, desactivada = false, limite = 5, heredada = false } = {}) {
  const bd = new Base();
  const contenido = new Set();
  const hechos = [];
  const apagados = [];
  bd.escribir(`users/${CUENTA}`, { uid: CUENTA, profileType: 'real', ...(heredada ? { linkedAccountId: HEREDADA } : {}), ...(desactivada ? { cuentaEstado: 'desactivada' } : {}) });
  if (heredada) { bd.escribir(`users/${HEREDADA}`, { uid: HEREDADA, profileType: 'hidi', linkedAccountId: CUENTA, joinedCommunities: ['c9'] }); contenido.add(`posts:${HEREDADA}`); }
  const entidadDe = async (perfilId) => [...bd.docs.entries()].filter(([r]) => r.startsWith('entities/')).map(([, d]) => d).find((e) => e.profileRef?.uid === perfilId) || null;
  const p = {
    ahora: () => AHORA,
    exigirCuentaValida: async (auth) => { if (!auth?.uid || !valida) throw Object.assign(new Error('ACCOUNT_REQUIRED'), { code: 'ACCOUNT_REQUIRED' }); },
    cuentaDesactivada: async (c) => bd.leer(`users/${c}`)?.cuentaEstado === 'desactivada',
    nacerCuenta: async (c, at) => { await C.asegurarCuenta(bd, azar, { principalId: c, at }); },
    crear: async (c, clave, at, datos) => {
      const r = await C.crearAlterEgo(bd, azar, { accountId: c, clave, at, limite, perfilHeredado: await compat.perfilHeredadoLeido(bd, c), perfilDe: (id) => compat.perfilNuevoDeAlterEgo(id, datos, at) });
      contenido.add(`posts:${r.uid}`);
      return r;
    },
    cuentaDe: (id) => compat.cuentaDeIdentidadLeida(bd, id),
    entidadDe,
    asegurarEntidad: async (c, perfilId, at) => ((await compat.perfilHeredadoLeido(bd, c)) === perfilId ? (await C.asegurarEntidadDeCaraWee(bd, azar, { accountId: c, perfilUid: perfilId, at })).entidad : null),
    retirar: (c, entityId, clave, at) => C.retirarAlterEgo(bd, { accountId: c, entityId, clave, at }),
    desvincular: async (c, perfilId) => {
      const perfil = bd.leer(`users/${perfilId}`);
      if (perfil && 'linkedAccountId' in perfil) { delete perfil.linkedAccountId; bd.escribir(`users/${perfilId}`, perfil); }
      const real = bd.leer(`users/${c}`);
      if (real?.linkedAccountId === perfilId) { delete real.linkedAccountId; bd.escribir(`users/${c}`, real); }
    },
    apagarPase: async (c, perfilId) => { apagados.push(perfilId); },
    comunidadesDe: async (perfilId) => bd.leer(`users/${perfilId}`)?.joinedCommunities || [],
    ejecutar: async (paso) => {
      if (m.falla && m.falla(paso)) { m.falla = null; throw new Error('se cayó la red'); }
      hechos.push(paso);
      if (paso.tipo === 'publicaciones') contenido.delete(`posts:${paso.identidad}`);
      if (paso.tipo === 'perfiles') for (const r of paso.rutas) bd.docs.delete(r);
      return 1;
    },
  };
  const m = { bd, contenido, hechos, apagados, p, motor: A.crearMotorDeAlterEgos(p), falla: null };
  return m;
}
const sesion = (uid = CUENTA, hace = 60) => ({ uid, authTime: AHORA_S - hace });
const retirada = (perfilId) => ({ perfilId, confirmacion: A.CONFIRMACION_DE_RETIRADA });

console.log('\n── A · Crear ──');
{
  const m = mundo();
  const r = await m.motor.crear({ uid: CUENTA }, { clave: 'k1', displayName: '  Lina Shade ', bio: 'Detective', avatar: 'av_3' });
  check('1) devuelve { uid, entityId } y nada más', JSON.stringify(Object.keys(r).sort()) === '["entityId","uid"]' && r.uid === r.entityId && /^ent_[0-9a-z]{26}$/.test(r.uid));
  check('2) NUNCA la cuenta, su número ni su secuencia', !JSON.stringify(r).includes(CUENTA) && !('accountNumber' in r) && !('entitySequence' in r));
  check('3) la cuenta nació (era nueva) y el alter ego es suyo, por su entidad', m.bd.leer(`accounts/${CUENTA}`)?.identidadesWee?.includes(r.uid)
    && (await compat.cuentaDeIdentidadLeida(m.bd, r.uid)) === CUENTA);
  const perfil = m.bd.leer(`users/${r.uid}`);
  check('4) su perfil público no lleva nada de la cuenta, y sí lo que eligió', perfil.displayName === 'Lina Shade' && perfil.bio === 'Detective'
    && perfil.avatarType === 'predefined' && perfil.avatarId === 'av_3' && !('linkedAccountId' in perfil) && !JSON.stringify(perfil).includes(CUENTA));
  const otra = await m.motor.crear({ uid: CUENTA }, { clave: 'k1', displayName: 'Lina Shade' });
  check('5) idempotente: la misma clave devuelve el mismo alter ego', otra.uid === r.uid && (m.bd.leer(`accounts/${CUENTA}`).identidadesWee.length === 1));
  for (let i = 2; i <= 5; i++) await m.motor.crear({ uid: CUENTA }, { clave: `k${i}`, displayName: `Cara ${i}` });
  check('6) hasta 5 (D1)…', m.bd.leer(`accounts/${CUENTA}`).identidadesWee.length === 5);
  check('7) …y el sexto se rechaza: limite-alcanzado', (await motivo(() => m.motor.crear({ uid: CUENTA }, { clave: 'k6', displayName: 'Seis' }))) === 'limite-alcanzado');
  check('8) sin cuenta Weë válida (18+, país) no se crea nada', (await motivo(() => mundo({ valida: false }).motor.crear({ uid: CUENTA }, { clave: 'k', displayName: 'X' }))) === 'ACCOUNT_REQUIRED');
  check('9) una cuenta desactivada no crea', (await motivo(() => mundo({ desactivada: true }).motor.crear({ uid: CUENTA }, { clave: 'k', displayName: 'X' }))) === 'cuentaDesactivada');
  check('10) datos inválidos: sin nombre, sin clave, nombre de más de 60, avatar raro',
    (await Promise.all([{ clave: 'k' }, { displayName: 'X' }, { clave: 'k', displayName: 'x'.repeat(61) }, { clave: 'k', displayName: 'X', avatar: 'https://x' }]
      .map((d) => motivo(() => mundo().motor.crear({ uid: CUENTA }, d))))).every((x) => x === 'datosInvalidos'));
  const h = mundo({ heredada: true, limite: 2 });
  await h.motor.crear({ uid: CUENTA }, { clave: 'h1', displayName: 'Jay' });
  check('11) la cara heredada cuenta para el límite', (await motivo(() => h.motor.crear({ uid: CUENTA }, { clave: 'h2', displayName: 'Lina' }))) === 'limite-alcanzado');
  /* Por el momento, un solo Perfil Weë (2026-11-26): con el límite en 1, el primero entra y el segundo no. */
  const uno = mundo({ limite: 1 });
  await uno.motor.crear({ uid: CUENTA }, { clave: 'u1', displayName: 'Jay' });
  check('12) límite 1: el primer Perfil Weë se crea y el segundo se rechaza', uno.bd.leer(`accounts/${CUENTA}`).identidadesWee.length === 1
    && (await motivo(() => uno.motor.crear({ uid: CUENTA }, { clave: 'u2', displayName: 'Lina' }))) === 'limite-alcanzado');
  check('13) y quien ya tiene la cara heredada no puede crear otra', (await motivo(() => mundo({ heredada: true, limite: 1 }).motor.crear({ uid: CUENTA }, { clave: 'h9', displayName: 'Otra' }))) === 'limite-alcanzado');
}

console.log('\n── B · Retirar UNA cara, en el acto ──');
{
  const m = mundo();
  const jay = await m.motor.crear({ uid: CUENTA }, { clave: 'jay', displayName: 'Jay' });
  const lina = await m.motor.crear({ uid: CUENTA }, { clave: 'lina', displayName: 'Lina' });
  check('12) sin la confirmación constante, no', (await motivo(() => m.motor.retirar(sesion(), { perfilId: jay.uid, confirmacion: 'BORRAR' }))) === 'sinConfirmacion');
  check('13) con una sesión vieja, reautenticar', (await motivo(() => m.motor.retirar(sesion(CUENTA, 11 * 60), retirada(jay.uid)))) === 'reautenticar');
  check('14) sin sesión, no', (await motivo(() => m.motor.retirar(null, retirada(jay.uid)))) === 'sinSesion');
  check('15) el Perfil Real no se retira por aquí', (await motivo(() => m.motor.retirar(sesion(), retirada(CUENTA)))) === 'alter-ego-ajeno');
  check('16) otra cuenta no retira a Jay (y no se le confirma que existe)', (await motivo(() => m.motor.retirar(sesion(OTRA), retirada(jay.uid)))) === 'alter-ego-ajeno');
  const r = await m.motor.retirar(sesion(), retirada(jay.uid));
  check('17) retira a Jay: entidad RETIRED, fuera de identidadesWee, el hueco libre', r.ok === true && r.retirada === true
    && m.bd.leer(`entities/${jay.entityId}`).status === 'RETIRED' && !m.bd.leer(`accounts/${CUENTA}`).identidadesWee.includes(jay.uid));
  check('18) su pase se apagó antes de nada', m.apagados[0] === jay.uid);
  check('19) BORRADO INMEDIATO de esa cara: publicaciones y perfil', !m.contenido.has(`posts:${jay.uid}`) && m.bd.leer(`users/${jay.uid}`) === null);
  const consulta = (col, valor) => m.hechos.some((p) => p.tipo === 'consulta' && p.coleccion === col && p.valor === valor);
  check('20) …y su ficha/material/pase, avisos, ẄContacts, follows, comunidades, WeeTalk y Storage',
    m.hechos.some((p) => p.tipo === 'personaje' && p.perfilId === jay.uid) && consulta('notifications', jay.uid) && consulta('econtacts', jay.uid)
    && consulta('follows', jay.uid) && consulta('comments', jay.uid) && m.hechos.some((p) => p.tipo === 'comunidades' && p.identidad === jay.uid)
    && m.hechos.some((p) => p.tipo === 'weetalk' && p.identidad === jay.uid)
    && ['users', 'images/posts', 'images/profile'].every((raiz) => m.hechos.some((p) => p.tipo === 'storage' && p.prefijo === `${raiz}/${jay.uid}/`)));
  check('21) sin tocar a Lina, al Perfil Real, la cuenta, Weë AI ni Auth',
    m.contenido.has(`posts:${lina.uid}`) && m.bd.leer(`users/${lina.uid}`) !== null && m.bd.leer(`users/${CUENTA}`) !== null
    && !m.hechos.some((p) => JSON.stringify(p).includes(lina.uid) || JSON.stringify(p).includes(CUENTA) || p.tipo === 'auth'));
  check('22) Jay ya no es de nadie; Lina sigue siéndolo', (await compat.cuentaDeIdentidadLeida(m.bd, jay.uid)) === null && (await compat.cuentaDeIdentidadLeida(m.bd, lina.uid)) === CUENTA);
  const nuevo = await m.motor.crear({ uid: CUENTA }, { clave: 'nuevo', displayName: 'Nuevo' });
  check('23) la secuencia de Jay no se reutiliza', m.bd.leer(`entities/${nuevo.entityId}`).entitySequence > m.bd.leer(`entities/${jay.entityId}`).entitySequence);

  /* Un corte a medias: repetir la llamada retoma lo que faltaba, aunque la cara ya no resuelva. */
  const f = mundo();
  const kai = await f.motor.crear({ uid: CUENTA }, { clave: 'kai', displayName: 'Kai' });
  f.falla = (p) => p.tipo === 'weetalk';
  check('24) si un paso falla, el error sube', (await motivo(() => f.motor.retirar(sesion(), retirada(kai.uid)))) === 'se cayó la red');
  check('25) y repetir termina el borrado (la entidad retirada dice que es suya)', (await f.motor.retirar(sesion(), retirada(kai.uid))).ok === true
    && f.bd.leer(`users/${kai.uid}`) === null && !f.contenido.has(`posts:${kai.uid}`));
  check('26) retomar no la deja retomar a otra cuenta', (await motivo(() => f.motor.retirar(sesion(OTRA), retirada(kai.uid)))) === 'alter-ego-ajeno');
}

console.log('\n── C · La cara heredada ──');
{
  const m = mundo({ heredada: true });
  await m.motor.crear({ uid: CUENTA }, { clave: 'jay', displayName: 'Jay' });
  check('27) la heredada resuelve antes de retirarla', (await compat.cuentaDeIdentidadLeida(m.bd, HEREDADA)) === CUENTA);
  const r = await m.motor.retirar(sesion(), retirada(HEREDADA));
  const entidad = Object.values(Object.fromEntries(m.bd.docs)).find((d) => d?.profileRef?.uid === HEREDADA);
  check('28) recibió su entidad (secuencia 2) y quedó RETIRED', r.ok && entidad?.entitySequence === 2 && entidad.status === 'RETIRED');
  check('29) se le quitó el vínculo al Perfil Real: el resolutor ya no la acepta', !('linkedAccountId' in m.bd.leer(`users/${CUENTA}`)) && (await compat.cuentaDeIdentidadLeida(m.bd, HEREDADA)) === null);
  check('30) y se borró con su plan (sus comunidades incluidas)', m.bd.leer(`users/${HEREDADA}`) === null && m.hechos.some((p) => p.tipo === 'comunidades' && p.comunidades.includes('c9')));
}

console.log('\n── D · El push dice a qué cara va (D11) ──');
{
  check('31) a un Perfil Weë: «Para Lina Shade: Nuevo mensaje»', avisos.tituloParaLaCara('Nuevo mensaje', 'Lina Shade', 'es') === 'Para Lina Shade: Nuevo mensaje');
  check('32) en el idioma de quien recibe', avisos.tituloParaLaCara('New message', 'Lina Shade', 'en') === 'For Lina Shade: New message');
  check('33) al Perfil Real, el título de siempre', avisos.tituloParaLaCara('Nuevo mensaje', null, 'es') === 'Nuevo mensaje');
  const idx = sinComentarios(leer('functions/src/index.ts'));
  check('34) el push resuelve con la frontera (alter egos incluidos) y pone el título en los dos disparadores',
    /cuentaDelPerfilLeido\(db, identidad/.test(idx) && (idx.match(/tituloParaLaCara\(/g) || []).length === 2 && !/cuentaDeIdentidad\(/.test(idx));
}

console.log('\n── E · El repo ──');
{
  const idx = sinComentarios(leer('functions/src/index.ts'));
  check('35) las dos callables salen de identity/alterEgos', /export \{ crearAlterEgo, retirarAlterEgo \} from '\.\/identity\/alterEgos';/.test(idx));
  const fuente = sinComentarios(leer('functions/src/identity/alterEgos.ts'));
  check('36) crear es gratis y sin IA: ni Credits ni motor', !/credit|spendCredits|engine\/router|generate/i.test(fuente.replace(/EngineError|engine\/errors/g, '')));
  check('37) la cuenta sale de la sesión, nunca de los datos', !/request\.data\??\.(uid|accountId|cuenta)/.test(fuente));
  check('38) no nombra la forma heredada', !/hidi/i.test(leer('functions/src/identity/alterEgos.ts')));
  check('39) la suite está en la cadena', leer('functions/package.json').includes('node test/alter-egos-puertas.test.mjs'));
}

console.log(`\n${failures === 0 ? 'TODO VERDE' : `${failures} FALLOS`}`);
process.exit(failures === 0 ? 0 : 1);
