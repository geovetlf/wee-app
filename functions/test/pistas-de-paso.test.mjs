/**
 * WEË — G16: LAS PISTAS SON DEL PASO, NO DEL PLAN.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * El Planner armaba las pistas UNA vez y las repartía a todos los pasos. Y no
 * es que dos pasos pidieran cosas distintas —medido sobre las 35 formas reales:
 * eso no pasa nunca—: es que en DIEZ planes una pista la pide UN solo paso, y
 * repartirla se la pone a los demás.
 *
 * Weë Studio lo enseña de un vistazo: el guion pide `standard`, el clip pide
 * diez segundos y vertical, la voz no pide nada. Repartir le daba al guion
 * —que es texto— una duración y un encuadre.
 *
 * Y `quality` es peor que las otras dos, porque no se ignora: cambia a qué
 * modelo se va y cuánto cuesta. En Weë Business solo el tercer paso pide `max`;
 * repartirlo cobraría `max` por dos pasos que nadie pidió así.
 *
 * ── Lo que NO se ha hecho ───────────────────────────────────────────────────
 *
 * No hay un segundo sistema de pistas: es el MISMO `ExecutionHints`, leído con
 * el MISMO lector. Lo creativo sigue siendo `CreativeParameters` y la
 * continuidad sigue siendo la suya. `focus`, `voice`, `mood` y `genre` siguen
 * sin dueño y siguen fuera: son G14 y G15, y no se les ha inventado un campo
 * para que un test pase.
 *
 * `count` SÍ tiene dueño desde G13.5, y no es una pista: es hermana de `input`,
 * la valida el Planner contra un techo del Core y se rechaza en vez de
 * recortarse. Sigue sin caber aquí —`hints:{count}` se rechaza, sección H— y
 * todo lo suyo vive en `test/techo-de-propuestas.test.mjs`.
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
const callado = { record() {} };

const planear = (steps, extra = {}) => {
  const caps = Array.isArray(steps) ? steps.map((s) => s?.capability).filter((c) => typeof c === 'string') : [];
  return crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: callado, now: () => 1000 })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION, trace: { traceId: 'g16', requestId: 'g16', userId: 'acc_mia' },
      understanding: {
        intent: 'creation', confidence: 'high', goal: 'un encargo de ejemplo',
        capability: caps[0], capabilities: [...new Set(caps)], steps,
        inputs: { text: '', attachments: [] }, references: [], constraints: {},
        needsPlanning: true, missing: [], assumptions: [], ...extra,
      },
    });
};

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
const planDeLaForma = (f) => {
  const { steps } = pasosParaElCore(f.steps);
  const pide = steps.some((s) => (s.needs ?? []).some((x) => x.from === 'user'));
  return planear(steps, { inputs: { text: '', attachments: pide ? [{ kind: 'image', assetId: 'as_x' }] : [] } });
};

console.log('\n── A · Weë Studio: el guion no dura diez segundos ──');

const studio = FORMAS.find((f) => f.exp === 'studio' && f.steps.length === 3);
const studioPlan = await planDeLaForma(studio);
/* Si el plan ni sale, se dice por qué en vez de reventar tres líneas más abajo. */
const pistas = (studioPlan.plan?.steps ?? []).map((s) => s.hints ?? null);
check('G16-F1/F2/F3 · cada paso se queda con lo suyo, y solo con lo suyo',
  studioPlan.status === 'ready' && igual(pistas[0], { quality: 'standard' })
  && pistas[1]?.durationSec === 10 && pistas[1]?.creative?.framing?.aspectRatio === '9:16'
  && pistas[1]?.quality === undefined
  && pistas[2] === null,
  studioPlan.status === 'ready' ? JSON.stringify(pistas) : studioPlan.status + ' ' + JSON.stringify(studioPlan.error?.details ?? ''));
check('al guion, que es texto, NO le llega una duración ni un encuadre',
  pistas[0]?.durationSec === undefined && pistas[0]?.creative === undefined,
  JSON.stringify(pistas[0]));

console.log('\n── B · La calidad, que sí cuesta dinero ──');

const business = FORMAS.find((f) => f.exp === 'business' && f.steps.length === 3);
const businessPlan = await planDeLaForma(business);
check('G16-F9 · Weë Business: `max` solo en el paso que lo pidió',
  businessPlan.plan?.steps?.[0]?.hints === undefined
  && businessPlan.plan?.steps?.[1]?.hints === undefined
  && businessPlan.plan?.steps?.[2]?.hints?.quality === 'max',
  businessPlan.status === 'ready' ? 'antes lo habrían cobrado los tres' : businessPlan.status);

console.log('\n── C · Y el plan sigue siendo el fondo ──');

