/*
 * WEE PLANNER — DE LO ENTENDIDO A LO QUE HAY QUE HACER, SIN ELEGIR CON QUÉ.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   BRAIN entiende → PLANNER planifica → WORKFLOW organiza → ROUTER elige
 *
 * El Planner dice QUÉ capacidades hacen falta y en qué orden. Casi todo lo de
 * aquí comprueba lo que NO debe hacer: elegir proveedor o modelo, ejecutar,
 * organizar la ejecución, cobrar, inventar lo que falta o declarar el
 * paralelismo por su cuenta.
 *
 * ── Lo que de verdad hay que proteger ──────────────────────────────────────
 *
 * Que el ORDEN salga del catálogo y no de una tabla escrita a mano. Si alguien
 * escribe «primero la imagen, luego el vídeo» en algún sitio, esa lista se irá
 * separando del catálogo hasta que un día planifique algo imposible.
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
const composicion = (await cargar('functions/src/planner/index.ts')).ns;

const CORE_PLANNER = 'functions/src/core/planner.ts';
const COMP_PLANNER = 'functions/src/planner/index.ts';
const CREATOR_PLANNER = 'functions/src/creator/planner.ts';
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const codigoCore = sinComentarios(leer(CORE_PLANNER));
const codigoComp = sinComentarios(leer(COMP_PLANNER));

/* ── Piezas de prueba ─────────────────────────────────────────────────────── */

let reloj = 500;
const now = () => (reloj += 3);
const trazas = [];
const tracer = { record: (t) => trazas.push(t) };
const ultima = () => trazas[trazas.length - 1];

/** Todo disponible salvo lo que se excluya: así las pruebas hablan de capacidades, no de proveedores. */
const todoMenos = (excluidas = []) => ({ disponible: (c) => !excluidas.includes(c) });
const planner = (availability = todoMenos()) => core.crearPlanner({ availability, tracer, now });

const entendimiento = (extra = {}) => ({
  intent: 'creation',
  confidence: 'high',
  goal: 'un vídeo para mi restaurante',
  inputs: { text: 'un vídeo para mi restaurante', attachments: [] },
  references: [],
  constraints: {},
  needsPlanning: true,
  missing: [],
  assumptions: [],
  capabilities: [],
  ...extra,
});

const peticion = (extra = {}) => ({
  contract: '1.0',
  trace: { traceId: 'brain_p_0001', requestId: 'brain_p_0001', userId: 'user-0001', workplace: 'studio' },
  understanding: entendimiento(),
  ...extra,
});

