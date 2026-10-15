#!/usr/bin/env node
/*
 * EL SALDO DE CREDITS A SU SITIO PRIVADO — F-06 — PREPARADO, NO EJECUTADO.
 *
 * `users/{id}` lo lee cualquiera y llevaba `creditsBalance`/`creditsLifetime*`.
 * El Credit Engine ya escribe `creditAccounts/{uid}` (P2, fase `sombra`) y lo
 * usa como fuente (P4, fase `cuenta`). Este script hace las partes de DATOS del
 * runbook (docs/F06-RUNBOOK.md):
 *
 *   plan            (P3) cuántas cuentas faltan o difieren. Solo lee.
 *   migrar          (P3) crea `creditAccounts/{uid}` desde el Perfil Real a
 *                   quien no lo tenga. Una transacción por cuenta que vuelve a
 *                   leer los dos sitios: idempotente (la 2.ª pasada = 0 cambios).
 *                   Lo que DIFIERE no se toca salvo con --igualar-desde-perfil,
 *                   que solo es correcto mientras manda el perfil (fase sombra).
 *   verificar       (P3/P4/P6) 0 que falten, 0 que difieran y suma de saldos
 *                   privados = creditStats/global.circulating. Sale con 1 si no.
 *                   `--modo contraido` (tras P6): 0 perfiles con campos de saldo.
 *   marcha-atras    (P3) borra los `creditAccounts` que son copia exacta de su
 *                   perfil (el perfil sigue mandando en sombra: no se pierde nada).
 *                   Uno que difiera no se borra sin --forzar.
 *   contraer        (P6, SOLO con la fase `contrato` ya desplegada) quita los
 *                   campos de saldo del perfil público; si a la cuenta le faltaba
 *                   su documento privado, lo crea en la MISMA transacción antes.
 *   reponer-espejo  (marcha atrás de P6) vuelve a copiar el saldo privado al
 *                   perfil que lo guardaba.
 *
 * Lo que NO hace: no mueve un solo Credit (nada de bienvenidas, billeteras ni
 * libro), no toca otra colección que `users` (solo los campos de saldo) y
 * `creditAccounts`, no imprime valores ni identificadores (solo conteos), y no
 * escribe sin LAS DOS banderas. `--limite N` corta las escrituras a N cuentas
 * (canario). Lee `users` POR PÁGINAS (orden por id de documento).
 *
 * Uso (desde la raíz):
 *   node scripts/saldo-privado.mjs plan --project <proyecto>
 *   node scripts/saldo-privado.mjs migrar --project <p> [--limite 5]                 → simulación
 *   node scripts/saldo-privado.mjs migrar --project <p> --ejecutar --confirmo-autorizacion [--limite 5]
 *   node scripts/saldo-privado.mjs verificar --project <p> [--modo contraido]
 *   node scripts/saldo-privado.mjs contraer --project <p> --fase-contrato-desplegada --ejecutar --confirmo-autorizacion
 *
 * El proyecto es OBLIGATORIO (no hay uno por defecto) y, con un emulador en el
 * entorno, tiene que ser `demo-*`.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const motor = require('./lib/credits/creditEngine.js');

export const COLECCION_SALDO = motor.COLECCION_SALDO;
export const CAMPOS_DE_SALDO = Object.freeze(['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent', 'creditsInitializedAt']);
const NUMERICOS = CAMPOS_DE_SALDO.slice(0, 3);
export const TAM_PAGINA = 300;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const inicializado = (d) => typeof (d || {}).creditsBalance === 'number';
const mismoSaldo = (a, b) => NUMERICOS.every((c) => (a || {})[c] === (b || {})[c]);
const camposDe = (d) => Object.fromEntries(CAMPOS_DE_SALDO.filter((c) => (d || {})[c] !== undefined).map((c) => [c, d[c]]));

/** Recorre una colección por páginas, en orden de id, sin leerla entera de una vez. */
export async function* paginas(db, admin, coleccion, tam = TAM_PAGINA) {
  let ultimo = null;
  for (;;) {
    let q = db.collection(coleccion).orderBy(admin.firestore.FieldPath.documentId()).limit(tam);
    if (ultimo) q = q.startAfter(ultimo);
    const snap = await q.get();
    if (snap.empty) return;
    yield snap.docs;
    ultimo = snap.docs[snap.docs.length - 1];
    if (snap.size < tam) return;
  }
}

