/*
 * LA CADENA ENTERA, SIN PARARSE EN EL PRIMER FALLO.
 *
 * `npm test` (functions/package.json → scripts.test) encadena las suites con
 * `&&`: la primera que falla esconde a todas las de detrás. Este corredor lee
 * ESA MISMA lista —no hay otra que mantener—, las ejecuta todas y al final dice
 * cuáles fallaron, con su salida. Es lo que usan los puntos de control del
 * Harness y el nivel 2 de la CI.
 *
 *   node test/_cadena.mjs                 # 4 suites a la vez
 *   node test/_cadena.mjs --serie         # una detrás de otra
 *   node test/_cadena.mjs --solo credits  # solo las que contienen «credits»
 *   node test/_cadena.mjs --sin-repetir   # sin la segunda oportunidad en solitario (ver `correr`)
 *
 * Sale con 0 solo si TODAS pasan. No arranca emuladores ni llama a nada
 * externo: las suites `*.emulator.mjs` no están en la cadena.
 *
 * Antes de la primera suite comprueba que `functions/lib` está al día con
 * `functions/src` (ver `libDesfasado`); si no lo está, no corre ninguna y sale
 * con 2 diciendo qué construir.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FUNCIONES = path.resolve(here, '..');

/** Las suites de `scripts.test`, en orden. Un paso que no sea `node test/<suite>.mjs` es un error, no se adivina. */
export const suitesDeLaCadena = (cadena) => String(cadena || '').split('&&').map((s) => s.trim()).filter(Boolean)
  .map((paso) => {
    const m = paso.match(/^node\s+(test\/[^\s]+\.mjs)$/);
    if (!m) throw new Error(`paso de la cadena que no es «node test/<suite>.mjs»: ${paso}`);
    return m[1];
  });

/*
 * ¿ESTÁ `functions/lib` AL DÍA?
 *
 * Casi todas las suites cargan el COMPILADO, no el fuente. Con un `lib` viejo,
 * una suite prueba el código de ayer y sale en verde; y tsc no borra nada, así
 * que el `.js` de un `.ts` que ya no existe se sigue cargando como si existiera.
 * Se exige, para cada `.ts` de `src` (los `.d.ts` no se compilan), su `.js` en
 * `lib`, no más viejo que él; y en `lib`, ningún `.js` sin su `.ts`.
 */
export const libDesfasado = (funciones = FUNCIONES) => {
  const src = path.join(funciones, 'src');
  const lib = path.join(funciones, 'lib');
  const archivos = (dir, sufijo) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }) : [])
    .map((f) => String(f).split(path.sep).join('/')).filter((f) => f.endsWith(sufijo)).sort();
  const fuentes = archivos(src, '.ts').filter((f) => !f.endsWith('.d.ts'));
  const conFuente = new Set(fuentes.map((f) => f.replace(/\.ts$/, '.js')));
  const faltan = [];
  const viejos = [];
  for (const ts of fuentes) {
    const js = ts.replace(/\.ts$/, '.js');
    const rutaJs = path.join(lib, js);
    if (!fs.existsSync(rutaJs)) faltan.push(js);
    else if (fs.statSync(rutaJs).mtimeMs < fs.statSync(path.join(src, ts)).mtimeMs) viejos.push(js);
  }
  const huerfanos = archivos(lib, '.js').filter((js) => !conFuente.has(js));
  return { fuentes: fuentes.length, faltan, viejos, huerfanos };
};

/** El aviso de `libDesfasado`, o null si `lib` está al día. */
export const avisoDeLib = ({ faltan, viejos, huerfanos }) => {
  if (!faltan.length && !viejos.length && !huerfanos.length) return null;
  const muestra = (lista) => lista.slice(0, 8).join(', ') + (lista.length > 8 ? ` y ${lista.length - 8} más` : '');
  return [
    '✘ functions/lib no está al día con functions/src: las suites probarían otro código. No se corre ninguna.',
    ...(faltan.length ? [`  · ${faltan.length} sin compilar: ${muestra(faltan)}`] : []),
    ...(viejos.length ? [`  · ${viejos.length} más viejos que su fuente: ${muestra(viejos)}`] : []),
    ...(huerfanos.length ? [`  · ${huerfanos.length} sin fuente (tsc no los borra): ${muestra(huerfanos)}`] : []),
    `  → ${huerfanos.length ? 'borra functions/lib y ' : ''}ejecuta \`npm --prefix functions run build\`.`,
  ].join('\n');
};

