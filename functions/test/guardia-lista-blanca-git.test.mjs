/**
 * LA LISTA BLANCA DE LECTURA DE GIT Y LAS 186 DE `sudo -u root` — `.claude/hooks/guardia.mjs` (Gran Motor · S1 · P1, 2026-10-16).
 *
 *   node test/guardia-lista-blanca-git.test.mjs
 *
 * Contexto: la excepción R1 (`esListadoDeRefsGit`) exime del chequeo de COMODINES a un `git branch|tag --list '<…>/*'` si TODAS sus opciones están
 * en una lista blanca de lectura. H5 hizo que `desenvolver` saltara el VALOR de `sudo -u` (`OPC_CON_VALOR_ENVOLTORIO`), y con ello 186 entradas del
 * corpus (`sudo -u root git branch --list 'guardian/*'` con 23 envoltorios × 4 contextos + desnuda, en Bash y PowerShell) pasaron de deny a pasa
 * (180) o a ask (6, las de `xargs`). Y la revisión R1 (hallazgo H1) vio que dos entradas de la lista habían perdido la barra (`--abbrev(=d+)?`,
 * `-nd*`): `--abbrev=7` y `-n3` no entraban y `--abbrev=d`, sí.
 *
 *   A  la lista blanca es UNA definición explícita (`LISTA_BLANCA_LECTURA_REFS_GIT`) y se fija entrada a entrada: añadir una opción hace FALLAR esto.
 *   B  lo permitido: `git branch --list 'guardian/*'`, con y sin `sudo -u root`, en Bash y en PowerShell; y las dos entradas de H1 ya corregidas.
 *   C  H1: lo que entraba por la «d» literal ya no entra (`--abbrev=d`, `-nd`), ni con sufijos (`--abbrev=7x`, `-n3x`).
 *   D  lo que NO queda permitido: opciones que mutan mezcladas con `--list`, `-c`/`--git-dir`/`--work-tree`/`--exec-path`/`--config-env`, patrones que
 *      alcanzan un secreto, otros valores de `sudo` que nombran un secreto, `sudo -h`, otra orden tras `sudo -u root`.
 *   E  la excepción no autoriza NADA más: una orden encadenada tras el listado (`;`, `&&`, `||`, `|`, salto de línea, `&`) se decide igual que sola.
 *   F  una opción NUEVA (cualquiera fuera de la lista) deja la orden sin exención.
 *   G  las 186: cada una de las 93 entradas × 2 herramientas con su decisión fijada y su porqué, por familia.
 *   H  la guardia REAL, como hook.
 *   I  frente a 8fcaccdc: lo ÚNICO que cambia son las entradas de H1.
 *   J  sabotajes.
 *
 * GUARDIA_LISTA_GIT_RUTA apunta la suite a otra copia de la guardia. Solo texto sintético: no se ejecuta ninguna orden de los casos.
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
const RUTA = process.env.GUARDIA_LISTA_GIT_RUTA || path.join(RAIZ, REL);
const g = await import(pathToFileURL(RUTA).href);
const dec = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return `ERROR ${e.message}`; } };
const AMBAS = ['Bash', 'PowerShell'];
const L = ['.env', '.local'].join('');   // el nombre del secreto se arma aquí
const B = "git branch --list 'guardian/*'";
const S = `sudo -u root ${B}`;

console.log('\n── A · Una sola lista blanca, fijada entrada a entrada ──');
const ESPERADA = ['--list', '-l', '-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose', '--no-color', '--color(=.*)?', '--column(=.*)?', '--no-column',
  '-i', '--ignore-case', '--abbrev(=\\d+)?', '--no-abbrev', '--show-current', '--merged(=.*)?', '--no-merged(=.*)?', '--contains(=.*)?', '--no-contains(=.*)?',
  '--points-at(=.*)?', '--sort(=.*)?', '--format(=.*)?', '-n\\d*'];
const lista = g.LISTA_BLANCA_LECTURA_REFS_GIT;
check('A1) la guardia exporta UNA lista blanca (LISTA_BLANCA_LECTURA_REFS_GIT) congelada', Array.isArray(lista) && Object.isFrozen(lista));
check(`A2) la lista es EXACTAMENTE la de R1 con H1 corregido (${ESPERADA.length} entradas, mismo orden): una opción nueva o quitada hace fallar esto`,
  Array.isArray(lista) && lista.length === ESPERADA.length && lista.every((x, i) => x === ESPERADA[i]), JSON.stringify(lista));
{
  const fuente = fs.readFileSync(RUTA, 'utf8');
  check('A3) la exención compila la regex SOLO desde esa lista (no hay otra lista de opciones de lectura en la guardia)',
    /const OPCIONES_DE_LISTA_GIT = new RegExp\(`\^\(\$\{LISTA_BLANCA_LECTURA_REFS_GIT\.join\('\|'\)\}\)\$`\);/.test(fuente)
    && (fuente.match(/--no-contains\(=\.\*\)\?/g) || []).length === 1 && !fuente.includes('|--ignore-case|') && !fuente.includes('|-nd*)$/'));
  check('A4) y la comprobación de la lista sigue siendo la única puerta de la exención (`opciones.every(… OPCIONES_DE_LISTA_GIT …)`)',
    fuente.includes('if (!opciones.every((x) => OPCIONES_DE_LISTA_GIT.test(x))) return false;'));
}

console.log('\n── B · Lo permitido ──');
for (const c of [B, S, 'git branch -l "guardian/*"', "sudo -u root git tag -l 'guardian/*'", "sudo git branch --list 'guardian/*'", "doas -u root git branch --list 'guardian/*'",
  "sudo --user=root git branch --list 'guardian/*'", "sudo -uroot git branch --list 'guardian/*'", "sudo -u root git -C ../otro branch --list 'guardian/*'",
  "sudo -u root git branch --list 'guardian/*' --sort=-committerdate", "sudo -u root git branch --list 'guardian/*' --format='%(refname:short)'",
  /* H1 corregido: las dos entradas numéricas entran */
  "git branch --list --abbrev=7 'guardian/*'", "sudo -u root git branch --list --abbrev=12 'guardian/*'", "git tag -l -n3 'guardian/*'", "sudo -u root git tag -l -n 'guardian/*'",
  "git branch --list --abbrev 'guardian/*'"]) {
  for (const h of AMBAS) check(`B) ${h} pasa: ${c}`, dec(g, h, c) === 'pasa', dec(g, h, c));
}

