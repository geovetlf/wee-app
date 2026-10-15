/**
 * UNA ASERCIÓN DEBILITADA SE NOTA AUNQUE CONSERVE SU TÍTULO Y EL NÚMERO DE LLAMADAS — `ops/guardian/huellas.mjs` (Guardian · revisión previa a integración, 2026-10-15).
 *
 *   node test/guardian-aserciones.test.mjs        (desde functions/; sin red ni procesos de suites)
 *
 * La huella de la primera versión guardaba, por suite, los títulos de sus `check(…)` y cuántas llamadas hacía: borrar una comprobación se notaba,
 * pero DEBILITARLA por dentro no (`check('x', cond)` → `check('x', true)`). Ahora la huella guarda además, por cada aserción, un hash de su
 * CONTENIDO leído del árbol sintáctico: el título, la condición (impresa y normalizada: reformatear o comentar no cuenta) y las condiciones que
 * envuelven la llamada (`if`, ternario, `&&`/`||`, cabecera de un bucle, `catch`). Cambiar cualquiera de las tres hace que esa aserción ya no
 * sea la guardada.
 *
 *   A  lo que NO es un debilitamiento no da falsos positivos: reformatear, comentar, renumerar los títulos, añadir aserciones.
 *   B  cada forma de debilitar —`true`, un literal, negar, `|| true`, `&& false`, sustituir un argumento, mover bajo `if (false)`/`0 &&`/un bucle
 *      vacío/un ternario/un catch, quitar la condición— se detecta, y SOLO por el contenido: título y nº de llamadas siguen idénticos (lo que
 *      la huella anterior no veía).
 *   C  sobre copias de las suites REALES de los invariantes (créditos, saldo privado, idempotencia, seguridad…): lo mismo, con `verificarHuellas`.
 *   D  sabotajes: sin la comparación de contenido, B y C dejan pasar el debilitamiento.
 *
 * Límites que se declaran: solo se ven las llamadas `check(…)` (todas las suites de invariantes usan ese helper); una aserción que no se llega a
 * ejecutar porque su función nunca se invoca, o un `check` redefinido, no se detectan; y quien edite una aserción legítimamente debe re-anclar la
 * huella con `--autoriza` (una decisión humana, no de la autocorrección).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallos = 0;
const check = (n, c, extra = '') => { console.log(`${c ? '✔' : '✘'} ${n}${extra ? ` — ${extra}` : ''}`); if (!c) fallos++; };
const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const hue = await imp('ops/guardian/huellas.mjs');
const dom = await imp('ops/guardian/dominios.mjs');
const ts = createRequire(path.join(RAIZ, 'package.json'))('typescript');
const limpiezas = [];
process.on('exit', () => { for (const d of limpiezas) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ya no está */ } } });

/** Mutar la n-ésima llamada `check(…)` con condición: `f({ titulo, cond, llamada })` devuelve el texto nuevo de la LLAMADA (sin `;`). */
const mutar = (texto, n, f) => {
  const sf = ts.createSourceFile('s.mjs', texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const llamadas = [];
  const v = (x) => { if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'check' && x.arguments.length >= 2) llamadas.push(x); ts.forEachChild(x, v); };
  v(sf);
  const c = llamadas[n];
  if (!c) throw new Error(`no hay la llamada ${n}`);
  const nuevo = f({ titulo: c.arguments[0].getText(sf), cond: c.arguments[1].getText(sf), resto: c.arguments.slice(2).map((a) => a.getText(sf)), llamada: c.getText(sf) });
  return texto.slice(0, c.getStart(sf)) + nuevo + texto.slice(c.getEnd());
};
const BASE = [
  "check('1) uno', a === 1, 'x');",
  "check('2) dos: no se cobra dos veces', saldo(cuenta) === 240 && cobros.length === 1);",
  "check('3) tres', !fuga(x));",
  "if (hay) { check('4) cuatro', ok(y)); }",
].join('\n');
const h0 = hue.huellaDeSuite(BASE);

console.log('\n── A · Lo que no es un debilitamiento no da falsos positivos ──');
{
  const iguales = (texto) => hue.diferencias(h0, hue.huellaDeSuite(texto)).length === 0;
  check('1) reformatear (espacios, saltos de línea, comillas) no cambia nada', iguales(BASE.replace("check('1) uno', a === 1, 'x');", "check(  '1) uno' ,\n   a   ===   1 ,\n 'x' ) ;")));
  check('2) añadir o cambiar un comentario no cambia nada', iguales(`// cabecera\n${BASE.replace("a === 1,", "a === 1, /* nota */")}\n/* fin */`));
  check('3) renumerar los títulos no cambia nada', iguales(BASE.replace("'1) uno'", "'7) uno'").replace("'2) dos", "'8b) dos")));
  check('4) cambiar el tercer argumento (el mensaje) no cambia nada: no es parte de la aserción', iguales(BASE.replace(", 'x');", ", 'otro mensaje');")));
  const mas = `${BASE}\ncheck('5) cinco', z === 2);\ncheck('6) seis', true);`;
  check('5) AÑADIR aserciones (incluso triviales) no es un problema: la huella solo crece', hue.diferencias(h0, hue.huellaDeSuite(mas)).length === 0);
  check('6) una aserción idéntica en otro sitio de la suite sigue contando como la misma', iguales(`${BASE}\n${BASE}`));
}

