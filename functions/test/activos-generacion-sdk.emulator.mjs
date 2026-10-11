/*
 * TRABAJO C · LA PRECONDICIÓN DE GENERACIÓN HASTA LA FRONTERA DEL SDK DE STORAGE (cierre técnico de almacenamiento).
 *
 * El borrado físico de Weë (`puertoDelStorageDeWee(...).borrar`) pide `file.delete({ ifGenerationMatch })` al SDK
 * `@google-cloud/storage`. Los tests anteriores comprobaban el argumento que recibe el PUERTO (un doble) y el 412 que
 * devuelve ese doble. Esta suite llega hasta la FRONTERA REAL: intercepta `ServiceObject.prototype.request`, que es el
 * punto donde el SDK construye la petición HTTP, y comprueba qué parámetros salen de verdad.
 *
 *   G1  el origen: la generación registrada es la del objeto en el momento de crearlo
 *   G2  sin fallos: la petición DELETE lleva `ifGenerationMatch` = la generación registrada
 *   G3  412 en la frontera: no se borra; el objeto queda candidato con su motivo; no cuenta como intento
 *   G4  404 natural (el objeto ya no está): cierre sin error; el registro queda borrado
 *   G5  503 en la frontera: error transitorio; el objeto queda candidato con un intento anotado
 *   G6  403 en la frontera: se trata como transitorio (reintento acotado), no como precondición
 *   G7  una referencia de otro cubo: el puerto la rechaza y no sale ninguna petición
 *   G8  un borrado SIN generación: el puerto lo rechaza y no sale ninguna petición (cerrado por defecto)
 *   G9  generación obsoleta: la petición lleva la generación REGISTRADA, no la actual; un 412 la deja intacta
 *
 * Qué se verifica y qué NO (declarado):
 *   · Verificado aquí: el código construye la precondición, la pasa al SDK, y mapea 412, 404, 5xx y 403 a los
 *     resultados del índice. Las respuestas del Storage se INYECTAN en la frontera del SDK.
 *   · Comportamiento documentado por el SDK: `ifGenerationMatch` se envía como parámetro de consulta de la petición
 *     `DELETE` (ServiceObject.delete construye `qs` con las opciones). La semántica de GCS (412 si la generación no
 *     coincide) no se puede comprobar aquí.
 *   · NO verificable en el emulador: el emulador NO hace cumplir `ifGenerationMatch` (un borrado con una generación
 *     falsa se completa; medido abajo). Por eso ningún caso afirma que el emulador proteja una sobrescritura.
 *   · Pendiente, con autorización: una prueba de integración contra un bucket real, con un objeto de prueba. No se
 *     hace aquí.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-generacion-sdk.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

const T0 = Date.now();
const reloj = () => `(${((Date.now() - T0) / 1000).toFixed(1)} s)`;

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
const puertoDeAlmacen = lib('core/media/puerto.js');

/* La frontera del SDK: la clase que construye la petición HTTP. Se carga por ruta absoluta del mismo fichero que usa el
 * proyecto, para que sea la MISMA instancia. */
