#!/usr/bin/env node
/*
 * COSTE ESTIMADO DE UN TURNO DE `creatorChat` — medición reproducible, sin red ni claves.
 *
 *   node scripts/medir-coste-chat.mjs            # tabla legible
 *   node scripts/medir-coste-chat.mjs --json     # lo mismo, en JSON
 *
 * Cada turno de `creatorChat` hace, como máximo, UNA llamada `text.structure` (`inferAnswers`, creator/planner.ts) con
 * `maxOutputTokens: 512`. Aquí se arma el PEOR prompt posible para cada experiencia (objetivo de 300 caracteres, una
 * respuesta escrita de 300 caracteres por pregunta, todas las preguntas pendientes con sus opciones) y se le pasa el
 * estimador de coste del propio motor (`estimateUsd`, engine/pricing.ts) con las tarifas de lista de CADA modelo de
 * texto del registro. Es un techo: el turno real casi siempre es más corto. Usa el código compilado (`functions/lib`).
 *
 * Lo que NO mide: tokens reales de un proveedor (no hay llamadas), ni el coste de `creatorRun` (que se cobra en Credits).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = (p) => require(path.join(raiz, 'functions/lib', p));

const { TEMPLATES } = lib('creator/templates.js');
const { BRAIN_SYSTEM } = lib('creator/prompts.js');
const { ADAPTERS } = lib('engine/registry.js');
const { estimateUsd } = lib('engine/pricing.js');

const TOPE_OBJETIVO = 300;
const TOPE_RESPUESTA = 300;
const SALIDA_MAXIMA = 512;
/* La cola fija del prompt de `inferAnswers` (instrucciones tras el JSON de preguntas): se cuenta por exceso. */
const COLA_DEL_PROMPT = 'x'.repeat(420);

const modelos = Object.entries(ADAPTERS)
  .flatMap(([proveedor, a]) => a.models.filter((m) => m.cost?.unit === 'mtoken').map((m) => ({ proveedor, modelo: m })))
  .sort((a, b) => a.modelo.cost.usd - b.modelo.cost.usd);

const filas = [];
for (const [experiencia, plantilla] of Object.entries(TEMPLATES)) {
  const preguntas = plantilla.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options.filter((o) => o.id !== 'idk').map((o) => ({ id: o.id, label: o.label })),
  }));
  const textoLibre = ['o'.repeat(TOPE_OBJETIVO), ...preguntas.map(() => 'r'.repeat(TOPE_RESPUESTA))];
  const prompt = `La persona escribió: ${textoLibre.map((t) => `"${t}"`).join(' / ')}.\n\nPreguntas pendientes con sus opciones (JSON): ${JSON.stringify(preguntas)}\n\n${COLA_DEL_PROMPT}`;
  const entrada = { system: BRAIN_SYSTEM, prompt, maxOutputTokens: SALIDA_MAXIMA };
  const porModelo = modelos.map(({ proveedor, modelo }) => ({
    proveedor,
    modelo: modelo.id,
    usd: estimateUsd(modelo, 'text.structure', entrada, {}),
  }));
  filas.push({
    experiencia,
    preguntas: preguntas.length,
    caracteres: (BRAIN_SYSTEM + prompt).length,
    tokensEntradaEstimados: Math.max(400, Math.round((BRAIN_SYSTEM + prompt).length / 4) + 300),
    porModelo,
  });
}

const peor = Math.max(...filas.flatMap((f) => f.porModelo.map((m) => m.usd)));
const masBarato = Math.min(...filas.flatMap((f) => f.porModelo.map((m) => m.usd)));
const resultado = { salidaMaxima: SALIDA_MAXIMA, peorUsdPorTurno: peor, masBaratoUsdPorTurno: masBarato, filas };

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(resultado, null, 2));
} else {
  console.log(`Peor caso por turno de creatorChat (entrada máxima, ${SALIDA_MAXIMA} tokens de salida), USD:\n`);
  for (const f of filas) {
    const caro = f.porModelo.reduce((a, b) => (b.usd > a.usd ? b : a));
    const barato = f.porModelo.reduce((a, b) => (b.usd < a.usd ? b : a));
    console.log(`  ${f.experiencia.padEnd(10)} ${String(f.preguntas).padStart(2)} preguntas · ~${f.tokensEntradaEstimados} tokens de entrada · ` +
      `${barato.usd.toFixed(6)} (${barato.modelo}) … ${caro.usd.toFixed(6)} (${caro.modelo})`);
  }
  console.log(`\n  techo absoluto por turno: ${peor.toFixed(6)} USD · el modelo más barato: ${masBarato.toFixed(6)} USD`);
}
