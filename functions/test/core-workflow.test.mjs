/*
 * WEE WORKFLOW ENGINE — DE UN PLAN A UNA EJECUCIÓN GOBERNADA, SIN EJECUTAR NADA.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   PLANNER planifica → WORKFLOW estructura y gobierna el estado → ORCHESTRATOR
 *   coordina → ROUTER elige → GATEWAY ejecuta
 *
 * El motor convierte un plan en workflow, dice qué pasos pueden empezar, aplica
 * transiciones válidas y propaga lo que un fallo arrastra. Casi todo lo de aquí
 * comprueba lo que NO debe hacer: ejecutar, elegir proveedor o modelo, cobrar,
 * persistir, mutar lo que recibió o inventarse un estado.
 *
 * ── Lo que de verdad hay que proteger ──────────────────────────────────────
 *
 * Que «listo» siga siendo una DEDUCCIÓN de `dependsOn` y no un campo, que el
 * paralelismo salga del grafo, que `pasosListos()` de la Fase 0 siga siendo el
 * oráculo, y que un fallo deje a sus dependientes con la causa RAÍZ y no con
 * un `failed` que borre de dónde vino.
 *
 * Ninguna comprobación llama a una API real ni gasta un céntimo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (b) => (fs.existsSync(path.resolve(RAIZ, b + '.ts')) ? b + '.ts' : b + '/index.ts');
const nombresPedidos = (js, dep) => {
  const nombres = new Set();
  const escapado = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [, clausula] of js.matchAll(new RegExp(`import\\s+([^;]*?)\\s+from\\s*['"]${escapado}['"]`, 'g'))) {
    for (const [, dentro] of clausula.matchAll(/\{([^}]*)\}/g)) {
      for (const parte of dentro.split(',')) {
        const nombre = parte.trim().split(/\s+as\s+/)[0].trim();
        if (nombre) nombres.add(nombre);
      }
    }
  }
  return [...nombres];
};
const sustituto = (nombres) =>
  comoModulo(
    'const nada = new Proxy(function () {}, { get: () => nada, apply: () => nada, construct: () => nada });\n' +
      'export default nada;\n' + nombres.map((n) => `export const ${n} = nada;`).join('\n') + '\n',
  );
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  const RE = /(from\s*)(['"])([^'"]+)\2/g;
  const mapa = new Map();
  for (const [, , , dep] of js.matchAll(RE)) {
    if (mapa.has(dep)) continue;
    mapa.set(dep, dep.startsWith('.')
      ? (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, dep))))).url
      : sustituto(nombresPedidos(js, dep)));
  }
  const url = comoModulo(js.replace(RE, (_f, pre, q, dep) => `${pre}${q}${mapa.get(dep)}${q}`));
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const core = (await cargar('functions/src/core/index.ts')).ns;
const composicion = (await cargar('functions/src/workflow/index.ts')).ns;

const CORE_WORKFLOW = 'functions/src/core/workflow.ts';
const COMP_WORKFLOW = 'functions/src/workflow/index.ts';
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const codigoCore = sinComentarios(leer(CORE_WORKFLOW));
const codigoComp = sinComentarios(leer(COMP_WORKFLOW));
/* El motor empieza donde termina el contrato de la Fase 0. */
const codigoMotor = codigoCore.slice(codigoCore.indexOf('EL MOTOR (Fase 5)') > 0 ? codigoCore.indexOf('EL MOTOR (Fase 5)') : codigoCore.indexOf('TRANSICIONES'));

/* ── Piezas de prueba ─────────────────────────────────────────────────────── */

let reloj = 500;
const now = () => (reloj += 3);
const trazas = [];
const tracer = { record: (t) => trazas.push(t) };
const ultima = () => trazas[trazas.length - 1];
const motor = () => core.crearWorkflowEngine({ tracer, now });
const trace = { traceId: 'brain_w_0001', requestId: 'brain_w_0001', userId: 'user-0001', workplace: 'studio' };

/** El plan del anuncio: imagen, voz y música en paralelo; el vídeo consume la imagen. Tal como lo produce el Planner. */
const planDelAnuncio = (extra = {}) => ({
  id: 'plan_brain_w_0001', contract: '1.0', goal: 'un anuncio para mi restaurante', intent: 'creation',
  steps: [
    { id: 's1-image_generate', capability: 'image.generate', purpose: 'Crear la imagen', produces: 'image' },
    { id: 's2-voice_tts', capability: 'voice.tts', purpose: 'Grabar la voz', produces: 'voice' },
    { id: 's3-music_generate', capability: 'music.generate', purpose: 'Componer la música', produces: 'music' },
    { id: 's4-video_image_to_video', capability: 'video.image_to_video', purpose: 'Animar la imagen', dependsOn: ['s1-image_generate'], produces: 'video', hints: { quality: 'high' } },
  ],
  capabilities: ['image.generate', 'voice.tts', 'music.generate', 'video.image_to_video'],
  language: { appLanguage: 'es' }, workplace: 'studio', projectId: 'proj_0001',
  constraints: { tono: 'alegre', duracion: 15 }, hints: { durationSec: 15 },
  assumptions: ['formato vertical'], warnings: ['assumptions_carried'],
  ...extra,
});
const peticion = (extra = {}) => ({ contract: '1.1', trace, plan: planDelAnuncio(), ...extra });

/** Un workflow escrito a mano, como los que traerán las plantillas: A → B → C, y D suelta. */
const cadena = (extra = {}, pasos = {}) => ({
  id: 'wf_cadena_0001', contract: '1.0', goal: 'una cadena',
  steps: [
    { id: 'a', capability: 'text.generate', purpose: 'a', ...(pasos.a ?? {}) },
    { id: 'b', capability: 'image.generate', purpose: 'b', dependsOn: ['a'], ...(pasos.b ?? {}) },
    { id: 'c', capability: 'video.image_to_video', purpose: 'c', dependsOn: ['b'], ...(pasos.c ?? {}) },
    { id: 'd', capability: 'voice.tts', purpose: 'd', ...(pasos.d ?? {}) },
  ],
  ...extra,
});
const preparado = (wf) => {
  const p = motor().preparar(wf);
  if (!p.ok) throw new Error('no se pudo preparar: ' + JSON.stringify(p.error));
  return p.prepared;
};
const fallo = { code: 'PROVIDER_ERROR', source: 'gateway' };
/** Aplica una lista de transiciones en orden y devuelve la última ejecución. Falla la prueba si alguna se rechaza. */
const correr = (w, run, pasos) => {
  let actual = run;
  for (const t of pasos) {
    const r = w.transitar(actual, t);
    if (!r.ok) throw new Error('transición rechazada: ' + JSON.stringify(t) + ' → ' + JSON.stringify(r.error));
    actual = r.run;
  }
  return actual;
};
const estados = (run) => run.steps.map((s) => s.state).join(',');

