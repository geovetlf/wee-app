#!/usr/bin/env node
/*
 * GUARDIA VIGENTE — ¿la guardia que corre en ESTA sesión es la del repositorio?
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * Claude Code carga `.claude/` desde la carpeta donde se abre la sesión. El
 * 2026-10-03 se encontró que el checkout de trabajo (`Desktop/wee`, en dad0ca2,
 * anterior a la guardia versionada) ejecutaba COPIAS SUELTAS sin seguimiento de
 * `settings.json` (5592ac4) y `guardia.mjs` (3d30739): 11 reglas deny menos que
 * main y sin cubrir Monitor. Nadie lo veía, porque una copia sin seguimiento no
 * aparece en ningún diff: se queda atrás en silencio cada vez que main cambia.
 *
 * ── Qué hace ───────────────────────────────────────────────────────────────
 *
 * Compara cada archivo de la guardia que corre (`RAIZ/.claude/…`) con su
 * historia en la rama canónica (`origin/main`, o `main`), por el CONTENIDO
 * (saltos de línea normalizados), y dice:
 *  · VIGENTE           igual a main, con seguimiento y bien enganchada;
 *  · ANTIGUA           igual a una versión ANTERIOR de main  ← el fallo de hoy;
 *  · AUSENTE           falta un archivo que main sí tiene;
 *  · MAL_CABLEADA      el hook no apunta a la guardia del árbol o no cubre Bash/PowerShell/Monitor;
 *  · DISTINTA_DE_MAIN  contenido que main no tiene (un cambio sin commit, o una rama);
 *  · SIN_SEGUIMIENTO   igual a main hoy, pero suelta: se quedará atrás sin avisar;
 *  · SIN_REFERENCIA    no hay rama canónica con la que comparar.
 * Solo lee (git hash, ls-files, log, show). No escribe nada, no usa red.
 *
 * ── Uso ────────────────────────────────────────────────────────────────────
 *
 *   node .claude/hooks/guardia-vigente.mjs [--raiz DIR] [--repo DIR] [--ref REF] [--contra DIR] [--json]
 *   node .claude/hooks/guardia-vigente.mjs --sesion     ← el hook SessionStart de settings.json
 *
 * Con `--sesion` nunca impide abrir la sesión: si la guardia no está VIGENTE
 * avisa al dueño (systemMessage) y a Claude (additionalContext). Fuera de
 * `--sesion`, sale con 0 solo si está VIGENTE (y, con `--contra`, si los
 * archivos son idénticos a los de DIR).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/* Los archivos que SON la guardia. Una sola lista: la usan el verificador, el hook de sesión y las pruebas. */
export const ARCHIVOS_DE_LA_GUARDIA = ['.claude/settings.json', '.claude/hooks/guardia.mjs', '.claude/hooks/guardia-vigente.mjs'];
/* Sin estos dos no hay guardia: su ausencia es AUSENTE aunque main no los tuviera. */
const IMPRESCINDIBLES = new Set(['.claude/settings.json', '.claude/hooks/guardia.mjs']);
const REFS_CANONICAS = ['origin/main', 'main'];

/** Huella del contenido con los saltos de línea normalizados (un checkout CRLF de Windows = el blob LF). */
export const huella = (texto) => createHash('sha256').update(String(texto).replace(/\r\n/g, '\n')).digest('hex');

/**
 * Decide el estado a partir de hechos ya leídos (función pura: la prueban sin git).
 * archivos: [{ ruta, existe, huella, seguido (true|false|null), versiones: [{ huella, commit, fecha }] (la 1.ª = la actual) }]
 */
export const clasificar = ({ refEncontrada, archivos, cableado }) => {
  const detalle = archivos.map((a) => {
    const actual = a.versiones[0];
    let version;
    if (!a.existe) version = a.versiones.length || IMPRESCINDIBLES.has(a.ruta) ? 'ausente' : 'no-aplica';
    else if (!a.versiones.length) version = 'nueva';
    else if (a.huella === actual.huella) version = 'vigente';
    else if (a.versiones.some((v) => v.huella === a.huella)) version = 'antigua';
    else version = 'distinta';
    const igualA = a.existe ? a.versiones.find((v) => v.huella === a.huella) : null;
    return { ...a, version, igualA: igualA || null, actual: actual || null };
  });
  const hay = (v) => detalle.some((a) => a.version === v);
  let estado;
  if (!refEncontrada) estado = 'SIN_REFERENCIA';
  else if (hay('ausente')) estado = 'AUSENTE';
  else if (hay('antigua')) estado = 'ANTIGUA';
  else if (!cableado.preToolUse) estado = 'MAL_CABLEADA';
  else if (hay('distinta') || hay('nueva')) estado = 'DISTINTA_DE_MAIN';
  else if (detalle.some((a) => a.existe && a.seguido !== true)) estado = 'SIN_SEGUIMIENTO';
  else estado = 'VIGENTE';
  return { estado, archivos: detalle, cableado };
};

