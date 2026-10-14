/*
 * F-06 · EL SALDO PRIVADO, CONTRA FIRESTORE DE VERDAD (emulador).
 *
 * Lo que la suite en memoria (`credits-saldo-privado.test.mjs`) no puede
 * probar porque allí las transacciones se ponen en fila:
 *
 *   A · CARRERAS REALES: primeras operaciones concurrentes sobre una cuenta
 *       nueva (una sola bienvenida, un solo documento privado), una cuenta
 *       antigua migrada por varios cobros a la vez, instancias de las fases
 *       `sombra` y `cuenta` mezcladas, y el mismo requestId a los dos lados
 *       del giro a la vez. Saldo y libro coherentes al final.
 *   B · LOS SCRIPTS DE DATOS con datos sintéticos: P3 (`scripts/saldo-privado.mjs`:
 *       simulación sin escrituras, canario con --limite, idempotencia,
 *       verificación, marcha atrás), P6 (contraer y reponer el espejo) y P5
 *       (`scripts/limpiar-cuenta-en-users.mjs`: paginado, sin pisar
 *       private/account, copia fuera del repo, verificación y restauración).
 *       Y sus candados de la línea de órdenes.
 *   C · LO QUE VE UN EXTRAÑO tras P5 + P6: sin sesión, el muro sigue leyendo
 *       nombre y foto de `users/{id}`, y ya no hay ni saldo ni datos de cuenta.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java. Desde la raíz:
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/saldo-privado.emulator.mjs firestore.rules"
 *
 * (Las reglas, para la parte C, se cargan por la API REST del emulador.)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST;
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const { createCreditEngine, COLECCION_SALDO } = require('../lib/credits/creditEngine.js');
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const S = await import(pathToFileURL(path.join(RAIZ, 'scripts/saldo-privado.mjs')).href);
const L = await import(pathToFileURL(path.join(RAIZ, 'scripts/limpiar-cuenta-en-users.mjs')).href);

let failures = 0;
let total = 0;
const check = (name, cond, extra = '') => {
  total++;
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const vaciar = async () => {
  const r = await fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
  if (r.status !== 200) throw new Error('no se pudo vaciar el emulador: ' + r.status);
};
const motor = (faseSaldo) => createCreditEngine({
  db: () => db, increment: (n) => admin.firestore.FieldValue.increment(n), now: () => admin.firestore.Timestamp.now(),
  welcomeCredits: 240, loadCosts: async () => {}, faseSaldo,
});
const leer = async (ruta) => (await db.doc(ruta).get()).data();
const libro = async (uid) => (await db.collection('creditTransactions').where('userId', '==', uid).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const CAMPOS = ['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent'];
const iguales = async (uid, idPerfil = `doc_${uid}`) => {
  const a = (await leer(`${COLECCION_SALDO}/${uid}`)) || {};
  const b = (await leer(`users/${idPerfil}`)) || {};
  return CAMPOS.every((c) => typeof a[c] === 'number' && a[c] === b[c]);
};
const cuadra = async (uid) => {
  const suma = (await libro(uid)).reduce((s, t) => s + (typeof t.amount === 'number' ? t.amount : 0), 0);
  return suma === ((await leer(`${COLECCION_SALDO}/${uid}`)) || {}).creditsBalance;
};
const perfil = (uid, extra = {}, id = `doc_${uid}`) => db.doc(`users/${id}`).set({ uid, displayName: uid, profileType: 'real', ...extra });
const cuantos = async (col) => (await db.collection(col).count().get()).data().count;

const inicio = Date.now();

/* ═══ A · carreras reales ═══════════════════════════════════════════════ */
console.log('── A · carreras de verdad contra Firestore ──');
await vaciar();
{
  const cuenta = motor('cuenta');
  const sombra = motor('sombra');
  await perfil('nueva');
  const seis = await Promise.allSettled(Array.from({ length: 6 }, (_, i) => (i % 2 ? sombra : cuenta).ensureAccount('nueva')));
  const ok = seis.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const lib = await libro('nueva');
  check('A1) seis primeras operaciones a la vez (dos fases): UNA bienvenida, un documento privado, 240 en los dos sitios',
    ok.length === 6 && ok.filter((x) => x.welcomeGranted).length === 1 && lib.filter((t) => t.source === 'welcome').length === 1
    && (await leer(`${COLECCION_SALDO}/nueva`))?.creditsBalance === 240 && (await iguales('nueva')), `${ok.length} ok`);

  /* Cuenta antigua: inicializada solo en el perfil (antes de P2), con su bienvenida ya dada. */
  await perfil('vieja', { creditsBalance: 500, creditsLifetimeEarned: 500, creditsLifetimeSpent: 0, creditsInitializedAt: admin.firestore.Timestamp.now() });
  await db.doc('creditTransactions/grant_welcome_vieja').set({ userId: 'vieja', type: 'grant', amount: 500, status: 'COMPLETED', source: 'welcome' });
  const cobro = (i) => (i % 3 ? cuenta : sombra).spendCredits({ userId: 'vieja', service: 'ai_text', amount: 10, requestId: `vieja_${i}`, source: 'test' });
  const cobros = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => cobro(i)));
  /*
   * Doce transacciones sobre el mismo documento a la vez agotan a veces los reintentos de Firestore (ABORTED, código 10):
   * eso es la contención de la base, no del motor, y una transacción abortada no escribe nada. Quien llama reintenta con
   * el MISMO requestId —es lo que hacen las puertas de Weë AI—, y el resultado tiene que ser 12 cobros exactos, ni uno más.
   */
  const abortadas = cobros.map((x, i) => [x, i]).filter(([x]) => x.status === 'rejected');
  const soloContencion = abortadas.every(([x]) => x.reason?.code === 10 || /contention|ABORTED/i.test(String(x.reason?.message)));
  for (const [, i] of abortadas) await cobro(i);
  const p = await leer(`${COLECCION_SALDO}/vieja`);
  check('A2) doce cobros a la vez sobre una cuenta sin migrar (+ reintentos con la misma clave): migrada una vez, 12 cobrados, saldo 380 en los dos sitios',
    soloContencion && p?.creditsBalance === 380 && p.creditsLifetimeSpent === 120 && (await iguales('vieja'))
    && (await libro('vieja')).filter((t) => t.type === 'usage').length === 12,
    `${abortadas.length} abortadas por contención y reintentadas · saldo ${p?.creditsBalance}`);
  check('A3) el libro cuadra con el saldo privado y no apareció otra bienvenida', (await cuadra('vieja'))
    && (await libro('vieja')).filter((t) => t.source === 'welcome').length === 1 && p.creadoDesde === 'perfil');

  /* El mismo requestId, a la vez, desde una instancia de cada fase. */
  const conReintento = async (fn) => { for (let k = 0; ; k++) { try { return await fn(); } catch (e) { if (e?.code !== 10 || k >= 3) throw e; } } };
  const dos = await Promise.allSettled([
    conReintento(() => sombra.spendCredits({ userId: 'vieja', service: 'ai_video', amount: 70, requestId: 'giro_par', source: 'test' })),
    conReintento(() => cuenta.spendCredits({ userId: 'vieja', service: 'ai_video', amount: 70, requestId: 'giro_par', source: 'test' })),
  ]);
  const hechas = dos.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  check('A4) mismo requestId a la vez a los dos lados del giro: un cobro y un duplicado',
    hechas.length === 2 && hechas.filter((x) => !x.duplicate).length === 1 && (await leer(`${COLECCION_SALDO}/vieja`)).creditsBalance === 310 && (await iguales('vieja')));
  const fin = await Promise.allSettled([
    conReintento(() => cuenta.refundCredits({ userId: 'vieja', requestId: 'giro_par', reason: 'x' })),
    conReintento(() => sombra.refundCredits({ userId: 'vieja', requestId: 'giro_par', reason: 'x' })),
  ]);
  check('A5) dos reembolsos a la vez de la misma operación: una sola devolución', fin.every((x) => x.status === 'fulfilled')
    && fin.filter((x) => !x.value.duplicate).length === 1 && (await leer(`${COLECCION_SALDO}/vieja`)).creditsBalance === 380 && (await cuadra('vieja')));

  /* getBalance a la vez (la píldora abierta en varias pestañas) sobre una cuenta sin migrar. */
  await perfil('pestanas', { creditsBalance: 90, creditsLifetimeEarned: 90, creditsLifetimeSpent: 0 });
  await db.doc('creditTransactions/grant_welcome_pestanas').set({ userId: 'pestanas', type: 'grant', amount: 90, status: 'COMPLETED', source: 'welcome' });
  const g = await Promise.all(Array.from({ length: 5 }, () => cuenta.getBalance('pestanas')));
  check('A6) cinco getBalance a la vez migran una vez y todos ven 90', g.every((x) => x.balance === 90) && (await iguales('pestanas'))
    && (await libro('pestanas')).length === 1);
}

