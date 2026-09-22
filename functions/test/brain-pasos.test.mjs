/**
 * WEË — C19: BRAIN DICE LOS PASOS.
 *
 * ── Lo que faltaba ──────────────────────────────────────────────────────────
 *
 * Brain recibía los 68 identificadores del catálogo, así que sabía que existe
 * `text.generate` — pero no que `polish` es una manera de pedirla. Sin ese
 * vocabulario no podía decir QUÉ hace cada paso, y las 35 secuencias de
 * capacidades seguían escritas a mano en las plantillas.
 *
 * Ahora el vocabulario de variantes se le pasa DESDE EL CATÁLOGO —14 capacidades,
 * 53 variantes— y el entendimiento admite `steps`.
 *
 * ── LO QUE ESTA SUITE NO PRUEBA, y hay que decirlo ──────────────────────────
 *
 * No prueba que el modelo acierte. Medir eso exige llamar a un proveedor de
 * verdad, y esta fase tiene prohibido hacerlo. Lo que se prueba aquí es el
 * contrato: que si el modelo dice los pasos bien, llegan enteros hasta el plan;
 * que si los dice mal, se descartan en vez de colarse; y que todo lo que no le
 * corresponde decir —proveedor, modelo, precio, permisos— no cabe.
 *
 * La puntería del modelo se mide el día del canary real, y no antes.
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
const { CAPABILITY_CATALOG, VARIANTES_DEL_CATALOGO, interpretarPasos, PLANNER_CONTRACT_VERSION, INTENCIONES } = core;
const { crearPlannerDeWee, disponibilidadDe, entendimientoParaPlanificar } = lib('planner/index.js');
const { TEMPLATES } = lib('creator/templates.js');
const { BRAIN_UNDERSTAND_SYSTEM } = lib('creator/prompts.js');

const ROUTABLES = CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id);
const ESPERADO = {
  intents: INTENCIONES,
  capabilities: CAPABILITY_CATALOG.map((c) => c.id),
  experiences: ['travel', 'photo', 'writer'],
  variants: VARIANTES_DEL_CATALOGO,
};

/* Un pensador de mentira que devuelve el JSON que devolvería el modelo. */
const pensadorQue = (json) => ({
  visto: null,
  async pensar(req) {
    this.visto = req;
    return {
      response: { kind: 'text', content: JSON.stringify(json), actual: { provider: { lines: [], usd: 0 }, latencyMs: 1 }, model: 'de-prueba' },
      usage: { totalTokens: 9 },
    };
  },
});
const entender = async (json, mensaje = 'lo que sea') => {
  const pensador = pensadorQue(json);
  const cerebro = core.crearBrain({
    thinker: pensador, tracer: { async record() {} }, now: () => 1000,
    experiences: ['travel', 'photo', 'writer', 'business', 'chef', 'brain'],
  });
  const r = await cerebro.entender({
    contract: '1.0',
    trace: { traceId: 'c19_0001', requestId: 'c19_0001', userId: 'acc_mia', sessionId: 'chat_c19', runId: 'chat_c19', stepId: 'm_0001' },
    message: { text: mensaje },
    options: { mode: 'understand' },
  });
  return { r, pensador };
};
const planear = (u) => crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: { record() {} }, now: () => 1000 })
  .planificar({ contract: PLANNER_CONTRACT_VERSION, trace: { traceId: 'c19_0001', requestId: 'c19_0001', userId: 'acc_mia' }, understanding: entendimientoParaPlanificar(u) });

console.log('\n── A · El vocabulario sale del catálogo, y de ningún otro sitio ──');

check('C19 · 14 capacidades exponen variantes, 53 en total',
  Object.keys(VARIANTES_DEL_CATALOGO).length === 14
  && Object.values(VARIANTES_DEL_CATALOGO).reduce((a, v) => a + v.length, 0) === 53,
  `${Object.keys(VARIANTES_DEL_CATALOGO).length} capacidades · ${Object.values(VARIANTES_DEL_CATALOGO).reduce((a, v) => a + v.length, 0)} variantes`);
check('es una PROYECCIÓN del catálogo: no hay segundo listado',
  Object.entries(VARIANTES_DEL_CATALOGO).every(([id, vs]) =>
    igual(vs, CAPABILITY_CATALOG.find((c) => c.id === id).variants)),
  'cambiar el catálogo cambia lo que Brain sabe');
check('C19-F1 · y llega al modelo con el resto del vocabulario',
  (await entender({ intent: 'creation', goal: 'x' })).pensador.visto.expected?.variants !== undefined);
