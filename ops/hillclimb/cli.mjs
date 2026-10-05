#!/usr/bin/env node
/*
 * WEË HILLCLIMB (F6) — la línea de órdenes.
 *
 *   node ops/hillclimb/cli.mjs --dominio router [--max 12] [--json] [--escribir]
 *                              [--holdout --rol eval-holdout --motivo "por qué se toca el holdout"]
 *
 * Corre el bucle sobre el dataset de desarrollo del dominio (ops/evals/datasets/<d>/v1.json) contra su baseline
 * comprometida (ops/evals/baseline/<d>.json), con la configuración común (ops/evals/config.json) y el registro de
 * dominios de desarrollo. Imprime el Markdown, o el JSON con --json.
 *  · --escribir guarda los dos por la puerta de F3, como la extensión `hillclimb`, en ops/harness/.cache/hillclimb/.
 *  · --holdout confirma la propuesta en el holdout sellado (ops/evals/datasets/<d>/holdout-v1.json) con el rol y el
 *    motivo que exige el Eval Engine. Un uso del holdout SIEMPRE queda registrado: --holdout exige --escribir, y el
 *    historial de usos (holdout-usos.json, en la misma caché) es el que impide consumirlo dos veces por candidato.
 * Nunca aplica nada: no escribe en Firestore, no cambia configuración, no hace commit, push, merge ni despliegue.
 * Salidas: 0 si terminó (con propuesta o sin ella), 2 si hubo un error (también una baseline desfasada).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DOMINIOS, resolverDominio } from '../evals/dominios.mjs';
import { CACHE, actuar, cargarRegistro } from '../harness/extensiones.mjs';
import { aJSON, aMarkdown, confirmarEnHoldout, escalar, MAX_EXPERIMENTOS_POR_DEFECTO } from './hillclimb.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EXTENSION = 'hillclimb';
const USOS = 'holdout-usos.json';

const leerJson = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));

/** El historial de usos del holdout, de la caché de la extensión (vacío si no hay). */
export const leerUsos = (raiz = RAIZ) => {
  const archivo = path.join(raiz, CACHE, EXTENSION, USOS);
  return fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : [];
};

/** Guarda por la puerta de F3, como la extensión `hillclimb`: solo los informes que declara su manifiesto. */
export const guardar = (archivos, { raiz = RAIZ, registro } = {}) => {
  const reg = registro || cargarRegistro({ raiz });
  return archivos.map(([archivo, contenido]) => {
    const r = actuar(reg, EXTENSION, { tipo: 'escribir', ruta: `${CACHE}/${EXTENSION}/${archivo}` }, { raiz, contenido });
    return { archivo, hecho: r.hecho, motivo: r.motivo };
  });
};

const principal = async (args) => {
  const valor = (op) => { const i = args.indexOf(op); return i === -1 ? undefined : args[i + 1]; };
  const nombre = valor('--dominio') || 'router';
  resolverDominio(DOMINIOS, nombre); // un nombre sin registrar no llega a formar una ruta
  const max = valor('--max') === undefined ? MAX_EXPERIMENTOS_POR_DEFECTO : Number(valor('--max'));
  const escribir = args.includes('--escribir');
  if (args.includes('--holdout') && !escribir) throw new Error('--holdout exige --escribir: un uso del holdout siempre queda registrado');

  const config = leerJson('ops/evals/config.json');
  let registro = await escalar({
    registro: DOMINIOS, config, max,
    dataset: leerJson(`ops/evals/datasets/${nombre}/v1.json`),
    baseline: leerJson(`ops/evals/baseline/${nombre}.json`),
  });
  const archivos = [];
  if (args.includes('--holdout') && registro.resultado.estado !== 'PENDIENTE_DE_HOLDOUT') console.error('· sin propuesta: el holdout no se toca');
  else if (args.includes('--holdout')) {
    const usos = leerUsos();
    registro = await confirmarEnHoldout({
      escalada: registro, registro: DOMINIOS, config,
      holdout: leerJson(`ops/evals/datasets/${nombre}/holdout-v1.json`),
      autorizacion: { rol: valor('--rol'), motivo: valor('--motivo'), historial: usos },
    });
    archivos.push([USOS, `${JSON.stringify([...usos, { candidateVersion: registro.holdout.usoDe, dominio: nombre, motivo: valor('--motivo') }], null, 2)}\n`]);
  }
  process.stdout.write(args.includes('--json') ? aJSON(registro) : aMarkdown(registro));
  if (escribir) {
    archivos.unshift(['hillclimb.json', aJSON(registro)], ['hillclimb.md', aMarkdown(registro)]);
    const hechos = guardar(archivos);
    for (const r of hechos) console.error(`${r.hecho ? '✔' : '✘'} ${r.archivo}: ${r.hecho ? `${CACHE}/${EXTENSION}/${r.archivo}` : r.motivo}`);
    if (hechos.some((r) => !r.hecho)) return 2;
  }
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`✘ ${e.message}`); process.exit(2); });
}
