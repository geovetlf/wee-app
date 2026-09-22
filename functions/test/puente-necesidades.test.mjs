/**
 * WEË — C15d: LO QUE LAS EXPERIENCIAS YA SABÍAN, DICHO EN EL CONTRATO DEL CORE.
 *
 * ── Lo que se cruzaba y se perdía ───────────────────────────────────────────
 *
 * Las plantillas llevan años declarando a mano qué paso necesita lo que escribió
 * otro (`dependsOn`) y qué paso trabaja sobre la foto de la persona
 * (`IMAGE_INPUT_CAPS`). Al Core llegaba una lista de capacidades y nada más.
 *
 * ── Y por qué copiar `dependsOn` habría sido mentir ─────────────────────────
 *
 * Porque en Legacy `dependsOn` hace dos cosas a la vez: ordena, y pasa
 * `previous` al siguiente. Pero que `previous` llegue no significa que se lea.
 *
 * De las 41 aristas de los 35 planes reales: 27 transmiten material, 9 no
 * pueden transmitir nada —el consumidor busca una marca que el productor nunca
 * escribe, o lo que viajaría es una URL dentro de un prompt de texto— y 5
 * apuntan a capacidades que hoy no sirve nadie.
 *
 * Las 9 existían para el ORDEN en que la persona ve los resultados. Convertirlas
 * en dependencias de material sería inventar un consumo que no ocurre.
 *
 * Nada de esto usa proximidad, ni «el último que produjo», ni la posición: cada
 * necesidad apunta a un paso POR SU NOMBRE, y si no hay material, no hay arista.
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
/* Los guards miran el CÓDIGO. Un comentario que nombra lo que no se hace no es hacerlo. */
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

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
const { IMAGE_INPUT_CAPS } = lib('creator/inputs.js');
const { pasosParaElCore, clasificarArista } = lib('creator/necesidades.js');

const ROUTABLES = CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id);
const CAT = (id) => CAPABILITY_CATALOG.find((c) => c.id === id);
const callado = { record() {} };

const planear = (steps, caps, attachments = []) =>
  crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: callado, now: () => 1000 })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION, trace: { traceId: 'c15d', requestId: 'c15d', userId: 'acc_mia' },
      understanding: {
        intent: 'creation', confidence: 'high', goal: 'un encargo de ejemplo',
        capability: caps[0], capabilities: [...new Set(caps)], steps,
        inputs: { text: '', attachments }, references: [], constraints: {},
        needsPlanning: true, missing: [], assumptions: [],
      },
    });

/* ── Las 35 formas reales, construidas llamando a Legacy ──────────────────── */

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

console.log('\n── A · La medición: las 35 formas y sus 41 aristas ──');

const TOTAL_PASOS = FORMAS.reduce((a, f) => a + f.steps.length, 0);
const TOTAL_ARISTAS = FORMAS.reduce((a, f) => a + f.steps.reduce((b, s) => b + (s.dependsOn ?? []).length, 0), 0);
check('35 formas, 74 pasos, 41 aristas: la medición canónica no se ha movido',
  FORMAS.length === 35 && TOTAL_PASOS === 74 && TOTAL_ARISTAS === 41,
  `${FORMAS.length} · ${TOTAL_PASOS} · ${TOTAL_ARISTAS}`);

const clases = { REAL_MATERIAL_DEPENDENCY: 0, LEGACY_ORDER_ARTIFACT: 0, NON_EXECUTABLE_CAPABILITY_DEPENDENCY: 0 };
const artefactos = [];
for (const f of FORMAS) {
  const porId = Object.fromEntries(f.steps.map((s) => [s.id, s]));
  for (const s of f.steps) for (const d of (s.dependsOn ?? [])) {
    const prod = porId[d]; if (!prod) continue;
    const c = clasificarArista(s, prod);
    clases[c.clase]++;
    if (c.clase !== 'REAL_MATERIAL_DEPENDENCY') artefactos.push({ ...f, prod: d, cons: s.id, ...c });
  }
}
check('cada arista cae en UNA clase, y las tres suman 41',
  clases.REAL_MATERIAL_DEPENDENCY + clases.LEGACY_ORDER_ARTIFACT + clases.NON_EXECUTABLE_CAPABILITY_DEPENDENCY === 41,
  `A ${clases.REAL_MATERIAL_DEPENDENCY} · B ${clases.LEGACY_ORDER_ARTIFACT} · C ${clases.NON_EXECUTABLE_CAPABILITY_DEPENDENCY}`);