/* ═══ B · scripts ═══════════════════════════════════════════════════════ */
console.log('\n── B · P3 (migrar / verificar / marcha atrás) con datos sintéticos ──');
await vaciar();
{
  /* 23 cuentas con saldo solo en el perfil + casos raros. Páginas de 7 para recorrer varias. */
  const TAM = 7;
  let suma = 0;
  for (let i = 0; i < 23; i++) {
    const saldo = 10 * i + 1;
    suma += saldo;
    await perfil(`u${String(i).padStart(2, '0')}`, { creditsBalance: saldo, creditsLifetimeEarned: saldo + 5, creditsLifetimeSpent: 5, creditsInitializedAt: admin.firestore.Timestamp.now() });
  }
  /* Dos perfiles reales de la misma cuenta: manda el inicializado. */
  await perfil('doble', { creditsBalance: 33, creditsLifetimeEarned: 33, creditsLifetimeSpent: 0 }, 'zz_auto_doble');
  await perfil('doble', {}, 'doble');
  suma += 33;
  /* Una cara Weë con un saldo perdido: no es de nadie, no se migra. */
  await db.doc('users/hidi_u00').set({ uid: 'hidi_u00', profileType: 'hidi', linkedAccountId: 'u00', creditsBalance: 999 });
  /* Una ya migrada y otra que difiere (no se toca sin --igualar-desde-perfil). */
  await db.doc(`${COLECCION_SALDO}/u01`).set({ uid: 'u01', creditsBalance: 11, creditsLifetimeEarned: 16, creditsLifetimeSpent: 5 });
  await db.doc(`${COLECCION_SALDO}/u02`).set({ uid: 'u02', creditsBalance: 1234, creditsLifetimeEarned: 26, creditsLifetimeSpent: 5 });
  await db.doc('creditStats/global').set({ circulating: suma });

  const p0 = await S.plan(db, admin, { tam: TAM });
  check('B1) plan (páginas de 7): 25 candidatas, 22 faltan, 1 difiere, 1 igual, la cara Weë omitida',
    p0.cuentas === 25 && p0.faltan === 22 && p0.difieren === 1 && p0.iguales === 1 && p0.omitidas === 1, JSON.stringify(p0));
  const antes = await cuantos(COLECCION_SALDO);
  const sim = await S.migrar(db, admin, { tam: TAM });
  check('B2) simulación: dice qué haría y no escribe nada', sim.simulacion && sim.creadas === 22 && (await cuantos(COLECCION_SALDO)) === antes, JSON.stringify(sim));
  const canario = await S.migrar(db, admin, { ejecutar: true, limite: 3, tam: TAM });
  check('B3) canario --limite 3: crea exactamente 3', canario.creadas === 3 && canario.pendientesPorLimite > 0 && (await cuantos(COLECCION_SALDO)) === antes + 3, JSON.stringify(canario));
  const todo = await S.migrar(db, admin, { ejecutar: true, tam: TAM });
  check('B4) el resto, y lo que difiere NO se toca sin la bandera', todo.creadas === 19 && todo.difierenSinTocar === 1 && (await leer(`${COLECCION_SALDO}/u02`)).creditsBalance === 1234, JSON.stringify(todo));
  const otra = await S.migrar(db, admin, { ejecutar: true, tam: TAM });
  check('B5) segunda pasada = 0 cambios (idempotente)', otra.creadas === 0 && otra.igualadas === 0, JSON.stringify(otra));
  const v1 = await S.verificar(db, admin, { tam: TAM });
  check('B6) verificar NO da por buena una diferencia', !v1.ok && v1.difieren === 1 && v1.faltan === 0, JSON.stringify(v1));
  const ig = await S.migrar(db, admin, { ejecutar: true, igualarDesdePerfil: true, tam: TAM });
  const v2 = await S.verificar(db, admin, { tam: TAM });
  check('B7) con --igualar-desde-perfil (fase sombra) se iguala y la verificación cuadra con el circulante', ig.igualadas === 1 && v2.ok && v2.sumaPrivados === suma, JSON.stringify(v2));
  check('B8) la cuenta con dos perfiles se migró desde el inicializado; la cara Weë, no', (await leer(`${COLECCION_SALDO}/doble`))?.profileRef === 'zz_auto_doble'
    && !(await db.doc(`${COLECCION_SALDO}/hidi_u00`).get()).exists);
  /* Marcha atrás de P3. */
  await db.doc(`${COLECCION_SALDO}/u03`).update({ creditsBalance: 7777 });
  const ma0 = await S.marchaAtras(db, admin, { tam: TAM });
  check('B9) marcha atrás en simulación: no borra nada', ma0.simulacion && (await cuantos(COLECCION_SALDO)) === 24);
  const ma = await S.marchaAtras(db, admin, { ejecutar: true, tam: TAM });
  check('B10) marcha atrás: borra las copias exactas y conserva la que difiere', ma.borrados === 23 && ma.conservadosPorDiferir === 1 && (await cuantos(COLECCION_SALDO)) === 1, JSON.stringify(ma));
  const maf = await S.marchaAtras(db, admin, { ejecutar: true, forzar: true, tam: TAM });
  check('B11) …y con --forzar, también esa; los perfiles siguen intactos', maf.borrados === 1 && (await cuantos(COLECCION_SALDO)) === 0
    && (await leer('users/doc_u03')).creditsBalance === 31);

  console.log('\n── B · P6 (contraer y reponer el espejo) ──');
  await S.migrar(db, admin, { ejecutar: true, tam: TAM });
  /* En contrato el motor deja de escribir el perfil: gasta y el perfil se queda atrás. */
  const contrato = motor('contrato');
  await contrato.spendCredits({ userId: 'u05', service: 'ai_text', amount: 1, requestId: 'contrato_k1', source: 'test' });
  await db.doc(`${COLECCION_SALDO}/u07`).delete(); // una cuenta que llega a P6 sin documento privado
  const c0 = await S.contraer(db, admin, { tam: TAM });
  check('B12) contraer en simulación: no toca ningún perfil', c0.simulacion && (await leer('users/doc_u05')).creditsBalance === 51);
  const cc = await S.contraer(db, admin, { ejecutar: true, limite: 2, tam: TAM });
  check('B13) canario de contraer: 2 perfiles', cc.limpiados === 2 && cc.pendientesPorLimite > 0, JSON.stringify(cc));
  const c1 = await S.contraer(db, admin, { ejecutar: true, tam: TAM });
  const vc = await S.verificar(db, admin, { modo: 'contraido', tam: TAM });
  check('B14) contraer: ningún perfil con saldo; a la cuenta sin privado se le creó antes de quitarlo', c1.privadosCreados === 1 && (await leer(`${COLECCION_SALDO}/u07`))?.creditsBalance === 71
    && vc.cuentasConSaldoEnPerfil === 0 && vc.privados === 24 && vc.ok, JSON.stringify(vc));
  check('B15) el saldo privado sigue siendo el que se cobró en contrato', (await leer(`${COLECCION_SALDO}/u05`)).creditsBalance === 50
    && (await contrato.getBalance('u05')).balance === 50);
  const rep = await S.reponerEspejo(db, admin, { ejecutar: true, tam: TAM });
  check('B16) reponer el espejo: cada perfil vuelve a tener su saldo privado (también el de dos perfiles)', rep.repuestos === 24
    && (await iguales('u05')) && (await iguales('doble', 'zz_auto_doble')) && typeof (await leer('users/doble')).creditsBalance !== 'number');

  console.log('\n── B · los candados de la línea de órdenes ──');
  const correr = (args) => spawnSync(process.execPath, args, { cwd: RAIZ, encoding: 'utf8', env: { ...process.env } });
  const sinProyecto = correr(['scripts/saldo-privado.mjs', 'plan']);
  const unaBandera = correr(['scripts/saldo-privado.mjs', 'migrar', '--project', PROY, '--ejecutar']);
  const contraerSinFase = correr(['scripts/saldo-privado.mjs', 'contraer', '--project', PROY, '--ejecutar', '--confirmo-autorizacion']);
  const real = correr(['scripts/saldo-privado.mjs', 'plan', '--project', 'proyecto-no-demo']);
  check('B17) sin --project, con una sola bandera, contraer sin --fase-contrato-desplegada, o un proyecto real con emulador: se niega (2)',
    sinProyecto.status === 2 && unaBandera.status === 2 && contraerSinFase.status === 2 && real.status === 2);
  const planCli = correr(['scripts/saldo-privado.mjs', 'verificar', '--project', PROY]);
  check('B18) la verificación por línea de órdenes cuadra y solo imprime conteos', planCli.status === 0 && /verificación correcta/.test(planCli.stdout)
    && !/doc_u|u0\d|zz_auto/.test(planCli.stdout), planCli.stderr.slice(0, 200));
}