console.log('\n── C · H1: la «d» literal ya no abre la exención ──');
for (const c of ["git branch --list --abbrev=d 'guardian/*'", "git tag -l -nd 'guardian/*'", "git tag -l -ndd 'guardian/*'", "git branch --list --abbrev=7x 'guardian/*'",
  "git tag -l -n3x 'guardian/*'", "sudo -u root git branch --list --abbrev=d 'guardian/*'", "git branch --list --abbrev=-1 'guardian/*'"]) {
  for (const h of AMBAS) check(`C) ${h} deny: ${c}`, dec(g, h, c) === 'deny', dec(g, h, c));
}

console.log('\n── D · Lo que NO queda permitido ──');
const NO = [
  ['sudo -u root git branch -D x', 'ask'], ['sudo -u root git branch -d guardian/x', 'ask'], ['sudo git push', 'ask'], ['sudo -u root git push origin main', 'ask'],
  ['sudo -u root git push --force', 'deny'], ["sudo -u root git tag --list 'v*' -d v1", 'ask'],
  /* opciones que mutan mezcladas con --list: sin exención → el comodín se decide como siempre */
  ...['-D', '-d', '-m', '-M', '-c', '-C x', '-f', '-u origin/x', '-t', '--track', '--set-upstream-to=origin/x', '--unset-upstream', '--edit-description',
    '--create-reflog', '--delete', '--move', '--copy', '--force', '--no-track', '-s', '--sign', '-F x', '--file=x', '-e', '--edit', '--cleanup=strip']
    .map((o) => [`sudo -u root git branch --list ${o} 'guardian/*'`, 'deny']),
  /* opciones GLOBALES que cambian lo que git ejecuta o el repositorio */
  ...['-c core.pager=less', '-c alias.branch=push', '--git-dir=/x', '--git-dir /x', '--work-tree=/x', '--exec-path=/x', '--config-env=core.pager=X', '-ccore.pager=x']
    .map((o) => [`sudo -u root git ${o} branch --list 'guardian/*'`, 'deny']),
  /* patrones que alcanzan nombres de secretos */
  ["sudo -u root git branch --list '.env*'", 'deny'], [`sudo -u root git branch --list 'guardian/${L}'`, 'deny'], ["sudo -u root git branch --list '*creds*'", 'deny'],
  ["sudo -u root git branch --list 'guardian/.e*'", 'deny'], ["sudo -u root git branch --list '.*'", 'deny'], ["sudo -u root git tag -l '?env*'", 'deny'],
  /* el valor de sudo también se mira (H5: queda en `quitadas`) */
  [`sudo -u ${L} ${B}`, 'deny'], [`sudo -u root -p ${L} ${B}`, 'deny'], [`sudo -g ${L} ${B}`, 'deny'],
  /* otra orden tras sudo -u root */
  ['sudo -h firebase deploy', 'deny'], [`sudo -h ${B}`, 'deny'], ['sudo -u root firebase deploy', 'deny'], ["sudo -u root sh -c 'git push --force'", 'deny'],
  ['sudo -u root git commit -m x', 'ask'], ['sudo -u root git reset --hard HEAD~1', 'ask'], [`sudo -u root git -c alias.x=commit x`, 'ask'],
  /* redirección a una ruta protegida (P0) */
  [`${S} > .git/HEAD`, 'ask'], [`${S} >> .claude/settings.json`, 'ask'],
];
for (const [c, esperado] of NO) for (const h of AMBAS) {
  const d = dec(g, h, c);
  check(`D) ${h} ${esperado}: ${c}`, d === esperado, d);
}

