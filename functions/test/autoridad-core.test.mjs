/**
 * WEË — C10: LA CADENA DEL CORE, MONTADA DE VERDAD.
 *
 * ── Qué prueba esto que no probaba C6 ───────────────────────────────────────
 *
 * C6 demostró que la continuidad SOBREVIVE el viaje, llamando a mano a las
 * piezas. Aquí se monta la cadena con las COMPOSICIONES DE WEË —el Planner de
 * Weë, el motor de workflows de Weë, el orquestador de Weë— y con el caller que
 * faltaba en la frontera:
 *
 *   entendimiento
 *     → entendimientoParaPlanificar        ← EL CALLER QUE NO EXISTÍA
 *     → crearPlannerDeWee().planificar     → Plan  (con hints)
 *     → crearWorkflowEngineDeWee().construir({plan})  → Workflow
 *     → orquestadorDeWee(workflow) → avanzar → despacho
 *     → peticionDeGateway                  → execution.hints
 *     → C8 resolverReferenciasDeContinuidad → material autorizado
 *     → C7 traducirContinuidad             → parcial, y ni un ápice más
 *
 * Y lo que importa tanto como que funcione: que el Workflow NO se construya a
 * mano. Un objeto `{steps:[...]}` escrito por quien llama es un plan disfrazado,
 * y mientras eso sea la fuente de verdad el Planner no es la autoridad de nada.
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
const { leerIntencionDeContinuidad, candidatosDesdeElementos, PLANNER_CONTRACT_VERSION,
  WORKFLOW_CONTRACT_VERSION, ORCHESTRATOR_CONTRACT_VERSION, continuidadValida } = core;
const { crearPlannerDeWee, entendimientoParaPlanificar, disponibilidadDe } = lib('planner/index.js');
const { crearWorkflowEngineDeWee } = lib('workflow/index.js');
const { orquestadorDeWee } = lib('orchestrator/index.js');
const { peticionDeGateway } = lib('job/index.js');
const { resolverReferenciasDeContinuidad, materialEnLaEntrada } = lib('engine/referencias.js');
const { traducirContinuidad, materialDeLaEntrada, cubreLoExigido } = lib('engine/continuidad.js');

const callado = { record() {} };
const CAPS = ['image.generate'];
const planner = crearPlannerDeWee({ availability: disponibilidadDe(CAPS), tracer: callado, now: () => 1 });
const motor = crearWorkflowEngineDeWee({ tracer: callado, now: () => 1 });
const traza = (id) => ({ traceId: id, requestId: id, userId: 'acc_mia' });

/* ── El mundo de la cuenta, tal como lo trae el contexto visual de S4 ─────── */

const ELEMENTOS = [
  { elementId: 'el_luna_0001', name: 'Luna', version: 4, status: 'active' },
  { elementId: 'el_casa_0001', name: 'La casa', version: 2, status: 'active' },
  { elementId: 'el_vieja_0001', name: 'Luna vieja', version: 1, status: 'archived' },
];

/* Lo que el modelo entendió de «pon a Luna en esta casa, mismo rostro, otro vestido». */
const DEL_MODELO = {
  preserve: ['identity.face', 'architecture.geometry'],
  mayChange: ['outfit.clothing', 'lighting.timeOfDay'],
  strength: 'strict',
  subjects: ['Luna', 'La casa'],
};

const CREATIVO = { version: 1, shot: { type: 'close_up' }, lighting: { type: 'soft' } };

const entendimiento = (extra = {}) => ({
  intent: 'creation', confidence: 'high', goal: 'un retrato de Luna en la casa',
  capability: 'image.generate', capabilities: ['image.generate'],
  inputs: { text: '', attachments: [] }, references: [], constraints: {},
  needsPlanning: true, missing: [], assumptions: [],
  ...extra,
});

console.log('\n── A · B1 · El entendimiento deja de perderse ──');

const candidatos = candidatosDesdeElementos(ELEMENTOS);
check('los candidatos salen de los elementos YA leídos: cero consultas',
  candidatos.length === 2 && candidatos.every((c) => c.elementId && c.name && Number.isInteger(c.version)),
  JSON.stringify(candidatos.map((c) => `${c.name}@${c.version}`)));
