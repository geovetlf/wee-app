/*
 * H5/H2 · MC-5 CONECTADO: LA TAREA PROGRAMADA DEL BARRIDO, LLAMADA DIRECTAMENTE CONTRA EL EMULADOR.
 *
 * `crearBarridoDeActivos(...).run({})` con el Firestore del emulador y un almacén falso que REGISTRA las precondiciones
 * que recibe. La tarea no se exporta ni se programa en ningún sitio (`functions/src/index.ts` no la nombra): aquí se
 * ejecuta su manejador, nada más.
 *
 *   A · Borra los candidatos del índice con la generación registrada y los cierra con la concesión propia.
 *   B · No toca: claves `users/` (D-C, con sus bytes en el Storage del emulador), filas vivas, ni nada con las
 *       dependencias de producción (consumidores y operaciones «no se sabe», D-G).
 *   C · Con la flag cerrada no mira nada.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-barrido.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';
import { crearPuertoConGeneracion } from './_activos-falsos.mjs';

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

const indice = lib('content/indice.js');
const core = lib('core/index.js');
const barrido = lib('media/barrido.js');

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const ANA = 'uAnaBar';
const RUN = Date.now().toString(36);
const AHORA = Date.now();
const DIA = 24 * 60 * 60 * 1000;
const P = crearPuertoConGeneracion('fake');
let seq = 0;

const sembrar = async (o = {}) => {
  const assetId = `asset_${(++seq).toString(16).padStart(32, '0')}`;
  const providerId = o.providerId ?? 'fake';
  const objectKey = o.objectKey ?? `accounts/${ANA}/assets/${assetId}/original`;
  let generacion;
  if (providerId === 'fake') generacion = P.poner(objectKey);
  else {
    await bucket.file(objectKey).save(Buffer.from('x'), { metadata: { contentType: 'image/png' }, resumable: false });
    generacion = String((await bucket.file(objectKey).getMetadata())[0].generation);
  }
  const ref = { provider: providerId, ...(providerId === 'wee' ? { bucket: BUCKET } : {}), objectKey };
  const objectRef = core.referenciaDelObjeto(indice.huellaDelIndice, ref);
  await db.collection('mediaObjects').doc(objectRef).set({
    objectRef, providerId, accountId: ANA, assetId, pieza: 'original', ...(ref.bucket ? { bucket: ref.bucket } : {}), objectKey,
    estado: 'candidato', candidatoDesde: AHORA - 10 * DIA, createdAt: AHORA - 30 * DIA, updatedAt: AHORA, version: 1,
    generacion, cobertura: 'completa', coberturaEn: Date.now(),
  });
  const refId = `material_${assetId}_original`;
  await db.collection('mediaObjects').doc(objectRef).collection('referencias').doc(refId).set({
    refId, clase: 'material', assetId, pieza: 'original', viva: o.viva === true, ownerAccountId: ANA, objectRef, desdeAt: AHORA, actualizadoAt: AHORA,
  });
  return { objectRef, objectKey, generacion };
};
const registro = async (x) => (await db.collection('mediaObjects').doc(x.objectRef).get()).data();
const opciones = (extra = {}) => ({
  db,
  almacenes: { fake: P.puerto, wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  politica: { ...core.POLITICA_DEL_BARRIDO_DEL_INDICE, graciaDeCandidatoMs: 0 },
  ...extra,
});

await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
await new Promise((r) => setTimeout(r, 1500));

/* ═══ A · BORRA, CON LA PRECONDICIÓN, Y CIERRA ═══════════════════════════════ */
console.log('\n── A · La tarea, llamada directamente ──', reloj());
const x1 = await sembrar();
const x2 = await sembrar();
const viva = await sembrar({ viva: true });
const deUsuarios = await sembrar({ providerId: 'wee', objectKey: `users/${ANA}/ai-generations/${RUN}.png` });
const conProduccion = barrido.crearBarridoDeActivos(() => opciones({ consumidores: undefined, operaciones: undefined }));
await conProduccion.run({});
check('B1 con las dependencias de producción no se borra nada (D-G)', P.llamadas.borrar.length === 0 && (await registro(x1)).estado === 'candidato');

