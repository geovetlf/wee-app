/*
 * SEGUNDA RONDA DE ENDURECIMIENTO DE LA GUARDIA — los rodeos de la revisión adversarial (2026-10-03).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Tras la primera ronda (política de commits, puerta fail-closed), una revisión independiente de SOLO LECTURA buscó
 * formas de rodear la guardia SIN escribir `git commit` ni `firebase deploy` a la vista: el subcomando o los argumentos
 * por xargs, las opciones cortas pegadas/agrupadas, los escritores de PowerShell y de .NET sobre rutas protegidas, un
 * heredoc o un here-string que alimenta a un intérprete, los bloques de PowerShell creados desde texto, el programa en
 * una variable, `env -S`, el código entero en una variable, los scripts en un archivo y los de npm. Todos pasaban;
 * se cerraron todos. Esta suite ejecuta ese corpus contra la guardia DEL REPOSITORIO y lo fija como regresión.
 *
 * Son pruebas DEFENSIVAS del guardia de desarrollo de este repo: comprueban que la guardia no se deja rodear. No se
 * usan para atacar sistemas externos.
 *
 * ── Por qué el corpus vive en un .json ──────────────────────────────────────
 *
 * La propia guardia, cuando se ejecuta un `.mjs`, lo lee y marca las llamadas a procesos que encuentre dentro (una
 * llamada de Python del tipo os-system, o un execSync de Node, hacia un despliegue). El corpus contiene esas cadenas
 * COMO DATOS; si estuvieran en este archivo, la guardia denegaría ejecutar la propia suite. Por eso el corpus está en
 * `guardia-rodeos.casos.json` —datos puros, que nunca se ejecutan— y aquí solo se leen y se comprueban. Así la suite
 * es ejecutable bajo la guardia, y la sección F lo comprueba sobre sí misma.
 *
 * ── No duplica guardia-claude.test.mjs ──────────────────────────────────────
 *
 * Aquella cubre las firmas de la guardia (deny/ask/pasa por familia) y sus secciones M (historia de git) y N (comillas
 * simples). Esta es, en exclusiva, el corpus de la SEGUNDA RONDA: los 52 rodeos y las 24 órdenes legítimas que la
 * revisión fijó, más la regresión contra la guardia anterior a toda la fase.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const REL_GUARDIA = '.claude/hooks/guardia.mjs';
const GUARDIA = path.resolve(RAIZ, REL_GUARDIA);
/* La guardia anterior a esta fase (la de main, acf1f56): no tenía ni la política de commits ni nada de la 2.ª ronda. */
const REF_ANTERIOR = '7f79078';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const casos = JSON.parse(fs.readFileSync(path.join(here, 'guardia-rodeos.casos.json'), 'utf8'));
const ADVERSARIALES = casos.adversariales;
const LEGITIMOS = casos.legitimos;

/* La guardia del repositorio, cargada como función pura. */
const guardia = await import(pathToFileURL(GUARDIA).href);
const decidir = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return 'ERROR: ' + e.message; } };
const d = (h, c) => decidir(guardia, h, c);
const corto = (c) => c.replace(/\n/g, '⏎').slice(0, 72);

/* ── A. Los 52 rodeos adversariales: ninguno queda en 'pasa', y cada uno con la decisión exacta ── */
let advBien = 0; let advPasan = 0;
const advMal = [];
for (const [esperado, h, c] of ADVERSARIALES) {
  const r = d(h, c);
  if (r === 'pasa') advPasan++;
  if (r === esperado) advBien++; else advMal.push(`${h}: ${corto(c)} => ${r} (esperado ${esperado})`);
}
check(`A) el corpus adversarial tiene 52 casos`, ADVERSARIALES.length === 52, String(ADVERSARIALES.length));
check(`A) ninguno de los 52 rodeos queda en 'pasa' (${52 - advPasan}/52 bloqueados)`, advPasan === 0, advMal.slice(0, 6).join(' | '));
check(`A) y cada uno con su decisión exacta (deny/ask) (${advBien}/52)`, advBien === 52, advMal.slice(0, 6).join(' | '));

/* ── B. Las 24 órdenes legítimas siguen pasando ── */
let legBien = 0;
const legMal = [];
for (const [h, c] of LEGITIMOS) {
  const r = d(h, c);
  if (r === 'pasa') legBien++; else legMal.push(`${h}: ${corto(c)} => ${r}`);
}
check(`B) el corpus legítimo tiene 24 casos`, LEGITIMOS.length === 24, String(LEGITIMOS.length));
check(`B) las 24 órdenes legítimas siguen pasando (${legBien}/24)`, legBien === 24, legMal.join(' | '));

