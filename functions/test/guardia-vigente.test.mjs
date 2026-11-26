/*
 * LA GUARDIA QUE CORRE ES LA DEL REPOSITORIO — `.claude/hooks/guardia-vigente.mjs`.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * El 2026-10-03 la sesión de trabajo (`Desktop/wee`, en dad0ca2) ejecutaba
 * copias SUELTAS de la guardia —settings.json de 5592ac4 y guardia.mjs de
 * 3d30739— mientras main ya tenía la de 7f79078: 11 reglas deny menos, sin
 * Monitor. Nadie lo veía porque una copia sin seguimiento no sale en ningún diff.
 *
 * Esta suite demuestra, sin escribir ningún commit (solo lee la historia real del
 * repositorio con `git show`), que el verificador:
 *  · reconoce EXACTAMENTE aquella situación como ANTIGUA y nombra los commits;
 *  · distingue copia suelta (SIN_SEGUIMIENTO), cambio sin commit (DISTINTA_DE_MAIN),
 *    archivo que falta (AUSENTE) y hook mal enganchado (MAL_CABLEADA);
 *  · está enganchado a SessionStart, para que una sesión futura lo vea al abrir;
 *  · en modo sesión avisa al dueño y a Claude y nunca impide abrir la sesión;
 *  · y que la guardia de ESTE árbol no es una versión antigua de main.
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const VERIFICADOR = path.resolve(RAIZ, '.claude/hooks/guardia-vigente.mjs');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { clasificar, leerCableado, verificar, comparar, huella, ARCHIVOS_DE_LA_GUARDIA } = await import(pathToFileURL(VERIFICADOR).href);

/* ── A. La clasificación (pura, sin git) ────────────────────────────────── */
const V = (h, commit = 'c0ffee1') => ({ huella: h, commit, fecha: '2026-10-03' });
const BIEN = { preToolUse: true, sesion: true };
const fila = (ruta, h, versiones, seguido = true) => ({ ruta, existe: h !== null, huella: h, seguido: h === null ? null : seguido, versiones });
const caso = (archivos, cableado = BIEN, refEncontrada = 'origin/main') => clasificar({ refEncontrada, archivos, cableado }).estado;
const tres = (s, g, v, seg = true) => [
  fila('.claude/settings.json', s, [V('S2'), V('S1')], seg),
  fila('.claude/hooks/guardia.mjs', g, [V('G2'), V('G1')], seg),
  fila('.claude/hooks/guardia-vigente.mjs', v, v === null ? [] : [V('V1')], seg),
];
check('igual a main, con seguimiento y bien enganchada → VIGENTE', caso(tres('S2', 'G2', 'V1')) === 'VIGENTE');
check('una versión ANTERIOR de main → ANTIGUA', caso(tres('S1', 'G2', 'V1')) === 'ANTIGUA' && caso(tres('S2', 'G1', 'V1')) === 'ANTIGUA');
check('igual a main pero sin seguimiento → SIN_SEGUIMIENTO', caso(tres('S2', 'G2', 'V1', false)) === 'SIN_SEGUIMIENTO');
check('un contenido que main no tiene → DISTINTA_DE_MAIN', caso(tres('SX', 'G2', 'V1')) === 'DISTINTA_DE_MAIN');
check('falta la guardia → AUSENTE (aunque el resto esté bien)', caso(tres('S2', null, 'V1')) === 'AUSENTE');
check('el hook no lanza la guardia del árbol → MAL_CABLEADA', caso(tres('S2', 'G2', 'V1'), { preToolUse: false, sesion: true }) === 'MAL_CABLEADA');
check('sin rama canónica → SIN_REFERENCIA', caso(tres('S2', 'G2', 'V1'), BIEN, null) === 'SIN_REFERENCIA');
check('ANTIGUA gana a SIN_SEGUIMIENTO y a MAL_CABLEADA (es lo más grave que se puede ocultar)',
  caso(tres('S1', 'G1', 'V1', false), { preToolUse: false, sesion: false }) === 'ANTIGUA');
check('el verificador que main aún no tiene no hace ANTIGUA a nadie',
  clasificar({ refEncontrada: 'origin/main', cableado: BIEN, archivos: [fila('.claude/settings.json', 'S2', [V('S2')]), fila('.claude/hooks/guardia.mjs', 'G2', [V('G2')]), fila('.claude/hooks/guardia-vigente.mjs', null, [])] }).estado === 'VIGENTE');
check('la huella ignora CRLF/LF (un checkout de Windows = el blob de git)', huella('a\r\nb\r\n') === huella('a\nb\n') && huella('a') !== huella('b'));