const tarea = barrido.crearBarridoDeActivos(() => opciones());
await tarea.run({});
const pre = new Map(P.llamadas.borrar.map((b) => [b.clave, b.generacion]));
check('A1 los dos candidatos se borran del almacén falso', !P.objetos.has(x1.objectKey) && !P.objetos.has(x2.objectKey));
check('A2 cada borrado llevó la generación REGISTRADA como precondición', pre.get(x1.objectKey) === x1.generacion && pre.get(x2.objectKey) === x2.generacion, JSON.stringify([...pre]));
check('A3 y sus registros quedan `borrado`, sin concesión colgando', (await registro(x1)).estado === 'borrado' && (await registro(x2)).estado === 'borrado' && (await registro(x1)).concesion === undefined);

/* ═══ B · LO QUE NO TOCA ═════════════════════════════════════════════════════ */
console.log('\n── B · Lo que no toca ──', reloj());
check('B2 una fila viva protege su objeto', P.objetos.has(viva.objectKey) && (await registro(viva)).estado === 'candidato' && !pre.has(viva.objectKey));
check('B3 D-C: una clave users/ no se barre: sus bytes siguen en el Storage del emulador', (await bucket.file(deUsuarios.objectKey).exists())[0] && (await registro(deUsuarios)).estado === 'candidato');

/* ═══ C · FLAG CERRADA ═══════════════════════════════════════════════════════ */
console.log('\n── C · Con la flag cerrada ──', reloj());
const x3 = await sembrar();
await db.collection('aiSettings').doc('almacenActivos').delete();
const antes = P.llamadas.borrar.length;
await tarea.run({});
check('C1 no mira nada: ni un borrado pedido', P.llamadas.borrar.length === antes && P.objetos.has(x3.objectKey) && (await registro(x3)).estado === 'candidato');

/* ═══ D · EL PUERTO DEL STORAGE DE WEË, CON EL ALMACÉN DEL EMULADOR ═════════ */
/*
 * MEDIDA, no promesa. El 412 de verdad es del Storage de Google (docs.cloud.google.com/storage/docs/request-preconditions)
 * y no se puede comprobar aquí: el emulador no es Google. Lo que sí se comprueba es lo que depende del código —que el
 * puerto lee la generación y que no borra en otro cubo— y se APUNTA lo que hace el emulador con la precondición.
 */
console.log('\n── D · El puerto del Storage de Weë frente al emulador (medida) ──', reloj());
{
  const puerto = indice.puertoDelStorageDeWee('wee');
  const ref = (c) => ({ provider: 'wee', bucket: BUCKET, objectKey: c });
  const c = `users/${ANA}/ai-generations/${RUN}-gen.png`;
  await bucket.file(c).save(Buffer.from('uno'), { metadata: { contentType: 'image/png' }, resumable: false });
  const g1 = (await puerto.mirar(ref(c))).objeto?.generacion;
  await bucket.file(c).save(Buffer.from('dos'), { metadata: { contentType: 'image/png' }, resumable: false });
  const g2 = (await puerto.mirar(ref(c))).objeto?.generacion;
  check('D1 el puerto lee la generación del objeto', typeof g1 === 'string' && g1.length > 0 && typeof g2 === 'string', `${g1} → ${g2}`);
  const conUnaFalsa = await puerto.borrar(ref(c), { generacion: '1' });
  const sigue = (await bucket.file(c).exists())[0];
  console.log(`· MEDIDO (emulador): generación ${g1 === g2 ? 'IGUAL' : 'DISTINTA'} tras sobrescribir; borrar con ifGenerationMatch=1 → ${JSON.stringify(conUnaFalsa)}; el objeto ${sigue ? 'SIGUE' : 'YA NO ESTÁ'}`);
  const otroCubo = await puerto.borrar({ provider: 'wee', bucket: 'otro-cubo', objectKey: c }, { generacion: g2 });
  check('D2 una referencia de otro cubo no se borra aquí aunque la clave coincida', !otroCubo.ok);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