check('lo archivado no compite por un nombre',
  !candidatos.some((c) => c.elementId === 'el_vieja_0001'),
  'una Luna retirada hace meses no puede empatar con la viva');
check('la proyección no lee nada: ni red, ni base de datos',
  !/await |fetch\(|firestore|collection\(/.test(
    sinComentarios(leer('functions/src/core/continuity-intent.ts')).split('candidatosDesdeElementos')[1] ?? ''));
check('y el contexto visual los DEVUELVE en vez de tirarlos',
  /candidatos: candidatosDesdeElementos\(mundo\.elementos\)/.test(leer('functions/src/elements/contexto.ts'))
  && /candidatos: readonly CandidatoDeContinuidad\[\]/.test(leer('functions/src/elements/contexto.ts')),
  'estaban en la mano y se perdían al salir de la función');
check('sin consulta nueva: el contexto sigue teniendo UNA sola llamada al mundo',
  (leer('functions/src/elements/contexto.ts').match(/mundoDeContextoDeWee\(/g) ?? []).length === 1);

console.log('\n── B · B1 · La frontera de la planificación, con su caller real ──');

const PREPARADO = entendimientoParaPlanificar(
  entendimiento({ continuity: leerIntencionDeContinuidad(DEL_MODELO), preferences: { creative: CREATIVO } }),
  candidatos,
);
const REQUISITO = PREPARADO.preferences?.continuity;

check('`conContinuidadResuelta` TIENE un caller real, y está en la composición',
  /conContinuidadResuelta\(entendimiento, candidatos\)/.test(leer('functions/src/planner/index.ts')),
  'llevaba dos fases escrita y sin llamar');
check('el nombre se convierte en `elementId@version`',
  continuidadValida(REQUISITO)
  && (REQUISITO?.anchors ?? []).map((a) => `${a.elementId}@${a.version}`).sort().join(' ') === 'el_casa_0001@2 el_luna_0001@4',
  JSON.stringify((REQUISITO?.anchors ?? [])));
check('y el creativo de S2 sigue intacto al lado',
  igual(PREPARADO.preferences?.creative, CREATIVO),
  'continuity no pisa creative');
check('sin intención, el entendimiento sale SIN TOCAR (mismo objeto)',
  (() => { const e = entendimiento(); return entendimientoParaPlanificar(e, candidatos) === e; })(),
  'sin continuidad, el camino se comporta exactamente como antes');
check('la frontera no planifica ni interpreta: delega y punto',
  (leer('functions/src/planner/index.ts').match(/entendimientoParaPlanificar/g) ?? []).length === 1
  && !/steps|capability|providerId/.test(
    (leer('functions/src/planner/index.ts').split('export const entendimientoParaPlanificar')[1] ?? '')));

console.log('\n── C · B3 · El Core Planner produce el Plan de verdad ──');

const respuesta = await planner.planificar({
  contract: PLANNER_CONTRACT_VERSION, trace: traza('c10_0001'), understanding: PREPARADO,
});
const plan = respuesta.plan;
const pasoDelPlan = plan?.steps?.[0];

check('el Planner de Weë contesta `ready` y devuelve un Plan',
  respuesta.status === 'ready' && !!plan && plan.steps.length === 1, respuesta.status);
check('el Plan lo produce EL PLANNER: id determinista y capacidades derivadas',
  plan?.id === 'plan_c10_0001' && plan?.capabilities?.join(',') === 'image.generate'
  && pasoDelPlan?.produces === 'image');
check('`PlanStep.hints.continuity` llega con igualdad profunda',
  igual(pasoDelPlan?.hints?.continuity, REQUISITO));
check('`PlanStep.hints.creative` también: los dos conviven en UNA sola autoridad',
  igual(pasoDelPlan?.hints?.creative, CREATIVO)
  && Object.keys(pasoDelPlan?.hints).sort().join(',') === 'continuity,creative');
check('una ambigüedad sigue produciendo aclaración, no un plan a medias',
  (await planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza('c10_0002'),
    understanding: entendimientoParaPlanificar(
      entendimiento({ continuity: leerIntencionDeContinuidad({ preserve: ['identity.face'], subjects: ['Luna'] }) }),
      [{ elementId: 'el_a', name: 'Luna', version: 1 }, { elementId: 'el_b', name: 'luna', version: 1 }],
    ),
  })).status === 'needs_clarification');
check('un conflicto también',
  (await planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza('c10_0003'),
    understanding: entendimientoParaPlanificar(
      entendimiento({ continuity: leerIntencionDeContinuidad({ preserve: ['identity.face'], mayChange: ['identity.face'] }) }),
      candidatos,
    ),
  })).status === 'needs_clarification');

