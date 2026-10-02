/*
 * LAS SUITES DE EMULADOR, TODAS, CADA UNA EN SU PROPIA SESIÓN — nivel 2 de la CI
 * (el job «Nivel 2 · emuladores demo-*», en paralelo con el de las suites).
 *
 * Cada `*.emulator.mjs` documenta en su cabecera cómo se lanza
 * (`firebase emulators:exec --only … --project demo-… "node …"`). Este
 * corredor lee ESA línea —no hay otra lista que mantener— y ejecuta cada suite
 * en una sesión de emuladores nueva, como se escribió, para que el estado de
 * una no contamine a la siguiente.
 *
 * Se niega a lanzar una suite cuyo proyecto no sea `demo-*`. El emulador de
 * Functions solo lo admite SIN SECRETOS LOCALES: carga `functions/.env.local`
 * y `functions/.secret.local`, y con claves de verdad una suite podría llamar
 * a un proveedor real. Lo decide `motivosParaNoArrancar` (el mismo criterio de
 * `npm run functions:emulator`), y entonces `.secret.local` va vacío y el
 * motor de IA cae en `mock`. En CI nunca hay secretos locales. No llama a
 * nada real.
 *
 *   node functions/test/_emuladores.mjs              # todas las `*.emulator.mjs` (al final dice cuántas)
 *   node functions/test/_emuladores.mjs --solo rules # solo las que contienen «rules»
 *
 * Necesita Java 21 (en el PATH, en JAVA21_HOME o el portable de wee-tools) y
 * firebase-tools (FIREBASE_BIN, el global de npm o `firebase` en el PATH).
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const PERMITIDOS = new Set(['auth', 'firestore', 'storage']);

/** El comando que documenta la cabecera de una suite, o el motivo por el que no se lanza. */
export const comandoDeSuite = (fuente, { sinSecretosLocales = false } = {}) => {
  const s = String(fuente).replace(/\\\r?\n\s*\*?\s*/g, ' ');
  const m = s.match(/emulators:exec\s+--only\s+(\S+)\s+--project\s+(\S+)\s+["']node\s+([^"']+)["']/);
  if (!m) return { error: 'la cabecera no documenta un `firebase emulators:exec --only … --project … "node …"`' };
  const solo = m[1].split(',');
  const proyecto = m[2];
  const nodo = m[3].trim().split(/\s+/);
  if (!proyecto.startsWith('demo-')) return { error: `proyecto ${proyecto}: solo se lanzan proyectos demo-*` };
  const otros = solo.filter((e) => !PERMITIDOS.has(e) && !(e === 'functions' && sinSecretosLocales));
  if (otros.length) return { error: `pide ${otros.join(',')}: solo Auth, Firestore y Storage${otros.includes('functions') ? '; Functions, solo sin secretos locales' : ''}` };
  return { solo, proyecto, nodo };
};

/** Cómo lanzar firebase-tools sin pasar por un .cmd (que en Windows exige shell y reinterpreta comillas). */
const firebaseTools = () => {
  if (process.env.FIREBASE_BIN) return [process.env.FIREBASE_BIN];
  /* Un texto fijo, sin argumentos sueltos: con shell, Node avisa (DEP0190) de que un array de argumentos no se escapa. */
  const npmGlobal = spawnSync('npm root -g', { encoding: 'utf8', shell: true });
  const js = path.join(String(npmGlobal.stdout || '').trim(), 'firebase-tools', 'lib', 'bin', 'firebase.js');
  if (npmGlobal.status === 0 && fs.existsSync(js)) return [process.execPath, js];
  return ['firebase'];
};

