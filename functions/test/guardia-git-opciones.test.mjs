/**
 * OPCIONES GLOBALES Y VARIABLES DE ENTORNO DE GIT QUE EJECUTAN PROGRAMAS — `.claude/hooks/guardia.mjs` (Gran Motor · S4, 2026-10-17).
 *
 *   node test/guardia-git-opciones.test.mjs
 *
 * Contexto (docs/GRAN-MOTOR-S1-P1-REVISION.md §7 y docs/GRAN-MOTOR-S4-GIT-OPCIONES.md): `git -c core.fsmonitor=<programa> status` y
 * `git -c diff.external=<programa> diff` EJECUTAN el programa (demostrado en un repositorio desechable, con un programa que solo escribe un
 * marcador) y la guardia de add5862f los dejaba pasar sin decisión, igual que `GIT_EXTERNAL_DIFF=…`, `--exec-path=…`, `core.sshCommand`,
 * `GIT_SSH_COMMAND` y un `--git-dir` que apunta a un directorio con su propio `config` (también demostrados por S4, sin red).
 *
 *   A  los casos DEMOSTRADOS piden decisión, en Bash y PowerShell.
 *   B  …y lo siguen pidiendo tras envoltorios (sudo, env, time, nice, timeout, xargs, nohup, taskset, flock…) y en varios contextos (`;`, `&&`, subshell).
 *   C  …y dentro de intérpretes (bash -c, sh -c, eval, powershell -c, pwsh -Command, cmd /c, -EncodedCommand, find -exec).
 *   D  variables de entorno por TODAS las vías: prefijo, env, sudo, export/declare, set de cmd, setx, `$env:X=…`, `Set-Item env:X`, .NET.
 *   E  el resto de la clase (a): claves de `-c` que ejecutan, una clave desconocida o dinámica, `--config-env`, y variables GIT_* que ejecutan.
 *   F  la clase (b): `--git-dir`/`--work-tree`/GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE fuera del espacio de trabajo, protegidas, de secreto o dinámicas; `--bare`.
 *   G  CONTROLES NEGATIVOS: las lecturas ordinarias y las opciones inertes siguen pasando, y con la MISMA decisión que la guardia de add5862f.
 *   H  nada se rebaja: lo que se denegaba se sigue denegando y lo que preguntaba sigue preguntando.
 *   I  la guardia REAL, como hook por stdin.
 *   J  frente a la guardia de add5862f: 0 transiciones menos estrictas y todas las más estrictas son de la clase S4.
 *   K  sabotajes.
 *
 * GUARDIA_GIT_OPCIONES_RUTA apunta la suite a otra copia de la guardia (contra la de add5862f esta suite FALLA). Solo texto sintético a
 * `analizarTexto` o al hook por stdin: no se ejecuta ninguna orden de los casos.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallos = 0;
const check = (n, c, extra = '') => { console.log(`${c ? '✔' : '✘'} ${n}${extra ? ` — ${extra}` : ''}`); if (!c) fallos++; };
const REL = '.claude/hooks/guardia.mjs';
const RUTA = process.env.GUARDIA_GIT_OPCIONES_RUTA || path.join(RAIZ, REL);
const g = await import(pathToFileURL(RUTA).href);
const dec = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return `ERROR ${e.message}`; } };
const AMBAS = ['Bash', 'PowerShell'];
const L = ['.env', '.local'].join('');   // el nombre del secreto se arma aquí
const P = '/tmp/prog.sh';               // un programa cualquiera: nunca se ejecuta

/* Los casos DEMOSTRADOS (marcador escrito en un repositorio desechable; ver el documento de S4). */
const DEMOSTRADOS = [
  `git -c core.fsmonitor="${P}" status`,
  `git -c diff.external=${P} diff`,
  `GIT_EXTERNAL_DIFF=${P} git diff`,
  'git --exec-path=/tmp/bin ls-remote https://example.invalid/x',
  'GIT_EXEC_PATH=/tmp/bin git ls-remote https://example.invalid/x',
  `git -c core.sshCommand="${P}" ls-remote ssh://example.invalid/x`,
  `GIT_SSH_COMMAND="${P}" git ls-remote ssh://example.invalid/x`,
  'git --git-dir=repo-falso --work-tree=. status',
  'GIT_DIR=repo-falso GIT_WORK_TREE=. git status',
];
const NUCLEO = [`git -c core.fsmonitor="${P}" status`, `git -c diff.external=${P} diff`];

