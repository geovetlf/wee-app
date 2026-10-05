/*
 * WEE ORCHESTRATOR — QUIÉN DICE «AHORA ESTO», SIN EJECUTAR NADA.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   WORKFLOW gobierna el estado → ORCHESTRATOR coordina → ROUTER elige →
 *   GATEWAY ejecuta
 *
 * El coordinador mira una ejecución, marca lo que puede empezar y entrega un
 * paquete por paso con todo menos CON QUÉ. Casi todo lo de aquí comprueba lo
 * que NO debe hacer: ejecutar, elegir proveedor o modelo, cobrar, guardar,
 * reintentar, esperar, mirar el reloj, o volver a decidir lo que ya decidió
 * el Workflow.
 *
 * ── Lo que de verdad hay que proteger ──────────────────────────────────────
 *
 * Que el Workflow siga siendo la ÚNICA fuente de verdad del estado: aquí no
 * puede haber una segunda máquina de estados, ni un segundo grafo, ni otra
 * idea de «listo». Y que el contexto declarado no se confunda con la
 * identidad: mandar la ejecución de otra persona no puede dar acceso a su
 * cuenta.
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
const composicion = (await cargar('functions/src/orchestrator/index.ts')).ns;

const CORE_ORQ = 'functions/src/core/orchestrator.ts';
const COMP_ORQ = 'functions/src/orchestrator/index.ts';
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const codigoCore = sinComentarios(leer(CORE_ORQ));
const codigoComp = sinComentarios(leer(COMP_ORQ));

/* ── Piezas de prueba ─────────────────────────────────────────────────────── */

const trace = { traceId: 'brain_o_0001', requestId: 'brain_o_0001', userId: 'user-0001', appId: 'wee-chef', workplace: 'chef', projectId: 'proj_0001' };
const principal = { userId: 'user-0001', appId: 'wee-chef' };
const fallo = { code: 'PROVIDER_ERROR', source: 'gateway' };

/** El anuncio: imagen y voz en paralelo, vídeo que consume la imagen, y un último paso con aprobación. */
const anuncio = (extra = {}, pasos = {}) => ({
  id: 'wf_brain_o_0001', contract: '1.1', goal: 'un anuncio', workplace: 'chef', projectId: 'proj_0001',
  language: { appLanguage: 'es' }, budget: { maxCredits: 100, prefer: 'quality' },
  constraints: { tono: 'alegre', duracion: 15 },
  steps: [
    { id: 'imagen', capability: 'image.generate', purpose: 'Crear la imagen', input: { brief: 'un plato' }, hints: { quality: 'high' }, ...(pasos.imagen ?? {}) },
    { id: 'voz', capability: 'voice.tts', purpose: 'Grabar la voz', ...(pasos.voz ?? {}) },
    { id: 'video', capability: 'video.image_to_video', purpose: 'Animar', dependsOn: ['imagen'], timeoutMs: 60000, budget: { maxCredits: 40 }, ...(pasos.video ?? {}) },
    { id: 'publicar', capability: 'text.generate', purpose: 'Dejarlo listo', dependsOn: ['video'], requiresApproval: true, ...(pasos.publicar ?? {}) },
  ],
  ...extra,
});

const montar = (wf = anuncio()) => {
  const m = composicion.orquestadorDeWee(wf);
  if (!m.ok) throw new Error('no se pudo montar: ' + JSON.stringify(m.error));
  return m;
};
const pet = (run, at, extra = {}) => ({ contract: '1.0', principal, run, at, ...extra });
/** Aplica una lista de resultados en orden. Falla la prueba si alguno se rechaza. */
const seguir = (o, run, pasos) => {
  let actual = run;
  for (const p of pasos) {
    const d = o.informar(pet(actual, p.at, { outcome: p }));
    if (d.status === 'invalid') throw new Error('resultado rechazado: ' + JSON.stringify(p) + ' → ' + JSON.stringify(d.error));
    actual = d.run;
  }
  return actual;
};