const { ServiceObject } = require(path.resolve(here, '../node_modules/@google-cloud/storage/build/cjs/src/nodejs-common/service-object.js'));
const requestOriginal = ServiceObject.prototype.request;
const frontera = { peticionesDelete: [], inyectar: null };
ServiceObject.prototype.request = function (reqOpts, callback) {
  if (reqOpts?.method === 'DELETE') {
    frontera.peticionesDelete.push({ clave: this?.name, qs: { ...(reqOpts.qs ?? {}) } });
    if (frontera.inyectar !== null) {
      const codigo = frontera.inyectar;
      frontera.inyectar = null;
      return callback(Object.assign(new Error(`respuesta simulada del Storage (${codigo})`), { code: codigo }));
    }
  }
  return requestOriginal.call(this, reqOpts, callback);
};
const peticionesDe = (clave) => frontera.peticionesDelete.filter((p) => p.clave === clave);

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const ANA = 'uAnaGen';
const RUN = Date.now().toString(36);
let seq = 0;
const urlDe = (key) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(key)}?alt=media&token=tok-${RUN}-${seq}`;
const claveDeUsuario = (cuenta) => `users/${cuenta}/creator-inputs/${RUN}-${++seq}.png`;
const subir = (key) => bucket.file(key).save(Buffer.from('bytes'), { metadata: { contentType: 'image/png' }, resumable: false });
const existe = async (key) => (await bucket.file(key).exists())[0];
const generacionDelAlmacen = async (key) => String((await bucket.file(key).getMetadata())[0].generation);
const objRef = (key) => core.referenciaDelObjeto(indice.huellaDelIndice, { provider: 'wee', bucket: BUCKET, objectKey: key });
const registroDe = async (key) => (await db.collection('mediaObjects').doc(objRef(key)).get()).data();
const ficha = async (id) => (await db.collection('assets').doc(id).get()).data();
const creaMaterial = (owner, key) => content.crearMaterialDesdeUrl({
  ownerAccountId: owner, url: urlDe(key), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 },
}).catch(() => null);

/* Las dependencias de producción del índice, con consumidores de prueba (sin usos) para poder llegar al borrado. */
const depsDePrueba = () => ({
  db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  ahora: Date.now,
  sortear: () => `c${RUN}${++seq}`,
});

/* Un material de ANA: objeto con su ficha viva, su fila y su registro. */
const materialDe = async () => {
  const key = claveDeUsuario(ANA);
  await subir(key);
  const f = await creaMaterial(ANA, key);
  return { key, asset: f?.assetId };
};

/* ── Flag: la cuenta dentro de la cobertura del índice ─────────────────────────────────────────────────────────── */
await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);

const puerto = indice.puertoDelStorageDeWee('wee');

/* ═══ G1 · EL ORIGEN DE LA GENERACIÓN ══════════════════════════════════════════════════════════════════════════ */
console.log('\n── G1 · El origen de la generación registrada ──', reloj());
const g1 = await materialDe();
const reg1 = await registroDe(g1.key);
check('G1 la generación registrada es la del objeto en el almacén en el momento de crearlo',
  typeof reg1?.generacion === 'string' && reg1.generacion === await generacionDelAlmacen(g1.key),
  `registro=${reg1?.generacion} · almacén=${await generacionDelAlmacen(g1.key)}`);
check('G1b el puerto declara que sabe exigir la generación al borrar', (puerto.capacidades ?? []).includes('object.conditionalDelete'));

/* ═══ G2 · SIN FALLOS: LA PETICIÓN LLEVA LA PRECONDICIÓN ═══════════════════════════════════════════════════════ */
console.log('\n── G2 · Sin fallos: la petición DELETE lleva ifGenerationMatch ──', reloj());
const g2 = await materialDe();
const gen2 = (await registroDe(g2.key))?.generacion;
const r2 = await indice.retirarConIndice(depsDePrueba(), ANA, g2.asset);
const p2 = peticionesDe(g2.key);
check('G2 sale exactamente una petición DELETE para el objeto', p2.length === 1, `peticiones=${p2.length}`);
check('G2 y lleva ifGenerationMatch = la generación registrada, en la frontera del SDK',
  p2.length === 1 && String(p2[0].qs.ifGenerationMatch) === gen2, `qs=${JSON.stringify(p2[0]?.qs ?? {})} · registrada=${gen2}`);
check('G2b el objeto se borra y el registro queda borrado', !(await existe(g2.key)) && (await registroDe(g2.key))?.estado === 'borrado', r2.status);

/* ═══ G3 · 412 EN LA FRONTERA: NO SE BORRA, QUEDA CANDIDATO CON SU MOTIVO ═════════════════════════════════════════ */
console.log('\n── G3 · 412 en la frontera ──', reloj());
const g3 = await materialDe();
frontera.inyectar = 412;
await indice.retirarConIndice(depsDePrueba(), ANA, g3.asset);
frontera.inyectar = null;
const reg3 = await registroDe(g3.key);
check('G3 con un 412 del Storage el objeto no se borra', await existe(g3.key));
check('G3 el registro queda candidato, con el motivo generacion_distinta, y sin intento contado',
  reg3?.estado === 'candidato' && reg3?.pendiente?.motivo === 'generacion_distinta' && (reg3?.intentosDeBorrado ?? 0) === 0,
  `estado=${reg3?.estado} · motivo=${reg3?.pendiente?.motivo} · intentos=${reg3?.intentosDeBorrado}`);

/* ═══ G4 · 404 NATURAL: EL OBJETO YA NO ESTÁ, CIERRE SIN ERROR ════════════════════════════════════════════════ */
console.log('\n── G4 · 404 natural: el objeto ya no está ──', reloj());
const g4 = await materialDe();
await bucket.file(g4.key).delete();
const r4 = await indice.retirarConIndice(depsDePrueba(), ANA, g4.asset);
const reg4 = await registroDe(g4.key);
check('G4 el 404 del Storage se lee como «ya no estaba»: el registro queda borrado sin error',
  reg4?.estado === 'borrado' && r4.status === 'retirado' && (r4.pendientes ?? 0) === 0, `estado=${reg4?.estado} · pendientes=${r4.pendientes}`);

/* ═══ G5 · 503 EN LA FRONTERA: TRANSITORIO CON INTENTO ANOTADO ════════════════════════════════════════════════ */
console.log('\n── G5 · 503 en la frontera ──', reloj());
const g5 = await materialDe();
frontera.inyectar = 503;
await indice.retirarConIndice(depsDePrueba(), ANA, g5.asset);
frontera.inyectar = null;
const reg5 = await registroDe(g5.key);
check('G5 un 503 deja el objeto en el almacén, como candidato, con un intento anotado y el motivo transitorio',
  (await existe(g5.key)) && reg5?.estado === 'candidato' && reg5?.intentosDeBorrado === 1 && reg5?.pendiente?.motivo === 'error_transitorio',
  `estado=${reg5?.estado} · intentos=${reg5?.intentosDeBorrado} · motivo=${reg5?.pendiente?.motivo}`);

/* ═══ G6 · 403 EN LA FRONTERA: SE TRATA COMO TRANSITORIO (REINTENTO ACOTADO) ══════════════════════════════════ */
console.log('\n── G6 · 403 en la frontera ──', reloj());
const g6 = await materialDe();
frontera.inyectar = 403;
await indice.retirarConIndice(depsDePrueba(), ANA, g6.asset);
frontera.inyectar = null;
const reg6 = await registroDe(g6.key);
check('G6 un 403 no es precondición: queda como fallo transitorio, con intento (los reintentos son acotados)',
  (await existe(g6.key)) && reg6?.estado === 'candidato' && reg6?.intentosDeBorrado === 1 && reg6?.pendiente?.motivo === 'error_transitorio',
  `intentos=${reg6?.intentosDeBorrado} · motivo=${reg6?.pendiente?.motivo}`);

/* ═══ G7 · OTRO CUBO: EL PUERTO NO PIDE NADA AL SDK ═══════════════════════════════════════════════════════════ */
console.log('\n── G7 · Una referencia de otro cubo ──', reloj());
const claveG7 = claveDeUsuario(ANA);
await subir(claveG7);
const gen7 = await generacionDelAlmacen(claveG7);
const r7 = await puerto.borrar({ provider: 'wee', bucket: 'otro-cubo', objectKey: claveG7 }, { generacion: gen7 });
check('G7 el puerto rechaza una referencia de otro cubo y no sale ninguna petición', !r7.ok && peticionesDe(claveG7).length === 0 && (await existe(claveG7)),
  `resultado=${r7.ok ? 'ok' : r7.error?.details?.reason} · peticiones=${peticionesDe(claveG7).length}`);

/* ═══ G8 · BORRADO SIN GENERACIÓN: CERRADO POR DEFECTO ════════════════════════════════════════════════════════ */
console.log('\n── G8 · Borrado sin generación ──', reloj());
const claveG8 = claveDeUsuario(ANA);
await subir(claveG8);
const r8 = await puerto.borrar({ provider: 'wee', bucket: BUCKET, objectKey: claveG8 });
check('G8 sin generación, el puerto rechaza el borrado: no sale ninguna petición DELETE', !r8.ok && peticionesDe(claveG8).length === 0 && (await existe(claveG8)),
  `resultado=${r8.ok ? 'ok (BORRÓ sin precondición)' : r8.error?.details?.reason} · peticiones=${peticionesDe(claveG8).length}`);
check('G8b y el motivo es de petición inválida, no un borrado de Storage', !r8.ok && r8.error?.details?.reason === 'peticion_invalida',
  `motivo=${r8.error?.details?.reason}`);

/* ═══ G9 · GENERACIÓN OBSOLETA: LA PETICIÓN LLEVA LA REGISTRADA ═══════════════════════════════════════════════ */
console.log('\n── G9 · Generación obsoleta: el objeto se reescribe después de registrarlo ──', reloj());
const g9 = await materialDe();
const gen9Registrada = (await registroDe(g9.key))?.generacion;
await subir(g9.key);
const gen9Actual = await generacionDelAlmacen(g9.key);
check('G9 el objeto tiene ya otra generación en el almacén', gen9Actual !== gen9Registrada, `registrada=${gen9Registrada} · actual=${gen9Actual}`);
frontera.inyectar = 412;
await indice.retirarConIndice(depsDePrueba(), ANA, g9.asset);
frontera.inyectar = null;
const p9 = peticionesDe(g9.key);
check('G9 la precondición que sale es la REGISTRADA, no la actual', p9.length === 1 && String(p9[0].qs.ifGenerationMatch) === gen9Registrada,
  `enviada=${p9[0]?.qs?.ifGenerationMatch} · registrada=${gen9Registrada}`);
check('G9b con el 412 de esa precondición, la generación nueva no se toca', await existe(g9.key) && (await registroDe(g9.key))?.pendiente?.motivo === 'generacion_distinta');

/* ── Medida, no comprobación: el emulador NO hace cumplir la precondición (límite declarado) ─────────────────── */
{
  const claveM = claveDeUsuario(ANA);
  await subir(claveM);
  const genM = await generacionDelAlmacen(claveM);
  const rM = await puerto.borrar({ provider: 'wee', bucket: BUCKET, objectKey: claveM }, { generacion: '1' });
  console.log(`· MEDIDO (emulador): ifGenerationMatch=1 frente a la generación ${genM} → ${rM.ok ? 'ok' : rM.error?.details?.reason} · el objeto ${(await existe(claveM)) ? 'SIGUE' : 'YA NO ESTÁ'}`);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