console.log('\n── D · B3 · Plan → Workflow, por el motor y NO a mano ──');

const construido = await motor.construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza('c10_0001'), plan });
const wf = construido.workflow;
const pasoDelWf = wf?.steps?.[0];

check('el motor de workflows CONSUME el Plan del Planner',
  construido.status === 'ready' && !!wf && wf.planId === plan?.id,
  construido.status === 'ready' ? `planId=${wf?.planId}` : JSON.stringify(construido.error));
check('y el paso del workflow conserva las DOS pistas, profundamente iguales',
  igual(pasoDelWf?.hints?.continuity, REQUISITO) && igual(pasoDelWf?.hints?.creative, CREATIVO));
check('aquí no se construye ningún workflow a mano: el objeto sale del motor',
  !!wf?.planId, 'un `{steps:[...]}` escrito por quien llama es un plan disfrazado');

console.log('\n── E · B3 · Workflow → Orchestrator → Job → Gateway ──');

const montado = orquestadorDeWee(wf);
const inicio = montado.prepared.iniciar(traza('c10_0001'));
const arranque = montado.orchestrator.avanzar({
  contract: '1.0', principal: { userId: 'acc_mia' }, run: inicio.run, at: 10,
});
const despacho = arranque.dispatch?.[0];

check('el Orchestrator despacha el paso con las pistas enteras',
  montado.ok && igual(despacho?.hints?.continuity, REQUISITO) && igual(despacho?.hints?.creative, CREATIVO),
  montado.ok ? 'ok' : JSON.stringify(montado.error));

const peticion = peticionDeGateway({
  capability: despacho.capability,
  input: { prompt: 'un retrato' },
  trace: traza('c10_0001'),
  implementation: { provider: { id: 'p' }, model: { id: 'm' } },
  hints: despacho.hints,
});
const hints = peticion?.execution?.hints ?? peticion?.hints;
check('y el Job lo entrega al Gateway sin perder nada',
  igual(hints?.continuity, REQUISITO) && igual(hints?.creative, CREATIVO),
  hints ? Object.keys(hints).sort().join(',') : 'sin hints');

console.log('\n── F · C8 y C7 al final de la cadena ──');

const MUNDO_DE_MATERIAL = {
  el_luna_0001: { elementId: 'el_luna_0001', version: 4, ownerAccountId: 'acc_mia', status: 'active',
    refs: [{ assetId: 'as_luna_v4', role: 'primary', kind: 'image' }] },
  el_casa_0001: { elementId: 'el_casa_0001', version: 2, ownerAccountId: 'acc_mia', status: 'active',
    refs: [{ assetId: 'as_casa_v2', role: 'primary', kind: 'image' }] },
};
const deps = {
  elemento: async (cuenta, id) => {
    const e = MUNDO_DE_MATERIAL[id];
    return e && e.ownerAccountId === cuenta ? e : null;
  },
  entrega: async (assetId) => ({ assetId, url: `https://llave.invalid/${assetId}`, expiraEn: 9_000, vigenciaSegundos: 900 }),
};

const resolucion = await resolverReferenciasDeContinuidad('acc_mia', hints.continuity, deps);
check('C8 recibe `elementId` + la versión EXACTA que resolvió Brain',
  resolucion.fallos.length === 0 && resolucion.materiales.length === 2
  && (resolucion.materiales ?? []).map((m) => `${m.elementId}@${m.requestedVersion}`).sort().join(' ')
     === 'el_casa_0001@2 el_luna_0001@4',
  JSON.stringify((resolucion.materiales ?? []).map((m) => m.assetId)));

