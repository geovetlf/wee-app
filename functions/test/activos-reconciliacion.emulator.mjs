/*
 * H5/H2 · MC-9 EXTENDIDO: LA RECONCILIACIÓN DEL ÍNDICE CONTRA EL EMULADOR.
 *
 * Se siembra, en Firestore y en el Storage del emulador, UNA inconsistencia de cada una de las nueve clases del diseño
 * (§7.10) en la cuenta de Ana, y una cuenta limpia (Caro) creada por los caminos nuevos. La pasada tiene que:
 *
 *   · detectar las nueve (el 100 %) y ninguna en la cuenta limpia (cero falsos positivos);
 *   · reparar SOLO filas, registros que faltaban, marcas y transiciones del cerrojo (D-B: la retirada interrumpida
 *     queda `candidato`); y NO borrar nada: ni bytes, ni fichas, ni filas, ni registros;
 *   · dar por completa la cobertura de lo que la supera, y ser idempotente al repetirse.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-reconciliacion.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

/* Cuánto tarda cada sección: la cadena de emuladores corta una suite a los 300 s (_emuladores.mjs, --limite-s). */
const T0 = Date.now();
const reloj = () => `(${((Date.now() - T0) / 1000).toFixed(1)} s)`;

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

const ANA = 'uAnaRec';
const BETO = 'uBetoRec';
const CARO = 'uCaroRec';
const RUN = Date.now().toString(36);
const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.now();
let k = 0;
const hex = () => (++k).toString(16).padStart(32, '0');
let kc = 0;
const clave = (cuenta) => `users/${cuenta}/rec/${RUN}-${++kc}.png`;
const refWee = (c) => ({ provider: 'wee', bucket: BUCKET, objectKey: c });
const objRef = (c) => core.referenciaDelObjeto(indice.huellaDelIndice, refWee(c));
const subir = async (c) => { await bucket.file(c).save(Buffer.from('x'), { metadata: { contentType: 'image/png' }, resumable: false }); const [m] = await bucket.file(c).getMetadata(); return String(m.generation); };
const existe = async (c) => (await bucket.file(c).exists())[0];
const regRef = (c) => db.collection('mediaObjects').doc(objRef(c));
const reg = async (c) => (await regRef(c).get()).data();
const fila = async (c, refId) => (await regRef(c).collection('referencias').doc(refId).get()).data();

const fichaDe = (cuenta, c, o = {}) => {
  const assetId = o.assetId ?? `asset_${hex()}`;
  return { assetId, ownerAccountId: cuenta, status: 'ready', kind: 'image', storageRef: refWee(c), provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1, ...o };
};
const filaDe = (cuenta, c, assetId, o = {}) => ({
  refId: `${o.clase ?? 'material'}_${assetId}_original`, clase: o.clase ?? 'material', assetId, pieza: 'original', viva: o.viva ?? true,
  ownerAccountId: o.owner ?? cuenta, objectRef: objRef(c), desdeAt: AHORA, actualizadoAt: AHORA,
});
const registroDe = (cuenta, c, assetId, o = {}) => ({
  objectRef: objRef(c), providerId: 'wee', accountId: cuenta, assetId, pieza: 'original', bucket: BUCKET, objectKey: c,
  estado: 'guardado', createdAt: AHORA, updatedAt: AHORA, version: 0, cobertura: 'completa', coberturaEn: Date.now(), ...o,
});
const sembrar = async (cuenta, c, { ficha, filas = [], registro, bytes = true }) => {
  const generacion = bytes ? await subir(c) : undefined;
  if (ficha) await db.collection('assets').doc(ficha.assetId).set(ficha);
  for (const f of filas) await regRef(c).collection('referencias').doc(f.refId).set(f);
  if (registro) await regRef(c).set({ ...(generacion ? { generacion } : {}), ...registro });
  return generacion;
};

const deps = {
  db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: indice.consumidoresDeProduccion,
  operaciones: indice.operacionesDeProduccion,
  ahora: Date.now,
  sortear: () => `r${RUN}${++k}`,
};

await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA, CARO], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);

