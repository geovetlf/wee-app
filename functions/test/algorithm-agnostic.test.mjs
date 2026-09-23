/*
 * EL ALGORITHM ENGINE NO CONOCE NINGUNA CAPACIDAD CONCRETA.
 *
 * La pregunta que esta batería contesta es una sola:
 *
 *   «¿Puede el Algorithm Engine razonar sobre una capacidad que no existía
 *    cuando se escribió el motor?»
 *
 * Si la respuesta exige tocar el núcleo, la arquitectura no cumple.
 *
 * ── Sobre los nombres que aparecen aquí ─────────────────────────────────────
 *
 * «lipsync», «face_swap», «talking_avatar»… son FIXTURES DE PRUEBA. No existen
 * en Weë, no se implementan, no tienen adaptador, no tienen proveedor y no se
 * añaden a ningún catálogo. Son cadenas de texto construidas en este archivo
 * para demostrar que al motor le da exactamente igual cómo se llamen.
 *
 * El guard del grupo H comprueba justo eso: que estos nombres NO aparezcan en
 * el código de producción y SÍ aquí. Si un día se colaran al núcleo, el guard
 * se pone rojo.
 *
 *  A. El descriptor extensible.
 *  B. La cerradura de la metadata.
 *  C. Capacidades futuras, como datos.
 *  D. La capacidad que nadie ha inventado.
 *  E. Extensibilidad: estrategias, modelos, proveedores, recursos.
 *  F. Las diez propiedades.
 *  G. Fronteras de autoridad.
 *  H. El guard de arquitectura.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const A = lib('core/algorithm/index.js');
const { ALGORITHM_CONTRACT_VERSION } = lib('core/contracts.js');
const a2 = A.crearMotorDeDescomposicion();
const a3 = A.crearMotorDeEstrategias();
const a4 = A.crearMotorDeParalelizacion();
const a1 = A.crearMotorDeDecision();

const paso = (id, cap, dep) => ({ id, capability: cap, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
const sig = (key, subject, value, source = 'measured', extra = {}) => ({ key, subject, value, source, ...extra });

/*
 * ── LOS FIXTURES ────────────────────────────────────────────────────────────
 *
 * Metadata externa, construida aquí. Ninguno de estos ids existe en Weë.
 */
const fixture = (id, tipo, extra = {}) => ({
  capabilityId: id,
  capabilityType: tipo,
  version: '1',
  skills: [`${id}_skill`],
  inputs: ['a', 'b'],
  outputs: ['c'],
  requirements: ['origen', 'referencia'],
  availableStrategies: ['direct_execution', 'pipeline'],
  availableModels: [`${id}-model-1`, `${id}-model-2`],
  availableProviders: [`${id}-provider`],
  costProfile: { typical: 0.05, source: 'catalog', unit: 'usd' },
  latencyProfile: { typical: 4200, source: 'measured', sampleSize: 20, unit: 'ms' },
  qualityProfile: { source: 'default' },
  resourceRequirements: [{ resourceType: 'gpu', amount: 1, exclusive: true }],
  compatibility: ['pipeline'],
  metadata: { note: 'fixture sintético de prueba' },
  ...extra,
});

const FUTURAS = [
  fixture('lipsync', 'media_transformation'),
  fixture('face_swap', 'media_transformation'),
  fixture('talking_avatar', 'media_synthesis'),
  fixture('motion_transfer', 'media_transformation'),
  fixture('video_translation', 'media_localization'),
  fixture('3d_generation', 'media_synthesis'),
  fixture('music_generation', 'media_synthesis'),
  fixture('document_analysis', 'analysis'),
];

console.log('\n─── A. El descriptor extensible ───');

check('1 · los ocho fixtures son descriptores válidos',
  FUTURAS.every((f) => A.capacidadValida(f)),
  JSON.stringify(FUTURAS.filter((f) => !A.capacidadValida(f)).map((f) => A.validarDescriptorDeCapacidad(f))));
check('2 · el identificador es TEXTO: una unión cerrada no admitiría ninguno',
  FUTURAS.every((f) => typeof f.capabilityId === 'string'));
