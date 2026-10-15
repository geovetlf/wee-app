/**
 * LA GUARDIA Y LOS ENVOLTORIOS DE ORDEN — `.claude/hooks/guardia.mjs` (Guardian · hallazgo H5, 2026-10-15).
 *
 *   node test/guardia-envoltorios.test.mjs
 *
 * El hallazgo H5: `desenvolver` quita los envoltorios (`.`, `exec`, `time`, `command`, `builtin`, `nohup`, `sudo`, `env`, `xargs`, `npx`…) y el
 * nombre que sigue pasa a ser «el programa»; pero `tocaSecreto` hacía `slice(1)` (los ARGUMENTOS, no el programa) y `escribeProtegido` miraba solo
 * `w.slice(1)`. Así `. <secreto>`, `exec <secreto>`, `time <secreto>`, `command <secreto>`, `nohup <secreto>`, `sudo <secreto>`, `env <secreto>`,
 * `xargs <secreto>`, `builtin <secreto>`, `& <secreto>` (PowerShell) y `. {<secreto>,x}` pasaban sin decisión. Y lo que `desenvolver` SALTABA (opciones y
 * valores de opción: `xargs -a <secreto>`, `time -o <ruta protegida>`) se perdía sin que nadie lo mirara.
 *
 * Mientras se investigaba apareció una causa hermana (H5b), en el mismo punto: `time` estaba en la lista de palabras clave, que solo quita `time`
 * y deja SU opción como «programa» (`time -p firebase deploy` pasaba entero, y también `time -p git push --force`), y los valores de opción de
 * `exec -a`, `sudo -u`, `doas -u`, `stdbuf -o`, `time -f/-o` y `ionice -c` se tomaban por el programa (`sudo -u root firebase deploy` pasaba).
 *
 *   A  los operandos protegidos tras cada envoltorio se DENIEGAN (secretos) o se PREGUNTAN (rutas protegidas), en Bash y en PowerShell.
 *   B  variantes: opciones, espacios y tabuladores, encadenado, subshell, grupo, sustituciones, anidados, formas equivalentes, llaves, rutas, comodines.
 *   C  H5b: el programa real tras `time -p`, `exec -a`, `sudo -u`… se decide como si no hubiera envoltorio.
 *   D  lo legítimo NO cambia (`time npm test`, `command -v node`, `exec node script.js`, `nohup node a.js`…): igual que la guardia anterior.
 *   E  la guardia REAL, como hook (stdin → salida), decide igual.
 *   F  CONSERVACIÓN frente a la guardia anterior (07f2eb67): ninguna decisión es menos estricta, salvo la familia `time -p` explicada abajo.
 *   G  sabotajes: con cada pieza de la corrección quitada, las pruebas de A–C fallan.
 *
 * Lo que NO se prueba (queda como límite documentado): ver el informe de H5.
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
/* GUARDIA_ENVOLTORIOS_RUTA permite apuntar la suite a otra copia de la guardia (la anterior, para ver que A–C FALLAN; una estropeada, para G). */
const RUTA = process.env.GUARDIA_ENVOLTORIOS_RUTA || path.join(RAIZ, REL);
const g = await import(pathToFileURL(RUTA).href);
const dec = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return `ERROR ${e.message}`; } };
/* Los nombres de secretos y de rutas protegidas se arman aquí para que ESTA suite no contenga el nombre completo en una orden que la guardia lea. */
const E = ['.en', 'v'].join('');             // `.env`
const L = ['.env', '.local'].join('');       // `.env.local`
const P = ['.env', '.prod'].join('');
const CRED = ['gha-', 'creds-x.json'].join('');
const CL = ['.cla', 'ude'].join('');         // `.claude`
const SETTINGS = `${CL}/settings.json`;
const BS = '\\';

/* Los envoltorios que `desenvolver` quita, con su forma de uso. `.` = `source` en bash y dot-sourcing en PowerShell. */
const ENVOLTORIOS = ['.', 'exec', 'time', 'command', 'builtin', 'nohup', 'nice', 'timeout 5', 'stdbuf -o0', 'setsid', 'ionice', 'chrt 1', 'noglob', 'call',
  'sudo', 'doas', 'env', 'xargs', 'npx', 'then', 'do', '!'];
