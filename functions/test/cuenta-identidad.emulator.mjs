/*
 * FASE 11.x-5 — EL CONTRATO DE CUENTA, CONTRA TRANSACCIONES DE VERDAD.
 *
 * Lo que un almacén de mentira no puede decir: cuánta concurrencia aguanta de
 * verdad una transacción de Firestore, cuántos intentos gasta el SDK y qué
 * pasa cuando cien peticiones caen a la vez sobre la misma cuenta.
 *
 *   A · Nacer: 1, 2, 5, 10, 25, 50 y 100 cuentas distintas a la vez.
 *   B · La misma cuenta, muchas veces a la vez, y 25 veces seguidas.
 *   C · Un número ya tomado no se reparte dos veces.
 *   D · La cara Weë y las Páginas, con sus secuencias.
 *   E · Buscar: por número, por cuenta y por perfil, sin recorrer nada.
 *   F · Lo que un cliente puede ver y escribir: nada que no sea suyo, y la
 *       membresía como única puerta a una cuenta ajena.
 *   G · El cableado del nacimiento contra Firestore de verdad, incluido lo que
 *       se niega a hacer: numerar una cuenta que ya existía.
 *   H · Cuánto cuesta de verdad la secuencia por cuenta, medido.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore --project wee-dev-geovet \
 *     "node functions/test/cuenta-identidad.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('sin FIRESTORE_EMULATOR_HOST: no se ejecuta'); process.exit(2); }
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const admin = require('firebase-admin');
const PROY = 'wee-dev-geovet';
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const cuentas = require(path.resolve(here, '../lib/identity/cuentas.js'));
const C = require(path.resolve(here, '../lib/core/account-identity.js'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const AHORA = 1750000000000;
const uid = (prefijo, i) => `${prefijo}${String(i).padStart(4, '0')}${'x'.repeat(28 - prefijo.length - 4)}`;
const almacen = cuentas.crearAlmacenDeCuentas(db);
const consulta = cuentas.crearConsultaDeCuentas(db);
const azar = cuentas.azarDelSistema;
/* Dados trucados para forzar una colisión de número. */
const dadosFijos = (numeros) => {
  const cola = [...numeros];
  return { bytes: (cuantos) => {
    if (cuantos === 4 && cola.length) {
      const n = Number(cola.shift()) - C.PRIMER_NUMERO_SORTEABLE;
      return Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
    }
    return azar.bytes(cuantos);
  } };
};
const asegurar = (principalId, dados = azar, at = AHORA) => C.asegurarCuenta(almacen, dados, { principalId, at });
const contar = async (col) => (await db.collection(col).count().get()).data().count;

