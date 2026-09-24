/*
 * A9 — LA FRONTERA DE INTEGRACIÓN: A0–A8 COMO UN CICLO.
 *
 *   ¿Puede Weë tomar una decisión, generar alternativas, evaluarlas, elegir
 *    una estrategia, entregarla, verificar lo que salió y aprender de ello,
 *    SIN duplicar ninguna autoridad?
 *
 * Todo sintético y local: una capacidad inventada, un ejecutor inventado, un
 * evaluador inventado. Ni un proveedor, ni una red, ni un reloj del sistema.
 *
 *  A. Quién es: una capa de composición, no un algoritmo.
 *  B. No duplica: cada autoridad, llamada directamente, da LO MISMO.
 *  C. La petición y la composición.
 *  D. A8 → A1.
 *  E. A1 → A2: el enfoque.
 *  F. A2 → A3.
 *  G. A3 → A4 / A5 → A1.
 *  H. La frontera del Router.
 *  I. A6: verificación.
 *  J. A7: aprendizaje.
 *  K. El ciclo completo.
 *  L. La segunda pasada.
 *  M. Sin política automática.
 *  N. Las deudas, declaradas.
 *  O. Agnosticismo.
 *  P. Determinismo.
 *  Q. Autoridad.
 *  R. Rendimiento.
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
const tokens = (src) => new Set((sinComentarios(src).toLowerCase().match(/[a-z0-9_]+/g) ?? []));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const A = lib('core/algorithm/index.js');
const { ALGORITHM_CONTRACT_VERSION, contratoCompatible } = lib('core/contracts.js');
const FUENTES = ['integration.ts', 'integration-cycle.ts'].map((f) => `functions/src/core/algorithm/${f}`);
const src9 = FUENTES.map((f) => sinComentarios(leer(f))).join('\n');

const HORA = 3_600_000;
const DIA = 86_400_000;
const T0 = 1_700_000_000_000;
const T1 = T0 + 30 * DIA;
/* La capacidad, construida en ejecución: ni siquiera aparece entera en el código. */
const CAP = ['future', 'synthetic', 'capability'].join('.');
const POL = { ventanaMs: 4 * DIA };