console.log('\n── A · Los casos demostrados piden decisión ──');
for (const c of DEMOSTRADOS) for (const h of AMBAS) check(`A) ${h} ask: ${c}`, dec(g, h, c) === 'ask', dec(g, h, c));
for (const h of AMBAS) {
  check(`A) ${h} ask con el valor PEGADO: git -ccore.fsmonitor=${P} status`, dec(g, h, `git -ccore.fsmonitor=${P} status`) === 'ask');
  check(`A) ${h} ask con mayúsculas en la clave (git no distingue): git -c Core.FSMonitor=x status`, dec(g, h, 'git -c Core.FSMonitor=x status') === 'ask');
  check(`A) ${h} ask con la ruta del programa git.exe: "C:/Git/cmd/git.exe" -c diff.external=C:/x/p.cmd diff`, dec(g, h, '"C:/Git/cmd/git.exe" -c diff.external=C:/x/p.cmd diff') === 'ask');
}

console.log('\n── B · Tras envoltorios y en varios contextos ──');
{
  const ENV = ['sudo', 'sudo -u root', 'sudo -E', 'doas', 'env', 'env -i', 'time', 'time -p', 'nice', 'nice -n 5', 'timeout 5', 'timeout -s KILL 5', 'nohup', 'command',
    'exec', 'stdbuf -o L', 'ionice -c 3', 'setsid', 'xargs', 'xargs -0', 'taskset 1', 'flock /tmp/l', 'chrt 1', 'unbuffer', 'npx', 'strace -f'];
  const CTX = [['directo', (x) => x], ['punto-y-coma', (x) => `echo x ; ${x}`], ['y', (x) => `true && ${x}`], ['subshell', (x) => `( ${x} )`], ['tuberia', (x) => `echo x | ${x}`]];
  const malos = []; let n = 0;
  for (const c of NUCLEO) for (const w of ENV) for (const [, f] of CTX) for (const h of AMBAS) {
    const t = f(`${w} ${c}`); n++;
    if (dec(g, h, t) !== 'ask') malos.push(`${h}: ${t} → ${dec(g, h, t)}`);
  }
  check(`B1) ${n} variantes (2 núcleos × ${ENV.length} envoltorios × ${CTX.length} contextos × 2 shells) piden decisión`, malos.length === 0, malos.slice(0, 4).join(' | '));
  const envMalos = [];
  for (const w of ['sudo', 'sudo -u root', 'env', 'env -i', 'time', 'nice -n 5', 'timeout 5', 'nohup', 'taskset 1', 'xargs']) for (const h of AMBAS) {
    const t = `${w} GIT_EXTERNAL_DIFF=${P} git diff`;
    if (dec(g, h, t) !== 'ask') envMalos.push(`${h}: ${t} → ${dec(g, h, t)}`);
  }
  check('B2) la variable delante del programa tras un envoltorio (`sudo GIT_EXTERNAL_DIFF=… git diff`, `env …`, `timeout 5 …`) pide decisión', envMalos.length === 0, envMalos.slice(0, 4).join(' | '));
  for (const h of AMBAS) check(`B3) ${h} \`env -S 'GIT_PAGER=sh git log'\` pide decisión`, dec(g, h, "env -S 'GIT_PAGER=sh git log'") === 'ask');
  for (const h of AMBAS) check(`B4) ${h} \`sudo -u root git -c core.fsmonitor=x branch --list\` pide decisión (antes pasaba: §4 de la revisión de P1)`,
    dec(g, h, 'sudo -u root git -c core.fsmonitor=x branch --list') === 'ask');
}

console.log('\n── C · Dentro de intérpretes ──');
{
  const enc = (t) => Buffer.from(t, 'utf16le').toString('base64');
  for (const c of NUCLEO) {
    const casos = [`bash -c '${c}'`, `sh -c '${c}'`, `eval '${c}'`, `bash -c "sudo ${c.replace(/"/g, '')}"`, `cmd /c ${c}`, `find . -maxdepth 0 -exec ${c.replace(/"/g, '')} ;`,
      `powershell -c "${c.replace(/"/g, "'")}"`, `pwsh -Command "${c.replace(/"/g, "'")}"`, `powershell -EncodedCommand ${enc(c)}`, `echo '${c}' | bash`];
    check(`C) Bash ask (here-string, solo existe en Bash): bash <<< '${c}'`, dec(g, 'Bash', `bash <<< '${c}'`) === 'ask');
    for (const t of casos) for (const h of AMBAS) check(`C) ${h} ask: ${t.slice(0, 110)}`, dec(g, h, t) === 'ask', dec(g, h, t));
  }
  for (const h of AMBAS) {
    check(`C) ${h} ask: bash -c "GIT_PAGER=sh git log"`, dec(g, h, 'bash -c "GIT_PAGER=sh git log"') === 'ask');
    /* La llamada se arma por partes: la guardia LEE este archivo cuando alguien ejecuta `node test/…` o `npm test`, y una llamada literal de proceso
       con esa orden dentro haría que ejecutar la propia suite pidiera decisión. */
    const EXEC = ['exec', 'Sync'].join('');
    check(`C) ${h} ask: node -e con ${EXEC} de git -c core.fsmonitor`, dec(g, h, `node -e "require('child_process').${EXEC}('git -c core.fsmonitor=x status')"`) === 'ask');
  }
}

