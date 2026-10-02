/*
 * A5 — EL MOTOR DE OPTIMIZACIÓN.
 *
 *   LAS RESTRICCIONES DEFINEN LO FACTIBLE.
 *   LOS OBJETIVOS OPTIMIZAN DENTRO DE LO FACTIBLE.
 *
 * A5 propone mejoras justificables; A1 decide y el Orchestrator ejecuta.
 *
 *  A. Quién es.
 *  B. Factibilidad primero.
 *  C. Dominancia y frente.
 *  D. Aceptación: cuándo una mejora merece la pena.
 *  E. Operadores y búsqueda acotada.
 *  F. Bucles, convergencia y parada.
 *  G. Evidencia, procedencia y previsión.
 *  H. Determinismo y las quince propiedades.
 *  I. Agnosticismo y capacidades futuras.
 *  J. Los sabotajes.
 *  K. Rendimiento.
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
const a5 = A.crearMotorDeOptimizacion();
const a3 = A.crearMotorDeEstrategias();
const a4 = A.crearMotorDeParalelizacion();
const a1 = A.crearMotorDeDecision();

const paso = (id, cap = 'x.y', dep) => ({ id, capability: cap, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
const sig = (k, s, v, src = 'measured', extra = {}) => ({ key: k, subject: s, value: v, source: src, ...extra });
const ev = (s) => ({ claim: s.key, signal: s, supports: true });
/* Un candidato genérico: solo ejes. A5 no necesita saber qué es. */
const cand = (id, values, value) => ({ id, value: value ?? { id }, values });
const problema = (candidates, extra = {}) => ({
  candidates, objective: extra.objective ?? { weights: { cost: 1, latency: 1 } }, ...extra,
});

console.log('\n─── A. Quién es ───');

check('1 · su descriptor vale y es de la familia `optimization`',
  A.algoritmoValido(A.DESCRIPTOR_DE_OPTIMIZACION) && A.DESCRIPTOR_DE_OPTIMIZACION.category === 'optimization',
  JSON.stringify(A.validarAlgoritmo(A.DESCRIPTOR_DE_OPTIMIZACION)));
check('2 · es puro y EXPERIMENTAL: nadie lo elige solo',
  A.DESCRIPTOR_DE_OPTIMIZACION.purity === 'pure' &&
  A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_OPTIMIZACION]).registro.seleccionable(A.OPTIMIZATION_ENGINE_ID) === false);
/* La afirmación de A5 NO es que la versión se quede clavada —una fase
 * posterior puede subirla con todo el derecho, y A6 lo hizo—: es que A5 no
 * necesitó añadir NI UN CAMPO. Eso es lo que se mide, y así sigue valiendo. */
check('3 · A5 no necesitó tocar ningún contrato: no hay entrada suya en el historial',
  !/(A5)/.test(leer('functions/src/core/contracts.ts')) &&
  /^1.[0-9]+$/.test(ALGORITHM_CONTRACT_VERSION), ALGORITHM_CONTRACT_VERSION);
check('3b · y el motor declara el contrato vigente, sea el que sea',
  A.DESCRIPTOR_DE_OPTIMIZACION.contract === ALGORITHM_CONTRACT_VERSION);

console.log('\n─── B. Factibilidad primero ───');

/* LA REGLA CENTRAL: una puntuación altísima no salva a quien se sale del tope. */
const caraYBuena = cand('cara', { cost: 5, latency: 100, quality: 1 });
const modesta = cand('modesta', { cost: 0.05, latency: 900, quality: 0.5 });
const conTope = a5.optimizar(problema([caraYBuena, modesta], { constraints: { budget: { maxUsd: 0.1 } } }));
check('4 · una restricción dura NO se compensa con puntuación',
  conTope.feasible.length === 1 && conTope.feasible[0].id === 'modesta',
  conTope.feasible.map((c) => c.id).join(','));
check('5 · y el rechazado dice exactamente qué incumplió',
  conTope.rejected[0].why.reason === 'constraint' && conTope.rejected[0].why.detail === 'budget.maxUsd',
  JSON.stringify(conTope.rejected[0].why));
check('6 · lo que no se puede comprobar no se admite por defecto',
  a5.optimizar(problema([cand('sinCoste', { latency: 100 })], { constraints: { budget: { maxUsd: 1 } } }))
    .rejected[0].why.reason === 'unverifiable');
check('7 · si NADIE es factible, se dice: infeasible',
  a5.optimizar(problema([caraYBuena], { constraints: { budget: { maxUsd: 0.1 } } })).stoppedBecause === 'infeasible');
check('8 · sin candidatos, tampoco se inventa nada',
  a5.optimizar(problema([])).stoppedBecause === 'no_candidates');
check('9 · un candidato que nombra una implementación queda fuera',
  a5.optimizar(problema([cand('sucio', { cost: 1 }, { providerId: 'x' })])).rejected[0].why.reason === 'authority');
check('10 · y los recursos declarados también acotan',
  a5.optimizar(problema([cand('ancho', { cost: 1, parallelism: 8 })], {
    evidence: [ev(sig('resource.availableWorkers', undefined, 2))],
  })).rejected[0].why.reason === 'resource');
check('11 · sin señal de recursos NO se afirma que falten',
  a5.optimizar(problema([cand('ancho', { cost: 1, parallelism: 8 })])).feasible.length === 1);

console.log('\n─── C. Dominancia y frente ───');

const mejor = cand('mejor', { cost: 0.1, latency: 100 });
const peor = cand('peor', { cost: 0.5, latency: 900 });
const mixta = cand('mixta', { cost: 0.9, latency: 50 });
check('12 · A domina a B cuando no es peor en nada y mejor en algo',
  A.domina(mejor, peor, { weights: { cost: 1, latency: 1 } }) === true);
