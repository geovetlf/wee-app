/**
 * LA GUARDIA NO SE CUELGA — `.claude/hooks/guardia.mjs` (Guardian · hallazgo H7, 2026-10-15).
 *
 *   node test/guardia-cmd-colgado.test.mjs
 *
 * El hallazgo: la rama `cmd` de `analizar`/`desenvolver` buscaba `/c` o `/k` con `findIndex`; sin ellos devolvía -1 y el «interior» pasaba a ser la
 * orden ENTERA (`slice(0)`): `cmd ${X}`, `cmd {a,b}`, `cmd mkdir -p src/{a,b}`, `cmd echo a{b}c`, `cmd echo {a..z}{1..9}` se reanalizaban a sí mismas
 * hasta LIM_PROF=30. Con el modo legado de H4 (un segundo troceado cuando aparece `{`) cada nivel costaba ×≈1,94: el hook no terminaba dentro del
 * plazo de 10 s de settings.json y Claude Code, ante un timeout, CONTINÚA con la llamada (el hook fallaba ABIERTO).
 *
 *   A  las órdenes del hallazgo terminan al instante y deciden como la guardia anterior (49704840); con un secreto detrás, DENIEGAN.
 *   B  auditoría: ningún envoltorio de la lista, con llaves y sin `-c`/`/c`, se cuelga (cada caso en su propio proceso con vigilante).
 *   C  entradas patológicas (llaves anidadas, `cmd` anidado, envoltorios apilados) terminan acotadas y, con un secreto, deniegan.
 *   D  el PRESUPUESTO: al agotarse devuelve una decisión segura (deny cerrado, «análisis demasiado complejo») y nunca permite; las variables de
 *      entorno solo pueden BAJARLO.
 *   E  el HOOK REAL como proceso por stdin: decisión, tiempo muy por debajo del plazo y fail-closed.
 *   F  CONSERVACIÓN: ninguna decisión es menos estricta que la de la guardia anterior (49704840) en las familias del hallazgo.
 *   G  sabotajes: sin la corrección de `cmd`, sin el presupuesto, o con un presupuesto que PERMITE al agotarse, la suite falla.
 *
 * Todo análisis corre en un proceso hijo con tiempo máximo propio: la suite nunca se cuelga aunque la guardia sí lo hiciera. Los tiempos medidos se
 * imprimen (ms de análisis dentro del proceso y ms de pared incluyendo el arranque de node).
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
/* GUARDIA_CMD_COLGADO_RUTA apunta la suite a otra copia de la guardia (la anterior, para ver que A–E FALLAN). */
const RUTA = process.env.GUARDIA_CMD_COLGADO_RUTA || path.join(RAIZ, REL);
const L = ['.env', '.local'].join('');
const sec = (c) => c.replace(/<S>/g, L);
const TOPE_HIJO = 90_000;   // el vigilante de cada análisis (ms de pared): por encima de esto el caso cuenta como COLGADO (los reales tardan horas)
const COTA_ANALISIS = 1000; // cota de TIEMPO DE CPU del análisis dentro del hijo (ms): las órdenes del hallazgo tardan unos pocos ms. Se mide CPU y no pared para que la carga de la máquina (la cadena corre suites en paralelo) no produzca falsos fallos
const COTA_PATOLOGICO = 4000; // las patológicas deben terminar con ≤ 4 s de CPU (el presupuesto de la guardia es 3 s de pared)
const PLAZO_HOOK = 10_000;  // settings.json

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guardia-cmd-colgado-'));
const AYUDA = path.join(tmp, 'analiza.mjs');
fs.writeFileSync(AYUDA, `
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
const [ruta, h] = process.argv.slice(2);
const c = fs.readFileSync(0, 'utf8');
const m = await import(pathToFileURL(ruta).href);
const t = performance.now(); const c0 = process.cpuUsage();
let r; try { r = m.analizarTexto(h, c); } catch (e) { r = { decision: 'ERROR ' + e.message }; }
process.stdout.write(JSON.stringify({ d: r.decision || 'pasa', cerrado: !!r.cerrado, motivo: r.motivo || '', ms: performance.now() - t, cpu: (() => { const u = process.cpuUsage(c0); return (u.user + u.system) / 1000; })() }));
`);

