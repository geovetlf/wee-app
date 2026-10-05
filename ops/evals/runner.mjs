#!/usr/bin/env node
/*
 * WEE AI EVALUATION ENGINE — CORREDOR DE DESARROLLO (F2-A).
 *
 *   node ops/evals/runner.mjs [--dataset router] [--config ops/evals/config.json]
 *                             [--contra ops/evals/baseline/<d>.json] [--guardar-baseline <archivo>] [--json <archivo>]
 *
 * Corre un dataset del dominio que nombra (`dataset.dominio`, registrado en `dominios.mjs`; hoy, el Router: el router
 * vivo con dependencias falsas), aplica los graders deterministas de ese dominio, puntúa y —si se pide— compara con una baseline inmutable y emite un veredicto. SOLO desarrollo,
 * SOLO graders deterministas, SIN proveedor real, SIN juez-LLM, SIN red, SIN Firestore: COSTE $0 (afirma que no
 * hubo ninguna ejecución de adaptador). Produce EVIDENCIA; nunca cambia producción.
 *
 * Salidas: 0 si ACCEPT/NO_CHANGE (o run simple sin comparar), 1 si REJECT, 3 si REVIEW_REQUIRED, 2 si error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validarDataset, hashCanonico } from './contrato.mjs';
import { DOMINIOS, decidirYCalificar, resolverDominio } from './dominios.mjs';
import { puntuar } from './scoring.mjs';
import { comparar } from './comparar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leerJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/**
 * Ejecuta un dataset: decide, califica y puntúa cada caso. Devuelve scores + hash + ejecuciones (debe ser 0).
 * El dominio sale de `dataset.dominio` y del registro (`dominios`, por defecto DOMINIOS): este corredor no conoce ninguno.
 */
export const ejecutarDataset = async (dataset, config, { dominios = DOMINIOS } = {}) => {
  const dominio = resolverDominio(dominios, dataset && dataset.dominio);
  const errores = validarDataset(dataset, { validarCaso: dominio.validarCaso });
  if (errores.length) throw new Error(`dataset inválido: ${errores.join('; ')}`);
  let ejecuciones = 0;
  const resultados = [];
  const detalle = [];
  for (const caso of dataset.casos) {
    const { decision, graders } = await decidirYCalificar(dominio, caso);
    ejecuciones += decision.ejecuciones;
    resultados.push({ evalCaseId: caso.evalCaseId, graders });
    detalle.push({ evalCaseId: caso.evalCaseId, decision, graders });
  }
  const scores = puntuar(resultados, config);
  return { datasetHash: hashCanonico(dataset.casos), dominio: dataset.dominio, scores, ejecuciones, detalle };
};

/** La forma inmutable que se guarda como baseline (sin el detalle, que no se compara). */
export const baselineDe = (run, dataset) => ({
  version: 1, dominio: run.dominio, datasetVersion: dataset.version, datasetHash: run.datasetHash,
  generado: null, // se rellena fuera (Date.now no está en los corredores puros); el runner CLI lo pone
  scores: run.scores,
});

const resumen = (run) => {
  const l = [];
  l.push(`Eval ${run.dominio} — ${run.scores.n} casos · overall ${run.scores.overall} · aprobados ${run.scores.aprobados}/${run.scores.n} · ejecuciones ${run.ejecuciones} ($0)`);
  for (const dim of Object.keys(run.scores.perDimension)) l.push(`  ${dim}: ${run.scores.perDimension[dim] ?? '—'}`);
  const fallos = run.detalle.filter((d) => d.graders.some((g) => !g.ok));
  for (const f of fallos) for (const g of f.graders.filter((x) => !x.ok)) l.push(`  ✘ ${f.evalCaseId} · ${g.id}: ${g.detail}`);
  return l.join('\n');
};

const arg = (n, def = null) => { const i = process.argv.indexOf(n); return i === -1 ? def : process.argv[i + 1]; };

const principal = async () => {
  const dominio = arg('--dataset', 'router');
  resolverDominio(DOMINIOS, dominio); // un nombre sin registrar no llega a formar una ruta
  const config = leerJson(arg('--config', path.join(RAIZ, 'ops/evals/config.json')));
  const dataset = leerJson(path.join(RAIZ, `ops/evals/datasets/${dominio}/v${1}.json`));
  const run = await ejecutarDataset(dataset, config);
  console.log(resumen(run));
  if (run.ejecuciones !== 0) { console.error('✘ hubo ejecuciones de adaptador: el eval NO fue $0'); return 2; }

  if (arg('--json')) fs.writeFileSync(arg('--json'), `${JSON.stringify({ ...run, detalle: undefined, scores: run.scores }, null, 2)}\n`);

  if (arg('--guardar-baseline')) {
    const base = baselineDe(run, dataset);
    base.generado = new Date().toISOString();
    fs.writeFileSync(arg('--guardar-baseline'), `${JSON.stringify(base, null, 2)}\n`);
    console.log(`baseline guardada en ${arg('--guardar-baseline')}`);
    return 0;
  }

  const contra = arg('--contra');
  if (contra) {
    const base = leerJson(contra);
    if (base.datasetHash !== run.datasetHash) console.log(`⚠ el dataset cambió desde la baseline (hash distinto): compárese contra una baseline del mismo dataset`);
    const v = comparar(base.scores, run.scores, config);
    console.log(`\nVeredicto: ${v.veredicto} · overall ${v.overallBase} → ${v.overallCandidate} (${v.overallDelta >= 0 ? '+' : ''}${v.overallDelta})`);
    for (const m of v.motivos) console.log(`  · ${m}`);
    return v.veredicto === 'REJECT' ? 1 : v.veredicto === 'REVIEW_REQUIRED' ? 3 : 0;
  }
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().then((c) => process.exit(c || 0), (e) => { console.error('eval runner:', e.message); process.exit(2); });
}