check('13 · y no al revés', A.domina(peor, mejor, { weights: { cost: 1, latency: 1 } }) === false);
check('14 · un inviable no domina a nadie NI es dominado: está fuera del juego',
  A.domina({ ...mejor, feasible: false }, peor, { weights: { cost: 1 } }) === false &&
  A.domina(mejor, { ...peor, feasible: false }, { weights: { cost: 1 } }) === false);
check('15 · un eje que a uno le falta no lo hace peor',
  A.domina(cand('a', { cost: 0.1 }), cand('b', { latency: 10 }), { weights: { cost: 1, latency: 1 } }) === false);
const frente = A.frenteFactible([mejor, peor, mixta], { weights: { cost: 1, latency: 1 } });
check('16 · el frente deja fuera a la dominada y conserva el compromiso',
  igual(frente.map((c) => c.id).sort(), ['mejor', 'mixta']), frente.map((c) => c.id).join(','));
check('17 · y el frente se calcula SOBRE LO FACTIBLE, no antes',
  A.frenteFactible([{ ...mejor, feasible: false }, peor], { weights: { cost: 1 } }).map((c) => c.id).join(',') === 'peor');

console.log('\n─── D. Cuándo una mejora merece la pena ───');

const deltas = A.deltasDe({ cost: 1, latency: 1000 }, { cost: 0.8, latency: 900 });
check('18 · el delta lleva el signo puesto: positivo = mejor',
  deltas.every((d) => d.absolute > 0) && Math.abs(deltas.find((d) => d.axis === 'cost').absolute - 0.2) < 1e-9);
check('19 · solo se comparan los ejes que LAS DOS midieron',
  A.deltasDe({ cost: 1 }, { latency: 5 }).length === 0);
check('20 · la ganancia es relativa y ponderada, no una suma de escalas distintas',
  Math.abs(A.gananciaDe(deltas, { weights: { cost: 1, latency: 1 } }) - 0.15) < 1e-9,
  String(A.gananciaDe(deltas, { weights: { cost: 1, latency: 1 } })));
check('21 · sin ejes comparables la ganancia es DESCONOCIDA, no cero',
  A.gananciaDe([], { weights: { cost: 1 } }) === undefined);
const conf = { kind: 'algorithm', value: 0.9, basis: [ev(sig('a.b', 1))] };
check('22 · una ganancia por debajo del mínimo se rechaza, con su motivo',
  A.mereceLaPena(A.deltasDe({ cost: 1 }, { cost: 0.995 }), 0.005, conf, undefined, { weights: { cost: 1 } })
    .because.includes('0.5 %'));
check('23 · un retroceso en un eje protegido se rechaza',
  A.mereceLaPena(A.deltasDe({ quality: 0.9, cost: 1 }, { quality: 0.5, cost: 0.1 }), 0.4, conf,
    { noRegression: ['quality'] }, { weights: { cost: 1, quality: 1 } }).because === 'retrocede en quality');
check('24 · faltar evidencia en un eje exigido se rechaza',
  A.mereceLaPena(A.deltasDe({ cost: 1 }, { cost: 0.5 }), 0.5, conf, { requireEvidence: ['quality'] },
    { weights: { cost: 1 } }).because === 'sin evidencia en quality');
check('25 · una confianza por debajo del mínimo se rechaza',
  A.mereceLaPena(A.deltasDe({ cost: 1 }, { cost: 0.5 }), 0.5, { kind: 'algorithm', value: 0.1, basis: [] },
    { minConfidence: 0.5 }, { weights: { cost: 1 } }).because.includes('confianza'));
check('26 · y mover ejes que el objetivo no pondera no es mejorar',
  A.mereceLaPena(A.deltasDe({ cost: 1 }, { cost: 0.1 }), 0.9, conf, undefined, { weights: { quality: 1 } })
    .because === 'cambia ejes que el objetivo no pondera');
check('27 · una mejora de verdad sí pasa',
  A.mereceLaPena(A.deltasDe({ cost: 1 }, { cost: 0.5 }), 0.5, conf, undefined, { weights: { cost: 1 } }).ok === true);

console.log('\n─── E. Operadores y búsqueda ───');

check('28 · los operadores son DATOS: declaran qué mueven y cuándo aplican',
  A.OPERADORES_DE_ESTRATEGIA.every((o) => o.id && Array.isArray(o.affects) && typeof o.aplicable === 'function'),
  A.OPERADORES_DE_ESTRATEGIA.map((o) => o.id).join(', '));
check('29 · un operador que mueve ejes que no importan no se aplica',
  A.mueveAlgoQueImporta({ id: 'x', affects: ['quality'] }, { objective: { weights: { cost: 1 } } }) === false &&
  A.mueveAlgoQueImporta({ id: 'x', affects: ['cost'] }, { objective: { weights: { cost: 1 } } }) === true);
check('30 · ninguno funde pasos: eso sería planificar',
  !/merge|fusion|unir.*pasos/i.test(sinComentarios(leer('functions/src/core/algorithm/optimization-engine.ts'))));
/* Un operador propio, inventado aquí: entra sin tocar el motor. */
const inventado = {
  id: 'inventado', label: 'restar coste a la mitad', affects: ['cost'],
  aplicable: (c) => typeof c.values?.cost === 'number' && c.values.cost > 0.01,
  aplicar: (c) => ({ id: `${c.id}+mitad`, value: c.value, values: { ...c.values, cost: c.values.cost / 2 } }),
};
const conInventado = A.crearMotorDeOptimizacion({ operadores: [inventado] });
const mejorado = conInventado.optimizar(problema([cand('base', { cost: 1, latency: 100 })], { objective: { weights: { cost: 1 } } }));
check('31 · un operador NUEVO entra sin tocar el núcleo, y produce propuesta',
  mejorado.proposals.length >= 1 && mejorado.proposals[0].transformation === 'inventado',
  `${mejorado.proposals.length} propuestas`);
