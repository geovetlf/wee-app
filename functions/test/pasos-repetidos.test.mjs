/**
 * WEË — C15a / G9: UNA CAPACIDAD PUEDE HACER FALTA VARIAS VECES.
 *
 * ── Lo que se perdía ────────────────────────────────────────────────────────
 *
 * El Planner armaba sus pasos desde un `Set` de capacidades. «Escribe el
 * análisis, mira el mercado, escribe las ideas» son dos pasos de
 * `text.generate` con uno en medio, y el conjunto los dejaba en uno.
 *
 * Aquí no se cuentan las llamadas a `step(` del código —eso mide el archivo, no
 * los planes—: se le pregunta a Legacy, construyendo sus planes de verdad. Las
 * once experiencias producen 35 formas distintas y 74 pasos; el conjunto dejaba
 * pasar 68. Weë Business, la más castigada: 9 convertidos en 6.
 *
 * Y debajo hacía algo peor: de las 42 aristas que Legacy declara, 9 tienen la
 * misma capacidad en los dos extremos. Al fundirse los extremos, esas nueve se
 * habrían vuelto un paso dependiendo de sí mismo — y con eso, G6a no tenía ni
 * dónde apoyarse.
 *
 * ── Lo que NO hubo que construir ────────────────────────────────────────────
 *
 * Nada. `capabilities` ya era una lista ordenada que admitía repetición;
 * `idDePaso(capability, orden)` ya daba identidades distintas; el Workflow, el
 * Orchestrator y el Job ya sabían tratar pasos repetidos —y los tres rechazan
 * por su cuenta un plan con identidades repetidas, cosa que se comprobó
 * rompiéndolas—. Lo único que había que dejar de hacer era tirarlos.
 *
 * `BrainUnderstanding` no cambia.
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
const { PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION } = core;
const { crearPlannerDeWee, disponibilidadDe } = lib('planner/index.js');
const { crearWorkflowEngineDeWee } = lib('workflow/index.js');
const { TEMPLATES } = lib('creator/templates.js');
const { CAPABILITY_CATALOG: CATALOGO } = core;
const { orquestadorDeWee } = lib('orchestrator/index.js');

const callado = { record() {} };
const reloj = () => 1_000;
const traza = (id) => ({ traceId: id, requestId: id, userId: 'acc_mia' });

const planear = (capabilities, id, extra = {}) =>
  crearPlannerDeWee({ availability: disponibilidadDe([...new Set(capabilities)]), tracer: callado, now: reloj })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION, trace: traza(id),
      understanding: {
        intent: 'creation', confidence: 'high', goal: 'un encargo con varios pasos',
        capability: capabilities[0], capabilities,
        inputs: { text: '', attachments: [] }, references: [], constraints: {},
        needsPlanning: true, missing: [], assumptions: [], ...extra,
      },
    });

console.log('\n── A · G9-F1/F2/F4/F8 · Las instancias dejan de perderse ──');

const tres = await planear(['text.generate', 'text.generate', 'text.generate'], 'g9_0001');
check('G9-F1/F2 · tres veces la misma capacidad son TRES pasos',
  tres.status === 'ready' && tres.plan?.steps?.length === 3,
  JSON.stringify(tres.plan?.steps?.map((s) => s.id)));
check('G9-F4 · no se pierde ninguna instancia por el camino',
  tres.plan?.steps?.every((s) => s.capability === 'text.generate'));
check('G9-F8 · y el orden declarado se conserva',
  igual((await planear(['text.generate', 'image.generate', 'text.generate'], 'g9_0002')).plan?.steps?.map((s) => s.capability),
    ['text.generate', 'image.generate', 'text.generate']));
check('el `Set` ya no está donde colapsaba',
  !/const pedidas = \[\.\.\.new Set\(/.test(leer('functions/src/core/planner.ts')),
  'un conjunto contesta qué capacidades hacen falta; un plan, qué pasos hay');

console.log('\n── B · G9-F5/F6/F7 · La identidad ──');

const ids = tres.plan?.steps?.map((s) => s.id) ?? [];
check('G9-F5 · cada paso tiene identidad propia',
  new Set(ids).size === 3, ids.join(' '));
check('G9-F7 · misma capacidad NO da la misma identidad',
  ids[0] !== ids[1] && ids[1] !== ids[2]);
check('G9-F6 · la identidad es determinista: el mismo entendimiento da los mismos ids',
  igual(ids, (await planear(['text.generate', 'text.generate', 'text.generate'], 'g9_0003')).plan?.steps?.map((s) => s.id)),
  'no se sortea nada');
check('y no depende de proveedor, modelo, trabajo, intento ni material',
  ids.every((x) => /^s\d+-[a-z_]+$/.test(x))
  && !/providerId|modelId|jobId|attemptId|assetId|randomUUID/.test(
    (sinComentarios(leer('functions/src/core/planner.ts')).match(/const idDePaso[^;]*;/) ?? [''])[0]));

console.log('\n── C · G9-F3 · Las capacidades siguen siendo un conjunto ──');

const mezcla = await planear(['text.generate', 'text.generate', 'image.generate', 'text.generate'], 'g9_0004');
check('G9-F3 · `plan.capabilities` es el CONJUNTO, sin repetir',
  igual(mezcla.plan?.capabilities, ['text.generate', 'image.generate']),
  'dos verdades distintas: qué hace falta, y cuántas veces');
check('mientras `plan.steps` conserva las cuatro instancias',
  mezcla.plan?.steps?.length === 4);
check('y el Workflow acepta esa combinación: es lo que ya comprobaba',
  (await crearWorkflowEngineDeWee({ tracer: callado, now: reloj })
    .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza('g9_0004'), plan: mezcla.plan })).status === 'ready');

console.log('\n── D · G9-F9/F10/F11 · Abajo nadie las colapsa ──');

const wf = (await crearWorkflowEngineDeWee({ tracer: callado, now: reloj })
  .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza('g9_0004'), plan: mezcla.plan })).workflow;
check('G9-F9 · el Workflow conserva los cuatro pasos y sus identidades',
  wf?.steps?.length === 4 && new Set(wf.steps.map((s) => s.id)).size === 4);

const montado = orquestadorDeWee(wf);
const arranque = montado.ok
  ? montado.orchestrator.avanzar({
      contract: '1.0', principal: { userId: 'acc_mia' },
      run: montado.prepared.iniciar(traza('g9_0004')).run, at: 10,
    })
  : undefined;
check('G9-F10 · el Orchestrator despacha los cuatro, sin fundir ninguno',
  arranque?.dispatch?.length === 4 && new Set(arranque.dispatch.map((d) => d.stepId)).size === 4,
  montado.ok ? arranque?.dispatch?.map((d) => d.stepId).join(' ') : JSON.stringify(montado.error));
check('G9-F11/F12 · y cada uno lleva SU clave de idempotencia: el Job no los confunde',
  new Set(arranque?.dispatch?.map((d) => d.idempotencyKey)).size === 4,
  'dos pasos de la misma capacidad son dos operaciones, no un duplicado');
check('G9-F13 · el Router resuelve por CAPACIDAD, y eso es correcto: no necesita saber de instancias',
  !/stepId/.test(sinComentarios(leer('functions/src/core/router.ts'))),
  'dos pasos de `text.generate` merecen la misma implementación');

console.log('\n── E · G9-F14..F19 · Lo que no se rompió ──');

const conTodo = await planear(['vision.describe', 'image.edit'], 'g9_0005', {
  constraints: { kind: 'restore' },
  preferences: { quality: 'max' },
  inputs: { text: '', attachments: [{ kind: 'image', assetId: 'as_foto' }] },
});
const editar = conTodo.plan?.steps?.find((s) => s.capability === 'image.edit');
check('G9-F14 · `PlanStep.input` sigue igual',
  igual(Object.keys(editar?.input ?? {}).sort(), ['brief', 'kind']) && editar?.input?.kind === 'restore');
check('G9-F15 · `PlanStep.hints` sigue igual',
  editar?.hints?.quality === 'max');
check('G9-F16 · `PlanStep.uses` y `Plan.references` siguen igual',
  igual(editar?.uses, [0]) && conTodo.plan?.references?.length === 1);
check('G9-F17 · `produces` sigue saliendo del catálogo',
  editar?.produces === 'image' && conTodo.plan?.steps?.[0]?.produces === 'text');
check('G9-F18 · `dependsOn` sigue derivándose con la MISMA regla: no hay lógica nueva',
  /if \(necesita === 'text' \|\| aportadas\.has\(necesita\)\) continue;/.test(leer('functions/src/core/planner.ts'))
  && /\[\.\.\.anteriores\]\.reverse\(\)\.find/.test(leer('functions/src/core/planner.ts')),
  'G6a sigue pendiente y C15a no la ha tocado');
check('G9-F19 · G8 intacto: el upstream sale de `dependsOn` como siempre',
  /const deps = \[\.\.\.\(step\.dependsOn \?\? \[\]\)\]/.test(leer('functions/src/core/orchestrator.ts')));
check('G9-F20 · con solo `capability` y sin lista, sale UN paso: el caso simple sigue igual',
  (await crearPlannerDeWee({ availability: disponibilidadDe(['text.generate']), tracer: callado, now: reloj })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION, trace: traza('g9_0007'),
      understanding: {
        intent: 'creation', confidence: 'high', goal: 'g', capability: 'text.generate',
        inputs: { text: '', attachments: [] }, references: [], constraints: {},
        needsPlanning: true, missing: [], assumptions: [],
      },
    })).plan?.steps?.length === 1);
check('C13 intacto: el texto se sigue materializando igual',
  /export const materialDeTexto/.test(leer('functions/src/runtime/materializacion.ts')));

console.log('\n── F · EL CANARY DE REPETICIÓN: las once experiencias, de verdad ──');

/*
 * NO se cuentan las llamadas a `step(` del código: eso mide el ARCHIVO, no los
 * planes. La premisa «Business tiene 14 pasos» es ese recuento —catorce sitios
 * donde el código escribe un paso, repartidos entre todas sus ramas—; ningún
 * plan de Business tiene catorce pasos: el mayor tiene tres.
 *
 * Así que aquí se le PREGUNTA a Legacy. Se recorre cada opción de cada pregunta
 * de cada experiencia, se construye el plan de verdad con `buildPlan`, y se
 * queda una muestra por secuencia de capacidades distinta: 35 secuencias, 74
 * instancias.
 *
 * Y cuando el Planner contesta que falta material, se le trae: una rama que
 * empieza mirando una foto presupone que la persona la trajo. No es aflojar la
 * prueba —lo pide el propio Planner, con nombre— y es la única manera de medir
 * esas ramas sin inventarles un paso que las alimente.
 */
