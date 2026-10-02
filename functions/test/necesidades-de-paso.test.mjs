/**
 * WEË — C15c: QUÉ NECESITA UN PASO, Y DE DÓNDE VIENE.
 *
 * ── El caso que lo destapó ──────────────────────────────────────────────────
 *
 * La rama «cocinar» de Weë Chef es: mira lo que tengo en la nevera → escribe la
 * receta → dibuja el plato. El Core la representaba al revés cuando no llegaba
 * la foto: veía que `image.generate` produce imágenes y que `vision.describe`
 * acepta imágenes, y las ataba. «Describe la foto que acabamos de dibujar.»
 *
 * Nadie había dicho eso. El Planner lo dedujo del catálogo, porque el catálogo
 * era lo único que tenía.
 *
 * ── Lo que se añade, y lo que NO ────────────────────────────────────────────
 *
 * Brain puede declarar sus pasos, y cada paso, qué necesita y de dónde:
 * `from:'user'` —lo que ya existe— o `from:'upstream'` —lo que produce OTRO
 * paso, dicho por su nombre, nunca «el último que produjo una imagen»—.
 *
 * `Plan` y `PlanStep` NO cambian ni un campo. Una necesidad no viaja: se
 * resuelve en los canales que ya existían —`uses` y `dependsOn`—, así que el
 * Workflow, el Orchestrator, el Job, el Gateway, G8 y C13 no se enteran.
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
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const { PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION } = core;
const { crearPlannerDeWee, disponibilidadDe } = lib('planner/index.js');
const { crearWorkflowEngineDeWee } = lib('workflow/index.js');
const { orquestadorDeWee } = lib('orchestrator/index.js');

const callado = { record() {} };
const reloj = () => 1_000;
const traza = (id) => ({ traceId: id, requestId: id, userId: 'acc_mia' });

const TODAS = ['text.generate', 'image.generate', 'vision.describe', 'image.edit', 'video.image_to_video', 'text.search'];

const planear = (steps, extra = {}) => {
  const caps = Array.isArray(steps) ? steps.map((s) => s?.capability).filter((c) => typeof c === 'string') : [];
  return crearPlannerDeWee({
    availability: disponibilidadDe([...new Set([...caps, ...TODAS])]), tracer: callado, now: reloj,
  }).planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza('c15c'),
    understanding: {
      intent: 'creation', confidence: 'high', goal: 'un encargo',
      capability: caps[0], capabilities: [...new Set(caps)], steps,
      inputs: { text: '', attachments: [] }, references: [], constraints: {},
      needsPlanning: true, missing: [], assumptions: [], ...extra,
    },
  });
};
const conFoto = (steps, extra = {}) =>
  planear(steps, { inputs: { text: '', attachments: [{ kind: 'image', assetId: 'as_foto' }] }, ...extra });

const razon = (r) => r.error?.details?.reason;
const campo = (r) => r.error?.details?.field;

/* Los tres pasos de Chef/cocinar, declarados como de verdad son. */
const CHEF = [
  { key: 'mirar', capability: 'vision.describe', needs: [{ from: 'user', modality: 'image', required: true }] },
  { key: 'receta', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'mirar', modality: 'text' }] },
  { key: 'plato', capability: 'image.generate', needs: [{ from: 'upstream', stepKey: 'receta', modality: 'text' }] },
];

console.log('\n── A · El contrato: pasos con identidad y necesidades ──');

const tres = await planear([
  { key: 'guion', capability: 'text.generate' },
  { key: 'pie', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'guion', modality: 'text' }] },
  { key: 'titulo', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'guion', modality: 'text' }] },
]);
check('C15c-F1 · `steps` admite la MISMA capacidad varias veces',
  tres.status === 'ready' && tres.plan?.steps?.length === 3
  && tres.plan.steps.every((s) => s.capability === 'text.generate'),
  JSON.stringify(tres.plan?.steps?.map((s) => s.id)));
check('C15c-F2 · cada paso conserva identidad propia',
  new Set(tres.plan.steps.map((s) => s.id)).size === 3);
check('C15c-F3 · la necesidad es DEL PASO: los dos apuntan al primero, el primero a nadie',
  tres.plan.steps[0].dependsOn === undefined
  && igual(tres.plan.steps[1].dependsOn, ['s1-text_generate'])
  && igual(tres.plan.steps[2].dependsOn, ['s1-text_generate']),
  'y no al «último texto disponible», que habría sido s2');