const OPERANDOS = [L, `{${L},x}`, `./${L}`, `functions/${L}`, '.e*', '.e{n,}v*', `{${E},x}*`, P, CRED, `{x,${CRED}}`];

console.log('\n── A · El operando protegido tras un envoltorio se deniega (Bash) ──');
for (const w of ENVOLTORIOS) for (const o of OPERANDOS) {
  const c = `${w} ${o}`;
  check(`deniega: ${c}`, dec(g, 'Bash', c) === 'deny', dec(g, 'Bash', c));
}
for (const c of [`source ${L}`, `source {${L},x}`, `builtin source ${L}`, `\\command ${L}`, `'command' ${L}`, `"exec" ${L}`]) {
  check(`deniega (forma equivalente): ${c}`, dec(g, 'Bash', c) === 'deny', dec(g, 'Bash', c));
}

console.log('\n── B · Variantes ──');
const VARIANTES = [
  /* con opciones del envoltorio */
  `command -p ${L}`, `command -v ${L}`, `command -V ${L}`, `command -- ${L}`, `exec -- ${L}`, `exec -c ${L}`, `exec -l ${L}`, `exec -a nombre ${L}`, `exec -c -a nombre ${L}`,
  `time -p ${L}`, `time -f '%e' ${L}`, `time -o /tmp/t ${L}`, `time --format=%e ${L}`, `time --output /tmp/t ${L}`, `/usr/bin/time ${L}`, `/usr/bin/time -v ${L}`, `/usr/bin/time -p ${L}`,
  `builtin -- ${L}`, `nohup -- ${L}`, `nice -n 5 ${L}`, `nice -n -5 ${L}`, `timeout -s KILL 5 ${L}`, `timeout -k 5 10 ${L}`, `timeout --foreground 5 ${L}`,
  `sudo -E ${L}`, `sudo -u root ${L}`, `sudo -u root -g wheel ${L}`, `sudo --user=root ${L}`, `sudo --user root ${L}`, `doas -u root ${L}`, `env -i ${L}`, `env -u X ${L}`, `env X=1 ${L}`,
  `stdbuf -oL ${L}`, `stdbuf -o L ${L}`, `ionice -c 2 ${L}`, `ionice -c2 -n 4 ${L}`, `setsid -f ${L}`,
  /* lo que el envoltorio SALTA y se perdía: el valor de una opción es el secreto */
  `xargs -a ${L} cat`, `xargs --arg-file=${L} echo`, `xargs -a ${L}`, `env -C ${L} true`, `sudo -u ${L} true`, `exec -a ${L} true`, `time -o ${L} true`, `time -f ${L} true`,
  /* asignaciones iniciales delante del envoltorio y órdenes que se quedan sin programa (el valor de la ASIGNACIÓN no se lee como argumento: brecha documentada en guardia-rodeos) */
  `FOO=1 ${L}`, `FOO=1 BAR=2 . ${L}`, `FOO=1 xargs -a ${L} echo`, `time -o ${L}`, `exec -a ${L}`,
  /* espacios y tabuladores */
  `.    ${L}`, `.\t${L}`, `exec\t\t${L}`, `time   -p   ${L}`, `command\t-p\t${L}`, ` . ${L}`, `. \t ${L}`,
  /* encadenado, subshell, grupo, sustituciones */
  `echo a; . ${L}`, `true && exec ${L}`, `false || time ${L}`, `echo a | command ${L}`, `echo a & . ${L}`, `(. ${L})`, `( time ${L} )`, `{ . ${L}; }`, `{ command ${L}; }`,
  `echo $(. ${L})`, `echo $(exec ${L})`, 'echo `. ' + L + '`', `echo "$(time ${L})"`, `cat <(. ${L})`, `if true; then . ${L}; fi`, `for x in a; do command ${L}; done`,
  `bash -c '. ${L}'`, `sh -c "exec ${L}"`, `eval ". ${L}"`, `eval 'time ${L}'`, `bash -c 'time exec command . ${L}'`, `xargs -I{} . ${L}`,
  /* anidados */
  `time exec command . ${L}`, `exec time ${L}`, `command exec ${L}`, `exec command ${L}`, `time command . ${L}`, `sudo time exec ${L}`, `nohup time -p exec -a x command -p -- . ${L}`,
  `builtin command . ${L}`, `env time ${L}`, `nice time ${L}`, `time time ${L}`, `. . ${L}`, `exec exec ${L}`, `command command ${L}`,
  /* llaves, rutas, comodines */
  `. {${L},x}`, `. {x,${L}}`, `. .e{n,}v*`, `. .e*`, `. ./{${L},x}`, `. functions/${L}`, `. ./functions/${L}`, `. ../${L}`, `. /abs/ruta/${L}`, `. .env.l*`, `. .en?.local`, `. {.,x}env.local`,
  `exec {${L},x}`, `time {${L},x}*`, `command .e{n,}v*`, `command ./${L}`, `. ${P}`, `exec ${P}`, `time ${CRED}`, `command {${CRED},x}`, `. gha-{creds-x.json,y}`,
  `. application_default_credentials.json`, `exec service-account.json`, `time legacy_credentials/x`, `. functions/service-account-x.json`, `command wee-claves-retiradas`,
  /* varios operandos */
  `. ${L} x`, `. x ${L}`, `exec ${L} ${P}`,
];
for (const c of VARIANTES) check(`Bash deniega: ${c.replace(/\t/g, '\\t')}`, dec(g, 'Bash', c) === 'deny', dec(g, 'Bash', c));

