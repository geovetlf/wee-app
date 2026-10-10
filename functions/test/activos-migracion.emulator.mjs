/*
 * H5/H2 · LA MIGRACIÓN DEL ÍNDICE (`scripts/indice-activos.mjs`) CONTRA EL EMULADOR.
 *
 *   A · Se niega fuera de un `demo-*` con emulador local y sin credenciales (antes de conectar con nada).
 *   B · dry-run con 1 000 materiales de fixture: CERO escrituras, y el informe coincide con lo sembrado.
 *   C · backfill interrumpido en una página y reanudado = backfill de una sola pasada; un solo trabajador por
 *       ejecución; e idempotente al repetir.
 *   D · Cambios durante el backfill (crear, retirar, anotar, con la flag abierta): el índice final es igual a la verdad.
 *   E · sombra: las diferencias entre la decisión de siempre y la del índice se apuntan, y nada más cambia.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-migracion.emulator.mjs"
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib', p));

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
process.env.STORAGE_BUCKET = BUCKET;
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET);
const migracion = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/indice-activos.mjs')).href);
const content = lib('content/index.js');
const core = lib('core/index.js');
const indice = lib('content/indice.js');

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const RUN = Date.now().toString(36);
const hex = (cuenta, i) => `asset_${(cuenta.length * 1_000_000 + i).toString(16).padStart(32, '0')}`;
const refWee = (c) => ({ provider: 'wee', bucket: BUCKET, objectKey: c });
const ctx = migracion.crearContexto(PROY);

/* Un lote de fichas heredadas (sin índice), deterministas: el estado y las variantes salen del número. */
const fixture = (cuenta, i) => {
  const status = i % 10 < 6 ? 'ready' : i % 10 < 8 ? 'deleted' : i % 10 === 8 ? 'failed' : 'uploading';
  const nube = i % 50 === 0;
  const storageRef = nube
    ? { provider: 'cloudinary', bucket: 'nube/image', objectKey: `posts/${cuenta}/${i}.jpg` }
    : refWee(`users/${cuenta}/mig/${RUN}-${i}.png`);
  const conVariante = !nube && i % 5 === 0;
  return {
    assetId: hex(cuenta, i), ownerAccountId: cuenta, status, kind: 'image', storageRef, provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1,
    ...(status === 'deleted' ? { deletedAt: 2 } : {}),
    ...(conVariante ? { variants: [{ kind: 'thumbnail', storageRef: refWee(`users/${cuenta}/mig/${RUN}-${i}-t.png`) }] } : {}),
  };
};
const sembrar = async (fichas) => {
  for (let i = 0; i < fichas.length; i += 400) {
    const lote = db.batch();
    for (const f of fichas.slice(i, i + 400)) lote.set(db.collection('assets').doc(f.assetId), f);
    await lote.commit();
  }
};
/* Una foto de TODO lo que la migración podría tocar: fichas, registros, filas y ejecuciones. */
const foto = async () => {
  const docs = async (q) => (await q.get()).docs.map((d) => [d.ref.path, d.data()]).sort(([a], [b]) => (a < b ? -1 : 1));
  return JSON.stringify([await docs(db.collection('assets')), await docs(db.collection('mediaObjects')), await docs(db.collectionGroup('referencias')),
    await docs(db.collection(migracion.COLECCION_DE_EJECUCIONES))]);
};
/* Lo que el índice dice de una cuenta, sin fechas (dos pasadas distintas escriben en instantes distintos). */
const proyeccion = async (cuenta) => {
  const filas = (await db.collectionGroup('referencias').get()).docs.map((d) => d.data()).filter((f) => f.ownerAccountId === cuenta)
    .map((f) => `${f.objectRef}/${f.refId}=${f.viva}`).sort();
  const registros = (await db.collection('mediaObjects').where('accountId', '==', cuenta).get()).docs.map((d) => d.data())
    .map((r) => `${r.objectRef}:${r.estado}:${r.cobertura}`).sort();
  return JSON.stringify({ filas, registros });
};
const borrarIndiceDe = async (cuenta) => {
  for (const d of (await db.collectionGroup('referencias').get()).docs) if (d.data().ownerAccountId === cuenta) await d.ref.delete();
  for (const d of (await db.collection('mediaObjects').where('accountId', '==', cuenta).get()).docs) await d.ref.delete();
};

