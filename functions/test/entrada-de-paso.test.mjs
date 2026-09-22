/**
 * WEË — C17: CADA PASO DICE LO SUYO.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * El plan sabía decir «esto va de restaurar» UNA vez, y esa una valía para
 * todos sus pasos. Y casi nunca es verdad: «escribe el menú, mira los precios,
 * haz la lista» son tres pasos que hacen tres cosas, y los tres recibían la
 * misma variante y la misma frase —el objetivo entero de la persona, copiado
 * tal cual—.
 *
 * Medido sobre los 65 pasos comparables de las experiencias: 64 perdían su
 * variante y los 65 recibían el mismo `brief`.
 *
 * ── Lo que NO se ha hecho ───────────────────────────────────────────────────
 *
 * No hay motor de prompts. `brief` es una frase que dice QUÉ hace el paso; la
 * instrucción que lee un proveedor se sigue armando abajo, en ejecución. Y el
 * Core sigue sin importar una sola plantilla.
 *
 * Tampoco se ha copiado el resto del input de Legacy. `count`, `focus`,
 * `voice`, `mood`, `genre`, `quality`, `durationSec`, `aspectRatio` y
 * `resolution` no son lo que un paso HACE: son cuánto, cómo o con qué se
 * ejecuta. Cada uno tiene su dueño, y los que no lo tienen se dicen.
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
const { PLANNER_CONTRACT_VERSION, CAPABILITY_CATALOG } = core;
const { crearPlannerDeWee, disponibilidadDe } = lib('planner/index.js');
const { TEMPLATES } = lib('creator/templates.js');
const { pasosParaElCore } = lib('creator/necesidades.js');

const ROUTABLES = CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id);
const CAT = (id) => CAPABILITY_CATALOG.find((c) => c.id === id);
const callado = { record() {} };

const planear = (steps, extra = {}) => {
  const caps = Array.isArray(steps) ? steps.map((s) => s?.capability).filter((c) => typeof c === 'string') : [];
  return crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: callado, now: () => 1000 })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION, trace: { traceId: 'c17', requestId: 'c17', userId: 'acc_mia' },
      understanding: {
        intent: 'creation', confidence: 'high', goal: 'escribe el menú y luego púlelo',
        capability: caps[0], capabilities: [...new Set(caps)], steps,
        inputs: { text: '', attachments: [] }, references: [], constraints: {},
        needsPlanning: true, missing: [], assumptions: [], ...extra,
      },
    });
};
const razon = (r) => r.error?.details?.reason;

/* Las 35 formas reales, como en C15d. */
const respuestaBase = (t) => Object.fromEntries((t.questions ?? []).map((q) => [q.id, q.options?.[0]?.id ?? '']));
const FORMAS = [];
for (const [exp, t] of Object.entries(TEMPLATES)) {
  const b = respuestaBase(t);
  const vistas = new Map();
  const probar = (respuestas, rama) => {
    let p;
    try { p = t.buildPlan('un encargo de ejemplo', respuestas); } catch { return; }
    const clave = p.steps.map((s) => s.capability).join('>');
    if (!vistas.has(clave)) vistas.set(clave, { exp, rama, steps: p.steps });
  };
  probar(b, '(defecto)');
  for (const q of (t.questions ?? [])) for (const o of (q.options ?? [])) probar({ ...b, [q.id]: o.id }, `${q.id}=${o.id}`);
  FORMAS.push(...vistas.values());
}
const planDeLaForma = (f) => planear(pasosParaElCore(f.steps).steps, {
  inputs: { text: '', attachments: pasosParaElCore(f.steps).steps.some((s) => (s.needs ?? []).some((x) => x.from === 'user')) ? [{ kind: 'image', assetId: 'as_x' }] : [] },
});

console.log('\n── A · Dos pasos de la misma capacidad, dos cosas distintas ──');

const menu = await planear([
  { key: 'menu', capability: 'text.generate', input: { kind: 'menu', brief: 'el menú de la semana' } },
  { key: 'pulir', capability: 'text.generate', input: { kind: 'polish', brief: 'pulir el menú anterior' }, needs: [{ from: 'upstream', stepKey: 'menu', modality: 'text' }] },
]);
check('C17-F1 · dos `text.generate` conservan variantes DISTINTAS',
  menu.status === 'ready'
  && menu.plan.steps[0].input.kind === 'menu' && menu.plan.steps[1].input.kind === 'polish',
  JSON.stringify(menu.plan?.steps?.map((s) => s.input)));