console.log('\n── A · Pureza: el coordinador no sabe de nadie ──');
{
  const fuera = [];
  for (const [, dep] of codigoCore.matchAll(/from ['"]([^'"]+)['"]/g)) {
    const resuelto = dep.startsWith('.') ? path.posix.normalize(path.posix.join('functions/src/core', dep)) : dep;
    if (!resuelto.startsWith('functions/src/core/')) fuera.push(dep);
  }
  check('1) core/orchestrator.ts solo importa del Core', fuera.length === 0, fuera.join(' ') || 'puro');
  check('2) no toca Firebase, red, disco, reloj, azar ni entorno',
    !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(|process\.env|Date\.now\(|Math\.random\(|new Date\(/.test(codigoCore + codigoComp));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'anthropic', 'elevenlabs', 'minimax', 'flux', 'tripo', 'hunyuan', 'qwen', 'wan', 'yinchao', 'bytedance', 'byteplus'];
  const nombra = (src) => PROVEEDORES.filter((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(src));
  check('3) ni el coordinador ni la composición nombran a un proveedor', nombra(codigoCore).length === 0 && nombra(codigoComp).length === 0, [...nombra(codigoCore), ...nombra(codigoComp)].join(',') || `${PROVEEDORES.length} comprobados`);
  check('3b) control: el patrón reconoce uno cuando lo ve', nombra('const x = seedance;').length === 1 && nombra('wanted').length === 0);
  check('4) ni un identificador de modelo', !/gpt-[0-9]|claude-[0-9]|gemini-[0-9]|SEEDANCE_|flux-|nano-banana/i.test(codigoCore + codigoComp));
  const estadoDeModulo = (src) => [
    ...(src.match(/^(let|var)\s+\w+/gm) || []),
    ...(src.match(/^const\s+\w+[^=\n]*=\s*(new (Map|Set|WeakMap|WeakSet)\(\s*\)|\{\s*\}|\[\s*\])/gm) || []),
  ];
  const conEstado = [...estadoDeModulo(codigoCore), ...estadoDeModulo(codigoComp)];
  check('5) sin estado de módulo: ni contador, ni caché, ni registro global de ejecuciones', conEstado.length === 0, conEstado.join(' | ') || 'sin estado');
  check('5b) control: una caché de módulo se detectaría', estadoDeModulo('const cache = new Map();\n').length === 1 && estadoDeModulo('const T = new Map(L.map(\n').length === 0);
  check('6) sin bucles permanentes, temporizadores, sondeo ni espera', !/while \(true\)|setInterval|setTimeout|requestAnimationFrame|\bpoll|\bsleep\b|\bawait new Promise/i.test(codigoCore + codigoComp));
  check('7) sin código dinámico', !/\beval\(|new Function\(|\bimport\(/.test(codigoCore + codigoComp));
  check('8) platform-agnostic: ni React, ni Expo, ni APIs de navegador o móvil', !/from ['"]react|from ['"]expo|window\.|document\.|navigator\.|localStorage|AsyncStorage|Platform\.OS/.test(codigoCore + codigoComp));
  const fueraComp = [...codigoComp.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((d) => d !== '../core');
  check('9) la composición solo importa del Core', fueraComp.length === 0, fueraComp.join(' ') || 'solo ../core');
  /* Y es de verdad síncrono: coordinar no espera a nadie. */
  check('10) el coordinador es síncrono: no devuelve promesas, porque no espera a nadie', !/async |Promise</.test(codigoCore));
}

console.log('\n── B · No se apropia de lo que es de otras capas ──');
{
  check('11) NO ejecuta: ni Gateway, ni adaptadores, ni motor, ni HTTP',
    !/crearGateway|gateway\.ejecutar|GatewayRequest|adapter\.run|engine\.generate|gatewayDeWee|https?:\/\//i.test(codigoCore + codigoComp));
  check('12) NO elige: ni resolver, ni candidatos, ni cadena, ni puntuación',
    !/ImplementationResolver|ImplementationRef|resolver\(|findImplementations|candidat|cheapest|fallback|routing|DEFAULT_ROUTING/i.test(codigoCore + codigoComp));
  check('13) NO cobra ni calcula precios',
    !/spendCredits|refundCredits|completeCredits|creditEngine|aiPricing|priceOperation|cabeEnPresupuesto|presupuestoRestante|sumarEstimaciones|\bmargin\b|creditsPerUsd|wallet|\bbalance\b|\bledger\b/i.test(codigoCore + codigoComp));
  check('14) NO es Job Engine: ni cola, ni persistencia, ni reintento, ni plazo activo',
    !/enqueue|dequeue|\bqueue\b|firestore|collection\(|\.doc\(|writeBatch|runTransaction|\bretry\(|backoff|reintentar/i.test(codigoCore + codigoComp));
  check('15) NO duplica la máquina de estados: no declara transiciones ni estados propios',
    !/TRANSICIONES|type StepState|type RunState|'pending'\s*:|puedeTransitar\s*=/.test(codigoCore));
  check('16) NO duplica el grafo: no recorre dependencias para decidir qué está listo',
    !/topolog|ciclo|cycle|dependientes|descendientes|grado|indexar/i.test(codigoCore));
  check('17) «listo» se lo pregunta al Workflow, no lo decide', /prepared\.listos\(/.test(codigoCore) && !/const listoPorGrafo|esListo\s*=/.test(codigoCore));
  /* `(?!=)` porque `r.state === 'running'` es una comparación, no una asignación. */
  check('18) y TODO cambio de estado pasa por el Workflow',
    (codigoCore.match(/prepared\.transitar\(/g) || []).length >= 2 && !/steps\[\w+\]\s*=(?!=)|\.state\s*=(?!=)/.test(codigoCore));
  check('18b) control: el guardia vería una asignación y no confunde una comparación',
    /\.state\s*=(?!=)/.test('r.state = "done";') && !/\.state\s*=(?!=)/.test('r.state === "done"') && !/\.state\s*=(?!=)/.test('r.state !== "done"'));
  check('19) el paralelismo no se redefine: no hay `parallel` en ningún sitio', !/parallel/i.test(codigoCore + codigoComp));
  check('20) reutiliza los contratos del Core en vez de declararlos otra vez',
    ['TraceContext', 'WeeError', 'CoreCapabilityId', 'ExecutionHints', 'WorkflowRun', 'PreparedWorkflow', 'RunClosure', 'Budget', 'ActualCost', 'QualityRequirement']
      .every((t) => new RegExp(`\\b${t}\\b`).test(leer(CORE_ORQ)))
    && !/interface (TraceContext|WeeError|WorkflowRun|RunClosure|Budget)\b/.test(codigoCore));
  check('21) no lleva Tracer: no ejecuta ninguna operación, así que no tiene ninguna que anotar',
    !/Tracer|OperationTrace|\.record\(/.test(codigoCore));
  check('21b) pero cada despacho baja con su traza, que es quien la anota',
    /trace: Object\.freeze\(\{ \.\.\.leida\.trace/.test(codigoCore) && /leerTraza\(run\)/.test(codigoCore));
}

console.log('\n── C · Un workflow válido y un paso ──');
{
  const { prepared, orchestrator: o } = montar({ id: 'wf_uno_0001', contract: '1.1', goal: 'uno', steps: [{ id: 'a', capability: 'text.generate', purpose: 'Escribir' }] });
  const run = prepared.iniciar(trace).run;
  const d = o.avanzar(pet(run, 10));
  check('22) un workflow de un paso se despacha', d.status === 'dispatch' && d.dispatch.length === 1, d.status + ' ' + JSON.stringify(d.error?.details));
  check('23) y queda marcado como corriendo ANTES de entregarse', d.run.steps[0].state === 'running' && d.run.state === 'running' && d.run.cursor.join() === 'a');
  check('24) el cierre lo dice el Workflow', d.closure.state === 'open' && d.closure.pending.join() === 'a');
  const fin = o.informar(pet(d.run, 20, { outcome: { stepId: 'a', kind: 'succeeded', at: 20 } }));
  check('25) al informar, la ejecución termina', fin.status === 'finished' && fin.run.state === 'done' && fin.closure.state === 'done');
  check('26) y ya no hay nada que despachar', o.avanzar(pet(fin.run, 21)).status === 'finished' && o.avanzar(pet(fin.run, 21)).dispatch.length === 0);
  /* Un workflow vacío no llega ni a montarse: lo rechaza el lector de la Fase 5. */
  const vacio = composicion.orquestadorDeWee({ id: 'wf_vacio_0001', contract: '1.1', goal: 'g', steps: [] });
  check('27) un workflow vacío se rechaza al montar, con el motivo de la Fase 5', !vacio.ok && vacio.error.details.reason === 'empty_workflow');
  const roto = composicion.orquestadorDeWee({ id: 'wf_roto_0001', contract: '1.1', goal: 'g', steps: [{ id: 'a', capability: 'text.generate', purpose: 'a', dependsOn: ['b'] }] });
  check('28) y uno con el grafo roto, igual: aquí no se vuelve a validar', !roto.ok && roto.error.details.reason === 'unknown_dependency');
}

console.log('\n── D · Varios pasos, dependencias y paralelismo ──');
{
  const { prepared, orchestrator: o } = montar();
  const run = prepared.iniciar(trace).run;
  const d = o.avanzar(pet(run, 10));
  check('29) los dos pasos independientes salen a la vez: el paralelismo viene del grafo', d.dispatch.map((x) => x.stepId).join() === 'imagen,voz');
  check('30) y coincide con lo que el Workflow considera listo', prepared.listos(run).map((s) => s.id).join() === 'imagen,voz');
  check('31) el que depende NO sale', !d.dispatch.some((x) => x.stepId === 'video') && d.run.steps[2].state === 'pending');
  const tras = seguir(o, d.run, [{ stepId: 'imagen', kind: 'succeeded', at: 20, outputRefs: ['asset_img'] }]);
  const d2 = o.avanzar(pet(tras, 21));
  check('32) cuando su dependencia termina, se despacha', d2.dispatch.map((x) => x.stepId).join() === 'video');
  check('33) el orden es el del workflow, siempre el mismo', o.avanzar(pet(run, 10)).dispatch.map((x) => x.stepId).join() === 'imagen,voz');
  const cap = o.avanzar(pet(run, 10, { maxConcurrent: 1 }));
  check('34) un tope de concurrencia corta, no reordena, y lo avisa', cap.dispatch.map((x) => x.stepId).join() === 'imagen' && cap.warnings.includes('dispatch_capped'));
  check('35) el tope no toca el grafo: el otro sigue pendiente y listo', cap.run.steps[1].state === 'pending' && prepared.listos(cap.run).map((s) => s.id).join() === 'voz');
  check('36) un tope que no es un entero positivo se rechaza', o.avanzar(pet(run, 10, { maxConcurrent: 0 })).status === 'invalid' && o.avanzar(pet(run, 10, { maxConcurrent: 1.5 })).status === 'invalid');
}

console.log('\n── E · El paquete: un GatewayRequest sin implementación ──');
{
  const { prepared, orchestrator: o } = montar();
  const d = o.avanzar(pet(prepared.iniciar(trace).run, 10));
  const p = d.dispatch[0];
  check('37) lleva la capacidad y el propósito, tal cual', p.capability === 'image.generate' && p.purpose === 'Crear la imagen');
  check('38) la entrada del plan, sin tocar ni rellenar', JSON.stringify(p.input) === '{"brief":"un plato"}');
  check('39) la traza con la ejecución y el paso: con esto se anotará lo que cueste',
    p.trace.traceId === 'brain_o_0001' && p.trace.runId === d.run.id && p.trace.stepId === 'imagen' && p.trace.userId === 'user-0001');
  check('40) el idioma del workflow y las pistas del paso', p.language.appLanguage === 'es' && p.hints.quality === 'high');
  check('41) una clave de idempotencia determinista: ejecución, paso e intento',
    p.idempotencyKey === core.claveDePaso(d.run.id, 'imagen', 1) && p.attempt === 1 && core.FORMA_DE_ID.test(p.idempotencyKey), p.idempotencyKey);
  check('41b) y es inyectiva: los dos puntos son legales dentro de un id, así que la longitud va por delante',
    core.claveDePaso('run:a', 'b', 1) !== core.claveDePaso('run', 'a:b', 1) && core.claveDePaso('r', 's', 1) !== core.claveDePaso('r', 's', 2));
  check('41c) `requestId` es de la OPERACIÓN y `traceId` del hilo, como dice el contrato de la Fase 0',
    p.trace.traceId === 'brain_o_0001' && p.trace.requestId === p.idempotencyKey
    && new Set(d.dispatch.map((x) => x.trace.requestId)).size === d.dispatch.length
    && new Set(d.dispatch.map((x) => x.trace.traceId)).size === 1, d.dispatch.map((x) => x.trace.requestId).join(' | '));
  check('42) el tope: el del paso manda sobre el del workflow', p.budget.maxCredits === 100 && o.avanzar(pet(seguir(o, d.run, [{ stepId: 'imagen', kind: 'succeeded', at: 20, outputRefs: ['x'] }]), 21)).dispatch[0].budget.maxCredits === 40);
  check('43) y el plazo del paso, cuando lo tiene', p.timeoutMs === undefined && o.avanzar(pet(seguir(o, d.run, [{ stepId: 'imagen', kind: 'succeeded', at: 20, outputRefs: ['x'] }]), 21)).dispatch[0].timeoutMs === 60000);
  check('44) NO lleva implementación: ni proveedor, ni modelo, ni adaptador. Ese hueco es del Router',
    !('implementation' in p) && !/provider|model|adapter/i.test(JSON.stringify(p)));
  check('45) ni Credits, ni precio, ni saldo', !/credits|price|wallet|balance/i.test(JSON.stringify(p).replace(/maxCredits/g, '')));
  check('46) y está congelado, como todo lo que sale de aquí', [p, p.input, p.trace, p.upstream, d, d.dispatch, d.waiting].every(Object.isFrozen));
}

console.log('\n── F · Resultados: el material de las dependencias, resuelto ──');
{
  const { prepared, orchestrator: o } = montar();
  const d = o.avanzar(pet(prepared.iniciar(trace).run, 10));
  const tras = seguir(o, d.run, [{ stepId: 'imagen', kind: 'succeeded', at: 20, outputRefs: ['asset_img_1', 'asset_img_2'] }]);
  const p = o.avanzar(pet(tras, 21)).dispatch[0];
  check('47) el paso recibe lo que produjo su dependencia, con de dónde salió y qué es',
    p.upstream.length === 1 && p.upstream[0].stepId === 'imagen' && p.upstream[0].capability === 'image.generate'
    && p.upstream[0].produces === 'image' && p.upstream[0].outputRefs.join() === 'asset_img_1,asset_img_2', JSON.stringify(p.upstream));
  check('48) son REFERENCIAS, no contenido: aquí no hay ni almacén ni material embebido',
    !/content|bytes|url|buffer|base64|storage/i.test(codigoCore) && p.upstream.every((u) => u.outputRefs.every((r) => typeof r === 'string')));
  check('49) y viajan aparte de `input`: nombrarlas para un adaptador concreto no es coordinar',
    p.input.brief === undefined && !JSON.stringify(p.input).includes('asset_img'));
  const sinMaterial = seguir(o, d.run, [{ stepId: 'imagen', kind: 'succeeded', at: 20 }]);
  check('50) una dependencia que no dejó nada no inventa material', o.avanzar(pet(sinMaterial, 21)).dispatch[0].upstream.length === 0);
  check('51) y no se crea Asset Engine ni Project Engine', !/AssetEngine|ProjectEngine|crearAsset|guardarAsset|Provenance|AssetVersion/.test(codigoCore + codigoComp));
}

console.log('\n── G · Aprobación ──');
{
  const { prepared, orchestrator: o } = montar();
  const d = o.avanzar(pet(prepared.iniciar(trace).run, 10));
  const listo = seguir(o, d.run, [
    { stepId: 'imagen', kind: 'succeeded', at: 20, outputRefs: ['a'] },
    { stepId: 'voz', kind: 'succeeded', at: 20 },
  ]);
  const conVideo = o.avanzar(pet(listo, 21));
  const trasVideo = seguir(o, conVideo.run, [{ stepId: 'video', kind: 'succeeded', at: 30, outputRefs: ['v'] }]);
  const ap = o.avanzar(pet(trasVideo, 31));
  check('52) un paso que necesita permiso NO se ejecuta: se marca y se pide', ap.dispatch.length === 0 && ap.approvals.map((x) => x.stepId).join() === 'publicar');
  check('53) la ejecución lo refleja y se avisa', ap.run.state === 'awaiting_approval' && ap.waiting.awaitingApproval.join() === 'publicar' && ap.warnings.includes('awaiting_approval'));
  check('54) su paquete ya está listo, y describe la operación que VA a correr', ap.approvals[0].idempotencyKey === core.claveDePaso(ap.run.id, 'publicar', 1) && ap.approvals[0].attempt === 1 && ap.approvals[0].capability === 'text.generate', ap.approvals[0].idempotencyKey);
  const si = o.informar(pet(ap.run, 32, { outcome: { stepId: 'publicar', kind: 'approved', at: 32 } }));
  check('55) aprobar lo pone a correr y entrega el paquete', si.status === 'dispatch' && si.dispatch[0].stepId === 'publicar' && si.run.steps[3].state === 'running');
  check('55b) y la clave es la MISMA antes y después de aprobar: esperar no consume un intento',
    si.dispatch[0].idempotencyKey === ap.approvals[0].idempotencyKey, `${ap.approvals[0].idempotencyKey} → ${si.dispatch[0].idempotencyKey}`);
  const no = o.informar(pet(ap.run, 32, { outcome: { stepId: 'publicar', kind: 'rejected', at: 32 } }));
  check('56) rechazar lo cancela, con la causa del Workflow', no.run.steps[3].state === 'cancelled' && no.run.steps[3].cause.reason === 'approval_rejected');
  check('57) aprobar algo que no está esperando se rechaza, en vez de traducirlo a otra cosa',
    o.informar(pet(trasVideo, 33, { outcome: { stepId: 'imagen', kind: 'approved', at: 33 } })).error.details.reason === 'not_awaiting_approval');
  check('58) y no se implementa ningún sistema de permisos: solo se respetan los estados', !/permission|scope|role|grant|policy|acl/i.test(codigoCore + codigoComp));
}

console.log('\n── H · Bloqueado, saltado, fallado, cancelado ──');
{
  const { prepared, orchestrator: o } = montar();
  const d = o.avanzar(pet(prepared.iniciar(trace).run, 10));
  const cae = o.informar(pet(d.run, 25, { outcome: { stepId: 'imagen', kind: 'failed', at: 25, error: fallo } }));
  check('59) un fallo lo propaga el WORKFLOW: el vídeo queda bloqueado con la causa raíz',
    cae.run.steps[2].state === 'blocked' && cae.run.steps[2].cause.stepId === 'imagen' && cae.run.steps[2].cause.reason === 'dependency_failed');
  check('60) y la propagación se informa como tal, para poder seguirla', cae.applied.some((x) => x.propagated && x.stepId === 'video'), JSON.stringify(cae.applied));
  check('61) la ejecución cae entera y el cierre lo explica', cae.run.state === 'failed' && cae.closure.state === 'failed' && cae.closure.cause.stepId === 'imagen');
  check('62) después no se despacha nada', o.avanzar(pet(cae.run, 26)).status === 'finished' && o.avanzar(pet(cae.run, 26)).dispatch.length === 0);
  check('63) aquí no hay una segunda política de fallos', !/onFailure|fail_workflow|skip_dependents|dependency_failed|propagar/i.test(codigoCore));
  /* Saltado por condición: lo decide el Workflow y el coordinador solo lo ve. */
  const conCondicion = montar({ id: 'wf_cond_0001', contract: '1.1', goal: 'g', steps: [
    { id: 'a', capability: 'image.generate', purpose: 'a' },
    { id: 'b', capability: 'image.upscale', purpose: 'b', dependsOn: ['a'], when: { stepId: 'a', check: 'produced_output' } },
  ] });
  const r0 = conCondicion.orchestrator.avanzar(pet(conCondicion.prepared.iniciar(trace).run, 1));
  const sinSalida = conCondicion.orchestrator.informar(pet(r0.run, 2, { outcome: { stepId: 'a', kind: 'succeeded', at: 2 } }));
  check('64) un paso cuya condición no se cumple lo salta el Workflow, y aquí no se despacha',
    sinSalida.run.steps[1].state === 'skipped' && sinSalida.run.steps[1].cause.reason === 'condition_not_met' && sinSalida.status === 'finished');
  /* Cancelación: estructural, del Workflow. */
  const cancelado = prepared.cancelar(d.run, 30);
  check('65) una ejecución cancelada no despacha nada más', o.avanzar(pet(cancelado.run, 31)).status === 'finished' && o.avanzar(pet(cancelado.run, 31)).dispatch.length === 0);
  check('66) pero lo que ya corría puede informar: lo que pasó, pasó',
    o.informar(pet(cancelado.run, 32, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 32, outputRefs: ['x'] } })).run.steps[0].state === 'done');
  check('67) y aquí no se aborta ningún proceso: eso es del Job Engine', !/abort|kill|terminate|signal|AbortController/i.test(codigoCore + codigoComp));
  const pausada = prepared.pausar(d.run);
  check('68) una ejecución pausada no arranca nada', o.avanzar(pet(pausada.run, 31)).status === 'paused' && o.avanzar(pet(pausada.run, 31)).dispatch.length === 0);
}

console.log('\n── I · Transiciones inválidas ──');
{
  const { prepared, orchestrator: o } = montar();
  const run = prepared.iniciar(trace).run;
  const d = o.avanzar(pet(run, 10));
  check('69) informar de un paso que no existe se rechaza', o.informar(pet(d.run, 20, { outcome: { stepId: 'fantasma', kind: 'succeeded', at: 20 } })).error.details.reason === 'unknown_step');
  check('70) terminar algo que no empezó se rechaza con el motivo del Workflow',
    o.informar(pet(run, 20, { outcome: { stepId: 'video', kind: 'succeeded', at: 20 } })).error.details.reason === 'invalid_transition');
  const hecho = o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 20 } }));
  check('71) informar dos veces del mismo paso se rechaza: `done` es final',
    o.informar(pet(hecho.run, 21, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 21 } })).error.details.reason === 'invalid_transition');
  check('72) fallar sin error se rechaza', o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'failed', at: 20 } })).error.details.field === 'outcome.error');
  check('73) y acompañar un desenlace con lo que no le toca, también',
    o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 20, error: fallo } })).status === 'invalid'
    && o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'cancelled', at: 20, outputRefs: ['x'] } })).status === 'invalid');
  check('74) un desenlace desconocido se rechaza', o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'inventado', at: 20 } })).error.details.field === 'outcome.kind');
  check('75) y una clave de más en el resultado', o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 20, providerId: 'x' } })).error.details.field.startsWith('outcome.'));
  check('76) el contenido de lo que se informa lo revisa el Workflow, no se duplica aquí',
    o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'failed', at: 20, error: { code: 'PROVIDER_ERROR', source: 'g', details: { apiKey: 'sk-x' } } } })).status === 'invalid'
    && o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 20, actual: { provider: { lines: [], usd: -1 }, latencyMs: 1 } } })).status === 'invalid');
  check('77) un rechazo es un `WeeError` estructurado con fuente `orchestrator`',
    o.informar(pet(d.run, 20, { outcome: { stepId: 'fantasma', kind: 'succeeded', at: 20 } })).error.source === 'orchestrator');
  check('78) y ninguno lleva stack, ruta ni mensaje crudo',
    !/stack|message:|C:\//.test(JSON.stringify(o.informar(pet(d.run, 20, { outcome: { stepId: 'fantasma', kind: 'succeeded', at: 20 } })).error)));
}

