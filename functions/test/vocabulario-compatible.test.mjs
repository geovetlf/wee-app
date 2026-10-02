/**
 * WEË — G20 / QUÉ RECIBE Y QUÉ DA CADA CAPACIDAD, SACADO DEL CATÁLOGO.
 *
 * ── El hueco ────────────────────────────────────────────────────────────────
 *
 * C27 le dio al modelo dónde decir que un paso bebe de otro (`steps[].needs`).
 * Pero el vocabulario que se le manda llevaba `intents`, `capabilities` —solo
 * los ids—, `experiences` y `variants`, y NO `accepts` ni `produces`. Así que
 * podía nombrar una capacidad y no tenía con qué saber cuál alimenta a cuál:
 * que `text.generate` no puede recibir una imagen no estaba en ninguna parte
 * de lo que se le daba.
 *
 * Es la forma de G19 —nombres sin significado— aplicada a los enlaces.
 *
 * ── Lo que se hizo, y lo que deliberadamente NO ─────────────────────────────
 *
 * Se enriqueció LA LISTA QUE YA HABÍA, entrada por entrada, leyendo el
 * catálogo en vivo. No se añadió una segunda lista —dos listas de ids pueden
 * discrepar—, ni un campo nuevo al contrato, ni una tabla de compatibilidades.
 *
 * Lo único escrito a mano es UNA frase que dice cómo se leen los dos lados de
 * la flecha. Ni una sola pareja de capacidades aparece nombrada, y esta suite
 * lo comprueba sobre el código, no sobre la intención.
 *
 * ── Lo que la auditoría midió antes de tocar nada ───────────────────────────
 *
 *   68 entradas en el catálogo · 0 sin `accepts` · 0 sin `produces`
 *   0 con `accepts` vacío · 20 formas distintas de (recibe → da)
 *
 * O sea: cobertura completa. No hizo falta inventar ni un dato.
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
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const { CAPABILITY_CATALOG, PLANNER_CONTRACT_VERSION, INTENCIONES, VARIANTES_DEL_CATALOGO, interpretarPasos } = core;
const { vocabularioParaElPrompt, entradaDeEntender } = lib('creator/prompts.js');
const { crearPlannerDeWee, disponibilidadDe, entendimientoParaPlanificar } = lib('planner/index.js');

const IDS = CAPABILITY_CATALOG.map((c) => c.id);
const MODALIDADES = [...new Set(CAPABILITY_CATALOG.flatMap((c) => [...c.accepts, c.produces]))].sort();
const esperadoCon = (capabilities) => ({ intents: INTENCIONES, capabilities, experiences: ['chef'], variants: VARIANTES_DEL_CATALOGO });
const vocabulario = (capabilities = IDS) => String(vocabularioParaElPrompt(esperadoCon(capabilities)) ?? '');
const lineaDe = (texto, id) => texto.split('\n').find((l) => l.trim().startsWith(id + ' '))?.trim();

console.log('\n── A · Lo que se le enseña sale del catálogo, entrada por entrada ──');

const V = vocabulario();
check('G20-1 · el vocabulario deriva `accepts` del catálogo, en las 68',
  CAPABILITY_CATALOG.every((c) => lineaDe(V, c.id)?.includes(`— ${c.accepts.join('+')} `)),
  CAPABILITY_CATALOG.filter((c) => !lineaDe(V, c.id)?.includes(`— ${c.accepts.join('+')} `)).map((c) => c.id).join(', ') || 'las 68');
check('G20-2 · y deriva `produces` del catálogo, en las 68',
  CAPABILITY_CATALOG.every((c) => lineaDe(V, c.id)?.endsWith(`→ ${c.produces}`)),
  CAPABILITY_CATALOG.filter((c) => !lineaDe(V, c.id)?.endsWith(`→ ${c.produces}`)).map((c) => c.id).join(', ') || 'las 68');
check('hay UNA línea por capacidad y ni una de más',
  V.split('\n').filter((l) => /^ {2}\S+ — /.test(l)).length === CAPABILITY_CATALOG.length,
  `${V.split('\n').filter((l) => /^ {2}\S+ — /.test(l)).length} líneas · ${CAPABILITY_CATALOG.length} capacidades`);
check('y el caso que abrió todo esto se lee entero',
  lineaDe(V, 'vision.describe') === 'vision.describe — image → text'
  && lineaDe(V, 'text.generate') === 'text.generate — text → text',
  'de ahí sale que la receta necesita la mirada, sin que nadie lo escriba a mano');
check('la frase que explica la flecha está, y es UNA',
  V.split('\n').filter((l) => /solo puede beber de otro/.test(l)).length === 1,
  'lo escrito a mano es cómo se leen los datos, no los datos');

console.log('\n── B · No hay una segunda tabla, y se comprueba sobre el código ──');

const FUENTE = leer('functions/src/creator/prompts.ts');
const CODIGO = sinComentarios(FUENTE);
const literales = [...CODIGO.matchAll(/'([^'\n]*)'|`([^`\n]*)`/g)].map((m) => m[1] ?? m[2]).filter(Boolean);
/*
 * Una tabla escrita a mano sería un literal que nombra una capacidad Y dice de
 * qué clase es su material. Para que el guard no se muerda a sí mismo, se
 * quitan primero los ids del texto: `text.generate` LLEVA DENTRO la palabra
 * «text», y una búsqueda ingenua habría señalado la línea que solo pone un
 * ejemplo de repetir capacidad.
 */