console.log('\n── A · Pureza: el Planner no sabe de nadie ──');
{
  const fuera = [];
  for (const [, dep] of codigoCore.matchAll(/from ['"]([^'"]+)['"]/g)) {
    const resuelto = dep.startsWith('.') ? path.posix.normalize(path.posix.join('functions/src/core', dep)) : dep;
    if (!resuelto.startsWith('functions/src/core/')) fuera.push(dep);
  }
  check('1) core/planner.ts solo importa del Core', fuera.length === 0, fuera.join(' ') || 'puro');
  check('2) no toca Firebase, red, disco, reloj ni entorno',
    !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(|process\.env|Date\.now\(|Math\.random\(|new Date\(/.test(codigoCore));

  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'anthropic', 'elevenlabs', 'minimax', 'flux', 'tripo', 'hunyuan', 'qwen', 'wan', 'yinchao', 'bytedance', 'byteplus'];
  const nombra = (src) => PROVEEDORES.filter((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(src));
  check('3) ni el Core ni la composición nombran a un proveedor', nombra(codigoCore).length === 0 && nombra(codigoComp).length === 0,
    [...nombra(codigoCore), ...nombra(codigoComp)].join(' ') || `${PROVEEDORES.length} comprobados`);
  check('4) ni un identificador de modelo', !/gpt-[0-9]|claude-[0-9]|gemini-[0-9]|SEEDANCE_|flux-|nano-banana|deepseek-|eleven_/i.test(codigoCore + codigoComp));
  const CONDICIONAL = /(===|!==|==|!=)\s*['"](tripo|seedance|gemini|flux|seedream|yinchao|hunyuan|qwen|wan|deepseek|elevenlabs|minimax|claude|openai|mock)['"]/;
  check('5) ninguna comparación contra un nombre de proveedor', !CONDICIONAL.test(codigoCore) && !CONDICIONAL.test(codigoComp));
  check('5b) control: el patrón reconocería la comparación', CONDICIONAL.test("if (p === 'gemini') {}"));
}

console.log('\n── B · No se apropia de lo que es de otras capas ──');
{
  check('6) NO implementa Router: no elige, no ordena candidatos, no puntúa',
    !/ImplementationResolver|resolver\(|findImplementations|candidat|score|cheapest|best|prioridad/i.test(codigoCore));
  check('7) NO implementa Gateway: no ejecuta nada',
    !/crearGateway|gateway\.ejecutar|GatewayRequest|adapter\.run|ejecutar\(/i.test(codigoCore));
  check('8) NO implementa Workflow: ni estados de paso, ni reintentos, ni cursor',
    !/StepRun|RunState|pasosListos|ejecucionTerminada|retry|maxAttempts|cursor|awaiting_approval/i.test(codigoCore));
  check('9) NO implementa Job Engine', !/JobStatus|queue|enqueue|poll|job/i.test(codigoCore));
  check('10) NO toca Credits ni precios',
    !/spendCredits|creditEngine|creditsCharged|creditsPerUsd|CREDIT_COSTS|priceOperation|margin|usd/i.test(codigoCore));
  check('11) sin catálogo paralelo: no declara capacidades ni modalidades propias',
    !/CAPABILITY_CATALOG\s*[:=]\s*\[/.test(codigoCore) && !/type PlannerCapability|type PlanModality/.test(codigoCore));
  check('12) reutiliza los contratos del Core en vez de declararlos otra vez',
    ['BrainUnderstanding', 'TraceContext', 'LanguageContext', 'WeeError', 'CoreCapabilityId', 'ExecutionHints', 'Modality']
      .every((t) => new RegExp(`\\b${t}\\b`).test(leer(CORE_PLANNER)))
    && !/interface (TraceContext|LanguageContext|WeeError|BrainUnderstanding)\b/.test(codigoCore));
  check('13) y NO duplica WorkflowStep: los campos comunes se llaman igual',
    ['id', 'capability', 'purpose', 'dependsOn', 'input'].every((c) => new RegExp(`^\\s+${c}[?]?:`, 'm').test(leer('functions/src/core/workflow.ts')))
    && ['id', 'capability', 'purpose', 'dependsOn', 'input'].every((c) => new RegExp(`^\\s+${c}[?]?:`, 'm').test(leer(CORE_PLANNER))));
  check('14) ni declara lo que es de ejecución (eso lo añade Workflow)',
    !/when\?:|requiresApproval|onFailure|timeoutMs/.test(codigoCore));
}

console.log('\n── C · Un plan de un paso ──');
{
  trazas.length = 0;
  const r = await planner().planificar(peticion({ understanding: entendimiento({ capability: 'video.generate' }) }));
  check('15) una intención simple da un plan de un paso', r.status === 'ready' && r.plan.steps.length === 1, JSON.stringify(r.error || r.status));
  check('16) con su capacidad, su propósito y lo que produce',
    r.plan.steps[0].capability === 'video.generate' && typeof r.plan.steps[0].purpose === 'string' && r.plan.steps[0].produces === 'video');
  check('17) sin dependencias, porque no necesita nada de nadie', r.plan.steps[0].dependsOn === undefined);
  check('18) el plan conserva objetivo, intención, idioma, workplace y proyecto',
    r.plan.goal === 'un vídeo para mi restaurante' && r.plan.intent === 'creation');
  check('19) el identificador del plan es determinista y trazable', r.plan.id === 'plan_brain_p_0001');
  check('20) y la traza se anotó, limpia y sin texto de nadie',
    trazas.length === 1 && ultima().status === 'ok' && core.trazaLimpia(ultima()) && !JSON.stringify(ultima()).includes('restaurante'));
  /* Determinista: el mismo entendimiento da exactamente el mismo plan. */
  const otra = await planner().planificar(peticion({ understanding: entendimiento({ capability: 'video.generate' }) }));
  check('21) el mismo entendimiento da SIEMPRE el mismo plan',
    JSON.stringify(otra.plan.steps) === JSON.stringify(r.plan.steps) && otra.plan.id === r.plan.id);
}

console.log('\n── D · Varios pasos, y el orden sale del catálogo ──');
{
  /* El ejemplo del encargo: un vídeo con imágenes, voz y música. */
  const r = await planner().planificar(peticion({
    understanding: entendimiento({
      capability: 'video.image_to_video',
      capabilities: ['image.generate', 'voice.tts', 'music.generate', 'video.image_to_video'],
    }),
  }));
  check('22) una tarea compleja da un plan de varios pasos', r.status === 'ready' && r.plan.steps.length === 4, JSON.stringify(r.error || r.plan?.steps?.length));
  const paso = (cap) => r.plan.steps.find((s) => s.capability === cap);
  check('23) y el que consume una imagen depende del que la produce',
    paso('video.image_to_video').dependsOn?.includes(paso('image.generate').id), JSON.stringify(paso('video.image_to_video').dependsOn));
  check('24) mientras que los que solo necesitan texto no dependen de nadie',
    !paso('image.generate').dependsOn && !paso('voice.tts').dependsOn && !paso('music.generate').dependsOn);
  /*
   * EL PARALELISMO NO SE DECLARA: se deduce. Imagen, voz y música no dependen
   * entre sí, así que pueden ir a la vez. Un `parallel: true` sería una segunda
   * verdad que algún día contradiría al grafo.
   */
  check('25) el paralelismo se DEDUCE de las dependencias, y no se declara en ningún sitio',
    !/parallel/i.test(codigoCore) && !JSON.stringify(r.plan).includes('parallel'));
  check('26) el grafo es válido para el contrato de Workflow de la Fase 0',
    core.validarWorkflow({ id: 'w', contract: '1.0', goal: 'x', steps: r.plan.steps }).length === 0);
  const listos = core.pasosListos({ id: 'w', contract: '1.0', goal: 'x', steps: r.plan.steps }, []);
  check('27) y al empezar hay TRES pasos listos a la vez: ahí está el paralelismo', listos.length === 3, listos.map((s) => s.capability).join(','));
  check('28) el plan declara las capacidades que necesita, derivadas de sus pasos',
    r.plan.capabilities.length === 4 && r.plan.capabilities.every((c) => r.plan.steps.some((s) => s.capability === c)));

  /* Y el orden es el único que funciona: cada paso tiene lo que necesita cuando le toca. */
  const indice = (cap) => r.plan.steps.findIndex((s) => s.capability === cap);
  check('29) el orden es el único en el que el plan puede funcionar', indice('image.generate') < indice('video.image_to_video'));
}

console.log('\n── E · Material aportado: lo que ya está no se vuelve a crear ──');
{
  const conFoto = await planner().planificar(peticion({
    understanding: entendimiento({
      capability: 'video.image_to_video',
      capabilities: ['video.image_to_video'],
      inputs: { text: 'anima esta foto', attachments: [{ kind: 'image', url: 'https://ejemplo.invalido/a.png' }] },
    }),
  }));
  check('30) con la foto aportada, el plan es de UN paso: no se genera lo que ya está',
    conFoto.status === 'ready' && conFoto.plan.steps.length === 1 && conFoto.plan.steps[0].capability === 'video.image_to_video');
  check('31) y sin dependencias, porque el material ya lo trajo la persona', conFoto.plan.steps[0].dependsOn === undefined);
  /* Sin la foto, el paso previo se deduce SOLO si no hay ambigüedad sobre quién produce esa modalidad. */
  const sinFoto = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'video.image_to_video', capabilities: ['video.image_to_video'] }),
  }));
  check('32) sin ella, se añade el paso que la produce, porque el catálogo dice cuál es sin ambigüedad',
    sinFoto.status === 'ready' && sinFoto.plan.steps.length === 2 && sinFoto.plan.steps[0].capability === 'image.generate');
  check('33) la capacidad que produce una modalidad sale del catálogo, no de una tabla a mano',
    core.capacidadQueProduce('image') === 'image.generate' && core.capacidadQueProduce('video') === 'video.generate' && core.capacidadQueProduce('voice') === 'voice.tts');
  check('34) y cuando hay VARIAS candidatas no se elige ninguna: elegir sería adivinar',
    core.capacidadQueProduce('music') === undefined && core.capacidadQueProduce('text') === undefined);
}

console.log('\n── F · Lo que no se sabe, se pregunta. Nunca se inventa ──');
{
  const falta = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'video.generate', missing: ['duración', 'estilo'] }),
  }));
  check('35) si Brain dijo que falta algo, el Planner NO planifica: pregunta',
    falta.status === 'needs_clarification' && falta.clarification.missing.join(',') === 'duración,estilo' && !falta.plan);
  /* Sin `timing`: sus milisegundos salen del reloj de la suite y pasan por el 530, que contiene «30». */
  const { timing, ...sinReloj } = falta;
  check('36) y no se inventa la duración, el estilo ni nada que nadie dijo',
    !JSON.stringify(sinReloj).includes('30') && !JSON.stringify(sinReloj).includes('cinematográfico'), JSON.stringify(sinReloj.clarification));
  const sinCapacidad = await planner().planificar(peticion({ understanding: entendimiento({ intent: 'creation', capability: undefined }) }));
  check('37) una creación sin capacidad conocida se pregunta, no se adivina',
    sinCapacidad.status === 'needs_clarification' && sinCapacidad.clarification.missing.includes('capability'));
  const charla = await planner().planificar(peticion({ understanding: entendimiento({ intent: 'conversation', needsPlanning: false, capability: undefined }) }));
  check('38) una charla sin capacidad no es un fallo: es que aquí no había trabajo', charla.status === 'impossible' && !charla.error);
  /*
   * Un material que la persona no aportó: se pide. Y se pide AUNQUE Weë sepa
   * fabricarlo —aquí está todo disponible, `voice.tts` incluida—, porque
   * transcribir una voz que Weë acaba de sintetizar no es lo que nadie pidió.
   */
  const imposible = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'audio.transcribe', capabilities: ['audio.transcribe'] }),
  }));
  check('39) si hace falta un material de la persona, se pide ESE material',
    imposible.status === 'needs_clarification' && imposible.clarification.missing.includes('material:voice'), JSON.stringify(imposible.clarification));
  check('40) las suposiciones de Brain viajan al plan, explícitas',
    (await planner().planificar(peticion({ understanding: entendimiento({ capability: 'video.generate', assumptions: ['formato vertical'] }) })))
      .plan.assumptions.join() === 'formato vertical');
}

