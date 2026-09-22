/**
 * WEË — C11.2: LO QUE LA PERSONA APORTA, VIAJANDO POR EL CORE.
 *
 * ── El hueco que esto cierra ────────────────────────────────────────────────
 *
 * C11.1 fue a migrar Photo y se encontró con que no se podía: la foto existe en
 * el entendimiento —estructurada, con su `assetId`— y NO tenía forma de llegar
 * al paso que la necesita. El Planner la miraba solo para deducir qué
 * modalidades había aportado alguien, y ahí se acababa; ni el Plan ni el
 * Workflow tenían dónde ponerla. Llegaba al proveedor porque
 * `creator/inputs.ts` se la inyectaba en ejecución, que es Legacy siendo
 * autoridad de algo que es del Core.
 *
 * ── La regla que hace esto pequeño ──────────────────────────────────────────
 *
 *   `PlanStep.input` = parámetros de la tarea.
 *   recursos         = material del que alguien es dueño.
 *
 * Y no se mezclan. Una foto dentro de `input` habría metido material con dueño
 * en el mismo saco que `count` o `kind`, y la autorización habría acabado
 * dependiendo de mirar las claves de un objeto libre.
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
const { PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION, MAX_RECURSOS_DEL_PLAN } = core;
const { crearPlannerDeWee, disponibilidadDe } = lib('planner/index.js');
const { crearWorkflowEngineDeWee } = lib('workflow/index.js');
const { orquestadorDeWee } = lib('orchestrator/index.js');

const callado = { record() {} };
const traza = (id) => ({ traceId: id, requestId: id, userId: 'acc_mia' });
const motor = crearWorkflowEngineDeWee({ tracer: callado, now: () => 1 });

/* La foto que alguien adjuntó, con la llave con la que después se comprueba de quién es. */
const FOTO = { kind: 'image', assetId: 'as_abuela_0001', name: 'abuela.jpg' };
const OTRA = { kind: 'image', assetId: 'as_patio_0001', name: 'patio.jpg' };

const CAPS = ['vision.describe', 'image.edit'];
const planificar = (understanding, id, caps = CAPS) =>
  crearPlannerDeWee({ availability: disponibilidadDe(caps), tracer: callado, now: () => 1 })
    .planificar({ contract: PLANNER_CONTRACT_VERSION, trace: traza(id), understanding });

/* Para los casos «sin recursos»: una capacidad que no necesita material. */
const sinMaterial = (extra = {}) => entender([], {
  capability: 'text.generate', capabilities: ['text.generate'], constraints: {}, ...extra,
});

const entender = (attachments = [], extra = {}) => ({
  intent: 'creation', confidence: 'high', goal: 'restaurar la foto de mi abuela',
  capability: 'image.edit', capabilities: ['vision.describe', 'image.edit'],
  inputs: { text: '', attachments }, references: [], constraints: { kind: 'restore' },
  needsPlanning: true, missing: [], assumptions: [],
  ...extra,
});

console.log('\n── A · El Plan transporta lo que se aportó ──');

const conFoto = await planificar(entender([FOTO]), 'c112_0001');
const plan = conFoto.plan;

check('el Plan lleva los recursos, y son el MISMO contrato de siempre',
  conFoto.status === 'ready' && igual(plan?.references, [FOTO]),
  JSON.stringify(plan?.references));
check('sin recursos, el Plan sale exactamente como antes: sin la clave',
  (await planificar(sinMaterial(), 'c112_0002', ['text.generate'])).plan?.references === undefined);
check('no se convierten en texto ni en prompt',
  !JSON.stringify(plan).includes('abuela.jpg\\n')
  && plan?.steps?.every((s) => !JSON.stringify(s.input ?? {}).includes('as_abuela_0001')),
  'el `assetId` no aparece dentro de ningún `input`');
check('no se convierten en URL pública: sigue siendo el `assetId`',
  plan?.references?.[0]?.assetId === 'as_abuela_0001' && plan?.references?.[0]?.url === undefined);
check('no se convierten en configuración de proveedor',
  !/imageUrl|referenceImages|providerId|modelId/.test(JSON.stringify(plan)));
check('acotados: no cabe más de lo que alguien puede adjuntar a un mensaje',
  (await planificar(entender(Array.from({ length: MAX_RECURSOS_DEL_PLAN + 3 }, () => FOTO)), 'c112_0003'))
    .plan?.references?.length === MAX_RECURSOS_DEL_PLAN,
  `tope ${MAX_RECURSOS_DEL_PLAN}`);