console.log('\n── B · P5 (datos personales) ──');
await vaciar();
{
  const TAM = 4;
  const nacimiento = admin.firestore.Timestamp.fromMillis(Date.UTC(1990, 4, 17));
  const originales = {};
  for (let i = 0; i < 9; i++) {
    const id = `p${i}`;
    const datos = { uid: id, displayName: `Nombre ${i}`, photoURL: `https://x/${i}.jpg`, email: `p${i}@ejemplo.test`, realName: `Real ${i}`, birthDate: nacimiento, gender: 'x' };
    if (i % 3 === 0) datos.pushToken = `tok${i}`;
    originales[id] = datos;
    await db.doc(`users/${id}`).set(datos);
  }
  await db.doc('users/limpio').set({ uid: 'limpio', displayName: 'Ya limpio' });
  /* El registro nuevo ya había escrito su private/account: no se pisa. */
  await db.doc('users/p1/private/account').set({ realName: 'Real nuevo', updatedAt: admin.firestore.Timestamp.now() });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'f06-copia-'));
  const copia = path.join(dir, 'pii.jsonl');
  check('B19) la copia tiene que ir fuera del repositorio', L.copiaFueraDelRepo(copia) && !L.copiaFueraDelRepo(path.join(RAIZ, 'copia.jsonl')) && !L.copiaFueraDelRepo(undefined));
  let lanzo = false;
  try { await L.limpiar(db, { ejecutar: true, copia: path.join(RAIZ, 'copia.jsonl') }); } catch { lanzo = true; }
  check('B20) …y sin una copia válida no escribe nada', lanzo && !fs.existsSync(path.join(RAIZ, 'copia.jsonl')) && (await leer('users/p0')).email);
  const sim = await L.limpiar(db, { tam: TAM });
  check('B21) simulación: 9 perfiles con campos de cuenta, nada escrito', sim.simulacion && sim.conCampos === 9 && sim.limpiados === 9 && (await leer('users/p0')).email && !fs.existsSync(copia));
  const can = await L.limpiar(db, { ejecutar: true, copia, limite: 2, tam: TAM });
  check('B22) canario --limite 2', can.limpiados === 2 && can.pendientesPorLimite === 7);
  const res = await L.limpiar(db, { ejecutar: true, copia, tam: TAM });
  const v = await L.verificarLimpieza(db, { tam: TAM });
  check('B23) limpieza completa y verificación en 0', res.limpiados === 7 && v.ok && v.conCampos === 0, JSON.stringify(v));
  const p1 = await leer('users/p1/private/account');
  const p4 = await leer('users/p4/private/account');
  check('B24) private/account: lo que ya había manda (no se pisa) y lo que faltaba se rellena', p1.realName === 'Real nuevo' && p1.gender === 'x'
    && p1.birthDate?.toMillis?.() === nacimiento.toMillis() && p4.realName === 'Real 4');
  const pub = await leer('users/p4');
  check('B25) el perfil conserva lo público y pierde lo de cuenta', pub.displayName === 'Nombre 4' && pub.photoURL && !('email' in pub) && !('realName' in pub) && !('birthDate' in pub));
  const otra = await L.limpiar(db, { ejecutar: true, copia, tam: TAM });
  check('B26) segunda pasada: nada que limpiar', otra.conCampos === 0 && otra.limpiados === 0);
  const lineas = fs.readFileSync(copia, 'utf8').trim().split('\n').length;
  const rest = await L.restaurar(db, { copia, ejecutar: true });
  const vuelta = await Promise.all(Object.keys(originales).map(async (id) => {
    const d = await leer(`users/${id}`);
    const o = originales[id];
    return d.email === o.email && d.realName === o.realName && d.gender === o.gender && d.birthDate?.toMillis?.() === nacimiento.toMillis()
      && (o.pushToken === undefined || d.pushToken === o.pushToken);
  }));
  check('B27) marcha atrás desde la copia: los 9 perfiles vuelven exactamente como estaban', lineas >= 9 && rest.restaurados === lineas && vuelta.every(Boolean));
  const cli = spawnSync(process.execPath, ['scripts/limpiar-cuenta-en-users.mjs', '--project', PROY, '--ejecutar', '--confirmo-autorizacion'], { cwd: RAIZ, encoding: 'utf8', env: { ...process.env } });
  check('B28) por línea de órdenes, sin --copia no escribe (2)', cli.status === 2 && (await leer('users/p0')).email);
  fs.rmSync(dir, { recursive: true, force: true });
}

