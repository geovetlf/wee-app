#!/usr/bin/env node
/*
 * LA CI CORRE SIN NADA REAL — Weë Agent Harness, FASE 5.
 *
 * Falla si el entorno trae una clave de proveedor, una credencial de Google o
 * un proyecto real. La CI de Weë no llama a APIs de IA, no mueve Credits y no
 * genera gasto: sin clave, cada proveedor "no existe" para el router y todo va
 * en modo demo. Si alguien añade un secreto al workflow, este paso lo para
 * antes de que una prueba pueda usarlo. Solo dice NOMBRES, nunca valores.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Qué hay de real en `env`, por nombre. `secretos` = los nombres que declaran las Functions. */
export const motivos = (env, secretos) => {
  const fuera = [];
  for (const nombre of secretos) if (String(env[nombre] || '').trim()) fuera.push(`${nombre} trae valor`);
  for (const nombre of ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_GHA_CREDS_PATH', 'CLOUDSDK_AUTH_ACCESS_TOKEN', 'FIREBASE_TOKEN']) {
    if (String(env[nombre] || '').trim()) fuera.push(`${nombre} está definida`);
  }
  for (const nombre of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT']) {
    const v = String(env[nombre] || '').trim();
    if (v && !v.startsWith('demo-')) fuera.push(`${nombre}=${v} no es un proyecto demo-*`);
  }
  return fuera;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { SECRETOS } = await import(pathToFileURL(path.join(RAIZ, 'scripts/emulators.mjs')).href);
  const fuera = motivos(process.env, SECRETOS);
  if (fuera.length) {
    console.error('✘ La CI no corre con nada real:');
    for (const m of fuera) console.error(`  · ${m}`);
    process.exit(1);
  }
  console.log(`✔ Sin claves de proveedor (${SECRETOS.length} nombres revisados), sin credenciales de Google y sin proyecto real.`);
}