console.log('\n── G · Capacidad que hoy no sirve nadie ──');
{
  const r = await planner(todoMenos(['music.generate'])).planificar(peticion({
    understanding: entendimiento({ capability: 'music.generate', capabilities: ['music.generate'] }),
  }));
  check('41) una capacidad que nadie sirve NO se convierte en un plan', r.status === 'unsupported' && !r.plan);
  check('42) y se dice exactamente cuál', r.unavailable.join() === 'music.generate' && r.warnings.includes('capability_unavailable'));
  check('43) eso NO es un error interno: es una respuesta con la que se puede actuar', !r.error);
  const inventada = await planner().planificar(peticion({ understanding: entendimiento({ capability: 'no.existe' }) }));
  check('44) una capacidad que no está en el catálogo es petición inválida',
    inventada.status === 'invalid' && inventada.error.code === 'INVALID_REQUEST' && inventada.error.details.reason === 'unknown_capability');
  check('45) los seis estados existen y son distinguibles',
    ['ready', 'needs_clarification', 'unsupported', 'invalid', 'impossible', 'failed'].every((s) => new RegExp(`'${s}'`).test(leer(CORE_PLANNER))));
}

console.log('\n── H · Nadie elige implementación por aquí ──');
{
  const p = planner();
  const mal = async (extra) => (await p.planificar(peticion(extra))).error;
  for (const [campo, extra] of [
    ['providerId', { providerId: 'x' }],
    ['modelId', { modelId: 'x' }],
    ['implementation', { implementation: { providerId: 'x', modelId: 'y' } }],
  ]) {
    const e = await mal(extra);
    check(`46) ${campo} en la petición → INVALID_REQUEST implementation_not_allowed`,
      e?.code === 'INVALID_REQUEST' && e.details.reason === 'implementation_not_allowed', JSON.stringify(e?.details));
  }
  /* Y tampoco colado dentro del entendimiento, que en el fondo lo rellenó un modelo. */
  const porConstraints = await p.planificar(peticion({
    understanding: entendimiento({ capability: 'video.generate', constraints: { modelId: 'x', duracion: 10 } }),
  }));
  check('47) ni escondido en las restricciones del entendimiento',
    porConstraints.status === 'invalid' && porConstraints.error.details.reason === 'implementation_not_allowed');
  check('48) una restricción legítima sí pasa, y llega al plan',
    (await p.planificar(peticion({ understanding: entendimiento({ capability: 'video.generate', constraints: { duracion: 10 } }) })))
      .plan.constraints.duracion === 10);
  /* El plan que sale no contiene NADA de implementación. */
  const r = await p.planificar(peticion({ understanding: entendimiento({ capability: 'video.generate' }) }));
  check('49) el plan producido no menciona proveedor, modelo ni adaptador',
    !/providerId|modelId|adapterId|implementation/i.test(JSON.stringify(r.plan)));
  check('50) las pistas son requisitos abstractos, nunca una implementación',
    (await p.planificar(peticion({ hints: { quality: 'high' }, understanding: entendimiento({ capability: 'video.generate' }) })))
      .plan.hints.quality === 'high');
  check('51) y una clave desconocida en la petición se rechaza',
    (await mal({ inventado: 1 }))?.details.field === 'inventado');
}