console.log('\n── E · La excepción no autoriza órdenes añadidas ──');
{
  const SEGUNDAS = ['rm .claude/settings.json', 'firebase deploy', 'git push --force', 'git commit -m x', `cat ${L}`, 'gh auth token', 'git branch -D x', 'echo x > .git/HEAD',
    'git reset --hard HEAD~1', 'gcloud secrets versions access latest --secret=x'];
  const rank = { pasa: 0, ask: 1, deny: 2 };
  const malos = [];
  let n = 0;
  for (const x of SEGUNDAS) for (const sep of [' ; ', ' && ', ' || ', ' | ', '\n', ' & ']) for (const h of AMBAS) {
    n++;
    const sola = dec(g, h, x); const junta = dec(g, h, `${S}${sep}${x}`);
    if (sola === 'pasa' || (rank[junta] ?? 3) < (rank[sola] ?? 3)) malos.push(`${h}: «${sep.trim() || '\\n'}» ${x}: sola ${sola}, tras el listado ${junta}`);
  }
  check(`E1) ${n} combinaciones: toda orden añadida tras \`${S}\` se decide al menos tan estricta como sola (y ninguna de las probadas pasa sola)`, malos.length === 0, malos.slice(0, 4).join(' | '));
  check('E2) y el listado SOLO no cambia por ir delante de otra cosa inocua (`; echo hola` sigue pasando)', AMBAS.every((h) => dec(g, h, `${S} ; echo hola`) === 'pasa'));
}

console.log('\n── F · Una opción nueva deja la orden sin exención ──');
for (const o of ['--nueva-opcion', '--exec=x', '-x', '-Z', '--abbrev7', '--list=x', '--points', '--formatx', '-ll', '-vvv', '-n-1', '--color-moved', '--include=x', '--recurse-submodules']) {
  const c = `sudo -u root git branch --list ${o} 'guardian/*'`;
  check(`F) Bash deny: ${c}`, dec(g, 'Bash', c) === 'deny', dec(g, 'Bash', c));
}