check('3 · y el tipo de recurso también: «gpu» hoy, lo que venga mañana',
  A.capacidadValida(fixture('x', 't', { resourceRequirements: [{ resourceType: 'quantum-slot', amount: 3, unit: 'qubits' }] })));
check('4 · un descriptor sin casi nada vale: no saber no invalida',
  A.capacidadValida({ capabilityId: 'apenas.nada' }));
check('5 · lo que no vale es no tener nombre',
  A.validarDescriptorDeCapacidad({}).some((p) => p.reason === 'invalid_id'));
check('6 · y se devuelven TODOS los problemas, no el primero',
  A.validarDescriptorDeCapacidad({ capabilityId: '', skills: 'no soy lista', costProfile: {} }).length === 3,
  JSON.stringify(A.validarDescriptorDeCapacidad({ capabilityId: '', skills: 'x', costProfile: {} }).map((p) => p.reason)));
/* NO se creó un segundo registro de capacidades: ese ya existía en el Core. */
check('7 · no hay un segundo registro de capacidades',
  typeof A.crearFuenteDeDescriptores === 'function' && A.crearRegistroDeCapacidades === undefined &&
  /core\/capability\.ts/.test(leer('functions/src/core/algorithm/capability.ts')));
const fuente = A.crearFuenteDeDescriptores(FUTURAS);
check('8 · la fuente indexa y lista acotado',
  fuente.obtener('lipsync').capabilityType === 'media_transformation' && fuente.listar(3).length === 3);
check('9 · y lista en orden estable', igual(fuente.listar(3).map((d) => d.capabilityId), ['3d_generation', 'document_analysis', 'face_swap']));

console.log('\n─── B. La cerradura de la puerta de extensión ───');

check('10 · metadata normal pasa', A.metadataSegura({ a: 1, b: { c: 'x' } }).ok === true);
check('11 · un objeto enorme, no', A.metadataSegura(Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]))).reason === 'too_many_keys');
const hondo = (n) => (n === 0 ? 1 : { x: hondo(n - 1) });
check('12 · una profundidad sin fin, tampoco', A.metadataSegura(hondo(10)).reason === 'too_deep');
const circ = { a: 1 }; circ.yo = circ;
check('13 · ni una referencia circular', A.metadataSegura(circ).reason === 'circular');
check('14 · ni un valor que no se puede serializar', A.metadataSegura({ f: () => 1 }).reason === 'not_serializable');
/* La que más importa: la metadata NO puede elegir implementación. */
check('15 · ni metadata que intente elegir proveedor',
  A.metadataSegura({ preferencias: { providerId: 'x' } }).reason === 'authority_violation');
check('16 · ni anidada dos niveles', A.metadataSegura({ a: { b: { allowedProviders: ['x'] } } }).reason === 'authority_violation');
check('17 · y un descriptor con esa metadata se rechaza entero',
  A.validarDescriptorDeCapacidad(fixture('x', 't', { metadata: { modelId: 'y' } }))
    .some((p) => p.reason === 'authority_violation'));
check('18 · la cerradura usa el predicado del Planner, no una lista propia',
  leer('functions/src/core/algorithm/capability.ts').includes("import { violacionesEn } from './authority'"));

console.log('\n─── C. Capacidades futuras, tratadas como datos ───');

/* Cada fixture recorre la cadena entera: A2 → A4 → A3 → A1. */
let completadas = 0; const fallos = [];
for (const f of FUTURAS) {
  const id = f.capabilityId;
  const tarea = { id: `T_${id}`, steps: [
    paso('origen', id), paso('ref', id, ['origen']), paso('salida', id, ['origen']), paso('fin', id, ['ref', 'salida'])] };
  const senales = tarea.steps.map((s) => sig('step.latencyMs', s.id, 100 + s.id.length * 10));
  const { variantes } = a4.variantes(tarea, senales);
  const est = a3.proponer(variantes, senales);
  const dec = a1.decidir({
    contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1, depth: 1 } },
    trace: { traceId: 't', requestId: 'r', userId: 'u' }, options: est.estrategias, signals: est.signals,
  });
  if (dec.status === 'decided' && est.estrategias.length >= 1 && variantes.length >= 1) completadas++;
  else fallos.push(`${id}:${dec.status}/${dec.failure ?? ''}`);
}
check('19 · las ocho capacidades futuras recorren A2 → A4 → A3 → A1',
  completadas === 8, fallos.join(', ') || 'todas');