const paso = (id, dep, cap = CAP) => ({ id, capability: cap, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
const tareaDe = (cap = CAP, id = 'T') => ({ id, steps: [paso('a', undefined, cap), paso('b', ['a'], cap), paso('c', ['a'], cap), paso('d', ['b', 'c'], cap)] });
const TAREA = tareaDe();
const TAREA_CORTA = { id: 'C', steps: [paso('a'), paso('d', ['a'])] };
const senalesDe = (t) => t.steps.flatMap((s) => [
  { key: 'step.latencyMs', subject: s.id, value: 300, source: 'measured', sampleSize: 20 },
  { key: 'step.costUsd', subject: s.id, value: 0.01, source: 'measured', sampleSize: 20 },
]);
const SENALES = senalesDe(TAREA);

/*
 * EL EVALUADOR SINTÉTICO, por el puerto de A6: lee la puntuación que el
 * ejecutor sintético dejó en la salida. Sin puntuación, no evalúa —devuelve
 * nada—, que es el «no se pudo mirar» honesto.
 */
const EVALUADOR = {
  id: 'evaluador.sintetico',
  supports: (c) => c.type.startsWith('quality.'),
  evaluate: (c, ctx) => {
    const p = ctx.resultado.outputs?.[0]?.metadata?.puntuacion;
    if (typeof p !== 'number') return undefined;
    return { status: p >= 0.8 ? 'pass' : 'fail', value: p, because: `sintético ${p}`,
      evidence: [{ claim: 'quality', supports: p >= 0.8,
        signal: { key: 'quality.sintetica', subject: c.subject, value: p, source: 'measured', sampleSize: 9 } }] };
  },
};
const ciclo = A.crearCicloAlgoritmico({ evaluadores: [EVALUADOR] });

const decisionBase = (extra = {}) => ({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1, reliability: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' }, signals: SENALES, ...extra,
});
const EXPECTED = [{ kind: 'text', quality: { minScore: 0.8 } }];
const peticion = (extra = {}) => ({
  decision: decisionBase(),
  tarea: TAREA,
  expected: EXPECTED,
  aprendido: { ahora: T1, scope: { capability: CAP }, learned: [], learningPolicy: POL },
  componer: { paralelizar: true, optimizar: true },
  ...extra,
});

/*
 * EL EJECUTOR SINTÉTICO. Es el único sitio donde «se ejecuta» algo, y está en
 * la prueba, no en A9: simula los cuatro desenlaces que el ciclo tiene que
 * saber cerrar.
 */
const DESENLACE = {
  success: { status: 'succeeded', puntuacion: 0.9 },
  partial_success: { status: 'succeeded', puntuacion: 0.5 },
  failure: { status: 'failed' },
  unknown: { status: 'unknown', puntuacion: null },
};
const observar = (i, clase, at, extra = {}) => {
  const x = DESENLACE[clase];
  const outputs = 'puntuacion' in x
    ? [{ kind: 'text', ref: `ref://${i}`, ...(typeof x.puntuacion === 'number' ? { metadata: { puntuacion: x.puntuacion } } : {}) }]
    : [];
  return { kind: clase, at, actual: { id: `ejec_${i}`, status: x.status, outputs },
    signals: [{ key: 'result.latencyMs', value: 1000 + (i % 3) * 10, source: 'measured', at }], ...extra };
};

/* Las autoridades, llamadas DIRECTAMENTE, para comparar. */
const a1 = A.crearMotorDeDecision();
const a2 = A.crearMotorDeDescomposicion();
const a3 = A.crearMotorDeEstrategias();
const a4 = A.crearMotorDeParalelizacion();
const a5 = A.crearMotorDeOptimizacion();
const a6 = A.crearMotorDeVerificacion({ evaluadores: [EVALUADOR] });
const a6r = A.crearMotorDeRecuperacion();
const a7 = A.crearMotorDeFeedback();
const a8 = A.crearMotorDeContexto();
const comoEvidencia = (ss) => ss.map((s) => ({ claim: s.key, signal: s, supports: true }));
/* Una petición rota tiene que dar un DIAGNÓSTICO, no una excepción: si revienta, lo que se prueba falla aquí, no la suite entera. */
const sinReventar = (fn) => { try { return fn(); } catch (e) { return { lanzo: String(e?.message ?? e) }; } };

console.log('\n─── A. Quién es ───');

check('1 · la frontera existe: `crearCicloAlgoritmico` con `decidir` y `cerrar`, y nada más',
  typeof A.crearCicloAlgoritmico === 'function' && igual(Object.keys(ciclo).sort(), ['cerrar', 'decidir']));
check('2 · NO es un algoritmo: no se registra ni trae descriptor',
  !/AlgorithmDescriptor|DESCRIPTOR_DE|algoritmoValido|crearRegistroDeAlgoritmos/.test(src9));
check('3 · y no inventa una familia: las categorías siguen siendo las de A0',
  !A.CATEGORIAS.some((c) => /integra|ciclo|cycle|orquest/.test(c)), A.CATEGORIAS.length + ' categorías');
check('4 · A9 NO sube el contrato: compone con el 1.6 y solo añade tipos suyos',
  contratoCompatible(ALGORITHM_CONTRACT_VERSION, '1.6') && !/\(A9\)/.test(leer('functions/src/core/contracts.ts')),
  ALGORITHM_CONTRACT_VERSION);
const R = ciclo.decidir(peticion());
check('5 · el resultado lleva la versión del contrato con el que se compuso', R.contract === ALGORITHM_CONTRACT_VERSION);

console.log('\n─── B. No duplica: cada autoridad, llamada directamente, da LO MISMO ───');

for (const f of ['crearMotorDeDecision', 'crearMotorDeDescomposicion', 'crearMotorDeParalelizacion', 'crearMotorDeEstrategias',
  'crearMotorDeOptimizacion', 'crearMotorDeVerificacion', 'crearMotorDeRecuperacion', 'crearMotorDeFeedback', 'crearMotorDeContexto']) {
  check(`6 · usa ${f}, una vez`, (src9.match(new RegExp(`${f}\\b`, 'g')) ?? []).length === 2, 'importación y llamada');
}
for (const [que, patron] of [
  ['su propia puntuación', /pesosNormalizados\(|puntuar\(|ordenarAlternativas/], ['su propio DAG', /validarDAG\(|tandasAcotadas\(|medidasDe\(/],
  ['su propia previsión', /combinar\(|step\.latencyMs|ejesDeEstrategia\(/], ['su propia factibilidad', /violaRestricciones\(|juezPorDefecto/],
  ['su propia verificación', /fusionarEstados\(|resolverEstructural/], ['su propio aprendizaje', /acumular\(|guardas\(|frescura|tramo/],
  ['su propia selección de contexto', /encajeDeAmbito\(|ejeDeMetrica\(|ESTADO_DE_MOTIVO/], ['su propia recuperación', /PropuestaDeRecuperacion|clasificarFallo/],
]) check(`7 · y NO trae ${que}`, !patron.test(src9));

/* La cadena, reconstruida a mano con las autoridades, contra la del ciclo. */
const d0 = decisionBase();
const ctx8 = a8.seleccionar({ ahora: T1, scope: { capability: CAP }, learned: [], learningPolicy: POL, objective: d0.objective });
const dec2 = a2.descomponer(TAREA);
const var4 = a4.variantes(TAREA, SENALES);
const est3 = a3.proponer(var4.variantes, SENALES);
const opt5 = a5.optimizar({ candidates: est3.estrategias, objective: d0.objective, evidence: comoEvidencia(SENALES),
  baselineId: est3.estrategias.find((c) => c.value.isBaseline).id });
const dec1 = a1.decidir({ ...d0, options: [...opt5.feasible, ...opt5.proposals.map((p) => p.result)], signals: est3.signals });
check('8 · A8 en el ciclo = A8 directo', igual(R.context, ctx8));
check('9 · A2 en el ciclo = A2 directo', igual(R.decomposition, dec2));
check('10 · A4 en el ciclo = A4 directo', igual(R.parallelization, var4.analisis));
check('11 · A3 en el ciclo = A3 directo', igual(R.strategies, est3));
check('12 · A5 en el ciclo = A5 directo', igual(R.optimization, opt5));
check('13 · A1 en el ciclo = A1 directo: la decisión es de A1, byte a byte', igual(R.decision, dec1));

console.log('\n─── C. La petición y la composición ───');

const soloOpciones = (extra = {}) => ({
  decision: decisionBase({ options: [
    { id: 'o1', value: { nombre: 'uno' }, values: { latency: 500, reliability: 0.9 } },
    { id: 'o2', value: { nombre: 'dos' }, values: { latency: 700, reliability: 0.99 } }] }),
  ...extra,
});
check('14 · decisión trivial: solo A1, y se entrega la elegida',
  igual(ciclo.decidir(soloOpciones()).recorrido, ['decision', 'handoff']) && ciclo.decidir(soloOpciones()).entrega.elegida === 'o1');
check('15 · con contexto aprendido, A8 va delante',
  igual(ciclo.decidir(soloOpciones({ aprendido: { ahora: T1, scope: { capability: CAP }, learned: [] } })).recorrido, ['context', 'decision', 'handoff']));
check('16 · una tarea sin composición: A2 → A3 → A1, y ni A4 ni A5 corren porque sí',
  igual(ciclo.decidir(peticion({ componer: undefined, aprendido: undefined })).recorrido, ['decomposition', 'strategy', 'decision', 'handoff']));
check('17 · `paralelizar` añade A4 y nada más',
  igual(ciclo.decidir(peticion({ componer: { paralelizar: true }, aprendido: undefined })).recorrido, ['decomposition', 'parallelization', 'strategy', 'decision', 'handoff']));
check('18 · `optimizar` añade A5 y nada más',
  igual(ciclo.decidir(peticion({ componer: { optimizar: true }, aprendido: undefined })).recorrido, ['decomposition', 'strategy', 'optimization', 'decision', 'handoff']));
check('19 · todo pedido: el recorrido completo, en el orden de los contratos',
  igual(R.recorrido, ['context', 'decomposition', 'parallelization', 'strategy', 'optimization', 'decision', 'handoff']));
const ambigua = ciclo.decidir(peticion({ decision: decisionBase({ options: soloOpciones().decision.options }) }));
check('20 · alternativas por dos caminos: se para, y no corre NADA',
  ambigua.status === 'invalid' && ambigua.parada === 'ambiguous_alternatives' && ambigua.recorrido.length === 0);
const dosHistoriales = ciclo.decidir(peticion({ decision: decisionBase({ history: { sampleSize: 3, succeeded: 3 } }) }));
check('21 · un historial declarado y otro pedido a A8: se para',
  dosHistoriales.parada === 'history_twice' && dosHistoriales.recorrido.length === 0);
check('21b · CONTROL · el historial declarado solo, sin A8, sí se acepta',
  ciclo.decidir(peticion({ aprendido: undefined, decision: decisionBase({ history: { sampleSize: 3, succeeded: 3 } }) })).status === 'decided');
check('22 · sin decisión no hay nada que perseguir: `malformed_request`, y dicho, no reventado',
  [undefined, {}, { decision: null }].every((p) => sinReventar(() => ciclo.decidir(p)).parada === 'malformed_request'));
const nada = ciclo.decidir({ decision: decisionBase() });
check('23 · sin ninguna alternativa, lo dice A1 —no A9—: indecisa',
  nada.status === 'undecided' && nada.parada === 'undecided' && nada.decision.failure === 'insufficient_evidence');

console.log('\n─── D. A8 → A1 ───');

check('24 · primera vez, sin nada aprendido: A8 dice `no_evidence` y A1 no recibe historial',
  R.context.cierre === 'no_evidence' && R.historial === undefined);
const sinReloj = ciclo.decidir(peticion({ aprendido: { scope: { capability: CAP }, learned: [] } }));
check('25 · A8 rechaza sin reloj, y el ciclo NO decide como si tuviera contexto',
  sinReloj.status === 'invalid' && sinReloj.parada === 'context_rejected' && igual(sinReloj.recorrido, ['context']) && !sinReloj.decision);
for (const [que, scope] of [['una cuenta', { capability: CAP, account: 'u1' }], ['un campo de persona', { capability: CAP, country: 'PE' }]]) {
  const r = ciclo.decidir(peticion({ aprendido: { ahora: T1, scope, learned: [] } }));
  check(`26 · A8 no contesta para ${que}, y el ciclo tampoco decide en su lugar`,
    r.parada === 'context_refused' && igual(r.recorrido, ['context']) && !r.decision);
}
check('27 · CONTROL · el mismo ámbito sin eso, sí',
  ciclo.decidir(peticion({ aprendido: { ahora: T1, scope: { capability: CAP }, learned: [] } })).status === 'decided');

console.log('\n─── E. A1 → A2: el enfoque ───');

const ENFOQUES = [
  { id: 'enfoque-completo', value: TAREA, values: { latency: 1200, reliability: 0.95 } },
  { id: 'enfoque-corto', value: TAREA_CORTA, values: { latency: 900, reliability: 0.7 } },
];
const conEnfoques = ciclo.decidir(peticion({ tarea: undefined, enfoques: ENFOQUES }));
check('28 · primero A1 elige el ENFOQUE, luego A2 estructura el elegido',
  igual(conEnfoques.recorrido, ['context', 'approach', 'decomposition', 'parallelization', 'strategy', 'optimization', 'decision', 'handoff']));
check('29 · la elección de enfoque es de A1, igual que llamándolo directamente',
  igual(conEnfoques.approach, a1.decidir({ ...decisionBase(), options: ENFOQUES })));
check('30 · y A2 descompone EXACTAMENTE la tarea elegida',
  igual(conEnfoques.decomposition, a2.descomponer(conEnfoques.approach.selected)) &&
  conEnfoques.entrega.plan.steps.every((s) => conEnfoques.approach.selected.steps.some((x) => x.id === s.id)));
const enfoquesImposibles = ciclo.decidir(peticion({ tarea: undefined, aprendido: undefined,
  decision: decisionBase({ constraints: { maxLatencyMs: 100 } }), enfoques: ENFOQUES }));
check('31 · si A1 no elige enfoque, no hay nada que estructurar: se para ahí',
  enfoquesImposibles.parada === 'approach_undecided' && igual(enfoquesImposibles.recorrido, ['approach']), enfoquesImposibles.approach?.failure);
const TAREA_CICLICA = { id: 'X', steps: [paso('a', ['b']), paso('b', ['a'])] };
const ciclica = ciclo.decidir(peticion({ tarea: TAREA_CICLICA, aprendido: undefined }));
check('32 · una tarea con un ciclo la rechaza A2, y ahí se acaba',
  ciclica.status === 'invalid' && ciclica.parada === 'invalid_task' && igual(ciclica.recorrido, ['decomposition']) &&
  igual(ciclica.decomposition, a2.descomponer(TAREA_CICLICA)), ciclica.decomposition.problemas.map((p) => p.reason).join(','));

console.log('\n─── F. A2 → A3 ───');

const sinParalelo = ciclo.decidir(peticion({ componer: {}, aprendido: undefined }));
check('33 · sin paralelismo, A3 recibe las formas de A2',
  igual(sinParalelo.strategies, a3.proponer(a2.descomponer(TAREA).opciones.map((o) => o.value), SENALES)));
check('34 · con paralelismo, las variantes de A4, que son la autoridad sobre la forma paralela',
  igual(R.strategies, a3.proponer(a4.variantes(TAREA, SENALES).variantes, SENALES)));
check('35 · y A3 es quien marca baseline y previsiones: A9 no toca ninguna',
  R.strategies.estrategias.some((c) => c.value.isBaseline) && R.strategies.estrategias.every((c) => typeof c.value.expected.latencyMs === 'number'));

console.log('\n─── G. A3 → A4 / A5 → A1 ───');

/* Un trabajador disponible: una señal de RECURSO, no una restricción. */
const unTrabajador = decisionBase({ signals: [...SENALES, { key: 'resource.availableWorkers', value: 1, source: 'declared' }] });
const conA5 = ciclo.decidir(peticion({ decision: unTrabajador, aprendido: undefined }));
const sinA5 = ciclo.decidir(peticion({ decision: unTrabajador, aprendido: undefined, componer: { paralelizar: true } }));
check('36 · A5 declara inviable lo que pide más recursos de los que hay',
  conA5.optimization.rejected.some((x) => x.id === 'T:par2:estrategia'), JSON.stringify(conA5.optimization.rejected.map((x) => x.id)));
check('37 · y A1 NUNCA ve lo inviable: decide entre lo que A5 dejó en pie',
  !conA5.decision.candidates.some((c) => c.id === 'T:par2:estrategia') && conA5.entrega.plan.id === 'T:par1:estrategia');
check('38 · CONTROL · sin A5, A1 sí lo ve y lo elige: la factibilidad era de A5 y solo de A5',
  sinA5.decision.candidates.some((c) => c.id === 'T:par2:estrategia') && sinA5.entrega.plan.id === 'T:par2:estrategia');
/* Una tarea ancha: seis ramas. Aquí A5 PROPONE una mejora. */
const RAMAS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
const ANCHA = { id: 'W', steps: [paso('o'), ...RAMAS.map((r) => paso(r, ['o'])), paso('z', RAMAS)] };
const SEN_ANCHA = ANCHA.steps.flatMap((s) => [
  { key: 'step.latencyMs', subject: s.id, value: 300, source: 'measured', sampleSize: 20 },
  { key: 'step.reliability', subject: s.id, value: 0.99, source: 'measured', sampleSize: 20 }]);
const ancha = ciclo.decidir({ decision: decisionBase({ signals: SEN_ANCHA }), tarea: ANCHA, componer: { paralelizar: true, optimizar: true } });
check('39 · A5 propone, y su propuesta entra en A1 como una alternativa más',
  ancha.optimization.proposals.length >= 1 &&
  ancha.optimization.proposals.every((p) => ancha.decision.candidates.some((c) => c.id === p.result.id)),
  JSON.stringify(ancha.optimization.proposals.map((p) => p.result.id)));
check('40 · y quien ELIGE entre lo propuesto y lo de antes sigue siendo A1',
  ancha.entrega.plan === ancha.decision.selected && typeof ancha.decision.selectedScore?.total === 'number', ancha.entrega.plan.id);
/*
 * UN HALLAZGO DE LA INTEGRACIÓN, y no se corrige aquí: A3 y A5 (con
 * `violaRestricciones`) solo dan por incumplida una restricción si el valor está
 * MEDIDO; A1 marca la calidad no medida como no verificable. Juzgan distinto lo
 * mismo. En el ciclo decide A1 el último, así que gana la lectura conservadora.
 */
const calidadSinMedir = ciclo.decidir(peticion({ aprendido: undefined, decision: decisionBase({ constraints: { quality: { minScore: 0.8 } } }) }));
check('41a · HALLAZGO · con la calidad sin medir, A5 la da por factible y A1 la rechaza por no verificable',
  calidadSinMedir.optimization.rejected.length === 0 && calidadSinMedir.optimization.feasible.length === 2 &&
  calidadSinMedir.decision.candidates.every((c) => !c.eligible && c.reason === 'unverifiable:quality.minScore'),
  'A3/A5 y A1 juzgan distinto la misma restricción: es de ellos, no de A9');
check('41b · y el ciclo acaba INDECISO: decide A1 el último, y no saber no es cumplir',
  calidadSinMedir.status === 'undecided' && calidadSinMedir.parada === 'undecided' && !calidadSinMedir.entrega);
check('41 · ni A4 ni A5 nombran una implementación: no hay A4 → proveedor ni A5 → Router',
  A.violacionesEn(ancha.parallelization, 'a4').length === 0 && A.violacionesEn(ancha.optimization, 'a5').length === 0);

console.log('\n─── H. La frontera del Router ───');

const plan = R.entrega.plan;
check('42 · el plan son los pasos del PLANNER, tal cual: A9 no inventa ni cambia uno',
  plan.steps.length === TAREA.steps.length && plan.steps.every((s) => igual(s, TAREA.steps.find((x) => x.id === s.id))));
check('43 · cada paso dice qué CAPACIDAD necesita: lo único sobre lo que el Router elige',
  plan.steps.every((s) => typeof s.capability === 'string' && s.capability.length > 0));
check('44 · y NADA en la entrega nombra una implementación',
  A.violacionesEn(R.entrega, 'entrega').length === 0 &&
  !JSON.stringify(R.entrega).match(/"(providerId|modelId|adapterId|implementation|allowedProviders)"/));
const conRequisitos = ciclo.decidir(peticion({ decision: decisionBase({ constraints: { budget: { maxUsd: 1 }, maxLatencyMs: 5000 } }) }));
check('45 · los requisitos de ejecución viajan tal cual: presupuesto y plazo, que el Router sí sabe leer',
  igual(conRequisitos.entrega?.constraints, { budget: { maxUsd: 1 }, maxLatencyMs: 5000 }), conRequisitos.parada ?? '');
const conProveedor = ciclo.decidir(peticion({ decision: decisionBase({ constraints: { providerId: 'p-favorito' } }) }));
check('46 · una restricción que nombra proveedor NO cruza: `authority_violation`',
  conProveedor.status === 'invalid' && conProveedor.parada === 'authority_violation' && !conProveedor.entrega);
check('46b · y es la ÚNICA causa: todo lo demás decidió',
  conProveedor.decision?.status === 'decided' && !conProveedor.recorrido.includes('handoff'));
const conModelo = ciclo.decidir(peticion({ expected: [{ kind: 'text', metadata: { modelId: 'm-favorito' } }] }));
check('47 · ni un modelo escondido en lo esperado', conModelo.parada === 'authority_violation');
check('48 · A9 no importa al Router, ni al Orchestrator, ni al Job Engine, ni al Gateway, ni al Brain',
  ![...src9.matchAll(/from '([^']+)'/g)].some((m) => /router|orchestrator|job|gateway|brain|planner/.test(m[1])));
check('49 · y no consume `paraRouter`: esa evidencia es del Router el día que puntúe con ella',
  !/paraRouter/.test(src9));

console.log('\n─── I. A6: verificación ───');

const CIERRES = Object.fromEntries(Object.keys(DESENLACE).map((k) => [k, ciclo.cerrar(R, observar(0, k, T1 + HORA), { ahora: T1 + HORA, policy: POL })]));
for (const [clase, a6esperado, recuperacion] of [
  ['success', 'pass', 'nothing_to_recover'], ['partial_success', 'partial', 'proposed'],
  ['failure', 'fail', 'proposed'], ['unknown', 'unknown', 'proposed']]) {
  const c = CIERRES[clase];
  check(`50 · ${clase} → A6 dice «${a6esperado}» y la recuperación «${recuperacion}»`,
    c.status === 'closed' && c.verification.status === a6esperado && c.recovery.stoppedBecause === recuperacion,
    `${c.verification.status} · ${c.recovery.stoppedBecause}: ${c.recovery.proposals.map((p) => p.kind).join(',') || '—'}`);
}
check('51 · el veredicto es de A6, igual que llamándolo directamente',
  igual(CIERRES.partial_success.verification, a6.verificar({ expected: EXPECTED, actual: observar(0, 'partial_success', T1 + HORA).actual })));
check('52 · y la recuperación, de A6, con lo que la decisión ya sabía: sus alternativas y si había respaldo',
  igual(CIERRES.failure.recovery, a6r.analizar(CIERRES.failure.verification, {
    alternatives: R.decision.alternatives.map((v) => R.decision.candidates.find((c) => c.value === v).id),
    hasFallback: R.strategies.estrategias.some((c) => c.value.isFallback === true) })));
check('53 · «no se pudo mirar» es `unknown`, no un aprobado ni un suspenso: verificar otra vez',
  CIERRES.unknown.recovery.proposals.some((p) => p.kind === 'verify_again'));
check('54 · A9 no ejecuta ninguna recuperación: solo se aprende de la que ejecutó quien ejecuta',
  CIERRES.failure.outcome.recovery === undefined &&
  ciclo.cerrar(R, observar(1, 'failure', T1, { recovery: { kind: 'retry', executed: true, succeeded: true } })).outcome.recovery.executed === true);
check('55 · cerrar lo que no se decidió no tiene sentido: `not_decided`, dicho y no reventado',
  sinReventar(() => ciclo.cerrar(nada, observar(0, 'success', T1))).parada === 'not_decided' &&
  sinReventar(() => ciclo.cerrar(undefined, observar(0, 'success', T1))).parada === 'not_decided');
for (const [que, obs] of [
  ['una clase inventada', { ...observar(0, 'success', T1), kind: 'estupendo' }],
  ['sin resultado', { ...observar(0, 'success', T1), actual: undefined }],
  ['sin fecha', { ...observar(0, 'success', T1), at: NaN }]]) {
  const c = sinReventar(() => ciclo.cerrar(R, obs));
  check(`56 · una observación ${que} no se cierra: ni A6 ni A7 la ven`,
    c.status === 'invalid' && c.parada === 'malformed_observation' && !c.verification && !c.learning, c.lanzo ?? c.because?.join(' '));
}
check('56b · CONTROL · la misma observación bien formada, sí', ciclo.cerrar(R, observar(0, 'success', T1)).status === 'closed');

console.log('\n─── J. A7: aprendizaje ───');

const exito = CIERRES.success;
check('57 · el resultado habla el idioma de A7: la clase la dice quien ejecutó, el veredicto es de A6 tal cual',
  exito.outcome.kind === 'success' && exito.outcome.verification.status === exito.verification.status &&
  exito.outcome.verification.passed === exito.verification.passed && exito.outcome.id === 'ejec_0');
/*
 * CADA HECHO, DE SU DUEÑO. El ejecutor dice cómo ACABÓ; A6 dice si CUMPLE. Aquí
 * no coinciden a propósito: el ejecutor dice «éxito» y la salida no llega a la
 * calidad pedida. En los cuatro desenlaces de arriba coincidían, y así una
 * mezcla de las dos cosas no se veía.
 */
const exitoQueNoCumple = ciclo.cerrar(R, { ...observar(5, 'success', T1), actual: observar(5, 'partial_success', T1).actual });
check('57b · el ejecutor dice «éxito» y A6 dice que no cumple: la clase es del ejecutor, el veredicto de A6',
  exitoQueNoCumple.outcome.kind === 'success' && exitoQueNoCumple.verification.status === 'partial' &&
  exitoQueNoCumple.outcome.verification.passed === false && exitoQueNoCumple.outcome.verification.status === 'partial');
check('57c · y en los cuatro desenlaces la clase es la que dijo quien ejecutó, nunca una deducida del veredicto',
  Object.keys(DESENLACE).every((k) => CIERRES[k].outcome.kind === k));
check('58 · y se aprende en el ámbito en que se DECIDIÓ, sin añadirle nada',
  igual(exito.outcome.scope, { capability: CAP }));
check('59 · el aprendizaje es de A7, igual que llamándolo directamente',
  igual(exito.learning, a7.aprender({ ahora: T1 + HORA, policy: POL, outcomes: [exito.outcome] })));
check('60 · sin reloj de aprendizaje, no se aprende: y no se inventa uno',
  ciclo.cerrar(R, observar(0, 'success', T1)).learning === undefined);
check('61 · con un reloj que no vale, A7 lo rechaza y el ciclo lo dice',
  ciclo.cerrar(R, observar(0, 'success', T1), { ahora: NaN }).learning.rechazo === 'clock_invalid');

console.log('\n─── K. El ciclo completo ───');

/*
 * A8 → A1 (enfoque) → A2 → A4 → A3 → A5 → A1 → entrega → [ejecución fuera]
 *    → A6 → A7 → A8 → A1. Con una capacidad inventada, de principio a fin.
 */
const vuelta = (learned, ahora) => {
  const r = ciclo.decidir(peticion({ tarea: undefined, enfoques: ENFOQUES, aprendido: { ahora, scope: { capability: CAP }, learned, learningPolicy: POL } }));
  const c = ciclo.cerrar(r, observar(0, 'success', ahora + HORA), { ahora: ahora + HORA, previo: learned, policy: POL });
  return { r, c };
};
const v1 = vuelta([], T1);
check('62 · el ciclo entero recorre A8, A1, A2, A4, A3, A5, A1 y la entrega',
  igual(v1.r.recorrido, ['context', 'approach', 'decomposition', 'parallelization', 'strategy', 'optimization', 'decision', 'handoff']));
check('63 · y cierra: A6 verifica y A7 aprende',
  v1.c.status === 'closed' && v1.c.verification.status === 'pass' && v1.c.learning.aggregates.length === 3);
check('64 · lo aprendido vuelve a entrar: la siguiente decisión lo lee por A8',
  vuelta(v1.c.learning.aggregates, T1 + 2 * HORA).r.context.metricas.recibidas === 3);
check('65 · la misma entrada dos veces, el mismo resultado', igual(vuelta([], T1), v1));

console.log('\n─── L. La segunda pasada ───');

/* Primera pasada: sin nada aprendido. Se ejecuta 40 veces a lo largo de 40 horas. */
const primera = ciclo.decidir(peticion());
let aprendido = [];
for (let i = 0; i < 40; i++) {
  const at = T1 + (i + 1) * HORA;
  const c = ciclo.cerrar(primera, observar(i, i % 20 === 7 ? 'failure' : 'success', at), { ahora: at, previo: aprendido, policy: POL });
  aprendido = c.learning.aggregates;
}
const T2 = T1 + 41 * HORA;
const segunda = ciclo.decidir(peticion({ aprendido: { ahora: T2, scope: { capability: CAP }, learned: aprendido, learningPolicy: POL } }));
check('66 · primera pasada: sin evidencia histórica, y A1 decide con la de siempre',
  primera.context.cierre === 'no_evidence' && primera.historial === undefined && primera.status === 'decided');
check('67 · tras cuarenta ejecuciones, A7 tiene lo aprendido en el ámbito de la decisión',
  aprendido.every((a) => a.n === 40 && igual(a.scope, { capability: CAP })), aprendido.map((a) => a.metric).join(','));
check('68 · segunda pasada: A8 ADMITE lo aprendido que habla de lo que esta decisión optimiza',
  segunda.context.cierre === 'admitted' &&
  igual(segunda.context.admisiones.filter((x) => x.status === 'admitted').map((x) => x.metric), ['outcome.success', 'result.latencyMs']));
check('69 · y deja fuera, diciendo por qué, lo que no: la verificación no es un eje de este objetivo',
  segunda.context.admisiones.find((x) => x.metric === 'verification.passed').because.includes('axis_not_in_objective'));
check('70 · A1 RECIBE el historial: cuarenta ejecuciones, treinta y ocho bien',
  igual(segunda.historial, A.paraDecision(segunda.context).history) && segunda.historial.sampleSize === 40 && segunda.historial.succeeded === 38,
  JSON.stringify(segunda.historial));
check('71 · el contexto de la decisión CAMBIÓ, y se explica: antes sin historial, ahora con él',
  primera.historial === undefined && segunda.historial !== undefined && segunda.context.metricas.admitidas === 2);
check('72 · y A1 elige LO MISMO: hoy no lee `history`. No se afirma que la segunda sea mejor',
  igual(segunda.decision, primera.decision) && !/\bhistory\b/.test(sinComentarios(leer('functions/src/core/algorithm/decision-engine.ts'))),
  'hacer que lo use es un cambio de A1, no de A9');
check('73 · lo aprendido llega como historial y SOLO como historial: ni una señal aprendida entra en A1',
  !(segunda.decision.signalKeys ?? []).some((k) => k.startsWith('learned.')));

console.log('\n─── M. Sin política automática ───');

const congelar = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(congelar); } return o; };
const PET_CONGELADA = congelar(JSON.parse(JSON.stringify(peticion({ aprendido: { ahora: T2, scope: { capability: CAP }, learned: aprendido, learningPolicy: POL } }))));
const antes = JSON.stringify(PET_CONGELADA);
let sinMutar = true;
try { const r = ciclo.decidir(PET_CONGELADA); ciclo.cerrar(r, congelar(observar(9, 'success', T2)), congelar({ ahora: T2, previo: aprendido, policy: POL })); }
catch { sinMutar = false; }
check('74 · la petición, la política y lo aprendido entran CONGELADOS y salen igual: nada se muta',
  sinMutar && JSON.stringify(PET_CONGELADA) === antes);
const clavesDe = (o, acc = new Set()) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.add(k); clavesDe(v, acc); } return acc; };
const CLAVES = clavesDe([segunda, ciclo.cerrar(segunda, observar(9, 'success', T2), { ahora: T2, previo: aprendido, policy: POL })]);
check('75 · ni el resultado ni el cierre llevan política, Credits, materiales ni secretos',
  !['policy', 'routerPolicy', 'aiRouting', 'credits', 'creditsCharged', 'assetId', 'secret', 'apiKey', 'providerCost'].some((k) => CLAVES.has(k)));
check('76 · el cambio que A7 PROPONE no lo aplica nadie aquí: A9 no lee `proposedChange`',
  !/proposedChange/.test(src9));
check('77 · y no puede escribir en ninguna autoridad: ni una importación de Router, Planner, Brain, Financial, Credits ni Registry',
  ![...src9.matchAll(/from '([^']+)'/g)].some((m) => /router|planner|brain|financial|credits|registry/.test(m[1])) &&
  !/RouterPolicy|crearRouter|crearPlanner|crearBrain|spendCredits|creditCosts/.test(src9));

console.log('\n─── N. Las deudas, declaradas ───');

const r1 = ciclo.cerrar(primera, observar(0, 'success', T2), { ahora: T2, policy: POL });
const r2 = ciclo.cerrar(primera, observar(0, 'success', T2), { ahora: T2, previo: r1.learning.aggregates, policy: POL });
check('78 · DEUDA · cerrar dos veces la misma observación la cuenta dos veces: la entrega exactamente-una-vez es del integrador',
  r2.learning.aggregates.every((a) => a.n === 2), 'no se resuelve metiendo identificadores en los agregados');
check('79 · y los agregados siguen sin guardar identificadores de ejecución',
  !JSON.stringify(aprendido).includes('ejec_'));
const DOCS = leer('docs/ALGORITHM-ENGINE.md');
check('80 · las deudas temporales de A7 están ESCRITAS antes de integrar persistencia',
  ['tramosAncho', 'futuro lejano', 'exactamente-una-vez', 'fuerza', 'sin `at`'].every((x) => DOCS.includes(x)),
  ['tramosAncho', 'futuro lejano', 'exactamente-una-vez', 'fuerza', 'sin `at`'].filter((x) => !DOCS.includes(x)).join(',') || 'las cinco');

console.log('\n─── O. Agnosticismo ───');

const SINTETICAS = ['alfa', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'].map((x) => `sintetica.${x}.v1`);
const INVENTADA = ['future', 'unknown', 'capability', 'v' + (6 * 7)].join('.');
let atraviesan = 0; const noAtraviesan = [];
for (const cap of [...SINTETICAS, INVENTADA]) {
  const t = tareaDe(cap, `T_${cap}`);
  const r = ciclo.decidir({ decision: decisionBase({ signals: senalesDe(t) }), tarea: t, expected: EXPECTED,
    aprendido: { ahora: T1, scope: { capability: cap }, learned: [], learningPolicy: POL }, componer: { paralelizar: true, optimizar: true } });
  const c = r.status === 'decided' ? ciclo.cerrar(r, observar(0, 'success', T1 + HORA), { ahora: T1 + HORA, policy: POL }) : undefined;
  if (r.status === 'decided' && c?.status === 'closed' && c.learning.aggregates.every((a) => a.scope.capability === cap)) atraviesan++;
  else noAtraviesan.push(`${cap}:${r.status}/${r.parada ?? c?.parada}`);
}
check('81 · ocho capacidades sintéticas y una inventada atraviesan el ciclo entero', atraviesan === 9, noAtraviesan.join(', ') || 'las nueve');
/*
 * UNA RAMA POR CAPACIDAD, PROVEEDOR O MODELO, se escriba como se escriba: una
 * comparación con un literal —a un lado o al otro, con o sin paréntesis—, un
 * `switch` o una pertenencia. La primera versión solo miraba `if (…x === …)`
 * SIN paréntesis, y el sabotaje X10 —un cast entre paréntesis antes del
 * `providerId`— pasó sin verse. La misma forma estrecha sigue en las guardas de
 * A7 y A8: queda anotado, no se toca aquí.
 */
const DIMENSION = '(?:capability|providerId|provider|modelId|model)';
const FORMAS_DE_RAMA = [
  new RegExp(`\\b${DIMENSION}\\b\\s*\\)*\\s*[!=]==?\\s*['"\`]`),
  new RegExp(`['"\`][^'"\`\\n]*['"\`]\\s*[!=]==?\\s*[\\w.?()\\s]*\\b${DIMENSION}\\b`),
  new RegExp(`switch\\s*\\((?:[^()]|\\([^()]*\\))*\\b${DIMENSION}\\b`),
  new RegExp(`\\.(?:includes|indexOf|has)\\(\\s*[\\w.?]*\\b${DIMENSION}\\b`),
];
const esRama = (src) => FORMAS_DE_RAMA.some((r) => r.test(src));
check('82 · ni una rama por capacidad, proveedor o modelo en A9, se escriba como se escriba', !esRama(src9));
check('82b · CONTROL · la guarda caza cada forma de rama, también la que usó un sabotaje, y no lo que no lo es',
  [
    "if (t.steps[0]?.capability === 'x.y') formas = [];",
    "if ((d.objective as unknown as Record<string, unknown>).providerId === 'p-favorito') formas = [];",
    "if ('p-favorito' === (d as any).providerId) formas = [];",
    "switch (x.modelId) { case 'm': break; }",
    "if (new Set(['a']).has(x.provider)) return;",
  ].every(esRama) &&
  !["if (c.value.isFallback === true) x = 1;", "if (status === 'decided') y = 2;", "const c = s.capability;"].some(esRama));
const PROHIBIDOS = ['gemini', 'deepseek', 'seedance', 'elevenlabs', 'minimax', 'openai', 'lipsync', 'image', 'video', 'voice', 'music'];
check('83 · ni una capacidad, proveedor ni modelo nombrados en A9',
  PROHIBIDOS.filter((x) => tokens(FUENTES.map(leer).join('\n')).has(x)).length === 0,
  PROHIBIDOS.filter((x) => tokens(FUENTES.map(leer).join('\n')).has(x)).join(',') || 'ninguno');

console.log('\n─── P. Determinismo ───');

const doce = Array.from({ length: 12 }, () => JSON.stringify(vuelta([], T1)));
check('84 · doce vueltas completas, idénticas', doce.every((x) => x === doce[0]));
const reves = (xs) => [...xs].reverse();
check('85 · las opciones en otro orden: la misma decisión',
  igual(ciclo.decidir({ decision: { ...soloOpciones().decision, options: reves(soloOpciones().decision.options) } }).entrega,
    ciclo.decidir(soloOpciones()).entrega));
check('86 · los enfoques en otro orden: el mismo enfoque y el mismo plan',
  igual(ciclo.decidir(peticion({ tarea: undefined, enfoques: reves(ENFOQUES) })).entrega, conEnfoques.entrega));
check('87 · lo aprendido en otro orden: el mismo contexto y el mismo historial',
  igual(ciclo.decidir(peticion({ aprendido: { ahora: T2, scope: { capability: CAP }, learned: reves(aprendido), learningPolicy: POL } })).context,
    segunda.context));
check('88 · las señales en otro orden: las mismas estrategias y la misma decisión',
  igual(ciclo.decidir(peticion({ decision: decisionBase({ signals: reves(SENALES) }) })).entrega, R.entrega));
check('89 · sin azar ni relojes en A9', !/Math\.random|Date\.now|new Date\(/.test(src9));

console.log('\n─── Q. Autoridad ───');

for (const [que, patron] of [
  ['red', /fetch\(|https?:\/\/|XMLHttpRequest|axios/], ['un modelo de lenguaje', /generateContent|chat\.completions|anthropic|openai/i],
  ['secretos', /process\.env|defineSecret|apiKey|secretManager/i], ['Firestore ni colas', /firestore|firebase|enqueue|jobstore/i],
  ['elegir implementación', /selectedProvider|selectedModel|elegirProveedor|RoutingDecision/],
  ['ejecutar trabajos', /crearJob|dispatch\(|ejecutar\(/],
]) check(`90 · A9 no toca ${que}`, !patron.test(src9));
check('91 · nadie ha conectado A9 a producción', (() => {
  const recorrer = (dir, out = []) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      const h = dir + '/' + e.name;
      if (e.isDirectory()) recorrer(h, out); else if (/\.ts$/.test(e.name)) out.push(h);
    }
    return out;
  };
  const prod = ['creator', 'runtime', 'engine', 'gateway', 'credits', 'content', 'job', 'router', 'planner', 'orchestrator', 'brain']
    .flatMap((d) => (fs.existsSync(path.resolve(RAIZ, 'functions/src/' + d)) ? recorrer('functions/src/' + d) : []));
  return prod.length > 50 && prod.filter((f) => /crearCicloAlgoritmico|integration-cycle/.test(leer(f))).length === 0;
})());

console.log('\n─── R. Rendimiento ───');

/*
 * MEDIDO COMO SE USA: una decisión por petición, cada una con todo lo que pide
 * —contexto, estructura, paralelismo, estrategias, optimización, decisión—, y
 * el ciclo entero con verificación y aprendizaje encadenando el estado.
 * Todas las piezas se procesan; nada se trunca antes de cronometrar.
 */
const cronometrar = (fn) => { fn(Math.min(50)); const ini = process.hrtime.bigint(); const r = fn(); return { ms: Number(process.hrtime.bigint() - ini) / 1e6, r }; };
const decisiones = (cuantas) => cronometrar((k = cuantas) => {
  let hechas = 0;
  for (let i = 0; i < k; i++) if (ciclo.decidir(peticion()).status === 'decided') hechas++;
  return hechas;
});
const TIEMPOS = [100, 1000, 10_000].map((c) => ({ c, ...decisiones(c) }));
for (const t of TIEMPOS) console.log(`   ${String(t.c).padStart(6)} decisiones → ${t.ms.toFixed(0)} ms · ${(t.ms / t.c * 1000).toFixed(0)} µs/decisión`);
check('92 · se toman TODAS las decisiones pedidas: nada se trunca', TIEMPOS.every((t) => t.r === t.c), TIEMPOS.map((t) => `${t.c}→${t.r}`).join(' '));
check('93 · el coste por decisión no crece con N: O(1) por decisión, O(N) en total',
  TIEMPOS[2].ms / TIEMPOS[2].c < (TIEMPOS[1].ms / TIEMPOS[1].c) * 2.5,
  TIEMPOS.map((t) => `${t.c}:${(t.ms / t.c * 1000).toFixed(0)}µs`).join(' · '));
const vueltas = (cuantas) => cronometrar((k = cuantas) => {
  let previo = []; let cerradas = 0;
  for (let i = 0; i < k; i++) {
    const r = ciclo.decidir(peticion());
    const c = ciclo.cerrar(r, observar(i, 'success', T1 + i), { ahora: T1 + i, previo, policy: POL });
    previo = c.learning.aggregates; if (c.status === 'closed') cerradas++;
  }
  return { cerradas, claves: previo.length };
});
const VUELTAS = [100, 1000].map((c) => ({ c, ...vueltas(c) }));
for (const t of VUELTAS) console.log(`   ${String(t.c).padStart(6)} ciclos completos → ${t.ms.toFixed(0)} ms · ${(t.ms / t.c * 1000).toFixed(0)} µs/ciclo · estado de A7: ${t.r.claves} clave(s)`);
check('94 · el ciclo completo cierra todas, y el estado aprendido NO crece con las vueltas',
  VUELTAS.every((t) => t.r.cerradas === t.c && t.r.claves === 3), VUELTAS.map((t) => `${t.c}: ${t.r.claves} claves`).join(' · '));
/* Lo que SÍ depende del tamaño: el grafo. */
const anchoDe = (k) => ({ id: `G${k}`, steps: [paso('o'), ...Array.from({ length: k }, (_, i) => paso(`r${i}`, ['o'])), paso('z', Array.from({ length: k }, (_, i) => `r${i}`))] });
const GRAFO = [2, 4, 8].map((k) => {
  const t = anchoDe(k);
  const pet = { decision: decisionBase({ signals: senalesDe(t) }), tarea: t, componer: { paralelizar: true, optimizar: true } };
  return { pasos: t.steps.length, ...cronometrar((m = 200) => { for (let i = 0; i < m; i++) ciclo.decidir(pet); return m; }) };
});
for (const g of GRAFO) console.log(`   grafo de ${String(g.pasos).padStart(2)} pasos → ${(g.ms / g.r * 1000).toFixed(0)} µs/decisión`);
check('95 · lo que depende del GRAFO crece con el grafo, y lo dice: A2, A4 y A3 trabajan sobre pasos y anchura',
  GRAFO[2].ms / GRAFO[2].r > GRAFO[0].ms / GRAFO[0].r, GRAFO.map((g) => `${g.pasos}p:${(g.ms / g.r * 1000).toFixed(0)}µs`).join(' · '));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA9: A0–A8 forman un ciclo, y cada uno sigue siendo el único dueño de lo suyo');
process.exit(failures ? 1 : 0);