/* ── Las nueve, sembradas en la cuenta de Ana ───────────────────────────────── */
const K = {};
/* 1 fila_ausente: una ficha viva sin su fila. */
K.ausente = clave(ANA); const fAusente = fichaDe(ANA, K.ausente);
await sembrar(ANA, K.ausente, { ficha: fAusente });
/* 2 fila_huerfana: una ficha retirada cuya fila sigue viva (una retirada interrumpida, D-B). */
K.huerfana = clave(ANA); const fHuerfana = fichaDe(ANA, K.huerfana, { status: 'deleted', deletedAt: AHORA });
await sembrar(ANA, K.huerfana, { ficha: fHuerfana, filas: [filaDe(ANA, K.huerfana, fHuerfana.assetId)], registro: registroDe(ANA, K.huerfana, fHuerfana.assetId) });
/* 3 fila_duplicada: la misma pareja (material, pieza) con dos filas vivas. */
K.duplicada = clave(ANA); const fDup = fichaDe(ANA, K.duplicada);
await sembrar(ANA, K.duplicada, { ficha: fDup, filas: [filaDe(ANA, K.duplicada, fDup.assetId), filaDe(ANA, K.duplicada, fDup.assetId, { clase: 'version' })], registro: registroDe(ANA, K.duplicada, fDup.assetId) });
/* 4 objeto_huerfano: un registro guardado, sin fichas ni filas, con cobertura y con edad. */
K.huerfano = clave(ANA);
await sembrar(ANA, K.huerfano, { registro: registroDe(ANA, K.huerfano, `asset_${hex()}`, { createdAt: AHORA - 8 * DIA }) });
/* 5 ficha_sin_bytes: ficha y fila vivas, y el objeto no está en el almacén. */
K.sinBytes = clave(ANA); const fSin = fichaDe(ANA, K.sinBytes);
await sembrar(ANA, K.sinBytes, { ficha: fSin, filas: [filaDe(ANA, K.sinBytes, fSin.assetId)], registro: registroDe(ANA, K.sinBytes, fSin.assetId, { generacion: '1' }), bytes: false });
/* 6 estado_imposible: un objeto `borrando` con una fila viva. */
K.imposible = clave(ANA); const fImp = fichaDe(ANA, K.imposible);
await sembrar(ANA, K.imposible, { ficha: fImp, filas: [filaDe(ANA, K.imposible, fImp.assetId)], registro: registroDe(ANA, K.imposible, fImp.assetId, { estado: 'borrando', concesion: { id: 'otro', hasta: AHORA + DIA } }) });
/* 7 generacion_distinta: la generación registrada no es la del almacén. */
K.generacion = clave(ANA); const fGen = fichaDe(ANA, K.generacion);
await sembrar(ANA, K.generacion, { ficha: fGen, filas: [filaDe(ANA, K.generacion, fGen.assetId)], registro: registroDe(ANA, K.generacion, fGen.assetId, { generacion: 'g-vieja' }) });
/* 8 de_otra_cuenta: una ficha VIVA de Beto con la clave de Ana. */
K.ajena = clave(ANA); const fAjenaAna = fichaDe(ANA, K.ajena); const fDeBeto = fichaDe(BETO, K.ajena);
await sembrar(ANA, K.ajena, { ficha: fAjenaAna, filas: [filaDe(ANA, K.ajena, fAjenaAna.assetId)], registro: registroDe(ANA, K.ajena, fAjenaAna.assetId) });
await db.collection('assets').doc(fDeBeto.assetId).set(fDeBeto);
/* 9 cobertura_pendiente: todo en orden salvo la cobertura. */
K.pendiente = clave(ANA); const fPend = fichaDe(ANA, K.pendiente);
await sembrar(ANA, K.pendiente, { ficha: fPend, filas: [filaDe(ANA, K.pendiente, fPend.assetId)], registro: (() => { const r = registroDe(ANA, K.pendiente, fPend.assetId, { cobertura: 'pendiente' }); delete r.coberturaEn; return r; })() });