console.log('\n── J · Identidad frente a contexto declarado ──');
{
  const { prepared, orchestrator: o } = montar();
  const run = prepared.iniciar(trace).run;
  const ajeno = { userId: 'otra-persona-0001', appId: 'wee-chef' };
  check('79) la ejecución de otra persona no se avanza', o.avanzar({ contract: '1.0', principal: ajeno, run, at: 10 }).error.code === 'AUTH_ERROR');
  check('80) ni se informa', o.informar({ contract: '1.0', principal: ajeno, run, at: 10, outcome: { stepId: 'imagen', kind: 'succeeded', at: 10 } }).error.code === 'AUTH_ERROR');
  check('81) ni se mira', o.estado({ contract: '1.0', principal: ajeno, run, at: 10 }).error.code === 'AUTH_ERROR');
  check('82) el motivo lo dice sin ambigüedad', o.avanzar({ contract: '1.0', principal: ajeno, run, at: 10 }).error.details.reason === 'not_owner');
  /* Y el `userId` de dentro de la ejecución es un DATO, no una prueba. */
  const disfrazado = { ...run, userId: ajeno.userId, trace: { ...run.trace, userId: ajeno.userId } };
  check('83) cambiar el userId de la ejecución no da acceso: hay que ser esa persona',
    o.avanzar({ contract: '1.0', principal, run: disfrazado, at: 10 }).error.code === 'AUTH_ERROR');
  const soloDentro = { ...run, trace: { ...run.trace, userId: 'otra-persona-0001' } };
  check('84) y una ejecución cuya traza no concuerda con su dueño tampoco pasa', o.avanzar(pet(soloDentro, 10)).error.code === 'AUTH_ERROR');
  check('85) sin principal no se hace nada', o.avanzar({ contract: '1.0', run, at: 10 }).error.details.field === 'principal');
  check('86) y el principal no admite claves de más: no es un saco de contexto', o.avanzar({ contract: '1.0', principal: { ...principal, providerId: 'x' }, run, at: 10 }).status === 'invalid');
  check('87) aquí no se implementa autenticación: solo se respeta la separación', !/token|jwt|session|password|firebase|auth\(|verifyId/i.test(codigoCore + codigoComp));
}

console.log('\n── K · Multi-producto y apps independientes ──');
{
  const { prepared, orchestrator: o } = montar();
  const run = prepared.iniciar(trace).run;
  const APPS = ['wee', 'wee-studio', 'wee-chef', 'wee-design', 'wee-music', 'wee-travel', 'wee-business'];
  const decisiones = APPS.map((appId) => o.avanzar({ contract: '1.0', principal: { userId: 'user-0001', appId }, run, at: 10 }));
  check('88) la MISMA cuenta coordina el mismo trabajo desde cualquier producto', decisiones.every((d) => d.status === 'dispatch'));
  const primero = JSON.stringify(decisiones[0].dispatch);
  check('89) y el despacho es IDÉNTICO en los siete: `appId` no decide nada',
    decisiones.every((d) => JSON.stringify(d.dispatch) === primero), `${new Set(decisiones.map((d) => JSON.stringify(d.dispatch))).size} resultados distintos`);
  check('90) tampoco cambia la ejecución resultante', new Set(decisiones.map((d) => JSON.stringify(d.run))).size === 1);
  /*
   * En el LECTOR sí aparece —se comprueba que tenga forma de etiqueta—, y eso
   * es validar, no decidir. Lo que no puede haber es una rama sobre su VALOR
   * dentro del coordinador, así que se mira solo de `crearOrchestrator` hacia
   * abajo, que es donde se decide.
   */
  const decision = codigoCore.slice(codigoCore.indexOf('crearOrchestrator'));
  check('91) `appId` no decide nada: ni una rama, ni una comparación sobre su valor',
    !/appId\s*[=!]==|if\s*\([^)]*appId|switch\s*\(\s*\w*\.?appId|appId\s*\?/.test(decision), JSON.stringify(decision.match(/.{0,20}appId.{0,20}/g)));
  check('91b) control: el guardia vería una rama por producto',
    /appId\s*[=!]==/.test("if (principal.appId === 'wee-chef') {") && /if\s*\([^)]*appId/.test("if (p.appId) {"));
  check('92) ni un nombre de producto de Weë dentro del Core', !/studio|chef|design|music|travel|business|photo|writer|beauty/i.test(codigoCore + codigoComp));
  check('93) el producto anfitrión viaja en el hilo hasta el paso, para que se pueda atribuir después',
    decisiones[0].dispatch[0].trace.appId === 'wee-chef' && decisiones[0].dispatch[0].trace.workplace === 'chef');
  /*
   * El `appId` del despacho es el de la EJECUCIÓN —desde dónde se pidió el
   * trabajo—, no el del producto desde el que alguien lo mira ahora. Quien
   * pidió es quien se atribuye.
   */
  check('94) y es el del origen del trabajo, no el de quien lo mira ahora',
    o.avanzar({ contract: '1.0', principal: { userId: 'user-0001', appId: 'wee-studio' }, run, at: 10 }).dispatch[0].trace.appId === 'wee-chef');
  check('95) hay UN coordinador, no uno por producto ni por Workplace',
    (leer(CORE_ORQ).match(/export const crearOrchestrator/g) || []).length === 1 && !/PorApp|porProducto|byApp|registry\[/i.test(codigoCore + codigoComp));
  /* Una app independiente no necesita otro motor: el mismo, con su contexto. */
  const standalone = montar({ ...anuncio(), id: 'wf_standalone_0001', workplace: 'studio' });
  const trazaStandalone = { ...trace, traceId: 'brain_s_0001', requestId: 'brain_s_0001', appId: 'wee-studio', workplace: 'studio' };
  const ds = standalone.orchestrator.avanzar({ contract: '1.0', principal: { userId: 'user-0001', appId: 'wee-studio' }, run: standalone.prepared.iniciar(trazaStandalone).run, at: 10 });
  check('96) una app independiente usa el mismo motor, con su propio contexto', ds.status === 'dispatch' && ds.dispatch[0].trace.appId === 'wee-studio' && ds.dispatch[0].trace.workplace === 'studio');
  check('97) y produce los mismos pasos: lo único que cambia es el contexto', ds.dispatch.map((x) => x.capability).join() === decisiones[0].dispatch.map((x) => x.capability).join());
}

console.log('\n── L · Credits compartidos: el contexto, nunca el dinero ──');
{
  const { prepared, orchestrator: o } = montar();
  const d = o.avanzar(pet(prepared.iniciar(trace).run, 10));
  const conCoste = o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 20, outputRefs: ['x'], actual: { provider: { lines: [], usd: 0.02 }, latencyMs: 300, creditsCharged: 3 } } }));
  check('98) el coste de un paso se transporta y se guarda, sin calcular nada', conCoste.run.steps[0].actual.creditsCharged === 3 && conCoste.run.steps[0].actual.provider.usd === 0.02);
  check('99) el coordinador no toca saldo: ni lo lee, ni lo escribe, ni lo suma',
    conCoste.run.estimatedCredits === undefined && conCoste.run.chargedCredits === undefined && !/estimatedCredits|chargedCredits|sumar|restar|total\s*\+=/.test(codigoCore));
  /* Las cinco piezas que Fase 9 necesitará para atribuir, en el hilo de cada paso. */
  const p = d.dispatch[0];
  check('100) y la atribución futura tiene sus seis piezas en el despacho: cuenta, producto, Workplace, capacidad, hilo y operación',
    p.trace.userId === 'user-0001' && p.trace.appId === 'wee-chef' && p.trace.workplace === 'chef'
    && p.capability === 'image.generate' && p.trace.traceId === 'brain_o_0001' && p.trace.requestId === p.idempotencyKey);
  check('100b) y cada paso es una operación distinta: dos pasos del mismo trabajo no comparten `requestId`',
    new Set(d.dispatch.map((x) => x.trace.requestId)).size === d.dispatch.length, d.dispatch.map((x) => x.trace.requestId).join(' | '));
  check('101) el tope viaja para que lo aplique quien cobre, sin aplicarlo aquí',
    p.budget.maxCredits === 100 && p.budget.prefer === 'quality' && !/maxCredits\s*[<>]|excede|cobrar|descontar/i.test(codigoCore));
  check('102) no se crean carteras: ni por app, ni por Workplace, ni por nadie', !/wallet|cartera|\bbalance\b|createWallet|saldo/i.test(codigoCore + codigoComp));
  /* Un mismo saldo visto desde dos productos: aquí solo se comprueba que el contexto no se separe. */
  const desdeOtro = o.avanzar({ contract: '1.0', principal: { userId: 'user-0001', appId: 'wee-travel' }, run: prepared.iniciar(trace).run, at: 10 });
  check('103) la cuenta que se atribuye es la misma se mire desde donde se mire', desdeOtro.dispatch[0].trace.userId === p.trace.userId);
}

