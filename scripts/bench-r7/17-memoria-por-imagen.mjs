#!/usr/bin/env node
/**
 * 17 · MEMORIA QUE RETIENE UNA PETICIÓN CON UNA FOTO — para saber cuántas caben a la vez en una instancia.
 *
 * Los adaptadores (`deepseek.ts`, `seedream.ts`, `flux.ts`, `gemini.ts`) leen la foto de la persona ENTERA con `readImage`
 * (`engine/http.ts`: `file.download()` → `Buffer`), la pasan a base64 (`toDataUri`/`toString('base64')`), la meten en el cuerpo
 * JSON (`JSON.stringify`) y `fetch` convierte ese texto en bytes otra vez. Aquí se REPITE esa cadena de copias con una foto
 * sintética (sin red, sin proveedor) y se mide cuánta memoria deja viva a la vez, en un proceso limpio con el recolector
 * forzado. NO ejecuta código de Weë: reproduce las MISMAS operaciones de Node sobre un archivo de N MiB.
 *
 *   «cabe» = cuántas peticiones simultáneas caben en la memoria de una instancia SI TODAS retienen a la vez su pico (cota
 *   inferior del riesgo; la concurrencia real de cada Function es desconocida [D], ver script 09).
 *
 *     node scripts/bench-r7/17-memoria-por-imagen.mjs
 */
import { spawnSync } from 'node:child_process';
import { tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

const guion = (mib) => `
  const MiB = 1048576;
  const mem = () => { global.gc(); const m = process.memoryUsage(); return { rss: m.rss, heap: m.heapUsed, ext: m.external, ab: m.arrayBuffers }; };
  const base = mem();
  /* 1. el archivo entero, como lo devuelve file.download() */
  const buffer = Buffer.alloc(${mib} * MiB, 7);
  const m1 = mem();
  /* 2. base64 + data URI, como toDataUri() */
  const uri = 'data:image/jpeg;base64,' + buffer.toString('base64');
  const m2 = mem();
  /* 3. el cuerpo JSON de la petición */
  const cuerpo = JSON.stringify({ model: 'x', messages: [{ role: 'user', content: [{ type: 'text', text: 'Hola' }, { type: 'image_url', image_url: { url: uri } }] }] });
  const m3 = mem();
  /* 4. fetch convierte el texto en bytes para enviarlo */
  const bytes = Buffer.from(cuerpo, 'utf8');
  const m4 = mem();
  /* La memoria externa ya incluye los búferes (arrayBuffers es un subconjunto): sumarlos contaría el archivo dos veces. */
  const delta = (a) => Number(((a.heap + a.ext - base.heap - base.ext) / MiB).toFixed(1));
  console.log(JSON.stringify({ mib: ${mib}, archivo: delta(m1), conBase64: delta(m2), conCuerpo: delta(m3), conBytes: delta(m4), vivos: [buffer.length, uri.length, cuerpo.length, bytes.length].length }));
`;
const filas = [];
for (const mib of [2, 5, 10, 20]) {
  const r = spawnSync(process.execPath, ['--expose-gc', '-e', guion(mib)], { encoding: 'utf8', timeout: 120_000 });
  const linea = (r.stdout || '').trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (!linea) { filas.push({ mib, error: (r.stderr || r.stdout).slice(0, 200) }); continue; }
  filas.push(JSON.parse(linea));
}
const INSTANCIA_MIB = 512;
const md = [];
md.push('# 17 · Memoria que retiene una petición con una foto (cadena de copias de los adaptadores)\n');
md.push('Medido con `scripts/bench-r7/17-memoria-por-imagen.mjs` (proceso Node limpio, recolector forzado; MiB de memoria viva sumando montón y memoria externa). Las cuatro columnas son lo que hay VIVO tras cada paso.\n');
md.push(tabla(['Foto (MiB)', '1 · archivo', '2 · + base64/URI', '3 · + cuerpo JSON', '4 · + bytes del envío (pico)', `Caben en ${INSTANCIA_MIB} MiB (si todas retienen su pico)`], filas.map((f) => (f.error ? [f.mib, 'ERROR', f.error, '', '', ''] : [f.mib, f.archivo, f.conBase64, f.conCuerpo, f.conBytes, Math.floor(INSTANCIA_MIB / f.conBytes)]))));
md.push(`\nTope de lectura del motor (\`MAX_INPUT_BYTES\`, engine/http.ts): 20 MiB por archivo. Con una foto de ese tamaño, UNA petición retiene ≈ ${filas.find((f) => f.mib === 20)?.conBytes ?? '?'} MiB a la vez.`);
const dir = guardar('17-memoria-por-imagen', { INSTANCIA_MIB, filas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
