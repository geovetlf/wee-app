/*
 * ALTER EGOS — EL CORE Y EL RESOLUTOR (plan multi alter ego, fase F2, 2026-11-23).
 *
 *   A · El contrato 2.1: secuencias, versiones y estados.
 *   B · Crear: límite (5 por defecto, techo 10), gratis y sin la cuenta en lo devuelto.
 *   C · Idempotencia por clave y concurrencia.
 *   D · Secuencias del contador común que nunca se reutilizan.
 *   E · La cara heredada cuenta para el límite.
 *   F · Retirar: inmediato, libera el hueco y no devuelve la secuencia.
 *   G · El resolutor `cuentaDeIdentidadLeida` con las dos formas, e `identidadesDeLaCuenta`.
 *   H · Composición y contrato de borrado para la fase 4, sin cablear.
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
const identidad = lib('core/identity.js');
const compat = lib('identity/compatibilidad.js');
const cuentas = lib('identity/cuentas.js');
const econtact = lib('social/econtact.js');
const borrado = lib('cuenta/borrado.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const lanza = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

const dados = (semilla = 1) => {
  let s = semilla >>> 0 || 1;
  return {
    bytes: (cuantos) => {
      const out = new Uint8Array(cuantos);
      for (let i = 0; i < cuantos; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; out[i] = s & 255; }
      return out;
    },
  };
};

/*
 * El mismo almacén de mentira que `cuenta-identidad.test.mjs` (transacciones que
 * se repiten si algo leído cambió), con los dos puertos de 2.1 y además la forma
 * de Firestore (`collection().doc().get()`) para el resolutor.
 */
class BaseDeMentira {
  constructor() { this.docs = new Map(); this.version = new Map(); this.commits = 0; this.abortos = 0; this.maxIntentos = 5; }
  v(ruta) { return this.version.get(ruta) || 0; }
  leer(ruta) { const d = this.docs.get(ruta); return d === undefined ? null : JSON.parse(JSON.stringify(d)); }
  escribir(ruta, datos) { this.docs.set(ruta, JSON.parse(JSON.stringify(datos))); this.version.set(ruta, this.v(ruta) + 1); }
  rutas(prefijo) { return [...this.docs.keys()].filter((r) => r.startsWith(prefijo)); }
  async enTransaccion(cuerpo) {
    for (let intento = 1; intento <= this.maxIntentos; intento++) {
      const leidos = new Map();
      const escrituras = [];
      const marcar = (ruta) => { if (!leidos.has(ruta)) leidos.set(ruta, this.v(ruta)); };
      const tx = {
        leerCuenta: async (id) => { const r = `accounts/${id}`; marcar(r); return this.leer(r); },
        numeroTomado: async (n) => { const r = `accountNumbers/${n}`; marcar(r); return this.leer(r) !== null; },
        leerEntidad: async (id) => { const r = `entities/${id}`; marcar(r); return this.leer(r); },
        leerOperacion: async (id, clave) => { const r = `accounts/${id}/operations/${clave}`; marcar(r); return this.leer(r); },
        guardarCuenta: (c) => escrituras.push(['crear', `accounts/${c.accountId}`, c]),
        tomarNumero: (n, id, at) => escrituras.push(['crear', `accountNumbers/${n}`, { accountId: id, createdAt: at }]),
        guardarMembresia: (m) => escrituras.push(['crear', `accounts/${m.accountId}/members/${m.principalId}`, m]),
        guardarEntidad: (e) => escrituras.push(['crear', `entities/${e.entityId}`, e]),
        guardarOperacion: (id, clave, entityId, at) => escrituras.push(['crear', `accounts/${id}/operations/${clave}`, { entityId, createdAt: at }]),
        actualizarCuenta: (id, campos) => escrituras.push(['actualizar', `accounts/${id}`, campos]),
        actualizarEntidad: (id, campos) => escrituras.push(['actualizar', `entities/${id}`, campos]),
        guardarPerfil: (uid, perfil) => escrituras.push(['crear', `users/${uid}`, perfil]),
      };
      const resultado = await cuerpo(tx);
      const choque = [...leidos.entries()].some(([ruta, v]) => this.v(ruta) !== v)
        || escrituras.some(([tipo, ruta]) => tipo === 'crear' && this.leer(ruta) !== null);
      if (choque) { this.abortos++; continue; }
      for (const [tipo, ruta, datos] of escrituras) {
        if (tipo === 'crear') this.escribir(ruta, datos);
        else this.escribir(ruta, { ...this.leer(ruta), ...datos });
      }
      this.commits++;
      return resultado;
    }
    throw Object.assign(new Error('transacción abortada'), { code: 10 });
  }
  /* La forma mínima de Firestore que leen el resolutor y la composición. */
  collection(n) {
    return { doc: (id) => ({ get: async () => { const d = this.leer(`${n}/${id}`); return { exists: d !== null, data: () => d }; } }) };
  }
}