console.log('\n── G · Las 186 de `sudo -u root git branch --list \'guardian/*\'`, una a una ──');
{
  /* Las mismas 93 entradas que el inventario del validador (MENOS-inventario-completo.csv, sha256 20298dbf…): la orden desnuda + 23 envoltorios × 4 contextos. */
  const ENV = ['timeout', 'time', 'nice', 'nohup', 'stdbuf', 'command', 'builtin', 'noglob', 'exec', 'call', 'setsid', 'ionice', 'chrt', 'sudo', 'doas', '&', '.',
    'env', 'xargs', 'npx', 'pnpx', 'bunx', 'wsl'];
  const CTX = [['directo', (w) => `${w} ${S}`], ['punto-y-coma', (w) => `echo x ; ${w} ${S}`], ['subshell', (w) => `( ${w} ${S} )`], ['tuberia', (w) => `echo x | ${w} ${S}`]];
  const entradas = [{ fam: 'sin', ctx: 'sin', c: S }, ...ENV.flatMap((w) => CTX.map(([k, f]) => ({ fam: w, ctx: k, c: f(w) })))];
  /* Decisión esperada y PORQUÉ, por familia (lo decide el código; esto lo FIJA):
     · desnuda y los 21 envoltorios que `desenvolver` quita sin cambiar la orden (timeout…wsl, salvo xargs): pasa. Es la orden R1 sin envoltorio: un
       listado de solo lectura; el envoltorio, `sudo`, `-u` y `root` quedan en `quitadas`, donde secretos y rutas protegidas se siguen mirando.
       Residuos PREEXISTENTES que no dependen de sudo ni de la excepción (iguales con `git status`): `.` lee un archivo llamado `sudo` que la guardia no
       abre; `npx|pnpx|bunx` resolverían un paquete npm llamado `sudo`; `wsl`/`call`/`&` dependen del entorno.
     · xargs: ask en los contextos sin entrada legible (directo, `;`, subshell): sus argumentos llegan por la entrada estándar y podrían ser cualquier
       opción de `git branch`; con `echo x |` la entrada es legible (`x`), se añade como patrón y queda un listado: pasa. */
  const esperada = (e) => (e.fam === 'xargs' && e.ctx !== 'tuberia' ? 'ask' : 'pasa');
  check('G1) son 93 entradas distintas × 2 herramientas = 186', new Set(entradas.map((e) => e.c)).size === 93 && entradas.length * 2 === 186);
  const porFamilia = {};
  const malos = [];
  for (const e of entradas) for (const h of AMBAS) {
    const d = dec(g, h, e.c);
    porFamilia[e.fam] = porFamilia[e.fam] || {}; porFamilia[e.fam][d] = (porFamilia[e.fam][d] || 0) + 1;
    if (d !== esperada(e)) malos.push(`${h}: ${e.c} → ${d} (esperada ${esperada(e)})`);
  }
  check('G2) cada una de las 186 tiene la decisión fijada para su familia (180 pasa · 6 ask, las de xargs sin entrada legible)', malos.length === 0, malos.slice(0, 4).join(' | '));
  const total = Object.values(porFamilia).reduce((a, x) => ({ pasa: a.pasa + (x.pasa || 0), ask: a.ask + (x.ask || 0), deny: a.deny + (x.deny || 0) }), { pasa: 0, ask: 0, deny: 0 });
  check('G3) recuento: 180 pasa, 6 ask, 0 deny', total.pasa === 180 && total.ask === 6 && total.deny === 0, JSON.stringify(total));
  /* Y la misma estructura con una orden que muta no queda permitida en NINGUNA familia: la excepción es de la orden, no del envoltorio. */
  const mutantes = [];
  for (const w of ENV) for (const [, f] of CTX) for (const h of AMBAS) {
    const c = f(w).replace(S, "sudo -u root git branch --list -D 'guardian/*'");
    if (dec(g, h, c) === 'pasa') mutantes.push(`${h}: ${c}`);
  }
  check('G4) con `-D` mezclado, ninguna de las 184 variantes con envoltorio pasa', mutantes.length === 0, mutantes.slice(0, 3).join(' | '));
}

