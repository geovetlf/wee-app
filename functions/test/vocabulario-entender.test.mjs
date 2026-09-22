/**
 * WEË — C21 / G18: EL VOCABULARIO LLEGA AL MODELO.
 *
 * ── Dónde estaba el agujero ─────────────────────────────────────────────────
 *
 * El Core armaba `ThoughtRequest.expected` con las capacidades y las variantes
 * de cada una, y NADIE lo leía. El pensador de `creator/brain.ts` declaraba
 * `async pensar()` SIN PARÁMETRO: tiraba la petición entera.
 *
 * Así que el canary de C20 tuvo que renderizar el vocabulario a mano, dentro de
 * su propio script, para poder preguntarle algo al modelo. Un canary que
 * necesita su propio renderizador no está midiendo el producto: está midiendo
 * el canary.
 *
 * ── Lo que se conecta, y lo que NO se abre ──────────────────────────────────
 *
 * Ahora el pensador lee la petición y, en modo «entender», manda el prompt de
 * estructura más el vocabulario construido DESDE EL CATÁLOGO. En modo
 * «conversar» no cambia nada: el mismo `engineInput` que se cotizó.
 *
 * Conectar el carril no es abrirlo. Quien llama sigue pidiendo `conversar`, así
 * que esta rama todavía no se recorre en producción.
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
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const { CAPABILITY_CATALOG, VARIANTES_DEL_CATALOGO, INTENCIONES } = core;
const { vocabularioParaElPrompt, BRAIN_UNDERSTAND_SYSTEM } = lib('creator/prompts.js');

const esperadoReal = (extra = {}) => ({
  intents: INTENCIONES,
  capabilities: CAPABILITY_CATALOG.map((c) => c.id),
  experiences: ['travel', 'photo'],
  variants: VARIANTES_DEL_CATALOGO,
  ...extra,
});
const texto = vocabularioParaElPrompt(esperadoReal());

console.log('\n── A · El vocabulario sale del catálogo ──');

check('G18-1 · con `expected`, hay vocabulario; sin él, no se inventa nada',
  texto.length > 0 && vocabularioParaElPrompt(undefined) === ''
  && vocabularioParaElPrompt({ intents: [], capabilities: [], experiences: [] }) === '',
  `${texto.length} caracteres`);
check('G18-2 · cada variante renderizada es la del catálogo',
  CAPABILITY_CATALOG.filter((c) => c.variants?.length).every((c) => {
    const linea = texto.split('\n').find((l) => l.trim().startsWith(`${c.id}:`));
    return linea && [...c.variants].sort().join(', ') === linea.split(': ').slice(1).join(': ');
  }),
  '14 capacidades con variantes, todas comprobadas una a una');
check('G18-4 · una capacidad puede tener varias variantes, y salen todas',
  (texto.match(/^ {2}text\.search: .*$/m) ?? [''])[0]
    .endsWith('activities, analysis, destinations, ideas, itinerary, shopping, transport'));
check('G18-10 · si cambia el catálogo, cambia el vocabulario renderizado',
  (() => {
    const quitada = vocabularioParaElPrompt(esperadoReal({
      variants: { ...VARIANTES_DEL_CATALOGO, 'text.search': VARIANTES_DEL_CATALOGO['text.search'].filter((v) => v !== 'destinations') },
    }));
    return texto.includes('destinations') && !quitada.includes('destinations')
      && quitada.includes('itinerary');
  })(),
  'se quita una del catálogo y deja de ofrecérsele al modelo');
check('G18-3 · no hay lista manual: las variantes no están escritas en el prompt',
  !['destinations', 'activities', 'transport', 'itinerary', 'skincare', 'facestyle', 'dish_edit']
    .some((v) => String(BRAIN_UNDERSTAND_SYSTEM).includes(v)),
  'el prompt dice CÓMO decirlas; el catálogo dice CUÁLES son');

console.log('\n── B · Lo que no se renderiza ──');

/* Se mira SU línea: `restore` tiene que seguir estando en `image.edit`, que es la suya. */
check('G18-6 · una variante que no es de esa capacidad no se ofrece EN ESA capacidad',
  (() => {
    const t = vocabularioParaElPrompt(esperadoReal({
      variants: { ...VARIANTES_DEL_CATALOGO, 'text.search': ['restore', 'itinerary'] },
    }));
    const suya = t.split('\n').find((l) => l.trim().startsWith('text.search:')) ?? '';
    const deEdit = t.split('\n').find((l) => l.trim().startsWith('image.edit:')) ?? '';
    return !suya.includes('restore') && suya.includes('itinerary') && deEdit.includes('restore');
  })(),
  '`restore` es de `image.edit`, y ahí sigue');
check('una capacidad que el catálogo no conoce no se renderiza',
  !vocabularioParaElPrompt(esperadoReal({
    capabilities: [...CAPABILITY_CATALOG.map((c) => c.id), 'text.inventada'],
  })).includes('inventada'));