check('27 transmiten material de verdad',
  clases.REAL_MATERIAL_DEPENDENCY === 27);
check('C15d-F11 · 9 solo ordenaban, y NINGUNA se convierte en material',
  clases.LEGACY_ORDER_ARTIFACT === 9,
  artefactos.filter((a) => a.clase === 'LEGACY_ORDER_ARTIFACT').length + ' anotadas, cero convertidas');
check('C15d-F6 · 5 apuntan a capacidades que hoy no sirve nadie',
  clases.NON_EXECUTABLE_CAPABILITY_DEPENDENCY === 5,
  'music.generate y video.compose: no se finge soporte');

console.log('\n── B · El viaje entero: Legacy → puente → Planner ──');

let fieles = 0, sinProveedor = 0, aristasEsperadas = 0, aristasObtenidas = 0, pidenFoto = 0;
const fallos = [];
for (const f of FORMAS) {
  const { steps: brainSteps } = pasosParaElCore(f.steps);
  const caps = f.steps.map((s) => s.capability);
  const servibles = caps.every((c) => ROUTABLES.includes(c));
  const necesitaFoto = brainSteps.some((s) => (s.needs ?? []).some((x) => x.from === 'user'));
  if (necesitaFoto) pidenFoto++;
  const r = await planear(brainSteps, caps, necesitaFoto ? [{ kind: 'image', assetId: 'as_de_la_persona' }] : []);
  if (!servibles) {
    if (r.status === 'unsupported') { sinProveedor++; continue; }
    fallos.push({ ...f, status: r.status, nota: 'debería ser unsupported' });
    continue;
  }
  const idDe = (k) => {
    const i = brainSteps.findIndex((x) => x.key === k);
    return i < 0 ? undefined : `s${i + 1}-${String(brainSteps[i].capability).replace(/\./g, '_')}`;
  };
  const esperadas = [];
  for (const bs of brainSteps) for (const nd of (bs.needs ?? [])) {
    if (nd.from === 'upstream') esperadas.push(`${idDe(bs.key)}<-${idDe(nd.stepKey)}`);
  }
  const obtenidas = [];
  for (const s of (r.plan?.steps ?? [])) for (const d of (s.dependsOn ?? [])) obtenidas.push(`${s.id}<-${d}`);
  aristasEsperadas += esperadas.length; aristasObtenidas += obtenidas.length;
  const ok = r.status === 'ready'
    && r.plan.steps.length === f.steps.length
    && r.plan.steps.every((s, i) => s.capability === caps[i])
    && igual(esperadas.slice().sort(), obtenidas.slice().sort());
  if (ok) fieles++; else fallos.push({ ...f, status: r.status, esperadas, obtenidas });
}
check('C15d-F12 · las 32 formas que Weë sabe hacer hoy salen FIELES',
  fieles === 32 && sinProveedor === 3 && fieles + sinProveedor === 35,
  `fieles ${fieles} · sin proveedor ${sinProveedor}` + (fallos.length ? ' · fallos: ' + JSON.stringify(fallos[0]) : ''));
check('ni una arista de más ni una de menos en los planes que corren',
  aristasEsperadas === aristasObtenidas && aristasObtenidas === 25,
  `${aristasObtenidas} aristas · las 2 que faltan viven en los 3 planes sin proveedor`);
check('C15d-F13 · 14 formas piden la foto de la persona, y son las de `IMAGE_INPUT_CAPS`',
  pidenFoto === 14);

console.log('\n── C · El caso Chef, con foto y sin ella ──');

const chef = FORMAS.find((f) => f.exp === 'chef' && f.steps.some((s) => s.capability === 'vision.describe'));
const chefSteps = pasosParaElCore(chef.steps).steps;
const chefCaps = chef.steps.map((s) => s.capability);
const chefConFoto = await planear(chefSteps, chefCaps, [{ kind: 'image', assetId: 'as_nevera' }]);
check('C15d-F9 · con foto: mirar → escribir → dibujar, y las DOS aristas de Legacy',
  igual(chefConFoto.plan?.steps?.map((s) => s.capability), ['vision.describe', 'text.generate', 'image.generate'])
  && igual(chefConFoto.plan.steps.map((s) => s.dependsOn ?? null),
    [null, ['s1-vision_describe'], ['s2-text_generate']]),
  JSON.stringify(chefConFoto.plan?.steps?.map((s) => s.id)));