const sospechosas = literales.filter((t) => {
  if (!IDS.some((id) => t.includes(id))) return false;
  const sinIds = IDS.reduce((s, id) => s.split(id).join(' '), t);
  return MODALIDADES.some((m) => new RegExp(`(^|[^a-z])${m}($|[^a-z])`).test(sinIds));
});
check('G20-3 · ningún literal del código dice qué clase de material toca una capacidad',
  sospechosas.length === 0,
  sospechosas.join(' | ') || 'cero: la compatibilidad no está escrita, se deriva');
check('y ni una sola PAREJA de capacidades aparece nombrada junta',
  literales.every((t) => IDS.filter((id) => t.includes(id)).length <= 1),
  literales.filter((t) => IDS.filter((id) => t.includes(id)).length > 1).join(' | ') || 'ninguna');
check('la única capacidad nombrada a mano lo es como EJEMPLO de repetirse, no de compatibilidad',
  igual(literales.filter((t) => IDS.some((id) => t.includes(id))).map((t) => IDS.filter((id) => t.includes(id))).flat(), ['text.generate'])
  && literales.some((t) => t.includes('text.generate') && t.includes('DOS pasos')),
  'si alguien añade otra, el check de arriba lo dirá');
check('no se creó ningún campo nuevo de contrato para esto',
  !/accepts|produces/.test(sinComentarios(leer('functions/src/creator/types.ts'))),
  'el catálogo ya lo tenía: se lee, no se transporta');

console.log('\n── C · Cambiar el catálogo cambia el vocabulario ──');

const entrada = CAPABILITY_CATALOG.find((c) => c.id === 'vision.describe');
const antesProduce = entrada.produces;
const antesAcepta = entrada.accepts;
let conOtroProduce = '';
let conOtroAcepta = '';
try {
  entrada.produces = 'music';
  conOtroProduce = lineaDe(vocabulario(), 'vision.describe');
  entrada.produces = antesProduce;
  entrada.accepts = ['video', 'doc'];
  conOtroAcepta = lineaDe(vocabulario(), 'vision.describe');
} finally {
  entrada.produces = antesProduce;
  entrada.accepts = antesAcepta;
}
check('G20-4 · si el catálogo cambia lo que DA, el vocabulario lo dice',
  conOtroProduce === 'vision.describe — image → music', conOtroProduce);
check('G20-4 · si cambia lo que RECIBE, también',
  conOtroAcepta === 'vision.describe — video+doc → text', conOtroAcepta);
check('y al devolver el catálogo a su sitio, el vocabulario vuelve solo',
  lineaDe(vocabulario(), 'vision.describe') === 'vision.describe — image → text',
  'no hay copia guardada en ningún lado: se lee cada vez');

console.log('\n── D · Lo que no está en el catálogo no entra ──');

const conInventada = vocabulario([...IDS, 'magia.total']);
check('G20-5 · una capacidad inventada no entra: se filtra DESDE el catálogo',
  !conInventada.includes('magia.total')
  && conInventada.split('\n').filter((l) => /^ {2}\S+ — /.test(l)).length === CAPABILITY_CATALOG.length,
  'la lista se construye recorriendo el catálogo, no lo que pida quien llama');
check('y pedir solo unas pocas da solo esas',
  igual(vocabulario(['text.generate', 'vision.describe']).split('\n').filter((l) => /^ {2}\S+ — /.test(l)).map((l) => l.trim()),
    ['text.generate — text → text', 'vision.describe — image → text']));
check('pedir SOLO una inventada no deja vocabulario a medias: no hay nada que decir',
  vocabulario(['magia.total']) === '',
  'sin capacidades reales no se manda media lista');

const modalidadesEnElTexto = [...new Set(
  V.split('\n').filter((l) => /^ {2}\S+ — /.test(l))
    .flatMap((l) => l.replace(/^ {2}\S+ — /, '').split(/ → |\+/).map((x) => x.trim())),
)].sort();
check('G20-6 · las modalidades del texto son EXACTAMENTE las que declara el catálogo',
  igual(modalidadesEnElTexto, MODALIDADES),
  modalidadesEnElTexto.join(', '));
check('y ninguna se inventa: quien llama no puede meter una',
  igual([...new Set(
    vocabulario(IDS).split('\n').filter((l) => /^ {2}\S+ — /.test(l))
      .flatMap((l) => l.replace(/^ {2}\S+ — /, '').split(/ → |\+/).map((x) => x.trim())),
  )].sort(), MODALIDADES),
  'el `expected` no aporta modalidades: solo dice QUÉ capacidades mirar');