console.log('\n── B · Cada forma de debilitar se detecta, solo por el contenido ──');
{
  const casos = [
    ['la condición sustituida por `true`', 1, ({ titulo }) => `check(${titulo}, true)`],
    ['la condición sustituida por un literal que siempre es verdad', 1, ({ titulo }) => `check(${titulo}, 1)`],
    ['la condición sustituida por una cadena', 1, ({ titulo }) => `check(${titulo}, 'ok')`],
    ['`assert(true)` en lugar de la condición', 1, ({ titulo }) => `check(${titulo}, assert(true) || true)`],
    ['la condición con `|| true`', 1, ({ titulo, cond }) => `check(${titulo}, ${cond} || true)`],
    ['la condición con `?? true`', 1, ({ titulo, cond }) => `check(${titulo}, ${cond} ?? true)`],
    ['la condición negada', 1, ({ titulo, cond }) => `check(${titulo}, !(${cond}))`],
    ['la negación de la condición quitada', 2, ({ titulo }) => `check(${titulo}, fuga(x))`],
    ['una conjunción acortada (`a && b` → `a`)', 1, ({ titulo }) => `check(${titulo}, saldo(cuenta) === 240)`],
    ['un número cambiado en la condición (argumento sustituido)', 1, ({ titulo }) => `check(${titulo}, saldo(cuenta) === 241 && cobros.length === 1)`],
    ['un identificador cambiado en la condición (argumento sustituido)', 1, ({ titulo }) => `check(${titulo}, saldo(otra) === 240 && cobros.length === 1)`],
    ['la condición quitada (solo el título)', 1, ({ titulo }) => `check(${titulo})`],
    ['la aserción movida bajo `if (false)`', 1, ({ llamada }) => `if (false) { ${llamada}; }`],
    ['la aserción movida bajo `if (0)`', 1, ({ llamada }) => `if (0) ${llamada};`],
    ['la aserción movida bajo `false && …`', 1, ({ llamada }) => `false && ${llamada}`],
    ['la aserción movida bajo un bucle que no itera', 1, ({ llamada }) => `for (const _ of []) { ${llamada}; }`],
    ['la aserción movida a la rama de un ternario', 1, ({ llamada }) => `(typeof window === 'object' ? ${llamada} : 0)`],
    ['la aserción movida a un `catch` que nunca se ejecuta', 1, ({ llamada }) => `try { } catch (e) { ${llamada}; }`],
    ['la condición de un `if` que ya envolvía la aserción cambiada (`hay` → `false`)', 3, ({ llamada }) => llamada],
  ];
  for (const [nombre, n, f] of casos) {
    let texto = mutar(BASE, n, f);
    if (nombre.startsWith('la condición de un `if`')) texto = texto.replace('if (hay)', 'if (false)');
    const h = hue.huellaDeSuite(texto);
    const d = hue.diferencias(h0, h);
    const soloContenido = h.llamadas === h0.llamadas && h.titulos.join() === h0.titulos.join();
    check(`7) ${nombre}: se detecta como aserciones-cambiadas`, d.some((x) => x.tipo === 'aserciones-cambiadas'));
    check(`7b) …y es INVISIBLE para la huella antigua (mismos títulos y mismo nº de llamadas): solo el contenido lo delata`, soloContenido && !d.some((x) => ['comprobaciones-perdidas', 'menos-llamadas'].includes(x.tipo)), `${h.llamadas}/${h0.llamadas} llamadas`);
  }
  /* Quitar la condición con `check(titulo)` o convertir el check en otra cosa: también cae. */
  const sinLlamada = BASE.replace("check('3) tres', !fuga(x));", "'3) tres', !fuga(x);");
  check('8) quitar la llamada (dejar solo el texto) se detecta por título y por llamadas', hue.diferencias(h0, hue.huellaDeSuite(sinLlamada)).map((x) => x.tipo).sort().join() === 'aserciones-cambiadas,comprobaciones-perdidas,menos-llamadas');
}