/** Las cuentas que tienen saldo en algún perfil (candidatas). Se confirma cuenta a cuenta con la regla del motor. */
const cuentasConSaldoEnPerfil = async (db, admin, tam) => {
  const uids = new Set();
  let perfiles = 0;
  for await (const docs of paginas(db, admin, 'users', tam)) {
    for (const d of docs) {
      perfiles++;
      const data = d.data() || {};
      if (typeof data.uid === 'string' && CAMPOS_DE_SALDO.some((c) => data[c] !== undefined)) uids.add(data.uid);
    }
  }
  return { uids, perfiles };
};

const leerCuenta = async (lector, db, uid) => {
  const ref = db.collection(COLECCION_SALDO).doc(uid);
  const snap = await lector.get(ref);
  const q = await lector.get(db.collection('users').where('uid', '==', uid).limit(motor.PERFILES_POR_CUENTA));
  const perfil = motor.perfilQueGuardaElSaldo(uid, q.docs);
  return { ref, snap, privado: snap.exists ? snap.data() : undefined, perfil, enPerfil: perfil ? perfil.data() : undefined };
};
const directo = { get: (t) => t.get() };

/** P3 · simulación: qué haría `migrar`. */
export async function plan(db, admin, { tam = TAM_PAGINA } = {}) {
  const { uids, perfiles } = await cuentasConSaldoEnPerfil(db, admin, tam);
  const r = { perfiles, cuentas: uids.size, faltan: 0, difieren: 0, iguales: 0, omitidas: 0 };
  for (const uid of uids) {
    const c = await leerCuenta(directo, db, uid);
    if (!c.perfil || !inicializado(c.enPerfil)) r.omitidas++;
    else if (!c.snap.exists || !inicializado(c.privado)) r.faltan++;
    else if (!mismoSaldo(c.privado, c.enPerfil)) r.difieren++;
    else r.iguales++;
  }
  return r;
}

/** P3 · copia idempotente perfil → creditAccounts, cuenta a cuenta, en transacción. */
export async function migrar(db, admin, { ejecutar = false, limite = Infinity, igualarDesdePerfil = false, tam = TAM_PAGINA } = {}) {
  const { uids } = await cuentasConSaldoEnPerfil(db, admin, tam);
  const r = { cuentas: uids.size, creadas: 0, igualadas: 0, iguales: 0, difierenSinTocar: 0, omitidas: 0, pendientesPorLimite: 0, simulacion: !ejecutar };
  let escritas = 0;
  for (const uid of uids) {
    if (escritas >= limite) { r.pendientesPorLimite++; continue; }
    const resultado = await db.runTransaction(async (tx) => {
      const c = await leerCuenta(tx, db, uid);
      if (!c.perfil || !inicializado(c.enPerfil)) return 'omitidas';
      const ahora = admin.firestore.Timestamp.now();
      if (!c.snap.exists || !inicializado(c.privado)) {
        if (ejecutar) {
          tx.set(c.ref, { ...camposDe(c.enPerfil), uid, profileRef: c.perfil.id, creadoAt: ahora, creadoDesde: 'script-p3', updatedAt: ahora }, { merge: true });
        }
        return 'creadas';
      }
      if (mismoSaldo(c.privado, c.enPerfil)) return 'iguales';
      if (!igualarDesdePerfil) return 'difierenSinTocar';
      if (ejecutar) tx.set(c.ref, { ...camposDe(c.enPerfil), uid, profileRef: c.perfil.id, updatedAt: ahora }, { merge: true });
      return 'igualadas';
    });
    r[resultado]++;
    if (resultado === 'creadas' || resultado === 'igualadas') escritas++;
  }
  return r;
}