const respuestaBase = (t) => Object.fromEntries(
  (t.questions ?? []).map((q) => [q.id, q.options?.[0]?.id ?? '']));

const secuenciasDe = (t) => {
  const base = respuestaBase(t);
  const vistas = new Map();
  const probar = (respuestas) => {
    let p;
    try { p = t.buildPlan('un encargo de ejemplo', respuestas); } catch { return; }
    const caps = p.steps.map((s) => s.capability);
    vistas.set(caps.join('>'), caps);
  };
  probar(base);
  for (const q of t.questions ?? []) for (const o of q.options ?? []) probar({ ...base, [q.id]: o.id });
  return [...vistas.values()];
};

/*
 * LO QUE LA PERSONA TRAJO, RECONSTRUIDO DE LA PROPIA RAMA.
 *
 * Una rama que empieza con «mirar qué ingredientes tienes» presupone una foto:
 * Legacy la tiene porque la subió la persona. Aquí se deduce igual de bien y sin
 * inventar nada —es lo que algún paso NECESITA y ningún paso ANTERIOR produce—,
 * que es exactamente la definición de material aportado.
 *
 * No vale esperar a que el Planner lo pida: hay ramas donde NO lo pide y se lo
 * resuelve solo, mal. Eso es G10 y se mide aparte, al final de esta sección.
 */