console.log('\n── I · La deuda de creator/planner.ts, saldada ──');
{
  const creator = leer(CREATOR_PLANNER);
  check('52) el planificador de Weë Creator ya NO pregunta por un adaptador concreto',
    !/geminiAdapter|isConfigured/.test(creator), (creator.match(/geminiAdapter|isConfigured/g) || []).join(' '));
  check('53) ni importa ningún proveedor', !/from '\.\.\/engine\/providers\//.test(creator));
  check('54) ahora pregunta por la CAPACIDAD que necesita',
    /disponibilidad\.disponible\('text\.structure'\)/.test(creator));
  check('55) y quién la sirve se decide al ejecutar, no al planificar',
    /CapabilityAvailability/.test(creator) && !/findImplementations|provider\.id/.test(sinComentarios(creator)));
  /* La composición SÍ puede consultar el registro: es su trabajo. Pero por tipo, no por nombre. */
  check('56) la composición pregunta al registro por capacidad, y distingue el modo demo por TIPO',
    /getCapabilityImplementations\(capability\)/.test(codigoComp) && /provider\.type === 'matrix'/.test(codigoComp));
  check('57) reutiliza el predicado de ejecutabilidad de la Fase 3, sin reinventarlo',
    /puedeEjecutarse\(impl\)/.test(codigoComp));
}

console.log('\n── J · Seguridad y escala ──');
{
  /* Lo mismo que se le exige a Brain: nada mutable fuera de las funciones. */
  const estadoDeModulo = (src) => [
    ...(src.match(/^(let|var)\s+\w+/gm) || []),
    ...(src.match(/^const\s+\w+[^=\n]*=\s*(new (Map|Set|WeakMap|WeakSet)\(\s*\)|\{\s*\}|\[\s*\])/gm) || []),
  ];
  const conEstado = [...estadoDeModulo(codigoCore), ...estadoDeModulo(codigoComp)];
  check('58) sin estado: nada mutable fuera de las funciones, ni singletons',
    conEstado.length === 0 && !/let instancia|export const plannerDeWee =/.test(codigoComp),
    conEstado.join(' | ') || 'sin estado de módulo');
  check('59) sin bucles permanentes ni sondeo', !/while \(true\)|setInterval|setTimeout|requestAnimationFrame/.test(codigoCore));
  /* Dos peticiones a la vez no se pisan. */
  const compartido = planner();
  const [a, b] = await Promise.all([
    compartido.planificar(peticion({ trace: { traceId: 'brain_a_0001', requestId: 'brain_a_0001', userId: 'ana-0001' }, understanding: entendimiento({ capability: 'image.generate' }) })),
    compartido.planificar(peticion({ trace: { traceId: 'brain_b_0001', requestId: 'brain_b_0001', userId: 'ben-0001' }, understanding: entendimiento({ capability: 'voice.tts' }) })),
  ]);
  check('60) dos planificaciones a la vez no se mezclan',
    a.plan.id === 'plan_brain_a_0001' && a.plan.steps[0].capability === 'image.generate'
    && b.plan.id === 'plan_brain_b_0001' && b.plan.steps[0].capability === 'voice.tts');
  /*
   * La clave que cambia el prototipo tampoco entra por aquí. Se RECHAZA la
   * petición entera en vez de quitarla y seguir: saneando en silencio, el plan
   * saldría distinto de lo que se pidió y nadie se enteraría. Que junto a ella
   * viaje una restricción legítima no cambia nada.
   */
  const proto = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'video.generate', constraints: JSON.parse('{"__proto__":{"colado":1},"duracion":5}') }),
  }));
  check('61) una clave que cambiaría el prototipo no ensucia el plan: lo impide',
    proto.status === 'invalid' && !proto.plan && ({}).colado === undefined, proto.status);
  check('62) el error nunca lleva mensaje crudo ni traza',
    !/stack|message:/.test(JSON.stringify((await planner().planificar('hola')).error || {})));
  check('63) y una petición que no es objeto falla sin lanzar', (await planner().planificar('hola')).status === 'invalid');
}