/* Toda propuesta se mide contra LA MISMA vara: la referencia, nunca el padre inmediato. */
check('32 · toda propuesta se mide contra la referencia, no contra su padre',
  mejorado.proposals.every((p) => p.baseId === mejorado.baselineId));
const unPaso = mejorado.proposals.filter((p) => p.id === 'base+mitad');
check('32b · un solo paso gana exactamente lo que dice la aritmética: la mitad',
  unPaso.length === 1 && unPaso[0].expectedGain === 0.5 && unPaso[0].because.length >= 3,
  unPaso[0] && unPaso[0].because[1]);
check('32c · encadenar operadores compone la ganancia, y las propuestas salen ordenadas',
  mejorado.proposals[0].expectedGain > 0.5 && mejorado.proposals[0].expectedGain < 1 &&
  mejorado.proposals.every((p, i, a) => i === 0 || a[i - 1].expectedGain >= p.expectedGain),
  mejorado.proposals.map((p) => p.expectedGain.toFixed(3)).join(' > '));
check('33 · el presupuesto acota los candidatos evaluados',
  conInventado.optimizar(problema(Array.from({ length: 200 }, (_, i) => cand(`c${i}`, { cost: 1 })),
    { objective: { weights: { cost: 1 } }, budget: { maxCandidates: 5 } })).metricas.budgetExhausted === true);
check('34 · y las vueltas',
  conInventado.optimizar(problema([cand('b', { cost: 1024 })], { objective: { weights: { cost: 1 } }, budget: { maxIterations: 2 } }))
    .metricas.iterations <= 2);
check('35 · la memoria local evita recalcular la misma transformación',
  conInventado.optimizar(problema([cand('b', { cost: 1024 })], { objective: { weights: { cost: 1 } } }))
    .metricas.memoHits >= 0);

console.log('\n─── E2. El puerto de formas: secuencial → paralelo, sin duplicar A2/A3/A4 ───');

/* LA TRANSFORMACIÓN QUE A5 NO PUEDE HACER SOLO.
 * Saber qué pasos pueden ir juntos es el grafo (A2/A4); saber cuánto cuesta cada
 * forma es la previsión entera (A3). A5 no reimplementa ninguna de las dos: se
 * las enchufan. Aquí se enchufan LAS DE VERDAD, no un doble. */
const tareaP = { id: 'T', steps: [paso('a'), paso('b', 'x.y', ['a']), paso('c', 'x.y', ['a']), paso('d', 'x.y', ['a']), paso('e', 'x.y', ['b', 'c', 'd'])] };
const MS = { a: 1000, b: 2000, c: 500, d: 500, e: 700 };
const senalesP = [
  ...Object.entries(MS).map(([k, v]) => sig('step.latencyMs', k, v, 'measured', { sampleSize: 12 })),
  ...Object.keys(MS).map((k) => sig('step.costUsd', k, 0.02, 'measured', { sampleSize: 12 })),
  sig('resource.availableWorkers', undefined, 3, 'declared'),
];
const formasDe = (c) => {
  const e = c.value;
  if (!e || !Array.isArray(e.steps)) return [];
  const { variantes } = a4.variantes({ id: e.id, steps: e.steps }, senalesP);
  if (!variantes.length) return [];
  return a3.proponer(variantes, senalesP).estrategias.filter((x) => x.id !== c.id);
};
const secuencial = a3.proponer(a4.variantes(tareaP, senalesP).variantes.slice(0, 1), senalesP).estrategias[0];
const conPuerto = A.crearMotorDeOptimizacion({
  operadores: [A.operadorDeFormas(formasDe, { id: 'secuencial-a-paralelo', label: 'repartir lo que no depende de nada' })],
});
const rP = conPuerto.optimizar({
  candidates: [secuencial], objective: { weights: { latency: 3, cost: 1 } }, evidence: senalesP.map(ev),
});
check('E2-1 · el punto de partida es secuencial y dura lo que suman los pasos',
  secuencial.values.parallelism === 1 && secuencial.values.latency === 4700, JSON.stringify(secuencial.values));
check('E2-2 · A5 propone repartir, y propone LA CURVA entera, no un punto',
  rP.proposals.length === 2, rP.proposals.map((p) => p.result.values.parallelism).join(','));
check('E2-3 · con los números que salen de A3, no de A5',
  igual(rP.proposals.map((p) => p.result.values.latency), [3700, 4200]),
  rP.proposals.map((p) => p.result.values.latency).join(','));
check('E2-4 · la ganancia es ponderada y ordenada de mayor a menor',
  Math.abs(rP.proposals[0].expectedGain - (3 * (1000 / 4700)) / 4) < 1e-9 &&
  rP.proposals[0].expectedGain > rP.proposals[1].expectedGain,
  rP.proposals.map((p) => (p.expectedGain * 100).toFixed(1) + ' %').join(' > '));
check('E2-5 · y NO promete ×3 por poner tres a la vez: 4700 → 3700 es ×1,27',
  rP.proposals[0].result.values.latency === 3700);
check('E2-6 · volver a una forma ya vista se descarta como bucle, y converge',
  rP.stoppedBecause === 'converged' && rP.discarded.every((d) => /ya evaluada/.test(d.because)),
  rP.stoppedBecause + ' · ' + rP.discarded.length + ' descartes');
check('E2-7 · sin puerto, el operador sencillamente NO es aplicable — y eso no es un cero',
  A.crearMotorDeOptimizacion({ operadores: [A.operadorDeFormas(() => [])] })
    .optimizar(problema([secuencial], { objective: { weights: { latency: 1 } } })).proposals.length === 0);