const loQueTrajoLaPersona = (caps) => {
  const producidas = new Set();
  const traidas = new Map();
  for (const c of caps) {
    const entrada = CATALOGO.find((x) => x.id === c);
    for (const necesita of entrada?.accepts ?? []) {
      if (necesita === 'text' || producidas.has(necesita)) continue;
      if (!traidas.has(necesita)) traidas.set(necesita, { kind: necesita, assetId: `as_${necesita}` });
    }
    if (entrada?.produces) producidas.add(entrada.produces);
  }
  return [...traidas.values()];
};

const planDeLaSecuencia = (caps) =>
  planear(caps, 'g9_canary', { inputs: { text: '', attachments: loQueTrajoLaPersona(caps) } });

let SEC = 0, PASOS = 0, ANTES = 0, FIELES = 0, CON_REPE = 0, REPE_OK = 0;
const porExperiencia = {};

for (const [exp, t] of Object.entries(TEMPLATES)) {
  let sec = 0, pasos = 0, antes = 0, bien = 0, repe = 0, repeOk = 0;
  for (const caps of secuenciasDe(t)) {
    const r = await planDeLaSecuencia(caps);
    const ok = r.status === 'ready'
      && r.plan.steps.length === caps.length
      && new Set(r.plan.steps.map((s) => s.id)).size === caps.length
      && r.plan.steps.every((s, k) => s.capability === caps[k]);
    const unicas = new Set(caps).size;
    sec++; pasos += caps.length; antes += unicas; if (ok) bien++;
    if (unicas !== caps.length) { repe++; if (ok) repeOk++; }
  }
  porExperiencia[exp] = { sec, pasos, antes, bien, repe, repeOk };
  SEC += sec; PASOS += pasos; ANTES += antes; FIELES += bien; CON_REPE += repe; REPE_OK += repeOk;
  check(`${exp}: ${sec} secuencias Legacy · ${pasos} instancias · ${bien} planes fieles`,
    bien === sec,
    antes === pasos ? 'sin repetición que perder' : `el Set dejaba ${antes}, ahora ${pasos}`);
}