// ═══════════════════════════════════════════════════════════════════════════
console.log('── A · Cuentas distintas a la vez ──');
// ═══════════════════════════════════════════════════════════════════════════
for (const n of [1, 2, 5, 10, 25, 50, 100]) {
  const ids = Array.from({ length: n }, (_, i) => uid(`lote${n}`, i));
  const t0 = Date.now();
  const r = await Promise.allSettled(ids.map((id) => asegurar(id)));
  const ms = Date.now() - t0;
  const bien = r.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const mal = r.filter((x) => x.status === 'rejected');
  /* Lo que el SDK no consiguió en sus cinco intentos se reintenta, como haría una cola. */
  let reintentos = 0;
  for (let i = 0; i < r.length; i++) {
    if (r[i].status === 'rejected') {
      for (;;) { reintentos++; try { bien.push(await asegurar(ids[i])); break; } catch { if (reintentos > 500) throw new Error('no converge'); } }
    }
  }
  const numeros = new Set(bien.map((x) => x.cuenta.accountNumber));
  check(`A${n}) ${String(n).padStart(3)} cuentas a la vez: ${n} números distintos y ninguna repetida`,
    bien.length === n && numeros.size === n && bien.every((x) => C.esNumeroDeCuentaCanonico(x.cuenta.accountNumber)),
    `${mal.length} abortadas por el SDK · ${reintentos} reintentos · ${ms} ms`);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── B · La misma cuenta, a la vez y en fila ──');
// ═══════════════════════════════════════════════════════════════════════════
for (const n of [2, 5, 10, 25, 50, 100]) {
  const id = uid('misma', n);
  const r = await Promise.allSettled(Array.from({ length: n }, () => asegurar(id)));
  const bien = r.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const mal = r.filter((x) => x.status === 'rejected');
  let reintentos = 0;
  for (let i = 0; i < mal.length; i++) { for (;;) { reintentos++; try { bien.push(await asegurar(id)); break; } catch { if (reintentos > 500) throw new Error('no converge'); } } }
  const doc = await db.collection('accounts').doc(id).get();
  const numeros = await db.collection('accountNumbers').where('accountId', '==', id).get();
  const entidades = await db.collection('entities').where('ownerAccountId', '==', id).get();
  const miembros = await db.collection('accounts').doc(id).collection('members').get();
  check(`B${n}) ${String(n).padStart(3)} peticiones a la vez para la misma cuenta: una cuenta, un número, un dueño, un Perfil Real`,
    doc.exists && numeros.size === 1 && entidades.size === 1 && miembros.size === 1
    && bien.filter((x) => x.creada).length === 1 && new Set(bien.map((x) => x.cuenta.accountNumber)).size === 1,
    `${mal.length} abortadas por el SDK · ${reintentos} reintentos`);
}
{
  const id = uid('veinticinco', 1);
  for (let i = 0; i < 25; i++) await asegurar(id, azar, AHORA + i);
  const numeros = await db.collection('accountNumbers').where('accountId', '==', id).get();
  const entidades = await db.collection('entities').where('ownerAccountId', '==', id).get();
  check('B25s) veinticinco veces seguidas: sigue habiendo una cuenta, un número y una entidad',
    numeros.size === 1 && entidades.size === 1 && (await db.collection('accounts').doc(id).collection('members').get()).size === 1);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── C · Un número no se reparte dos veces ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const primera = uid('choque', 1);
  const segunda = uid('choque', 2);
  const a = await asegurar(primera, dadosFijos(['000500001']));
  const b = await asegurar(segunda, dadosFijos(['000500001', '000500002']));
  check('C1) el segundo sorteo cae en un número tomado y se sortea otro dentro del mismo intento',
    a.cuenta.accountNumber === '000500001' && b.cuenta.accountNumber === '000500002');
  const indice = await db.collection('accountNumbers').doc('000500001').get();
  check('C2) el índice del número apunta a la cuenta que lo tiene', indice.exists && indice.data().accountId === primera);
  /* Escribir el índice por fuera y volver a intentar: la transacción entera falla y no deja rastro. */
  const tercera = uid('choque', 3);
  await db.collection('accountNumbers').doc('000500003').set({ accountId: 'otra', createdAt: AHORA });
  const error = await C.asegurarCuenta(almacen, dadosFijos(Array(C.SORTEOS_POR_INTENTO).fill('000500003')), { principalId: tercera, at: AHORA }).then(() => null, (e) => e);
  check('C3) si todos los sorteos del intento están tomados, no nace nada a medias',
    !!error && !(await db.collection('accounts').doc(tercera).get()).exists
    && (await db.collection('entities').where('ownerAccountId', '==', tercera).get()).size === 0, error?.message?.slice(0, 50));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── D · La cara Weë y las Páginas ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const id = uid('caras', 1);
  await asegurar(id);
  const cara = `hidi_${id}`;
  const diez = await Promise.allSettled(Array.from({ length: 10 }, () => C.asegurarEntidadDeCaraWee(almacen, azar, { accountId: id, perfilUid: cara, at: AHORA })));
  let reintentos = 0;
  for (const x of diez) { if (x.status === 'rejected') { for (;;) { reintentos++; try { await C.asegurarEntidadDeCaraWee(almacen, azar, { accountId: id, perfilUid: cara, at: AHORA }); break; } catch { if (reintentos > 200) throw new Error('no converge'); } } } }
  const entidades = await cuentas.entidadesDeLaCuenta(db, id);
  check('D1) diez peticiones de cara Weë a la vez dejan UNA entidad, la número 2',
    entidades.length === 2 && entidades[1].entityType === 'WEE_PROFILE' && entidades[1].entitySequence === 2
    && entidades[1].profileRef.uid === cara, `${diez.filter((x) => x.status === 'rejected').length} abortadas · ${reintentos} reintentos`);

  const paginas = [];
  for (let i = 0; i < 3; i++) paginas.push(await cuentas.crearPaginaEnWee(db, id, `pagina${i}`, AHORA + i));
  check('D2) las Páginas van de la 3 en adelante y ninguna repite secuencia',
    paginas.map((p) => p.entidad.entitySequence).join(',') === '3,4,5' && paginas.every((p) => p.entidad.entityType === 'PAGE'));
  const repetida = await cuentas.crearPaginaEnWee(db, id, 'pagina1', AHORA + 99);
  check('D3) la misma clave no abre otra Página', !repetida.creada && repetida.entidad.entityId === paginas[1].entidad.entityId);

  const alavez = 10;
  const t0 = Date.now();
  const lote = await Promise.allSettled(Array.from({ length: alavez }, (_, i) => cuentas.crearPaginaEnWee(db, id, `lote${i}`, AHORA)));
  const fallidas = lote.filter((x) => x.status === 'rejected').length;
  let rep = 0;
  for (let i = 0; i < lote.length; i++) { if (lote[i].status === 'rejected') { for (;;) { rep++; try { await cuentas.crearPaginaEnWee(db, id, `lote${i}`, AHORA); break; } catch { if (rep > 300) throw new Error('no converge'); } } } }
  const todas = await cuentas.entidadesDeLaCuenta(db, id);
  const secuencias = todas.filter((e) => e.entityType === 'PAGE').map((e) => e.entitySequence);
  check('D4) diez Páginas a la vez en la MISMA cuenta: secuencias únicas, aunque cueste reintentos',
    new Set(secuencias).size === secuencias.length && secuencias.length === 13,
    `${fallidas} abortadas por el SDK · ${rep} reintentos · ${Date.now() - t0} ms`);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── E · Buscar sin recorrer nada ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const id = uid('busca', 1);
  const { cuenta, entidadReal } = await asegurar(id);
  check('E1) del número a la cuenta, en una sola lectura',
    (await C.buscarCuentaPorNumero(consulta, C.formatearNumeroDeCuenta(cuenta.accountNumber))) === id);
  check('E2) un número que no existe no lleva a ninguna parte', (await C.buscarCuentaPorNumero(consulta, '000100001')) === null);
  check('E3) las entidades de una cuenta salen por consulta indexada, en orden',
    (await cuentas.entidadesDeLaCuenta(db, id)).map((e) => e.entitySequence).join(',') === '1');
  check('E4) y del perfil se llega a su entidad por el `uid` guardado',
    (await cuentas.entidadDelPerfil(db, id))?.entityId === entidadReal.entityId);
  check('E5) el principal resuelve su propia cuenta como dueño',
    (await cuentas.cuentaDelPrincipalEnWee(db, id))?.role === 'OWNER');
  check('E6) y la de otro no, mientras no haya membresía',
    (await cuentas.cuentaDelPrincipalEnWee(db, uid('busca', 2), id)) === null);
  await db.collection('accounts').doc(id).collection('members').doc(uid('busca', 2)).set({
    contract: C.ACCOUNT_IDENTITY_CONTRACT_VERSION, accountId: id, principalId: uid('busca', 2),
    role: 'ADMIN', status: 'ACTIVE', createdAt: AHORA, updatedAt: AHORA,
  });
  check('E7) con membresía activa, resuelve con su papel',
    (await cuentas.cuentaDelPrincipalEnWee(db, uid('busca', 2), id))?.role === 'ADMIN');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── F · Lo que un cliente puede ver ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const reglas = fs.readFileSync(path.resolve(RAIZ, process.argv[2] || 'firestore.rules'), 'utf8');
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const estado = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
  });
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sesion = (u) => {
    const now = Math.floor(Date.now() / 1000);
    return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: u, sub: u, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'custom' } }) + '.';
  };
  const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
  /* Sin sesión = SIN cabecera. `Bearer owner` es el administrador del emulador y se salta las reglas. */
  const pedir = async (metodo, ruta, u, cuerpo) => (await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(u ? { Authorization: `Bearer ${sesion(u)}` } : {}) },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  })).status;

  const mia = uid('cliente', 1);
  const ajena = uid('cliente', 2);
  const { cuenta, entidadReal } = await asegurar(mia);
  await asegurar(ajena);
  check('F0) las reglas del árbol compilan en el emulador', estado.status === 200, `HTTP ${estado.status}`);
  check('F1) la dueña lee su cuenta', (await pedir('GET', `/accounts/${mia}`, mia)) === 200);
  check('F2) y no la de otra persona', (await pedir('GET', `/accounts/${ajena}`, mia)) >= 400);
  check('F3) nadie lee el índice de números: un número no abre nada',
    (await pedir('GET', `/accountNumbers/${cuenta.accountNumber}`, mia)) >= 400
    && (await pedir('GET', `/accountNumbers/${cuenta.accountNumber}`, null)) >= 400);
  check('F4) la dueña lee su entidad', (await pedir('GET', `/entities/${entidadReal.entityId}`, mia)) === 200);
  check('F5) y otra persona no', (await pedir('GET', `/entities/${entidadReal.entityId}`, ajena)) >= 400);
  check('F6) nadie escribe cuentas, números, entidades ni membresías',
    (await pedir('PATCH', `/accounts/${mia}`, mia, { fields: { accountNumber: { stringValue: '000000001' } } })) >= 400
    && (await pedir('PATCH', `/accountNumbers/000100001`, mia, { fields: { accountId: { stringValue: mia } } })) >= 400
    && (await pedir('PATCH', `/entities/${entidadReal.entityId}`, mia, { fields: { ownerAccountId: { stringValue: ajena } } })) >= 400
    && (await pedir('PATCH', `/accounts/${mia}/members/${ajena}`, mia, { fields: { role: { stringValue: 'OWNER' } } })) >= 400);
  check('F7) el dueño sí lee su propia membresía, que es lo que dice que la cuenta es suya',
    (await pedir('GET', `/accounts/${mia}/members/${mia}`, mia)) === 200
    && (await pedir('GET', `/accounts/${mia}/members/${mia}`, ajena)) >= 400);

  /*
   * NI EL TIPO, NI LA SECUENCIA, NI EL DUEÑO DE UNA ENTIDAD. Cambiar el dueño
   * sería llevarse lo publicado a otra cuenta; cambiar el tipo o la secuencia,
   * hacer pasar una Página por la cara de una persona. Ninguna escritura entra.
   */
  check('F8) el tipo y la secuencia de una entidad tampoco se tocan',
    (await pedir('PATCH', `/entities/${entidadReal.entityId}`, mia, { fields: { entityType: { stringValue: 'PAGE' } } })) >= 400
    && (await pedir('PATCH', `/entities/${entidadReal.entityId}`, mia, { fields: { entitySequence: { integerValue: '9' } } })) >= 400);
  check('F9) ni se crea una entidad o una cuenta de la nada',
    (await pedir('POST', `/entities?documentId=ent_inventadaaaaaaaaaaaaaaaaaaa`, mia, { fields: { ownerAccountId: { stringValue: mia } } })) >= 400
    && (await pedir('POST', `/accounts?documentId=${ajena}x`, mia, { fields: { accountId: { stringValue: mia } } })) >= 400);
  check('F10) ni se reserva un número a mano', (await pedir('POST', '/accountNumbers?documentId=000100002', mia, { fields: { accountId: { stringValue: mia } } })) >= 400);

  /*
   * LA MEMBRESÍA ABRE LA PUERTA, Y SOLO MIENTRAS ESTÉ ACTIVA. Es lo que hace
   * que un segundo principal pueda operar una cuenta sin que la cuenta cambie
   * de identificador, y lo que impide que estar autenticado baste.
   */
  const socia = uid('cliente', 3);
  await asegurar(socia);
  const miembro = db.collection('accounts').doc(mia).collection('members').doc(socia);
  await miembro.set({
    contract: C.ACCOUNT_IDENTITY_CONTRACT_VERSION, accountId: mia, principalId: socia,
    role: 'ADMIN', status: 'ACTIVE', createdAt: AHORA, updatedAt: AHORA,
  });
  check('F11) una miembro activa lee la cuenta y sus entidades',
    (await pedir('GET', `/accounts/${mia}`, socia)) === 200
    && (await pedir('GET', `/entities/${entidadReal.entityId}`, socia)) === 200);
  check('F12) y sigue sin poder escribir nada, ni darse más papel',
    (await pedir('PATCH', `/accounts/${mia}`, socia, { fields: { status: { stringValue: 'CLOSED' } } })) >= 400
    && (await pedir('PATCH', `/accounts/${mia}/members/${socia}`, socia, { fields: { role: { stringValue: 'OWNER' } } })) >= 400);
  for (const estado of ['REVOKED', 'INVITED']) {
    await miembro.update({ status: estado });
    check(`F13) con la membresía ${estado} se le cierra la puerta`,
      (await pedir('GET', `/accounts/${mia}`, socia)) >= 400
      && (await pedir('GET', `/entities/${entidadReal.entityId}`, socia)) >= 400);
  }
  await miembro.delete();
  check('F14) y sin membresía, tampoco', (await pedir('GET', `/accounts/${mia}`, socia)) >= 400);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── G · El cableado: un perfil nuevo, contra Firestore de verdad ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const nacimiento = require(path.resolve(here, '../lib/identity/nacimiento.js'));
  const id = uid('nace', 1);
  const cara = `hidi_${id}`;

  const r1 = await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(db, { uid: id, profileType: 'real' }, AHORA);
  const cuenta = (await db.collection('accounts').doc(id).get()).data();
  check('G1) crear el Perfil Real hace nacer la cuenta con su número',
    r1.hecho === 'CUENTA_CREADA' && C.esNumeroDeCuentaCanonico(cuenta.accountNumber)
    && (await db.collection('accountNumbers').doc(cuenta.accountNumber).get()).data().accountId === id);
  check('G2) y repetirlo no reparte otro número',
    (await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(db, { uid: id, profileType: 'real' }, AHORA + 1)).hecho === 'CUENTA_YA_ESTABA'
    && (await db.collection('accounts').doc(id).get()).data().accountNumber === cuenta.accountNumber);

  const r3 = await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(db, { uid: cara, profileType: 'hidi', linkedAccountId: id }, AHORA + 2);
  const entidades = await cuentas.entidadesDeLaCuenta(db, id);
  check('G3) crear la cara Weë añade la entidad 2 a la MISMA cuenta',
    r3.hecho === 'CARA_CREADA' && entidades.length === 2
    && entidades[1].entityType === 'WEE_PROFILE' && entidades[1].profileRef.uid === cara);

  /* Y lo que NO puede pasar: numerar una cuenta que ya existía. */
  const vieja = uid('vieja', 1);
  const antesCuentas = await contar('accounts');
  const antesNumeros = await contar('accountNumbers');
  const r4 = await nacimiento.nacerLoQueTocaDeUnPerfilNuevo(db, { uid: `hidi_${vieja}`, profileType: 'hidi', linkedAccountId: vieja }, AHORA + 3);
  check('G4) una cara Weë cuya cuenta NO ha nacido no crea nada: eso es la migración',
    r4.hecho === 'NADA' && (await contar('accounts')) === antesCuentas && (await contar('accountNumbers')) === antesNumeros
    && !(await db.collection('accounts').doc(vieja).get()).exists);

  const diez = await Promise.allSettled(Array.from({ length: 10 }, () =>
    nacimiento.nacerLoQueTocaDeUnPerfilNuevo(db, { uid: uid('nace', 2), profileType: 'real' }, AHORA)));
  const creadas = diez.filter((x) => x.status === 'fulfilled' && x.value.hecho === 'CUENTA_CREADA').length;
  check('G5) diez disparos a la vez del mismo perfil dejan UNA cuenta',
    creadas <= 1 && (await db.collection('accounts').doc(uid('nace', 2)).get()).exists
    && (await db.collection('entities').where('ownerAccountId', '==', uid('nace', 2)).get()).size === 1,
    `${diez.filter((x) => x.status === 'rejected').length} abortadas`);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── H · Cuánto cuesta de verdad una secuencia por cuenta ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  /*
   * LA MEDIDA QUE PEDÍA LA FASE. La secuencia de las Páginas es de la cuenta y
   * vive en su documento, así que dos Páginas a la vez de la MISMA cuenta se
   * estorban. Aquí se mide cuánto, en lugar de suponerlo: 1, 2, 5, 10 y 25.
   *
   * Lo que NO se hace es meter un contador global para arreglarlo —sería el
   * cuello de botella que esta fase retiró, y para todas las cuentas a la vez—
   * ni repartir bloques de secuencias, que dejaría huecos indistinguibles de
   * una Página retirada.
   */
  const medidas = [];
  for (const n of [1, 2, 5, 10, 25]) {
    const id = uid('carga', n);
    await asegurar(id);
    const t0 = Date.now();
    const lote = await Promise.allSettled(Array.from({ length: n }, (_, i) => cuentas.crearPaginaEnWee(db, id, `p${i}`, AHORA)));
    let rep = 0;
    for (let i = 0; i < lote.length; i++) {
      if (lote[i].status === 'rejected') {
        for (;;) { rep++; try { await cuentas.crearPaginaEnWee(db, id, `p${i}`, AHORA); break; } catch { if (rep > 400) throw new Error('no converge'); } }
      }
    }
    const ms = Date.now() - t0;
    const secuencias = (await cuentas.entidadesDeLaCuenta(db, id)).filter((e) => e.entityType === 'PAGE').map((e) => e.entitySequence);
    medidas.push({ n, ms, rep });
    check(`H1) ${String(n).padStart(2)} Páginas a la vez: ${n} secuencias únicas desde la 3, ninguna repetida`,
      secuencias.length === n && new Set(secuencias).size === n && Math.min(...secuencias) === 3,
      `${ms} ms · ${rep} reintentos`);
  }
  console.log('   ' + medidas.map((m) => `${m.n}→${m.ms}ms/${m.rep}r`).join('  '));

  /* Una Página retirada no devuelve su número a la caja. */
  const id = uid('hueco', 1);
  await asegurar(id);
  const a = await cuentas.crearPaginaEnWee(db, id, 'a', AHORA);
  const b = await cuentas.crearPaginaEnWee(db, id, 'b', AHORA);
  await db.collection('entities').doc(b.entidad.entityId).update({ status: 'DELETED' });
  const c = await cuentas.crearPaginaEnWee(db, id, 'c', AHORA);
  check('H2) retirar una Página no libera su secuencia: la siguiente sigue subiendo',
    a.entidad.entitySequence === 3 && b.entidad.entitySequence === 4 && c.entidad.entitySequence === 5);
}

console.log(`\ncuentas ${await contar('accounts')} · números ${await contar('accountNumbers')} · entidades ${await contar('entities')}`);
console.log(failures ? `✘ ${failures} fallos` : '✔ todo bien');
process.exit(failures ? 1 : 0);