check('`plan.capabilities` sigue siendo el CONJUNTO, como antes de C15c',
  igual(tres.plan.capabilities, ['text.generate']));

console.log('\n── B · EL CASO CHEF, que es de lo que iba todo esto ──');

const chefConFoto = await conFoto(CHEF);
check('C15c-F4 · `from:user` se resuelve contra los recursos del plan: `uses`',
  chefConFoto.status === 'ready' && igual(chefConFoto.plan?.steps?.[0]?.uses, [0])
  && igual(chefConFoto.plan?.references, [{ kind: 'image', assetId: 'as_foto' }]),
  'la foto de la persona llega al paso que la mira');
check('C15c-F5/F6 · `from:upstream` se resuelve contra el paso NOMBRADO: `dependsOn`',
  igual(chefConFoto.plan.steps.map((s) => s.dependsOn ?? null),
    [null, ['s1-vision_describe'], ['s2-text_generate']]),
  'mirar → receta → plato: las DOS aristas que Legacy declara');
check('y el orden es el declarado, no uno deducido del catálogo',
  igual(chefConFoto.plan.steps.map((s) => s.capability),
    ['vision.describe', 'text.generate', 'image.generate']));
check('C15c-F13 · SIN la foto no se inventa nada: se PREGUNTA, y antes de Credits',
  await (async () => {
    const r = await planear(CHEF);
    return r.status === 'needs_clarification' && igual(r.clarification?.missing, ['material:image']);
  })(),
  'en vez de «describe la imagen que acabamos de dibujar»');
check('sin declarar, el comportamiento de antes queda INTACTO',
  await (async () => {
    const r = await crearPlannerDeWee({ availability: disponibilidadDe(['vision.describe', 'text.generate', 'image.generate']), tracer: callado, now: reloj })
      .planificar({
        contract: PLANNER_CONTRACT_VERSION, trace: traza('c15c_viejo'),
        understanding: {
          intent: 'creation', confidence: 'high', goal: 'g', capability: 'vision.describe',
          capabilities: ['vision.describe', 'text.generate', 'image.generate'],
          inputs: { text: '', attachments: [] }, references: [], constraints: {},
          needsPlanning: true, missing: [], assumptions: [],
        },
      });
    return r.status === 'ready' && igual(r.plan?.steps?.[2]?.dependsOn, ['s2-image_generate']);
  })(),
  'G10 sigue ahí para quien no declara: C15c no le cambia el plan a nadie sin avisar');

console.log('\n── C · La misma capacidad, dos fuentes distintas ──');

/* `image.edit` toma la foto de la persona en Weë Chef y una imagen upstream en Weë Photo. */
const editaLaTuya = await conFoto([
  { key: 'retocar', capability: 'image.edit', needs: [{ from: 'user', modality: 'image', required: true }] },
]);
const editaLaNuestra = await planear([
  { key: 'crear', capability: 'image.generate' },
  { key: 'retocar', capability: 'image.edit', needs: [{ from: 'upstream', stepKey: 'crear', modality: 'image' }] },
]);
check('`image.edit` con la foto de la persona: `uses`, y ninguna dependencia',
  igual(editaLaTuya.plan?.steps?.[0]?.uses, [0]) && editaLaTuya.plan?.steps?.[0]?.dependsOn === undefined);
check('C15c-F16 · la MISMA capacidad con imagen upstream: dependencia, y ningún `uses`',
  igual(editaLaNuestra.plan?.steps?.[1]?.dependsOn, ['s1-image_generate'])
  && editaLaNuestra.plan?.steps?.[1]?.uses === undefined,
  '`accepts: image` no decide la fuente; la instancia sí');

/*
 * Y EL CASO QUE DE VERDAD LOS SEPARA: la persona SÍ trajo una foto, y aun así
 * este paso no la usa, porque dijo que su imagen viene del paso anterior.
 *
 * Sin esto, «respeta la fuente» y «reparte por modalidad» dan el mismo
 * resultado siempre que no haya material — que es justo cuando da igual.
 */
