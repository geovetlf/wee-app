/**
 * WEË CONTINUITY — C6: QUE LA INTENCIÓN LLEGUE ENTERA HASTA LA EJECUCIÓN.
 *
 * ── Lo que esta suite mide ──────────────────────────────────────────────────
 *
 * No mide que el campo EXISTA. Mide que el valor SOBREVIVA, salto a salto, con
 * igualdad profunda:
 *
 *   Brain → Planner → Workflow → Orchestrator → Job → Gateway → adaptador
 *
 * Y mide lo contrario con la misma dureza: que ninguna capa lo reinterprete.
 * `identity.face` tiene que seguir siendo `identity.face` al otro lado, no
 * `appearance.face`; `strict` tiene que seguir siendo `strict`; y la v4 tiene
 * que seguir siendo la v4.
 *
 * ── Lo que esta suite ENCONTRÓ ──────────────────────────────────────────────
 *
 * El último salto perdía el requisito. La composición del motor copiaba al
 * adaptador dos escalares de las pistas —calidad y duración— y nada más, así
 * que la intención creativa de S2 y la continuidad de C2 cruzaban el sistema
 * entero para morir en la última línea. Está arreglado y hay un check que lo
 * fija.
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
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const trabajos = lib('job/index.js');
const { orquestadorDeWee } = lib('orchestrator/index.js');
const {
  resolverIntencionDeContinuidad, conContinuidadResuelta, loQueFaltaDeLaContinuidad,
  leerIntencionDeContinuidad, leerHints, revisarEstructura, continuidadValida,
  crearPlanner, WORKFLOW_CONTRACT_VERSION, PLANNER_CONTRACT_VERSION, SHOT_CONTRACT_VERSION,
} = core;
const { peticionDeGateway } = trabajos;

/* El Planner del Core, con todo disponible: aquí se habla de capacidades, no de proveedores. */
const planner = crearPlanner({ availability: { disponible: () => true }, tracer: { record() {} }, now: () => 1 });
const planear = (understanding, id) => planner.planificar({
  contract: PLANNER_CONTRACT_VERSION,
  trace: { traceId: id, requestId: id, userId: 'user-0001' },
  understanding,
});

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── El caso de §40, de punta a punta ─────────────────────────────────────── */

const LUNA = { elementId: 'el_luna_0001', name: 'Luna', version: 4 };
const CASA = { elementId: 'el_casa_0001', name: 'La casa', version: 2 };
const BOTELLA = { elementId: 'el_botella_001', name: 'Botella', version: 3 };
const MUNDO = [LUNA, CASA, BOTELLA];

/*
 * «Pon a Luna en esta casa con esta botella. Mantén el rostro de Luna, la
 * arquitectura y la botella exactamente iguales, pero cambia el vestido, los
 * muebles y hazlo de noche.» — ya entendido por el modelo (C5).
 */
const DEL_MODELO = {
  preserve: ['identity.face', 'architecture.geometry', 'product.identity'],
  mayChange: ['outfit.clothing', 'interior.furniture', 'lighting.timeOfDay'],
  strength: 'strict',
  subjects: ['Luna', 'La casa', 'Botella'],
};

const entendimiento = (continuity, extra = {}) => ({
  intent: 'creation', confidence: 'high', goal: 'un retrato de Luna',
  capability: 'image.generate', capabilities: ['image.generate'],
  inputs: { text: '', attachments: [] }, references: [], constraints: {},
  needsPlanning: true, missing: [], assumptions: [],
  ...(continuity ? { continuity } : {}), ...extra,
});

const PUENTE = conContinuidadResuelta(entendimiento(leerIntencionDeContinuidad(DEL_MODELO)), MUNDO);
const REQUISITO = PUENTE.preferences.continuity;

console.log('\n── A · 2/40 · Brain → el puente ──');

check('2/40) la intención de Brain se resuelve y aterriza en `preferences.continuity`',
  continuidadValida(REQUISITO) && REQUISITO.preserve.length === 3 && REQUISITO.mayChange.length === 3,
  JSON.stringify(REQUISITO.preserve));
