/*
 * A4 — EL MOTOR DE PARALELIZACIÓN.
 *
 * No contesta «¿se puede paralelizar?» sino «¿cuánto valor aporta hacerlo?».
 * No ejecuta nada: quien ejecuta grupos es el Orchestrator.
 *
 *  A. Quién es.
 *  B. Aritmética con red: ahorro, aceleración, límites.
 *  C. La forma del grafo: abanicos y cuellos.
 *  D. La curva y los rendimientos decrecientes.
 *  E. Límites y recursos.
 *  F. Variantes y la cadena A4 → A3 → A1.
 *  G. Determinismo y propiedades.
 *  H. Los sabotajes.
 *  I. Rendimiento.
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
const a4 = A.crearMotorDeParalelizacion();
const a3 = A.crearMotorDeEstrategias();
const a1 = A.crearMotorDeDecision();

const paso = (id, cap = 'text.generate', dep) => ({ id, capability: cap, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
const sig = (key, subject, value, source = 'measured', extra = {}) => ({ key, subject, value, source, ...extra });
const tarea = (id, steps) => ({ id, steps });

/* El ejemplo del brief: A=1000; B=2000, C=500, D=500 en paralelo; E depende de los tres. */
const EJEMPLO = tarea('T', [paso('a'), paso('b', 'text.generate', ['a']), paso('c', 'text.generate', ['a']),
  paso('d', 'text.generate', ['a']), paso('e', 'text.generate', ['b', 'c', 'd'])]);
const DUR = [sig('step.latencyMs', 'a', 1000, 'measured', { sampleSize: 30 }), sig('step.latencyMs', 'b', 2000, 'measured', { sampleSize: 30 }),
  sig('step.latencyMs', 'c', 500), sig('step.latencyMs', 'd', 500), sig('step.latencyMs', 'e', 700)];

console.log('\n─── A. Quién es ───');

check('1 · su descriptor vale y es de la familia `parallelization`',
  A.algoritmoValido(A.DESCRIPTOR_DE_PARALELIZACION) && A.DESCRIPTOR_DE_PARALELIZACION.category === 'parallelization',
  JSON.stringify(A.validarAlgoritmo(A.DESCRIPTOR_DE_PARALELIZACION)));
check('2 · es puro y EXPERIMENTAL: nadie lo elige solo',
  A.DESCRIPTOR_DE_PARALELIZACION.purity === 'pure' &&
  A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_PARALELIZACION]).registro.seleccionable(A.PARALLELIZATION_ENGINE_ID) === false);

console.log('\n─── B. Aritmética con red ───');

check('3 · una tanda dura lo que su paso más lento, no la suma',
  A.duracionDeTanda(['b', 'c', 'd'], (id) => ({ b: 2000, c: 500, d: 500 })[id]) === 2000);
check('4 · si a UN paso de la tanda le falta la duración, la tanda no se sabe',
  A.duracionDeTanda(['b', 'c'], (id) => (id === 'b' ? 2000 : undefined)) === undefined);
check('5 · el ahorro es baseline − paralelo', A.ahorroDe(3500, 2000) === 1500);
check('6 · y nunca sale negativo: eso sería un error de cálculo, no un dato',
  A.ahorroDe(1000, 3000) === undefined);
check('7 · la aceleración es baseline / paralelo', A.aceleracionDe(4000, 2000) === 2);
check('8 · NUNCA infinita: una división por cero no es un resultado',
  A.aceleracionDe(4000, 0) === undefined && A.aceleracionDe(4000, undefined) === undefined);
check('9 · ni NaN', !Number.isNaN(A.aceleracionDe(0, 0) ?? 0) && A.aceleracionDe(NaN, 10) === undefined);
check('10 · una duración negativa no es una duración', !A.duracionValida(-1) && !A.duracionValida(Infinity) && A.duracionValida(0));
check('11 · la razón de ahorro está acotada a 0–1',
  A.razonDeAhorro(1000, 400) === 0.6 && A.razonDeAhorro(0, 0) === undefined);

console.log('\n─── C. La forma del grafo ───');

const anaVacia = a4.analizar(EJEMPLO, []);
check('12 · el fan-in se detecta: «e» espera a tres',
  anaVacia.fanIn.some((f) => f.stepId === 'e' && f.count === 3), JSON.stringify(anaVacia.fanIn));