/* Y la cadena COMPLETA hasta A5: optimizar sobre una capacidad que no existe.
 * Aquí el puerto de formas lleva A4 y A3 de verdad, así que lo que se demuestra
 * no es que A5 tolere la capacidad: es que la transformación «secuencial →
 * paralelo» se calcula sobre ella sin que nadie la haya nombrado nunca. */
let optimizadas = 0; const sinMejora = [];
for (const f of FUTURAS) {
  const id = f.capabilityId;
  const tarea = { id: `O_${id}`, steps: [
    paso('origen', id), paso('ref', id, ['origen']), paso('salida', id, ['origen']), paso('fin', id, ['ref', 'salida'])] };
  const senales = [
    ...tarea.steps.map((s) => sig('step.latencyMs', s.id, 100 + s.id.length * 10)),
    ...tarea.steps.map((s) => sig('step.costUsd', s.id, 0.01)),
  ];
  const todas = a4.variantes(tarea, senales).variantes;
  const secuencial = a3.proponer(todas.slice(0, 1), senales).estrategias[0];
  const motor = A.crearMotorDeOptimizacion({
    operadores: [A.operadorDeFormas((c) => {
      const e = c.value;
      if (!e || !Array.isArray(e.steps)) return [];
      const v = a4.variantes({ id: e.id, steps: e.steps }, senales).variantes;
      return v.length ? a3.proponer(v, senales).estrategias.filter((x) => x.id !== c.id) : [];
    })],
  });
  const r = motor.optimizar({
    candidates: [secuencial], objective: { weights: { latency: 1 } },
    evidence: senales.map((s) => ({ claim: s.key, signal: s, supports: true })),
  });
  if (r.feasible.length === 1 && r.proposals.length >= 1 && r.proposals[0].expectedGain > 0) optimizadas++;
  else sinMejora.push(`${id}:${r.stoppedBecause}/${r.proposals.length}`);
}
check('19b · y las ocho llegan hasta A5: se optimizan sin que el núcleo las nombre',
  optimizadas === 8, sinMejora.join(', ') || 'las ocho con propuesta y ganancia > 0');

console.log('\n─── D. La capacidad que nadie ha inventado ───');

/*
 * Construido en tiempo de ejecución a propósito: ni siquiera aparece como
 * literal completo. Si el motor tuviera que conocerla, esto no funcionaría.
 */
const inventada = ['future', 'unknown', 'capability', 'v' + (21 * 2)].join('.');
/*
 * La afirmación es que el núcleo no la CONOCE —que no hay código que la
 * nombre—, no que la palabra no se escriba nunca: el comentario que explica por
 * qué el defecto dejó de ser el catálogo la usa como ejemplo, y eso es lo que
 * debe hacer. Se comprueba sobre el código, sin comentarios.
 */
check('20 · el id se construye en ejecución, y ningún CÓDIGO del núcleo lo nombra',
  inventada === 'future.unknown.capability.v42' &&
  !fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/algorithm'))
    .some((f) => sinComentarios(leer(`functions/src/core/algorithm/${f}`)).includes(inventada)));
const tareaX = { id: 'X', steps: [paso('p1', inventada), paso('p2', inventada, ['p1']), paso('p3', inventada, ['p1'])] };
const senalesX = tareaX.steps.map((s) => sig('step.latencyMs', s.id, 300));
const anaX = a4.analizar(tareaX, senalesX);
check('21 · A4 la analiza: curva, cuellos y recomendación', anaX.curva.length === 2 && !!anaX.recomendado,
  JSON.stringify(anaX.recomendado));
const varX = a4.variantes(tareaX, senalesX).variantes;
const estX = a3.proponer(varX, senalesX);
check('22 · A3 la convierte en estrategias con previsiones', estX.estrategias.length >= 1 &&
  typeof estX.estrategias[0].value.expected.latencyMs === 'number');