const conFondo = await planear([
  { key: 'a', capability: 'text.generate' },
  { key: 'b', capability: 'video.generate', hints: { durationSec: 8 } },
], { preferences: { quality: 'high' } });
check('G16-F8 · lo que pidió la persona para todo el encargo llega a todos',
  conFondo.plan.steps[0].hints?.quality === 'high' && conFondo.plan.steps[1].hints?.quality === 'high',
  JSON.stringify(conFondo.plan.steps.map((s) => s.hints ?? null)));
check('y lo del paso se suma CLAVE A CLAVE, sin tirar lo del plan',
  conFondo.plan.steps[1].hints?.durationSec === 8 && conFondo.plan.steps[1].hints?.quality === 'high',
  JSON.stringify(conFondo.plan.steps[1].hints ?? null));
check('lo del paso MANDA sobre lo del plan en la misma clave',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate', hints: { quality: 'standard' } }],
      { preferences: { quality: 'max' } });
    return r.plan?.steps?.[0]?.hints?.quality === 'standard';
  })(),
  'lo contrario sería que el plan pisara lo que dijo el paso');
check('G16-F9 · y una pista que nadie declara no aparece de la nada',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate' }]);
    return r.status === 'ready' && r.plan.steps[0].hints === undefined;
  })());

console.log('\n── D · Capacidad repetida, pistas independientes ──');

const repetida = await planear([
  { key: 'draft', capability: 'text.generate', input: { kind: 'copy' }, hints: { quality: 'standard' } },
  { key: 'polish', capability: 'text.generate', input: { kind: 'polish' }, hints: { quality: 'max' } },
]);
check('G16-F6/F18 · dos `text.generate` con calidades distintas, sin contagio',
  repetida.plan.steps[0].hints?.quality === 'standard' && repetida.plan.steps[1].hints?.quality === 'max'
  && repetida.plan.steps[0].input?.kind === 'copy' && repetida.plan.steps[1].input?.kind === 'polish',
  JSON.stringify(repetida.plan.steps.map((s) => s.hints)));

console.log('\n── E · Los dos canarios ──');

const photo = FORMAS.find((f) => f.exp === 'photo' && f.steps.some((s) => s.id === 'look'));
const photoPlan = await planDeLaForma(photo);
check('G16 · Photo: la resolución del retoque no se le pone al paso que mira',
  photoPlan.status === 'ready' && photoPlan.plan.steps[0].hints?.quality === undefined,
  JSON.stringify(photoPlan.plan?.steps?.map((s) => s.hints ?? null) ?? photoPlan.status));
check('y lo que C11.3/C11.4 ya garantizaban sigue igual',
  igual(photoPlan.plan?.steps?.[0]?.uses, [0]) && igual(photoPlan.plan?.steps?.[1]?.uses, [0])
  && photoPlan.plan?.steps?.[0]?.produces === 'text' && photoPlan.plan?.steps?.[1]?.produces === 'image');

const travel = FORMAS.find((f) => f.exp === 'travel');
const travelPlan = await planDeLaForma(travel);
check('G16-F7 · Travel no recibe ni una pista visual',
  travelPlan.plan?.steps?.length === 1
  && travelPlan.plan?.steps?.[0]?.hints?.creative === undefined
  && travelPlan.plan?.steps?.[0]?.hints?.durationSec === undefined
  && travelPlan.plan?.steps?.[0]?.hints?.quality === 'max',
  JSON.stringify(travelPlan.plan?.steps?.[0]?.hints ?? travelPlan.status));

console.log('\n── F · Las 35 formas ──');

let conPista = 0, contagiadas = 0, pasos = 0;
for (const f of FORMAS) {
  const r = await planDeLaForma(f);
  if (r.status !== 'ready') continue;
  for (let i = 0; i < r.plan.steps.length; i++) {
    pasos++;
    const legacy = f.steps[i].input ?? {};
    const h = r.plan.steps[i].hints ?? {};
    if (legacy.quality !== undefined && h.quality === legacy.quality) conPista++;
    if (legacy.durationSec !== undefined && h.durationSec === legacy.durationSec) conPista++;
    if (legacy.aspectRatio !== undefined && h.creative?.framing?.aspectRatio === legacy.aspectRatio) conPista++;
    /* Contagiada: la tiene y Legacy no se la dio a ESTE paso. */
    if (legacy.quality === undefined && h.quality !== undefined) contagiadas++;
    if (legacy.durationSec === undefined && h.durationSec !== undefined) contagiadas++;
  }
}
check('G16-F11 · las 12 pistas que Legacy escribe por paso llegan a su paso',
  conPista === 12 && pasos === 65,
  `${conPista} de 12 · ${pasos} pasos`);