const conFotoYUpstream = await conFoto([
  { key: 'crear', capability: 'image.generate' },
  { key: 'retocar', capability: 'image.edit', needs: [{ from: 'upstream', stepKey: 'crear', modality: 'image' }] },
]);
check('habiendo foto de la persona, un paso que pidió upstream NO se la lleva',
  conFotoYUpstream.status === 'ready'
  && conFotoYUpstream.plan?.references?.length === 1
  && conFotoYUpstream.plan?.steps?.[1]?.uses === undefined
  && igual(conFotoYUpstream.plan?.steps?.[1]?.dependsOn, ['s1-image_generate']),
  'la foto está ahí y no la toca: dijo de dónde venía la suya');
console.log('\n── D · Lo que el Planner ya NO deduce ──');

const dosProductores = await planear([
  { key: 'a', capability: 'text.generate' },
  { key: 'b', capability: 'text.generate' },
  { key: 'c', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'a', modality: 'text' }] },
]);
check('C15c-F18/F19 · con DOS productores, el consumidor señala a uno y es ese',
  igual(dosProductores.plan?.steps?.[2]?.dependsOn, ['s1-text_generate']),
  'nunca «el último», que habría sido s2');
check('C15c-F15 · un paso sin `needs` no genera NINGUNA dependencia',
  dosProductores.plan?.steps?.[0]?.dependsOn === undefined
  && dosProductores.plan?.steps?.[1]?.dependsOn === undefined);
check('C15c-F17 · `produces` ya no elige consumidor',
  await (async () => {
    const r = await planear([
      { key: 'texto', capability: 'text.generate' },
      { key: 'imagen', capability: 'image.generate' },
      { key: 'video', capability: 'video.image_to_video', needs: [{ from: 'user', modality: 'image' }] },
    ], { inputs: { text: '', attachments: [{ kind: 'image', assetId: 'as_mia' }] } });
    return r.status === 'ready' && r.plan.steps[2].dependsOn === undefined && igual(r.plan.steps[2].uses, [0]);
  })(),
  'hay un productor de imagen justo delante y NO se usa');

/*
 * DECLARADO NO SE REORDENA, y este es el caso que lo prueba.
 *
 * `ordenarPorDependencia` sobre estas dos capacidades sin foto contesta
 * `{orden:['text.generate'], sinResolver:['vision.describe']}` — o sea que las
 * daría la vuelta Y ADEMÁS metería un `image.generate` para alimentar al que
 * mira. Con la declaración delante no hace ninguna de las dos cosas.
 *
 * La foto es `required:false` a propósito: así el plan es válido sin ella y lo
 * único que queda por comprobar es el orden.
 */
const noReordena = await planear([
  { key: 'mirar', capability: 'vision.describe', needs: [{ from: 'user', modality: 'image', required: false }] },
  { key: 'texto', capability: 'text.generate' },
]);
check('el orden declarado NO se reordena, aunque el catálogo diría otra cosa',
  noReordena.status === 'ready'
  && igual(noReordena.plan?.steps?.map((s) => s.capability), ['vision.describe', 'text.generate']),
  'sin declaración saldría `text.generate` primero');
check('ni se cuela un paso que nadie pidió para alimentar al primero',
  noReordena.plan?.steps?.length === 2,
  'el autocompletado del catálogo tampoco corre');
/*
 * EL SILENCIO CAE DEL LADO SEGURO.
 *
 * Un paso declarado que no dice de dónde sale su imagen no autoriza a nadie a
 * buscársela en el plan: se trata como material de la persona y obligatorio.
 * Nunca crea una dependencia — como mucho, hace que Weë pregunte.
 */
const calladito = await planear([
  { key: 'crear', capability: 'image.generate' },
  { key: 'retocar', capability: 'image.edit' },
]);
check('un paso declarado que NO dice de dónde sale su imagen: se pregunta',
  calladito.status === 'needs_clarification' && igual(calladito.clarification?.missing, ['material:image']),
  'y no «la que acabamos de dibujar», que era justo el error');
check('y con la foto delante, la usa y sigue sin depender de nadie',
  await (async () => {
    const r = await conFoto([
      { key: 'crear', capability: 'image.generate' },
      { key: 'retocar', capability: 'image.edit' },
    ]);
    return r.status === 'ready' && igual(r.plan?.steps?.[1]?.uses, [0]) && r.plan.steps[1].dependsOn === undefined;
  })());