check('el paso que mira se lleva la foto, y los otros dos no',
  igual(chefConFoto.plan.steps[0].uses, [0])
  && chefConFoto.plan.steps[1].uses === undefined && chefConFoto.plan.steps[2].uses === undefined);
check('C15d-F9 · sin foto: se PREGUNTA, y no se da la vuelta al plan',
  await (async () => {
    const r = await planear(chefSteps, chefCaps, []);
    return r.status === 'needs_clarification' && igual(r.clarification?.missing, ['material:image']);
  })(),
  'nunca «describe la imagen que acabamos de dibujar»');

console.log('\n── D · Weë Home, que era la que estaba mal declarada ──');

const homeDefecto = FORMAS.find((f) => f.exp === 'home' && f.steps.some((s) => s.id === 'list'));
const lista = homeDefecto.steps.find((s) => s.id === 'list');
check('C15d-F10 · la lista de la compra cuelga de lo que se VIO, no de lo que se dibujó',
  igual(lista.dependsOn, ['look']),
  'antes colgaba de `restyle`, y lo que le llegaba era la URL de un png');
check('y esa arista ya es material de verdad: texto que entra entero',
  clasificarArista(lista, homeDefecto.steps.find((s) => s.id === 'look')).clase === 'REAL_MATERIAL_DEPENDENCY');
check('la rama «distribución», que ya estaba bien, sigue igual',
  await (async () => {
    const f = FORMAS.find((x) => x.exp === 'home' && x.steps.some((s) => s.id === 'plan'));
    const r = await planear(pasosParaElCore(f.steps).steps, f.steps.map((s) => s.capability), [{ kind: 'image', assetId: 'as_sala' }]);
    return igual(r.plan?.steps?.map((s) => s.dependsOn ?? null), [null, ['s1-vision_describe'], ['s2-text_generate']]);
  })(),
  'look → plan → view: era el control de regresión');
check('C15d-F10 · la rama «ideas» NO recibe ninguna dependencia inventada',
  await (async () => {
    const f = FORMAS.find((x) => x.exp === 'home' && x.steps.some((s) => s.id === 'tips'));
    const { steps, descartadas } = pasosParaElCore(f.steps);
    const r = await planear(steps, f.steps.map((s) => s.capability), []);
    return descartadas.length === 1 && descartadas[0].clase === 'LEGACY_ORDER_ARTIFACT'
      && r.status === 'ready' && r.plan.steps.every((s) => s.dependsOn === undefined);
  })(),
  'no hay ningún paso de texto anterior, así que no hay nada que necesitar');

console.log('\n── E · Capacidad repetida, y varios productores ──');

for (const [exp, key, id, esperado] of [
  ['writer', 'polish', 'draft', 's1-text_generate'],
  ['business', 'copy', 'analysis', 's1-text_generate'],
  ['brain', 'answer', 'understand', 's1-text_generate'],
  ['chef', 'list', 'menu', 's1-text_generate'],
]) {
  const f = FORMAS.find((x) => x.exp === exp && x.steps.some((s) => s.id === key));
  const steps = pasosParaElCore(f.steps).steps;
  const r = await planear(steps, f.steps.map((s) => s.capability), []);
  const i = steps.findIndex((s) => s.key === key);
  check(`C15d-F8 · ${exp}: ${id} → ${key}, dos pasos de la misma capacidad sin fundirse`,
    r.status === 'ready' && new Set(r.plan.steps.map((s) => s.id)).size === f.steps.length
    && igual(r.plan.steps[i].dependsOn, [esperado]),
    JSON.stringify(r.plan?.steps?.map((s) => s.id)));
}

const negocio = FORMAS.find((x) => x.exp === 'business' && x.steps.some((s) => s.id === 'ideas'));
const negocioSteps = pasosParaElCore(negocio.steps).steps;
const negocioPlan = await planear(negocioSteps, negocio.steps.map((s) => s.capability), []);
check('C15d-F4 · con DOS productores, el consumidor señala a los dos que Legacy nombró',
  igual(negocioPlan.plan?.steps?.[2]?.dependsOn, ['s1-text_generate', 's2-text_search']),
  'y no al último, que habría sido solo `market`');