console.log('\n── H · La guardia REAL, como hook ──');
{
  const hook = (c, h = 'Bash') => spawnSync(process.execPath, [RUTA], { input: JSON.stringify({ tool_name: h, tool_input: { command: c }, cwd: RAIZ }), encoding: 'utf8', timeout: 20000 });
  const decHook = (r) => (r.stdout.match(/"permissionDecision":"(deny|ask)"/) || [])[1] || (r.status === 0 ? 'pasa' : `salida ${r.status}`);
  for (const [h, c, esperado] of [['Bash', S, 'pasa'], ['PowerShell', S, 'pasa'], ['Bash', "git branch --list --abbrev=7 'guardian/*'", 'pasa'],
    ['Bash', "sudo -u root git branch --list -D 'guardian/*'", 'deny'], ['PowerShell', `${S} ; git push --force`, 'deny'], ['Bash', "git branch --list --abbrev=d 'guardian/*'", 'deny'],
    ['Bash', "sudo -u root git -c core.pager=x branch --list 'guardian/*'", 'deny']]) {
    const r = hook(c, h);
    check(`H) hook ${h} → ${esperado}: ${c}`, decHook(r) === esperado, `${decHook(r)} (salida ${r.status})`);
  }
}

console.log('\n── I · Frente a la guardia de 8fcaccdc: solo cambian las entradas de H1 ──');
{
  const BASE = '8fcaccdc';
  const base = spawnSync('git', ['-C', RAIZ, 'show', `${BASE}:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (base.status !== 0) {
    console.log(`(la guardia de ${BASE} no está disponible en este clon: la comparación I se omite)`);
  } else {
    const tmp = path.join(os.tmpdir(), `_guardia-base-lista-${process.pid}.mjs`);
    fs.writeFileSync(tmp, base.stdout);
    try {
      const b = await import(`${pathToFileURL(tmp).href}?${Date.now()}`);
      const opciones = [...ESPERADA.map((x) => x.replace('(=.*)?', '=x').replace('(=\\d+)?', '=7').replace('\\d*', '3')), '--abbrev', '-n', '--abbrev=d', '-nd', '-D', '-m', '--track'];
      const corpus = [];
      for (const sub of ['branch', 'tag']) for (const o of opciones) for (const pat of ["'guardian/*'", "'*'", "'.env*'", "'v1.*'"]) {
        corpus.push(`git ${sub} --list ${o} ${pat}`, `sudo -u root git ${sub} -l ${o} ${pat}`, `timeout 5 git ${sub} --list ${o} ${pat}`);
      }
      corpus.push(...NO.map((x) => x[0]));
      const H1 = (c) => /--abbrev=(7|d)\b|\s-n(3|d)\b/.test(c);
      const rank = { pasa: 0, ask: 1, deny: 2 };
      const fuera = []; const h1 = { menos: 0, mas: 0 };
      for (const h of AMBAS) for (const c of corpus) {
        const a = dec(b, h, c); const n2 = dec(g, h, c);
        if (a === n2) continue;
        if (H1(c)) { if ((rank[n2] ?? 3) < (rank[a] ?? 3)) h1.menos++; else h1.mas++; continue; }
        fuera.push(`${h}: ${c}: ${a}→${n2}`);
      }
      check(`I1) ${corpus.length * 2} evaluaciones: fuera de H1 NADA cambia respecto a ${BASE}`, fuera.length === 0, fuera.slice(0, 4).join(' | '));
      check('I2) H1 cambia en los dos sentidos: `--abbrev=7`/`-n3` deny→pasa, `--abbrev=d`/`-nd` pasa→deny', h1.menos > 0 && h1.mas > 0, JSON.stringify(h1));
    } finally { fs.rmSync(tmp, { force: true }); }
  }
}

console.log('\n── J · Sabotajes ──');
{
  const texto = fs.readFileSync(RUTA, 'utf8');
  const mutante = async (pares) => {
    let x = texto;
    for (const [a, b2] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 70)}`); x = x.split(a).join(b2); }
    const f = path.join(os.tmpdir(), `_guardia-sab-lista-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, x);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const prueba = async (nombre, pares, cond) => {
    let m;
    try { m = await mutante(pares); } catch (e) { check(`${nombre} — el sabotaje se puede aplicar`, false, e.message); return; }
    check(nombre, cond(m));
  };
  await prueba('J1) SABOTAJE volver a la «d» literal de H1: `--abbrev=7` vuelve a denegarse y `--abbrev=d` a pasar (B/C lo detectan)',
    [["'--abbrev(=\\\\d+)?'", "'--abbrev(=d+)?'"], ["'-n\\\\d*'", "'-nd*'"]],
    (m) => dec(m, 'Bash', "git branch --list --abbrev=7 'guardian/*'") === 'deny' && dec(m, 'Bash', "git branch --list --abbrev=d 'guardian/*'") === 'pasa');
  await prueba('J2) SABOTAJE ampliar la lista con `-D`: A2 lo detecta y la mezcla con --list deja de denegarse por el comodín (D lo detecta)',
    [["'-n\\\\d*',\n]);", "'-n\\\\d*', '-D',\n]);"]],
    (m) => m.LISTA_BLANCA_LECTURA_REFS_GIT.length === ESPERADA.length + 1 && dec(m, 'Bash', "sudo -u root git branch --list -D 'guardian/*'") !== 'deny');
  await prueba('J3) SABOTAJE sin la comprobación de la lista: `--track`/`--edit-description` mezclados con --list se eximen y pasan (D lo detecta)',
    [['if (!opciones.every((x) => OPCIONES_DE_LISTA_GIT.test(x))) return false;', '']],
    (m) => ["sudo -u root git branch --list --edit-description 'guardian/*'", "sudo -u root git branch --list --track 'guardian/*'"].some((c) => dec(m, 'Bash', c) === 'pasa'));
  await prueba('J4) SABOTAJE sin excluir las globales (`-c`, `--git-dir`…): `git -c core.pager=x branch --list` se exime (D lo detecta)',
    [['if (resto.slice(0, i).some((x) => GLOBALES_SIN_EXENCION_GIT.test(x))) return false;', '']],
    /* S4 (Gran Motor): `--git-dir=/x` (fuera del espacio de trabajo) ya pregunta por la regla de opciones globales de S4, así que con este sabotaje
       la orden de D pasa de deny a ask (D lo sigue detectando) en vez de pasar; la que PASA es la que S4 acepta (`--git-dir=.git`). */
    (m) => dec(m, 'Bash', "sudo -u root git --git-dir=.git branch --list 'guardian/*'") === 'pasa'
      && dec(m, 'Bash', "sudo -u root git --git-dir=/x branch --list 'guardian/*'") !== 'deny');
  await prueba('J5) SABOTAJE sin exigir el modo lista: `git tag -a \'guardian/*\'` (crear) deja de decidirse por el comodín (deny → ask)',
    [['if (!opciones.some((x) => /^(--list|-l)$/.test(x))) return false;', '']],
    (m) => dec(g, 'Bash', "git tag -a 'guardian/*'") === 'deny' && dec(m, 'Bash', "git tag -a 'guardian/*'") !== 'deny');
  await prueba('J6) SABOTAJE sin saltar el valor de `sudo -u` (antes de H5): las 186 vuelven a denegarse (G lo detecta)',
    [['if (w.length && (OPC_CON_VALOR_ENVOLTORIO[p] || []).includes(opc)) quita(1);', '']],
    (m) => dec(m, 'Bash', S) === 'deny' && dec(g, 'Bash', S) === 'pasa');
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