check('13 · y con el umbral por defecto, «a» abre 3 y no llega a fan-out',
  anaVacia.fanOut.length === 0 && A.abanicoDeSalida(EJEMPLO.steps, 3)[0].stepId === 'a');
const ancho = tarea('W', [paso('r'), ...['1', '2', '3', '4', '5', '6'].map((k) => paso(`h${k}`, 'text.generate', ['r']))]);
check('14 · un abanico de 6 sí es fan-out, y se dice de quién',
  a4.analizar(ancho, []).fanOut.some((f) => f.stepId === 'r' && f.count === 6));
check('15 · el punto de sincronización aparece como cuello',
  anaVacia.bottlenecks.some((b) => b.kind === 'join' && b.stepId === 'e'));
check('16 · sin duraciones NO se inventa el paso más largo',
  !anaVacia.bottlenecks.some((b) => b.kind === 'longest_task'));
const anaMedida = a4.analizar(EJEMPLO, DUR);
check('17 · con duraciones sí, y es el que de verdad más dura',
  anaMedida.bottlenecks.some((b) => b.kind === 'longest_task' && b.stepId === 'b' && b.durationMs === 2000));
check('18 · y la tanda que fija la duración se nombra',
  anaMedida.bottlenecks.some((b) => b.kind === 'critical_group' && b.durationMs === 2000));

console.log('\n─── D. La curva ───');

check('19 · la curva empieza en 1 y llega hasta lo que el grafo permite',
  anaMedida.curva[0].parallelism === 1 && anaMedida.anchoPosible === 3,
  anaMedida.curva.map((p) => p.parallelism).join(','));
/* El ejemplo del brief, calculado: baseline 4700, con k=3 → 1000+2000+700 = 3700. */
check('20 · el baseline es la suma de todo', anaMedida.curva[0].baselineDurationMs === 4700);
check('21 · y NO se calcula baseline/N: el ahorro sale del camino crítico',
  anaMedida.curva[2].parallelDurationMs === 3700 && anaMedida.curva[2].savingsMs === 1000,
  `k=3 → ${anaMedida.curva[2].parallelDurationMs} ms, ahorra ${anaMedida.curva[2].savingsMs}`);
check('22 · la aceleración real no es 3×', Math.abs(anaMedida.curva[2].speedup - 4700 / 3700) < 1e-9,
  `×${anaMedida.curva[2].speedup.toFixed(2)}`);
check('23 · el ahorro marginal de cada escalón se cuenta',
  anaMedida.curva[1].marginalSavingsMs === 500 && anaMedida.curva[2].marginalSavingsMs === 500,
  anaMedida.curva.map((p) => p.marginalSavingsMs ?? '—').join(' '));
check('24 · aquí compensa llegar al final: cada escalón aporta de sobra',
  anaMedida.recomendado.parallelism === 3, JSON.stringify(anaMedida.recomendado));

/* Rendimientos decrecientes: B domina y los demás son ruido. */
const RUIDO = [sig('step.latencyMs', 'a', 1000), sig('step.latencyMs', 'b', 2000),
  sig('step.latencyMs', 'c', 5), sig('step.latencyMs', 'd', 5), sig('step.latencyMs', 'e', 10)];
const anaRuido = a4.analizar(EJEMPLO, RUIDO);
/*
 * El resultado correcto aquí es NO PARALELIZAR. Con `b` de 2 000 ms dominando su
 * tanda y `c`/`d` de 5 ms, ponerlos a la vez ahorra 5 ms de 3 020: ruido. Un
 * motor que contestara «paralelismo 3» por haber tres tareas independientes
 * estaría respondiendo a la pregunta equivocada.
 */
check('25 · cuando un paso domina, la respuesta correcta es NO paralelizar',
  anaRuido.recomendado.parallelism === 1, JSON.stringify(anaRuido.recomendado));
check('26 · y se dice exactamente por qué', /solo ahorraría 5 ms de 3020/.test(anaRuido.recomendado.because),
  anaRuido.recomendado.because);
/* Y el contraste con el caso del brief, donde sí compensa llegar al final. */
check('26b · mientras que con ahorros de verdad, sí compensa',
  anaMedida.recomendado.parallelism === 3 && anaMedida.curva[2].marginalSavingsMs === 500);
