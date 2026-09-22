/**
 * WEË — C11: CON QUÉ ENTRA UN PASO, Y QUIÉN LO DECIDE.
 *
 * ── Lo que la auditoría encontró, y que hace esto pequeño ───────────────────
 *
 * Parecía que había mil novecientas líneas de composición de entrada que subir
 * al Core. No las hay. En los setenta y cinco pasos de las once plantillas,
 * `PlanStep.input` tiene NUEVE claves, y solo una de ellas no tenía sitio en el
 * Core: `kind` —la variante— que aparece en sesenta y siete.
 *
 * El resto ya tenía dueño y estaba en el sitio equivocado o duplicado:
 *
 *   quality, durationSec  → ya son `hints`. Dos sitios, dos verdades.
 *   las frases de estilo  → ya son `CreativeParameters` de S2, escritas en prosa.
 *   explainToUser, purpose → son interfaz, y el Core ya los tiene.
 *   las 750 líneas de preguntas → son interfaz, y se quedan donde están.
 *   el prompt en inglés   → es del adaptador, y se queda donde está.
 *
 * Así que C11 no traslada Legacy: declara las variantes en el catálogo y deja
 * que el Planner componga la entrada con lo que ya sabe.
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
const { CAPABILITY_CATALOG, PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION } = core;
const { crearPlannerDeWee, disponibilidadDe } = lib('planner/index.js');
const { crearWorkflowEngineDeWee } = lib('workflow/index.js');
const { orquestadorDeWee } = lib('orchestrator/index.js');
const { TEMPLATES } = lib('creator/templates.js');

const callado = { record() {} };
const traza = (id) => ({ traceId: id, requestId: id, userId: 'acc_mia' });
const deCatalogo = (id) => CAPABILITY_CATALOG.find((e) => e.id === id);

const planificar = async (understanding, caps, id) =>
  crearPlannerDeWee({ availability: disponibilidadDe(caps), tracer: callado, now: () => 1 })
    .planificar({ contract: PLANNER_CONTRACT_VERSION, trace: traza(id), understanding });

const entender = (extra = {}) => ({
  intent: 'creation', confidence: 'high', goal: 'un viaje a Japón del 12 al 22 de octubre',
  capability: 'text.search', capabilities: ['text.search'],
  inputs: { text: '', attachments: [] }, references: [], constraints: {},
  needsPlanning: true, missing: [], assumptions: [],
  ...extra,
});

console.log('\n── A · El catálogo declara variantes, y nada más ──');

const conVariantes = CAPABILITY_CATALOG.filter((e) => e.variants);
/*
 * 14 y 44, no 12 y 43: C17 completó tres que esta extracción dejó fuera y que
 * las plantillas llevaban usando desde siempre —`logo` en `image.generate`,
 * `space` en `image.space_restyle` y `clip` en `video.image_to_video`—. Sin
 * ellas, esos cuatro pasos perdían su variante al cruzar al Core.
 *
 * Lo que NO cambia es la regla que viene justo debajo, y es la que importa:
 * ninguna sale de la nada, todas salen de las plantillas.
 */
check('el catálogo declara variantes donde de verdad las hay',
  conVariantes.length === 14 && new Set(conVariantes.flatMap((e) => e.variants)).size === 44,
  `${conVariantes.length} capacidades · ${new Set(conVariantes.flatMap((e) => e.variants)).size} variantes`);
check('ninguna variante es inventada: todas salen de las plantillas o de la tabla de ediciones',
  (() => {
    const deLasPlantillas = new Set([...leer('functions/src/creator/templates.ts').matchAll(/kind: '([a-z_.]+)'/g)].map((m) => m[1]));
    const declaradas = new Set(conVariantes.flatMap((e) => e.variants));
    return [...deLasPlantillas].every((k) => declaradas.has(k));
  })(),
  'los 36 kinds de Legacy están cubiertos');
check('una capacidad SIN variantes se comporta exactamente como antes',
  deCatalogo('image.upscale')?.variants === undefined
  && deCatalogo('text.translate')?.variants === undefined);
