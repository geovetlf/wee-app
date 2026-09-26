/*
 * S2-A — LA CALIDAD DE LA DECISIÓN Y LA FRONTERA CON EL ROUTER.
 *
 *   ¿Decide el Algorithm Engine con reglas que se pueden comprobar —sin
 *    inventar calidad—, y entrega requisitos que el Router puede leer sin
 *    elegir nunca CON QUÉ se ejecuta?
 *
 * Reglas, no benchmarks. Ningún número de esta suite es la medición de nada
 * real: son entradas construidas para que cada regla se vea funcionar. Todo
 * sintético y local —ni un proveedor, ni una red, ni un reloj del sistema—.
 *
 *  A. Quince escenarios sintéticos.
 *  B. Determinismo: el orden de llegada no decide.
 *  C. Pareto: un frente, nunca un ganador.
 *  D. Ninguna implementación como autoridad.
 *  E. La frontera con el Router.
 *  F. Confianza e incertidumbre.
 *  G. El resultado de una decisión.
 *  H. Las deudas, declaradas.
 *
 * Y el endurecimiento previo a la integración (R1–R6), cada cosa con su sección:
 *
 *  I. R1 — lo que no es un número finito, o una fuente que no es del vocabulario,
 *     no hace señal: no desempata ni es evidencia.
 *  J. R2 — la forma canónica: total, determinista y acotada de verdad.
 *  K. R3 — `restriccionesEfectivas`, campo a campo: su regla, en los dos sentidos,
 *     con un solo lado y con ninguno.
 *  L. R4 — la integridad de esta misma suite: la 41 llega a A1 (y la 41b dice
 *     dónde para el ciclo), la 50 usa el vocabulario real de `Budget`, y la
 *     igualdad con que se compara no confunde lo que el JSON calla.
 *  M. R5 — el versionado: contrato 1.10 con su entrada, y los motores cuya
 *     decisión cambió, a su versión 2.
 *  N. R6 — el documento dice lo que hay: la historia de S1 de `main` delante,
 *     S2-A integrada en `main`, la cadena entera, el estado real de cada
 *     lector, lo que A6 ve al cerrar y las deudas.
 *  O. S2-B · B.1 — las restricciones mal formadas: UNA regla (finito y en su
 *     rango de siempre), cada lado validado antes de fundir, un conflicto que
 *     nombra lado, campo y motivo, una fusión que nunca da un no-finito; A9 se
 *     para antes de A2, y A3, A5 y A8 aplican la misma regla.
 *  P. S2-B · B.2 — el desglose cuadra con el total: lo ausente sale «sin
 *     medir» y sin número, lo medido con su número aunque valga 0, lo sin peso
 *     no sale; total = S_medido / W_medido y cobertura = W_medido / W_total, en
 *     ocho escenarios, sin cambiar ninguna decisión.
 *  Q. S2-B · B.3 — resolver señales sin ordenar de más: la misma salida que la
 *     de S2-A por identidad, permutaciones, la forma canónica solo entre las
 *     empatadas con la ganadora, y resolver una vez lo que A4, A3 y A5 resolvían
 *     cada una por su cuenta.
 *  R. S2-B · B.4 — el presupuesto de pensar no se convierte en «no hay
 *     alternativas»: `maxEvidence` sobre la evidencia de lo que se evalúa (las
 *     fronteras 64/65 y 512/513, las señales ajenas fuera, por turnos y sin
 *     depender del orden), y `maxDepth` que dice que el plan existe.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));
/*
 * Igualdad ESTRICTA (R4): el mismo JSON —que ve el orden de las claves— Y la misma
 * estructura —que ve lo que el JSON calla: `NaN` frente a `null`, `undefined`
 * frente a una clave ausente, `-0` frente a `0`—. Solo con el JSON, dos
 * decisiones distintas en eso pasaban por «la misma, byte a byte».
 */
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b) && isDeepStrictEqual(a, b);
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
/* Una petición rota tiene que dar un DIAGNÓSTICO, no una excepción. */
const sinReventar = (fn) => { try { return fn(); } catch (e) { return { lanzo: String(e?.message ?? e) }; } };
const casi = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-12;

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const A = lib('core/algorithm/index.js');
const { ALGORITHM_CONTRACT_VERSION } = lib('core/contracts.js');

const TRAZA = Object.freeze({ traceId: 't', requestId: 'r', userId: 'u' });
const a1 = A.crearMotorDeDecision();
const a5 = A.crearMotorDeOptimizacion();
const a7 = A.crearMotorDeFeedback();
const a8 = A.crearMotorDeContexto();

/* ── A1 directo ── */
const contexto = (extra = {}) => ({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { quality: 1, cost: 1 } }, trace: TRAZA, ...extra,
});
const opcion = (id, values, value) => ({ id, value: value ?? { nombre: id }, values });
const medida = (key, subject, value, extra = {}) => ({ key, subject, value, source: 'measured', sampleSize: 20, ...extra });
const elegidaDe = (d) => (d?.candidates ?? []).find((c) => c.reason === 'selected')?.id;
const candidata = (d, id) => (d?.candidates ?? []).find((c) => c.id === id);

