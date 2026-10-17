/**
 * LA GUARDIA Y LAS REDIRECCIONES A RUTAS PROTEGIDAS — `.claude/hooks/guardia.mjs` (Gran Motor · S1 · P0, 2026-10-16).
 *
 *   node test/guardia-redirecciones.test.mjs
 *
 * El hallazgo (ALTA, docs/GRAN-MOTOR-F-GUARDIAN.md §3): toda orden con intérprete que lleva una orden interior (`bash|sh|zsh -c`, `cmd /c`, `wsl`,
 * `eval`, `powershell|pwsh -c`, `-EncodedCommand`, `env bash -c`…) seguida de una redirección EXTERIOR a una ruta protegida (`.git/`, `.claude/`,
 * `.firebaserc`, el motor de Credits, el Financial Core) pasaba SIN decisión: la rama de los intérpretes devolvía el resultado del interior antes de
 * llegar a `escribeProtegido`. Al reproducirlo salieron tres causas más de la misma clase («la redirección se pierde en la tokenización»):
 *   · el destino solo se miraba con una regex sobre el texto crudo, que no ve comillas partidas (`> .gi''t/HEAD`), llaves (`> .cl{a,}ude/…`) ni los
 *     operadores `>|` y `>&`, aunque no hubiera intérprete (`echo x >| .git/HEAD` pasaba);
 *   · el archivo de una redirección se queda entre las palabras y descoloca a quien mira posiciones: `bash -c > o 'firebase deploy'`,
 *     `bash -c 2>/dev/null '…'`, `bash -c < in.txt '…'` tomaban `o`/`2`/`in.txt` por la orden interior y la orden real NO se analizaba;
 *   · `time -o <ruta protegida> bash -c …` (H5) también se perdía por el mismo `return` anticipado.
 *
 *   A  la clase original: intérprete + redirección exterior a cada ruta protegida → ask, en Bash y en PowerShell.
 *   B  operadores (`>`, `>>`, `1>`, `2>`, `&>`, `&>>`, `>|`, `>&`, `<>`), pegados, con comillas/escapes, anidados, envoltorios delante, llaves, PowerShell.
 *   C  la orden real tras una redirección colocada en medio (`bash -c > o 'orden'`) se decide como la orden: deny/ask.
 *   D  conservación: lo que el interior ya denegaba o preguntaba no se rebaja (deny sigue deny).
 *   E  inocuas: siguen pasando (`> salida.txt`, `> /dev/null`, `2>&1`, lecturas de `.claude/` dentro de `bash -c`…).
 *   F  la guardia REAL, como hook (stdin → salida).
 *   G  frente a la guardia de 8fcaccdc: ninguna decisión menos estricta, y la clase pasaba antes.
 *   H  sabotajes: con cada pieza de la corrección quitada, alguna prueba de A/B/C cae.
 *
 * GUARDIA_REDIRECCIONES_RUTA apunta la suite a otra copia de la guardia (p. ej. la de 8fcaccdc: entonces A/B/C deben FALLAR).
 * Solo se llama al analizador con texto sintético: no se ejecuta ninguna de las órdenes de los casos.
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
const RUTA = process.env.GUARDIA_REDIRECCIONES_RUTA || path.join(RAIZ, REL);
const g = await import(pathToFileURL(RUTA).href);
const dec = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return `ERROR ${e.message}`; } };
const AMBAS = ['Bash', 'PowerShell'];

const RUTAS = ['.git/refs/heads/main', '.git/HEAD', '.git/config', '.firebaserc', '.claude/settings.json', '.claude/hooks/guardia.mjs',
  'functions/src/credits/creditEngine.ts', 'functions/src/core/financial/ledger.ts'];
const INTERPRETES = [
  (r) => `cmd /c echo abc1234 > ${r}`, (r) => `cmd /c "echo x" > ${r}`, (r) => `bash -c "echo x" > ${r}`, (r) => `sh -c "echo x" > ${r}`,
  (r) => `zsh -c 'echo x' >> ${r}`, (r) => `dash -c 'echo x' > ${r}`, (r) => `eval "echo x" > ${r}`, (r) => `env bash -c "echo x" > ${r}`,
  (r) => `powershell -c "echo x" > ${r}`, (r) => `pwsh -c "echo x" > ${r}`, (r) => `powershell -Command "Get-Date" > ${r}`,
  (r) => `wsl bash -c "echo x" > ${r}`, (r) => `wsl echo x > ${r}`,
];

console.log('\n── A · Intérprete + redirección exterior a una ruta protegida: se pregunta ──');
{
  const malos = [];
  let n = 0;
  for (const r of RUTAS) for (const f of INTERPRETES) for (const h of AMBAS) {
    n++;
    const c = f(r); const d = dec(g, h, c);
    if (d !== 'ask' && d !== 'deny') malos.push(`${h}: ${c} → ${d}`);
  }
  check(`A1) ${n} evaluaciones (${RUTAS.length} rutas × ${INTERPRETES.length} intérpretes × 2 herramientas): ninguna pasa sin decisión`, malos.length === 0, malos.slice(0, 4).join(' | '));
}
/* Los casos literales de la tabla de docs/GRAN-MOTOR-F-GUARDIAN.md §3.1, uno a uno. */
for (const [h, c] of [
  ['Bash', 'cmd /c echo abc1234 > .git/refs/heads/main'], ['Bash', 'bash -c "echo x" > .firebaserc'], ['Bash', 'wsl echo x > .firebaserc'],
  ['PowerShell', 'cmd /c echo x > .firebaserc'], ['PowerShell', 'wsl echo x > .firebaserc'], ['Bash', 'sh -c "echo x" > .claude/settings.json'],
  ['Bash', 'eval "echo x" > .firebaserc'], ['Bash', 'env bash -c "echo x" > .firebaserc'], ['Bash', 'wsl bash -c "echo x" > .git/HEAD'],
  ['PowerShell', 'powershell -c "echo x" > .firebaserc'],
]) check(`A2) ${h}: ${c} → ask`, dec(g, h, c) === 'ask', dec(g, h, c));
{
  const b64 = (t) => Buffer.from(t, 'utf16le').toString('base64');
  for (const c of [`powershell -EncodedCommand ${b64('Get-Date')} > .firebaserc`, `pwsh -enc ${b64('Get-Date')} > .claude/settings.json`, `powershell -ec ${b64('echo hola')} >> .git/HEAD`]) {
    for (const h of AMBAS) check(`A3) -EncodedCommand con redirección exterior (${h}): ${c.slice(0, 40)}… → ask`, dec(g, h, c) === 'ask', dec(g, h, c));
  }
}

