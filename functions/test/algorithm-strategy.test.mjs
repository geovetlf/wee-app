/*
 * A3 — EL MOTOR DE ESTRATEGIAS.
 *
 * Convierte una descomposición de A2 en una estrategia con previsiones,
 * riesgos y evidencia. NO elige: eso es A1.
 *
 *  A. Quién es.
 *  B. La matriz del brief, de la A a la AF.
 *  C. Camino crítico y previsiones.
 *  D. Riesgos, comprobaciones y recuperación.
 *  E. Referencia, respaldo y bucles.
 *  F. Determinismo.
 *  G. Propiedades.
 *  H. Integración con A1.
 *  I. Los veinticuatro sabotajes.
 *  J. Rendimiento.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CAPAS_DE_PRODUCCION, PATRON_A3, describirHallazgos, guardaDeConexion } from './guardas.mjs';

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
const d2 = A.crearMotorDeDescomposicion();
const d3 = A.crearMotorDeEstrategias();

const paso = (id, cap = 'text.generate', dep) => ({ id, capability: cap, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
const sig = (key, subject, value, source = 'measured', extra = {}) => ({ key, subject, value, source, ...extra });
const TAREA = { id: 'T', steps: [paso('a'), paso('b', 'image.generate', ['a']), paso('c', 'image.generate', ['a']),
  paso('d', 'image.generate', ['a']), paso('e', 'video.generate', ['b', 'c', 'd'])] };
const LAT = [sig('step.latencyMs', 'a', 800, 'measured', { sampleSize: 40 }), sig('step.latencyMs', 'b', 3000, 'measured', { sampleSize: 30 }),
  sig('step.latencyMs', 'c', 1200), sig('step.latencyMs', 'd', 900), sig('step.latencyMs', 'e', 5000)];
const COSTE = ['a', 'b', 'c', 'd', 'e'].map((id, i) => sig('step.costUsd', id, [0.001, 0.03, 0.03, 0.03, 0.23][i]));
const CAL = ['a', 'b', 'c', 'd', 'e'].map((id, i) => sig('step.quality', id, [0.9, 0.8, 0.85, 0.7, 0.95][i]));
const FIA = ['a', 'b', 'c', 'd', 'e'].map((id) => sig('step.reliability', id, 0.98));

const desc = (t = TAREA, c) => d2.descomponer(t, c).opciones.map((o) => o.value);
const proponer = (senales = [], c, lim, t = TAREA) => d3.proponer(desc(t, c), senales, c, lim);

console.log('\n─── A. Quién es ───');

check('1 · su descriptor vale según A0 y es de la familia `strategy`',
  A.algoritmoValido(A.DESCRIPTOR_DE_ESTRATEGIAS) && A.DESCRIPTOR_DE_ESTRATEGIAS.category === 'strategy',
  JSON.stringify(A.validarAlgoritmo(A.DESCRIPTOR_DE_ESTRATEGIAS)));
check('2 · es puro y EXPERIMENTAL: nadie lo elige solo',
  A.DESCRIPTOR_DE_ESTRATEGIAS.purity === 'pure' &&
  A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_ESTRATEGIAS]).registro.seleccionable(A.STRATEGY_ENGINE_ID) === false);
check('3 · se registra por el Registry de A0, no por uno nuevo',
  !!A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_ESTRATEGIAS]).registro.obtener(A.STRATEGY_ENGINE_ID, 1));
check('4 · el contrato subió sin romper el mayor',
  Number(ALGORITHM_CONTRACT_VERSION.split('.')[0]) === 1 && Number(ALGORITHM_CONTRACT_VERSION.split('.')[1]) >= 3,
  ALGORITHM_CONTRACT_VERSION);

console.log('\n─── B. La matriz ───');

const completo = proponer([...LAT, ...COSTE, ...CAL, ...FIA]);
check('5 · A · una estrategia válida sale', completo.estrategias.length >= 1 && completo.metricas.valid >= 1);
check('6 · B · y varias cuando hay varias formas', completo.estrategias.length === 2, String(completo.estrategias.length));
const base = completo.estrategias.find((e) => e.value.isBaseline);
const paralela = completo.estrategias.find((e) => !e.value.isBaseline);
check('7 · C · hay una referencia, marcada, y es la secuencial',
  !!base && base.value.fromDecomposition.endsWith(':secuencial') && completo.metricas.baselines === 1);
check('8 · D+E · la paralela agrupa y la secuencial no',
  paralela.value.parallelGroups.length === 1 && base.value.parallelGroups.length === 0);
check('9 · F · una restricción dura deja fuera lo que no cumple',
  proponer([...LAT, ...COSTE], { maxSteps: 4 }).estrategias.length === 0);
check('10 · G · el coste es la SUMA y no cambia al paralelizar',
  base.value.expected.costUsd === paralela.value.expected.costUsd &&
  Math.abs(base.value.expected.costUsd - 0.321) < 1e-9, String(base.value.expected.costUsd));
check('11 · H · la latencia NO es suma/N: es el camino crítico',
  base.value.expected.latencyMs === 10900 && paralela.value.expected.latencyMs === 8800,
  `${base.value.expected.latencyMs} vs ${paralela.value.expected.latencyMs}`);
check('12 · I · la calidad es el eslabón más débil, no la media',
  base.value.expected.quality === 0.7, String(base.value.expected.quality));
check('13 · y la fiabilidad es el producto, no la media',
  Math.abs((1 - base.value.expected.risk) - Math.pow(0.98, 5)) < 1e-9, String(1 - base.value.expected.risk));
check('14 · J · los riesgos estructurales se detectan y se nombran',
  base.value.expected.risks.some((r) => r.kind === 'single_point_of_failure'),
  base.value.expected.risks.map((r) => `${r.kind}(${r.severity})`).join(', '));
check('15 · K · cada eje previsto dice su confianza y su procedencia',
  Object.values(base.value.expected.porEje).every((p) => typeof p.confidence === 'number' && !!p.source),
  Object.entries(base.value.expected.porEje).map(([k, v]) => `${k}=${v.source}`).join(' '));
check('16 · L · y la incertidumbre sale de la evidencia', base.value.expected.uncertainty === 'known');

/* M · sin evidencia: NO se inventa ni un número. */
const aCiegas = proponer([]);
const ciega = aCiegas.estrategias[0].value;
check('17 · M · sin señales no hay coste, ni latencia, ni calidad',
  ciega.expected.costUsd === undefined && ciega.expected.latencyMs === undefined && ciega.expected.quality === undefined);