console.log('\n── A · Pureza: el motor no sabe de nadie ──');
{
  const fuera = [];
  for (const [, dep] of codigoCore.matchAll(/from ['"]([^'"]+)['"]/g)) {
    const resuelto = dep.startsWith('.') ? path.posix.normalize(path.posix.join('functions/src/core', dep)) : dep;
    if (!resuelto.startsWith('functions/src/core/')) fuera.push(dep);
  }
  check('1) core/workflow.ts solo importa del Core', fuera.length === 0, fuera.join(' ') || 'puro');
  check('2) no toca Firebase, red, disco, reloj, azar ni entorno',
    !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(|process\.env|Date\.now\(|Math\.random\(|new Date\(/.test(codigoCore));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'anthropic', 'elevenlabs', 'minimax', 'flux', 'tripo', 'hunyuan', 'qwen', 'wan', 'yinchao', 'bytedance', 'byteplus', 'eleven music'];
  const nombra = (src) => PROVEEDORES.filter((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(src));
  check('3) ni el motor ni la composición nombran a un proveedor', nombra(codigoCore).length === 0 && nombra(codigoComp).length === 0, [...nombra(codigoCore), ...nombra(codigoComp)].join(',') || `${PROVEEDORES.length} nombres comprobados`);
  check('3b) control: el patrón reconoce uno cuando lo ve', nombra('const x = seedance;').length === 1 && nombra('wanted').length === 0);
  check('4) ni un identificador de modelo', !/gpt-[0-9]|claude-[0-9]|gemini-[0-9]|SEEDANCE_|flux-|nano-banana/i.test(codigoCore + codigoComp));
  const estadoDeModulo = (src) => [
    ...(src.match(/^(let|var)\s+\w+/gm) || []),
    ...(src.match(/^const\s+\w+[^=\n]*=\s*(new (Map|Set|WeakMap|WeakSet)\(\s*\)|\{\s*\}|\[\s*\])/gm) || []),
  ];
  const conEstado = [...estadoDeModulo(codigoCore), ...estadoDeModulo(codigoComp)];
  check('5) nada mutable fuera de las funciones: ni contador, ni caché, ni registro global de workflows', conEstado.length === 0, conEstado.join(' | ') || 'sin estado de módulo');
  check('5b) control: una caché de módulo se detectaría', estadoDeModulo('const cache = new Map();\n').length === 1 && estadoDeModulo('const TABLA = new Map(LISTA.map(\n').length === 0);
  check('6) sin bucles permanentes, temporizadores ni sondeo', !/while \(true\)|setInterval|setTimeout|requestAnimationFrame|\bpoll/i.test(codigoCore + codigoComp));
  check('7) sin código dinámico: ni eval, ni Function, ni import()', !/\beval\(|new Function\(|\bimport\(/.test(codigoCore + codigoComp));
  check('8) platform-agnostic: ni React, ni Expo, ni APIs de navegador o móvil', !/from ['"]react|from ['"]expo|window\.|document\.|navigator\.|localStorage|AsyncStorage|Platform\.OS/.test(codigoCore + codigoComp));
  const fueraComp = [...codigoComp.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((d) => d !== '../core');
  check('9) la composición solo importa del Core', fueraComp.length === 0, fueraComp.join(' ') || 'solo ../core');
}

console.log('\n── B · No se apropia de lo que es de otras capas ──');
{
  check('10) NO ejecuta: ni Gateway, ni adaptadores, ni motor, ni HTTP',
    !/crearGateway|gateway\.ejecutar|GatewayRequest|adapter\.run|engine\.generate|gatewayDeWee|\.ejecutar\(|https?:\/\//i.test(codigoMotor + codigoComp));
  /* `minScore` es un campo del contrato de calidad de la Fase 0: la búsqueda de «score» va con frontera de palabra. */
  check('11) NO elige: ni resolver, ni candidatos, ni puntuación, ni cadena de proveedores',
    !/ImplementationResolver|resolver\(|findImplementations|candidat|(?<![a-z])score|cheapest|fallback|routing|DEFAULT_ROUTING/i.test(codigoMotor + codigoComp));
  check('12) NO cobra ni calcula precios: sin Credits, sin margen, sin presupuesto calculado',
    !/spendCredits|refundCredits|creditEngine|aiPricing|cabeEnPresupuesto|presupuestoRestante|sumarEstimaciones|creditsPerUsd|margin|usdPerUnit/.test(codigoMotor + codigoComp));
  check('13) NO es Job Engine: ni cola, ni persistencia, ni reanudación por su cuenta',
    !/enqueue|dequeue|\bqueue\b|firestore|collection\(|\.doc\(|writeBatch|runTransaction|\bresume\(/i.test(codigoMotor + codigoComp));
  check('14) NO es Orchestrator: no recorre pasos ejecutándolos, no espera resultados', !/for await|await .*(ejecutar|run|generate)/i.test(codigoMotor + codigoComp));
  check('15) el paralelismo NO se declara: no hay `parallel` en ningún sitio', !/parallel/i.test(codigoCore + codigoComp));
  check('16) «listo» no es un estado que se guarde: `StepState` no lo tiene',
    !/StepState =[\s\S]*?'ready'[\s\S]*?;/.test(leer(CORE_WORKFLOW).slice(0, leer(CORE_WORKFLOW).indexOf('EL MOTOR'))) && /listos\(run/.test(codigoCore));
  check('17) reutiliza los contratos del Core en vez de declararlos otra vez',
    ['TraceContext', 'LanguageContext', 'WeeError', 'CoreCapabilityId', 'ExecutionHints', 'Plan', 'Tracer', 'OperationTrace', 'BrainIntent'].every((t) => new RegExp(`\\b${t}\\b`).test(leer(CORE_WORKFLOW)))
    && !/interface (TraceContext|LanguageContext|WeeError|Plan|PlanStep)\b/.test(codigoCore));
  check('18) las condiciones siguen siendo cerradas: `StepCondition` con cuatro comprobaciones y ningún lenguaje de expresiones',
    /check: 'succeeded' \| 'failed' \| 'produced_output' \| 'skipped'/.test(leer(CORE_WORKFLOW)) && !/expression|evaluate\(|script|template literal/i.test(codigoMotor));
  check('19) no lee el reloj: cada transición trae su `at`', /at: number/.test(leer(CORE_WORKFLOW)) && !/ports\.now\(\)/.test(codigoMotor.slice(codigoMotor.indexOf('prepararLeido'), codigoMotor.indexOf('crearWorkflowEngine'))));
}

console.log('\n── C · Plan válido → Workflow válido ──');
{
  trazas.length = 0;
  const r = await motor().construir(peticion());
  check('20) un plan del Planner da un workflow listo', r.status === 'ready' && !!r.workflow, JSON.stringify(r.error?.details ?? r.status));
  const w = r.workflow;
  check('21) con identidad propia y distinta: requestId, planId, workflowId, stepId',
    w.id === 'wf_brain_w_0001' && w.planId === 'plan_brain_w_0001' && trace.requestId === 'brain_w_0001' && w.steps[0].id === 's1-image_generate'
    && new Set([w.id, w.planId, trace.requestId, w.steps[0].id]).size === 4);
  check('22) trazables entre sí por el sufijo de la petición', [w.id, w.planId].every((id) => id.endsWith(trace.requestId)));
  check('23) los ids de paso se conservan tal cual', w.steps.map((s) => s.id).join(',') === planDelAnuncio().steps.map((s) => s.id).join(','));
  check('24) cada paso conserva capacidad, propósito, dependencias, lo que produce y sus pistas',
    w.steps[3].capability === 'video.image_to_video' && w.steps[3].purpose === 'Animar la imagen' && w.steps[3].dependsOn.join() === 's1-image_generate'
    && w.steps[3].produces === 'video' && w.steps[3].hints.quality === 'high' && w.steps[0].produces === 'image' && w.steps[0].dependsOn === undefined);
  check('25) y el workflow conserva objetivo, intención, idioma, workplace, proyecto, restricciones, pistas, suposiciones y avisos',
    w.goal === 'un anuncio para mi restaurante' && w.intent === 'creation' && w.language.appLanguage === 'es' && w.workplace === 'studio' && w.projectId === 'proj_0001'
    && w.constraints.tono === 'alegre' && w.constraints.duracion === 15 && w.hints.durationSec === 15 && w.assumptions.join() === 'formato vertical' && w.warnings.join() === 'assumptions_carried');
  check('26) sin copiar indiscriminadamente: ni `capabilities` (se deriva de los pasos) ni avisos de la operación de planificar',
    w.capabilities === undefined && !JSON.stringify(w).includes('trace_not_recorded'));
  check('27) con el contrato de Workflow, no el del plan', w.contract === core.WORKFLOW_CONTRACT_VERSION && w.contract === '1.1');
  check('28) la traza se anotó, limpia, con la capacidad principal y sin texto de nadie',
    trazas.length === 1 && ultima().status === 'ok' && ultima().capability === 'image.generate' && core.trazaLimpia(ultima()) && !JSON.stringify(ultima()).includes('restaurante'));
  check('29) el grafo que sale es válido para las funciones de la Fase 0', core.validarWorkflow(w).length === 0 && core.pasosListos(w, []).length === 3);
  const otra = await motor().construir(peticion());
  check('30) el mismo plan da SIEMPRE el mismo workflow', JSON.stringify(otra.workflow) === JSON.stringify(w));
  const conId = await motor().construir(peticion({ ids: { workflowId: 'wf_propio_0001' } }));
  check('31) quien ya tiene un id lo trae; si no, se deriva de la petición', conId.workflow.id === 'wf_propio_0001');
  const sinContrato = await motor().construir(peticion({ contract: '0.9' }));
  check('32) un contrato incompatible se rechaza con motivo', sinContrato.status === 'invalid' && sinContrato.error.details.reason === 'contract_incompatible');
  const sinTraza = await motor().construir({ contract: '1.1', plan: planDelAnuncio() });
  check('33) y sin traza no se construye nada', sinTraza.status === 'invalid' && sinTraza.error.details.field === 'trace');
  const producesMal = await motor().construir(peticion({ plan: planDelAnuncio({ steps: [{ ...planDelAnuncio().steps[0], produces: 'video' }] , capabilities: ['image.generate'] }) }));
  check('34) `produces` lo dice el catálogo: si el plan lo contradice, se rechaza', producesMal.status === 'invalid' && /produces/.test(producesMal.error.details.field));
  const sinProduces = await motor().construir(peticion({ plan: planDelAnuncio({ steps: [{ id: 's1-image_generate', capability: 'image.generate', purpose: 'x' }], capabilities: ['image.generate'] }) }));
  check('35) y si no lo trae, se completa del catálogo', sinProduces.status === 'ready' && sinProduces.workflow.steps[0].produces === 'image');
}

console.log('\n── D · Validación de dependencias y del grafo ──');
{
  const razon = (steps, extra = {}) => { const p = motor().preparar({ id: 'wf_m_0001', contract: '1.0', goal: 'g', steps, ...extra }); return p.ok ? 'ok' : p.error.details.reason; };
  const paso = (id, extra = {}) => ({ id, capability: 'text.generate', purpose: id, ...extra });
  check('36) dependencia inexistente', razon([paso('a', { dependsOn: ['fantasma'] })]) === 'unknown_dependency');
  check('37) dependencia repetida', razon([paso('a'), paso('b', { dependsOn: ['a', 'a'] })]) === 'duplicate_dependency');
  check('38) id de paso repetido', razon([paso('a'), paso('a')]) === 'duplicate_step');
  check('39) dependencia de sí mismo', razon([paso('a', { dependsOn: ['a'] })]) === 'self_dependency');
  check('40) ciclo de tres: A → B → C → A', razon([paso('a', { dependsOn: ['c'] }), paso('b', { dependsOn: ['a'] }), paso('c', { dependsOn: ['b'] })]) === 'cycle');
  check('41) ciclo de dos', razon([paso('a', { dependsOn: ['b'] }), paso('b', { dependsOn: ['a'] })]) === 'cycle');
  check('42) un ciclo a través de una condición también', razon([paso('a', { when: { stepId: 'b', check: 'succeeded' } }), paso('b', { dependsOn: ['a'] })]) === 'cycle');
  check('43) condición a un paso que no existe', razon([paso('a', { when: { stepId: 'nadie', check: 'succeeded' } })]) === 'unknown_condition_target');
  check('44) condición a sí mismo', razon([paso('a', { when: { stepId: 'a', check: 'succeeded' } })]) === 'self_dependency');
  check('45) workflow vacío', razon([]) === 'empty_workflow');
  check('46) demasiados pasos', razon(Array.from({ length: 1001 }, (_, i) => paso(`p${i}`))) === 'too_many_steps');
  check('47) capacidad que no está en el catálogo', razon([paso('a', { capability: 'magic.do' })]) === 'unknown_capability');
  check('48) los ciclos NO se arreglan: se rechazan enteros, sin quitar dependencias', razon([paso('a', { dependsOn: ['b'] }), paso('b', { dependsOn: ['a'] }), paso('c')]) === 'cycle');
  /* Lo que la Fase 0 ya cazaba, el motor lo caza igual: mismo veredicto, causa estructurada. */
  const casos = [
    [[paso('a', { dependsOn: ['fantasma'] })], /no existe/],
    [[paso('a', { dependsOn: ['b'] }), paso('b', { dependsOn: ['a'] })], /ciclo/],
    [[paso('a'), paso('a')], /repetido/],
  ];
  check('49) coincide con `validarWorkflow` de la Fase 0 en todo lo que las dos comprueban',
    casos.every(([steps, re]) => core.validarWorkflow({ id: 'w', contract: '1.0', goal: 'x', steps }).some((p) => re.test(p)) && razon(steps) !== 'ok')
    && core.validarWorkflow(cadena()).length === 0 && razon(cadena().steps) === 'ok');
  const inconsistente = await motor().construir(peticion({ plan: planDelAnuncio({ capabilities: ['image.generate'] }) }));
  check('50) `capabilities` del plan tiene que ser la de sus pasos: dos verdades no viajan', inconsistente.status === 'invalid' && inconsistente.error.details.reason === 'inconsistent');
  const p = motor().preparar({ ...cadena(), steps: [{ ...cadena().steps[0], dependsOn: ['b'] }, ...cadena().steps.slice(1)] });
  check('51) un rechazo es un `WeeError` estructurado con fuente `workflow`, nunca una excepción',
    !p.ok && p.error.code === 'INVALID_REQUEST' && p.error.source === 'workflow' && typeof p.error.details.reason === 'string');
}

console.log('\n── E · Estados y transiciones ──');
{
  const w = preparado(cadena());
  const i = w.iniciar(trace);
  check('52) una ejecución nueva: todo pendiente, intento 0, sin cursor, sin arranque', i.ok && i.run.state === 'pending' && estados(i.run) === 'pending,pending,pending,pending' && i.run.steps.every((s) => s.attempt === 0) && i.run.cursor.length === 0 && i.run.startedAt === undefined);
  check('53) con identidad propia y el hilo de la petición', i.run.id === 'run_brain_w_0001' && i.run.workflowId === 'wf_cadena_0001' && i.run.userId === 'user-0001' && i.run.trace.runId === 'run_brain_w_0001' && i.run.contract === '1.1');
  let run = i.run;
  check('54) `pending` no es «listo»: a está lista y b no, aunque las dos estén pendientes', w.listos(run).map((s) => s.id).join() === 'a,d' && run.steps[1].state === 'pending');
  const t1 = w.transitar(run, { stepId: 'a', to: 'running', at: 10 });
  check('55) pending → running: intento 1, arranque anotado, cursor, estado de la ejecución', t1.ok && t1.run.steps[0].state === 'running' && t1.run.steps[0].attempt === 1 && t1.run.steps[0].startedAt === 10 && t1.run.startedAt === 10 && t1.run.state === 'running' && t1.run.cursor.join() === 'a');
  run = t1.run;
  const t2 = w.transitar(run, { stepId: 'a', to: 'done', at: 20, outputRefs: ['asset_a'] });
  check('56) running → done: fin anotado, material referenciado', t2.ok && t2.run.steps[0].state === 'done' && t2.run.steps[0].finishedAt === 20 && t2.run.steps[0].outputRefs.join() === 'asset_a');
  const t3 = w.transitar(run, { stepId: 'a', to: 'failed', at: 20, error: fallo });
  check('57) running → failed: con su error normalizado', t3.ok && t3.run.steps[0].state === 'failed' && t3.run.steps[0].error.code === 'PROVIDER_ERROR');
  const t4 = w.transitar(run, { stepId: 'a', to: 'cancelled', at: 20 });
  check('58) running → cancelled: a petición, con causa', t4.ok && t4.run.steps[0].state === 'cancelled' && t4.run.steps[0].cause.reason === 'cancelled_by_request');
  check('59) `blocked` solo lo pone el motor', t2.run.steps[1].state === 'pending' && t3.run.steps[1].state === 'blocked' && t3.run.steps[1].cause.reason === 'dependency_failed');
  const t5 = w.transitar(t2.run, { stepId: 'b', to: 'running', at: 30 });
  check('60) y `skipped` también: nadie lo pide', !w.transitar(t5.run, { stepId: 'c', to: 'skipped', at: 31 }).ok && w.transitar(t5.run, { stepId: 'c', to: 'skipped', at: 31 }).error.details.reason === 'engine_only');
  const conAprobacion = preparado(cadena({}, { a: { requiresApproval: true } }));
  check('61) la ejecución refleja lo que hay: awaiting_approval > running > pending',
    conAprobacion.transitar(conAprobacion.iniciar(trace).run, { stepId: 'a', to: 'awaiting_approval', at: 1 }).run.state === 'awaiting_approval');
  /* Lo que destapó escribir esta prueba: un run de OTRO workflow con la misma forma no se puede colar en este. */
  const otro = preparado(cadena({ id: 'wf_otra_0001' }));
  const ajeno = w.transitar(otro.iniciar(trace).run, { stepId: 'a', to: 'running', at: 1 });
  check('61b) una ejecución de otro workflow se rechaza como inconsistente, aunque tenga los mismos pasos', !ajeno.ok && ajeno.error.details.reason === 'inconsistent' && w.listos(otro.iniciar(trace).run).length === 0);
}

console.log('\n── F · La tabla de transiciones, entera ──');
{
  const ESTADOS = ['pending', 'blocked', 'running', 'awaiting_approval', 'done', 'failed', 'skipped', 'cancelled'];
  const validas = new Set([
    'pending→running', 'pending→awaiting_approval', 'pending→blocked', 'pending→skipped', 'pending→cancelled',
    'awaiting_approval→running', 'awaiting_approval→cancelled',
    'running→done', 'running→failed', 'running→cancelled',
  ]);
  const tabla = ESTADOS.flatMap((a) => ESTADOS.map((b) => [a, b, core.puedeTransitar(a, b)]));
  check('62) exactamente estas transiciones existen, y ninguna otra', tabla.every(([a, b, ok]) => ok === validas.has(`${a}→${b}`)),
    tabla.filter(([a, b, ok]) => ok !== validas.has(`${a}→${b}`)).map(([a, b]) => `${a}→${b}`).join(',') || `${ESTADOS.length * ESTADOS.length} pares`);
  check('63) los finales no salen: blocked, done, failed, skipped y cancelled no van a ningún sitio',
    ['blocked', 'done', 'failed', 'skipped', 'cancelled'].every((s) => core.esEstadoFinal(s) && ESTADOS.every((b) => !core.puedeTransitar(s, b))));
  check('64) un fallo no se reintenta desde aquí: `failed → running` no existe (reanudar es del Job Engine)', !core.puedeTransitar('failed', 'running') && !core.puedeTransitar('failed', 'pending'));
  const w = preparado(cadena());
  const run = w.iniciar(trace).run;
  const rechazos = [
    ['pending → done', { stepId: 'a', to: 'done', at: 1 }],
    ['pending → failed', { stepId: 'a', to: 'failed', at: 1, error: fallo }],
    ['paso desconocido', { stepId: 'zz', to: 'running', at: 1 }],
    ['estado desconocido', { stepId: 'a', to: 'volando', at: 1 }],
    ['sin `at`', { stepId: 'a', to: 'running' }],
    ['clave de más', { stepId: 'a', to: 'running', at: 1, providerId: 'x' }],
  ].map(([n, t]) => [n, w.transitar(run, t)]);
  check('65) toda transición inválida devuelve un error estructurado y NO muta ni revienta',
    rechazos.every(([, r]) => !r.ok && r.error.code === 'INVALID_REQUEST' && r.error.source === 'workflow') && run.steps[0].state === 'pending', rechazos.filter(([, r]) => r.ok).map(([n]) => n).join(','));
  check('66) y dice cuál era: de dónde a dónde', rechazos[0][1].error.details.reason === 'invalid_transition' && rechazos[0][1].error.details.from === 'pending' && rechazos[0][1].error.details.to === 'done');
  const corriendo = w.transitar(run, { stepId: 'a', to: 'running', at: 1 }).run;
  check('67) lo que acompaña se revisa: fallar sin error, terminar con error, o material donde no toca, se rechazan',
    !w.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2 }).ok
    && !w.transitar(corriendo, { stepId: 'a', to: 'done', at: 2, error: fallo }).ok
    && !w.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: fallo, outputRefs: ['x'] }).ok
    && !w.transitar(corriendo, { stepId: 'a', to: 'running', at: 2 }).ok);
}

console.log('\n── G · Listos e independientes: el paralelismo sale del grafo ──');
{
  const r = await motor().construir(peticion());
  const w = preparado(r.workflow);
  let run = w.iniciar(trace).run;
  check('68) al empezar hay TRES pasos listos a la vez', w.listos(run).map((s) => s.capability).join() === 'image.generate,voice.tts,music.generate');
  check('69) coincide con `pasosListos()` de la Fase 0 cuando no hay condiciones', core.pasosListos(r.workflow, run.steps).map((s) => s.id).join() === w.listos(run).map((s) => s.id).join());
  const t = w.transitar(run, { stepId: 's1-image_generate', to: 'running', at: 1 });
  run = t.run;
  check('70) empezar uno no serializa a los otros: siguen listos', w.listos(run).map((s) => s.id).join() === 's2-voice_tts,s3-music_generate');
  const t2 = w.transitar(run, { stepId: 's1-image_generate', to: 'done', at: 2 });
  check('71) al terminar la imagen, el vídeo queda listo, y `nowReady` lo dice sin recorrer el grafo', t2.nowReady.join() === 's4-video_image_to_video' && w.listos(t2.run).map((s) => s.id).join() === 's2-voice_tts,s3-music_generate,s4-video_image_to_video');
  check('72) `nowReady` es un subconjunto de `listos`: la deducción incremental nunca contradice a la completa', t2.nowReady.every((id) => w.listos(t2.run).some((s) => s.id === id)));
  check('73) el resumen agrupa por estado y añade los listos como deducción', w.resumen(t2.run).done.join() === 's1-image_generate' && w.resumen(t2.run).ready.join() === 's2-voice_tts,s3-music_generate,s4-video_image_to_video' && w.resumen(t2.run).pending.length === 3);
  /* Un recorrido largo y determinista: en cada paso, la deducción del motor y la de la Fase 0 dicen lo mismo. */
  const wf = { id: 'wf_grid_0001', contract: '1.0', goal: 'g', steps: [] };
  for (let i = 0; i < 40; i++) wf.steps.push({ id: `n${i}`, capability: 'text.generate', purpose: `n${i}`, ...(i >= 3 ? { dependsOn: [`n${i - 3}`, `n${i - 1}`].filter((d, j, a) => a.indexOf(d) === j) } : {}) });
  const g = preparado(wf);
  let rg = g.iniciar(trace).run;
  let acuerdo = true;
  let semilla = 7;
  const azar = () => (semilla = (semilla * 48271) % 2147483647) / 2147483647;
  for (let paso = 0; paso < 120 && acuerdo; paso++) {
    const listos = g.listos(rg).map((s) => s.id);
    const oraculo = core.pasosListos(wf, rg.steps).map((s) => s.id);
    if (listos.join() !== oraculo.join()) acuerdo = false;
    const corriendo = rg.steps.filter((s) => s.state === 'running').map((s) => s.stepId);
    if (listos.length && (azar() < 0.6 || !corriendo.length)) rg = g.transitar(rg, { stepId: listos[Math.floor(azar() * listos.length)], to: 'running', at: paso }).run;
    else if (corriendo.length) rg = g.transitar(rg, { stepId: corriendo[Math.floor(azar() * corriendo.length)], to: 'done', at: paso }).run;
    else break;
  }
  check('74) en 120 transiciones sobre un grafo de 40 nodos, motor y Fase 0 coinciden siempre en qué está listo', acuerdo && rg.state === 'done', rg.state);
  /*
   * Y la relación EXACTA cuando sí hay condiciones, que no es igualdad: el
   * motor es más estricto porque `pasosListos()` es de la Fase 0 y no sabe de
   * `when`. Decir «oráculo» a secas era sobreafirmar; lo encontró la auditoría.
   */
  const conWhen = { id: 'wf_when_0001', contract: '1.0', goal: 'g', steps: [
    { id: 'a', capability: 'image.generate', purpose: 'a' },
    { id: 'b', capability: 'image.upscale', purpose: 'b', when: { stepId: 'a', check: 'produced_output' } },
  ] };
  const cw = preparado(conWhen);
  const rw = cw.iniciar(trace).run;
  check('74b) con condiciones, `listos` es un SUBCONJUNTO de `pasosListos`, no su igual',
    cw.listos(rw).map((s) => s.id).join() === 'a' && core.pasosListos(conWhen, rw.steps).map((s) => s.id).join() === 'a,b'
    && cw.listos(rw).every((s) => core.pasosListos(conWhen, rw.steps).some((x) => x.id === s.id)));
  check('74c) y la inclusión se cumple en cada paso del recorrido largo, no solo al final', acuerdo);
}

console.log('\n── H · Propagación de fallos: la causa se conserva ──');
{
  /* Política por defecto: cae todo. */
  const w = preparado(cadena());
  let run = correr(w, w.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }, { stepId: 'd', to: 'running', at: 1 }]);
  const t = w.transitar(run, { stepId: 'a', to: 'failed', at: 2, error: fallo });
  check('75) con `fail_workflow` (por defecto) la ejecución falla en el acto, con causa', t.ok && t.run.state === 'failed' && t.run.cause.reason === 'step_failed' && t.run.cause.stepId === 'a');
  check('76) los dependientes quedan `blocked`, NO `failed`: no fallaron ellos', t.run.steps[1].state === 'blocked' && t.run.steps[2].state === 'blocked' && t.run.steps[1].error === undefined);
  check('77) y la causa apunta a la RAÍZ aunque haya dos saltos: c se bloquea por a, no por b', t.run.steps[2].cause.reason === 'dependency_failed' && t.run.steps[2].cause.stepId === 'a');
  check('78) lo que corría sigue corriendo: nadie lo corta desde aquí', t.run.steps[3].state === 'running' && t.run.finishedAt === undefined && t.run.cursor.join() === 'd');
  check('79) cada cambio propagado va en la lista, marcado como propagado', t.transitions.length === 3 && t.transitions[0].propagated === false && t.transitions.slice(1).every((x) => x.propagated && x.to === 'blocked'));
  const fin = w.transitar(t.run, { stepId: 'd', to: 'done', at: 3 });
  check('80) cuando el que corría informa, la ejecución queda cerrada del todo', fin.run.state === 'failed' && fin.run.finishedAt === 3 && fin.run.cursor.length === 0);
  check('81) no se puede arrancar nada en una ejecución terminada', !w.transitar(fin.run, { stepId: 'b', to: 'running', at: 4 }).ok && w.transitar(fin.run, { stepId: 'b', to: 'running', at: 4 }).error.details.reason === 'invalid_transition');
  /* Un independiente pendiente se cancela por el fallo del workflow, con esa causa y no otra. */
  const w2 = preparado(cadena());
  const t2 = w2.transitar(correr(w2, w2.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'failed', at: 2, error: fallo });
  check('82) un paso independiente y pendiente se cancela por `workflow_failed`, señalando al que falló', t2.run.steps[3].state === 'cancelled' && t2.run.steps[3].cause.reason === 'workflow_failed' && t2.run.steps[3].cause.stepId === 'a');
  check('83) `failed` y «bloqueado por un fallo» se distinguen siempre', t2.run.steps[0].state === 'failed' && t2.run.steps[1].state === 'blocked' && w2.cierre(t2.run).unsatisfied.join() === 'a,b,c,d');
  /* skip_dependents: el fallo se contiene, el resto sigue. */
  const w3 = preparado(cadena({}, { a: { onFailure: 'skip_dependents' } }));
  const t3 = w3.transitar(correr(w3, w3.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }, { stepId: 'd', to: 'running', at: 1 }]), { stepId: 'a', to: 'failed', at: 2, error: fallo });
  check('84) con `skip_dependents`, los dependientes se saltan —transitivamente— y la ejecución sigue', t3.run.steps[1].state === 'skipped' && t3.run.steps[2].state === 'skipped' && t3.run.steps[2].cause.stepId === 'a' && t3.run.state === 'running');
  const fin3 = w3.transitar(t3.run, { stepId: 'd', to: 'done', at: 3 });
  check('85) pero al final no es `done`: lo obligatorio no se hizo, y la causa es la raíz', fin3.run.state === 'failed' && fin3.run.cause.stepId === 'a' && fin3.run.steps[3].state === 'done');
  /* continue: el paso era opcional. */
  const w4 = preparado(cadena({}, { a: { onFailure: 'continue' } }));
  const t4 = w4.transitar(correr(w4, w4.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'failed', at: 2, error: fallo });
  check('86) con `continue` el fallo no cuenta contra la ejecución, pero sus dependientes quedan bloqueados con la causa', t4.run.state === 'running' && t4.run.steps[1].state === 'blocked' && t4.run.steps[1].cause.stepId === 'a');
  const fin4 = correr(w4, t4.run, [{ stepId: 'd', to: 'running', at: 3 }, { stepId: 'd', to: 'done', at: 4 }]);
  check('87) y como b y c eran obligatorios y quedaron bloqueados, termina `failed`, con la RAÍZ como causa: a, no b', fin4.state === 'failed' && fin4.cause.reason === 'step_failed' && fin4.cause.stepId === 'a' && fin4.steps[1].cause.stepId === 'a');
  const w5 = preparado({ id: 'wf_opt_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', onFailure: 'continue' }, { id: 'd', capability: 'voice.tts', purpose: 'd' }] });
  const fin5 = correr(w5, w5.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }, { stepId: 'a', to: 'failed', at: 2, error: fallo }, { stepId: 'd', to: 'running', at: 3 }, { stepId: 'd', to: 'done', at: 4 }]);
  check('88) un opcional fallido sin dependientes no impide que la ejecución termine `done`', fin5.state === 'done' && fin5.cause === undefined);
  /* La propagación es determinista: el orden de los cambios es el del workflow, no el del recorrido. */
  const wf6 = { id: 'wf_fan_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a' }, ...['z', 'y', 'x'].map((id) => ({ id, capability: 'image.generate', purpose: id, dependsOn: ['a'] }))] };
  const w6 = preparado(wf6);
  const t6 = w6.transitar(correr(w6, w6.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'failed', at: 2, error: fallo });
  check('89) la propagación sigue el orden del workflow, siempre el mismo', t6.transitions.slice(1).map((x) => x.stepId).join() === 'z,y,x');
}

console.log('\n── I · Cierre: done, failed, blocked, cancelled ──');
{
  const w = preparado(cadena());
  let run = w.iniciar(trace).run;
  check('90) abierta mientras quede algo obligatorio por hacer', w.cierre(run).state === 'open' && w.cierre(run).pending.join() === 'a,b,c,d');
  run = correr(w, run, [{ stepId: 'a', to: 'running', at: 1 }, { stepId: 'a', to: 'done', at: 2 }, { stepId: 'b', to: 'running', at: 3 }, { stepId: 'b', to: 'done', at: 4 }, { stepId: 'c', to: 'running', at: 5 }, { stepId: 'c', to: 'done', at: 6 }]);
  check('91) tres de cuatro hechos NO es `done`: falta d, que es obligatorio', run.state === 'running' && w.cierre(run).state === 'open' && w.cierre(run).pending.join() === 'd');
  run = correr(w, run, [{ stepId: 'd', to: 'running', at: 7 }, { stepId: 'd', to: 'done', at: 8 }]);
  check('92) con todo lo obligatorio hecho, `done`, con su fin', run.state === 'done' && run.finishedAt === 8 && w.cierre(run).state === 'done' && run.cause === undefined);
  check('93) y coincide con `ejecucionTerminada()` de la Fase 0', core.ejecucionTerminada(w.workflow, run.steps));
  /* Cancelación de la ejecución entera. */
  const w2 = preparado(cadena());
  const run2 = correr(w2, w2.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]);
  const c = w2.cancelar(run2, 2);
  check('94) cancelar: lo pendiente se cancela con `workflow_cancelled`, lo que corre sigue, la ejecución queda `cancelled`',
    c.ok && c.run.state === 'cancelled' && c.run.cause.reason === 'cancelled_by_request' && c.run.steps[0].state === 'running' && c.run.steps.slice(1).every((s) => s.state === 'cancelled' && s.cause.reason === 'workflow_cancelled'));
  check('95) nada arranca después; lo que corría puede informar', !w2.transitar(c.run, { stepId: 'b', to: 'running', at: 3 }).ok && w2.transitar(c.run, { stepId: 'a', to: 'done', at: 3 }).ok && w2.transitar(c.run, { stepId: 'a', to: 'done', at: 3 }).run.finishedAt === 3);
  check('96) cancelar dos veces no es válido', !w2.cancelar(c.run, 4).ok && w2.cancelar(c.run, 4).error.details.reason === 'run_finished');
  /* Cancelación de un solo paso: sus dependientes se bloquean; el resto sigue. */
  const w3 = preparado(cadena());
  const c3 = w3.cancelar(w3.iniciar(trace).run, 1, 'b');
  check('97) cancelar un paso: él `cancelled` a petición, su dependiente `blocked` por `dependency_cancelled`, la ejecución sigue', c3.ok && c3.run.steps[1].state === 'cancelled' && c3.run.steps[1].cause.reason === 'cancelled_by_request' && c3.run.steps[2].state === 'blocked' && c3.run.steps[2].cause.reason === 'dependency_cancelled' && c3.run.state === 'pending');
  const fin3 = correr(w3, c3.run, [{ stepId: 'a', to: 'running', at: 2 }, { stepId: 'a', to: 'done', at: 3 }, { stepId: 'd', to: 'running', at: 4 }, { stepId: 'd', to: 'done', at: 5 }]);
  check('98) y termina `cancelled`, porque la raíz de lo incumplido fue una cancelación', fin3.state === 'cancelled' && fin3.cause.stepId === 'b');
  /* Pausa. */
  const w4 = preparado(cadena());
  const run4 = correr(w4, w4.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]);
  const pz = w4.pausar(run4);
  check('99) pausar: nada listo, ningún arranque, pero lo que corre informa', pz.ok && pz.run.state === 'paused' && w4.listos(pz.run).length === 0 && w4.transitar(pz.run, { stepId: 'd', to: 'running', at: 2 }).error.details.reason === 'run_paused' && w4.transitar(pz.run, { stepId: 'a', to: 'done', at: 2 }).ok);
  const rz = w4.reanudar(w4.transitar(pz.run, { stepId: 'a', to: 'done', at: 2 }).run);
  check('100) reanudar vuelve a lo que los pasos digan, y b ya está lista', rz.ok && rz.run.state === 'running' && w4.listos(rz.run).map((s) => s.id).join() === 'b,d');
  check('101) reanudar lo que no está pausado, o pausar lo terminado, se rechaza', !w4.reanudar(run4).ok && !w4.pausar(fin3).ok);
  /* Aprobación. */
  const w5 = preparado(cadena({}, { a: { requiresApproval: true } }));
  const run5 = w5.iniciar(trace).run;
  check('102) un paso con aprobación no arranca directo', w5.transitar(run5, { stepId: 'a', to: 'running', at: 1 }).error.details.reason === 'approval_required' && w5.transitar(run5, { stepId: 'd', to: 'awaiting_approval', at: 1 }).error.details.reason === 'approval_not_required');
  const esperando = w5.transitar(run5, { stepId: 'a', to: 'awaiting_approval', at: 1 }).run;
  check('103) esperando aprobación: la ejecución lo refleja y el cursor lo lleva', esperando.state === 'awaiting_approval' && esperando.cursor.join() === 'a');
  check('104) aprobado → running; rechazado → cancelled con `approval_rejected` y sus dependientes bloqueados',
    w5.transitar(esperando, { stepId: 'a', to: 'running', at: 2 }).run.steps[0].state === 'running'
    && w5.transitar(esperando, { stepId: 'a', to: 'cancelled', at: 2 }).run.steps[0].cause.reason === 'approval_rejected'
    && w5.transitar(esperando, { stepId: 'a', to: 'cancelled', at: 2 }).run.steps[1].state === 'blocked');
}

console.log('\n── J · Condiciones cerradas ──');
{
  const conCondicion = (check_, extra = {}) => preparado({ id: 'wf_cond_0001', contract: '1.0', goal: 'g', steps: [
    { id: 'a', capability: 'image.generate', purpose: 'a' },
    { id: 'b', capability: 'image.upscale', purpose: 'b', dependsOn: ['a'], when: { stepId: 'a', check: check_ } },
    { id: 'c', capability: 'video.image_to_video', purpose: 'c', dependsOn: ['b'] },
    ...(extra.steps ?? []),
  ] });
  const w = conCondicion('produced_output');
  const sinMaterial = w.transitar(correr(w, w.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'done', at: 2 });
  check('105) `produced_output` sin material: b se salta con `condition_not_met` y c queda lista (saltado satisface la dependencia, como en la Fase 0)',
    sinMaterial.run.steps[1].state === 'skipped' && sinMaterial.run.steps[1].cause.reason === 'condition_not_met' && sinMaterial.run.steps[1].cause.stepId === 'a' && sinMaterial.nowReady.join() === 'c');
  const conMaterial = w.transitar(correr(w, w.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'done', at: 2, outputRefs: ['img'] });
  check('106) con material: b queda lista', conMaterial.nowReady.join() === 'b' && conMaterial.run.steps[1].state === 'pending');
  const fin = correr(w, sinMaterial.run, [{ stepId: 'c', to: 'running', at: 3 }, { stepId: 'c', to: 'done', at: 4 }]);
  check('107) un paso saltado por su condición cuenta como cumplido: la ejecución termina `done`', fin.state === 'done');
  const wf2 = conCondicion('failed');
  const aFallo = wf2.transitar(correr(wf2, wf2.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'failed', at: 2, error: fallo });
  check('108) `failed` como condición: solo corre si a falló — pero a era obligatoria y cayó todo, así que b queda bloqueada antes', aFallo.run.steps[1].state === 'blocked');
  const w3 = preparado({ id: 'wf_cond_0002', contract: '1.0', goal: 'g', steps: [
    { id: 'a', capability: 'image.generate', purpose: 'a', onFailure: 'continue' },
    { id: 'b', capability: 'image.generate', purpose: 'respaldo', when: { stepId: 'a', check: 'failed' } },
  ] });
  const r3 = w3.iniciar(trace).run;
  check('109) una condición es una dependencia implícita: b no está lista hasta que a termine', w3.listos(r3).map((s) => s.id).join() === 'a');
  const aOk = w3.transitar(correr(w3, r3, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'done', at: 2 });
  const aMal = w3.transitar(correr(w3, r3, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'failed', at: 2, error: fallo });
  check('110) un respaldo «solo si falló»: con a bien se salta; con a mal, queda listo', aOk.run.steps[1].state === 'skipped' && aMal.run.steps[1].state === 'pending' && aMal.nowReady.join() === 'b');
  check('111) `evaluarCondicion` no decide hasta que el objetivo termina', core.evaluarCondicion({ stepId: 'a', check: 'succeeded' }, { stepId: 'a', state: 'running', attempt: 1 }) === undefined
    && core.evaluarCondicion({ stepId: 'a', check: 'succeeded' }, { stepId: 'a', state: 'done', attempt: 1 }) === true
    && core.evaluarCondicion({ stepId: 'a', check: 'skipped' }, { stepId: 'a', state: 'skipped', attempt: 0 }) === true);
  check('112) el cierre no es «todos hechos»: lista lo obligatorio pendiente y lo incumplido', w.cierre(conMaterial.run).pending.join() === 'b,c' && w.cierre(aFallo.run).unsatisfied.join() === 'a,b,c');
}

console.log('\n── K · Inmutabilidad ──');
{
  const plan = planDelAnuncio();
  const r = await motor().construir({ contract: '1.1', trace, plan });
  plan.constraints.tono = 'triste';
  plan.steps[0].purpose = 'cambiado';
  plan.assumptions.push('otra');
  check('113) cambiar el plan después no cambia el workflow: se copió, no se referenció', r.workflow.constraints.tono === 'alegre' && r.workflow.steps[0].purpose === 'Crear la imagen' && r.workflow.assumptions.length === 1);
  check('114) el workflow y todo lo suyo está congelado', [r.workflow, r.workflow.steps, r.workflow.steps[3], r.workflow.steps[3].hints, r.workflow.constraints, r.workflow.assumptions, r.workflow.language].every(Object.isFrozen));
  const w = preparado(r.workflow);
  const i = w.iniciar(trace);
  const t = w.transitar(i.run, { stepId: 's1-image_generate', to: 'running', at: 1 });
  check('115) una transición devuelve OTRA ejecución y no toca la anterior', i.run.steps[0].state === 'pending' && i.run.state === 'pending' && t.run.steps[0].state === 'running' && i.run !== t.run && i.run.steps !== t.run.steps);
  check('116) y todo lo devuelto está congelado', [i.run, i.run.steps, i.run.steps[0], t.run, t.run.steps[0], t.run.cursor, t.transitions].every(Object.isFrozen));
  const entrada = { texto: 'hola', opciones: { n: 1, lista: [1, 2] } };
  const wf = preparado({ id: 'wf_in_0001', contract: '1.0', goal: 'g', metadata: { origen: 'plantilla' }, steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', input: entrada }] });
  entrada.opciones.n = 99;
  entrada.opciones.lista.push(3);
  check('117) `input` y `metadata` se copian en profundidad', wf.workflow.steps[0].input.opciones.n === 1 && wf.workflow.steps[0].input.opciones.lista.length === 2 && Object.isFrozen(wf.workflow.steps[0].input.opciones) && Object.isFrozen(wf.workflow.metadata));
  const refs = ['asset_1'];
  const hecho = w.transitar(t.run, { stepId: 's1-image_generate', to: 'done', at: 2, outputRefs: refs });
  refs.push('asset_2');
  check('118) lo que trae una transición también se copia: cambiar la lista después no cambia la ejecución', hecho.run.steps[0].outputRefs.length === 1 && Object.isFrozen(hecho.run.steps[0].outputRefs));
  const pasosAntes = JSON.stringify(t.run.steps);
  w.listos(t.run); w.cierre(t.run); w.resumen(t.run); w.trazaDelPaso(t.run, 's1-image_generate');
  check('119) las consultas no alteran nada', JSON.stringify(t.run.steps) === pasosAntes);
}

console.log('\n── L · Seguridad ──');
{
  const wf = (steps, extra = {}) => motor().preparar({ id: 'wf_sec_0001', contract: '1.0', goal: 'g', steps, ...extra });
  const paso = (extra = {}) => ({ id: 'a', capability: 'text.generate', purpose: 'a', ...extra });
  const proto = (json) => JSON.parse(json);
  check('120) `__proto__` en `input`, `metadata` o `constraints` se rechaza', !wf([paso({ input: proto('{"__proto__":{"x":1}}') })]).ok && !wf([paso()], { metadata: proto('{"__proto__":{"x":1}}') }).ok && !wf([paso()], { constraints: proto('{"__proto__":{"x":1}}') }).ok);
  check('121) `constructor` y `prototype` como claves, también', !wf([paso({ input: { constructor: { x: 1 } } })]).ok && !wf([paso({ input: { nested: { prototype: 1 } } })]).ok);
  check('122) y nada de eso toca a Object.prototype', ({}).x === undefined && Object.prototype.x === undefined);
  const inyeccion = ['providerId', 'modelId', 'adapterId', 'implementationRef', 'provider', 'model', 'adapter', 'allowedProviders'];
  check('123) ninguna clave de implementación cabe en `input`, ni anidada', inyeccion.every((k) => wf([paso({ input: { [k]: 'x' } })]).error?.details.reason === 'implementation_not_allowed' && wf([paso({ input: { opts: { deep: { [k]: 'x' } } } })]).error?.details.reason === 'implementation_not_allowed'));
  check('124) ni en `metadata`, ni en `hints`, ni en `constraints`', inyeccion.every((k) => !wf([paso()], { metadata: { [k]: 'x' } }).ok && !wf([paso({ hints: { [k]: 'x' } })]).ok && !wf([paso()], { constraints: { [k]: 'x' } }).ok));
  check('125) ni como clave del workflow, ni del paso, ni del plan, ni de la petición',
    inyeccion.every((k) => wf([paso()], { [k]: 'x' }).error?.details.reason === 'implementation_not_allowed' && wf([paso({ [k]: 'x' })]).error?.details.reason === 'implementation_not_allowed'));
  const enPlan = await motor().construir(peticion({ plan: planDelAnuncio({ providerId: 'x' }) }));
  const enPeticion = await motor().construir({ ...peticion(), modelId: 'x' });
  const enPasoDelPlan = await motor().construir(peticion({ plan: planDelAnuncio({ steps: [{ ...planDelAnuncio().steps[0], adapterId: 'x' }], capabilities: ['image.generate'] }) }));
  check('126) tampoco por el plan: en su raíz, en la petición o en un paso',
    enPlan.status === 'invalid' && enPlan.error.details.reason === 'implementation_not_allowed' && enPeticion.status === 'invalid' && enPeticion.error.details.reason === 'implementation_not_allowed' && enPasoDelPlan.status === 'invalid');
  check('127) las pistas solo admiten el vocabulario del Core: `quality` y `durationSec`', !wf([paso({ hints: { temperatura: 1 } })]).ok && wf([paso({ hints: { quality: 'high' } })]).ok);
  check('128) ni funciones, ni fechas, ni mapas, ni símbolos: solo datos', !wf([paso({ input: { f: () => 1 } })]).ok && !wf([paso({ input: { d: new Date(0) } })]).ok && !wf([paso({ input: { m: new Map() } })]).ok && !wf([paso({ input: { s: Symbol('x') } })]).ok);
  check('129) sin instrucciones ejecutables: una cadena es una cadena, nunca se evalúa', wf([paso({ input: { prompt: 'process.exit(1); require("fs")' } })]).ok);
  check('130) acotado: profundidad, elementos y tamaño', !wf([paso({ input: JSON.parse('{"a":'.repeat(12) + '1' + '}'.repeat(12)) })]).ok && !wf([paso({ input: { l: Array.from({ length: 2000 }, (_, i) => i) } })]).ok && !wf([paso({ input: { t: 'x'.repeat(3 * 1024 * 1024) } })]).ok);
  const w = preparado(cadena());
  const corriendo = correr(w, w.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]);
  check('131) un error informado no puede traer secretos, mensaje crudo ni traza', !w.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: { code: 'PROVIDER_ERROR', source: 'g', details: { apiKey: 'x' } } }).ok
    && !w.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: { code: 'PROVIDER_ERROR', source: 'g', details: { stack: 'x' } } }).ok
    && !w.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: { code: 'PROVIDER_ERROR', source: 'g', message: 'x' } }).ok
    && !w.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: { code: 'PROVIDER_ERROR', source: 'g', details: proto('{"__proto__":{"x":1}}') } }).ok);
  check('132) el coste real informado es un registro, no una orden: admite con qué se hizo, pero no claves prohibidas', w.transitar(corriendo, { stepId: 'a', to: 'done', at: 2, actual: { provider: { lines: [], usd: 0.01, provider: 'x', model: 'y' }, latencyMs: 5 } }).ok
    && !w.transitar(corriendo, { stepId: 'a', to: 'done', at: 2, actual: { provider: { lines: [], usd: 0.01, apiKey: 'k' }, latencyMs: 5 } }).ok);
  check('133) ni una referencia de material con caracteres de control', !w.transitar(corriendo, { stepId: 'a', to: 'done', at: 2, outputRefs: ['x\n../etc'] }).ok);
  check('134) un error del motor nunca lleva stack, ruta ni mensaje de excepción', !/stack|message:|\\\\|C:\//.test(JSON.stringify(wf([paso({ dependsOn: ['x'] })]).error)) && !/stack|message:/.test(JSON.stringify(w.transitar(corriendo, 'hola').error)));
  const roto = core.crearWorkflowEngine({ tracer: { record: () => { throw new Error('el registro se cayó en C:/secreto'); } }, now });
  const r = await roto.construir(peticion());
  check('135) si la traza no se puede anotar, se avisa, no se rompe, y no se cuenta por qué', r.status === 'ready' && r.warnings.includes('trace_not_recorded') && !JSON.stringify(r).includes('secreto'));
  /* Un plan cuyas propiedades revientan al leerse: un fallo dentro del motor, no de quien pidió. */
  const venenoso = new Proxy({}, { get: () => { throw new Error('leído desde C:/secreto'); } });
  const rr = await motor().construir({ contract: '1.1', trace, plan: venenoso }).catch((e) => ({ status: 'threw', e }));
  check('136) un fallo interno al construir responde `failed`, no revienta, y no filtra el motivo', rr.status === 'failed' && rr.error.code === 'INTERNAL_ERROR' && !JSON.stringify(rr).includes('secreto'), rr.status);
}

