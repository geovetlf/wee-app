/**
 * WEË — C23 / G19: UNA VARIANTE ES UN NOMBRE Y LO QUE SIGNIFICA.
 *
 * ── Lo que lo destapó ───────────────────────────────────────────────────────
 *
 * Un canary real. A «necesito el texto de una campaña» el modelo contestó
 * `campaign`, que existe y es legal — y que significa diseñar la campaña
 * ENTERA, con calendario y presupuesto—. Lo que la persona quería era `copy`:
 * el texto. El modelo solo veía los nombres, y la palabra «campaña» tiró del
 * que se llamaba parecido.
 *
 * ── Por qué el significado va pegado a la pareja, no al nombre ──────────────
 *
 * Porque OCHO nombres los usan varias capacidades y no significan lo mismo en
 * cada una: `space` es crear una imagen de un espacio o rediseñar el de una
 * foto; `lyrics` es escribir una letra, cantarla o componerle música; `look` es
 * cambiar el pelo o probarse una prenda. Una tabla por nombre tendría que
 * elegir cuál de los tres significados es el bueno.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * `description` contesta «qué intención expresa esta variante», no «cómo se
 * hace». Ni una frase de `KIND_INSTRUCTIONS` se ha copiado, y el Core sigue sin
 * importar nada de Legacy.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const { CAPABILITY_CATALOG, VARIANTES_DEL_CATALOGO, INTENCIONES, interpretarPasos } = core;
const { vocabularioParaElPrompt } = lib('creator/prompts.js');
const { KIND_INSTRUCTIONS, IMAGE_TASK_EN } = lib('creator/prompts.js');

const conVariantes = CAPABILITY_CATALOG.filter((c) => c.variants?.length);
const todas = conVariantes.flatMap((c) => c.variants.map((v) => ({ cap: c.id, ...v })));
const esperado = (extra = {}) => ({
  intents: INTENCIONES,
  capabilities: CAPABILITY_CATALOG.map((c) => c.id),
  experiences: ['business', 'travel'],
  variants: VARIANTES_DEL_CATALOGO,
  ...extra,
});
const texto = vocabularioParaElPrompt(esperado());

console.log('\n── A · El contrato ──');

check('G19-1 · las 53 variantes de las 14 capacidades tienen significado',
  conVariantes.length === 14 && todas.length === 53
  && todas.every((v) => typeof v.key === 'string' && v.key && typeof v.description === 'string' && v.description.trim().length > 20),
  `${conVariantes.length} capacidades · ${todas.length} variantes`);
check('el significado va pegado a la pareja capacidad+variante',
  (() => {
    const de = (cap, key) => CAPABILITY_CATALOG.find((c) => c.id === cap).variants.find((v) => v.key === key).description;
    return de('image.generate', 'space') !== de('image.space_restyle', 'space')
      && de('text.generate', 'lyrics') !== de('music.generate', 'lyrics')
      && de('image.identity_edit', 'look') !== de('image.try_on', 'look');
  })(),
  'ocho nombres los comparten varias capacidades, y no significan lo mismo');
check('G19-2 · ninguna variante nombra proveedor, modelo ni adaptador',
  !todas.some((v) => /gemini|openai|claude|flux|seedance|deepseek|provider|model|adapter/i.test(v.description)));
/*
 * Se mira el MODO, no la raíz: «Crear la portada» nombra una intención y
 * «Crea una portada» da una orden. Las 53 están en infinitivo, que es
 * justamente la forma de decir qué es algo sin decir cómo se hace.
 */
check('G19-3 · ninguna es una instrucción de ejecución: todas nombran, ninguna manda',
  todas.every((v) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(ar|er|ir)(se|le|lo|la|les|los|las)?\b/.test(v.description.trim()))
  && !todas.some((v) => /^(escribe|crea|genera|devuelve|redacta|haz|arma|prepara|responde)\b/i.test(v.description.trim()))
  && !todas.some((v) => /IMAGEN:|PROBAR:|NARRACIÓN:|Termina con una línea/i.test(v.description)),
  'dicen QUÉ intención expresan, no cómo se hace');
check('G19-4 · no se copió ni una frase de Legacy',
  !todas.some((v) => {
    const legacy = KIND_INSTRUCTIONS[v.key] ?? IMAGE_TASK_EN[v.key] ?? '';
    if (!legacy) return false;
    /* Ninguna descripción puede ser un trozo literal de la instrucción de Legacy. */
    return legacy.includes(v.description.slice(0, 40)) || v.description.includes(legacy.slice(0, 40));
  }),
  '29 tenían texto en KIND_INSTRUCTIONS y 15 en IMAGE_TASK_EN: ninguno se copió');