/* ═══ C · lo que ve un extraño ══════════════════════════════════════════ */
console.log('\n── C · tras P5 + P6, un extraño solo ve el perfil público ──');
await vaciar();
{
  const reglas = fs.readFileSync(path.resolve(RAIZ, process.argv[2] || 'firestore.rules'), 'utf8');
  const carga = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
  });
  check('C0) reglas cargadas', carga.status === 200);
  await perfil('ana', { photoURL: 'https://x/ana.jpg', email: 'ana@ejemplo.test', realName: 'Ana Real' });
  await motor('cuenta').ensureAccount('ana');
  await motor('contrato').spendCredits({ userId: 'ana', service: 'ai_text', amount: 2, requestId: 'extrano_c1', source: 'test' });
  const sinSesion = async (ruta) => {
    const r = await fetch(`http://${host}/v1/projects/${PROY}/databases/(default)/documents/${ruta}`);
    return { status: r.status, campos: r.status === 200 ? Object.keys((await r.json()).fields || {}) : [] };
  };
  const antes = await sinSesion('users/doc_ana');
  check('C1) ANTES de P5/P6 el perfil público aún lleva saldo y email (la deuda que se cierra)', antes.status === 200 && antes.campos.includes('creditsBalance') && antes.campos.includes('email'));
  await S.contraer(db, admin, { ejecutar: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'f06-copia-'));
  await L.limpiar(db, { ejecutar: true, copia: path.join(dir, 'pii.jsonl') });
  fs.rmSync(dir, { recursive: true, force: true });
  const tras = await sinSesion('users/doc_ana');
  const PRIV = ['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent', 'creditsInitializedAt', 'email', 'realName', 'birthDate', 'gender', 'pushToken'];
  check('C2) sin sesión, el muro sigue leyendo nombre y foto', tras.status === 200 && tras.campos.includes('displayName') && tras.campos.includes('photoURL'));
  check('C3) …y ya no hay saldo ni datos de cuenta en el perfil público', !PRIV.some((c) => tras.campos.includes(c)), tras.campos.join(','));
  const privado = await sinSesion(`${COLECCION_SALDO}/ana`);
  check('C4) el saldo privado no lo lee nadie sin sesión', privado.status === 403, `HTTP ${privado.status}`);
  check('C5) y el saldo sigue vivo donde debe (238)', (await leer(`${COLECCION_SALDO}/ana`)).creditsBalance === 238);
}

const segundos = Math.round((Date.now() - inicio) / 1000);
check(`Z) la suite cabe en el tiempo (${segundos} s < 300 s)`, segundos < 300);
console.log(failures ? `\n✘ ${failures} de ${total} comprobaciones fallaron` : `\n✔ F-06 contra el emulador: ${total} comprobaciones`);
process.exit(failures ? 1 : 0);
