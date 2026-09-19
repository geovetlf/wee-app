/*
 * EL NACIMIENTO DE UNA CUENTA, CABLEADO, Y LA FRONTERA CON LA IDENTIDAD
 * HEREDADA (Fase 11.x-5A).
 *
 * Este archivo probaba el seam de la Fase 11.x-2 —cuentas numeradas desde un
 * contador global, con el identificador de cada entidad formado pegando el
 * número de la cuenta y su secuencia—. Ese seam se RETIRÓ entero y lo que se
 * prueba aquí ahora es lo que ocupa su sitio:
 *
 *   A · La decisión, pura: qué hace el servidor con cada documento de `users`
 *       recién creado, sin base de datos de por medio.
 *   B · La frontera de compatibilidad: lo heredado entra, y sale vocabulario de
 *       hoy —REAL_PROFILE, WEE_PROFILE, Account, Entity—.
 *   C · Principal → cuenta: dueño, miembro, no autorizado y membresía inactiva.
 *   D · El cableado sobre un Firestore de mentira: qué documentos se escriben,
 *       y sobre todo cuáles NO.
 *   E · Que esto no es una migración, ni puede convertirse en una sin querer.
 *   F · Que lo retirado no dejó rastro.
 *
 * Requiere `npm run build`: lee `functions/lib`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const lib = (p) => require(path.resolve(here, '../lib/' + p));

const nacimiento = lib('identity/nacimiento.js');
const compat = lib('identity/compatibilidad.js');
const cuentas = lib('identity/cuentas.js');
const C = lib('core/account-identity.js');

const AHORA = 1_700_000_000_000;
const CUENTA = 'OEv4FAhfbAN0sFoFiHG0ZG2GK3r2';
const OTRA = 'ZZv4FAhfbAN0sFoFiHG0ZG2GK3r9';
/* Cómo nombran los datos ya escritos a la cara Weë de esa cuenta. Dato, no concepto. */
const CARA_HEREDADA = 'hidi_' + CUENTA;

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Un Firestore de mentira, con transacciones que se repiten de verdad ──── */
class FirestoreDeMentira {
  constructor() { this.docs = new Map(); this.escrituras = []; this.transacciones = 0; }
  #ref(ruta) {
    const bd = this;
    return {
      path: ruta,
      get id() { return ruta.split('/').pop(); },
      collection: (n) => ({ doc: (id) => bd.#ref(`${ruta}/${n}/${id}`) }),
      get: async () => ({ exists: bd.docs.has(ruta), data: () => bd.docs.get(ruta) }),
    };
  }
  collection(n) { return { doc: (id) => this.#ref(`${n}/${id}`) }; }
  doc(ruta) { return this.#ref(ruta); }
  async runTransaction(cuerpo) {
    this.transacciones++;
    const pendientes = [];
    const tx = {
      get: async (ref) => ({ exists: this.docs.has(ref.path), data: () => this.docs.get(ref.path) }),
      set: (ref, datos) => pendientes.push(() => { this.docs.set(ref.path, { ...datos }); this.escrituras.push(['set', ref.path]); }),
      create: (ref, datos) => pendientes.push(() => {
        if (this.docs.has(ref.path)) throw new Error('ALREADY_EXISTS ' + ref.path);
        this.docs.set(ref.path, { ...datos }); this.escrituras.push(['create', ref.path]);
      }),
      update: (ref, datos) => pendientes.push(() => {
        if (!this.docs.has(ref.path)) throw new Error('NOT_FOUND ' + ref.path);
        this.docs.set(ref.path, { ...this.docs.get(ref.path), ...datos }); this.escrituras.push(['update', ref.path]);
      }),
    };
    const r = await cuerpo(tx);
    for (const p of pendientes) p();
    return r;
  }
  rutas(prefijo) { return [...this.docs.keys()].filter((k) => k.startsWith(prefijo)); }
}

/* Documentos de `users` tal como están escritos hoy. */
const perfilReal = (extra = {}) => ({ uid: CUENTA, profileType: 'real', ...extra });
const perfilRealAntiguo = () => ({ uid: CUENTA });
const perfilWee = (extra = {}) => ({ uid: CARA_HEREDADA, profileType: 'hidi', linkedAccountId: CUENTA, ...extra });

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La decisión, pura: qué se hace con cada documento nuevo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const d = nacimiento.decisionDeNacimiento;
  check('1) un Perfil Real nuevo hace nacer su cuenta',
    d(perfilReal()).accion === 'NACER_LA_CUENTA' && d(perfilReal()).accountId === CUENTA && d(perfilReal()).perfilUid === CUENTA);
  check('2) un Perfil Real antiguo sin `profileType` también: el vínculo dice lo mismo',
    d(perfilRealAntiguo()).accion === 'NACER_LA_CUENTA' && d(perfilRealAntiguo()).accountId === CUENTA);
  check('3) una cara Weë nueva añade la entidad, y su cuenta se LEE del vínculo',
    d(perfilWee()).accion === 'ANADIR_LA_CARA_WEE' && d(perfilWee()).accountId === CUENTA
    && d(perfilWee()).perfilUid === CARA_HEREDADA);
  check('4) un documento que se contradice no es de nadie y no hace nada',
    [
      { uid: CARA_HEREDADA, profileType: 'hidi', linkedAccountId: OTRA },  // el vínculo no cuadra con el uid
      { uid: CARA_HEREDADA, profileType: 'hidi' },                          // sin vínculo
      { uid: CARA_HEREDADA, profileType: 'real', linkedAccountId: CUENTA }, // dice ser real llevando otra forma
      { uid: CUENTA, profileType: 'hidi', linkedAccountId: CUENTA },        // dice ser cara siendo la cuenta
      { uid: CUENTA, profileType: 'biz' },                                  // una identidad que ya no existe
      { uid: '' }, {}, null, undefined,
    ].every((p) => d(p).accion === 'NADA'));
  check('5) la decisión es pura: ni reloj, ni azar, ni base de datos',
    !/Date\.now\(|Math\.random\(|db\./.test(
      leer('functions/src/identity/nacimiento.ts').split('export const decisionDeNacimiento')[1].split('export const nacerLoQueTocaDeUnPerfilNuevo')[0]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · La frontera con la identidad heredada ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const cara = compat.caraDelPerfilGuardado;
  check('6) lo heredado entra y sale vocabulario de hoy',
    cara(perfilReal()).tipo === 'REAL_PROFILE' && cara(perfilWee()).tipo === 'WEE_PROFILE');
  check('7) el tipo sale del CAMPO guardado, no del prefijo del identificador', (() => {
    /* Un documento cuyo uid lleva la forma heredada pero se declara de otra cosa: no se traduce. */
    const mentiroso = { uid: CARA_HEREDADA, profileType: 'pagina', linkedAccountId: CUENTA };
    return cara(mentiroso) === null;
  })());
  check('8) la cuenta se LEE del vínculo y nunca se obtiene quitando el prefijo',
    cara(perfilWee()).ownerAccountId === CUENTA
    && cara({ uid: CARA_HEREDADA, profileType: 'hidi', linkedAccountId: OTRA }) === null);
  check('9) la frontera no recorta identificadores: no hay un solo replace ni slice de prefijo',
    !/replace\(\s*['"`]hidi_|\.slice\(5\)|\.substring\(5\)|substr\(/.test(leer('functions/src/identity/compatibilidad.ts')));
  check('10) la traducción de valores heredados vive en UN SOLO sitio',
    (leer('functions/src/identity/compatibilidad.ts').match(/hidi:/g) || []).length === 1);
  check('11) las identidades heredadas de una cuenta son sus dos caras, y solo para mirar hacia atrás',
    compat.identidadesHeredadasDeLaCuenta(CUENTA).length === 2
    && compat.identidadHeredadaEsDeLaCuenta(CARA_HEREDADA, CUENTA)
    && compat.identidadHeredadaEsDeLaCuenta(CUENTA, CUENTA)
    && !compat.identidadHeredadaEsDeLaCuenta('hidi_' + OTRA, CUENTA)
    && compat.identidadesHeredadasDeLaCuenta('hidi_x').length === 0);

  /* Y el Core no sabe nada de esto: se puede borrar este archivo sin tocarlo. */
  check('12) ni el Core ni la composición nombran la identidad heredada',
    !/hidi/i.test(leer('functions/src/core/account-identity.ts'))
    && !/hidi/i.test(leer('functions/src/core/identity.ts'))
    && !/hidi/i.test(leer('functions/src/identity/cuentas.ts')));
  check('13) y el nacimiento tampoco: la pide a la frontera',
    !/hidi/i.test(leer('functions/src/identity/nacimiento.ts'))
    && /from '\.\/compatibilidad'/.test(leer('functions/src/identity/nacimiento.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Principal → cuenta: dueño, miembro, ajeno e inactivo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new FirestoreDeMentira();
  await cuentas.asegurarCuentaEnWee(bd, CUENTA, AHORA, CUENTA);

  const propia = await cuentas.cuentaDelPrincipalEnWee(bd, CUENTA);
  check('14) sin pedir cuenta, la suya, y como dueño',
    propia.accountId === CUENTA && propia.role === 'OWNER' && propia.propia === true);
  check('15) y responder eso no cuesta una sola lectura: el id de la cuenta ES el del principal',
    /pedida === undefined \|\| pedida === datos\.principalId/.test(leer('functions/src/core/account-identity.ts')));

  const ajena = await cuentas.cuentaDelPrincipalEnWee(bd, OTRA, CUENTA);
  check('16) estar autenticado NO hace dueño de otra cuenta', ajena === null);

  /* Un segundo principal con membresía activa: el papel es el que diga la membresía. */
  bd.docs.set(`accounts/${CUENTA}/members/${OTRA}`, {
    contract: '2.0', accountId: CUENTA, principalId: OTRA, role: 'ADMIN', status: 'ACTIVE',
    createdAt: AHORA, updatedAt: AHORA,
  });
  const miembro = await cuentas.cuentaDelPrincipalEnWee(bd, OTRA, CUENTA);
  check('17) un miembro activo sí puede actuar, con el papel que diga su membresía',
    miembro && miembro.accountId === CUENTA && miembro.role === 'ADMIN' && miembro.propia === false);

  for (const estado of ['INVITED', 'REVOKED']) {
    bd.docs.set(`accounts/${CUENTA}/members/${OTRA}`, {
      contract: '2.0', accountId: CUENTA, principalId: OTRA, role: 'ADMIN', status: estado,
      createdAt: AHORA, updatedAt: AHORA,
    });
    check(`18) una membresía ${estado} no autoriza nada`, (await cuentas.cuentaDelPrincipalEnWee(bd, OTRA, CUENTA)) === null);
  }
  bd.docs.set(`accounts/${CUENTA}/members/${OTRA}`, { accountId: CUENTA, principalId: OTRA, role: 'ADMIN', status: 'ACTIVE' });
  check('19) ni una membresía mal formada, aunque diga ACTIVE',
    (await cuentas.cuentaDelPrincipalEnWee(bd, OTRA, CUENTA)) === null);
  check('20) el dueño inicial queda escrito al nacer la cuenta, y es OWNER de todo',
    bd.docs.get(`accounts/${CUENTA}/members/${CUENTA}`).role === 'OWNER'
    && bd.docs.get(`accounts/${CUENTA}/members/${CUENTA}`).status === 'ACTIVE'
    && bd.docs.get(`accounts/${CUENTA}/members/${CUENTA}`).entityScope === 'ALL');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · El cableado: qué se escribe, y qué no ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const bd = new FirestoreDeMentira();
  const r1 = await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(bd, perfilReal(), AHORA);
  check('21) crear un Perfil Real escribe la cuenta, su número, su dueño y su entidad: cuatro cosas',
    r1.hecho === 'CUENTA_CREADA'
    && bd.rutas('accounts/' + CUENTA).length === 2   // la cuenta y su miembro; nada más
    && bd.rutas('accountNumbers/').length === 1
    && bd.rutas('entities/').length === 1
    && bd.escrituras.length === 4 && bd.escrituras.every(([op]) => op === 'create'),
    bd.escrituras.map(([, p]) => p).join(' · '));

  const cuenta = bd.docs.get('accounts/' + CUENTA);
  const entidad = bd.docs.get(bd.rutas('entities/')[0]);
  check('22) la cuenta nace ACTIVE, con número de nueve dígitos y la serie de Páginas en 3',
    C.esNumeroDeCuentaCanonico(cuenta.accountNumber) && cuenta.status === 'ACTIVE'
    && cuenta.nextPageSequence === 3 && cuenta.foundingPrincipalId === CUENTA
    && cuenta.weeProfileEntityId === undefined);
  check('23) su entidad es el Perfil Real, secuencia 1, con identificador opaco',
    entidad.entityType === 'REAL_PROFILE' && entidad.entitySequence === 1
    && C.esIdDeEntidad(entidad.entityId) && entidad.ownerAccountId === CUENTA
    && !entidad.entityId.includes(cuenta.accountNumber) && !entidad.entityId.includes(CUENTA));
  check('24) y apunta al perfil por su `uid`, no por el id del documento',
    entidad.profileRef.coleccion === 'users' && entidad.profileRef.uid === CUENTA);

  const antes = bd.escrituras.length;
  const r2 = await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(bd, perfilReal(), AHORA + 1000);
  check('25) repetirlo no crea una segunda cuenta ni reparte otro número: idempotente',
    r2.hecho === 'CUENTA_YA_ESTABA' && bd.escrituras.length === antes
    && bd.docs.get('accounts/' + CUENTA).accountNumber === cuenta.accountNumber);

  const r3 = await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(bd, perfilWee(), AHORA + 2000);
  const caraEnt = bd.rutas('entities/').map((k) => bd.docs.get(k)).find((e) => e.entityType === 'WEE_PROFILE');
  check('26) la cara Weë entra como entidad 2 de la MISMA cuenta, sin crear otra',
    r3.hecho === 'CARA_CREADA' && caraEnt.entitySequence === 2 && caraEnt.ownerAccountId === CUENTA
    && bd.rutas('accounts/').filter((k) => k.split('/').length === 2).length === 1
    && bd.rutas('accountNumbers/').length === 1);
  check('27) su identificador es opaco y no se parece al de la otra cara',
    C.esIdDeEntidad(caraEnt.entityId) && caraEnt.entityId !== entidad.entityId
    && !caraEnt.entityId.includes(CUENTA) && !caraEnt.entityId.includes(cuenta.accountNumber));
  check('28) y el puntero al perfil guarda el identificador heredado TAL CUAL, sin interpretarlo',
    caraEnt.profileRef.uid === CARA_HEREDADA);
  check('29) repetir la cara tampoco crea otra',
    (await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(bd, perfilWee(), AHORA + 3000)).hecho === 'CARA_YA_ESTABA'
    && bd.rutas('entities/').length === 2);

  /* Una billetera no se crea: se deriva. */
  const billetera = C.billeteraDeLaCuenta(bd.docs.get('accounts/' + CUENTA));
  check('30) la billetera se deriva de la cuenta y comparte su número; no hay documento de billetera',
    billetera.walletNumber === cuenta.accountNumber && billetera.accountId === CUENTA
    && bd.rutas('wallets').length === 0 && bd.rutas('billeteras').length === 0);
  check('31) y no existe forma de pedir la billetera de una entidad',
    C.billeteraDeLaEntidad === undefined && C.billeteraDeLaPagina === undefined
    && C.billeteraDeLaCuenta(entidad) === undefined);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Esto NO es una migración, y no puede volverse una ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Una cuenta que ya existía crea hoy su cara Weë: no se le asigna número. */
  const bd = new FirestoreDeMentira();
  const r = await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(bd, perfilWee(), AHORA);
  check('32) una cara Weë cuya cuenta no ha nacido NO hace nacer la cuenta',
    r.hecho === 'NADA' && bd.docs.size === 0 && bd.escrituras.length === 0
    && /migración/.test(r.decision.motivo));
  check('33) y no se reservó ningún número por el camino', bd.rutas('accountNumbers/').length === 0);

  const fuente = leer('functions/src/identity/nacimiento.ts');
  check('34) lo que dispara es la CREACIÓN de un documento, que es lo único que no alcanza a lo ya escrito',
    /onDocumentCreated\(/.test(fuente) && !/onDocumentWritten|onDocumentUpdated|onSchedule|onRequest|onCall/.test(fuente));
  check('35) el disparador no lanza nunca: un fallo aquí no puede romper la creación del perfil',
    /catch \(error\)/.test(fuente) && /console\.error/.test(fuente));
  check('36) y no escribe el número ni el identificador en ningún registro',
    !/accountNumber|entityId/.test(fuente.split('console.log')[1] ?? ''));
  check('37) ningún script de migración ni de backfill se ha escrito',
    !fs.existsSync(path.resolve(here, '../../scripts/migrar-identidad.mjs'))
    && !fs.existsSync(path.resolve(here, '../../scripts/backfill-cuentas.mjs')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Lo retirado no dejó rastro ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const core = lib('core/identity.js');
  const reglas = leer('firestore.rules');
  check('38) el contador global, el número de siete dígitos y el id con el número dentro: los tres fuera',
    core.numeroDeCuentaDesde === undefined && core.identificadorDeEntidad === undefined
    && core.nacerCuenta === undefined && core.asegurarIdentidadDeCuenta === undefined
    && core.asegurarEntidadWee === undefined && core.esNumeroDeCuenta === undefined);
  check('39) y la composición que los usaba ya no existe',
    !fs.existsSync(path.resolve(here, '../src/identity/index.ts'))
    && !fs.existsSync(path.resolve(here, '../lib/identity/index.js')));
  check('40) las reglas cierran la cuenta, el índice de números, las entidades, las membresías y las operaciones',
    /match \/accountNumbers\/\{numero\} \{\s*\n\s*allow read, write: if false;/.test(reglas)
    && /match \/members\/\{principalId\} \{[\s\S]{0,300}?allow write: if false;/.test(reglas)
    && /match \/operations\/\{clave\} \{\s*\n\s*allow read, write: if false;/.test(reglas)
    && /match \/entities\/\{entityId\} \{[\s\S]{0,400}?allow write: if false;/.test(reglas));
  check('41) y siguen cerrando el contador que ya no existe, para que nadie lo cree desde fuera',
    /match \/contadores\/\{contador\} \{\s*\n\s*allow read, write: if false;/.test(reglas));
  check('42) el número de cuenta sigue sin poder escribirlo un cliente en su perfil',
    /function identityCoreFields\(\)/.test(reglas) && /'accountNumber', 'walletNumber'/.test(reglas));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