check('y el Core sigue sin importar Legacy',
  !/creator\/|KIND_INSTRUCTIONS|IMAGE_TASK_EN/.test(leer('functions/src/core/registry/capabilities.ts')));

console.log('\n── B · El vocabulario que recibe el modelo ──');

check('G19-5 · muestra nombre y significado, uno por línea',
  /^ {4}copy — Escribir EL TEXTO pedido/m.test(texto) && /^ {4}campaign — Diseñar una campaña ENTERA/m.test(texto),
  `${texto.length} caracteres`);
check('G19-6 · el significado sale del catálogo, palabra por palabra',
  todas.every((v) => !texto.includes(`${v.key} — `) || texto.includes(`${v.key} — ${v.description}`)));
check('G19-7 · no hay segundo registro: la proyección es por referencia',
  Object.entries(VARIANTES_DEL_CATALOGO).every(([id, vs]) =>
    vs === CAPABILITY_CATALOG.find((c) => c.id === id).variants));
check('G19-8 · si cambia una descripción del catálogo, cambia el vocabulario',
  (() => {
    const tocado = vocabularioParaElPrompt(esperado({
      variants: { ...VARIANTES_DEL_CATALOGO, 'text.search': [{ key: 'itinerary', description: 'OTRA COSA DISTINTA' }] },
    }));
    return tocado.includes('itinerary — OTRA COSA DISTINTA') && !tocado.includes('destinations —');
  })());
check('G19-9 · una variante SIN descripción no entra en el vocabulario',
  !vocabularioParaElPrompt(esperado({
    variants: { ...VARIANTES_DEL_CATALOGO, 'text.search': [{ key: 'itinerary' }, { key: 'transport', description: 'cómo moverse' }] },
  })).includes('itinerary'),
  'mejor que el modelo no la conozca a que la elija a ciegas');
check('G19-10 · las variantes se siguen validando POR capacidad',
  interpretarPasos([{ key: 'a', capability: 'text.generate', input: { kind: 'restore' } }],
    { capabilities: CAPABILITY_CATALOG.map((c) => c.id), variants: VARIANTES_DEL_CATALOGO })[0]?.input?.kind === undefined,
  '`restore` es de `image.edit`');
check('G19-11 · el orden sigue siendo determinista',
  vocabularioParaElPrompt(esperado()) === texto
  && texto.split('\n').filter((l) => l.startsWith('    ')).length === todas.length);
check('G19-12 · el vocabulario no expresa preferencia',
  !/prefer|mejor opción|recomendad|por defecto usa|primero usa/i.test(texto));

console.log('\n── C · Las parejas que se confundían ──');

const dif = (cap, a, b) => {
  const e = CAPABILITY_CATALOG.find((c) => c.id === cap).variants;
  const da = e.find((v) => v.key === a)?.description ?? '';
  const db = e.find((v) => v.key === b)?.description ?? '';
  return da && db && da !== db;
};
for (const [cap, a, b] of [
  ['text.generate', 'copy', 'campaign'], ['text.generate', 'analysis', 'answer'],
  ['text.generate', 'concept', 'copy'], ['text.generate', 'polish', 'published'],
  ['text.search', 'destinations', 'itinerary'], ['text.search', 'activities', 'ideas'],
  ['image.edit', 'restore', 'enhance'], ['image.generate', 'photo', 'business'],
]) check(`${cap}: «${a}» y «${b}» se distinguen`, dif(cap, a, b));

check('y la que falló en C22 lo dice sin ambigüedad',
  CAPABILITY_CATALOG.find((c) => c.id === 'text.generate').variants.find((v) => v.key === 'campaign')
    .description.includes('No es el texto de una pieza'),
  'el modelo tenía que poder ver la diferencia, no adivinarla');

console.log('\n── D · Lo que no se tocó ──');

check('el Planner sigue rechazando una variante de otra capacidad',
  /entrada\.variants\?\.some\(\(v\) => v\.key === kind\)/.test(leer('functions/src/core/planner.ts')));
check('G17 sigue abierto: la continuidad se sigue perdiendo',
  !/leido\.continuity/.test(leer('functions/src/core/brain.ts')));
check('B3 sigue abierto: `creator/planner.ts` no se ha tocado',
  /template\.buildPlan\(goal, record\)/.test(leer('functions/src/creator/planner.ts'))
  && !/crearPlannerDeWee/.test(leer('functions/src/creator/planner.ts')));
check('esta suite está en la cadena de `npm test`',
  /variantes-con-significado\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