/* ═══ A · SE NIEGA ═══════════════════════════════════════════════════════════ */
console.log('\n── A · Fuera de un demo-* con emulador, no corre ──');
{
  const correr = (env) => spawnSync(process.execPath, [path.resolve(RAIZ, 'scripts/indice-activos.mjs'), '--modo', 'backfill'], { env, encoding: 'utf8' });
  const base = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot };
  const real = correr({ ...base, GCLOUD_PROJECT: 'proyecto-de-verdad', FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST });
  const sinEmulador = correr({ ...base, GCLOUD_PROJECT: PROY });
  const conCredenciales = correr({ ...base, GCLOUD_PROJECT: PROY, FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST, GOOGLE_APPLICATION_CREDENTIALS: 'C:/clave.json' });
  const remoto = correr({ ...base, GCLOUD_PROJECT: PROY, FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' });
  check('A1 un proyecto que no es demo-*: se niega (código 3), antes de conectar', real.status === 3 && /solo se ejecuta contra un proyecto demo-\*/.test(real.stderr));
  check('A2 sin emulador en el entorno: se niega', sinEmulador.status === 3 && /FIRESTORE_EMULATOR_HOST/.test(sinEmulador.stderr));
  check('A3 con credenciales en el entorno: se niega', conCredenciales.status === 3 && /credenciales/.test(conCredenciales.stderr));
  check('A4 con un emulador que no es local: se niega', remoto.status === 3 && /local/.test(remoto.stderr));
  check('A5 y la comprobación pura dice lo mismo', !migracion.comprobarEntorno({ GCLOUD_PROJECT: 'otro-proyecto', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).ok
    && migracion.comprobarEntorno({ GCLOUD_PROJECT: PROY, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).ok);
}

/* ═══ B · DRY-RUN CON 1 000 MATERIALES ═══════════════════════════════════════ */
console.log('\n── B · dry-run: lo que haría, sin escribir nada ──');
{
  const CUENTA = 'uMigDry';
  const fichas = Array.from({ length: 1000 }, (_, i) => fixture(CUENTA, i));
  await sembrar(fichas);
  /* Lo esperado, contado A MANO desde el generador (no con la función que se prueba). */
  const wee = fichas.filter((f) => f.storageRef.provider === 'wee');
  const vivas = (f) => f.status !== 'deleted';
  const filasEsperadas = wee.reduce((s, f) => s + 1 + (f.variants ? 1 : 0), 0);
  const filasVivas = wee.filter(vivas).reduce((s, f) => s + 1 + (f.variants ? 1 : 0), 0);
  const registros = wee.filter((f) => vivas(f) && f.status !== 'uploading').reduce((s, f) => s + 1 + (f.variants ? 1 : 0), 0);
  const fuera = fichas.length - wee.length;
  const antes = await foto();
  const inf = await migracion.ejecutarMigracion(ctx, { modo: 'dry-run', cuenta: CUENTA, porPagina: 150 });
  const despues = await foto();
  check('B1 CERO escrituras: la foto de fichas, registros, filas y ejecuciones es idéntica', antes === despues && inf.escrituras === 0);
  check('B2 el informe coincide con el fixture: 1 000 fichas, 600/200/100/100 por estado', inf.fichas === 1000 && inf.porEstado.ready === 600
    && inf.porEstado.deleted === 200 && inf.porEstado.failed === 100 && inf.porEstado.uploading === 100, JSON.stringify(inf.porEstado));
  check('B3 filas esperadas (vivas y apagadas) y registros esperados, como el fixture', inf.filasEsperadas === filasEsperadas && inf.filasEsperadasVivas === filasVivas
    && inf.registrosEsperados === registros && inf.filasQueFaltan === filasEsperadas && inf.registrosQueFaltan === registros,
  `${inf.filasEsperadas}/${filasEsperadas} ${inf.filasEsperadasVivas}/${filasVivas} ${inf.registrosEsperados}/${registros}`);
  check('B4 lo que no entra en el índice (Cloudinary) se cuenta aparte', inf.fueraDelIndice === fuera, `${inf.fueraDelIndice}/${fuera}`);
  check('B5 por páginas, con cursor estable, hasta el final', inf.completo === true && inf.paginas === Math.ceil(1000 / 150));
}

/* ═══ C · BACKFILL: INTERRUMPIDO Y REANUDADO = DE UNA VEZ ═══════════════════ */
console.log('\n── C · backfill reanudable e idempotente ──');
{
  const CUENTA = 'uMigInt';
  await sembrar(Array.from({ length: 350 }, (_, i) => fixture(CUENTA, i)));
  const parcial = await migracion.ejecutarMigracion(ctx, { modo: 'backfill', cuenta: CUENTA, runId: `int-${RUN}`, porPagina: 100, detenerTrasPaginas: 2, trabajador: 'w1' });
  const punto = (await db.collection(migracion.COLECCION_DE_EJECUCIONES).doc(`int-${RUN}`).get()).data();
  check('C1 se para tras dos páginas y deja el punto de control (cursor y contadores)', parcial.completo === false && punto.paginas === 2 && typeof punto.cursor === 'string' && !punto.terminado);
  let otro = null;
  try { await migracion.ejecutarMigracion(ctx, { modo: 'backfill', cuenta: CUENTA, runId: `int-${RUN}`, porPagina: 100, trabajador: 'w2' }); } catch (e) { otro = e.message; }
  check('C2 un solo trabajador por ejecución: otro no la toma mientras la concesión vale', /otra pasada/.test(otro ?? ''));
  const resto = await migracion.ejecutarMigracion(ctx, { modo: 'backfill', cuenta: CUENTA, runId: `int-${RUN}`, porPagina: 100, trabajador: 'w1' });
  const conCorte = await proyeccion(CUENTA);
  check('C3 reanudar desde el punto de control termina la pasada', resto.completo === true && (await db.collection(migracion.COLECCION_DE_EJECUCIONES).doc(`int-${RUN}`).get()).data().terminado === true);
  await borrarIndiceDe(CUENTA);
  await migracion.ejecutarMigracion(ctx, { modo: 'backfill', cuenta: CUENTA, runId: `full-${RUN}`, porPagina: 100 });
  const deUnaVez = await proyeccion(CUENTA);
  check('C4 el estado final con corte y reanudación es el mismo que el de una sola pasada', conCorte === deUnaVez && JSON.parse(deUnaVez).filas.length > 0);
  const otraVez = await migracion.ejecutarMigracion(ctx, { modo: 'backfill', cuenta: CUENTA, runId: `again-${RUN}`, porPagina: 100 });
  check('C5 repetir el backfill no crea nada (idempotente)', otraVez.filasCreadas === 0 && otraVez.registrosCreados === 0 && (await proyeccion(CUENTA)) === deUnaVez);
  check('C6 el backfill no marca cobertura (eso es de la reconciliación completa)', JSON.parse(deUnaVez).registros.every((r) => r.endsWith(':pendiente')));
  const v = await migracion.ejecutarMigracion(ctx, { modo: 'verificar', cuenta: CUENTA, porPagina: 100 });
  check('C7 y verificar no encuentra ninguna diferencia', Object.keys(v.discrepancias).length === 0, JSON.stringify(v.discrepancias));
}

/* ═══ D · CAMBIOS DURANTE EL BACKFILL ═══════════════════════════════════════ */
console.log('\n── D · El índice final es la verdad aunque todo cambie mientras tanto ──');
{
  const CUENTA = 'uMigVivo';
  await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [CUENTA], coberturaDesde: 0 });
  const fichas = Array.from({ length: 250 }, (_, i) => fixture(CUENTA, i));
  await sembrar(fichas);
  const urlDe = (c) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(c)}?alt=media&token=t`;
  const listas = fichas.filter((f) => f.status === 'ready' && f.storageRef.provider === 'wee');
  let cambios = 0;
  const inf = await migracion.ejecutarMigracion(ctx, {
    modo: 'backfill', cuenta: CUENTA, runId: `vivo-${RUN}`, porPagina: 60,
    alTerminarPagina: async (p) => {
      if (p !== 0) return;
      for (let j = 0; j < 2; j++) {
        const c = `users/${CUENTA}/mig/${RUN}-nuevo-${j}.png`;
        await bucket.file(c).save(Buffer.from('x'), { metadata: { contentType: 'image/png' }, resumable: false });
        if (await content.crearMaterialDesdeUrl({ ownerAccountId: CUENTA, url: urlDe(c), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } })) cambios++;
      }
      /* Una ya recorrida y otra que todavía no: se retiran por el camino nuevo. */
      if ((await content.retirarMaterial(CUENTA, listas[0].assetId)).status === 'retirado') cambios++;
      if ((await content.retirarMaterial(CUENTA, listas[listas.length - 1].assetId)).status === 'retirado') cambios++;
      if (await content.anotarVariante(CUENTA, listas[5].assetId, { kind: 'poster', storageRef: refWee(`users/${CUENTA}/mig/${RUN}-poster.png`) })) cambios++;
    },
  });
  const v = await migracion.ejecutarMigracion(ctx, { modo: 'verificar', cuenta: CUENTA, porPagina: 100 });
  check('D1 cinco cambios a mitad del backfill (crear, retirar dos, anotar)', cambios === 5 && inf.completo === true, `cambios=${cambios}`);
  check('D2 verificar contra la verdad: CERO diferencias', Object.keys(v.discrepancias).length === 0 && v.fichas === 252, JSON.stringify(v.discrepancias));
  await db.collection('aiSettings').doc('almacenActivos').delete();
}

/* ═══ E · SOMBRA ═════════════════════════════════════════════════════════════ */
console.log('\n── E · sombra: dos decisiones, ninguna acción ──');
{
  const CUENTA = 'uMigSombra';
  const k = (s) => `users/${CUENTA}/mig/${RUN}-${s}.png`;
  const ficha = (id, o) => ({ assetId: id, ownerAccountId: CUENTA, status: 'ready', kind: 'image', provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1, ...o });
  const [A, B, C, D, E] = [1, 2, 3, 4, 5].map((i) => hex(CUENTA, i));
  await sembrar([
    ficha(A, { storageRef: refWee(k('a')) }),
    ficha(B, { storageRef: refWee(k('b')) }),
    ficha(C, { storageRef: refWee(k('c')) }),
    ficha(D, { storageRef: refWee(k('d')) }),
    ficha(E, { storageRef: refWee(k('e')) }),
  ]);
  await migracion.ejecutarMigracion(ctx, { modo: 'backfill', cuenta: CUENTA, runId: `sb-${RUN}`, porPagina: 50 });
  /* 1 · Una variante heredada SIN fila: la ficha C usa como variante el objeto de D. La decisión de siempre la ve; el índice no. */
  await db.collection('assets').doc(C).set({ variants: [{ kind: 'thumbnail', storageRef: refWee(k('d')) }] }, { merge: true });
  /* 2 · Una fila viva de una ficha ya retirada (E), sobre el objeto de B: el índice la ve; la decisión de siempre no. */
  const objB = core.referenciaDelObjeto(indice.huellaDelIndice, refWee(k('b')));
  await db.collection('assets').doc(E).set({ status: 'deleted', deletedAt: 3 }, { merge: true });
  await db.collection('mediaObjects').doc(objB).collection('referencias').doc(`material_${E}_original`).set({
    refId: `material_${E}_original`, clase: 'material', assetId: E, pieza: 'original', viva: true, ownerAccountId: CUENTA, objectRef: objB, desdeAt: 1, actualizadoAt: 1,
  });
  const antes = await foto();
  const s = await migracion.ejecutarMigracion(ctx, { modo: 'sombra', cuenta: CUENTA, runId: `sombra-${RUN}`, porPagina: 50 });
  const difs = (await db.collection(migracion.COLECCION_DE_EJECUCIONES).doc(`sombra-${RUN}`).collection('diferencias').get()).docs.map((d) => d.data());
  const despues = await foto();
  const sinEjecuciones = (f) => JSON.stringify(JSON.parse(f).slice(0, 3));
  check('E1 las dos diferencias sembradas, apuntadas una a una', s.diferencias === 2 && difs.length === 2
    && difs.some((d) => d.assetId === D && d.antigua === true && d.nueva === false)
    && difs.some((d) => d.assetId === B && d.antigua === false && d.nueva === true), JSON.stringify(difs.map((d) => [d.assetId.slice(-2), d.antigua, d.nueva])));
  check('E2 y ninguna decisión se tocó: fichas, registros y filas idénticos', sinEjecuciones(antes) === sinEjecuciones(despues));
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