const entrada = materialEnLaEntrada(resolucion.materiales, { prompt: 'un retrato' });
const traduccion = traducirContinuidad(
  hints.continuity,
  { referenciasDeImagen: 8, referenciasDeVideo: 0, controlesDedicados: [], admiteFuerza: false },
  materialDeLaEntrada(entrada),
);
check('C7 recibe material autorizado y lo traduce: PARCIAL, ni un ápice más',
  (traduccion?.aspects ?? []).length === 2
  && (traduccion?.aspects ?? []).every((a) => a.support === 'partial' && a.reason === 'reference_conditioning'),
  (traduccion?.aspects ?? []).map((a) => `${a.aspect}:${a.support}`).join(' '));
check('`strict` llegó intacto hasta el final del viaje',
  traduccion?.strength === 'strict' && traduccion?.fuerzaSinTraducir === true && cubreLoExigido(traduccion));
check('y el adaptador recibe URLs, nunca un `elementId`',
  (entrada.referenceImages ?? []).length === 2 && !JSON.stringify(entrada).includes('el_luna_0001'));

console.log('\n── G · Sin continuidad, todo igual que antes ──');

const soloCreativo = entendimientoParaPlanificar(entendimiento({ preferences: { creative: CREATIVO } }), candidatos);
const planCreativo = (await planner.planificar({
  contract: PLANNER_CONTRACT_VERSION, trace: traza('c10_0004'), understanding: soloCreativo,
})).plan;
check('solo creativo: el plan sale igual y sin rastro de continuidad',
  igual(planCreativo?.steps?.[0]?.hints.creative, CREATIVO)
  && planCreativo?.steps?.[0]?.hints.continuity === undefined);
check('ni creativo ni continuidad: el paso sale sin pistas',
  (await planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza('c10_0005'), understanding: entendimiento(),
  })).plan?.steps?.[0]?.hints === undefined);
check('un `undefined` no borra una preferencia válida',
  (await planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza('c10_0006'),
    understanding: entendimiento({ preferences: { creative: CREATIVO, quality: undefined } }),
    hints: { quality: undefined },
  })).plan?.steps?.[0]?.hints.creative !== undefined,
  'lo encontró la sonda de S6, no el compilador');

console.log('\n── H · UNA sola autoridad de cada cosa ──');

check('UNA fuente de `ExecutionHints`: nadie declara un tipo paralelo',
  !/interface ContinuityHints|interface CreativeHints|interface LegacyHints/.test(
    ['core/gateway.ts', 'core/planner.ts', 'core/workflow.ts', 'engine/types.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('UN Planner en el Core: `crearPlanner` se define una vez',
  (leer('functions/src/core/planner.ts').match(/^export const crearPlanner/gm) ?? []).length === 1
  && (leer('functions/src/planner/index.ts').match(/crearPlanner\(/g) ?? []).length === 1);
check('UN motor de workflows y UN orquestador',
  (leer('functions/src/core/workflow.ts').match(/^export const crearWorkflowEngine/gm) ?? []).length === 1
  && (leer('functions/src/orchestrator/index.ts').match(/^export const orquestadorDeWee/gm) ?? []).length === 1);
check('el Router NO interpreta continuidad',
  !/continuity|continuidad|identity|preserve/i.test(leer('functions/src/core/router.ts'))
  && !/continuity|continuidad/i.test(leer('functions/src/router/politica.ts')));
check('el Planner no elige proveedor ni modelo',
  !/providerId|modelId|elegirModelo|ADAPTERS/.test(sinComentarios(leer('functions/src/core/planner.ts'))));
check('la frontera de planificación no crea un segundo resolutor de elementos',
  !/collection\(|where\(|leerElemento|mundoDeContexto/.test(leer('functions/src/planner/index.ts')));
check('esta suite está en la cadena de `npm test`',
  /autoridad-core\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