check('pero NO le llega nada de proveedores, modelos ni precios',
  await (async () => {
    const { pensador } = await entender({ intent: 'creation', goal: 'x' });
    const visto = JSON.stringify(pensador.visto.expected);
    return !/provider|model|adapter|price|credit|usd/i.test(visto);
  })());

console.log('\n── B · Lo que el modelo dice, revisado ──');

const tres = interpretarPasos([
  { key: 'borrador', capability: 'text.generate', input: { kind: 'copy', brief: 'el primer borrador' } },
  { key: 'pulir', capability: 'text.generate', input: { kind: 'polish', brief: 'dejarlo fino' } },
], ESPERADO);
check('C19-F3 · la MISMA capacidad dos veces son dos pasos',
  tres.length === 2 && tres[0].input.kind === 'copy' && tres[1].input.kind === 'polish',
  JSON.stringify(tres.map((s) => s.input.kind)));
check('C19-F11 · y no se deduplican: aquí no hay ningún `Set`',
  !/new Set\(/.test(
    (sinComentarios(leer('functions/src/core/brain.ts')).match(/const interpretarPasos[\s\S]*?\n\};/) ?? [''])[0]
      .replace('const claves = new Set<string>();', '')),
  '`claves` es para que no se repitan los nombres, no las capacidades');
check('C19-F2 · una variante que esa capacidad NO declara se descarta',
  igual(interpretarPasos([{ capability: 'text.generate', input: { kind: 'restore' } }], ESPERADO),
    [{ key: 'p1', capability: 'text.generate' }]),
  '`restore` es de `image.edit`: se pierde la variante, no el paso');
check('una capacidad inventada NO es un paso',
  interpretarPasos([{ capability: 'text.inventada', input: { kind: 'copy' } }], ESPERADO).length === 0);
check('C19-F5/F14 · un proveedor dentro de un paso no viaja',
  !JSON.stringify(interpretarPasos([{ capability: 'text.generate', providerId: 'gemini', modelId: 'x' }], ESPERADO))
    .match(/gemini|modelId/));
check('la clave la pone Weë: si el modelo repite un nombre, no se pisan',
  (() => {
    const r = interpretarPasos([
      { key: 'a', capability: 'text.generate' }, { key: 'a', capability: 'text.generate' },
    ], ESPERADO);
    return r.length === 2 && new Set(r.map((s) => s.key)).size === 2;
  })());
check('y si no dice ninguno, se le pone uno legible',
  interpretarPasos([{ capability: 'text.generate' }], ESPERADO)[0].key === 'p1');

console.log('\n── C · De la respuesta del modelo al entendimiento ──');

const { r: conPasos } = await entender({
  intent: 'creation', confidence: 'high', goal: 'un viaje a Japón',
  capability: 'text.search', capabilities: ['text.search'],
  steps: [
    { key: 'donde', capability: 'text.search', input: { kind: 'destinations', brief: 'a qué ciudades ir' } },
    { key: 'que_hacer', capability: 'text.search', input: { kind: 'activities', brief: 'qué ver' } },
    { key: 'moverse', capability: 'text.search', input: { kind: 'transport', brief: 'cómo moverse' } },
    { key: 'plan', capability: 'text.search', input: { kind: 'itinerary', brief: 'el día a día' } },
  ],
});
check('C19-F13 · un solo viaje al modelo: los pasos salen del MISMO entendimiento',
  conPasos.status !== 'failed' && conPasos.understanding.steps?.length === 4,
  conPasos.understanding?.steps?.length + ' pasos');
check('`capabilities` sigue siendo el conjunto, y `steps` las instancias',
  igual(conPasos.understanding.capabilities, ['text.search'])
  && conPasos.understanding.steps.length === 4);
check('sin pasos, el entendimiento sale como siempre: `steps` ausente',
  (await entender({ intent: 'creation', confidence: 'high', goal: 'algo', capability: 'text.generate' })).r.understanding.steps === undefined,
  'C17/G16 y todo lo de antes siguen funcionando igual');

console.log('\n── D · Los canarios, hasta el plan ──');

const travel = await planear(conPasos.understanding);
check('C19 · TRAVEL: cuatro instancias distintas llegan al plan',
  travel.status === 'ready' && travel.plan.steps.length === 4
  && igual(travel.plan.steps.map((s) => s.input.kind), ['destinations', 'activities', 'transport', 'itinerary']),
  travel.status === 'ready' ? JSON.stringify(travel.plan.steps.map((s) => s.id)) : travel.status);

