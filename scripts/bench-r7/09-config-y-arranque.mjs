#!/usr/bin/env node
/**
 * 09 · CONFIGURACIÓN DECLARADA DE LAS FUNCTIONS Y COSTE DE ARRANQUE DEL PAQUETE.
 *
 * Parte A (MEDIDO, de `functions/lib/index.js`): memoria, tiempo límite, instancias mínimas/máximas, concurrencia y CPU
 * que declara el código de cada Function exportada (`__endpoint`). Lo que NO declara (`cpu`, `concurrency`, `minInstances`)
 * lo decide la herramienta de despliegue; el SDK instalado dice cuál es su valor por defecto (se imprime su texto).
 *
 * Parte B (MEDIDO en esta máquina, CPU de UN núcleo): cuánto cuesta CARGAR el paquete entero —lo que hace cada instancia
 * nueva, porque las ≈38 Functions viven en un solo `index.js`— y cuánto cuesta cargar solo el módulo de Weë Brain. Es un
 * PROXY de la parte de arranque en frío que es CPU de JavaScript; no incluye el arranque del contenedor, ni Secret Manager,
 * ni la primera conexión a Firestore (esas partes quedan [D]).
 *
 *     node scripts/bench-r7/09-config-y-arranque.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { tabla, FUNCTIONS } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

const requerir = createRequire(path.join(FUNCTIONS, 'package.json'));
process.env.GCLOUD_PROJECT = 'demo-wee';

/* ── A · lo declarado ── */
const indice = requerir(path.join(FUNCTIONS, 'lib', 'index.js'));
/* Un número declarado, o nada: `ResetValue` («usa el valor de la plataforma») no es un número. */
const num = (x) => (typeof x === 'number' ? x : null);
const filas = Object.entries(indice)
  .filter(([, v]) => v && v.__endpoint)
  .map(([nombre, v]) => {
    const e = v.__endpoint;
    return {
      nombre,
      tipo: e.callableTrigger ? 'callable' : e.httpsTrigger ? 'https' : e.scheduleTrigger ? 'programada' : e.eventTrigger ? 'evento' : '?',
      memoriaMiB: num(e.availableMemoryMb), timeoutS: num(e.timeoutSeconds), maxInstancias: num(e.maxInstances),
      minInstancias: num(e.minInstances), concurrencia: num(e.concurrency), cpu: typeof e.cpu === 'number' || typeof e.cpu === 'string' ? e.cpu : null,
    };
  });
