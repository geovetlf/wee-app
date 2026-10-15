/**
 * LA GUARDIA Y LOS ENVOLTORIOS NO MODELADOS — `.claude/hooks/guardia.mjs` (Guardian · hallazgo H6, 2026-10-15).
 *
 *   node test/guardia-envoltorios2.test.mjs
 *
 * El hallazgo H6: `desenvolver` solo conoce los envoltorios de su lista. Cualquier otro programa que ejecuta una orden (`taskset 1 firebase deploy`,
 * `flock x firebase deploy`, `numactl`, `unshare`, `nsenter`, `chroot`, `runuser`, `su -c`, `watch`, `strace`, `gdb --args`, `systemd-run`, `script -c`,
 * `parallel`, `ssh host …`, `wsl -e`, `start`, `source`…) era «un programa desconocido» y la orden real no se decidía. Y las opciones con valor de los
 * envoltorios conocidos que la tabla no recoge (`env -iS 'firebase deploy'`, `sudo -h firebase deploy`) dejaban el valor como «el programa».
 *
 * La corrección analiza TODAS las hipótesis de dónde empieza la orden real (cada sufijo de palabras) y toma la peor, contando solo lo que el sufijo
 * añade por la IDENTIDAD del programa (para no duplicar los falsos positivos de los argumentos).
 *
 *   A  la orden sensible oculta tras un envoltorio nuevo se DENIEGA/PREGUNTA (Bash y PowerShell).
 *   B  opciones con valor, cadenas entre comillas, anidados, encadenado, subshell.
 *   C  lo legítimo NO cambia (pasa y decide igual que la guardia anterior d0440c3b).
 *   D  la guardia REAL, como hook.
 *   E  CONSERVACIÓN frente a d0440c3b: ninguna decisión es menos estricta.
 *   F  interacción H4/H5: el sabotaje G4 de H4 mide solo la pieza de H4.
 *   G  sabotajes: con cada pieza quitada, A–C fallan.
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
/* GUARDIA_ENVOLTORIOS2_RUTA apunta la suite a otra copia de la guardia (la anterior, para ver que A–B FALLAN). */
const RUTA = process.env.GUARDIA_ENVOLTORIOS2_RUTA || path.join(RAIZ, REL);
const g = await import(pathToFileURL(RUTA).href);
const dec = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return `ERROR ${e.message}`; } };
const rank = { pasa: 0, ask: 1, deny: 2 };
const L = ['.env', '.local'].join('');
const CL = ['.cla', 'ude'].join('');
const SETTINGS = `${CL}/settings.json`;