console.log('\n── E · Lo que se rechaza, y con qué nombre ──');

const malos = [
  ['C15c-F2b · clave repetida', [{ key: 'a', capability: 'text.generate' }, { key: 'a', capability: 'text.generate' }], 'duplicate_step_key'],
  ['clave vacía', [{ key: '', capability: 'text.generate' }], 'invalid_request'],
  ['clave con forma inválida', [{ key: 'Paso 1!', capability: 'text.generate' }], 'invalid_request'],
  ['paso sin capacidad', [{ key: 'a' }], 'invalid_request'],
  ['capacidad inexistente', [{ key: 'a', capability: 'text.inventada' }], 'unknown_capability'],
  ['C15c-F7 · stepKey inexistente', [{ key: 'a', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'nadie', modality: 'text' }] }], 'unknown_step_key'],
  ['C15c-F8 · dependencia de sí mismo', [{ key: 'a', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'a', modality: 'text' }] }], 'unknown_step_key'],
  ['C15c-F9/F10 · señalar a un paso POSTERIOR, y con ello el ciclo',
    [{ key: 'a', capability: 'text.generate', needs: [{ from: 'upstream', stepKey: 'b', modality: 'text' }] }, { key: 'b', capability: 'text.generate' }], 'unknown_step_key'],
  ['necesidad repetida', [{ key: 'a', capability: 'image.edit', needs: [{ from: 'user', modality: 'image' }, { from: 'user', modality: 'image' }] }], 'duplicate_need'],
  ['C15c-F11 · fuente inválida', [{ key: 'a', capability: 'text.generate', needs: [{ from: 'contexto', modality: 'text' }] }], 'invalid_source'],
  ['C15c-F12 · modalidad que la capacidad NO acepta', [{ key: 'a', capability: 'text.generate', needs: [{ from: 'user', modality: 'video' }] }], 'modality_not_accepted'],
  ['C15c-F12b · el upstream produce otra cosa de la que se pide',
    [{ key: 'a', capability: 'image.generate' }, { key: 'b', capability: 'image.edit', needs: [{ from: 'upstream', stepKey: 'a', modality: 'text' }] }], 'modality_mismatch'],
  ['`stepKey` sin `upstream`: una declaración que se contradice',
    [{ key: 'a', capability: 'text.generate', needs: [{ from: 'user', modality: 'text', stepKey: 'x' }] }], 'invalid_request'],
  ['C15c-F20 · proveedor dentro de la necesidad',
    [{ key: 'a', capability: 'text.generate', needs: [{ from: 'user', modality: 'text', providerId: 'gemini' }] }], 'implementation_not_allowed'],
  ['C15c-F20b · modelo dentro del paso', [{ key: 'a', capability: 'text.generate', modelId: 'x' }], 'implementation_not_allowed'],
  ['C15c-F21 · assetId dentro de la necesidad',
    [{ key: 'a', capability: 'image.edit', needs: [{ from: 'user', modality: 'image', assetId: 'as_1' }] }], 'invalid_request'],
  ['C15c-F22 · outputRef dentro de la necesidad',
    [{ key: 'a', capability: 'text.generate', needs: [{ from: 'user', modality: 'text', outputRef: 'as_1' }] }], 'invalid_request'],
  ['C15c-F23 · URL dentro de la necesidad',
    [{ key: 'a', capability: 'image.edit', needs: [{ from: 'user', modality: 'image', url: 'https://x/y.jpg' }] }], 'invalid_request'],
];
for (const [nombre, steps, esperado] of malos) {
  const r = await planear(steps);
  check(nombre, r.status === 'invalid' && razon(r) === esperado && r.plan === undefined,
    `${razon(r) ?? r.status}${campo(r) ? ' @ ' + campo(r) : ''}`);
}
check('C15c-F14 · una necesidad `required:false` que falta NO detiene el plan',
  await (async () => {
    const r = await planear([{ key: 'a', capability: 'image.edit', needs: [{ from: 'user', modality: 'image', required: false }] }]);
    return r.status === 'ready' && r.plan.steps[0].uses === undefined;
  })(),
  'el silencio obliga; decir que no, no');

console.log('\n── F · Lo que no se rompió ──');

