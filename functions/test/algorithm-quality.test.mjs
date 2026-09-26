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
 *  M. R5 — el versionado: contrato 1.10 con su entrada (S2-A) y 1.11 (S2-B), y
 *     los motores cuya decisión cambió: A1 a su versión 3 y A8 a la 2.
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
 *  S. S2-B.5 — el cierre de S2-B: los nueve topes de pensar con la regla de B.1,
 *     el porqué de la composición vaciada, los grupos de duplicados, la
 *     equivalencia con las versiones anteriores y el versionado.
 *  T. S2-C — la fase técnica: la regla de B.1 en las llamadas sueltas a A3, A4,
 *     A5 y A8; A2, A6 y A7 fijados como «BLOCKED — HUMAN DECISION»; los huecos de
 *     pruebas de la auditoría; la equivalencia con e3a9e94 con entradas válidas; y
 *     lo ya resuelto, devuelto tal cual.
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
  /* (S2-C.1 · D3) Quien ejecuta produce lo medido CON EL SUJETO del resultado: `subject` es `actual.id`. */
  return { kind: clase, at, actual: { id: `ejec_${i}`, status: x.status, outputs },
    signals: [{ key: 'result.latencyMs', subject: `ejec_${i}`, value: 1000, source: 'measured', at }], ...extra };
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
check('70 · la confianza del veredicto es la de A6 —evidencia del evaluador y, desde S2-C.1 (D3), la observada del resultado, con su procedencia—, no un número puesto por el ciclo',
  !!C11.outcome?.verification?.confidence && C11.outcome.verification.confidence === C11.verification?.confidence &&
  (C11.verification?.confidence?.basis ?? []).length > 0 &&
  C11.verification.confidence.basis.some((e) => e.signal.key === 'quality.sintetica') &&
  C11.verification.confidence.basis.every((e) => e.signal.source === 'measured'
    && (e.signal.key === 'quality.sintetica' || (e.signal.key === 'result.latencyMs' && e.signal.subject === C11.outcome.id))));

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
check('101 · R5 · el contrato del Algorithm Engine es 1.12 (S2-C.1; 1.11 fue S2-B y 1.10 S2-A), y la evidencia que se produzca lo dirá: la sección y la decisión llevan ese número',
  ALGORITHM_CONTRACT_VERSION === '1.12' && R.contract === '1.12' && R.decision?.contract === '1.12' && E1.contract === '1.12'
  && /\* 1\.12 \(S2-C\.1\): /.test(srcContratos) && /\* 1\.11 \(S2-B\): /.test(srcContratos));
check('102 · R5 · 1.10 está registrado en su historial —qué cambia y por qué sube—, y el historial anterior sigue intacto',
  /\* 1\.10 \(S2-A\): /.test(srcContratos) && /\* 1\.9 \(A9\.3\): /.test(srcContratos) && /\* 1\.7 \(A9\.1\): /.test(srcContratos) &&
  ['DESEMPATE', 'FRONTERA', 'EFECTIVAS', 'REGISTRO', 'CONFIANZA'].every((p) => new RegExp(`\\* {3}${p} `).test(srcContratos)) &&
  !/\(A9\)/.test(srcContratos));
check('103 · R5 · la compatibilidad compara números, no texto: 1.10 habla con quien espera 1.9, y un descriptor de 1.9 ya no vale para 1.10',
  contratoCompatible('1.10', '1.9') && !contratoCompatible('1.9', '1.10') && contratoCompatible('1.10', '1.10') && '1.10' < '1.9');
