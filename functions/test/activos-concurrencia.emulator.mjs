/*
 * H5/H2 · CONCURRENCIA REAL CONTRA EL EMULADOR: EL ÍNDICE Y EL CERROJO BAJO CARRERAS DE VERDAD.
 *
 * Lo que solo una base de datos de verdad prueba: que dos transacciones sobre el mismo registro de objeto no ganan a la
 * vez. Cada escenario se repite muchas rondas con las dos operaciones lanzadas a la vez (`Promise.all`), y al final de
 * cada ronda se mira el estado guardado: Firestore y el Storage del emulador.
 *
 *   A · Dos versiones a la vez sobre el mismo archivo: una ficha y una fila vivas, nunca dos.
 *   B · Versión a la vez que se retira el material que ocupaba el archivo (A1): nunca una versión viva sobre bytes
 *       que se borran, nunca una fila viva sobre un objeto `borrando`/`borrado`.
 *   C · Retirada y reclamación a la vez (una ficha nueva sobre el mismo objeto mientras se retira y se reclama la vieja).
 *   D · Dos barridos (dos reclamaciones) sobre el mismo candidato: un borrado y un cierre.
 *   E · Dos variantes a la vez (A4): las dos se quedan.
 *   F · Reintentos: repetir cada operación deja el mismo estado.
 *   G · CONTROL (mutación, experimento C del informe): la misma carrera SIN transacción pierde actualizaciones y
 *       viola la exclusión; con la transacción, cero.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-concurrencia.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
process.env.STORAGE_BUCKET = BUCKET;
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET);

const content = lib('content/index.js');
const versiones = lib('content/versiones.js');
const indice = lib('content/indice.js');
const core = lib('core/index.js');

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const ANA = 'uAna';
const RUN = Date.now().toString(36);
let k = 0;
const clave = () => `users/${ANA}/uploads/${RUN}-${++k}.png`;
const urlDe = (c) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(c)}?alt=media&token=tok-${RUN}`;
const subir = (c, texto = 'x') => bucket.file(c).save(Buffer.from(texto), { metadata: { contentType: 'image/png' }, resumable: false });
const existe = async (c) => (await bucket.file(c).exists())[0];
const objRef = (c) => core.referenciaDelObjeto(indice.huellaDelIndice, { provider: 'wee', bucket: BUCKET, objectKey: c });
const registro = async (c) => (await db.collection('mediaObjects').doc(objRef(c)).get()).data();
const filasVivas = async (c) => (await db.collection('mediaObjects').doc(objRef(c)).collection('referencias').where('viva', '==', true).limit(10).get()).size;
const crear = (c, extra = {}) => content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(c), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 }, ...extra });
const ficha = async (id) => (await db.collection('assets').doc(id).get()).data();

let concesiones = 0;
const deps = (extra = {}) => ({
  db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  ahora: Date.now,
  sortear: () => `c${RUN}${++concesiones}`,
  ...extra,
});

/* La flag abierta para Ana, y unos segundos de margen: lo que nazca después queda cubierto desde el nacimiento. */
await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);
const anterior = async () => { const c = clave(); await subir(c); return (await crear(c, { name: 'Retrato' })).assetId; };