console.log('\n── E · Lo que el modelo NO recibe ──');

const sistema = String(entradaDeEntender(esperadoCon(IDS), 'hola', 100)?.system ?? '');
check('G20-7 · ni un `providerId`', !/providerId|provider_id|"provider"/i.test(sistema));
check('G20-8 · ni un `modelId`, ni un nombre de modelo',
  !/modelId|model_id|gemini|seedance|elevenlabs|deepseek|flux/i.test(sistema));
check('G20-9 · y no se metió lógica de proveedor en el prompt',
  !/provider|adapter|router|engine|fallback|circuit/i.test(CODIGO.replace(/ProveedorDePensamiento|thinker/gi, ' ')),
  'esto junta vocabulario y estructura; elegir quién ejecuta sigue siendo del Router');
/*
 * ESTE GUARD APUNTA AL DINERO DE WEË, NO A LA PALABRA.
 *
 * Buscar /precio/ a secas señala dos cosas que están bien: la línea que le
 * PROHÍBE al modelo elegir precio, y la variante `transport`, que habla del
 * precio de un billete de tren. Lo que no puede llegarle es lo de dentro:
 * Credits, coste de proveedor, identificadores de trabajo o una cifra en dólares.
 */
check('tampoco el dinero de Weë ni los identificadores de dentro',
  !/creditsCharged|creditsEstimated|providerCost|jobId|attemptId|requestId|\bUSD\b/i.test(sistema)
  && !/\d+\s*Credits?\b/i.test(sistema)
  && !/\$\d/.test(sistema),
  'el «precio» que sí aparece es el de un billete de tren, y la línea que se lo prohibe');
check('y el prompt le sigue prohibiendo elegir proveedor, modelo o precio',
  /No elijas proveedor, modelo ni precio/.test(sistema),
  'la prohibición es parte del contrato, no ruido que haya que esconder');

console.log('\n── F · El canal de C27 sigue entero ──');

const ROUTABLES = CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id);
const leidos = interpretarPasos([
  { key: 'look', capability: 'vision.describe', needs: [{ from: 'user', modality: 'image', required: true }] },
  { key: 'recipe', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'look' }], input: { kind: 'recipe' } },
], { capabilities: IDS, variants: VARIANTES_DEL_CATALOGO });
check('G20-10 · un paso sigue pudiendo declarar de qué otro bebe',
  igual(leidos[1]?.needs, [{ from: 'upstream', modality: 'text', stepKey: 'look' }]),
  JSON.stringify(leidos[1]?.needs ?? null));

const plan = await crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: { record() {} }, now: () => 1000 })
  .planificar({
    contract: PLANNER_CONTRACT_VERSION,
    trace: { traceId: 'g20_0001', requestId: 'g20_0001', userId: 'acc_g20' },
    understanding: entendimientoParaPlanificar({
      version: 1, intent: 'create', confidence: 'high', goal: 'una receta',
      capability: 'text.generate', capabilities: ['vision.describe', 'text.generate'],
      steps: leidos, missing: [], assumptions: [],
      inputs: { text: 'qué cocino', attachments: [{ kind: 'image', assetId: 'as_nevera' }] },
      references: [], constraints: {}, needsPlanning: true,
    }),
  });
check('y sigue llegando al plan como `dependsOn`',
  plan.status === 'ready' && igual(plan.plan?.steps?.[1]?.dependsOn, ['s1-vision_describe']),
  plan.status === 'ready' ? JSON.stringify(plan.plan.steps[1].dependsOn ?? null) : plan.status);
check('el prompt sigue diciendo DÓNDE declararlo',
  /"needs"/.test(sistema) && /stepKey/.test(sistema));

console.log('\n── G · Lo que no se tocó ──');

check('el catálogo NO se editó para que esto cuadrara',
  CAPABILITY_CATALOG.length === 68
  && CAPABILITY_CATALOG.every((c) => Array.isArray(c.accepts) && typeof c.produces === 'string'),
  '68 entradas, cobertura completa: la auditoría no encontró ningún dato que faltara');
check('G19 congelado: las 53 variantes siguen con su significado',
  CAPABILITY_CATALOG.filter((c) => c.variants?.length).flatMap((c) => c.variants).length === 53
  && CAPABILITY_CATALOG.filter((c) => c.variants?.length).flatMap((c) => c.variants).every((v) => v.description));
check('el replanteamiento de G6 sigue abierto y sin tocar',
  /GAP MEDIDO . G6/.test(leer('functions/test/photo-canary.test.mjs')));
check('B2 no se cierra aquí: el canary de Chef/cook no se ha ejecutado',
  /No cierra B2/.test(leer('functions/test/encadenar-pasos.test.mjs')));
check('ni Router, ni Job, ni Gateway, ni Credits, ni plantillas',
  !/crearRegistro|Router|jobId/.test(CODIGO)
  && /template\.buildPlan\(goal, record\)/.test(leer('functions/src/creator/planner.ts')));
check('esta suite está en la cadena de `npm test`',
  /vocabulario-compatible\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
