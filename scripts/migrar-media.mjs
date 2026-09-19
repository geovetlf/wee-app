/*
 * MIGRACIÓN DE MATERIAL AL ASSET CORE — PREPARADA, NO EJECUTADA. (Fase 11, §29)
 *
 * Lo que hace, cuando se le autorice:
 *
 *   · por cada URL de material que hoy vive suelta en `posts` (imágenes y
 *     vídeo), `comments` (imagen) y `conversations/*\/messages` (imagen, audio),
 *     crea su ficha en `assets/{assetId}` con dueño (la CUENTA del autor),
 *     atribución (la cara que firmó), referencia al almacén y URL de entrega;
 *   · y deja en el documento de origen el enlace a esa ficha (`assetIds[]`,
 *     `videoAssetId`, `assetId`), SIN quitar la URL: la app de hoy sigue
 *     leyendo lo de siempre.
 *
 * Lo que NO hace, nunca, ni con autorización:
 *
 *   · no borra ningún documento ni ningún objeto;
 *   · no toca Cloudinary (no hay con qué, y los nueve recursos se quedan);
 *   · no mueve archivos de un almacén a otro;
 *   · no migra lo AMBIGUO: un autor `hidi_*` sin `linkedAccountId` no tiene
 *     cuenta que se pueda leer, y adivinarla está prohibido.
 *
 * Es IDEMPOTENTE: el `assetId` sale del origen (`ruta#campo#índice`), así que
 * repetirla no crea duplicados, y un documento que ya lleva su enlace se salta.
 *
 * Uso:
 *   node scripts/migrar-media.mjs                          → DRY-RUN: el plan, sin escribir
 *   node scripts/migrar-media.mjs --json plan.json         → y el plan entero
 *   node scripts/migrar-media.mjs --ejecutar --confirmo-autorizacion
 *                                                          → escribe. SOLO con autorización
 *                                                            explícita del usuario, dada después.
 *   --project get-wee (por defecto)   --bucket <nombre>    --limite N (solo N documentos)
 */
import fs from 'node:fs';
import {
  admin, clasificar, core, cuentaDe, idDeMaterial, iniciar, tipoDeEntidad, tipoPorUrl, arg, bandera,
} from './media-legacy.mjs';

const SALIDA = arg('--json', null);
const LIMITE = Number(arg('--limite', '0')) || 0;
const EJECUTAR = bandera('--ejecutar') && bandera('--confirmo-autorizacion');
if (bandera('--ejecutar') && !EJECUTAR) {
  console.error('Para escribir hacen falta LAS DOS banderas: --ejecutar --confirmo-autorizacion. Sin ellas, dry-run.');
  process.exit(2);
}

const { proyecto, bucket, db, storage } = iniciar();
console.log(`\nMIGRACIÓN DE MATERIAL — proyecto ${proyecto} — ${EJECUTAR ? '⚠ ESCRIBIENDO' : 'DRY-RUN (no escribe)'}\n`);

/* Qué campos de qué colecciones llevan material, y cómo se llama el autor en cada una. */
const ORIGENES = [
  { coleccion: 'posts', autor: (d) => d.userId ?? d.authorId, campos: [
    { campo: 'imageUrls', lista: true, kind: 'image', enlace: 'assetIds', miniaturas: 'imageUrlsThumbnails' },
    { campo: 'videoUrl', lista: false, kind: 'video', enlace: 'videoAssetId' },
  ] },
  { coleccion: 'comments', autor: (d) => d.userId ?? d.authorId, campos: [
    { campo: 'imageUrl', lista: false, kind: 'image', enlace: 'assetId' },
  ] },
  { grupo: 'messages', autor: (d) => d.senderId, campos: [
    { campo: 'imageUrl', lista: false, kind: 'image', enlace: 'assetId' },
    { campo: 'audioUrl', lista: false, kind: 'audio', enlace: 'audioAssetId' },
  ] },
];

const plan = { proyecto, generado: new Date().toISOString(), ejecutado: EJECUTAR, fichas: [], enlaces: [], saltados: [], ambiguos: [], invalidas: [] };
const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : Date.now());