check('18 · y se dice que falta evidencia, con confianza 0',
  ciega.expected.confidence.value === 0 && ciega.expected.uncertainty === 'unknown' &&
  ciega.expected.risks.some((r) => r.kind === 'insufficient_evidence'));
check('19 · pero la estrategia sigue siendo válida: no saber no la invalida', aCiegas.estrategias.length === 2);
check('20 · y el camino crítico existe igual, solo que sin duración',
  ciega.criticalPath.length > 0 && ciega.expected.latencyMs === undefined, ciega.criticalPath.join('→'));
/* Con UN paso sin dato, no hay total: una suma parcial es peor que nada. */
const parcial = proponer(COSTE.slice(0, 4));
check('21 · si a UN paso le falta el dato, no hay total',
  parcial.estrategias[0].value.expected.costUsd === undefined);

/* N · evidencia en conflicto: manda la procedencia. */
const enConflicto = proponer([...COSTE, sig('step.costUsd', 'e', 0.99, 'model')]);
check('22 · N · una estimación de un modelo no tumba una medición',
  Math.abs(enConflicto.estrategias[0].value.expected.costUsd - 0.321) < 1e-9,
  String(enConflicto.estrategias[0].value.expected.costUsd));
check('23 · y la procedencia del agregado es la MÁS DÉBIL de sus partes',
  proponer([...COSTE.slice(0, 4), sig('step.costUsd', 'e', 0.23, 'declared')])
    .estrategias[0].value.expected.porEje.cost.source === 'declared');

/* O–R · lo inválido. */
const conCiclo = d3.proponer([{ ...desc()[0], steps: [paso('x', 'text.generate', ['y']), paso('y', 'text.generate', ['x'])], tandas: [['x'], ['y']] }], []);
check('24 · O+P · una estrategia con ciclo no entra',
  conCiclo.estrategias.length === 0 && conCiclo.rechazadas[0].reason === 'incoherent',
  JSON.stringify(conCiclo.rechazadas));