/* ── El ciclo (A9), con los mismos sintéticos que su propia suite ── */
const HORA = 3_600_000;
const DIA = 86_400_000;
const T0 = 1_700_000_000_000;
const T1 = T0 + 30 * DIA;
/* La capacidad, construida en ejecución: ni siquiera aparece entera en el código. */
const CAP = ['future', 'synthetic', 'capability'].join('.');
const POL = { ventanaMs: 4 * DIA };
const paso = (id, dep) => ({ id, capability: CAP, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
const TAREA = Object.freeze({ id: 'T', steps: [paso('a'), paso('b', ['a']), paso('c', ['a']), paso('d', ['b', 'c'])] });
const senalesDe = (t) => t.steps.flatMap((s) => [
  { key: 'step.latencyMs', subject: s.id, value: 300, source: 'measured', sampleSize: 20 },
  { key: 'step.costUsd', subject: s.id, value: 0.01, source: 'measured', sampleSize: 20 },
]);
const SENALES = senalesDe(TAREA);
/* El evaluador sintético, por el puerto de A6: sin puntuación, no evalúa —el «no se pudo mirar» honesto—. */
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
const OBJ_CICLO = { weights: { latency: 1, reliability: 1 } };
const decisionBase = (extra = {}) => ({
  contract: ALGORITHM_CONTRACT_VERSION, objective: OBJ_CICLO, trace: TRAZA, signals: SENALES, ...extra,
});
const EXPECTED = [{ kind: 'text', quality: { minScore: 0.8 } }];
const peticion = (extra = {}) => ({
  decision: decisionBase(), tarea: TAREA, expected: EXPECTED,
  aprendido: { ahora: T1, scope: { capability: CAP }, learned: [], learningPolicy: POL },
  componer: { paralelizar: true, optimizar: true },
  ...extra,
});
/* El ejecutor sintético: está en la prueba, no en el motor. */
const DESENLACE = {
  success: { status: 'succeeded', puntuacion: 0.9 },
  partial_success: { status: 'succeeded', puntuacion: 0.5 },
  failure: { status: 'failed' },
  unknown: { status: 'unknown', puntuacion: null },
  cancelled: { status: 'cancelled' },
};
const observar = (i, clase, at, extra = {}) => {
  const x = DESENLACE[clase];
  const outputs = 'puntuacion' in x
    ? [{ kind: 'text', ref: `ref://${i}`, ...(typeof x.puntuacion === 'number' ? { metadata: { puntuacion: x.puntuacion } } : {}) }]
    : [];
  return { kind: clase, at, actual: { id: `ejec_${i}`, status: x.status, outputs },
    signals: [{ key: 'result.latencyMs', value: 1000, source: 'measured', at }], ...extra };
};
const R = ciclo.decidir(peticion());
const cerrar = (obs) => ciclo.cerrar(R, obs, { ahora: T1 + HORA, policy: POL });
const agregado = (c, metrica) => c.learning?.aggregates.find((a) => a.metric === metrica);
const metricas = (c) => (c.learning?.aggregates ?? []).map((a) => a.metric).sort();
const cuentas = (c) => (c.learning?.aggregates ?? []).map((a) => `${a.metric}:${a.favorables}/${a.n}`).join(', ') || '—';

console.log('\n─── A. Quince escenarios sintéticos ───');

/* 1 · Mismo objetivo, A y B factibles. El total es la media ponderada de lo MEDIDO. */
const E1 = a1.decidir(contexto({ options: [
  opcion('opcion-a', { quality: 0.9, cost: 0.04 }), opcion('opcion-b', { quality: 0.7, cost: 0.02 })] }));
/* A mano, con la regla de A0: calidad acotada a 0–1; coste repartido entre el mejor (1) y el peor (0) del conjunto. */
const TOTAL_A = (0.9 * 0.5 + 0 * 0.5); const TOTAL_B = (0.7 * 0.5 + 1 * 0.5);
check('1 · A y B factibles: las dos compiten, las dos puntúan, y se elige por el objetivo',
  E1.status === 'decided' && E1.candidates.every((c) => c.eligible && !!c.score) && elegidaDe(E1) === 'opcion-b' &&
  casi(candidata(E1, 'opcion-a')?.score?.total, TOTAL_A) && casi(candidata(E1, 'opcion-b')?.score?.total, TOTAL_B),
  E1.candidates.map((c) => `${c.id}:${c.score?.total}`).join(' '));
check('1b · el total sale de los valores y de los pesos, y la explicación lo desglosa: no hay un número de más',
  E1.explanation.some((f) => /^Desglose: quality 0\.70×0\.50 · cost 1\.00×0\.50\.$/.test(f)), E1.explanation.join(' | '));

/* 2 y 3 · Iguales en todo lo declarado; distinta EVIDENCIA. La evidencia no cambia la puntuación: cambia la confianza. */
const IGUALES = [opcion('opcion-a', { quality: 0.8, cost: 0.03 }), opcion('opcion-b', { quality: 0.8, cost: 0.03 })];
const evidenciaMejorDe = (fuerte, debil) => [
  medida('option.quality', fuerte, 0.8), medida('option.cost', fuerte, 0.03),
  { key: 'option.quality', subject: debil, value: 0.8, source: 'model' },
];
const E2 = a1.decidir(contexto({ options: IGUALES, signals: evidenciaMejorDe('opcion-a', 'opcion-b') }));
const E3 = a1.decidir(contexto({ options: IGUALES, signals: evidenciaMejorDe('opcion-b', 'opcion-a') }));
check('2 · A con mejor evidencia: empatan en el objetivo y decide la CONFIANZA, no el nombre',
  elegidaDe(E2) === 'opcion-a' && casi(candidata(E2, 'opcion-a')?.score?.total, candidata(E2, 'opcion-b')?.score?.total) &&
  E2.explanation.some((f) => f.includes('por confidence')) && E2.uncertainty === 'known', E2.explanation.join(' | '));
check('3 · B con mejor evidencia: gana B aunque «opcion-a» vaya antes por nombre',
  elegidaDe(E3) === 'opcion-b' && E3.explanation.some((f) => f.includes('por confidence')) && E3.confidence.value > 0.85,
  `${elegidaDe(E3)} · ${E3.confidence.value}`);
check('3b · y la procedencia es lo que pesa: una medición (1) frente a una estimación de modelo (0,4)',
  casi(E2.confidence.value, A.PESO_DE_FUENTE.measured) && casi(E3.confidence.value, A.PESO_DE_FUENTE.measured) &&
  casi(A.crearMotorDeDecision().decidir(contexto({ options: [IGUALES[1]], signals: evidenciaMejorDe('opcion-a', 'opcion-b') })).confidence.value,
    A.PESO_DE_FUENTE.model));

/* 4 · Una restricción elimina A: queda fuera ANTES de puntuar, aunque habría ganado. */
const E4 = a1.decidir(contexto({ constraints: { maxLatencyMs: 1000 }, options: [
  opcion('opcion-a', { quality: 0.95, cost: 0.01, latency: 1500 }), opcion('opcion-b', { quality: 0.6, cost: 0.02, latency: 800 })] }));
check('4 · una restricción elimina A: fuera por `constraint:maxLatencyMs`, sin puntuación, y se elige B',
  elegidaDe(E4) === 'opcion-b' && candidata(E4, 'opcion-a')?.eligible === false &&
  candidata(E4, 'opcion-a')?.reason === 'constraint:maxLatencyMs' && candidata(E4, 'opcion-a')?.score === undefined &&
  E4.explanation.includes('Cumple las restricciones; 1 opción(es) quedaron fuera por no cumplirlas.'));

/* 5 · El presupuesto elimina B: no «pierde puntos», no compite. */
const E5 = a1.decidir(contexto({ constraints: { budget: { maxUsd: 0.05 } }, options: [
  opcion('opcion-a', { quality: 0.7, cost: 0.04 }), opcion('opcion-b', { quality: 0.95, cost: 0.08 })] }));
check('5 · el presupuesto elimina B: la mejor calidad no compra un presupuesto que no cabe',
  elegidaDe(E5) === 'opcion-a' && candidata(E5, 'opcion-b')?.reason === 'constraint:budget.maxUsd' && candidata(E5, 'opcion-b')?.score === undefined);
const E5c = a1.decidir(contexto({ constraints: { budget: { maxCredits: 1 } }, options: [opcion('opcion-a', { quality: 0.7, cost: 0.04 })] }));
check('5b · y un tope en Credits no se comprueba aquí —su precio es del Financial Core—: se avisa y no se descarta a nadie',
  E5c.status === 'decided' && E5c.warnings.includes('constraint_unverifiable') && E5c.candidates.length === 1 && E5c.candidates.every((c) => c.eligible));

/* 6 · La evidencia de fiabilidad favorece a A: por el objetivo, y por el límite de riesgo. */
const FIABLES = [opcion('opcion-a', { reliability: 0.99, cost: 0.03 }), opcion('opcion-b', { reliability: 0.9, cost: 0.03 })];
const SENALES_FIABLES = [medida('option.reliability', 'opcion-a', 0.99, { sampleSize: 200 }), medida('option.reliability', 'opcion-b', 0.9, { sampleSize: 200 })];
const E6 = a1.decidir(contexto({ objective: { weights: { reliability: 1, cost: 1 } }, options: FIABLES, signals: SENALES_FIABLES }));
const E6r = a1.decidir(contexto({ objective: { weights: { reliability: 1, cost: 1 } }, constraints: { maxRisk: 0.05 }, options: FIABLES, signals: SENALES_FIABLES }));
check('6 · la fiabilidad favorece a A: mismo coste, más fiable, y las dos con la misma evidencia medida',
  elegidaDe(E6) === 'opcion-a' && E6.explanation.some((f) => f.includes('por objective')) &&
  casi(candidata(E6, 'opcion-a')?.score?.fits?.reliability, 0.99));
check('6b · y con un riesgo máximo, B (riesgo 0,10) queda fuera antes de puntuar',
  elegidaDe(E6r) === 'opcion-a' && candidata(E6r, 'opcion-b')?.reason === 'constraint:maxRisk');

/* 7 · Evidencia insuficiente: se dice, y con un mínimo pedido no se decide. */
const SIN_SENALES = [opcion('opcion-a', { quality: 0.9, cost: 0.02 }), opcion('opcion-b', { quality: 0.8, cost: 0.01 })];
const E7 = a1.decidir(contexto({ options: SIN_SENALES }));
check('7 · sin evidencia: se recomienda lo mejor de lo DECLARADO, con confianza 0, incertidumbre `unknown` y dicho',
  E7.status === 'decided' && E7.confidence.value === 0 && E7.uncertainty === 'unknown' && E7.warnings.includes('low_confidence') &&
  E7.evidence.length === 0 && E7.explanation.some((f) => f.startsWith('Confianza 0: no hay evidencia')));
const E7m = a1.decidir(contexto({ options: SIN_SENALES, constraints: { minConfidence: 0.5 } }));
check('7b · y si se exige una confianza mínima, no hay decisión: `insufficient_evidence`, no un ganador a ciegas',
  E7m.status !== 'decided' && E7m.failure === 'insufficient_evidence' && E7m.selected === undefined &&
  E7m.candidates.length === 2 && E7m.candidates.every((c) => c.reason === 'constraint:minConfidence'), `${E7m.status} · ${E7m.failure}`);

/* 8 · Evidencia en conflicto: la procedencia manda y el conflicto se cuenta; lo que va en contra resta. */
const E8 = a1.decidir(contexto({ options: [opcion('opcion-a', { quality: 0.8, cost: 0.02 })], signals: [
  medida('option.quality', 'opcion-a', 0.8), { key: 'option.quality', subject: 'opcion-a', value: 0.4, source: 'model', at: T1 }] }));
check('8 · dos señales sobre lo mismo: gana la MEDIDA aunque la del modelo sea más reciente, y el conflicto se avisa',
  E8.warnings.includes('signal_conflict') && E8.evidence.length === 1 && E8.evidence[0]?.signal?.source === 'measured' &&
  A.resolverSenales(E8.evidence.map((e) => e.signal)).resueltas.length === 1);
const aFavor = { claim: 'x', supports: true, signal: medida('option.quality', 'o', 0.8) };
const enContraMedida = { claim: 'x', supports: false, signal: medida('option.quality', 'o', 0.8) };
const enContraModelo = { claim: 'x', supports: false, signal: { key: 'option.quality', subject: 'o', value: 0.8, source: 'model' } };
check('8b · la evidencia EN CONTRA resta: a favor y en contra con la misma fuerza se anulan; contra algo más débil, resta menos',
  casi(A.confianzaDeEvidencia([aFavor]).value, 1) && casi(A.confianzaDeEvidencia([aFavor, enContraMedida]).value, 0) &&
  casi(A.confianzaDeEvidencia([aFavor, enContraModelo]).value, (1 - 0.4) / 2) &&
  A.confianzaDeEvidencia([aFavor, enContraMedida]).because === '1 a favor, 1 en contra');

/* 9 y 10 · El historial por alternativa: con muestra entra como probabilidad de éxito; sin ella, no existe. */
const MISMO_COSTE = [opcion('opcion-a', { cost: 0.02 }), opcion('opcion-b', { cost: 0.02 })];
const OBJ_EXITO = { weights: { successProbability: 1, cost: 1 } };
const conHistorial = (hbo, extra = {}) => a1.decidir(contexto({ objective: OBJ_EXITO, options: MISMO_COSTE, historyByOption: hbo, ...extra }));
const E_SIN = a1.decidir(contexto({ objective: OBJ_EXITO, options: MISMO_COSTE }));
const E9 = conHistorial({ 'opcion-a': { sampleSize: 3, succeeded: 0 }, 'opcion-b': { sampleSize: 3, succeeded: 3 } });
check('9 · historial INSUFICIENTE (3 < 5): no es una muestra, no se usa, y la decisión es la de sin historial',
  E9.status === 'decided' && elegidaDe(E9) === elegidaDe(E_SIN) && igual(E9.selected, E_SIN.selected) &&
  !E9.signalKeys.includes('history.successRate') && E9.selectedScore.missing.includes('successProbability') &&
  E9.explanation.some((f) => f.includes(`por debajo de ${A.POLITICA_MINIMA.minSampleSize}: no es una muestra`)),
  E9.explanation.slice(-2).join(' | '));
const E10 = conHistorial({ 'opcion-a': { sampleSize: 20, succeeded: 5 }, 'opcion-b': { sampleSize: 20, succeeded: 19 } });
check('10 · historial SUFICIENTE: la tasa medida entra como probabilidad de éxito y cambia la decisión',
  elegidaDe(E_SIN) === 'opcion-a' && elegidaDe(E10) === 'opcion-b' &&
  casi(candidata(E10, 'opcion-b')?.score?.fits?.successProbability, 19 / 20) && casi(candidata(E10, 'opcion-a')?.score?.fits?.successProbability, 5 / 20),
  `${elegidaDe(E_SIN)} → ${elegidaDe(E10)}`);
check('10b · con su procedencia (`derived`) y su muestra: la evidencia dice de dónde sale el número',
  E10.evidence.some((e) => e.claim === 'opcion-b:history.successRate' && e.signal.source === 'derived' && e.signal.sampleSize === 20) &&
  casi(E10.confidence.value, A.PESO_DE_FUENTE.derived) && E10.uncertainty === 'probable', `${E10.confidence.value} · ${E10.uncertainty}`);
const E10h = conHistorial({ 'opcion-a': { sampleSize: 20, succeeded: 5 }, 'opcion-b': { sampleSize: 20, succeeded: 19 } },
  { history: { sampleSize: 100, succeeded: 90 } });
check('10c · el historial del ÁMBITO se lee y se declara, pero no reordena: es de todas a la vez',
  elegidaDe(E10h) === elegidaDe(E10) && E10h.signalKeys.includes('history.decision') &&
  igual(E10h.candidates.map((c) => c.score?.total), E10.candidates.map((c) => c.score?.total)));
const E10p = a1.decidir(contexto({ objective: OBJ_EXITO,
  options: [opcion('opcion-a', { cost: 0.02, successProbability: 0.3 }), opcion('opcion-b', { cost: 0.02 })],
  historyByOption: { 'opcion-a': { sampleSize: 20, succeeded: 20 } } }));
check('10d · el historial no pisa lo que la alternativa ya trae, ni rescata a quien no compite',
  casi(candidata(E10p, 'opcion-a')?.score?.fits?.successProbability, 0.3) &&
  E10p.explanation.some((f) => f.includes('trae su propia probabilidad de éxito')) &&
  elegidaDe(conHistorial({ 'opcion-b': { sampleSize: 20, succeeded: 20 } }, { constraints: { budget: { maxUsd: 0.01 } } })) === undefined);

/* 11–15 · Lo que vuelve de la ejecución: cada hecho, de su dueño, y ninguno convertido en un número de calidad. */
const METRICAS_DE_EXITO = ['outcome.success', 'result.latencyMs', 'strategy.succeeded', 'verification.passed'];
const C11 = cerrar(observar(0, 'success', T1 + HORA));
check('11 · verificación PASS: A6 dice `pass` y A7 lo CUENTA —n y favorables—; nadie lo convierte en «calidad 1,0»',
  C11.status === 'closed' && C11.verification?.status === 'pass' && C11.outcome?.verification?.status === 'pass' &&
  agregado(C11, 'verification.passed')?.n === 1 && agregado(C11, 'verification.passed')?.favorables === 1 &&
  igual(metricas(C11), METRICAS_DE_EXITO) && !!C11.outcome && !('quality' in C11.outcome) && !metricas(C11).some((m) => /quality|score|calidad/i.test(m)),
  cuentas(C11));
const C12 = cerrar(observar(1, 'failure', T1 + HORA));
check('12 · verificación FAILURE: un fallo es una MUESTRA (0 de 1), no un «0 de calidad», y no se inventa un veredicto que no hubo',
  C12.verification?.status === 'fail' && C12.recovery?.stoppedBecause === 'proposed' &&
  agregado(C12, 'outcome.success')?.n === 1 && agregado(C12, 'outcome.success')?.favorables === 0 &&
  agregado(C12, 'verification.passed') === undefined, cuentas(C12));
const C12b = cerrar({ ...observar(2, 'success', T1 + HORA), actual: observar(2, 'partial_success', T1 + HORA).actual });
check('12b · terminó y no cumplió: un éxito de EJECUCIÓN y un suspenso de VERIFICACIÓN, cada uno en su métrica',
  C12b.verification?.status === 'partial' && agregado(C12b, 'outcome.success')?.favorables === 1 &&
  agregado(C12b, 'verification.passed')?.n === 1 && agregado(C12b, 'verification.passed')?.favorables === 0, cuentas(C12b));
const C13 = cerrar(observar(3, 'failure', T1 + HORA, { recovery: { kind: 'retry', executed: true, succeeded: true } }));
check('13 · recuperación EJECUTADA: el fallo sigue siendo un fallo y la recuperación se aprende aparte, con su tipo',
  agregado(C13, 'outcome.success')?.favorables === 0 && agregado(C13, 'recovery.succeeded')?.favorables === 1 &&
  agregado(C13, 'recovery.succeeded')?.scope?.recoveryKind === 'retry' && C13.outcome?.recovery?.executed === true, cuentas(C13));
const C14 = cerrar(observar(4, 'failure', T1 + HORA, { recovery: { kind: 'retry', executed: false } }));
check('14 · recuperación NO ejecutada: A6 la propone y nadie la cuenta como hecha',
  !!C12.outcome && C12.outcome.recovery === undefined && agregado(C12, 'recovery.succeeded') === undefined &&
  C14.status === 'closed' && agregado(C14, 'recovery.succeeded') === undefined && C14.recovery?.proposals?.length > 0, cuentas(C14));
const C15 = cerrar(observar(5, 'unknown', T1 + HORA));
const C15c = cerrar(observar(6, 'cancelled', T1 + HORA));
check('15 · desenlace DESCONOCIDO: ni éxito ni fallo; A6 dice `unknown`, propone mirar otra vez, y A7 no aprende nada',
  C15.verification?.status === 'unknown' && (C15.recovery?.proposals ?? []).some((p) => p.kind === 'verify_again') &&
  C15.learning?.aggregates?.length === 0 && C15.outcome?.kind === 'unknown', cuentas(C15));
check('15b · y uno CANCELADO tampoco: no se sabe cómo habría acabado, así que no es una muestra de nada',
  C15c.status === 'closed' && C15c.learning?.aggregates?.length === 0 && C15c.outcome?.kind === 'cancelled', cuentas(C15c));

console.log('\n─── B. Determinismo: el orden de llegada no decide ───');

const permutaciones = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutaciones([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
const todasIguales = (xs) => xs.every((x) => igual(x, xs[0]));

const EMPATADAS = [0.9, 0.2, 0.5].map((v) => medida('option.quality', 'o1', v, { at: T1 }));
const resueltas = permutaciones(EMPATADAS).map((p) => A.resolverSenales(p));
check('16 · tres señales empatadas en procedencia, fecha y muestra: la misma resolución en las seis permutaciones',
  todasIguales(resueltas) && resueltas[0].conflictos.length === 1 && resueltas[0].conflictos[0]?.porque === 'orden',
  resueltas.map((r) => r.resueltas[0].value).join(','));
const MISMO_VALOR = [
  { key: 'option.quality', subject: 'o1', value: 0.5, source: 'measured', at: T1 },
  { key: 'option.quality', subject: 'o1', value: 0.5, source: 'measured', at: T1, sampleSize: 0 },
  { key: 'option.quality', subject: 'o1', value: 0.5, source: 'measured', at: T1, nota: 'descriptiva' },
];
check('17 · empatadas también en valor y confianza, distintas en otro campo: se queda la misma, lleguen como lleguen',
  todasIguales(permutaciones(MISMO_VALOR).map((p) => A.resolverSenales(p))));
check('17b · la forma canónica no depende del orden de las claves, y dos cosas distintas no la comparten',
  A.formaCanonica({ b: 1, a: [2, { d: 3, c: 4 }] }) === A.formaCanonica({ a: [2, { c: 4, d: 3 }], b: 1 }) &&
  A.formaCanonica({ a: 1 }) !== A.formaCanonica({ a: '1' }) && A.formaCanonica([1, 2]) !== A.formaCanonica([2, 1]));

/* El caso medido antes de S2-A: la misma opción salía con confianza 0,90 o 0,30 según el orden. */
const ANTES_DEPENDIA = [
  medida('option.quality', 'opcion-a', 0.8, { at: T1, confidence: 0.9 }),
  medida('option.quality', 'opcion-a', 0.7, { at: T1, confidence: 0.3 }),
];
const conMinimo = (senales) => a1.decidir(contexto({ objective: { weights: { quality: 1 } }, constraints: { minConfidence: 0.5 },
  options: [opcion('opcion-a', { quality: 0.8 }), opcion('opcion-b', { quality: 0.7 })], signals: senales }));
const deUnaForma = conMinimo(ANTES_DEPENDIA);
const deLaOtra = conMinimo([...ANTES_DEPENDIA].reverse());
check('18 · el caso que S2-A corrige: con una confianza mínima de 0,5, el orden de dos señales empatadas ya no decide',
  igual(deUnaForma, deLaOtra) && igual(deUnaForma.confidence, deLaOtra.confidence), `${deUnaForma.status} / ${deLaOtra.status}`);

const OPCIONES_3 = [
  opcion('opcion-a', { quality: 0.9, cost: 0.04, latency: 900 }),
  opcion('opcion-b', { quality: 0.7, cost: 0.02, latency: 700 }),
  opcion('opcion-c', { quality: 0.8, cost: 0.03, latency: 800 }),
];
const SENALES_3 = [
  medida('option.quality', 'opcion-a', 0.9, { at: T1 }), medida('option.quality', 'opcion-a', 0.85, { at: T1 }),
  medida('option.cost', 'opcion-b', 0.02), { key: 'option.quality', subject: 'opcion-c', value: 0.8, source: 'model' },
  medida('option.latency', 'opcion-c', 800, { at: T0 }), medida('option.latency', 'opcion-c', 820, { at: T1 }),
];
const HBO_3 = [['opcion-a', { sampleSize: 30, succeeded: 20 }], ['opcion-b', { sampleSize: 30, succeeded: 27 }], ['opcion-c', { sampleSize: 4, succeeded: 4 }]];
const OBJ_3 = { weights: { quality: 1, cost: 1, latency: 1, successProbability: 1 } };
const decidir3 = (opciones, senales, hbo) => a1.decidir(contexto({ objective: OBJ_3, options: opciones, signals: senales,
  historyByOption: Object.fromEntries(hbo), constraints: { maxLatencyMs: 2000, minConfidence: 0.1 } }));
const REFERENCIA_3 = decidir3(OPCIONES_3, SENALES_3, HBO_3);
const variantes = [];
for (const o of permutaciones(OPCIONES_3)) {
  for (const s of [SENALES_3, [...SENALES_3].reverse(), [...SENALES_3.slice(3), ...SENALES_3.slice(0, 3)]]) {
    for (const h of [HBO_3, [...HBO_3].reverse()]) variantes.push(decidir3(o, s, h));
  }
}
check(`19 · A1 con alternativas, evidencia e historial en ${variantes.length} órdenes distintos: la MISMA decisión, byte a byte`,
  variantes.length === 36 && variantes.every((v) => igual(v, REFERENCIA_3)) && REFERENCIA_3.status === 'decided',
  `${elegidaDe(REFERENCIA_3)} · ${REFERENCIA_3.confidence?.value?.toFixed(3)}`);
check('20 · y diez ejecuciones seguidas de lo mismo: diez veces lo mismo',
  Array.from({ length: 10 }, () => decidir3(OPCIONES_3, SENALES_3, HBO_3)).every((v) => igual(v, REFERENCIA_3)));
const registros = [SENALES_3, [...SENALES_3].reverse()].map((s) => A.registroDeDecision(REFERENCIA_3, { ...contexto(), signals: s }, T1, 'x'));
check('21 · el registro para reproducir tampoco depende del orden: las claves de señal, ordenadas',
  igual(registros[0], registros[1]) && igual(registros[0].signalKeys, [...registros[0].signalKeys].sort()));

const EMPATE_EN_PASOS = [...SENALES, ...TAREA.steps.map((s) => ({ key: 'step.latencyMs', subject: s.id, value: 450, source: 'measured', sampleSize: 20 }))];
const cicloEn = (senales) => ciclo.decidir(peticion({ decision: decisionBase({ signals: senales }) }));
const cicloRef = cicloEn(EMPATE_EN_PASOS);
check('22 · el ciclo entero (A8 → A2 → A4 → A3 → A5 → A1) con señales de paso empatadas y barajadas: el mismo resultado',
  cicloRef.status === 'decided' && [[...EMPATE_EN_PASOS].reverse(), [...EMPATE_EN_PASOS.slice(5), ...EMPATE_EN_PASOS.slice(0, 5)]]
    .every((s) => igual(cicloEn(s), cicloRef)));
const ENFOQUES = [
  { id: 'enfoque-1', value: TAREA, values: { quality: 0.8, cost: 0.02 } },
  { id: 'enfoque-2', value: { id: 'C', steps: [paso('a'), paso('d', ['a'])] }, values: { quality: 0.7, cost: 0.01 } },
];
check('23 · con enfoques barajados, el mismo enfoque, el mismo plan y la misma entrega',
  igual(ciclo.decidir(peticion({ tarea: undefined, enfoques: ENFOQUES })), ciclo.decidir(peticion({ tarea: undefined, enfoques: [...ENFOQUES].reverse() }))));

/* El historial del ciclo: agregados reales de A7, y dos «fotos» del mismo acumulador con igual fecha y muestra. */
const resultadosAB = [];
for (let i = 0; i < 12; i++) {
  for (const sid of ['alt-a', 'alt-b']) {
    resultadosAB.push({ id: `o-${sid}-${i}`, kind: (sid === 'alt-a' ? i % 3 : i % 6) === 0 ? 'failure' : 'success',
      at: T1 - (12 - i) * HORA, scope: { capability: CAP, strategyId: sid } });
  }
}
const APRENDIDO = a7.aprender({ ahora: T1, policy: POL, outcomes: resultadosAB }).aggregates;
const original = APRENDIDO.find((a) => a.metric === 'strategy.succeeded' && a.scope.strategyId === 'alt-a');
const gemelo = { ...original, favorables: original.favorables - 3, suma: original.suma - 3 };
const pedirContexto = (learned) => a8.seleccionar({ ahora: T1, scope: { capability: CAP }, learned, learningPolicy: POL,
  objective: { weights: { successProbability: 1 } } });
check('24 · A8 con dos fotos del mismo acumulador (misma fecha, misma muestra, distinto contenido): la misma selección, lleguen como lleguen',
  igual(pedirContexto([...APRENDIDO, gemelo]), pedirContexto([gemelo, ...APRENDIDO])) &&
  igual(pedirContexto([...APRENDIDO, gemelo]), pedirContexto([...APRENDIDO].reverse().concat([gemelo]))) &&
  pedirContexto([...APRENDIDO, gemelo]).metricas.duplicadas === 1);
check('24b · y dos fotos IDÉNTICAS son la misma foto: da igual cuál quede',
  igual(pedirContexto([...APRENDIDO, { ...original }]), pedirContexto([{ ...original }, ...APRENDIDO])) &&
  pedirContexto([...APRENDIDO, { ...original }]).metricas.duplicadas === 1);
const rotoA = { ...original, ultimo: NaN }; const rotoB = { ...original, ultimo: NaN, favorables: 0, suma: 0 };
const OTROS = APRENDIDO.filter((a) => a !== original);
check('24c · y una fecha que no es un número no corta el desempate (`NaN !== NaN`): tampoco ahí decide el orden',
  igual(pedirContexto([...OTROS, rotoA, rotoB]), pedirContexto([rotoB, ...OTROS, rotoA])) &&
  pedirContexto([...OTROS, rotoA, rotoB]).metricas.duplicadas === 1);
const pedirCiclo = (learned) => ciclo.decidir({ decision: { contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA,
  objective: { weights: { successProbability: 1, latency: 1 } },
  options: [opcion('alt-a', { latency: 500 }), opcion('alt-b', { latency: 500 })] },
aprendido: { ahora: T1, scope: { capability: CAP }, learned, learningPolicy: POL } });
check('25 · el ciclo con el historial barajado —duplicado incluido—: el mismo contexto, la misma decisión',
  igual(pedirCiclo([...APRENDIDO, gemelo]), pedirCiclo([gemelo, ...[...APRENDIDO].reverse()])));
const ESTRATEGIAS = R.strategies?.estrategias ?? [];
const EVIDENCIA = SENALES.map((s) => ({ claim: s.key, signal: s, supports: true }));
const optimizar = (c, e) => a5.optimizar({ candidates: c, objective: OBJ_CICLO, evidence: e, baselineId: ESTRATEGIAS.find((x) => x.value.isBaseline)?.id });
check('26 · A5 con candidatos y evidencia barajados: la misma factibilidad, el mismo frente, las mismas propuestas',
  ESTRATEGIAS.length > 1 && igual(optimizar(ESTRATEGIAS, EVIDENCIA), optimizar([...ESTRATEGIAS].reverse(), [...EVIDENCIA].reverse())));

console.log('\n─── C. Pareto: un frente, nunca un ganador ───');

check('27 · A mejor en calidad, B en coste: las dos en el frente, ordenadas, y se dice que no hay ganadora objetiva',
  igual(E1.paretoFront, ['opcion-a', 'opcion-b']) && E1.warnings.includes('no_dominant_option') &&
  E1.explanation.some((f) => f.startsWith('No hay una ganadora objetiva')));
check('28 · y se elige por el OBJETIVO, no por estar en el frente: el frente dice «hay que elegir», no a quién',
  elegidaDe(E1) === 'opcion-b' && E1.selectedScore?.total > candidata(E1, 'opcion-a')?.score?.total);
const CON_DOMINADA = a1.decidir(contexto({ options: [
  opcion('opcion-a', { quality: 0.9, cost: 0.04 }), opcion('opcion-b', { quality: 0.7, cost: 0.02 }), opcion('opcion-c', { quality: 0.6, cost: 0.05 })] }));
check('29 · una dominada en todo queda FUERA del frente, pero sigue siendo una candidata válida con su puntuación',
  igual(CON_DOMINADA.paretoFront, ['opcion-a', 'opcion-b']) && candidata(CON_DOMINADA, 'opcion-c')?.eligible === true &&
  candidata(CON_DOMINADA, 'opcion-c')?.reason === 'lower_score' && !!candidata(CON_DOMINADA, 'opcion-c')?.score);
const CON_INVIABLE = a1.decidir(contexto({ constraints: { maxLatencyMs: 1000 }, options: [
  opcion('opcion-a', { quality: 0.9, cost: 0.04, latency: 500 }), opcion('opcion-b', { quality: 0.7, cost: 0.02, latency: 500 }),
  opcion('opcion-d', { quality: 0.99, cost: 0.001, latency: 5000 })] }));
check('30 · la factibilidad va ANTES que Pareto: una que dominaría a todas pero no cumple, ni puntúa ni entra en el frente',
  igual(CON_INVIABLE.paretoFront, ['opcion-a', 'opcion-b']) && candidata(CON_INVIABLE, 'opcion-d')?.reason === 'constraint:maxLatencyMs' &&
  candidata(CON_INVIABLE, 'opcion-d')?.score === undefined);
const BAJO_MINIMO = a1.decidir(contexto({ constraints: { minConfidence: 0.5 },
  options: [opcion('opcion-a', { quality: 0.9, cost: 0.04 }), opcion('opcion-b', { quality: 0.7, cost: 0.02 })],
  signals: [medida('option.quality', 'opcion-a', 0.9), medida('option.cost', 'opcion-a', 0.04)] }));
check('31 · y la confianza mínima también: lo que no la alcanza no compite, ni en el frente',
  BAJO_MINIMO.paretoFront === undefined && candidata(BAJO_MINIMO, 'opcion-b')?.reason === 'constraint:minConfidence' &&
  elegidaDe(BAJO_MINIMO) === 'opcion-a' && !BAJO_MINIMO.warnings.includes('no_dominant_option'));
const DOMINANTE = a1.decidir(contexto({ options: [opcion('opcion-a', { quality: 0.9, cost: 0.01 }), opcion('opcion-b', { quality: 0.7, cost: 0.02 })] }));
check('32 · con una que domina a todas no hay frente que contar: ni `paretoFront` ni aviso',
  DOMINANTE.paretoFront === undefined && !DOMINANTE.warnings.includes('no_dominant_option') && elegidaDe(DOMINANTE) === 'opcion-a');
const sinPeso = A.pareto([opcion('x', { quality: 0.8, cost: 0.01 }), opcion('y', { quality: 0.8, cost: 0.05 })], { weights: { quality: 1 } });
check('33 · Pareto solo mira ejes CON PESO: un coste que el objetivo no pondera no domina a nadie',
  igual(sinPeso.map((c) => c.id), ['x', 'y']));
const CLAVES_DE_A5 = Object.keys(optimizar(ESTRATEGIAS, EVIDENCIA)).sort();
const CLAVES_DE_A1 = Object.keys(REFERENCIA_3).sort();
const GANADOR = /winner|best|ganador|mejor|champion|recommend/i;
check('34 · ni A5 ni A1 traen un campo «ganador»: A5 da factibles, frente y propuestas; la recomendación de A1 es `selected`',
  !CLAVES_DE_A5.some((k) => GANADOR.test(k)) && !CLAVES_DE_A1.some((k) => GANADOR.test(k)) &&
  igual(CLAVES_DE_A5, ['baselineId', 'discarded', 'feasible', 'metricas', 'pareto', 'proposals', 'rejected', 'spend', 'stoppedBecause']),
  CLAVES_DE_A5.join(','));

console.log('\n─── D. Ninguna implementación como autoridad ───');

/* Las mismas claves que la frontera de siempre (`claveDeImplementacion`), en las dos grafías que normaliza. */
const CLAVES = ['providerId', 'modelId', 'adapterId', 'provider', 'model', 'adapter', 'implementation', 'implementationRef',
  'allowedProviders', 'excludeProviders', 'provider_id', 'Model-Id'];
const MARCA = ['fuga', 'de', 'implementacion'].join('-');
const limpio = (x) => A.violacionesEn(x, 'salida').length === 0 && !JSON.stringify(x ?? null).includes(MARCA);
const OPCIONES_AB = [opcion('opcion-a', { quality: 0.9, cost: 0.04 }), opcion('opcion-b', { quality: 0.7, cost: 0.02 })];
const POSICIONES_A1 = [
  ['el objetivo', (k) => ({ weights: { quality: 1, cost: 1 }, [k]: MARCA }), undefined],
  ['las restricciones del objetivo', (k) => ({ weights: { quality: 1, cost: 1 }, constraints: { [k]: MARCA } }), undefined],
  ['las restricciones', undefined, (k) => ({ [k]: MARCA })],
  ['el presupuesto', undefined, (k) => ({ budget: { maxUsd: 1, [k]: MARCA } })],
  ['la calidad exigida', undefined, (k) => ({ quality: { minScore: 0.1, [k]: MARCA } })],
];
for (const [donde, objetivo, restricciones] of POSICIONES_A1) {
  const malas = CLAVES.filter((k) => {
    const d = sinReventar(() => a1.decidir(contexto({ options: OPCIONES_AB,
      ...(objetivo ? { objective: objetivo(k) } : {}), ...(restricciones ? { constraints: restricciones(k) } : {}) })));
    return !(d.status === 'invalid' && d.failure === 'authority_violation' && d.warnings?.includes('authority_violation') &&
      d.selected === undefined && d.constraints === undefined && limpio(d));
  });
  check(`35 · A1 · una implementación en ${donde}: petición inválida, sin decidir y sin repetirla (${CLAVES.length} claves)`,
    malas.length === 0, malas.join(', '));
}
const conOpcionMala = a1.decidir(contexto({ options: [...OPCIONES_AB, opcion('opcion-z', { quality: 1, cost: 0.001 }, { providerId: MARCA })] }));
check('36 · A1 · una alternativa que nombra una implementación no compite —aunque lo gane todo— y las demás sí',
  conOpcionMala.status === 'decided' && candidata(conOpcionMala, 'opcion-z')?.reason === 'authority:providerId' &&
  elegidaDe(conOpcionMala) !== 'opcion-z' && limpio(conOpcionMala.selected));
const hboMalo = a1.decidir(contexto({ objective: OBJ_EXITO, options: MISMO_COSTE,
  historyByOption: { 'opcion-b': { sampleSize: 20, succeeded: 20, providerId: MARCA } }, history: { sampleSize: 50, succeeded: 40, modelId: MARCA } }));
check('37 · A1 · un historial que nombra una implementación no se lee: ni el de la alternativa ni el del ámbito',
  elegidaDe(hboMalo) === elegidaDe(E_SIN) && hboMalo.status === 'decided' && !(hboMalo.signalKeys ?? []).includes('history.successRate') &&
  !(hboMalo.signalKeys ?? []).includes('history.decision') &&
  hboMalo.explanation.some((f) => f.includes('nombra una implementación (providerId)')) &&
  hboMalo.explanation.some((f) => f.includes('historial del ámbito que no se puede leer')));
const SENALES_DESCRIPTIVAS = SENALES_FIABLES.map((s) => ({ ...s, providerId: MARCA }));
const describe = a1.decidir(contexto({ objective: { weights: { reliability: 1, cost: 1 } }, options: FIABLES, signals: SENALES_DESCRIPTIVAS }));
check('38 · A1 · una señal puede DESCRIBIR una implementación y no decide nada por ello: misma elección, misma confianza, mismas puntuaciones',
  elegidaDe(describe) === elegidaDe(E6) && describe.confidence.value === E6.confidence.value &&
  igual(describe.candidates.map((c) => c.score), E6.candidates.map((c) => c.score)));

const POSICIONES_CICLO = [
  ['el objetivo', (k) => ({ decision: decisionBase({ objective: { ...OBJ_CICLO, [k]: MARCA } }) })],
  ['las restricciones del objetivo', (k) => ({ decision: decisionBase({ objective: { ...OBJ_CICLO, constraints: { [k]: MARCA } } }) })],
  ['las restricciones', (k) => ({ decision: decisionBase({ constraints: { [k]: MARCA } }) })],
  ['el presupuesto', (k) => ({ decision: decisionBase({ constraints: { budget: { maxUsd: 5, [k]: MARCA } } }) })],
  ['el ámbito de lo aprendido', (k) => ({ aprendido: { ahora: T1, scope: { capability: CAP, [k]: MARCA }, learned: [], learningPolicy: POL } })],
  ['los requisitos de evidencia', (k) => ({ aprendido: { ahora: T1, scope: { capability: CAP }, requirements: { minSampleSize: 5, [k]: MARCA }, learned: [], learningPolicy: POL } })],
];
for (const [donde, pieza] of POSICIONES_CICLO) {
  const malas = CLAVES.filter((k) => {
    const r = sinReventar(() => ciclo.decidir(peticion(pieza(k))));
    return !(r.status === 'invalid' && r.parada === 'authority_violation' && igual(r.recorrido, []) && r.entrega === undefined && limpio(r));
  });
  check(`39 · A9 · una implementación en ${donde}: se para ANTES de pensar nada, sin entrega y sin repetirla`, malas.length === 0, malas.join(', '));
}
const expectedMalo = CLAVES.filter((k) => {
  const r = sinReventar(() => ciclo.decidir(peticion({ expected: [{ kind: 'text', quality: { minScore: 0.8 }, [k]: MARCA }] })));
  return !(r.status === 'invalid' && r.parada === 'authority_violation' && r.entrega === undefined && !r.recorrido.includes('handoff') && limpio(r));
});
check('40 · A9 · una implementación en lo ESPERADO: la entrega la llevaría, así que no se entrega', expectedMalo.length === 0, expectedMalo.join(', '));
const EN_PASOS = [
  ['sus pistas', (k) => ({ ...paso('b', ['a']), hints: { [k]: MARCA } })],
  ['su entrada', (k) => ({ ...paso('b', ['a']), input: { [k]: MARCA } })],
  ['su raíz', (k) => ({ ...paso('b', ['a']), [k]: MARCA })],
];
/*
 * 41 · Una implementación dentro de un PASO. Hasta R4 esto era una sola
 * comprobación que decía «ninguna estrategia que la lleve compite» sin llegar
 * nunca a A1: A3 las apartaba antes —medido: en los 36 casos A1 recibió cero
 * candidatas—, así que esa mitad se cumplía sin mirarse. Ahora son dos, y cada
 * una prueba lo que dice: la 41 LLEVA la estrategia hasta A1 —una de las que A3
 * genera de verdad, con la clave puesta y unos valores que lo ganarían todo—, y
 * la 41b dice DÓNDE se para en el ciclo.
 */
const ESTRATEGIAS_41 = R.strategies?.estrategias ?? [];
const GANADORA = { latency: 1, reliability: 1 };
const contaminar = (alt, pasoMalo) => ({
  id: 'contaminada',
  value: { ...alt.value, id: 'contaminada', steps: alt.value.steps.map((s) => (s.id === 'b' ? pasoMalo(s) : s)) },
  values: GANADORA,
});
const conPasoMalo = {
  'sus pistas': (k) => (s) => ({ ...s, hints: { ...(s.hints ?? {}), [k]: MARCA } }),
  'su entrada': (k) => (s) => ({ ...s, input: { ...(s.input ?? {}), [k]: MARCA } }),
  'su raíz': (k) => (s) => ({ ...s, [k]: MARCA }),
};
const decidirEntre = (opciones) => a1.decidir(contexto({ objective: OBJ_CICLO, options: opciones, signals: R.strategies?.signals ?? [] }));
/* Control: la misma, LIMPIA, con esos valores, gana. Sin él, «aunque lo gane todo» no probaría nada. */
const controlLimpio = decidirEntre([...ESTRATEGIAS_41, contaminar(ESTRATEGIAS_41[0], (s) => s)]);
for (const [donde] of EN_PASOS) {
  const malas = CLAVES.filter((k) => {
    const d = sinReventar(() => decidirEntre([...ESTRATEGIAS_41, contaminar(ESTRATEGIAS_41[0], conPasoMalo[donde](k))]));
    const c = candidata(d, 'contaminada');
    return !(!('lanzo' in d) && d.status === 'decided' && c?.eligible === false && c?.reason === `authority:${k}` &&
      c?.score === undefined && elegidaDe(d) !== 'contaminada' && limpio(d.selected));
  });
  check(`41 · A1 · una estrategia con una implementación en un paso (${donde}) llega a A1 y no compite, aunque lo gane todo: fuera por autoridad, y se elige otra`,
    ESTRATEGIAS_41.length > 1 && elegidaDe(controlLimpio) === 'contaminada' && malas.length === 0,
    `control=${elegidaDe(controlLimpio)} · ${malas.join(', ') || `${CLAVES.length} claves`}`);
}
for (const [donde, pasoMalo] of EN_PASOS) {
  const malas = CLAVES.filter((k) => {
    const t = { id: 'T', steps: [paso('a'), pasoMalo(k)] };
    const r = sinReventar(() => ciclo.decidir(peticion({ tarea: t, decision: decisionBase({ signals: senalesDe(t) }) })));
    const rechazadas = r.strategies?.rechazadas ?? [];
    return !(!('lanzo' in r) && rechazadas.length > 0 && rechazadas.every((x) => x.reason === 'authority') &&
      (r.strategies?.estrategias ?? []).length === 0 && (r.decision?.candidates ?? []).length === 0 &&
      r.status !== 'decided' && r.entrega === undefined);
  });
  check(`41b · A9 · y por el ciclo (${donde}), A3 la aparta antes, por autoridad: A1 no recibe ninguna y no hay entrega`,
    malas.length === 0, malas.join(', ') || `${CLAVES.length} claves`);
}
const enfoqueMalo = ciclo.decidir(peticion({ tarea: undefined, enfoques: [
  { id: 'enfoque-1', value: { ...TAREA, providerId: MARCA }, values: { quality: 0.99, cost: 0.001 } }, ENFOQUES[1]] }));
check('42 · A9 · un enfoque que nombra una implementación no se elige, aunque lo gane todo: se sigue con el otro',
  enfoqueMalo.status === 'decided' && candidata(enfoqueMalo.approach, 'enfoque-1')?.reason === 'authority:providerId' &&
  elegidaDe(enfoqueMalo.approach) === 'enfoque-2' && limpio(enfoqueMalo.entrega));
const NORMALES = [R, cicloRef, ciclo.decidir(peticion({ tarea: undefined, enfoques: ENFOQUES })), pedirCiclo(APRENDIDO)];
const CAMPOS_DE_ENTREGA = ['constraints', 'elegida', 'expected', 'plan'];
check('43 · y en todo lo que sí se entrega: ni una clave de implementación, y solo plan, elegida, restricciones y lo esperado',
  NORMALES.every((r) => r.status === 'decided' && limpio(r.entrega) && Object.keys(r.entrega).every((k) => CAMPOS_DE_ENTREGA.includes(k))),
  NORMALES.map((r) => Object.keys(r.entrega ?? {}).join('+')).join(' · '));

/* Lo aprendido PUEDE describir implementaciones —es lo que pasó—, pero a una decisión de otro ámbito no le llega. */
const OPC_AB = [opcion('strategy-A', { latency: 1200, cost: 1 }), opcion('strategy-B', { latency: 800, cost: 3 })];
const resultadosDe = (conProveedor) => Array.from({ length: 80 }, (_, i) => {
  const sid = i % 2 === 0 ? 'strategy-A' : 'strategy-B';
  return { id: `r${i}`, kind: sid === 'strategy-A' ? 'success' : 'failure', at: T1 + (i + 1) * HORA,
    scope: { capability: CAP, strategyId: sid, ...(conProveedor ? { providerId: 'p-descrito' } : {}) } };
});
const T_AB = T1 + 82 * HORA;
const aprenderAB = (conProveedor) => a7.aprender({ ahora: T_AB, policy: POL, outcomes: resultadosDe(conProveedor) }).aggregates;
const decidirAB = (learned) => ciclo.decidir({ decision: { contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA,
  objective: { weights: { latency: 1, reliability: 1, successProbability: 2 } }, options: OPC_AB },
aprendido: { ahora: T_AB, scope: { capability: CAP }, learned, learningPolicy: POL } });
const sinAprender = decidirAB([]);
const conNeutro = decidirAB(aprenderAB(false));
const conDescrito = decidirAB(aprenderAB(true));
check('44 · control: el MISMO aprendizaje en el ámbito de la decisión sí cambia la elección (la evidencia es fuerte)',
  sinAprender.entrega?.elegida === 'strategy-B' && conNeutro.entrega?.elegida === 'strategy-A',
  `${sinAprender.entrega?.elegida} → ${conNeutro.entrega?.elegida}`);
/* Sin contexto no hay nada que agrupar: se dice con una lista vacía, no reventando. */
const rutasDescritas = conDescrito.context ? A.paraRouter(conDescrito.context) : [];
check('45 · y aprendido en el ámbito de UNA implementación no condiciona la decisión: A8 lo tiene, A1 no lo recibe',
  conDescrito.status === 'decided' && igual(conDescrito.decision, sinAprender.decision) && conDescrito.historialPorAlternativa === undefined &&
  rutasDescritas.length === 1 && rutasDescritas[0]?.providerId === 'p-descrito',
  `${conDescrito.status} · ${conDescrito.entrega?.elegida} · paraRouter=${rutasDescritas.length}`);

console.log('\n─── E. La frontera con el Router ───');

const srcObjetivo = sinComentarios(leer('functions/src/core/algorithm/objective.ts'));
const srcRouter = sinComentarios(leer('functions/src/core/router.ts'));
const camposDe = (src, nombre) => {
  const m = src.match(new RegExp(`export interface ${nombre}\\s*\\{([\\s\\S]*?)\\n\\}`));
  return m ? [...m[1].matchAll(/^\s*(?:readonly\s+)?([A-Za-z]\w*)\??\s*:/gm)].map((x) => x[1]).sort() : [];
};
const CAMPOS_ALG = camposDe(srcObjetivo, 'AlgorithmConstraints');
const CAMPOS_RUTA = camposDe(srcRouter, 'RoutingConstraints');
check('46 · cada requisito tiene un lector declarado: las claves de `DESTINO_DEL_REQUISITO` son las de `AlgorithmConstraints`, ni una más ni una menos',
  CAMPOS_ALG.length === 10 && igual(Object.keys(A.DESTINO_DEL_REQUISITO).sort(), CAMPOS_ALG), CAMPOS_ALG.join(','));
const PARA_EL_ROUTER = Object.entries(A.DESTINO_DEL_REQUISITO).filter(([, v]) => v === 'router').map(([k]) => k).sort();
check('47 · lo que va al Router es lo que el Router YA lee: presupuesto y calidad, campos de `RoutingConstraints`',
  igual(PARA_EL_ROUTER, ['budget', 'quality']) && PARA_EL_ROUTER.every((k) => CAMPOS_RUTA.includes(k)), CAMPOS_RUTA.join(','));
check('48 · con SUS tipos, no con una copia: `Budget` de core/cost y `QualityRequirement` de core/workflow, en los dos lados',
  /budget\?:\s*Budget;/.test(srcObjetivo) && /quality\?:\s*QualityRequirement;/.test(srcObjetivo) &&
  /budget\?:\s*Budget;/.test(srcRouter) && /quality\?:\s*QualityRequirement;/.test(srcRouter) &&
  /import \{ Budget \} from '\.\.\/cost';/.test(srcObjetivo) && /import \{ QualityRequirement \} from '\.\.\/workflow';/.test(srcObjetivo) &&
  /import \{ Budget \} from '\.\/cost';/.test(srcRouter) && /import \{ QualityRequirement \} from '\.\/workflow';/.test(srcRouter));
check('49 · y los destinos son un vocabulario cerrado: router, orchestrator, execution, decision',
  [...new Set(Object.values(A.DESTINO_DEL_REQUISITO))].sort().join(',') === 'decision,execution,orchestrator,router');

/* `onExceed` es del vocabulario de `Budget` —`fail` | `degrade`, el mismo que valida el Router—; hasta R4 decía `reject`, que no existe. */
const EXIGIDO = { maxLatencyMs: 5000, budget: { maxUsd: 1, onExceed: 'fail' }, quality: { minScore: 0.7 }, maxParallel: 2,
  deadlineAt: T1, maxSteps: 6, maxRisk: 0.2, minConfidence: 0.1, forbiddenCapabilities: ['otra.cosa'], requiredCapabilities: [CAP] };
const reparto = A.repartirRequisitos(EXIGIDO);
check('50 · el reparto: cada requisito a su lector, con su valor tal cual —sin calcular nada—',
  reparto.ok && igual(reparto.porDestino.router, { budget: EXIGIDO.budget, quality: EXIGIDO.quality }) &&
  igual(reparto.porDestino.orchestrator, { maxParallel: 2 }) && igual(reparto.porDestino.execution, { deadlineAt: T1, maxLatencyMs: 5000 }) &&
  reparto.porDestino.router.budget === EXIGIDO.budget && reparto.sinDestino.length === 0, JSON.stringify(reparto.porDestino));
const alReves = Object.fromEntries(Object.entries(EXIGIDO).reverse());
check('51 · determinista, serializable y acotado: el mismo reparto con las claves en otro orden, y JSON de ida y vuelta',
  igual(A.repartirRequisitos(alReves), reparto) && igual(JSON.parse(JSON.stringify(reparto)), reparto) &&
  Object.isFrozen(reparto) && Object.isFrozen(reparto.porDestino.router));
check('52 · lo que no tiene lector se DICE, ordenado; lo ausente no inventa un destino',
  igual(A.repartirRequisitos({ zeta: 1, alfa: 2, maxSteps: 3 }).sinDestino, ['alfa', 'zeta']) &&
  igual(A.repartirRequisitos(undefined), { ok: true, porDestino: { router: {}, orchestrator: {}, execution: {}, decision: {} }, sinDestino: [] }));
const repartosMalos = CLAVES.filter((k) => {
  const r = A.repartirRequisitos({ maxSteps: 3, budget: { maxUsd: 1, [k]: MARCA } });
  return !(r.ok === false && r.violaciones.length === 1 && !('porDestino' in r) && limpio(r));
});
check('53 · y un requisito que nombra una implementación no se reparte: ni al Router se le dice CON QUÉ', repartosMalos.length === 0, repartosMalos.join(', '));

const RESTRICCION_OBJ = { maxLatencyMs: 5000, quality: { minScore: 0.7 } };
const RESTRICCION_CTX = { maxLatencyMs: 8000, budget: { maxUsd: 1 } };
/* Con la calidad de cada paso MEDIDA: sin ella, un mínimo de calidad no se puede comprobar y nada compite (regla 65). */
const CON_CALIDAD = [...SENALES, ...TAREA.steps.map((s) => ({ key: 'step.quality', subject: s.id, value: 0.9, source: 'measured', sampleSize: 20 }))];
const ENTREGA_EFECTIVA = ciclo.decidir(peticion({ decision: decisionBase({ signals: CON_CALIDAD,
  objective: { ...OBJ_CICLO, constraints: RESTRICCION_OBJ }, constraints: RESTRICCION_CTX }) }));
check('54 · la entrega lleva las restricciones EFECTIVAS: las de la petición y las de su objetivo, con lo más estrecho mandando',
  ENTREGA_EFECTIVA.status === 'decided' && ENTREGA_EFECTIVA.entrega?.constraints?.maxLatencyMs === 5000 &&
  ENTREGA_EFECTIVA.entrega?.constraints?.budget?.maxUsd === 1 && ENTREGA_EFECTIVA.entrega?.constraints?.quality?.minScore === 0.7 &&
  igual(ENTREGA_EFECTIVA.entrega?.constraints, ENTREGA_EFECTIVA.decision?.constraints),
  JSON.stringify(ENTREGA_EFECTIVA.entrega?.constraints));
const COMPOSICION = (r) => ({ decomposition: r.decomposition, parallelization: r.parallelization, strategies: r.strategies, optimization: r.optimization });
/*
 * Uno por etapa, porque cada una lee requisitos distintos: A2 y A4 el
 * paralelismo; A3 la latencia de lo que conoce; A5 la usa para PROPONER
 * —«quitar comprobaciones» solo existe con un tope de latencia y más de un punto
 * de comprobación, así que su tarea tiene dos pasos de los que cuelgan dos—.
 */
const TAREA_CP = Object.freeze({ id: 'TC', steps: [paso('a'), paso('b', ['a']), paso('c', ['a']), paso('d', ['b']), paso('e', ['b']), paso('f', ['c', 'd', 'e'])] });
for (const [que, limite, etapa, t] of [
  ['maxParallel → A2 y A4', { maxParallel: 1 }, (r) => [r.decomposition, r.parallelization], TAREA],
  ['maxLatencyMs → A3', { maxLatencyMs: 1000 }, (r) => [r.strategies], TAREA],
  ['maxLatencyMs → A5', { maxLatencyMs: 60000 }, (r) => [r.optimization], TAREA_CP],
]) {
  const pedir = (d) => peticion({ tarea: t, decision: decisionBase({ signals: senalesDe(t), ...d }) });
  const enLaPeticion = ciclo.decidir(pedir({ constraints: limite }));
  const enElObjetivo = ciclo.decidir(pedir({ objective: { ...OBJ_CICLO, constraints: limite } }));
  const sinNada = ciclo.decidir(pedir({}));
  check(`55 · ${que}: se compone lo mismo lo declare la petición o su objetivo, y sin el requisito esa etapa compone otra cosa`,
    igual(COMPOSICION(enLaPeticion), COMPOSICION(enElObjetivo)) && igual(enLaPeticion.entrega, enElObjetivo.entrega) &&
    !igual(etapa(enLaPeticion), etapa(sinNada)),
    `${enLaPeticion.status} · ${enLaPeticion.strategies?.estrategias?.length} estrategia(s) · ${enLaPeticion.optimization?.proposals?.length} propuesta(s) de A5`);
}

const FUENTES_SRC = (dir) => fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true }).flatMap((e) => {
  const p = `${dir}/${e.name}`;
  return e.isDirectory() ? FUENTES_SRC(p) : e.name.endsWith('.ts') ? [p] : [];
});
const FUERA_DEL_MOTOR = FUENTES_SRC('functions/src').filter((p) => !p.startsWith('functions/src/core/algorithm/'));
const usanElReparto = FUERA_DEL_MOTOR.filter((p) => /repartirRequisitos|DESTINO_DEL_REQUISITO|paraRouter/.test(sinComentarios(leer(p))));
check('56 · el contrato previo al Router NO está conectado: fuera del motor nadie usa el reparto ni `paraRouter`',
  usanElReparto.length === 0, usanElReparto.join(', '));
check('57 · el Router no conoce al Algorithm Engine y el ciclo no importa el Router: ni un import en ninguna dirección',
  !/from '\.\/algorithm/.test(srcRouter) && !/DESTINO_DEL_REQUISITO|repartirRequisitos|AlgorithmConstraints/.test(srcRouter) &&
  FUENTES_SRC('functions/src/core/algorithm').every((p) => !/from '\.\.\/router'|from '\.\.\/\.\.\/runtime/.test(sinComentarios(leer(p)))));
const srcIntegracion = sinComentarios(leer('functions/src/core/algorithm/integration.ts'));
check('58 · no se duplica `RoutingConstraints`: ni el tipo, ni sus campos propios (modalidades, región) en el motor',
  !/RoutingConstraints|inputModality|outputModality|\bregion\b/.test(srcIntegracion) &&
  FUENTES_SRC('functions/src/core/algorithm').every((p) => !/interface \w*Rout\w*|interface \w*Router\w*/.test(sinComentarios(leer(p)))));
const FABRICAS = Object.keys(A).filter((k) => /^crearMotorDe/.test(k)).sort();
check('59 · ningún motor nuevo: los nueve de siempre, y ningún archivo de calidad, rutas, evidencia o aprendizaje «independiente»',
  igual(FABRICAS, ['crearMotorDeContexto', 'crearMotorDeDecision', 'crearMotorDeDescomposicion', 'crearMotorDeEstrategias', 'crearMotorDeFeedback',
    'crearMotorDeOptimizacion', 'crearMotorDeParalelizacion', 'crearMotorDeRecuperacion', 'crearMotorDeVerificacion']) &&
  !FUENTES_SRC('functions/src/core/algorithm').some((p) => /(quality|routing|router|evidence|learning)[-_]?engine|film|decision-outcome/i.test(path.basename(p))),
  FABRICAS.length + ' fábricas');

const DOC = leer('docs/ALGORITHM-ENGINE.md');
check('59b · el documento lo dice como es: el Algorithm Engine decide QUÉ, el Router CON QUÉ, el adaptador ejecuta —y en ningún sitio que el Algorithm Engine elija el proveedor—',
  DOC.includes('Decision Quality and Router Boundary') && /\*\*Algorithm Engine\*\*: QUÉ se ejecuta/.test(DOC) &&
  /\*\*Router\*\*: CON QUÉ/.test(DOC) && /\*\*Adaptador del proveedor\*\*: la ejecución/.test(DOC) &&
  !/Algorithm Engine (elige|escoge|selecciona|chooses|selects|picks)\b/i.test(DOC));

console.log('\n─── F. Confianza e incertidumbre ───');

/* La forma de S1: una tarea sin nada medido. Hay evidencia ESTRUCTURAL, y ningún eje con peso medido. */
const COMO_S1 = ciclo.decidir(peticion({ decision: decisionBase({ signals: [] }), aprendido: undefined }));
check('60 · la confianza 0 de S1 es la respuesta correcta: hay evidencia estructural, pero ningún eje con peso se midió (cobertura 0)',
  COMO_S1.status === 'decided' && COMO_S1.decision.confidence.value === 0 && COMO_S1.decision.selectedScore.coverage === 0 &&
  COMO_S1.decision.confidence.basis.length > 0 && COMO_S1.decision.uncertainty === 'unknown' &&
  ['latency', 'reliability'].every((e) => COMO_S1.decision.selectedScore.missing.includes(e)) && COMO_S1.decision.warnings.includes('low_confidence'),
  COMO_S1.decision.confidence.because);
check('61 · y en cuanto se MIDE un eje con peso, deja de ser 0: la cobertura sube a la mitad y se dice qué falta',
  R.status === 'decided' && R.decision?.confidence?.value > 0 && casi(R.decision?.selectedScore?.coverage, 0.5) &&
  igual(R.decision?.selectedScore?.missing, ['reliability']) && R.decision?.uncertainty !== 'unknown',
  `${R.decision?.confidence?.value?.toFixed(2)} · ${R.decision?.uncertainty}`);
check('62 · sin base no hay certeza, diga lo que diga el número: una confianza de 0,9 sin evidencia es `unknown`',
  A.incertidumbreDe({ kind: 'algorithm', value: 0.9, basis: [], because: 'x' }) === 'unknown' && A.incertidumbreDe(undefined) === 'unknown' &&
  A.incertidumbreDe({ kind: 'algorithm', value: NaN, basis: [aFavor], because: 'x' }) === 'unknown');
check('63 · la incertidumbre es una palabra de un vocabulario cerrado, con los umbrales declarados, no un porcentaje',
  [[0.9, 'known'], [0.7, 'probable'], [0.3, 'uncertain'], [0.1, 'unknown']]
    .every(([v, u]) => A.incertidumbreDe({ kind: 'algorithm', value: v, basis: [aFavor], because: 'x' }) === u) &&
  A.UMBRAL_CONOCIDO === 0.85 && A.UMBRAL_PROBABLE === 0.6 && A.UMBRAL_INCIERTO === 0.25);
const VALOR_PERSONA = a1.decidir(contexto({ objective: { weights: { userValue: 1, quality: 1 } },
  options: [opcion('opcion-a', { quality: 0.9 }), opcion('opcion-b', { quality: 0.6 })] }));
const SOLO_CALIDAD = a1.decidir(contexto({ objective: { weights: { quality: 1 } },
  options: [opcion('opcion-a', { quality: 0.9 }), opcion('opcion-b', { quality: 0.6 })] }));
check('64 · lo que nadie mide —el valor para la persona— falta, no vale 0: baja la cobertura y no toca el total',
  (VALOR_PERSONA.selectedScore?.missing ?? []).includes('userValue') && casi(VALOR_PERSONA.selectedScore?.coverage, 0.5) &&
  casi(VALOR_PERSONA.selectedScore?.total, SOLO_CALIDAD.selectedScore?.total) &&
  VALOR_PERSONA.explanation.some((f) => f.includes('Lo que falta NO se contó como malo')));
const SIN_COSTE = a1.decidir(contexto({ constraints: { budget: { maxUsd: 0.05 } }, options: [opcion('opcion-a', { quality: 0.9 }), opcion('opcion-b', { quality: 0.6, cost: 0.01 })] }));
check('65 · lo que no se puede COMPROBAR contra un límite se dice como tal: `unverifiable:`, no «no cumple»',
  candidata(SIN_COSTE, 'opcion-a')?.reason === 'unverifiable:budget.maxUsd' && SIN_COSTE.warnings.includes('constraint_unverifiable') &&
  elegidaDe(SIN_COSTE) === 'opcion-b');
const CON_FUENTE = (source) => a1.decidir(contexto({ objective: { weights: { quality: 1 } }, options: [opcion('o', { quality: 0.8 })],
  signals: [{ key: 'option.quality', subject: 'o', value: 0.8, source }] })).confidence.value;
check('66 · los números declarados no son evidencia; la procedencia de la señal, sí: medida > catálogo > deducida > modelo > defecto',
  a1.decidir(contexto({ objective: { weights: { quality: 1 } }, options: [opcion('o', { quality: 0.8 })] })).confidence.value === 0 &&
  CON_FUENTE('measured') > CON_FUENTE('catalog') && CON_FUENTE('catalog') > CON_FUENTE('derived') &&
  CON_FUENTE('derived') > CON_FUENTE('model') && CON_FUENTE('model') > CON_FUENTE('default'),
  ['measured', 'catalog', 'derived', 'model', 'default'].map((s) => `${s}:${CON_FUENTE(s)}`).join(' '));

console.log('\n─── G. El resultado de una decisión ───');

const srcMotor = FUENTES_SRC('functions/src/core/algorithm').map((p) => sinComentarios(leer(p))).join('\n');
check('67 · no hay un «DecisionOutcome» nuevo: el resultado de una decisión ya existe —`ResultadoDeDecision` en el cierre de A9—',
  !/DecisionOutcome/.test(srcMotor) && /export interface ResultadoDeDecision/.test(srcMotor) && /outcome\?: ResultadoDeDecision/.test(srcMotor));
check('68 · y sus campos son los de A7, sin implementación como decisión: clase, fecha, ámbito, veredicto, medidas',
  [C11, C12, C13, C15].every((c) => !!c.outcome && Object.keys(c.outcome).every((k) => ['at', 'id', 'kind', 'recovery', 'scope', 'signals', 'verification'].includes(k)) &&
    limpio(c.outcome) && limpio(c.learning)) &&
  igual(Object.keys(C11.outcome?.verification ?? {}).sort(), ['confidence', 'findings', 'passed', 'status']));
check('69 · el ámbito en que se aprende es el de la decisión más la IDENTIDAD de lo entregado: nunca un proveedor',
  typeof R.entrega?.plan?.id === 'string' && igual(C11.outcome?.scope, { capability: CAP, strategyId: R.entrega.plan.id }) &&
  (C11.learning?.aggregates ?? []).length > 0 &&
  C11.learning.aggregates.every((a) => Object.keys(a.scope).every((k) => ['capability', 'strategyId'].includes(k))));
check('70 · la confianza del veredicto es la de A6 —evidencia del evaluador, con su procedencia—, no un número puesto por el ciclo',
  !!C11.outcome?.verification?.confidence && C11.outcome.verification.confidence === C11.verification?.confidence &&
  (C11.verification?.confidence?.basis ?? []).length > 0 &&
  C11.verification.confidence.basis.every((e) => e.signal.key === 'quality.sintetica' && e.signal.source === 'measured'));

console.log('\n─── H. Las deudas, declaradas ───');

/*
 * DEUDA DECLARADA (S2-A, sin corregir a propósito): A1 cuenta toda señal sobre
 * una alternativa como evidencia A FAVOR —fuerza, no dirección—. Una medición
 * que contradice lo declarado sube la confianza igual que una que lo confirma.
 * Corregirlo exige decidir qué es «coincidir» (¿con qué tolerancia?), y esa
 * política no se inventa en una fase local: queda para revisión. Esta prueba
 * la fija para que el día que cambie se vea.
 */
const CONTRADICHA = a1.decidir(contexto({ objective: { weights: { reliability: 1 } }, options: [opcion('o', { reliability: 0.99 })],
  signals: [medida('option.reliability', 'o', 0.5)] }));
const CONFIRMADA = a1.decidir(contexto({ objective: { weights: { reliability: 1 } }, options: [opcion('o', { reliability: 0.99 })],
  signals: [medida('option.reliability', 'o', 0.99)] }));
check('71 · DEUDA: una medición que CONTRADICE lo declarado cuenta hoy como a favor (fuerza, no dirección)',
  CONTRADICHA.confidence.value === CONFIRMADA.confidence.value && CONTRADICHA.evidence.every((e) => e.supports === true),
  `${CONTRADICHA.confidence.value} = ${CONFIRMADA.confidence.value}`);
/*
 * DEUDA DECLARADA: la confianza de una señal sale de su procedencia (o de la
 * que declara), no de su muestra. La muestra ordena los conflictos y pone el
 * suelo del historial, pero 9 mediciones y 9 000 pesan igual como evidencia.
 */
check('72 · DEUDA: la muestra no entra en la fuerza de una señal —9 y 9 000 mediciones pesan lo mismo como evidencia—',
  A.confianzaDeEvidencia([{ claim: 'x', supports: true, signal: medida('option.quality', 'o', 0.8, { sampleSize: 9 }) }]).value ===
  A.confianzaDeEvidencia([{ claim: 'x', supports: true, signal: medida('option.quality', 'o', 0.8, { sampleSize: 9000 }) }]).value);

console.log('\n─── I. R1 · Lo que no es un número finito no desempata ───');

/*
 * Lo que S2-A dejó abierto: `sampleSize: NaN` pasaba `senalValida` —`NaN < 0` es
 * falso— y el orden por muestra de `resolverSenales` devolvía `NaN`, que `sort`
 * toma por empate: volvía a ganar la que llegaba antes. Y una confianza `NaN` se
 * leía como ausente, así que pesaba lo que su fuente. Ninguna de las dos es una
 * señal: no entra, igual que una mal formada.
 */
const sobreA = (value, extra = {}) => ({ key: 'option.quality', subject: 'opcion-a', value, source: 'measured', at: T1, ...extra });
const ROTAS = [
  ['sampleSize NaN', sobreA(0.9, { sampleSize: NaN })],
  ['sampleSize Infinity', sobreA(0.9, { sampleSize: Infinity })],
  ['sampleSize -Infinity', sobreA(0.9, { sampleSize: -Infinity })],
  ['confidence NaN', sobreA(0.9, { sampleSize: 20, confidence: NaN })],
  ...['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf'].map((f) => [`source ${f}`, { ...sobreA(0.9, { sampleSize: 20 }), source: f }]),
];
const aceptadasRotas = ROTAS.filter(([, s]) => A.senalValida(s)).map(([nombre]) => nombre);
check('73 · R1 · una muestra o una confianza que no son números finitos, o una fuente que no es del vocabulario, no hacen señal',
  aceptadasRotas.length === 0, aceptadasRotas.join(', ') || `${ROTAS.length} rechazadas`);
const BUENAS = [
  sobreA(0.9, { sampleSize: 0 }), sobreA(0.9, { sampleSize: 2.5 }), sobreA(0.9, { sampleSize: 3000 }),
  sobreA(0.9, { confidence: 0 }), sobreA(0.9, { confidence: 1 }), sobreA(0.9, { confidence: 0.35 }),
  ...Object.keys(A.PESO_DE_FUENTE).map((f) => ({ ...sobreA(0.5), source: f })),
];
check('73b · R1 · y lo válido sigue valiendo: muestra 0, fraccionaria o grande, confianza en sus bordes, y las seis fuentes',
  Object.keys(A.PESO_DE_FUENTE).length === 6 && BUENAS.every((s) => A.senalValida(s)));

/* X rota, Y válida y con OTRO valor: si X entrara, el orden elegiría entre ellas. */
const Y_VALIDA = sobreA(0.2, { sampleSize: 20 });
const enLosDosOrdenes = ROTAS.filter(([, x]) => {
  const r1 = A.resolverSenales([x, Y_VALIDA]);
  const r2 = A.resolverSenales([Y_VALIDA, x]);
  return !(igual(r1, r2) && r1.resueltas.length === 1 && r1.resueltas[0] === Y_VALIDA && r1.conflictos.length === 0);
}).map(([nombre]) => nombre);
check('74 · R1 · X rota e Y válida, en los dos órdenes: la misma resolución, solo con Y, y sin un conflicto que contar',
  enLosDosOrdenes.length === 0, enLosDosOrdenes.join(', '));

/* El caso 18 —el que S2-A corrigió— con la muestra de la primera en NaN. */
const CASO_18_ROTO = [
  medida('option.quality', 'opcion-a', 0.8, { at: T1, confidence: 0.9, sampleSize: NaN }),
  medida('option.quality', 'opcion-a', 0.7, { at: T1, confidence: 0.3 }),
];
const rotoDeUnaForma = conMinimo(CASO_18_ROTO);
const rotoDeLaOtra = conMinimo([...CASO_18_ROTO].reverse());
check('75 · R1 · el caso 18 con una muestra NaN: el orden ya no decide, y la señal rota no llega a la evidencia',
  igual(rotoDeUnaForma, rotoDeLaOtra) && igual(rotoDeUnaForma.confidence, rotoDeLaOtra.confidence) &&
  (rotoDeUnaForma.candidates ?? []).length === 2 &&
  !JSON.stringify(rotoDeUnaForma).includes('"confidence":0.9'),
  `${rotoDeUnaForma.status}/${rotoDeUnaForma.confidence?.value} · ${rotoDeLaOtra.status}/${rotoDeLaOtra.confidence?.value}`);

const SOLO_CONFIANZA_NAN = a1.decidir(contexto({ objective: { weights: { quality: 1 } }, options: [opcion('o', { quality: 0.8 })],
  signals: [medida('option.quality', 'o', 0.8, { confidence: NaN })] }));
check('76 · R1 · una confianza NaN no es evidencia: sin nada más, confianza 0 e `unknown`, no la del peso de su fuente',
  SOLO_CONFIANZA_NAN.status === 'decided' && SOLO_CONFIANZA_NAN.evidence.length === 0 &&
  SOLO_CONFIANZA_NAN.confidence.value === 0 && SOLO_CONFIANZA_NAN.uncertainty === 'unknown',
  `${SOLO_CONFIANZA_NAN.evidence.length} evidencia(s) · ${SOLO_CONFIANZA_NAN.confidence.value}`);

/* Y fuera de la puerta —quien llame a `confianzaDeSenal` sin validar— tampoco se convierte en una confianza. */
check('77 · R1 · y sin validar tampoco: confianza NaN o fuente heredada valen 0, nunca el peso de la fuente ni NaN',
  A.confianzaDeSenal({ key: 'a.b', value: 1, source: 'measured', confidence: NaN }) === 0 &&
  A.confianzaDeSenal({ key: 'a.b', value: 1, source: 'measured', confidence: 7 }) === 0 &&
  A.confianzaDeSenal({ key: 'a.b', value: 1, source: 'toString' }) === 0 &&
  A.confianzaDeSenal({ key: 'a.b', value: 1, source: 'measured' }) === 1 &&
  A.confianzaDeSenal({ key: 'a.b', value: 1, source: 'model', confidence: 0.25 }) === 0.25 &&
  A.confianzaDeEvidencia([{ claim: 'x', supports: true, signal: { key: 'a.b', value: 1, source: 'toString' } }]).value === 0);

console.log('\n─── J. R2 · La forma canónica: total, determinista y acotada ───');

/* Si alguna vez lanzara, cada comprobación tiene que CAER por aserción, no reventar la suite: se devuelve un texto que no casa con nada. */
const FC = (v) => { const r = sinReventar(() => A.formaCanonica(v)); return typeof r === 'string' ? r : `<lanzó: ${r.lanzo}>`; };
const LIM = A.LIMITES_DE_FORMA_CANONICA;
/* Lo más que puede ocupar: la salida, más la última clave y el último valor que entraron, más los cierres. */
const TOPE_DE_FORMA = LIM.salida + 2 * LIM.texto + 128;
/* Para comparar resultados que llevan BigInt o ciclos sin que la comparación reviente. */
const serializarSeguro = (x) => {
  const vistos = new WeakSet();
  return JSON.stringify(x, (k, v) => {
    if (typeof v === 'bigint') return `${v}n`;
    if (typeof v === 'object' && v !== null) { if (vistos.has(v)) return '[repetido]'; vistos.add(v); }
    return v;
  });
};

const propio = { nombre: 'c' }; propio.yo = propio;
const cicloA = { nombre: 'a' }; const cicloB = { nombre: 'b' }; cicloA.hijo = cicloB; cicloB.hijo = cicloA;
const revocado = Proxy.revocable({}, {}); revocado.revoke();
const hondo = (fondo) => { let x = fondo; for (let i = 0; i < 10_000; i++) x = Array.isArray(fondo) ? [x] : { x }; return x; };
const ancho = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, i]));
const HOSTILES = [
  ['un ciclo propio', propio], ['un ciclo a↔b', cicloA],
  ['un BigInt', 12_345_678_901_234_567_890n], ['un BigInt negativo', -(2n ** 70n)], ['un BigInt de 30 000 dígitos', 7n ** 35_000n],
  ['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity], ['-0', -0], ['undefined', undefined], ['null', null],
  ['un símbolo', Symbol('s')], ['una función', () => 1],
  ['un proxy revocado', revocado.proxy], ['un proxy cuyo ownKeys revienta', new Proxy({}, { ownKeys() { throw new Error('ownKeys'); } })],
  ['un getter que revienta', Object.defineProperty({}, 'x', { enumerable: true, get() { throw new Error('getter'); } })],
  ['un array tipado', new Float64Array(8)], ['un Map', new Map([[1, 2]])], ['una fecha', new Date(0)], ['un objeto sin prototipo', Object.create(null)],
  ['10 000 objetos anidados', hondo({ fondo: true })], ['10 000 arrays anidados', hondo([])],
  ['un array de 200 000', Array.from({ length: 200_000 }, (_, i) => i)], ['un objeto de 200 000 claves', ancho(200_000)],
  ['un texto de 1 000 000', 'x'.repeat(1_000_000)], ['un array con huecos', [, 1, , 2]],
];
const reventones = HOSTILES.map(([que, v]) => [que, sinReventar(() => A.formaCanonica(v))])
  .filter(([, r]) => typeof r !== 'string' || r.length > TOPE_DE_FORMA);
check('78 · R2 · total: ni un ciclo, ni un BigInt, ni un proxy o un getter que revientan la hacen lanzar, y nada pasa del tope',
  reventones.length === 0, reventones.map(([que, r]) => `${que}: ${typeof r === 'string' ? r.length : r.lanzo}`).join(' · ') || `${HOSTILES.length} valores`);

const conOtroOrden = (o) => Object.fromEntries(Object.entries(o).reverse());
const cicloConOrden = (primero) => { const c = primero ? { b: 1, a: 2n } : { a: 2n, b: 1 }; c.yo = c; return c; };
const parCon = (orden) => { const x = orden ? { n: 'x', m: NaN } : { m: NaN, n: 'x' }; const y = { n: 'y' }; x.otro = y; y.otro = x; return x; };
const PARES_IGUALES = [
  [{ a: 1, b: 2 }, { b: 2, a: 1 }],
  [{ x: { b: [1, { d: 2, c: 3 }], a: null } }, { x: { a: null, b: [1, { c: 3, d: 2 }] } }],
  [{ big: 2n ** 80n, nan: NaN, inf: -Infinity, cero: -0 }, conOtroOrden({ big: 2n ** 80n, nan: NaN, inf: -Infinity, cero: -0 })],
  [cicloConOrden(true), cicloConOrden(false)],
  [parCon(true), parCon(false)],
];
const desiguales = PARES_IGUALES.filter(([x, y]) => FC(x) !== FC(y));
check('79 · R2 · determinista: el orden de las claves no cuenta —tampoco con ciclos, BigInt, NaN o -0— y lo mismo da lo mismo',
  desiguales.length === 0 && HOSTILES.every(([, v]) => sinReventar(() => FC(v)) === sinReventar(() => FC(v))),
  desiguales.map(([x]) => FC(x).slice(0, 60)).join(' | '));

const GRUPOS_DISTINTOS = [
  ['1 · "1" · 1n · true · [1] · {0:1}', [1, '1', 1n, true, [1], { 0: 1 }]],
  ['NaN · null · undefined · "NaN"', [NaN, null, undefined, 'NaN']],
  ['Infinity · -Infinity · "Infinity"', [Infinity, -Infinity, 'Infinity']],
  ['0 · -0', [0, -0]],
  ['[1,2] · [2,1]', [[1, 2], [2, 1]]],
  ['2^64 · 2^64+1 (Number los junta)', [2n ** 64n, 2n ** 64n + 1n]],
  ['5n · -5n', [5n, -5n]],
  ['separadores dentro de un texto', [['a,s:b', 'c'], ['a', 'b,s:c']]],
  ['una clave con undefined · sin ella', [{ a: 'x' }, { a: 'x', b: undefined }]],
  ['un Map · un objeto vacío', [new Map(), {}]],
];
const juntados = GRUPOS_DISTINTOS.filter(([, vs]) => new Set(vs.map(FC)).size !== vs.length).map(([que]) => que);
check('80 · R2 · exacta dentro de los topes: tipos, signos, precisión de un BigInt, orden de un array y separadores no se confunden',
  juntados.length === 0 && Number(2n ** 64n) === Number(2n ** 64n + 1n), juntados.join(' · '));

check('81 · R2 · un ciclo se escribe como un salto a su antepasado, y dos iguales dan lo mismo sin desplegarse',
  FC(propio).includes('^1') && FC(cicloA).includes('^2') && FC(propio).length < 64 && FC(cicloA).length < 96 &&
  FC(propio) !== FC({ nombre: 'c', yo: { nombre: 'c', yo: {} } }), `${FC(propio)} · ${FC(cicloA)}`);

const ANCHOS = [200, 1_000, 10_000, 50_000, 200_000];
const anchurasMal = ANCHOS.filter((n) => {
  const arr = FC(Array.from({ length: n }, (_, i) => i));
  const obj = FC(ancho(n));
  const txt = FC('y'.repeat(n));
  const arrOk = arr.startsWith(`a${n}[`) && arr.length <= TOPE_DE_FORMA &&
    (n > LIM.anchura ? arr.endsWith(',…]') && arr.split(',').length === LIM.anchura + 1 : !arr.includes('…'));
  const objOk = n > LIM.anchura ? obj === `o${n}{…}` : obj.startsWith(`o${n}{`) && !obj.includes('…');
  const txtOk = txt === (n > LIM.texto ? `s${n}:${'y'.repeat(LIM.texto)}…` : `s${n}:${'y'.repeat(n)}`);
  return !(arrOk && objOk && txtOk);
});
check('82 · R2 · anchura: arrays, objetos y textos de 200 a 200 000 se escriben hasta su tope, con su tamaño real y «…», y ni un elemento más',
  anchurasMal.length === 0, anchurasMal.join(', ') || ANCHOS.join(' · '));
const mil = Array.from({ length: 1_000 }, (_, i) => i);
const milOtro = mil.map((x, i) => (i === 300 ? -1 : x));
check('82b · R2 · y el límite se dice: el tamaño real distingue, y lo que queda más allá de la anchura, no (dos arrays que solo difieren en el 301.º comparten forma)',
  FC(mil) !== FC(Array.from({ length: 1_001 }, (_, i) => i)) && FC(mil) === FC(milOtro) && FC(mil).endsWith(',…]'));

check('83 · R2 · profundidad: 10 000 niveles no la hacen bajar más de ocho; lo de debajo se resume',
  FC(hondo({ fondo: true })).includes('o{…}') && FC(hondo([])).includes('a1[…]') &&
  FC(hondo({ fondo: true })).length < 200 && FC(hondo([])).length < 200, FC(hondo({ fondo: true })));

const muchasHojas = Array.from({ length: 100 }, () => Array.from({ length: 100 }, (_, i) => i));
const formaDeHojas = FC(muchasHojas);
const hojasEscritas = (formaDeHojas.match(/[[,]d\d/g) ?? []).length;
check('84 · R2 · nodos: diez mil hojas no se visitan todas; se para en su presupuesto y lo marca',
  formaDeHojas.includes('!') && hojasEscritas < LIM.nodos && formaDeHojas.length <= TOPE_DE_FORMA, `${hojasEscritas} hojas escritas`);

const largos = Array.from({ length: 200 }, (_, i) => Array.from({ length: 20 }, (_, j) => String.fromCharCode(97 + ((i + j) % 26)).repeat(LIM.texto)));
const formaLarga = FC(largos);
const textosEscritos = (formaLarga.match(new RegExp(`s${LIM.texto}:`, 'g')) ?? []).length;
check('85 · R2 · salida: textos largos no la hacen crecer sin fin; se para al llenar su tope, mucho antes que el de nodos',
  formaLarga.includes('!') && formaLarga.length <= TOPE_DE_FORMA && textosEscritos < LIM.nodos / 4, `${formaLarga.length} caracteres · ${textosEscritos} textos`);

let enumeraciones = 0;
const contado = new Proxy({ a: 1, b: 2, c: 3, d: 4, e: 5 }, { ownKeys(t) { enumeraciones++; return Reflect.ownKeys(t); } });
FC(Array.from({ length: 100 }, () => contado));
check('86 · R2 · un objeto referenciado cien veces se enumera UNA: su anchura no se paga por cada referencia',
  enumeraciones === 1, `${enumeraciones} enumeraciones`);

/* Y donde se usa: dos señales empatadas en todo lo que decide, distintas en un campo que no. */
const conCampo = (nota, meta) => ({ key: 'option.quality', subject: 'o1', value: 0.5, source: 'measured', at: T1, sampleSize: 20, nota, meta });
const cicloEnCampo = {}; cicloEnCampo.yo = cicloEnCampo;
const PARES_EN_SENALES = [
  ['un ciclo', [conCampo('x', cicloEnCampo), conCampo('y', cicloEnCampo)]],
  ['un BigInt', [conCampo('x', 10n), conCampo('y', 11n)]],
  ['un array de 200 000', [conCampo('x', Array(200_000).fill(1)), conCampo('y', Array(200_000).fill(1))]],
];
const senalesMal = PARES_EN_SENALES.filter(([, par]) => {
  const r1 = sinReventar(() => A.resolverSenales(par));
  const r2 = sinReventar(() => A.resolverSenales([...par].reverse()));
  return 'lanzo' in r1 || 'lanzo' in r2 || r1.resueltas[0] !== r2.resueltas[0] || r1.resueltas.length !== 1;
}).map(([que]) => que);
check('87 · R2 · en `resolverSenales`: dos señales empatadas con un ciclo, un BigInt o un campo enorme ni revientan ni dependen del orden',
  senalesMal.length === 0, senalesMal.join(', '));

const gemeloConBigInt = { ...original, etiqueta: 10n };
const gemeloConCiclo = { ...original, etiqueta: cicloEnCampo };
const OTROS_A8 = APRENDIDO.filter((a) => a !== original);
const a8Mal = [[gemeloConBigInt, gemeloConCiclo]].filter(([g1, g2]) => {
  const r1 = sinReventar(() => pedirContexto([...OTROS_A8, g1, g2]));
  const r2 = sinReventar(() => pedirContexto([g2, ...OTROS_A8, g1]));
  return 'lanzo' in r1 || 'lanzo' in r2 || serializarSeguro(r1) !== serializarSeguro(r2);
});
check('88 · R2 · en A8: dos fotos duplicadas con un BigInt o un ciclo tampoco revientan ni dependen del orden',
  a8Mal.length === 0);

check('89 · R2 · los topes son explícitos, están congelados y son los declarados: profundidad 8, anchura 256, nodos 4096, texto 256, salida 65 536',
  Object.isFrozen(LIM) && igual(Object.keys(LIM).sort(), ['anchura', 'nodos', 'profundidad', 'salida', 'texto']) &&
  LIM.profundidad === 8 && LIM.anchura === 256 && LIM.nodos === 4096 && LIM.texto === 256 && LIM.salida === 65_536);

console.log('\n─── K. R3 · La fusión de restricciones, campo a campo ───');

/*
 * `restriccionesEfectivas(ctx)`: IZQUIERDA = `objective.constraints`, DERECHA =
 * `constraints` de la petición. Desde S2-A es lo que leen A1, A2–A5, la entrega
 * y A6 al cerrar, así que cada campo lleva SU propiedad —su regla en los dos
 * sentidos, con un lado solo y con ninguno—, no una prueba genérica que pueda
 * tapar una diferencia de semántica. Lo que cada uno hace hoy:
 *
 *   CAMPO                  REGLA                  POR QUÉ
 *   maxLatencyMs           el menor               un tope no se relaja por venir dos veces
 *   maxSteps               el menor               ídem
 *   maxParallel            el menor               ídem (el Orchestrator lo llama `maxConcurrent`; esa traducción no es de aquí)
 *   maxRisk                el menor               ídem
 *   deadlineAt             el menor (el antes)    ídem
 *   budget.maxUsd          el menor               ídem
 *   budget.maxCredits      el menor               ídem (no se comprueba en esta capa: su precio es del Financial Core)
 *   minConfidence          el mayor               un suelo no se baja por venir dos veces
 *   quality.minScore       el mayor               ídem
 *   forbiddenCapabilities  la unión               lo prohibido por uno sigue prohibido
 *   requiredCapabilities   la unión               lo exigido por uno sigue exigido
 *   budget.prefer          manda la petición      es una preferencia, no un límite
 *   budget.onExceed        manda la petición      DEUDA: puede relajar `fail` → `degrade`
 *   quality.checks         manda la petición      DEUDA: puede quitar comprobaciones del objetivo
 *   quality.onBelow        manda la petición      DEUDA: puede relajar a `accept`
 *
 * Con un solo objeto de restricciones, se devuelve ese objeto tal cual; con
 * ninguno, `undefined`. Con los dos, un campo que nadie declara queda
 * `undefined` —y las listas de capacidades, vacías—.
 */
const efectivas = (izquierda, derecha) => A.restriccionesEfectivas({
  contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA,
  objective: { weights: { quality: 1 }, ...(izquierda ? { constraints: izquierda } : {}) },
  ...(derecha ? { constraints: derecha } : {}),
});
const leerRuta = (o, ruta) => ruta.split('.').reduce((x, k) => (x === undefined || x === null ? undefined : x[k]), o);
const conRuta = (ruta, valor) => {
  const [a, b] = ruta.split('.');
  return b === undefined ? { [a]: valor } : { [a]: { [b]: valor } };
};
/* Un campo que no es ninguno de los que se prueban, para que haya DOS objetos sin que ninguno traiga el campo. */
const AJENO = (ruta) => (ruta === 'maxSteps' ? { maxRisk: 0.5 } : { maxSteps: 9 });

const propiedadDeCampo = (ruta, estricto, laxo) => {
  const fallos = [];
  const mira = (que, obtenido, esperado) => { if (!igual(obtenido, esperado)) fallos.push(`${que}: ${JSON.stringify(obtenido)} ≠ ${JSON.stringify(esperado)}`); };
  mira('izquierda más estricta', leerRuta(efectivas(conRuta(ruta, estricto), conRuta(ruta, laxo)), ruta), estricto);
  mira('derecha más estricta', leerRuta(efectivas(conRuta(ruta, laxo), conRuta(ruta, estricto)), ruta), estricto);
  mira('solo la izquierda lo trae', leerRuta(efectivas(conRuta(ruta, laxo), AJENO(ruta)), ruta), laxo);
  mira('solo la derecha lo trae', leerRuta(efectivas(AJENO(ruta), conRuta(ruta, laxo)), ruta), laxo);
  mira('ninguno lo trae', leerRuta(efectivas(AJENO(ruta), AJENO(ruta)), ruta), undefined);
  const soloIzq = conRuta(ruta, laxo);
  const soloDer = conRuta(ruta, estricto);
  if (efectivas(soloIzq, undefined) !== soloIzq) fallos.push('con un solo objeto (izquierda) no se devuelve ese objeto');
  if (efectivas(undefined, soloDer) !== soloDer) fallos.push('con un solo objeto (derecha) no se devuelve ese objeto');
  if (efectivas(undefined, undefined) !== undefined) fallos.push('sin ninguno no es undefined');
  return fallos;
};

for (const [ruta, estricto, laxo, regla] of [
  ['maxLatencyMs', 800, 5_000, 'el menor'],
  ['maxSteps', 3, 7, 'el menor'],
  ['maxParallel', 2, 4, 'el menor'],
  ['maxRisk', 0.1, 0.4, 'el menor'],
  ['deadlineAt', T1, T1 + DIA, 'el menor (el antes)'],
  ['budget.maxUsd', 0.5, 2, 'el menor'],
  ['budget.maxCredits', 10, 40, 'el menor'],
  ['minConfidence', 0.8, 0.3, 'el mayor'],
  ['quality.minScore', 0.9, 0.6, 'el mayor'],
]) {
  const fallos = propiedadDeCampo(ruta, estricto, laxo);
  check(`90 · R3 · ${ruta}: gana ${regla}, venga de donde venga; un lado solo se conserva; ninguno, undefined`,
    fallos.length === 0, fallos.join(' · '));
}

const propiedadDeUnion = (campo) => {
  const fallos = [];
  const comoConjunto = (x) => [...new Set(x ?? [])].sort();
  const union = efectivas({ [campo]: ['cap.a', 'cap.b'] }, { [campo]: ['cap.b', 'cap.c'] })?.[campo];
  if (!igual(comoConjunto(union), ['cap.a', 'cap.b', 'cap.c'])) fallos.push(`A ∪ B = ${JSON.stringify(union)}`);
  const soloIzq = efectivas({ [campo]: ['cap.a'] }, AJENO(campo))?.[campo];
  if (!igual(comoConjunto(soloIzq), ['cap.a'])) fallos.push(`solo la izquierda: ${JSON.stringify(soloIzq)}`);
  const soloDer = efectivas(AJENO(campo), { [campo]: ['cap.c'] })?.[campo];
  if (!igual(comoConjunto(soloDer), ['cap.c'])) fallos.push(`solo la derecha: ${JSON.stringify(soloDer)}`);
  const ninguno = efectivas(AJENO(campo), AJENO(campo))?.[campo];
  if (!(Array.isArray(ninguno) && ninguno.length === 0)) fallos.push(`ninguno: ${JSON.stringify(ninguno)}`);
  return fallos;
};
for (const campo of ['forbiddenCapabilities', 'requiredCapabilities']) {
  const fallos = propiedadDeUnion(campo);
  check(`91 · R3 · ${campo}: la unión —lo que uno prohíbe o exige, se sigue prohibiendo o exigiendo—; un lado solo se conserva; ninguno, lista vacía`,
    fallos.length === 0, fallos.join(' · '));
}

check('92 · R3 · budget.prefer: es una preferencia y no un límite; con las dos, manda la petición; con una, esa',
  efectivas({ budget: { prefer: 'quality' } }, { budget: { prefer: 'cost' } })?.budget?.prefer === 'cost' &&
  efectivas({ budget: { prefer: 'quality' } }, AJENO('budget'))?.budget?.prefer === 'quality' &&
  efectivas(AJENO('budget'), { budget: { prefer: 'speed' } })?.budget?.prefer === 'speed' &&
  efectivas(AJENO('budget'), AJENO('budget'))?.budget === undefined);
/*
 * DEUDA DECLARADA (R3, sin corregir a propósito): para `onExceed`, `checks` y
 * `onBelow` manda la petición, y eso puede RELAJAR lo que pedía el objetivo —
 * lo contrario de «una restricción no se relaja por venir dos veces»—. Hacerlos
 * «el más estricto» exige decidir un orden de rigor que el Core no declara (¿es
 * `regenerate` más estricto que `fail`?), y esa política no se inventa en el
 * endurecimiento. Estas pruebas FIJAN lo de hoy para que el día que cambie se vea.
 */
check('93 · R3 · DEUDA: budget.onExceed — manda la petición, aunque relaje (`fail` del objetivo → `degrade`)',
  efectivas({ budget: { onExceed: 'fail' } }, { budget: { onExceed: 'degrade' } })?.budget?.onExceed === 'degrade' &&
  efectivas({ budget: { onExceed: 'fail' } }, AJENO('budget'))?.budget?.onExceed === 'fail');
check('94 · R3 · DEUDA: quality.checks — manda la petición, aunque quite comprobaciones del objetivo',
  igual(efectivas({ quality: { checks: ['brand', 'technical'] } }, { quality: { checks: ['consistency'] } })?.quality?.checks, ['consistency']) &&
  igual(efectivas({ quality: { checks: ['brand'] } }, AJENO('quality'))?.quality?.checks, ['brand']));
check('95 · R3 · DEUDA: quality.onBelow — manda la petición, aunque relaje (`fail` del objetivo → `accept`)',
  efectivas({ quality: { onBelow: 'fail' } }, { quality: { onBelow: 'accept' } })?.quality?.onBelow === 'accept' &&
  efectivas({ quality: { onBelow: 'regenerate' } }, AJENO('quality'))?.quality?.onBelow === 'regenerate');

/* Y lo que dice la fusión es lo que hace quien la lee: A1 descarta con la más estricta, venga de donde venga. */
const FIABILIDAD_09 = [opcion('opcion-a', { reliability: 0.9, cost: 0.02 }), opcion('opcion-b', { reliability: 0.99, cost: 0.03 })];
const conRiesgo = (izq, der) => a1.decidir(contexto({ objective: { weights: { reliability: 1, cost: 1 }, constraints: { maxRisk: izq } },
  constraints: { maxRisk: der }, options: FIABILIDAD_09 }));
check('96 · R3 · A1 usa la más estricta: maxRisk 0,05 en el objetivo y 0,5 en la petición deja fuera la de riesgo 0,10, y al revés igual',
  candidata(conRiesgo(0.05, 0.5), 'opcion-a')?.reason === 'constraint:maxRisk' && candidata(conRiesgo(0.5, 0.05), 'opcion-a')?.reason === 'constraint:maxRisk' &&
  elegidaDe(conRiesgo(0.05, 0.5)) === 'opcion-b' && elegidaDe(conRiesgo(0.5, 0.5)) === 'opcion-a');
const conMinimoDe = (izq, der) => a1.decidir(contexto({ objective: { weights: { quality: 1 }, constraints: { minConfidence: izq } },
  constraints: { minConfidence: der }, options: [opcion('opcion-a', { quality: 0.8 })],
  signals: [{ key: 'option.quality', subject: 'opcion-a', value: 0.8, source: 'derived' }] }));
check('97 · R3 · y el suelo más alto: confianza 0,6 no llega a un mínimo de 0,9 declarado en cualquiera de los dos lados',
  conMinimoDe(0.9, 0.1).failure === 'insufficient_evidence' && conMinimoDe(0.1, 0.9).failure === 'insufficient_evidence' &&
  conMinimoDe(0.1, 0.1).status === 'decided', `${conMinimoDe(0.9, 0.1).status} · ${conMinimoDe(0.1, 0.9).status} · ${conMinimoDe(0.1, 0.1).status}`);
const pedirConParalelo = (izq, der) => ciclo.decidir(peticion({ decision: decisionBase({ objective: { ...OBJ_CICLO, constraints: { maxParallel: izq } },
  constraints: { maxParallel: der } }) }));
check('98 · R3 · y A2/A4 componen con el paralelismo más estrecho: 1 en el objetivo y 4 en la petición compone lo mismo que 1 en los dos',
  igual(COMPOSICION(pedirConParalelo(1, 4)), COMPOSICION(pedirConParalelo(1, 1))) && igual(COMPOSICION(pedirConParalelo(4, 1)), COMPOSICION(pedirConParalelo(1, 1))) &&
  !igual(COMPOSICION(pedirConParalelo(4, 4)), COMPOSICION(pedirConParalelo(1, 1))));

console.log('\n─── L. R4 · La integridad de esta suite ───');

check('99 · R4 · la igualdad con que se compara esta suite no confunde lo que el JSON calla: NaN ≠ null, undefined ≠ ausente, -0 ≠ 0',
  !igual({ a: NaN }, { a: null }) && !igual({ a: undefined }, {}) && !igual([-0], [0]) && !igual({ b: 1, a: 2 }, { a: 2, b: 1 }) &&
  igual({ a: [1, { b: 2, c: undefined }] }, { a: [1, { b: 2, c: undefined }] }) && igual(NaN, NaN));
/* El vocabulario se lee de donde se declara —el tipo `Budget` y la lista con que valida el Router—, no se supone. */
const srcCost = sinComentarios(leer('functions/src/core/cost.ts'));
const alExcederDeBudget = (srcCost.match(/onExceed\?:\s*([^;]+);/)?.[1] ?? '').match(/'([a-z]+)'/g)?.map((x) => x.slice(1, -1)).sort() ?? [];
const alExcederDelRouter = (srcRouter.match(/const AL_EXCEDER[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '').match(/'([a-z]+)'/g)?.map((x) => x.slice(1, -1)).sort() ?? [];
check('100 · R4 · el ejemplo de la 50 habla el vocabulario de `Budget`, el mismo que valida el Router: onExceed ∈ {degrade, fail}',
  igual(alExcederDeBudget, ['degrade', 'fail']) && igual(alExcederDelRouter, alExcederDeBudget) && alExcederDeBudget.includes(EXIGIDO.budget.onExceed),
  `Budget: ${alExcederDeBudget.join('|')} · Router: ${alExcederDelRouter.join('|')} · ejemplo: ${EXIGIDO.budget.onExceed}`);

console.log('\n─── M. R5 · El versionado ───');

const srcContratos = leer('functions/src/core/contracts.ts');
const { contratoCompatible } = lib('core/contracts.js');
check('101 · R5 · el contrato del Algorithm Engine es 1.10, y la evidencia que se produzca lo dirá: la sección y la decisión llevan ese número',
  ALGORITHM_CONTRACT_VERSION === '1.10' && R.contract === '1.10' && R.decision?.contract === '1.10' && E1.contract === '1.10');
check('102 · R5 · 1.10 está registrado en su historial —qué cambia y por qué sube—, y el historial anterior sigue intacto',
  /\* 1\.10 \(S2-A\): /.test(srcContratos) && /\* 1\.9 \(A9\.3\): /.test(srcContratos) && /\* 1\.7 \(A9\.1\): /.test(srcContratos) &&
  ['DESEMPATE', 'FRONTERA', 'EFECTIVAS', 'REGISTRO', 'CONFIANZA'].every((p) => new RegExp(`\\* {3}${p} `).test(srcContratos)) &&
  !/\(A9\)/.test(srcContratos));
check('103 · R5 · la compatibilidad compara números, no texto: 1.10 habla con quien espera 1.9, y un descriptor de 1.9 ya no vale para 1.10',
  contratoCompatible('1.10', '1.9') && !contratoCompatible('1.9', '1.10') && contratoCompatible('1.10', '1.10') && '1.10' < '1.9');
check('104 · R5 · los motores cuya decisión cambió suben a su versión 2 —«sube cuando cambia lo que el algoritmo DECIDE»—; los demás, no',
  A.DECISION_ENGINE_VERSION === 2 && A.DECISION_ENGINE_REF === 'motor-de-decision@2' && E1.algorithm === 'motor-de-decision@2' &&
  A.DESCRIPTOR_DE_CONTEXTO.version === 2 && A.DESCRIPTOR_DEL_MOTOR.version === 2 &&
  [A.DECOMPOSITION_ENGINE_VERSION, A.STRATEGY_ENGINE_VERSION, A.PARALLELIZATION_ENGINE_VERSION, A.OPTIMIZATION_ENGINE_VERSION].every((v) => v === 1),
  `A1=${A.DECISION_ENGINE_REF} · A8=${A.DESCRIPTOR_DE_CONTEXTO.version}`);

console.log('\n─── N. R6 · El documento dice lo que hay ───');

const S18 = (() => { const i = DOC.indexOf('## 18 · S2-A'); const j = DOC.indexOf('## 19 · '); return i >= 0 && j > i ? DOC.slice(i, j) : ''; })();
const posicion = (t) => DOC.indexOf(t);
check('105 · R6 · primero la historia de S1 de `main` y después S2-A: § 17 con S1.1–S1.6, § 18 S2-A, § 19 lo probado, § 20 lo que no hace —cada uno una vez—',
  posicion('## 17 · S1') > 0 && posicion('### Después de S1: la canary real de Travel') > posicion('## 17 · S1') &&
  posicion('### Después de S1: la canary real de Travel') < posicion('## 18 · S2-A') && posicion('## 18 · S2-A') < posicion('## 19 · Lo que está probado') &&
  posicion('## 19 · Lo que está probado') < posicion('## 20 · Lo que esta capa NO hace') &&
  ['17', '18', '19', '20'].every((n) => (DOC.match(new RegExp(`^## ${n} · `, 'gm')) ?? []).length === 1));
const FILA_S1_45 = '| `canary-sombra-atribucion` · `canary-sombra-assets` |';
const FILA_S2A = '| `algorithm-quality.test.mjs` ·';
check('106 · R6 · en la tabla de lo probado, la fila de S1.4–S1.5 y después la de S2-A',
  posicion(FILA_S1_45) > posicion('## 19 · Lo que está probado') && posicion(FILA_S1_45) < posicion(FILA_S2A));
check('107 · R6 · S2-A se dice como es: integrada en `main` —ni en su rama ni pendiente de integración—, y las frases que la integración dejó caducadas ya no están',
  S18.includes('**Estado: integrada en `main`.**') && !S18.includes('branch hardening / pre-integration') &&
  !/no está\s+en `main`/.test(DOC) && !/pendiente\s+de\s+integraci[oó]n/i.test(DOC) && !DOC.includes('que sigue en su rama') &&
  !/en su rama[^.\n]{0,60}endurecida/.test(DOC) && !DOC.includes('Este documento de la rama') &&
  /S2-A, que ya no es deuda —está integrada en `main`/.test(DOC));
check('108 · R6 · el diagrama es la cadena entera, en orden, sin saltar del Algorithm Engine al Router',
  /Brain → Planner → Algorithm Engine → Workflow → Orchestrator → Router\s*\n\s*→ Job Engine → Gateway → adaptador del proveedor → API oficial del proveedor/.test(S18) &&
  !/Algorithm Engine → decisión · estrategia · requisitos\s*\n\s*→ Router/.test(DOC));
const lineaDe = (clave) => S18.split('\n').find((l) => l.startsWith(`| ${clave}`)) ?? '';
check('109 · R6 · cada lector con su estado real: presupuesto y calidad, CONSUMIDOS por el Router; maxParallel (→ maxConcurrent) y maxLatencyMs, PLANNED TRANSLATION / NOT CURRENTLY CONSUMED; deadlineAt, que ya existe en el Job Engine y el Gateway',
  /CONSUMIDO/.test(lineaDe('`budget`, `quality`')) &&
  /`maxConcurrent`/.test(lineaDe('`maxParallel`')) && /PLANNED TRANSLATION \/ NOT CURRENTLY CONSUMED/.test(lineaDe('`maxParallel`')) &&
  /PLANNED TRANSLATION \/ NOT CURRENTLY CONSUMED/.test(lineaDe('`maxLatencyMs`')) &&
  /Job Engine/.test(lineaDe('`deadlineAt`')) && /Gateway/.test(lineaDe('`deadlineAt`')) &&
  !DOC.includes('los relojes del trabajo: Job Engine y Gateway'));
check('110 · R6 · A6 al cerrar: restricciones efectivas SÍ, señales observadas TODAVÍA NO, y ese `unknown` no es un fallo de calidad',
  S18.includes('restricciones efectivas al cerrar: **SÍ**') && S18.includes('señales observadas al cerrar: **TODAVÍA NO**') &&
  S18.includes('no es un fallo de calidad'));
/*
 * Las diez deudas que dejó escritas la auditoría de S2-A siguen ESCRITAS. Tres las cerró después S2-B
 * (B.1 las dos de NaN, B.2 el desglose) y se dicen cerradas, con su bloque, y no como lo que pasa hoy;
 * las demás siguen abiertas —la 7 dice que sigue abierta—, y B.2 deja abierto el contrato de `fits`.
 * El documento va partido en líneas: se compara con los espacios juntos.
 */
const S18_PLANO = S18.toLowerCase().replace(/\s+/g, ' ');
const DEUDAS_ABIERTAS = ['un eje sin dato', 'señales observadas a a6', 'procedencia de las restricciones', 'antes de resolverlas',
  '`maxlatencyms` no tiene lector', '`maxparallel` → `maxconcurrent`', 'sin elección real', '`strategyscore.fits` guarda un 0 de relleno'];
const CERRADAS_EN_S2B = [
  ['2. **el desglose no cuadraba', 'cerrada en s2-b · b.2'],
  ['5. **`minconfidence: nan`** se ignoraba', 'cerrada en s2-b · b.1'],
  ['6. **`maxrisk: nan`** dejaba fuera', 'cerrada en s2-b · b.1'],
];
const COMO_SI_FUERAN_DE_HOY = ['se ignora —el mínimo deja de exigirse—', 'deja fuera a todas —nadie cumple—', 'la explicación dice «quality 0.00×0.50'];
const tramoDe = (inicio) => { const i = S18_PLANO.indexOf(inicio); return i < 0 ? '' : S18_PLANO.slice(i, i + 400); };
const abiertasQueFaltan = DEUDAS_ABIERTAS.filter((d) => !S18_PLANO.includes(d));
const cerradasMalDichas = CERRADAS_EN_S2B.filter(([deuda, cierre]) => !tramoDe(deuda).includes(cierre)).map(([d]) => d);
const dichasComoDeHoy = COMO_SI_FUERAN_DE_HOY.filter((f) => S18_PLANO.includes(f));
const septima = tramoDe('7. **las señales no se acotan antes de resolverlas**');
check('111 · R6 · S2-B · las deudas de S2-A siguen escritas: las abiertas como abiertas —con el contrato de `fits` que dejó B.2— y las tres que cerró S2-B como cerradas, con su bloque, y no como lo que pasa hoy',
  abiertasQueFaltan.length === 0 && cerradasMalDichas.length === 0 && dichasComoDeHoy.length === 0
  && septima.includes('sigue abierta') && !septima.includes('cerrada en s2-b'),
  [...abiertasQueFaltan, ...cerradasMalDichas, ...dichasComoDeHoy].join(' · ') || `${DEUDAS_ABIERTAS.length} abiertas · ${CERRADAS_EN_S2B.length} cerradas`);
const comentarioDeDestino = leer('functions/src/core/algorithm/integration.ts');
check('112 · R6 · y el código dice lo mismo: el comentario de DESTINO_DEL_REQUISITO nombra `maxConcurrent` y dice que la latencia máxima hoy no la lee nadie',
  comentarioDeDestino.includes('`maxConcurrent`') && /latencia máxima hoy no\s*\n?\s*\*?\s*la lee nadie/.test(comentarioDeDestino) &&
  !/el plazo y la latencia máxima, que\s*\n\s*\*\s*hacen cumplir el Job Engine y el Gateway/.test(comentarioDeDestino));

/*
 * ═══ S2-B ═══ Las comprobaciones de S2-B van numeradas a continuación de la 112,
 * en el orden en que corren (`numero()`), y cada una dice de qué bloque es.
 */
let siguiente = 113;
const numero = () => siguiente++;

console.log('\n─── O. S2-B · B.1 · Restricciones mal formadas: ni se funden ni deciden ───');

/*
 * Los seis campos de B.1, con su rango DE SIEMPRE, un valor válido para el
 * control, otro para fundir con él, y los rotos: NaN, ±Infinity, null, un texto
 * y —donde el campo tiene rango— lo que se sale de él. `deadlineAt` no tiene
 * rango: solo lo rompe lo que no es un número finito.
 */
const RANGO_B1 = {
  fraccion: 'fuera de rango: entre 0 y 1', noNegativo: 'fuera de rango: no puede ser negativo',
  positivo: 'fuera de rango: tiene que ser mayor que 0',
};
const CAMPOS_B1 = [
  { ruta: 'maxRisk', rango: 'fraccion', fuera: [1.5, -0.1], valido: 0.5, otro: 0.4, funde: 'menor' },
  { ruta: 'minConfidence', rango: 'fraccion', fuera: [1.5, -0.1], valido: 0, otro: 0, funde: 'mayor' },
  { ruta: 'budget.maxUsd', rango: 'noNegativo', fuera: [-1], valido: 10, otro: 8, funde: 'menor' },
  { ruta: 'budget.maxCredits', rango: 'noNegativo', fuera: [-1], valido: 100, otro: 90, funde: 'menor' },
  { ruta: 'quality.minScore', rango: 'fraccion', fuera: [1.5, -0.1], valido: 0.1, otro: 0.2, funde: 'mayor' },
  { ruta: 'deadlineAt', rango: 'finito', fuera: [], valido: 1_900_000_000_000, otro: 1_800_000_000_000, funde: 'menor' },
];
const rotosDe = (c) => [
  [NaN, 'no es un número finito (NaN)'], [Infinity, 'no es un número finito (Infinity)'],
  [-Infinity, 'no es un número finito (-Infinity)'], [null, 'no es un número (null)'], ['0.5', 'no es un número (string)'],
  ...c.fuera.map((v) => [v, RANGO_B1[c.rango]]),
];
/* Con reloj, para que `deadlineAt` se pueda comprobar de verdad en el control. */
const a1B1 = A.crearMotorDeDecision({ ahora: () => T0 });
const OPCIONES_B1 = [opcion('a', { quality: 0.8, cost: 1, latency: 100, reliability: 0.9 }),
  opcion('b', { quality: 0.6, cost: 2, latency: 50, reliability: 0.7 })];
const decidirB1 = (objetivo, peticionB1) => a1B1.decidir(contexto({
  objective: { weights: { quality: 1, cost: 1 }, ...(objetivo !== undefined ? { constraints: objetivo } : {}) },
  ...(peticionB1 !== undefined ? { constraints: peticionB1 } : {}),
  options: OPCIONES_B1,
}));
const CABEZA_B1 = 'Restricciones mal formadas, que ni se funden ni se usan para decidir: ';
/* La lista EXACTA de problemas que dice la decisión: cada uno `ruta: motivo`, y la ruta dice el lado. */
const problemasDichos = (d) => {
  const e = d?.explanation?.[0] ?? '';
  return e.startsWith(CABEZA_B1) && e.endsWith('.') ? e.slice(CABEZA_B1.length, -1).split('; ') : null;
};
/* Un conflicto de B.1 es eso y nada más: sin decisión, sin restricciones efectivas y sin repetir lo roto. */
const esConflictoB1 = (d, esperados) => d?.status === 'undecided' && d.failure === 'constraint_conflict'
  && igual(problemasDichos(d), esperados) && d.constraints === undefined && d.candidates.length === 0
  && d.objective?.constraints === undefined;
const LADOS_B1 = [
  ['la petición', (c, v) => [undefined, conRuta(c.ruta, v)], ['constraints']],
  ['el objetivo', (c, v) => [conRuta(c.ruta, v), undefined], ['objective.constraints']],
  ['los dos', (c, v) => [conRuta(c.ruta, v), conRuta(c.ruta, v)], ['constraints', 'objective.constraints']],
];
for (const c of CAMPOS_B1) {
  for (const [lado, construir, rutas] of LADOS_B1) {
    const fallos = [];
    for (const [v, motivo] of rotosDe(c)) {
      const d = decidirB1(...construir(c, v));
      if (!esConflictoB1(d, rutas.map((r) => `${r}.${c.ruta}: ${motivo}`))) {
        fallos.push(`${String(v)} → ${d.status}/${d.failure} ${JSON.stringify(problemasDichos(d))}`);
      }
    }
    check(`${numero()} · B.1 · ${c.ruta} roto en ${lado}: constraint_conflict que nombra lado, campo y motivo (${rotosDe(c).length} valores)`,
      fallos.length === 0, fallos.slice(0, 3).join(' | '));
  }
}

/* Un lado roto y el otro VÁLIDO: el válido no tapa el error ni se usa en su lugar. */
const absorcion = (titulo, caso) => {
  const fallos = [];
  for (const c of CAMPOS_B1) {
    for (const [v, motivo] of rotosDe(c)) {
      const { d, esperados } = caso(c, v, motivo);
      if (!esConflictoB1(d, esperados)) fallos.push(`${c.ruta}=${String(v)} → ${d.status}/${d.failure} ${JSON.stringify(problemasDichos(d))}`);
    }
  }
  check(`${numero()} · B.1 · ${titulo}`, fallos.length === 0, fallos.slice(0, 3).join(' | '));
};
absorcion('petición rota + objetivo válido: el conflicto es de la PETICIÓN, y el valor válido del objetivo no lo tapa ni se usa',
  (c, v, motivo) => ({ d: decidirB1(conRuta(c.ruta, c.valido), conRuta(c.ruta, v)), esperados: [`constraints.${c.ruta}: ${motivo}`] }));
absorcion('petición válida + objetivo roto: el conflicto es del OBJETIVO, y el valor válido de la petición no lo tapa ni se usa',
  (c, v, motivo) => ({ d: decidirB1(conRuta(c.ruta, v), conRuta(c.ruta, c.valido)), esperados: [`objective.constraints.${c.ruta}: ${motivo}`] }));
absorcion('los dos rotos: se nombran los dos, la petición primero',
  (c, v, motivo) => ({ d: decidirB1(conRuta(c.ruta, v), conRuta(c.ruta, v)),
    esperados: [`constraints.${c.ruta}: ${motivo}`, `objective.constraints.${c.ruta}: ${motivo}`] }));
{
  const fallos = [];
  for (const c of CAMPOS_B1) {
    const d = decidirB1(conRuta(c.ruta, c.valido), conRuta(c.ruta, c.otro));
    const esperado = c.funde === 'menor' ? Math.min(c.valido, c.otro) : Math.max(c.valido, c.otro);
    if (d.status !== 'decided' || leerRuta(d.constraints, c.ruta) !== esperado) fallos.push(`${c.ruta}: ${d.status} ${leerRuta(d.constraints, c.ruta)}`);
  }
  check(`${numero()} · B.1 · CONTROL · los dos válidos: se decide, y lo efectivo es lo de siempre (el más estrecho de los dos)`,
    fallos.length === 0, fallos.join(' | '));
}

/* El resto de la familia numérica, con la MISMA regla: ningún número de restricción se salta la validación. */
{
  const FAMILIA = ['maxSteps', 'maxParallel', 'maxLatencyMs'].map((ruta) => ({ ruta, rango: 'positivo', fuera: [0, -1] }));
  const fallos = [];
  for (const c of FAMILIA) {
    for (const [, construir, rutas] of LADOS_B1) {
      for (const [v, motivo] of rotosDe(c)) {
        const d = decidirB1(...construir(c, v));
        if (!esConflictoB1(d, rutas.map((r) => `${r}.${c.ruta}: ${motivo}`))) fallos.push(`${c.ruta}=${String(v)} ${JSON.stringify(problemasDichos(d))}`);
      }
    }
  }
  check(`${numero()} · B.1 · el resto de la familia numérica —maxSteps, maxParallel, maxLatencyMs— con la misma regla, en cada lado`,
    fallos.length === 0, fallos.slice(0, 3).join(' | '));
}
check(`${numero()} · B.1 · un contenedor o un lado entero que no es un objeto también se nombra, sin repetir lo que traía; \`null\` sigue siendo no pedir nada`,
  [
    [[undefined, { budget: 'mucho' }], ['constraints.budget: no es un objeto (string)']],
    [[{ quality: 5 }, undefined], ['objective.constraints.quality: no es un objeto (number)']],
    [[undefined, 'x'], ['constraints: no es un objeto de restricciones (string)']],
    [[[], undefined], ['objective.constraints: no es un objeto de restricciones (array)']],
  ].every(([[o, p], esperados]) => esConflictoB1(decidirB1(o, p), esperados))
  && decidirB1(undefined, null).status === 'decided' && decidirB1(null, undefined).status === 'decided');

/* La regla, una sola: el motivo exacto de cada caso, y los nombres de siempre en `conflictosDeRestricciones`. */
check(`${numero()} · B.1 · UNA regla (\`motivoDeNumeroInvalido\`): finito y en su rango de siempre; el motivo dice el tipo, no el valor`,
  [
    ['fraccion', 0.5, undefined], ['fraccion', 0, undefined], ['fraccion', 1, undefined], ['fraccion', -0, undefined],
    ['fraccion', 1.0000001, RANGO_B1.fraccion], ['noNegativo', 0, undefined], ['noNegativo', 1e12, undefined],
    ['noNegativo', -1e-9, RANGO_B1.noNegativo], ['positivo', 1e-9, undefined], ['positivo', 0, RANGO_B1.positivo],
    ['finito', -5, undefined], ['finito', NaN, 'no es un número finito (NaN)'], ['noNegativo', Infinity, 'no es un número finito (Infinity)'],
    ['fraccion', -Infinity, 'no es un número finito (-Infinity)'], ['finito', true, 'no es un número (boolean)'],
    ['finito', 10n, 'no es un número (bigint)'], ['finito', {}, 'no es un número (object)'], ['finito', [1], 'no es un número (array)'],
  ].every(([rango, v, motivo]) => A.motivoDeNumeroInvalido(rango, v) === motivo)
  && igual(A.conflictosDeRestricciones({ maxSteps: 2, maxParallel: 5, maxRisk: NaN, minConfidence: Infinity,
    budget: { maxUsd: null, maxCredits: '1' }, quality: { minScore: -Infinity }, deadlineAt: NaN }),
  ['maxRisk', 'minConfidence', 'budget.maxCredits', 'budget.maxUsd', 'quality.minScore', 'deadlineAt', 'maxParallel>maxSteps']));

/* LA FUSIÓN. Un generador determinista —congruencial, semilla fija—: ni azar de verdad ni reloj. */
const generador = (semilla) => { let s = semilla >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const azarB1 = generador(20260926);
const elegirB1 = (xs) => xs[Math.floor(azarB1() * xs.length)];
const ponerRuta = (o, ruta, v) => {
  const [a, b] = ruta.split('.');
  if (b === undefined) o[a] = v; else o[a] = { ...(o[a] && typeof o[a] === 'object' ? o[a] : {}), [b]: v };
};
const ladoAlAzar = (valores) => {
  if (azarB1() < 0.08) return elegirB1([undefined, null, 'x', 5, []]);
  const c = {};
  for (const ruta of Object.keys(A.RANGO_DE_RESTRICCION)) { const v = elegirB1(valores); if (v !== undefined) ponerRuta(c, ruta, v); }
  if (azarB1() < 0.05) c.budget = elegirB1(['b', 3, null]);
  if (azarB1() < 0.05) c.quality = elegirB1(['q', 4, null]);
  return c;
};
const fundirB1 = (o, p) => A.restriccionesEfectivas({ contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA,
  objective: { weights: { quality: 1 }, ...(o !== undefined ? { constraints: o } : {}) }, ...(p !== undefined ? { constraints: p } : {}) });
{
  const TODO = [undefined, undefined, NaN, Infinity, -Infinity, null, 'x', true, {}, -1, 0, 0.3, 0.7, 1, 2, 5, 1e12];
  const rotas = [];
  for (let i = 0; i < 3000; i++) {
    const e = fundirB1(ladoAlAzar(TODO), ladoAlAzar(TODO));
    for (const ruta of Object.keys(A.RANGO_DE_RESTRICCION)) {
      const v = e === undefined || e === null ? undefined : leerRuta(e, ruta);
      if (v !== undefined && !(typeof v === 'number' && Number.isFinite(v))) rotas.push(`${ruta}=${String(v)}`);
    }
  }
  check(`${numero()} · B.1 · PROPIEDAD · fundir nunca da NaN, ±Infinity ni un no-número en ninguna restricción efectiva (3 000 pares al azar, semilla fija)`,
    rotas.length === 0, rotas.slice(0, 5).join(', '));
}
{
  /* La fusión de S2-A, transcrita tal cual como referencia: con lados VÁLIDOS tiene que dar lo mismo, y un lado solo, el MISMO objeto. */
  const fusionS2A = (a, b) => {
    if (!a) return b;
    if (!b) return a;
    const menor = (x, y) => (typeof x === 'number' ? (typeof y === 'number' ? Math.min(x, y) : x) : y);
    const mayor = (x, y) => (typeof x === 'number' ? (typeof y === 'number' ? Math.max(x, y) : x) : y);
    return {
      ...a, ...b,
      budget: a.budget || b.budget ? {
        ...a.budget, ...b.budget,
        maxUsd: menor(a.budget?.maxUsd, b.budget?.maxUsd),
        maxCredits: menor(a.budget?.maxCredits, b.budget?.maxCredits),
      } : undefined,
      quality: a.quality || b.quality ? { ...a.quality, ...b.quality, minScore: mayor(a.quality?.minScore, b.quality?.minScore) } : undefined,
      maxLatencyMs: menor(a.maxLatencyMs, b.maxLatencyMs),
      maxSteps: menor(a.maxSteps, b.maxSteps),
      maxParallel: menor(a.maxParallel, b.maxParallel),
      maxRisk: menor(a.maxRisk, b.maxRisk),
      minConfidence: mayor(a.minConfidence, b.minConfidence),
      deadlineAt: menor(a.deadlineAt, b.deadlineAt),
      forbiddenCapabilities: Object.freeze([...(a.forbiddenCapabilities ?? []), ...(b.forbiddenCapabilities ?? [])]),
      requiredCapabilities: Object.freeze([...(a.requiredCapabilities ?? []), ...(b.requiredCapabilities ?? [])]),
    };
  };
  const VALIDOS = { maxSteps: [undefined, 1, 4], maxParallel: [undefined, 1, 3], maxLatencyMs: [undefined, 500, 2000],
    maxRisk: [undefined, 0, 0.3, 1], minConfidence: [undefined, 0, 0.5, 1], deadlineAt: [undefined, 1_800_000_000_000, -5],
    'budget.maxUsd': [undefined, 0, 2.5], 'budget.maxCredits': [undefined, 0, 40], 'quality.minScore': [undefined, 0, 0.8] };
  const ladoValido = () => {
    if (azarB1() < 0.15) return undefined;
    const c = {};
    for (const [ruta, vs] of Object.entries(VALIDOS)) { const v = elegirB1(vs); if (v !== undefined) ponerRuta(c, ruta, v); }
    if (azarB1() < 0.3) ponerRuta(c, 'budget.prefer', elegirB1(['quality', 'speed', 'cost']));
    if (azarB1() < 0.3) ponerRuta(c, 'quality.onBelow', elegirB1(['regenerate', 'accept', 'fail']));
    if (azarB1() < 0.3) c.forbiddenCapabilities = [elegirB1(['text.generate', 'image.generate'])];
    return c;
  };
  const distintas = [];
  for (let i = 0; i < 2000; i++) {
    const o = ladoValido(); const p = ladoValido();
    const nueva = fundirB1(o, p); const vieja = fusionS2A(o, p);
    const mismoObjeto = (!o || !p) ? nueva === vieja : true;
    if (!igual(nueva, vieja) || !mismoObjeto) distintas.push(JSON.stringify([o, p]).slice(0, 120));
  }
  check(`${numero()} · B.1 · CONTROL · con lados válidos la fusión es EXACTAMENTE la de S2-A (2 000 pares), y un lado solo es el mismo objeto`,
    distintas.length === 0, distintas.slice(0, 2).join(' | '));
}

/* A9 · el ciclo se para en 0b, antes del contexto y de A2, y quien lo dice es A1. */
const paradaB1 = (r, esperados) => r.status === 'undecided' && r.parada === 'undecided' && igual(r.recorrido, ['decision'])
  && esConflictoB1(r.decision, esperados) && r.context === undefined && r.decomposition === undefined
  && r.strategies === undefined && r.optimization === undefined && r.entrega === undefined
  && (r.because ?? []).some((f) => f.startsWith('Restricciones mal formadas ('));
const cicloB1 = (camino, objetivo, peticionB1) => {
  const d = decisionBase({
    objective: { ...OBJ_CICLO, ...(objetivo !== undefined ? { constraints: objetivo } : {}) },
    ...(peticionB1 !== undefined ? { constraints: peticionB1 } : {}),
  });
  if (camino === 'tarea') return ciclo.decidir(peticion({ decision: d }));
  if (camino === 'opciones') return ciclo.decidir({ decision: { ...d, options: OPCIONES_B1 } });
  return ciclo.decidir({ decision: d, enfoques: [opcion('e1', { latency: 10 }, TAREA)] });
};
for (const camino of ['tarea', 'opciones', 'enfoques']) {
  const fallos = [];
  for (const c of CAMPOS_B1) {
    for (const [, construir, rutas] of LADOS_B1) {
      for (const [v, motivo] of rotosDe(c)) {
        const r = cicloB1(camino, ...construir(c, v));
        if (!paradaB1(r, rutas.map((ru) => `${ru}.${c.ruta}: ${motivo}`))) fallos.push(`${c.ruta}=${String(v)} → ${r.status}/${r.parada} [${r.recorrido}]`);
      }
    }
  }
  check(`${numero()} · B.1 · A9 por el camino de ${camino}: con restricciones rotas se para en 0b —ni contexto ni A2— y A1 lo dice como conflicto`,
    fallos.length === 0, fallos.slice(0, 3).join(' | '));
}
check(`${numero()} · B.1 · CONTROL · A9 con restricciones válidas compone como siempre: contexto, A2, A4, A3, A5, A1 y entrega`,
  (() => {
    /* Restricciones que las estrategias SÍ pueden cumplir sin mediciones que no hay: `maxSteps` se cuenta sobre el plan. */
    const r = cicloB1('tarea', { maxSteps: 10 }, { minConfidence: 0 });
    return r.status === 'decided' && igual(r.recorrido,
      ['context', 'decomposition', 'parallelization', 'strategy', 'optimization', 'decision', 'handoff'])
      && r.entrega?.constraints?.maxSteps === 10 && r.entrega?.constraints?.minConfidence === 0;
  })(), JSON.stringify(cicloB1('tarea', { maxSteps: 10 }, { minConfidence: 0 }).recorrido));

/* A3, A5 y A8 con la MISMA regla —y el mismo motivo—. */
const a3B1 = A.crearMotorDeEstrategias();
const FORMAS_B1 = A.crearMotorDeDescomposicion().descomponer(TAREA).opciones.map((o) => o.value);
{
  const fallos = [];
  for (const c of CAMPOS_B1) {
    for (const [v, motivo] of rotosDe(c)) {
      const r = a3B1.proponer(FORMAS_B1, SENALES, conRuta(c.ruta, v));
      const bien = r.estrategias.length === 0 && r.rechazadas.length === FORMAS_B1.length
        && r.rechazadas.every((x) => x.reason === 'constraint_conflict' && x.detail === `constraints.${c.ruta}: ${motivo}`);
      if (!bien) fallos.push(`${c.ruta}=${String(v)} → ${r.estrategias.length} estrategias, ${JSON.stringify(r.rechazadas[0])}`);
    }
    if (!a3B1.proponer(FORMAS_B1, SENALES, conRuta(c.ruta, c.valido)).estrategias.length) fallos.push(`${c.ruta} válido: sin estrategias`);
  }
  check(`${numero()} · B.1 · A3 con la regla de A1: sobre restricciones rotas no da por buena ninguna estrategia, y cada rechazo nombra campo y motivo`,
    fallos.length === 0, fallos.slice(0, 3).join(' | '));
}
{
  const optimizarB1 = (restr) => a5.optimizar({ candidates: ESTRATEGIAS, objective: OBJ_CICLO, evidence: EVIDENCIA,
    baselineId: ESTRATEGIAS.find((x) => x.value.isBaseline)?.id, ...(restr ? { constraints: restr } : {}) });
  const fallos = [];
  for (const c of CAMPOS_B1) {
    for (const [v, motivo] of rotosDe(c)) {
      const r = optimizarB1(conRuta(c.ruta, v));
      const bien = r.feasible.length === 0 && r.stoppedBecause === 'infeasible' && r.rejected.length === ESTRATEGIAS.length
        && r.rejected.every((x) => x.why?.reason === 'constraint' && x.why.detail === `constraint_conflict · constraints.${c.ruta}: ${motivo}`);
      if (!bien) fallos.push(`${c.ruta}=${String(v)} → ${r.feasible.length} factibles, ${JSON.stringify(r.rejected[0]?.why)}`);
    }
  }
  check(`${numero()} · B.1 · A5 con la regla de A1: nada es factible sobre restricciones rotas, y cada rechazo nombra campo y motivo`,
    ESTRATEGIAS.length > 0 && optimizarB1(undefined).feasible.length > 0 && fallos.length === 0, fallos.slice(0, 3).join(' | '));
}
{
  /* Un operador propio, inventado aquí —como en `algorithm-optimization`—, para que HAYA propuestas que aceptar. */
  const MITAD = {
    id: 'mitad-b1', label: 'coste a la mitad', affects: ['cost'],
    aplicable: (c) => typeof c.values?.cost === 'number' && c.values.cost > 0.01,
    aplicar: (c) => ({ id: `${c.id}+mitad`, value: c.value, values: { ...c.values, cost: c.values.cost / 2 } }),
  };
  const conMitad = A.crearMotorDeOptimizacion({ operadores: [MITAD] });
  const proponerB1 = (acceptance) => conMitad.optimizar({ candidates: [opcion('base', { cost: 1, latency: 100 })],
    objective: { weights: { cost: 1 } }, ...(acceptance !== undefined ? { acceptance } : {}) });
  const control = proponerB1({ minConfidence: 0 });
  const fallos = [];
  for (const [v, motivo] of rotosDe({ rango: 'fraccion', fuera: [1.5, -0.1] })) {
    const r = proponerB1({ minConfidence: v });
    if (r.proposals.length !== 0 || !r.discarded.some((x) => x.because === `acceptance.minConfidence: ${motivo}`)) {
      fallos.push(`${String(v)} → ${r.proposals.length} propuestas, ${JSON.stringify(r.discarded.map((x) => x.because))}`);
    }
  }
  check(`${numero()} · B.1 · A5 con su propio \`acceptance.minConfidence\`: roto no apaga el mínimo —no se acepta nada, y se dice por qué—`,
    control.proposals.length > 0 && fallos.length === 0, `control ${control.proposals.length} · ${fallos.slice(0, 2).join(' | ')}`);
}
{
  const contextoB1 = (requirements) => a8.seleccionar({ ahora: T1, scope: { capability: CAP }, learned: APRENDIDO, learningPolicy: POL,
    objective: { weights: { successProbability: 1 } }, ...(requirements !== undefined ? { requirements } : {}) });
  const control = contextoB1(undefined);
  const fallos = [];
  for (const [v, motivo] of rotosDe({ rango: 'fraccion', fuera: [1.5, -0.1] })) {
    const r = contextoB1({ minConfidence: v });
    if (r.admisiones.length !== 0
      || !r.because.includes(`requirements.minConfidence: ${motivo}. Unos requisitos mal formados no se sirven: no se admite nada.`)) {
      fallos.push(`${String(v)} → ${r.admisiones.length} admisiones`);
    }
  }
  check(`${numero()} · B.1 · A8 con su propio \`minConfidence\`: roto no apaga el suelo —no se admite nada, y se dice por qué—; válido, lo de siempre`,
    control.admisiones.length > 0 && igual(contextoB1({ minConfidence: 0 }).admisiones, control.admisiones) && fallos.length === 0,
    fallos.slice(0, 2).join(' | '));
}

console.log('\n─── P. S2-B · B.2 · El desglose cuadra con el total ───');

/*
 * Ocho escenarios —A todo medido · B algo medido · C un solo eje medido · D nada
 * medido · E un eje medido que vale 0 · F un eje ausente · G un eje sin peso · H
 * todo mezclado—, cada uno con la elegida que YA tenía: el desglose cambia de
 * palabras y la decisión no. Para cada candidata, con los pesos de la regla de
 * siempre (`pesosNormalizados`):
 *   W_total  = Σ pesos de los ejes con peso      W_medido = Σ pesos de los medidos
 *   S_medido = Σ fit × peso de los medidos
 *   total = S_medido / W_medido  (0 si W_medido = 0)      cobertura = W_medido / W_total
 */
const ESCENARIOS_B2 = [
  { id: 'A · todo medido', objective: { weights: { quality: 1, cost: 1 } },
    options: [opcion('a', { quality: 0.7, cost: 1 }), opcion('b', { quality: 0.6, cost: 2 })], elegida: 'a' },
  { id: 'B · algo medido', objective: { weights: { quality: 1, cost: 1, latency: 1 } },
    options: [opcion('a', { quality: 0.9, cost: 1 }), opcion('b', { quality: 0.5, cost: 2, latency: 400 })], elegida: 'a' },
  { id: 'C · un solo eje medido', objective: { weights: { quality: 1, cost: 1 } },
    options: [opcion('A', { quality: 0.4, cost: 1 }), opcion('B', { cost: 1 })], elegida: 'B' },
  { id: 'D · nada medido', objective: { weights: { latency: 1, reliability: 1 } },
    options: [opcion('a', { quality: 0.4 }), opcion('b', { quality: 0.9 })], elegida: 'a' },
  { id: 'E · un eje medido que vale 0', objective: { weights: { quality: 2, cost: 1 } },
    options: [opcion('a', { quality: 1, cost: 10 }), opcion('b', { quality: 0, cost: 1 })], elegida: 'a' },
  { id: 'F · un eje ausente', objective: { weights: { quality: 0.6, reliability: 0.4 } },
    options: [opcion('a', { quality: 0.9 }), opcion('b', { quality: 0.5, reliability: 0.99 })], elegida: 'a' },
  { id: 'G · un eje sin peso', objective: { weights: { quality: 1 } },
    options: [opcion('a', { quality: 0.8, cost: 5, latency: 100 }), opcion('b', { quality: 0.5, cost: 1 })], elegida: 'a' },
  /* Medido, medido que vale 0 (el coste más caro), ausente (la latencia) y sin peso (la fiabilidad), en la MISMA elegida. */
  { id: 'H · todo mezclado', objective: { weights: { quality: 0.6, cost: 0.2, latency: 0.2 } },
    options: [opcion('a', { quality: 0.95, cost: 3, reliability: 0.8 }), opcion('b', { quality: 0.1, cost: 1, latency: 900 })], elegida: 'a' },
];
const DECISIONES_B2 = ESCENARIOS_B2.map((e) => ({ e, d: a1.decidir(contexto({ objective: e.objective, options: e.options })) }));
/* Lo que la puntuación TIENE que cumplir, recalculado aquí en el mismo orden de ejes. */
const cuentasB2 = (score, objective) => {
  const pesos = A.pesosNormalizados(objective);
  const conPeso = A.EJES.filter((e) => pesos[e] > 0);
  const medidos = conPeso.filter((e) => !score.missing.includes(e));
  const W = conPeso.reduce((s, e) => s + pesos[e], 0);
  const Wm = medidos.reduce((s, e) => s + pesos[e], 0);
  const Sm = medidos.reduce((s, e) => s + score.fits[e] * pesos[e], 0);
  return { pesos, conPeso, medidos, W, Wm, Sm };
};
check(`${numero()} · B.2 · la decisión NO cambia: en los ocho escenarios gana la que ya ganaba (C sigue siendo la deuda D1, sin tocar)`,
  DECISIONES_B2.every(({ e, d }) => d.status === 'decided' && candidata(d, e.elegida)?.reason === 'selected'),
  DECISIONES_B2.map(({ e, d }) => `${e.id}→${d.candidates.find((c) => c.reason === 'selected')?.id}`).join(' · '));
check(`${numero()} · B.2 · PROPIEDAD · para CADA candidata: total = S_medido / W_medido (0 sin nada medido) y cobertura = W_medido / W_total`,
  DECISIONES_B2.every(({ e, d }) => d.candidates.filter((c) => c.score).every((c) => {
    const { Wm, Sm, W } = cuentasB2(c.score, e.objective);
    return casi(c.score.total, Wm > 0 ? Sm / Wm : 0) && casi(c.score.coverage, W > 0 ? Wm / W : 0);
  })));
/* El desglose de la elegida, pieza a pieza. */
const DESGLOSE_B2 = /^Desglose: (.*)\.$/;
const piezasB2 = (d) => (d.explanation.find((f) => DESGLOSE_B2.test(f)) ?? '').replace(DESGLOSE_B2, '$1').split(' · ').filter(Boolean);
check(`${numero()} · B.2 · un eje AUSENTE nunca sale con número —ni 0 ni 0.00—: sale «sin medir»`,
  DECISIONES_B2.every(({ e, d }) => {
    const el = candidata(d, e.elegida);
    const piezas = piezasB2(d);
    return el.score.missing.every((eje) => piezas.includes(`${eje} sin medir`) && !piezas.some((p) => p.startsWith(`${eje} `) && /\d/.test(p)));
  }) && !DECISIONES_B2[2].d.explanation.some((f) => f.includes('quality 0.00')),
  piezasB2(DECISIONES_B2[2].d).join(' · '));
check(`${numero()} · B.2 · un eje MEDIDO sale con su número y su peso, también cuando vale 0 («cost 0.00×0.33» en E)`,
  DECISIONES_B2.every(({ e, d }) => {
    const el = candidata(d, e.elegida);
    const { pesos, medidos } = cuentasB2(el.score, e.objective);
    return medidos.every((eje) => piezasB2(d).includes(`${eje} ${el.score.fits[eje].toFixed(2)}×${pesos[eje].toFixed(2)}`));
  }) && piezasB2(DECISIONES_B2[4].d).includes('cost 0.00×0.33'), piezasB2(DECISIONES_B2[4].d).join(' · '));
check(`${numero()} · B.2 · un eje SIN PESO no sale: el desglose tiene exactamente los ejes con peso, en su orden`,
  DECISIONES_B2.every(({ e, d }) => {
    const { conPeso } = cuentasB2(candidata(d, e.elegida).score, e.objective);
    return igual(piezasB2(d).map((p) => p.split(' ')[0]), conPeso);
  }) && !piezasB2(DECISIONES_B2[6].d).some((p) => /^(cost|latency) /.test(p)), piezasB2(DECISIONES_B2[6].d).join(' · '));
const RENORMALIZADO_B2 = /^Total renormalizado sobre lo medido: (\d+\.\d{3}) ÷ (\d+\.\d{2}) = (\d+\.\d{3}); cobertura (\d+\.\d{2})\.$/;
const NADA_MEDIDO_B2 = 'Ningún eje con peso se pudo medir: el total vale 0 por convención, y la cobertura es 0.';
check(`${numero()} · B.2 · cuando falta algo se dice sobre qué se calculó el total —S ÷ W = total, con la cobertura—, y cuando no falta nada no se añade nada`,
  DECISIONES_B2.every(({ e, d }) => {
    const el = candidata(d, e.elegida);
    const { Wm, Sm, medidos, conPeso } = cuentasB2(el.score, e.objective);
    const frase = d.explanation.find((f) => RENORMALIZADO_B2.test(f) || f === NADA_MEDIDO_B2);
    if (medidos.length === conPeso.length) return frase === undefined;
    if (Wm === 0) return frase === NADA_MEDIDO_B2 && el.score.total === 0 && el.score.coverage === 0;
    const [, s, w, t, cob] = RENORMALIZADO_B2.exec(frase ?? '') ?? [];
    return s === Sm.toFixed(3) && w === Wm.toFixed(2) && t === el.score.total.toFixed(3) && cob === el.score.coverage.toFixed(2);
  }), DECISIONES_B2.map(({ d }) => d.explanation.find((f) => RENORMALIZADO_B2.test(f) || f === NADA_MEDIDO_B2) ?? '—').join(' | '));
check(`${numero()} · B.2 · el caso de la auditoría (C): «quality sin medir · cost 1.00×0.50» y «0.500 ÷ 0.50 = 1.000; cobertura 0.50», junto a «lo que falta NO se contó como malo»`,
  DECISIONES_B2[2].d.explanation.includes('Desglose: quality sin medir · cost 1.00×0.50.')
  && DECISIONES_B2[2].d.explanation.includes('Total renormalizado sobre lo medido: 0.500 ÷ 0.50 = 1.000; cobertura 0.50.')
  && DECISIONES_B2[2].d.explanation.some((f) => f.includes('Lo que falta NO se contó como malo')),
  DECISIONES_B2[2].d.explanation.join(' | '));

console.log('\n─── Q. S2-B · B.3 · Resolver señales sin ordenar de más ───');

/*
 * LA REFERENCIA: `resolverSenales` de S2-A transcrita TAL CUAL —ordena el grupo
 * entero y toma la primera—, con las mismas piezas del motor (`senalValida`,
 * `PESO_DE_FUENTE`, `formaCanonica`). La nueva tiene que dar exactamente lo mismo:
 * las mismas señales —el MISMO objeto—, en el mismo orden, los mismos conflictos
 * con la misma elegida, el mismo porqué y las mismas descartadas en el mismo orden.
 */
const resolverS2A = (senales) => {
  const grupos = new Map();
  (senales ?? []).forEach((s) => {
    if (!A.senalValida(s)) return;
    const clave = `${s.key}\0${s.subject ?? ''}`;
    const lista = grupos.get(clave) ?? [];
    lista.push({ s });
    grupos.set(clave, lista);
  });
  const contenido = (a, b) => {
    const ca = (a.corta ??= JSON.stringify([typeof a.s.value, a.s.value, a.s.confidence ?? null]));
    const cb = (b.corta ??= JSON.stringify([typeof b.s.value, b.s.value, b.s.confidence ?? null]));
    if (ca !== cb) return ca < cb ? -1 : 1;
    const ea = (a.entera ??= A.formaCanonica(a.s));
    const eb = (b.entera ??= A.formaCanonica(b.s));
    return ea < eb ? -1 : ea > eb ? 1 : 0;
  };
  const resueltas = []; const conflictos = [];
  for (const clave of [...grupos.keys()].sort()) {
    const lista = grupos.get(clave);
    if (lista.length === 1) { resueltas.push(lista[0].s); continue; }
    let porque = 'orden';
    const ordenadas = [...lista].sort((a, b) => {
      const fa = A.PESO_DE_FUENTE[a.s.source] ?? 0; const fb = A.PESO_DE_FUENTE[b.s.source] ?? 0;
      if (fa !== fb) return fb - fa;
      const ta = typeof a.s.at === 'number' ? a.s.at : -Infinity; const tb = typeof b.s.at === 'number' ? b.s.at : -Infinity;
      if (ta !== tb) return tb - ta;
      const ma = a.s.sampleSize ?? 0; const mb = b.s.sampleSize ?? 0;
      if (ma !== mb) return mb - ma;
      return contenido(a, b);
    });
    const ganadora = ordenadas[0]; const segunda = ordenadas[1];
    if ((A.PESO_DE_FUENTE[ganadora.s.source] ?? 0) !== (A.PESO_DE_FUENTE[segunda.s.source] ?? 0)) porque = 'fuente';
    else if ((ganadora.s.at ?? -Infinity) !== (segunda.s.at ?? -Infinity)) porque = 'frescura';
    else if ((ganadora.s.sampleSize ?? 0) !== (segunda.s.sampleSize ?? 0)) porque = 'muestra';
    resueltas.push(ganadora.s);
    const descartadas = ordenadas.slice(1).map((x) => x.s);
    if (descartadas.some((d) => d.value !== ganadora.s.value)) conflictos.push({ key: ganadora.s.key, subject: ganadora.s.subject, elegida: ganadora.s, porque, descartadas });
  }
  return { resueltas, conflictos };
};
/* La MISMA salida, estricta: por identidad de cada señal, y además igual en forma (claves, orden, NaN, undefined). */
const mismaResolucion = (a, b) => igual(a, b)
  && a.resueltas.length === b.resueltas.length && a.resueltas.every((x, i) => x === b.resueltas[i])
  && a.conflictos.length === b.conflictos.length && a.conflictos.every((c, i) => {
    const d = b.conflictos[i];
    return c.elegida === d.elegida && c.porque === d.porque && c.descartadas.length === d.descartadas.length
      && c.descartadas.every((x, j) => x === d.descartadas[j]);
  });
const azarB3 = generador(3_1415_9265);
const elegirB3 = (xs) => xs[Math.floor(azarB3() * xs.length)];
const barajarB3 = (xs) => { const c = [...xs]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(azarB3() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
const senalAlAzar = () => {
  const x = { key: elegirB3(['option.quality', 'step.latencyMs', 'a.b']), value: elegirB3([0.5, 0.5, 0.7, 'alto', true, 3]),
    source: elegirB3(['measured', 'measured', 'catalog', 'model', 'declared']) };
  if (azarB3() < 0.7) x.subject = elegirB3(['s1', 's2']);
  if (azarB3() < 0.6) x.at = elegirB3([1, 2, 2, 3]);
  if (azarB3() < 0.6) x.sampleSize = elegirB3([5, 20, 20]);
  if (azarB3() < 0.4) x.confidence = elegirB3([0.5, 0.9]);
  if (azarB3() < 0.5) x.nota = elegirB3(['a', 'b', 'c', 'x'.repeat(300)]);
  if (azarB3() < 0.05) x.sampleSize = NaN;
  return x;
};
{
  let casos = 0; let conConflicto = 0; const distintos = [];
  for (let n = 0; n < 3000; n++) {
    const base = Array.from({ length: 1 + Math.floor(azarB3() * 12) }, senalAlAzar);
    if (azarB3() < 0.2) base.push(base[0]);
    if (azarB3() < 0.2) base.push({ ...base[0] });
    for (let p = 0; p < 4; p++) {
      const lista = p === 0 ? base : barajarB3(base);
      const vieja = resolverS2A(lista); const nueva = A.resolverSenales(lista);
      casos++; if (vieja.conflictos.length) conConflicto++;
      if (!mismaResolucion(nueva, vieja)) distintos.push(JSON.stringify(lista).slice(0, 160));
    }
  }
  check(`${numero()} · B.3 · EQUIVALENCIA · la nueva frente a la de S2-A, por identidad: las mismas resueltas, conflictos, elegida, porqué y descartadas en su orden (${casos} casos al azar, ${conConflicto} con desacuerdo, semilla fija)`,
    distintos.length === 0 && conConflicto > 0, distintos.slice(0, 2).join(' | '));
}
{
  /* Si ninguna señal empata con otra en TODO —ni en forma canónica—, el orden de llegada no puede cambiar nada. */
  const fallos = [];
  for (let n = 0; n < 800; n++) {
    const vistas = new Set();
    const base = Array.from({ length: 2 + Math.floor(azarB3() * 10) }, senalAlAzar)
      .filter((s) => A.senalValida(s) && !vistas.has(A.formaCanonica(s)) && vistas.add(A.formaCanonica(s)));
    const referencia = JSON.stringify(A.resolverSenales(base));
    for (let p = 0; p < 6; p++) if (JSON.stringify(A.resolverSenales(barajarB3(base))) !== referencia) { fallos.push(JSON.stringify(base).slice(0, 120)); break; }
  }
  check(`${numero()} · B.3 · PROPIEDAD · sin dos señales idénticas, las permutaciones dan la misma ganadora, los mismos conflictos y las mismas descartadas (800 conjuntos × 6 órdenes)`,
    fallos.length === 0, fallos.slice(0, 2).join(' | '));
}
{
  const s = (value, source, extra = {}) => ({ key: 'option.quality', subject: 's', value, source, at: 5, sampleSize: 20, ...extra });
  const peor = s(0.2, 'model'); const mejor = s(0.9, 'measured');
  const escalera = [s(0.1, 'default'), s(0.2, 'model'), s(0.3, 'derived'), s(0.4, 'catalog'), s(0.5, 'declared'), s(0.6, 'measured')];
  const empatadas = ['d', 'b', 'c', 'a'].map((nota) => s(0.5, 'measured', { nota }));
  const ganaLaDeNotaMenor = A.resolverSenales(empatadas).resueltas[0];
  check(`${numero()} · B.3 · la peor primero y la mejor después: gana la mejor; la mejor primero: sigue ganando; sustituida varias veces: gana la última mejor`,
    A.resolverSenales([peor, mejor]).resueltas[0] === mejor && A.resolverSenales([mejor, peor]).resueltas[0] === mejor
    && A.resolverSenales(escalera).resueltas[0] === escalera[5] && A.resolverSenales([...escalera].reverse()).resueltas[0] === escalera[5]
    && A.resolverSenales([peor, mejor]).conflictos[0]?.porque === 'fuente');
  check(`${numero()} · B.3 · todas empatadas en procedencia, fecha, muestra, valor y confianza: decide la forma canónica —la nota «a»—, llegue en el orden que llegue, y el porqué es el orden`,
    ganaLaDeNotaMenor?.nota === 'a' && [0, 1, 2, 3, 4].every(() => A.resolverSenales(barajarB3(empatadas)).resueltas[0].nota === 'a')
    && A.resolverSenales([empatadas[0], empatadas[1]]).resueltas[0].nota === 'b'
    && mismaResolucion(A.resolverSenales(empatadas), resolverS2A(empatadas)));
}
{
  /*
   * LA FORMA CANÓNICA, SOLO ENTRE LAS EMPATADAS CON LA GANADORA. Se espía `formaCanonica`
   * en su módulo —`resolverSenales` la llama por él— y se cuentan sus llamadas.
   */
  const CANONICA = lib('core/algorithm/canonical.js');
  const original = CANONICA.formaCanonica;
  const espiar = (fn) => {
    const vistas = [];
    CANONICA.formaCanonica = (x) => { vistas.push(x); return original(x); };
    try { fn(); } finally { CANONICA.formaCanonica = original; }
    return vistas;
  };
  const s = (value, source, extra = {}) => ({ key: 'option.quality', subject: 's', value, source, at: 5, sampleSize: 20, ...extra });
  const unica = s(0.5, 'measured');
  const debajo = Array.from({ length: 20 }, (_, i) => s(0.5, 'catalog', { nota: `n${i}` }));
  const cinco = ['e', 'd', 'c', 'b', 'a'].map((nota) => s(0.5, 'measured', { nota }));
  const distintas = [0.1, 0.2, 0.3, 0.4, 0.5].map((value) => s(value, 'measured'));
  const vistasUnica = espiar(() => A.resolverSenales([...debajo, unica]));
  const vistasCinco = espiar(() => A.resolverSenales([...debajo, ...cinco]));
  const vistasDistintas = espiar(() => A.resolverSenales(distintas));
  check(`${numero()} · B.3 · para ELEGIR, la forma canónica solo entre las empatadas con la ganadora: sin empate, ninguna; cinco empatadas en todo, exactamente esas cinco y ninguna de las otras veinte; empatadas pero con valores distintos, ninguna`,
    CANONICA.formaCanonica === original && vistasUnica.length === 0
    && vistasCinco.length === 5 && cinco.every((x) => vistasCinco.includes(x)) && !debajo.some((x) => vistasCinco.includes(x))
    && vistasDistintas.length === 0,
    `${vistasUnica.length} · ${vistasCinco.length} · ${vistasDistintas.length}`);
  /*
   * Y cuando HAY desacuerdo, las descartadas salen en el orden de siempre: para eso
   * hace falta la forma canónica de las descartadas que empatan ENTRE SÍ —la misma
   * que calculaba el `sort` de S2-A—, nunca la de la ganadora sin empate.
   */
  const ganadoraSola = s(0.9, 'measured');
  const vistasConflicto = espiar(() => A.resolverSenales([...debajo, ganadoraSola]));
  check(`${numero()} · B.3 · con desacuerdo, para ORDENAR las descartadas como siempre, la forma canónica solo de las descartadas que empatan entre sí —las veinte—, y nunca la de la ganadora`,
    vistasConflicto.length === 20 && debajo.every((x) => vistasConflicto.includes(x)) && !vistasConflicto.includes(ganadoraSola)
    && mismaResolucion(A.resolverSenales([...debajo, ganadoraSola]), resolverS2A([...debajo, ganadoraSola])),
    `${vistasConflicto.length}`);
}
/*
 * Los trabajadores disponibles: la ÚNICA señal que A5 lee de lo resuelto (sus recursos). Dos, en desacuerdo, para
 * que resolverlas decida algo —con 1, el operador que acota el paralelo a los trabajadores entra; con 8, no—.
 */
const recursoAlAzar = () => ({ key: 'resource.availableWorkers', value: elegirB3([1, 2, 8]),
  source: elegirB3(['measured', 'model', 'catalog']), sampleSize: elegirB3([5, 20]) });
{
  /*
   * RESOLVER LO YA RESUELTO da lo mismo —una por clave y sujeto, todas válidas, en su
   * orden—: es lo que permite resolver las señales de la petición UNA vez para A4, A3
   * y A5, que solo usan lo resuelto. Y cada motor da lo MISMO con lo crudo que con lo
   * resuelto.
   */
  const fallos = [];
  const a4B3 = A.crearMotorDeParalelizacion();
  for (let n = 0; n < 300; n++) {
    const crudas = [...SENALES, ...Array.from({ length: 6 }, () => ({ ...elegirB3(SENALES), value: elegirB3([100, 300, 900]), source: elegirB3(['measured', 'model']) })),
      recursoAlAzar(), recursoAlAzar()];
    const r = A.resolverSenales(crudas);
    const otraVez = A.resolverSenales(r.resueltas);
    if (!(otraVez.conflictos.length === 0 && otraVez.resueltas.length === r.resueltas.length && otraVez.resueltas.every((x, i) => x === r.resueltas[i]))) fallos.push('idempotencia');
    if (!igual(a4B3.variantes(TAREA, crudas), a4B3.variantes(TAREA, r.resueltas))) fallos.push('A4');
    if (!igual(a3B1.proponer(FORMAS_B1, crudas), a3B1.proponer(FORMAS_B1, r.resueltas))) fallos.push('A3');
    const ev = (xs) => xs.map((x) => ({ claim: x.key, signal: x, supports: true }));
    if (!igual(a5.optimizar({ candidates: ESTRATEGIAS, objective: OBJ_CICLO, evidence: ev(crudas) }),
      a5.optimizar({ candidates: ESTRATEGIAS, objective: OBJ_CICLO, evidence: ev(r.resueltas) }))) fallos.push('A5');
  }
  check(`${numero()} · B.3 · resolver lo ya resuelto da lo mismo, y A4, A3 y A5 dan lo MISMO con las señales crudas que con las resueltas (300 conjuntos con desacuerdos)`,
    fallos.length === 0, [...new Set(fallos)].join(', '));
}
{
  /* El ciclo tiene que componer EXACTAMENTE como si cada motor resolviera las señales crudas por su cuenta. */
  const a2B3 = A.crearMotorDeDescomposicion(); const a4B3 = A.crearMotorDeParalelizacion();
  const fallos = [];
  for (let n = 0; n < 60; n++) {
    const crudas = [...SENALES, ...Array.from({ length: 5 }, () => ({ ...elegirB3(SENALES), value: elegirB3([100, 300, 900]), source: elegirB3(['measured', 'model']) })),
      recursoAlAzar(), recursoAlAzar()];
    const d = decisionBase({ signals: crudas });
    const r = ciclo.decidir({ decision: d, tarea: TAREA, componer: { paralelizar: true, optimizar: true } });
    const restr = A.restriccionesEfectivas(d);
    const descompuesta = a2B3.descomponer(TAREA, restr, d.budget);
    const p = a4B3.variantes(TAREA, crudas, restr, d.budget);
    const st = a3B1.proponer(p.variantes, crudas, restr, d.budget);
    const base = st.estrategias.find((c) => c.value.isBaseline);
    const op = a5.optimizar({ candidates: st.estrategias, objective: d.objective, evidence: crudas.map((x) => ({ claim: x.key, signal: x, supports: true })),
      ...(base ? { baselineId: base.id } : {}) });
    if (!igual(r.decomposition, descompuesta) || !igual(r.parallelization, p.analisis) || !igual(r.strategies, st) || !igual(r.optimization, op)) fallos.push(String(n));
  }
  check(`${numero()} · B.3 · el ciclo compone EXACTAMENTE como si A4, A3 y A5 resolvieran cada uno las señales crudas (60 peticiones con desacuerdos)`,
    fallos.length === 0, fallos.slice(0, 5).join(', '));
}

console.log('\n─── R. S2-B · B.4 · El presupuesto de pensar no es «no hay alternativas» ───');

/*
 * LA EVIDENCIA DE LO QUE SE EVALÚA. Dos alternativas, `a` y `b`; una pieza es un
 * grupo (clave, sujeto) sobre una de ellas. `piezasR(n)` reparte n claves
 * distintas alternando sujeto; `ajenasR(n)` son n claves sobre un sujeto que no
 * es ninguna alternativa. Las fuentes varían para que QUÉ piezas entran se note
 * en la confianza.
 */
const OPCIONES_R = Object.freeze([opcion('a', { quality: 0.7, cost: 2 }), opcion('b', { quality: 0.9, cost: 3 })]);
const decidirR = (senales, budget, extra = {}) => a1.decidir(contexto({ options: OPCIONES_R, signals: senales, ...(budget ? { budget } : {}), ...extra }));
const claveR = (i) => `option.k${String(i).padStart(4, '0')}`;
const piezasR = (n, fuentes = ['measured', 'catalog', 'model']) =>
  Array.from({ length: n }, (_, i) => ({ key: claveR(i), subject: i % 2 ? 'a' : 'b', value: 0.5, source: fuentes[i % fuentes.length] }));
const ajenasR = (n, subject = 'otro', prefijo = 'ajena') =>
  Array.from({ length: n }, (_, i) => ({ key: `${prefijo}.k${String(i).padStart(4, '0')}`, ...(subject ? { subject } : {}), value: 1, source: 'measured' }));
const FRASE_R = /^Evidencia acotada por el presupuesto: se usaron (\d+) de (\d+) pieza\(s\) sobre las (\d+) alternativa\(s\) evaluadas \((.+)\), por turnos entre ellas en orden de id; el resto no se miró\.$/;
const fraseR = (d) => (d.explanation ?? []).find((f) => FRASE_R.test(f));
/* Llega al tope: decide, lo dice con `budget_exhausted` y la frase, y gasta exactamente el tope. */
const acotadaR = (d, usadas, piezas, tope) => {
  const [, u, p, n, porque] = FRASE_R.exec(fraseR(d) ?? '') ?? [];
  return d.status === 'decided' && d.candidates.length === 2 && d.warnings.includes('budget_exhausted') && d.spend.evidence === usadas
    && u === String(usadas) && p === String(piezas) && n === '2' && porque === `maxEvidence ${tope}`;
};
/* Cabe: decide sin aviso ni frase de presupuesto, con toda la evidencia. */
const enteraR = (d, piezas) => d.status === 'decided' && d.candidates.length === 2 && !d.warnings.includes('budget_exhausted')
  && !fraseR(d) && d.spend.evidence === piezas;
const verR = (d) => `${d.status}/${d.failure ?? '-'} · ${d.candidates.length} cand · evidencia ${d.spend.evidence} · ${d.warnings.join(',')} · ${fraseR(d) ?? (d.explanation ?? [])[0]}`;

/* 1–4, 7, 8 · las fronteras: 64/65 (el defecto) y 512/513 (el techo). */
const en64 = decidirR(piezasR(64), { maxEvidence: 64 });
const sobre64 = decidirR(piezasR(65), { maxEvidence: 64 });
check(`${numero()} · B.4 · maxEvidence 64: 64 piezas caben enteras —el límite exacto—, y la 65.ª activa el presupuesto: decide igual, con 64 usadas, \`budget_exhausted\` y la frase`,
  enteraR(en64, 64) && acotadaR(sobre64, 64, 65, 64), `${verR(en64)} ‖ ${verR(sobre64)}`);
const en65 = decidirR(piezasR(65), { maxEvidence: 65 });
const sobre65 = decidirR(piezasR(66), { maxEvidence: 65 });
check(`${numero()} · B.4 · maxEvidence 65: 65 caben y 66 no, con la misma regla`,
  enteraR(en65, 65) && acotadaR(sobre65, 65, 66, 65), `${verR(en65)} ‖ ${verR(sobre65)}`);
const en512 = decidirR(piezasR(512), { maxEvidence: 512 });
const sobre512 = decidirR(piezasR(513), { maxEvidence: 512 });
check(`${numero()} · B.4 · maxEvidence 512: 512 caben —el techo, exacto— y 513 no`,
  enteraR(en512, 512) && acotadaR(sobre512, 512, 513, 512), `${verR(en512)} ‖ ${verR(sobre512)}`);
const pide513 = decidirR(piezasR(513), { maxEvidence: 513 });
check(`${numero()} · B.4 · maxEvidence 513 pide más que el techo: rige 512 (\`TOPES_MAXIMOS\`), y con 513 piezas se acota en 512 —ni una más—`,
  A.TOPES_MAXIMOS.maxEvidence === 512 && acotadaR(pide513, 512, 513, 512) && igual(pide513, sobre512), verR(pide513));
const sinTope = decidirR(piezasR(65));
check(`${numero()} · B.4 · sin declarar maxEvidence rige el defecto (${A.TOPES_POR_DEFECTO.maxEvidence}): 64 caben, 65 se acotan en 64`,
  A.TOPES_POR_DEFECTO.maxEvidence === 64 && enteraR(decidirR(piezasR(64)), 64) && acotadaR(sinTope, 64, 65, 64) && igual(sinTope, sobre64), verR(sinTope));

/* 5 · las 65 del caso de la auditoría, sobre algo que no es una alternativa. */
const CERO_R = /Ninguna de las 0 alternativas/;
const ajenas65 = decidirR(ajenasR(65));
const sinSujeto65 = decidirR(ajenasR(65, null));
check(`${numero()} · B.4 · 65 señales sobre un sujeto que no es alternativa —o sin sujeto—: se decide entre las 2, sin gastar evidencia, y nunca «Ninguna de las 0 alternativas…»`,
  [ajenas65, sinSujeto65].every((d) => d.status === 'decided' && d.candidates.length === 2 && d.spend.evidence === 0
    && !d.warnings.includes('budget_exhausted') && !d.explanation.some((f) => CERO_R.test(f)) && d.signalKeys.length === 65),
  `${verR(ajenas65)} ‖ ${verR(sinSujeto65)}`);

/* 6 · las ajenas no le quitan presupuesto a las que sí son evidencia. */
const conAjenas = decidirR([...ajenasR(1000), ...piezasR(64), ...ajenasR(1000, null, 'suelta')]);
const nucleoR = (d) => ({ status: d.status, failure: d.failure, selected: d.selected, selectedScore: d.selectedScore, alternatives: d.alternatives,
  candidates: d.candidates, confidence: d.confidence, uncertainty: d.uncertainty, evidence: d.evidence, explanation: d.explanation, paretoFront: d.paretoFront });
check(`${numero()} · B.4 · 64 piezas entre 2 000 señales ajenas: caben las 64 —las ajenas no gastan— y la decisión es la de las 64 solas`,
  enteraR(conAjenas, 64) && igual(nucleoR(conAjenas), nucleoR(en64)) && conAjenas.signalKeys.length === 64 + 2000,
  verR(conAjenas));

/* 8 · por encima del límite, QUÉ se deja fuera: la última vuelta de los turnos. */
const turnos66 = decidirR(piezasR(66, ['measured']), { maxEvidence: 64 });
const clavesDe = (d, id) => d.candidates.find((c) => c.id === id) && A.inventarioDeSenales(piezasR(66, ['measured'])).porSujeto.get(id);
const evidenciaDe = (d) => d.evidence.map((e) => e.signal.key);
check(`${numero()} · B.4 · 66 piezas (33 por alternativa) con tope 64: entran las 32 primeras claves de CADA una —por turnos— y se quedan fuera las dos 33.as, no 2 de una sola`,
  acotadaR(turnos66, 64, 66, 64) && evidenciaDe(turnos66).length === 32 && !evidenciaDe(turnos66).includes(claveR(64)) && !evidenciaDe(turnos66).includes(claveR(65))
    && !!clavesDe(turnos66, 'a'), `${turnos66.selected?.nombre}: ${evidenciaDe(turnos66).length} piezas`);
const ordenR = A.piezasPorTurnos(A.inventarioDeSenales([
  ...['k3', 'k1', 'k2'].map((k) => medida(`option.${k}`, 'b', 1)), ...['k2', 'k1'].map((k) => medida(`option.${k}`, 'a', 1)), medida('option.k9', 'z', 1),
]), ['a', 'b']).map((g) => `${g[0].subject}:${g[0].key}`);
check(`${numero()} · B.4 · el orden de los turnos: alternativas en su orden, claves ordenadas, una de cada una por vuelta, y lo ajeno nunca`,
  igual(ordenR, ['a:option.k1', 'b:option.k1', 'a:option.k2', 'b:option.k2', 'b:option.k3']), ordenR.join(' '));

/* 9, 23 · las permutaciones de las mismas señales dan la MISMA decisión, byte a byte, también acotando. */
{
  const azar = generador(4_0404_2026);
  const barajar = (xs) => { const c = [...xs]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const base = [...piezasR(70), ...ajenasR(30), ...piezasR(20).map((s) => ({ ...s, value: 0.9, source: 'model' })), ...ajenasR(5, null)];
  const referencia = JSON.stringify(decidirR(base, { maxEvidence: 50 }));
  const distintas = Array.from({ length: 40 }, () => JSON.stringify(decidirR(barajar(base), { maxEvidence: 50 }))).filter((x) => x !== referencia).length;
  const dosVeces = igual(decidirR(base, { maxEvidence: 50 }), decidirR(base, { maxEvidence: 50 }))
    && igual(A.crearMotorDeDecision().decidir(contexto({ options: OPCIONES_R, signals: base, budget: { maxEvidence: 50 } })), decidirR(base, { maxEvidence: 50 }));
  check(`${numero()} · B.4 · PROPIEDAD · 40 permutaciones de 125 señales —con desacuerdos, ajenas y acotando en 50—: una sola decisión, byte a byte; y la misma entrada dos veces, o con otro motor, da lo mismo`,
    distintas === 0 && dosVeces && acotadaR(JSON.parse(referencia), 50, 70, 50), `${distintas} distinta(s)`);
}

/* 10, 11, 24 · sin llegar al tope, A1 decide EXACTAMENTE como antes. */
{
  const azar = generador(10_24_2026);
  const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
  const fallos = [];
  for (let k = 0; k < 400; k++) {
    const opciones = Array.from({ length: 2 + Math.floor(azar() * 4) }, (_, i) => opcion(`o${i}`, { quality: elegir([0.2, 0.5, 0.9]), cost: elegir([1, 2, 3]) }));
    const sujetos = [...opciones.map((o) => o.id), 'ajeno', undefined];
    const senales = Array.from({ length: Math.floor(azar() * 60) }, () => {
      const s = { key: elegir(['option.quality', 'option.cost', 'x.y', 'option.k1', 'option.k2']), value: elegir([0.5, 0.7, 1, 'alto']),
        source: elegir(['measured', 'catalog', 'model', 'declared']) };
      const sujeto = elegir(sujetos); if (sujeto !== undefined) s.subject = sujeto;
      if (azar() < 0.5) s.at = elegir([1, 2, 3]);
      if (azar() < 0.4) s.sampleSize = elegir([5, 20]);
      return s;
    });
    const tope = elegir([undefined, 64, 200, 512]);
    const ctx = contexto({ options: opciones, signals: senales, ...(tope ? { budget: { maxEvidence: tope } } : {}),
      ...(azar() < 0.3 ? { constraints: { minConfidence: elegir([0.1, 0.5]) } } : {}) });
    const d = a1.decidir(ctx);
    /* El oráculo de ANTES: la evidencia de cada alternativa salía de TODAS las señales resueltas, filtradas por su sujeto. */
    const resueltasAntes = A.resolverSenales(senales).resueltas;
    const soloSuyas = a1.decidir({ ...ctx, signals: resueltasAntes.filter((s) => opciones.some((o) => o.id === s.subject)) });
    const evidenciaAntes = d.status === 'decided'
      ? A.evidenciaDeOpcion(opciones.find((o) => o.value === d.selected), resueltasAntes, A.estrategiaPorDefecto) : undefined;
    const clavesAntes = [...new Set(resueltasAntes.map((s) => s.key))].sort();
    /* Las claves las dice una decisión tomada; sin decisión nunca las llevó, ni antes ni ahora. */
    const bien = igual(nucleoR(d), nucleoR(soloSuyas)) && (d.status === 'decided' ? igual(d.signalKeys, clavesAntes) : d.signalKeys === undefined)
      && d.warnings.includes('signal_conflict') === (A.resolverSenales(senales).conflictos.length > 0)
      && !d.warnings.includes('budget_exhausted')
      && (d.status !== 'decided' || (igual(d.evidence, evidenciaAntes) && casi(d.confidence.value, A.confianzaDeOpcion(d.selectedScore, evidenciaAntes).value)));
    if (!bien) fallos.push(String(k));
  }
  check(`${numero()} · B.4 · PROPIEDAD · 400 peticiones al azar sin llegar al tope (sin declararlo, 64, 200 o 512): la misma evidencia, confianza, candidatas, elegida y explicación que con la regla de antes, las mismas claves y el mismo \`signal_conflict\``,
    fallos.length === 0, fallos.slice(0, 5).join(', '));
}

/* 22 · «sin evidencia» no es «evidencia acotada». */
{
  const sinNada = decidirR([]);
  const soloAjena = decidirR(ajenasR(100));
  const exigente = decidirR(ajenasR(100), undefined, { constraints: { minConfidence: 0.5 } });
  const acotada = decidirR(piezasR(65, ['measured']));
  const sinEvidencia = (d) => d.status === 'decided' && d.confidence.value === 0 && d.warnings.includes('low_confidence')
    && !d.warnings.includes('budget_exhausted') && !fraseR(d) && d.spend.evidence === 0;
  check(`${numero()} · B.4 · SIN evidencia —nada, o solo ajena— es confianza 0 y \`low_confidence\`, y con un mínimo, \`insufficient_evidence\`; evidencia ACOTADA es \`budget_exhausted\`, la frase y una confianza que sí sale de lo que cupo`,
    sinEvidencia(sinNada) && sinEvidencia(soloAjena) && exigente.failure === 'insufficient_evidence' && !fraseR(exigente)
      && acotadaR(acotada, 64, 65, 64) && acotada.confidence.value > 0 && !acotada.warnings.includes('low_confidence'),
    `${verR(sinNada)} ‖ ${verR(exigente)} ‖ ${verR(acotada)}`);
}

/* El presupuesto se aplica ANTES de resolver: lo ajeno y lo que no cabe no llegan al desempate caro. */
{
  const canonico = lib('core/algorithm/canonical.js');
  const original = canonico.formaCanonica;
  let llamadas = 0;
  canonico.formaCanonica = (...xs) => { llamadas++; return original(...xs); };
  try {
    /* 300 empatadas en todo sobre un sujeto ajeno: para resolverlas harían falta 300 formas canónicas. */
    const empatadasAjenas = Array.from({ length: 300 }, (_, i) => ({ key: 'option.quality', subject: 'otro', value: 0.5, source: 'measured', at: T0, nota: `n${i}` }));
    llamadas = 0; decidirR(empatadasAjenas); const ajenasLlamadas = llamadas;
    llamadas = 0; A.resolverSenales(empatadasAjenas); const siSeResolvieran = llamadas;
    /* 40 grupos de 3 empatadas sobre las alternativas, con tope 10: solo se resuelven los 10 que caben. */
    const grupos = Array.from({ length: 40 }, (_, g) => [0, 1, 2].map((j) => ({ key: claveR(g), subject: g % 2 ? 'a' : 'b', value: 0.5, source: 'measured', at: T0, nota: `g${g}-${j}` }))).flat();
    llamadas = 0; const diez = decidirR(grupos, { maxEvidence: 10 }); const acotadasLlamadas = llamadas;
    check(`${numero()} · B.4 · el tope va ANTES de resolver: 300 empatadas ajenas no piden ni una forma canónica (resolverlas pediría ${siSeResolvieran}), y de 40 grupos de 3 empatadas con tope 10 solo se desempatan los 10 que caben`,
      ajenasLlamadas === 0 && siSeResolvieran === 300 && acotadasLlamadas === 30 && diez.spend.evidence === 10,
      `${ajenasLlamadas} · ${siSeResolvieran} · ${acotadasLlamadas}`);
  } finally {
    canonico.formaCanonica = original;
  }
}

/* Y por el camino de opciones del ciclo, lo mismo: las 65 ajenas no dejan a A9 sin alternativas. */
{
  const cicloR = A.crearCicloAlgoritmico();
  const r = cicloR.decidir({ decision: contexto({ options: OPCIONES_R, signals: ajenasR(65) }) });
  check(`${numero()} · B.4 · A9, camino de opciones, con las 65 ajenas de la auditoría: A1 elige y se entrega —no «Ninguna de las 0»—`,
    r.status === 'decided' && r.entrega?.elegida === 'a' && r.decision?.spend.evidence === 0 && !r.decision.explanation.some((f) => CERO_R.test(f)),
    `${r.status}/${r.parada ?? '-'} · ${r.entrega?.elegida}`);
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nS2-A: se decide con reglas que se pueden comprobar, sin inventar calidad, y el CON QUÉ sigue siendo del Router');
process.exit(failures ? 1 : 0);
