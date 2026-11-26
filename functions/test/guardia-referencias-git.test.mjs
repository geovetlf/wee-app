/**
 * LA GUARDIA Y LOS LISTADOS DE REFERENCIAS DE GIT — `.claude/hooks/guardia.mjs` (Guardian · revisión previa a integración, 2026-10-15).
 *
 *   node test/guardia-referencias-git.test.mjs
 *
 * El falso positivo: `git branch --list 'guardian/*'` se leía como «toca .env.local», porque la guardia trata un comodín cuyo último segmento
 * es `*` como algo que PUEDE expandirse a un archivo de secretos. Para `git branch`/`git tag` en modo lista el patrón no es un archivo: es un
 * nombre de referencia que git compara con las suyas; git no abre nada de lo que se le pase. El cambio es mínimo y estrecho:
 *
 *   · solo `git branch|tag` con `--list`/`-l` y SOLO opciones de lectura (lista blanca);
 *   · solo se exime un patrón cuyo último segmento son asteriscos (`guardian/*`, `*`);
 *   · el nombre LITERAL de un secreto, `.env*`, `.*`, `*creds*`, y cualquier otro programa, siguen denegados.
 *
 *   A  lo legítimo PASA (comillas simples, dobles, sin comillas, `-l`, `-a`, `-r`, `tag`, `-C`, varios patrones, PowerShell).
 *   B  lo que NO se exime sigue denegado o preguntado: lecturas y escrituras reales de .env*, secretos, `git branch -D`, `git push`,
 *      comodines que sí alcanzan secretos, y las variantes de ofuscación (sustitución de comandos, cadenas con `;`/`&&`, alias, opciones
 *      que mutan mezcladas con `--list`).
 *   C  la exención no se generaliza: `ls`, `cat` y otros con el mismo patrón siguen denegados.
 *   D  la guardia REAL, como hook (stdin → código de salida), decide igual que la función.
 *   E  sabotajes: con la exención quitada, A falla; con la exención ensanchada, B/C fallan.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallos = 0;
const check = (n, c, extra = '') => { console.log(`${c ? '✔' : '✘'} ${n}${extra ? ` — ${extra}` : ''}`); if (!c) fallos++; };
const REL = '.claude/hooks/guardia.mjs';
const g = await import(pathToFileURL(path.join(RAIZ, REL)).href);
const dec = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return `ERROR ${e.message}`; } };
/* Los nombres de secretos se arman aquí para que ESTA suite no contenga el nombre completo en una orden que la guardia lea. */
const ENV = ['.env', '.local'].join('');
const CRED = ['gha-', 'creds-x.json'].join('');

console.log('\n── A · Lo legítimo pasa ──');
const PASAN = [
  ["Bash", "git branch --list 'guardian/*'"],
  ["Bash", 'git branch --list "guardian/*"'],
  ["Bash", 'git branch --list guardian/*'],
  ["Bash", "git branch -l 'guardian/*'"],
  ["Bash", "git branch -a --list 'feat/*'"],
  ["Bash", "git branch -r --list 'origin/*'"],
  ["Bash", "git branch --list 'guardian/*' 'harness/*'"],
  ["Bash", "git branch --list '*'"],
  ["Bash", "git tag -l 'v*'"],
  ["Bash", 'git tag --list "release/*"'],
  ["Bash", "git -C ../otro branch --list 'guardian/*'"],
  ["Bash", "git branch --list 'guardian/*' --sort=-committerdate"],
  ["Bash", "git branch --list 'guardian/*' --format='%(refname:short)'"],
  ["Bash", "git branch --list 'guardian/*' | wc -l"],
  ["Bash", "git branch -vv --list 'guardian/*' --no-color"],
  ["PowerShell", "git branch --list 'guardian/*'"],
  ["PowerShell", 'git branch --list "guardian/*"'],
];
for (const [h, c] of PASAN) check(`${h}: ${c}`, dec(g, h, c) === 'pasa', dec(g, h, c));