check('C17-F3 · el segundo no hereda nada del primero',
  menu.plan.steps[0].input.brief === 'el menú de la semana'
  && menu.plan.steps[1].input.brief === 'pulir el menú anterior');
check('C17-F14 · y siguen siendo dos pasos con identidad propia',
  new Set(menu.plan.steps.map((s) => s.id)).size === 2);
check('C17-F2 · la variante NO sale de un `constraints.kind` de plan',
  await (async () => {
    const r = await planear([
      { key: 'a', capability: 'text.generate', input: { kind: 'menu' } },
      { key: 'b', capability: 'text.generate' },
    ], { constraints: { kind: 'recipe' } });
    return r.plan?.steps?.[0]?.input?.kind === 'menu' && r.plan?.steps?.[1]?.input?.kind === 'recipe';
  })(),
  'el que declara gana; el que calla sigue cogiendo la del plan, como antes');
check('C17-F21 · y el plan NO puede pisar lo que dijo el paso',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate', input: { kind: 'polish' } }], { constraints: { kind: 'recipe' } });
    return r.plan?.steps?.[0]?.input?.kind === 'polish';
  })());

console.log('\n── B · La frase deja de ser el objetivo de todos ──');

const chef = FORMAS.find((f) => f.exp === 'chef' && f.steps.some((s) => s.id === 'prices'));
const chefPlan = await planDeLaForma(chef);
check('C17-F4 · Chef/menú: tres pasos, tres briefs distintos',
  new Set(chefPlan.plan.steps.map((s) => s.input.brief)).size === 3,
  chefPlan.plan.steps.map((s) => s.input.kind).join(' · '));
check('y ninguno es el objetivo copiado',
  chefPlan.plan.steps.every((s) => s.input.brief !== 'un encargo de ejemplo'));
check('sin frase declarada, se sigue usando el objetivo: no se inventa nada',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate' }]);
    return r.plan.steps[0].input.brief === 'escribe el menú y luego púlelo';
  })());

console.log('\n── C · Las 35 formas ──');

let conKind = 0, conBrief = 0, pasos = 0, briefsPropios = 0;
for (const f of FORMAS) {
  const r = await planDeLaForma(f);
  if (r.status !== 'ready') continue;
  for (let i = 0; i < r.plan.steps.length; i++) {
    pasos++;
    const legacy = f.steps[i].input ?? {};
    const core = r.plan.steps[i].input ?? {};
    if (legacy.kind !== undefined && core.kind === legacy.kind) conKind++;
    if (core.brief !== undefined) conBrief++;
    if (legacy.brief !== undefined && core.brief === legacy.brief) briefsPropios++;
  }
}
check('C17-F15/F16 · la variante de Legacy llega al Core en 64 de los 65 pasos',
  conKind === 64 && pasos === 65,
  `${conKind}/${pasos} · el que falta no tiene variante en Legacy tampoco`);
/*
 * 47, no 52: Legacy escribe 52 frases propias en sus 74 pasos, pero cinco
 * viven en las tres formas de Weë Music que hoy no tiene quien sirva. De los
 * 65 pasos que llegan a plan, las 47 que existen llegan enteras.
 */
check('y la frase propia de Legacy llega en los 47 pasos servibles que la tienen',
  briefsPropios === 47 && conBrief === 65,
  `${briefsPropios} briefs propios · ${conBrief} pasos con frase`);

console.log('\n── D · El catálogo sigue mandando sobre las variantes ──');

check('C17-F5 · una variante declarada de OTRA capacidad se rechaza',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate', input: { kind: 'restore' } }]);
    return r.status === 'invalid' && razon(r) === 'unknown_variant';
  })(),
  '`restore` es de `image.edit`, no de escribir');
check('C17-F6 · una variante inventada se rechaza',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate', input: { kind: 'inventada' } }]);
    return r.status === 'invalid' && razon(r) === 'unknown_variant';
  })());
check('las variantes siguen viviendo SOLO en el catálogo',
  CAPABILITY_CATALOG.reduce((a, c) => a + (c.variants ?? []).length, 0) === 53
  && !/variants/.test(sinComentarios(leer('functions/src/core/brain.ts'))),
  '53 tras completar las 3 que la extracción de C11 dejó fuera');
check('y las 3 que faltaban son las que Legacy usaba y el Core rechazaba',
  CAT('image.generate').variants.includes('logo')
  && igual(CAT('image.space_restyle').variants, ['space'])
  && igual(CAT('video.image_to_video').variants, ['clip']));