const correrUna = (suite, limiteMs) => new Promise((resolve) => {
  const inicio = Date.now();
  const hijo = spawn(process.execPath, [suite], { cwd: FUNCIONES, env: process.env });
  let salida = '';
  hijo.stdout.on('data', (d) => { salida += d; });
  hijo.stderr.on('data', (d) => { salida += d; });
  const reloj = setTimeout(() => { salida += `\n[cadena] más de ${limiteMs / 1000} s: se corta`; hijo.kill(); }, limiteMs);
  hijo.on('close', (codigo) => {
    clearTimeout(reloj);
    resolve({ suite, ok: codigo === 0, codigo, ms: Date.now() - inicio, salida });
  });
});

/*
 * UNA SUITE QUE FALLA CON CARGA SE REPITE UNA VEZ, SOLA.
 *
 * Catorce suites miden tiempos (p. ej. «el coste por decisión no crece con N»),
 * y con cuatro a la vez —o con la CPU compartida de la CI— una medida puede
 * salir torcida sin que el código haya cambiado. Al terminar la tanda, cada
 * suite que falló se repite una vez, sola: un fallo de verdad falla las dos
 * veces y la cadena sale en rojo; uno de carga pasa sola, y se DICE (nunca se
 * esconde). `--sin-repetir` desactiva esto.
 */
export const correr = async ({ suites, paralelo, limiteMs, alTerminar, repetir = true, correrSuite = correrUna }) => {
  const resultados = new Array(suites.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < suites.length) {
      const i = siguiente++;
      resultados[i] = await correrSuite(suites[i], limiteMs);
      alTerminar(resultados[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, paralelo) }, trabajador));
  if (repetir) {
    for (let i = 0; i < resultados.length; i++) {
      if (resultados[i].ok) continue;
      const sola = await correrSuite(suites[i], limiteMs);
      if (sola.ok) {
        resultados[i] = { ...sola, repetida: true, salidaConCarga: resultados[i].salida };
        alTerminar(resultados[i]);
      }
    }
  }
  return resultados;
};

const principal = async () => {
  const args = process.argv.slice(2);
  const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
  const pkg = JSON.parse(fs.readFileSync(path.join(FUNCIONES, 'package.json'), 'utf8'));
  let suites = suitesDeLaCadena(pkg.scripts && pkg.scripts.test);
  if (valor('--solo')) suites = suites.filter((s) => s.includes(valor('--solo')));
  const paralelo = args.includes('--serie') ? 1 : Number(valor('--paralelo') || 4);
  const limiteMs = Number(valor('--limite-s') || 600) * 1000;

  const aviso = avisoDeLib(libDesfasado());
  if (aviso) { console.error(aviso); process.exit(2); }

  const inicio = Date.now();
  let hechas = 0;
  const resultados = await correr({
    suites, paralelo, limiteMs, repetir: !args.includes('--sin-repetir'),
    alTerminar: (r) => {
      if (r.repetida) { console.log(`✔ [sola] ${r.suite} pasó al repetirla sola (había fallado con carga) (${(r.ms / 1000).toFixed(1)} s)`); return; }
      hechas++;
      console.log(`${r.ok ? '✔' : '✘'} [${String(hechas).padStart(3)}/${suites.length}] ${r.suite} (${(r.ms / 1000).toFixed(1)} s)`);
    },
  });

  const repetidas = resultados.filter((r) => r.repetida);
  for (const r of repetidas) {
    const torcidas = r.salidaConCarga.split('\n').filter((l) => /^\s*✘/.test(l));
    console.log(`\n· ${r.suite} falló con carga y pasó sola: ${torcidas.join(' | ') || 'sin detalle'}`);
  }
  const fallidas = resultados.filter((r) => !r.ok);
  for (const r of fallidas) {
    console.log(`\n──────── ✘ ${r.suite} (salida ${r.codigo}) ────────`);
    const lineas = r.salida.trimEnd().split('\n');
    const fallos = lineas.filter((l) => /^\s*✘/.test(l));
    console.log((fallos.length ? fallos : lineas.slice(-40)).join('\n'));
  }
  /* Las líneas ✔ de cada suite, sin su línea de cierre («✔ todo bien», «✔ Todo en orden»…). */
  const comprobaciones = resultados.reduce((n, r) => n + (r.salida.match(/^\s*✔(?!\s*todo (bien|en orden))/gim) || []).length, 0);
  console.log(`\n${fallidas.length ? '✘' : '✔'} ${resultados.length - fallidas.length}/${resultados.length} suites`
    + `${repetidas.length ? ` (${repetidas.length} tras repetirlas solas)` : ''}`
    + ` · ${comprobaciones} comprobaciones ✔ · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
  process.exit(fallidas.length ? 1 : 0);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => { console.error(`cadena: ${e.message}`); process.exit(2); });
}