/* La guardia anterior (H5, d0440c3b) para la conservación. */
const git = (args) => spawnSync('git', ['-C', RAIZ, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
const base = (() => {
  if (process.env.GUARDIA_ENVOLTORIOS2_BASE) return { ruta: process.env.GUARDIA_ENVOLTORIOS2_BASE, limpiar: false };
  const r = git(['show', `d0440c3b:${REL}`]);
  if (r.status !== 0) return null;
  const f = path.join(os.tmpdir(), `_guardia-base-h6-${process.pid}.mjs`);
  fs.writeFileSync(f, r.stdout);
  return { ruta: f, limpiar: true };
})();
const b = base ? await import(`${pathToFileURL(base.ruta).href}?${Date.now()}`) : null;

/* Envoltorios NUEVOS (con una forma de uso típica, con sus opciones y operandos). */
const NUEVOS = ['taskset 1', 'taskset -c 0', 'taskset -c 0,1', 'flock x', 'flock -w 5 x', 'flock -n x', 'numactl -C 0', 'numactl --cpunodebind=0', 'unshare -m', 'unshare --user',
  'nsenter -t 1 -m', 'chroot /', 'runuser -u root --', 'sg wheel', 'setpriv --reuid 1', 'prlimit --nofile=5', 'pkexec', 'watch -n 5', 'strace -f', 'strace -o out', 'ltrace', 'gdb --args',
  'valgrind', 'perf stat', 'fakeroot', 'proot -r x', 'systemd-run', 'systemd-run --user', 'dbus-run-session --', 'cpulimit -l 50 --', 'parallel', 'parallel -j 2', 'entr', 'xvfb-run -a',
  'winpty', 'wsl -e', 'wsl -d Ubuntu -e', 'start', 'start /b', 'busybox', 'ssh host', 'ssh -p 22 host', 'source', 'eatmydata', 'torsocks', 'proxychains', 'dumb-init', 'tini --', 'gosu root',
  'su-exec root', 'sshpass -p x ssh host', 'arch -x86_64', 'unbuffer', 'chronic', 'ifne', 'caffeinate', 'tsp', 'firejail', 'bwrap'];
const SENSIBLES = [['deny', 'firebase deploy'], ['deny', 'git push --force origin main'], ['deny', 'gcloud functions delete x'], ['deny', 'gh auth token'], ['ask', 'git commit -m x'], ['ask', `rm ${SETTINGS}`]];

console.log('\n── A · La orden sensible oculta tras un envoltorio nuevo (Bash y PowerShell) ──');
for (const w of NUEVOS) for (const [esperado, c] of SENSIBLES) {
  const cmd = `${w} ${c}`;
  for (const h of ['Bash', 'PowerShell']) {
    const d = dec(g, h, cmd);
    check(`${h} ${esperado}: ${cmd}`, rank[d] >= rank[esperado], d);
  }
}

console.log('\n── B · Opciones con valor, cadenas, anidados, encadenado ──');
const B = [
  ['deny', 'taskset -p 1 4 firebase deploy'], ['deny', 'flock -w 5 x firebase deploy'], ['deny', "flock -n x -c 'firebase deploy'"], ['deny', "su -c 'firebase deploy'"],
  ['deny', "su root -c 'firebase deploy'"], ['deny', "sg wheel -c 'firebase deploy'"], ['deny', "runuser -l x -c 'firebase deploy'"], ['deny', "watch -n 5 'firebase deploy'"],
  ['deny', "parallel 'firebase deploy' ::: a b"], ['deny', "ssh host 'git push --force origin main'"], ['deny', "ssh -p 22 host 'firebase deploy'"], ['deny', "script -qc 'firebase deploy' /dev/null"],
  ['deny', 'wsl -e firebase deploy'], ['deny', 'wsl -d Ubuntu -e git push --force origin main'], ['deny', 'source firebase deploy'], ['deny', 'gdb --args firebase deploy'],
  ['deny', "env -iS 'firebase deploy'"], ['deny', "env -i0S 'firebase deploy'"], ['deny', "env -iSfirebase deploy"], ['deny', 'sudo -h firebase deploy'],
  ['deny', 'taskset 1 sudo firebase deploy'], ['deny', 'sudo taskset 1 firebase deploy'], ['deny', 'nice taskset 1 flock x firebase deploy'], ['deny', 'timeout 5 taskset 1 firebase deploy'],
  ['deny', 'timeout -s ABRT 5 taskset 1 firebase deploy'], ['deny', 'timeout 1.5 firebase deploy'], ['deny', 'timeout -s ABRT 5 firebase deploy'], ['deny', 'xargs --max-chars 5 firebase deploy'],
  ['deny', 'strace -o x -f -- taskset 1 firebase deploy'], ['deny', 'echo a; taskset 1 firebase deploy'], ['deny', '(taskset 1 firebase deploy)'], ['deny', 'echo a | taskset 1 firebase deploy'],
  ['deny', 'true && flock x firebase deploy'], ['deny', 'bash -c "taskset 1 firebase deploy"'], ['deny', 'FOO=1 taskset 1 firebase deploy'], ['deny', 'taskset 1 {firebase,deploy}'],
  ['deny', 'busybox sh -c "firebase deploy"'], ['deny', 'xvfb-run -a bash -c "firebase deploy"'], ['deny', 'start firebase deploy'], ['deny', 'start /b firebase deploy'],
  ['ask', `taskset 1 rm ${SETTINGS}`], ['ask', `flock x cp x ${SETTINGS}`], ['ask', 'systemd-run --user git commit -m x'],
  ['deny', `taskset 1 cat ${L}`], ['deny', `flock x cat {${L},x}`],
];
for (const [esperado, c] of B) { const d = dec(g, 'Bash', c); check(`Bash ${esperado}: ${c}`, rank[d] >= rank[esperado], d); }
for (const [esperado, c] of [['deny', 'start firebase deploy'], ['deny', 'start /b firebase deploy'], ['deny', 'wsl -e firebase deploy'], ['deny', 'cmd /d /c firebase deploy'], ['deny', 'winpty firebase deploy'],
  ['deny', 'taskset 1 firebase deploy'], ['deny', 'ssh host firebase deploy'], ['deny', 'echo a; flock x git push --force origin main']]) {
  const d = dec(g, 'PowerShell', c); check(`PowerShell ${esperado}: ${c}`, rank[d] >= rank[esperado], d);
}

console.log('\n── C · Lo legítimo con estos envoltorios NO cambia (pasa y decide igual que la guardia anterior) ──');
const LEG = [
  'taskset -c 0 npm test', 'taskset 1 node a.js', 'flock x npm test', 'flock -w 5 x node a.js', "flock -n x -c 'npm test'", 'numactl -C 0 node a.js', 'unshare -m ls', 'chroot / ls',
  "su -c 'ls'", "watch -n 5 'git status'", "watch -n 5 'ls -la'", 'strace -f ls', 'gdb --args node a.js', 'valgrind node a.js', 'perf stat ls', 'systemd-run --user ls', "script -qc 'ls' /dev/null",
  "parallel 'echo {}' ::: a b", 'parallel echo ::: a b', "ssh host 'ls'", 'ssh host ls', 'ssh -p 22 host uptime', 'wsl -e ls', 'wsl ls', 'start notepad', 'source ./scripts/no-existe.sh', 'busybox ls',
  'xvfb-run -a node a.js', 'tini -- node a.js', "env -iS 'node a.js'", 'env -i PATH=/usr/bin node a.js', 'sudo -E git branch --list "guardian/*"', "sudo -u root git branch --list 'guardian/*'",
  "nice -n 5 git branch --list 'guardian/*'", 'sudo echo firebase deploy', 'nice echo firebase deploy', 'sudo -u root echo hola',
  'timeout 5 git log --oneline', 'time npm test', 'command -v firebase', 'command -v git', 'command -v node', 'taskset 1 echo hola', 'flock x echo hola', 'watch -n 5 echo hola',
  'taskset -c 0 git status', 'flock x git log --oneline', 'strace -o out ls', 'ssh host "git status"', 'nohup node a.js', 'exec node script.js',
];
for (const c of LEG) {
  const ahora = dec(g, 'Bash', c); const antes = b ? dec(b, 'Bash', c) : 'pasa';
  check(`pasa y no cambia: ${c}`, ahora === 'pasa' && ahora === antes, `ahora ${ahora}, antes ${antes}`);
}

console.log('\n── D · La guardia REAL, como hook ──');
const hook = (c, h = 'Bash') => spawnSync(process.execPath, [RUTA], { input: JSON.stringify({ tool_name: h, tool_input: { command: c }, cwd: RAIZ }), encoding: 'utf8' });
const bloquea = (r) => r.status !== 0 || /"permissionDecision":"(deny|ask)"/.test(r.stdout);
for (const c of ['taskset 1 firebase deploy', 'flock x firebase deploy', "su -c 'firebase deploy'", 'wsl -e firebase deploy', "env -iS 'firebase deploy'", 'ssh host git push --force origin main']) {
  const r = hook(c); check(`D) el hook bloquea: ${c}`, bloquea(r), `salida ${r.status} ${r.stdout.slice(0, 80)}`);
}
check('D) el hook bloquea en PowerShell: start firebase deploy', bloquea(hook('start firebase deploy', 'PowerShell')));
for (const c of ['taskset -c 0 npm test', 'flock x npm test', "watch -n 5 'git status'"]) {
  const r = hook(c); check(`D) el hook deja pasar: ${c}`, r.status === 0 && !bloquea(r), `salida ${r.status}`);
}

console.log('\n── E · Conservación frente a la guardia anterior (d0440c3b) ──');
if (!b) console.log('(la guardia anterior no está disponible en este clon: la comparación E se omite)');
else {
  const corpus = new Set([...B.map((x) => x[1]), ...LEG, ...SENSIBLES.map((x) => x[1]), 'ls', 'git status', 'npm test', 'node a.js', `cat ${L}`, `rm ${SETTINGS}`]);
  const RE = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"/g;
  for (const f of ['guardia-llaves', 'guardia-referencias-git', 'guardia-claude', 'guardia-vigente', 'guardia-envoltorios', 'guardian-hooks', 'guardian-aserciones', 'guardian-contencion', 'harness-guardian']) {
    const ruta = path.join(aqui, `${f}.test.mjs`);
    if (!fs.existsSync(ruta)) continue;
    for (const m of fs.readFileSync(ruta, 'utf8').matchAll(RE)) { const s = (m[1] ?? m[2] ?? '').replace(/\\(['"`\\])/g, '$1'); if (s.length >= 2 && s.length <= 300 && !/\n/.test(s)) corpus.add(s); }
  }
  const walk = (o) => { if (typeof o === 'string') corpus.add(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  try { walk(JSON.parse(fs.readFileSync(path.join(aqui, 'guardia-rodeos.casos.json'), 'utf8'))); } catch { /* sin rodeos */ }
  const PRE = ['', 'taskset 1 ', 'flock x ', 'watch -n 5 ', 'ssh host ', 'sudo ', 'timeout 5 ', 'env -i ', 'xargs ', 'wsl -e ', 'source '];
  const peores = []; let n = 0; let mas = 0;
  for (const h of ['Bash', 'PowerShell']) for (const c of corpus) for (const pre of PRE) {
    if (/\n/.test(c)) continue;
    const cmd = pre + c; n++;
    const antes = dec(b, h, cmd); const ahora = dec(g, h, cmd);
    if ((rank[ahora] ?? 3) > (rank[antes] ?? 3)) mas++;
    if ((rank[ahora] ?? 3) < (rank[antes] ?? 3)) peores.push(`${h}: ${cmd}: ${antes}→${ahora}`);
  }
  check(`E1) ${n} evaluaciones: NINGUNA decisión es menos estricta que la de d0440c3b`, peores.length === 0, peores.slice(0, 5).join(' | '));
  check('E2) la corrección endurece: hay decisiones más estrictas', mas > 100, `${mas}`);
  const eran = ['taskset 1 firebase deploy', 'flock x firebase deploy', "su -c 'firebase deploy'", 'wsl -e firebase deploy', "env -iS 'firebase deploy'"].filter((c) => dec(b, 'Bash', c) === 'pasa' && dec(g, 'Bash', c) !== 'pasa');
  check('E3) los casos del hallazgo pasaban antes y ya no', eran.length === 5, eran.join(' | '));
}

console.log('\n── F · Interacción H4/H5: G4 de H4 mide SOLO la pieza de H4 ──');
{
  const texto = fs.readFileSync(RUTA, 'utf8');
  const mut = async (pares) => {
    let x = texto;
    for (const [a, c] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 60)}`); x = x.split(a).join(c); }
    const f = path.join(os.tmpdir(), `_guardia-sab-h6-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, x);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const SIN_EXP_SECRETO = ['for (const plano of utiles.flatMap((a) => expandirLlaves(a)).map(desescapar)) {', 'for (const plano of utiles.map(desescapar)) {'];
  const SIN_ETAPA = ["if (tuberia[k].palabras.some((x) => x.includes('{'))) {", 'if (false) {'];
  const REGEX_VIEJA = ["/\\s/.test(s[i + 1] || '\\n')))", "/\\s|\\n|$/.test(s[i + 1] || '\\n')))"];
  const H5_PROGRAMA = 'const utiles = [...quitadas, ...(conPrograma ? sinPatron(p, w) : sinPatron(p, w).slice(1))];';
  const SIN_H5 = [H5_PROGRAMA, 'const utiles = [...quitadas, ...sinPatron(p, w).slice(1)];'];
  const SOLO_H4 = [REGEX_VIEJA, SIN_EXP_SECRETO, SIN_ETAPA];
  const sinH5 = await mut([...SOLO_H4]);
  const conH5Apagado = await mut([...SOLO_H4, SIN_H5]);
  check('F1) con H5 presente, apagar SOLO las piezas de H4 no basta: `cat {<secreto>,x}` sigue denegado por la comprobación del programa de H5 (por eso H5 tocó G4)', dec(sinH5, 'Bash', `cat {${L},x}`) === 'deny');
  check('F2) apagando además la pieza de H5, `cat {<secreto>,x}` pasa: G4 mide exactamente la pieza de H4', dec(conH5Apagado, 'Bash', `cat {${L},x}`) === 'pasa');
  check('F3) con la pieza de H4 intacta (solo H5 apagada) el secreto sigue denegado: G4 no depende de H5 para lo demás', dec(await mut([SIN_H5]), 'Bash', `cat {${L},x}`) === 'deny');
  check('F4) la corrección H6 no cambia ese resultado: los sabotajes de H4 dan lo mismo con y sin el apagado de H6', dec(await mut([...SOLO_H4, SIN_H5, ['const r3 = porEnvoltorios(', 'const r3 = (() => PASA)(']]), 'Bash', `cat {${L},x}`) === 'pasa');
  if (b) {
    const h4 = git(['show', `07f2eb67:${REL}`]);
    if (h4.status === 0) {
      let x = h4.stdout;
      for (const [a, c] of SOLO_H4) { if (!x.includes(a)) throw new Error('H4 no contiene ' + a.slice(0, 40)); x = x.split(a).join(c); }
      const f = path.join(os.tmpdir(), `_guardia-h4-sab-${process.pid}.mjs`);
      fs.writeFileSync(f, x);
      try { const m = await import(`${pathToFileURL(f).href}?${Date.now()}`); check('F5) sobre la guardia de H4 (07f2eb67) el G4 original de H4 (sin apagar H5, que no existe) ya mide la pieza: pasa', dec(m, 'Bash', `cat {${L},x}`) === 'pasa'); } finally { fs.rmSync(f, { force: true }); }
    }
  }
}

console.log('\n── G · Sabotajes de la corrección ──');
{
  const texto = fs.readFileSync(RUTA, 'utf8');
  const mut = async (pares) => {
    let x = texto;
    for (const [a, c] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 60)}`); x = x.split(a).join(c); }
    const f = path.join(os.tmpdir(), `_guardia-sab-h6b-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, x);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const m1 = await mut([['const r3 = porEnvoltorios(', 'const r3 = (() => PASA)(']]);
  check('G1) SABOTAJE sin analizar las hipótesis: `taskset 1 firebase deploy` y `flock x firebase deploy` vuelven a pasar (A lo detecta)', dec(m1, 'Bash', 'taskset 1 firebase deploy') === 'pasa' && dec(m1, 'Bash', 'flock x firebase deploy') === 'pasa');
  const m2 = await mut([['if (rk(r) <= rk(sin)) continue;', '']]);
  check('G2) SABOTAJE sin la comparación con el programa desconocido: reaparece el falso positivo `sudo git branch --list \'guardian/*\'` (C lo detecta)', dec(g, 'Bash', "sudo -E git branch --list 'guardian/*'") === 'pasa' && dec(m2, 'Bash', "sudo -E git branch --list 'guardian/*'") !== 'pasa');
  const m3 = await mut([['let hasta = (nuevo || ENVOLTORIOS_H6.has(p1)) ? ps.length : ps.length - desenvolver(ps).w.length;', 'let hasta = ps.length;']]);
  check('G3) SABOTAJE sin limitar las hipótesis de los envoltorios ya modelados: reaparece el falso positivo `sudo echo firebase deploy` (C lo detecta)', dec(g, 'Bash', 'sudo echo firebase deploy') === 'pasa' && dec(m3, 'Bash', 'sudo echo firebase deploy') !== 'pasa');
  const m4 = await mut([['if (nuevo && /\\s/.test(ps[k])', 'if (false && /\\s/.test(ps[k])']]);
  check("G4) SABOTAJE sin leer las cadenas entre comillas: `su -c 'firebase deploy'` y `watch -n 5 'firebase deploy'` pasan (B lo detecta)", dec(m4, 'Bash', "su -c 'firebase deploy'") !== 'deny' && dec(m4, 'Bash', "watch -n 5 'firebase deploy'") !== 'deny' && dec(g, 'Bash', "su -c 'firebase deploy'") === 'deny');
  const m5 = await mut([['const grupoS = opc.match(/^-[A-Za-z0-9]+S(.*)$/);', 'const grupoS = null;']]);
  check("G5) SABOTAJE sin `-S` dentro de un grupo de opciones: `env -iS 'firebase deploy'` pasa en la parte de `desenvolver` (B lo detecta; el resto de hipótesis no cubre env)", dec(m5, 'Bash', "env -iS 'firebase deploy'") === 'pasa' && dec(g, 'Bash', "env -iS 'firebase deploy'") === 'deny');
  const m6 = await mut([["'taskset', 'flock', 'numactl',", "'numactl',"]]);
  check('G6) SABOTAJE sin `taskset` ni `flock` en la lista: vuelven a pasar (A lo detecta)', dec(m6, 'Bash', 'taskset 1 firebase deploy') === 'pasa' && dec(m6, 'Bash', 'flock x firebase deploy') === 'pasa');
  const m8 = await mut([['while (hasta < ps.length - 1 &&', 'while (false &&']]);
  check('G8) SABOTAJE sin la extensión tras opciones/duraciones: `timeout -s ABRT 5 firebase deploy` y `timeout 1.5 firebase deploy` pasan (B lo detecta)', dec(m8, 'Bash', 'timeout -s ABRT 5 firebase deploy') === 'pasa' && dec(m8, 'Bash', 'timeout 1.5 firebase deploy') === 'pasa');
  const m7 = await mut([["'source', 'env',", "'env',"]]);
  check('G7) SABOTAJE sin `source` en la lista: `source firebase deploy` vuelve a pasar', dec(m7, 'Bash', 'source firebase deploy') === 'pasa');
}

if (base && base.limpiar) fs.rmSync(base.ruta, { force: true });
console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