console.log('\n── D · Variables de entorno por todas las vías ──');
{
  const BASH = [`GIT_PAGER=sh git log`, `GIT_PAGER="${P}" git -p log`, `env GIT_EXTERNAL_DIFF=${P} git diff`, `export GIT_SSH_COMMAND=${P}; git fetch`,
    `export GIT_EXTERNAL_DIFF=${P} && git diff`, `declare -x GIT_PAGER=sh; git log`, `GIT_PAGER=sh; export GIT_PAGER; git log`, `GIT_DIR=/x; declare -x GIT_DIR; git status`, `git_pager=sh git log`,
    `cmd /c "set GIT_EXTERNAL_DIFF=${P}&& git diff"`, `setx GIT_PAGER sh`, `PAGER=sh git log`, `EDITOR=${P} git status`, `SSH_ASKPASS=${P} git fetch`];
  const PS = [`$env:GIT_PAGER='sh'; git log`, `$env:GIT_PAGER = "sh"; git log`, `\${env:GIT_EXTERNAL_DIFF}='${P}'; git diff`, `$env:GIT_DIR += 'x'; git status`,
    `Set-Item env:GIT_EXTERNAL_DIFF ${P}; git diff`, `Set-Item -Path Env:\\GIT_SSH_COMMAND -Value ${P}`, `New-Item -Path env:GIT_PAGER -Value sh`,
    `[Environment]::SetEnvironmentVariable('GIT_PAGER', 'sh'); git log`, `[System.Environment]::SetEnvironmentVariable("GIT_EXTERNAL_DIFF", "${P}", "User")`,
    `[Environment]::SetEnvironmentVariable($n, 'sh')`];
  for (const c of BASH) for (const h of AMBAS) check(`D) ${h} ask: ${c}`, dec(g, h, c) === 'ask', dec(g, h, c));
  for (const c of PS) for (const h of AMBAS) check(`D) ${h} ask: ${c}`, dec(g, h, c) === 'ask', dec(g, h, c));
}

console.log('\n── E · El resto de la clase (a) ──');
{
  const CLAVES = ['core.pager=sh', 'core.pager=less', 'core.sshCommand=x', 'credential.helper=!x', 'credential.https://x.helper=x', 'core.askPass=x', 'gpg.program=x',
    'gpg.ssh.program=x', 'sequence.editor=x', 'core.editor=x', 'core.hooksPath=/tmp', 'filter.x.clean=x', 'filter.x.smudge=x', 'filter.x.process=x', 'diff.x.textconv=x',
    'diff.x.command=x', 'merge.x.driver=x', 'uploadpack.packObjectsHook=x', 'core.fsmonitor', 'core.gitProxy=x', 'protocol.ext.allow=always', 'safe.directory=*',
    'include.path=/tmp/c', 'includeIf.gitdir:/.path=/tmp/c', 'init.templateDir=/tmp/t', 'url.ext::x.insteadOf=https://', 'pager.log=sh', 'interactive.diffFilter=x',
    'clave.desconocida=1', '$X', 'core.$X=1', 'log.showSignature=true', 'alias.x=!sh'];
  for (const k of CLAVES) for (const h of AMBAS) {
    check(`E1) ${h} ask: git -c ${k} status`, dec(g, h, `git -c '${k}' status`) === 'ask', dec(g, h, `git -c '${k}' status`));
  }
  for (const h of AMBAS) {
    check(`E2) ${h} ask: git --config-env=core.fsmonitor=V status`, dec(g, h, 'git --config-env=core.fsmonitor=V status') === 'ask');
    check(`E2) ${h} ask: git --config-env core.sshCommand=V fetch`, dec(g, h, 'git --config-env core.sshCommand=V fetch') === 'ask');
    check(`E2) ${h} ask: git --exec-path=/tmp branch --list`, dec(g, h, 'git --exec-path=/tmp branch --list') === 'ask');
  }
  const VARS = ['GIT_PAGER=sh', 'GIT_PAGER=less', 'GIT_EXTERNAL_DIFF=x', 'GIT_EXEC_PATH=/tmp', 'GIT_SSH=x', 'GIT_SSH_COMMAND=x', 'GIT_ASKPASS=x', 'GIT_EDITOR=x',
    'GIT_SEQUENCE_EDITOR=x', 'GIT_PROXY_COMMAND=x', 'GIT_CONFIG_COUNT=1', 'GIT_CONFIG_KEY_0=core.fsmonitor', 'GIT_CONFIG_VALUE_0=x', 'GIT_CONFIG_PARAMETERS=x',
    'GIT_CONFIG_GLOBAL=/tmp/c', 'GIT_CONFIG_SYSTEM=/tmp/c', 'GIT_CONFIG=/tmp/c', 'GIT_TEMPLATE_DIR=/tmp/t', 'GIT_ALLOW_PROTOCOL=ext', 'GIT_TRACE=/tmp/t',
    'GIT_TRACE2_EVENT=/tmp/t', 'GIT_ALTERNATE_OBJECT_DIRECTORIES=x', 'GIT_DESCONOCIDA=1', 'GIT_PAGER=$X'];
  for (const v of VARS) for (const h of AMBAS) check(`E3) ${h} ask: ${v} git status`, dec(g, h, `${v} git status`) === 'ask', dec(g, h, `${v} git status`));
}