/** Analiza `cmd` con la guardia `ruta` en un proceso aparte con vigilante. Devuelve { d, ms, pared, colgado, cerrado, motivo }. */
const analiza = (ruta, h, cmd, env = {}, tope = TOPE_HIJO, reintenta = true) => {
  let r = analiza1(ruta, h, cmd, env, tope);
  /* Con la máquina saturada un proceso hijo puede tardar decenas de segundos en arrancar: un «colgado» se repite una vez antes de darlo por bueno (un cuelgue real es indefinido y se repite). */
  if (r.colgado && reintenta) r = analiza1(ruta, h, cmd, env, tope);
  /* El presupuesto de TIEMPO de la guardia (3 s de pared) puede agotarse por pura carga de la máquina (la cadena corre suites en paralelo): la guardia falla
     cerrado, correctamente, pero un comando normal que «deniega por complejo» una vez y pasa al repetir NO es una regresión. El de PASOS es determinista: si
     fuera el culpable se repetiría en los 3 intentos y el caso fallaría. Solo se reintenta cuando la prueba no fija ella misma el presupuesto. */
  for (let k = 0; k < 2 && !env.GUARDIA_PRESUPUESTO_PASOS && !env.GUARDIA_PRESUPUESTO_MS && r.d === 'deny' && /demasiado complejo/.test(r.motivo); k++) r = analiza1(ruta, h, cmd, env, tope);
  return r;
};
const analiza1 = (ruta, h, cmd, env = {}, tope = TOPE_HIJO) => {
  const t = Date.now();
  const r = spawnSync(process.execPath, [AYUDA, ruta, h], { input: sec(cmd), encoding: 'utf8', timeout: tope, env: { ...process.env, GEMINI_API_KEY: '', ...env }, maxBuffer: 1 << 24 });
  const pared = Date.now() - t;
  if (r.error || r.status !== 0 || !r.stdout) return { d: 'COLGADO', ms: Infinity, pared, colgado: true, cerrado: false, motivo: String((r.error && r.error.code) || r.stderr || '').slice(0, 80) };
  const o = JSON.parse(r.stdout);
  return { ...o, reloj: o.ms, ms: o.cpu, pared, colgado: false };
};
const rank = { pasa: 0, ask: 1, deny: 2 };
const rk = (d) => (rank[d] ?? 3); // COLGADO/ERROR = 3: peor que cualquier decisión (es un fallo)
const registra = (n, r) => console.log(`   · ${n}: ${r.colgado ? 'COLGADO (' + r.pared + ' ms)' : `${r.d} cpu=${Math.round(r.ms)} ms (reloj ${Math.round(r.reloj)}) pared=${r.pared} ms`}`);