console.log('\n── M · Experiencias avanzadas: preparado, no implementado ──');
{
  /* Un objetivo largo con varias capacidades, material encadenado y una autorización por el medio. */
  const largo = montar({ id: 'wf_largo_0001', contract: '1.1', goal: 'organiza el lanzamiento entero', workplace: 'business', steps: [
    { id: 'buscar', capability: 'text.search', purpose: 'Averiguar cómo está el mercado' },
    { id: 'redactar', capability: 'text.generate', purpose: 'Redactar', dependsOn: ['buscar'] },
    { id: 'imagen', capability: 'image.generate', purpose: 'Una imagen', dependsOn: ['redactar'], onFailure: 'continue' },
    { id: 'publicar', capability: 'text.structure', purpose: 'Dejarlo listo', dependsOn: ['redactar'], requiresApproval: true },
  ] });
  const o = largo.orchestrator;
  let run = largo.prepared.iniciar(trace).run;
  const pasos = [];
  let d = o.avanzar(pet(run, 1));
  pasos.push(...d.dispatch.map((x) => x.stepId));
  run = seguir(o, d.run, [{ stepId: 'buscar', kind: 'succeeded', at: 2, outputRefs: ['datos'] }]);
  d = o.avanzar(pet(run, 3));
  pasos.push(...d.dispatch.map((x) => x.stepId));
  run = seguir(o, d.run, [{ stepId: 'redactar', kind: 'succeeded', at: 4, outputRefs: ['texto'], actual: { provider: { lines: [], usd: 0.01 }, latencyMs: 200, creditsCharged: 2 } }]);
  d = o.avanzar(pet(run, 5));
  pasos.push(...d.dispatch.map((x) => x.stepId));
  check('104) una tarea larga avanza sola de paso en paso, sin que nadie redefina el grafo', pasos.join() === 'buscar,redactar,imagen', pasos.join());
  check('105) el material se encadena: lo que produjo un paso llega al siguiente', d.dispatch[0].upstream[0].outputRefs.join() === 'texto');
  check('106) y por el camino pide autorización para lo que la necesita', d.approvals.map((x) => x.stepId).join() === 'publicar' && d.run.state === 'awaiting_approval');
  check('107) el uso queda anotado paso a paso, listo para atribuir', d.run.steps[1].actual.creditsCharged === 2);
  check('108) la ejecución se puede guardar a medias y retomarla: es un dato plano', JSON.stringify(JSON.parse(JSON.stringify(d.run))) === JSON.stringify(d.run) && !JSON.stringify(d.run).includes('undefined'));
  const retomada = o.avanzar(pet(JSON.parse(JSON.stringify(d.run)), 6));
  check('109) y al retomarla desde su copia, el coordinador sigue donde estaba', retomada.status === 'waiting' && retomada.waiting.awaitingApproval.join() === 'publicar');
  check('110) sin que exista ninguna experiencia avanzada concreta: ni Autopilot, ni Agent, ni Copilot, ni Producer, ni Companion',
    !/autopilot|copilot|\bagent\b|producer|companion|assistant/i.test(codigoCore + codigoComp));
  check('111) ni herramientas concretas: una herramienta futura será una capacidad más',
    !/\btool\b|tools\b|integration|plugin|connector|webhook/i.test(codigoCore + codigoComp) && /CoreCapabilityId/.test(leer(CORE_ORQ)));
  /* Un paso no tiene por qué ser una generación: cualquier capacidad del catálogo sirve. */
  const variado = montar({ id: 'wf_var_0001', contract: '1.1', goal: 'g', steps: [
    { id: 'traducir', capability: 'translation.text', purpose: 'Traducir' },
    { id: 'analizar', capability: 'text.analyze', purpose: 'Analizar', dependsOn: ['traducir'] },
  ] });
  check('112) y un paso puede ser cualquier capacidad —traducir, analizar—, no solo generar',
    variado.orchestrator.avanzar(pet(variado.prepared.iniciar(trace).run, 1)).dispatch[0].capability === 'translation.text');
}