console.log('\n── F · La clase (b): repositorio y árbol de trabajo ──');
{
  const CASOS = ['git --git-dir=.env status', 'git --git-dir .env status', `git --git-dir=/tmp/r/.git status`, 'git --git-dir=../otro/.git status', 'git --git-dir=~/r/.git status',
    'git --git-dir=$D status', 'git --git-dir=.claude/.git status', 'git --git-dir=sub status', 'git --work-tree=/ status', 'git --work-tree ../otro status',
    'git --work-tree=.claude status', 'git --bare status', 'GIT_DIR=.env git status', `GIT_DIR=${L} git status`, 'GIT_DIR=/tmp/r/.git git log', 'GIT_WORK_TREE=/ git status',
    'GIT_WORK_TREE=$S/wk git status', 'GIT_INDEX_FILE=.git/HEAD git add x', 'GIT_INDEX_FILE=.claude/settings.json git add x', 'GIT_INDEX_FILE=/tmp/idx git add x',
    'GIT_OBJECT_DIRECTORY=../o git status', 'GIT_COMMON_DIR=/tmp/c git status', 'env GIT_DIR=/x git status'];
  for (const c of CASOS) for (const h of AMBAS) check(`F) ${h} pide decisión: ${c}`, ['ask', 'deny'].includes(dec(g, h, c)), dec(g, h, c));
}