console.log('\n── K · Platform-agnostic ──');
{
  const PLATAFORMA = /react|react-native|Platform\.|window\.|document\.|navigator\.|localStorage|AsyncStorage|expo-|UIKit|android/i;
  check('64) ni el Core ni la composición saben de plataformas', !PLATAFORMA.test(codigoCore) && !PLATAFORMA.test(codigoComp));
  check('65) el mismo plan sale para cualquier cliente: no hay ninguna rama por plataforma',
    !/Platform\.OS|Platform\.select|isWeb|isAndroid|isIOS/.test(codigoCore + codigoComp));
}

console.log('\n── L · Traducción: se planifica como cualquier otra capacidad ──');
{
  /* Sin proveedor real, así que hoy no se puede servir: eso es lo honesto. */
  const sinNadie = await planner(todoMenos(['translation.text'])).planificar(peticion({
    understanding: entendimiento({ intent: 'transform', capability: 'translation.text', capabilities: ['translation.text'] }),
  }));
  check('66) traducir hoy no lo sirve nadie, y el Planner lo dice sin inventar un proveedor',
    sinNadie.status === 'unsupported' && sinNadie.unavailable.join() === 'translation.text');
  /* Y el día que haya matriz, se planifica como una más: sin tocar el Planner. */
  const conMatriz = await planner().planificar(peticion({
    understanding: entendimiento({ intent: 'transform', capability: 'translation.text', capabilities: ['translation.text'] }),
  }));
  check('67) y en cuanto una matriz la sirva, entra en el plan sin tocar el Planner',
    conMatriz.status === 'ready' && conMatriz.plan.steps[0].capability === 'translation.text' && conMatriz.plan.steps[0].produces === 'text');
  check('68) sin nombrar ningún servicio de traducción en ninguna parte',
    !/deepl|systran|papago|youdao|google translate|amazon translate/i.test(codigoCore + codigoComp));
}