console.log('\n── B2 · PowerShell ──');
const PS = [
  `. ${BS}${L}`, `. .${BS}${L}`, `. ./${L}`, `. '${L}'`, `. "${L}"`, `& ${BS}${L}`, `& .${BS}${L}`, `&.${BS}${L}`, `& "${L}"`, `& '.${BS}${L}'`, `& {${L},x}`, `. {${L},x}`, '. .e*', '& .e*', '& .e{n,}v*',
  `iex ${L}`, `Invoke-Expression ${L}`, `iex "${L}"`, `Start-Process ${L}`, `Start-Process -FilePath ${L}`, `saps ${L}`, `call ${L}`, `cmd /c ${L}`, `cmd.exe /c "${L}"`,
  `time ${L}`, `command ${L}`, `exec ${L}`, `Measure-Command { . ${L} }`, `Measure-Command { & ${L} }`, `& { . ${L} }`, `Invoke-Command -ScriptBlock { . ${L} }`,
  `$x = . ${L}`, `echo a; . .${BS}${L}`, `echo a | & ${L}`, `if ($true) { . ${L} }`, `Get-Content ${L}`, `. .${BS}functions${BS}${L}`, `. ${BS}${P}`, `& .${BS}${CRED}`,
];
for (const c of PS) check(`PowerShell deniega: ${c}`, dec(g, 'PowerShell', c) === 'deny', dec(g, 'PowerShell', c));

console.log('\n── B3 · Rutas protegidas tras un envoltorio: pregunta (o deniega), nunca pasa ──');
const PROT = [
  `/usr/bin/time -o ${SETTINGS} true`, `time -o ${SETTINGS} true`, `time --output=${SETTINGS} true`, `time --output ${SETTINGS} true`, `command time -o ${SETTINGS} true`,
  `xargs -a x touch ${SETTINGS}`, `nohup ${CL}/hooks/guardia.mjs`, `exec ${CL}/hooks/guardia.mjs`, `sudo ${CL}/hooks/guardia.mjs`,
  `sudo -u root rm ${SETTINGS}`, `exec -a x rm ${SETTINGS}`, `time rm ${SETTINGS}`, `time -p cp x ${SETTINGS}`, `command cp x ${SETTINGS}`, `exec tee ${SETTINGS}`,
  `time -o {${CL},x}/settings.json true`, `time -o .cl{a,}ude/settings.json true`,
];
for (const c of PROT) { const d = dec(g, 'Bash', c); check(`Bash no pasa en silencio: ${c}`, d === 'ask' || d === 'deny', d); }
check('`exec > ruta protegida` (redirección) sigue preguntando', ['ask', 'deny'].includes(dec(g, 'Bash', `exec > ${SETTINGS}`)));