check('27 · sin duraciones NO se recomienda nada: recomendar sin datos es inventar',
  anaVacia.recomendado === undefined && anaVacia.esperado === undefined);
check('28 · pero la curva estructural existe igual', anaVacia.curva.length === 3 &&
  anaVacia.curva.every((p) => p.parallelDurationMs === undefined && p.tandas.length > 0));
check('29 · y la confianza es 0 cuando no hay mediciones',
  anaVacia.curva[0].confidence === 0 && anaVacia.curva[0].provenance === 'default');
check('30 · con mediciones, la confianza sale de la señal',
  anaMedida.curva[0].confidence === 1 && anaMedida.curva[0].provenance === 'measured');

console.log('\n─── E. Límites y recursos ───');

check('31 · maxParallel=1 no deja simultaneidad',
  a4.analizar(EJEMPLO, DUR, { maxParallel: 1 }).curva.every((p) => p.actualWidth === 1));
check('32 · maxParallel=2 no explora más allá',
  a4.analizar(EJEMPLO, DUR, { maxParallel: 2 }).anchoExplorado === 2);
check('33 · maxParallel mayor que lo posible no inventa escalones',
  a4.analizar(EJEMPLO, DUR, { maxParallel: 99 }).curva.length === 3);
check('34 · el presupuesto acota la curva y lo dice',
  a4.analizar(EJEMPLO, DUR, undefined, { maxCandidates: 2 }).curva.length === 2);
/* Recursos: llegan como SEÑAL, no se consultan. */
const conRecursos = a4.analizar(EJEMPLO, [...DUR, sig('resource.availableWorkers', undefined, 2)]);
check('35 · la presión de concurrencia sale de una señal, no de mirar infraestructura',
  conRecursos.risks.some((r) => r.kind === 'concurrency_pressure'),
  conRecursos.risks.map((r) => r.kind).join(', '));
check('36 · sin esa señal no se afirma que haya presión',
  !anaMedida.risks.some((r) => r.kind === 'concurrency_pressure'));
check('37 · un abanico grande es un riesgo declarado',
  a4.analizar(ancho, []).risks.some((r) => r.kind === 'fan_out'));
check('38 · un punto de sincronización, también',
  a4.analizar(EJEMPLO, DUR).risks.some((r) => r.kind === 'synchronization_bottleneck'));
check('39 · y con 3 a la vez aparece la amplificación del fallo',
  anaMedida.risks.some((r) => r.kind === 'failure_amplification') &&
  anaMedida.risks.some((r) => r.kind === 'recovery_complexity'));
check('40 · ningún riesgo se presenta como probabilidad',
  anaMedida.risks.every((r) => ['bajo', 'medio', 'alto'].includes(r.severity)));

console.log('\n─── F. Variantes y la cadena ───');

const { variantes, analisis } = a4.variantes(EJEMPLO, DUR);
check('41 · cada punto útil de la curva es una variante', variantes.length === 3, String(variantes.length));
check('42 · todas llevan LOS MISMOS pasos: A4 no inventa trabajo',
  variantes.every((v) => igual(v.steps.map((s) => s.id), EJEMPLO.steps.map((s) => s.id))));
check('43 · y el ahorro esperado se escribe en el ParallelGroup que A3 dejó vacío',
  variantes[2].parallelGroups[0].expectedSavingsMs === 1000 &&
  variantes[2].parallelGroups[0].maxConcurrency === 3,
  JSON.stringify(variantes[2].parallelGroups[0]));
check('44 · sin duraciones, `expectedSavingsMs` NO se rellena',
  a4.variantes(EJEMPLO, []).variantes.every((v) => v.parallelGroups.every((g) => g.expectedSavingsMs === undefined)));
/* Una cadena lineal: todos los escalones dan la misma disposición. */
const cadena = tarea('C', [paso('a'), paso('b', 'text.generate', ['a']), paso('c', 'text.generate', ['b'])]);
check('45 · en una cadena no hay variantes que inventar', a4.variantes(cadena, []).variantes.length === 1);

/* A4 → A3 → A1, sin traducir nada. */
const estrategias = a3.proponer(variantes, DUR);
check('46 · A3 convierte las variantes de A4 en estrategias', estrategias.estrategias.length >= 2,
  String(estrategias.estrategias.length));
