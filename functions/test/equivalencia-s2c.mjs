/*
 * S2-C · LA EQUIVALENCIA DE LOS MOTORES ENDURECIDOS, con entradas VÁLIDAS.
 *
 * S2-C endurece las llamadas directas a A3, A4, A5 y A8 con la regla de A1 (S2-B · B.1, B.4, B.5): lo mal formado se
 * rechaza y se dice por qué. Con entradas válidas no puede cambiar NADA. Aquí están esas entradas —tareas, formas,
 * restricciones y topes válidos, y lo aprendido para A8—, generadas con semilla fija, y la huella de lo que devuelve cada
 * motor. La suite (`algorithm-quality` §T) las recalcula con el código de hoy y las compara con las que se fijaron en
 * `equivalencia-s2c.json` sobre la compilación limpia de e3a9e94.
 *
 * Todo lo que se construye con un motor que NO cambia (A2 para las formas, A3 para las candidatas de A5, A7 para lo
 * aprendido) sale igual en las dos compilaciones: por eso las entradas se pueden generar con la lib que se prueba.
 */
import { createHash } from 'node:crypto';

const generador = (semilla) => { let s = semilla >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
export const huella = (x) => createHash('sha256').update(JSON.stringify(x ?? null)).digest('hex').slice(0, 12);

const CAPACIDADES = ['text.generate', 'image.generate', 'image.edit', 'text.search'];
const tareasAlAzar = (azar, n) => Array.from({ length: n }, (_, t) => {
  const k = 2 + Math.floor(azar() * 6);
  const steps = Array.from({ length: k }, (__, i) => ({
    id: `s${i}`, capability: CAPACIDADES[Math.floor(azar() * CAPACIDADES.length)], purpose: `p${i}`,
    ...(i ? { dependsOn: [`s${azar() < 0.5 ? i - 1 : Math.floor(azar() * i)}`] } : {}),
  }));
  return { id: `T${t}`, steps };
});
const senalesDe = (azar, tarea) => tarea.steps.flatMap((s) => [
  ...(azar() < 0.7 ? [{ key: 'step.latencyMs', subject: s.id, value: [100, 300, 900][Math.floor(azar() * 3)], source: 'measured', sampleSize: 20 }] : []),
  ...(azar() < 0.5 ? [{ key: 'step.costUsd', subject: s.id, value: [0.01, 0.05][Math.floor(azar() * 2)], source: 'catalog' }] : []),
  ...(azar() < 0.3 ? [{ key: 'step.reliability', subject: s.id, value: [0.9, 0.99][Math.floor(azar() * 2)], source: 'measured', sampleSize: 20 }] : []),
]);
/* Restricciones y topes VÁLIDOS —finitos y en su rango de siempre—, a veces ausentes. */
const restriccionesValidas = (azar) => {
  const c = {};
  if (azar() < 0.4) c.maxParallel = [1, 2, 3, 0.5, 1.5][Math.floor(azar() * 5)];
  if (azar() < 0.3) c.maxSteps = [3, 5, 8][Math.floor(azar() * 3)];
  if (azar() < 0.3) c.maxLatencyMs = [500, 2000][Math.floor(azar() * 2)];
  if (azar() < 0.2) c.maxRisk = 0.5;
  if (azar() < 0.2) c.budget = { maxUsd: [0.05, 1][Math.floor(azar() * 2)] };
  return Object.keys(c).length ? c : undefined;
};
const topesValidos = (azar) => {
  const b = {};
  if (azar() < 0.3) b.maxCandidates = [1, 2, 8][Math.floor(azar() * 3)];
  if (azar() < 0.3) b.maxIterations = [1, 4][Math.floor(azar() * 2)];
  if (azar() < 0.3) b.maxDepth = [2, 4, 6][Math.floor(azar() * 3)];
  if (azar() < 0.2) b.maxEvidence = [0, 8, 64][Math.floor(azar() * 3)];
  if (azar() < 0.2) b.maxLatencyMs = 250;
  return Object.keys(b).length ? b : undefined;
};

/** Lo que devuelve cada motor, una salida por entrada. */
export const salidasDe = (A) => {
  const azar = generador(20_260_927);
  const tareas = tareasAlAzar(azar, 30);
  const a2 = A.crearMotorDeDescomposicion();
  const a3 = A.crearMotorDeEstrategias();
  const a4 = A.crearMotorDeParalelizacion();
  const a5 = A.crearMotorDeOptimizacion();
  const a7 = A.crearMotorDeFeedback();
  const a8 = A.crearMotorDeContexto();
  const salida = { a3: [], a4: [], a5: [], a8: [] };
  for (const tarea of tareas) {
    const senales = senalesDe(azar, tarea);
    const c = restriccionesValidas(azar);
    const b = topesValidos(azar);
    salida.a4.push(a4.variantes(tarea, senales, c, b));
    const formas = a2.descomponer(tarea, undefined, undefined).opciones.map((o) => o.value);
    const estrategias = a3.proponer(formas, senales, c, b);
    salida.a3.push(estrategias);
    const candidatas = a3.proponer(formas, senales, undefined, undefined).estrategias;
    salida.a5.push(a5.optimizar({ candidates: candidatas, objective: { weights: { latency: 1, reliability: 1, cost: 1 } },
      ...(c ? { constraints: c } : {}), ...(b ? { budget: b } : {}), evidence: senales.map((signal) => ({ claim: signal.key, supports: true, signal })) }));
  }
  /* A8: lo aprendido por A7 (que no cambia) en un ámbito de capacidad, y una selección con requisitos y topes válidos. */
  const T0 = 1_700_000_000_000;
  const DIA = 86_400_000;
  for (let n = 0; n < 12; n++) {
    const capability = CAPACIDADES[n % CAPACIDADES.length];
    const scope = { capability };
    const outcomes = Array.from({ length: 30 + n }, (_, i) => ({
      id: `o${n}-${i}`, kind: azar() < 0.8 ? 'success' : 'failure', at: T0 + (i + 1) * 3_600_000, scope,
      signals: [{ key: 'result.latencyMs', value: 200 + Math.floor(azar() * 800), source: 'measured' }],
    }));
    const ahora = T0 + 3 * DIA;
    const learned = a7.aprender({ ahora, policy: { ventanaMs: 4 * DIA }, outcomes }).aggregates;
    const requirements = azar() < 0.5 ? { minConfidence: [0, 0.3, 0.6][Math.floor(azar() * 3)] } : undefined;
    const budget = azar() < 0.5 ? { maxEvidence: [1, 8, 512][Math.floor(azar() * 3)] } : undefined;
    salida.a8.push(a8.seleccionar({ ahora, scope, learned, learningPolicy: { ventanaMs: 4 * DIA },
      objective: { weights: { latency: 1, successProbability: 1 } }, ...(requirements ? { requirements } : {}), ...(budget ? { budget } : {}) }));
  }
  return salida;
};

/** Lo mismo, reducido a sus huellas: una por entrada. */
export const huellasDe = (A) => Object.fromEntries(Object.entries(salidasDe(A)).map(([k, v]) => [k, v.map(huella)]));