console.log('\n── E · Lo que NO entra en el input ──');

const entradaCore = leer('functions/src/core/planner.ts');
const puente = sinComentarios(leer('functions/src/creator/necesidades.ts'));
check('C17-F24 · el input solo admite `kind` y `brief`',
  await (async () => {
    for (const [clave, valor] of [['count', 3], ['focus', 'x'], ['quality', 'max'], ['providerId', 'gemini']]) {
      const r = await planear([{ key: 'a', capability: 'text.generate', input: { [clave]: valor } }]);
      if (r.status !== 'invalid') return false;
    }
    return true;
  })(),
  'count, focus, quality y un proveedor: los cuatro rechazados');
check('C17-F18/F19 · el puente NO copia `count` ni `focus`',
  !/count|focus/.test(puente),
  'no son lo que un paso hace: son cuánto y cómo');
/*
 * Se mira el CAMPO, no la palabra: el puente nombra `voice.tts` porque es una
 * capacidad, y eso no es copiar el campo `voice` de un input.
 */
check('C17-F20 · ni `voice`, ni `mood`, ni `genre` se copian como campos',
  !/input.voice|input.mood|input.genre|voice:|mood:|genre:/.test(puente),
  'son parámetros de su capacidad, y se dicen en el informe');
check('C17-F9 · lo creativo sigue en `hints`, no en el input',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'image.generate', input: { kind: 'cover' } }],
      { preferences: { quality: 'max', creative: { version: 1, lighting: { type: 'natural' } } } });
    const s = r.plan.steps[0];
    return s.hints?.creative?.lighting?.type === 'natural' && s.input.creative === undefined && s.input.quality === undefined;
  })());
check('C17-F10 · la continuidad sigue en `hints`',
  /continuity\?: ContinuityRequirements/.test(leer('functions/src/core/gateway.ts'))
  && !/continuity/.test(sinComentarios(entradaCore).split('const entradaDelPaso')[1]?.split('};')[0] ?? ''));
check('C17-F11/F12/F13 · recursos, dependencias y `produces` siguen donde estaban',
  await (async () => {
    const r = await planear([
      { key: 'mirar', capability: 'vision.describe', input: { kind: 'describe' }, needs: [{ from: 'user', modality: 'image' }] },
      { key: 'editar', capability: 'image.edit', input: { kind: 'restore' }, needs: [{ from: 'upstream', stepKey: 'mirar', modality: 'text' }] },
    ], { inputs: { text: '', attachments: [{ kind: 'image', assetId: 'as_abuela' }] } });
    const s = r.plan?.steps ?? [];
    return igual(s[0]?.uses, [0]) && igual(s[1]?.dependsOn, ['s1-vision_describe'])
      && s[0]?.produces === 'text' && s[1]?.produces === 'image'
      && s[1]?.input?.uses === undefined && s[1]?.input?.dependsOn === undefined;
  })(),
  'el canary de Photo, con cada paso diciendo lo suyo');

console.log('\n── F · La frontera y el reparto ──');

check('C17-F8/F25 · el Planner no arma prompts ni importa plantillas',
  !/creator\/|KIND_INSTRUCTIONS|IMAGE_TASK_EN|buildTextPrompt|buildImagePrompt/.test(entradaCore),
  'la instrucción del proveedor se sigue armando abajo');
check('C17-F26 · no hay un segundo sistema de entrada',
  !/StepInput|InputEngine|PromptEngine|SemanticInput/.test(sinComentarios(entradaCore).replace(/BrainStepInput/g, '')),
  'el input del paso entra por el contrato que ya existía');
check('C17-F22/F23 · Brain no llama dos veces ni elige proveedor',
  !/providerId|modelId|adapterId/.test(sinComentarios(leer('functions/src/core/brain.ts')))
  && (leer('functions/src/creator/prompts.ts').match(/BRAIN_UNDERSTAND_SYSTEM/g) ?? []).length >= 1);
check('C17-F7 · el Core sigue sin importar `templates`, `prompts` ni `inputs`',
  !/creator\/templates|creator\/prompts|creator\/inputs/.test(
    ['core/planner.ts', 'core/brain.ts', 'core/registry/capabilities.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('C17-F17 · lo de Music que no cabe se DICE, no se tira en silencio',
  /mood/.test(leer('functions/test/entrada-de-paso.test.mjs')),
  'mood, genre y voice: parámetros de su capacidad, sin sitio en el catálogo todavía');
check('esta suite está en la cadena de `npm test`',
  /entrada-de-paso\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
