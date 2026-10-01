#!/usr/bin/env node
/*
 * NINGÚN DESPLIEGUE FUERA DEL WORKFLOW — Weë Agent Harness, FASE 7.
 *
 * Orden del dueño (2026-10-01): «Nunca permitir deploy directo desde el
 * portátil. Nunca permitir deploy desde cualquier worktree.»
 *
 * Es el primer `predeploy` de cada objetivo de firebase.json (functions,
 * firestore, storage y los dos hosting): firebase-tools lo ejecuta antes de
 * subir nada y, si sale con error, no despliega. Solo deja pasar el workflow
 * `despliegue.yml` de main de geovetlf/wee-app corriendo en GitHub Actions, al
 * que se llega con la CI en verde, la aprobación del dueño y WIF.
 *
 * Es una cerradura contra el ACCIDENTE —un `firebase deploy` en un portátil o en
 * un worktree—, no la de seguridad: esas variables se pueden fingir. La de
 * verdad es IAM: la cuenta de despliegue solo la obtiene ese workflow.
 *
 *   node scripts/solo-desde-el-workflow.mjs <objetivo>
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPOSITORIO = 'geovetlf/wee-app';
export const WORKFLOW = `${REPOSITORIO}/.github/workflows/despliegue.yml@refs/heads/main`;

/** Pura: por qué NO se despliega con este entorno (vacío = se puede). */
export const motivos = (env) => {
  const m = [];
  if (env.GITHUB_ACTIONS !== 'true') m.push('no corre en GitHub Actions (un portátil o un worktree no despliegan)');
  if (env.GITHUB_REPOSITORY !== REPOSITORIO) m.push(`el repositorio no es ${REPOSITORIO}`);
  if (!String(env.GITHUB_WORKFLOW_REF || '').startsWith(WORKFLOW)) m.push('no es el workflow despliegue.yml de main');
  if (env.GITHUB_REF !== 'refs/heads/main') m.push('no se lanzó desde main');
  if (env.GCLOUD_PROJECT && env.GCLOUD_PROJECT !== 'get-wee') m.push(`el proyecto es ${env.GCLOUD_PROJECT}, no get-wee`);
  return m;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const objetivo = process.argv[2] || 'este objetivo';
  const m = motivos(process.env);
  if (m.length) {
    console.error(`✘ ${objetivo}: aquí no se despliega — ${m.join('; ')}.`);
    console.error('  Producción cambia por un solo camino: .github/workflows/despliegue.yml (docs/DEPLOYMENT.md §6).');
    console.error('  Una marcha atrás NO es un despliegue: es mover el tráfico (docs/DEPLOYMENT.md §5).');
    process.exit(1);
  }
  console.log(`✔ ${objetivo}: despliegue desde ${WORKFLOW}, ejecución ${process.env.GITHUB_RUN_ID || '¿?'} de ${process.env.GITHUB_ACTOR || '¿?'}`);
}
