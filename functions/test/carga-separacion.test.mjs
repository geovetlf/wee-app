/**
 * LA PRUEBA FUNCIONAL Y LA MEDICIÓN DE RENDIMIENTO, SEPARADAS (Frente I · PR #34).
 *
 * Hasta ahora `scripts/carga/rafaga-dinero.mjs` mezclaba dos cosas con la misma salida: comprobaba que no hay doble cobro bajo
 * ráfaga (CORRECCIÓN: PASA o FALLA) y, a la vez, calculaba un p95 de latencia con un umbral (RENDIMIENTO: un número que en un
 * emulador, en un ordenador compartido, no concluye nada). Un tiempo podía hacer fallar una prueba de dinero, o un «OK» de dinero
 * podía leerse como «rinde bien». Ahora:
 *
 *   · la corrección es una suite de emulador normal —`functions/test/rafaga-dinero.emulator.mjs`, nivel 2 de la CI— sin un solo
 *     tiempo, percentil ni umbral;
 *   · la medición vive en `scripts/carga/` (carga.mjs, tanda.mjs), es manual, ninguna CI la lanza, su informe dice
 *     `tipo: "medicion"` y `concluyente: false`, y su código de salida no depende de ningún tiempo.
 *
 * Esta suite fija esa frontera para que nadie la vuelva a cruzar sin que algo se ponga en rojo:
 *
 *   A  la suite funcional: documenta su lanzamiento (demo-*, solo Firestore), cubre R1–R6 y la red cortada, decide por su código de
 *      salida y NO contiene nada de rendimiento (ni identificadores de latencia, ni el reloj, ni un umbral).
 *   B  la medición: el script mixto ya no existe, lleva su aviso, su informe se declara no concluyente y ningún tiempo decide su salida.
 *   C  ninguna CI ni cadena de pruebas lanza la medición.
 *   D  el detector: las reglas A y B se aplican a texto, y aquí se les enseña código saboteado para ver que saltan.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}\n`); };
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/* ── Las reglas, puras: reciben texto ───────────────────────────────────────────────────────────────────────────────────────── */

/** Lo que revela que un código mide o juzga un TIEMPO (sin comentarios). Vacío = no hay nada de rendimiento. */
const PROHIBIDO_EN_LA_PRUEBA = [
  ['un resumen de latencias', /\bresumenLatencias\b/],
  ['un percentil', /\bpercentil\b|\bp(?:50|90|95|99)\b|\bP(?:50|90|95|99)_MS\b/],
  ['un umbral de latencia por variable', /\bCARGA_P95_MS\b|\bCARGA_ESTRICTO\b/],
  ['la duración que mide el cronómetro (`.ms`)', /\.ms\b/],
  ['el reloj del proceso', /\bhrtime\b|\bperformance\.now\b|\bDate\.now\(\)\s*-/],
];
const rendimientoEn = (codigo) => PROHIBIDO_EN_LA_PRUEBA.filter(([, re]) => re.test(sinComentarios(codigo))).map(([que]) => que);