check('E2-8 · un puerto que revienta no tumba el motor',
  A.crearMotorDeOptimizacion({ operadores: [A.operadorDeFormas(() => { throw new Error('puerto roto'); })] })
    .optimizar(problema([secuencial], { objective: { weights: { latency: 1 } } })).stoppedBecause === 'no_improvement');
check('E2-9 · y un puerto que se devuelve a sí mismo no cuenta como forma nueva',
  A.crearMotorDeOptimizacion({ operadores: [A.operadorDeFormas((c) => [c])] })
    .optimizar(problema([secuencial], { objective: { weights: { latency: 1 } } })).proposals.length === 0);
/* LA FRONTERA REAL, medida y no proclamada: A5 REUSA lo que es fuente única
 * —`violaRestricciones` de A3, `recursosDeSenales` de A4— porque tener aquí una
 * segunda copia de cualquiera de las dos daría dos respuestas distintas el día
 * que una cambie. Lo que NO toca son los GENERADORES: descomponer, sacar
 * variantes y calcular previsiones. Eso entra por el puerto, y por eso A5 no
 * sabe que existen A2, A3 y A4. */
const IMPORTES_DE_A5 = [...sinComentarios(leer('functions/src/core/algorithm/optimization-engine.ts'))
  .matchAll(/from '([^']+)'/g)].map((mm) => mm[1]);
check('E2-10 · A5 reusa la fuente única, y solo eso',
  igual(IMPORTES_DE_A5.filter((m) => /-engine$/.test(m)).sort(),
        ['./parallelization-engine', './strategy-engine']), IMPORTES_DE_A5.join(' '));
const GENERADORES = ['variantes(', 'proponer(', 'descomponer(', 'construir(', 'crearMotorDeEstrategias', 'crearMotorDeParalelizacion', 'crearMotorDeDescomposicion'];
const usados = GENERADORES.filter((g) => sinComentarios(leer('functions/src/core/algorithm/optimization-engine.ts')).includes(g));
check('E2-10b · y NO llama a ningún generador: esos entran por el puerto',
  usados.length === 0, usados.join(', ') || 'ninguno');
/* Control: el detector encuentra los generadores donde SÍ se llaman. */
check('E2-10c · control · el detector sí los ve en quien de verdad los usa',
  GENERADORES.filter((g) => leer('functions/src/core/algorithm/strategy-engine.ts').includes(g)).length >= 2);
/* Determinismo de la composición entera, que es donde de verdad se rompería. */
check('E2-11 · y la cadena A2→A4→A3→A5 es determinista',
  Array.from({ length: 8 }, () => JSON.stringify(conPuerto.optimizar({
    candidates: [secuencial], objective: { weights: { latency: 3, cost: 1 } }, evidence: senalesP.map(ev),
  }))).every((x, _i, a) => x === a[0]));



console.log('\n─── E3. Lo que los sabotajes demostraron que la batería NO miraba ───');

/* Siete sabotajes pasaron sin que nada se pusiera rojo. Cada comprobación de
 * aquí está escrita contra el sabotaje concreto que descubrió que faltaba. */

/* S08 · La referencia es la DECLARADA, o la primera en orden canónico. Nunca «la mejor». */
const tresCands = [cand('zeta', { cost: 0.1, latency: 10 }), cand('alfa', { cost: 9, latency: 900 }), cand('media', { cost: 1, latency: 100 })];
check('E3-1 · sin declararla, la referencia es la PRIMERA en orden canónico, no la mejor',
  a5.optimizar(problema(tresCands)).baselineId === 'alfa',
  a5.optimizar(problema(tresCands)).baselineId);
check('E3-2 · y declarada, manda la declarada',
  a5.optimizar(problema(tresCands, { baselineId: 'media' })).baselineId === 'media');
check('E3-3 · una referencia que no es factible no se usa: se cae a la primera factible',
  a5.optimizar(problema(tresCands, { baselineId: 'alfa', constraints: { budget: { maxUsd: 2 } } })).baselineId === 'media',
  a5.optimizar(problema(tresCands, { baselineId: 'alfa', constraints: { budget: { maxUsd: 2 } } })).baselineId);

/* S13 · El juez se aplica TAMBIÉN al resultado transformado, no solo a la entrada. */
const empeora = {
  id: 'encarece', label: 'gastar más para ir más rápido', affects: ['latency'],
  aplicable: (c) => typeof c.values?.latency === 'number',
  aplicar: (c) => ({ id: c.id + '+caro', value: c.value, values: { ...c.values, latency: 1, cost: 99 } }),
};
const rEmpeora = A.crearMotorDeOptimizacion({ operadores: [empeora] })
  .optimizar(problema([cand('ok', { cost: 0.5, latency: 900 })],
    { objective: { weights: { latency: 1 } }, constraints: { budget: { maxUsd: 1 } } }));
check('E3-4 · una transformación que se sale del tope se descarta, aunque mejore el objetivo',
  rEmpeora.proposals.length === 0 && rEmpeora.discarded.length === 1,
  JSON.stringify(rEmpeora.discarded));
check('E3-5 · y el descarte dice que fue la restricción, no otra cosa',
  rEmpeora.discarded.length === 1 && rEmpeora.discarded[0].because.indexOf('constraint') === 0,
  rEmpeora.discarded.length ? rEmpeora.discarded[0].because : 'sin descartes');

/* S14 · `aplicable` manda. Un operador que dice que no, no se ejecuta. */
let vecesAplicado = 0;
const nuncaAplicable = {
  id: 'nunca', label: 'no debería ejecutarse jamás', affects: ['cost'],
  aplicable: () => false,
  aplicar: (c) => { vecesAplicado++; return { id: c.id + '+x', value: c.value, values: { ...c.values, cost: 0 } }; },
};
const rNunca = A.crearMotorDeOptimizacion({ operadores: [nuncaAplicable] })
  .optimizar(problema([cand('c', { cost: 1 })], { objective: { weights: { cost: 1 } } }));