const decX = a1.decidir({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' }, options: estX.estrategias, signals: estX.signals });
check('23 · y A1 decide sobre ella', decX.status === 'decided', decX.failure ?? '');
check('24 · sin que el motor haya tenido que conocerla',
  A.validarDAG(tareaX).length === 0 && a2.descomponer(tareaX).opciones.length === 2);
/* Y con el catálogo exigido, se rechaza — que también es correcto y es OTRA pregunta. */
check('25 · quien exija el catálogo de hoy sigue pudiendo hacerlo',
  A.crearMotorDeDescomposicion({ capacidades: { conocida: A.capacidadDelCatalogo } })
    .descomponer(tareaX).problemas.some((p) => p.reason === 'unknown_capability'));

console.log('\n─── E. Extensibilidad ───');

check('26 · una estrategia desconocida entra por el Registry, sin tocar el núcleo',
  igual(A.estrategiasAplicables(fixture('x', 't', { availableStrategies: ['ensemble', 'quantum_search'] }),
    ['ensemble', 'quantum_search', 'pipeline']), ['ensemble', 'quantum_search']));
check('27 · y una que no está registrada no se aplica',
  igual(A.estrategiasAplicables(fixture('x', 't', { availableStrategies: ['no_registrada'] }), ['pipeline']), []));
check('28 · la aplicabilidad es un DATO, no un `if` por capacidad',
  A.requisitosSatisfechos(['origen', 'ref'], ['origen', 'ref', 'extra']).ok === true &&
  igual(A.requisitosSatisfechos(['origen', 'falta'], ['origen']).faltan, ['falta']));
check('29 · las heurísticas ya no son una lista cerrada',
  /\(string & \{\}\)/.test(leer('functions/src/core/algorithm/decomposition-engine.ts')));
check('30 · ni las clases de riesgo', /\(string & \{\}\)/.test(leer('functions/src/core/algorithm/strategy.ts')));
/* Una estrategia inventada, con una clase de riesgo inventada, atraviesa A3. */
const rara = { ...a4.variantes({ id: 'R', steps: [paso('a', inventada), paso('b', inventada, ['a'])] }, []).variantes[0], heuristica: 'ensemble_cuantico' };
check('31 · una heurística inventada no rompe A3', a3.proponer([rara], []).estrategias.length === 1);
check('32 · un modelo o proveedor desconocido es solo un nombre en el descriptor',
  A.capacidadValida(fixture('x', 't', { availableModels: ['modelo-que-no-existe'], availableProviders: ['proveedor-inventado'] })));
check('33 · una capacidad SIN proveedor sigue siendo razonable como descriptor',
  A.capacidadValida({ capabilityId: 'sin.proveedor', availableProviders: [] }) &&
  a4.analizar({ id: 'S', steps: [paso('a', 'sin.proveedor')] }, []).problemas.length === 0);
check('34 · una capacidad con CERO estrategias da un resultado explícito, no un crash',
  igual(A.estrategiasAplicables({ capabilityId: 'x', availableStrategies: [] }, ['pipeline']), []));
check('35 · unas restricciones incompatibles dan decisión negativa, no un crash',
  a1.decidir({ contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { quality: 1 } },
    trace: { traceId: 't', requestId: 'r', userId: 'u' },
    options: [{ id: 'o', value: 'o', values: { quality: 0.5 } }],
    constraints: { requiredCapabilities: [inventada], forbiddenCapabilities: [inventada] },
  }).failure === 'constraint_conflict');
check('36 · con señales incompletas se mantiene la incertidumbre',
  a3.proponer(a4.variantes(tareaX, []).variantes, []).estrategias[0].value.expected.uncertainty === 'unknown');
check('37 · y con varias estrategias, se pueden comparar', estX.estrategias.length >= 1 && decX.candidates.length >= 1);

console.log('\n─── F. Las diez propiedades ───');

const cadenaCompleta = (tid, cap) => {
  const t = { id: tid, steps: [paso('a', cap), paso('b', cap, ['a']), paso('c', cap, ['a'])] };
  const s = t.steps.map((x) => sig('step.latencyMs', x.id, 200));
  const e = a3.proponer(a4.variantes(t, s).variantes, s);
  return a1.decidir({ contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1 } },
    trace: { traceId: 't', requestId: 'r', userId: 'u' }, options: e.estrategias, signals: e.signals });
};
const conA = cadenaCompleta('T', 'capacidad.alfa');
const conB = cadenaCompleta('T', 'capacidad.beta');
const sinIds = (d) => JSON.stringify(d).split('capacidad.alfa').join('CAP').split('capacidad.beta').join('CAP');
check('38 · P1 · renombrar la capacidad no cambia la lógica, solo el identificador',
  sinIds(conA) === sinIds(conB), conA.selected?.id);