/* La ficha, con el contrato del Core delante: si no lo cumple, no entra en el plan. */
const ficha = async ({ ruta, campo, indice, url, kind, autorId, creadoEn }) => {
  const { proveedor, ref } = clasificar(url);
  if (proveedor === 'otro') return { salto: 'url de otro sitio' };
  const ownerAccountId = await cuentaDe(db, autorId);
  if (!ownerAccountId) return { ambiguo: `autor ${autorId ?? '(sin autor)'} sin cuenta legible` };
  const assetId = idDeMaterial(`${ruta}#${campo}#${indice}`);
  const ahora = Date.now();
  const a = {
    contract: core.CONTENT_CORE_CONTRACT_VERSION,
    assetId,
    kind: kind ?? tipoPorUrl(url, ref),
    status: 'ready',
    ownerAccountId,
    createdByEntityId: autorId,
    createdByEntityType: tipoDeEntidad(autorId),
    storageRef: ref,
    delivery: { url, kind: proveedor === 'wee' ? 'bearer_token' : 'public' },
    provenance: { createdAt: creadoEn },
    metadata: { migradoDe: ruta, campo, fase: 'F11' },
    createdAt: ahora,
    updatedAt: ahora,
  };
  if (!core.materialValido(a)) return { invalida: assetId };
  return { asset: a };
};

let leidos = 0;
for (const origen of ORIGENES) {
  const consulta = origen.grupo ? db.collectionGroup(origen.grupo) : db.collection(origen.coleccion);
  const nombre = origen.grupo ? `*/${origen.grupo}` : origen.coleccion;
  let n = 0;
  for await (const doc of consulta.stream()) {
    if (LIMITE && leidos >= LIMITE) break;
    leidos++; n++;
    const d = doc.data();
    const autorId = origen.autor(d);
    const enlaces = {};
    for (const c of origen.campos) {
      const valor = d[c.campo];
      if (!valor) continue;
      if (d[c.enlace] !== undefined) { plan.saltados.push({ ruta: doc.ref.path, campo: c.campo, motivo: `ya lleva ${c.enlace}` }); continue; }
      const urls = c.lista ? (Array.isArray(valor) ? valor : []) : [valor];
      const ids = [];
      for (let i = 0; i < urls.length; i++) {
        const r = await ficha({ ruta: doc.ref.path, campo: c.campo, indice: i, url: urls[i], kind: c.kind, autorId, creadoEn: millis(d.createdAt ?? d.timestamp) });
        if (r.asset) { plan.fichas.push(r.asset); ids.push(r.asset.assetId); }
        else {
          ids.push(null);
          if (r.ambiguo) plan.ambiguos.push({ ruta: doc.ref.path, campo: c.campo, motivo: r.ambiguo });
          if (r.invalida) plan.invalidas.push({ ruta: doc.ref.path, campo: c.campo, assetId: r.invalida });
          if (r.salto) plan.saltados.push({ ruta: doc.ref.path, campo: c.campo, motivo: r.salto });
        }
      }
      if (ids.some(Boolean)) enlaces[c.enlace] = c.lista ? ids : ids[0];
    }
    if (Object.keys(enlaces).length) plan.enlaces.push({ ruta: doc.ref.path, enlaces });
  }
  console.log(`  ${nombre}`.padEnd(30) + `${n} documentos leídos`);
}

console.log(`\nPLAN`);
console.log(`  fichas de material a crear     ${plan.fichas.length}`);
console.log(`     por proveedor               ${JSON.stringify(plan.fichas.reduce((m, a) => ({ ...m, [a.storageRef.provider]: (m[a.storageRef.provider] || 0) + 1 }), {}))}`);
console.log(`     por tipo                    ${JSON.stringify(plan.fichas.reduce((m, a) => ({ ...m, [a.kind]: (m[a.kind] || 0) + 1 }), {}))}`);
console.log(`  documentos a enlazar           ${plan.enlaces.length}`);
console.log(`  saltados (ya enlazados/otros)  ${plan.saltados.length}`);
console.log(`  AMBIGUOS (no se migran)        ${plan.ambiguos.length}`);
for (const a of plan.ambiguos.slice(0, 10)) console.log(`      ⚠ ${a.ruta} · ${a.campo} → ${a.motivo}`);
console.log(`  que no cumplen el contrato     ${plan.invalidas.length}`);
console.log(`  se borra                       NADA`);
console.log(`  se toca Cloudinary             NO`);

if (EJECUTAR) {
  /* Fichas nuevas con `create` (nunca pisa una existente) y enlaces con `update` de solo esos campos. */
  let creadas = 0; let enlazados = 0;
  for (const a of plan.fichas) {
    try { await db.collection('assets').doc(a.assetId).create(a); creadas++; }
    catch (e) { if (e.code !== 6 && e.code !== 'already-exists') throw e; }
  }
  for (const e of plan.enlaces) { await db.doc(e.ruta).update(e.enlaces); enlazados++; }
  console.log(`\nESCRITO: ${creadas} fichas creadas, ${enlazados} documentos enlazados. Nada borrado.`);
} else {
  console.log('\nDRY-RUN: NO SE HA ESCRITO NADA.');
}

if (SALIDA) { fs.writeFileSync(SALIDA, JSON.stringify(plan, null, 2)); console.log(`plan → ${SALIDA}`); }
void storage; void admin;
process.exit(0);