/* ═══ A · DOS VERSIONES A LA VEZ ═════════════════════════════════════════════ */
console.log('\n── A · Dos versiones a la vez sobre el mismo archivo ──');
{
  const antA = await anterior();
  const antB = await anterior();
  const rondas = 12;
  let mal = 0;
  for (let i = 0; i < rondas; i++) {
    const c = clave(); await subir(c);
    const [r1, r2] = await Promise.all([
      versiones.crearVersionDeMaterial(ANA, { anteriorId: antA, url: urlDe(c) }),
      versiones.crearVersionDeMaterial(ANA, { anteriorId: antB, url: urlDe(c) }),
    ]);
    const estados = [r1.status, r2.status].sort().join(',');
    const vivasHay = await filasVivas(c);
    const reg = await registro(c);
    if (estados !== 'archivo_en_uso,creada' || vivasHay !== 1 || reg?.estado !== 'guardado') mal++;
  }
  check(`A1 ${rondas} rondas con dos anteriores distintas: una creada, otra archivo_en_uso, UNA fila viva`, mal === 0, `rondas mal: ${mal}`);
  let malMisma = 0;
  for (let i = 0; i < 8; i++) {
    const c = clave(); await subir(c);
    const rs = await Promise.all([0, 1, 2].map(() => versiones.crearVersionDeMaterial(ANA, { anteriorId: antA, url: urlDe(c) })));
    if (rs.some((r) => r.status !== 'creada') || new Set(rs.map((r) => r.asset.assetId)).size !== 1 || (await filasVivas(c)) !== 1) malMisma++;
  }
  check('A2 tres llamadas a la vez con la misma anterior: todas creada, la MISMA ficha, una fila', malMisma === 0, `rondas mal: ${malMisma}`);
}

/* ═══ B · VERSIÓN A LA VEZ QUE SE RETIRA EL MATERIAL QUE OCUPABA EL ARCHIVO ════ */
console.log('\n── B · Versión y retirada del material anterior a la vez (A1) ──');
{
  const ant = await anterior();
  const rondas = 15;
  let violaciones = 0;
  const desenlaces = {};
  for (let i = 0; i < rondas; i++) {
    const c = clave(); await subir(c);
    const viejo = await crear(c);
    const [v, r] = await Promise.all([
      versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) }),
      indice.retirarConIndice(deps(), ANA, viejo.assetId),
    ]);
    desenlaces[`${v.status}/${r.objetosBorrados}`] = (desenlaces[`${v.status}/${r.objetosBorrados}`] ?? 0) + 1;
    const reg = await registro(c);
    const vivasHay = await filasVivas(c);
    const bytes = await existe(c);
    const versionViva = v.status === 'creada' && (await ficha(v.asset.assetId))?.status !== 'deleted';
    if (versionViva && (!bytes || reg?.estado !== 'guardado')) violaciones++;
    if (vivasHay > 0 && (reg?.estado === 'borrando' || reg?.estado === 'borrado')) violaciones++;
    if (!bytes && vivasHay > 0) violaciones++;
  }
  check(`B1 ${rondas} rondas: nunca una versión viva sin bytes, ni una fila viva sobre un objeto que se va`, violaciones === 0, JSON.stringify(desenlaces));
}

/* ═══ C · RETIRADA Y RECLAMACIÓN A LA VEZ ════════════════════════════════════ */
console.log('\n── C · Una ficha nueva sobre el objeto mientras se retira y se reclama la vieja ──');
{
  const rondas = 15;
  let violaciones = 0;
  const desenlaces = {};
  for (let i = 0; i < rondas; i++) {
    const c = clave(); await subir(c);
    const viejo = await crear(c);
    const [r, nueva] = await Promise.all([indice.retirarConIndice(deps(), ANA, viejo.assetId), crear(c)]);
    desenlaces[`${r.objetosBorrados}/${nueva ? 'creada' : 'rechazada'}`] = (desenlaces[`${r.objetosBorrados}/${nueva ? 'creada' : 'rechazada'}`] ?? 0) + 1;
    const reg = await registro(c);
    const bytes = await existe(c);
    const vivasHay = await filasVivas(c);
    if (nueva && (await ficha(nueva.assetId))?.status === 'ready' && !bytes) violaciones++;
    if (vivasHay > 0 && (reg?.estado === 'borrando' || reg?.estado === 'borrado')) violaciones++;
  }
  check(`C1 ${rondas} rondas: nunca una ficha viva sobre bytes borrados ni una fila viva sobre un objeto que se va`, violaciones === 0, JSON.stringify(desenlaces));
}