console.log('\n── M · Ni elige, ni ejecuta, ni cobra: comprobado en ejecución ──');
{
  const declarada = motor().preparar({ id: 'wf_decl_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: '3d.generate', purpose: 'a' }] });
  check('137) una capacidad declarada sin matriz se acepta: el motor no pregunta quién la sirve, eso ya lo hizo el Planner', declarada.ok && declarada.prepared.workflow.steps[0].capability === '3d.generate');
  trazas.length = 0;
  const w = preparado(cadena());
  correr(w, w.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }, { stepId: 'a', to: 'done', at: 2 }, { stepId: 'b', to: 'running', at: 3 }]);
  check('138) preparar, iniciar y transitar no anotan nada ni llaman a nadie: solo construir deja traza', trazas.length === 0);
  const r = await motor().construir(peticion());
  check('139) el workflow no lleva proveedor, modelo, adaptador ni implementación en ningún sitio', !/provider|model|adapter|implementation/i.test(JSON.stringify(r.workflow)));
  check('140) ni Credits: `estimatedCredits` y `chargedCredits` nunca los escribe el motor', !/estimatedCredits|chargedCredits|estimate:/.test(codigoMotor) && w.iniciar(trace).run.estimatedCredits === undefined);
  check('141) el motor no importa Firebase ni sabe de red: es la misma comprobación que el resto del Core', !/firebase|firestore|fetch|http/i.test(codigoCore));
}