check('7/8) con los identificadores y las versiones que resolvió C5',
  REQUISITO.anchors.map((a) => `${a.elementId}@${a.version}`).sort().join(' ')
  === 'el_botella_001@3 el_casa_0001@2 el_luna_0001@4', JSON.stringify(REQUISITO.anchors));
check('10/38) y `strict` sigue siendo `strict`', REQUISITO.strength === 'strict');
check('1) sin continuidad, el entendimiento sale exactamente como entró',
  conContinuidadResuelta(entendimiento(undefined), MUNDO).preferences === undefined);
check('no se resuelve dos veces: el puente delega en la ÚNICA función de C5',
  /resolverIntencionDeContinuidad\(entendimiento\.continuity/.test(leer('functions/src/core/continuity-intent.ts'))
  && (leer('functions/src/core/continuity-intent.ts').match(/const resolverIntencionDeContinuidad/g) ?? []).length === 1);

console.log('\n── B · 2/3..6 · El puente → Core Planner → PlanStep ──');

const plan = await planear(PUENTE, 'c6_0001');
const paso = plan.plan?.steps?.[0];
check('2) `BrainUnderstanding` con continuidad → `PlanStep.hints.continuity`',
  plan.status === 'ready' && !!paso?.hints?.continuity, `${plan.status}`);
check('19/41) y llega con IGUALDAD PROFUNDA: ni un aspecto renombrado',
  igual(paso.hints.continuity, REQUISITO), JSON.stringify(paso.hints.continuity?.preserve));
check('3/4/5/6) los cuatro dominios siguen ahí, con sus nombres exactos',
  paso.hints.continuity.preserve.join(',') === 'identity.face,architecture.geometry,product.identity'
  && paso.hints.continuity.mayChange.join(',') === 'outfit.clothing,interior.furniture,lighting.timeOfDay');
const sinCont = await planear(entendimiento(undefined), 'c6_0002');
check('1/29) sin continuidad el Planner se comporta igual que antes',
  sinCont.status === 'ready' && sinCont.plan.steps[0].hints?.continuity === undefined, sinCont.status);
check('5) el Planner NO interpreta: no nombra ni un aspecto del vocabulario',
  !/identity\.|architecture\.|outfit\.|preserve|mayChange/.test(sinComentarios(leer('functions/src/core/planner.ts'))));

console.log('\n── C · 14/26 · PlanStep → WorkflowStep ──');

const montado = orquestadorDeWee({
  id: 'wf_c60001', contract: WORKFLOW_CONTRACT_VERSION, goal: 'media.create', workplace: 'studio',
  steps: [{ id: 'crear', capability: 'image.generate', purpose: 'Un retrato', input: { prompt: 'x' }, hints: paso.hints }],
});
const pasoDelWorkflow = montado.prepared?.workflow?.steps?.[0];
check('14/26) `PlanStep.hints.continuity` → `WorkflowStep.hints.continuity`, deep-equal',
  montado.ok && igual(pasoDelWorkflow.hints.continuity, REQUISITO),
  montado.ok ? 'ok' : JSON.stringify(montado.error));
check('el Workflow tampoco interpreta: no nombra ningún aspecto',
  !/identity\.face|architecture\.geometry|preserve:/.test(sinComentarios(leer('functions/src/core/workflow.ts'))));

console.log('\n── D · 15/27 · Workflow → Orchestrator ──');

/* La misma forma que usa el conductor: `prepared.iniciar(trace)`. */
const inicio = montado.prepared.iniciar({ traceId: 'c6_0003', requestId: 'c6_0003', userId: 'user-0001' });
const run = inicio.run;
const arranque = montado.orchestrator.avanzar({
  contract: '1.0', principal: { userId: 'user-0001' }, run, at: 10,
});
const despacho = arranque.dispatch?.[0];
check('15/27) `WorkflowStep` → despacho del Orchestrator, deep-equal',
  !!despacho?.hints?.continuity && igual(despacho.hints.continuity, REQUISITO),
  despacho ? 'hay despacho' : JSON.stringify(arranque.status));
check('el Orchestrator tampoco interpreta',
  !/identity\.|preserve|mayChange|continuity\./.test(sinComentarios(leer('functions/src/core/orchestrator.ts'))));

console.log('\n── E · 16/28/17/29 · Orchestrator → Job → Gateway ──');

const CONDUCTOR = sinComentarios(leer('functions/src/runtime/conductor.ts'));
check('16/28) el conductor copia las pistas al trabajo, sin tocarlas',
  /\.\.\.\(dispatch\.hints \? \{ hints: dispatch\.hints \} : \{\}\)/.test(CONDUCTOR));
check('16) y el trabajo NO guarda continuidad en el intento, ni en la concesión, ni en la operación',
  !/attempt[^\n]*continuity|lease[^\n]*continuity/.test(CONDUCTOR));

const paquete = {
  jobId: '1.j', attemptId: '1.a', attempt: 1,
  capability: 'image.generate',
  implementation: { providerId: 'x', modelId: 'x-1', adapterId: 'adapter:x' },
  input: { prompt: 'x' },
  trace: { traceId: 'c6_0004', requestId: 'c6_0004', userId: 'user-0001' },
  hints: { continuity: REQUISITO },
  mode: 'sync', idempotencyKey: 'k', timeoutMs: 1000, deadlineAt: 2000,
};
const peticion = peticionDeGateway(paquete);
check('17/29) `Job` → `peticionDeGateway`: la continuidad sigue en `execution.hints`, deep-equal',
  igual(peticion.execution.hints.continuity, REQUISITO), JSON.stringify(peticion.execution.hints?.continuity?.preserve));
const leidas = leerHints(peticion.execution.hints, 'execution.hints');
check('17) y el Gateway la acepta entera, por su propio contrato',
  leidas.ok && igual(leidas.hints.continuity, REQUISITO));

console.log('\n── F · 18/30 · Gateway → la costura del adaptador ──');

{
  const GW = sinComentarios(leer('functions/src/engine/gateway.ts'));
  check('18/30) la composición entrega las pistas ENTERAS al adaptador',
    /\.\.\.\(execution\.hints \? \{ hints: execution\.hints \} : \{\}\)/.test(GW));
  check('18) el contrato del adaptador las declara, y son opcionales: nadie está obligado a leerlas',
    /hints\?: ExecutionHints;/.test(leer('functions/src/engine/types.ts')));
  /*
   * LA PÉRDIDA QUE ESTA FASE ENCONTRÓ. `prefs` sigue siendo del ENRUTADO y
   * sigue llevando dos escalares; lo que no puede volver a pasar es que sea la
   * ÚNICA lectura de las pistas.
   */
  check('18) `prefs` sigue siendo dos escalares del enrutado, y ya no es lo único que se lee',
    /const prefs: RoutingPrefs = \{ quality: execution\.hints\?\.quality, durationSec: execution\.hints\?\.durationSec \}/.test(GW)
    && (GW.match(/execution\.hints/g) ?? []).length >= 3,
    `${(GW.match(/execution\.hints/g) ?? []).length} lecturas de execution.hints`);
  check('12/31/40) y en la entrega no hay ni un nombre de proveedor',
    !/(?<![a-z])(seedance|gemini|openai|anthropic|elevenlabs|flux|minimax|bytedance)(?![a-z])/i.test(GW));
}

console.log('\n── G · 19/41 · Nadie reinterpreta ──');

const cadena = [REQUISITO, paso.hints.continuity, pasoDelWorkflow.hints.continuity,
  despacho.hints.continuity, peticion.execution.hints.continuity, leidas.hints.continuity];
check('19/41) los SEIS saltos llevan exactamente el mismo objeto, byte a byte',
  cadena.every((c) => igual(c, REQUISITO)), `${cadena.length} saltos`);
check('41) `identity.face` no se convirtió en `appearance.face` en ningún punto',
  cadena.every((c) => c.preserve.includes('identity.face') && !c.preserve.includes('appearance.face')));
check('41) `outfit.clothing` no se convirtió en `appearance.outfit`',
  cadena.every((c) => c.mayChange.includes('outfit.clothing') && !c.mayChange.includes('appearance.outfit')));
check('38/39) `strict` no se relajó y ninguna versión derivó',
  cadena.every((c) => c.strength === 'strict'
    && c.anchors.find((a) => a.elementId === LUNA.elementId).version === 4));
check('13) el orden de los aspectos se conserva: es el que la persona dijo',
  cadena.every((c) => c.preserve.join(',') === REQUISITO.preserve.join(',')));

console.log('\n── H · 11/12/13/35..37/42 · Lo incompleto NO se ejecuta ──');

const ambiguo = conContinuidadResuelta(
  entendimiento(leerIntencionDeContinuidad({ preserve: ['identity.face'], subjects: ['Luna'] })),
  [LUNA, { elementId: 'el_luna_0002', name: 'Luna', version: 1 }]);
check('11/35) una referencia ambigua NO se resuelve sola: entra en `missing`',
  ambiguo.missing.includes('Luna') && (ambiguo.preferences.continuity.anchors ?? []).length === 0,
  JSON.stringify(ambiguo.missing));
check('11/35) y con `missing` el Planner NO planifica: contesta que hay que aclarar',
  (await planear(ambiguo, 'c6_0005')).status === 'needs_clarification');

const huerfano = conContinuidadResuelta(
  entendimiento(leerIntencionDeContinuidad({ preserve: ['architecture.geometry'], subjects: ['El chalet'] })), MUNDO);
check('12/36) un nombre sin resolver NO se inventa: entra en `missing` con su palabra',
  huerfano.missing.includes('El chalet') && (huerfano.preferences.continuity.anchors ?? []).length === 0);
check('12/36) y tampoco se planifica',
  (await planear(huerfano, 'c6_0006')).status === 'needs_clarification');

const choque = conContinuidadResuelta(
  entendimiento(leerIntencionDeContinuidad({ preserve: ['outfit.clothing'], mayChange: ['outfit.clothing'], subjects: ['Luna'] })), MUNDO);
check('13/37) un conflicto NO se resuelve eligiendo: no hay requisitos y entra en `missing`',
  choque.preferences === undefined && choque.missing.includes('outfit.clothing'), JSON.stringify(choque.missing));
check('42) las tres formas de intención incompleta llegan al MISMO mecanismo, que ya existía',
  loQueFaltaDeLaContinuidad(resolverIntencionDeContinuidad({ preserve: ['identity.face'], subjects: ['X'] }, [])).length === 1
  && /if \(u\.missing\.length > 0\)/.test(sinComentarios(leer('functions/src/core/planner.ts'))),
  'BrainUnderstanding.missing → needs_clarification');

console.log('\n── I · 20/31/43 · C4 y C3 consumen lo mismo ──');

const veredicto = revisarEstructura({
  accountId: 'cuentaA',
  shot: {
    contract: SHOT_CONTRACT_VERSION, shotId: 'sh_0001', projectId: 'pr_0001',
    ownerAccountId: 'cuentaA', version: 1, order: 0, state: 'draft',
    createdAt: 1, updatedAt: 1, continuity: REQUISITO,
    elements: REQUISITO.anchors.map((a) => ({ elementId: a.elementId, version: a.version })),
  },
  elements: REQUISITO.anchors.map((a) => ({ elementId: a.elementId, ownerAccountId: 'cuentaA', version: a.version, status: 'active' })),
}, 2);
check('20/31/43) C4 valida EL MISMO requisito, sin representación intermedia',
  veredicto.verdict.status === 'pass' && veredicto.ok === true, veredicto.verdict.status);
check('32) no se duplican `SceneNode` ni `ShotNode`: el transporte lleva referencias, no nodos',
  !/SceneNode|ShotNode|ExecutionShot|ExecutionScene/.test(sinComentarios(leer('functions/src/core/continuity-intent.ts'))));
check('43) hay UNA sola normalización, no tres',
  !/normalizeContinuity|plannerContinuityNormalizer|normalizarContinuidad/.test(
    ['core/continuity-intent.ts', 'core/planner.ts', 'core/gateway.ts', 'engine/gateway.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));

console.log('\n── J · 18/19/33/34 · Acotado: transportar no cuesta lecturas ──');

check('33/34) el puente no lee nada: recibe los candidatos, no los busca',
  !/getFirestore|collection\(|firestore|await /.test(
    sinComentarios(leer('functions/src/core/continuity-intent.ts')).split('conContinuidadResuelta')[1] ?? ''));
check('18) el contexto NO se vuelca dentro de las pistas: solo viajan los anclajes',
  REQUISITO.anchors.length === 3 && REQUISITO.anchors.every((a) => Object.keys(a).sort().join(',') === 'elementId,version'));
check('19) y nada del contexto visual se copió: ni nombres, ni fichas, ni materiales',
  !JSON.stringify(REQUISITO).includes('Luna') && !JSON.stringify(REQUISITO).includes('name'));

console.log('\n── K · 20..28/32/37 · Lo que C6 no es ──');

{
  const TOCADOS = ['core/continuity-intent.ts', 'engine/gateway.ts', 'engine/types.ts']
    .map((f) => sinComentarios(leer(`functions/src/${f}`))).join('\n');
  check('20/21/22/40) C6 no introduce proveedor, modelo, endpoint, clave ni sintaxis propia',
    !/(apiKey|endpoint|x-api-key|authorization)/i.test(sinComentarios(leer('functions/src/core/continuity-intent.ts'))));
  check('23) no hay un tipo de trabajo de continuidad', !/ContinuityJob|crearTrabajoDeContinuidad/.test(TOCADOS));
  check('24) ni Credits', !/creditEngine|spendCredits|refundCredits/.test(TOCADOS));
  /*
   * `vision` a secas NO vale como señal: es una MODALIDAD del motor y lleva ahí
   * desde antes de todo esto. Lo que hay que impedir es la COMPARACIÓN visual,
   * que es otra cosa y tiene sus propias palabras.
   */
  check('25) ni validación visual: ninguna comparación de imágenes',
    !/similarity|CLIP|embedding|segmentation|visionModel|compararImagenes/i.test(TOCADOS),
    'vision como modalidad no cuenta: es del motor, no de C6');
  check('26) ni regeneración', !/regenerar|regenerate|reintentar por continuidad/i.test(TOCADOS));
  check('27) ni Project State', !/creatorProjects|ProjectItem/.test(TOCADOS));
  check('28) ni migración de Legacy: `creator/planner.ts` y las plantillas siguen intactos',
    !/continuity/.test(leer('functions/src/creator/planner.ts'))
    && !/continuity/.test(leer('functions/src/creator/templates.ts')));
  check('37) y no hay un segundo camino: nadie salta de Brain o del Planner al proveedor',
    !/from '\.\.\/engine\/providers|adapter\.run|providers\//.test(
      ['core/continuity-intent.ts', 'core/planner.ts', 'core/brain.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
}

console.log('\n── L · 36 · Las protecciones de S6 ──');

check('36) `core/router.ts` no se tocó, y `revisarAntesDeEjecutar` sigue sin conectarse',
  !/continuity|revisarAntesDeEjecutar/.test(leer('functions/src/core/router.ts'))
  && !/revisarAntesDeEjecutar/.test(leer('functions/src/router/politica.ts')));
check('36) el orden del conductor no cambió: resolver ANTES de crear el trabajo',
  CONDUCTOR.indexOf('await resolver.resolver(') < CONDUCTOR.indexOf('await crearTrabajo('));
check('C1..C5 intactos: ni continuity, ni shot, ni continuity-check saben de transporte',
  !/conContinuidadResuelta/.test(leer('functions/src/core/continuity.ts'))
  && !/conContinuidadResuelta/.test(leer('functions/src/core/shot.ts'))
  && !/conContinuidadResuelta/.test(leer('functions/src/core/continuity-check.ts')));
check('esta suite está en la cadena de `npm test`', /continuidad-transporte\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