console.log('\n── C · H5b: el programa REAL tras `time -p`, `exec -a`, `sudo -u`… se decide como si no hubiera envoltorio ──');
const REALES = [
  ['deny', 'firebase deploy'], ['deny', 'git push --force origin main'], ['ask', 'git commit -m x'], ['deny', 'gh auth token'], ['deny', 'gcloud functions delete x'], ['ask', 'git push origin main'],
];
const ENV_OPC = ['time -p', 'time -f %e', 'time -o /tmp/t', 'time --format=%e', 'time --output /tmp/t', '/usr/bin/time -p', '/usr/bin/time -f %e', 'exec -a x', 'exec -c -a x', 'sudo -u root', 'sudo -g wheel',
  'sudo -E -u root', 'sudo --user root', 'doas -u root', 'stdbuf -o L', 'stdbuf -i L -o L', 'ionice -c idle', 'ionice -c 2 -n 4', 'time -p exec -a x', 'sudo -u root time -p', 'time', 'exec', 'command', 'nohup'];
for (const w of ENV_OPC) for (const [esperado, c] of REALES) {
  const cmd = `${w} ${c}`; const d = dec(g, 'Bash', cmd);
  check(`${esperado}: ${cmd}`, d === esperado, d);
}
for (const [esperado, c] of [['deny', `time -p . ${L}`], ['pasa', 'time -p npm test'], ['pasa', 'sudo -u root ls'], ['pasa', 'exec -a x node script.js']]) {
  check(`${esperado}: ${c}`, dec(g, 'Bash', c) === esperado, dec(g, 'Bash', c));
}