console.log('\n── N · Sin estado y determinista ──');
{
  const a = motor(); const b = motor();
  const ra = await a.construir(peticion()); const rb = await b.construir(peticion());
  check('142) dos motores distintos dan lo mismo: no hay nada compartido que lo cambie', JSON.stringify(ra.workflow) === JSON.stringify(rb.workflow));
  const pa = preparado(ra.workflow); const pb = preparado(rb.workflow);
  const secuencia = [{ stepId: 's1-image_generate', to: 'running', at: 1 }, { stepId: 's2-voice_tts', to: 'running', at: 1 }, { stepId: 's1-image_generate', to: 'done', at: 2, outputRefs: ['x'] }, { stepId: 's4-video_image_to_video', to: 'running', at: 3 }, { stepId: 's2-voice_tts', to: 'failed', at: 4, error: fallo }];
  const fa = correr(pa, pa.iniciar(trace).run, secuencia); const fb = correr(pb, pb.iniciar(trace).run, secuencia);
  check('143) la misma secuencia da EXACTAMENTE la misma ejecución', JSON.stringify(fa) === JSON.stringify(fb));
  const otraVez = correr(pa, pa.iniciar(trace).run, secuencia);
  check('144) y repetirla sobre el mismo preparado también: no acumula nada entre ejecuciones', JSON.stringify(otraVez) === JSON.stringify(fa));
  check('145) los tiempos son los que trajo quien llamó, nunca del reloj', fa.startedAt === 1 && fa.steps[0].finishedAt === 2 && fa.steps[1].finishedAt === 4);
  check('146) la ejecución es un dato plano: se puede guardar y volver a leer sin perder nada', JSON.parse(JSON.stringify(fa)).steps[2].cause.stepId === 's2-voice_tts' && JSON.stringify(JSON.parse(JSON.stringify(fa))) === JSON.stringify(fa) && !JSON.stringify(fa).includes('undefined'));
  const releido = preparado(JSON.parse(JSON.stringify(ra.workflow)));
  check('147) y un workflow que vuelve de donde se guardó se prepara igual', JSON.stringify(releido.workflow) === JSON.stringify(ra.workflow));
  const [pasoDeIds] = [pa.iniciar(trace, { runId: 'run_propio_0001' })];
  check('148) quien ya tiene un id de ejecución lo trae; si no, se deriva de la petición', pasoDeIds.run.id === 'run_propio_0001' && pa.iniciar(trace).run.id === 'run_brain_w_0001');
  check('149) el Core no ofrece generador de ids y el motor no inventa uno: los ids se derivan o se traen', !/uuid|nanoid|randomUUID|crypto/.test(codigoCore + codigoComp));
}