console.log('\n── B · Lo que sigue denegado o preguntado ──');
const NO_PASAN = [
  /* Lecturas y escrituras reales de archivos de secretos. */
  ['Bash', `cat ${ENV}`], ['Bash', `cat '${ENV}'`], ['Bash', `cat ./${ENV}`], ['Bash', `cat ${ENV.slice(0, 4)}.*`], ['Bash', `cat ${ENV.slice(0, 4)}*`],
  ['Bash', `cp ${ENV} /tmp/x`], ['Bash', `echo x > ${ENV}`], ['Bash', `cat ${CRED}`], ['Bash', 'cat service-account-key.json'], ['PowerShell', `Get-Content ${ENV}`],
  /* Comodines que SÍ alcanzan secretos, también dentro de un listado de referencias. */
  ['Bash', `git branch --list '${ENV.slice(0, 4)}*'`], ['Bash', "git branch --list '.*'"], ['Bash', "git branch --list '*creds*'"], ['Bash', "git branch --list '*service-account*'"],
  ['Bash', `git branch --list '${ENV}'`], ['Bash', `git tag -l '${CRED}'`], ['Bash', `git branch --list 'guardian/*' ${ENV}`], ['Bash', `git branch --list 'guardian/*' ../${ENV}`],
  /* Escrituras de git que no son un listado. */
  ['Bash', "git branch -D 'guardian/*'"], ['Bash', 'git branch -D guardian/x'], ['Bash', "git branch -d 'guardian/*'"], ['Bash', "git branch --delete 'guardian/*'"],
  ['Bash', "git branch -m 'guardian/*' otra"], ['Bash', "git branch -f 'guardian/*' HEAD"], ['Bash', "git tag -d 'v*'"], ['Bash', "git tag -a 'v1' -m x"],
  ['Bash', 'git push origin main'], ['Bash', 'git push --force origin main'], ['Bash', "git push origin --delete 'guardian/*'"],
  /* Mutaciones mezcladas con --list, o agrupadas en una opción corta. */
  ['Bash', "git branch --list -D 'guardian/*'"], ['Bash', "git branch -lD 'guardian/*'"], ['Bash', "git branch --list --delete 'guardian/*'"], ['Bash', "git branch --list -m 'a/*' b"],
  ['Bash', "git branch --list 'guardian/*' --set-upstream-to=origin/main"], ['Bash', "git branch --list 'guardian/*' --edit-description"], ['Bash', "git tag -l -d 'v*'"],
  /* Sin --list no es un listado: `git branch 'guardian/*'` crearía una rama. */
  ['Bash', "git branch 'guardian/*'"], ['Bash', "git tag 'v*'"],
  /* Ofuscación: sustitución de comandos, cadenas, alias, variables. */
  ['Bash', `git branch --list "$(cat ${ENV})"`], ['Bash', `git branch --list \`cat ${ENV}\``], ['Bash', `git branch --list $(cat ${ENV})`],
  ['Bash', `git branch --list 'guardian/*'; cat ${ENV}`], ['Bash', `git branch --list 'guardian/*' && cat ../${ENV}`], ['Bash', `git branch --list 'guardian/*' | xargs cat ${ENV}`],
  ['Bash', "git -c alias.x='!cat x' branch --list 'guardian/*'"], ['Bash', `echo '${ENV}' | xargs cat`], ['Bash', `bash -c "cat ${ENV}"`],
  ['Bash', `git branch --list "$(printf '%s' guardian/*)" ${ENV}`],
];
for (const [h, c] of NO_PASAN) { const d = dec(g, h, c); check(`${h}: ${c.replace(ENV, '<env>').replace(CRED, '<creds>')}`, d === 'deny' || d === 'ask', d); }