console.log('\n── B · Cada paso declara cuáles usa ──');

const mirar = plan?.steps?.find((s) => s.capability === 'vision.describe');
const editar = plan?.steps?.find((s) => s.capability === 'image.edit');

check('el paso que acepta imagen declara la foto; por posición, no por copia',
  igual(mirar?.uses, [0]) && igual(editar?.uses, [0]),
  'los dos aceptan imagen según el catálogo');
check('la regla sale del CATÁLOGO, no de una lista escrita a mano',
  /entrada\.accepts\.includes\(modalidad\)/.test(leer('functions/src/core/planner.ts')));
check('una capacidad que no acepta imagen no se lleva la foto',
  (await planificar(
    entender([FOTO], { capability: 'text.generate', capabilities: ['text.generate'], constraints: {} }),
    'c112_0004', ['text.generate'],
  )).plan?.steps?.[0]?.uses === undefined);
check('sin recursos, un paso sale exactamente como antes: sin la clave',
  (await planificar(sinMaterial(), 'c112_0005', ['text.generate'])).plan?.steps?.every((s) => s.uses === undefined));
check('y un paso que NECESITA material y no lo tiene se detecta AQUÍ, no en ejecución',
  (await planificar(entender([]), 'c112_0005b')).status === 'needs_clarification',
  'el Planner pregunta; nadie completa la entrada más tarde');
check('dos recursos dan dos posiciones, en el orden del plan',
  igual((await planificar(entender([FOTO, OTRA]), 'c112_0006')).plan?.steps?.[0]?.uses, [0, 1]));

console.log('\n── C · El Workflow los conserva enteros y en orden ──');

const construido = await motor.construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza('c112_0001'), plan });
const wf = construido.workflow;

check('el motor copia los recursos del Plan al Workflow',
  construido.status === 'ready' && igual(wf?.references, [FOTO]),
  construido.status === 'ready' ? 'ok' : JSON.stringify(construido.error));
check('ENTEROS Y EN ORDEN: sin filtrar ni reordenar, porque los pasos apuntan por posición',
  igual(wf?.references, plan?.references));
check('y los pasos conservan a cuáles apuntan',
  igual(wf?.steps?.find((s) => s.capability === 'image.edit')?.uses, [0]));
check('un Workflow sin recursos sale como antes',
  (await motor.construir({
    contract: WORKFLOW_CONTRACT_VERSION, trace: traza('c112_0007'),
    plan: (await planificar(sinMaterial(), 'c112_0007', ['text.generate'])).plan,
  })).workflow?.references === undefined);

console.log('\n── D · Índices: las cuatro reglas ──');

const conUsos = async (uses, references, id) => motor.construir({
  contract: WORKFLOW_CONTRACT_VERSION, trace: traza(id),
  plan: { ...plan, id: `plan_${id}`, references, steps: [{ ...plan.steps[0], uses }] , capabilities: [plan.steps[0].capability] },
});

check('un índice NEGATIVO invalida el workflow',
  (await conUsos([-1], [FOTO], 'c112_0008')).status === 'invalid');
check('un índice FUERA DE RANGO invalida el workflow',
  (await conUsos([3], [FOTO], 'c112_0009')).status === 'invalid');
check('un índice sin recursos que señalar invalida el workflow',
  (await conUsos([0], undefined, 'c112_0010')).status === 'invalid',
  'apuntar a una lista vacía es apuntar a nada');
check('un DUPLICADO se RECHAZA, no se normaliza en silencio',
  (await conUsos([0, 0], [FOTO, OTRA], 'c112_0011')).status === 'invalid',
  'DECISIÓN: rechazar. Normalizar habría escondido un plan mal construido');
check('un índice no entero invalida el workflow',
  (await conUsos([0.5], [FOTO], 'c112_0012')).status === 'invalid');
check('una lista vacía de usos invalida: declarar que no usas nada es no declarar nada',
  (await conUsos([], [FOTO], 'c112_0013')).status === 'invalid');
check('y un índice válido, válido',
  (await conUsos([1], [FOTO, OTRA], 'c112_0014')).status === 'ready');

console.log('\n── E · El Orchestrator los despacha resueltos ──');

const montado = orquestadorDeWee(wf);
const arranque = montado.ok
  ? montado.orchestrator.avanzar({
      contract: '1.0', principal: { userId: 'acc_mia' },
      run: montado.prepared.iniciar(traza('c112_0001')).run, at: 10,
    })
  : undefined;
const despacho = arranque?.dispatch?.[0];