check('104 · R5 · los motores cuya decisión cambió suben —«sube cuando cambia lo que el algoritmo DECIDE»—: A1 a 3 (S2-B, con entradas válidas), A8 sigue en 2 (S2-A); los demás, no',
  A.DECISION_ENGINE_VERSION === 3 && A.DECISION_ENGINE_REF === 'motor-de-decision@3' && E1.algorithm === 'motor-de-decision@3' &&
  A.DESCRIPTOR_DE_CONTEXTO.version === 2 && A.DESCRIPTOR_DEL_MOTOR.version === 3 &&
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
/*
 * Desde S2-B.4 la 7 se dice cerrada EN LO QUE DECIDE, con lo que deja abierto escrito a continuación —los
 * huecos de contrato y el resto—, y la 12 (`maxDepth`, la misma familia) se añade cerrada con su hueco. Nada
 * de lo abierto se da por cerrado. Desde S2-B.5 la 7 y la 12 se dicen PARCIALMENTE CERRADAS —una deuda con una
 * parte abierta no se llama «cerrada»—: la 7 con lo que cerró B.5 (los nueve topes de pensar y el porqué de la
 * composición vaciada) y con lo aplazado escrito; y lo que B.5 cerró ya no se dice como si pasara hoy.
 */
/*
 * (S2-C.1) Ya no queda ninguna ABIERTA: S2-C.1 las decidió todas. D11 y el vocabulario de 1.12 los fija §U (225–228),
 * con los puntos 7, 10 y 12 al día; lo mal formado en A2, A6 y A7 (ALC), §T 207–209 y §U 229; las señales observadas
 * que `cerrar` no le pasaba a A6 (D3), §T 210 y §U 230; y la procedencia (D4), `maxLatencyMs` (D9), `maxParallel` (D8),
 * la segunda pasada de A9 y los grupos de duplicados (mantener), §U 231, que exige verlas escritas como decididas.
 */
const DEUDAS_ABIERTAS = [];
const CERRADAS_EN_S2B = [
  ['2. **el desglose no cuadraba', 'cerrada en s2-b · b.2'],
  ['5. **`minconfidence: nan`** se ignoraba', 'cerrada en s2-b · b.1'],
  ['6. **`maxrisk: nan`** dejaba fuera', 'cerrada en s2-b · b.1'],
  ['7. **las señales no se acotaban antes de resolverlas**', 'cerrada en s2-b · b.4'],
  ['12. **un plan que no cabía en `maxdepth`', 'cerrada en s2-b · b.4'],
];
const COMO_SI_FUERAN_DE_HOY = ['se ignora —el mínimo deja de exigirse—', 'deja fuera a todas —nadie cumple—', 'la explicación dice «quality 0.00×0.50',
  'a1 las resuelve todas y después aplica `maxevidence`', 'el resto de topes de pensar, que siguen ignorando lo mal formado',
  'que sigue acabando en «no llegó ninguna alternativa»'];
const tramoDe = (inicio, largo = 400) => { const i = S18_PLANO.indexOf(inicio); return i < 0 ? '' : S18_PLANO.slice(i, i + largo); };
const abiertasQueFaltan = DEUDAS_ABIERTAS.filter((d) => !S18_PLANO.includes(d));
const cerradasMalDichas = CERRADAS_EN_S2B.filter(([deuda, cierre]) => !tramoDe(deuda).includes(cierre)).map(([d]) => d);
const dichasComoDeHoy = COMO_SI_FUERAN_DE_HOY.filter((f) => S18_PLANO.includes(f));
/* Cada punto hasta el siguiente, para que lo que diga uno no lo cubra otro. */
const puntoDe = (inicio, siguiente) => { const i = S18_PLANO.indexOf(inicio); const j = i < 0 ? -1 : S18_PLANO.indexOf(siguiente, i + inicio.length);
  return i < 0 || j < 0 ? '' : S18_PLANO.slice(i, j); };
const septima = puntoDe('7. **las señales no se acotaban antes de resolverlas**', '8. **');
const duodecima = puntoDe('12. **un plan que no cabía en `maxdepth`', 'y una nota de pruebas');
check('111 · R6 · S2-B · las deudas de S2-A siguen escritas: las abiertas como abiertas —con `fits` (B.2) y lo que B.4 y B.5 dejan aplazado— y las que cerró S2-B (B.1, B.2, B.4 y B.5) con su bloque —PARCIALMENTE si les queda una parte—, y no como lo que pasa hoy',
  abiertasQueFaltan.length === 0 && cerradasMalDichas.length === 0 && dichasComoDeHoy.length === 0
  && septima.includes('**parcialmente cerrada.** cerrada en s2-b · b.4 en lo que decide')
  && septima.includes('cerrado en s2-b.5: los nueve topes de pensar siguen la regla de b.1 en a1 y en el ciclo, y el ciclo dice por qué se vació la composición')
  && septima.includes('aplazado (s2-b.5):') && !septima.includes('siguen abiertos:')
  && duodecima.includes('**parcialmente cerrada.** cerrada en s2-b · b.4') && duodecima.includes('aplazado: el motivo de parada propio (contrato)'),
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

/*
 * LAS CUATRO SITUACIONES de A1, que no se confunden: no hay alternativas; las
 * hay y el presupuesto no dejó mirarlas; se miraron y no cumplen; se miraron y
 * no hay evidencia bastante. «Ninguna de las 0 alternativas…» ya no puede salir.
 */
{
  const reloj = () => { let t = 0; return () => (t += 300); };
  const presupuestoR = (budget, ahora) => (ahora ? A.crearMotorDeDecision({ ahora }) : a1).decidir(contexto({ options: OPCIONES_R, budget }));
  const porCandidatas = presupuestoR({ maxCandidates: 0 });
  const porLlamadas = presupuestoR({ maxAlgorithmCalls: 0 });
  const porReloj = presupuestoR(undefined, reloj());
  const PRESUPUESTO_R = /^Llegaron 2 alternativa\(s\), pero el presupuesto de pensar se agotó \((\w+) (\d+)\) antes de evaluar ninguna/;
  const nombra = (d, tope, valor) => { const m = PRESUPUESTO_R.exec(d.explanation?.[0] ?? ''); return !!m && m[1] === tope && m[2] === String(valor); };
  check(`${numero()} · B.4 · llegaron alternativas y el presupuesto no dejó mirar ninguna: \`budget_exceeded\`, nombrando el tope —maxCandidates 0, maxAlgorithmCalls 0 o el reloj—, con \`candidates_capped\` y \`budget_exhausted\``,
    [[porCandidatas, 'maxCandidates', 0], [porLlamadas, 'maxAlgorithmCalls', 0], [porReloj, 'maxLatencyMs', 250]].every(([d, tope, v]) =>
      d.status === 'undecided' && d.failure === 'budget_exceeded' && d.candidates.length === 0 && nombra(d, tope, v)
      && d.warnings.includes('candidates_capped') && d.warnings.includes('budget_exhausted')),
    [porCandidatas, porLlamadas, porReloj].map((d) => `${d.failure} «${d.explanation?.[0]}»`).join(' ‖ '));
  const sinAlternativas = a1.decidir(contexto({ options: [] }));
  const noCumplen = a1.decidir(contexto({ options: OPCIONES_R, constraints: { budget: { maxUsd: 1 } } }));
  const bajoMinimo = a1.decidir(contexto({ options: OPCIONES_R, constraints: { minConfidence: 0.5 } }));
  const cuatro = [sinAlternativas, porCandidatas, noCumplen, bajoMinimo];
  check(`${numero()} · B.4 · las cuatro, distintas: sin alternativas (\`insufficient_evidence\`, «No llegó ninguna…»), presupuesto (\`budget_exceeded\`), restricciones (\`no_valid_strategy\` sobre 2) y evidencia (\`insufficient_evidence\` por la confianza mínima); en ninguna «Ninguna de las 0»`,
    sinAlternativas.failure === 'insufficient_evidence' && sinAlternativas.explanation[0] === 'No llegó ninguna alternativa que evaluar.'
    && porCandidatas.failure === 'budget_exceeded'
    && noCumplen.failure === 'no_valid_strategy' && noCumplen.explanation[0].startsWith('Ninguna de las 2 alternativas')
    && bajoMinimo.failure === 'insufficient_evidence' && bajoMinimo.explanation[0].includes('por debajo de la confianza mínima')
    && new Set(cuatro.map((d) => d.explanation[0])).size === 4 && !cuatro.some((d) => d.explanation.some((f) => CERO_R.test(f))),
    cuatro.map((d) => `${d.failure}: ${d.explanation[0]}`).join(' ‖ '));
}

/*
 * 12 · UN TOPE DE PENSAR MAL FORMADO, con la regla de B.1: la misma función
 * (`motivoDeNumeroInvalido`, rango `noNegativo`, el que `presupuestoEfectivo` ya
 * exigía) y el mismo veredicto (`constraint_conflict`). Ni una segunda política.
 */
{
  const ROTOS_R = [[NaN, 'no es un número finito (NaN)'], [Infinity, 'no es un número finito (Infinity)'],
    [-Infinity, 'no es un número finito (-Infinity)'], [-1, 'fuera de rango: no puede ser negativo'], ['64', 'no es un número (string)'],
    [null, 'no es un número (null)'], [true, 'no es un número (boolean)'], [{}, 'no es un número (object)'], [[], 'no es un número (array)']];
  const fallos = [];
  for (const campo of ['maxEvidence', 'maxDepth']) {
    for (const [v, motivo] of ROTOS_R) {
      const d = decidirR(piezasR(65), { [campo]: v });
      if (!esConflictoB1(d, [`budget.${campo}: ${motivo}`]) || motivo !== A.motivoDeNumeroInvalido('noNegativo', v) || d.spend.evidence !== 0) {
        fallos.push(`${campo}=${String(v)} → ${d.failure} «${d.explanation?.[0]}»`);
      }
    }
  }
  check(`${numero()} · B.4 · maxEvidence y maxDepth mal formados —NaN, ±Infinity, negativo, texto, null, booleano, objeto, array—: \`constraint_conflict\` que nombra \`budget.<campo>\` con el motivo de B.1, la MISMA función, sin gastar evidencia ni decidir`,
    fallos.length === 0, fallos.slice(0, 3).join(' | '));
  const noObjeto = ['x', 5, []].map((b) => [b, decidirR([], b)]);
  const conNull = a1.decidir(contexto({ options: OPCIONES_R, budget: null }));
  const cero = decidirR(piezasR(3), { maxEvidence: 0, maxDepth: 0 });
  const ambos = a1.decidir(contexto({ options: OPCIONES_R, constraints: { maxRisk: NaN }, budget: { maxDepth: -1, maxEvidence: 'x' } }));
  check(`${numero()} · B.4 · un \`budget\` que no es un objeto se nombra; \`null\` es no declararlo; 0 es un tope VÁLIDO (0 piezas: se decide y se dice); y con restricciones rotas, primero ellas y después el presupuesto, en su orden`,
    noObjeto.every(([b, d]) => esConflictoB1(d, [`budget: no es un objeto de presupuesto (${Array.isArray(b) ? 'array' : typeof b})`]))
    && conNull.status === 'decided' && acotadaR(cero, 0, 3, 0)
    && esConflictoB1(ambos, ['constraints.maxRisk: no es un número finito (NaN)', 'budget.maxEvidence: no es un número (string)',
      'budget.maxDepth: fuera de rango: no puede ser negativo']),
    `${noObjeto.map(([, d]) => d.explanation?.[0]).join(' ‖ ')} ‖ ${verR(cero)} ‖ ${ambos.explanation?.[0]}`);
  /* A9 lo mira en 0b, ANTES de componer, y se lo pregunta a A1: por los tres caminos. */
  const cicloPresupuesto = (camino, budget) => {
    const d = decisionBase({ budget });
    if (camino === 'tarea') return ciclo.decidir(peticion({ decision: d }));
    if (camino === 'opciones') return ciclo.decidir({ decision: { ...d, options: OPCIONES_B1 } });
    return ciclo.decidir({ decision: d, enfoques: [opcion('e1', { latency: 10 }, TAREA)] });
  };
  const paradas = [];
  for (const camino of ['tarea', 'opciones', 'enfoques']) {
    for (const [budget, esperado] of [[{ maxDepth: NaN }, 'budget.maxDepth: no es un número finito (NaN)'], [{ maxEvidence: -5 }, 'budget.maxEvidence: fuera de rango: no puede ser negativo']]) {
      const r = cicloPresupuesto(camino, budget);
      if (!paradaB1(r, [esperado])) paradas.push(`${camino}: ${r.status}/${r.parada} [${r.recorrido}]`);
    }
  }
  const control = cicloPresupuesto('tarea', { maxDepth: 6, maxEvidence: 64 });
  check(`${numero()} · B.4 · A9 con un tope de pensar roto se para en 0b —ni contexto ni A2— y A1 lo dice como conflicto, por los tres caminos; con topes válidos compone como siempre`,
    paradas.length === 0 && control.status === 'decided'
    && igual(control.recorrido, ['context', 'decomposition', 'parallelization', 'strategy', 'optimization', 'decision', 'handoff']),
    paradas.slice(0, 3).join(' | ') || control.recorrido.join('>'));
  /*
   * Lo que B.4 dejó fijado como DEUDA ABIERTA —el resto de la familia del presupuesto, que se ignoraba si venía
   * mal formado— lo cerró S2-B.5 en A1 y en el ciclo: la misma regla, los nueve topes, en su orden.
   */
  const familia = a1.decidir(contexto({ options: OPCIONES_R, budget: { maxCandidates: NaN, maxIterations: -1, maxLatencyMs: 'x', maxChecks: Infinity } }));
  check(`${numero()} · B.4 · (cerrada en S2-B.5) el resto de topes de pensar ya no se ignora mal formado: la misma regla de B.1 para los nueve, en el orden de \`RANGO_DEL_PRESUPUESTO\``,
    esConflictoB1(familia, ['budget.maxLatencyMs: no es un número (string)', 'budget.maxCandidates: no es un número finito (NaN)',
      'budget.maxIterations: fuera de rango: no puede ser negativo', 'budget.maxChecks: no es un número finito (Infinity)'])
    && Object.keys(A.RANGO_DEL_PRESUPUESTO).join(',') === 'maxEvidence,maxDepth,maxLatencyMs,maxCandidates,maxIterations,maxReplans,maxAlgorithmCalls,maxChecks,maxEvaluators',
    verR(familia));
}

/*
 * 13–21 · `maxDepth`: el plan existe aunque no quepa. Planes lineales de 6, 7 y
 * 8 pasos con tope 6 y 7, por el camino simple (A2 → A3) y el paralelo
 * (A2 → A4 → A3), un plan vacío, uno con ramas y sus permutaciones.
 */
{
  const cicloD = A.crearCicloAlgoritmico();
  const pasoD = (id, dep) => ({ id, capability: 'text.generate', purpose: `p-${id}`, ...(dep ? { dependsOn: dep } : {}) });
  const linealD = (n) => Array.from({ length: n }, (_, i) => pasoD(`p${i}`, i ? [`p${i - 1}`] : undefined));
  const COMPONER_D = { simple: undefined, paralelo: { paralelizar: true, optimizar: true } };
  const pedirD = (pasos, maxDepth, camino) => ({
    decision: { contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA, objective: OBJ_CICLO, ...(maxDepth ? { budget: { maxDepth } } : {}) },
    tarea: { id: 'T', steps: pasos }, ...(COMPONER_D[camino] ? { componer: COMPONER_D[camino] } : {}),
  });
  const PARADA_D = /^El plan existe —(\d+) paso\(s\), (\d+) nivel\(es\) de dependencia— pero ninguna de sus disposiciones cabe en el presupuesto de profundidad \(maxDepth (\d+)\): fuera por él, (\d+) disposición\(es\)(?:; por otros motivos, (\d+))?\. Se para aquí: ni se inventa una alternativa ni se le pide a A1 que elija entre nada\.$/;
  /*
   * Fuera del tope: se para tras la composición, sin A1, sin entrega, con las razones de A2/A3 de siempre y sin «No
   * llegó ninguna». La parada, `undecided` hasta 1.11, es desde S2-C.1 (1.12) la suya: `max_depth_exceeded`.
   */
  const paradaD = (r, pasos, niveles, tope, camino) => {
    const m = PARADA_D.exec(r.because?.[0] ?? '');
    const rechazadas = camino === 'simple' ? r.decomposition?.rechazadas : r.strategies?.rechazadas;
    const razon = camino === 'simple' ? 'max_depth_exceeded' : 'constraint:maxDepth';
    return r.status === 'undecided' && r.parada === 'max_depth_exceeded' && !r.recorrido.includes('decision') && r.recorrido.at(-1) === 'strategy'
      && r.decision === undefined && r.entrega === undefined && r.strategies?.estrategias.length === 0
      && !!m && m[1] === String(pasos) && m[2] === String(niveles) && m[3] === String(tope)
      && rechazadas?.length > 0 && rechazadas.every((x) => x.reason === razon) && m[4] === String(rechazadas.length)
      && !JSON.stringify(r).includes('No llegó ninguna alternativa');
  };
  const decididaD = (r, pasos) => r.status === 'decided' && r.entrega?.plan?.steps.length === pasos && r.recorrido.includes('decision');
  const tabla = [];
  let bien = true;
  for (const camino of ['simple', 'paralelo']) {
    for (const [pasos, tope] of [[6, 6], [7, 6], [8, 6], [6, 7], [7, 7], [8, 7]]) {
      const r = cicloD.decidir(pedirD(linealD(pasos), tope === 6 ? undefined : tope, camino));
      const cabe = pasos <= tope;
      const ok = cabe ? decididaD(r, pasos) : paradaD(r, pasos, pasos, tope, camino);
      bien = bien && ok;
      tabla.push(`${camino} ${pasos}/${tope}:${ok ? (cabe ? 'decide' : 'para') : `MAL ${r.status}/${r.parada}`}`);
    }
  }
  check(`${numero()} · B.4 · maxDepth 6 (el defecto) y 7, con planes lineales de 6, 7 y 8 pasos, por los dos caminos: lo que cabe se decide como siempre; lo que no, se para diciendo que el plan EXISTE —pasos, niveles y tope—, sin A1, sin entrega y con los motivos de A2 y A3, y desde S2-C.1 (1.12) con su parada propia, \`max_depth_exceeded\``,
    bien, tabla.join(' · '));

  const vacio = cicloD.decidir(pedirD([], undefined, 'simple'));
  const ocho = cicloD.decidir(pedirD(linealD(8), undefined, 'simple'));
  const nada = cicloD.decidir({ decision: decisionBase({ signals: [] }) });
  check(`${numero()} · B.4 · tres cosas distintas: el plan que NO existe (vacío: \`invalid_task\`, \`empty_decomposition\`), el que no tiene alternativas (A1 corre: «No llegó ninguna…») y el que existe y no cabe en maxDepth (el ciclo se para antes de A1)`,
    vacio.status === 'invalid' && vacio.parada === 'invalid_task' && vacio.decomposition?.problemas?.[0]?.reason === 'empty_decomposition'
    && nada.status === 'undecided' && nada.parada === 'undecided' && igual(nada.recorrido, ['decision'])
    && nada.decision?.failure === 'insufficient_evidence' && nada.decision.explanation[0] === 'No llegó ninguna alternativa que evaluar.'
    && paradaD(ocho, 8, 8, 6, 'simple') && ocho.decomposition.problemas.length === 0,
    `${vacio.parada} · ${nada.decision?.explanation?.[0]} · ${ocho.because?.[0]}`);

  /* 19 · con ramas: 8 pasos en 5 niveles. Con tope 6 cabe la disposición por niveles y la de 8 en fila se queda fuera; con tope 4, ninguna. */
  const RAMAS_D = [pasoD('r'), ...['a', 'b'].flatMap((rama) => [1, 2, 3].map((k) => pasoD(`${rama}${k}`, [k === 1 ? 'r' : `${rama}${k - 1}`]))), pasoD('fin', ['a3', 'b3'])];
  const ramas6 = cicloD.decidir(pedirD(RAMAS_D, undefined, 'simple'));
  const ramas6p = cicloD.decidir(pedirD(RAMAS_D, undefined, 'paralelo'));
  const ramas4 = cicloD.decidir(pedirD(RAMAS_D, 4, 'simple'));
  const ramas4p = cicloD.decidir(pedirD(RAMAS_D, 4, 'paralelo'));
  check(`${numero()} · B.4 · un plan con ramas (8 pasos, 5 niveles): con tope 6 se decide entre lo que cabe —la fila de 8 se queda fuera con su motivo—; con tope 4 ninguna cabe y se dice con sus 5 niveles, no con sus 8 pasos`,
    ramas6.status === 'decided' && ramas6.entrega?.plan?.id === 'T:por-niveles:estrategia'
    && igual(ramas6.decomposition.rechazadas.map((x) => `${x.heuristica}:${x.reason}`), ['secuencial:max_depth_exceeded'])
    && ramas6p.status === 'decided' && ramas6p.strategies.rechazadas.every((x) => x.reason === 'constraint:maxDepth')
    && paradaD(ramas4, 8, 5, 4, 'simple') && paradaD(ramas4p, 8, 5, 4, 'paralelo'),
    `${ramas6.entrega?.plan?.id} · ${ramas6p.entrega?.plan?.id} · ${ramas4.because?.[0]}`);

  /*
   * 20, 23 · las permutaciones del mismo plan dan lo mismo, cabe o no. Lo único que sigue el orden de llegada
   * es lo que ya lo seguía en f30079c, sin decidir nada: la LISTA de pasos que el plan lleva —la del Planner tal
   * cual; A2 no la reordena, «los mismos pasos siempre»— y los `niveles` que A4 informa, cada uno con sus pasos en
   * el orden en que llegaron (las tandas sí van ordenadas). Se comparan en orden de id; todo lo demás —tandas,
   * ids, decisión, motivos, porqué— tiene que ser idéntico. La misma petición dos veces, o en un ciclo nuevo: byte a byte.
   */
  const pasosEnOrden = (x) => JSON.stringify(x, (k, v) => {
    if (k === 'steps' && Array.isArray(v) && v.every((s) => typeof s?.id === 'string')) return [...v].sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
    if (k === 'niveles' && Array.isArray(v) && v.every(Array.isArray)) return v.map((nivel) => [...nivel].sort());
    return v;
  });
  const azar = generador(20_20_2026);
  const barajar = (xs) => { const c = [...xs]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const distintas = [];
  for (const [nombre, pasos, tope, camino] of [['ramas 6', RAMAS_D, undefined, 'simple'], ['ramas 4', RAMAS_D, 4, 'paralelo'], ['8 en fila', linealD(8), undefined, 'paralelo'], ['7 en fila, tope 7', linealD(7), 7, 'simple']]) {
    const r = cicloD.decidir(pedirD(pasos, tope, camino));
    const ref = pasosEnOrden(r);
    for (let k = 0; k < 20; k++) if (pasosEnOrden(cicloD.decidir(pedirD(barajar(pasos), tope, camino))) !== ref) { distintas.push(nombre); break; }
    if (JSON.stringify(A.crearCicloAlgoritmico().decidir(pedirD(pasos, tope, camino))) !== JSON.stringify(r)
      || !igual(cicloD.decidir(pedirD(pasos, tope, camino)), r)) distintas.push(`${nombre} (dos veces)`);
  }
  check(`${numero()} · B.4 · PROPIEDAD · 20 permutaciones de los pasos de cada plan —con ramas, en fila, cabiendo o no— dan el mismo resultado (la lista de pasos del Planner, en orden de id); y la misma petición dos veces, o en un ciclo nuevo, byte a byte`,
    distintas.length === 0, distintas.join(' · '));

  /*
   * CONTROL · la parada es SOLO del presupuesto. Si la composición se vacía por restricciones (aquí `maxSteps`
   * por debajo de los pasos del plan), ningún tope se alcanzó y la DECISIÓN sigue como en f30079c: A1 recibe la
   * lista vacía y dice lo que ve, «No llegó ninguna alternativa». Desde S2-B.5 el `because` del ciclo dice además
   * por qué se vació (A2, por restricciones); el motivo ESTRUCTURADO, el genérico hasta 1.11 —deuda de contrato—,
   * es desde S2-C.1 (1.12) la parada `composition_emptied`.
   */
  const porRestricciones = cicloD.decidir({ ...pedirD(linealD(4), undefined, 'simple'),
    decision: { ...pedirD(linealD(4), undefined, 'simple').decision, constraints: { maxSteps: 2 } } });
  check(`${numero()} · B.4 · CONTROL · vaciada por restricciones (maxSteps 2 en un plan de 4): sin frase de profundidad; la decisión, la de siempre (A1 dice lo que ve, «No llegó ninguna alternativa»), el ciclo dice por qué (S2-B.5) y, desde S2-C.1 (1.12), la parada es \`composition_emptied\``,
    porRestricciones.status === 'undecided' && porRestricciones.parada === 'composition_emptied' && porRestricciones.recorrido.includes('decision')
    && porRestricciones.decomposition.rechazadas.every((x) => x.reason === 'max_steps_exceeded')
    && !porRestricciones.because.some((f) => PARADA_D.test(f))
    && porRestricciones.because[0] === 'La composición se quedó sin alternativas antes de A1 —no es que no llegara ninguna—: A2 descartó 2 disposición(es) por restricciones (max_steps_exceeded ×2).'
    && porRestricciones.decision?.explanation?.[0] === 'No llegó ninguna alternativa que evaluar.',
    `${porRestricciones.status}/${porRestricciones.parada} · ${porRestricciones.decision?.explanation?.[0]}`);
}

/*
 * 25 · D · el presupuesto de pensar NO es una autoridad de ejecución: no viaja en
 * la entrega, no tiene lector en `DESTINO_DEL_REQUISITO` y no se traduce a ningún
 * límite de quien ejecuta. (Que ningún archivo prohibido cambie lo comprueba la
 * integridad de la rama con `git diff`, fuera de esta suite.)
 */
{
  const conTopes = ciclo.decidir(peticion({ decision: decisionBase({ budget: { maxEvidence: 64, maxDepth: 6, maxCandidates: 32 } }) }));
  const textoEntrega = JSON.stringify(conTopes.entrega ?? {});
  const fuentesB4 = ['budget.ts', 'decision-engine.ts', 'integration-cycle.ts'].map((f) => sinComentarios(leer(`functions/src/core/algorithm/${f}`))).join('\n');
  /* Los límites de quien ejecuta, por su nombre, y cualquier import de sus capas. (Las frases que ya decían «eso lo elige el Router» no cuentan: son texto.) */
  const EJECUCION = /maxConcurrent|timeoutMs|RetryPolicy|retryPolicy|ProviderLimits|providerLimits|from ['"][^'"]*(orchestrator|workflow|\/job|job-queue|gateway|router|provider)[^'"]*['"]/;
  check(`${numero()} · B.4 · D · el presupuesto de pensar no cruza la frontera: la entrega no lo lleva, \`DESTINO_DEL_REQUISITO\` no le da lector, y el código de B.4 no nombra ningún límite ni capa de ejecución`,
    conTopes.status === 'decided' && igual(Object.keys(conTopes.entrega).sort(), ['constraints', 'expected', 'plan'].filter((k) => k in conTopes.entrega).sort())
    && !/maxEvidence|maxDepth|maxCandidates|"budget"\s*:\s*\{\s*"max/.test(textoEntrega)
    && !['maxEvidence', 'maxDepth'].some((k) => k in A.DESTINO_DEL_REQUISITO) && !EJECUCION.test(fuentesB4),
    `${Object.keys(conTopes.entrega ?? {}).join(',')} · ${(fuentesB4.match(EJECUCION) ?? [''])[0]}`);
}

/* Y el documento dice de S2-B.4 lo que hay: su estado, el versionado que dejó sin decidir —y que se aplicó al cerrar S2-B—, las reglas, los huecos y la regresión. */
{
  const B4 = (() => { const i = S18_PLANO.indexOf('### s2-b.4'); const j = i < 0 ? -1 : S18_PLANO.indexOf('### ', i + 4); return i >= 0 && j > i ? S18_PLANO.slice(i, j) : ''; })();
  const DEBE_DECIR = [
    'estado: en la rama `s2b-decision-quality`, fuera de `main` hasta su revisión',
    'b.4 sí cambia lo que a1 decide con entradas válidas', 'queda como decisión pendiente', 'sin aplicar', 'se aplicó al cerrar s2-b',
    'por turnos', '64/65', '512/513', 'antes de resolver', '`budget_exceeded`', 'sigue la regla de b.1', 'el plan existe',
    'huecos de contrato, dichos y no inventados', 'la regresión es real', 'no hay umbral contractual', '§r (163–189, 27 comprobaciones', '29 nuevos sobre el código', '5 sobre este documento',
  ];
  const faltan = DEBE_DECIR.filter((f) => !B4.includes(f));
  check(`${numero()} · B.4 · el documento dice lo que hay: en la rama y sin integrar, el versionado que B.4 dejó SIN decidir y que se aplicó al cerrar S2-B, las reglas (por turnos, 64/65, 512/513, antes de resolver, \`budget_exceeded\`, la regla de B.1, el plan que existe), los huecos de contrato, la regresión y las pruebas`,
    B4.length > 0 && faltan.length === 0, faltan.join(' · ') || `${DEBE_DECIR.length} afirmaciones`);
}

console.log('\n─── S. S2-B.5 · Cierre de lo que quedaba de S2-B ───');

/*
 * PARTE 3 · TODOS LOS TOPES DE PENSAR, con la regla de B.1. La lista sale del contrato
 * (`TOPES_POR_DEFECTO` tiene una clave por campo de `AlgorithmBudgetLimits`), no de aquí.
 */
{
  const TODOS = Object.keys(A.TOPES_POR_DEFECTO);
  const ROTOS_S = [[NaN, 'no es un número finito (NaN)'], [Infinity, 'no es un número finito (Infinity)'], [-Infinity, 'no es un número finito (-Infinity)'],
    [-1, 'fuera de rango: no puede ser negativo'], ['3', 'no es un número (string)'], [null, 'no es un número (null)'], [true, 'no es un número (boolean)'],
    [{}, 'no es un número (object)'], [[], 'no es un número (array)']];
  const fallos = [];
  for (const campo of TODOS) {
    for (const [v, motivo] of ROTOS_S) {
      const d = decidirR(piezasR(4), { [campo]: v });
      if (!esConflictoB1(d, [`budget.${campo}: ${motivo}`]) || motivo !== A.motivoDeNumeroInvalido('noNegativo', v)) fallos.push(`${campo}=${String(v)} → ${d.failure}`);
    }
  }
  check(`${numero()} · B.5 · los ${TODOS.length} topes de pensar del contrato —no solo maxEvidence y maxDepth— mal formados (NaN, ±Infinity, negativo, texto, null, booleano, objeto, array): \`constraint_conflict\` con \`budget.<campo>\` y el motivo de B.1, la MISMA función`,
    TODOS.length === 9 && igual([...TODOS].sort(), Object.keys(A.RANGO_DEL_PRESUPUESTO).sort()) && fallos.length === 0, fallos.slice(0, 4).join(' | '));

  /* Y NO cambia ninguna decisión válida: un número finito ≥ 0 —0, fraccionario o por encima del techo, que se recorta— nunca es un problema. */
  const azar = generador(5_3_2026);
  const VALIDOS = [0, 0.5, 1, 3, 64, 1e9];
  const falsosPositivos = [];
  for (let k = 0; k < 500; k++) {
    const budget = Object.fromEntries(TODOS.filter(() => azar() < 0.5).map((c) => [c, VALIDOS[Math.floor(azar() * VALIDOS.length)]]));
    const d = decidirR(piezasR(6), budget);
    if (A.problemasDelPresupuesto(budget).length || d.failure === 'constraint_conflict') falsosPositivos.push(JSON.stringify(budget));
  }
  check(`${numero()} · B.5 · PROPIEDAD · 500 presupuestos VÁLIDOS al azar (0, fraccionarios, por encima del techo): ninguno es mal formado, y A1 nunca responde \`constraint_conflict\` por ellos —lo válido decide como antes—`,
    falsosPositivos.length === 0, falsosPositivos.slice(0, 2).join(' | '));

  /* A9 lo mira en 0b para cualquiera de los nueve, antes de componer. */
  const paradas = TODOS.map((campo) => {
    const r = ciclo.decidir(peticion({ decision: decisionBase({ budget: { [campo]: 'x' } }) }));
    return paradaB1(r, [`budget.${campo}: no es un número (string)`]) ? '' : `${campo}: ${r.status}/${r.parada} [${r.recorrido}]`;
  }).filter(Boolean);
  check(`${numero()} · B.5 · A9 se para en 0b con CUALQUIERA de los nueve topes mal formado —ni contexto ni A2— y A1 lo dice como conflicto`,
    paradas.length === 0, paradas.slice(0, 3).join(' | '));
}

/*
 * PARTE 4 · LOS SEIS «NO HAY DECISIÓN» DEL CICLO, que no se confunden. Solo cambia el `because` del ciclo cuando la
 * composición se vacía antes de A1; la decisión —status, lo que A1 dice— sigue siendo la misma. La parada, `undecided`
 * hasta 1.11, tiene desde S2-C.1 (1.12) nombre propio: `composition_emptied` o, si fue el presupuesto, `budget_exceeded`.
 */
{
  const cicloS = A.crearCicloAlgoritmico();
  const pasoS = (id, dep) => ({ id, capability: 'text.generate', purpose: `p-${id}`, ...(dep ? { dependsOn: dep } : {}) });
  const filaS = (n) => Array.from({ length: n }, (_, i) => pasoS(`p${i}`, i ? [`p${i - 1}`] : undefined));
  const pedirS = ({ pasos = filaS(4), budget, constraints, componer, signals, options }) => ({
    decision: { contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA, objective: OBJ_CICLO, ...(budget ? { budget } : {}), ...(constraints ? { constraints } : {}),
      ...(signals ? { signals } : {}), ...(options ? { options } : {}) },
    ...(options ? {} : { tarea: { id: 'T', steps: pasos } }), ...(componer ? { componer } : {}),
  });
  const CAB = 'La composición se quedó sin alternativas antes de A1 —no es que no llegara ninguna—: ';
  const NO_LLEGO = 'No llegó ninguna alternativa que evaluar.';
  const latS = (pasos, ms) => pasos.map((p) => ({ key: 'step.latencyMs', subject: p.id, value: ms, source: 'measured', sampleSize: 20 }));
  const r1 = cicloS.decidir(pedirS({ options: [] }));
  const r2a = cicloS.decidir(pedirS({ constraints: { maxSteps: 2 } }));
  const r2b = cicloS.decidir(pedirS({ constraints: { maxSteps: 2 }, componer: { paralelizar: true } }));
  const r2d = cicloS.decidir(pedirS({ constraints: { maxLatencyMs: 100 }, componer: { optimizar: true }, signals: latS(filaS(4), 300) }));
  const r3a = cicloS.decidir(pedirS({ budget: { maxCandidates: 0 } }));
  const r3b = cicloS.decidir(pedirS({ budget: { maxCandidates: 0 }, componer: { paralelizar: true } }));
  const r3c = cicloS.decidir(pedirS({ budget: { maxAlgorithmCalls: 0 } }));
  const r4 = cicloS.decidir(pedirS({ pasos: filaS(8) }));
  const r5 = cicloS.decidir(pedirS({ options: [opcion('x', { latency: 1 })], budget: { maxCandidates: 0 } }));
  const r6 = cicloS.decidir(pedirS({ options: [opcion('x', { latency: 1 }), opcion('y', { latency: 2 })], constraints: { minConfidence: 0.9 }, budget: { maxEvidence: 1 },
    signals: ['x', 'y'].flatMap((s) => [1, 2, 3].map((k) => ({ key: `option.k${k}`, subject: s, value: 1, source: k === 1 ? 'model' : 'measured' }))) }));
  /* La decisión de siempre en todos los que A1 ve vacíos: indecisa, y A1 dice lo que ve; la parada, con su nombre (1.12). */
  const vaciaParaA1 = (r, parada) => r.status === 'undecided' && r.parada === parada && r.recorrido.at(-1) === 'decision'
    && r.decision?.failure === 'insufficient_evidence' && r.decision.explanation[0] === NO_LLEGO && r.because.at(-1) === 'A1 no eligió entre las estrategias.';
  const esperados = [
    [r2a, 'A2 descartó 2 disposición(es) por restricciones (max_steps_exceeded ×2).', 'composition_emptied'],
    [r2b, 'A3 descartó 1 estrategia(s) por restricciones (constraint:maxSteps ×1).', 'composition_emptied'],
    [r2d, 'A3 descartó 1 estrategia(s) por restricciones (constraint:maxLatencyMs ×1).', 'composition_emptied'],
    [r3a, 'el presupuesto de pensar no dejó a A2 proponer ninguna disposición (`optionLimitReached`).', 'budget_exceeded'],
    [r3b, 'el presupuesto de pensar no dejó a A4 proponer ninguna variante (`budgetExhausted`).', 'budget_exceeded'],
    [r3c, 'el presupuesto de pensar no dejó a A2 proponer ninguna disposición (`optionLimitReached`).', 'budget_exceeded'],
  ];
  const malos = esperados.filter(([r, cola, parada]) => !(vaciaParaA1(r, parada) && r.because.length === 2 && r.because[0] === CAB + cola)).map(([r]) => `${r.parada} · ${r.because[0]}`);
  check(`${numero()} · B.5 · la composición vaciada por RESTRICCIONES (A2, A3 por el camino paralelo y tras medir) o por el PRESUPUESTO de candidatas (A2, A4, maxAlgorithmCalls) lo dice el ciclo, con sus motivos; la decisión sigue siendo la de siempre, y desde S2-C.1 (1.12) la parada lo nombra: \`composition_emptied\` o \`budget_exceeded\``,
    malos.length === 0, malos.slice(0, 2).join(' | '));
  const primeras = [
    r1.because[0], r2a.because[0], r3a.because[0], r4.because[0],
    r5.decision?.explanation?.[0], r6.decision?.explanation?.find((f) => f.startsWith('Evidencia acotada')),
  ];
  check(`${numero()} · B.5 · los seis casos, distintos: no llegó ninguna (camino de opciones, «${NO_LLEGO}»), restricciones, presupuesto de candidatas, \`maxDepth\` («El plan existe…»), \`budget_exceeded\` en A1 y evidencia acotada bajo la confianza mínima`,
    r1.because.length === 1 && r1.because[0] === 'A1 no eligió entre las alternativas dadas.' && r1.decision?.explanation?.[0] === NO_LLEGO
    && r4.because[0].startsWith('El plan existe —') && !r4.recorrido.includes('decision')
    && r5.decision?.failure === 'budget_exceeded' && r6.decision?.failure === 'insufficient_evidence'
    && primeras.every((f) => typeof f === 'string') && new Set(primeras).size === 6
    && ![r1, r4, r5, r6].some((r) => r.because.some((f) => f.startsWith(CAB))),
    primeras.map((f) => (f ?? '—').slice(0, 50)).join(' ‖ '));
  /*
   * El motivo ESTRUCTURADO, que S2-B.5 dejó como hueco de contrato, existe desde S2-C.1 (1.12, V): lo dice la parada.
   * A1 no cambia —la lista le llega vacía y dice `insufficient_evidence`—, y el presupuesto se nombra igual que por
   * el camino de opciones, `budget_exceeded`: la representación común de `maxCandidates: 0`.
   */
  check(`${numero()} · B.5 · HUECO DE CONTRATO CERRADO en S2-C.1 (1.12): el motivo estructurado de una composición vaciada es la parada —\`composition_emptied\` por restricciones, \`budget_exceeded\` por el presupuesto de pensar—; A1 sigue diciendo \`insufficient_evidence\` y el \`because\`, por qué`,
    [r2a, r2b, r2d].every((r) => r.parada === 'composition_emptied') && [r3a, r3b, r3c].every((r) => r.parada === 'budget_exceeded')
    && [r2a, r2b, r2d, r3a, r3b, r3c].every((r) => r.status === 'undecided' && r.decision?.failure === 'insufficient_evidence'),
    [r2a, r3a].map((r) => `${r.parada}/${r.decision?.failure}`).join(' · '));
}

/*
 * PARTE 7 · UN GRUPO CON MILES DE DUPLICADOS es UNA pieza y se resuelve ENTERO: el ganador de B.3 depende de verlo
 * todo, así que B.4 no lo trunca nunca, esté donde esté la ganadora y sea cual sea el tope.
 */
{
  const fallos = [];
  for (const posicion of [0, 500, 1000]) {
    for (const tope of [1, 2, 64]) {
      const grupo = Array.from({ length: 1000 }, (_, i) => ({ key: 'option.quality', subject: 'a', value: 0.5, source: 'catalog', at: T0, nota: `n${i}` }));
      grupo.splice(posicion, 0, { key: 'option.quality', subject: 'a', value: 0.9, source: 'measured', at: T0 });
      const d = decidirR(grupo, { maxEvidence: tope });
      const ganadora = A.resolverSenales(grupo).resueltas[0];
      const suya = d.evidence.filter((e) => e.signal?.subject === 'a');
      if (!(d.selected?.nombre === 'a' && d.spend.evidence === 1 && suya.length === 1 && suya[0].signal === ganadora && ganadora.source === 'measured'
        && !fraseR(d) && d.warnings.includes('signal_conflict'))) fallos.push(`posición ${posicion} · tope ${tope} · ${d.spend.evidence} · ${suya[0]?.signal?.source}`);
    }
  }
  check(`${numero()} · B.5 · un grupo de 1 001 señales —1 000 duplicadas y la ganadora en la posición 0, 500 o 1 000— es UNA pieza y gana la de B.3 aunque el tope sea 1: B.4 nunca trunca dentro de un grupo`,
    fallos.length === 0, fallos.slice(0, 3).join(' | '));
}

/*
 * PARTE 9 · LA PROPIEDAD CENTRAL, sobre entradas válidas al azar: fija lo que B.4 eligió, no inventa nada.
 */
{
  const azar = generador(9_2026_0926);
  const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
  const TOPES_S = [0, 1, 64, 65, 512, 513, undefined];
  const fallos = [];
  let acotadas = 0;
  for (let k = 0; k < 300; k++) {
    const opciones = Array.from({ length: 1 + Math.floor(azar() * 4) }, (_, i) => opcion(`o${i}`, { quality: elegir([0.2, 0.5, 0.9]), cost: elegir([1, 2, 3]) }));
    const npiezas = elegir([0, 1, 3, 40, 64, 65, 100, 512, 513, 600]);
    const piezas = Array.from({ length: npiezas }, (_, i) => ({ key: `option.k${String(i).padStart(4, '0')}`, subject: elegir(opciones).id, value: elegir([0.5, 1]),
      source: elegir(['measured', 'catalog', 'model']) }));
    const duplicadas = piezas.slice(0, Math.floor(azar() * 5)).map((s) => ({ ...s, source: 'model' }));
    const ajenas = Array.from({ length: elegir([0, 10, 100]) }, (_, i) => ({ key: `ajena.k${i}`, ...(azar() < 0.5 ? { subject: 'ajeno' } : {}), value: 1, source: 'measured' }));
    const senales = [...piezas, ...duplicadas, ...ajenas];
    const tope = elegir(TOPES_S);
    const efectivo = Math.min(tope ?? A.TOPES_POR_DEFECTO.maxEvidence, A.TOPES_MAXIMOS.maxEvidence);
    const ctx = contexto({ options: opciones, signals: senales, ...(tope === undefined ? {} : { budget: { maxEvidence: tope } }) });
    const d = a1.decidir(ctx);
    const sinAjenas = a1.decidir({ ...ctx, signals: [...piezas, ...duplicadas] });
    const turnos = A.piezasPorTurnos(A.inventarioDeSenales(senales), [...opciones].map((o) => o.id).sort());
    const usadas = Math.min(turnos.length, efectivo);
    const usadasPares = new Set(turnos.slice(0, usadas).map((g) => `${g[0].subject}\0${g[0].key}`));
    const evidenciaFuera = d.evidence.filter((e) => e.signal && !usadasPares.has(`${e.signal.subject}\0${e.signal.key}`));
    const acoto = turnos.length > efectivo;
    if (acoto) acotadas++;
    const bien = d.status === 'decided' && d.spend.evidence === usadas && d.spend.evidence <= efectivo && evidenciaFuera.length === 0
      && sinAjenas.spend.evidence === d.spend.evidence && igual(nucleoR(sinAjenas), nucleoR(d))
      && d.warnings.includes('budget_exhausted') === acoto && !!fraseR(d) === acoto
      && (tope !== 1 || turnos.length === 0 || (d.spend.evidence === 1 && usadasPares.has(`${turnos[0][0].subject}\0${turnos[0][0].key}`)));
    if (!bien) fallos.push(`#${k} · tope ${tope} · piezas ${turnos.length} · gasto ${d.spend.evidence} · fuera ${evidenciaFuera.length}`);
  }
  check(`${numero()} · B.5 · PROPIEDAD CENTRAL · 300 decisiones al azar con maxEvidence 0, 1, 64, 65, 512, 513 o sin declarar: piezas usadas = min(piezas sobre alternativas, tope efectivo) y nunca más; lo ajeno no cambia ni el gasto ni la decisión; la evidencia de la elegida sale SOLO de lo usado; \`budget_exhausted\` y la frase si y solo si se acotó (${acotadas} acotadas)`,
    fallos.length === 0 && acotadas > 20, fallos.slice(0, 3).join(' | '));

  const cicloP = A.crearCicloAlgoritmico();
  const fallosD = [];
  let paradas = 0;
  for (let k = 0; k < 120; k++) {
    const n = 2 + Math.floor(azar() * 9);
    const pasos = Array.from({ length: n }, (_, i) => ({ id: `s${i}`, capability: 'text.generate', purpose: `p${i}`,
      ...(i ? { dependsOn: [azar() < 0.6 ? `s${i - 1}` : `s${Math.floor(azar() * i)}`] } : {}) }));
    const maxDepth = elegir([6, 7, 8, undefined]);
    const componer = elegir([undefined, { paralelizar: true }, { paralelizar: true, optimizar: true }]);
    const r = cicloP.decidir({ decision: { contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA, objective: OBJ_CICLO, ...(maxDepth ? { budget: { maxDepth } } : {}) },
      tarea: { id: 'T', steps: pasos }, ...(componer ? { componer } : {}) });
    const niveles = A.nivelesDeDependencia(pasos).niveles.length;
    const noCabe = niveles > (maxDepth ?? A.TOPES_POR_DEFECTO.maxDepth);
    const paro = typeof r.because?.[0] === 'string' && r.because[0].startsWith('El plan existe —') && !r.recorrido.includes('decision');
    if (paro) paradas++;
    if (noCabe !== paro || (!noCabe && r.status !== 'decided')) fallosD.push(`#${k} · ${n} pasos, ${niveles} niveles, maxDepth ${maxDepth ?? 6} · ${r.status}/${r.parada}`);
  }
  check(`${numero()} · B.5 · PROPIEDAD CENTRAL · 120 planes al azar con maxDepth 6, 7, 8 o sin declarar, por los dos caminos: el ciclo se para diciendo que el plan existe SI Y SOLO SI sus niveles de dependencia superan el tope; si no, decide (${paradas} paradas)`,
    fallosD.length === 0 && paradas > 10, fallosD.slice(0, 3).join(' | '));
}

/*
 * PARTE 10 · LA EQUIVALENCIA, campo a campo, con las tres versiones anteriores —compilaciones limpias de f30079c,
 * dacf18d y 0df8be2, fijadas en `equivalencia-s2b.json`— sobre entradas VÁLIDAS que no activan ningún límite.
 * Frente a f30079c, la explicación se compara sin las frases que B.2 cambió a propósito.
 */
{
  const E = await import('./equivalencia-s2b.mjs');
  const H = JSON.parse(fs.readFileSync(path.resolve(here, 'equivalencia-s2b.json'), 'utf8'));
  const a1E = A.crearMotorDeDecision();
  const cicloE = A.crearCicloAlgoritmico();
  /* Igual SALVO LOS SELLOS: los de hoy se escriben como los de 0df8be2; los sellos se comprueban aparte (abajo). */
  const selloHoy = { contrato: ALGORITHM_CONTRACT_VERSION, motor: A.DECISION_ENGINE_REF };
  /* (1.12 · S2-C.1 · D11) Y salvo `noRealChoice`, el campo nuevo de la decisión: se compara sin él y se comprueba aparte. */
  const sinCampoNuevo = (x) => JSON.parse(JSON.stringify(x ?? null, (k, v) => (k === 'noRealChoice' ? undefined : v)));
  const comoAntes = (x) => E.sinSellos(sinCampoNuevo(x), selloHoy, H.sellos['0df8be2']);
  const ahora = {
    a1: E.entradasA1(ALGORITHM_CONTRACT_VERSION).map((ctx) => { const d = comoAntes(a1E.decidir(ctx)); return [E.huellasA1(d, false), E.huellasA1(d, true)]; }),
    ciclo: E.entradasCiclo(ALGORITHM_CONTRACT_VERSION, A.TOPES_POR_DEFECTO).map((p) => { const r = comoAntes(cicloE.decidir(p)); return [E.huellasCiclo(r, false), E.huellasCiclo(r, true)]; }),
  };
  const diferencias = [];
  for (const tipo of ['a1', 'ciclo']) {
    for (const version of H.versiones) {
      const antes = H[tipo][version];
      if (antes.length !== ahora[tipo].length) diferencias.push(`${tipo}/${version}: ${antes.length} ≠ ${ahora[tipo].length} entradas`);
      ahora[tipo].forEach(([conB2, sinB2], i) => H.campos[tipo].forEach((campo, k) => {
        if ((version === 'f30079c' ? sinB2[k] : conB2[k]) !== antes[i]?.[k]) diferencias.push(`${tipo} #${i} · ${campo} ≠ ${version}`);
      }));
    }
  }
  /* Lo único nuevo, donde debe: `noRealChoice` en una decisión tomada si y solo si compite UNA sola alternativa. */
  const decisionesE = [...E.entradasA1(ALGORITHM_CONTRACT_VERSION).map((ctx) => a1E.decidir(ctx)),
    ...E.entradasCiclo(ALGORITHM_CONTRACT_VERSION, A.TOPES_POR_DEFECTO).map((p) => cicloE.decidir(p).decision).filter(Boolean)];
  const unaQueCompite = (d) => d.status === 'decided' && (d.candidates ?? []).filter((c) => c.eligible).length === 1;
  const marcaMal = decisionesE.filter((d) => !!d.noRealChoice !== unaQueCompite(d)).length;
  const conMarca = decisionesE.filter((d) => d.noRealChoice).length;
  check(`${numero()} · B.5 · EQUIVALENCIA · ${ahora.a1.length} decisiones de A1 y ${ahora.ciclo.length} del ciclo (6 de la sombra) que no activan ningún límite, campo a campo —decisión, elegida, candidatas, puntuaciones, confianza, avisos, restricciones, entrega, recorrido, explicación…—: idénticas a 0df8be2 y a dacf18d, y a f30079c salvo las frases de B.2; lo único nuevo (1.12, D11) es \`noRealChoice\`, y solo donde compite una sola alternativa (${conMarca})`,
    igual(H.versiones, ['f30079c', 'dacf18d', '0df8be2']) && igual(H.campos.a1, E.CAMPOS_A1) && igual(H.campos.ciclo, E.CAMPOS_CICLO)
    && ahora.a1.length === 40 && ahora.ciclo.length === 28 && diferencias.length === 0 && marcaMal === 0 && conMarca > 0,
    diferencias.slice(0, 5).join(' | ') || (marcaMal ? `${marcaMal} marca(s) fuera de sitio` : `${H.campos.a1.length} + ${H.campos.ciclo.length} campos × 3 versiones`));

  /*
   * LOS SELLOS, aparte. El versionado de S2-B quedó PENDIENTE en S2-B.5 —el contrato vive en `core/contracts.ts`, que
   * esa fase no podía tocar, y subir solo el motor contradecía la entrada 1.10— y se RESOLVIÓ con la autorización del
   * usuario (2026-09-26): contrato 1.11 y `motor-de-decision@3`. Frente a las tres versiones anteriores cambian los
   * sellos y solo los sellos; `motor-de-contexto` sigue en 2.
   */
  check(`${numero()} · B.5 · VERSIONADO RESUELTO: los sellos, y solo los sellos, cambian —contrato 1.11 (1.12 desde S2-C.1) y motor-de-decision@3 frente a ${H.sellos['0df8be2'].contrato} y ${H.sellos['0df8be2'].motor} de las tres anteriores—; motor-de-contexto sigue en 2`,
    H.versiones.every((v) => igual(H.sellos[v], { contrato: '1.10', motor: 'motor-de-decision@2' })) && ALGORITHM_CONTRACT_VERSION === '1.12'
    && A.DECISION_ENGINE_REF === 'motor-de-decision@3' && A.DESCRIPTOR_DE_CONTEXTO.version === 2, `${selloHoy.contrato} · ${selloHoy.motor}`);
}

/*
 * PARTE 15 · Y EL DOCUMENTO DICE DE S2-B.5 LO QUE HAY: CERRADO, PARCIALMENTE CERRADO y APLAZADO, fila a fila,
 * sin llamar «cerrada» a una deuda con una parte abierta; la frase exacta de la evidencia acotada; lo que no se
 * decidió; y el versionado en el MISMO estado que el código —pendiente mientras los sellos sean 1.10 y
 * `motor-de-decision@2`; resuelto, con su cierre escrito, en cuanto se suben—. Y los dos sitios que dicen el número
 * del contrato fuera de §18 —la fila `contract` de la sección de la sombra y la fila del Algorithm Engine en
 * docs/RUNTIME.md— dicen el vigente.
 */
{
  const B5 = (() => { const i = S18_PLANO.indexOf('### s2-b.5'); const j = i < 0 ? -1 : S18_PLANO.indexOf('### ', i + 4); return i >= 0 && j > i ? S18_PLANO.slice(i, j) : ''; })();
  const B5_LINEAS = (() => { const i = S18.indexOf('### S2-B.5'); const j = i < 0 ? -1 : S18.indexOf('### ', i + 4); return i >= 0 && j > i ? S18.slice(i, j).toLowerCase().split('\n') : []; })();
  const pendiente = ALGORITHM_CONTRACT_VERSION === '1.10' && A.DECISION_ENGINE_REF === 'motor-de-decision@2';
  const FILAS = [
    ['topes de pensar mal formados', 'cerrado en a1 y en el ciclo'],
    ['composición vaciada por restricciones o por el presupuesto de candidatas', 'parcialmente cerrado'],
    ['motivo propio de `maxdepth`', 'aplazado'],
    ['aviso estructurado de evidencia acotada', 'aplazado'],
    ['a9 resuelve una vez', 'parcialmente cerrado'],
    ['grupos con miles de duplicados', 'aplazado, auditado'],
    ['doble validación en a1 (la regresión de b.4)', 'aplazado'],
    ['a2–a8 llamados sueltos con topes mal formados', 'aplazado'],
    ['versionado', pendiente ? 'pendiente de decisión' : 'resuelto'],
    ['d11 (sin elección real)', 'aplazada'],
    ['d1, d2b, d3, d4, d8, d9, d10', 'aplazadas'],
  ];
  const filasMal = FILAS.filter(([deuda, estado]) => !B5.includes(`| ${deuda} | ${estado} |`)).map(([d]) => d);
  const DEBE_DECIR = [
    'estado: en la rama `s2b-decision-quality`, fuera de `main` hasta su revisión',
    'evidencia acotada se comunica actualmente mediante `budget_exhausted` + `spend.evidence` + `explanation`; falta campo contractual explícito',
    '**lo que no se decidió aquí**', 'crear `evidence_capped`', 'truncar grupos de duplicados', 'tocar `resolversenales`',
    '§s (190–201, 12 comprobaciones)', '13 nuevos sobre el código', '8 sobre este documento',
    ...(pendiente ? ['**s2-b no está cerrada**', '**el versionado: pendiente, sin inventarlo.**', '**la decisión que falta**',
      '| 1.11 y `motor-de-decision@3` (lo que dice la regla) |', '| seguir en 1.10 y `@2` (hoy) |', '| solo `motor-de-decision@3` |']
      : ['**el versionado: resuelto en 1.11 y `motor-de-decision@3`, sin inventarlo.**', 'y se resolvió después con la primera opción de abajo',
        'se autorizó ese cambio —solo el número y la entrada 1.11—', '**cierre del versionado (autorizado por el usuario el 2026-09-26).**']),
  ];
  const NO_DEBE_DECIR = pendiente ? ['el versionado: resuelto', 'el aviso `evidence_capped`']
    : ['el versionado: pendiente', 'el aviso `evidence_capped`', '**s2-b no está cerrada**', '| versionado | pendiente', '| seguir en 1.10 y `@2` (hoy) |',
      '**la decisión que falta**'];
  const faltan = DEBE_DECIR.filter((f) => !B5.includes(f));
  const sobran = NO_DEBE_DECIR.filter((f) => B5.includes(f));
  /* Resuelto, también fuera del apartado de B.5: las notas de B.1–B.3 y B.4, y B.4 ya no llama «1.11» a un contrato futuro. */
  const FUERA_DE_B5 = pendiente ? [] : ['se resolvió al cerrar s2-b: contrato 1.11 y `motor-de-decision@3`', 'se aplicó al cerrar s2-b',
    'la 1.11 de s2-b no los incluye'];
  const faltanFuera = [...FUERA_DE_B5.filter((f) => !S18_PLANO.includes(f)), ...(pendiente || !S18_PLANO.includes('es decir, contrato 1.11.') ? [] : ['sobra: es decir, contrato 1.11.'])];
  /* El número vigente, también fuera de §18. */
  const filaDelMotor = leer('docs/RUNTIME.md').split('\n').find((l) => l.startsWith('| **Algorithm Engine** |')) ?? '';
  const numeroFuera = [
    [DOC.includes(`\`${ALGORITHM_CONTRACT_VERSION}\` desde S2-`), 'la fila `contract` de la sombra no dice el contrato vigente'],
    [filaDelMotor.includes(`contrato ${ALGORITHM_CONTRACT_VERSION})`), 'docs/RUNTIME.md no dice el contrato vigente'],
  ].filter(([ok]) => !ok).map(([, m]) => m);
  /* Ninguna fila que deje algo APLAZADO se llama «cerrado» a secas. */
  const cerradasConParteAbierta = B5_LINEAS.filter((l) => l.startsWith('| ')).map((l) => l.split(' | '))
    .filter((c) => c.length >= 3 && /^cerrad[oa](\s|$)/.test(c[1]) && /aplazad/.test(c.slice(2).join(' | '))).map((c) => c[0]);
  check(`${numero()} · B.5 · el documento dice lo que hay: cada deuda CERRADA, PARCIALMENTE CERRADA o APLAZADA —ninguna «cerrada» con una parte abierta—, la frase exacta de la evidencia acotada, lo que no se decidió, y el versionado en el mismo estado que el código (${pendiente ? 'PENDIENTE' : 'RESUELTO'})`,
    B5.length > 0 && B5_LINEAS.length > 0 && filasMal.length === 0 && faltan.length === 0 && sobran.length === 0 && cerradasConParteAbierta.length === 0
    && numeroFuera.length === 0 && faltanFuera.length === 0,
    [...filasMal, ...faltan, ...sobran.map((s) => `sobra: ${s}`), ...cerradasConParteAbierta.map((c) => `cerrada con parte abierta: ${c}`), ...numeroFuera, ...faltanFuera].join(' · ')
    || `${FILAS.length} filas · ${DEBE_DECIR.length} afirmaciones · el número vigente fuera de §18`);
}

console.log('\n─── T. S2-C · Endurecimiento técnico sin semántica nueva, huecos de pruebas y bloqueos fijados ───');

/*
 * S2-C, la fase técnica. La regla de B.1 —un número finito en su rango de siempre; lo mal formado ni se ignora ni se
 * interpreta: se rechaza y se dice por qué— llega a las llamadas SUELTAS de A3, A4, A5 y A8, cada una con la forma de
 * rechazo que YA tenía: A3 y A5 rechazan cada alternativa nombrando campo y motivo, A4 lo dice en `problemas` y no da
 * curva, y A8 no admite nada y dice por qué. En el ciclo nada de esto llega —A9 se para en 0b— y con entradas válidas
 * no cambia nada (la equivalencia con e3a9e94, abajo).
 *
 * Y los huecos de pruebas de la auditoría, fijando lo que HAY. Donde lo que hay no se puede cambiar sin decidir algo
 * que no es técnico, la comprobación lo dice en su nombre —«BLOCKED — HUMAN DECISION»— con la decisión que falta.
 * Ninguna comprobación de esta sección decide semántica: si una falla, lo que ha cambiado es una decisión.
 */
const TOPES_T = Object.keys(A.TOPES_POR_DEFECTO);
const ROTOS_T = [NaN, Infinity, -Infinity, -1, '3', null, true, {}, []];
const VALIDOS_T = [0, 0.5, 1, 64, 1e9];
const motivoT = (v) => A.motivoDeNumeroInvalido('noNegativo', v);
const ponerT = (campo, v) => { const [f, d] = campo.split('.'); return d ? { [f]: { [d]: v } } : { [f]: v }; };
const rotosDeRangoT = (rango) => [NaN, Infinity, -Infinity, 'x', null,
  ...(rango === 'positivo' ? [0, -1] : rango === 'fraccion' ? [-0.1, 1.5] : rango === 'noNegativo' ? [-1] : [])];
const a4T = A.crearMotorDeParalelizacion();
const COLA_T = 'Unos topes de pensar mal formados no se sirven: no se admite nada.';
const contextoT = (budget, requirements) => a8.seleccionar({ ahora: T1, scope: { capability: CAP }, learned: APRENDIDO, learningPolicy: POL,
  objective: { weights: { successProbability: 1 } }, ...(requirements !== undefined ? { requirements } : {}), ...(budget !== undefined ? { budget } : {}) });
const optimizarT = (budget, restr) => a5.optimizar({ candidates: ESTRATEGIAS, objective: OBJ_CICLO, evidence: EVIDENCIA,
  baselineId: ESTRATEGIAS.find((x) => x.value.isBaseline)?.id, ...(restr ? { constraints: restr } : {}), ...(budget !== undefined ? { budget } : {}) });

/* PARTE 1 · EL ENDURECIMIENTO: A3, A5, A4 y A8 sueltos, con la regla de B.1 y la forma que cada uno ya tenía. */
{
  const fallos = [];
  for (const campo of TOPES_T) {
    for (const v of ROTOS_T) {
      const r = sinReventar(() => a3B1.proponer(FORMAS_B1, SENALES, undefined, { [campo]: v }));
      const bien = r.estrategias?.length === 0 && r.rechazadas.length === FORMAS_B1.length
        && r.rechazadas.every((x) => x.reason === 'constraint_conflict' && x.detail === `budget.${campo}: ${motivoT(v)}`);
      if (!bien) fallos.push(`${campo}=${String(v)} → ${JSON.stringify(r.lanzo ?? r.rechazadas?.[0])}`);
    }
    for (const v of VALIDOS_T) {
      if (a3B1.proponer(FORMAS_B1, SENALES, undefined, { [campo]: v }).rechazadas.some((x) => x.reason === 'constraint_conflict')) fallos.push(`${campo}=${v} válido → constraint_conflict`);
    }
  }
  /* Restricciones y topes rotos a la vez: primero las restricciones y después los topes, el orden de A1. */
  const ambos = a3B1.proponer(FORMAS_B1, SENALES, { maxRisk: NaN }, { maxDepth: 'x' });
  const noObjeto = sinReventar(() => a3B1.proponer(FORMAS_B1, SENALES, undefined, 'x'));
  check(`${numero()} · S2-C · A3 suelto con los ${TOPES_T.length} topes de pensar mal formados: ninguna estrategia se da por buena y cada rechazo es \`constraint_conflict\` con \`budget.<campo>\` y el motivo de B.1 —la MISMA función—; con topes válidos, ni un conflicto`,
    TOPES_T.length === 9 && fallos.length === 0
    && ambos.estrategias.length === 0 && ambos.rechazadas.every((x) => x.detail === 'constraints.maxRisk: no es un número finito (NaN); budget.maxDepth: no es un número (string)')
    && noObjeto.estrategias?.length === 0 && noObjeto.rechazadas.every((x) => x.detail === 'budget: no es un objeto de presupuesto (string)'),
    fallos.slice(0, 3).join(' | ') || `${TOPES_T.length} topes × ${ROTOS_T.length} rotos · ${VALIDOS_T.length} válidos`);
}
{
  const fallos = [];
  for (const campo of TOPES_T) {
    for (const v of ROTOS_T) {
      const r = sinReventar(() => optimizarT({ [campo]: v }));
      const bien = r.feasible?.length === 0 && r.stoppedBecause === 'infeasible' && r.rejected.length === ESTRATEGIAS.length
        && r.rejected.every((x) => x.why?.reason === 'constraint' && x.why.detail === `constraint_conflict · budget.${campo}: ${motivoT(v)}`);
      if (!bien) fallos.push(`${campo}=${String(v)} → ${JSON.stringify(r.lanzo ?? r.rejected?.[0]?.why)}`);
    }
    for (const v of VALIDOS_T) {
      if (optimizarT({ [campo]: v }).rejected.some((x) => /constraint_conflict/.test(x.why?.detail ?? ''))) fallos.push(`${campo}=${v} válido → constraint_conflict`);
    }
  }
  const ambos = optimizarT({ maxDepth: 'x' }, { maxRisk: NaN });
  check(`${numero()} · S2-C · A5 suelto con los ${TOPES_T.length} topes mal formados: nada es factible y cada rechazo nombra \`budget.<campo>\` y el motivo —detrás de las restricciones—; con topes válidos, ni un conflicto`,
    ESTRATEGIAS.length > 0 && optimizarT(undefined).feasible.length > 0 && fallos.length === 0
    && ambos.rejected.length === ESTRATEGIAS.length
    && ambos.rejected.every((x) => x.why?.detail === 'constraint_conflict · constraints.maxRisk: no es un número finito (NaN); budget.maxDepth: no es un número (string)'),
    fallos.slice(0, 3).join(' | '));
}
{
  const CAMPOS_T = Object.entries(A.RANGO_DE_RESTRICCION);
  const sinCurva = (p, problemas) => p.variantes?.length === 0 && igual([...p.analisis.problemas], problemas)
    && p.analisis.curva.length === 0 && p.analisis.niveles.length === 0;
  const fallos = [];
  for (const [campo, rango] of CAMPOS_T) {
    for (const v of rotosDeRangoT(rango)) {
      const p = sinReventar(() => a4T.variantes(TAREA, SENALES, ponerT(campo, v)));
      if (!sinCurva(p, [`constraints.${campo}: ${A.motivoDeNumeroInvalido(rango, v)}`])) fallos.push(`${campo}=${String(v)} → ${p.lanzo ?? JSON.stringify(p.analisis?.problemas)}`);
    }
  }
  for (const campo of TOPES_T) {
    for (const v of ROTOS_T) {
      const p = sinReventar(() => a4T.variantes(TAREA, SENALES, undefined, { [campo]: v }));
      if (!sinCurva(p, [`budget.${campo}: ${motivoT(v)}`])) fallos.push(`tope ${campo}=${String(v)} → ${p.lanzo ?? JSON.stringify(p.analisis?.problemas)}`);
    }
  }
  /* El grafo primero —con el validador de A2, como siempre—, después las restricciones y después los topes. */
  const conCiclo = a4T.variantes({ id: 'C', steps: [paso('a', ['b']), paso('b', ['a'])] }, [], { maxParallel: NaN }, { maxDepth: 'x' });
  /* Lo válido no es un problema: fracciones, paralelos por encima del ancho y topes de 0 a 1e9. */
  const controles = [{ maxParallel: 2 }, { maxParallel: 0.5 }, { maxParallel: 1.5 }, { maxSteps: 3 }, { deadlineAt: 0 }, undefined]
    .map((c) => a4T.variantes(TAREA, SENALES, c));
  const controlesTope = TOPES_T.flatMap((campo) => VALIDOS_T.map((v) => a4T.variantes(TAREA, SENALES, undefined, { [campo]: v })));
  check(`${numero()} · S2-C · A4 suelto con restricciones (los ${CAMPOS_T.length} campos de B.1) o topes de pensar mal formados: sin variantes ni curva, y \`problemas\` dice campo y motivo —un \`maxParallel\` de 0 o -1 ya no es «uno a la vez», ni un NaN «nada», ni un texto o un infinito «sin tope»—; lo válido, sin problemas`,
    CAMPOS_T.length === 9 && fallos.length === 0
    && igual([...conCiclo.analisis.problemas], ['a:decomposition_cycle', 'constraints.maxParallel: no es un número finito (NaN)', 'budget.maxDepth: no es un número (string)'])
    && [...controles, ...controlesTope].every((p) => p.analisis.problemas.length === 0) && controles[0].variantes.length > 0,
    fallos.slice(0, 3).join(' | ') || `${controles.length + controlesTope.length} controles válidos sin problemas`);
}
{
  const control = contextoT(undefined);
  const fallos = [];
  for (const campo of TOPES_T) {
    for (const v of ROTOS_T) {
      const r = sinReventar(() => contextoT({ [campo]: v }));
      if (r.admisiones?.length !== 0 || r.cierre !== 'unknown' || r.rechazo !== undefined || !r.because.includes(`budget.${campo}: ${motivoT(v)}. ${COLA_T}`)) {
        fallos.push(`${campo}=${String(v)} → ${r.lanzo ?? `${r.admisiones?.length} admisiones`}`);
      }
    }
    for (const v of VALIDOS_T) if (contextoT({ [campo]: v }).because.some((f) => f.endsWith(COLA_T))) fallos.push(`${campo}=${v} válido → rechazado`);
  }
  const noObjeto = contextoT('x');
  /* Los requisitos van antes, como siempre: con los dos rotos se dice lo de los requisitos, y solo eso. */
  const ambos = contextoT({ maxEvidence: NaN }, { minConfidence: NaN });
  check(`${numero()} · S2-C · A8 suelto con los ${TOPES_T.length} topes mal formados: no se admite nada y se dice por qué —la forma de su \`minConfidence\` roto (B.1)—; con topes válidos, lo de siempre`,
    control.admisiones.length > 0 && igual(contextoT({ maxEvidence: A.TOPES_POR_DEFECTO.maxEvidence }).admisiones, control.admisiones) && fallos.length === 0
    && noObjeto.admisiones.length === 0 && noObjeto.because.includes(`budget: no es un objeto de presupuesto (string). ${COLA_T}`)
    && ambos.admisiones.length === 0 && ambos.because.some((f) => f.startsWith('requirements.minConfidence: ')) && !ambos.because.some((f) => f.endsWith(COLA_T)),
    fallos.slice(0, 3).join(' | '));
}
{
  /* UNA regla por todas las puertas: el mismo campo con el mismo motivo en el ciclo (lo dice A1) y en cada motor suelto. */
  const fallos = [];
  for (const campo of TOPES_T) {
    for (const v of ['x', NaN, -1]) {
      const esperado = `budget.${campo}: ${motivoT(v)}`;
      const rc = ciclo.decidir(peticion({ decision: decisionBase({ budget: { [campo]: v } }) }));
      const dichos = {
        a3: [a3B1.proponer(FORMAS_B1, SENALES, undefined, { [campo]: v }).rechazadas[0]?.detail],
        a4: [...a4T.variantes(TAREA, SENALES, undefined, { [campo]: v }).analisis.problemas],
        a5: [optimizarT({ [campo]: v }).rejected[0]?.why?.detail?.replace('constraint_conflict · ', '')],
        a8: contextoT({ [campo]: v }).because.filter((f) => f.endsWith(COLA_T)).map((f) => f.slice(0, -(COLA_T.length + 2))),
      };
      const malos = Object.entries(dichos).filter(([, d]) => !igual(d, [esperado])).map(([k, d]) => `${k}:${JSON.stringify(d)}`);
      if (malos.length || !paradaB1(rc, [esperado])) fallos.push(`${campo}=${String(v)} · ${malos.join(' ') || `ciclo ${rc.status}/${rc.parada}`}`);
    }
  }
  for (const [campo, rango] of Object.entries(A.RANGO_DE_RESTRICCION)) {
    const esperado = `constraints.${campo}: ${A.motivoDeNumeroInvalido(rango, 'x')}`;
    const rc = ciclo.decidir(peticion({ decision: decisionBase({ constraints: ponerT(campo, 'x') }) }));
    const dichos = [a3B1.proponer(FORMAS_B1, SENALES, ponerT(campo, 'x')).rechazadas[0]?.detail,
      ...a4T.variantes(TAREA, SENALES, ponerT(campo, 'x')).analisis.problemas,
      optimizarT(undefined, ponerT(campo, 'x')).rejected[0]?.why?.detail?.replace('constraint_conflict · ', '')];
    if (!paradaB1(rc, [esperado]) || !dichos.every((d) => d === esperado) || dichos.length !== 3) fallos.push(`${campo} · ${JSON.stringify(dichos)}`);
  }
  check(`${numero()} · S2-C · UNA regla por todas las puertas: con un tope de pensar o una restricción rotos, el ciclo —que se para en 0b y lo dice A1— y A3, A4, A5 y A8 sueltos nombran el MISMO campo con el MISMO motivo`,
    fallos.length === 0, fallos.slice(0, 3).join(' | ') || `${TOPES_T.length * 3} topes · ${Object.keys(A.RANGO_DE_RESTRICCION).length} restricciones`);
}

/*
 * PARTE 2 · LO QUE NO SE ENDURECÍA. A2, A6 y A7 también leían lo mal formado a su manera, y rechazarlo exigía algo que
 * S2-C no podía decidir: un motivo nuevo en una unión cerrada (contrato) o un veredicto. S2-C.1 lo decidió (ALC): A2
 * lo dice con `invalid_constraint`, A6 con `inconclusive` y A7 con su política por defecto y su suelo. Estas tres
 * comprobaciones fijaban lo que hacían; desde S2-C.1 fijan lo decidido.
 */
{
  const a2T = A.crearMotorDeDescomposicion();
  const baseA2 = a2T.descomponer(TAREA);
  /* Rechazada con la regla de B.1: un solo problema, de la tarea entera, con la ruta y el motivo; ni opciones ni rechazadas. */
  const rechazada = (r, detail) => r.opciones.length === 0 && r.rechazadas.length === 0 && r.signals.length === 0
    && igual(r.problemas, [{ ref: '*', reason: 'invalid_constraint', detail }]);
  const fallos = [];
  for (const campo of ['maxSteps', 'maxParallel']) {
    for (const v of [NaN, Infinity, -Infinity, 'x', null, -1, 0]) {
      if (!rechazada(a2T.descomponer(TAREA, { [campo]: v }), `constraints.${campo}: ${A.motivoDeNumeroInvalido('positivo', v)}`)) fallos.push(`${campo}=${String(v)}`);
    }
  }
  for (const [campo, rango] of Object.entries(A.RANGO_DE_RESTRICCION).filter(([c]) => c !== 'maxSteps' && c !== 'maxParallel')) {
    for (const v of rotosDeRangoT(rango)) {
      if (!rechazada(a2T.descomponer(TAREA, ponerT(campo, v)), `constraints.${campo}: ${A.motivoDeNumeroInvalido(rango, v)}`)) fallos.push(`${campo}=${String(v)}`);
    }
  }
  for (const campo of TOPES_T) for (const v of ROTOS_T) {
    if (!rechazada(a2T.descomponer(TAREA, undefined, { [campo]: v }), `budget.${campo}: ${motivoT(v)}`)) fallos.push(`tope ${campo}=${String(v)}`);
  }
  /* Lo válido, como siempre: lo que cabe deja las mismas disposiciones, y lo que no, fuera con su motivo de siempre. */
  const validos = igual(a2T.descomponer(TAREA, { maxSteps: 100, maxParallel: 8 }, { maxDepth: 6 }).opciones, baseA2.opciones)
    && a2T.descomponer(TAREA, { maxSteps: 1 }).rechazadas.every((x) => x.reason === 'max_steps_exceeded');
  /* Detrás de los del grafo: con un ciclo y un tope roto se dicen las dos cosas, el grafo primero. */
  const conCiclo = a2T.descomponer({ id: 'C', steps: [paso('a', ['b']), paso('b', ['a'])] }, { maxSteps: NaN });
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (ALC) · A2 suelto con lo mal formado: \`invalid_constraint\` en \`problemas\` —\`'*'\`, con la ruta y el motivo de B.1 en \`detail\`, detrás de los del grafo—, sin opciones ni rechazadas, para \`maxSteps\` y \`maxParallel\` (NaN, ±∞, texto, null, -1 y 0), el resto de campos y los nueve topes de pensar; lo válido, como siempre`,
    igual(baseA2.opciones.map((o) => o.value.heuristica), ['por-niveles', 'secuencial']) && fallos.length === 0 && validos
    && conCiclo.problemas.length > 1 && conCiclo.problemas[0].reason !== 'invalid_constraint'
    && igual(conCiclo.problemas.at(-1), { ref: '*', reason: 'invalid_constraint', detail: 'constraints.maxSteps: no es un número finito (NaN)' }),
    fallos.slice(0, 3).join(' | ') || `${conCiclo.problemas.map((p) => p.reason).join(',')}`);
}
{
  const a6T = A.crearMotorDeVerificacion();
  const evT = (key, subject, value) => ({ claim: key, supports: true, signal: { key, subject, value, source: 'measured' } });
  const MEDIDAS_T = [evT('result.latencyMs', 'R', 620), evT('result.costUsd', 'R', 0.05), evT('result.quality', 'R', 0.7)];
  const BIEN_T = { id: 'R', status: 'succeeded', outputs: [] };
  const verificarT = (constraints, evidence = MEDIDAS_T, budget, actual = { id: 'R', outputs: [] }) => a6T.verificar({ expected: [], actual, constraints, evidence,
    ...(budget !== undefined ? { budget } : {}) });
  const hallazgoT = (constraints, id, evidence) => verificarT(constraints, evidence).findings.find((f) => f.checkId === `constraint:${id}`);
  /* Con 620 ms, 0,05 $ y calidad 0,7 medidos, y el resultado bien terminado: cada valor mal formado —según B.1— en cada tope que A6 comprueba. */
  const MATRIZ = [
    ['maxLatencyMs', [NaN, Infinity, -Infinity, -1, 0, 'x', null]],
    ['budget.maxUsd', [NaN, Infinity, -Infinity, -1, 'x', null]],
    ['quality.minScore', [NaN, Infinity, -Infinity, -1, 1.5, 'x', null]],
  ];
  const fallos = [];
  for (const [campo, casos] of MATRIZ) {
    for (const v of casos) {
      const motivo = A.motivoDeNumeroInvalido(A.RANGO_DE_RESTRICCION[campo], v);
      if (!motivo) fallos.push(`${campo}=${String(v)} no es mal formado`);
      const r = verificarT(ponerT(campo, v), MEDIDAS_T, undefined, BIEN_T);
      const f = r.findings.find((x) => x.checkId === `constraint:${campo}`);
      if (!(f?.status === 'inconclusive' && f.hard === true && f.because === `el tope ${campo} está mal formado (${motivo}): no se puede concluir si cumple`
        && r.status === 'inconclusive' && r.passed === false)) fallos.push(`${campo}=${String(v)} → ${f?.status}/${r.status}`);
    }
  }
  /* Un contenedor que no es un objeto deja sin leer su tope; unas restricciones que no lo son, todos. */
  const contenedor = verificarT({ budget: 'x' }, MEDIDAS_T, undefined, BIEN_T).findings.find((x) => x.checkId === 'constraint:budget.maxUsd');
  const ilegibles = verificarT('x', MEDIDAS_T, undefined, BIEN_T);
  /* Un fallo AFIRMADO no lo tapa un tope roto: si terminó cancelado, `fail`. */
  const conFallo = verificarT({ maxLatencyMs: NaN }, MEDIDAS_T, undefined, { id: 'R', status: 'cancelled', outputs: [] });
  /* Lo válido, como siempre: cabe, no cabe, el dinero a 0, la calidad a 0 y sin medida. */
  const validos = [hallazgoT({ maxLatencyMs: 1000 }, 'maxLatencyMs'), hallazgoT({ maxLatencyMs: 500 }, 'maxLatencyMs'), hallazgoT({ budget: { maxUsd: 0 } }, 'budget.maxUsd'),
    hallazgoT({ quality: { minScore: 0 } }, 'quality.minScore'), hallazgoT({ maxLatencyMs: 1000 }, 'maxLatencyMs', [])].map((f) => f?.status);
  /* Los topes de pensar rotos: no se verifica con ellos —una sola comprobación, `inconclusive`— y la autoridad, igual. */
  const conImplementacion = { id: 'R', status: 'succeeded', outputs: [], metadata: { providerId: 'x' } };
  const topesMal = TOPES_T.filter((c) => !ROTOS_T.every((v) => {
    const r = verificarT({ maxLatencyMs: 1000 }, MEDIDAS_T, { [c]: v }, BIEN_T);
    const a = verificarT({ maxLatencyMs: 1000 }, MEDIDAS_T, { [c]: v }, conImplementacion);
    return r.status === 'inconclusive' && r.passed === false && igual(r.findings.map((f) => `${f.checkId}:${f.status}`), ['budget:limites:inconclusive'])
      && r.findings[0].because === `los topes de pensar están mal formados (budget.${c}: ${motivoT(v)}): no se verificó con ellos`
      && a.status === 'fail' && a.findings.some((f) => f.checkId === 'authority:implementacion' && f.status === 'fail');
  }));
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (ALC) · A6 con un tope mal formado —NaN, ±∞, 0 o un negativo en un techo, fuera de 0–1 en la calidad, un texto o null, o un contenedor o unas restricciones que no son un objeto—: su comprobación es \`inconclusive\` —ni \`fail\`, ni \`pass\`, ni \`unknown\`— y el veredicto también, salvo que otra comprobación afirme un fallo; con los topes de pensar rotos no se verifica con ellos —\`inconclusive\`— y la autoridad se comprueba igual; lo válido, como siempre`,
    fallos.length === 0 && contenedor?.status === 'inconclusive'
    && contenedor.because === 'el tope budget.maxUsd está mal formado (budget: no es un objeto (string)): no se puede concluir si cumple'
    && ilegibles.status === 'inconclusive' && igual(ilegibles.findings.filter((f) => f.type === 'constraint.limit').map((f) => f.checkId), ['constraint:constraints'])
    && conFallo.status === 'fail' && conFallo.findings.find((f) => f.checkId === 'constraint:maxLatencyMs')?.status === 'inconclusive'
    && igual(validos, ['pass', 'fail', 'fail', 'pass', 'unknown']) && topesMal.length === 0,
    fallos.slice(0, 3).join(' | ') || `${validos.join(',')} · topes que no se comportan: ${topesMal.join(',') || 'ninguno'}`);
}
{
  /*
   * A7: lo mal formado es como no declararlo —rige en ese campo la política por defecto, y después su suelo—, con el
   * rango de B.1 de cada número. Nada afloja: un negativo ya no baja al suelo ni una fracción fuera de 0–1 se recorta
   * al extremo. Lo válido, como siempre, con el suelo incluido. Sus topes de pensar rotos: los suyos por defecto,
   * como antes. Sin un motivo nuevo de rechazo: `MotivoDeRechazo` sigue siendo del reloj.
   */
  const P = A.politicaEfectiva();
  const pol = A.politicaEfectiva;
  const RANGOS_A7 = { minSampleSize: 'noNegativo', minConfidence: 'fraccion', vidaMs: 'positivo', ventanaMs: 'positivo', minFreshness: 'fraccion',
    minStability: 'fraccion', maxContradiction: 'fraccion', maxMagnitude: 'noNegativo' };
  const fallos = [];
  for (const [campo, rango] of Object.entries(RANGOS_A7)) {
    for (const v of [...rotosDeRangoT(rango), true, {}, []]) {
      const p = pol({ [campo]: v });
      if (!igual(p, P)) fallos.push(`${campo}=${String(v)} → ${p[campo]} (defecto ${P[campo]})`);
    }
  }
  /* Lo válido, como siempre: el suelo manda sobre lo declarado más flojo, lo más estricto se respeta, y una política que no es un objeto es la de por defecto. */
  const validos = pol({ minSampleSize: 1 }).minSampleSize === A.POLITICA_MINIMA.minSampleSize && pol({ minConfidence: 0 }).minConfidence === A.POLITICA_MINIMA.minConfidence
    && pol({ minSampleSize: 50 }).minSampleSize === 50 && pol({ minFreshness: 0 }).minFreshness === 0 && pol({ maxContradiction: 1 }).maxContradiction === 1
    && pol({ vidaMs: 0.5 }).vidaMs === 1 && pol({ ventanaMs: 5 }).ventanaMs === 5 && igual(pol('x'), P) && P.ventanaMs === A.POLITICA_POR_DEFECTO.vidaMs;
  const aprenderT = (budget) => a7.aprender({ ahora: T1, policy: POL, outcomes: resultadosAB, ...(budget !== undefined ? { budget } : {}) });
  const base7 = aprenderT(undefined);
  const topesQueCambian = TOPES_T.filter((c) => !ROTOS_T.every((v) => { const r = aprenderT({ [c]: v }); return igual(r, base7) && r.rechazo === undefined; }));
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (ALC) · A7 con lo mal formado: rige en ese campo la política por defecto y después su suelo —con el rango de B.1 de cada número—, sin aflojar nada (un negativo ya no baja al suelo ni una fracción fuera de 0–1 se recorta al extremo); lo válido, como siempre, con el suelo incluido; sus topes de pensar rotos, los suyos por defecto; y sin motivo nuevo de rechazo`,
    fallos.length === 0 && validos && base7.aggregates.length > 0 && base7.rechazo === undefined && topesQueCambian.length === 0,
    fallos.slice(0, 3).join(' | ') || `topes que cambian: ${topesQueCambian.join(',') || 'ninguno'}`);
}

/* PARTE 3 · LOS HUECOS DE PRUEBAS DE LA AUDITORÍA, fijando lo que hay. */
{
  /* A6 elige la medida por CLAVE; con dos sujetos en la misma clave, ¿cuál? */
  const a6S = A.crearMotorDeVerificacion();
  const evS = (subject, value) => ({ claim: 'latencia', supports: true,
    signal: { key: 'result.latencyMs', ...(subject !== undefined ? { subject } : {}), value, source: 'measured' } });
  const medidaS = (evidence) => {
    const f = a6S.verificar({ expected: [], actual: { id: 'job-z', outputs: [] }, constraints: { maxLatencyMs: 1000 }, evidence })
      .findings.find((x) => x.checkId === 'constraint:maxLatencyMs');
    return `${f?.status}·${f?.value}`;
  };
  /*
   * (S2-C.1 · D3, decidida) El resultado se identifica por `subject === actual.id`: A6 comprueba sus topes solo con lo
   * medido de ese sujeto. Hasta 1.11 tomaba la primera medida por clave —la del sujeto que iba antes por orden
   * alfabético—: «alpha» suspendía a «job-z», y al revés daba un falso `pass`.
   */
  const CASOS = [
    /* el paso «alpha» ya no suspende al resultado «job-z»: se mira lo de «job-z» */
    [[evS('job-z', 620), evS('alpha', 5000)], 'pass·620'],
    /* barajadas, lo mismo: no decide la llegada ni el orden de los sujetos */
    [[evS('alpha', 5000), evS('job-z', 620)], 'pass·620'],
    [[evS('job-z', 620), evS('zeta', 5000)], 'pass·620'],
    /* el falso aprobado, corregido: el resultado no cumple y suspende con SU medida */
    [[evS('job-z', 5000), evS('alpha', 620)], 'fail·5000'],
    /* solo la de un paso, o una `result.*` sin sujeto: no son del resultado —no se midió— */
    [[evS('alpha', 620)], 'unknown·undefined'],
    [[evS(undefined, 620)], 'unknown·undefined'],
  ];
  const vistos = CASOS.map(([ev]) => medidaS(ev));
  /* Y en A7: el resultado «job-z» con su latencia y la de su paso «alpha» aprende solo la suya; otro resultado, ninguna de las dos. */
  const DOS = [{ key: 'result.latencyMs', subject: 'job-z', value: 620, source: 'measured' }, { key: 'result.latencyMs', subject: 'alpha', value: 5000, source: 'measured' }];
  const aprenderS = (id) => a7.aprender({ ahora: T1, outcomes: [{ id, kind: 'success', at: T1 - HORA, scope: { capability: CAP }, signals: DOS }] })
    .aggregates.filter((a) => a.metric === 'result.latencyMs');
  const suyo = aprenderS('job-z');
  const ajeno = aprenderS('o-sujetos');
  /* Y el ciclo: `cerrar` les pasa a A6 y a A7 solo lo del resultado —ni lo del paso «alpha» ni una latencia sin sujeto—. */
  const obsS = observar(7, 'success', T1 + HORA);
  const cS = ciclo.cerrar(R, { ...obsS, signals: [...obsS.signals, { key: 'result.latencyMs', subject: 'alpha', value: 5000, source: 'measured', at: T1 + HORA },
    { key: 'result.latencyMs', value: 9000, source: 'measured', at: T1 + HORA }] }, { ahora: T1 + HORA, policy: POL });
  const latS = cS.learning?.aggregates.find((a) => a.metric === 'result.latencyMs');
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (D3) · el sujeto: A6 comprueba los topes del resultado solo con lo medido de \`subject === actual.id\` —ni la llegada ni el orden alfabético deciden, y el falso \`pass\` desaparece—; la de un paso o una \`result.*\` sin sujeto no se le atribuyen (\`unknown\`); A7 no suma lo de otro sujeto; y \`cerrar\` les pasa a A6 y a A7 solo lo del resultado`,
    igual(vistos, CASOS.map(([, e]) => e)) && suyo.length === 1 && suyo[0].n === 1 && suyo[0].suma === 620 && !('subject' in suyo[0].scope) && ajeno.length === 0
    && igual(cS.outcome.signals.map((s) => `${s.subject}:${s.value}`), ['ejec_7:1000']) && latS?.n === 1 && latS.suma === 1000
    && cS.verification.evidence.some((e) => e.signal?.subject === 'ejec_7')
    && cS.verification.evidence.every((e) => e.signal?.subject === 'ejec_7' || e.signal?.key === 'quality.sintetica'),
    `${vistos.join(' | ')} · A7 ${suyo.map((a) => `n${a.n} suma ${a.suma}`).join(',')} · ajeno ${ajeno.length} · cerrar ${latS?.n}/${latS?.suma}`);
}
{
  const a6L = A.crearMotorDeVerificacion();
  const verL = (max, evidence) => a6L.verificar({ expected: [], actual: { id: 'R', outputs: [] }, constraints: { maxLatencyMs: max }, evidence })
    .findings.find((f) => f.checkId === 'constraint:maxLatencyMs');
  const lat = (v) => [{ claim: 'latencia', supports: true, signal: { key: 'result.latencyMs', subject: 'R', value: v, source: 'measured' } }];
  const vistos = [verL(1000, lat(620)), verL(500, lat(620)), verL(620, lat(620)), verL(1000, [])];
  check(`${numero()} · S2-C · A6 con \`maxLatencyMs\`, FIJADO: es un CRITERIO sobre lo medido —aprueba si cabe, también en el borde; suspende si no; \`unknown\` sin \`result.latencyMs\`—, una comprobación dura y estructural que no lee ningún reloj. Si además es plazo, aborto o reembolso es D9 (BLOCKED — HUMAN DECISION)`,
    igual(vistos.map((f) => f?.status), ['pass', 'fail', 'pass', 'unknown']) && vistos[3].because === 'no se midió result.latencyMs'
    && vistos.every((f) => f.hard === true && f.type === 'constraint.limit' && f.by === 'structural'),
    vistos.map((f) => f?.status).join(','));
}
{
  const sinLat = [opcion('a', { quality: 0.9 }), opcion('b', { quality: 0.8, latency: 500 })];
  const pedirLat = (motor) => motor.decidir(contexto({ objective: { weights: { quality: 1 } }, options: sinLat, constraints: { maxLatencyMs: 1000 } }));
  const d1 = pedirLat(a1);
  const d1admit = pedirLat(A.crearMotorDeDecision({ datoAusente: 'admit' }));
  const e3sin = a3B1.proponer(FORMAS_B1, [], { maxLatencyMs: 1 });
  const e3con = a3B1.proponer(FORMAS_B1, SENALES, { maxLatencyMs: 1 });
  const estr = a3B1.proponer(FORMAS_B1, []).estrategias;
  const o5 = a5.optimizar({ candidates: estr, objective: { weights: { latency: 1 } }, constraints: { maxLatencyMs: 1 }, evidence: [] });
  const o5x = a5.optimizar({ candidates: [opcion('x', { quality: 0.9 })], objective: { weights: { quality: 1 } }, constraints: { maxLatencyMs: 1000 }, evidence: [] });
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (D1 = mantener, D9 = criterio) · SIN DATO de latencia, \`maxLatencyMs\` se lee distinto, FIJADO como está: A1 deja fuera la alternativa (\`unverifiable:maxLatencyMs\`, o la admite con \`datoAusente: 'admit'\`), A3 y A5 dejan PASAR las estrategias y A5 deja fuera lo que no es estrategia; con el dato medido, A3 las poda. Así se queda: D1 mantiene «no medido» y D9 deja \`maxLatencyMs\` como criterio`,
    candidata(d1, 'a')?.reason === 'unverifiable:maxLatencyMs' && elegidaDe(d1) === 'b' && d1.warnings.includes('constraint_unverifiable')
    && elegidaDe(d1admit) === 'a'
    && e3sin.estrategias.length === FORMAS_B1.length && e3sin.rechazadas.length === 0
    && e3con.estrategias.length === 0 && e3con.rechazadas.length === FORMAS_B1.length && e3con.rechazadas.every((x) => x.reason === 'constraint:maxLatencyMs')
    && estr.length > 0 && o5.feasible.length === estr.length && o5.rejected.length === 0
    && o5x.feasible.length === 0 && igual(o5x.rejected.map((x) => x.why), [{ reason: 'unverifiable', detail: 'maxLatencyMs' }]),
    `A1 ${candidata(d1, 'a')?.reason} · A3 ${e3sin.estrategias.length}/${e3con.estrategias.length} · A5 ${o5.feasible.length}/${o5x.feasible.length}`);
}
{
  /* Estrategias que A3 construyó SIN restricciones: lo que quede fuera, lo deja fuera A1. */
  const estr = a3B1.proponer(FORMAS_B1, []).estrategias;
  const anchos = Object.fromEntries(estr.map((e) => [e.id, Math.max(0, ...(e.value.parallelGroups ?? []).map((g) => g.steps.length))]));
  const conMP = (mp) => a1.decidir(contexto({ objective: { weights: { latency: 1, reliability: 1 } }, options: estr, constraints: { maxParallel: mp } }));
  const [uno, dos] = [conMP(1), conMP(2)];
  const niveles = candidata(uno, 'T:por-niveles:estrategia');
  check(`${numero()} · S2-C · A1 poda POR SÍ MISMA con \`maxParallel\`, FIJADO: con las estrategias que A3 construyó sin restricciones, la de un grupo de 2 queda fuera con 1 (\`constraint:maxParallel\`) y dentro con 2; la secuencial, dentro siempre`,
    igual(anchos, { 'T:secuencial:estrategia': 0, 'T:por-niveles:estrategia': 2 })
    && niveles?.eligible === false && niveles.reason === 'constraint:maxParallel' && elegidaDe(uno) === 'T:secuencial:estrategia'
    && dos.candidates.length === 2 && dos.candidates.every((c) => c.eligible) && elegidaDe(dos) === 'T:por-niveles:estrategia',
    `${niveles?.reason} · ${elegidaDe(uno)} · ${elegidaDe(dos)}`);
}
{
  const opts = [opcion('a', { quality: 0.8 }), opcion('b', { quality: 0.6, cost: 5 })];
  const d = a1.decidir(contexto({ options: opts }));
  const barajada = a1.decidir(contexto({ options: [...opts].reverse() }));
  const [sa, sb] = [candidata(d, 'a')?.score, candidata(d, 'b')?.score];
  check(`${numero()} · S2-C · el desempate por COBERTURA, aislado y FIJADO: «a» (solo calidad 0.8) y «b» (calidad 0.6 y coste) empatan a 0.800 en el objetivo, ninguna tiene evidencia, y gana «b» por cubrir más —1.00 frente a 0.50—; barajadas, lo mismo. Es el orden de siempre —objetivo, confianza, cobertura, id—, y D1 (S2-C.1) lo mantiene`,
    elegidaDe(d) === 'b' && candidata(d, 'a')?.reason === 'lower_score' && casi(sa?.total, 0.8) && casi(sb?.total, 0.8)
    && sa?.coverage === 0.5 && sb?.coverage === 1 && d.confidence?.value === 0
    && d.explanation.includes('Por delante de «a» (0.800) por coverage.') && igual(barajada, d),
    `${elegidaDe(d)} · ${sa?.total}/${sa?.coverage} frente a ${sb?.total}/${sb?.coverage}`);
}
/* D11, los cinco estados de hoy —los de la sonda de la auditoría—, a mano para la siguiente también. */
const optD11 = (id, values) => ({ id, value: id, values });
const W_D11 = { weights: { quality: 1, cost: 1 } };
const TRES_D11 = [optD11('a', { quality: 0.9, cost: 2 }), optD11('b', { quality: 0.8, cost: 1 }), optD11('c', { quality: 0.7, cost: 1 })];
const evD11 = (ids) => ids.map((id) => ({ key: 'option.quality', subject: id, value: 0.9, source: 'measured', sampleSize: 20 }));
const D11 = {
  A: a1.decidir(contexto({ objective: { weights: { cost: 1, latency: 1 } }, options: [optD11('a', { cost: 3, latency: 900 })] })),
  B: a1.decidir(contexto({ objective: W_D11, constraints: { maxRisk: 0.3 }, options: [optD11('a', { quality: 0.9, cost: 2, reliability: 0.95 }),
    optD11('b', { quality: 0.9, cost: 1, reliability: 0.5 }), optD11('c', { quality: 0.5, cost: 1, reliability: 0.6 })] })),
  C: a1.decidir(contexto({ objective: W_D11, constraints: { minConfidence: 0.3 }, signals: evD11(['a']), options: TRES_D11 })),
  D: a1.decidir(contexto({ objective: W_D11, constraints: { minConfidence: 0.3 }, budget: { maxEvidence: 1 }, signals: evD11(['a', 'b', 'c']), options: TRES_D11 })),
  E: a1.decidir(contexto({ objective: W_D11, budget: { maxCandidates: 1 }, options: TRES_D11 })),
};
{
  const ids = (d) => d.candidates.map((c) => `${c.id}:${c.reason}`);
  /*
   * (S2-C.1 · D11, decidida: A–E son «sin elección real», con un CAMPO que distingue los cinco.) Lo que S2-C fijó
   * —candidatas, avisos, puntuación— sigue igual, y la confianza, la de 9544b7f: la marca no toca la selección, la
   * puntuación ni la confianza. Lo nuevo es `noRealChoice.causes`, en el orden en que se filtra; y D lleva además
   * `evidence_capped` (V).
   */
  const esperado = {
    A: [['a:selected'], ['low_confidence', 'experimental_algorithm'], 1, 0, ['single_option']],
    B: [['a:selected', 'b:constraint:maxRisk', 'c:constraint:maxRisk'], ['low_confidence', 'experimental_algorithm'], 0.95, 0, ['constraints']],
    C: [['a:selected', 'b:constraint:minConfidence', 'c:constraint:minConfidence'], ['experimental_algorithm'], 0.45, 1, ['min_confidence']],
    D: [['a:selected', 'b:constraint:minConfidence', 'c:constraint:minConfidence'], ['budget_exhausted', 'evidence_capped', 'experimental_algorithm'], 0.45, 1, ['evidence_capped', 'min_confidence']],
    E: [['a:selected'], ['candidates_capped', 'budget_exhausted', 'low_confidence', 'experimental_algorithm'], 0.95, 0, ['candidates_capped']],
  };
  const malos = Object.entries(esperado).filter(([k, [cands, avisos, total, confianza, causas]]) => {
    const d = D11[k];
    return !(d.status === 'decided' && d.selected === 'a' && igual(ids(d), cands) && igual(d.warnings, avisos) && casi(d.selectedScore?.total, total)
      && casi(d.confidence?.value, confianza) && igual(d.noRealChoice?.causes, causas) && Object.isFrozen(d.noRealChoice) && Object.isFrozen(d.noRealChoice?.causes));
  }).map(([k]) => `${k}: ${ids(D11[k]).join(',')} · ${D11[k].warnings.join(',')} · ${D11[k].selectedScore?.total} · ${D11[k].confidence?.value} · ${(D11[k].noRealChoice?.causes ?? []).join('+')}`);
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (D11) · «sin elección real», los cinco estados con su causa en \`noRealChoice\`: A \`single_option\`, B \`constraints\`, C \`min_confidence\`, D \`evidence_capped\` y \`min_confidence\`, y E \`candidates_capped\` —donde las otras dos siguen sin aparecer en \`candidates\` ni en la explicación: la causa dice por qué—; la elección, la puntuación y la confianza, las de antes`,
    malos.length === 0 && D11.B.explanation.includes('Cumple las restricciones; 2 opción(es) quedaron fuera por no cumplirlas.')
    && !!fraseR(D11.D) && !fraseR(D11.C) && !D11.E.explanation.some((f) => /«[bc]»/.test(f)) && D11.E.candidates.length === 1,
    malos.join(' ‖ '));
}
{
  const cicloT = A.crearCicloAlgoritmico();
  const pasoT = (id, capability, dep) => ({ id, capability, purpose: `p-${id}`, ...(dep ? { dependsOn: dep } : {}) });
  const pasosT = [pasoT('s0', 'text.generate'), pasoT('s1', 'image.generate', ['s0']), pasoT('s2', 'text.generate', ['s1'])];
  const pedirT = (extra, componer) => cicloT.decidir({
    decision: { contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA, objective: OBJ_CICLO, budget: { maxCandidates: 0 }, ...extra },
    ...(extra.options ? {} : { tarea: { id: 'T', steps: pasosT } }), ...(componer ? { componer } : {}),
  });
  const suelto = a1.decidir(contexto({ objective: { weights: { quality: 1 } }, budget: { maxCandidates: 0 }, options: [opcion('a', { quality: 0.9 }), opcion('b', { quality: 0.8 })] }));
  const porOpciones = pedirT({ options: [opcion('a', { latency: 1 }), opcion('b', { latency: 2 })] });
  const simple = pedirT({});
  const compuesto = pedirT({}, { paralelizar: true, optimizar: true });
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (V, representación común) · \`maxCandidates: 0\`: el ciclo lo nombra igual por las tres vías —parada \`budget_exceeded\` por opciones y con tarea, simple o compuesta—; A1 sigue diciendo lo que ve —\`budget_exceeded\` si le llegan alternativas, \`insufficient_evidence\` si la composición se vació antes— y el porqué (B.5) nombra \`optionLimitReached\` de A2 o \`budgetExhausted\` de A4`,
    suelto.status === 'undecided' && suelto.failure === 'budget_exceeded' && igual(suelto.warnings, ['candidates_capped', 'budget_exhausted'])
    && suelto.explanation[0].startsWith('Llegaron 2 alternativa(s), pero el presupuesto de pensar se agotó (maxCandidates 0) antes de evaluar ninguna')
    && porOpciones.status === 'undecided' && porOpciones.parada === 'budget_exceeded' && porOpciones.decision?.failure === 'budget_exceeded'
    && simple.status === 'undecided' && simple.parada === 'budget_exceeded' && simple.decision?.failure === 'insufficient_evidence' && simple.because[0].endsWith('(`optionLimitReached`).')
    && compuesto.status === 'undecided' && compuesto.parada === 'budget_exceeded' && compuesto.decision?.failure === 'insufficient_evidence' && compuesto.because[0].endsWith('(`budgetExhausted`).'),
    `paradas ${porOpciones.parada} · ${simple.parada} · ${compuesto.parada} · A1 ${suelto.failure} · ${porOpciones.decision?.failure} · ${simple.decision?.failure} · ${compuesto.decision?.failure}`);
}
{
  const porContador = a1.decidir(contexto({ objective: { weights: { quality: 1 } }, options: [opcion('a', { quality: 0.9 }), opcion('b', { quality: 0.8 })], budget: { maxIterations: 1 } }));
  const tres = [D11.E, D11.D, porContador];
  const soloSuyo = (d, suyo) => ['candidates_capped', 'evidence_capped', 'counter_exhausted'].every((w) => d.warnings.includes(w) === (w === suyo));
  check(`${numero()} · S2-C · DECIDIDO en S2-C.1 (V, \`evidence_capped\`) · \`budget_exhausted\` se separa en tres avisos propios: candidatas acotadas (\`candidates_capped\`), evidencia acotada (\`evidence_capped\`, con su frase y \`spend.evidence\`) y un contador pasado (\`counter_exhausted\`: \`maxIterations: 1\` decide igual, con \`spend.iterations\` 2 y sin nombrarlo en la explicación); \`budget_exhausted\` sigue como aviso general y cada caso lleva SOLO el suyo`,
    tres.every((d) => d.status === 'decided' && d.warnings.includes('budget_exhausted'))
    && soloSuyo(D11.E, 'candidates_capped') && soloSuyo(D11.D, 'evidence_capped') && soloSuyo(porContador, 'counter_exhausted')
    && !!fraseR(D11.D) && !fraseR(D11.E) && !fraseR(porContador) && D11.D.spend.evidence === 1
    && porContador.spend.iterations === 2 && !porContador.explanation.some((f) => /iteraci|maxIterations/.test(f)),
    tres.map((d) => d.warnings.join('+')).join(' ‖ '));
}
{
  const opts = [opcion('a', { quality: 0.9 }), opcion('b', { quality: 0.8 })];
  const sin = a1.decidir(contexto({ objective: { weights: { quality: 1 } }, options: opts }));
  const con = a1.decidir(contexto({ objective: { weights: { quality: 1 } }, options: opts, budget: { maxReplans: 0 } }));
  const cSin = ciclo.decidir(peticion());
  const cCon = ciclo.decidir(peticion({ decision: decisionBase({ budget: { maxReplans: 0 } }) }));
  check(`${numero()} · S2-C · \`maxReplans\` no tiene consumidor, FIJADO: con 0 —el tope más estricto— A1 y el ciclo deciden EXACTAMENTE igual y \`spend.replans\` sigue en 0. Se valida (B.5), pero nadie lo gasta: quién replanifica no está decidido`,
    igual(con, sin) && con.spend.replans === 0 && cSin.status === 'decided' && igual(cCon, cSin),
    `${con.spend.replans} · ${cSin.status}`);
}