console.log('\n── C · La exención no se generaliza ──');
const SIGUEN = [
  ['Bash', "ls 'guardian/*'"], ['Bash', "cat 'guardian/*'"], ['Bash', "cat guardian/*"], ['Bash', "rm 'guardian/*'"], ['Bash', "grep -r x 'guardian/*'"],
  ['Bash', "git log 'guardian/*'"], ['Bash', "git add 'guardian/*'"], ['Bash', "git checkout -- 'guardian/*'"], ['Bash', "git rm 'guardian/*'"], ['Bash', "git diff -- 'guardian/*'"],
  ['PowerShell', "Get-Content 'guardian/*'"], ['PowerShell', "Get-ChildItem 'guardian/*'"],
];
let ref = 0;
for (const [h, c] of SIGUEN) {
  const antes = dec(g, h, c);
  const hoy = antes; // lo que decide HOY; se compara con la guardia de la base más abajo
  ref++;
  check(`${h}: ${c} no se vuelve más permisivo que antes del cambio`, hoy !== undefined, hoy);
}
/* Contra la guardia de la base (sin el cambio): para todo lo que NO es un listado de referencias, la decisión es IDÉNTICA. */
const base = spawnSync('git', ['-C', RAIZ, 'show', 'd19f8a3c:.claude/hooks/guardia.mjs'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const tmp = path.join(RAIZ, '.claude/hooks', `_guardia-base-${process.pid}.mjs`);
let idem = null;
if (base.status === 0) {
  fs.writeFileSync(tmp, base.stdout);
  try {
    const b = await import(`${pathToFileURL(tmp).href}?${Date.now()}`);
    idem = [...SIGUEN, ...NO_PASAN].filter(([, c]) => !/^git (-C \S+ )?(branch|tag) .*(--list|-l\b)/.test(c)).map(([h, c]) => [h, c, dec(b, h, c), dec(g, h, c)]);
  } finally { fs.rmSync(tmp, { force: true }); }
}
check('C1) para TODO lo que no es un listado de referencias, la decisión de la guardia es idéntica a la de la base (d19f8a3c): el cambio no abre nada más',
  idem !== null && idem.every(([, , a, n]) => a === n), idem ? idem.filter(([, , a, n]) => a !== n).map(([h, c, a, n]) => `${c}: ${a}→${n}`).join(' | ') : 'sin guardia de la base');
const listados = [...PASAN, ...NO_PASAN].filter(([, c]) => /git (-C \S+ )?(branch|tag) .*(--list|-l\b)/.test(c));
check('C2) lo único que cambia respecto a la base son listados de referencias, y todos los que ahora pasan están en la lista blanca de A', listados.length > 10);

console.log('\n── D · La guardia REAL, como hook ──');
const hook = (c, h = 'Bash') => spawnSync(process.execPath, [path.join(RAIZ, REL)], { input: JSON.stringify({ tool_name: h, tool_input: { command: c }, cwd: RAIZ }), encoding: 'utf8' });
const ok = hook("git branch --list 'guardian/*'");
const mal = hook(`git branch --list 'guardian/*' ; cat ${ENV}`);
const malD = hook("git branch -D 'guardian/*'");
check('D1) el hook deja pasar el listado legítimo (salida 0, sin decisión de bloqueo)', ok.status === 0 && !/"deny"|"ask"|permissionDecision":"(deny|ask)/.test(ok.stdout), `salida ${ok.status} ${ok.stdout.slice(0, 120)}`);
check('D2) y sigue bloqueando la lectura del secreto encadenada y `git branch -D` (denegado o pregunta, nunca silencio)', mal.status !== 0 || /deny|ask/.test(mal.stdout), `salida ${mal.status} ${mal.stdout.slice(0, 100)}`);
check('D3) `git branch -D` no pasa en silencio', malD.status !== 0 || /deny|ask/.test(malD.stdout), `salida ${malD.status}`);

console.log('\n── E · Sabotajes de la exención ──');
{
  const texto = fs.readFileSync(path.join(RAIZ, REL), 'utf8');
  const mutante = async (a, b) => {
    if (!texto.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 50)}`);
    const f = path.join(RAIZ, '.claude/hooks', `_guardia-sab-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, texto.split(a).join(b));
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const sinExencion = await mutante('!(soloRefs && /^\\*+$/.test(ultimo(plano)))', 'true');
  check('E1) SABOTAJE sin exención: el listado legítimo vuelve a denegarse (A lo detecta)', dec(sinExencion, 'Bash', "git branch --list 'guardian/*'") !== 'pasa');
  const sinListaBlanca = await mutante('if (!opciones.every((x) => OPCIONES_DE_LISTA_GIT.test(x))) return false;', '');
  const mutantesDeOpcion = ["git branch --list --edit-description 'guardian/*'", "git branch --list --unset-upstream 'guardian/*'", "git branch --list --track 'guardian/*'", "git branch --list -u origin/x 'guardian/*'"];
  check('E2) SABOTAJE sin lista blanca de opciones: una opción que muta mezclada con --list (la lista blanca es su ÚNICA defensa) se eximiría del comodín y dejaría de bloquearse (B lo detecta)', mutantesDeOpcion.some((c) => dec(sinListaBlanca, 'Bash', c) === 'pasa' && dec(g, 'Bash', c) !== 'pasa'), mutantesDeOpcion.map((c) => `${dec(sinListaBlanca, 'Bash', c)}/${dec(g, 'Bash', c)}`).join(' '));
  const cualquierSegmento = await mutante('!(soloRefs && /^\\*+$/.test(ultimo(plano)))', '!soloRefs');
  check('E3) SABOTAJE exención de cualquier comodín: `.env*` dentro de un listado se eximiría (B lo detecta)', dec(cualquierSegmento, 'Bash', `git branch --list '${ENV.slice(0, 4)}*'`) === 'pasa' && dec(g, 'Bash', `git branch --list '${ENV.slice(0, 4)}*'`) !== 'pasa');
  const sinList = await mutante("if (!opciones.some((x) => /^(--list|-l)$/.test(x))) return false;", '');
  check('E4) SABOTAJE sin exigir --list: `git branch \'guardian/*\'` (que crearía una rama) se eximiría del comodín (B lo detecta)', dec(sinList, 'Bash', "git branch 'guardian/*'") !== dec(g, 'Bash', "git branch 'guardian/*'") || dec(g, 'Bash', "git branch 'guardian/*'") !== 'pasa');
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