console.log('\n── D · Lo legítimo con envoltorios NO cambia (decide igual que la guardia anterior, y pasa) ──');
const base = (() => {
  if (process.env.GUARDIA_ENVOLTORIOS_BASE) return { ruta: process.env.GUARDIA_ENVOLTORIOS_BASE, limpiar: false };
  const r = spawnSync('git', ['-C', RAIZ, 'show', `07f2eb67:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) return null;
  const f = path.join(os.tmpdir(), `_guardia-base-h5-${process.pid}.mjs`);
  fs.writeFileSync(f, r.stdout);
  return { ruta: f, limpiar: true };
})();
const b = base ? await import(`${pathToFileURL(base.ruta).href}?${Date.now()}`) : null;
const LEGITIMOS = [
  'time npm test', 'time -p npm test', 'time node script.js', 'time -f %e npm run build', '/usr/bin/time -v node a.js', 'command -v node', 'command -v firebase', 'command -p ls', 'exec node script.js',
  'exec 3>&1', 'nohup node a.js', 'nice -n 5 npm test', 'timeout 30 npm test', 'timeout -s KILL 5 node a.js', 'stdbuf -oL node a.js', 'sudo -u root ls', 'sudo -E node a.js', 'env NODE_ENV=test node a.js',
  'env -i PATH=/usr/bin node a.js', 'xargs echo', 'echo a b | xargs -n 1 echo', 'xargs -I{} echo {}', 'npx tsc --noEmit', 'builtin cd src', 'builtin echo hola', 'command ls -la', '. ./scripts/no-existe.sh',
  'source ./scripts/no-existe.sh', 'FOO=1 node a.js', 'time git status', 'time git log --oneline', 'time -p git diff', 'exec git status', 'sudo -u root git status', 'time grep -rn "token" docs',
  'time cat README.md', 'time ls functions', 'time -p ls -la', 'exec -a x ls', 'ionice -c 2 ls', 'then echo x', 'time echo hola', '. /etc/profile', 'exec ls | wc -l', 'command -v git && echo ok',
];
for (const c of LEGITIMOS) {
  const ahora = dec(g, 'Bash', c); const antes = b ? dec(b, 'Bash', c) : 'pasa';
  check(`pasa y no cambia: ${c}`, ahora === 'pasa' && ahora === antes, `ahora ${ahora}, antes ${antes}`);
}
for (const c of ['time npm test', 'command -v node', 'exec node script.js', '. ./scripts/no-existe.ps1']) {
  check(`PowerShell no cambia: ${c}`, dec(g, 'PowerShell', c) === (b ? dec(b, 'PowerShell', c) : 'pasa'), `${dec(g, 'PowerShell', c)} / ${b ? dec(b, 'PowerShell', c) : '-'}`);
}

console.log('\n── E · La guardia REAL, como hook ──');
const hook = (c, h = 'Bash') => spawnSync(process.execPath, [RUTA], { input: JSON.stringify({ tool_name: h, tool_input: { command: c }, cwd: RAIZ }), encoding: 'utf8' });
const bloquea = (r) => r.status !== 0 || /"permissionDecision":"(deny|ask)"/.test(r.stdout);
for (const c of [`. ${L}`, `exec ${L}`, `time ${L}`, `command ${L}`, `. {${L},x}`, `time -p firebase deploy`, `sudo -u root git push --force origin main`, `/usr/bin/time -o ${SETTINGS} true`]) {
  const r = hook(c);
  check(`E) el hook bloquea: ${c}`, bloquea(r), `salida ${r.status} ${r.stdout.slice(0, 90)}`);
}
check(`E) el hook bloquea en PowerShell: . .${BS}${L}`, bloquea(hook(`. .${BS}${L}`, 'PowerShell')));
for (const c of ['time npm test', 'command -v node', 'exec node script.js', 'time -p ls']) {
  const r = hook(c);
  check(`E) el hook deja pasar: ${c}`, r.status === 0 && !bloquea(r), `salida ${r.status} ${r.stdout.slice(0, 90)}`);
}

console.log('\n── F · Conservación frente a la guardia anterior (07f2eb67) ──');
if (!b) {
  console.log('(la guardia anterior no está disponible en este clon: la comparación F se omite)');
} else {
  const rank = { pasa: 0, ask: 1, deny: 2 };
  const corpus = new Set([...OPERANDOS, ...VARIANTES, ...PS, ...PROT, ...LEGITIMOS, ...REALES.map((x) => x[1]), 'node script.js', 'npm test', 'ls', 'git status', 'git commit -m x', 'firebase deploy']);
  /* El corpus de las suites hermanas de la guardia: sus rodeos (JSON) y las cadenas literales de sus pruebas (las plantillas con nombres de secreto se resuelven). */
  const consts = { L, E, P, CRED, CL };
  const walk = (o) => { if (typeof o === 'string') corpus.add(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  try { walk(JSON.parse(fs.readFileSync(path.join(aqui, 'guardia-rodeos.casos.json'), 'utf8'))); } catch { /* sin corpus de rodeos */ }
  const RE = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g;
  for (const f of ['guardia-llaves', 'guardia-referencias-git', 'guardia-claude', 'guardia-vigente', 'guardian-hooks', 'guardian-aserciones', 'guardian-contencion', 'harness-guardian', 'guardian-autocorreccion']) {
    const ruta = path.join(aqui, `${f}.test.mjs`);
    if (!fs.existsSync(ruta)) continue;
    for (const m of fs.readFileSync(ruta, 'utf8').matchAll(RE)) {
      let s = m[1] ?? m[2] ?? m[3];
      if (s == null) continue;
      s = s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
      if (m[3] !== undefined) { let ok = true; s = s.replace(/\$\{(\w+)\}/g, (_, k) => { if (consts[k]) return consts[k]; ok = false; return ''; }); if (!ok) continue; }
      if (s.length >= 2 && s.length <= 500) corpus.add(s);
    }
  }
  const PRE = ['', 'time ', 'command ', 'exec ', '. ', 'time exec command . ', 'exec time ', 'builtin ', 'sudo ', 'nohup ', 'env ', 'nice ', 'timeout 5 ', 'command -p ', 'time -p ', '/usr/bin/time ', 'source ', 'xargs ', '& '];
  const peores = []; const familiaTime = []; let n = 0; let masEstricto = 0;
  for (const h of ['Bash', 'PowerShell']) for (const c of corpus) for (const pre of PRE) {
    const cmd = pre + c; n++;
    const antes = dec(b, h, cmd); const ahora = dec(g, h, cmd);
    if ((rank[ahora] ?? 3) > (rank[antes] ?? 3)) masEstricto++;
    if ((rank[ahora] ?? 3) < (rank[antes] ?? 3)) {
      /* La ÚNICA familia menos estricta admitida: `time -p <orden>`. Antes `-p` era «el programa» y la orden real se leía como sus argumentos (sin la exención
         de patrones de un buscador ni de listados de git); ahora `time -p X` decide exactamente como `X`, y `X` pasa en las DOS guardias. */
      if (pre === 'time -p ' && dec(g, h, c) === ahora && dec(b, h, c) === ahora) familiaTime.push(`${h}: ${cmd}: ${antes}→${ahora}`);
      else peores.push(`${h}: ${cmd}: ${antes}→${ahora}`);
    }
  }
  check(`F1) ${n} evaluaciones: NINGUNA decisión es menos estricta que la de la guardia anterior (salvo la familia explicada en F2)`, peores.length === 0, peores.slice(0, 5).join(' | '));
  check('F2) la familia `time -p <orden>` menos estricta decide EXACTAMENTE como la orden sin envoltorio, y esa pasa también en la guardia anterior', true, `${familiaTime.length} casos (todos \`time -p\`; la orden sin él pasa en las dos)`);
  check('F3) la corrección endurece: hay decisiones más estrictas que antes', masEstricto > 100, `${masEstricto}`);
  const eran = [`. ${L}`, `exec ${L}`, `time ${L}`, `command ${L}`, `. {${L},x}`, 'time -p firebase deploy', 'sudo -u root firebase deploy'].filter((c) => dec(b, 'Bash', c) === 'pasa' && dec(g, 'Bash', c) !== 'pasa');
  check('F4) los casos del hallazgo pasaban antes y ya no', eran.length === 7, eran.join(' | '));
  if (base.limpiar) fs.rmSync(base.ruta, { force: true });
}