/* La guardia anterior (49704840) para la conservación. */
const git = (args) => spawnSync('git', ['-C', RAIZ, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
const base = (() => {
  if (process.env.GUARDIA_CMD_COLGADO_BASE) return process.env.GUARDIA_CMD_COLGADO_BASE;
  const r = git(['show', `49704840:${REL}`]);
  if (r.status !== 0) return null;
  const f = path.join(tmp, 'guardia-49704840.mjs');
  fs.writeFileSync(f, r.stdout);
  return f;
})();
check('0) la guardia anterior (49704840) está disponible para comparar', !!base);

/* ── A · Las órdenes del hallazgo ───────────────────────────────────────────── */
console.log('\n── A · Las órdenes del hallazgo terminan al instante ──');
const HALLAZGO = ['cmd ${X}', 'cmd {a,b}', 'cmd mkdir -p src/{a,b}', 'cmd echo a{b}c', 'cmd echo {a..z}{1..9}'];
for (const c of HALLAZGO) for (const h of ['Bash', 'PowerShell']) {
  const r = analiza(RUTA, h, c);
  registra(`${h} ${c}`, r);
  check(`A) ${h} \`${c}\` termina (sin colgarse), decide «pasa» y tarda < ${COTA_ANALISIS} ms`, !r.colgado && r.d === 'pasa' && r.ms < COTA_ANALISIS);
}
for (const h of ['Bash', 'PowerShell']) {
  const r = analiza(RUTA, h, 'cmd ${X} ; cat <S>');
  registra(`${h} cmd \${X} ; cat <secreto>`, r);
  check(`A) ${h} \`cmd \${X} ; cat <secreto>\` se DENIEGA y de forma rápida (< ${COTA_ANALISIS} ms)`, !r.colgado && r.d === 'deny' && r.ms < COTA_ANALISIS);
  const r2 = analiza(RUTA, h, 'cmd {a,b} ; cat <S>');
  check(`A) ${h} \`cmd {a,b} ; cat <secreto>\` se DENIEGA rápido`, !r2.colgado && r2.d === 'deny' && r2.ms < COTA_ANALISIS);
}
{
  /* Con `cmd` sin `/c` la decisión no es MENOS estricta que la de la guardia anterior (que no leía los argumentos: `pasa`; la pila H4–H6 sí). */
  for (const c of ['cmd deploy {a}', 'cmd firebase deploy', 'cmd ${X} deploy', 'cmd', 'cmd /?  deploy', 'cmd "git push --force"']) {
    const a = analiza(RUTA, 'Bash', c); const b = base ? analiza(base, 'Bash', c) : null;
    check(`A) \`${c}\` no es menos estricta que 49704840 (${b && b.d}) y tarda < ${COTA_ANALISIS} ms`, !a.colgado && b && rk(a.d) >= rk(b.d) && a.ms < COTA_ANALISIS, `${a.d}`);
  }
  /* `cmd /c` sigue analizando el interior. */
  for (const [c, esperado] of [['cmd firebase deploy', 'deny'], ['cmd "git push --force"', 'deny'], ['cmd /c cat <S>', 'deny'], ['cmd /c firebase deploy', 'deny'], ['cmd.exe /k cat <S>', 'deny'], ['cmd /c echo hola', 'pasa']]) {
    const a = analiza(RUTA, 'Bash', c);
    check(`A) \`${c}\` → ${esperado} (el interior de /c se sigue analizando)`, !a.colgado && a.d === esperado, a.d);
  }
}

/* ── B · Auditoría de los demás envoltorios ───────────────────────────────── */
console.log('\n── B · Ningún envoltorio con llaves y sin -c/`/c` se cuelga ──');
{
  const texto = fs.readFileSync(RUTA, 'utf8');
  const nom = new Set(['cmd', 'cmd.exe', 'powershell', 'pwsh', 'bash', 'sh', 'zsh', 'dash', 'ksh', 'wsl', 'eval', 'xargs', 'env', 'sudo', 'time', 'nice', 'timeout', 'find', 'node', 'python3', 'iex', 'invoke-expression', 'start-process']);
  for (const m of texto.matchAll(/(?:const ENVOLTORIOS = new Set\(\[|const ENVOLTORIOS_H6 = new Set\(\[\.\.\.ENVOLTORIOS,)([^\]]*)\]/gs)) for (const x of m[1].matchAll(/'([^']+)'/g)) nom.add(x[1]);
  const plantillas = ['W ${X}', 'W {a,b}', 'W echo a{b}c', 'W -c ${X}', 'W /k ${X}', 'W ${X} ; cat <S>'];
  let n = 0, lentos = 0; const malos = []; let maxMs = 0;
  for (const w of nom) for (const p of plantillas) {
    const c = p.replace(/^W/, w); n++;
    const r = analiza(RUTA, 'Bash', c, {}, 60000);
    if (r.colgado) { lentos++; malos.push(`COLGADO ${c}`); continue; }
    maxMs = Math.max(maxMs, r.ms);
    if (r.ms > COTA_ANALISIS) { lentos++; malos.push(`${Math.round(r.ms)}ms ${c}`); }
    if (/; cat <S>$/.test(p) && r.d === 'pasa') { lentos++; malos.push(`PASA ${c}`); }
  }
  check(`B) ${n} casos (${nom.size} envoltorios × ${plantillas.length} plantillas): ninguno se cuelga, ninguno tarda > ${COTA_ANALISIS} ms y los que traen un secreto no pasan`, lentos === 0, `máx. ${Math.round(maxMs)} ms${malos.length ? ' · ' + malos.slice(0, 5).join(' | ') : ''}`);
}

/* ── C · Entradas patológicas ──────────────────────────────────────────────── */
console.log('\n── C · Entradas patológicas: acotadas y seguras ──');
{
  const anidadas = (n) => '{a,'.repeat(n) + 'b' + '}'.repeat(n);
  const casos = [
    ['llaves anidadas (25 niveles)', `echo ${anidadas(25)}`],
    ['llaves anidadas tras cmd', `cmd echo ${anidadas(25)}`],
    ['producto de rangos', 'echo {1..9}{1..9}{1..9}{1..9}{1..9}{1..9}'],
    ['cmd anidado 60 veces con llaves', 'cmd '.repeat(60) + '{a,b}'],
    ['cmd /c anidado 25 veces', 'cmd /c '.repeat(25) + 'echo {a,b}'],
    ['envoltorios apilados con llaves', 'sudo nice timeout 5 env taskset 1 flock x strace watch ssh h parallel ' + 'cmd '.repeat(10) + 'echo {a,b}'],
    ['bash -c anidado', "bash -c 'bash -c \"bash -c \\\"echo {a,b}\\\"\"'"],
    ['llaves entre llaves entre cmd', 'cmd {cmd,cmd} {cmd,cmd} {cmd,cmd} {cmd,cmd} {cmd,cmd} {cmd,cmd} {x}'],
  ];
  for (const [n, c] of casos) {
    const r = analiza(RUTA, 'Bash', c, {}, 60000);
    registra(n, r);
    check(`C) ${n}: termina en < ${COTA_PATOLOGICO} ms de CPU con una decisión válida`, !r.colgado && r.ms < COTA_PATOLOGICO && ['pasa', 'ask', 'deny'].includes(r.d));
    const s = analiza(RUTA, 'Bash', `${c} ; cat <S>`, {}, 60000);
    check(`C) ${n} + un secreto detrás: se DENIEGA (nunca pasa) y termina en < ${COTA_PATOLOGICO} ms`, !s.colgado && s.ms < COTA_PATOLOGICO && s.d === 'deny');
  }
}

/* ── D · El presupuesto ────────────────────────────────────────────────────── */
console.log('\n── D · El presupuesto de análisis ──');
{
  const normal = 'git status ; echo a | cat ; ls -la src';
  const sinPres = analiza(RUTA, 'Bash', normal);
  check('D) sin tocar el presupuesto, un comando normal pasa', sinPres.d === 'pasa');
  for (const c of [normal, 'echo hola', 'cat <S>', 'ls {a,b}']) {
    const r = analiza(RUTA, 'Bash', c, { GUARDIA_PRESUPUESTO_PASOS: '3' });
    const casiNada = c === 'echo hola' && r.d === 'pasa'; // 1 orden entra en 3 pasos: no se agota; el resto sí
    const secreto = c === 'cat <S>' && r.d === 'deny'; // el secreto se deniega antes de agotar nada: igualmente DENY
    check(`D) con un presupuesto de 3 pasos \`${sec(c)}\` agota y se DENIEGA cerrado con «análisis demasiado complejo» (jamás pasa)`, casiNada || secreto || (r.d === 'deny' && r.cerrado && /an[aá]lisis demasiado complejo/.test(r.motivo)), `${r.d} ${r.cerrado}`);
  }
  const heavy = 'echo ' + '{a,b}'.repeat(10) + ' ; echo {1..9}{1..9}{1..9}{1..9}';
  const tiempo = analiza(RUTA, 'Bash', heavy, { GUARDIA_PRESUPUESTO_MS: '1' });
  check('D) con un presupuesto de 1 ms de tiempo, una orden pesada agota por TIEMPO y se DENIEGA cerrado', tiempo.d === 'deny' && tiempo.cerrado && /demasiado complejo/.test(tiempo.motivo), `${tiempo.d} ${tiempo.cerrado} ${Math.round(tiempo.ms)} ms`);
  const pwsh = analiza(RUTA, 'PowerShell', "iex ([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('ZQBjAGgAbwA=')))", { GUARDIA_PRESUPUESTO_PASOS: '2' });
  check('D) PowerShell con presupuesto mínimo también se DENIEGA (nunca pasa por análisis incompleto)', pwsh.d === 'deny' && pwsh.cerrado, pwsh.d);
  const enc = Buffer.from('echo {a,b} ; echo {c,d}', 'utf16le').toString('base64');
  const tragado = analiza(RUTA, 'PowerShell', `powershell -enc ${enc}`, { GUARDIA_PRESUPUESTO_PASOS: '5' });
  check('D) el error del presupuesto que se traga un `catch` intermedio (la rama `-enc` de powershell) igualmente termina en DENY', tragado.d === 'deny' && tragado.cerrado, tragado.d);
  /* Las variables de entorno solo pueden BAJAR el presupuesto: con valores enormes el tope por defecto sigue mandando. */
  const alto = analiza(RUTA, 'Bash', 'cmd ${X} ; ' + 'cmd '.repeat(50) + '{a,b}', { GUARDIA_PRESUPUESTO_PASOS: '999999999', GUARDIA_PRESUPUESTO_MS: '99999999' }, 8000);
  check('D) subir el presupuesto por variable de entorno NO tiene efecto (el tope por defecto manda): termina con < 5 s de CPU', !alto.colgado && alto.ms < 5000);
  /* Un comando normal y largo (cientos de órdenes) cabe de sobra en el presupuesto. */
  const largo = Array.from({ length: 200 }, (_, i) => `echo ${i} | cat`).join(' ; ');
  const rl = analiza(RUTA, 'Bash', largo);
  check('D) un comando normal de 200 órdenes con tuberías NO agota el presupuesto', rl.d === 'pasa', `${rl.d} ${Math.round(rl.ms)} ms`);
}

/* ── E · El hook real ──────────────────────────────────────────────────────── */
console.log('\n── E · El hook real, como proceso por stdin ──');
{
  const hook = (c, h = 'Bash', env = {}) => { // el mejor de hasta 3 intentos (la carga de la máquina no es una regresión)
    let mejor = hook1(c, h, env);
    for (let k = 0; k < 2 && (mejor.colgado || mejor.ms >= PLAZO_HOOK / 2); k++) { const o = hook1(c, h, env); if (o.ms < mejor.ms) mejor = o; }
    return mejor;
  };
  const hook1 = (c, h = 'Bash', env = {}) => {
    const t = Date.now();
    const r = spawnSync(process.execPath, [RUTA], { input: JSON.stringify({ tool_name: h, tool_input: { command: sec(c) }, cwd: RAIZ }), encoding: 'utf8', timeout: TOPE_HIJO, env: { ...process.env, GEMINI_API_KEY: '', ...env } });
    let dec = null; try { dec = JSON.parse(r.stdout).hookSpecificOutput.permissionDecision; } catch { /* sin salida */ }
    return { exit: r.status, dec, ms: Date.now() - t, colgado: !!(r.error && r.error.code === 'ETIMEDOUT'), salida: (r.stdout || '').slice(0, 200) };
  };
  for (const c of HALLAZGO) {
    const r = hook(c);
    console.log(`   · hook \`${c}\`: exit=${r.exit} decisión=${r.dec} pared=${r.ms} ms`);
    check(`E) hook \`${c}\` responde y termina en < ${PLAZO_HOOK / 2} ms (el plazo es ${PLAZO_HOOK})`, !r.colgado && r.ms < PLAZO_HOOK / 2 && r.exit === 0 && r.dec === null);
  }
  const rs = hook('cmd ${X} ; cat <S>');
  console.log(`   · hook \`cmd \${X} ; cat <secreto>\`: exit=${rs.exit} decisión=${rs.dec} pared=${rs.ms} ms`);
  check('E) hook `cmd ${X} ; cat <secreto>` responde DENY, rápido (< 5 s, plazo 10 s)', !rs.colgado && rs.dec === 'deny' && rs.ms < PLAZO_HOOK / 2);
  const rp = hook('cmd ${X} ; cat <S>', 'PowerShell');
  check('E) hook en PowerShell `cmd ${X} ; cat <secreto>` responde DENY, rápido', !rp.colgado && rp.dec === 'deny' && rp.ms < PLAZO_HOOK / 2);
  /* Fail-closed: el presupuesto agotado → deny + exit 2 (bloqueo para Claude Code). */
  const rf = hook('git status ; echo a | cat', 'Bash', { GUARDIA_PRESUPUESTO_PASOS: '3' });
  check('E) hook con el presupuesto agotado responde DENY y sale con código 2 (fail-closed)', rf.dec === 'deny' && rf.exit === 2 && /demasiado complejo/.test(rf.salida), `exit=${rf.exit} ${rf.dec}`);
  const rx = spawnSync(process.execPath, [RUTA], { input: '{no es json', encoding: 'utf8', timeout: TOPE_HIJO });
  check('E) hook con stdin ilegible responde DENY con código 2', rx.status === 2 && /deny/.test(rx.stdout || ''));
  const rb = hook('cmd ' + '{a,b}'.repeat(12) + ' ' + 'cmd '.repeat(40) + '${X}', 'Bash');
  check(`E) hook con una orden patológica termina dentro del plazo (${rb.ms} ms < ${PLAZO_HOOK})`, !rb.colgado && rb.ms < PLAZO_HOOK / 2 && [0, 2].includes(rb.exit));
}

/* ── F · Conservación frente a la guardia anterior (49704840) ─────────────── */
console.log('\n── F · Ninguna decisión es menos estricta que la de 49704840 ──');
if (base) {
  const palabras = ['cmd', 'cmd.exe', 'wsl', 'eval', 'sudo', 'env'];
  const finales = ['${X}', '{a,b}', 'echo hola', 'echo a{b}c', 'deploy', 'firebase deploy', 'cat <S>', 'git push --force', 'git commit -m x', '/c cat <S>', '/c firebase deploy', '/k echo hola', '/?', '', 'cmd', '${X} ; cat <S>'];
  let n = 0, menos = 0, cuelga = 0; const peores = [];
  for (const w of palabras) for (const f of finales) for (const h of ['Bash', 'PowerShell']) {
    const c = `${w} ${f}`.trim(); n++;
    const a = analiza(RUTA, h, c, {}, 60000), b = analiza(base, h, c, {}, 60000);
    if (a.colgado) { cuelga++; peores.push(`COLGADO ${c}`); continue; }
    if (rk(a.d) < rk(b.d)) { menos++; peores.push(`${b.d}→${a.d} ${h} ${sec(c).replace(L, '<secreto>')}`); }
  }
  check(`F) ${n} órdenes (envoltorios × finales × 2 shells): 0 menos estrictas y 0 colgadas`, menos === 0 && cuelga === 0, `menos=${menos} colgadas=${cuelga} ${peores.slice(0, 4).join(' | ')}`);
}

/* ── G · Sabotajes ─────────────────────────────────────────────────────────── */
console.log('\n── G · Sabotajes de la corrección ──');
{
  const texto = fs.readFileSync(RUTA, 'utf8');
  const mut = (nombre, pares) => {
    let x = texto;
    for (const [a, c] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 70)}`); x = x.split(a).join(c); }
    const f = path.join(tmp, `sab-${nombre}.mjs`);
    fs.writeFileSync(f, x);
    return f;
  };
  const CMD_CORREGIDO = "if (c >= 0) interior = w.slice(c + 1).join(' ') || null;\n      else {";
  const CMD_ANTIGUO = "{ interior = w.slice(c + 1).join(' ') || null; } if (false) {";
  const PRES_NULO = 'const gasta = () => {';
  const PRES_PERMITE = "return decision('deny', MOTIVO_PRESUPUESTO, true);";
  /* 1) sin la corrección de `cmd`: la orden vuelve a reanalizarse a sí misma. El presupuesto la corta, pero con DENY: `A` (decide «pasa») lo detecta. */
  const s1 = mut('sin-cmd', [[CMD_CORREGIDO, CMD_ANTIGUO]]);
  const r1 = analiza(s1, 'Bash', 'cmd ${X}', {}, 60000);
  check('G1) SABOTAJE sin la corrección de `cmd`: `cmd ${X}` deja de «pasar» al instante (A lo detecta)', r1.colgado || r1.d !== 'pasa' || r1.ms >= COTA_ANALISIS, `${r1.d} ${Math.round(r1.ms)} ms`);
  /* 2) sin presupuesto (`gasta` no hace nada) y sin la corrección: se cuelga de verdad. */
  const s2 = mut('sin-ninguna', [[CMD_CORREGIDO, CMD_ANTIGUO], [PRES_NULO, 'const gasta = () => { return;']]);
  const r2 = analiza(s2, 'Bash', 'cmd mkdir -p src/{a,b} ; cat <S>', {}, 15000, false);
  check('G2) SABOTAJE sin la corrección y sin presupuesto: la guardia se CUELGA con `cmd … {a,b} ; cat <secreto>` (el vigilante lo detecta)', r2.colgado, r2.colgado ? 'colgado' : `${r2.d} ${Math.round(r2.ms)} ms`);
  /* 3) sin presupuesto (con la corrección de cmd): D lo detecta, porque nada se agota. */
  const s3 = mut('sin-presupuesto', [[PRES_NULO, 'const gasta = () => { return;']]);
  const r3 = analiza(s3, 'Bash', 'git status ; echo a | cat', { GUARDIA_PRESUPUESTO_PASOS: '3' });
  check('G3) SABOTAJE sin presupuesto: con 3 pasos el comando ya no se deniega (D lo detecta)', r3.d !== 'deny');
  /* 4) presupuesto que PERMITE al agotarse. */
  const s4 = mut('permite', [[PRES_PERMITE, 'return PASA;']]);
  const r4 = analiza(s4, 'Bash', 'echo a ; echo b ; echo c ; echo d ; cat <S>', { GUARDIA_PRESUPUESTO_PASOS: '3' });
  check('G4) SABOTAJE con un presupuesto que PERMITE al agotarse: `cat <secreto>` pasa (D lo detecta)', r4.d === 'pasa');
  const r4b = analiza(s4, 'Bash', 'echo a ; echo b ; echo c ; echo d ; cat <S>', { GUARDIA_PRESUPUESTO_PASOS: '3' });
  check('G4b) y el control: la guardia sin sabotear deniega esa misma orden con el mismo presupuesto', analiza(RUTA, 'Bash', 'echo a ; echo b ; echo c ; echo d ; cat <S>', { GUARDIA_PRESUPUESTO_PASOS: '3' }).d === 'deny' && r4b.d === 'pasa');
  /* 5) La comprobación final de `analizarTexto` (`propia && PRESUP.agotado`) es defensa en profundidad: hoy ningún `catch` intermedio deja el análisis sin otra
     llamada a `gasta()` posterior (medido con presupuestos de 3 a 12 pasos), así que quitarla NO cambia ninguna decisión y no puede detectarse con un sabotaje: se declara. */
  /* 6) el tope por defecto: si la env pudiera SUBIR el presupuesto el límite se anularía. */
  const s6 = mut('env-sube', [['Math.min(defecto, v)', 'v']]);
  check('G6) SABOTAJE con una env que SUBE el presupuesto: ya no manda el tope por defecto (se detecta en la comprobación de código)', /Math\.min\(defecto, v\)/.test(texto) && !/Math\.min\(defecto, v\)/.test(fs.readFileSync(s6, 'utf8')));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
