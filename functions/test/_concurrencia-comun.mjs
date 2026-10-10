/*
 * LA SUITE DE CONCURRENCIA DE ACTIVOS, PARTIDA EN GRUPOS: EL ESTADO Y LOS HELPERS COMUNES.
 *
 * `activos-concurrencia.emulator.mjs` tardaba entre 371 y 387 s y el corredor de emuladores corta cada suite a los 300 s.
 * Se reparte en cuatro suites `*.emulator.mjs` (`activos-concurrencia-1-abc`, `-2-def`, `-3-g` y `-4-h`), cada una en su
 * propia sesión de emuladores y con sus escenarios tal como estaban. Este módulo lleva lo que comparten: el proyecto y el
 * bucket, las cuentas, los helpers, el contador de comprobaciones y la flag del almacén. Hay UNA sola copia de cada
 * helper; los grupos solo importan.
 *
 * Este fichero NO termina en `.emulator.mjs`: el corredor no lo ejecuta como suite. Importarlo no hace nada más que
 * definir; quien lo usa llama a `abrirAlmacenParaAna()` al empezar y a `cerrar()` al acabar.
 *
 * Cada grupo se puede correr solo: abre la flag y espera el margen de cobertura él mismo (`abrirAlmacenParaAna`).
 * Cada suite arranca una sesión de emuladores nueva y vacía, así que lo que deja un grupo no llega al siguiente.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const T0 = Date.now();
export const reloj = () => `(${((Date.now() - T0) / 1000).toFixed(1)} s)`;

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

const PROY = proyectoDeEmulador();
export const BUCKET = `${PROY}.appspot.com`;
process.env.STORAGE_BUCKET = BUCKET;
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });
export const db = admin.firestore();
const firestoreAdmin = require('firebase-admin/firestore');
export const { getFirestore } = firestoreAdmin;
export const bucket = admin.storage().bucket(BUCKET);

export const content = lib('content/index.js');
export const versiones = lib('content/versiones.js');
export const indice = lib('content/indice.js');
export const core = lib('core/index.js');

/* Contador de comprobaciones de ESTE proceso (cada grupo tiene el suyo). */
let n = 0;
let fallos = 0;
export const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};
export const cerrar = () => {
  console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
  process.exit(fallos ? 1 : 0);
};

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* Rondas independientes, en tandas a la vez. Devuelve lo que devuelve cada ronda, en orden. */
const TANDA = 5;
export const enTandas = async (total, ronda) => {
  const salida = [];
  for (let i = 0; i < total; i += TANDA) {
    salida.push(...await Promise.all(Array.from({ length: Math.min(TANDA, total - i) }, (_, j) => ronda(i + j))));
  }
  return salida;
};
export const contar = (claves) => claves.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});

export const ANA = 'uAna';
export const RUN = Date.now().toString(36);
let k = 0;
export const clave = () => `users/${ANA}/uploads/${RUN}-${++k}.png`;
export const urlDe = (c) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(c)}?alt=media&token=tok-${RUN}`;
export const subir = (c, texto = 'x') => bucket.file(c).save(Buffer.from(texto), { metadata: { contentType: 'image/png' }, resumable: false });
export const existe = async (c) => (await bucket.file(c).exists())[0];
export const objRef = (c) => core.referenciaDelObjeto(indice.huellaDelIndice, { provider: 'wee', bucket: BUCKET, objectKey: c });
export const registro = async (c) => (await db.collection('mediaObjects').doc(objRef(c)).get()).data();
export const filasVivas = async (c) => (await db.collection('mediaObjects').doc(objRef(c)).collection('referencias').where('viva', '==', true).limit(10).get()).size;
export const crear = (c, extra = {}) => content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(c), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 }, ...extra });
export const ficha = async (id) => (await db.collection('assets').doc(id).get()).data();

let concesiones = 0;
export const deps = (extra = {}) => ({
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
export const abrirAlmacenParaAna = async () => {
  await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
  await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);
};

export const anterior = async () => { const c = clave(); await subir(c); return (await crear(c, { name: 'Retrato' })).assetId; };