console.log('\n── N · Sin estado, determinista y concurrente ──');
{
  const a = montar(); const b = montar();
  const runA = a.prepared.iniciar(trace).run;
  const runB = b.prepared.iniciar(trace).run;
  const dA = a.orchestrator.avanzar(pet(runA, 10));
  const dB = b.orchestrator.avanzar(pet(runB, 10));
  check('113) dos coordinadores distintos dan exactamente lo mismo', JSON.stringify(dA) === JSON.stringify(dB));
  check('114) y repetir la misma llamada también: es una función pura', JSON.stringify(a.orchestrator.avanzar(pet(runA, 10))) === JSON.stringify(dA));
  check('115) mirar no cambia nada', JSON.stringify(a.orchestrator.estado(pet(runA, 10)).run) === JSON.stringify(runA) && a.orchestrator.estado(pet(runA, 10)).dispatch.length === 0);
  check('116) la ejecución que entró no se toca al avanzar', runA.steps.every((s) => s.state === 'pending') && dA.run !== runA);
  /*
   * DOS COORDINADORES A LA VEZ. Con la MISMA instantánea sale lo mismo —es una
   * función pura, no un candado—, y por eso la clave de idempotencia coincide:
   * quien ejecute reconoce el duplicado. Con la instantánea ya avanzada, el
   * segundo no encuentra nada listo. Persistir solo una de las dos es del Job
   * Engine (Fase 8), y ahí está la costura.
   */
  check('117) con la misma instantánea, los dos producen la MISMA clave de idempotencia',
    dA.dispatch.map((x) => x.idempotencyKey).join() === dB.dispatch.map((x) => x.idempotencyKey).join() && dA.dispatch[0].idempotencyKey === core.claveDePaso(runA.id, 'imagen', 1));
  check('118) y sobre la instantánea ya avanzada, el segundo no despacha nada',
    a.orchestrator.avanzar(pet(dA.run, 11)).dispatch.length === 0 && a.orchestrator.avanzar(pet(dA.run, 11)).status === 'waiting');
  check('119) los tiempos son los que trajo quien llamó, nunca del reloj', dA.run.startedAt === 10 && dA.run.steps[0].startedAt === 10);
  check('120) una ejecución de otro workflow se rechaza', a.orchestrator.avanzar(pet({ ...runA, workflowId: 'wf_otro_0001' }, 10)).error.details.reason === 'inconsistent');
  check('121) mil pasos se coordinan en un tiempo razonable', (() => {
    const steps = Array.from({ length: 1000 }, (_, i) => ({ id: `p${i}`, capability: 'text.generate', purpose: `p${i}` }));
    const m = montar({ id: 'wf_mil_0001', contract: '1.1', goal: 'g', steps });
    const t0 = performance.now();
    const d = m.orchestrator.avanzar(pet(m.prepared.iniciar(trace).run, 1));
    return d.dispatch.length === 256 && d.warnings.includes('dispatch_capped') && performance.now() - t0 < 5000;
  })(), 'con tope propio de 256 a la vez');
}