const { r: photoU } = await entender({
  intent: 'edit', confidence: 'high', goal: 'restaura esta foto de mi abuela manteniendo su identidad',
  capability: 'image.edit', capabilities: ['vision.describe', 'image.edit'],
  steps: [
    { key: 'mirar', capability: 'vision.describe', input: { kind: 'describe', brief: 'qué se ve y en qué estado está' } },
    { key: 'restaurar', capability: 'image.edit', input: { kind: 'restore', brief: 'reparar el daño sin cambiar a la persona' } },
  ],
  continuity: { preserve: ['identity.face'], strength: 'strict', subjects: ['abuela'] },
  creative: { version: 1, lighting: { type: 'natural' } },
}, 'restaura esta foto de mi abuela');
const photoPlan = await planear({
  ...photoU.understanding,
  steps: photoU.understanding.steps.map((s) => (s.capability === 'vision.describe'
    ? { ...s, needs: [{ from: 'user', modality: 'image', required: true }] }
    : { ...s, needs: [{ from: 'user', modality: 'image', required: true }, { from: 'upstream', stepKey: 'mirar', modality: 'text' }] })),
  inputs: { text: 'restaura', attachments: [{ kind: 'image', assetId: 'as_abuela' }] },
});
check('C19 · PHOTO: mirar → restaurar, cada paso con su variante y con la foto',
  photoPlan.status === 'ready'
  && igual(photoPlan.plan?.steps?.map((s) => s.input.kind), ['describe', 'restore'])
  && igual(photoPlan.plan?.steps?.[0]?.uses, [0]) && igual(photoPlan.plan?.steps?.[1]?.uses, [0]),
  photoPlan.status === 'ready' ? JSON.stringify(photoPlan.plan.steps.map((s) => s.id)) : photoPlan.status);
check('lo creativo que declaró el modelo SÍ llega al paso',
  photoPlan.plan?.steps?.[1]?.hints?.creative?.lighting?.type === 'natural');
/*
 * ── G17, ENCONTRADO AQUÍ Y NO ARREGLADO AQUÍ ────────────────────────────────
 *
 * La continuidad que declara el modelo se LEE (`interpretarEntendimiento` la
 * valida entera con su contrato) y después el ensamblado del entendimiento no
 * la copia. Sale validada y no llega a ningún sitio.
 *
 * Es de antes de C19 —lo creativo sí se copia, y la continuidad nunca— y no se
 * toca aquí porque C19 es B2. El día que se arregle, esta comprobación falla,
 * que es lo que se quiere de ella.
 */
check('G17 (MEDIDO, NO ARREGLADO) · la continuidad se valida y se pierde en el ensamblado',
  photoU.understanding.continuity === undefined
  && photoPlan.plan?.steps?.[1]?.hints?.continuity === undefined,
  'el modelo la dijo, el lector la aceptó, y no viaja');
check('las necesidades NO las dice el modelo: se las pone quien sabe de material',
  photoU.understanding.steps.every((s) => s.needs === undefined),
  'C19 es capacidad + variante; de dónde sale el material es otra cosa');

for (const [titulo, kinds] of [
  ['writer  copy → polish', ['copy', 'polish']],
  ['business analysis → copy → published', ['analysis', 'copy', 'published']],
  ['brain   analysis → answer', ['analysis', 'answer']],
  ['chef    menu → shopping', ['menu', 'shopping']],
]) {
  const { r } = await entender({
    intent: 'creation', confidence: 'high', goal: 'g', capability: 'text.generate', capabilities: ['text.generate'],
    steps: kinds.map((k, i) => ({ key: `p${i + 1}`, capability: 'text.generate', input: { kind: k } })),
  });
  const plan = await planear(r.understanding);
  check(`C19-F3 · ${titulo}`,
    plan.status === 'ready' && plan.plan.steps.length === kinds.length
    && igual(plan.plan.steps.map((s) => s.input.kind), kinds),
    JSON.stringify(plan.plan?.steps?.map((s) => s.id)));
}

console.log('\n── E · Las 35 formas: ¿cabe cada una en el contrato? ──');

/*
 * Se comprueba lo ÚNICO que se puede comprobar sin llamar a un proveedor: que
 * la capacidad y la variante de cada paso real de Legacy son expresables. Lo
 * que el modelo acierte es otra pregunta, y se mide con un canary de verdad.
 */