console.log('\n── B · Operadores, comillas, anidamiento, envoltorios, llaves y PowerShell ──');
const PREGUNTAN = [
  /* operadores, con y sin intérprete, separados y pegados */
  'bash -c "echo x" >> .git/HEAD', 'bash -c "echo x" 1> .git/HEAD', 'bash -c "echo x" 2> .git/HEAD', 'bash -c "echo x" &>.git/HEAD', 'bash -c "echo x" &>>.git/HEAD',
  'bash -c "echo x" 1>>.git/HEAD', 'bash -c "echo x" >.git/HEAD', 'bash -c "echo x" >>.git/HEAD', 'bash -c "echo x" 2>.git/HEAD',
  'echo x >| .git/HEAD', 'bash -c "echo x" >| .git/HEAD', 'bash -c "echo x" >|.git/HEAD', 'echo x >& .git/HEAD', 'bash -c "echo x" >& .git/HEAD', 'bash -c "echo x" >&.git/HEAD',
  'bash -c "echo x" <> .git/HEAD', 'bash -c "echo x" <>.git/HEAD', 'exec 3> .git/HEAD', 'echo x 1>&2 > .git/HEAD',
  /* comillas y escapes en la ruta, dentro y fuera del -c */
  'bash -c "echo x" > ".git/HEAD"', "bash -c \"echo x\" > '.firebaserc'", "bash -c \"echo x\" > .gi''t/HEAD", "echo x > .gi''t/HEAD", 'echo x > .gi""t/HEAD',
  "echo x > .fire''baserc", 'echo x > .\\git/HEAD', 'bash -c "echo x" > ./.git/HEAD', 'bash -c "echo x" > .git\\HEAD', 'bash -c "echo x" > "$HOME/repo/.git/HEAD"',
  "bash -c 'echo x \"> .git/HEAD\"'", 'bash -c "echo x > .git/HEAD"', 'cmd /c "echo x > .firebaserc"',
  /* anidamiento: la redirección exterior de un nivel interior */
  "bash -c \"sh -c 'echo x' > .git/HEAD\"", "bash -c \"sh -c 'echo x > .git/HEAD'\"", 'bash -c "bash -c \'sh -c \\"echo x\\" > .git/HEAD\'"',
  "sh -c \"eval 'echo x' > .firebaserc\"", 'cmd /c "bash -c \'echo x\' > .firebaserc"',
  /* envoltorios delante */
  'time bash -c "echo x" > .git/HEAD', 'sudo bash -c "echo x" > .git/HEAD', 'sudo -u root bash -c "echo x" > .git/HEAD', 'nice -n 5 bash -c "echo x" > .git/HEAD',
  'nohup bash -c "echo x" > .git/HEAD', 'timeout 5 bash -c "echo x" > .git/HEAD', 'command bash -c "echo x" > .git/HEAD', 'exec bash -c "echo x" > .git/HEAD',
  'xargs bash -c "echo x" > .git/HEAD', 'stdbuf -o L bash -c "echo x" > .git/HEAD', 'taskset 1 bash -c "echo x" > .git/HEAD', 'env -i bash -c "echo x" > .firebaserc',
  'time -o .git/HEAD bash -c "echo x"', 'nohup cmd /c echo x > .claude/settings.json',
  /* el archivo en medio */
  'bash -c > .firebaserc "echo x"', 'cmd /c > .git/HEAD echo x',
  /* llaves (H4) en el destino */
  'bash -c "echo x" > {.firebaserc,}', 'bash -c "echo x" > .cl{a,}ude/settings.json', 'echo x > .cl{a,}ude/settings.json', 'echo x > .{git,x}/HEAD',
  /* grupos y subshells */
  '{ bash -c "echo x"; } > .git/HEAD', '(bash -c "echo x") > .git/HEAD', 'bash -c "echo x" | tee .git/HEAD',
];
for (const c of PREGUNTAN) {
  const d = dec(g, 'Bash', c);
  check(`B) Bash pregunta: ${c}`, d === 'ask', d);
}
for (const c of ['cmd /c echo x > .firebaserc', 'powershell -Command "Get-Date" > .firebaserc', 'pwsh -c "echo x" >> .git/HEAD', 'cmd /c echo x 2> .claude/settings.json',
  'wsl echo x > .git/HEAD', 'cmd /c echo x >.firebaserc', 'powershell -c "echo x" > ".git/HEAD"', 'cmd /c echo x | Out-File .firebaserc',
  'cmd /c echo x | Set-Content .git/HEAD', 'powershell -Command "Get-Date | Out-File .firebaserc"']) {
  const d = dec(g, 'PowerShell', c);
  check(`B) PowerShell pregunta: ${c}`, d === 'ask', d);
}