const correrUna = (lanzador, suite, cmd, env, limiteMs) => new Promise((resolve) => {
  const inicio = Date.now();
  const args = [...lanzador.slice(1), 'emulators:exec', '--only', cmd.solo.join(','), '--project', cmd.proyecto, `node ${cmd.nodo.join(' ')}`];
  const hijo = spawn(lanzador[0], args, { cwd: RAIZ, env });
  let salida = '';
  hijo.stdout.on('data', (d) => { salida += d; });
  hijo.stderr.on('data', (d) => { salida += d; });
  const reloj = setTimeout(() => { salida += `\n[emuladores] más de ${limiteMs / 1000} s: se corta`; hijo.kill(); }, limiteMs);
  hijo.on('error', (e) => { salida += `\n[emuladores] no arranca: ${e.message}`; });
  hijo.on('close', (codigo) => { clearTimeout(reloj); resolve({ suite, ok: codigo === 0, codigo, ms: Date.now() - inicio, salida }); });
});

const principal = async () => {
  const args = process.argv.slice(2);
  const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : undefined; };
  let suites = fs.readdirSync(here).filter((f) => f.endsWith('.emulator.mjs')).sort();
  if (valor('--solo')) suites = suites.filter((s) => s.includes(valor('--solo')));
  const limiteMs = Number(valor('--limite-s') || 300) * 1000;

  const env = { ...process.env };
  const { buscarJava21, motivosParaNoArrancar, secretLocalVacio } = await import(pathToFileURL(path.join(RAIZ, 'scripts/emulators.mjs')).href);
  const java = buscarJava21(process.platform === 'win32');
  if (!java.listo) { console.error('✘ Hace falta Java 21 o superior (PATH, JAVA21_HOME o %LOCALAPPDATA%\\wee-tools\\jdk-21*).'); process.exit(2); }
  if (java.home) { env.PATH = `${path.join(java.home, 'bin')}${path.delimiter}${env.PATH || ''}`; env.JAVA_HOME = java.home; }
  /* Ni credenciales ni proyecto real heredados del portátil o del runner. */
  for (const k of ['GOOGLE_APPLICATION_CREDENTIALS', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT']) delete env[k];
  /* ¿Se puede emular Functions? Solo sin claves locales (los NOMBRES se miran; los valores no salen de aquí). */
  const leerSiExiste = (rel) => { try { return fs.readFileSync(path.join(RAIZ, rel), 'utf8'); } catch { return ''; } };
  const sinSecretosLocales = motivosParaNoArrancar({
    proyecto: 'demo-suites', env, envLocal: leerSiExiste('functions/.env.local'), secretLocal: leerSiExiste('functions/.secret.local'),
  }).length === 0;

  const lanzador = firebaseTools();
  const resultados = [];
  for (const suite of suites) {
    const cmd = comandoDeSuite(fs.readFileSync(path.join(here, suite), 'utf8'), { sinSecretosLocales });
    if (cmd.error) { resultados.push({ suite, ok: false, codigo: null, ms: 0, salida: cmd.error }); console.log(`✘ ${suite} — ${cmd.error}`); continue; }
    /* Con Functions, los secretos del emulador van declarados y VACÍOS: nunca pregunta a Secret Manager. */
    const rutaSecretos = path.join(RAIZ, 'functions/.secret.local');
    if (cmd.solo.includes('functions') && !fs.existsSync(rutaSecretos)) fs.writeFileSync(rutaSecretos, secretLocalVacio());
    const r = await correrUna(lanzador, suite, cmd, env, limiteMs);
    resultados.push(r);
    console.log(`${r.ok ? '✔' : '✘'} ${suite} [${cmd.solo.join(',')} · ${cmd.proyecto}] (${(r.ms / 1000).toFixed(1)} s)`);
  }
  const fallidas = resultados.filter((r) => !r.ok);
  for (const r of fallidas) {
    console.log(`\n──────── ✘ ${r.suite} ────────`);
    const lineas = r.salida.trimEnd().split('\n');
    const fallos = lineas.filter((l) => /^\s*✘/.test(l));
    console.log((fallos.length ? fallos : lineas.slice(-30)).join('\n'));
  }
  console.log(`\n${fallidas.length ? '✘' : '✔'} ${resultados.length - fallidas.length}/${resultados.length} suites de emulador`);
  process.exit(fallidas.length ? 1 : 0);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => { console.error(`emuladores: ${e.message}`); process.exit(2); });
}