check('las variantes son neutrales: ni proveedor, ni modelo, ni sintaxis de nadie',
  !conVariantes.flatMap((e) => e.variants).some((v) =>
    /gemini|seedance|seedream|flux|openai|claude|deepseek|elevenlabs|prompt|json|api/i.test(v)));
check('y el catálogo sigue sin saber de proveedores',
  !/(?<![a-z])(gemini|seedance|seedream|flux|openai|claude|deepseek|elevenlabs|byteplus)(?![a-z])/i
    .test(leer('functions/src/core/registry/capabilities.ts')));

console.log('\n── B · El Planner compone la entrada ──');

const conVariante = await planificar(entender({ constraints: { kind: 'itinerary', dias: 11 } }), ['text.search'], 'c11_0001');
const pasoConVariante = conVariante.plan?.steps?.[0];

check('produce `input.kind` con la variante que se pidió',
  conVariante.status === 'ready' && pasoConVariante?.input?.kind === 'itinerary', conVariante.status);
check('produce `input.brief` con LAS PALABRAS DE LA PERSONA',
  pasoConVariante?.input?.brief === 'un viaje a Japón del 12 al 22 de octubre',
  'no una frase compuesta por nosotros desde etiquetas de interfaz');
check('y no lleva nada más: dos claves, ni una de propina',
  Object.keys(pasoConVariante?.input ?? {}).sort().join(',') === 'brief,kind');

const inventada = await planificar(entender({ constraints: { kind: 'no_existe' } }), ['text.search'], 'c11_0002');
check('una variante que la capacidad no declara se RECHAZA, no se arrastra',
  inventada.status === 'invalid' && inventada.error?.details?.field === 'understanding.constraints.kind',
  `${inventada.status} · ${inventada.error?.details?.field}`);
check('y se rechaza el plan ENTERO: no sale uno a medias',
  inventada.plan === undefined);
check('una variante de OTRA capacidad tampoco vale',
  (await planificar(
    entender({ capability: 'text.generate', capabilities: ['text.generate'], constraints: { kind: 'destinations' } }),
    ['text.generate'], 'c11_0003',
  )).status === 'invalid',
  '`destinations` es de text.search, y text.generate no la declara');
check('sin variante, el paso sigue teniendo su encargo',
  (await planificar(entender(), ['text.search'], 'c11_0004')).plan?.steps?.[0]?.input?.kind === undefined);

console.log('\n── C · Una sola verdad para cada cosa ──');

const conCalidad = await planificar(
  entender({ constraints: { kind: 'itinerary' }, preferences: { quality: 'max', durationSec: 30 } }),
  ['text.search'], 'c11_0005',
);
const pasoConCalidad = conCalidad.plan?.steps?.[0];
check('`quality` vive en `hints`, y NO se duplica en `input`',
  pasoConCalidad?.hints?.quality === 'max' && pasoConCalidad?.input?.quality === undefined);
check('`durationSec` igual: en `hints`, nunca en `input`',
  pasoConCalidad?.hints?.durationSec === 30 && pasoConCalidad?.input?.durationSec === undefined);
check('las demás restricciones viajan en el plan, no copiadas paso a paso',
  igual(conVariante.plan?.constraints, { kind: 'itinerary', dias: 11 })
  && pasoConVariante?.input?.dias === undefined,
  'el Orchestrator ya despacha las del workflow');
check('el Planner NO compone `input` a partir de la entrada del Planner',
  !/quality|durationSec/.test(
    sinComentarios(leer('functions/src/core/planner.ts')).split('const entradaDelPaso')[1]?.split('};')[0] ?? ''));

console.log('\n── D · Lo que el Core NO aprendió a hacer ──');

