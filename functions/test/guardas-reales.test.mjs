/*
 * S1.2 · C/D/F — LAS GUARDAS CORREN DE VERDAD.
 *
 * La 88 (A2) y la 93 (A3) eran un `grep` por `execSync` con `2>/dev/null || true`:
 * en Windows la búsqueda no corría, la salida volvía vacía con código 0 y las dos
 * aprobaban sin mirar un solo archivo. Un falso verde es peor que un fallo.
 *
 * Esta suite no se fía de que las guardas aprueben: comprueba que MIRAN. Sobre
 * fixtures reales en una carpeta temporal —válido, violado, restaurado—, que
 * fallan explícitamente cuando no pueden mirar, que no queda consola en ellas, y
 * que el `sinLanzar` de las pruebas de B3 no puede convertir un fallo en un PASS.
 *
 *  A. No queda consola en las guardas.
 *  B. Sobre el árbol real.
 *  C. PASS · FAIL · RESTORE, con fixtures.
 *  D. Fallar explícitamente: sin carpeta, sin archivos, sin patrón.
 *  E. `sinLanzar`, auditado.
 *  F. Multiplataforma.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAPAS_DE_PRODUCCION, PATRON_A2, PATRON_A3, archivosDe, describirHallazgos, guardaDeConexion,
} from './guardas.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const lanza = (fn) => { try { fn(); return null; } catch (e) { return String(e?.message ?? e); } };

let failures = 0; let n = 0;
const check = (nombre, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const GUARDAS = [
  { n: '88', suite: 'functions/test/algorithm-decomposition.test.mjs', patron: PATRON_A2, variable: 'guarda88',
    violaciones: [
      "import { crearMotorDeDescomposicion } from '../core/algorithm';",
      "import { descomponer } from '../core/algorithm/decomposition-engine';",
      "import type { TareaADescomponer } from '../core/algorithm/decomposition';",
      'const d: Descomposicion = hacer();',
      'type R = ResultadoDeDescomposicion;',
    ] },
  { n: '93', suite: 'functions/test/algorithm-strategy.test.mjs', patron: PATRON_A3, variable: 'guarda93',
    violaciones: [
      "import { crearMotorDeEstrategias } from '../core/algorithm';",
      "import { proponer } from '../core/algorithm/strategy-engine';",
    ] },
];

console.log('\n─── A. No queda consola en las guardas ───');

const CONSOLA = /child_process|execSync|execFileSync|spawnSync|\bspawn\(|\bexec\(|\bgrep\b|\/dev\/null|\|\|\s*true|\bbash\b|\bsh -c\b|\bawk\b|\bsed\b/;
for (const g of GUARDAS) {
  const src = sinComentarios(leer(g.suite));
  check(`1 · la guarda ${g.n} ya no lanza nada por consola: ni child_process, ni grep, ni /dev/null, ni || true`,
    !CONSOLA.test(src), (src.match(CONSOLA) ?? ['nada'])[0]);
  check(`2 · y es la de Node, con su patrón y las capas de producción, y exige haber leído archivos`,
    new RegExp(`const ${g.variable} = guardaDeConexion\\(\\{ raiz: RAIZ, capas: CAPAS_DE_PRODUCCION, patron: PATRON_A${g.n === '88' ? '2' : '3'} \\}\\);`).test(src)
    && new RegExp(`check\\('${g.n} · [^']*', ${g.variable}\\.ok && ${g.variable}\\.leidos > 50`).test(src));
}
const srcGuardas = sinComentarios(leer('functions/test/guardas.mjs'));
check('3 · el módulo de las guardas solo lee archivos: ni consola, ni red, ni nada del sistema operativo',
  !CONSOLA.test(srcGuardas) && !/process\.platform|require\(|fetch\(|http/.test(srcGuardas)
  && [...srcGuardas.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).sort().join(',') === 'node:fs,node:path',
  [...srcGuardas.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).join(','));

console.log('\n─── B. Sobre el árbol real ───');

for (const g of GUARDAS) {
  const r = guardaDeConexion({ raiz: RAIZ, capas: CAPAS_DE_PRODUCCION, patron: g.patron });
  check(`4 · la guarda ${g.n} sobre el código real: LEE (${r.leidos} archivos) y no encuentra nada`,
    r.ok === true && r.leidos > 50 && r.hallazgos.length === 0, describirHallazgos(r));
}
check('5 · las seis capas existen: si una desapareciera la guarda lanzaría, no aprobaría',
  CAPAS_DE_PRODUCCION.length === 6 && CAPAS_DE_PRODUCCION.every((c) => fs.existsSync(path.resolve(RAIZ, c))));
const conElPatronViejo = guardaDeConexion({ raiz: RAIZ, capas: CAPAS_DE_PRODUCCION, patron: /decomposition|Descomposicion/ });
check('6 · el patrón viejo de la 88, ejecutado de verdad, FALLARÍA por Seedream: `layer_decomposition` no es A2',
  !conElPatronViejo.ok && conElPatronViejo.hallazgos.some((h) => h.archivo === 'functions/src/engine/providers/seedream.ts')
  && /layer_decomposition/.test(leer('functions/src/engine/providers/seedream.ts')), describirHallazgos(conElPatronViejo));
check('7 · y el nuevo reconoce A2 sin confundirla: casa con su módulo, su fábrica y sus tipos, y no con `layer_decomposition`',
  !PATRON_A2.test("capabilities: ['image.edit', 'layer_decomposition']") && !PATRON_A2.test('const decomposition = capas;')
  && GUARDAS[0].violaciones.every((v) => PATRON_A2.test(v)));
check('8 · y el de la 93 reconoce A3 sin confundirse con la palabra «estrategia»',
  GUARDAS[1].violaciones.every((v) => PATRON_A3.test(v)) && !PATRON_A3.test('const estrategia = "rápida";') && !PATRON_A3.test('type Strategy = unknown;'));

console.log('\n─── C. PASS · FAIL · RESTORE, con fixtures ───');

/* Una copia de las seis capas en una carpeta temporal, con archivos que NO conectan nada (y uno que se parece). */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardas-'));
try {
  for (const c of CAPAS_DE_PRODUCCION) {
    fs.mkdirSync(path.join(tmp, c), { recursive: true });
    fs.writeFileSync(path.join(tmp, c, 'limpio.ts'), "export const x = 'nada que ver';\n");
  }
  fs.writeFileSync(path.join(tmp, 'functions/src/engine', 'seedream.ts'), "const caps = ['image.edit', 'layer_decomposition'];\n");
  const FIXTURES = CAPAS_DE_PRODUCCION.length + 1;
  for (const g of GUARDAS) {
    const correr = () => guardaDeConexion({ raiz: tmp, capas: CAPAS_DE_PRODUCCION, patron: g.patron });
    const valido = correr();
    check(`9 · guarda ${g.n} · fixture VÁLIDO → PASS, habiendo leído los ${FIXTURES} archivos`,
      valido.ok === true && valido.leidos === FIXTURES && valido.hallazgos.length === 0, describirHallazgos(valido));
    for (const [i, violacion] of g.violaciones.entries()) {
      const malo = path.join(tmp, 'functions/src/creator', `malo_${i}.ts`);
      fs.writeFileSync(malo, `// un archivo de producción\nexport const y = 1;\n${violacion}\n`);
      const violado = correr();
      check(`10 · guarda ${g.n} · fixture VIOLADO (${violacion.slice(0, 48)}…) → FAIL, con el archivo y la línea`,
        violado.ok === false && violado.hallazgos.length === 1
        && violado.hallazgos[0].archivo === `functions/src/creator/malo_${i}.ts` && violado.hallazgos[0].linea === 3, describirHallazgos(violado));
      fs.rmSync(malo);
      const restaurado = correr();
      check(`11 · guarda ${g.n} · fixture RESTAURADO → PASS otra vez`,
        restaurado.ok === true && restaurado.leidos === FIXTURES, describirHallazgos(restaurado));
    }
  }
  /* F · Multiplataforma: finales de línea de Windows y separadores de ruta, sin que cambie nada. */
  const crlf = path.join(tmp, 'functions/src/runtime', 'crlf.ts');
  fs.writeFileSync(crlf, 'export const a = 1;\r\n// otra línea\r\nimport { crearMotorDeEstrategias } from "../core/algorithm";\r\n');
  const conCrlf = guardaDeConexion({ raiz: tmp, capas: CAPAS_DE_PRODUCCION, patron: PATRON_A3 });
  check('12 · un archivo con finales de línea de Windows: se encuentra, en su línea (3), con la ruta en `/`',
    conCrlf.ok === false && conCrlf.hallazgos.length === 1 && conCrlf.hallazgos[0].archivo === 'functions/src/runtime/crlf.ts' && conCrlf.hallazgos[0].linea === 3,
    describirHallazgos(conCrlf));
  fs.rmSync(crlf);
  const conSeparador = CAPAS_DE_PRODUCCION.map((c) => c.split('/').join('\\') + '\\');
  const conBarras = guardaDeConexion({ raiz: tmp, capas: conSeparador, patron: PATRON_A3 });
  fs.writeFileSync(path.join(tmp, 'functions/src/router', 'malo.ts'), "import { crearMotorDeEstrategias } from '../core/algorithm';\n");
  const conBarrasYFallo = guardaDeConexion({ raiz: tmp, capas: conSeparador, patron: PATRON_A3 });
  fs.rmSync(path.join(tmp, 'functions/src/router', 'malo.ts'));
  check('13 · con las capas escritas a la Windows (`\\`, y una barra final), mira lo mismo y lo cuenta con `/`',
    conBarras.ok === true && conBarras.leidos === FIXTURES
    && conBarrasYFallo.ok === false && conBarrasYFallo.hallazgos[0]?.archivo === 'functions/src/router/malo.ts', describirHallazgos(conBarrasYFallo));
  const anidado = path.join(tmp, 'functions/src/planner/profundo/mas/abajo');
  fs.mkdirSync(anidado, { recursive: true });
  fs.writeFileSync(path.join(anidado, 'oculto.ts'), "export { crearMotorDeDescomposicion } from '../../../../core/algorithm';\n");
  const enProfundidad = guardaDeConexion({ raiz: tmp, capas: CAPAS_DE_PRODUCCION, patron: PATRON_A2 });
  check('14 · una conexión escondida tres carpetas más abajo también se encuentra: recorre el árbol entero',
    enProfundidad.ok === false && enProfundidad.hallazgos.some((h) => h.archivo === 'functions/src/planner/profundo/mas/abajo/oculto.ts'),
    describirHallazgos(enProfundidad));
  fs.rmSync(path.join(tmp, 'functions/src/planner/profundo'), { recursive: true });

  console.log('\n─── D. Fallar explícitamente ───');

  check('15 · una capa que no existe LANZA: nada de aprobar sin mirar',
    /no existe/.test(lanza(() => guardaDeConexion({ raiz: tmp, capas: [...CAPAS_DE_PRODUCCION, 'functions/src/inventada'], patron: PATRON_A2 })) ?? ''));
  check('16 · sin capas, LANZA', /sin capas/.test(lanza(() => guardaDeConexion({ raiz: tmp, capas: [], patron: PATRON_A2 })) ?? ''));
  check('17 · un patrón que no es una expresión regular, LANZA —un texto no se «interpreta»—',
    /expresión regular/.test(lanza(() => guardaDeConexion({ raiz: tmp, capas: CAPAS_DE_PRODUCCION, patron: 'crearMotorDeDescomposicion' })) ?? ''));
  check('18 · un patrón con estado (g) LANZA: con `lastIndex` la misma línea daría dos respuestas',
    /estado/.test(lanza(() => guardaDeConexion({ raiz: tmp, capas: CAPAS_DE_PRODUCCION, patron: /crearMotorDeDescomposicion/g })) ?? ''));
  const vacio = path.join(tmp, 'vacio/functions/src/creator');
  fs.mkdirSync(vacio, { recursive: true });
  const sinArchivos = guardaDeConexion({ raiz: path.join(tmp, 'vacio'), capas: ['functions/src/creator'], patron: PATRON_A2 });
  check('19 · una guarda que no leyó NINGÚN archivo no aprueba: sin mirar no hay nada que demostrar',
    sinArchivos.ok === false && sinArchivos.leidos === 0 && sinArchivos.hallazgos.length === 0, describirHallazgos(sinArchivos));
  check('20 · y `archivosDe` es el mismo recorrido para todos: ordenado, solo archivos, rutas en `/`',
    (() => { const l = archivosDe(tmp, 'functions/src/engine'); return JSON.stringify(l) === JSON.stringify([...l].sort()) && l.every((f) => !f.includes('\\')) && l.length === 2; })());
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
check('21 · y la carpeta temporal se borra: la prueba no deja nada detrás', !fs.existsSync(tmp));

console.log('\n─── E. `sinLanzar`, auditado ───');

/*
 * `sinLanzar` llegó en S1 para que una sombra que relanza haga FALLAR una
 * aserción en vez de tumbar la suite. Lo que no puede hacer es lo contrario:
 * convertir un fallo en un PASS. Devuelve `{ lanzo }`, y cada una de sus
 * llamadas exige con `===` campos que ese objeto no tiene.
 */
const srcSombra = leer('functions/test/sombra-experiencia.test.mjs');
const llamadas = (srcSombra.match(/await sinLanzar\(/g) ?? []).length;
check('22 · su definición devuelve SOLO `{ lanzo: e }`: nada con forma de éxito',
  /const sinLanzar = async \(entrada\) => \{ try \{ return await sombraDelPlan\(entrada\); \} catch \(e\) \{ return \{ lanzo: e \}; \} \};/.test(srcSombra));
check('23 · y en la suite `lanzo` solo se exige vacío (`=== null`): nunca se lee un lanzamiento como bueno',
  [...srcSombra.matchAll(/\.lanzo\b[^;\n]{0,12}/g)].every((m) => /^\.lanzo === null/.test(m[0])), `${llamadas} llamadas a sinLanzar`);
const deLanzamiento = { lanzo: new Error('la sombra relanzó') };
const PREDICADOS = [
  (r) => r.escrita === false && r.estado === 'no_corre',
  (r) => r.escrita === true && r.estado === 'ok',
  (r) => r.escrita === false && r.estado === 'fallo',
  (r) => r.escrita === false && r.estado === 'duplicado',
];
check('24 · y un lanzamiento no satisface ninguna de las formas en que la suite lo comprueba',
  llamadas >= 9 && PREDICADOS.every((p) => p(deLanzamiento) === false), `${llamadas} llamadas`);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nS1.2 · C/D/F: las guardas miran de verdad, en cualquier sistema, y fallan cuando no pueden mirar');
process.exit(failures ? 1 : 0);