/** ¿Engancha settings.json la guardia DEL ÁRBOL a Bash, PowerShell y Monitor, y la comprobación al abrir sesión? */
export const leerCableado = (settingsTexto) => {
  let s;
  try { s = JSON.parse(settingsTexto); } catch { return { preToolUse: false, sesion: false, motivo: 'settings.json ilegible' }; }
  const lanza = (h, archivo) => h && h.type === 'command'
    && [h.command, ...(h.args || [])].some((x) => typeof x === 'string' && x.replace(/\\/g, '/').includes('${CLAUDE_PROJECT_DIR}/.claude/hooks/' + archivo));
  const pre = ((s.hooks || {}).PreToolUse || []).some((e) => {
    const m = String(e.matcher || '').split('|');
    return ['Bash', 'PowerShell', 'Monitor'].every((x) => m.includes(x)) && (e.hooks || []).some((h) => lanza(h, 'guardia.mjs'));
  });
  const sesion = ((s.hooks || {}).SessionStart || []).some((e) => (e.hooks || []).some((h) => lanza(h, 'guardia-vigente.mjs')));
  return { preToolUse: pre, sesion, motivo: pre ? '' : 'el hook PreToolUse no lanza ${CLAUDE_PROJECT_DIR}/.claude/hooks/guardia.mjs para Bash|PowerShell|Monitor' };
};

const git = (dir, args) => spawnSync('git', ['-C', dir, '-c', 'core.quotepath=off', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });

/** Las versiones de un archivo en la rama canónica, de la actual a la primera (sin repetir contenido). */
const versionesEnLaRama = (repo, ref, ruta) => {
  const log = git(repo, ['log', '--format=%H%x09%cs', ref, '--', ruta]);
  if (log.status !== 0) return [];
  const vistas = new Set();
  const out = [];
  for (const linea of log.stdout.split('\n').filter(Boolean)) {
    const [commit, fecha] = linea.split('\t');
    const show = git(repo, ['show', `${commit}:${ruta}`]);
    if (show.status !== 0) continue; // el commit lo borró
    const h = huella(show.stdout);
    if (vistas.has(h)) continue;
    vistas.add(h);
    out.push({ huella: h, commit: commit.slice(0, 7), fecha });
  }
  return out;
};

/** Lee los hechos (solo lectura) y clasifica. `raiz` = dónde está la guardia que corre; `repo` = el git que se consulta. */
export const verificar = ({ raiz, repo = raiz, ref } = {}) => {
  const candidatas = ref ? [ref] : REFS_CANONICAS;
  const refEncontrada = candidatas.find((r) => git(repo, ['rev-parse', '--verify', '--quiet', `${r}^{commit}`]).status === 0) || null;
  const esRepo = git(raiz, ['rev-parse', '--is-inside-work-tree']).stdout.trim() === 'true';
  const archivos = ARCHIVOS_DE_LA_GUARDIA.map((ruta) => {
    const abs = path.join(raiz, ruta);
    const existe = existsSync(abs);
    const texto = existe ? readFileSync(abs, 'utf8') : null;
    const seguido = existe ? (esRepo ? git(raiz, ['ls-files', '--error-unmatch', '--', ruta]).status === 0 : false) : null;
    return { ruta, existe, huella: existe ? huella(texto) : null, seguido, versiones: refEncontrada ? versionesEnLaRama(repo, refEncontrada, ruta) : [] };
  });
  const settings = path.join(raiz, '.claude/settings.json');
  const cableado = existsSync(settings) ? leerCableado(readFileSync(settings, 'utf8')) : { preToolUse: false, sesion: false, motivo: 'falta settings.json' };
  return { raiz, ref: refEncontrada, ...clasificar({ refEncontrada, archivos, cableado }) };
};