/* ── La cuenta limpia: creada por los caminos nuevos ─────────────────────────── */
const limpias = [];
for (let i = 0; i < 4; i++) {
  const c = clave(CARO); await subir(c);
  limpias.push(await content.crearMaterialDesdeUrl({ ownerAccountId: CARO, url: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(c)}?alt=media&token=t`, kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } }));
}

const contarTodo = async () => ({
  fichas: (await db.collection('assets').limit(1000).get()).size,
  registros: (await db.collection('mediaObjects').limit(1000).get()).size,
  bytes: (await Promise.all(Object.values(K).map(existe))).filter(Boolean).length,
});
const antes = await contarTodo();

/* ═══ A · DETECCIÓN DEL 100 % ═══════════════════════════════════════════════ */
console.log('\n── A · Las nueve clases, detectadas ──', reloj());
const informe = await indice.reconciliarIndiceDeCuentaEnFirestore(deps, ANA);
const clases = informe.porClase;
for (const c of core.CLASES_DEL_INDICE) check(`A· detecta ${c}`, (clases[c] ?? 0) >= 1, `${clases[c] ?? 0}`);
check('A10 la pasada se vio entera', informe.completo === true);

/* ═══ B · REPARA SIN BORRAR ═════════════════════════════════════════════════ */
console.log('\n── B · Lo que se repara, y lo que no se borra ──', reloj());
{
  check('B1 fila_ausente: la fila viva y el registro, creados', (await fila(K.ausente, `material_${fAusente.assetId}_original`))?.viva === true && (await reg(K.ausente))?.estado === 'guardado');
  check('B2 fila_huerfana (D-B): la fila se apaga y el objeto queda candidato por una retirada interrumpida',
    (await fila(K.huerfana, `material_${fHuerfana.assetId}_original`))?.viva === false && (await reg(K.huerfana))?.estado === 'candidato'
    && (await reg(K.huerfana))?.pendiente?.motivo === 'retirada_interrumpida');
  check('B3 fila_duplicada: marcada, sin borrar ninguna de las dos', (await reg(K.duplicada))?.marcas?.includes('fila_duplicada')
    && (await regRef(K.duplicada).collection('referencias').limit(10).get()).size === 2);
  check('B4 objeto_huerfano: pasa a candidato (decide MC-5)', (await reg(K.huerfano))?.estado === 'candidato' && (await reg(K.huerfano))?.pendiente?.motivo === 'huerfano');
  check('B5 ficha_sin_bytes: marcada', (await reg(K.sinBytes))?.marcas?.includes('ficha_sin_bytes'));
  check('B6 estado_imposible: marcado, y la concesión ajena no se toca', (await reg(K.imposible))?.marcas?.includes('estado_imposible') && (await reg(K.imposible))?.concesion?.id === 'otro');
  check('B7 generacion_distinta: marcada', (await reg(K.generacion))?.marcas?.includes('generacion_distinta'));
  check('B8 de_otra_cuenta: marcada, y la ficha de la otra cuenta intacta', (await reg(K.ajena))?.marcas?.includes('de_otra_cuenta')
    && (await db.collection('assets').doc(fDeBeto.assetId).get()).data().status === 'ready');
  check('B9 cobertura_pendiente: la pasada completa la verifica y la marca', (await reg(K.pendiente))?.cobertura === 'completa' && (await reg(K.pendiente))?.coberturaOrigen === 'reconciliacion');
  const despues = await contarTodo();
  check('B10 NADA borrado: las mismas fichas, ningún registro menos y los mismos bytes', despues.fichas === antes.fichas && despues.registros >= antes.registros && despues.bytes === antes.bytes,
    `${JSON.stringify(antes)} → ${JSON.stringify(despues)}`);
  check('B11 lo marcado no se da por cubierto', (await reg(K.duplicada))?.coberturaOrigen !== 'reconciliacion' || (await reg(K.duplicada))?.marcas?.length > 0);
}

/* ═══ C · REPETIR NO REPARA DOS VECES ═══════════════════════════════════════ */
console.log('\n── C · Idempotente ──', reloj());
{
  const segunda = await indice.reconciliarIndiceDeCuentaEnFirestore(deps, ANA);
  const reparadas = Object.values(segunda.reparadas).reduce((a, b) => a + b, 0);
  check('C1 la segunda pasada no vuelve a escribir nada (las marcas ya estaban; las filas, también)', reparadas === 0 && segunda.erroresDeReparacion === 0, JSON.stringify(segunda.reparadas));
}

/* ═══ D · CERO FALSOS POSITIVOS ═════════════════════════════════════════════ */
console.log('\n── D · Una cuenta limpia ──', reloj());
{
  const limpio = await indice.reconciliarIndiceDeCuentaEnFirestore(deps, CARO);
  check('D1 cuatro materiales creados por los caminos nuevos: CERO hallazgos', limpio.hallazgos.length === 0 && limpias.every(Boolean), JSON.stringify(limpio.porClase));
  check('D2 y no escribe nada', Object.keys(limpio.reparadas).length === 0 && limpio.coberturasMarcadas === 0);
}

/* ═══ E · SOLO INFORMAR ═════════════════════════════════════════════════════ */
console.log('\n── E · Con reparar:false, solo informa ──', reloj());
{
  const kNueva = clave(ANA); const fNueva = fichaDe(ANA, kNueva);
  await sembrar(ANA, kNueva, { ficha: fNueva });
  const soloInforme = await indice.reconciliarIndiceDeCuentaEnFirestore(deps, ANA, { reparar: false });
  check('E1 detecta la fila que falta y no la crea', (soloInforme.porClase.fila_ausente ?? 0) >= 1 && !(await fila(kNueva, `material_${fNueva.assetId}_original`)));
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