const conTodo = await conFoto([
  { key: 'mirar', capability: 'vision.describe', needs: [{ from: 'user', modality: 'image' }] },
  { key: 'editar', capability: 'image.edit', needs: [{ from: 'user', modality: 'image' }] },
], {
  constraints: { kind: 'restore' },
  preferences: { quality: 'max', creative: { version: 1, lighting: { type: 'natural' } } },
});
check('C15c-F24 · lo creativo sigue intacto en `hints`',
  conTodo.plan?.steps?.[1]?.hints?.creative?.lighting?.type === 'natural'
  && conTodo.plan?.steps?.[1]?.hints?.quality === 'max');
check('C15c-F26 · `references` y `uses` siguen siendo el mismo mecanismo',
  conTodo.plan?.references?.length === 1
  && igual(conTodo.plan.steps[0].uses, [0]) && igual(conTodo.plan.steps[1].uses, [0]),
  'un solo material, dos pasos, sin copiarlo');
check('la variante del catálogo sigue llegando al `input`',
  conTodo.plan?.steps?.[1]?.input?.kind === 'restore');
check('C15c-F25 · la continuidad sigue viajando por `hints`, sin tocarla',
  /continuity\?: ContinuityRequirements/.test(leer('functions/src/core/gateway.ts')));
check('`Plan` y `PlanStep` NO ganaron ni un campo: una necesidad no viaja, se resuelve',
  !/needs/.test((leer('functions/src/core/planner.ts').match(/export interface PlanStep \{[\s\S]*?\n\}/) ?? [''])[0])
  && !/needs/.test((leer('functions/src/core/planner.ts').match(/export interface Plan \{[\s\S]*?\n\}/) ?? [''])[0]),
  'por eso el Workflow, el Job y el Gateway no se enteran');
check('C15c-F27 · G8 intacto: el upstream se sigue armando desde `dependsOn`',
  /const deps = \[\.\.\.\(step\.dependsOn \?\? \[\]\)\]/.test(leer('functions/src/core/orchestrator.ts')));
check('G9 intacto: la identidad de paso no cambió de forma',
  tres.plan.steps.every((s) => /^s\d+-[a-z_]+$/.test(s.id)));
check('la `key` de Brain NO sale al plan: es de Brain y se queda en Brain',
  chefConFoto.plan.steps.every((s) => !/mirar|receta|plato/.test(JSON.stringify(s))),
  'lo que viaja son ids de paso, no los nombres del encargo');

console.log('\n── G · Y abajo, todo sigue funcionando ──');

const wf = await crearWorkflowEngineDeWee({ tracer: callado, now: reloj })
  .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza('c15c'), plan: chefConFoto.plan });
check('el Workflow acepta el plan declarado, con sus aristas',
  wf.status === 'ready' && wf.workflow?.steps?.length === 3
  && igual(wf.workflow.steps[1].dependsOn, ['s1-vision_describe']),
  wf.status === 'ready' ? '' : JSON.stringify(wf.error));
const montado = orquestadorDeWee(wf.workflow);
const arranque = montado.ok && montado.orchestrator.avanzar({
  contract: '1.0', principal: { userId: 'acc_mia' },
  run: montado.prepared.iniciar(traza('c15c')).run, at: 10,
});
check('y el Orchestrator despacha SOLO el primero: la cadena se respeta',
  arranque && arranque.dispatch?.length === 1 && arranque.dispatch[0].stepId === 's1-vision_describe'
  && igual(arranque.dispatch[0].references, [{ kind: 'image', assetId: 'as_foto' }]),
  arranque ? arranque.dispatch?.map((d) => d.stepId).join(' ') : JSON.stringify(montado.error));
check('C15c-F28 · no se creó ningún motor nuevo',
  !/NeedsEngine|DependencyEngine|SourceResolver|NeedResolver/.test(
    ['core/planner.ts', 'core/brain.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
check('`ContextNeed` NO se tocó: sigue siendo del contexto visual y sin saber de pasos',
  !/from:|stepKey/.test((leer('functions/src/core/visual-context.ts').match(/export interface ContextNeed \{[\s\S]*?\n\}/) ?? [''])[0]));
check('esta suite está en la cadena de `npm test`',
  /necesidades-de-paso\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