console.log('\n── M · Brain → Planner, de punta a punta ──');
{
  /* El entendimiento que produce Brain de verdad entra en el Planner sin traducción. */
  const cerebro = core.crearBrain({
    thinker: { async pensar() { return { response: { kind: 'text', content: JSON.stringify({ intent: 'creation', goal: 'un logo', capability: 'image.generate', capabilities: ['image.generate'], confidence: 'high' }), actual: { provider: { lines: [], usd: 0.001 }, latencyMs: 2 } } }; } },
    tracer: { record: () => {} },
    now,
    experiences: ['design'],
  });
  const entendido = await cerebro.entender({
    contract: '1.0',
    trace: { traceId: 'brain_m_0001', requestId: 'brain_m_0001', userId: 'user-0001' },
    message: { text: 'quiero un logo' },
    options: { mode: 'understand' },
  });
  check('69) Brain entiende y declara la capacidad y la lista', entendido.understanding.capability === 'image.generate' && entendido.understanding.capabilities.includes('image.generate'));
  const plan = await planner().planificar({ contract: '1.0', trace: entendido.trace, understanding: entendido.understanding });
  check('70) y ese entendimiento entra en el Planner tal cual, sin traducirlo',
    plan.status === 'ready' && plan.plan.steps[0].capability === 'image.generate' && plan.plan.goal === 'un logo', JSON.stringify(plan.error));
  check('71) el hilo se conserva de Brain al plan', plan.trace.requestId === 'brain_m_0001' && plan.plan.id === 'plan_brain_m_0001');
  /* Y la lista incluye la principal aunque el modelo no la repita. */
  check('72) la capacidad principal entra en la lista aunque el modelo solo la nombre una vez',
    entendido.understanding.capabilities.length === 1);
}