/* ── C. El recuento global 76/76 ── */
const total = ADVERSARIALES.length + LEGITIMOS.length;
const bien = advBien + legBien;
check(`C) 76 casos en total`, total === 76, String(total));
check(`C) 76/76 con el resultado esperado`, bien === 76, `${bien}/76`);

/* ── D. Regresión: la guardia anterior (7f79078) SÍ dejaba pasar los rodeos; la de ahora los bloquea ── */
const anterior = spawnSync('git', ['show', REF_ANTERIOR + ':' + REL_GUARDIA], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
if (anterior.status !== 0 || !anterior.stdout) {
  check(`D) se pudo leer la guardia anterior (git show ${REF_ANTERIOR})`, false, (anterior.stderr || '').slice(0, 120));
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardia-rodeos-'));
  const archivo = path.join(dir, 'guardia-anterior.mjs');
  fs.writeFileSync(archivo, anterior.stdout);
  const vieja = await import(pathToFileURL(archivo).href);
  const dV = (h, c) => decidir(vieja, h, c);

  let antesPasaban = 0; let ahoraBloquea = 0;
  const siguenColando = [];
  const yaLoCogiaLaVieja = [];
  for (const [, h, c] of ADVERSARIALES) {
    if (dV(h, c) === 'pasa') antesPasaban++; else yaLoCogiaLaVieja.push(`${h}: ${corto(c)} => ${dV(h, c)}`);
    if (d(h, c) !== 'pasa') ahoraBloquea++; else siguenColando.push(`${h}: ${corto(c)}`);
  }
  /*
   * La inmensa mayoría de los rodeos se COLABAN con la guardia anterior: eran bypasses reales. Un puñado los cogía ya
   * la vieja por casualidad (p. ej. `firebase @a` disparaba su regla de palabra sensible «deploy»), pero no por la vía
   * que este corpus prueba. Lo exigible (criterio #7): «al menos los casos relevantes» pasaban antes, y AHORA LOS 52
   * se bloquean. Se fija que antes se colaban ≥ 48, y se registra cuáles cogía ya la vieja.
   */
  check(`D) con la guardia anterior (${REF_ANTERIOR}) se colaban los rodeos relevantes (${antesPasaban}/52 pasaban; la vieja ya cogía ${52 - antesPasaban})`,
    antesPasaban >= 48, 'la vieja ya bloqueaba: ' + (yaLoCogiaLaVieja.join(' | ') || 'ninguno'));
  check(`D) con la guardia de ahora los 52 quedan bloqueados (${ahoraBloquea}/52)`, ahoraBloquea === 52, siguenColando.slice(0, 6).join(' | '));

  /* …y las dos versiones dejan pasar las 24 legítimas: el endurecimiento no rompió el trabajo diario. */
  let viejaLeg = 0; let nuevaLeg = 0;
  for (const [h, c] of LEGITIMOS) {
    if (dV(h, c) === 'pasa') viejaLeg++;
    if (d(h, c) === 'pasa') nuevaLeg++;
  }
  check(`D) las 24 legítimas pasan en las dos versiones (anterior ${viejaLeg}/24, actual ${nuevaLeg}/24)`,
    viejaLeg === 24 && nuevaLeg === 24);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* da igual */ }
}

/* ── E. La suite comprueba la guardia DEL REPOSITORIO, no una copia ── */
check('E) la guardia bajo prueba es la versionada en .claude/hooks/guardia.mjs', fs.existsSync(GUARDIA)
  && spawnSync('git', ['ls-files', '--error-unmatch', '--', REL_GUARDIA], { cwd: RAIZ, encoding: 'utf8' }).status === 0);

/* ── F. La propia suite es ejecutable bajo la guardia (el corpus en .json, no aquí) ── */
/* Si una sesión futura corre esta suite, la guardia la lee y no debe denegarla. Se comprueba las dos: la suite y su
   corpus de datos. El corpus, si se pasara a `node`, SÍ se deniega (tiene las cadenas de ataque) — por eso es .json. */
const rel = (abs) => path.relative(RAIZ, abs).replace(/\\/g, '/');
check('F) la guardia deja ejecutar esta suite (no tiene cadenas de ataque ejecutables, solo las lee del .json)',
  d('Bash', `node ${rel(fileURLToPath(import.meta.url))}`) === 'pasa', d('Bash', `node ${rel(fileURLToPath(import.meta.url))}`));
check('F) el corpus es .json (datos), no un .mjs ejecutable', fs.existsSync(path.join(here, 'guardia-rodeos.casos.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
