#!/usr/bin/env node
/**
 * 15 · EFECTO DE CADA PROTOTIPO — la medida antes/después y la comprobación de que no cambia lo que hace el código.
 *
 * Construye (14) una variante del `lib` por cada parche propuesto y por todos juntos, ejecuta el MISMO escenario fijo
 * (15a) contra la base y contra cada variante en procesos separados, y compara:
 *
 *   · EFECTO: RPC y rondas en serie de cada petición, y la suma;
 *   · EQUIVALENCIA: lo que devuelve cada petición y TODOS los documentos que quedan (normalizados) tienen que ser
 *     idénticos a los de la base. Se exceptúa `aiProviderVerification/*`, que PR2 cambia a propósito (se muestra aparte).
 *
 * Es una medida de ESTRUCTURA (llamadas y rondas con 1 ms virtual por llamada); no dice cuántos milisegundos reales se
 * ahorran: eso es rondas × la latencia real de Firestore, que es un dato desconocido [D].
 *
 *     node scripts/bench-r7/15-prototipos-efecto.mjs --destino <carpeta>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { FUNCTIONS, RAIZ, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
import { construir } from './14-construir-prototipo.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const destino = path.resolve(arg('destino', path.join(os.tmpdir(), 'wee-r7-proto')));
fs.mkdirSync(destino, { recursive: true });
const IDS = ['PR1', 'PR2', 'PR3', 'PR4', 'PR5'];
const variantes = [['base', null], ...IDS.map((id) => [id, [id]]), ['todos', IDS]];

const correr = (lib) => {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'scripts/bench-r7/15a-escenario-de-equivalencia.mjs')], { env: { ...process.env, ...(lib ? { BENCH_R7_LIB: lib } : {}) }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const trozo = (r.stdout || '').split('@@RESULTADO@@')[1];
  if (!trozo) throw new Error(`sin resultado (${r.status}): ${(r.stderr || r.stdout).slice(0, 400)}`);
  return JSON.parse(trozo);
};

const resultados = {};
for (const [nombre, ids] of variantes) {
  const lib = ids ? construir(nombre, ids, destino).lib : null;
  resultados[nombre] = correr(lib);
}
const base = resultados.base;

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const diferencias = (a, b) => {
  const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
  const d = [];
  for (const k of claves) if (!igual(a[k], b[k])) d.push(k);
  return d;
};
const resumen = Object.entries(resultados).map(([nombre, r]) => {
  const sumaRpc = r.pasos.reduce((a, p) => a + p.rpc, 0);
  const sumaRondas = r.pasos.reduce((a, p) => a + p.rondas, 0);
  const retornosIguales = r.pasos.every((p, i) => igual({ ok: p.ok, error: p.error, retorno: p.retorno }, { ok: base.pasos[i].ok, error: base.pasos[i].error, retorno: base.pasos[i].retorno }));
  const docsDistintos = diferencias(r.estado, base.estado);
  return { nombre, sumaRpc, sumaRondas, retornosIguales, docsDistintos, verificacion: r.verificacion };
});

const md = [];
md.push('# 15 · Efecto de cada prototipo (medida antes/después) y equivalencia\n');
md.push('Medido con `scripts/bench-r7/15-prototipos-efecto.mjs`: el mismo escenario de 14 peticiones reales, contra el `lib` de este árbol (base) y contra variantes construidas FUERA del árbol con los diffs de `scripts/bench-r7/proto/` (transpilados, sin comprobar tipos). Rondas con 1 ms virtual por llamada.\n');
md.push('## Por petición: RPC / rondas\n');
md.push(tabla(['Petición', ...resumen.map((r) => r.nombre)], base.pasos.map((p, i) => [p.nombre, ...resumen.map((r) => `${resultados[r.nombre].pasos[i].rpc} / ${resultados[r.nombre].pasos[i].rondas}`)])));
md.push('\n## Totales y equivalencia con la base\n');
md.push(tabla(['Variante', 'Σ RPC', 'Δ RPC', 'Σ rondas', 'Δ rondas', 'Lo que devuelve cada petición', 'Documentos distintos de la base (sin aiProviderVerification)'],
  resumen.map((r) => [r.nombre, r.sumaRpc, `${r.sumaRpc - resumen[0].sumaRpc} (${(100 * (r.sumaRpc / resumen[0].sumaRpc - 1)).toFixed(0)} %)`, r.sumaRondas, `${r.sumaRondas - resumen[0].sumaRondas} (${(100 * (r.sumaRondas / resumen[0].sumaRondas - 1)).toFixed(0)} %)`, r.retornosIguales ? 'idéntico' : 'DISTINTO', r.docsDistintos.length ? r.docsDistintos.join(', ') : 'ninguno'])));
md.push('\n## `aiProviderVerification` al final (PR2 lo cambia a propósito: menos escrituras, `successes` por incremento)\n');
md.push('```json\n' + JSON.stringify(Object.fromEntries(resumen.map((r) => [r.nombre, r.verificacion])), null, 1) + '\n```');
const dir = guardar('15-prototipos-efecto', { resumen: resumen.map(({ verificacion, ...r }) => r), pasos: Object.fromEntries(Object.entries(resultados).map(([n, r]) => [n, r.pasos.map(({ nombre, rpc, rondas, lecturas, escrituras }) => ({ nombre, rpc, rondas, lecturas, escrituras }))])) }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