const malCheckpoint = { ...completo.estrategias[0].value, checkpoints: [{ afterStepId: 'fantasma', requirement: {} }] };
check('25 · Q · un punto de comprobación sobre un paso que no existe se detecta',
  A.problemasDeEstrategia(malCheckpoint).includes('checkpoints:fantasma:unknown_step'));
check('26 · R · una recuperación que no dice adónde ir se detecta',
  A.problemasDeEstrategia({ ...completo.estrategias[0].value, recovery: [{ kind: 'alternative_strategy', because: 'x' }] })
    .includes('recovery:alternative_strategy:no_target'));

/* U+V · duplicados exactos y SEMÁNTICOS. */
const dosIguales = d3.proponer([desc()[0], { ...desc()[0], id: 'T:otra', label: 'otra etiqueta' }], [...LAT, ...COSTE]);
check('27 · U+V · dos que se ejecutan igual y prometen lo mismo son UNA',
  dosIguales.estrategias.length === 1 && dosIguales.metricas.duplicates === 1,
  `${dosIguales.estrategias.length} válidas, ${dosIguales.metricas.duplicates} colapsadas`);
check('28 · la huella ignora la etiqueta: una diferencia cosmética no crea una estrategia',
  A.huellaDe(completo.estrategias[0].value, completo.estrategias[0].values) ===
  A.huellaDe({ ...completo.estrategias[0].value, label: 'otra cosa', id: 'otro' }, completo.estrategias[0].values));

/* W–Z · presupuesto y límites. */
check('29 · W · el presupuesto corta y lo dice',
  proponer([...LAT], undefined, { maxCandidates: 1 }).metricas.budgetExhausted === true);
/* El abanico necesita 3 escalones como mínimo, así que con 2 no cabe ninguna. */
const apretadas = proponer([...LAT], undefined, { maxDepth: 2 });
check('30 · X · maxDepth deja fuera lo que no cabe, y dice por qué',
  apretadas.estrategias.length === 0 && apretadas.rechazadas.every((r) => r.reason === 'constraint:maxDepth'),
  JSON.stringify(apretadas.rechazadas.map((r) => r.reason)));
check('30b · y con profundidad de sobra caben las dos',
  proponer([...LAT], undefined, { maxDepth: 8 }).estrategias.length === 2);
check('31 · Y · maxSteps también', proponer([...LAT], { maxSteps: 2 }).estrategias.length === 0);
check('32 · Z · y maxParallel',
  proponer([...LAT], { maxParallel: 2 }).estrategias.every((e) =>
    Math.max(0, ...e.value.parallelGroups.map((g) => g.steps.length)) <= 2));

/* AE+AF · entrada vacía y malformada. */
check('33 · AE · sin descomposiciones no se inventa ninguna estrategia',
  d3.proponer([], []).estrategias.length === 0 && d3.proponer([], []).metricas.candidates === 0);
check('34 · AF · una entrada que no es lista no rompe', d3.proponer(undefined, []).estrategias.length === 0);

console.log('\n─── C. Camino crítico y previsiones ───');

check('35 · el camino crítico es el paso más lento de cada tanda',
  igual([...paralela.value.criticalPath], ['a', 'b', 'e']), paralela.value.criticalPath.join('→'));
check('36 · y su duración es la suma de esos, no de todos',
  paralela.value.expected.latencyMs === 800 + 3000 + 5000);
check('37 · sin duraciones hay camino pero no duración',
  A.caminoCritico([['a', 'b'], ['c']], () => undefined).durationMs === undefined);
check('38 · con empate manda el id, para que sea reproducible',
  igual([...A.caminoCritico([['z', 'a']], () => 5).path], ['a']));
check('39 · una duración ausente no gana por ausencia',
  igual([...A.caminoCritico([['a', 'b']], (id) => (id === 'b' ? 100 : undefined)).path], ['b']));
/* La distinción que el brief subraya: previsión ≠ medición posterior. */
check('40 · todo lo que produce A3 es EXPECTED, y el tipo lo dice',
  'expected' in base.value && !('actual' in base.value) &&
  !/actualLatency|actualCost|actualQuality/.test(leer('functions/src/core/algorithm/strategy-engine.ts')));

console.log('\n─── D. Riesgos, comprobaciones y recuperación ───');