console.log('\n── C · La orden real tras una redirección colocada en medio: se decide ──');
for (const [c, esperado] of [
  ['bash -c > /tmp/o "firebase deploy"', 'deny'], ['bash -c 2>/dev/null "firebase deploy"', 'deny'], ['bash -c < in.txt "git push --force"', 'deny'],
  ['sh -c >> salida.log "git push origin main"', 'ask'], ['bash -c 2>&1 "git commit -m x"', 'ask'], ['echo "firebase deploy" | bash > out.txt', 'deny'],
  ['cmd /c > o.txt firebase deploy', 'deny'], ['env bash -c > o "firebase deploy"', 'deny'],
]) {
  const d = dec(g, 'Bash', c);
  check(`C) Bash ${esperado}: ${c}`, d === esperado, d);
}

console.log('\n── D · Conservación: el interior manda cuando ya decidía ──');
for (const [c, esperado] of [
  ['bash -c "firebase deploy" > .firebaserc', 'deny'], ['cmd /c firebase deploy > .git/HEAD', 'deny'], ['wsl git push --force > .claude/settings.json', 'deny'],
  ['bash -c "git commit -m x" > .git/HEAD', 'ask'], ['eval "git push" > .firebaserc', 'ask'],
]) {
  for (const h of AMBAS) {
    const d = dec(g, h, c);
    check(`D) ${h} ${esperado}: ${c}`, d === esperado, d);
  }
}