check('G18-7 · ni proveedor, ni modelo, ni adaptador, ni precio',
  !/provider|modelId|adapter|precio|price|usd|credits/i.test(texto));
check('G18-8 · ni una sola palabra de Workflow',
  !/workflow|dependsOn|"uses"|produces|jobId|stepId|runId/i.test(texto));
check('el renderizador no toca red, ni Firestore, ni proveedor',
  !/fetch|firestore|firebase|http|require\(/.test(
    (sinComentarios(leer('functions/src/creator/prompts.ts')).match(/export const vocabularioParaElPrompt[\s\S]*?\n\};/) ?? [''])[0]));

console.log('\n── C · El orden: determinista, y no una preferencia ──');

check('G18-9 · el mismo `expected` da el mismo texto, siempre',
  vocabularioParaElPrompt(esperadoReal()) === texto
  && vocabularioParaElPrompt(esperadoReal()) === vocabularioParaElPrompt(esperadoReal()));
check('las capacidades salen en el orden del catálogo, no reordenadas',
  (() => {
    const linea = texto.split('\n').find((l) => l.startsWith('Capacidades'));
    const enTexto = linea.replace('Capacidades del catálogo: ', '').replace(/\.$/, '').split(', ');
    return enTexto.join() === CAPABILITY_CATALOG.map((c) => c.id).join();
  })());
check('y las variantes en orden alfabético, que es orden y no ranking',
  texto.split('\n').filter((l) => l.startsWith('  ')).every((l) => {
    const vs = l.split(': ').slice(1).join(': ').split(', ');
    return [...vs].sort().join() === vs.join();
  }),
  'el prompt no dice en ningún sitio que la primera sea mejor');
check('el vocabulario no sugiere preferencia',
  !/prefer|mejor|recomendad|primero usa|por defecto/i.test(texto));

console.log('\n── D · El prompt sigue siendo general ──');

const prompt = String(BRAIN_UNDERSTAND_SYSTEM);
check('G18-11 · sin una sola regla de Travel',
  !/viaj|travel|destino|itinerar/i.test(prompt));
/*
 * Se buscan REGLAS, no palabras: «telephoto» es vocabulario de lentes y «mi
 * restaurante» es el ejemplo de algo que ya es tuyo. Ninguna de las dos le dice
 * al modelo qué hacer con una foto.
 */
check('G18-12 · sin una sola regla de Photo',
  !/vision.describe|image.edit|si (la persona |el usuario )?(sube|adjunta|manda) una foto/i.test(prompt));
check('ni de ninguna otra experiencia',
  !/chef|receta|business|campaña|beauty|music|writer/i.test(prompt));
check('y no importa una sola plantilla de Legacy',
  !/creator\/templates|TEMPLATES|buildPlan/.test(leer('functions/src/creator/prompts.ts')));

console.log('\n── E · El camino real, sin script de canary ──');

const cerebroSrc = leer('functions/src/creator/brain.ts');
check('G18-5 · el pensador YA NO tira la petición',
  /async pensar\(peticion\)/.test(cerebroSrc) && !/async pensar\(\) \{/.test(cerebroSrc),
  'ahí estaba el agujero: `async pensar()` sin parámetro');
check('y en modo «entender» manda el prompt de estructura con el vocabulario',
  /peticion\?\.kind !== 'understand'/.test(cerebroSrc)
  && /vocabularioParaElPrompt\(peticion\.expected\)/.test(cerebroSrc)
  && /BRAIN_UNDERSTAND_SYSTEM/.test(cerebroSrc));
check('en modo «conversar» se manda EXACTAMENTE lo que se cotizó',
  /if \(peticion\?\.kind !== 'understand'\) return engineInput;/.test(cerebroSrc),
  'lo que se enseña, lo que se envía y lo que se cobra siguen siendo el mismo número');
check('el carril queda conectado, NO abierto: nadie pide todavía «entender»',
  !/mode: 'understand'|\.entender\(/.test(sinComentarios(cerebroSrc)),
  'cambiar de modo cambia lo que la persona lee, y eso es otra fase');

console.log('\n── F · Y lo de siempre, intacto ──');

check('`VARIANTES_DEL_CATALOGO` sigue siendo proyección por referencia',
  Object.entries(VARIANTES_DEL_CATALOGO).every(([id, vs]) =>
    vs === CAPABILITY_CATALOG.find((c) => c.id === id).variants));
check('el Core sigue sin construir prompts: el texto vive donde vivían los otros',
  !/vocabularioParaElPrompt|Intenciones posibles/.test(leer('functions/src/core/brain.ts'))
  && /export const vocabularioParaElPrompt/.test(leer('functions/src/creator/prompts.ts')));
check('G17 sigue abierto y sin tocar: la continuidad se sigue perdiendo',
  !/leido\.continuity/.test(leer('functions/src/core/brain.ts')),
  'C21 era G18, y no se ha aprovechado el viaje');
check('esta suite está en la cadena de `npm test`',
  /vocabulario-entender\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
