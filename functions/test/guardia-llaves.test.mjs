/**
 * LA GUARDIA Y LA EXPANSIÓN DE LLAVES DE BASH — `.claude/hooks/guardia.mjs` (Guardian · hallazgo H4, 2026-10-15).
 *
 *   node test/guardia-llaves.test.mjs
 *
 * El hallazgo H4: `cat {<secreto>,x}`, `cat {.env,x}*` y `cat .e{n,}v*` pasaban SIN decisión, porque bash expande las llaves ANTES de ejecutar
 * y la guardia comparaba la palabra sin expandir. Había además una causa más profunda en el tokenizador: la comprobación de «grupo `{ …; }`»
 * era `/\s|\n|$/`, cuyo `$` casaba siempre, así que TODA palabra que empezaba por `{` se tragaba como grupo, cerraba la orden anterior y sus
 * palabras desaparecían (`cat {a,b} <secreto>` pasaba). Y la misma expansión sirve para construir el programa (`{git,push,--force}`).
 *
 *   A  los casos originales y sus variantes (prefijo/sufijo, secuencias, anidadas, varias llaves, rutas, `--`, otros programas, redirecciones)
 *      se DENIEGAN (secretos) o se PREGUNTAN (rutas protegidas), en Bash y en PowerShell.
 *   B  el programa construido con llaves (`{git,push,--force}`, `{firebase,deploy}`) se decide como la orden ya expandida.
 *   C  lo legítimo con llaves NO cambia (`echo {a,b}`, `mkdir -p src/{a,b}`, `git log --format={%h}`…).
 *   D  `expandirLlaves`/`expandirPalabras`: la expansión se parece a la de bash y las cotas son conservadoras (nunca lanzan, nunca dejan pasar).
 *   E  la guardia REAL, como hook (stdin → salida), decide igual.
 *   F  CONSERVACIÓN: nada de lo que la guardia anterior (49704840) denegaba o preguntaba pasa ahora; cada decisión es igual o más estricta.
 *   G  sabotajes: con cada pieza de la corrección quitada, las pruebas de A/B fallan.
 *
 * Lo que NO se prueba (queda como hallazgo en docs): ver el informe de H4.
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
/* GUARDIA_LLAVES_RUTA permite apuntar la suite a una copia estropeada (los sabotajes de G se hacen también desde fuera). */
const RUTA = process.env.GUARDIA_LLAVES_RUTA || path.join(RAIZ, REL);
const g = await import(pathToFileURL(RUTA).href);
const dec = (mod, h, c) => { try { return mod.analizarTexto(h, c).decision || 'pasa'; } catch (e) { return `ERROR ${e.message}`; } };
/* Los nombres de secretos se arman aquí para que ESTA suite no contenga el nombre completo en una orden que la guardia lea. */
const E = ['.en', 'v'].join('');             // `.env`
const L = ['.env', '.local'].join('');       // `.env.local`
const P = ['.env', '.prod'].join('');
const CRED = ['gha-', 'creds-x.json'].join('');
const CL = ['.cla', 'ude'].join('');         // `.claude`