const sdk = JSON.parse(fs.readFileSync(path.join(FUNCTIONS, 'node_modules/firebase-functions/package.json'), 'utf8')).version;
const opcionesDts = fs.readFileSync(path.join(FUNCTIONS, 'node_modules/firebase-functions/lib/v2/options.d.ts'), 'utf8');
const citar = (re) => (opcionesDts.match(re) || [''])[0].replace(/\s*\*\s*/g, ' ').trim();
const textoSdk = {
  concurrencia: citar(/A value of null restores the default concurrency[^\n]*\n[^\n]*\n[^\n]*/),
  cpu: citar(/Defaults to 1 for functions with <= 2GB RAM[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*/),
};
const cuentasDeLasDeIA = ['brainChat', 'brainQuote', 'creatorChat', 'creatorQuote', 'creatorRun', 'generateVideo'];
const iaDeclarada = filas.filter((f) => cuentasDeLasDeIA.includes(f.nombre));

/* ── B · coste de carga del paquete (procesos hijos limpios, 5 repeticiones, mediana) ── */
const medirCarga = (entrada) => {
  const guion = `
    process.env.GCLOUD_PROJECT = 'demo-wee';
    const Module = require('module');
    const original = Module._load;
    const pila = [];
    const filas = [];
    Module._load = function (request, parent, isMain) {
      const t0 = process.hrtime.bigint();
      const nodo = { request, hijos: 0n };
      pila.push(nodo);
      try { return original.apply(this, arguments); }
      finally {
        pila.pop();
        const dt = process.hrtime.bigint() - t0;
        if (pila.length) pila[pila.length - 1].hijos += dt;
        filas.push({ request, total: Number(dt) / 1e6, propio: Number(dt - nodo.hijos) / 1e6 });
      }
    };
    const cpu0 = process.cpuUsage();
    const t0 = process.hrtime.bigint();
    require(${JSON.stringify(entrada)});
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const cpu = process.cpuUsage(cpu0);
    const cargados = Object.keys(require.cache);
    const por = {};
    for (const f of filas) por[f.request] = (por[f.request] || 0) + f.propio;
    const top = Object.entries(por).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, Number(v.toFixed(1))]);
    const pesados = ['sharp', 'firebase-admin', '@google-cloud/firestore', '@google-cloud/storage', 'google-gax', 'firebase-functions', 'ffmpeg', 'jose', 'axios'];
    const presentes = pesados.filter((p) => cargados.some((c) => c.includes('node_modules' + require('path').sep + p + require('path').sep) || c.includes('node_modules/' + p + '/')));
    console.log(JSON.stringify({ ms: Number(ms.toFixed(1)), cpuMs: Number(((cpu.user + cpu.system) / 1000).toFixed(1)), modulos: cargados.length, top, presentes, rss: Math.round(process.memoryUsage().rss / 1048576) }));
  `;
  const salidas = [];
  for (let i = 0; i < 5; i++) {
    const r = spawnSync(process.execPath, ['-e', guion], { cwd: FUNCTIONS, encoding: 'utf8', timeout: 120_000 });
    const ultima = r.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
    if (!ultima) return { error: (r.stderr || r.stdout).slice(0, 300) };
    salidas.push(JSON.parse(ultima));
  }
  const mediana = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
  const m = salidas[0];
  return { entrada: path.relative(FUNCTIONS, entrada), repeticiones: salidas.length, msMediana: mediana(salidas.map((s) => s.ms)), cpuMsMediana: mediana(salidas.map((s) => s.cpuMs)), msMin: Math.min(...salidas.map((s) => s.ms)), msMax: Math.max(...salidas.map((s) => s.ms)), modulos: m.modulos, rssMiB: mediana(salidas.map((s) => s.rss)), top: m.top, presentes: m.presentes };
};

const cargas = [
  medirCarga(path.join(FUNCTIONS, 'lib', 'index.js')),
  medirCarga(path.join(FUNCTIONS, 'lib', 'creator', 'brain.js')),
  medirCarga(path.join(FUNCTIONS, 'lib', 'creator', 'index.js')),
  medirCarga(path.join(FUNCTIONS, 'lib', 'engine', 'index.js')),
];

const md = [];
md.push('# 09 · Configuración declarada de las Functions y coste de cargar el paquete\n');
md.push(`## A · Lo que declara el código (MEDIDO de \`functions/lib/index.js\`; firebase-functions ${sdk})\n`);
md.push(tabla(['Función', 'Tipo', 'Memoria MiB', 'Timeout s', 'Máx. inst.', 'Mín. inst.', 'Concurrencia', 'CPU'], filas.map((f) => [f.nombre, f.tipo, f.memoriaMiB ?? '(defecto)', f.timeoutS ?? '(defecto)', f.maxInstancias ?? '—', f.minInstancias ?? '— (0)', f.concurrencia ?? '— (defecto)', f.cpu ?? '— (defecto)'])));
md.push(`\nTexto del SDK instalado sobre los valores por defecto:\n- concurrencia: «${textoSdk.concurrencia}»\n- cpu: «${textoSdk.cpu}»\n`);
md.push(`Las seis Functions de IA con tiempo de proveedor (${cuentasDeLasDeIA.join(', ')}) no declaran \`cpu\`, \`concurrency\` ni \`minInstances\`: ${iaDeclarada.every((f) => f.cpu === null && f.concurrencia === null && f.minInstancias === null) ? 'confirmado' : 'REVISAR'}.\n`);
md.push('## B · Coste de cargar el paquete en un proceso nuevo (CPU de un núcleo de ESTA máquina; 5 repeticiones)\n');
md.push(tabla(['Entrada', 'ms (mediana)', 'ms (mín–máx)', 'CPU ms (mediana)', 'Módulos', 'RSS MiB', 'Pesados presentes'], cargas.map((c) => (c.error ? [c.entrada ?? '?', 'ERROR', c.error, '', '', '', ''] : [c.entrada, c.msMediana, `${c.msMin}–${c.msMax}`, c.cpuMsMediana, c.modulos, c.rssMiB, c.presentes.join(', ')]))));
md.push('\nLos 12 módulos con más tiempo PROPIO al cargar `lib/index.js` (ms):\n```\n' + (cargas[0].top ?? []).map(([k, v]) => `${String(v).padStart(7)}  ${k}`).join('\n') + '\n```');
const dir = guardar('09-config-y-arranque', { sdk, textoSdk, filas, cargas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