check('39 · P2 · metadata irrelevante no cambia el resultado',
  A.capacidadValida(fixture('x', 't', { metadata: { loQueSea: [1, 2, 3] } })) &&
  igual(A.estrategiasAplicables(fixture('x', 't'), ['direct_execution']),
        A.estrategiasAplicables(fixture('x', 't', { metadata: { otra: 'cosa' } }), ['direct_execution'])));
const f1 = A.crearFuenteDeDescriptores(FUTURAS);
const f2 = A.crearFuenteDeDescriptores([...FUTURAS, fixture('otra.mas', 'x')]);
check('40 · P3 · añadir una capacidad no cambia lo que se decide de otra',
  igual(f1.obtener('lipsync'), f2.obtener('lipsync')));
check('41 · P4 · reordenar las capacidades no cambia el listado canónico',
  igual(A.crearFuenteDeDescriptores([...FUTURAS].reverse()).listar().map((d) => d.capabilityId),
        f1.listar().map((d) => d.capabilityId)));
check('42 · P5 · reordenar la metadata no cambia la decisión',
  A.metadataSegura({ a: 1, b: 2 }).ok === A.metadataSegura({ b: 2, a: 1 }).ok);
check('43 · P6 · una estrategia nueva entra por el Registry sin tocar el núcleo',
  A.estrategiasAplicables(fixture('x', 't', { availableStrategies: ['recien_inventada'] }), ['recien_inventada']).length === 1);