console.log('\n── A · Secretos con llaves: se deniegan ──');
const DENIEGAN = [
  /* los tres casos originales de H4 */
  `cat {${L},x}`, `cat {${E},x}*`, 'cat .e{n,}v*',
  /* prefijo, sufijo, ambos */
  `cat ${E}{,.local}`, `cat {${E},x}.local`, `cat {${E}.,x}local`, `cat .e{n,}v.local`, `cat ./{${L},x}`, `cat functions/{${L},x}`, `cat functions/.e{n,}v.local`,
  /* secuencias y rangos que producen el nombre */
  `cat .env.loca{k..m}`, `cat .env.loca{a..z}`, `cat ${E}.{k..m}ocal`, `cat .en{u..w}.local`, `cat .env{,.l{o,x}cal}`,
  /* anidadas y varias llaves en el mismo argumento */
  `cat {{${L},x},y}`, `cat {x,{${L},y}}`, `cat {.e,x}{nv,y}.local`, `cat {.,x}{e,y}{n,z}{v,w}.local`, `cat .{e,x}n{v,}.{l,}ocal`,
  /* comodines combinados */
  `cat {${E}*,x}`, `cat {x,.e*}`, `cat .en?.local`, `cat {.en?,x}.local`, `cat .e{n,}v.l*`, `cat {.*,x}`,
  /* tras -- y con opciones */
  `cat -- {${L},x}`, `cat -n {${L},x}`, `less {${L},x}`, `head -n 3 {${L},x}`, `tail -f {${L},x}`,
  /* otros nombres de secreto del proyecto (los que la guardia ya protege) */
  `cat {${P},x}`, `cat {x,${CRED}}`, `cat gha-{creds-x.json,y}`, `cat {application_default,y}_credentials`, `cat {service,y}-account.json`, `cat {wee-claves-,y}retiradas`,
  /* otros programas */
  `grep x {${L},y}`, `grep -n token {${E},y}*`, `cp {${L},x} /tmp/copia`, `mv {${L},x} /tmp/m`, `rm {${L},x}`, `source {${L},x}`,
  `xargs cat {${L},x}`, `echo x | xargs cat {${L},y}`, `bash -c 'cat {${L},x}'`, `sh -c "cat .e{n,}v*"`, `node -e "1" {${L},x}`,
  /* redirecciones y encadenado */
  `cat < {${L},x}`, `cat x; cat {${L},y}`, `ls && cat {${L},y}`, `(cat {${L},y})`, `{ cat {${L},y}; }`, `echo $(cat {${L},y})`,
  /* la palabra con llaves ya no se traga la orden: lo que viene detrás se sigue mirando */
  `cat {a,b} ${L}`, `cat {a,b} {${L},x}`, `echo {a,b} ; cat {${L},x}`,
];
for (const c of DENIEGAN) {
  check(`Bash deniega: ${c}`, dec(g, 'Bash', c) === 'deny', dec(g, 'Bash', c));
}
for (const c of [`cat {${L},x}`, `cat {${E},x}*`, 'cat .e{n,}v*', `Get-Content {${L},x}`, `type {${L},x}`, `gc .e{n,}v*`, `cat ${E}{,.local}`]) {
  check(`PowerShell deniega: ${c}`, dec(g, 'PowerShell', c) === 'deny', dec(g, 'PowerShell', c));
}

console.log('\n── A2 · Rutas protegidas con llaves: se pregunta ──');
const PREGUNTAN = [
  `rm {${CL},x}/settings.json`, `cp x .cl{a,}ude/settings.json`, `mv {a,b} {${CL},x}/hooks/guardia.mjs`, `touch ${CL}/{a,b}`, `tee {${CL},x}/settings.json`,
  `sed -i s/a/b/ {${CL},x}/settings.json`, `rm -rf {.gi,x}t/refs`, `rm .{git,x}/refs/heads/main`, 'cp x {.firebaserc,y}',
];
for (const c of PREGUNTAN) {
  const d = dec(g, 'Bash', c);
  check(`Bash no pasa en silencio: ${c}`, d === 'ask' || d === 'deny', d);
}

console.log('\n── B · El programa construido con llaves ──');
const PROGRAMA = [
  ['deny', '{git,push,--force} origin main'], ['deny', 'git {push,--force} origin main'], ['deny', '{firebase,deploy} --project prod'],
  ['deny', 'firebase {deploy,x}'], ['deny', '{gh,auth,token}'], ['deny', 'git push {--force,x} origin main'], ['deny', 'git push origin {+main,x}'],
  ['ask', '{git,commit} -m x'], ['ask', 'git {commit,x}'], ['ask', 'git comm{it,} -m x'],
];
for (const [esperado, c] of PROGRAMA) {
  const d = dec(g, 'Bash', c);
  check(`${esperado}: ${c}`, d === esperado, d);
}