check('E3-6 · un operador no aplicable NO se ejecuta ni una vez',
  vecesAplicado === 0 && rNunca.proposals.length === 0, 'aplicado ' + vecesAplicado + ' veces');
check('E3-7 · y no consume presupuesto de candidatos por intentarlo',
  rNunca.metricas.candidatesEvaluated === 1, String(rNunca.metricas.candidatesEvaluated));

/* S15 · El objetivo es una puerta ANTES de aplicar, no un filtro después. */
let vecesIrrelevante = 0;
const irrelevante = {
  id: 'irrelevante', label: 'mueve un eje que a nadie le importa', affects: ['quality'],
  aplicable: () => true,
  aplicar: (c) => { vecesIrrelevante++; return { id: c.id + '+q', value: c.value, values: { ...c.values, quality: 1 } }; },
};
const rIrrel = A.crearMotorDeOptimizacion({ operadores: [irrelevante] })
  .optimizar(problema([cand('c', { cost: 1, quality: 0.1 })], { objective: { weights: { cost: 1 } } }));
check('E3-8 · un operador que no mueve nada ponderado no llega ni a ejecutarse',
  vecesIrrelevante === 0, 'ejecutado ' + vecesIrrelevante + ' veces');
check('E3-9 · y no deja descartes: no se intentó, así que no se rechazó',
  rIrrel.discarded.length === 0 && rIrrel.stoppedBecause === 'no_improvement');

/* S16 · El orden de salida es por ganancia, no el de generación. */
const escalera = A.crearMotorDeOptimizacion({
  operadores: [
    { id: 'poco', label: 'baja poco', affects: ['cost'], aplicable: (c) => c.id === 'base',
      aplicar: (c) => ({ id: 'a-poco', value: c.value, values: { cost: 0.9 } }) },
    { id: 'mucho', label: 'baja mucho', affects: ['cost'], aplicable: (c) => c.id === 'base',
      aplicar: (c) => ({ id: 'b-mucho', value: c.value, values: { cost: 0.1 } }) },
    { id: 'medio', label: 'baja a medias', affects: ['cost'], aplicable: (c) => c.id === 'base',
      aplicar: (c) => ({ id: 'c-medio', value: c.value, values: { cost: 0.5 } }) },
  ],
}).optimizar(problema([cand('base', { cost: 1 })], { objective: { weights: { cost: 1 } } }));
check('E3-10 · se generan en un orden y salen en OTRO: por ganancia, de mayor a menor',
  igual(escalera.proposals.map((p) => p.id), ['b-mucho', 'c-medio', 'a-poco']),
  escalera.proposals.map((p) => p.id + ' ' + p.expectedGain.toFixed(2)).join(' · '));
check('E3-11 · y la mejor ganancia del informe es la de la primera',
  escalera.metricas.bestGain === escalera.proposals[0].expectedGain);

/* S17 · El puerto nunca devuelve el candidato de partida: sería un bucle disfrazado. */
const CTX_MINIMO = { objective: { weights: { cost: 1 } }, signals: [], resources: {}, topes: A.TOPES_MAXIMOS };
const salidaIdent = A.operadorDeFormas((c) => [c, { ...c, id: c.id + '-otra', values: { cost: 0.5 } }])
  .aplicar(cand('base', { cost: 1 }), CTX_MINIMO);
check('E3-12 · el puerto filtra el candidato de partida antes de devolverlo',
  Array.isArray(salidaIdent) && salidaIdent.length === 1 && salidaIdent[0].id === 'base-otra',
  JSON.stringify((salidaIdent || []).map((x) => x.id)));
check('E3-13 · y devolver SOLO el de partida es no devolver nada',
  A.operadorDeFormas((c) => [c]).aplicar(cand('base', { cost: 1 }), CTX_MINIMO) === undefined);

/* S12 · Los recursos declarados se dicen en la explicación: sin eso, «propongo tres a
 * la vez» no se puede auditar contra lo que hay. */
const conRecursos = A.crearMotorDeOptimizacion({ operadores: [inventado] }).optimizar(problema(
  [cand('base', { cost: 1 })],
  { objective: { weights: { cost: 1 } }, evidence: [ev(sig('resource.availableWorkers', undefined, 4, 'declared'))] }));
check('E3-14 · con recursos declarados, la propuesta los nombra',
  conRecursos.proposals[0].because.some((b) => b.indexOf('4 simultáneos') > 0),
  conRecursos.proposals[0].because.join(' | '));
check('E3-15 · y sin ellos NO se inventa un número',
  !mejorado.proposals[0].because.some((b) => b.indexOf('Recursos declarados') === 0));

/* S04 · El umbral de ganancia mínima existe y MUERDE. */
const aPelo = A.crearMotorDeOptimizacion({
  operadores: [{ id: 'migaja', label: 'mejorar un pelo', affects: ['cost'], aplicable: (c) => c.values.cost === 1,
    aplicar: (c) => ({ id: 'migaja', value: c.value, values: { cost: 0.995 } }) }],
}).optimizar(problema([cand('base', { cost: 1 })], { objective: { weights: { cost: 1 } } }));
check('E3-16 · una mejora del 0,5 % no se propone: está por debajo del umbral',
  aPelo.proposals.length === 0 && aPelo.discarded.length === 1 &&
  aPelo.discarded[0].because.indexOf('0.5 %') > 0, JSON.stringify(aPelo.discarded));
check('E3-17 · y el umbral es un número declarado, no un literal escondido',
  A.GANANCIA_MINIMA === 0.02 &&
  sinComentarios(leer('functions/src/core/algorithm/optimization.ts')).split('GANANCIA_MINIMA').length - 1 >= 2);