check('44 · P7+P8 · una capacidad sin proveedor no provoca ninguna búsqueda de proveedor',
  !/availableProviders\s*\[|providers\[|lookupProvider/.test(sinComentarios(leer('functions/src/core/algorithm/capability.ts'))));
const FUENTES_NUCLEO = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/algorithm'))
  .filter((f) => f.endsWith('.ts')).map((f) => ({ f, src: leer(`functions/src/core/algorithm/${f}`) }));
check('45 · P9 · el motor no tiene efectos externos: ni red, ni disco, ni estado global',
  FUENTES_NUCLEO.every(({ src }) => !/fetch\(|require\(|firebase|process\.env|globalThis\./.test(sinComentarios(src))));
check('46 · P10 · determinista: doce corridas iguales dan lo mismo',
  Array.from({ length: 12 }, () => cadenaCompleta('T', inventada)).every((d, _, arr) => igual(d, arr[0])));

console.log('\n─── G. Fronteras de autoridad ───');

check('47 · una estrategia que nombre un proveedor se rechaza, venga de donde venga',
  a3.proponer([{ ...varX[0], steps: [{ ...paso('p1', inventada), input: { providerId: 'x' } }] }], []).rechazadas[0]?.reason === 'authority');
check('48 · y la frontera sigue siendo la del Planner, sin segunda lista',
  leer('functions/src/core/algorithm/authority.ts').includes("import { claveDeImplementacion } from '../planner'"));
check('49 · los efectos prohibidos nombran a su dueño, y el Router está entre ellos',
  A.EFECTOS_PROHIBIDOS.some((e) => /Router/.test(e.dueno)) && A.EFECTOS_PROHIBIDOS.length >= 10);
check('50 · el motor no decide implementación: no hay ningún `selectedProvider`',
  !/selectedProvider|selectedModel|selectedAdapter/.test(FUENTES_NUCLEO.map((x) => x.src).join('\n')));

console.log('\n─── H. El guard de arquitectura ───');

/*
 * Distingue PRODUCCIÓN de FIXTURE: los mismos nombres que aquí son datos de
 * prueba, en `functions/src/core/algorithm/**` serían una dependencia real.
 */
const PROHIBIDOS_EN_NUCLEO = ['gemini', 'deepseek', 'seedance', 'elevenlabs', 'minimax', 'openai',
  'claude', 'qwen', 'suno', 'flux', 'seedream', 'anthropic',
  'lipsync', 'faceswap', 'face_swap', 'talking_avatar', 'motion_transfer', 'video_translation'];
/*
 * Se compara por TOKEN, no por subcadena. Buscar «suno» dentro del texto marca
 * `almenosuno` —una variable en castellano— y un guard que grita por eso deja
 * de leerse a la semana. El objetivo es cazar dependencias reales, no palabras
 * que contienen otras palabras.
 */
const tokens = (src) => new Set(sinComentarios(src).toLowerCase().match(/[a-z0-9_]+/g) ?? []);
const sucios = [];
for (const { f, src } of FUENTES_NUCLEO) {
  const t = tokens(src);
  for (const p of PROHIBIDOS_EN_NUCLEO) if (t.has(p)) sucios.push(`${f}:${p}`);
}
check('51 · GUARD · ningún nombre de proveedor ni de capacidad concreta en el núcleo',
  sucios.length === 0, sucios.join(', ') || 'ninguno');
/* CONTROL: el guard tiene que cazar de verdad, o no protege nada. */
check('51b · CONTROL · el guard SÍ caza una dependencia real',
  tokens("const cliente = llamarA('gemini');").has('gemini') &&
  tokens('const x = almenosuno;').has('suno') === false,
  'token, no subcadena');
/* Y el guard sirve de algo: los mismos nombres SÍ están aquí, como fixtures. */
check('52 · GUARD · el guard distingue: esos nombres sí están en esta prueba',
  PROHIBIDOS_EN_NUCLEO.filter((p) => leer('functions/test/algorithm-agnostic.test.mjs').includes(p)).length >= 6);
const INFRA = ['firebase', 'firestore', 'getFirestore', 'fetch(', 'http', 'axios', 'process.env',
  'spendCredits', 'creditsBalance', 'createAsset', 'crearJob', 'defineSecret', 'apiKey'];
const conInfra = [];
for (const { f, src } of FUENTES_NUCLEO) {
  const limpio = sinComentarios(src);
  for (const p of INFRA) if (limpio.toLowerCase().includes(p.toLowerCase())) conInfra.push(`${f}:${p}`);
}
check('53 · GUARD · ni infraestructura: red, Firestore, secretos, Credits, Assets, Jobs',
  conInfra.length === 0, conInfra.join(', ') || 'ninguno');
/* El grafo de dependencias: solo contratos del Core. */
const PERMITIDOS = ['../contracts', '../cost', '../errors', '../observability', '../planner',
  '../workflow', '../registry/capabilities', '../capability'];
const importes = FUENTES_NUCLEO.flatMap(({ f, src }) =>
  [...sinComentarios(src).matchAll(/from '([^']+)'/g)].map((m) => m[1])
    .filter((r) => !r.startsWith('./'))
    .map((r) => ({ f, r })));
const fueraDeContrato = importes.filter((x) => !PERMITIDOS.includes(x.r));
check('54 · GUARD · solo se importan contratos del Core, y ninguno de fuera',
  fueraDeContrato.length === 0, fueraDeContrato.map((x) => `${x.f}→${x.r}`).join(', ') || 'ninguno');
for (const prohibido of ['creator', 'runtime', 'engine/', 'gateway', 'financial', 'credits', 'providers/']) {
  check(`55 · GUARD · el núcleo no depende de «${prohibido}»`,
    !importes.some((x) => x.r.includes(prohibido)),
    importes.filter((x) => x.r.includes(prohibido)).map((x) => x.f).join(',') || 'ninguno');
}
/* Y nadie ha conectado nada de esto a producción. */
check('56 · GUARD · el Algorithm Engine sigue sin estar conectado', (() => {
  try {
    return require_('node:child_process').execSync(
      'grep -rl "core/algorithm" functions/src/creator functions/src/runtime functions/src/engine functions/src/planner functions/src/router functions/src/orchestrator 2>/dev/null || true',
      { cwd: RAIZ, encoding: 'utf8' }).trim().length === 0;
  } catch { return false; }
})());

console.log(failures
  ? `\n${failures} comprobación(es) fallaron`
  : '\nEl Algorithm Engine razona sobre capacidades que no existían cuando se escribió');
process.exit(failures ? 1 : 0);