console.log('\n── C · Lo legítimo con llaves sigue pasando ──');
const PASAN = [
  'echo {a,b}', 'mkdir -p src/{a,b}', 'ls {src,docs}', 'cat {README,CHANGELOG}.md', 'git log --format={%h}', 'git log --format="{%h}" -n 3', 'npm run x -- --opt={1,2}',
  'echo {1..100000}', 'echo {a..z}{1..9}', 'echo ${HOME}', 'echo "${a:-b}"', 'cp {a,b}.txt dest/',
  'git diff {main,HEAD}', 'git log {main,dev}', 'ls -la {,.}x', 'echo {}', 'echo {a}', 'echo a{b}c', 'echo {a b}', "echo '{.x,y}'", 'find . -name "*.{js,ts}"',
  'node -e "const a = {x: 1, y: 2}; console.log(a)"', 'jq -n \'{a: 1}\'', 'grep -rn "{a,b}" src', 'awk \'{print $1}\' f.txt', 'sed -n \'1{p}\' f.txt',
];
for (const c of PASAN) check(`pasa: ${c}`, dec(g, 'Bash', c) === 'pasa', dec(g, 'Bash', c));
for (const c of ['echo {a,b}', 'ls {src,docs}', 'Get-ChildItem {a,b}']) check(`PowerShell pasa: ${c}`, dec(g, 'PowerShell', c) === 'pasa', dec(g, 'PowerShell', c));

console.log('\n── D · expandirLlaves / expandirPalabras ──');
const ex = (x) => [...g.expandirLlaves(x)].sort().join('|');
check('D1) la original siempre va incluida', g.expandirLlaves('{a,b}').includes('{a,b}') && g.expandirLlaves('sin').join() === 'sin');
check('D2) lista con prefijo y sufijo', ex('p{a,b}s') === ['p{a,b}s', 'pas', 'pbs'].sort().join('|'));
check('D3) elemento vacío (`.e{n,}v` y `{,x}`)', g.expandirLlaves('.e{n,}v').includes('.env') && g.expandirLlaves('.e{n,}v').includes('.ev'));
check('D4) secuencias de letras, de números, con paso y con ceros', ex('{a..c}').includes('b') && ex('{1..3}').includes('2') && ex('{a..e..2}').includes('c') && !ex('{a..e..2}').split('|').includes('b') && g.expandirLlaves('{08..10}').includes('09'));
check('D5) secuencia descendente', g.expandirLlaves('{3..1}').includes('2') && g.expandirLlaves('{c..a}').includes('b'));
check('D6) anidadas y varias: producto cartesiano como bash', g.expandirLlaves('{a,b{c,d}}').filter((x) => !x.includes('{')).sort().join() === 'a,bc,bd' && g.expandirLlaves('{a,b}{1,2}').filter((x) => !x.includes('{')).length === 4);
check('D7) lo que bash NO expande queda literal: `{a}`, `{}`, `{a..3}`, llave sin cerrar', ['{a}', '{}', '{a..3}', 'x{a,b', 'a}b{'].every((x) => g.expandirLlaves(x).join() === x));
check('D8) una llave interior sí se expande dentro de una exterior sin coma (`{{a,b}}` → `{a}`,`{b}`)', g.expandirLlaves('{{a,b}}').includes('{a}'));
{
  const grande = g.expandirLlaves('{1..100000}');
  check('D9) secuencia enorme: no se materializa; aproximación conservadora con comodín', grande.length <= 3 && grande.some((x) => /\*/.test(x)));
  const mucho = g.expandirLlaves('{a,b}'.repeat(20));
  check('D10) 2^20 combinaciones: tampoco se materializan (cota) y hay aproximación con comodín', mucho.length <= 3 && mucho.some((x) => x.includes('*')), `${mucho.length}`);
  const t0 = Date.now();
  g.expandirLlaves('{'.repeat(5000) + 'a,b' + '}'.repeat(5000));
  g.expandirLlaves('{a,b}'.repeat(5000));
  check('D11) anidado/repetido extremo: termina deprisa y no lanza', Date.now() - t0 < 4000, `${Date.now() - t0} ms`);
  check('D12) expandirPalabras reemplaza EN SU SITIO (`{git,push} x` → git push x)', g.expandirPalabras(['{git,push}', 'x']).join(' ') === 'git push x');
}
check('D13) `cat {1..100000}` (solo dígitos) no se deniega por el comodín numérico', dec(g, 'Bash', 'cat {1..100000}') === 'pasa');
check('D14) demasiadas combinaciones de letras (10 grupos = 1024): aproximación con comodín; `cat` + comodín que alcanza un secreto se DENIEGA (falla cerrado, nunca pasa)', dec(g, 'Bash', `cat ${'{a,b}'.repeat(10)}`) === 'deny');
check('D15) y con un sufijo que ningún secreto puede tener, pasa (`…{a,b}×10.txt`)', dec(g, 'Bash', `cat ${'{a,b}'.repeat(10)}.txt`) === 'pasa');
check('D16) y con el sufijo de un secreto, se deniega', dec(g, 'Bash', `cat ${'{a,b}'.repeat(10)}${E}*`) === 'deny');