/* ═══ D · DOS RECLAMACIONES SOBRE EL MISMO CANDIDATO ═════════════════════════ */
console.log('\n── D · Dos barridos sobre el mismo candidato ──');
{
  const rondas = 12;
  let mal = 0;
  for (let i = 0; i < rondas; i++) {
    const c = clave(); await subir(c);
    const m = await crear(c);
    /* Retirada con los consumidores de producción: queda candidato, con su cobertura. */
    await content.retirarMaterial(ANA, m.assetId);
    const pol = core.POLITICA_DEL_BORRADO_INMEDIATO;
    const [a, b] = await Promise.all([indice.completarBorrado(deps(), objRef(c), ANA, pol), indice.completarBorrado(deps(), objRef(c), ANA, pol)]);
    const borrados = [a, b].filter((x) => x.estado === 'borrado' || x.estado === 'ya_no_estaba').length;
    if (borrados !== 1 || (await existe(c)) || (await registro(c))?.estado !== 'borrado') mal++;
  }
  check(`D1 ${rondas} rondas: exactamente un borrado y un cierre por objeto`, mal === 0, `rondas mal: ${mal}`);
}

/* ═══ E · DOS VARIANTES A LA VEZ ═════════════════════════════════════════════ */
console.log('\n── E · Dos variantes a la vez (A4) ──');
for (const conFlag of [true, false]) {
  if (!conFlag) await db.collection('aiSettings').doc('almacenActivos').delete();
  const rondas = 15;
  let perdidas = 0;
  for (let i = 0; i < rondas; i++) {
    const c = clave(); await subir(c);
    const m = await crear(c);
    const t = clave(); const p = clave();
    if (conFlag) { await subir(t); await subir(p); }
    await Promise.all([
      content.anotarVariante(ANA, m.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: t } }),
      content.anotarVariante(ANA, m.assetId, { kind: 'poster', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: p } }),
    ]);
    const kinds = ((await ficha(m.assetId)).variants ?? []).map((v) => v.kind).sort().join(',');
    if (kinds !== 'poster,thumbnail') perdidas++;
  }
  check(`E${conFlag ? 1 : 2} ${rondas} rondas de dos anotaciones a la vez (${conFlag ? 'flag abierta' : 'flag cerrada'}): ninguna variante perdida`, perdidas === 0, `perdidas: ${perdidas}`);
  if (!conFlag) {
    await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
    await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);
  }
}

/* ═══ F · REINTENTOS IDEMPOTENTES ═══════════════════════════════════════════ */
console.log('\n── F · Repetir no cambia nada ──');
{
  const proyectar = async (c, ids) => JSON.stringify({
    fichas: await Promise.all(ids.map(async (id) => { const f = await ficha(id); return f ? [f.status, f.previousVersionId ?? null, (f.variants ?? []).length] : null; })),
    filas: (await db.collection('mediaObjects').doc(objRef(c)).collection('referencias').limit(20).get()).docs.map((d) => [d.id, d.data().viva]).sort(),
    estado: (await registro(c))?.estado ?? null,
  });
  const id = `asset_${RUN.padStart(32, '0').slice(-32).replace(/[^a-f0-9]/g, 'a')}`;
  const c = clave(); await subir(c);
  await crear(c, { assetId: id });
  const tras1 = await proyectar(c, [id]);
  await crear(c, { assetId: id }); await crear(c, { assetId: id });
  check('F1 crear tres veces con la misma identidad: el mismo estado', (await proyectar(c, [id])) === tras1);
  const ant = await anterior();
  const cv = clave(); await subir(cv);
  const v1 = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(cv) });
  const trasV = await proyectar(cv, [v1.asset.assetId]);
  await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(cv) });
  await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(cv) });
  check('F2 la misma versión tres veces: el mismo estado', (await proyectar(cv, [v1.asset.assetId])) === trasV);
  await indice.retirarConIndice(deps(), ANA, id);
  const trasR = await proyectar(c, [id]);
  await indice.retirarConIndice(deps(), ANA, id); await indice.retirarConIndice(deps(), ANA, id);
  check('F3 retirar tres veces: el mismo estado (ya_retirado)', (await proyectar(c, [id])) === trasR && !(await existe(c)));
}