console.log('\n── O · Compatibilidad: Brain → Planner → Workflow, y nada roto ──');
{
  const cerebro = core.crearBrain({
    thinker: { async pensar() { return { response: { kind: 'text', content: JSON.stringify({ intent: 'creation', goal: 'un logo animado', capability: 'video.image_to_video', capabilities: ['image.generate', 'video.image_to_video'], confidence: 'high' }), actual: { provider: { lines: [], usd: 0.001 }, latencyMs: 2 } } }; } },
    tracer: { record: () => {} }, now, experiences: ['design'],
  });
  const entendido = await cerebro.entender({ contract: '1.0', trace: { traceId: 'brain_o_0001', requestId: 'brain_o_0001', userId: 'user-0001' }, message: { text: 'quiero un logo animado' }, options: { mode: 'understand' } });
  const planner = core.crearPlanner({ availability: { disponible: () => true }, tracer: { record: () => {} }, now });
  const plan = await planner.planificar({ contract: '1.0', trace: entendido.trace, understanding: entendido.understanding });
  check('150) Brain entiende y el Planner planifica dos pasos con dependencia', plan.status === 'ready' && plan.plan.steps.length === 2 && plan.plan.steps[1].dependsOn.length === 1, JSON.stringify(plan.error));
  const r = await motor().construir({ contract: '1.1', trace: plan.trace, plan: plan.plan });
  check('151) y ese plan entra en el motor tal cual, sin traducirlo', r.status === 'ready' && r.workflow.steps.map((s) => s.capability).join() === 'image.generate,video.image_to_video', JSON.stringify(r.error?.details));
  check('152) el hilo se conserva de Brain al plan y al workflow', r.workflow.planId === 'plan_brain_o_0001' && r.workflow.id === 'wf_brain_o_0001' && r.trace.traceId === 'brain_o_0001');
  const w = preparado(r.workflow);
  const run = w.iniciar(plan.trace).run;
  check('153) y de ahí a la traza de cada paso, que es lo que bajará al Router y al Gateway', w.trazaDelPaso(run, r.workflow.steps[1].id).traceId === 'brain_o_0001' && w.trazaDelPaso(run, r.workflow.steps[1].id).stepId === r.workflow.steps[1].id);
  /* Traducción: una capacidad más. */
  const traduccion = await motor().construir(peticion({ plan: planDelAnuncio({ intent: 'transform', steps: [{ id: 's1-translation_text', capability: 'translation.text', purpose: 'Traducir', produces: 'text' }], capabilities: ['translation.text'] }) }));
  check('154) `translation.text` se estructura como cualquier otra capacidad, sin nombrar a nadie', traduccion.status === 'ready' && traduccion.workflow.steps[0].capability === 'translation.text' && !/deepl|papago|youdao/i.test(codigoCore));
  /* La Fase 0, intacta: las mismas comprobaciones de entonces sobre las mismas piezas. */
  const wf0 = { id: 'w1', contract: '1.0', goal: 'anuncio', steps: [
    { id: 'guion', capability: 'script.write', purpose: 'guion' },
    { id: 'img1', capability: 'image.generate', purpose: 'escena 1', dependsOn: ['guion'] },
    { id: 'img2', capability: 'image.generate', purpose: 'escena 2', dependsOn: ['guion'] },
    { id: 'video', capability: 'video.generate', purpose: 'montaje', dependsOn: ['img1', 'img2'] },
  ] };
  const hecho = [{ stepId: 'guion', state: 'done', attempt: 1 }];
  check('155) `pasosListos`, `ejecucionTerminada` y `validarWorkflow` de la Fase 0 se comportan exactamente igual',
    core.pasosListos(wf0, []).map((s) => s.id).join() === 'guion' && core.pasosListos(wf0, hecho).map((s) => s.id).join() === 'img1,img2'
    && !core.ejecucionTerminada(wf0, hecho) && core.ejecucionTerminada(wf0, [{ stepId: 'guion', state: 'failed', attempt: 1 }])
    && core.validarWorkflow(wf0).length === 0 && core.validarWorkflow({ ...wf0, steps: [{ id: 'a', capability: 'text.generate', purpose: 'x', dependsOn: ['b'] }, { id: 'b', capability: 'text.generate', purpose: 'y', dependsOn: ['a'] }] }).some((p) => /ciclo/.test(p)));
  check('156) el contrato subió de menor, no de mayor: 1.0 sigue siendo compatible', core.WORKFLOW_CONTRACT_VERSION === '1.1' && core.contratoCompatible('1.1', '1.0') && preparado(wf0).workflow.contract === '1.1');
  check('157) el Planner no se tocó: sigue sin saber de ejecución', !/StepRun|RunState|pasosListos|ejecucionTerminada|retry|maxAttempts|cursor|awaiting_approval/i.test(sinComentarios(leer('functions/src/core/planner.ts'))) && /export const crearPlanner/.test(leer('functions/src/core/planner.ts')));
  check('158) Brain solo ganó la exportación de su lista de intenciones, que el motor reutiliza en vez de copiarla', /export const INTENCIONES/.test(leer('functions/src/core/brain.ts')) && /INTENCIONES\.includes/.test(codigoMotor) && !/'conversation', 'question'/.test(codigoMotor));
  check('159) el `while` de Weë Creator sigue donde estaba: el motor no sustituye ninguna ruta de producción', /while \(done\.size < steps\.length\)/.test(leer('functions/src/creator/index.ts')) && !/core\/workflow|crearWorkflowEngine|prepararWorkflow/.test(leer('functions/src/creator/index.ts')));
  check('160) el catálogo sigue teniendo las mismas capacidades', core.CAPABILITY_CATALOG.length === 68);
  check('161) esta suite no llama a ninguna API real', !/https?:\/\/(?!ejemplo\.invalido)/.test(leer('functions/test/core-workflow.test.mjs')));
}