console.log('\n── E · Lo inocuo sigue pasando ──');
const PASAN = [
  'cmd /c echo hola > salida.txt', 'bash -c "echo x" > salida.txt', 'echo x > /tmp/x', 'npm test > log.txt', 'npm test 2>&1', 'npm test > /dev/null 2>&1',
  'bash -c "cat .claude/settings.json"', 'git status > /dev/null', 'bash -c "echo x" 2>&1 | tee salida.txt', 'cmd /c dir > lista.txt', 'wsl ls > lista.txt',
  'eval "echo x" > out.log', 'powershell -c "Get-Date" > fecha.txt', 'git diff > cambios.patch', 'echo x >&2', 'cat .git/HEAD', 'bash -c "git log" > log.txt',
  'node -e "1" > o.txt', 'sudo -u root bash -c "ls" > l.txt', 'echo hola > notas.firebaserc.txt', 'echo x > foo.git/x', 'sh -c "ls .git/refs" > refs.txt',
  'cmd /c type .firebaserc > copia-local.txt', 'bash -c "git show HEAD:.claude/settings.json" > /tmp/s.json', 'echo x >| salida.txt', 'echo x 2>/dev/null',
  'bash -c "npm test" 2>&1 > log.txt', 'git log --oneline > /tmp/log.txt 2>&1',
];
for (const c of PASAN) for (const h of AMBAS) {
  const d = dec(g, h, c);
  check(`E) ${h} pasa: ${c}`, d === 'pasa', d);
}

console.log('\n── F · La guardia REAL, como hook ──');
{
  const hook = (c, h = 'Bash') => spawnSync(process.execPath, [RUTA], { input: JSON.stringify({ tool_name: h, tool_input: { command: c }, cwd: RAIZ }), encoding: 'utf8', timeout: 20000 });
  const decHook = (r) => (r.stdout.match(/"permissionDecision":"(deny|ask)"/) || [])[1] || (r.status === 0 ? 'pasa' : `salida ${r.status}`);
  for (const [h, c, esperado] of [
    ['Bash', 'bash -c "echo x" > .firebaserc', 'ask'], ['Bash', 'cmd /c echo abc1234 > .git/refs/heads/main', 'ask'], ['PowerShell', 'wsl echo x > .firebaserc', 'ask'],
    ['Bash', 'sh -c "echo x" > .claude/settings.json', 'ask'], ['Bash', "echo x > .gi''t/HEAD", 'ask'], ['Bash', 'echo x >| .git/HEAD', 'ask'],
    ['Bash', 'bash -c > /tmp/o "firebase deploy"', 'deny'],
    ['Bash', 'bash -c "echo x" > salida.txt', 'pasa'], ['PowerShell', 'cmd /c echo hola > salida.txt', 'pasa'], ['Bash', 'npm test 2>&1', 'pasa'],
  ]) {
    const r = hook(c, h);
    check(`F) hook ${h} → ${esperado}: ${c}`, decHook(r) === esperado, `${decHook(r)} (salida ${r.status})`);
  }
}