/** Compara byte a byte (normalizando saltos de línea) los archivos de la guardia de dos árboles. */
export const comparar = (a, b) => ARCHIVOS_DE_LA_GUARDIA.map((ruta) => {
  const lee = (dir) => (existsSync(path.join(dir, ruta)) ? huella(readFileSync(path.join(dir, ruta), 'utf8')) : null);
  const ha = lee(a); const hb = lee(b);
  return { ruta, a: ha, b: hb, igual: ha === hb };
});

const EXPLICACION = {
  VIGENTE: 'la guardia que corre es la de main, con seguimiento y bien enganchada.',
  ANTIGUA: 'la guardia que corre es una versión ANTERIOR de main: faltan reglas y protecciones que main ya tiene.',
  AUSENTE: 'falta un archivo de la guardia.',
  MAL_CABLEADA: 'settings.json no engancha la guardia del árbol a Bash, PowerShell y Monitor.',
  DISTINTA_DE_MAIN: 'la guardia que corre no es ninguna versión de main (un cambio sin commit o una rama).',
  SIN_SEGUIMIENTO: 'la guardia es igual a main hoy, pero son copias sueltas sin seguimiento: se quedarán atrás sin avisar.',
  SIN_REFERENCIA: 'no hay rama canónica (origin/main o main) con la que comparar.',
};

export const informe = (r) => {
  const lineas = [`Guardia de ${r.raiz} frente a ${r.ref || '(sin referencia)'}: ${r.estado} — ${EXPLICACION[r.estado]}`];
  for (const a of r.archivos) {
    const donde = a.igualA ? `= ${a.igualA.commit} (${a.igualA.fecha})` : '';
    const actual = a.actual ? `main: ${a.actual.commit} (${a.actual.fecha})` : 'main no lo tiene';
    const seg = a.seguido === true ? 'con seguimiento' : a.seguido === false ? 'SIN seguimiento' : '';
    lineas.push(`  · ${a.ruta}: ${a.version} ${donde} · ${actual}${seg ? ' · ' + seg : ''}`);
  }
  if (!r.cableado.preToolUse) lineas.push(`  · cableado: ${r.cableado.motivo}`);
  if (!r.cableado.sesion) lineas.push('  · cableado: falta el hook SessionStart que ejecuta esta comprobación al abrir cada sesión');
  return lineas.join('\n');
};

const arg = (n) => { const i = process.argv.indexOf(n); return i === -1 ? undefined : process.argv[i + 1]; };

const principal = () => {
  const raiz = path.resolve(arg('--raiz') || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const repo = arg('--repo') ? path.resolve(arg('--repo')) : raiz;
  const r = verificar({ raiz, repo, ref: arg('--ref') });
  if (process.argv.includes('--sesion')) {
    if (r.estado !== 'VIGENTE') {
      const texto = informe(r);
      process.stdout.write(JSON.stringify({
        systemMessage: `Weë Harness: guardia ${r.estado} — ${EXPLICACION[r.estado]} Detalle: node .claude/hooks/guardia-vigente.mjs`,
        hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: `AVISO DEL WEË HARNESS (al abrir la sesión):\n${texto}\nNo des por buena la guardia de esta sesión hasta que el dueño actualice el checkout.` },
      }));
    }
    return 0;
  }
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  else process.stdout.write(informe(r) + '\n');
  let ok = r.estado === 'VIGENTE';
  const contra = arg('--contra');
  if (contra) {
    const c = comparar(raiz, path.resolve(contra));
    process.stdout.write(`\nComparación con ${path.resolve(contra)}:\n${c.map((x) => `  · ${x.ruta}: ${x.igual ? 'IDÉNTICO' : 'DISTINTO'} (${(x.a || '—').slice(0, 12)} / ${(x.b || '—').slice(0, 12)})`).join('\n')}\n`);
    ok = ok && c.every((x) => x.igual);
    if (process.argv.includes('--solo-contra')) ok = c.every((x) => x.igual);
  }
  return ok ? 0 : 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let codigo;
  try { codigo = principal(); } catch (e) {
    /* Al abrir sesión nunca se rompe nada: se avisa y se sigue. Fuera de la sesión, un error es un fallo. */
    if (process.argv.includes('--sesion')) {
      process.stdout.write(JSON.stringify({ systemMessage: `Weë Harness: no se pudo comprobar la guardia (${e && e.message}).` }));
      codigo = 0;
    } else { process.stderr.write(`guardia-vigente: ${e && e.message}\n`); codigo = 2; }
  }
  process.exit(codigo);
}