check('41 · la severidad es una escala ORDINAL declarada, no una probabilidad',
  igual(Object.keys(A.VALOR_DE_SEVERIDAD).sort(), ['alto', 'bajo', 'medio']) &&
  /NO una probabilidad/.test(leer('functions/src/core/algorithm/strategy.ts')));
check('42 · el riesgo ESTRUCTURAL no se cuela en `expected.risk`',
  aCiegas.estrategias[0].value.expected.risk === undefined &&
  aCiegas.estrategias[0].value.expected.risks.length > 0);
check('43 · sale como señal aparte, para que A1 pueda usarla si quiere',
  aCiegas.signals.some((s) => s.key === 'strategy.structuralRisk' && s.source === 'derived'));
check('44 · `expected.risk` solo existe cuando hay fiabilidad MEDIDA',
  typeof proponer([...FIA]).estrategias[0].value.expected.risk === 'number' &&
  proponer([]).estrategias[0].value.expected.risk === undefined);
check('45 · mucho paralelismo es un riesgo declarado',
  A.riesgosDe([paso('a')], [['a', 'b', 'c', 'd']], { sinEvidencia: [], esFallback: false, sinVerificar: [] })
    .some((r) => r.kind === 'excessive_parallelism'));
check('46 · una cadena larga también',
  A.riesgosDe([paso('a')], Array.from({ length: 11 }, (_, i) => [`s${i}`]), { sinEvidencia: [], esFallback: false, sinVerificar: [] })
    .some((r) => r.kind === 'dependency_depth' && r.severity === 'alto'));
check('47 · los puntos de comprobación van donde de verdad sirven',
  base.value.checkpoints.length >= 1 && base.value.checkpoints[0].afterStepId === 'a',
  base.value.checkpoints.map((c) => c.afterStepId).join(','));
check('48 · y están acotados: no uno por paso',
  A.puntosDeComprobacion(TAREA.steps, {}, 1).length === 1 && A.puntosDeComprobacion(TAREA.steps, {}, 0).length === 0);
check('49 · usan el QualityRequirement del Core, sin otro sistema',
  leer('functions/src/core/algorithm/strategy-engine.ts').includes("Checkpoint['requirement']") &&
  !/interface .*QualityReq/.test(leer('functions/src/core/algorithm/strategy-engine.ts')));
check('50 · la recuperación se PROPONE y responde al riesgo encontrado',
  A.recuperacionPara([{ kind: 'single_point_of_failure', severity: 'alto', because: 'x' }])[0].kind === 'retry' &&
  A.recuperacionPara([{ kind: 'insufficient_evidence', severity: 'medio', because: 'x' }])[0].kind === 'replan');
check('51 · y no se creó un motor de reintentos paralelo',
  !/RetryEngine|StrategyRetry|RecoveryEngine/.test(leer('functions/src/core/algorithm/strategy-engine.ts')));

console.log('\n─── E. Referencia, respaldo y bucles ───');

check('52 · la referencia va marcada y no se presenta como la mejor',
  base.value.isBaseline === true && !/mejor estrategia|best strategy/i.test(base.value.label));
/* Los cuatro ejes están medidos en las dos, así que los cuatro se comparan: la
 * latencia mejora 2 100 ms y lo demás no cambia — paralelizar no altera lo que
 * se paga ni la calidad del eslabón más débil. */
check('53 · se puede medir contra ella, en los ejes que las dos midieron',
  igual(A.deltaFrenteALaBase(base, paralela), { cost: 0, latency: 2100, quality: 0, reliability: 0 }),
  JSON.stringify(A.deltaFrenteALaBase(base, paralela)));
check('54 · si a una le falta un eje, ese eje no se compara',
  igual(A.deltaFrenteALaBase({ values: { cost: 1 } }, { values: { latency: 2 } }), {}));
/* Bucles de respaldo: A → B → A. */
const bucle = A.ciclosDeRespaldo([{ id: 'A', fallbackFrom: 'B' }, { id: 'B', fallbackFrom: 'A' }]);
check('55 · un bucle de respaldos se detecta y se dice quién lo forma',
  bucle.length === 1 && igual([...bucle[0]], ['A', 'B']), JSON.stringify(bucle));
check('56 · y se describe igual venga como venga la lista',
  igual(A.ciclosDeRespaldo([{ id: 'B', fallbackFrom: 'A' }, { id: 'A', fallbackFrom: 'B' }]), bucle));