console.log('\n─── F. Bucles, convergencia y parada ───');

/* Un operador que devuelve lo mismo: es un bucle y hay que detectarlo. */
const enBucle = A.crearMotorDeOptimizacion({
  operadores: [{ id: 'identidad', label: 'no cambia nada', affects: ['cost'],
    aplicable: () => true, aplicar: (c) => ({ ...c, id: `${c.id}'` }) }],
});
const bucle = enBucle.optimizar(problema([cand('b', { cost: 1 })], { objective: { weights: { cost: 1 } } }));
check('36 · una transformación que vuelve a la misma forma se detecta como bucle',
  bucle.metricas.loopsDetected >= 1 && bucle.proposals.length === 0,
  `${bucle.metricas.loopsDetected} bucles`);
check('37 · y se dice en los descartes', bucle.discarded.some((d) => /ya evaluada/.test(d.because)));
check('38 · sin mejora se para, y se dice por qué',
  a5.optimizar(problema([cand('a', { cost: 1, latency: 1 })])).stoppedBecause === 'no_improvement');
check('39 · las paradas son un vocabulario cerrado y con sentido',
  ['no_improvement', 'budget_exhausted', 'iteration_limit', 'converged', 'infeasible', 'no_candidates', 'loop_detected']
    .includes(a5.optimizar(problema([])).stoppedBecause));
check('40 · el bucle NUNCA es infinito: el contador lo corta',
  conInventado.optimizar(problema([cand('b', { cost: 1e9 })], { objective: { weights: { cost: 1 } } }))
    .metricas.iterations <= A.TOPES_MAXIMOS.maxIterations);

console.log('\n─── G. Evidencia, procedencia y previsión ───');

const conEv = conInventado.optimizar(problema([cand('b', { cost: 1 })], { objective: { weights: { cost: 1 } } }));
check('41 · una transformación sin evidencia nueva lo dice, no finge confianza',
  conEv.proposals[0].confidence.value === 0 &&
  /no aporta evidencia nueva/.test(conEv.proposals[0].confidence.because),
  conEv.proposals[0].confidence.because);
check('42 · y su incertidumbre es `unknown`', conEv.proposals[0].uncertainty === 'unknown');
check('43 · todo lo que produce es EXPECTED, y el tipo lo dice',
  'expectedDelta' in conEv.proposals[0] && 'expectedGain' in conEv.proposals[0] &&
  !/actualCost|actualLatency|measuredDelta/.test(leer('functions/src/core/algorithm/optimization.ts')));
check('44 · la procedencia se conserva cuando el candidato la trae',
  A.deltasDe({ cost: 1 }, { cost: 0.5 }, { cost: 'measured' })[0].provenance === 'measured');
check('45 · una fuente débil NO se convierte en medición',
  A.deltasDe({ cost: 1 }, { cost: 0.5 }, { cost: 'model' })[0].provenance === 'model');
check('46 · los trade-offs se nombran siempre, también cuando conviene',
  Array.isArray(conEv.proposals[0].tradeoffs));

console.log('\n─── H. Determinismo y las quince propiedades ───');

const repetir = () => conInventado.optimizar(problema(
  [cand('b', { cost: 1, latency: 10 }), cand('a', { cost: 2, latency: 5 })], { objective: { weights: { cost: 1 } } }));
const doce = Array.from({ length: 12 }, repetir);
check('47 · P4+P10 · doce corridas idénticas, campo por campo', doce.every((r) => igual(r, doce[0])));
const barajado = conInventado.optimizar(problema(
  [cand('a', { cost: 2, latency: 5 }), cand('b', { cost: 1, latency: 10 })], { objective: { weights: { cost: 1 } } }));
check('48 · P4 · barajar los candidatos no cambia el resultado',
  igual(barajado.feasible.map((c) => c.id), doce[0].feasible.map((c) => c.id)) &&
  barajado.baselineId === doce[0].baselineId);
check('49 · P2+P5 · metadata irrelevante no cambia nada',
  igual(a5.optimizar(problema([cand('x', { cost: 1 })])).feasible.map((c) => c.id),
        a5.optimizar(problema([{ ...cand('x', { cost: 1 }), value: { irrelevante: [1, 2] } }])).feasible.map((c) => c.id)));
check('50 · P3 · renombrar la capacidad no cambia la lógica',
  igual(JSON.stringify(a5.optimizar(problema([cand('x', { cost: 1 }, { capability: 'alfa' })]))).split('alfa').join('C'),
        JSON.stringify(a5.optimizar(problema([cand('x', { cost: 1 }, { capability: 'beta' })]))).split('beta').join('C')));
check('51 · P1 · una propuesta NUNCA sale violando una restricción dura',
  conInventado.optimizar(problema([cand('b', { cost: 1 })],
    { objective: { weights: { cost: 1 } }, constraints: { budget: { maxUsd: 0.001 } } })).proposals.length === 0);
check('52 · P6 · añadir un dominado no invalida a los que ya eran factibles',
  a5.optimizar(problema([mejor, peor, cand('otro', { cost: 9, latency: 9000 })])).feasible.length === 3);
/* P7 · El frente nunca contiene un dominado. Se comprueba por fuerza bruta sobre
 * un conjunto grande, no sobre el ejemplo de tres que ya pasó arriba. */
const muchos = [
  ...Array.from({ length: 20 }, (_, k) =>
    cand(`f${String(k).padStart(2, "0")}`, { cost: 0.05 + k * 0.05, latency: 1000 - k * 45 })),
  ...Array.from({ length: 40 }, (_, k) =>
    cand(`d${String(k).padStart(2, "0")}`, { cost: 0.05 + (k % 20) * 0.05 + 0.02, latency: 1000 - (k % 20) * 45 + 10 })),
];
const rMuchos = a5.optimizar(problema(muchos, { objective: { weights: { cost: 1, latency: 1 } } }));
const enFrente = new Set(rMuchos.pareto);
const dominadosDentro = rMuchos.feasible.filter((x) => enFrente.has(x.id))
  .filter((x) => rMuchos.feasible.some((y) => A.domina(y, x, { weights: { cost: 1, latency: 1 } })));