console.log('\n── F · Lo que el puente NO hace ──');

const fuente = leer('functions/src/creator/necesidades.ts');
const codigoDelPuente = sinComentarios(fuente);
check('C15d-F3/F4 · ni proximidad, ni posición, ni «el último que produjo»',
  !/ultimo|último|reverse\(\)|\.at\(-1\)|length - 1\]/.test(codigoDelPuente)
  && !/\.find\(\(p\) => p\.produces/.test(codigoDelPuente),
  'cada necesidad nombra su paso');
check('C15d-F2 · no aparece ningún tercer origen',
  !/'order'|'previous'|'context'|from: 'legacy'/.test(codigoDelPuente)
  && /from: 'upstream'/.test(codigoDelPuente) && /from: 'user'/.test(codigoDelPuente));
check('C15d-F5 · una URL dentro de un prompt NO cuenta como material',
  clasificarArista(
    { id: 'x', capability: 'text.generate', input: {} },
    { id: 'y', capability: 'image.generate', input: {} }).clase === 'LEGACY_ORDER_ARTIFACT');
check('C15d-F1 · el catálogo no se tocó para que cuadrara Legacy',
  CAT('image.background_remove').accepts.join() === 'image'
  && CAT('image.try_on').accepts.join() === 'image'
  && CAT('video.compose').accepts.join() === 'video',
  'se clasificó la relación en vez de cambiarle el contrato a la capacidad');
check('C15d-F6 · `video.compose` sigue sin proveedor, y no se finge',
  CAT('video.compose').status === 'DECLARED'
  && clasificarArista(
    { id: 'x', capability: 'video.compose', input: {} },
    { id: 'y', capability: 'music.generate', input: {} }).clase === 'NON_EXECUTABLE_CAPABILITY_DEPENDENCY');
check('las marcas se leen de la instrucción, no de una lista aparte',
  /KIND_INSTRUCTIONS\[kind\]/.test(codigoDelPuente) && /export const KIND_INSTRUCTIONS/.test(leer('functions/src/creator/prompts.ts')));
check('y `advise`, que nombra «IMAGEN:» para PROHIBIRLA, no cuenta como emisora',
  clasificarArista(
    { id: 'x', capability: 'image.generate', input: {} },
    { id: 'y', capability: 'text.generate', input: { kind: 'advise' } }).clase === 'LEGACY_ORDER_ARTIFACT',
  'una búsqueda ingenua la habría contado');

console.log('\n── G · La frontera ──');

const ficherosCore = ['core/planner.ts', 'core/brain.ts', 'core/workflow.ts', 'core/orchestrator.ts', 'core/job.ts', 'core/gateway.ts', 'core/router.ts'];
const codigoCore = ficherosCore.map((f) => leer(`functions/src/${f}`)).join('\n');
check('C15d-F15/F16 · ningún archivo del Core importa plantillas ni `creator/inputs`',
  !/creator\/templates|creator\/inputs|creator\/necesidades|from '\.\.\/creator/.test(codigoCore),
  'la dirección es de ida: creator conoce al Core, no al revés');
check('C15d-F17 · no se creó un segundo Planner ni un motor de dependencias',
  !/class .*Planner|DependencyEngine|NeedsEngine|Resolver/.test(codigoDelPuente)
  && !/planificar/.test(codigoDelPuente),
  'el puente traduce; planificar sigue siendo del Planner');
check('C15d-F18/F19 · Financial, Credits, Router, Job y Gateway sin tocar',
  !/credits|financial|router|gateway|job/i.test(codigoDelPuente));
check('C15d-F7 · el problema de «probarse ropa» queda AUDITADO y aparte',
  !IMAGE_INPUT_CAPS.includes('image.try_on')
  && /la prueba de ropa necesita la foto de la persona y la de la prenda/.test(leer('functions/src/engine/providers/flux.ts')),
  'BEAUTY-TRYON-AUDIT: fase propia, no se toca aquí');
check('ninguna arista se borra en silencio: las descartadas se devuelven',
  /descartadas/.test(codigoDelPuente) && pasosParaElCore(homeDefecto.steps).descartadas.length === 1);
check('esta suite está en la cadena de `npm test`',
  /puente-necesidades\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