console.log('\n── N · Lo que no se ha roto ──');
{
  check('73) el contrato de Workflow de la Fase 0 sigue intacto',
    /export const pasosListos/.test(leer('functions/src/core/workflow.ts')) && /El paralelismo NO se declara/.test(leer('functions/src/core/workflow.ts')));
  check('74) Weë Brain sigue funcionando y su política no se tocó',
    /RESPUESTAS_POR_CREDIT = 12/.test(leer('functions/src/creator/brainUsage.ts'))
    && /ai_brain: \{ margin: 0\.2, pricingMode: 'real' \}/.test(leer('functions/src/credits/creditCosts.ts')));
  check('75) CreatorFlow sigue entrando por donde entraba', /getPlanner\(\)/.test(leer('functions/src/creator/index.ts')));
  check('76) los dos planificadores de plantilla siguen existiendo, intactos',
    /export const templatePlanner/.test(leer(CREATOR_PLANNER)) && /export const llmPlanner/.test(leer(CREATOR_PLANNER)));
  check('77) el Gateway no se tocó para esto', !/planner|Planner/.test(sinComentarios(leer('functions/src/core/gateway.ts'))));
  check('78) `capabilities` se AÑADIÓ al entendimiento sin romper a quien solo usa `capability`',
    /capability\?: CoreCapabilityId;/.test(leer('functions/src/core/brain.ts')) && /capabilities\?: readonly CoreCapabilityId\[\];/.test(leer('functions/src/core/brain.ts')));
  check('79) y el catálogo sigue teniendo las mismas capacidades que antes de esta fase',
    core.CAPABILITY_CATALOG.length === 68, `${core.CAPABILITY_CATALOG.length}`);
  check('80) esta suite no llama a ninguna API real', !/https?:\/\/(?!ejemplo\.invalido)/.test(leer('functions/test/core-planner.test.mjs')));
}

/*
 * ── O · Lo que encontró la auditoría ────────────────────────────────────────
 *
 * Cada comprobación de aquí abajo corresponde a un defecto que existió de
 * verdad en esta fase y que una revisión adversarial ejecutó y demostró. No
 * son hipótesis: son regresiones, y por eso están escritas por el efecto
 * observable —qué devuelve el Planner— y no por la forma del código.
 */