check('el despacho lleva el material del paso, ya buscado por su posición',
  igual(despacho?.references, [FOTO]),
  montado.ok ? JSON.stringify(despacho?.references) : JSON.stringify(montado.error));
check('y sigue llevando input, hints y restricciones como antes',
  despacho?.input !== undefined && despacho?.constraints !== undefined);
check('quien ejecuta no ve índices: recibe lo suyo',
  despacho?.uses === undefined);
check('y un paso que no pidió nada no lleva la clave en el despacho',
  (() => {
    const solo = orquestadorDeWee({ ...wf, steps: [{ ...wf.steps[0], uses: undefined }] });
    if (!solo.ok) return false;
    const d = solo.orchestrator.avanzar({
      contract: '1.0', principal: { userId: 'acc_mia' },
      run: solo.prepared.iniciar(traza('c112_0015')).run, at: 10,
    }).dispatch?.[0];
    return d?.references === undefined;
  })());

console.log('\n── F · Autorización: nada de esto la relaja ──');

check('lo que viaja es el `assetId`, no una dirección firmada',
  !JSON.stringify(despacho?.references).includes('http'),
  'la llave la sigue firmando Media Cloud, y solo para quien pueda');
check('el Planner no lee nada de nadie: no consulta, no autoriza, no resuelve',
  !/collection\(|where\(|leerElemento|leerMaterial|solicitarEntrega|await /.test(
    sinComentarios(leer('functions/src/core/planner.ts')).split('const recursosDelPaso')[1]?.split('};')[0] ?? ''));
check('el Orchestrator tampoco: traduce posiciones y ya',
  !/collection\(|leerMaterial|solicitarEntrega|ownerAccountId/.test(
    sinComentarios(leer('functions/src/core/orchestrator.ts')).split('const recursosDe')[1]?.split('};')[0] ?? ''));
check('la autorización sigue donde estaba: C8 con la cuenta y la entrega',
  /resolverReferenciasDeContinuidad/.test(leer('functions/src/engine/referencias.ts'))
  && /solicitarEntrega/.test(leer('functions/src/engine/referencias-de-wee.ts')));
check('el cliente no elige nada: la cuenta la pone el servidor',
  /deps\.referencias\(trace\.userId,/.test(leer('functions/src/engine/gateway.ts')));

console.log('\n── G · El Core ya no depende de Legacy para esto ──');

check('`creator/inputs.ts` sigue existiendo para Legacy, intacto',
  /if \(job\.inputImageUrl && IMAGE_INPUT_CAPS\.includes\(capability\)/.test(leer('functions/src/creator/inputs.ts')),
  'Legacy no se rompe');
check('pero el camino Core no lo nombra en ninguna parte',
  !/creator\/inputs|stepInputFor|inputImageUrl/.test(
    ['core/planner.ts', 'core/workflow.ts', 'core/orchestrator.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
check('no se creó un segundo sistema de contexto, de materiales ni de autorización',
  !/PlanResource|ContextResource|InputResource|AttachmentEngine|ResourceEngine/.test(
    ['core/planner.ts', 'core/workflow.ts', 'core/orchestrator.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
check('se reutiliza `BrainAttachment`: ni un tipo nuevo',
  /references\?: readonly BrainAttachment\[\]/.test(leer('functions/src/core/planner.ts'))
  && /references\?: readonly BrainAttachment\[\]/.test(leer('functions/src/core/workflow.ts'))
  && /references\?: readonly BrainAttachment\[\]/.test(leer('functions/src/core/orchestrator.ts')));

console.log('\n── H · Lo que no se tocó ──');

check('`SkillPlanContribution` sigue sin aportar recursos ni entrada',
  !/references|uses|input/.test(leer('functions/src/core/skill.ts').split('interface SkillPlanContribution')[1]?.split('}')[0] ?? ''));
check('Continuity, Financial, Credits y Media Cloud, intactos',
  !/references\?: readonly BrainAttachment|uses\?: readonly number/.test(
    ['core/continuity.ts', 'core/financial/commerce.ts', 'core/media/entrega.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('el Router no conoce recursos',
  !/references|uses\b|BrainAttachment/.test(sinComentarios(leer('functions/src/core/router.ts'))));
check('el Gateway no necesitó cambiar',
  !/BrainAttachment/.test(leer('functions/src/core/gateway.ts')));
check('`input` sigue siendo solo parámetros: ni un recurso dentro',
  igual(Object.keys(editar?.input ?? {}).sort(), ['brief', 'kind']));
check('esta suite está en la cadena de `npm test`',
  /plan-recursos\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