console.log('\n── G · Controles negativos: siguen pasando, igual que en add5862f ──');
const NEGATIVOS = ['git status', 'git status --short', 'git log --oneline -5', 'git log -c', 'git log -p -3', 'git diff', 'git diff -c', 'git diff --stat HEAD~1',
  'git show HEAD', 'git show HEAD:README.md', 'git rev-parse HEAD', 'git rev-parse --show-toplevel', "git branch --list 'guardian/*'", 'git branch --list', 'git branch -a',
  'git tag -l', 'git ls-files', 'git blame README.md', 'git grep -n GIT_DIR', 'git describe --tags', 'git remote -v', 'git ls-remote --heads origin', 'git fetch',
  'git -P log', 'git --no-pager log -1', 'git -p log', 'git --no-optional-locks status', 'git --literal-pathspecs ls-files', 'git --exec-path', 'git --version',
  'git -C . status', 'git -C ../otro status', 'git -C C:\\Users\\x\\repo log', 'git -C "$D" status', 'git --namespace=x log',
  'git -c core.autocrlf=false diff', 'git -c core.safecrlf=false status', 'git -c core.quotepath=off status', 'git -c color.ui=always log', 'git -c color.diff.meta=blue diff',
  'git -c user.name=x -c user.email=x@x status', 'git -c core.pager=cat log', "git -c core.pager='' log", 'git -c pager.branch=false branch', 'git -c advice.detachedHead=false status',
  'git -c log.date=iso log', 'git -c diff.renames=true diff', 'git -ccore.autocrlf=false diff', 'git --git-dir=.git status', 'git --git-dir .git --work-tree . status',
  `git --git-dir=${path.resolve(process.cwd(), '.git').replace(/\\/g, '/')} status`, 'git --git-dir=.git/modules/x status', 'git --work-tree=. status', 'git --work-tree=src status',
  'GIT_OPTIONAL_LOCKS=0 git status', 'GIT_CONFIG_NOSYSTEM=1 git log', 'GIT_TERMINAL_PROMPT=0 git fetch', 'GIT_PAGER=cat git log', 'GIT_PAGER= git log', 'PAGER=cat git log',
  'GIT_TRACE=1 git status', 'GIT_TRACE=0 git status', 'GIT_DIR=.git git status', 'GIT_WORK_TREE=. git status', 'GIT_INDEX_FILE=idx-tmp git ls-files',
  'GIT_AUTHOR_NAME=x git log', 'echo GIT_PAGER=sh', 'grep -n GIT_DIR= README.md', 'echo "git -c core.fsmonitor=x status"', 'PAGER=sh less README.md',
  'EDITOR=vim npm test', 'export PATH=/x:$PATH; git status', '$env:Path = "C:\\x;" + $env:Path; git status', "[Environment]::SetEnvironmentVariable('Path', 'x', 'User')",
  'Get-Item env:GIT_DIR', 'Remove-Item env:GIT_PAGER',
  /* una asignación suelta (sin exportar ni preceder a una orden) no llega a git; vacía, una variable de ruta no apunta a nada (comprobado: git falla o la ignora) */
  'GIT_PAGER=sh', 'GIT_DIR= git status', 'GIT_INDEX_FILE= git status', 'sudo echo GIT_PAGER=sh', 'taskset 1 echo GIT_PAGER=sh', 'echo x | sudo grep -n GIT_DIR= README.md',
  /* lo que usan las propias suites del repo (la guardia lo lee dentro de `npm test` y de `node test/…`): desactivan ganchos y firma */
  'git -c core.hooksPath= -c user.name=t -c user.email=t@t.invalid -c commit.gpgsign=false -C x status', 'git -c core.hooksPath=/dev/null status',
  'GIT_LFS_SKIP_SMUDGE=1 git status', 'npm test', 'node test/guardian-contencion.test.mjs', 'node test/guardian-autocorreccion.test.mjs',
  'node test/guardia-git-opciones.test.mjs'];
{
  const BASE = 'add5862f';
  const base = spawnSync('git', ['-C', RAIZ, 'show', `${BASE}:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  let b = null; let tmp = null;
  if (base.status === 0) { tmp = path.join(os.tmpdir(), `_guardia-base-s4-${process.pid}.mjs`); fs.writeFileSync(tmp, base.stdout); b = await import(`${pathToFileURL(tmp).href}?${Date.now()}`); }
  else console.log(`(la guardia de ${BASE} no está disponible en este clon: los negativos solo se comprueban contra «pasa»)`);
  for (const c of NEGATIVOS) for (const h of AMBAS) {
    const n2 = dec(g, h, c);
    const a = b ? dec(b, h, c) : 'pasa';
    check(`G) ${h} igual que ${BASE} (${a}) y pasa: ${c}`, n2 === a && n2 === 'pasa', `${a} → ${n2}`);
  }
  for (const [c, esp] of [['git branch -c a b', 'ask'], ['git branch --list -c core.pager=sh', 'ask'], ['git commit -m "GIT_PAGER=sh"', 'ask'], ['git -c alias.x="!sh" x', 'ask'],
    ['git -c core.editor=x commit', 'ask'], ['git -c core.hooksPath=/tmp commit', 'ask']]) {
    for (const h of AMBAS) check(`G2) ${h} sin cambio (${esp}): ${c}`, dec(g, h, c) === esp && (!b || dec(b, h, c) === esp), `${b ? dec(b, h, c) : '?'} → ${dec(g, h, c)}`);
  }
  globalThis.__base = b; globalThis.__tmp = tmp;
}

console.log('\n── H · Nada se rebaja ──');
for (const [c, esp] of [['git -c core.fsmonitor=x push --force', 'deny'], ['GIT_PAGER=sh firebase deploy', 'deny'], [`GIT_PAGER=sh cat ${L}`, 'deny'],
  ['git -c core.fsmonitor=x submodule foreach firebase deploy', 'deny'], [`git --git-dir=${L} status`, 'deny'], [`git -c core.fsmonitor=x branch --list '.env*'`, 'deny'],
  ['git -c core.pager=sh branch --list \'guardian/*\'', 'deny'], ['$env:GIT_PAGER="sh"; git push --force', 'deny'], ['GIT_EXTERNAL_DIFF=x git push', 'ask'],
  ['git -c core.fsmonitor=x commit -m x', 'ask'], ['git -c core.fsmonitor=x reset --hard', 'ask'], ['GIT_DIR=/x git rebase main', 'ask']]) {
  for (const h of AMBAS) check(`H) ${h} ${esp}: ${c}`, dec(g, h, c) === esp, dec(g, h, c));
}

console.log('\n── I · La guardia REAL, como hook por stdin ──');
{
  const hook = (c, h = 'Bash') => spawnSync(process.execPath, [RUTA], { input: JSON.stringify({ tool_name: h, tool_input: { command: c }, cwd: RAIZ }), encoding: 'utf8', timeout: 20000 });
  const decHook = (r) => (r.stdout.match(/"permissionDecision":"(deny|ask)"/) || [])[1] || (r.status === 0 ? 'pasa' : `salida ${r.status}`);
  for (const [h, c, esperado] of [['Bash', NUCLEO[0], 'ask'], ['PowerShell', NUCLEO[0], 'ask'], ['Bash', NUCLEO[1], 'ask'], ['PowerShell', NUCLEO[1], 'ask'],
    ['Bash', `sudo -u root ${NUCLEO[0]}`, 'ask'], ['Bash', `bash -c '${NUCLEO[1]}'`, 'ask'], ['PowerShell', `$env:GIT_EXTERNAL_DIFF='${P}'; git diff`, 'ask'],
    ['Bash', `GIT_EXTERNAL_DIFF=${P} git diff`, 'ask'], ['Monitor', NUCLEO[0], 'ask'], ['Bash', 'git status', 'pasa'], ['PowerShell', 'git log --oneline -5', 'pasa'],
    ['Bash', 'git -c core.autocrlf=false diff', 'pasa'], ['Bash', 'git -c core.fsmonitor=x push --force', 'deny']]) {
    const r = hook(c, h);
    check(`I) hook ${h} → ${esperado}: ${c}`, decHook(r) === esperado && r.status === 0, `${decHook(r)} (salida ${r.status})`);
  }
}

console.log('\n── J · Frente a la guardia de add5862f: 0 menos estrictas ──');
{
  const b = globalThis.__base;
  if (!b) console.log('(sin la guardia de add5862f: J se omite)');
  else {
    const rank = { pasa: 0, ask: 1, deny: 2 };
    const corpus = [...DEMOSTRADOS, ...NEGATIVOS];
    for (const pre of ['', 'sudo ', 'env ', 'timeout 5 ', 'echo x ; ', 'bash -c ']) for (const x of ['git status', 'git log', 'git diff', 'git branch --list', 'git push', 'git commit', 'git push --force']) {
      for (const o of ['', '-c core.fsmonitor=x ', '-c core.autocrlf=false ', '--git-dir=.env ', '--git-dir=.git ', '-C ../o ', '--exec-path=/t ', '--bare ']) {
        const t = x.replace(/^git /, `git ${o}`);
        corpus.push(pre === 'bash -c ' ? `bash -c '${t}'` : pre + t);
      }
      for (const v of ['GIT_PAGER=sh ', 'GIT_PAGER=cat ', 'GIT_DIR=/x ', 'GIT_OPTIONAL_LOCKS=0 ', 'PAGER=sh ']) corpus.push(pre === 'bash -c ' ? `bash -c '${v}${x}'` : pre + v + x);
    }
    let menos = []; let mas = 0; let iguales = 0;
    for (const h of AMBAS) for (const c of corpus) {
      const a = dec(b, h, c); const n2 = dec(g, h, c);
      if (a === n2) { iguales++; continue; }
      if ((rank[n2] ?? 3) < (rank[a] ?? 3)) menos.push(`${h}: ${c}: ${a}→${n2}`); else mas++;
    }
    check(`J1) ${corpus.length * 2} evaluaciones: 0 menos estrictas (iguales ${iguales}, más estrictas ${mas})`, menos.length === 0, menos.slice(0, 4).join(' | '));
    check('J2) y hay más estrictas (la corrección hace algo)', mas > 0);
  }
  if (globalThis.__tmp) fs.rmSync(globalThis.__tmp, { force: true });
}

console.log('\n── K · Sabotajes ──');
{
  const texto = fs.readFileSync(RUTA, 'utf8');
  const mutante = async (pares) => {
    let x = texto;
    for (const [a, b2] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 70)}`); x = x.split(a).join(b2); }
    const f = path.join(os.tmpdir(), `_guardia-sab-s4-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, x);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const prueba = async (nombre, pares, cond) => {
    let m;
    try { m = await mutante(pares); } catch (e) { check(`${nombre} — el sabotaje se puede aplicar`, false, e.message); return; }
    check(nombre, cond(m));
  };
  await prueba('K1) SABOTAJE quitar la regla de opciones globales: `git -c core.fsmonitor=… status` vuelve a pasar (A lo detecta)',
    [['    return s4 || PASA;   // S4', '    return PASA;']],
    (m) => dec(m, 'Bash', NUCLEO[0]) === 'pasa' && dec(m, 'Bash', NUCLEO[1]) === 'pasa');
  await prueba('K2) SABOTAJE meter `core.fsmonitor` en la lista blanca de claves inertes: vuelve a pasar (A/E lo detectan)',
    [["  'core.autocrlf', 'core.safecrlf',", "  'core.fsmonitor', 'core.autocrlf', 'core.safecrlf',"]],
    (m) => dec(m, 'Bash', NUCLEO[0]) === 'pasa');
  await prueba('K3) SABOTAJE quitar una clave inerte (`core.autocrlf`): la lectura ordinaria pasa a preguntar (G lo detecta)',
    [["  'core.autocrlf', 'core.safecrlf',", "  'core.safecrlf',"]],
    (m) => dec(m, 'Bash', 'git -c core.autocrlf=false diff') === 'ask');
  await prueba('K4) SABOTAJE perder las variables de entorno (desenvolver ya no las recuerda): `GIT_EXTERNAL_DIFF=… git diff` vuelve a pasar (A/D lo detectan)',
    [['{ asignaciones.push(w[0]); w = w.slice(1); continue; }', '{ w = w.slice(1); continue; }']],
    (m) => dec(m, 'Bash', `GIT_EXTERNAL_DIFF=${P} git diff`) === 'pasa');
  /* La detección tras un envoltorio tiene DOS capas: `desenvolver` (quita el envoltorio y recuerda la asignación) y las hipótesis de H6 (`porEnvoltorios`,
     que vuelve a analizar cada sufijo). Quitar una sola no basta para que pase: se sabotean las dos; y luego H6 sola, con un envoltorio que desenvolver no modela. */
  const SIN_H6 = ['const r3 = porEnvoltorios(herr, { ...tuberia[k], palabras: pals }, profundidad, raiz);', 'const r3 = PASA;'];
  await prueba('K5) SABOTAJE quitar la detección tras el envoltorio `env` (sus asignaciones y las hipótesis de H6): `env GIT_EXTERNAL_DIFF=… git diff` vuelve a pasar (B2/D lo detectan)',
    [['if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(opc)) asignaciones.push(opc);   // S4', ''], SIN_H6],
    (m) => dec(m, 'Bash', `env GIT_EXTERNAL_DIFF=${P} git diff`) === 'pasa' && dec(m, 'Bash', `GIT_EXTERNAL_DIFF=${P} git diff`) === 'ask');
  await prueba('K5b) SABOTAJE quitar las hipótesis de H6: `taskset 1 git -c core.fsmonitor=… status` vuelve a pasar (B1 lo detecta)',
    [SIN_H6],
    (m) => dec(m, 'Bash', `taskset 1 ${NUCLEO[0]}`) === 'pasa' && dec(m, 'Bash', `sudo ${NUCLEO[0]}`) === 'ask');
  await prueba('K6) SABOTAJE quitar la comprobación de variables de la etapa: todas las vías de D vuelven a pasar',
    [['return r.decision ? r : (variablesGitS4(etapa) || r);', 'return r;']],
    (m) => ['GIT_PAGER=sh git log', "$env:GIT_PAGER='sh'; git log", 'export GIT_SSH_COMMAND=x; git fetch'].every((c) => dec(m, 'PowerShell', c) === 'pasa'));
  await prueba('K7) SABOTAJE quitar el valor PEGADO (`-ccore.fsmonitor=…`): vuelve a pasar (A lo detecta)',
    [["else if (/^-c./.test(x)) { if (!claveGitInerteS4(x.slice(2))) malo = x; }", '']],
    (m) => dec(m, 'Bash', `git -ccore.fsmonitor=${P} status`) === 'pasa' && dec(m, 'Bash', NUCLEO[0]) === 'ask');
  await prueba('K8) SABOTAJE quitar la regla de `--git-dir`/`--work-tree`: el directorio con su propio config vuelve a pasar (A/F lo detectan)',
    [["else if (/^--(git-dir|work-tree)=/.test(x)) { const v = x.slice(x.indexOf('=') + 1); if (!s4RutaSegura(v, x.startsWith('--git-dir') ? 'gitdir' : 'arbol')) malo = x; }", '']],
    (m) => dec(m, 'Bash', 'git --git-dir=repo-falso --work-tree=. status') === 'pasa');
  await prueba('K9) SABOTAJE quitar la detección de .NET: `[Environment]::SetEnvironmentVariable(\'GIT_PAGER\', …)` vuelve a pasar (D lo detecta)',
    [['{ const r = entornoDotnetS4(texto); if (r) sumar(r); }', '']],
    (m) => dec(m, 'PowerShell', "[Environment]::SetEnvironmentVariable('GIT_PAGER', 'sh'); git log") === 'pasa');
  await prueba('K10) SABOTAJE devolver las opciones globales ANTES de mirar el resto (tapar un deny): `git -c core.fsmonitor=x push --force` deja de denegarse (H lo detecta)',
    [["    const s4 = opcionesGlobalesGitS4(resto.slice(0, i));", "    const s4 = opcionesGlobalesGitS4(resto.slice(0, i)); if (s4) return s4;"]],
    (m) => dec(m, 'Bash', 'git -c core.fsmonitor=x push --force') === 'ask');
  /* Sabotajes pedidos por el propietario (a–f), cada uno con su resultado verificable. Se aplican a una COPIA temporal; el archivo real no cambia. */
  await prueba('Ka) SABOTAJE eliminar la comprobación de una opción global peligrosa (`-c` separado): `git -c core.fsmonitor=… status` vuelve a pasar',
    [["if (x === '-c') { k++; if (!claveGitInerteS4(globales[k] ?? '')) malo = `-c ${globales[k] ?? ''}`; }", "if (x === '-c') { k++; }"]],
    (m) => dec(m, 'Bash', NUCLEO[0]) === 'pasa' && dec(m, 'Bash', 'git --exec-path=/tmp branch --list') === 'ask');
  await prueba('Kb) SABOTAJE omitir una variable relevante (GIT_EXTERNAL_DIFF como inerte): `GIT_EXTERNAL_DIFF=… git diff` vuelve a pasar',
    [["  'GIT_LFS_SKIP_SMUDGE']);", "  'GIT_LFS_SKIP_SMUDGE', 'GIT_EXTERNAL_DIFF']);"]],
    (m) => dec(m, 'Bash', `GIT_EXTERNAL_DIFF=${P} git diff`) === 'pasa' && dec(m, 'Bash', 'GIT_PAGER=sh git log') === 'ask');
  await prueba('Kc) SABOTAJE ignorar el orden (mirar también lo que va DESPUÉS del subcomando): `git log -c`/`git diff -c` pasan a preguntar (G lo detecta)',
    [['const s4 = opcionesGlobalesGitS4(resto.slice(0, i));', 'const s4 = opcionesGlobalesGitS4(resto);']],
    (m) => dec(m, 'Bash', 'git log -c') === 'ask' && dec(g, 'Bash', 'git log -c') === 'pasa');
  await prueba('Kd) SABOTAJE permitir el programa de prueba (`diff.external` en la lista blanca): `git -c diff.external=… diff` vuelve a pasar',
    [["  'core.autocrlf', 'core.safecrlf',", "  'diff.external', 'core.autocrlf', 'core.safecrlf',"]],
    (m) => dec(m, 'Bash', NUCLEO[1]) === 'pasa');
  await prueba('Ke) SABOTAJE debilitar el control de contexto (toda ruta es segura): `--git-dir=repo-falso`, `--work-tree=/` y `GIT_DIR=.env` vuelven a pasar',
    [['  if (v == null || s4Dentro(v) === null || s4Protegida(v)) return false;', '  return true;']],
    (m) => ['git --git-dir=repo-falso --work-tree=. status', 'git --work-tree=/ status', 'GIT_DIR=.env git status'].every((c) => dec(m, 'Bash', c) === 'pasa'));
  await prueba('Kf) SABOTAJE bloquear indiscriminadamente las lecturas de git: `git status`/`git log` pasan a preguntar (los controles negativos G lo detectan)',
    [['    return s4 || PASA;   // S4', "    return s4 || decision('ask', 'sabotaje');"]],
    (m) => dec(m, 'Bash', 'git status') === 'ask' && dec(m, 'PowerShell', 'git log --oneline -5') === 'ask');
  await prueba('K11) SABOTAJE quitar la ruta de submodule/bisect (lanzado): `git -c core.fsmonitor=x submodule foreach echo` vuelve a pasar',
    [["if (sub !== 'rebase') return r.decision ? decidirPeor(r) : (s4 || r);", "if (sub !== 'rebase') return decidirPeor(r);"]],
    (m) => dec(m, 'Bash', 'git -c core.fsmonitor=x submodule foreach echo hi') === 'pasa' && dec(g, 'Bash', 'git -c core.fsmonitor=x submodule foreach echo hi') === 'ask');
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