{
  console.log('\n── G · Sabotajes de la corrección ──');
  const texto = fs.readFileSync(RUTA, 'utf8');
  const mutantes = async (pares) => {
    let x = texto;
    for (const [a, bb] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 60)}`); x = x.split(a).join(bb); }
    const f = path.join(os.tmpdir(), `_guardia-sab-h5-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, x);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const SIN_PROGRAMA = ['const utiles = [...quitadas, ...(conPrograma ? sinPatron(p, w) : sinPatron(p, w).slice(1))];', 'const utiles = [...quitadas, ...sinPatron(p, w).slice(1)];'];
  const SIN_QUITADAS = ['const utiles = [...quitadas, ...(conPrograma ?', 'const utiles = [...(conPrograma ?'];
  const SIN_TODO = ['const utiles = [...quitadas, ...(conPrograma ? sinPatron(p, w) : sinPatron(p, w).slice(1))];', 'const utiles = sinPatron(p, w).slice(1);'];
  const TIME_CLAVE = ["if (p !== 'time' && (PALABRA_CLAVE.has(w[0]) || PALABRA_CLAVE.has(p)))", 'if (PALABRA_CLAVE.has(w[0]) || PALABRA_CLAVE.has(p))'];
  const SIN_VALORES = ['if (w.length && (OPC_CON_VALOR_ENVOLTORIO[p] || []).includes(opc)) quita(1);', ''];
  const SIN_VACIA = ['const quitado = tocaSecreto(\'\', [], quitadas);', 'const quitado = null;'];
  const SIN_PROT = ['if (delEnvoltorio.some(protegida)) return true;', ''];
  const SIN_PS = ["const secreto = tocaSecreto(p, w, quitadas, herramienta === 'PowerShell');", 'const secreto = tocaSecreto(p, w, quitadas);'];
  const SIN_QUITA = ['const quita = (n) => { quitadas.push(...w.slice(0, n)); w = w.slice(n); };', 'const quita = (n) => { w = w.slice(n); };'];
  const sinP = await mutantes([SIN_PROGRAMA]);
  check('G1) SABOTAJE sin comprobar la palabra del programa: `. <secreto>`, `exec`, `time`, `command`, `sudo`… vuelven a pasar (A lo detecta)',
    ['.', 'exec', 'time', 'command', 'sudo', 'nohup', 'env'].every((w) => dec(sinP, 'Bash', `${w} ${L}`) === 'pasa'));
  check('G1b) …y `. {<secreto>,x}` y `. .e*` también', dec(sinP, 'Bash', `. {${L},x}`) === 'pasa' && dec(sinP, 'Bash', '. .e*') === 'pasa');
  const sinQ = await mutantes([SIN_QUITADAS]);
  check('G2) SABOTAJE sin comprobar lo QUITADO: `xargs -a <secreto> cat` y `exec -a <secreto> true` vuelven a pasar (B lo detecta)',
    dec(sinQ, 'Bash', `xargs -a ${L} cat`) === 'pasa' && dec(sinQ, 'Bash', `time -o ${L} true`) === 'pasa');
  check('G2b) …pero con la palabra del programa aún comprobada, `. <secreto>` sigue denegándose (defensa en profundidad: dos comprobaciones distintas)', dec(sinQ, 'Bash', `. ${L}`) === 'deny');
  const sinT = await mutantes([SIN_TODO]);
  check('G3) SABOTAJE a la guardia anterior (`slice(1)` y sin quitadas): vuelven a pasar `. <secreto>` y `xargs -a <secreto> cat`', dec(sinT, 'Bash', `. ${L}`) === 'pasa' && dec(sinT, 'Bash', `xargs -a ${L} cat`) === 'pasa');
  /* H6: la corrección de los envoltorios no modelados prueba también el punto de arranque que sigue a una opción (`sudo -u root firebase deploy` se lee
     como `firebase deploy`), y eso cubre por otro camino el valor de opción que G5 mide. Este sabotaje apaga además esa pieza para seguir midiendo SOLO
     la tabla de H5. En una rama sin H6 no hay nada que apagar. */
  const H6_LLAMADA = 'const r3 = porEnvoltorios(';
  const SIN_H6 = texto.includes(H6_LLAMADA) ? [[H6_LLAMADA, 'const r3 = (() => PASA)(']] : [];
  const mt = await mutantes([TIME_CLAVE]);
  check('G4) SABOTAJE con `time` otra vez como palabra clave suelta: `time -p firebase deploy` y `time -p git push --force origin main` vuelven a pasar (C lo detecta)',
    dec(mt, 'Bash', 'time -p firebase deploy') === 'pasa' && dec(mt, 'Bash', 'time -p git push --force origin main') === 'pasa');
  const mv = await mutantes([SIN_VALORES, ...SIN_H6]);
  check('G5) SABOTAJE sin saltar los valores de opción: `sudo -u root firebase deploy` y `exec -a x firebase deploy` vuelven a pasar (C lo detecta)',
    dec(mv, 'Bash', 'sudo -u root firebase deploy') === 'pasa' && dec(mv, 'Bash', 'exec -a x firebase deploy') === 'pasa');
  const mvac = await mutantes([SIN_VACIA]);
  check('G6) SABOTAJE sin mirar lo quitado cuando no queda programa: `xargs -a <secreto>` y `time -o <secreto>` (sin orden) vuelven a pasar (B lo detecta)', dec(mvac, 'Bash', `xargs -a ${L}`) === 'pasa' && dec(mvac, 'Bash', `time -o ${L}`) === 'pasa' && dec(g, 'Bash', `xargs -a ${L}`) === 'deny');
  const mp = await mutantes([SIN_PROT]);
  check('G7) SABOTAJE sin la regla de rutas protegidas tras un envoltorio: `/usr/bin/time -o <ruta protegida> true` vuelve a pasar (B3 lo detecta)', dec(mp, 'Bash', `/usr/bin/time -o ${SETTINGS} true`) === 'pasa');
  const mps = await mutantes([SIN_PS]);
  check('G8) SABOTAJE sin el comodín del programa en PowerShell: `& .e*` vuelve a pasar (B2 lo detecta)', dec(mps, 'PowerShell', '& .e*') === 'pasa' && dec(g, 'PowerShell', '& .e*') === 'deny');
  const mq = await mutantes([SIN_QUITA]);
  check('G9) SABOTAJE sin registrar lo que se quita: `xargs -a <secreto> cat` y `time -o <ruta protegida> true` vuelven a pasar', dec(mq, 'Bash', `xargs -a ${L} cat`) === 'pasa' && dec(mq, 'Bash', `/usr/bin/time -o ${SETTINGS} true`) === 'pasa');
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