const CUENTA_A = 'anaAAAAAAAAAAAAAAAAAAAAAAAA1';
const CUENTA_B = 'betoBBBBBBBBBBBBBBBBBBBBBB02';
const HEREDADA_A = 'hidi_' + CUENTA_A;
const AHORA = 1763900000000;
const perfil = (nombre) => (entityId) => compat.perfilNuevoDeAlterEgo(entityId, { displayName: nombre }, AHORA);
const crear = (bd, semilla, clave, extra = {}) => C.crearAlterEgo(bd, dados(semilla), {
  accountId: CUENTA_A, clave, at: AHORA, limite: 5, perfilDe: perfil(clave), ...extra,
});
const nacer = async (bd, cuenta = CUENTA_A, semilla = 1) => C.asegurarCuenta(bd, dados(semilla), { principalId: cuenta, at: AHORA });
const motivo = (e) => (e && e.name === 'AlterEgoRechazado' ? e.motivo : e?.message);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El contrato 2.1 ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ent = (tipo, sec) => ({ contract: '2.1', entityId: C.idDeEntidadDesdeBytes(dados(sec).bytes(26)), ownerAccountId: CUENTA_A,
    entityType: tipo, entitySequence: sec, status: 'ACTIVE', createdAt: AHORA, updatedAt: AHORA });
  check('1) la versión del contrato de cuenta es 2.1', C.ACCOUNT_IDENTITY_CONTRACT_VERSION === '2.1');
  check('2) secuencia 1 solo admite el Perfil Real',
    C.entidadDeCuentaValida(ent('REAL_PROFILE', 1)) && !C.entidadDeCuentaValida(ent('WEE_PROFILE', 1)) && !C.entidadDeCuentaValida(ent('PAGE', 1)));
  check('3) secuencia 2 solo admite el Perfil Weë',
    C.entidadDeCuentaValida(ent('WEE_PROFILE', 2)) && !C.entidadDeCuentaValida(ent('PAGE', 2)) && !C.entidadDeCuentaValida(ent('REAL_PROFILE', 2)));
  check('4) de la 3 en adelante, Página O Perfil Weë: manda el tipo guardado',
    [3, 4, 9, 27].every((s) => C.entidadDeCuentaValida(ent('PAGE', s)) && C.entidadDeCuentaValida(ent('WEE_PROFILE', s)) && !C.entidadDeCuentaValida(ent('REAL_PROFILE', s))));
  check('5) tipoPorSecuencia sigue siendo solo para crear: la 3 sigue siendo Página',
    identidad.tipoPorSecuencia(3) === 'PAGE' && identidad.tiposAdmitidosPorSecuencia(3).join() === 'PAGE,WEE_PROFILE');
  check('6) los lectores aceptan 2.0 y 2.1, y nada más',
    C.entidadDeCuentaValida({ ...ent('WEE_PROFILE', 2), contract: '2.0' }) && C.entidadDeCuentaValida(ent('WEE_PROFILE', 2))
    && !C.entidadDeCuentaValida({ ...ent('WEE_PROFILE', 2), contract: '1.0' }) && !C.entidadDeCuentaValida({ ...ent('WEE_PROFILE', 2), contract: '3.0' }));
  check('7) RETIRED es un estado válido de entidad; uno inventado no',
    C.entidadDeCuentaValida({ ...ent('WEE_PROFILE', 4), status: 'RETIRED' }) && !C.entidadDeCuentaValida({ ...ent('WEE_PROFILE', 4), status: 'BORRADA' }));
  const bd = new BaseDeMentira();
  const { cuenta } = await nacer(bd);
  check('8) una cuenta 2.0 sin listas sigue siendo válida',
    C.cuentaWeeValida({ ...cuenta, contract: '2.0' }) && !('identidadesWee' in cuenta));
  check('9) las listas de 2.1, si están, sin repetidos ni barras',
    C.cuentaWeeValida({ ...cuenta, identidadesWee: [HEREDADA_A], weeProfileEntityIds: [] })
    && !C.cuentaWeeValida({ ...cuenta, identidadesWee: [HEREDADA_A, HEREDADA_A] })
    && !C.cuentaWeeValida({ ...cuenta, identidadesWee: ['a/b'] })
    && !C.cuentaWeeValida({ ...cuenta, weeProfileEntityIds: ['hidi_x'] }));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Crear: límite y techo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('10) por defecto, 1 por cuenta (decisión 2026-11-26); techo 10 en el código',
    C.ALTER_EGOS_POR_CUENTA_POR_DEFECTO === 1 && C.TECHO_DE_ALTER_EGOS_POR_CUENTA === 10 && C.limiteDeAlterEgos(undefined) === 1);
  check('11) la configuración puede bajar o subir hasta el techo, pero nunca pasarlo',
    C.limiteDeAlterEgos(3) === 3 && C.limiteDeAlterEgos(0) === 0 && C.limiteDeAlterEgos(10) === 10
    && C.limiteDeAlterEgos(11) === 10 && C.limiteDeAlterEgos(1000) === 10);
  check('12) lo que no es un entero ≥0 vale el de por defecto',
    [-1, 2.5, '7', null, NaN, {}].every((v) => C.limiteDeAlterEgos(v) === C.ALTER_EGOS_POR_CUENTA_POR_DEFECTO));

  const bd = new BaseDeMentira();
  await nacer(bd);
  const hechos = [];
  for (let i = 0; i < 5; i++) hechos.push(await crear(bd, 10 + i, `k${i}`));
  const sexto = await lanza(() => crear(bd, 20, 'k5'));
  check('13) cinco se crean; el sexto choca con el límite', hechos.every((h) => h.creada) && motivo(sexto) === 'limite-alcanzado');
  check('14) y el rechazo no escribe nada', bd.rutas('entities/').length === 6 && bd.rutas('users/').length === 5);

  const cuenta = bd.leer(`accounts/${CUENTA_A}`);
  check('15) la cuenta guarda los cinco en identidadesWee y weeProfileEntityIds, y pasa a 2.1',
    cuenta.identidadesWee.length === 5 && cuenta.weeProfileEntityIds.length === 5 && cuenta.contract === '2.1'
    && hechos.every((h) => cuenta.identidadesWee.includes(h.uid) && cuenta.weeProfileEntityIds.includes(h.entityId))
    && C.cuentaWeeValida(cuenta));
  check('16) la ranura de la secuencia 2 no se toca', cuenta.weeProfileEntityId === undefined);

  const e = bd.leer(`entities/${hechos[0].entityId}`);
  const u = bd.leer(`users/${hechos[0].uid}`);
  check('17) la entidad: WEE_PROFILE, ACTIVE, de la cuenta y apuntando a su propio perfil',
    e.entityType === 'WEE_PROFILE' && e.status === 'ACTIVE' && e.ownerAccountId === CUENTA_A
    && e.profileRef.coleccion === 'users' && e.profileRef.uid === hechos[0].entityId && C.entidadDeCuentaValida(e));
  check('18) el perfil: uid = entityId, profileType heredado de Perfil Weë y SIN vínculo con la cuenta',
    u.uid === hechos[0].entityId && u.entityId === hechos[0].entityId && u.profileType === 'hidi'
    && !('linkedAccountId' in u) && !JSON.stringify(u).includes(CUENTA_A) && !JSON.stringify(u).includes(cuenta.accountNumber));
  check('19) el uid devuelto es un identificador de entidad opaco y una identidad válida',
    hechos.every((h) => h.uid === h.entityId && C.esIdDeEntidad(h.uid) && econtact.esIdentidadValida(h.uid)));
  check('20) NUNCA sale la cuenta en lo devuelto: solo uid, entityId y creada',
    hechos.every((h) => Object.keys(h).sort().join() === 'creada,entityId,uid'
      && !JSON.stringify(h).includes(CUENTA_A) && !JSON.stringify(h).includes(cuenta.accountNumber)));

  const bd3 = new BaseDeMentira();
  await nacer(bd3);
  for (let i = 0; i < 2; i++) await crear(bd3, 30 + i, `c${i}`, { limite: 2 });
  check('21) un límite configurado más bajo se respeta', motivo(await lanza(() => crear(bd3, 40, 'c2', { limite: 2 }))) === 'limite-alcanzado');
  const bd10 = new BaseDeMentira();
  await nacer(bd10);
  for (let i = 0; i < 10; i++) await crear(bd10, 50 + i, `t${i}`, { limite: 99 });
  check('22) un límite que pasa del techo se queda en 10', motivo(await lanza(() => crear(bd10, 70, 't10', { limite: 99 }))) === 'limite-alcanzado'
    && bd10.leer(`accounts/${CUENTA_A}`).identidadesWee.length === 10);
  check('23) sin cuenta nacida no se crea nada', motivo(await lanza(() => C.crearAlterEgo(new BaseDeMentira(), dados(1), {
    accountId: CUENTA_B, clave: 'x', at: AHORA, limite: 5, perfilDe: perfil('x') }))) === 'cuenta-no-nacida');
  check('24) un perfil que lleva la cuenta, o un uid que no es su entidad, se rechaza',
    motivo(await lanza(() => crear(bd3, 80, 'mal1', { limite: 9, perfilDe: (id) => ({ ...perfil('m')(id), linkedAccountId: CUENTA_A }) }))) === 'perfil-invalido'
    && motivo(await lanza(() => crear(bd3, 81, 'mal2', { limite: 9, perfilDe: (id) => ({ ...perfil('m')(id), uid: CUENTA_A }) }))) === 'perfil-invalido'
    && bd3.leer(`accounts/${CUENTA_A}`).identidadesWee.length === 2);
  check('25) crear es gratis: el Core no sabe de Credits', !/credit|spendCredits|saldo/i.test(sinComentarios(leer('functions/src/core/account-identity.ts'))));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Idempotencia por clave ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  await nacer(bd);
  const uno = await crear(bd, 100, 'misma');
  const dos = await crear(bd, 101, 'misma');
  check('26) la misma clave devuelve el mismo alter ego y no crea otro',
    uno.creada && !dos.creada && dos.entityId === uno.entityId && dos.uid === uno.uid
    && bd.rutas('users/').length === 1 && bd.leer(`accounts/${CUENTA_A}`).identidadesWee.length === 1);
  bd.maxIntentos = 200;
  const diez = await Promise.all(Array.from({ length: 10 }, (_, i) => crear(bd, 110 + i, 'lote')));
  check('27) diez peticiones a la vez con la misma clave: uno solo',
    diez.filter((x) => x.creada).length === 1 && new Set(diez.map((x) => x.entityId)).size === 1 && bd.rutas('users/').length === 2);
  const bdl = new BaseDeMentira();
  bdl.maxIntentos = 200;
  await nacer(bdl);
  const muchas = await Promise.all(Array.from({ length: 8 }, (_, i) => crear(bdl, 200 + i, `par${i}`).catch((e) => e)));
  check('28) ocho claves distintas a la vez contra un límite de 5: exactamente 5 entran',
    muchas.filter((x) => x && x.creada).length === 5 && muchas.filter((x) => motivo(x) === 'limite-alcanzado').length === 3
    && bdl.leer(`accounts/${CUENTA_A}`).identidadesWee.length === 5, `${bdl.abortos} reintentos`);
  await C.crearPagina(bd, dados(300), { accountId: CUENTA_A, clave: 'pagina1', at: AHORA });
  check('29) una clave ya usada para crear una Página no fabrica un alter ego',
    motivo(await lanza(() => crear(bd, 301, 'pagina1'))) === 'clave-de-otra-operacion');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Secuencias que no se reutilizan ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  await nacer(bd);
  const a = await crear(bd, 400, 'a');
  const p = await C.crearPagina(bd, dados(401), { accountId: CUENTA_A, clave: 'p', at: AHORA });
  const b = await crear(bd, 402, 'b');
  const sec = (x) => bd.leer(`entities/${x.entityId}`).entitySequence;
  check('30) alter egos y Páginas comparten el contador común desde la 3',
    sec(a) === 3 && p.entidad.entitySequence === 4 && sec(b) === 5 && bd.leer(`accounts/${CUENTA_A}`).nextPageSequence === 6);
  await C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: a.entityId, clave: 'r-a', at: AHORA });
  const c = await crear(bd, 403, 'c');
  check('31) retirar uno no devuelve su secuencia: el siguiente toma la 6', sec(c) === 6 && sec(a) === 3);
  check('32) la secuencia 2 sigue reservada para la cara heredada',
    (await C.asegurarEntidadDeCaraWee(bd, dados(404), { accountId: CUENTA_A, perfilUid: HEREDADA_A, at: AHORA })).entidad.entitySequence === 2);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · La cara heredada cuenta para el límite ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Cuenta nacida con su cara heredada como entidad 2, sin listas (2.0). */
  const bd = new BaseDeMentira();
  await nacer(bd);
  const e2 = await C.asegurarEntidadDeCaraWee(bd, dados(500), { accountId: CUENTA_A, perfilUid: HEREDADA_A, at: AHORA });
  for (let i = 0; i < 4; i++) await crear(bd, 510 + i, `h${i}`);
  const cuenta = bd.leer(`accounts/${CUENTA_A}`);
  check('33) la cara heredada entra en identidadesWee y weeProfileEntityIds al crear el primer alter ego',
    cuenta.identidadesWee[0] === HEREDADA_A && cuenta.weeProfileEntityIds[0] === e2.entidad.entityId);
  check('34) y cuenta: heredada + 4 = 5, el siguiente choca', cuenta.identidadesWee.length === 5
    && motivo(await lanza(() => crear(bd, 520, 'h4'))) === 'limite-alcanzado');

  /* Cuenta cuya cara heredada aún no tiene entidad: la frontera la pasa LEÍDA. */
  const bd2 = new BaseDeMentira();
  await nacer(bd2);
  for (let i = 0; i < 4; i++) await crear(bd2, 530 + i, `s${i}`, { perfilHeredado: HEREDADA_A });
  check('35) sin entidad, la heredada leída de los datos también cuenta',
    bd2.leer(`accounts/${CUENTA_A}`).identidadesWee.includes(HEREDADA_A)
    && motivo(await lanza(() => crear(bd2, 540, 's4', { perfilHeredado: HEREDADA_A }))) === 'limite-alcanzado');

  /* La frontera solo la pasa si el documento existe y su vínculo lo confirma. */
  const bd3 = new BaseDeMentira();
  check('36) perfilHeredadoLeido: sin documento, nada', (await compat.perfilHeredadoLeido(bd3, CUENTA_A)) === undefined);
  bd3.escribir(`users/${HEREDADA_A}`, { uid: HEREDADA_A, profileType: 'hidi', linkedAccountId: CUENTA_B });
  check('37) con un vínculo que no cuadra, nada', (await compat.perfilHeredadoLeido(bd3, CUENTA_A)) === undefined);
  bd3.escribir(`users/${HEREDADA_A}`, { uid: HEREDADA_A, profileType: 'hidi', linkedAccountId: CUENTA_A });
  check('38) con el documento y su vínculo, el uid heredado', (await compat.perfilHeredadoLeido(bd3, CUENTA_A)) === HEREDADA_A);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Retirar: inmediato y libera el hueco ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  await nacer(bd);
  await nacer(bd, CUENTA_B, 2);
  const egos = [];
  for (let i = 0; i < 5; i++) egos.push(await crear(bd, 600 + i, `f${i}`));
  const r = await C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: egos[2].entityId, clave: 'ret1', at: AHORA + 1 });
  const cuenta = bd.leer(`accounts/${CUENTA_A}`);
  check('39) la entidad pasa a RETIRED en el acto (sin 30 días)', r.retirada && bd.leer(`entities/${egos[2].entityId}`).status === 'RETIRED');
  check('40) sale de identidadesWee y de weeProfileEntityIds',
    !cuenta.identidadesWee.includes(egos[2].uid) && !cuenta.weeProfileEntityIds.includes(egos[2].entityId) && cuenta.identidadesWee.length === 4);
  check('41) lo devuelto es el uid y la entidad, nunca la cuenta',
    Object.keys(r).sort().join() === 'entityId,retirada,uid' && r.uid === egos[2].uid && !JSON.stringify(r).includes(CUENTA_A));
  const nuevo = await crear(bd, 610, 'f5');
  check('42) el hueco queda libre: se puede crear otro', nuevo.creada && bd.leer(`accounts/${CUENTA_A}`).identidadesWee.length === 5);
  const otraVez = await C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: egos[2].entityId, clave: 'ret1', at: AHORA + 2 });
  const otraClave = await C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: egos[2].entityId, clave: 'ret2', at: AHORA + 3 });
  check('43) retirar otra vez es idempotente, con la misma clave o con otra', !otraVez.retirada && !otraClave.retirada
    && bd.leer(`accounts/${CUENTA_A}`).identidadesWee.length === 5);
  check('44) retirar el alter ego de OTRA cuenta no se puede, y no dice si existe',
    motivo(await lanza(() => C.retirarAlterEgo(bd, { accountId: CUENTA_B, entityId: egos[0].entityId, clave: 'x', at: AHORA }))) === 'alter-ego-ajeno'
    && bd.leer(`entities/${egos[0].entityId}`).status === 'ACTIVE'
    && motivo(await lanza(() => C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: C.idDeEntidadDesdeBytes(dados(9999).bytes(26)), clave: 'y', at: AHORA }))) === 'alter-ego-ajeno');
  check('45) ni retirar el Perfil Real ni una Página por esta puerta', await (async () => {
    const real = bd.leer(`accounts/${CUENTA_A}`).realProfileEntityId;
    const pag = await C.crearPagina(bd, dados(620), { accountId: CUENTA_A, clave: 'pg', at: AHORA });
    return motivo(await lanza(() => C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: real, clave: 'z1', at: AHORA }))) === 'alter-ego-ajeno'
      && motivo(await lanza(() => C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: pag.entidad.entityId, clave: 'z2', at: AHORA }))) === 'alter-ego-ajeno';
  })());
  check('46) la misma clave no crea y retira: las retiradas van en su propio espacio',
    motivo(await lanza(() => C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: egos[0].entityId, clave: 'ret1', at: AHORA }))) === 'clave-de-otra-operacion'
    && bd.leer(`entities/${egos[0].entityId}`).status === 'ACTIVE');

  /* La heredada también se puede retirar, y su ranura 2 no vuelve a darse. */
  const bdh = new BaseDeMentira();
  await nacer(bdh);
  const e2 = await C.asegurarEntidadDeCaraWee(bdh, dados(700), { accountId: CUENTA_A, perfilUid: HEREDADA_A, at: AHORA });
  await crear(bdh, 701, 'x1');
  await C.retirarAlterEgo(bdh, { accountId: CUENTA_A, entityId: e2.entidad.entityId, clave: 'rh', at: AHORA });
  const ch = bdh.leer(`accounts/${CUENTA_A}`);
  check('47) retirar la heredada la saca de las listas y deja su ranura (la 2 no se reutiliza)',
    !ch.identidadesWee.includes(HEREDADA_A) && ch.weeProfileEntityId === e2.entidad.entityId && ch.identidadesWee.length === 1);
  await crear(bdh, 702, 'x2', { perfilHeredado: HEREDADA_A });
  check('48) y una heredada retirada ya no vuelve a contar aunque la frontera la pase',
    !bdh.leer(`accounts/${CUENTA_A}`).identidadesWee.includes(HEREDADA_A));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · El resolutor: las dos formas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new BaseDeMentira();
  await nacer(bd);
  await nacer(bd, CUENTA_B, 2);
  bd.escribir(`users/${CUENTA_A}`, { uid: CUENTA_A, profileType: 'real' });
  bd.escribir(`users/${HEREDADA_A}`, { uid: HEREDADA_A, profileType: 'hidi', linkedAccountId: CUENTA_A });
  const jay = await crear(bd, 800, 'jay');
  const lina = await crear(bd, 801, 'lina');
  const ajeno = await C.crearAlterEgo(bd, dados(802), { accountId: CUENTA_B, clave: 'b1', at: AHORA, limite: 5, perfilDe: perfil('b') });
  const leida = (id) => compat.cuentaDeIdentidadLeida(bd, id);

  check('49) el Perfil Real se resuelve como hoy', (await leida(CUENTA_A)) === CUENTA_A);
  check('50) la cara heredada con su vínculo, como hoy', (await leida(HEREDADA_A)) === CUENTA_A);
  check('51) un alter ego opaco se resuelve por su entidad', (await leida(jay.uid)) === CUENTA_A && (await leida(lina.uid)) === CUENTA_A);
  check('52) el de otra cuenta resuelve a SU cuenta, no a la tuya', (await leida(ajeno.uid)) === CUENTA_B);
  await C.retirarAlterEgo(bd, { accountId: CUENTA_A, entityId: lina.entityId, clave: 'rl', at: AHORA });
  check('53) un alter ego RETIRED no resuelve', (await leida(lina.uid)) === null);
  const falso = C.idDeEntidadDesdeBytes(dados(803).bytes(26));
  bd.escribir(`users/${falso}`, { uid: falso, entityId: falso, profileType: 'hidi' });
  check('54) un ent_ sin entidad no es de nadie: la forma no basta', (await leida(falso)) === null);
  bd.escribir(`users/${falso}`, { uid: falso, entityId: ajeno.entityId, profileType: 'hidi' });
  check('55) un perfil que apunta a la entidad de OTRO no se la apropia (profileRef.uid no cuadra)', (await leida(falso)) === null);
  bd.escribir(`users/${falso}`, { uid: falso, entityId: falso, profileType: 'hidi', linkedAccountId: CUENTA_A });
  check('56) ni un ent_ que se declara vinculado a una cuenta', (await leida(falso)) === null);
  const otro = { ...bd.leer(`users/${jay.uid}`), profileType: 'real' };
  bd.escribir(`users/${jay.uid}`, otro);
  check('57) el tipo sale del campo guardado: un alter ego que dice ser Real no resuelve', (await leida(jay.uid)) === null);
  bd.escribir(`users/${jay.uid}`, { ...otro, profileType: 'hidi' });
  const ent = bd.leer(`entities/${jay.entityId}`);
  bd.escribir(`entities/${jay.entityId}`, { ...ent, entityType: 'PAGE' });
  check('58) una entidad que no es WEE_PROFILE no da cuenta', (await leida(jay.uid)) === null);
  bd.escribir(`entities/${jay.entityId}`, ent);
  check('59) restaurada, vuelve a resolver', (await leida(jay.uid)) === CUENTA_A);
  check('60) basura o ids mal formados no resuelven',
    (await leida('ent_a_b')) === null && (await leida('')) === null && (await leida(null)) === null && (await leida('hidi_' + CUENTA_B)) === null);

  const todas = await compat.identidadesDeLaCuenta(bd, CUENTA_A);
  check('61) identidadesDeLaCuenta: las heredadas más los alter egos vivos',
    todas[0] === CUENTA_A && todas[1] === HEREDADA_A && todas.includes(jay.uid) && !todas.includes(lina.uid) && !todas.includes(ajeno.uid));
  check('62) sin documento de cuenta se queda en lo heredado; y con un id inválido, nada',
    (await compat.identidadesDeLaCuenta(new BaseDeMentira(), CUENTA_A)).join() === [CUENTA_A, HEREDADA_A].join()
    && (await compat.identidadesDeLaCuenta(bd, 'hidi_x')).length === 0);
  check('63) identidadesHeredadasDeLaCuenta se queda tal cual', compat.identidadesHeredadasDeLaCuenta(CUENTA_A).join() === [CUENTA_A, HEREDADA_A].join());
  check('64) FORMA_DE_IDENTIDAD admite las dos formas, y sigue sin `_` propio',
    econtact.esIdentidadValida(jay.uid) && econtact.esIdentidadValida(HEREDADA_A) && econtact.esIdentidadValida(CUENTA_A)
    && !econtact.esIdentidadValida('ent_a_b') && !econtact.esIdentidadValida('hidi_ent_x') && !econtact.esIdentidadValida('ent_')
    && !econtact.esIdentidadValida('uid_raro'));
  check('65) tipoDeIdentidad: ent_ es una pista de enrutado hacia Weë, documentada',
    econtact.tipoDeIdentidad(jay.uid) === 'wee' && econtact.tipoDeIdentidad(CUENTA_A) === 'real'
    && /PISTA DE ENRUTADO/.test(leer('functions/src/social/econtact.ts')));
  check('66) la versión síncrona sigue siendo solo para lo heredado: un ent_ da null',
    econtact.cuentaDeIdentidad(jay.uid, bd.leer(`users/${jay.uid}`)) === null);
  check('67) la frontera no recorta identificadores ni decide por el prefijo ent_',
    !/startsWith\(\s*['"`]ent_|PREFIJO_ALTER_EGO|replace\(\s*['"`]ent_|\.slice\(4\)/.test(sinComentarios(leer('functions/src/identity/compatibilidad.ts'))));
  check('68) y nada en el servidor parte un id por `_`', (() => {
    const sucios = [];
    const recorrer = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) recorrer(p);
        else if (e.name.endsWith('.ts') && /\.split\(\s*(['"`])_\1\s*\)|\.split\(\s*\/_\/\s*\)/.test(sinComentarios(fs.readFileSync(p, 'utf8')))) sucios.push(p);
      }
    };
    recorrer(path.resolve(here, '../src'));
    return sucios.length === 0;
  })());
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Sin cablear, y el contrato para la fase 4 ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const indice = leer('functions/src/index.ts');
  /* F4: las dos callables salen de `identity/alterEgos`, y de ningún otro sitio. */
  check('69) las callables de alter egos salen de identity/alterEgos y de nada más',
    /export \{ crearAlterEgo, retirarAlterEgo \} from '\.\/identity\/alterEgos';/.test(indice)
    && (indice.match(/crearAlterEgo/g) || []).length === 1 && (indice.match(/retirarAlterEgo/g) || []).length === 1);
  const usos = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.ts') && /cuentaDeIdentidadLeida|identidadesDeLaCuenta\(|crearAlterEgoEnWee|retirarAlterEgoEnWee|planDeBorradoDeUnAlterEgo/.test(sinComentarios(fs.readFileSync(p, 'utf8')))) usos.push(path.relative(path.resolve(here, '../src'), p).replace(/\\/g, '/'));
    }
  };
  recorrer(path.resolve(here, '../src'));
  /* F4: además, los sitios cableados del plan (§1.3): las puertas, el borrado, WeeTalk, Boost y la publicación. */
  check('70) solo lo nombran el Core, la frontera, la composición, las puertas y los sitios cableados en F4',
    usos.every((u) => ['core/account-identity.ts', 'identity/compatibilidad.ts', 'identity/cuentas.ts', 'cuenta/borrado.ts',
      'identity/alterEgos.ts', 'cuenta/almacenFirestore.ts', 'social/weetalk.ts', 'boost/motor.ts', 'creator/publicacion.ts',
      /* WITE (2026-11-26): un personaje solo se usa si es un Perfil Weë DE la cuenta, con la regla única de identidades. */
      'wite/personajes.ts'].includes(u)), usos.join(' '));
  check('71) el Core sigue sin nombrar la identidad heredada',
    !/hidi/i.test(leer('functions/src/core/account-identity.ts')) && !/hidi/i.test(leer('functions/src/core/identity.ts'))
    && !/hidi/i.test(leer('functions/src/identity/cuentas.ts')));
  check('72) ni reloj ni dados en el Core', !/Date\.now\(|Math\.random\(|new Date\(/.test(leer('functions/src/core/account-identity.ts')));
  check('73) sin `misma-persona` ni bloqueos nuevos entre caras propias (D6)',
    !/misma-persona|mismaPersona|mismaCuenta/.test(sinComentarios(leer('functions/src/core/account-identity.ts')))
    && !/misma-persona/.test(sinComentarios(leer('functions/src/identity/compatibilidad.ts'))));
  check('74) sin `personajes[]` en Weë Pages (D9)', !/personajes/.test(sinComentarios(leer('functions/src/social/pages.ts'))));

  const plan = borrado.planDeBorradoDeUnAlterEgo('ent_x', ['c1']);
  check('75) el plan de borrado de UN alter ego solo toca esa cara',
    plan.some((p) => p.tipo === 'personaje' && p.perfilId === 'ent_x') && plan.some((p) => p.tipo === 'publicaciones' && p.identidad === 'ent_x')
    && plan.some((p) => p.tipo === 'consulta' && p.coleccion === 'econtacts' && p.valor === 'ent_x')
    && plan.some((p) => p.tipo === 'storage' && p.prefijo === 'images/profile/ent_x/')
    && plan.some((p) => p.tipo === 'perfiles' && p.rutas.join() === 'users/ent_x')
    && plan.every((p) => p.tipo !== 'auth' && !(p.tipo === 'documento' && /^accounts\//.test(p.ruta))
      && !(p.tipo === 'consulta' && ['entities', 'accountNumbers', 'creatorJobs', 'assets'].includes(p.coleccion))));

  /* La composición sobre Firestore, con el límite leído de la configuración. */
  const bd = new BaseDeMentira();
  await nacer(bd);
  check('76) sin configuración, el límite es 1', (await cuentas.limiteDeAlterEgosEnWee(bd)) === 1);
  bd.escribir('identitySettings/limites', { alterEgosPorCuenta: 50 });
  check('77) una configuración por encima del techo se queda en 10', (await cuentas.limiteDeAlterEgosEnWee(bd)) === 10);
  bd.escribir('identitySettings/limites', { alterEgosPorCuenta: 2 });
  check('78) y una más baja se respeta', (await cuentas.limiteDeAlterEgosEnWee(bd)) === 2);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