check('LAS 11 EXPERIENCIAS: ninguna secuencia pierde una sola instancia',
  FIELES === SEC && SEC === 35 && PASOS === 74,
  `${FIELES}/${SEC} secuencias · ${PASOS} instancias`);
check('y esas instancias son exactamente las que el `Set` tiraba',
  ANTES === 68 && PASOS - ANTES === 6,
  `antes ${ANTES}, ahora ${PASOS}: seis pasos que Weë no llegaba a dar`);
check('las 6 secuencias que REPITEN una capacidad son justo las que se arreglan',
  CON_REPE === 6 && REPE_OK === 6,
  'writer 1 · chef 1 · business 3 · brain 1');

/* Los cuatro que se pidieron por su nombre, medidos uno a uno. */
check('BUSINESS, el canary principal: 9 instancias en 4 secuencias, 3 de ellas repetían',
  porExperiencia.business?.pasos === 9 && porExperiencia.business?.antes === 6
  && porExperiencia.business?.repe === 3 && porExperiencia.business?.bien === 4,
  'era la más castigada: perdía 3 de sus 9 pasos');
check('MUSIC: 12 instancias, y el plan más largo de todo Weë son sus 4 pasos',
  porExperiencia.music?.pasos === 12 && porExperiencia.music?.bien === porExperiencia.music?.sec);
check('HOME: 10 instancias, todas representadas',
  porExperiencia.home?.pasos === 10 && porExperiencia.home?.bien === porExperiencia.home?.sec);
check('WRITER: 6 instancias, una secuencia repetía y ya no se pierde',
  porExperiencia.writer?.pasos === 6 && porExperiencia.writer?.repeOk === 1);

/*
 * ── G10, MEDIDO AQUÍ Y NO ARREGLADO AQUÍ ────────────────────────────────────
 *
 * Al reconstruir el material de cada rama apareció otra cosa, y no es G9.
 *
 * La rama «cocinar» de Weë Chef es `vision.describe → text.generate →
 * image.generate`: mira la foto de lo que tienes, escribe la receta, dibuja el
 * plato. Si esa foto NO llega, el Planner no se detiene a pedirla: ve que
 * `image.generate` produce una imagen, mueve el `vision.describe` al final y se
 * inventa la arista «describe la imagen que acabamos de dibujar».
 *
 * O sea: con la foto, fiel; sin la foto, un plan distinto del que declaró
 * Brain, sin avisar. El orden declarado deja de mandar.
 *
 * GAP        G10 · el orden topológico puede invertir el orden declarado
 * CAPA       Planner (`ordenar` + `dependenciasDe`, core/planner.ts)
 * FAMILIA    la misma que G6a: nadie declara QUÉ consume un paso
 * NO SE TOCA en C15a, que es solo G9.
 *
 * Esta comprobación fija el comportamiento de HOY. El día que G10 se cierre,
 * fallará — y eso es justo lo que se quiere de ella.
 */
const CHEF_COCINAR = ['vision.describe', 'text.generate', 'image.generate'];
const conFoto = await planDeLaSecuencia(CHEF_COCINAR);
const sinFoto = await planear(CHEF_COCINAR, 'g9_g10', { inputs: { text: '', attachments: [] } });
const pasosSin = sinFoto.plan?.steps ?? [];

check('CON la foto que la rama presupone, el Core es fiel al orden de Brain',
  igual(conFoto.plan?.steps?.map((s) => s.capability), CHEF_COCINAR)
  && conFoto.plan?.steps?.every((s) => s.dependsOn === undefined),
  'mirar → escribir → dibujar, sin aristas inventadas');