check('y NINGUNA llega a un paso al que Legacy no se la dio',
  contagiadas === 0,
  'cero contagios en las 35 formas');

console.log('\n── G · Lo que sigue sin dueño, y sigue fuera ──');

const puente = sinComentarios(leer('functions/src/creator/necesidades.ts'));
const planner = sinComentarios(leer('functions/src/core/planner.ts'));
/*
 * ── G13 SE CERRÓ, Y ESTA AFIRMACIÓN CAMBIÓ DE SIGNO ─────────────────────────
 *
 * Decía «no se ha inventado un `count`», y era lo correcto mientras no hubiera
 * una decisión: 17 pasos sabían cuántos resultados querían y no tenían dónde
 * decirlo. En G13.3 se decidió —techo 4, rechazo sin recorte, la cantidad la
 * sigue poniendo la experiencia— y en G13.5 se construyó.
 *
 * Así que ya no se vigila que NO EXISTA. Se vigila que exista BIEN, y eso es
 * otra cosa: que viaje como hermana de `input` y no dentro; que la valide el
 * Planner y no quien cobra; que una cantidad imposible tumbe el plan en vez de
 * encogerse. Todo eso vive en `test/techo-de-propuestas.test.mjs`, que es de
 * quien es el tema. Aquí solo queda lo que le toca a este archivo: que el
 * puente no se la invente ni la corrija, y que el sitio donde vive siga siendo
 * uno.
 *
 * Lo que NO ha cambiado es G14 y G15, justo debajo. Que `count` saliera no los
 * saca: cada uno se audita por separado.
 */
check('G13 CERRADO · el `count` ya existe, y el puente lo COPIA sin corregirlo',
  /const propuestasDelPaso = \(paso: PlanStep\): number \| undefined/.test(puente)
  && !/Math\.(min|max|round|floor|ceil|trunc)/.test((puente.match(/const propuestasDelPaso[\s\S]*?\n\};/) || [''])[0]),
  'quien decide si cabe es el Planner; recortarlo aquí lo dejaría sin nada que rechazar');
check('y el Planner es quien lo valida, con el techo declarado en el propio Core',
  /MAX_PROPUESTAS_POR_PASO/.test(planner)
  && /Number\.isInteger\(c\)/.test(planner)
  && !/Math\.(min|max)\([^)]*count/.test(planner),
  'el techo lo declara `core/contracts.ts`; la matriz entera vive en `techo-de-propuestas.test.mjs`');
check('G16-F14 · G14 sigue abierto: no se ha inventado un `focus`',
  !/focus/.test(puente) && !/focus/.test(planner));
check('G16-F15 · G15 sigue abierto: ni `voice`, ni `mood`, ni `genre`',
  !/input\.voice|input\.mood|input\.genre|voice:|mood:|genre:/.test(puente));
check('`resolution` tampoco sube: la calcula la Resolution Policy con la foto real',
  !/resolution/.test(puente) && fs.existsSync(path.resolve(RAIZ, 'functions/src/engine/resolutionPolicy.ts')));

console.log('\n── H · Los guards ──');

check('G16-F11/F12 · lo creativo y la continuidad NO se duplican: siguen en `ExecutionHints`',
  /creative\?: CreativeParameters/.test(leer('functions/src/core/gateway.ts'))
  && /continuity\?: ContinuityRequirements/.test(leer('functions/src/core/gateway.ts'))
  && !/interface .*Creative|interface .*Continuity/.test(planner));
check('no hay un segundo sistema de pistas: mismo contrato, mismo lector',
  /revisarPistas\(paso\.hints/.test(planner)
  && !/HintsEngine|StepHints |interface StepHints/.test(planner),
  '`leerHints` ya validaba las cuatro claves con sus contratos');
check('G16-F10 · un proveedor no cabe en las pistas de un paso',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate', hints: { providerId: 'gemini' } }]);
    return r.status === 'invalid';
  })());
check('ni una pista inventada',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'text.generate', hints: { count: 3 } }]);
    return r.status === 'invalid';
  })());
check('G16-F16/F17 · el Planner no arma prompts y Brain no elige proveedor',
  !/creator\/|KIND_INSTRUCTIONS|buildTextPrompt/.test(leer('functions/src/core/planner.ts'))
  && !/providerId|modelId|adapterId/.test(sinComentarios(leer('functions/src/core/brain.ts'))));
check('las pistas del paso viajan congeladas: nadie las cambia después',
  repetida.plan.steps[0].hints !== undefined && Object.isFrozen(repetida.plan.steps[0].hints),
  'y si no las hay, tampoco se inventa un objeto');
check('esta suite está en la cadena de `npm test`',
  /pistas-de-paso\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