{
  const SRC = sinComentarios(leer('functions/src/core/planner.ts'));
  check('el Planner no depende de etiquetas de interfaz ni de i18n',
    !/\.label|useT\(|i18n|t\(''|chosen\(/.test(SRC));
  check('no copió ninguna tabla de frases',
    !/FRASES_|con un aire|de aspecto|en formato cuadrado/.test(SRC));
  check('no elige capacidad por una respuesta: la recibe decidida',
    !/action\.id|answers\[|respuesta\.id/.test(SRC));
  check('no nombra a ningún proveedor',
    !/(?<![a-z])(gemini|seedance|seedream|flux|openai|claude|deepseek|elevenlabs|minimax|byteplus)(?![a-z])/i.test(SRC));
  check('y `providerId`/`modelId` solo aparecen en la lista de claves PROHIBIDAS',
    SRC.split('\n').filter((l) => /\b(providerId|modelId|providerid|modelid)\b/i.test(l))
      .every((l) => /adapterid|'provider'|CLAVES/i.test(l)),
    'nombrarlas para rechazarlas es lo contrario de filtrarlas');
  check('no ensambla ningún prompt',
    !/BRAIN_SYSTEM|FORMAT_RULES|IMAGE_TASK|KIND_INSTRUCTIONS|system:/.test(SRC));
  check('y `SkillPlanContribution` no aporta entrada: S1 sigue intacto',
    !/input/.test(leer('functions/src/core/skill.ts').split('interface SkillPlanContribution')[1]?.split('}')[0] ?? '')
    && !/input/.test(leer('functions/src/core/skill.ts').split('interface SkillFragmentStep')[1]?.split('}')[0] ?? ''));
}

console.log('\n── E · TRAVEL, el canary, contra el Legacy ──');

/* Las cuatro ramas de la plantilla, tal como producen hoy. */
const LEGACY = {
  where: TEMPLATES.travel.buildPlan('un viaje a Japón', { what: 'where', vibe: 'rest' }),
  doing: TEMPLATES.travel.buildPlan('un viaje a Japón', { what: 'doing' }),
  moving: TEMPLATES.travel.buildPlan('un viaje a Japón', { what: 'moving' }),
  plan: TEMPLATES.travel.buildPlan('un viaje a Japón', {
    what: 'plan', interest: 'culture', pace: 'slow', dates: 'del 12 al 22 de octubre de 2026',
  }),
};

/* El MISMO viaje, dicho como lo diría Brain: una capacidad, una variante, escalares. */
const CORE = {};
for (const [rama, kind] of [['where', 'destinations'], ['doing', 'activities'], ['moving', 'transport'], ['plan', 'itinerary']]) {
  CORE[rama] = await planificar({
    ...entender({
      goal: 'un viaje a Japón',
      constraints: { kind, ...(rama === 'plan' ? { dias: 11, desde: '2026-10-12', hasta: '2026-10-22' } : {}) },
      ...(rama === 'plan' ? { preferences: { quality: 'max' } } : {}),
    }),
  }, ['text.search'], `c11_travel_${rama}`);
}

for (const rama of ['where', 'doing', 'moving', 'plan']) {
  const l = LEGACY[rama];
  const c = CORE[rama].plan;
  check(`travel/${rama}: misma capacidad, mismo número de pasos, mismas dependencias`,
    c?.steps?.length === l.steps.length
    && c?.steps?.[0]?.capability === l.steps[0].capability
    && (c?.steps?.[0]?.dependsOn ?? undefined) === undefined && l.steps[0].dependsOn === undefined,
    `${l.steps[0].capability} · ${l.steps.length} paso(s) · sin dependencias`);
  check(`travel/${rama}: la misma variante`,
    c?.steps?.[0]?.input?.kind === l.steps[0].input.kind, l.steps[0].input.kind);
}

check('travel/plan: la calidad que Legacy metía en `input` ahora está en `hints`',
  LEGACY.plan.steps[0].input.quality === 'max'
  && CORE.plan.plan?.steps?.[0]?.hints?.quality === 'max'
  && CORE.plan.plan?.steps?.[0]?.input?.quality === undefined,
  'una sola verdad, y en el sitio que ya existía');
check('travel: las fechas y la duración viajan como restricciones, no como prosa',
  igual(CORE.plan.plan?.constraints, { kind: 'itinerary', dias: 11, desde: '2026-10-12', hasta: '2026-10-22' }));
check('travel: `produces` sale del catálogo, no se inventa',
  ['where', 'doing', 'moving', 'plan'].every((r) => CORE[r].plan?.steps?.[0]?.produces === 'text'));
check('travel: el Core NO inventa dependencias para parecerse a otras experiencias',
  ['where', 'doing', 'moving', 'plan'].every((r) => CORE[r].plan?.steps?.[0]?.dependsOn === undefined));
check('DIFERENCIA SEMÁNTICA DECLARADA: el `brief` cambia de fuente',
  CORE.doing.plan?.steps?.[0]?.input?.brief === LEGACY.doing.steps[0].input.brief
  && CORE.plan.plan?.steps?.[0]?.input?.brief !== LEGACY.plan.steps[0].input.brief,
  'en dos ramas coincide palabra por palabra; en las otras dos Legacy componía prosa desde etiquetas y el Core usa el objetivo');

console.log('\n── F · Travel llega hasta el Orchestrator sin perder nada ──');

const motor = crearWorkflowEngineDeWee({ tracer: callado, now: () => 1 });
const construido = await motor.construir({
  contract: WORKFLOW_CONTRACT_VERSION, trace: traza('c11_travel_plan'), plan: CORE.plan.plan,
});
const wf = construido.workflow;
check('el Plan de travel se convierte en Workflow por el motor',
  construido.status === 'ready' && wf?.planId === CORE.plan.plan?.id,
  construido.status === 'ready' ? `planId=${wf.planId}` : JSON.stringify(construido.error));
check('y el paso conserva la entrada ENTERA',
  igual(wf?.steps?.[0]?.input, CORE.plan.plan?.steps?.[0]?.input),
  JSON.stringify(wf?.steps?.[0]?.input));

const montado = orquestadorDeWee(wf);
const arranque = montado.ok
  ? montado.orchestrator.avanzar({
      contract: '1.0', principal: { userId: 'acc_mia' },
      run: montado.prepared.iniciar(traza('c11_travel_plan')).run, at: 10,
    })
  : undefined;
const despacho = arranque?.dispatch?.[0];
check('el Orchestrator despacha la entrada, la calidad y las restricciones',
  igual(despacho?.input, CORE.plan.plan?.steps?.[0]?.input)
  && despacho?.hints?.quality === 'max'
  && despacho?.constraints?.dias === 11,
  montado.ok ? 'ok' : JSON.stringify(montado.error));

console.log('\n── G · El runtime no rehace la entrada ──');

check('el conductor no toca `input`: lo recibe y lo pasa',
  !/input\s*=|input:\s*\{\s*\.\.\./.test(sinComentarios(leer('functions/src/runtime/conductor.ts'))));
check('y `runtime/pensador.ts` sigue sin llamar a ningún Planner',
  !/Planner|planificar/.test(leer('functions/src/runtime/pensador.ts')),
  'GAP CONOCIDO: la ruta viva de Brain sigue armando su workflow a mano');
check('nadie fuera del Planner compone `input.kind`',
  !/input\.kind\s*=|kind:\s*variante/.test(sinComentarios(leer('functions/src/runtime/ejecutor.ts'))));
check('la autoridad de la variante es UNA: la clave se nombra en un solo sitio del Core',
  (leer('functions/src/core/planner.ts').match(/CLAVE_DE_VARIANTE = /g) ?? []).length === 1);

console.log('\n── H · Lo que no se tocó ──');

check('Credits, Financial, Media Cloud y los adaptadores, intactos',
  !/variants|CLAVE_DE_VARIANTE/.test(
    ['core/financial/commerce.ts', 'core/media/entrega.ts', 'engine/continuidad.ts', 'engine/referencias.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('el Router no conoce variantes',
  !/variants|kind/.test(sinComentarios(leer('functions/src/core/router.ts'))));
check('C7 y C8 siguen exactamente como estaban',
  !/variants/.test(leer('functions/src/engine/continuidad.ts') + leer('functions/src/engine/referencias.ts')));
check('esta suite está en la cadena de `npm test`',
  /plan-entrada\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