console.log('\n── O · Seguridad ──');
{
  const { prepared, orchestrator: o } = montar();
  const run = prepared.iniciar(trace).run;
  const proto = (json) => JSON.parse(json);
  check('122) una petición con `__proto__` se rechaza y no toca Object.prototype',
    o.avanzar({ ...pet(run, 10), ...proto('{"__proto__":{"colado":1}}') }).status === 'invalid' && ({}).colado === undefined);
  check('123) una clave de más en la petición se rechaza', o.avanzar({ ...pet(run, 10), providerId: 'x' }).error.details.reason === 'implementation_not_allowed' || o.avanzar({ ...pet(run, 10), providerId: 'x' }).status === 'invalid');
  check('124) un contrato incompatible se rechaza', o.avanzar({ ...pet(run, 10), contract: '2.0' }).error.details.reason === 'contract_incompatible');
  check('125) sin `at`, o con uno negativo, no se coordina', o.avanzar(pet(run, undefined)).status === 'invalid' && o.avanzar(pet(run, -1)).status === 'invalid');
  check('126) un `run` que no es un objeto se rechaza sin reventar', ['hola', null, 42, []].every((r) => o.avanzar(pet(r, 10)).status === 'invalid'));
  check('127) y una petición que no es un objeto, tampoco', ['hola', null, 42].every((r) => o.avanzar(r).status === 'invalid'));
  const d = o.avanzar(pet(run, 10));
  check('128) el paquete no lleva secretos, ni credenciales, ni texto crudo de nadie',
    !/apiKey|api_key|authorization|token|secret|password|credential/i.test(JSON.stringify(d.dispatch)));
  check('129) un error informado con secretos lo rechaza el lector del Workflow',
    o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'failed', at: 20, error: { code: 'PROVIDER_ERROR', source: 'g', details: { d: { apiKey: 'sk-x' } } } } })).status === 'invalid');
  check('130) el material que se informa se revisa: nada de rutas ni control', o.informar(pet(d.run, 20, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 20, outputRefs: ['x\n../etc'] } })).status === 'invalid');
  check('131) el `appId` del principal se revisa como una etiqueta, no como texto libre',
    o.avanzar({ contract: '1.0', principal: { userId: 'user-0001', appId: 'x'.repeat(200) }, run, at: 10 }).status === 'invalid'
    && o.avanzar({ contract: '1.0', principal: { userId: 'user-0001', appId: 'wee chef' }, run, at: 10 }).status === 'invalid');
  check('132) y nada de lo que sale se puede modificar', (() => {
    try { d.dispatch[0].capability = 'otra'; } catch { /* congelado */ }
    return d.dispatch[0].capability === 'image.generate';
  })());
}

console.log('\n── P · Lo que no se ha roto ──');
{
  check('133) el Workflow Engine de la Fase 5 sigue intacto: sus funciones y su contrato',
    /export const prepararWorkflow/.test(leer('functions/src/core/workflow.ts')) && core.WORKFLOW_CONTRACT_VERSION === '1.1' && /export const pasosListos/.test(leer('functions/src/core/workflow.ts')));
  check('134) y el coordinador lo usa, no lo copia: entra como dependencia', /crearOrchestrator = \(prepared: PreparedWorkflow\)/.test(leer(CORE_ORQ)));
  /* Sin comentarios: el Planner DIBUJA la cadena de capas en su cabecera, y eso es documentación, no dependencia. */
  check('135) ni el Planner, ni Brain, ni el Gateway dependen del coordinador',
    ['planner', 'brain', 'gateway'].every((f) => !/orchestrator/i.test(sinComentarios(leer(`functions/src/core/${f}.ts`)))));
  check('136) y la dependencia va en el sentido correcto: el coordinador importa del Workflow, no al revés',
    /from '\.\/workflow'/.test(leer(CORE_ORQ)) && !/from '\.\/orchestrator'/.test(leer('functions/src/core/workflow.ts')));
  check('137) `appId` de la Fase 5 sigue en el hilo y llega', core.leerTraza({ trace }).appId === 'wee-chef');
  /* 68 y world.generate, la única que se añadió después (misión fal, 2026-10-05). */
  check('138) el catálogo sigue teniendo las mismas capacidades, más world.generate', core.CAPABILITY_CATALOG.length === 69 && core.CAPABILITY_CATALOG.some((c) => c.id === 'world.generate'));
  check('139) el contrato del coordinador está declarado y es compatible consigo mismo',
    core.ORCHESTRATOR_CONTRACT_VERSION === '1.0' && core.contratoCompatible('1.0', core.ORCHESTRATOR_CONTRACT_VERSION));
  check('140) el `while` de Weë Creator sigue donde estaba: ninguna ruta de producción pasa por aquí',
    /while \(done\.size < steps\.length\)/.test(leer('functions/src/creator/index.ts')) && !/crearOrchestrator|orquestadorDeWee/.test(leer('functions/src/creator/index.ts')));
  check('141) esta suite no llama a ninguna API real', !/https?:\/\/(?!ejemplo\.invalido)/.test(leer('functions/test/core-orchestrator.test.mjs')));
}