check('57 · una cadena sin bucle no reporta ninguno',
  A.ciclosDeRespaldo([{ id: 'A', fallbackFrom: 'B' }, { id: 'B' }]).length === 0);
check('58 · un respaldo de sí mismo se detecta en la validación',
  A.problemasDeEstrategia({ ...base.value, fallbackFrom: base.value.id }).includes('fallbackFrom:self'));
check('59 · y un respaldo sin decir de quién, también',
  A.problemasDeEstrategia({ ...base.value, isFallback: true, fallbackFrom: undefined }).includes('fallbackFrom:missing'));

console.log('\n─── F. Determinismo ───');

const doce = Array.from({ length: 12 }, () => proponer([...LAT, ...COSTE, ...CAL]));
check('60 · AC · doce corridas idénticas, campo por campo', doce.every((r) => igual(r, doce[0])));
const barajado = { id: 'T', steps: [...TAREA.steps].reverse() };
check('61 · AD · barajar la entrada no cambia el resultado',
  igual(proponer([...LAT, ...COSTE, ...CAL], undefined, undefined, barajado).estrategias.map((e) => e.value.criticalPath),
        doce[0].estrategias.map((e) => e.value.criticalPath)));
check('62 · AB · el orden canónico pone la referencia primero y el respaldo al final',
  doce[0].estrategias[0].value.isBaseline === true);
for (const prohibido of ['Math.random', 'Date.now', 'fetch(', 'firebase', 'process.env']) {
  const donde = ['strategy.ts', 'strategy-engine.ts'].filter((f) => sinComentarios(leer(`functions/src/core/algorithm/${f}`)).includes(prohibido));
  check(`63 · nada de «${prohibido}»`, donde.length === 0, donde.join(',') || 'ninguno');
}

console.log('\n─── G. Propiedades ───');

let violan = 0; let sinMarcar = 0; let conBucle = 0;
for (let k = 1; k <= 8; k++) {
  const r = proponer([...LAT, ...COSTE], { maxParallel: k, maxSteps: 5 }, { maxDepth: 16 });
  for (const e of r.estrategias) {
    const ancho = Math.max(0, ...e.value.parallelGroups.map((g) => g.steps.length));
    if (ancho > k) violan++;
    if (e.value.isFallback && !e.value.fallbackFrom) sinMarcar++;
  }
  if (A.ciclosDeRespaldo(r.estrategias.map((e) => e.value)).length) conBucle++;
}
check('64 · PROPIEDAD · bajar maxParallel nunca devuelve algo que lo viole', violan === 0);
check('65 · PROPIEDAD · un respaldo siempre va marcado', sinMarcar === 0);
check('66 · PROPIEDAD · nunca sale un bucle de respaldos válido', conBucle === 0);
let sobrePresupuesto = 0;
for (let c = 1; c <= 40; c++) {
  const tope = c / 100;
  for (const e of proponer([...COSTE, ...LAT], { budget: { maxUsd: tope } }).estrategias) {
    if (typeof e.values.cost === 'number' && e.values.cost > tope) sobrePresupuesto++;
  }
}
check('67 · PROPIEDAD · bajar el presupuesto nunca permite pasarse de él', sobrePresupuesto === 0);
let invalidas = 0;
for (const r of doce) for (const e of r.estrategias) if (A.problemasDeEstrategia(e.value).length) invalidas++;
check('68 · PROPIEDAD · una estrategia inválida nunca sale como candidata', invalidas === 0);
check('69 · PROPIEDAD · los duplicados no inflan el recuento',
  dosIguales.metricas.valid === dosIguales.estrategias.length);

console.log('\n─── H. A3 propone, A1 decide ───');

const a1 = A.crearMotorDeDecision();
const conSenales = proponer([...LAT, ...COSTE, ...CAL, ...FIA]);
const decidir = (weights) => a1.decidir({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights },
  trace: { traceId: 't', requestId: 'r', userId: 'u' },
  options: conSenales.estrategias, signals: conSenales.signals,
});
const rapida = decidir({ latency: 1 });
check('70 · las estrategias de A3 entran en A1 sin traducir nada', rapida.status === 'decided', rapida.failure ?? '');
check('71 · pidiendo latencia, A1 elige la que tiene mejor camino crítico',
  rapida.selected.expected.latencyMs === 8800, String(rapida.selected.expected.latencyMs));