/** Verificación: espejo (P3/P4) o contraído (P6). Solo conteos. */
export async function verificar(db, admin, { modo = 'espejo', tam = TAM_PAGINA } = {}) {
  const { uids, perfiles } = await cuentasConSaldoEnPerfil(db, admin, tam);
  const r = { modo, perfiles, cuentasConSaldoEnPerfil: uids.size, faltan: 0, difieren: 0, privados: 0, sumaPrivados: 0, circulante: null, cuadraCirculante: false, ok: false };
  for await (const docs of paginas(db, admin, COLECCION_SALDO, tam)) {
    for (const d of docs) { r.privados++; r.sumaPrivados += num((d.data() || {}).creditsBalance); }
  }
  if (modo === 'espejo') {
    for (const uid of uids) {
      const c = await leerCuenta(directo, db, uid);
      if (!c.perfil || !inicializado(c.enPerfil)) continue;
      if (!c.snap.exists || !inicializado(c.privado)) r.faltan++;
      else if (!mismoSaldo(c.privado, c.enPerfil)) r.difieren++;
    }
  }
  const global = await db.collection('creditStats').doc('global').get();
  r.circulante = global.exists && typeof global.data().circulating === 'number' ? global.data().circulating : null;
  r.cuadraCirculante = r.circulante === null ? r.sumaPrivados === 0 : r.circulante === r.sumaPrivados;
  r.ok = r.faltan === 0 && r.difieren === 0 && r.cuadraCirculante && (modo !== 'contraido' || r.cuentasConSaldoEnPerfil === 0);
  return r;
}

/** Marcha atrás de P3: borra las copias exactas (el perfil manda en sombra). */
export async function marchaAtras(db, admin, { ejecutar = false, forzar = false, tam = TAM_PAGINA } = {}) {
  const r = { privados: 0, borrados: 0, conservadosPorDiferir: 0, simulacion: !ejecutar };
  const ids = [];
  for await (const docs of paginas(db, admin, COLECCION_SALDO, tam)) ids.push(...docs.map((d) => d.id));
  for (const uid of ids) {
    r.privados++;
    const res = await db.runTransaction(async (tx) => {
      const c = await leerCuenta(tx, db, uid);
      const exacta = c.perfil && inicializado(c.enPerfil) && mismoSaldo(c.privado, c.enPerfil);
      if (!exacta && !forzar) return 'conservadosPorDiferir';
      if (ejecutar) tx.delete(c.ref);
      return 'borrados';
    });
    r[res]++;
  }
  return r;
}

/** P6 · quita el saldo del perfil público. Antes, si faltaba, crea el privado en la misma transacción. */
export async function contraer(db, admin, { ejecutar = false, limite = Infinity, tam = TAM_PAGINA } = {}) {
  const r = { perfilesConSaldo: 0, limpiados: 0, privadosCreados: 0, pendientesPorLimite: 0, simulacion: !ejecutar };
  const rutas = [];
  for await (const docs of paginas(db, admin, 'users', tam)) {
    for (const d of docs) if (CAMPOS_DE_SALDO.some((c) => (d.data() || {})[c] !== undefined)) rutas.push(d.ref.path);
  }
  r.perfilesConSaldo = rutas.length;
  for (const ruta of rutas) {
    if (r.limpiados >= limite) { r.pendientesPorLimite++; continue; }
    const creado = await db.runTransaction(async (tx) => {
      const pref = db.doc(ruta);
      const p = await tx.get(pref);
      const uid = (p.data() || {}).uid;
      /* Si a la cuenta le falta su documento privado, se crea desde EL perfil que elige el motor (no desde este, si hay varios). */
      const c = typeof uid === 'string' ? await leerCuenta(tx, db, uid) : null;
      const crear = Boolean(c && (!c.snap.exists || !inicializado(c.privado)) && c.perfil && inicializado(c.enPerfil));
      if (ejecutar) {
        const ahora = admin.firestore.Timestamp.now();
        if (crear) tx.set(c.ref, { ...camposDe(c.enPerfil), uid, profileRef: c.perfil.id, creadoAt: ahora, creadoDesde: 'script-p6', updatedAt: ahora }, { merge: true });
        tx.update(pref, Object.fromEntries(CAMPOS_DE_SALDO.map((c) => [c, admin.firestore.FieldValue.delete()])));
      }
      return crear;
    });
    r.limpiados++;
    if (creado) r.privadosCreados++;
  }
  return r;
}