/*
 * ── Q · Lo que se encontró probando ─────────────────────────────────────────
 *
 * Tres defectos que existieron de verdad y se reprodujeron ejecutando el
 * coordinador. Escritos por el efecto observable, para que sigan valiendo si
 * el código se reescribe.
 */
console.log('\n── Q · Lo que se encontró probando ──');
{
  /* Una decisión sin estado es una decisión que nadie puede leer. */
  const soloAprobacion = montar({ id: 'wf_q_ap_0001', contract: '1.1', goal: 'g', steps: [
    { id: 'a', capability: 'text.generate', purpose: 'a', requiresApproval: true },
  ] });
  const d = soloAprobacion.orchestrator.avanzar(pet(soloAprobacion.prepared.iniciar(trace).run, 1));
  const ESTADOS = ['dispatch', 'waiting', 'paused', 'finished', 'invalid'];
  check('142) cuando solo hay aprobaciones, la decisión tiene estado: `waiting`, no un hueco',
    d.status === 'waiting' && d.approvals.length === 1 && d.dispatch.length === 0, `status=${JSON.stringify(d.status)}`);
  /* Y en todos los caminos, siempre uno del vocabulario. */
  const { prepared, orchestrator: o } = montar();
  const run = prepared.iniciar(trace).run;
  const d1 = o.avanzar(pet(run, 10));
  const caida = o.informar(pet(d1.run, 20, { outcome: { stepId: 'imagen', kind: 'failed', at: 20, error: fallo } }));
  const todas = [d, d1, caida, o.estado(pet(run, 10)), o.avanzar(pet(caida.run, 21)), o.avanzar(pet(prepared.pausar(d1.run).run, 21)), o.avanzar(pet('no-soy-un-run', 1))];
  check('143) ninguna decisión sale nunca sin estado, por ningún camino',
    todas.every((x) => ESTADOS.includes(x.status)), JSON.stringify(todas.map((x) => x.status)));

  /*
   * Sin hilo no se puede armar el paquete de un paso. Antes el coordinador lo
   * marcaba como empezado igualmente y no se lo entregaba a nadie: trabajo
   * perdido en silencio, que es peor que un error.
   */
  const sinTraza = { ...run };
  delete sinTraza.trace;
  const r = o.avanzar(pet(sinTraza, 10));
  check('144) una ejecución sin hilo se rechaza ANTES de marcar nada', r.status === 'invalid' && r.error.details.field === 'run.trace', JSON.stringify(r.error?.details));
  check('145) y no queda ningún paso empezado al que nadie vaya a ejecutar', sinTraza.steps.every((s) => s.state === 'pending'));
  check('146) lo mismo al informar y al mirar', o.informar(pet(sinTraza, 10, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 10 } })).status === 'invalid' && o.estado(pet(sinTraza, 10)).status === 'invalid');

  /* Buscar linealmente en cada consulta crecía con el cuadrado del workflow. */
  check('147) la posición de cada paso se indexa una vez, en vez de buscarla en cada consulta',
    /new Map\(workflow\.steps\.map/.test(codigoCore) && !/workflow\.steps\.find\(/.test(codigoCore));
  check('148) y una cadena larga se coordina en un tiempo razonable', (() => {
    const n = 500;
    const steps = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, capability: 'text.generate', purpose: `p${i}`, ...(i ? { dependsOn: [`p${i - 1}`] } : {}) }));
    const m = montar({ id: 'wf_q_cadena_0001', contract: '1.1', goal: 'g', steps });
    let actual = m.prepared.iniciar(trace).run;
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) {
      const paso = m.orchestrator.avanzar(pet(actual, i));
      if (!paso.dispatch.length) break;
      actual = m.orchestrator.informar(pet(paso.run, i, { outcome: { stepId: paso.dispatch[0].stepId, kind: 'succeeded', at: i, outputRefs: [`a${i}`] } })).run;
    }
    return performance.now() - t0 < 4000;
  })(), '500 pasos encadenados, 200 ciclos de avanzar e informar');
}

/*
 * ── R · Lo que encontró la auditoría ────────────────────────────────────────
 *
 * Dieciocho defectos que existieron de verdad y se reprodujeron ejecutando el
 * coordinador. Escritos por el efecto observable, para que sigan valiendo si
 * el código se reescribe.
 */
