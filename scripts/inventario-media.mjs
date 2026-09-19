/*
 * INVENTARIO DE MATERIAL — SOLO LECTURA. NO MODIFICA NADA. (Fase 11, §29)
 *
 * Antes de mover un solo archivo hay que saber qué hay: qué documentos llevan
 * URLs de material, en qué almacén vive cada una (Storage de Weë o
 * Cloudinary), qué objetos hay en el bucket y cuáles de esas URLs apuntan a
 * algo que ya no existe. Este script lo cuenta y lo escribe; no toca nada.
 *
 *   SE INVENTARÍA    posts, comments, users, communities, businesses,
 *                    creatorJobs, aiGenerations, assets, creatorProjects,
 *                    brainChats, conversations + messages, products, reviews
 *                    y el bucket del Storage de Weë por ruta
 *   NO SE TOCA       nada. Ni Firestore, ni Storage, ni Cloudinary.
 *
 * Uso (desde la raíz del proyecto, con credenciales de gcloud o
 * GOOGLE_APPLICATION_CREDENTIALS):
 *
 *   node scripts/inventario-media.mjs                    → inventario en pantalla
 *   node scripts/inventario-media.mjs --json salida.json → y el inventario entero
 *   node scripts/inventario-media.mjs --sin-storage      → sin listar el bucket
 *   --project get-wee (por defecto)   --bucket <nombre del bucket>
 */
import fs from 'node:fs';
import {
  COLECCIONES, GRUPOS, CARPETAS_DE_STORAGE, carpetaDe, clasificar, core, iniciar,
  recorrer, tipoPorUrl, arg, bandera,
} from './media-legacy.mjs';

const SALIDA = arg('--json', null);
const SIN_STORAGE = bandera('--sin-storage');
const { proyecto, bucket, db, storage } = iniciar();

console.log(`\nINVENTARIO DE MATERIAL — proyecto ${proyecto} — bucket ${bucket} — SOLO LECTURA\n`);

const inventario = {
  proyecto, bucket, generado: new Date().toISOString(),
  documentos: {}, urls: [], storage: {}, assets: {}, cloudinary: {}, hallazgos: {},
};