check('G10 (MEDIDO, NO ARREGLADO) · SIN ella, el Planner reordena y se inventa la arista',
  igual(pasosSin.map((s) => s.capability), ['text.generate', 'image.generate', 'vision.describe'])
  && igual(pasosSin[2]?.dependsOn, ['s2-image_generate']),
  pasosSin.map((s) => s.id + (s.dependsOn ? ' ← ' + s.dependsOn.join(',') : '')).join(' | '));
check('G10 no pierde instancias: es un problema de ORDEN, no de G9',
  pasosSin.length === CHEF_COCINAR.length && new Set(pasosSin.map((s) => s.id)).size === 3,
  'por eso se anota aparte y no bloquea C15a');


console.log('\n── G · Lo que tiene que seguir fallando ──');

/*
 * Que repetir una capacidad sea legal NO convierte en legal cualquier lista.
 * Estas tres son las que el Planner debe seguir rechazando o respetando al pie
 * de la letra, y están aquí porque C15a tocó justo el sitio donde se deciden.
 */
const rechaza = async (capabilities, capability) =>
  crearPlannerDeWee({ availability: disponibilidadDe(['text.generate']), tracer: callado, now: reloj })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION, trace: traza('g9_mala'),
      understanding: {
        intent: 'creation', confidence: 'high', goal: 'g', capability, capabilities,
        inputs: { text: '', attachments: [] }, references: [], constraints: {},
        needsPlanning: true, missing: [], assumptions: [],
      },
    });

const inexistente = await rechaza(['text.generate', 'text.inventada'], 'text.generate');
check('una capacidad que no existe se RECHAZA, y se dice cuál',
  inexistente.status === 'invalid'
  && inexistente.error?.details?.reason === 'unknown_capability'
  && String(inexistente.error?.details?.capabilities).includes('text.inventada'),
  JSON.stringify(inexistente.error?.details));

const sinCapacidad = await rechaza(['text.generate', ''], 'text.generate');
check('un paso SIN capacidad se rechaza igual: no hay paso sin capacidad',
  sinCapacidad.status === 'invalid' && sinCapacidad.error?.details?.reason === 'unknown_capability'
  && sinCapacidad.plan === undefined,
  'y no se cuela un plan a medias');

/*
 * EL DUPLICADO ACCIDENTAL, DESPUÉS DE C15a.
 *
 * Antes lo imposible era repetir. Ahora lo imposible tiene que ser OTRA cosa:
 * que salgan pasos que nadie pidió. La fidelidad se mide en los dos sentidos —
 * ni uno de menos (era G9) ni uno de más (sería inventarse trabajo que se cobra).
 */
const exacto = await Promise.all([
  [['text.generate']],
  [['text.generate', 'text.generate']],
  [['text.generate', 'text.generate', 'text.generate']],
  [['text.generate', 'image.generate', 'text.generate', 'image.generate']],
].map(async ([caps], i) => {
  const r = await planear(caps, `g9_exacto_${i}`);
  return r.plan?.steps?.length === caps.length;
}));
check('ni uno de menos ni uno de más: 1→1, 2→2, 3→3, 4→4',
  exacto.every(Boolean),
  'un paso de más es un cobro de más');


console.log('\n── H · Lo que no se creó ──');

check('`BrainUnderstanding` NO cambió: ni `steps`, ni `key`, ni `needs`',
  !/steps\?:|key\?:|needs\?:/.test(
    (leer('functions/src/core/brain.ts').match(/export interface BrainUnderstanding \{[\s\S]*?\n\}/) ?? [''])[0]),
  'la lista ordenada que ya existía bastaba');
check('no se creó ningún motor de dependencias ni de identidad',
  !/DependencyEngine|StepIdentityEngine|OutputGraph|SemanticGraph/.test(
    ['core/planner.ts', 'core/workflow.ts', 'core/orchestrator.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
check('nadie indexa pasos por capacidad: no hay dónde colapsarlos',
  !/Map<CoreCapabilityId|Record<CoreCapabilityId|Set<CoreCapabilityId/.test(
    ['core/orchestrator.ts', 'core/job.ts', 'core/workflow.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
check('Financial, Credits, Media Cloud y los adaptadores, sin tocar',
  !/pedidas|idDePaso/.test(
    ['core/financial/commerce.ts', 'core/media/entrega.ts', 'engine/continuidad.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('esta suite está en la cadena de `npm test`',
  /pasos-repetidos\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