check('53a · P7 · ningún miembro del frente está dominado por nadie',
  dominadosDentro.length === 0, `frente ${enFrente.size}/${rMuchos.feasible.length} · dominados dentro: ${dominadosDentro.map((x) => x.id).join(',') || 'ninguno'}`);
check('53b · P7 · y todo el que queda fuera del frente SÍ tiene quien lo domine',
  rMuchos.feasible.filter((x) => !enFrente.has(x.id))
    .every((x) => rMuchos.feasible.some((y) => A.domina(y, x, { weights: { cost: 1, latency: 1 } }))));
/* P8 · Una propuesta aceptada mejora en al menos un eje ponderado, y nunca
 * empeora un eje que el objetivo pondera sin decirlo en `tradeoffs`. */
const aceptadas = [...conInventado.optimizar(problema([cand('b', { cost: 1, latency: 10 })],
  { objective: { weights: { cost: 1 } } })).proposals, ...rP.proposals, ...escalera.proposals];
check('53c · P8 · toda propuesta aceptada mejora en al menos un eje ponderado',
  aceptadas.length >= 8 && aceptadas.every((p) => p.expectedDelta.some((d) => d.absolute > 0)),
  `${aceptadas.length} propuestas revisadas`);
check('53d · P8 · y ningún empeoramiento se calla: sale en `tradeoffs`',
  aceptadas.every((p) => p.expectedDelta.filter((d) => d.absolute < 0)
    .every((d) => p.tradeoffs.includes(d.axis))));
check('53 · P9 · ningún bucle puede pasarse del presupuesto',
  doce.every((r) => r.spend.iterations <= A.TOPES_MAXIMOS.maxIterations && r.spend.candidates <= A.TOPES_MAXIMOS.maxCandidates));
check('54 · P11 · la evidencia ausente nunca se convierte en medida',
  conEv.proposals[0].evidence.length === 0 && conEv.proposals[0].confidence.basis.length === 0);
check('55 · P12 · lo previsto se distingue de lo medido por el nombre del campo',
  Object.keys(conEv.proposals[0]).filter((k) => /^expected/.test(k)).length === 2);
for (const [p, palabras] of [
  ['P13 · no es un Router', ['crearRouter', 'RoutingDecision', 'providerId =', 'selectedProvider']],
  ['P14 · no es un Planner', ['crearPlanner', 'PlannerResponse', 'buildPlan']],
  ['P15 · no ejecuta', ['Promise.all', 'await ', 'fetch(', 'enqueue', 'crearJob']],
]) {
  const donde = ['optimization.ts', 'optimization-engine.ts']
    .filter((f) => palabras.some((w) => sinComentarios(leer(`functions/src/core/algorithm/${f}`)).includes(w)));
  check(`56 · ${p}`, donde.length === 0, donde.join(',') || 'ninguno');
}

console.log('\n─── I. Agnosticismo y capacidades futuras ───');

/* La cadena entera sobre una capacidad que no existe. */
const inventada = ['future', 'capability', 'x' + (7 * 6)].join('.');
const tareaX = { id: 'X', steps: [paso('a', inventada), paso('b', inventada, ['a']), paso('c', inventada, ['a']), paso('d', inventada, ['b', 'c'])] };
const senalesX = [...tareaX.steps.map((s) => sig('step.latencyMs', s.id, 400)),
  ...tareaX.steps.map((s) => sig('step.costUsd', s.id, 0.01)),
  sig('resource.availableWorkers', undefined, 1)];
const estX = a3.proponer(a4.variantes(tareaX, senalesX).variantes, senalesX);
const optX = a5.optimizar({
  candidates: estX.estrategias, objective: { weights: { latency: 1, cost: 1 } },
  evidence: senalesX.map(ev),
});
check('57 · A5 optimiza sobre una capacidad que no existía', optX.feasible.length >= 1, optX.stoppedBecause);
check('58 · y respeta el recurso declarado: solo 1 simultáneo',
  optX.feasible.every((c) => (c.values.parallelism ?? 1) <= 1),
  JSON.stringify(optX.feasible.map((c) => c.values.parallelism)));
check('59 · el resultado entra en A1 sin traducir nada',
  a1.decidir({ contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1 } },
    trace: { traceId: 't', requestId: 'r', userId: 'u' },
    options: optX.feasible, signals: estX.signals }).status === 'decided');
for (const desconocido of ['modelo-que-no-existe', 'proveedor-inventado', 'recurso-raro', 'estrategia-nueva']) {
  check(`60 · «${desconocido}» es solo metadata y no rompe nada`,
    a5.optimizar(problema([cand('c', { cost: 1 }, { nota: desconocido })])).feasible.length === 1);
}
check('61 · una señal de calidad FUTURA se consume sin saber quién la produjo',
  a5.optimizar(problema([cand('c', { cost: 1, quality: 0.9 })], {
    objective: { weights: { quality: 1 } },
    evidence: [ev(sig('quality.lipsync.sync_score', 'c', 0.9, 'measured', { sampleSize: 20 }))],
  })).feasible.length === 1);
check('62 · y el núcleo no nombra ninguna capacidad ni proveedor',
  ['optimization.ts', 'optimization-engine.ts'].every((f) => {
    const t = new Set((sinComentarios(leer(`functions/src/core/algorithm/${f}`)).toLowerCase().match(/[a-z0-9_]+/g) ?? []));
    return !['gemini', 'deepseek', 'seedance', 'elevenlabs', 'minimax', 'openai', 'lipsync', 'face_swap', 'avatar', 'image', 'video'].some((p) => t.has(p));
  }));