const cuenta = (mapa, clave, campo) => {
  mapa[clave] = mapa[clave] || { docs: 0, total: 0, wee: 0, cloudinary: 0, otro: 0 };
  mapa[clave][campo]++;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1 · LAS URLs QUE HAY EN LOS DOCUMENTOS, colección por colección.
// ─────────────────────────────────────────────────────────────────────────────
const urls = [];
const visitarDoc = (coleccion, doc) => {
  let vistas = 0;
  recorrer(doc.data(), (campo, url) => {
    const { proveedor, ref } = clasificar(url);
    const clave = `${coleccion}.${campo}`;
    cuenta(inventario.documentos, clave, 'total');
    cuenta(inventario.documentos, clave, proveedor);
    urls.push({ coleccion, ruta: doc.ref.path, campo, url, proveedor, tipo: tipoPorUrl(url, ref), objectKey: ref?.objectKey ?? null });
    vistas++;
  });
  if (vistas) {
    inventario.documentos[`${coleccion}.*`] = inventario.documentos[`${coleccion}.*`] || { docs: 0, total: 0, wee: 0, cloudinary: 0, otro: 0 };
    inventario.documentos[`${coleccion}.*`].docs++;
  }
};

console.log('1 · URLs en documentos');
for (const col of COLECCIONES) {
  let n = 0;
  for await (const doc of db.collection(col).stream()) { visitarDoc(col, doc); n++; }
  console.log(`  ${col}`.padEnd(30) + `${n} documentos`);
}
for (const grupo of GRUPOS) {
  let n = 0;
  try {
    for await (const doc of db.collectionGroup(grupo).stream()) { visitarDoc(`*/${grupo}`, doc); n++; }
    console.log(`  */${grupo}`.padEnd(30) + `${n} documentos`);
  } catch (e) {
    console.log(`  */${grupo}`.padEnd(30) + `— no se pudo leer el grupo (${e.code ?? 'error'})`);
  }
}
inventario.urls = urls;

console.log('\n  por campo'.padEnd(46) + 'total   wee  cloudinary  otro');
for (const [clave, c] of Object.entries(inventario.documentos).sort()) {
  if (clave.endsWith('.*')) continue;
  console.log(`  ${clave}`.padEnd(46) + `${String(c.total).padStart(5)} ${String(c.wee).padStart(5)} ${String(c.cloudinary).padStart(11)} ${String(c.otro).padStart(5)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · LO QUE HAY EN EL BUCKET, ruta por ruta.
// ─────────────────────────────────────────────────────────────────────────────
const objetos = new Map(); // objectKey → bytes
if (!SIN_STORAGE) {
  console.log('\n2 · Storage de Weë por ruta'.padEnd(46) + 'objetos      bytes');
  try {
    for (const prefijo of ['users/', 'images/']) {
      const [archivos] = await storage.getFiles({ prefix: prefijo });
      for (const f of archivos) objetos.set(f.name, Number(f.metadata?.size ?? 0));
    }
    for (const [key, bytes] of objetos) {
      const carpeta = carpetaDe(key);
      inventario.storage[carpeta] = inventario.storage[carpeta] || { objetos: 0, bytes: 0, huerfanos: 0 };
      inventario.storage[carpeta].objetos++;
      inventario.storage[carpeta].bytes += bytes;
    }
    for (const carpeta of Object.keys(CARPETAS_DE_STORAGE)) {
      const s = inventario.storage[carpeta] || { objetos: 0, bytes: 0 };
      console.log(`  ${carpeta}`.padEnd(46) + `${String(s.objetos).padStart(7)} ${String(s.bytes).padStart(10)}   ${CARPETAS_DE_STORAGE[carpeta]}`);
    }
    for (const carpeta of Object.keys(inventario.storage)) {
      if (!CARPETAS_DE_STORAGE[carpeta]) console.log(`  ⚠ ${carpeta}`.padEnd(46) + `${inventario.storage[carpeta].objetos} objetos FUERA de storage.rules`);
    }
  } catch (e) {
    console.log(`  — no se pudo listar el bucket (${e.code ?? e.message})`);
    inventario.storage.error = String(e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · CRUCE: URLs de Weë sin objeto detrás (rotas) y objetos que nadie referencia.
// ─────────────────────────────────────────────────────────────────────────────
if (objetos.size) {
  const referenciados = new Set(urls.filter((u) => u.proveedor === 'wee' && u.objectKey).map((u) => u.objectKey));
  const rotas = urls.filter((u) => u.proveedor === 'wee' && u.objectKey && !objetos.has(u.objectKey));
  const huerfanos = [...objetos.keys()].filter((k) => !referenciados.has(k));
  for (const k of huerfanos) inventario.storage[carpetaDe(k)].huerfanos++;
  inventario.hallazgos.urlsRotas = rotas.map((u) => ({ ruta: u.ruta, campo: u.campo, objectKey: u.objectKey }));
  inventario.hallazgos.objetosSinReferencia = huerfanos;
  console.log(`\n3 · Cruce`);
  console.log(`  URLs de Weë cuyo objeto NO existe (rotas)   ${rotas.length}`);
  for (const r of rotas.slice(0, 20)) console.log(`      ✘ ${r.ruta} · ${r.campo} → ${r.objectKey}`);
  console.log(`  objetos que ningún documento referencia    ${huerfanos.length}`);
  for (const [carpeta, s] of Object.entries(inventario.storage)) if (s.huerfanos) console.log(`      ${carpeta}: ${s.huerfanos}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · LA COLECCIÓN `assets` (Fase 11): cuántas fichas, en qué estado y si cumplen el contrato.
// ─────────────────────────────────────────────────────────────────────────────
{
  const fichas = urls.length ? await db.collection('assets').get() : { docs: [] };
  const porEstado = {}; const porProveedor = {}; let invalidas = 0; let pendientes = 0; const sinObjeto = [];
  for (const d of fichas.docs) {
    const a = d.data();
    porEstado[a.status] = (porEstado[a.status] || 0) + 1;
    const prov = a.storageRef?.provider ?? '(sin referencia)';
    porProveedor[prov] = (porProveedor[prov] || 0) + 1;
    if (!core.materialValido(a)) invalidas++;
    if (a.pendingPhysicalDeletion) pendientes++;
    if (prov === 'wee' && objetos.size && a.status !== 'deleted' && !objetos.has(a.storageRef.objectKey)) sinObjeto.push(d.id);
  }
  inventario.assets = { total: fichas.docs.length, porEstado, porProveedor, invalidas, pendingPhysicalDeletion: pendientes, sinObjeto };
  console.log(`\n4 · assets (Fase 11)`);
  console.log(`  fichas                     ${fichas.docs.length}`);
  console.log(`  por estado                 ${JSON.stringify(porEstado)}`);
  console.log(`  por proveedor              ${JSON.stringify(porProveedor)}`);
  console.log(`  que NO cumplen el contrato ${invalidas}`);
  console.log(`  con borrado físico pendiente ${pendientes}`);
  if (sinObjeto.length) console.log(`  ✘ listas pero sin objeto     ${sinObjeto.length}: ${sinObjeto.slice(0, 10).join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · CLOUDINARY: lo que vive fuera de Weë. Se cuenta; no se toca, no se puede.
// ─────────────────────────────────────────────────────────────────────────────
{
  const deCloudinary = urls.filter((u) => u.proveedor === 'cloudinary');
  const recursos = new Map();
  for (const u of deCloudinary) {
    const k = u.objectKey;
    recursos.set(k, recursos.get(k) || { objectKey: k, tipo: u.tipo, referencias: 0, campos: new Set() });
    recursos.get(k).referencias++;
    recursos.get(k).campos.add(`${u.coleccion}.${u.campo}`);
  }
  inventario.cloudinary = {
    referencias: deCloudinary.length,
    recursos: [...recursos.values()].map((r) => ({ ...r, campos: [...r.campos] })),
  };
  console.log(`\n5 · Cloudinary`);
  console.log(`  referencias en documentos  ${deCloudinary.length}`);
  console.log(`  recursos distintos         ${recursos.size}`);
  for (const r of recursos.values()) console.log(`      ${r.tipo.padEnd(6)} ${r.objectKey}  ← ${[...r.campos].join(', ')}`);
}

const otras = urls.filter((u) => u.proveedor === 'otro');
inventario.hallazgos.urlsDeOtrosSitios = [...new Set(otras.map((u) => u.url.replace(/^(https?:\/\/[^/]+).*$/, '$1')))];
console.log(`\n6 · URLs que no son de ningún almacén de Weë: ${otras.length} (dominios: ${inventario.hallazgos.urlsDeOtrosSitios.join(', ') || '—'})`);

console.log('\nESTE SCRIPT NO HA MODIFICADO NADA.');
if (SALIDA) { fs.writeFileSync(SALIDA, JSON.stringify(inventario, null, 2)); console.log(`inventario → ${SALIDA}`); }
process.exit(0);