console.log('\n── R · Lo que encontró la auditoría ──');
{
  const { prepared, orchestrator: o } = montar();
  const run = prepared.iniciar(trace).run;

  /* Una capa pura y síncrona no puede lanzar excepciones: quien llama espera una respuesta. */
  const malos = [['steps ausente', { ...run, steps: undefined }], ['steps texto', { ...run, steps: 'hola' }], ['steps número', { ...run, steps: 42 }], ['steps objeto', { ...run, steps: {} }], ['steps con basura dentro', { ...run, steps: ['x'] }]];
  check('149) una ejecución con los pasos mal formados se rechaza, no revienta', malos.every(([, r]) => {
    try { return o.avanzar(pet(r, 1)).status === 'invalid' && o.estado(pet(r, 1)).status === 'invalid' && o.informar(pet(r, 1, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 1 } })).status === 'invalid'; } catch { return false; }
  }), malos.map(([n]) => n).join(', '));

  /* El hilo viajaba crudo hasta el paquete que baja al Router y al Gateway. */
  const sucio = { ...run, trace: JSON.parse('{"traceId":"t-0001","requestId":"r-0001","userId":"user-0001","__proto__":{"colado":1},"apiKey":"sk-secreto","stack":"C:/ruta"}') };
  const conSucio = o.avanzar(pet(sucio, 1));
  check('150) el hilo de la ejecución se lee con el lector del Core antes de usarlo: ni secretos ni rutas bajan al despacho',
    conSucio.status === 'invalid' || !/apiKey|stack|secreto|C:\//.test(JSON.stringify(conSucio.dispatch)), JSON.stringify(conSucio.dispatch?.[0]?.trace ?? conSucio.error?.details));
  check('151) y nada de eso toca a Object.prototype', ({}).colado === undefined);

  /*
   * `listos` y `cierre` del Workflow degradan en silencio cuando no reconocen
   * una ejecución. Leer esa no-respuesta como respuesta contestaba «tranquilo,
   * sigue en marcha» sobre algo que no puede avanzar nunca.
   */
  const repudiada = { ...run, steps: [{ stepId: 'no-existe', state: 'running', attempt: 1 }] };
  const d1 = o.avanzar(pet(repudiada, 1));
  check('152) una ejecución que el Workflow no reconoce se rechaza, en vez de contestarse como sana',
    d1.status === 'invalid' && d1.error.details.reason === 'inconsistent' && o.estado(pet(repudiada, 1)).status === 'invalid', `${d1.status} ${JSON.stringify(d1.error?.details)}`);
  check('153) y el discriminador no toca a ninguna ejecución legítima', [
    run, o.avanzar(pet(run, 1)).run, prepared.pausar(o.avanzar(pet(run, 1)).run).run, prepared.cancelar(run, 2).run,
    o.informar(pet(o.avanzar(pet(run, 1)).run, 2, { outcome: { stepId: 'imagen', kind: 'failed', at: 2, error: fallo } })).run,
  ].every((r) => o.estado(pet(r, 3)).status !== 'invalid'));
  check('154) lo que está en marcha sale del cierre del Workflow, no de contar pasos por cuenta propia',
    /cierre\.active/.test(codigoCore) && !/run\.steps\.filter\(\(r\) => r\.state === 'running'\)\s*\.map/.test(codigoCore));

  /* El del workflow manda por encima del paso: lo dice el contrato de la Fase 0. */
  const conTopes = montar(anuncio({ budget: { maxCredits: 50, prefer: 'cost', onExceed: 'degrade' } }, { imagen: { budget: { maxCredits: 500 } } }));
  const pt = conTopes.orchestrator.avanzar(pet(conTopes.prepared.iniciar(trace).run, 1)).dispatch[0];
  check('155) el tope del paso NO puede ampliar el del trabajo: baja el más restrictivo', pt.budget.maxCredits === 50, JSON.stringify(pt.budget));
  check('156) y lo que el trabajo prefiere sobrevive aunque el paso ponga su número', pt.budget.prefer === 'cost' && pt.budget.onExceed === 'degrade');

  /* Sustituir las pistas en bloque perdía en silencio lo que el workflow había dicho. */
  const conPistas = montar(anuncio({ hints: { durationSec: 30 } }, { imagen: { hints: { quality: 'high' } } }));
  const pp = conPistas.orchestrator.avanzar(pet(conPistas.prepared.iniciar(trace).run, 1)).dispatch[0];
  check('157) las pistas se juntan clave a clave: la del paso gana, la del trabajo no se pierde', pp.hints.quality === 'high' && pp.hints.durationSec === 30, JSON.stringify(pp.hints));

  /* Lo que la persona acotó es justo lo que baja hacia la ejecución. */
  const d2 = o.avanzar(pet(run, 1));
  check('158) lo que acota el resultado llega al despacho', d2.dispatch[0].constraints.tono === 'alegre' && d2.dispatch[0].constraints.duracion === 15, JSON.stringify(d2.dispatch[0].constraints));

  /* El material, en el orden del grafo y copiado. */
  const conOrden = montar(anuncio({}, { video: { dependsOn: ['voz', 'imagen'] } }));
  let ro = conOrden.orchestrator.avanzar(pet(conOrden.prepared.iniciar(trace).run, 1)).run;
  ro = conOrden.orchestrator.informar(pet(ro, 2, { outcome: { stepId: 'imagen', kind: 'succeeded', at: 2, outputRefs: ['ri'] } })).run;
  ro = conOrden.orchestrator.informar(pet(ro, 3, { outcome: { stepId: 'voz', kind: 'succeeded', at: 3, outputRefs: ['rv'] } })).run;
  const pv = conOrden.orchestrator.avanzar(pet(ro, 4)).dispatch[0];
  check('159) el material llega en el orden del GRAFO, no en el que se escribió `dependsOn`',
    pv.upstream.map((u) => u.stepId).join() === 'imagen,voz', `dependsOn=['voz','imagen'] → ${pv.upstream.map((u) => u.stepId).join()}`);
  check('160) y copiado: el despacho no comparte lista con la ejecución',
    pv.upstream[0].outputRefs !== ro.steps.find((s) => s.stepId === 'imagen').outputRefs && Object.isFrozen(pv.upstream[0].outputRefs));

  /* El tope cuenta lo que vuela, no el tamaño del lote. */
  const diez = montar({ id: 'wf_r_diez_0001', contract: '1.1', goal: 'g', steps: Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, capability: 'text.generate', purpose: `p${i}` })) });
  let rd = diez.prepared.iniciar(trace).run;
  for (let i = 0; i < 5; i++) rd = diez.orchestrator.avanzar(pet(rd, i, { maxConcurrent: 2 })).run;
  check('161) el tope acota lo que hay CORRIENDO, no el lote: cinco llamadas no ponen diez en vuelo',
    rd.steps.filter((s) => s.state === 'running').length === 2, `corriendo=${rd.steps.filter((s) => s.state === 'running').length}`);
  check('162) y al terminar uno, entra el siguiente', (() => {
    const tras = diez.orchestrator.informar(pet(rd, 9, { outcome: { stepId: 'p0', kind: 'succeeded', at: 9 } })).run;
    return diez.orchestrator.avanzar(pet(tras, 10, { maxConcurrent: 2 })).dispatch.length === 1;
  })());

  /* La clave de idempotencia: inyectiva y con la forma que el Credit Engine exige. */
  check('163) la clave no puede chocar: los dos puntos son legales dentro de un id, así que la longitud va delante',
    core.claveDePaso('run:a', 'b', 1) !== core.claveDePaso('run', 'a:b', 1), `"${core.claveDePaso('run:a', 'b', 1)}" vs "${core.claveDePaso('run', 'a:b', 1)}"`);
  check('164) y tiene la forma de un `requestId`, porque eso es lo que va a ser', core.FORMA_DE_ID.test(d2.dispatch[0].idempotencyKey));
  const idLargo = 'p'.repeat(158);
  const largo = montar({ id: 'wf_r_largo_0001', contract: '1.1', goal: 'g', steps: [{ id: idLargo, capability: 'text.generate', purpose: 'a' }] });
  const runLargo = largo.prepared.iniciar({ ...trace, traceId: 'r'.repeat(150), requestId: 'r'.repeat(150) }).run;
  const dl = largo.orchestrator.avanzar(pet(runLargo, 1));
  check('165) una ejecución cuyos ids darían una clave que no cabe se rechaza ANTES de marcar nada',
    dl.status === 'invalid' && dl.error.details.reason === 'id_too_long' && runLargo.steps[0].state === 'pending', JSON.stringify(dl.error?.details));

  /* Retomar: lo que quedó en vuelo se recupera con su paquete. */
  const enVuelo = o.avanzar(pet(run, 1));
  const guardado = JSON.parse(JSON.stringify(enVuelo.run));
  const retomado = o.estado(pet(guardado, 2));
  check('166) tras un reinicio, lo que quedó en vuelo se recupera con su paquete entero',
    retomado.inFlight.map((x) => x.stepId).sort().join() === enVuelo.dispatch.map((x) => x.stepId).sort().join(), `inFlight=${retomado.inFlight.map((x) => x.stepId).join()}`);
  check('167) y con la MISMA clave: quien ejecute sabe que es el mismo trabajo, no uno nuevo',
    retomado.inFlight.map((x) => x.idempotencyKey).sort().join() === enVuelo.dispatch.map((x) => x.idempotencyKey).sort().join());

  /* Cancelar, pausar y reanudar, con el dueño comprobado. */
  const ajeno = { contract: '1.0', principal: { userId: 'otra-persona-0001' }, run: enVuelo.run, at: 3 };
  check('168) cancelar, pausar y reanudar la ejecución de otra persona se rechaza',
    [o.cancelar(ajeno), o.pausar(ajeno), o.reanudar(ajeno)].every((r) => r.error.code === 'AUTH_ERROR'));
  check('169) su dueño sí puede, y lo pendiente se cancela con su causa', (() => {
    const c = o.cancelar(pet(run, 3));
    return c.status === 'finished' && c.run.state === 'cancelled' && c.run.steps.every((s) => s.cause?.reason === 'workflow_cancelled');
  })());
  check('170) y cancelar un paso que no existe se rechaza', o.cancelar({ ...pet(run, 3), stepId: 'fantasma' }).error.details.reason === 'unknown_step');
  check('171) pausar y reanudar pasan por el Workflow, sin una segunda política',
    o.pausar(pet(enVuelo.run, 3)).status === 'paused' && /prepared\.pausar|prepared\.reanudar|prepared\.cancelar/.test(codigoCore));

  /* Una decisión sin ejecución no puede decir que la tiene. */
  const roto = o.avanzar({ contract: '1.0', principal, run: 'no-soy-un-run', at: 1 });
  check('172) una decisión que no pudo leer la petición no devuelve una ejecución inventada', roto.status === 'invalid' && roto.run === undefined, JSON.stringify(roto.run));

  /* La propagación se informa entera. */
  const caida = o.informar(pet(enVuelo.run, 4, { outcome: { stepId: 'imagen', kind: 'failed', at: 4, error: fallo } }));
  const propagada = caida.applied.find((x) => x.propagated);
  check('173) lo aplicado lleva su instante y su causa: la propagación se explica, no solo se anuncia',
    propagada && propagada.at === 4 && propagada.cause?.stepId === 'imagen', JSON.stringify(propagada));

  /* Y la comprobación de identidad se hace sobre UNA lectura, no releyendo. */
  check('174) el hilo se lee una vez y se usa esa lectura, sin releer el objeto de entrada',
    (codigoCore.match(/leerTraza\(/g) || []).length === 1 && !/run\.trace\./.test(codigoCore));
  check('175) y quién pide se comprueba ANTES de contar nada de la ejecución',
    codigoCore.indexOf("'not_owner'") < codigoCore.indexOf("'inconsistent'"), 'el orden de las comprobaciones en `leer`');
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