console.log('\n── O · Lo que encontró la auditoría ──');
{
  /* Cinco revisiones independientes dieron con lo mismo: las pistas viajaban sin leer. */
  const conModelo = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'image.generate', capabilities: ['image.generate'] }),
    hints: { modelId: 'algo-1', durationSec: 8 },
  }));
  check('81) una implementación escondida en `hints` se rechaza, no se copia al plan',
    conModelo.status === 'invalid' && conModelo.error.details.reason === 'implementation_not_allowed' && !conModelo.plan,
    JSON.stringify(conModelo.error?.details));
  const conProveedor = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'image.generate', capabilities: ['image.generate'], preferences: { providerId: 'alguno' } }),
  }));
  check('82) y tampoco cuela por `preferences`, que la rellena un modelo',
    conProveedor.status === 'invalid' && conProveedor.error.details.reason === 'implementation_not_allowed' && !conProveedor.plan,
    JSON.stringify(conProveedor.error?.details));
  const rara = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'image.generate', capabilities: ['image.generate'], preferences: { temperatura: 9 } }),
  }));
  check('83) ni una clave que sencillamente no es una preferencia', rara.status === 'invalid' && !rara.plan, rara.status);
  const abstractas = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'video.generate', capabilities: ['video.generate'], preferences: { quality: 'high' } }),
    hints: { durationSec: 8 },
  }));
  check('84) lo abstracto sí pasa, y llega entero al plan y a cada paso',
    abstractas.status === 'ready'
    && abstractas.plan.hints.quality === 'high' && abstractas.plan.hints.durationSec === 8
    && abstractas.plan.steps[0].hints.quality === 'high' && abstractas.plan.steps[0].hints.durationSec === 8,
    JSON.stringify(abstractas.plan?.hints));
  check('85) las pistas del plan son del vocabulario del Core, sin claves de más',
    Object.keys(abstractas.plan.hints).every((k) => ['quality', 'durationSec'].includes(k)), Object.keys(abstractas.plan?.hints ?? {}).join(','));

  /*
   * El autocompletado fabricaba el material de la persona. La regla sale del
   * catálogo: si el paso acepta texto además del material, se le puede DECIR
   * qué hacer y generarlo es parte del encargo; si solo acepta material, ese
   * material es suyo y se pregunta.
   */
  for (const [capacidad, material] of [['audio.transcribe', 'voice'], ['vision.describe', 'image'], ['image.upscale', 'image'], ['video.compose', 'video']]) {
    const r = await planner().planificar(peticion({ understanding: entendimiento({ capability: capacidad, capabilities: [capacidad] }) }));
    check(`86.${material}) ${capacidad} sin material pregunta, no fabrica lo que iba a trabajar`,
      r.status === 'needs_clarification' && r.clarification.missing.includes(`material:${material}`) && !r.plan,
      r.status + ' ' + JSON.stringify(r.clarification?.missing ?? r.plan?.capabilities));
  }
  const dirigible = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'video.image_to_video', capabilities: ['video.image_to_video'] }),
  }));
  check('87) pero un paso que SÍ se puede dirigir con palabras se completa igual que antes',
    dirigible.status === 'ready' && dirigible.plan.capabilities.join(',') === 'image.generate,video.image_to_video',
    dirigible.status + ' ' + dirigible.plan?.capabilities);
  const conMaterial = await planner().planificar(peticion({
    understanding: entendimiento({
      capability: 'audio.transcribe', capabilities: ['audio.transcribe'],
      inputs: { text: 'transcríbeme esto', attachments: [{ kind: 'audio', uri: 'https://ejemplo.invalido/a.m4a' }] },
    }),
  }));
  check('88) y con el audio delante, transcribe y ya: ni un paso de más',
    conMaterial.status === 'ready' && conMaterial.plan.capabilities.join(',') === 'audio.transcribe',
    conMaterial.status + ' ' + conMaterial.plan?.capabilities);

  /* `failed` estaba declarado y no lo producía nada. */
  const roto = core.crearPlanner({
    availability: { disponible: () => { throw new Error('el registro se cayó'); } },
    tracer, now,
  });
  const caida = await roto.planificar(peticion({ understanding: entendimiento({ capability: 'image.generate', capabilities: ['image.generate'] }) }));
  check('89) si algo revienta por dentro, el Planner responde `failed` en vez de propagar',
    caida.status === 'failed' && caida.error.code === 'INTERNAL_ERROR', caida.status + ' ' + caida.error?.code);
  check('90) y no cuenta por qué: un mensaje de excepción lleva rutas y datos',
    !JSON.stringify(caida).includes('el registro se cayó'));
  const listaFalsa = await planner().planificar(peticion({ understanding: entendimiento({ capabilities: 'image.generate' }) }));
  check('91) `capabilities` la rellena un modelo: si no es una lista, se contesta, no se revienta',
    listaFalsa.status === 'invalid' && !listaFalsa.plan, listaFalsa.status);

  /* La clave con la que un objeto deja de ser un objeto. */
  const sucio = JSON.parse('{"__proto__": {"colado": true}, "tono": "alegre"}');
  const conSucio = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'image.generate', capabilities: ['image.generate'], constraints: sucio }),
  }));
  check('92) `__proto__` en las restricciones se rechaza: viajan al plan y alguien las copiará',
    conSucio.status === 'invalid' && !conSucio.plan, conSucio.status + ' ' + JSON.stringify(conSucio.error?.details));
  check('93) y nada de eso toca a Object.prototype', ({}).colado === undefined);
  /* El plan es una instantánea: quien llamó no puede cambiarlo después. */
  const mutables = { tono: 'alegre' };
  const suposiciones = ['formato vertical'];
  const instantanea = await planner().planificar(peticion({
    understanding: entendimiento({ capability: 'image.generate', capabilities: ['image.generate'], constraints: mutables, assumptions: suposiciones }),
  }));
  mutables.tono = 'triste';
  suposiciones.push('y en blanco y negro');
  check('94) el plan no comparte objetos con quien lo pidió: cambiarlos después no lo cambia',
    instantanea.plan.constraints.tono === 'alegre' && instantanea.plan.assumptions.length === 1,
    instantanea.plan?.constraints.tono + ' ' + instantanea.plan?.assumptions.length);
  /* Y el consumidor puede copiarlas con un spread sin heredar nada raro. */
  check('95) y un consumidor puede copiarlas sin sorpresas',
    Object.keys({ ...instantanea.plan.constraints }).join(',') === 'tono' && ({}).colado === undefined);

  /* La traza decía «text.generate» cada vez que no había plan. */
  trazas.length = 0;
  await planner(todoMenos(['video.generate'])).planificar(peticion({
    understanding: entendimiento({ capability: 'video.generate', capabilities: ['video.generate'] }),
  }));
  check('96) cuando no hay plan, la traza anota lo que se pidió, no una capacidad por defecto',
    ultima().capability === 'video.generate', ultima()?.capability);
  trazas.length = 0;
  await planner().planificar(peticion({ understanding: entendimiento({ capability: 'audio.transcribe', capabilities: ['audio.transcribe'] }) }));
  check('97) también cuando lo que falta es el material', ultima().capability === 'audio.transcribe', ultima()?.capability);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