check('72 · pidiendo menos pasos, ninguna gana: todas tienen los mismos',
  conSenales.estrategias.every((e) => e.values.steps === 5));
check('73 · A3 NO elige: no hay puntuación ni pesos en esta capa',
  !/pesosNormalizados|puntuar\(|ordenarPorPolitica|StrategyScore/.test(sinComentarios(leer('functions/src/core/algorithm/strategy-engine.ts'))));
check('74 · y no existe ninguna función que devuelva UNA estrategia ganadora',
  !/mejorEstrategia|chooseBest|elegirEstrategia|seleccionarEstrategia/i.test(sinComentarios(leer('functions/src/core/algorithm/strategy-engine.ts'))));
check('75 · la evidencia de A3 da confianza real en A1', rapida.confidence.value > 0 && rapida.uncertainty !== 'unknown',
  `${rapida.confidence.value.toFixed(2)} · ${rapida.uncertainty}`);
check('76 · la cadena entera funciona: A2 → A3 → A1',
  rapida.selected.fromDecomposition.startsWith('T:') && rapida.selected.proposedBy === A.STRATEGY_ENGINE_REF);

console.log('\n─── I. Los veinticuatro sabotajes ───');

const FUENTES = ['strategy.ts', 'strategy-engine.ts'].map((f) => ({ f, src: leer(`functions/src/core/algorithm/${f}`) }));
/* 1–7 · meter una implementación dentro de la estrategia. */
for (const clave of ['provider', 'model', 'adapter', 'modelId', 'allowedProviders', 'excludeProviders', 'providerId']) {
  const sucia = { ...desc()[0], steps: [{ ...paso('a'), input: { [clave]: 'x' } }], tandas: [['a']] };
  const r = d3.proponer([sucia], []);
  check(`77 · SABOTAJE «${clave}» dentro de la estrategia → rechazada`,
    r.estrategias.length === 0 && r.rechazadas[0]?.reason === 'authority',
    JSON.stringify(r.rechazadas[0] ?? null));
}
/* `preferCheaper` no lo para el Planner sino el Gateway: se afirma lo que es. */
check('78 · `preferCheaper` no lo para esta frontera, y se dice con precisión',
  A.EFECTOS_PROHIBIDOS.some((e) => /Router/.test(e.dueno)) &&
  /preferCheaper/.test(leer('functions/src/core/gateway.ts')));
check('79 · la frontera es la de A0, sin segunda lista',
  leer('functions/src/core/algorithm/strategy-engine.ts').includes('violacionesDeEstrategia') &&
  leer('functions/src/core/algorithm/authority.ts').includes("import { claveDeImplementacion } from '../planner'"));
/* 8–12 · saltarse las comprobaciones. */
check('80 · SABOTAJE 8 · saltarse el DAG → una con ciclo no entra', conCiclo.estrategias.length === 0);
check('81 · SABOTAJE 9 · permitir un bucle de respaldos → se detecta', bucle.length === 1);
check('82 · SABOTAJE 10 · ignorar maxDepth → se nota',
  proponer([...LAT], undefined, { maxDepth: 2 }).rechazadas.some((r) => r.reason === 'constraint:maxDepth'));
/*
 * A2 ya filtra por maxParallel, así que A3 nunca llega a ver una que lo viole.
 * Para probar SU barrera —la segunda, la que protege a quien no pase por A2—
 * hay que entregársela directamente.
 */
const anchaDeMas = desc().find((d) => d.medidas.parallelism > 2);
check('83 · SABOTAJE 11 · ignorar maxParallel → la segunda barrera de A3 lo para',
  d3.proponer([anchaDeMas], [], { maxParallel: 2 }).rechazadas.some((r) => r.reason === 'constraint:maxParallel'),
  JSON.stringify(d3.proponer([anchaDeMas], [], { maxParallel: 2 }).rechazadas));
check('84 · SABOTAJE 12 · ignorar el presupuesto → se nota',
  proponer([...COSTE, ...LAT], { budget: { maxUsd: 0.01 } }).estrategias.length === 0);
/* 13–16 · inventar datos. */
check('85 · SABOTAJE 13 · inventar coste → hoy queda desconocido', ciega.expected.costUsd === undefined);
check('86 · SABOTAJE 14 · inventar latencia → hoy queda desconocida', ciega.expected.latencyMs === undefined);
check('87 · SABOTAJE 15 · inventar calidad → hoy queda desconocida', ciega.expected.quality === undefined);
check('88 · SABOTAJE 16 · convertir la falta de evidencia en certeza → hoy es `unknown`',
  ciega.expected.uncertainty === 'unknown' && ciega.expected.confidence.value === 0);
check('89 · SABOTAJE 17 · generar duplicados → se colapsan', dosIguales.estrategias.length === 1);
/* 18 · alterar los pasos. */
check('90 · SABOTAJE 18 · A3 no toca los pasos: son los mismos objetos que entraron',
  completo.estrategias.every((e) => igual(e.value.steps.map((s) => s.id), TAREA.steps.map((s) => s.id))) &&
  !/steps\.map\(\(s\) => \(\{/.test(sinComentarios(leer('functions/src/core/algorithm/strategy-engine.ts'))));
/* 19–24 · las fronteras de siempre. */
for (const [que, palabras] of [
  ['Router', ['crearRouter', 'RoutingDecision', 'RouterPolicy', "from '../router'"]],
  ['un proveedor', ['elevenlabs', 'gemini', 'seedance', 'openai', 'deepseek', 'adapterRun']],
  ['Credits', ['spendCredits', 'creditsBalance', 'holdCredits', 'settleCredits']],
  ['Asset', ['createAsset', 'materialesDeResultado', 'ownerId']],
]) {
  const donde = FUENTES.filter(({ src }) => palabras.some((p) => new RegExp(p, 'i').test(sinComentarios(src)))).map((x) => x.f);
  check(`91 · A3 no toca ${que}`, donde.length === 0, donde.join(',') || 'ninguno');
}
const importes = FUENTES.flatMap(({ f, src }) =>
  [...sinComentarios(src).matchAll(/from '([^']+)'/g)].map((mm) => mm[1]).filter((r) => !r.startsWith('.')).map((r) => `${f}→${r}`));
check('92 · y sigue sin importar nada de fuera del Core', importes.length === 0, importes.join(', ') || 'ninguno');
/*
 * S1.2 · Con Node y no con `grep`: el `2>/dev/null || true` hacía que en Windows
 * la búsqueda no corriera y la guarda aprobara siempre. El patrón es el de
 * siempre —el módulo de A3 y su fábrica—, que ya era preciso (`guardas.mjs`).
 */
const guarda93 = guardaDeConexion({ raiz: RAIZ, capas: CAPAS_DE_PRODUCCION, patron: PATRON_A3 });
check('93 · nadie ha conectado A3 a producción', guarda93.ok && guarda93.leidos > 50, describirHallazgos(guarda93));

console.log('\n─── J. Rendimiento ───');

const medir = (capas, ancho) => {
  const steps = []; let previa = [];
  for (let c = 0; c < capas; c++) {
    const actual = [];
    for (let k = 0; k < ancho; k++) {
      const id = `n${c}_${k}`;
      steps.push(paso(id, 'text.generate', previa.length ? [previa[k % previa.length]] : undefined));
      actual.push(id);
    }
    previa = actual;
  }
  const t = { id: 'P', steps };
  const señales = steps.flatMap((s) => [sig('step.latencyMs', s.id, 100), sig('step.costUsd', s.id, 0.01)]);
  const ds = d2.descomponer(t, { maxParallel: 4 }, { maxDepth: 32 }).opciones.map((o) => o.value);
  d3.proponer(ds, señales, undefined, { maxDepth: 32 });
  const ini = process.hrtime.bigint();
  for (let i = 0; i < 10; i++) d3.proponer(ds, señales, undefined, { maxDepth: 32 });
  return [steps.length, Number(process.hrtime.bigint() - ini) / 10 / 1e6];
};
const tiempos = [[2, 5], [4, 8], [6, 10], [8, 8]].map(([c, a]) => medir(c, a));
for (const [pasos, ms] of tiempos) console.log(`   ${String(pasos).padStart(3)} pasos → ${ms.toFixed(2)} ms`);
check('94 · una estrategia de 64 pasos se construye en menos de 100 ms',
  tiempos[3][1] < 100, `${tiempos[3][1].toFixed(2)} ms`);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA3: construye estrategias medibles, y deja decidir a A1');
process.exit(failures ? 1 : 0);