console.log('\n── C · Sobre copias de las suites REALES de los invariantes ──');
const copia = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-a-'));
  limpiezas.push(d);
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, hue.RUTA_INVARIANTES), 'utf8'));
  for (const rel of ['ops/guardian/dominios.json', hue.RUTA_INVARIANTES, hue.RUTA_HUELLAS, ...hue.suitesDeInvariantes(catalogo).map((s) => dom.archivoDeSuite(s))]) {
    fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true });
    fs.copyFileSync(path.join(RAIZ, rel), path.join(d, rel));
  }
  return d;
};
{
  const d = copia();
  check('9) las copias intactas son conformes (las huellas guardadas son las de las suites de hoy)', hue.verificarHuellas({ raiz: d }).ok);
  for (const [suite, n, nombre, f] of [
    ['idempotencia-de-cobro', 3, 'condición → true', ({ titulo }) => `check(${titulo}, true)`],
    ['credits-saldo-privado', 5, 'condición negada', ({ titulo, cond }) => `check(${titulo}, !(${cond}))`],
    ['credits', 10, 'condición || true', ({ titulo, cond }) => `check(${titulo}, ${cond} || true)`],
    ['security', 2, 'aserción bajo if (false)', ({ llamada }) => `if (false) { ${llamada}; }`],
    ['core-job', 20, 'argumento sustituido', ({ titulo, cond }) => `check(${titulo}, (${cond}) && 1 === 1 || 2 === 2)`],
    ['urls-del-storage', 4, 'condición → literal', ({ titulo }) => `check(${titulo}, 1)`],
  ]) {
    const p = path.join(d, dom.archivoDeSuite(suite));
    const original = fs.readFileSync(p, 'utf8');
    fs.writeFileSync(p, mutar(original, n, f));
    const r = hue.verificarHuellas({ raiz: d });
    const delSuite = r.problemas.filter((x) => x.id.startsWith(`huella:${suite}:`));
    check(`10.${suite}) ${nombre}: verificarHuellas falla con «aserciones-cambiadas» y SOLO con eso (título y llamadas intactos)`, !r.ok && delSuite.length === 1 && delSuite[0].id === `huella:${suite}:aserciones-cambiadas`, delSuite.map((x) => x.id).join());
    fs.writeFileSync(p, original);
  }
  check('11) restauradas las suites, vuelve a ser conforme', hue.verificarHuellas({ raiz: d }).ok);
  /* Una huella guardada por la versión anterior (sin `aserciones`) sigue valiendo para títulos y llamadas, y se re-ancla con --registrar. */
  const guardadas = JSON.parse(fs.readFileSync(path.join(d, hue.RUTA_HUELLAS), 'utf8'));
  for (const s of Object.values(guardadas.suites)) delete s.aserciones;
  fs.writeFileSync(path.join(d, hue.RUTA_HUELLAS), JSON.stringify(guardadas));
  check('12) una huella antigua (sin contenido) sigue siendo válida para títulos y llamadas: el formato nuevo es compatible hacia atrás', hue.verificarHuellas({ raiz: d }).ok);
}

console.log('\n── D · Sabotajes: sin la comparación de contenido, el debilitamiento pasa ──');
{
  const fuente = fs.readFileSync(path.join(RAIZ, 'ops/guardian/huellas.mjs'), 'utf8');
  const cargar = async (cambios) => {
    let t = fuente;
    for (const [a, b] of cambios) { if (!t.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 60)}`); t = t.split(a).join(b); }
    const f = path.join(RAIZ, `ops/guardian/_sabotaje-huellas-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(f, t);
    try { return await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  };
  const debil = mutar(BASE, 1, ({ titulo }) => `check(${titulo}, true)`);
  const sinContenido = await cargar([['if (Array.isArray(guardada.aserciones)) {', 'if (false) {']]);
  check('13) SABOTAJE sin comparar el contenido: `check(t, true)` pasa (B lo detecta)', sinContenido.diferencias(sinContenido.huellaDeSuite(BASE), sinContenido.huellaDeSuite(debil)).length === 0 && hue.diferencias(h0, hue.huellaDeSuite(debil)).length > 0);
  const sinGuardas = await cargar([["return g.join('|');", "return '';"]]);
  const bajoIf = mutar(BASE, 1, ({ llamada }) => `if (false) { ${llamada}; }`);
  check('14) SABOTAJE sin mirar lo que envuelve la llamada: moverla bajo `if (false)` pasa (B lo detecta)', sinGuardas.diferencias(sinGuardas.huellaDeSuite(BASE), sinGuardas.huellaDeSuite(bajoIf)).length === 0 && hue.diferencias(h0, hue.huellaDeSuite(bajoIf)).length > 0);
  const sinCondicion = await cargar([["const cond = n.arguments[1] ? texto1(n.arguments[1]) : '(sin condición)';", "const cond = '';"]]);
  check('15) SABOTAJE sin leer la condición: `true`, la negación y el argumento sustituido pasan (B lo detecta)', sinCondicion.diferencias(sinCondicion.huellaDeSuite(BASE), sinCondicion.huellaDeSuite(debil)).length === 0);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