const decision = a1.decidir({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' },
  options: estrategias.estrategias, signals: estrategias.signals,
});
check('47 · y A1 elige la más rápida de verdad',
  decision.status === 'decided' && decision.selected.expected.latencyMs === 3700,
  String(decision.selected?.expected?.latencyMs));
check('48 · A4 NO elige: no hay puntuación ni pesos en esta capa',
  !/pesosNormalizados|puntuar\(|ordenarPorPolitica|StrategyScore/.test(
    sinComentarios(leer('functions/src/core/algorithm/parallelization-engine.ts'))));
check('49 · y no ejecuta: ni Promise.all, ni worker, ni cola, ni despacho',
  !/Promise\.all|new Worker|queue|dispatch|StepDispatch/i.test(
    sinComentarios(leer('functions/src/core/algorithm/parallelization-engine.ts')) +
    sinComentarios(leer('functions/src/core/algorithm/parallelization.ts'))));

console.log('\n─── G. Determinismo y propiedades ───');

const doce = Array.from({ length: 12 }, () => a4.analizar(EJEMPLO, DUR, { maxParallel: 3 }));
check('50 · doce corridas idénticas, campo por campo', doce.every((r) => igual(r, doce[0])));
const barajado = tarea('T', [...EJEMPLO.steps].reverse());
check('51 · barajar la entrada no cambia el resultado',
  igual(a4.analizar(barajado, DUR).curva.map((p) => p.tandas), doce[0].curva.map((p) => p.tandas)));
for (const prohibido of ['Math.random', 'Date.now', 'fetch(', 'firebase', 'process.env']) {
  const donde = ['parallelization.ts', 'parallelization-engine.ts']
    .filter((f) => sinComentarios(leer(`functions/src/core/algorithm/${f}`)).includes(prohibido));
  check(`52 · nada de «${prohibido}»`, donde.length === 0, donde.join(',') || 'ninguno');
}

let violan = 0; let repetidos = 0; let ahorroMayor = 0; let infinitos = 0;
for (let k = 1; k <= 6; k++) {
  const a = a4.analizar(EJEMPLO, DUR, { maxParallel: k });
  for (const p of a.curva) {
    if (p.actualWidth > k) violan++;
    const plano = p.tandas.flat();
    if (new Set(plano).size !== plano.length) repetidos++;
    if (typeof p.savingsMs === 'number' && p.savingsMs > p.baselineDurationMs) ahorroMayor++;
    if (typeof p.speedup === 'number' && !Number.isFinite(p.speedup)) infinitos++;
  }
}
check('53 · PROPIEDAD · ninguna disposición supera maxParallel', violan === 0);
check('54 · PROPIEDAD · ninguna tarea aparece dos veces en una disposición', repetidos === 0);
check('55 · PROPIEDAD · el ahorro nunca supera el baseline', ahorroMayor === 0);
check('56 · PROPIEDAD · la aceleración nunca es infinita', infinitos === 0);
/* Ninguna dependencia se ejecuta después de quien la necesita. */
let desordenadas = 0;
for (const p of anaMedida.curva) {
  const cuando = new Map(p.tandas.flatMap((t, i) => t.map((id) => [id, i])));
  for (const s of EJEMPLO.steps) for (const d of s.dependsOn ?? []) if (cuando.get(d) >= cuando.get(s.id)) desordenadas++;
}
check('57 · PROPIEDAD · paralelizar nunca elimina una dependencia', desordenadas === 0);

/* Lo previsto frente a lo que pase: la entrada de A7. */
const comparado = A.compararAhorro(anaMedida.esperado, { parallelDurationMs: 3500 });
check('58 · lo previsto se puede comparar con lo ocurrido',
  comparado.savingsDeltaMs === 200 && comparado.baselineAsumido === true,
  JSON.stringify(comparado));
check('59 · y se dice cuándo el baseline fue asumido, no medido',
  A.compararAhorro(anaMedida.esperado, { parallelDurationMs: 3500, baselineDurationMs: 4800 }).baselineAsumido === false);
check('60 · sin dato observado no se compara nada', A.compararAhorro(anaMedida.esperado, {}) === undefined);

console.log('\n─── H. Los sabotajes ───');

check('61 · SABOTAJE · ignorar maxParallel → se nota',
  a4.analizar(EJEMPLO, DUR, { maxParallel: 1 }).curva.every((p) => p.actualWidth === 1));
check('62 · SABOTAJE · un grupo con una dependencia dentro → el DAG lo impide',
  a4.analizar(tarea('X', [paso('a'), paso('b', 'text.generate', ['a'])]), []).curva
    .every((p) => !p.tandas.some((t) => t.includes('a') && t.includes('b'))));
check('63 · SABOTAJE · un ciclo → no hay curva',
  a4.analizar(tarea('X', [paso('a', 'text.generate', ['b']), paso('b', 'text.generate', ['a'])]), []).curva.length === 0);
check('64 · SABOTAJE · dependencia inexistente → tampoco',
  a4.analizar(tarea('X', [paso('a'), paso('b', 'text.generate', ['fantasma'])]), []).problemas.length > 0);
check('65 · SABOTAJE · inventar latencia → hoy queda desconocida',
  anaVacia.curva.every((p) => p.parallelDurationMs === undefined));
check('66 · SABOTAJE · inventar ahorro → tampoco',
  anaVacia.curva.every((p) => p.savingsMs === undefined) && anaVacia.metricas.expectedSavingsMs === undefined);
check('67 · SABOTAJE · convertir una latencia ausente en 0 → se nota',
  a4.analizar(EJEMPLO, DUR.slice(0, 4)).curva.every((p) => p.parallelDurationMs === undefined));
check('68 · SABOTAJE · afirmar que paralelizar abarata → A4 no toca el coste',
  !/cost|coste/i.test(sinComentarios(leer('functions/src/core/algorithm/parallelization.ts')).replace(/costProfile/g, '')));
const FUENTES = ['parallelization.ts', 'parallelization-engine.ts'].map((f) => ({ f, src: leer(`functions/src/core/algorithm/${f}`) }));
for (const [que, palabras] of [
  /* Sin el paréntesis: se usan como regex y 'avanzar(' es un grupo sin cerrar. */
  ['Orchestrator', ['crearOrchestrator', 'OrchestratorDecision', 'avanzarPaso']],
  ['Job Engine', ['crearJob', 'JobStore', 'enqueue']],
  ['un proveedor', ['elevenlabs', 'gemini', 'seedance', 'openai', 'deepseek', 'minimax']],
  ['Credits', ['spendCredits', 'creditsBalance', 'holdCredits']],
  ['Asset', ['createAsset', 'materialesDeResultado']],
  ['el Router', ['crearRouter', 'RoutingDecision', 'RouterPolicy']],
]) {
  const donde = FUENTES.filter(({ src }) => palabras.some((p) => new RegExp(p, 'i').test(sinComentarios(src)))).map((x) => x.f);
  check(`69 · A4 no toca ${que}`, donde.length === 0, donde.join(',') || 'ninguno');
}
check('70 · y no importa nada de fuera del Core',
  FUENTES.flatMap(({ src }) => [...sinComentarios(src).matchAll(/from '([^']+)'/g)].map((m) => m[1]))
    .every((r) => r.startsWith('.')));

console.log('\n─── I. Rendimiento ───');

const medir = (capas, anchoN) => {
  const steps = []; let previa = [];
  for (let c = 0; c < capas; c++) {
    const actual = [];
    for (let k = 0; k < anchoN; k++) {
      const id = `n${c}_${k}`;
      steps.push(paso(id, 'text.generate', previa.length ? [previa[0]] : undefined));
      actual.push(id);
    }
    previa = actual;
  }
  const t = tarea('P', steps);
  const se = steps.map((s) => sig('step.latencyMs', s.id, 100));
  a4.analizar(t, se, undefined, { maxDepth: 32 });
  const ini = process.hrtime.bigint();
  for (let i = 0; i < 10; i++) a4.analizar(t, se, undefined, { maxDepth: 32 });
  return [steps.length, Number(process.hrtime.bigint() - ini) / 10 / 1e6];
};
const tiempos = [[2, 5], [5, 10], [10, 10], [8, 32]].map(([c, w]) => medir(c, w));
for (const [pasos, ms] of tiempos) console.log(`   ${String(pasos).padStart(3)} pasos → ${ms.toFixed(2)} ms`);
check('71 · 256 pasos se analizan en menos de 150 ms', tiempos[3][1] < 150, `${tiempos[3][1].toFixed(2)} ms`);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA4: dice cuánto paraleliz'.concat('ar merece la pena, y no ejecuta nada'));
process.exit(failures ? 1 : 0);