/** Marcha atrás de P6: el saldo privado vuelve a copiarse al perfil que lo guardaba. */
export async function reponerEspejo(db, admin, { ejecutar = false, tam = TAM_PAGINA } = {}) {
  const r = { privados: 0, repuestos: 0, sinPerfil: 0, simulacion: !ejecutar };
  const ids = [];
  for await (const docs of paginas(db, admin, COLECCION_SALDO, tam)) ids.push(...docs.map((d) => d.id));
  for (const uid of ids) {
    r.privados++;
    const res = await db.runTransaction(async (tx) => {
      const c = await leerCuenta(tx, db, uid);
      const destino = (c.privado?.profileRef && (await tx.get(db.collection('users').doc(c.privado.profileRef))))
        || null;
      const perfil = destino && destino.exists && motor.perfilQueGuardaElSaldo(uid, [destino]) ? destino : c.perfil;
      if (!perfil || !inicializado(c.privado)) return 'sinPerfil';
      if (ejecutar) tx.update(perfil.ref, { ...camposDe(c.privado), updatedAt: admin.firestore.Timestamp.now() });
      return 'repuestos';
    });
    r[res]++;
  }
  return r;
}

/* ── Línea de órdenes ─────────────────────────────────────────────────── */
const arg = (n, def) => { const i = process.argv.indexOf(n); return i === -1 ? def : process.argv[i + 1]; };
const bandera = (n) => process.argv.includes(n);

export const ORDENES = Object.freeze(['plan', 'migrar', 'verificar', 'marcha-atras', 'contraer', 'reponer-espejo']);

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const orden = process.argv[2];
  if (!ORDENES.includes(orden)) {
    console.error(`Orden desconocida. Una de: ${ORDENES.join(', ')}`);
    process.exit(2);
  }
  const proyecto = arg('--project');
  if (!proyecto) { console.error('Falta --project: este script no tiene proyecto por defecto.'); process.exit(2); }
  if ((process.env.FIRESTORE_EMULATOR_HOST) && !proyecto.startsWith('demo-')) {
    console.error('Con un emulador en el entorno, el proyecto tiene que ser demo-*.'); process.exit(2);
  }
  const EJECUTAR = bandera('--ejecutar') && bandera('--confirmo-autorizacion');
  if (bandera('--ejecutar') && !EJECUTAR) {
    console.error('Para escribir hacen falta LAS DOS banderas: --ejecutar --confirmo-autorizacion. Sin ellas, simulación.');
    process.exit(2);
  }
  if (orden === 'contraer' && EJECUTAR && !bandera('--fase-contrato-desplegada')) {
    console.error('contraer rompe las apps viejas y solo va DESPUÉS de desplegar CREDITS_FASE_SALDO=contrato: falta --fase-contrato-desplegada.');
    process.exit(2);
  }
  const limite = arg('--limite') !== undefined ? Math.max(0, Math.floor(Number(arg('--limite')))) : Infinity;
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId: proyecto });
  const db = admin.firestore();
  console.log(`\nSALDO PRIVADO (F-06) · ${orden} · proyecto ${proyecto} · ${EJECUTAR ? '⚠ ESCRIBIENDO' : 'SIMULACIÓN (no escribe)'}\n`);
  const r = orden === 'plan' ? await plan(db, admin)
    : orden === 'migrar' ? await migrar(db, admin, { ejecutar: EJECUTAR, limite, igualarDesdePerfil: bandera('--igualar-desde-perfil') })
    : orden === 'verificar' ? await verificar(db, admin, { modo: arg('--modo', 'espejo') })
    : orden === 'marcha-atras' ? await marchaAtras(db, admin, { ejecutar: EJECUTAR, forzar: bandera('--forzar') })
    : orden === 'contraer' ? await contraer(db, admin, { ejecutar: EJECUTAR, limite })
    : await reponerEspejo(db, admin, { ejecutar: EJECUTAR });
  /* Solo conteos: ni saldos de nadie ni identificadores. */
  for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(26)} ${v}`);
  if (orden === 'verificar') {
    console.log(r.ok ? '\n✔ verificación correcta' : '\n✘ la verificación NO cuadra');
    process.exit(r.ok ? 0 : 1);
  }
  process.exit(0);
}