console.log('\n── P · Escala ──');
{
  const n = 1000;
  const wf = { id: 'wf_big_0001', contract: '1.0', goal: 'grande', steps: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, capability: 'text.generate', purpose: `p${i}`, ...(i ? { dependsOn: [`p${i - 1}`] } : {}) })) };
  const t0 = performance.now();
  const w = preparado(wf);
  let run = w.iniciar(trace).run;
  for (let i = 0; i < n; i++) {
    run = w.transitar(run, { stepId: `p${i}`, to: 'running', at: i }).run;
    run = w.transitar(run, { stepId: `p${i}`, to: 'done', at: i }).run;
  }
  const ms = performance.now() - t0;
  check('162) mil pasos en cadena: preparar y dos mil transiciones terminan `done`', run.state === 'done' && run.steps.every((s) => s.state === 'done'));
  check('163) y en un tiempo razonable (la cota es holgada: mide que no haya un cuadrático escondido)', ms < 5000, `${Math.round(ms)} ms`);
  const wide = { id: 'wf_wide_0001', contract: '1.0', goal: 'ancho', steps: [{ id: 'root', capability: 'text.generate', purpose: 'r' }, ...Array.from({ length: n - 1 }, (_, i) => ({ id: `h${i}`, capability: 'image.generate', purpose: `h${i}`, dependsOn: ['root'] }))] };
  const ww = preparado(wide);
  const t1 = performance.now();
  const caido = ww.transitar(correr(ww, ww.iniciar(trace).run, [{ stepId: 'root', to: 'running', at: 1 }]), { stepId: 'root', to: 'failed', at: 2, error: fallo });
  check('164) un fallo con mil dependientes se propaga a todos, con la causa raíz, de una vez', caido.run.steps.slice(1).every((s) => s.state === 'blocked' && s.cause.stepId === 'root') && caido.transitions.length === n && performance.now() - t1 < 2000);
}