/** Las llamadas a `process.exit(` de un código cuyo argumento mira un tiempo. Vacío = ningún tiempo decide la salida. */
/* Sin \b delante de ESTRICTO ni P95_MS: en CARGA_ESTRICTO y CARGA_P95_MS el guion bajo es parte de la palabra y no hay frontera. */
const MIRA_UN_TIEMPO = /\b(?:p50|p90|p95|p99|latenc\w*|umbral|tiempo|duracionMs)\b|ESTRICTO|P95_MS|\.ms\b/i;
const salidasQueMiranUnTiempo = (codigo) => sinComentarios(codigo).split('\n')
  .filter((l) => /process\.exit\(/.test(l) && MIRA_UN_TIEMPO.test(l.slice(l.indexOf('process.exit('))))
  .map((l) => l.trim());

/* ── A · la suite funcional ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const SUITE = 'functions/test/rafaga-dinero.emulator.mjs';
check('A1 la suite funcional de la ráfaga existe', existe(SUITE));
const suite = existe(SUITE) ? leer(SUITE) : '';
const { comandoDeSuite } = await import(pathToFileURL(path.join(RAIZ, 'functions/test/_emuladores.mjs')).href);
const cmd = comandoDeSuite(suite);
check('A2 documenta su lanzamiento: solo Firestore, proyecto demo-*, y `node` sobre sí misma',
  !cmd.error && cmd.solo.join(',') === 'firestore' && cmd.proyecto.startsWith('demo-') && cmd.nodo.join(' ') === SUITE,
  cmd.error || `${cmd.solo} · ${cmd.proyecto} · ${(cmd.nodo || []).join(' ')}`);
check('A3 el corredor de emuladores la encuentra sola (`*.emulator.mjs`), sin otra lista que mantener',
  fs.readdirSync(aqui).filter((f) => f.endsWith('.emulator.mjs')).includes('rafaga-dinero.emulator.mjs'));
const codigoSuite = sinComentarios(suite);
const sinCubrir = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'RED'].filter((id) => !new RegExp(`check\\('${id}'`).test(codigoSuite));
check('A4 cubre las seis invariantes del dinero (R1–R6) y la red cortada', sinCubrir.length === 0, sinCubrir.length ? `faltan ${sinCubrir.join(', ')}` : 'R1 R2 R3 R4 R5 R6 RED');
check('A5 decide por su código de salida (0 si todo cuadra, 1 si algo falla)', /process\.exit\(fallos\.length \? 1 : 0\)/.test(codigoSuite));
const rend = rendimientoEn(suite);
check('A6 NO contiene nada de rendimiento: ni latencias, ni percentiles, ni umbrales, ni el reloj', rend.length === 0, rend.join(' · '));
check('A7 solo importa el entorno compartido (`scripts/carga/_entorno.mjs`), no la medición',
  /from '\.\.\/\.\.\/scripts\/carga\/_entorno\.mjs'/.test(suite) && !/carga\.mjs|tanda\.mjs/.test(codigoSuite));
const tamano = Number((suite.match(/RAFAGA_N \|\| (\d+)/) || [])[1]);
check('A8 la ráfaga por defecto es moderada (8–25): contención de verdad, sin agotar los intentos del emulador de una CI', tamano >= 8 && tamano <= 25, `N=${tamano}`);

/* ── B · la medición ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
check('B1 el script mixto ya no existe: la prueba y la medición no comparten archivo', !existe('scripts/carga/rafaga-dinero.mjs'));
const carga = leer('scripts/carga/carga.mjs');
const tanda = leer('scripts/carga/tanda.mjs');
const readme = leer('scripts/carga/README.md');
check('B2 el README abre diciendo que es MEDICIÓN, no una prueba, y manda a la suite funcional',
  /MEDICIÓN, no una prueba/.test(readme.slice(0, 400)) && readme.slice(0, 1200).includes(SUITE));
check('B3 carga.mjs y tanda.mjs lo repiten al arrancar (para quien solo ve la salida)',
  /decir\('MEDICIÓN, no prueba/.test(carga) && /console\.log\('MEDICIÓN, no prueba/.test(tanda));
check('B4 el informe de carga se declara tipo «medicion» y `concluyente: false`', /tipo: 'medicion', concluyente: false/.test(sinComentarios(carga)));
const salidasCarga = salidasQueMiranUnTiempo(carga);
const salidaDeCarga = (sinComentarios(carga).match(/process\.exit\(intentosDeRed[^\n]*/) || [''])[0];
check('B5 ningún tiempo decide la salida de carga.mjs: solo los invariantes del dinero/cupo y la red cortada',
  salidasCarga.length === 0 && /intentosDeRed\.length \|\| fallos\.length/.test(salidaDeCarga), salidasCarga.join(' | ') || salidaDeCarga);
const salidasTanda = salidasQueMiranUnTiempo(tanda);
check('B6 tanda.mjs sale con el código del script que lanza; su corte por tiempo es una avería de la tanda, no un veredicto',
  salidasTanda.length === 0 && /process\.exit\(codigo\)/.test(sinComentarios(tanda)));
const sobrantes = ['CARGA_ESTRICTO', 'CARGA_P95_MS', 'CARGA_RAFAGA_N'].filter((v) => [carga, tanda, readme, leer('scripts/carga/_entorno.mjs')].some((t) => t.includes(v)));
check('B7 ya no quedan las variables que convertían una latencia en veredicto (CARGA_ESTRICTO, CARGA_P95_MS, CARGA_RAFAGA_N)', sobrantes.length === 0, sobrantes.join(', '));