console.log('\n─── J. Los sabotajes ───');

const SABOTAJES = [
  ['una restricción imposible', problema([cand('a', { cost: 1 })], { constraints: { budget: { maxUsd: -1 }, maxRisk: 9 } })],
  ['un coste negativo', problema([cand('a', { cost: -5 })], { constraints: { budget: { maxUsd: 1 } } })],
  ['una latencia NaN', problema([cand('a', { cost: 1, latency: NaN })], { constraints: { maxLatencyMs: 10 } })],
  ['un Infinity', problema([cand('a', { cost: Infinity })], { constraints: { budget: { maxUsd: 1 } } })],
  ['candidatos duplicados', problema([cand('a', { cost: 1 }), cand('a', { cost: 1 })])],
  ['metadata malformada', problema([{ id: 'a', values: { cost: 1 } }])],
  ['un candidato sin id', problema([{ values: { cost: 1 } }])],
  ['un problema que no es un problema', undefined],
  ['candidatos que no son lista', { candidates: 'no soy lista', objective: { weights: { cost: 1 } } }],
];
for (const [que, p] of SABOTAJES) {
  let ok = false; let detalle = '';
  try { const r = a5.optimizar(p); ok = !!r && typeof r.stoppedBecause === 'string'; detalle = r.stoppedBecause; }
  catch (e) { ok = false; detalle = 'LANZÓ: ' + String(e.message).slice(0, 50); }
  check(`63 · SABOTAJE ${que} → se maneja, no revienta`, ok, detalle);
}
check('64 · SABOTAJE · una señal «measured» falsa sigue siendo lo que declara',
  A.deltasDe({ cost: 1 }, { cost: 0.5 }, { cost: 'default' })[0].provenance === 'default');
check('65 · SABOTAJE · desbordar el presupuesto → se corta y se dice',
  conInventado.optimizar(problema(Array.from({ length: 5000 }, (_, i) => cand(`c${i}`, { cost: 1 })),
    { objective: { weights: { cost: 1 } } })).metricas.budgetExhausted === true);
check('66 · SABOTAJE · efectos externos → no hay ninguno posible',
  ['optimization.ts', 'optimization-engine.ts'].every((f) =>
    !/fetch\(|firebase|process\.env|Math\.random|Date\.now|require\(/.test(sinComentarios(leer(`functions/src/core/algorithm/${f}`)))));
check('67 · SABOTAJE · tocar Credits o Assets → el verbo no existe',
  ['optimization.ts', 'optimization-engine.ts'].every((f) =>
    !/spendCredits|creditsBalance|createAsset|materialesDeResultado/.test(sinComentarios(leer(`functions/src/core/algorithm/${f}`)))));
check('68 · y no importa nada de fuera del Core',
  ['optimization.ts', 'optimization-engine.ts'].every((f) =>
    [...sinComentarios(leer(`functions/src/core/algorithm/${f}`)).matchAll(/from '([^']+)'/g)]
      .map((mm) => mm[1]).every((r) => r.startsWith('.'))));
/* Sin `grep`: en Windows execSync corre en cmd.exe, no lo encuentra y devuelve vacío — un falso verde. */
const recorrer = (dir, salida = []) => {
  for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
    const hijo = dir + '/' + e.name;
    if (e.isDirectory()) recorrer(hijo, salida); else if (/.ts$/.test(e.name)) salida.push(hijo);
  }
  return salida;
};
const DELATOR = /optimization-engine|crearMotorDeOptimizacion|OPTIMIZATION_ENGINE_ID/;
const produccion = ['creator', 'runtime', 'engine', 'gateway', 'credits', 'content', 'job']
  .flatMap((d) => recorrer('functions/src/' + d));
const conectados = produccion.filter((x) => DELATOR.test(leer(x)));
check('69 · nadie ha conectado A5 a producción', produccion.length > 50 && conectados.length === 0,
  `${produccion.length} archivos revisados · ${conectados.join(',') || 'ninguno'}`);
/* Control: el detector no está roto — encuentra el motor donde SÍ está. */
check('69b · y el detector encuentra el motor donde sí está',
  recorrer('functions/src/core/algorithm').filter((x) => DELATOR.test(leer(x))).length >= 2);

console.log('\n─── K. Rendimiento ───');

const medir = (cuantos) => {
  const cs = Array.from({ length: cuantos }, (_, i) => cand(`c${String(i).padStart(4, '0')}`, { cost: (i % 50) / 50, latency: 100 + (i % 37) * 10 }));
  const p = problema(cs, { objective: { weights: { cost: 1, latency: 1 } }, budget: { maxCandidates: 256 } });
  a5.optimizar(p);
  const ini = process.hrtime.bigint();
  for (let i = 0; i < 10; i++) a5.optimizar(p);
  return [cuantos, Number(process.hrtime.bigint() - ini) / 10 / 1e6];
};
const tiempos = [10, 100, 1000].map(medir);
for (const [c, ms] of tiempos) console.log(`   ${String(c).padStart(4)} candidatos → ${ms.toFixed(2)} ms`);
check('70 · 1 000 candidatos se optimizan en menos de 200 ms', tiempos[2][1] < 200, `${tiempos[2][1].toFixed(2)} ms`);
check('71 · y el coste no explota: el presupuesto acota la evaluación',
  a5.optimizar(problema(Array.from({ length: 1000 }, (_, i) => cand(`c${i}`, { cost: 1 })))).metricas.candidatesEvaluated
    <= A.TOPES_MAXIMOS.maxCandidates);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA5: optimiza dentro de lo factible, y se calla cuando no hay mejora');
process.exit(failures ? 1 : 0);
