/**
 * LAS COTAS DE TIEMPO SIGUEN PROTEGIENDO LO QUE PROTEGÍAN — `functions/test/_cpu.mjs` (Guardian · revisión previa a integración, 2026-10-15).
 *
 *   node test/cotas-de-tiempo.test.mjs        (desde functions/; tarda ~1 min: ejecuta copias de siete suites)
 *
 * Ocho cotas de tiempo pasaron del reloj de pared a la CPU del proceso (`_cpu.mjs`) para que no fallen por la carga de la máquina. Cambiar la
 * medida es peligroso: una cota que ya no puede fallar no protege nada. Esta suite demuestra que cada una SIGUE pudiendo fallar:
 *
 *   A  `_cpu.mjs`: mide trabajo (un bucle de CPU suma), no espera (dormir no suma), y `mejorDe` toma el mínimo.
 *   B  SENSIBILIDAD: de cada suite convertida se ejecuta una COPIA cuyo `cpuDe` suma una carga de CPU mayor que su cota (mutante: «el código
 *      se volvió lento»). La copia tiene que FALLAR, y precisamente en la comprobación de tiempo. Sin carga, la copia pasa (control).
 *   C  que `core-workflow` mantiene su sensibilidad (cota recalibrada a 3500 ms de CPU: ver docs/GUARDIAN-ESTADO.md §5 con la medición de la
 *      cota antigua de pared y de la nueva frente a un mutante algorítmico).
 *
 * Lo que esto NO dice, y se declara: la mayoría de estas cotas ya eran HOLGADAS en la medida antigua (decenas o cientos de veces lo que tarda
 * el código en reposo): detectan «el código se rompió», no «el código se volvió 3 veces más lento». No se apretaron aquí porque no se puede
 * medir su reposo con precisión (en Windows `process.cpuUsage()` tiene ~15 ms de resolución); queda como decisión del dueño sustituirlas por
 * pruebas de complejidad (razón entre tamaños), no por cotas absolutas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const FUNCIONES = path.resolve(aqui, '..');
let fallos = 0;
const check = (n, c, extra = '') => { console.log(`${c ? '✔' : '✘'} ${n}${extra ? ` — ${extra}` : ''}`); if (!c) fallos++; };
const { cpuDe, mejorDe } = await import(pathToFileURL(path.join(aqui, '_cpu.mjs')).href);

console.log('\n── A · La medida: trabajo sí, espera no ──');
{
  const ocupado = (ms) => { const a = process.cpuUsage(); while ((process.cpuUsage(a).user + process.cpuUsage(a).system) / 1000 < ms); };
  const w = cpuDe(() => { ocupado(120); return 7; });
  check('1) un bucle de CPU de 120 ms suma ~120 ms (y devuelve el valor)', w.valor === 7 && w.ms >= 110 && w.ms < 400, `${Math.round(w.ms)} ms`);
  const t0 = performance.now();
  const e = cpuDe(() => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300));
  check('2) 300 ms dormido NO suman (menos de 60 ms de CPU)', e.ms < 60 && performance.now() - t0 >= 290, `${Math.round(e.ms)} ms de CPU`);
  let n = 0;
  const m = mejorDe(3, () => { n++; ocupado(n === 2 ? 30 : 90); });
  check('3) mejorDe repite la MEDIDA y toma la menor (la cota se aplica al mejor caso real); no repite ninguna comprobación', n === 3 && m.ms < 80, `${Math.round(m.ms)} ms`);
}

console.log('\n── B · Sensibilidad: con el código «lento», cada cota falla ──');
/* Una copia de `_cpu.mjs` cuyo cpuDe suma GUARDIAN_CARGA_MS de CPU antes de medir f. Es el mutante «el código se volvió lento». */
const CPU_LENTO = `
const carga = Number(process.env.GUARDIAN_CARGA_MS || 0);
const ocupado = (ms) => { const a = process.cpuUsage(); while ((process.cpuUsage(a).user + process.cpuUsage(a).system) / 1000 < ms); };
export const cpuDe = (f) => {
  const antes = process.cpuUsage();
  ocupado(carga);
  const valor = f();
  const d = process.cpuUsage(antes);
  return { valor, ms: (d.user + d.system) / 1000 };
};
export const mejorDe = (veces, f) => { let mejor = null; for (let i = 0; i < veces; i++) { const r = cpuDe(f); if (!mejor || r.ms < mejor.ms) mejor = r; } return mejor; };
`;
const ARCHIVO_LENTO = path.join(aqui, `_cpu-lento-${process.pid}.mjs`);
fs.writeFileSync(ARCHIVO_LENTO, CPU_LENTO);
const SUITES = [
  /* [suite, cota en ms, patrón de la comprobación de tiempo que debe fallar] */
  ['core-workflow', 3500, /^✘ 163\)/m],
  ['core-router', 3000, /^✘ 98\.\d+\)/m],
  ['core-job', 5000, /^✘ 192\)/m],
  ['core-orchestrator', 5000, /^✘ 121\)/m],
  ['cercania', 1500, /^✘ el cálculo es rápido/m],
  ['algorithm-decomposition', 200, /^✘ 16\)/m],
];
const corre = (suite, carga) => new Promise((resolve) => {
  const copia = `_mut-cotas-${suite}-${carga}-${process.pid}.test.mjs`;
  const texto = fs.readFileSync(path.join(aqui, `${suite}.test.mjs`), 'utf8');
  if (!texto.includes("'./_cpu.mjs'")) { resolve({ suite, codigo: null, salida: 'la suite no importa ./_cpu.mjs' }); return; }
  fs.writeFileSync(path.join(aqui, copia), texto.split("'./_cpu.mjs'").join(`'./${path.basename(ARCHIVO_LENTO)}'`));
  let salida = '';
  const h = spawn(process.execPath, [path.join(aqui, copia)], { cwd: FUNCIONES, env: { ...process.env, GUARDIAN_CARGA_MS: String(carga) } });
  h.stdout.on('data', (d) => { salida += d; }); h.stderr.on('data', (d) => { salida += d; });
  h.on('close', (codigo) => { fs.rmSync(path.join(aqui, copia), { force: true }); resolve({ suite, codigo, salida }); });
});
try {
  const [controles, lentas] = await Promise.all([
    Promise.all(SUITES.map(([s]) => corre(s, 0))),
    Promise.all(SUITES.map(([s, cota]) => corre(s, cota + 400))),
  ]);
  SUITES.forEach(([s, cota, patron], i) => {
    check(`4.${s}) control: con carga 0 la copia pasa (el mutante solo falla por la carga)`, controles[i].codigo === 0, `salida ${controles[i].codigo}`);
    check(`5.${s}) con ${cota + 400} ms de CPU añadidos (más que su cota de ${cota} ms) la copia FALLA, y en la comprobación de tiempo`, lentas[i].codigo === 1 && patron.test(lentas[i].salida), `salida ${lentas[i].codigo}${patron.test(lentas[i].salida) ? '' : ': ' + lentas[i].salida.split('\n').filter((l) => /^✘/.test(l)).slice(0, 2).join(' | ')}`);
  });
} finally {
  fs.rmSync(ARCHIVO_LENTO, { force: true });
}

console.log('\n── C · Que las suites usan la medida común y no la de pared ──');
for (const [s] of SUITES) {
  const t = fs.readFileSync(path.join(aqui, `${s}.test.mjs`), 'utf8');
  check(`6.${s}) importa _cpu.mjs y no queda ninguna medida de tiempo de pared en su cota`, /from '\.\/_cpu\.mjs'/.test(t) && !/performance\.now\(\)\s*-\s*t0\s*<|hrtime\.bigint\(\)\s*-\s*(t0|inicio|ini)\)\s*\/\s*1e6\s*<\s*\d/.test(t));
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