/* ── B. El cableado de settings.json ────────────────────────────────────── */
const settingsCon = (matcher, args, sesion = true) => JSON.stringify({ hooks: {
  ...(sesion ? { SessionStart: [{ hooks: [{ type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/guardia-vigente.mjs', '--sesion'] }] }] } : {}),
  PreToolUse: [{ matcher, hooks: [{ type: 'command', command: 'node', args }] }],
} });
const ARBOL = ['${CLAUDE_PROJECT_DIR}/.claude/hooks/guardia.mjs'];
check('cableado bueno: Bash|PowerShell|Monitor → la guardia del árbol, y SessionStart → el verificador',
  leerCableado(settingsCon('Bash|PowerShell|Monitor', ARBOL)).preToolUse && leerCableado(settingsCon('Bash|PowerShell|Monitor', ARBOL)).sesion);
check('sin Monitor (la guardia de 5592ac4) → mal cableada', !leerCableado(settingsCon('Bash|PowerShell', ARBOL)).preToolUse);
check('una guardia FUERA del árbol (otra carpeta) → mal cableada', !leerCableado(settingsCon('Bash|PowerShell|Monitor', ['C:/otra/guardia.mjs'])).preToolUse);
check('la forma de cadena (`node ${CLAUDE_PROJECT_DIR}/…`) también cuenta',
  leerCableado(JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash|PowerShell|Monitor', hooks: [{ type: 'command', command: 'node ${CLAUDE_PROJECT_DIR}/.claude/hooks/guardia.mjs' }] }] } })).preToolUse);
check('sin SessionStart, el cableado lo dice', leerCableado(settingsCon('Bash|PowerShell|Monitor', ARBOL, false)).sesion === false);
check('settings.json ilegible → mal cableada', leerCableado('{ no es json').preToolUse === false);

/* ── C. Este árbol: enganchado, y su guardia NO es una versión antigua de main ─ */
const settingsReal = fs.readFileSync(path.join(RAIZ, '.claude/settings.json'), 'utf8');
const cab = leerCableado(settingsReal);
check('settings.json de este árbol engancha la guardia del árbol a Bash, PowerShell y Monitor', cab.preToolUse, cab.motivo);
check('settings.json de este árbol comprueba la guardia al ABRIR cada sesión (SessionStart → guardia-vigente.mjs --sesion)',
  cab.sesion && /"--sesion"/.test(settingsReal));
const git = (args) => spawnSync('git', ['-C', RAIZ, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const hayHistoria = ['5592ac4', '3d30739', '7f79078'].every((c) => git(['cat-file', '-e', `${c}^{commit}`]).status === 0);
const refCanonica = ['origin/main', 'main'].find((r) => git(['rev-parse', '--verify', '--quiet', `${r}^{commit}`]).status === 0);
if (!refCanonica) {
  console.log('· sin origin/main ni main en este clon: la comprobación del árbol contra main se salta (la CI la corre con historia completa)');
} else {
  const r = verificar({ raiz: RAIZ });
  check(`la guardia de este árbol no es una versión ANTIGUA de ${r.ref} (estado ${r.estado})`, r.estado !== 'ANTIGUA' && r.estado !== 'AUSENTE' && r.estado !== 'MAL_CABLEADA',
    r.archivos.map((a) => `${a.ruta}:${a.version}`).join(' '));
  check('los archivos de la guardia de este árbol tienen seguimiento en git', r.archivos.filter((a) => a.existe).every((a) => a.seguido === true),
    r.archivos.filter((a) => a.existe && a.seguido !== true).map((a) => a.ruta).join(', '));
}

/* ── D. SABOTAJE con la historia REAL: la sesión del 2026-10-03, reconstruida ─ */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guardia-vigente-'));
const montar = (nombre, versiones) => {
  const dir = path.join(tmp, nombre);
  for (const [ruta, desde] of Object.entries(versiones)) {
    const destino = path.join(dir, ruta);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    const contenido = typeof desde === 'string' && /^[0-9a-f]{7}$/.test(desde) ? git(['show', `${desde}:${ruta}`]).stdout : desde;
    fs.writeFileSync(destino, contenido);
  }
  return dir;
};
if (!hayHistoria) {
  console.log('· sin la historia de 5592ac4/3d30739/7f79078 en este clon: el sabotaje con historia real se salta');
} else {
  const REF = '7f79078'; // la guardia de main (acf1f56) antes de esta corrección
  const sesionDeHoy = montar('sesion-2026-10-03', { '.claude/settings.json': '5592ac4', '.claude/hooks/guardia.mjs': '3d30739' });
  const rHoy = verificar({ raiz: sesionDeHoy, repo: RAIZ, ref: REF });
  const porRuta = Object.fromEntries(rHoy.archivos.map((a) => [a.ruta, a]));
  check('la sesión del 2026-10-03 (settings 5592ac4 + guardia 3d30739) → ANTIGUA', rHoy.estado === 'ANTIGUA', rHoy.estado);
  check('…y nombra de qué commit es cada copia', porRuta['.claude/settings.json'].igualA?.commit === '5592ac4'
    && porRuta['.claude/hooks/guardia.mjs'].igualA?.commit === '3d30739', JSON.stringify([porRuta['.claude/settings.json'].igualA, porRuta['.claude/hooks/guardia.mjs'].igualA]));
  check('…y ve que no cubre Monitor', rHoy.cableado.preToolUse === false);

  const soloLaGuardia = montar('solo-guardia-vieja', { '.claude/settings.json': REF, '.claude/hooks/guardia.mjs': '3d30739' });
  check('settings al día pero guardia vieja → ANTIGUA (no basta con un archivo)', verificar({ raiz: soloLaGuardia, repo: RAIZ, ref: REF }).estado === 'ANTIGUA');

  const copiaSuelta = montar('copia-suelta', { '.claude/settings.json': REF, '.claude/hooks/guardia.mjs': REF });
  check('copias exactas de main fuera de git → SIN_SEGUIMIENTO (hoy iguales, mañana atrás sin avisar)',
    verificar({ raiz: copiaSuelta, repo: RAIZ, ref: REF }).estado === 'SIN_SEGUIMIENTO');

  const tocada = montar('tocada', { '.claude/settings.json': REF, '.claude/hooks/guardia.mjs': git(['show', `${REF}:.claude/hooks/guardia.mjs`]).stdout + '\n// cambio local\n' });
  check('una guardia retocada sin commit → DISTINTA_DE_MAIN', verificar({ raiz: tocada, repo: RAIZ, ref: REF }).estado === 'DISTINTA_DE_MAIN');

  const sinGuardia = montar('sin-guardia', { '.claude/settings.json': REF });
  check('sin guardia.mjs → AUSENTE', verificar({ raiz: sinGuardia, repo: RAIZ, ref: REF }).estado === 'AUSENTE');

  /* Modo sesión: avisa, nunca bloquea. */
  const sesion = spawnSync(process.execPath, [VERIFICADOR, '--sesion', '--raiz', sesionDeHoy, '--repo', RAIZ, '--ref', REF], { encoding: 'utf8', timeout: 60000 });
  let o = null;
  try { o = JSON.parse(sesion.stdout); } catch { o = null; }
  check('al abrir una sesión con la guardia de hoy: sale con 0 (no impide abrir) y avisa al dueño y a Claude',
    sesion.status === 0 && o && /ANTIGUA/.test(o.systemMessage) && o.hookSpecificOutput?.hookEventName === 'SessionStart'
    && /3d30739/.test(o.hookSpecificOutput.additionalContext), `status=${sesion.status} out=${sesion.stdout.slice(0, 120)}`);
  const cli = spawnSync(process.execPath, [VERIFICADOR, '--raiz', sesionDeHoy, '--repo', RAIZ, '--ref', REF], { encoding: 'utf8', timeout: 60000 });
  check('fuera de la sesión, una guardia ANTIGUA sale con 1', cli.status === 1 && /ANTIGUA/.test(cli.stdout), `status=${cli.status}`);

  /* --contra: la prueba de igualdad entre dos árboles (la que se usa para demostrar CHECKOUT = CANÓNICA). */
  const gemela = montar('gemela', { '.claude/settings.json': REF, '.claude/hooks/guardia.mjs': REF });
  check('comparar: dos árboles con la misma guardia son idénticos archivo a archivo', comparar(copiaSuelta, gemela).filter((x) => x.ruta !== '.claude/hooks/guardia-vigente.mjs').every((x) => x.igual));
  check('comparar: la sesión de hoy NO es idéntica a main', comparar(sesionDeHoy, copiaSuelta).some((x) => !x.igual));
}
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* da igual */ }

/* ── E. Una sola lista de archivos ──────────────────────────────────────── */
check('los archivos que son la guardia están en UNA lista (settings, guardia y verificador)',
  ARCHIVOS_DE_LA_GUARDIA.length === 3 && ARCHIVOS_DE_LA_GUARDIA.includes('.claude/hooks/guardia.mjs') && ARCHIVOS_DE_LA_GUARDIA.includes('.claude/settings.json'));
check('el verificador solo lee: no escribe archivos ni llama a la red',
  (() => { const src = fs.readFileSync(VERIFICADOR, 'utf8'); return !/writeFile|appendFile|unlink|rmSync|fetch\(|https?:\/\/|\bnet\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')); })());

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