console.log('\n── E · La guardia REAL, como hook ──');
const hook = (c, h = 'Bash') => spawnSync(process.execPath, [RUTA], { input: JSON.stringify({ tool_name: h, tool_input: { command: c }, cwd: RAIZ }), encoding: 'utf8' });
const bloquea = (r) => r.status !== 0 || /"permissionDecision":"(deny|ask)"|deny|ask/.test(r.stdout);
for (const c of [`cat {${L},x}`, `cat {${E},x}*`, 'cat .e{n,}v*', '{git,push,--force} origin main']) {
  const r = hook(c);
  check(`E) el hook bloquea: ${c}`, bloquea(r), `salida ${r.status} ${r.stdout.slice(0, 80)}`);
}
for (const c of ['echo {a,b}', 'mkdir -p src/{a,b}', 'cat {README,CHANGELOG}.md', 'git log --format={%h}']) {
  const r = hook(c);
  check(`E) el hook deja pasar: ${c}`, r.status === 0 && !bloquea(r), `salida ${r.status} ${r.stdout.slice(0, 80)}`);
}

console.log('\n── F · Conservación frente a la guardia anterior (49704840) ──');
const base = spawnSync('git', ['-C', RAIZ, 'show', '49704840:.claude/hooks/guardia.mjs'], { encoding: 'utf8', maxBuffer: 1 << 26 });
if (base.status !== 0) {
  console.log('(la guardia anterior no está disponible en este clon: la comparación F se omite)');
} else {
  const tmp = path.join(RAIZ, '.claude/hooks', `_guardia-base-${process.pid}.mjs`);
  fs.writeFileSync(tmp, base.stdout);
  try {
    const b = await import(`${pathToFileURL(tmp).href}?${Date.now()}`);
    const rank = { pasa: 0, ask: 1, deny: 2 };
    const corpus = [
      ...DENIEGAN, ...PREGUNTAN, ...PASAN, ...PROGRAMA.map((x) => x[1]),
      /* mutaciones: una palabra con llaves delante o detrás de cada orden (la guardia anterior tragaba la orden previa) */
      ...['git push --force origin main', 'firebase deploy --only functions', 'git commit -m x', `cat ${L}`, 'gh auth token', 'git reset --hard HEAD~1', 'rm -rf node_modules']
        .flatMap((c) => [`{x,y} ${c}`, `${c} {a,b}`, `echo {a,b} ${c}`, `{ ${c}; }`, `{${c};}`, `echo {a,b}; ${c}`, `(${c})`]),
    ];
    const peores = [];
    for (const h of ['Bash', 'PowerShell']) for (const c of corpus) {
      const antes = dec(b, h, c); const ahora = dec(g, h, c);
      if ((rank[ahora] ?? 3) < (rank[antes] ?? 3)) peores.push(`${h}: ${c}: ${antes}→${ahora}`);
    }
    check(`F1) ${corpus.length * 2} evaluaciones: NINGUNA decisión es menos estricta que la de la guardia anterior`, peores.length === 0, peores.slice(0, 5).join(' | '));
    const mas = ['{git,push,--force} origin main', `cat {${L},x}`, `cat {a,b} ${L}`].filter((c) => dec(b, 'Bash', c) === 'pasa' && dec(g, 'Bash', c) !== 'pasa');
    check('F2) y las tres familias de H4 pasaban antes y ya no', mas.length === 3, mas.join(' | '));
  } finally { fs.rmSync(tmp, { force: true }); }
}