/* ═══ G · CONTROL: SIN TRANSACCIÓN, LA MISMA CARRERA FALLA ═══════════════════ */
console.log('\n── G · El control: la misma carrera sin transacción (experimento C) ──');
{
  const rondas = 60;
  /* G1 · anotar dos variantes leyendo, esperando y escribiendo el array leído: lo que hacía anotarVariante. */
  const sinTransaccion = async (id, kind, ms) => {
    const ref = db.collection('assets').doc(id);
    const s = await ref.get();
    await esperar(ms);
    const variants = [...(s.data().variants ?? []).filter((v) => v.kind !== kind), { kind, storageRef: { provider: 'wee', bucket: BUCKET, objectKey: `users/${ANA}/x/${kind}` } }];
    await ref.set({ variants }, { merge: true });
  };
  let perdidasSin = 0;
  let perdidasCon = 0;
  for (let i = 0; i < rondas; i++) {
    const c = clave(); await subir(c);
    const m = await crear(c);
    await Promise.all([sinTransaccion(m.assetId, 'thumbnail', 15), sinTransaccion(m.assetId, 'poster', 0)]);
    if (((await ficha(m.assetId)).variants ?? []).length !== 2) perdidasSin++;
    const m2 = await crear(c);
    await Promise.all([
      content.anotarVariante(ANA, m2.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: `users/${ANA}/x/t${i}` } }),
      content.anotarVariante(ANA, m2.assetId, { kind: 'poster', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: `users/${ANA}/x/p${i}` } }),
    ]);
    if (((await ficha(m2.assetId)).variants ?? []).length !== 2) perdidasCon++;
  }
  check(`G1 SIN transacción se pierden variantes (la prueba muerde): ${perdidasSin}/${rondas}`, perdidasSin > 0);
  check(`G2 CON la transacción de verdad: 0/${rondas} perdidas`, perdidasCon === 0, `perdidas: ${perdidasCon}`);

  /* G3 · reclamar y crear una fila viva sobre el mismo objeto, sin transacción: el patrón del experimento C. */
  let violacionesSin = 0;
  for (let i = 0; i < rondas; i++) {
    const ref = db.collection('pruebaCerrojo').doc(`${RUN}-${i}`);
    await ref.set({ estado: 'candidato', vivas: 0 });
    const crearFila = (async () => { const s = await ref.get(); if (s.data().estado !== 'guardado' && s.data().estado !== 'candidato') return; await esperar(Math.random() * 3); await ref.update({ estado: 'guardado', vivas: s.data().vivas + 1 }); })();
    const reclamarSin = (async () => { const s = await ref.get(); if (s.data().estado !== 'candidato' || s.data().vivas > 0) return; await esperar(Math.random() * 3); await ref.update({ estado: 'borrando' }); })();
    await Promise.all([crearFila, reclamarSin]);
    const fin = (await ref.get()).data();
    if (fin.estado === 'borrando' && fin.vivas > 0) violacionesSin++;
  }
  check(`G3 SIN transacción, reclamar y crear una fila a la vez deja «borrando con fila viva»: ${violacionesSin}/${rondas}`, violacionesSin > 0);
  /* G4 · lo mismo con el código de verdad (transaccional): ficha nueva sobre un candidato frente a su reclamación. */
  let violacionesCon = 0;
  for (let i = 0; i < 15; i++) {
    const c = clave(); await subir(c);
    const m = await crear(c);
    await content.retirarMaterial(ANA, m.assetId);
    const [nueva] = await Promise.all([crear(c), indice.completarBorrado(deps(), objRef(c), ANA, core.POLITICA_DEL_BORRADO_INMEDIATO)]);
    const reg = await registro(c);
    const vivasHay = await filasVivas(c);
    if (vivasHay > 0 && (reg.estado === 'borrando' || reg.estado === 'borrado')) violacionesCon++;
    if (nueva && !(await existe(c))) violacionesCon++;
  }
  check('G4 CON el código de verdad: 0 «borrando con fila viva» y 0 fichas vivas sin bytes', violacionesCon === 0, `violaciones: ${violacionesCon}`);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