/*
 * ── Q · Lo que encontró la auditoría ────────────────────────────────────────
 *
 * Cada comprobación corresponde a un defecto que existió de verdad en esta
 * fase y que se reprodujo ejecutando el motor. Están escritas por el efecto
 * observable, no por la forma del código, para que sigan valiendo si el
 * código se reescribe.
 */
console.log('\n── Q · Lo que encontró la auditoría ──');
{
  /* Un paso opcional todavía lanzable no puede darse por perdido. */
  const w = preparado({ id: 'wf_q1_0001', contract: '1.0', goal: 'g', steps: [
    { id: 'a', capability: 'text.generate', purpose: 'a' },
    { id: 'b', capability: 'voice.tts', purpose: 'b', onFailure: 'continue' },
  ] });
  const run = correr(w, w.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }, { stepId: 'a', to: 'done', at: 2 }]);
  check('165) un paso OPCIONAL pendiente mantiene la ejecución abierta: cerrar `done` sería decidir por el Orchestrator',
    run.state === 'running' && w.cierre(run).state === 'open' && w.cierre(run).pending.join() === 'b' && w.listos(run).map((s) => s.id).join() === 'b', `${run.state}/${w.cierre(run).state}`);
  const fin = correr(w, run, [{ stepId: 'b', to: 'running', at: 3 }, { stepId: 'b', to: 'failed', at: 4, error: fallo }]);
  check('166) y cuando ese opcional termina mal, la ejecución sí cierra `done`: su incumplimiento no cuenta', fin.state === 'done' && fin.cause === undefined, fin.state);

  /* La causa viaja en tres sitios a la vez: si fuera mutable, tocarla en uno los cambiaría todos. */
  const w2 = preparado(cadena());
  const t = w2.transitar(correr(w2, w2.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]), { stepId: 'a', to: 'failed', at: 2, error: fallo });
  const causa = t.run.steps[1].cause;
  let cambio = false;
  try { causa.stepId = 'OTRO'; cambio = t.run.steps[1].cause.stepId === 'OTRO'; } catch { cambio = false; }
  check('167) la causa está congelada: el mismo objeto viaja en el paso y en la transición, y nadie puede reescribirlo',
    Object.isFrozen(causa) && !cambio && t.transitions[1].cause.stepId === 'a' && Object.isFrozen(t.transitions[1]));

  /* Un error informado se revisa entero, no solo por encima. */
  const w3 = preparado(cadena());
  const corriendo = correr(w3, w3.iniciar(trace).run, [{ stepId: 'a', to: 'running', at: 1 }]);
  const anidado = w3.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: { code: 'PROVIDER_ERROR', source: 'g', details: { del: { apiKey: 'sk-secreto', stack: 'C:/ruta' } } } });
  const instancia = w3.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: { code: 'PROVIDER_ERROR', source: 'g', details: { cuando: new Date(0) } } });
  check('168) un secreto en el SEGUNDO nivel de `error.details` se rechaza: así es como un adaptador envuelve el error del proveedor', !anidado.ok, JSON.stringify(anidado.run?.steps[0].error?.details));
  check('169) y una instancia dentro de `details` también, en vez de colarse convertida en texto', !instancia.ok);

  /* Una ejecución que vuelve de donde se guardó es texto hasta que se lee. */
  const w4 = preparado(cadena());
  const base = w4.iniciar(trace).run;
  const conEstadoRaro = { ...base, steps: [{ stepId: 'a', state: 'constructor', attempt: 0 }, ...base.steps.slice(1)] };
  let reventó = false;
  let r1, r2, r3;
  try { r1 = w4.transitar(conEstadoRaro, { stepId: 'a', to: 'running', at: 1 }); r2 = w4.resumen(conEstadoRaro); r3 = w4.cierre(conEstadoRaro); } catch { reventó = true; }
  check('170) un `state` con nombre heredado del prototipo se rechaza; antes reventaba al indexar la tabla de transiciones',
    !reventó && r1 && !r1.ok && r1.error.details.reason === 'inconsistent' && r2.ready.length === 0 && r3.state === 'open');
  check('171) y `puedeTransitar` aguanta cualquier cadena, porque es pública', core.puedeTransitar('constructor', 'running') === false && core.puedeTransitar('toString', 'done') === false && core.puedeTransitar('running', 'done') === true);
  check('172) un `attempt` que no es un entero positivo también se rechaza',
    !w4.transitar({ ...base, steps: [{ stepId: 'a', state: 'pending', attempt: -1 }, ...base.steps.slice(1)] }, { stepId: 'a', to: 'running', at: 1 }).ok);

  /* Nada de lo que entra puede desbordar la pila: son funciones puras y no hay dónde capturarlo. */
  const hondo = (n) => { const raiz = {}; let o = raiz; for (let i = 0; i < n; i++) { o.x = {}; o = o.x; } return raiz; };
  let excepcion = false;
  let costeHondo, erroHondo;
  try {
    costeHondo = w3.transitar(corriendo, { stepId: 'a', to: 'done', at: 2, actual: { provider: { lines: [], usd: 1, meta: hondo(30000) }, latencyMs: 1 } });
    erroHondo = w3.transitar(corriendo, { stepId: 'a', to: 'failed', at: 2, error: { code: 'PROVIDER_ERROR', source: 'g', details: { d: hondo(30000) } } });
  } catch { excepcion = true; }
  check('173) un coste o un error anidados treinta mil niveles se rechazan limpios, sin desbordar la pila', !excepcion && costeHondo && !costeHondo.ok && erroHondo && !erroHondo.ok);
  const cadenaLarga = [{ id: 'r', capability: 'image.generate', purpose: 'r' }];
  for (let i = 0; i < 900; i++) cadenaLarga.push({ id: `c${i}`, capability: 'image.upscale', purpose: `c${i}`, when: { stepId: i ? `c${i - 1}` : 'r', check: 'produced_output' } });
  const wl = preparado({ id: 'wf_q_cadena_0001', contract: '1.0', goal: 'g', steps: cadenaLarga });
  let cadenaOk = false;
  try {
    const tl = wl.transitar(correr(wl, wl.iniciar(trace).run, [{ stepId: 'r', to: 'running', at: 1 }]), { stepId: 'r', to: 'done', at: 2 });
    cadenaOk = tl.ok && tl.run.steps.filter((s) => s.state === 'skipped').length === 900;
  } catch { cadenaOk = false; }
  check('174) novecientas condiciones encadenadas se resuelven de una vez: la propagación va con cola, no con recursión', cadenaOk);

  /* Lo que se transporta hacia la Fase 9 llega con forma de lo que es. */
  const malBudget = motor().preparar({ id: 'wf_q_b_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', budget: { maxCredits: -5, prefer: 'lo-que-sea' } }] });
  const bienBudget = motor().preparar({ id: 'wf_q_b_0002', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', budget: { maxCredits: 30, prefer: 'speed', onExceed: 'degrade' } }] });
  check('175) `budget.prefer` es una instrucción que leerá el Router: solo caben sus valores, y los Credits ni negativos ni partidos', !malBudget.ok && bienBudget.ok && bienBudget.prepared.workflow.steps[0].budget.prefer === 'speed');
  const malCalidad = motor().preparar({ id: 'wf_q_q_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', quality: { minScore: 7, checks: ['inventado'] } }] });
  check('176) y `quality` igual: `minScore` entre 0 y 1, y solo las comprobaciones declaradas', !malCalidad.ok);
  const malCoste = w3.transitar(corriendo, { stepId: 'a', to: 'done', at: 2, actual: { provider: { lines: [], usd: -999 }, latencyMs: -1, creditsCharged: 0.5 } });
  check('177) un coste real con dinero negativo, tiempo negativo o Credits partidos se rechaza: un importe con el signo cambiado suma', !malCoste.ok);
  const cancelConCoste = w3.transitar(corriendo, { stepId: 'a', to: 'cancelled', at: 2, actual: { provider: { lines: [], usd: 0.5 }, latencyMs: 10 } });
  /* `d` sigue pendiente en esta misma ejecución: nunca empezó, así que no gastó nada. */
  const pendienteConCoste = w3.transitar(corriendo, { stepId: 'd', to: 'cancelled', at: 2, actual: { provider: { lines: [], usd: 0.5 }, latencyMs: 10 } });
  check('178) un paso cancelado MIENTRAS CORRÍA sí puede declarar lo que se gastó; uno pendiente no, porque no gastó nada',
    cancelConCoste.ok && cancelConCoste.run.steps[0].actual.provider.usd === 0.5 && !pendienteConCoste.ok);

  /* Y el motor no puede construir algo que él mismo rechazaría. */
  const largo = 'r'.repeat(158);
  const conIdLargo = await motor().construir({ contract: '1.1', trace: { traceId: largo, requestId: largo, userId: 'user-0001' }, plan: planDelAnuncio() });
  check('179) un `requestId` en el límite no produce un workflow que su propio lector rechaza: se dice antes',
    conIdLargo.status === 'invalid' && conIdLargo.error.details.reason === 'id_too_long', `${conIdLargo.status} ${JSON.stringify(conIdLargo.error?.details)}`);
  const r = await motor().construir(peticion());
  check('180) y el workflow que sí se construye siempre se puede volver a preparar', motor().preparar(r.workflow).ok);

  /* Los valores declarados que no se producían, fuera. */
  const fuente = leer(CORE_WORKFLOW);
  check('181) `RunCauseReason` solo declara lo que el motor produce de verdad',
    /RunCauseReason = 'step_failed' \| 'cancelled_by_request'/.test(fuente) && !/'step_cancelled'|'step_blocked'/.test(fuente));
  check('182) y `Workflow.warnings` ya no admite un aviso de la OPERACIÓN que su propio lector rechazaba',
    /export type WorkflowWarning =[\s\S]{0,400}?'assumptions_carried';/.test(fuente) && !/WorkflowWarning =[\s\S]{0,400}?trace_not_recorded/.test(fuente)
    && /WorkflowResponseWarning = WorkflowWarning \| 'trace_not_recorded'/.test(fuente));
  const avisoDeOperacion = motor().preparar({ id: 'wf_q_w_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a' }], warnings: ['trace_not_recorded'] });
  check('183) el lector y el tipo dicen lo mismo: lo que el tipo no admite, el lector lo rechaza', !avisoDeOperacion.ok);

  /*
   * LO QUE SE REVISA ES LO QUE SE GUARDA. Revisar el original y copiarlo
   * después son dos lecturas, y un objeto puede contestar distinto a cada una:
   * se aprobaba una cosa y viajaba otra, con la selección de proveedor dentro.
   */
  const camaleon = (limpio, sucio) => { let n = 0; return { get campo() { n++; return n === 1 ? limpio : sucio; } }; };
  const porGetter = motor().preparar({ id: 'wf_q_g_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', input: camaleon('hola', { providerId: 'alguno' }) }] });
  check('184) un valor que cambia entre la revisión y la copia no puede colar una implementación',
    !porGetter.ok || !JSON.stringify(porGetter.prepared.workflow.steps[0].input).includes('providerId'),
    porGetter.ok ? JSON.stringify(porGetter.prepared.workflow.steps[0].input) : 'rechazado');
  const enConstraints = motor().preparar({ id: 'wf_q_g_0002', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a' }], constraints: camaleon('alegre', 'otra-cosa') });
  check('185) tampoco en las restricciones, que también viajan al plan de ejecución',
    !enConstraints.ok || enConstraints.prepared.workflow.constraints.campo === 'alegre',
    enConstraints.ok ? JSON.stringify(enConstraints.prepared.workflow.constraints) : 'rechazado');
  let vueltas = 0;
  const proxy = new Proxy({ prompt: 'hola', modelId: 'algo' }, {
    ownKeys: () => (++vueltas > 1 ? ['prompt', 'modelId'] : ['prompt']),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true, writable: true, value: 'x' }),
  });
  const porProxy = motor().preparar({ id: 'wf_q_g_0003', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', input: proxy }] });
  check('186) ni un objeto que cambia las claves que declara entre una lectura y la siguiente',
    !porProxy.ok || !JSON.stringify(porProxy.prepared.workflow.steps[0].input).includes('modelId'),
    porProxy.ok ? JSON.stringify(porProxy.prepared.workflow.steps[0].input) : 'rechazado');
  /* Y lo normal sigue pasando entero: la corrección no puede quedarse con nada por el camino. */
  const normal = motor().preparar({ id: 'wf_q_g_0004', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', input: { prompt: 'hola', opciones: { n: 2, lista: [1, 2, 3], hondo: { si: true } } } }] });
  check('187) y un `input` normal llega entero, copiado y congelado hasta el último nivel',
    normal.ok && normal.prepared.workflow.steps[0].input.opciones.lista.length === 3 && normal.prepared.workflow.steps[0].input.opciones.hondo.si === true
    && [normal.prepared.workflow.steps[0].input, normal.prepared.workflow.steps[0].input.opciones, normal.prepared.workflow.steps[0].input.opciones.lista].every(Object.isFrozen));
}

/*
 * ── R · Los tres requisitos transversales ───────────────────────────────────
 *
 * Weë tendrá varias apps —la principal y las independientes— sobre UNA sola
 * infraestructura, UNA sola cuenta y UN solo saldo de Credits, y algún día
 * experiencias que persigan un objetivo por su cuenta. Nada de eso se
 * implementa aquí: lo que se comprueba es que el motor no lo impida.
 */
console.log('\n── R · Multi-producto, Credits compartidos y experiencias futuras ──');
{
  /* Lo que mandaría una app independiente: su producto, su Workplace, su proyecto. */
  const desdeOtraApp = { traceId: 'brain_r_0001', requestId: 'brain_r_0001', userId: 'user-0001', appId: 'app-independiente', workplace: 'chef', projectId: 'proj_0009' };
  trazas.length = 0;
  const r = await motor().construir({ contract: '1.1', trace: desdeOtraApp, plan: planDelAnuncio({ workplace: 'chef', projectId: 'proj_0009' }) });
  check('188) el MISMO motor atiende a cualquier producto: no hay una rama por app ni un motor por Workplace',
    r.status === 'ready' && r.workflow.workplace === 'chef' && r.workflow.projectId === 'proj_0009', r.status);
  const w = preparado(r.workflow);
  const run = w.iniciar(desdeOtraApp).run;
  const tp = w.trazaDelPaso(run, r.workflow.steps[0].id);
  check('189) el producto anfitrión viaja en el hilo hasta el paso, que es lo que bajará al Router y al Gateway',
    tp.appId === 'app-independiente' && tp.workplace === 'chef' && tp.userId === 'user-0001' && tp.stepId === r.workflow.steps[0].id, JSON.stringify(tp));
  check('190) y la ejecución guardada lo conserva, para que se pueda retomar desde donde sea', run.trace.appId === 'app-independiente' && JSON.parse(JSON.stringify(run)).trace.appId === 'app-independiente');
  /*
   * Fase 9 tendrá que atribuir cada operación a una cuenta, un producto, un
   * Workplace y una capacidad. Las cinco piezas están en la traza anotada: el
   * motor no calcula ni cobra nada, solo no pierde lo que hará falta.
   */
  const anotada = ultima();
  check('191) la traza anotada lleva las cinco piezas que Fase 9 necesitará para atribuir: cuenta, producto, Workplace, capacidad y petición',
    anotada.userId === 'user-0001' && anotada.appId === 'app-independiente' && anotada.workplace === 'chef'
    && anotada.capability === 'image.generate' && anotada.requestId === 'brain_r_0001', JSON.stringify(anotada));
  check('192) sin dejar de ser una traza limpia: ni secretos ni texto de nadie', core.trazaLimpia(anotada) && !JSON.stringify(anotada).includes('restaurante'));
  /*
   * `creditsCharged` es un campo de la Fase 0 que el motor TRANSPORTA y
   * comprueba, y por eso la búsqueda va por las ACCIONES del dinero, no por
   * la palabra: lo que no puede haber aquí es quien suma, resta o pone precio.
   */
  const ACCIONES_DE_DINERO = /wallet|\bbalance\b|\bsaldo\b|\bledger\b|spendCredits|refundCredits|completeCredits|creditEngine|aiPricing|priceOperation|cobrar|\bmargin\b|creditsPerUsd/i;
  check('193) y el motor sigue sin tocar Credits: ni saldo, ni libro, ni precio, ni cobro',
    run.estimatedCredits === undefined && run.chargedCredits === undefined && !ACCIONES_DE_DINERO.test(codigoMotor + codigoComp));
  check('193b) control: el guardia reconocería un cobro, y no confunde el campo que solo transporta',
    ACCIONES_DE_DINERO.test('await spendCredits(uid, 3);') && ACCIONES_DE_DINERO.test('const balance = 0;') && !ACCIONES_DE_DINERO.test('creditsCharged: 3'));
  check('194) el producto es una etiqueta opaca: en el motor no hay ni un nombre de producto de Weë',
    !/studio|chef|design|music|travel|business|photo|writer|beauty|home/i.test(codigoMotor + codigoComp));
  check('195) `appId` es identidad de producto, no de implementación: se rechaza si intenta colar una',
    !core.leerTraza({ trace: { ...desdeOtraApp, appId: 'x'.repeat(200) } })
    && !!core.leerTraza({ trace: desdeOtraApp })
    && motor().preparar({ id: 'wf_r_0001', contract: '1.0', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', input: { appId: 'x', providerId: 'y' } }] }).error?.details.reason === 'implementation_not_allowed');

  /*
   * Y lo que una experiencia avanzada necesitará algún día. No se implementa
   * ninguna, ni se le pone nombre: se comprueba que el motor ya lo aguanta.
   */
  const largoPlazo = preparado({ id: 'wf_r_0002', contract: '1.0', goal: 'organiza el lanzamiento entero', steps: [
    { id: 'buscar', capability: 'text.search', purpose: 'Averiguar' },
    { id: 'redactar', capability: 'text.generate', purpose: 'Redactar', dependsOn: ['buscar'] },
    { id: 'publicar', capability: 'text.structure', purpose: 'Dejarlo listo', dependsOn: ['redactar'], requiresApproval: true },
    { id: 'imagen', capability: 'image.generate', purpose: 'Una imagen', dependsOn: ['redactar'], onFailure: 'continue' },
  ] });
  let lp = largoPlazo.iniciar(desdeOtraApp).run;
  check('196) un objetivo en las palabras de la persona, varios pasos y varias capacidades', largoPlazo.workflow.goal === 'organiza el lanzamiento entero' && new Set(largoPlazo.workflow.steps.map((s) => s.capability)).size === 4);
  lp = correr(largoPlazo, lp, [{ stepId: 'buscar', to: 'running', at: 1 }, { stepId: 'buscar', to: 'done', at: 2, outputRefs: ['asset_1'] },
    { stepId: 'redactar', to: 'running', at: 3 }, { stepId: 'redactar', to: 'done', at: 4, outputRefs: ['asset_2'], actual: { provider: { lines: [], usd: 0.02 }, latencyMs: 300, creditsCharged: 3 } }]);
  check('197) el uso y el coste de cada paso quedan registrados, listos para que otra capa los atribuya', lp.steps[1].actual.creditsCharged === 3 && lp.steps[1].outputRefs.join() === 'asset_2');
  const pidiendo = largoPlazo.transitar(lp, { stepId: 'publicar', to: 'awaiting_approval', at: 5 });
  check('198) puede pedir autorización antes de hacer algo hacia fuera, y mientras tanto sigue con lo que no la necesita',
    pidiendo.ok && pidiendo.run.state === 'awaiting_approval' && largoPlazo.listos(pidiendo.run).map((s) => s.id).join() === 'imagen');
  check('199) y la tarea de varios pasos se puede guardar a medias y retomarla: la ejecución es un dato plano y completo',
    JSON.stringify(JSON.parse(JSON.stringify(pidiendo.run))) === JSON.stringify(pidiendo.run)
    && largoPlazo.cierre(pidiendo.run).state === 'open' && largoPlazo.cierre(pidiendo.run).pending.join() === 'publicar,imagen');
  check('200) sin que exista ninguna experiencia avanzada concreta: ni Autopilot, ni Agent, ni Copilot, ni herramientas, ni permisos',
    !/autopilot|copilot|\bagent\b|producer|companion|tool[sA-Z]|integration|permission|scope[sA-Z]/i.test(codigoCore + codigoComp));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