{
  const texto = fs.readFileSync(RUTA, 'utf8');
console.log('\n── G · Sabotajes de la corrección ──');
  const mutantes = async (pares) => {
    let x = texto;
    for (const [a, b] of pares) { if (!x.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 60)}`); x = x.split(a).join(b); }
    const f = path.join(path.dirname(RUTA), `_guardia-sab-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, x);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const SIN_EXP_SECRETO = ['for (const plano of utiles.flatMap((a) => expandirLlaves(a)).map(desescapar)) {', 'for (const plano of utiles.map(desescapar)) {'];
  const SIN_ETAPA = ["if (tuberia[k].palabras.some((x) => x.includes('{'))) {", 'if (false) {'];
  const SIN_EXP_PROT = ['const args = w.slice(1).flatMap((x) => expandirLlaves(x));', 'const args = w.slice(1);'];
  const REGEX_VIEJA = ["/\\s/.test(s[i + 1] || '\\n')))", "/\\s|\\n|$/.test(s[i + 1] || '\\n')))"];
  const SIN_LEGADO = ['MODO_LEGADO = true;', 'MODO_LEGADO = false;'];
  const originales = [`cat {${L},x}`, `cat {${E},x}*`, 'cat .e{n,}v*'];
  /* Defensa en profundidad: la expansión vive en DOS sitios (la palabra en tocaSecreto y la orden entera). Quitar solo UNO no abre nada; quitar los dos, sí. */
  const m1 = await mutantes([SIN_EXP_SECRETO]);
  check('G1) quitar SOLO la expansión de tocaSecreto no abre nada (la orden expandida lo sigue cubriendo: defensa en profundidad)', originales.every((c) => dec(m1, 'Bash', c) === 'deny'));
  const m2 = await mutantes([SIN_ETAPA]);
  check('G2) quitar SOLO el análisis de la orden expandida: los secretos siguen denegados, pero el programa construido con llaves pasa (B lo detecta)', originales.every((c) => dec(m2, 'Bash', c) === 'deny') && dec(m2, 'Bash', '{git,push,--force} origin main') === 'pasa');
  const m3 = await mutantes([SIN_EXP_SECRETO, SIN_ETAPA]);
  check('G3) SABOTAJE sin ninguna de las dos expansiones: `cat .e{n,}v*` vuelve a pasar (A lo detecta)', dec(m3, 'Bash', 'cat .e{n,}v*') === 'pasa');
  /* H5: con la corrección de los envoltorios la palabra del programa también se comprueba, y eso cubre por otro camino la palabra tragada como grupo
     (`{.env.local,x}` queda como «programa»). Este sabotaje apaga también esa comprobación para seguir midiendo SOLO la pieza de H4. En una rama sin H5 no hay nada que apagar. */
  const H5_PROGRAMA = 'const utiles = [...quitadas, ...(conPrograma ? sinPatron(p, w) : sinPatron(p, w).slice(1))];';
  const SIN_H5 = texto.includes(H5_PROGRAMA) ? [[H5_PROGRAMA, 'const utiles = [...quitadas, ...sinPatron(p, w).slice(1)];']] : [];
  const m4 = await mutantes([REGEX_VIEJA, SIN_EXP_SECRETO, SIN_ETAPA, ...SIN_H5]);
  check('G4) SABOTAJE con la regex antigua del tokenizador (y sin expansiones): `cat {<secreto>,x}` y `cat {a,b} <secreto>` pasan (la palabra se traga como grupo)', dec(m4, 'Bash', `cat {${L},x}`) === 'pasa');
  const m5 = await mutantes([SIN_EXP_PROT, SIN_ETAPA]);
  check('G5) SABOTAJE sin expandir en escribeProtegido (ni la orden entera): `rm {.claude,x}/settings.json` vuelve a pasar (A2 lo detecta)', dec(m5, 'Bash', `rm {${CL},x}/settings.json`) === 'pasa');
  const m6 = await mutantes([['return { lista: [aproximarLlaves(s0)], aproximada: true };', 'return { lista: [], aproximada: true };']]);
  check('G6) SABOTAJE sin aproximación al desbordar: el comodín enorme deja de existir (D lo detecta)', !m6.expandirLlaves('{a,b}'.repeat(20)).some((x) => x.includes('*')) && g.expandirLlaves('{a,b}'.repeat(20)).some((x) => x.includes('*')));
  const m7 = await mutantes([SIN_LEGADO]);
  const legadoPerdido = ['{x,y} git push --force origin main', '{x,y} firebase deploy --only functions'].filter((c) => dec(g, 'Bash', c) !== 'pasa' && dec(m7, 'Bash', c) === 'pasa');
  check('G7) SABOTAJE sin el troceado legado: lo que la guardia anterior denegaba por ese camino (`{x,y} git push --force…`) pasaría (F lo detecta)', legadoPerdido.length === 2, legadoPerdido.join(' | '));
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