/* PARTE 4 · LA EQUIVALENCIA: con entradas VÁLIDAS, A3, A4, A5 y A8 devuelven lo mismo que en e3a9e94. */
{
  const E = await import('./equivalencia-s2c.mjs');
  const H = JSON.parse(fs.readFileSync(path.resolve(here, 'equivalencia-s2c.json'), 'utf8'));
  /*
   * (1.12) Igual SALVO EL SELLO: e3a9e94 decidía con el contrato 1.11 y lo escribía en cada estrategia, en cada
   * resultado de la optimización y en cada selección de A8; el de hoy se escribe como aquel antes de la huella, y el
   * número vigente lo comprueba la 101. Solo se sustituye un texto que es EXACTAMENTE el sello.
   */
  const comoE3a9e94 = (x) => JSON.parse(JSON.stringify(x ?? null, (k, v) => (v === ALGORITHM_CONTRACT_VERSION ? '1.11' : v)));
  const salidas = E.salidasDe(A);
  const hoy = Object.fromEntries(Object.entries(salidas).map(([k, v]) => [k, v.map((x) => E.huella(comoE3a9e94(x)))]));
  const diferencias = [];
  for (const k of ['a3', 'a4', 'a5', 'a8']) {
    if ((H.huellas?.[k] ?? []).length !== hoy[k].length) diferencias.push(`${k}: ${H.huellas?.[k]?.length} ≠ ${hoy[k].length} entradas`);
    hoy[k].forEach((h, i) => { if (h !== H.huellas?.[k]?.[i]) diferencias.push(`${k} #${i}`); });
  }
  /* Que la equivalencia no sea vacía, y que ninguna entrada válida se tome por mal formada. */
  const suma = (xs, f) => xs.reduce((m, x) => m + f(x), 0);
  const cubre = suma(salidas.a4, (p) => p.variantes.length) > 0 && suma(salidas.a3, (r) => r.estrategias.length) > 0
    && suma(salidas.a3, (r) => r.rechazadas.length) > 0 && suma(salidas.a5, (o) => o.feasible.length) > 0 && suma(salidas.a8, (c) => c.admisiones.length) > 0;
  const tomadasPorRotas = [
    ...salidas.a3.flatMap((r) => r.rechazadas).filter((x) => x.reason === 'constraint_conflict'),
    ...salidas.a4.flatMap((p) => p.analisis.problemas).filter((x) => /^(constraints|budget)[.:]/.test(x)),
    ...salidas.a5.flatMap((o) => o.rejected).filter((x) => /constraint_conflict/.test(x.why?.detail ?? '')),
    ...salidas.a8.flatMap((c) => c.because).filter((f) => f.endsWith(COLA_T)),
  ];
  check(`${numero()} · S2-C · EQUIVALENCIA · ${hoy.a3.length + hoy.a4.length + hoy.a5.length + hoy.a8.length} entradas VÁLIDAS —tareas, restricciones y topes al azar con semilla fija, y lo aprendido para A8—: A3, A4, A5 y A8 devuelven lo mismo que en e3a9e94, huella a huella —salvo el sello del contrato, 1.12 desde S2-C.1—, y ninguna se toma por mal formada`,
    H.version === 'e3a9e94' && hoy.a3.length === 30 && hoy.a4.length === 30 && hoy.a5.length === 30 && hoy.a8.length === 12
    && diferencias.length === 0 && cubre && tomadasPorRotas.length === 0,
    diferencias.slice(0, 5).join(' | ') || `A3 ${suma(salidas.a3, (r) => r.estrategias.length)} estrategias · A4 ${suma(salidas.a4, (p) => p.variantes.length)} variantes · A5 ${suma(salidas.a5, (o) => o.feasible.length)} factibles · A8 ${suma(salidas.a8, (c) => c.admisiones.length)} admisiones`);
}
{
  /* La regla es LA de A0, no una copia: la de A3, A4, A5 y A8 desde S2-C, y la de A2, A6 y A7 desde S2-C.1 (ALC). */
  const fuente = (f) => sinComentarios(leer(`functions/src/core/algorithm/${f}`));
  const USA = {
    'strategy-engine.ts': ['problemasDeLosLados(undefined, constraints)', 'problemasDelPresupuesto(limites)'],
    'optimization-engine.ts': ['problemasDeLosLados(undefined, problema.constraints)', 'problemasDelPresupuesto(problema.budget)'],
    'parallelization-engine.ts': ['problemasDeLosLados(undefined, constraints)', 'problemasDelPresupuesto(limites)'],
    'context-engine.ts': ['problemasDelPresupuesto(peticion?.budget)'],
    'decomposition-engine.ts': ['problemasDeLosLados(undefined, constraints)', 'problemasDelPresupuesto(limites)'],
    'verification-engine.ts': ['restriccionesMalFormadas(c)', 'problemasDelPresupuesto(peticion.budget)'],
    'feedback.ts': ['motivoDeNumeroInvalido(RANGO_DE_LA_POLITICA[campo], v)'],
  };
  const faltan = Object.entries(USA).flatMap(([f, xs]) => xs.filter((x) => !fuente(f).includes(x)).map((x) => `${f}: falta ${x}`));
  const copias = Object.keys(USA).filter((f) => /motivoDeNumeroInvalido\(\s*'noNegativo'/.test(fuente(f))).map((f) => `${f}: copia la regla`);
  check(`${numero()} · S2-C · la regla es LA de B.1, no una copia: A3, A4, A5 y A8 —y desde S2-C.1 (ALC) A2, A6 y A7— llaman a las funciones de A0 (\`problemasDeLosLados\`, \`problemasDelPresupuesto\`, \`restriccionesMalFormadas\`, \`motivoDeNumeroInvalido\` con su rango), ni un validador propio`,
    faltan.length === 0 && copias.length === 0,
    [...faltan, ...copias].join(' · '));
}

/*
 * PARTE 5 · RENDIMIENTO EXACTO (bloque C): LO YA RESUELTO SE DEVUELVE TAL CUAL. Si las válidas llegan con claves
 * (clave, sujeto) estrictamente crecientes —lo que devuelve una resolución anterior, lo que A9 pasa a A4, A3 y A5—,
 * cada grupo tiene una sola señal y el orden de las claves es el de llegada: `resolverSenales` las devuelve sin
 * agrupar ni ordenar. Lo mismo que antes, por identidad; y cada señal se lee exactamente lo mismo que en e3a9e94.
 */
{
  const azar = generador(27_09_2026);
  const uno = (xs) => xs[Math.floor(azar() * xs.length)];
  const alAzar = () => ({ key: uno(['a.b', 'a.c', 'option.q', 'step.latencyMs']), value: uno([1, 2, 'z', NaN]),
    source: uno(['measured', 'catalog', 'model', 'nada']), ...(azar() < 0.8 ? { subject: uno(['x', 'y', 'job-z']) } : {}), ...(azar() < 0.4 ? { at: uno([1, 2]) } : {}) });
  const fallos = [];
  for (let k = 0; k < 500; k++) {
    const r = A.resolverSenales(Array.from({ length: 1 + Math.floor(azar() * 30) }, alAzar));
    const otra = A.resolverSenales(r.resueltas);
    if (!(otra.resueltas.length === r.resueltas.length && otra.resueltas.every((x, i) => x === r.resueltas[i]) && otra.conflictos.length === 0)) fallos.push(`#${k}`);
  }
  /* El atajo, SOLO con claves estrictamente crecientes: al revés, con repetidas o con una inválida en medio, lo de siempre. */
  const sn = (key, subject, value, extra = {}) => ({ key, subject, value, source: 'measured', ...extra });
  const [b1, c1, d1] = [sn('a.b', 'x', 1), sn('a.c', 'x', 1), sn('a.d', 'x', 1)];
  const mismas = (r, esperadas) => r.resueltas.length === esperadas.length && r.resueltas.every((x, i) => x === esperadas[i]);
  const enOrden = A.resolverSenales([b1, c1, d1]);
  const alReves = A.resolverSenales([d1, c1, b1]);
  const conInvalida = A.resolverSenales([b1, sn('a.c', 'x', NaN), d1]);
  const repetidas = A.resolverSenales([b1, sn('a.b', 'x', 2, { source: 'catalog' })]);
  /* Las lecturas de cada señal, contadas: la clave y el sujeto, cuatro veces cada uno —las de e3a9e94—, ordenadas o no. */
  const lecturas = (claves) => {
    const cuenta = { key: 0, subject: 0 };
    A.resolverSenales(claves.map(([k, sub]) => {
      const o = { value: 1, source: 'measured' };
      Object.defineProperty(o, 'key', { get() { cuenta.key++; return k; }, enumerable: true });
      Object.defineProperty(o, 'subject', { get() { cuenta.subject++; return sub; }, enumerable: true });
      return o;
    }));
    return [cuenta.key / claves.length, cuenta.subject / claves.length];
  };
  check(`${numero()} · S2-C · bloque C · lo YA resuelto se devuelve tal cual —500 resoluciones al azar vueltas a resolver: las MISMAS señales (===), en el mismo orden y sin conflictos—; el atajo solo con claves (clave, sujeto) estrictamente crecientes —al revés, con repetidas o con una inválida en medio, el camino de siempre—; y cada señal se lee lo mismo que en e3a9e94`,
    fallos.length === 0 && mismas(enOrden, [b1, c1, d1]) && mismas(alReves, [b1, c1, d1]) && mismas(conInvalida, [b1, d1])
    && mismas(repetidas, [b1]) && repetidas.conflictos.length === 1 && repetidas.conflictos[0].descartadas.length === 1
    && igual(lecturas([['a.b', 'x'], ['a.c', 'x'], ['a.d', 'y']]), [4, 4]) && igual(lecturas([['a.d', 'y'], ['a.b', 'x'], ['a.c', 'x']]), [4, 4]),
    fallos.slice(0, 3).join(' | ') || `lecturas ${lecturas([['a.b', 'x'], ['a.c', 'x']]).join('/')}`);
}

/*
 * PARTE 6 · Y EL DOCUMENTO DICE DE S2-C LO QUE HAY: lo endurecido con su forma; lo BLOCKED con la decisión que falta;
 * A6 y el sujeto —prueba sí, corrección no—; `maxLatencyMs` sin convertirse en un reloj; el atajo exacto y lo que sigue
 * sin quitarse; la línea base; lo que NO se decidió —ninguna deuda de la auditoría se da por cerrada—; el rango de
 * esta sección, sacado del contador; la fila de §19 y la nota del punto 7. Sin marcadores pendientes.
 */
{
  const C2 = (() => { const i = S18_PLANO.indexOf('### s2-c'); const j = i < 0 ? -1 : S18_PLANO.indexOf('### ', i + 4); return i >= 0 && j > i ? S18_PLANO.slice(i, j) : ''; })();
  const ENDURECIDAS = [
    ['a3', 'los nueve topes de pensar (las restricciones, desde b.1)'],
    ['a5', 'los nueve topes de pensar (las restricciones, desde b.1)'],
    ['a4', 'las restricciones —los nueve campos de b.1— y los nueve topes'],
    ['a8', 'los nueve topes de pensar'],
  ];
  const BLOQUEADAS = [['a2', 'contrato'], ['a6', 'decisión humana'], ['a7', 'decisión humana']];
  /* Cada fila en SU tabla: las endurecidas antes de «lo que no se endurece», las bloqueadas después y antes de A6 y el sujeto. */
  const tramo = (desde, hasta) => { const i = C2.indexOf(desde); const j = i < 0 ? -1 : C2.indexOf(hasta, i); return i >= 0 && j > i ? C2.slice(i, j) : ''; };
  const tablaEndurecida = tramo('**qué cambia, y solo con entradas mal formadas.**', '**lo que no se endurece');
  const tablaBloqueada = tramo('**lo que no se endurece: blocked — human decision.**', '**a6 y el sujeto (d3)');
  const filaDe = (m) => (tablaBloqueada.match(new RegExp(`\\| ${m} \\|.*?(?=\\| a\\d \\||$)`)) ?? [''])[0];
  const faltanFilas = [
    ...ENDURECIDAS.filter(([m, que]) => !tablaEndurecida.includes(`| ${m} | ${que} |`)).map(([m]) => `endurecida ${m}`),
    ...BLOQUEADAS.filter(([m, porque]) => !filaDe(m).includes(porque)).map(([m]) => `bloqueada ${m}`),
    ...ENDURECIDAS.filter(([m]) => tablaBloqueada.includes(`| ${m} |`)).map(([m]) => `${m} entre las bloqueadas`),
    ...BLOQUEADAS.filter(([m]) => tablaEndurecida.includes(`| ${m} |`)).map(([m]) => `${m} entre las endurecidas`),
  ];
  const rango = `§t (202–${siguiente}, ${siguiente - 201} comprobaciones)`;
  const DEBE_DECIR = [
    'estado: en la rama `s2c-technical-hardening`, desde e3a9e94 y fuera de `main` hasta su revisión',
    'ni el contrato ni los motores suben —1.11, `motor-de-decision@3`, `motor-de-contexto@2`—',
    's2-c no decide ninguna de las deudas de la auditoría (d1, d2b, d3, d4, d8, d9, d10 y d11)',
    '**qué cambia, y solo con entradas mal formadas.**', 'en el ciclo no cambia nada', '«ya no se ignora ni se funde»',
    '**lo que no se endurece: blocked — human decision.**', 'una unión cerrada de doce: contrato', 'corregirlo es elegir un veredicto',
    '`motivoderechazo` es cerrada', '**a6 y el sujeto (d3): prueba sí, corrección no.**', 'no viola ninguna regla aprobada',
    'no se convirtió en plazo, aborto, cancelación ni reembolso', '«blocked — human decision»',
    '**rendimiento: lo ya resuelto se devuelve tal cual (implementado, exacto).**', 'la api no cambia',
    'un parámetro nuevo, y eso es cambiar su api', 'también api', 'y no se trunca', 'y se descartó',
    '**rendimiento, la línea base post-s2-b (bloque d).**', '**lo que no se decidió aquí**', 'que s2-c conste en el historial del contrato',
    'un umbral de rendimiento', rango,
  ];
  const NO_DEBE_DECIR = ['pendiente-', 'contrato 1.12', 'motor-de-decision@4', 'd1 cerrada', 'd3 cerrada', 'd9 cerrada', 'd11 cerrada', 'cerrada en s2-c',
    'se crea `evidence_capped`', 'el umbral aceptable es'];
  const faltan = DEBE_DECIR.filter((f) => !C2.includes(f));
  const sobran = NO_DEBE_DECIR.filter((f) => C2.includes(f));
  /* «### Lo que queda declarado» a secas: hay dos «… y NO construido» antes, en las secciones de A0 y A1. */
  const enSuSitio = posicion('### S2-B.5') < posicion('### S2-C') && posicion('### S2-C') < posicion('\n### Lo que queda declarado\n');
  const fila19 = DOC.includes('| `algorithm-quality.test.mjs` §T (202–222) · `equivalencia-s2c.mjs` · `equivalencia-s2c.json` |');
  const nota7 = septima.includes('después, en s2-c (la fase técnica, arriba)') && septima.includes('quedan blocked — human decision');
  /*
   * (S2-C.1) Lo de arriba es la FOTO de S2-C y se queda así; lo BLOCKED de A2, A6 y A7 lo decidió S2-C.1 (ALC), y eso lo
   * dice su sección —no esta—, y el punto 7 lo nombra. Sin eso, el documento seguiría diciendo como de hoy lo que ya no es.
   */
  const C21 = (() => { const i = S18_PLANO.indexOf('### s2-c.1'); const j = i < 0 ? -1 : S18_PLANO.indexOf('### ', i + 4); return i >= 0 && j > i ? S18_PLANO.slice(i, j) : ''; })();
  const decididoDespues = C21.includes('**alc · lo mal formado en a2, a6 y a7 — cerrado') && C21.includes('aquellos apartados se quedan como su foto de entonces')
    && septima.includes('y en s2-c.1 (alc)') && C21.includes('**d3 · el sujeto — cerrada');
  check(`${numero()} · S2-C · el documento dice lo que hay: lo endurecido con su forma, lo BLOCKED con la decisión que faltaba —que S2-C.1 tomó (ALC y D3), dicho en su sección y en el punto 7—, A6 y el sujeto (prueba sí, corrección no, en su foto), \`maxLatencyMs\` sin volverse un reloj, el atajo exacto y lo que sigue sin quitarse, la línea base, lo que NO se decidió, su rango (${rango}), la fila de §19 y la nota del punto 7`,
    C2.length > 0 && enSuSitio && faltanFilas.length === 0 && faltan.length === 0 && sobran.length === 0 && fila19 && nota7 && decididoDespues,
    [...faltanFilas, ...faltan, ...sobran.map((s) => `sobra: ${s}`), ...(enSuSitio ? [] : ['fuera de su sitio']), ...(fila19 ? [] : ['sin fila en §19']), ...(nota7 ? [] : ['sin nota en el punto 7']),
      ...(decididoDespues ? [] : ['sin lo que S2-C.1 decidió'])].join(' · ')
    || `${DEBE_DECIR.length} afirmaciones · ${ENDURECIDAS.length + BLOQUEADAS.length} filas`);
}

console.log('\n─── U. S2-C.1 · Las decisiones humanas, aplicadas ───');

/*
 * S2-C.1: el usuario tomó las decisiones de la matriz (2026-09-26). Cada comprobación de esta sección fija una
 * decisión: lo que cambió en el código por ella o, si la decisión es mantener, que no cambió nada y que el documento
 * lo dice como semántica y no como deuda.
 */
const DECISIONES_S2C1 = (() => { const i = S18_PLANO.indexOf('### s2-c.1'); const j = i < 0 ? -1 : S18_PLANO.indexOf('### ', i + 4); return i >= 0 && j > i ? S18_PLANO.slice(i, j) : ''; })();
const puntoDeclarado = (inicio, siguiente) => { const i = S18_PLANO.indexOf(inicio); const j = i < 0 ? -1 : S18_PLANO.indexOf(siguiente, i + inicio.length); return i >= 0 && j > i ? S18_PLANO.slice(i, j) : ''; };
{
  /* D1 = a) mantener: el caso de la auditoría sigue igual —«a» sin calidad saca 1,000 y gana a «b» con 0,4— y el documento lo dice. */
  const d = a1.decidir(contexto({ options: [opcion('a', { cost: 1 }), opcion('b', { quality: 0.4, cost: 1 })] }));
  const sa = candidata(d, 'a')?.score;
  const punto1 = puntoDeclarado('1. **un eje sin dato no penaliza el total.**', '2. **');
  check(`${numero()} · S2-C.1 · D1 CERRADA (a, mantener): «no medido» sigue siendo lo que era —se renormaliza sobre lo medido, cobertura = peso medido ÷ peso total, \`missing\`— y el documento lo dice como semántica, no como deuda`,
    elegidaDe(d) === 'a' && casi(sa?.total, 1) && sa?.coverage === 0.5 && igual(sa?.missing, ['quality']) && casi(candidata(d, 'b')?.score?.total, 0.7)
    && DECISIONES_S2C1.includes('**d1 · qué significa «no medido» — cerrada: a) mantener.**') && DECISIONES_S2C1.includes('no hay `datoausente` para la puntuación')
    && punto1.includes('**decidida en s2-c.1 (d1 = a, mantener): es la semántica, no una deuda**'),
    `${elegidaDe(d)} · ${sa?.total} · ${sa?.coverage}`);
}
{
  /*
   * D2b = mantener el 0 y documentar: la forma de siempre —las cuatro claves y los nueve ejes con número—, un eje con
   * peso sin dato vale 0 Y aparece en `missing`, uno sin peso medido conserva su ajuste y uno sin peso ausente vale 0.
   */
  const d = a1.decidir(contexto({ objective: { weights: { quality: 1, cost: 1 } },
    options: [opcion('a', { cost: 1, reliability: 0.95 }), opcion('b', { quality: 0.4, cost: 1 })] }));
  const sa = candidata(d, 'a')?.score;
  const punto2 = puntoDeclarado('2. **el desglose no cuadraba en ese caso**', '3. **');
  check(`${numero()} · S2-C.1 · D2b CERRADA (mantener el 0 y documentar): \`fits\` conserva su forma —cuatro claves, nueve ejes con número—; un 0 puede ser un eje sin dato, la ausencia la dice \`missing\`, y el documento escribe la convención`,
    igual(Object.keys(sa ?? {}).sort(), ['coverage', 'fits', 'missing', 'total']) && Object.keys(sa?.fits ?? {}).length === 9
    && Object.values(sa?.fits ?? {}).every((v) => typeof v === 'number')
    && sa.fits.quality === 0 && igual(sa.missing, ['quality']) && sa.fits.reliability === 0.95 && sa.fits.latency === 0
    && DECISIONES_S2C1.includes('**d2b · la forma de `fits` — cerrada: se mantiene el 0 y la convención queda escrita.**')
    && DECISIONES_S2C1.includes('un `fits` de 0 no es evidencia negativa del eje')
    && punto2.includes('**decidida en s2-c.1 (d2b = mantener el 0 y documentar la convención)**'),
    `${JSON.stringify(sa?.fits)} · missing ${JSON.stringify(sa?.missing)}`);
}

{
  /*
   * D11 = A–E son «sin elección real», con un CAMPO que distingue los cinco (1.12). PROPIEDAD sobre 1 500 decisiones al
   * azar —de una a cinco alternativas, restricciones, confianza mínima, topes de candidatas y de evidencia—:
   * `noRealChoice` está si y solo si se decidió con UNA sola que compite, y sus causas son las que la decisión ya dice
   * —cuántas llegaron, `candidates_capped`, las de fuera por restricciones, las de fuera por confianza y
   * `evidence_capped`—, en ese orden; no depende del orden de llegada, y está congelado. Que la marca no toca la
   * selección, la puntuación ni la confianza lo fijan la 215 (los cinco casos, con los valores de 9544b7f) y la 199
   * (la equivalencia con las tres versiones anteriores).
   */
  const azar = generador(2026_0926_225);
  const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
  const EJES_U = { quality: [0.2, 0.5, 0.9], cost: [1, 2, 3], latency: [100, 500, 900], reliability: [0.5, 0.8, 0.95] };
  const vistas = {};
  const fallos = [];
  for (let k = 0; k < 1500; k++) {
    const ops = Array.from({ length: 1 + Math.floor(azar() * 5) }, (_, i) => opcion(`o${i}`,
      Object.fromEntries(Object.entries(EJES_U).filter(() => azar() < 0.75).map(([e, vs]) => [e, elegir(vs)]))));
    const constraints = elegir([undefined, { maxRisk: 0.3 }, { minConfidence: elegir([0.2, 0.3, 0.6]) }, { maxLatencyMs: 600 }, { maxRisk: 0.4, minConfidence: 0.3 }]);
    const budget = elegir([undefined, { maxCandidates: elegir([1, 2, 3]) }, { maxEvidence: elegir([0, 1, 2]) }, { maxCandidates: 2, maxEvidence: 1 }]);
    const signals = Array.from({ length: elegir([0, 1, 3, 8]) }, (_, i) => ({ key: `option.k${i % 4}`, subject: elegir(ops).id, value: elegir([0.5, 1]),
      source: elegir(['measured', 'catalog', 'model']), ...(azar() < 0.5 ? { sampleSize: 20 } : {}) }));
    const ctx = contexto({ objective: { weights: { quality: 1, cost: 1, latency: 1 } }, options: ops,
      ...(constraints ? { constraints } : {}), ...(budget ? { budget } : {}), ...(signals.length ? { signals } : {}) });
    const d = a1.decidir(ctx);
    const alReves = a1.decidir({ ...ctx, options: [...ops].reverse() });
    const cands = d.candidates ?? [];
    const esperadas = [];
    if (d.status === 'decided' && cands.filter((c) => c.eligible).length === 1) {
      if (ops.length === 1) esperadas.push('single_option');
      else {
        const porConfianza = cands.some((c) => c.reason === 'constraint:minConfidence');
        if (d.warnings.includes('candidates_capped')) esperadas.push('candidates_capped');
        if (cands.some((c) => !c.eligible && c.reason !== 'constraint:minConfidence')) esperadas.push('constraints');
        if (porConfianza && d.warnings.includes('evidence_capped')) esperadas.push('evidence_capped');
        if (porConfianza) esperadas.push('min_confidence');
      }
    }
    const causas = d.noRealChoice?.causes;
    for (const c of causas ?? []) vistas[c] = (vistas[c] ?? 0) + 1;
    if (!igual(causas ?? [], esperadas) || (esperadas.length === 0) !== (d.noRealChoice === undefined)
      || !igual(alReves.noRealChoice, d.noRealChoice) || (d.noRealChoice && !(Object.isFrozen(d.noRealChoice) && Object.isFrozen(causas)))) {
      fallos.push(`#${k} · ${(causas ?? []).join('+') || '—'} ≠ ${esperadas.join('+') || '—'}`);
    }
  }
  const CAUSAS = ['single_option', 'candidates_capped', 'constraints', 'evidence_capped', 'min_confidence'];
  check(`${numero()} · S2-C.1 · D11 CERRADA (1.12) · PROPIEDAD · 1 500 decisiones al azar: \`noRealChoice\` si y solo si se decidió con UNA sola que compite, con las causas que la decisión ya dice y en el orden en que se filtra —${CAUSAS.join(', ')}—; igual con las alternativas al revés, y congelado`,
    fallos.length === 0 && CAUSAS.every((c) => vistas[c] > 10), fallos.slice(0, 3).join(' | ') || JSON.stringify(vistas));
}
{
  /*
   * V · LAS PARADAS de 1.12. PROPIEDAD sobre 600 peticiones al azar al ciclo —por opciones o con tarea, simple o
   * compuesta, con topes y restricciones—: cada parada nueva donde su causa, leída de lo que el ciclo ya dice, y en
   * ningún otro sitio: `max_depth_exceeded` si el porqué empieza por «El plan existe…»; `composition_emptied` si la
   * composición se vació y no fue el presupuesto; `budget_exceeded` si se vació por el presupuesto, o si A1 falló con
   * `budget_exceeded` por el camino de opciones. Las tres, con el `status` de siempre: `undecided`.
   */
  const cicloU = A.crearCicloAlgoritmico();
  const azar = generador(2026_0926_226);
  const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
  const CAB_U = 'La composición se quedó sin alternativas antes de A1';
  const NUEVAS = ['max_depth_exceeded', 'composition_emptied', 'budget_exceeded'];
  const vistas = {};
  const fallos = [];
  for (let k = 0; k < 600; k++) {
    const porOpciones = azar() < 0.3;
    const n = 2 + Math.floor(azar() * 8);
    const pasos = Array.from({ length: n }, (_, i) => ({ id: `s${i}`, capability: 'text.generate', purpose: `p${i}`,
      ...(i ? { dependsOn: [azar() < 0.6 ? `s${i - 1}` : `s${Math.floor(azar() * i)}`] } : {}) }));
    const opciones = Array.from({ length: 1 + Math.floor(azar() * 3) }, (_, i) => opcion(`x${i}`, { latency: elegir([1, 2, 3]) }));
    const budget = elegir([undefined, { maxCandidates: elegir([0, 1]) }, { maxAlgorithmCalls: 0 }, { maxDepth: elegir([3, 4, 6]) }]);
    const constraints = elegir([undefined, { maxSteps: elegir([2, 3, 5]) }, { maxLatencyMs: elegir([100, 800]) }]);
    const componer = elegir([undefined, { paralelizar: true }, { optimizar: true }, { paralelizar: true, optimizar: true }]);
    const latencias = pasos.map((p) => ({ key: 'step.latencyMs', subject: p.id, value: elegir([100, 300]), source: 'measured', sampleSize: 20 }));
    const r = cicloU.decidir({
      decision: { contract: ALGORITHM_CONTRACT_VERSION, trace: TRAZA, objective: OBJ_CICLO, ...(budget ? { budget } : {}), ...(constraints ? { constraints } : {}),
        ...(porOpciones ? { options: opciones } : { signals: latencias }) },
      ...(porOpciones ? {} : { tarea: { id: 'T', steps: pasos }, ...(componer ? { componer } : {}) }),
    });
    vistas[r.parada ?? '—'] = (vistas[r.parada ?? '—'] ?? 0) + 1;
    const vacia = (r.because ?? []).find((f) => f.startsWith(CAB_U));
    const esperada = (r.because?.[0] ?? '').startsWith('El plan existe —') ? 'max_depth_exceeded'
      : vacia ? (vacia.includes('el presupuesto de pensar no dejó') ? 'budget_exceeded' : 'composition_emptied')
      : porOpciones && r.decision?.failure === 'budget_exceeded' ? 'budget_exceeded' : undefined;
    if (esperada ? !(r.parada === esperada && r.status === 'undecided') : NUEVAS.includes(r.parada)) fallos.push(`#${k} · ${r.status}/${r.parada} ≠ ${esperada ?? 'ninguna nueva'}`);
  }
  check(`${numero()} · S2-C.1 · V (1.12) · PROPIEDAD · 600 peticiones al azar al ciclo: \`max_depth_exceeded\`, \`composition_emptied\` y \`budget_exceeded\` —antes \`undecided\`— están donde su causa, leída del porqué y de A1, y en ningún otro sitio, con el \`status\` de siempre`,
    fallos.length === 0 && NUEVAS.every((p) => vistas[p] > 5), fallos.slice(0, 3).join(' | ') || JSON.stringify(vistas));
}
{
  /*
   * V · LOS AVISOS de 1.12. PROPIEDAD sobre otras 1 500 decisiones al azar: `budget_exhausted` está si y solo si está
   * alguno de los tres propios; `evidence_capped` si y solo si está la frase de la evidencia acotada; y, en una decisión
   * tomada, `counter_exhausted` si y solo si se pasó un contador —`contadorAgotado` sobre el gasto y el presupuesto
   * efectivo—, que nunca es el de candidatas ni el de evidencia: esos se preguntan antes de gastar.
   */
  const azar = generador(2026_0926_227);
  const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
  const vistas = { candidates_capped: 0, evidence_capped: 0, counter_exhausted: 0 };
  const fallos = [];
  for (let k = 0; k < 1500; k++) {
    const ops = Array.from({ length: 1 + Math.floor(azar() * 4) }, (_, i) => opcion(`o${i}`, { quality: elegir([0.2, 0.5, 0.9]), cost: elegir([1, 2, 3]) }));
    const budget = elegir([undefined, { maxCandidates: elegir([1, 2]) }, { maxEvidence: elegir([0, 1, 2]) }, { maxIterations: elegir([1, 2, 3]) },
      { maxAlgorithmCalls: elegir([1, 2]) }, { maxCandidates: 2, maxEvidence: 1, maxIterations: 1 }]);
    const signals = Array.from({ length: elegir([0, 2, 6]) }, (_, i) => ({ key: `option.k${i % 3}`, subject: elegir(ops).id, value: 1, source: elegir(['measured', 'model']) }));
    const d = a1.decidir(contexto({ options: ops, ...(budget ? { budget } : {}), ...(signals.length ? { signals } : {}),
      ...(azar() < 0.3 ? { constraints: { minConfidence: 0.3 } } : {}) }));
    const w = d.warnings;
    for (const x of Object.keys(vistas)) if (w.includes(x)) vistas[x]++;
    const agotado = A.contadorAgotado(d.spend, A.presupuestoEfectivo(budget));
    const bien = w.includes('budget_exhausted') === ['candidates_capped', 'evidence_capped', 'counter_exhausted'].some((x) => w.includes(x))
      && w.includes('evidence_capped') === !!fraseR(d)
      && (d.status === 'decided' ? w.includes('counter_exhausted') === (agotado !== undefined) : !w.includes('counter_exhausted'))
      && agotado !== 'candidates' && agotado !== 'evidence';
    if (!bien) fallos.push(`#${k} · ${d.status} · ${w.join('+')} · agotado ${agotado ?? '—'}`);
  }
  check(`${numero()} · S2-C.1 · V (1.12) · PROPIEDAD · 1 500 decisiones al azar: \`budget_exhausted\` si y solo si \`candidates_capped\`, \`evidence_capped\` o \`counter_exhausted\`; \`evidence_capped\` si y solo si la frase de la evidencia acotada; y \`counter_exhausted\`, en una decisión tomada, si y solo si se pasó un contador —nunca el de candidatas ni el de evidencia—`,
    fallos.length === 0 && Object.values(vistas).every((v) => v > 20), fallos.slice(0, 3).join(' | ') || JSON.stringify(vistas));
}
{
  /*
   * 1.12, UNA sola ampliación y en su sitio: la entrada del historial nombra lo nuevo —el campo, los dos avisos y las tres
   * paradas— y dice por qué `motor-de-decision` no sube; las uniones cerradas lo tienen; y el documento dice D11 y V como
   * decididas, con los puntos 7, 10 y 12 de «lo que queda declarado» al día.
   */
  const entrada = (() => { const i = srcContratos.indexOf('* 1.12 (S2-C.1): '); const j = srcContratos.indexOf('export const ALGORITHM_CONTRACT_VERSION', i); return i >= 0 && j > i ? srcContratos.slice(i, j) : ''; })();
  const fuenteDecision = leer('functions/src/core/algorithm/decision.ts');
  const fuenteIntegracion = leer('functions/src/core/algorithm/integration.ts');
  const NUEVOS = ['`noRealChoice`', '`evidence_capped`', '`counter_exhausted`', '`max_depth_exceeded`', '`composition_emptied`', '`budget_exceeded`'];
  const punto10 = puntoDeclarado('10. **una sola alternativa no lleva una marca de «sin elección real»**', '11. **');
  const punto12 = puntoDeclarado('12. **un plan que no cabía en `maxdepth`', 'y una nota de pruebas');
  const faltan = [
    ...NUEVOS.filter((x) => !entrada.includes(x)).map((x) => `entrada: ${x}`),
    ...(entrada.includes('`motor-de-decision` sigue en su versión 3') ? [] : ['entrada: el motor']),
    ...["| 'evidence_capped'", "| 'counter_exhausted'", 'noRealChoice?: NoRealChoice', "| 'single_option'", "| 'candidates_capped'", "| 'constraints'", "| 'min_confidence'"]
      .filter((x) => !fuenteDecision.includes(x)).map((x) => `decision.ts: ${x}`),
    ...["| 'composition_emptied'", "| 'max_depth_exceeded'", "| 'budget_exceeded'"].filter((x) => !fuenteIntegracion.includes(x)).map((x) => `integration.ts: ${x}`),
    ...['**d11 · «sin elección real» — cerrada', '**v · el vocabulario — cerrado en una sola ampliación: contrato 1.12.**', '`motor-de-decision` sigue en @3',
      'no toca la selección, la puntuación ni la confianza', 'la representación común de `maxcandidates: 0`'].filter((x) => !DECISIONES_S2C1.includes(x)).map((x) => `doc: ${x}`),
    ...(punto10.includes('**cerrada en s2-c.1 (d11, contrato 1.12)**') ? [] : ['punto 10']),
    ...(punto12.includes('**cerrado en s2-c.1 (v, contrato 1.12)**') ? [] : ['punto 12']),
    ...(S18_PLANO.includes('y en s2-c.1 (v, contrato 1.12)') ? [] : ['punto 7']),
  ];
  check(`${numero()} · S2-C.1 · 1.12, una sola ampliación: la entrada del historial nombra el campo, los dos avisos y las tres paradas y dice por qué \`motor-de-decision\` sigue en 3; las uniones cerradas los tienen; y el documento dice D11 y V como decididas, con los puntos 7, 10 y 12 al día`,
    faltan.length === 0, faltan.join(' · ') || `${NUEVOS.length} nombres · 3 puntos`);
}
{
  /*
   * ALC, en su sitio: la entrada 1.12 del historial lo dice —`invalid_constraint` en A2, `inconclusive` en A6, la
   * política por defecto con su suelo en A7—; la unión de A2 lo tiene; y el documento lo dice como decidido, con el
   * punto 7 al día. Lo que hace cada motor lo fijan 207–209 (§T), reescritas con lo decidido.
   */
  const entrada = (() => { const i = srcContratos.indexOf('* 1.12 (S2-C.1): '); const j = srcContratos.indexOf('export const ALGORITHM_CONTRACT_VERSION', i); return i >= 0 && j > i ? srcContratos.slice(i, j) : ''; })();
  const fuenteA2 = leer('functions/src/core/algorithm/decomposition.ts');
  /* La entrada es un comentario: sus frases se leen sin los saltos ni los asteriscos de cada línea. */
  const entradaPlana = entrada.replace(/\s*\n\s*\*\s*/g, ' ');
  const faltan = [
    ...['`invalid_constraint`', '`inconclusive`', 'la política por defecto', 'VALIDACIÓN'].filter((x) => !entradaPlana.includes(x)).map((x) => `entrada: ${x}`),
    ...(fuenteA2.includes("| 'invalid_constraint';") ? [] : ['decomposition.ts: la unión']),
    ...['**alc · lo mal formado en a2, a6 y a7 — cerrado', 'ni `fail`, ni `pass`, ni `unknown`', 'sin aflojar nada', '`motivoderechazo` sigue siendo',
      'ningún descriptor sube'].filter((x) => !DECISIONES_S2C1.includes(x)).map((x) => `doc: ${x}`),
    ...(S18_PLANO.includes('y en s2-c.1 (alc)') ? [] : ['punto 7']),
  ];
  check(`${numero()} · S2-C.1 · ALC, en su sitio: la entrada 1.12 dice \`invalid_constraint\` en A2, \`inconclusive\` en A6 y la política por defecto con su suelo en A7; la unión de A2 lo tiene; y el documento lo dice como decidido, con el punto 7 al día`,
    faltan.length === 0, faltan.join(' · ') || '3 motores · 1 unión');
}
{
  /*
   * D3, en su sitio: la entrada 1.12 lo dice (bloque SUJETO); A6 y A7 suben a su versión 2 —cambia lo que deciden, la
   * regla de `AlgorithmDescriptor.version`—; el contrato de la observación dice de quién es una medida; y el documento
   * lo dice como decidido, con el punto 3 al día. Lo que hacen A6, A7 y `cerrar` lo fija la 210 (§T), reescrita.
   */
  const entrada = (() => { const i = srcContratos.indexOf('* 1.12 (S2-C.1): '); const j = srcContratos.indexOf('export const ALGORITHM_CONTRACT_VERSION', i); return i >= 0 && j > i ? srcContratos.slice(i, j) : ''; })();
  const entradaPlana = entrada.replace(/\s*\n\s*\*\s*/g, ' ');
  const observacion = leer('functions/src/core/algorithm/integration.ts').replace(/\s*\n\s*\*\s*/g, ' ');
  const punto3 = puntoDeclarado('3. **`cerrar` no pasa las señales observadas a a6**', '4. **');
  const faltan = [
    ...['SUJETO', '`subject === actual.id`', 'sin sujeto no se le atribuyen', '`motor-de-verificacion`', '`motor-de-feedback`', 'versión 2']
      .filter((x) => !entradaPlana.includes(x)).map((x) => `entrada: ${x}`),
    ...(A.DESCRIPTOR_DE_VERIFICACION.version === 2 && A.DESCRIPTOR_DE_FEEDBACK.version === 2 ? [] : ['versiones de A6 y A7']),
    ...(observacion.includes('una medida es del resultado si su `subject` es `actual.id`') ? [] : ['ObservacionDeEjecucion.signals']),
    ...['**d3 · el sujeto — cerrada', 'quien ejecuta produce sus medidas con el sujeto del resultado', 'quien llama a `cerrar` las entrega',
      '`motor-de-verificacion@2` y `motor-de-feedback@2`', 'no suma lo medido de otro sujeto'].filter((x) => !DECISIONES_S2C1.includes(x)).map((x) => `doc: ${x}`),
    ...(punto3.includes('**cerrada en s2-c.1 (d3)**') ? [] : ['punto 3']),
  ];
  check(`${numero()} · S2-C.1 · D3, en su sitio: la entrada 1.12 lo dice (SUJETO), \`motor-de-verificacion\` y \`motor-de-feedback\` suben a 2, el contrato de la observación dice de quién es una medida, y el documento lo dice como decidido, con el punto 3 al día`,
    faltan.length === 0, faltan.join(' · ') || '2 motores · 1 contrato');
}
{
  /*
   * FASE 3 · lo que se decide SIN construir nada —D4, D8, D9 y D10— y lo que se queda como está —REN, A9, DV y DUP—,
   * escrito como decidido; los puntos 4, 7, 8, 9 y 11 al día; el rango de esta sección, sacado del contador; y su
   * fila en §19. Y ninguna infraestructura en el código del motor: ni `maxConcurrent`, ni un reloj que corte.
   */
  const rangoU = `§u (223–${siguiente}, ${siguiente - 222} comprobaciones)`;
  const DEBE = ['**d4 · la procedencia de las restricciones — cerrada: a) el productor resuelve antes del algoritmo.**',
    'no hay una sexta autoridad ni campos de procedencia', '**d8 · `maxparallel` y `maxconcurrent` — cerrada: no se implementa.**',
    '**d9 · `maxlatencyms` — cerrada: un criterio del algoritmo.**', 'ni timeout, ni deadline, ni abort',
    '**d10 · `budget.onexceed`, `quality.checks` y `quality.onbelow` — cerrada: se mantiene la arquitectura.**',
    'sin motor de calidad nuevo ni jerarquía global de rigor', '**ren — sin umbral.**', '**a9 — la optimización parcial se queda.**', 'b.3 intacta',
    '**dv — la doble validación de a1 se queda.**', 'no hay exportación nueva', '**dup — un grupo de duplicados es una pieza y se resuelve entero.**',
    'sin truncar ni top-k', rangoU];
  const PUNTOS = [
    ['4. **la procedencia de las restricciones**', '5. **', '**decidida en s2-c.1 (d4 = a'],
    ['8. **`maxlatencyms` no tiene lector**', '9. **', '**decidida en s2-c.1 (d9 = criterio)**'],
    ['9. **`maxparallel` → `maxconcurrent`**', '10. **', '**decidida en s2-c.1 (d8 = no implementar)**'],
    ['11. **`budget.onexceed`, `quality.checks` y `quality.onbelow`**', '12. **', '**decidida en s2-c.1 (d10 = mantener la arquitectura)**'],
  ];
  const codigoDelMotor = FUENTES_SRC('functions/src/core/algorithm').map((p) => sinComentarios(leer(p))).join('\n');
  const faltan = [
    ...DEBE.filter((x) => !DECISIONES_S2C1.includes(x)).map((x) => `doc: ${x}`),
    ...PUNTOS.filter(([inicio, fin, dice]) => !puntoDeclarado(inicio, fin).includes(dice)).map(([inicio]) => `punto: ${inicio.slice(0, 30)}`),
    ...(S18_PLANO.includes('y en s2-c.1 (a9 y dup, mantener)') ? [] : ['punto 7']),
    ...(DOC.includes(`| \`algorithm-quality.test.mjs\` §U (223–${siguiente}) |`) ? [] : ['sin fila en §19']),
    ...(/maxConcurrent|AbortController|setTimeout|clearTimeout/.test(codigoDelMotor) ? ['infraestructura en el motor'] : []),
    ...(DEUDAS_ABIERTAS.length ? ['quedan deudas abiertas'] : []),
  ];
  check(`${numero()} · S2-C.1 · FASE 3: D4, D8, D9 y D10 decididos sin construir nada, y REN, A9, DV y DUP como están, escritos como decididos; los puntos 4, 7, 8, 9 y 11 al día; su rango (${rangoU}) y su fila en §19; y ninguna infraestructura en el motor`,
    faltan.length === 0, faltan.join(' · ') || `${DEBE.length} afirmaciones · ${PUNTOS.length + 1} puntos`);
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nS2-A: se decide con reglas que se pueden comprobar, sin inventar calidad, y el CON QUÉ sigue siendo del Router');
process.exit(failures ? 1 : 0);
