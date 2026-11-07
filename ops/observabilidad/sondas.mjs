#!/usr/bin/env node
/*
 * LAS SONDAS DE DATOS — Frente H. Lo que Cloud Monitoring no ve porque vive en Firestore: reservas de Credits
 * retenidas, generaciones cobradas sin asiento, trabajos parados y coste del día (definidas en lanzamiento.mjs).
 *
 *   node ops/observabilidad/sondas.mjs --simular <datos.json>   # sin red: evalúa una instantánea { "coleccion": [docs planos] }
 *   node ops/observabilidad/sondas.mjs --produccion             # SOLO LEE get-wee con la API REST de Firestore
 *
 * En producción usa el token de la sesión de gcloud del que lo corre (`gcloud auth print-access-token`): se
 * guarda en memoria, va en una cabecera y nunca se imprime. Las únicas peticiones son `:runQuery` y
 * `documents:batchGet`, que son lecturas (lo fija functions/test/observabilidad-lanzamiento.test.mjs).
 * Sale con 0 si todas PASAN, 1 si alguna FALLA, 2 si no se pudo empezar.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROYECTO, SONDAS, correrSondas, deFirestore } from './lanzamiento.mjs';

const BASE = (proyecto) => `https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents`;

/** Las dos únicas formas de petición: ambas leen. */
export const PETICIONES_PERMITIDAS = Object.freeze([':runQuery', ':batchGet']);

/** Lector REST de Firestore, solo lectura. `pedir` es fetch (inyectable). */
export const lectorRest = ({ proyecto = PROYECTO, token, pedir = globalThis.fetch }) => {
  const post = async (sufijo, cuerpo) => {
    if (!PETICIONES_PERMITIDAS.includes(sufijo)) throw new Error(`petición no permitida: ${sufijo}`);
    const r = await pedir(`${BASE(proyecto)}${sufijo}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`Firestore respondió ${r.status}`);
    return JSON.parse(t || '[]');
  };
  return {
    consulta: async (_coleccion, cuerpo) => (await post(':runQuery', cuerpo)).filter((x) => x.document).map((x) => deFirestore(x.document)),
    documentos: async (rutas) => {
      if (!rutas.length) return [];
      const docs = [];
      for (let i = 0; i < rutas.length; i += 100) {
        const r = await post(':batchGet', { documents: rutas.slice(i, i + 100).map((p) => `projects/${proyecto}/databases/(default)/documents/${p}`) });
        for (const x of r) if (x.found) docs.push(deFirestore(x.found));
      }
      return docs;
    },
  };
};

/** Lector de una instantánea local: { coleccion: [documentos planos con id] } y { "coleccion/id": doc }. */
export const lectorDeInstantanea = (datos) => ({
  consulta: async (coleccion) => (datos[coleccion] || []).map((d) => ({ ...d, __ruta: `${coleccion}/${d.id}` })),
  documentos: async (rutas) => rutas.flatMap((r) => {
    const [col, id] = r.split('/');
    const d = (datos[col] || []).find((x) => x.id === id) || datos[r];
    return d ? [{ id, ...d, __ruta: r }] : [];
  }),
});

export const imprimir = (resultados, log = console.log) => {
  for (const r of resultados) {
    log(`${r.estado === 'PASA' ? 'PASA ' : 'FALLA'}  ${r.titulo} — ${r.detalle}`);
    if (r.queHacer) log(`       → ${r.queHacer}`);
  }
  const fallan = resultados.filter((r) => r.estado !== 'PASA').length;
  log(fallan ? `\n✘ ${fallan} sonda(s) fallan` : `\n✔ las ${resultados.length} sondas pasan`);
  return fallan ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--simular');
  let leer;
  if (i >= 0) leer = lectorDeInstantanea(JSON.parse(fs.readFileSync(argv[i + 1], 'utf8')));
  else if (argv.includes('--produccion')) {
    const r = spawnSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', shell: process.platform === 'win32' });
    const token = (r.stdout || '').trim();
    if (r.status !== 0 || !token) { console.error('✘ sin sesión de gcloud: gcloud auth login'); process.exit(2); }
    leer = lectorRest({ token });
  } else {
    console.log('Uso: --simular <datos.json> | --produccion (solo lectura). Sondas:');
    for (const s of SONDAS) console.log(`  ${s.id}: ${s.titulo}`);
    process.exit(2);
  }
  console.log(`# Weë · sondas de datos (${i >= 0 ? 'instantánea local' : `${PROYECTO}, solo lectura`})\n`);
  process.exit(imprimir(await correrSondas(leer)));
}