/* ── C · nadie la lanza desde una CI ────────────────────────────────────────────────────────────────────────────────────────── */
const LANZA_LA_MEDICION = /scripts\/carga|carga\/tanda|tanda\.mjs|\bcarga\.mjs\b/;
const ficheros = [...fs.readdirSync(path.join(RAIZ, '.github/workflows')).map((f) => `.github/workflows/${f}`), 'package.json', 'functions/package.json', 'scripts/ci-local.mjs', 'scripts/ci-sin-secretos.mjs']
  .filter(existe);
const quienLaLanza = ficheros.filter((f) => LANZA_LA_MEDICION.test(sinComentarios(leer(f))));
check('C1 ni los workflows de la CI, ni `npm test`, ni ci-local, ni los scripts de la raíz lanzan la medición', quienLaLanza.length === 0, quienLaLanza.join(', ') || `${ficheros.length} archivos mirados`);
check('C2 el job de emuladores de la CI corre el corredor que descubre la suite funcional', /node functions\/test\/_emuladores\.mjs/.test(leer('.github/workflows/ci.yml')));

/* ── D · el detector, con código saboteado ──────────────────────────────────────────────────────────────────────────────────── */
const saboteadas = {
  'volver a pedir un resumen de latencias': `${suite}\nconst res = resumenLatencias(rs.map((r) => r.ms));`,
  'un umbral de p95 en la prueba': `${suite}\nif (res.p95 > 1500) fallos.push('L1');`,
  'medir con el reloj del proceso': `${suite}\nconst t0 = process.hrtime.bigint();`,
  'leer la duración del cronómetro': suite.replace('rs.every(sinContencion)', 'rs.every((r) => sinContencion(r) && r.ms < 900)'),
  'el umbral por variable de entorno': `${suite}\nconst P = Number(process.env.CARGA_P95_MS);`,
};
for (const [que, codigo] of Object.entries(saboteadas)) {
  check(`D1 el detector salta si alguien vuelve a mezclar rendimiento: ${que}`, codigo !== suite && rendimientoEn(codigo).length > 0);
}
check('D2 …y un comentario que HABLA de latencia no es rendimiento (la cabecera lo dice y no salta)',
  rendimientoEn('/* sin percentiles, sin p95, sin resumenLatencias */\nconst x = 1;').length === 0);
const salidaSaboteada = carga.replace(/process\.exit\(intentosDeRed[^\n]*/, 'process.exit(res.p95 > 1500 ? 1 : 0);');
check('D3 el detector de la salida salta si un tiempo decide el código de salida de la medición',
  salidaSaboteada !== carga && salidasQueMiranUnTiempo(salidaSaboteada).length > 0);
const salidaConEstricto = carga.replace(/process\.exit\(intentosDeRed[^\n]*/, "process.exit(process.env.CARGA_ESTRICTO === '1' && !ok ? 1 : 0);");
check('D4 …y también si lo decide una variable «estricta» de latencia', salidaConEstricto !== carga && salidasQueMiranUnTiempo(salidaConEstricto).length > 0);
check('D5 …pero no salta con la salida actual (invariantes + red), ni con `process.exit(2)` de un argumento mal puesto',
  salidasQueMiranUnTiempo(carga).length === 0 && salidasQueMiranUnTiempo('if (!x) process.exit(2);').length === 0);
check('D6 cualquier CI que llame a la medición se detecta',
  ['run: node scripts/carga/tanda.mjs carga.mjs', 'run: node scripts/carga/carga.mjs --escenarios dinero', '"perf": "node scripts/carga/tanda.mjs carga.mjs"'].every((t) => LANZA_LA_MEDICION.test(t)));

const pkg = JSON.parse(leer('functions/package.json'));
check('esta suite está en la cadena de `npm test`', /carga-separacion\.test\.mjs/.test(pkg.scripts.test));

process.stdout.write(fallo ? `\n✘ ${fallo} comprobación(es) fallaron\n` : '\n✔ La prueba del dinero y la medición de rendimiento están separadas: un tiempo no puede hacer pasar ni fallar una prueba de dinero\n');
process.exit(fallo ? 1 : 0);