console.log('\n── G · Frente a la guardia de 8fcaccdc ──');
const BASE = '8fcaccdc';
const base = spawnSync('git', ['-C', RAIZ, 'show', `${BASE}:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
if (base.status !== 0) {
  console.log(`(la guardia de ${BASE} no está disponible en este clon: la comparación G se omite)`);
} else {
  const tmp = path.join(os.tmpdir(), `_guardia-base-redir-${process.pid}.mjs`);
  fs.writeFileSync(tmp, base.stdout);
  try {
    const b = await import(`${pathToFileURL(tmp).href}?${Date.now()}`);
    const rank = { pasa: 0, ask: 1, deny: 2 };
    const corpus = [...RUTAS.flatMap((r) => INTERPRETES.map((f) => f(r))), ...PREGUNTAN, ...PASAN,
      'bash -c > /tmp/o "firebase deploy"', 'bash -c "firebase deploy" > .firebaserc', 'echo "firebase deploy" | bash > out.txt',
      ...['git push --force origin main', 'firebase deploy --only functions', 'git commit -m x', 'gh auth token', 'git reset --hard HEAD~1', 'rm -rf node_modules', 'git branch --list "guardian/*"']
        .flatMap((c) => [`${c} > out.txt`, `${c} 2>&1`, `bash -c "${c}" > out.txt`, `cmd /c ${c} > out.txt`, `${c} >| out.txt`, `${c} 2>/dev/null`, `(${c}) > o`, `${c} < in.txt`])];
    const peores = []; const mejores = [];
    for (const h of AMBAS) for (const c of corpus) {
      const antes = dec(b, h, c); const ahora = dec(g, h, c);
      if ((rank[ahora] ?? 3) < (rank[antes] ?? 3)) peores.push(`${h}: ${c}: ${antes}→${ahora}`);
      if ((rank[ahora] ?? 3) > (rank[antes] ?? 3)) mejores.push(c);
    }
    check(`G1) ${corpus.length * 2} evaluaciones: NINGUNA decisión es menos estricta que la de ${BASE}`, peores.length === 0, peores.slice(0, 5).join(' | '));
    const clase = ['bash -c "echo x" > .firebaserc', 'cmd /c echo abc1234 > .git/refs/heads/main', 'wsl echo x > .firebaserc', "echo x > .gi''t/HEAD", 'echo x >| .git/HEAD', 'bash -c > /tmp/o "firebase deploy"'];
    const pasabanAntes = clase.filter((c) => dec(b, 'Bash', c) === 'pasa');
    check(`G2) la clase pasaba en ${BASE} (${pasabanAntes.length}/${clase.length}) y con esta guardia ya no`, pasabanAntes.length === clase.length && clase.every((c) => dec(g, 'Bash', c) !== 'pasa'),
      `antes: ${pasabanAntes.length}; ahora pasan: ${clase.filter((c) => dec(g, 'Bash', c) === 'pasa').join(' | ')}`);
  } finally { fs.rmSync(tmp, { force: true }); }
}

console.log('\n── H · Sabotajes de la corrección ──');
{
  const texto = fs.readFileSync(RUTA, 'utf8');
  const mutante = async (pares) => {
    let x = texto;
    for (const [a, b2] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 70)}`); x = x.split(a).join(b2); }
    const f = path.join(os.tmpdir(), `_guardia-sab-redir-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, x);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const pasa = (m, c, h = 'Bash') => dec(m, h, c) === 'pasa';
  const sab = async (nombre, pares, debePasar, aun = []) => {
    let m;
    try { m = await mutante(pares); } catch (e) { check(`${nombre} — el sabotaje se puede aplicar`, false, e.message); return; }
    const abiertos = debePasar.filter((c) => pasa(m, c));
    check(`${nombre}`, abiertos.length === debePasar.length && aun.every((c) => !pasa(m, c)), `reabiertos ${abiertos.length}/${debePasar.length}`);
  };
  /* H1 «revertir el orden»: el resultado del interior vuelve a devolverse ANTES de mirar la escritura exterior. */
  await sab('H1) SABOTAJE revertir el orden (interior antes que la escritura exterior): `bash -c "…" > .firebaserc` y `wsl echo x > …` vuelven a pasar (A lo detecta)',
    [['if (interior) return conEscrituraExterior(decidirPeor(', 'if (interior) return ((']],
    ['bash -c "echo x" > .firebaserc', 'cmd /c echo abc1234 > .git/refs/heads/main', 'wsl echo x > .firebaserc', 'eval "echo x" > .claude/settings.json'],
    ['echo x > .git/HEAD']);
  /* H2 «quitar la comprobación del interior» en la otra puerta de los intérpretes, -EncodedCommand. */
  await sab('H2) SABOTAJE sin la comprobación exterior en -EncodedCommand: `powershell -enc … > .firebaserc` vuelve a pasar (A3 lo detecta)',
    [["try { return conEscrituraExterior(decidirPeor(analizarTexto('PowerShell'", "try { return ((analizarTexto('PowerShell'"]],
    [`powershell -EncodedCommand ${Buffer.from('Get-Date', 'utf16le').toString('base64')} > .firebaserc`]);
  /* H3 «perder la redirección»: el tokenizador deja de recordar los destinos de escritura. */
  await sab('H3) SABOTAJE perder los destinos de la redirección en el tokenizador: comillas partidas, llaves, `>&` y `>|` vuelven a pasar (B lo detecta)',
    [['heredoc: heredocEtapa, salidas: salidasEtapa,', 'heredoc: heredocEtapa, salidas: [],']],
    ["echo x > .gi''t/HEAD", 'echo x > .cl{a,}ude/settings.json', 'echo x >& .git/HEAD', 'echo x >| .git/HEAD', "bash -c \"echo x\" > .gi''t/HEAD"]);
  /* H4: sin el análisis adicional de la orden sin sus redirecciones, la orden real tras `bash -c > o` deja de verse. */
  await sab('H4) SABOTAJE sin la orden sin redirecciones: `bash -c > /tmp/o "firebase deploy"` vuelve a pasar (C lo detecta)',
    [['if (redir.length) {', 'if (false) {']],
    ['bash -c > /tmp/o "firebase deploy"', 'bash -c < in.txt "git push --force"']);
  /* H5: el descriptor pegado (`2>`) deja de reconocerse. */
  await sab('H5) SABOTAJE sin reconocer el descriptor pegado: `bash -c 2>/dev/null "firebase deploy"` vuelve a pasar (C lo detecta)',
    [['if (hayPal && !dinPal && /^\\d+$/.test(pal)) redirEtapa.push(pals.length);', '']],
    ['bash -c 2>/dev/null "firebase deploy"']);
  /* H6: `>|` deja de recordar su destino. */
  await sab('H6) SABOTAJE sin el destino de `>|`: `echo x >| .git/HEAD` vuelve a pasar (B lo detecta)',
    [['if (r.texto) salidasEtapa.push(r.texto);', '']],
    ['echo x >| .git/HEAD', 'bash -c "echo x" >| .git/HEAD']);
  /* H7: el destino se recoge pero escribeProtegido no lo mira. */
  await sab('H7) SABOTAJE escribeProtegido sin mirar los destinos: las comillas partidas vuelven a pasar (B lo detecta)',
    [['if (destinos.some(protegida)) return true;', '']],
    ["echo x > .gi''t/HEAD", 'echo x > .fire\'\'baserc']);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