const respuestaBase = (t) => Object.fromEntries((t.questions ?? []).map((q) => [q.id, q.options?.[0]?.id ?? '']));
const FORMAS = [];
for (const [exp, t] of Object.entries(TEMPLATES)) {
  const b = respuestaBase(t);
  const vistas = new Map();
  const probar = (respuestas) => {
    let p;
    try { p = t.buildPlan('un encargo de ejemplo', respuestas); } catch { return; }
    const clave = p.steps.map((s) => s.capability).join('>');
    if (!vistas.has(clave)) vistas.set(clave, { exp, steps: p.steps });
  };
  probar(b);
  for (const q of (t.questions ?? [])) for (const o of (q.options ?? [])) probar({ ...b, [q.id]: o.id });
  FORMAS.push(...vistas.values());
}
let exactas = 0, sinVariante = 0, pasosTotales = 0, conKind = 0;
const perdidas = [];
for (const f of FORMAS) {
  const comoLoDiriaElModelo = f.steps.map((s) => ({
    key: s.id, capability: s.capability,
    ...(s.input?.kind ? { input: { kind: String(s.input.kind) } } : {}),
  }));
  const leidos = interpretarPasos(comoLoDiriaElModelo, ESPERADO);
  pasosTotales += f.steps.length;
  let bien = leidos.length === f.steps.length;
  for (let i = 0; i < f.steps.length; i++) {
    const esperado = f.steps[i].input?.kind;
    if (esperado === undefined) { sinVariante++; continue; }
    if (leidos[i]?.input?.kind === esperado) conKind++;
    else { bien = false; perdidas.push(`${f.exp} ${f.steps[i].id}(${f.steps[i].capability}) kind=${esperado}`); }
  }
  if (bien) exactas++;
}
check('C19 · las 35 formas caben: 74 pasos, ninguna capacidad se pierde',
  FORMAS.length === 35 && pasosTotales === 74 && exactas === 35,
  `${exactas}/35 exactas`);
check('y las 67 variantes de Legacy son expresables',
  conKind === 67 && sinVariante === 7 && perdidas.length === 0,
  perdidas.length ? perdidas.slice(0, 3).join(' · ') : `${conKind} con variante · ${sinVariante} sin ella`);

console.log('\n── F · La frontera ──');

const prompt = String(BRAIN_UNDERSTAND_SYSTEM);
check('C19-F8/F9 · el Core no importa plantillas ni prompts de Legacy',
  !/creator\/templates|creator\/prompts|creator\/inputs|from '\.\.\/creator/.test(
    ['core/brain.ts', 'core/planner.ts', 'core/registry/capabilities.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
check('el prompt no copia ni una instrucción de las plantillas',
  !/Escribe una receta|Termina con una línea|Diseña la campaña|Armar el menú|FRASES_DESIGN/.test(prompt));
check('ni copia la lista de variantes: le llega del catálogo',
  !['destinations', 'activities', 'itinerary', 'restore', 'retouch', 'skincare', 'facestyle', 'shopping']
    .some((v) => prompt.includes(v)),
  '`copy` y `polish` aparecen como ejemplo semántico, que es lo único autorizado');
check('C19-F10 · no hay 35 ramas escritas en Brain',
  !/action\.id|what\.id|experienceId ===/.test(sinComentarios(leer('functions/src/core/brain.ts'))));
check('C19-F6/F7 · dinero y permisos siguen sin caber',
  ['credits', 'maxCredits', 'balance', 'saldo', 'admin', 'isAdmin', 'permissions', 'scopes']
    .every((k) => core.claveDeSeleccion(k)));
check('C19-F15 · Brain no ejecuta nada',
  !/crearTrabajo|atenderEntrega|fetch\(|spendCredits/.test(sinComentarios(leer('functions/src/core/brain.ts'))));
check('C19-F12 · el Planner sigue rechazando una variante que no es de esa capacidad',
  await (async () => {
    const r = await planear({
      intent: 'creation', confidence: 'high', goal: 'g', capability: 'text.generate', capabilities: ['text.generate'],
      steps: [{ key: 'a', capability: 'text.generate', input: { kind: 'restore' } }],
      inputs: { text: '', attachments: [] }, references: [], constraints: {},
      needsPlanning: true, missing: [], assumptions: [],
    });
    return r.status === 'invalid' && r.error?.details?.reason === 'unknown_variant';
  })(),
  'Brain descarta y el Planner rechaza: dos redes, no una');
check('C19 · el seam de producción NO se ha abierto',
  /template\.buildPlan\(goal, record\)/.test(leer('functions/src/creator/planner.ts'))
  && !/crearPlannerDeWee/.test(leer('functions/src/creator/planner.ts')),
  'B3 sigue abierto a propósito');
check('esta suite está en la cadena de `npm test`',
  /brain-pasos\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
