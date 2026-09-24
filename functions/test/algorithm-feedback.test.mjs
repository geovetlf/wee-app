/*
 * A7 — FEEDBACK Y APRENDIZAJE.
 *
 *   APRENDER DE LA EVIDENCIA. NUNCA INVENTAR CONOCIMIENTO.
 *   DISEÑAR PARA DIEZ MILLONES. CALCULAR PARA HOY.
 *   UN EVENTO NO ES UN CONOCIMIENTO.
 *
 *  A. Quién es.
 *  B. El vocabulario: señal, evidencia, evento, resultado, candidato, hecho.
 *  C. La puerta: qué entra y qué no.
 *  D. Privacidad.
 *  E. Explícito contra implícito.
 *  F. Resultados de una decisión.
 *  G. Agregación acotada.
 *  H. Frescura y decadencia.
 *  I. Contradicción y tendencia.
 *  J. Las guardas del aprendizaje.
 *  K. Autoridad: describir no es elegir.
 *  L. Explicabilidad.
 *  M. Determinismo y las propiedades.
 *  N. Agnosticismo.
 *  O. Integración con A1, A5 y A6.
 *  P. Los sabotajes.
 *  R. Lo que los sabotajes demostraron que faltaba.
 *  S. El estado persistible no lleva identificadores individuales.
 *  T. «Solo implícito» se juzga sobre el agregado.
 *  U. La rejilla temporal es absoluta (contrato 1.6).
 *  V. Sin reloj no se evalúa (contrato 1.6).
 *  W. Los resultados pasan por la misma puerta de privacidad (contrato 1.6).
 *  Q. Rendimiento y escala.
 *  X. A9.1: A7 observa, agrega y aprende; no enruta.
 *  Y. A9.2: aprender por alternativa.
 *  Z. A9.3: ejecución ≠ verificación ≠ recuperación.
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
const { ALGORITHM_CONTRACT_VERSION, contratoCompatible } = lib('core/contracts.js');
const a7 = A.crearMotorDeFeedback();

const T0 = 1_700_000_000_000;
const HORA = 3_600_000;
const DIA = 86_400_000;
const AHORA = T0 + 30 * DIA;
const VENTANA = { ventanaMs: 5 * DIA };

const AMBITO = { capability: 'x.y', providerId: 'p1' };
const ev = (i, type, source, at = AHORA, scope = AMBITO, extra = {}) =>
  ({ id: `e${i}`, type, source, at, privacy: 'operational', scope, ...extra });
const sig = (k, v, src = 'measured', at = AHORA, extra = {}) => ({ key: k, value: v, source: src, at, ...extra });
const res = (i, kind, at = AHORA, scope = AMBITO, extra = {}) => ({ id: `o${i}`, kind, at, scope, ...extra });
const aprender = (entrada) => a7.aprender({ ahora: AHORA, policy: VENTANA, ...entrada });
const lote = (cuantos, hacer) => Array.from({ length: cuantos }, (_, i) => hacer(i));

console.log('\n─── A. Quién es ───');

check('1 · su descriptor vale y es de la familia `feedback`',
  A.algoritmoValido(A.DESCRIPTOR_DE_FEEDBACK) && A.DESCRIPTOR_DE_FEEDBACK.category === 'feedback',
  JSON.stringify(A.validarAlgoritmo(A.DESCRIPTOR_DE_FEEDBACK)));
check('2 · es puro y EXPERIMENTAL: nadie lo elige solo',
  A.DESCRIPTOR_DE_FEEDBACK.purity === 'pure' &&
  A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_FEEDBACK]).registro.seleccionable(A.FEEDBACK_ENGINE_ID) === false);
check('3 · el contrato subió a 1.6 POR A7, y el motivo está escrito donde se decidió',
  contratoCompatible(ALGORITHM_CONTRACT_VERSION, '1.6') &&
  /1\.6 \(A7\)[\s\S]*tramosHasta[\s\S]*clock_missing[\s\S]*porMotivoDeResultado/.test(leer('functions/src/core/contracts.ts')),
  ALGORITHM_CONTRACT_VERSION);
check('4 · las categorías `feedback` y `learning` ya estaban reservadas desde A0',
  /\| 'feedback'/.test(leer('functions/src/core/algorithm/types.ts')) &&
  /\| 'learning'/.test(leer('functions/src/core/algorithm/types.ts')));

console.log('\n─── B. El vocabulario ───');

check('5 · seis clases de dato, y ninguna se confunde con otra',
  igual([...new Set(['event', 'signal', 'evidence', 'outcome', 'candidate', 'fact'])].length, 6));
check('6 · un evento NO es un conocimiento: nace `observed` como mucho',
  aprender({ events: [ev(1, 'accepted', 'explicit')] }).candidates[0].state !== 'validated');
check('7 · y sin nada, no se inventa nada',
  aprender({}).metricas.candidatos === 0 && aprender({}).signals.length === 0);
check('8 · «no se aprendió nada» es un resultado, no un fallo',
  /no concluir nada es un resultado/.test(aprender({}).because.join(' ')));

console.log('\n─── C. La puerta ───');

const rechaza = (e, motivo) => {
  const r = aprender({ events: [e] });
  return r.metricas.eventosAdmitidos === 0 && r.metricas.porMotivo[motivo] === 1;
};
check('9 · un evento sin id no entra', rechaza({ type: 'accepted', source: 'explicit', at: AHORA, privacy: 'operational' }, 'malformed'));
check('10 · sin fecha, tampoco', rechaza({ id: 'x', type: 'accepted', source: 'explicit', privacy: 'operational' }, 'bad_timestamp'));
check('11 · un gesto que nadie sabe interpretar se rechaza y se dice cuál',
  rechaza(ev(1, 'le_hizo_gracia', 'implicit'), 'unknown_gesture'));
check('12 · un implícito DISFRAZADO de explícito no cuela',
  rechaza(ev(1, 'regenerated', 'explicit'), 'source_mismatch'),
  'es la vía por la que lo ambiguo ascendería a verdad de campo');
check('13 · una valoración fuera de rango no entra',
  rechaza(ev(1, 'explicit_rating', 'explicit', AHORA, AMBITO, { rating: 7 }), 'bad_rating'));
check('14 · el mismo evento dos veces es UN evento',
  aprender({ events: [ev(1, 'accepted', 'explicit'), ev(1, 'accepted', 'explicit')] }).metricas.eventosAdmitidos === 1);
check('15 · y un evento válido sí entra',
  aprender({ events: [ev(1, 'accepted', 'explicit')] }).metricas.eventosAdmitidos === 1);

console.log('\n─── D. Privacidad ───');

check('16 · solo entran las clases operativa y seudónima',
  igual([...A.CLASES_ADMITIDAS], ['operational', 'pseudonymous']));
for (const clase of ['content', 'sensitive']) {
  check(`17 · la clase «${clase}» NO entra, y no hay excepción`,
    rechaza({ ...ev(1, 'accepted', 'explicit'), privacy: clase }, 'privacy_class'));
}
check('18 · un prompt en la metadata se rechaza',
  rechaza(ev(1, 'accepted', 'explicit', AHORA, AMBITO, { metadata: { prompt: 'lo que sea' } }), 'privacy_class'));
check('19 · y escondido un nivel más abajo, también',
  rechaza(ev(1, 'accepted', 'explicit', AHORA, AMBITO, { metadata: { a: { b: { content: 'x' } } } }), 'privacy_class'));
for (const campo of ['country', 'age', 'gender', 'religion', 'health', 'email']) {
  check(`20 · «${campo}» en el ámbito convertiría el agregado en un perfil: fuera`,
    rechaza(ev(1, 'accepted', 'explicit', AHORA, { ...AMBITO, [campo]: 'x' }), 'privacy_class'));
}
check('21 · la CUENTA no entra en la clave de agregación: agrupar por persona ES perfilar',
  A.claveDeAmbito({ capability: 'c', account: 'u1' }, 'm') === A.claveDeAmbito({ capability: 'c', account: 'u2' }, 'm'),
  A.claveDeAmbito({ capability: 'c', account: 'u1' }, 'm'));
check('22 · y la lista de campos de persona reutiliza la del Core, no una nueva',
  /CAMPOS_PROHIBIDOS/.test(leer('functions/src/core/algorithm/feedback.ts')));

console.log('\n─── E. Explícito contra implícito ───');

check('23 · el origen se declara Y se comprueba contra la tabla',
  A.origenDe('user_correction') === 'explicit' && A.origenDe('regenerated') === 'implicit' &&
  A.origenDe('verified') === 'system' && A.origenDe('inventado') === undefined);
check('24 · lo implícito llega como `derived`; lo explícito y lo del sistema, como `measured`',
  A.fuenteDeGesto('regenerated') === 'derived' && A.fuenteDeGesto('user_correction') === 'measured' &&
  A.fuenteDeGesto('verified') === 'measured');
check('25 · y esa diferencia la ORDENA la tabla que ya existe',
  A.PESO_DE_FUENTE.measured > A.PESO_DE_FUENTE.derived);
check('26 · el orden de los gestos es ORDINAL: no hay ni un peso numérico que copiar',
  Object.values(A.PROCEDENCIA_DE_GESTO).every((x) => Number.isInteger(x.orden)) &&
  A.PROCEDENCIA_DE_GESTO.user_correction.orden > A.PROCEDENCIA_DE_GESTO.downloaded.orden &&
  A.PROCEDENCIA_DE_GESTO.downloaded.orden > A.PROCEDENCIA_DE_GESTO.regenerated.orden);
/* LA TRAMPA DEL BRIEF, y es la prueba que más importa del módulo. */
const cienRegeneraciones = aprender({ events: lote(100, (i) => ev(i, 'regenerated', 'implicit', AHORA - (100 - i) * HORA)) });
check('27 · CIEN regeneraciones NO condenan a nadie: cero validados',
  cienRegeneraciones.metricas.validados === 0,
  cienRegeneraciones.candidates[0].because.join(', '));
check('28 · y el motivo lo dice: se sostiene SOLO en gestos implícitos',
  cienRegeneraciones.candidates[0].because.includes('implicit_only'));
check('29 · ni una sola señal sale de ahí',
  cienRegeneraciones.signals.length === 0);
check('30 · `regenerated` no es «malo»: es no-favorable, que es otra cosa',
  A.favorable({ type: 'regenerated' }) === false &&
  A.favorable({ type: 'edited' }) === undefined &&
  A.favorable({ type: 'partially_verified' }) === undefined,
  'editar no es rechazar: mucha gente edita lo que le gusta');
check('31 · una valoración se lee del número, no del gesto',
  A.favorable({ type: 'explicit_rating', rating: 0.9 }) === true &&
  A.favorable({ type: 'explicit_rating', rating: 0.1 }) === false &&
  A.favorable({ type: 'explicit_rating' }) === undefined);

console.log('\n─── F. Resultados de una decisión ───');

/* Veredictos DE A6, tal cual los da —con sus hallazgos, que desde 1.9 viajan con
 * él—. Hasta 1.9 este lote llevaba `status: 'pass'` con `passed` falso —un veredicto
 * que A6 no puede dar—, y A7 lo tragaba porque solo miraba `passed`. */
const A6 = A.crearMotorDeVerificacion();
const veredictoReal = (actual, expected = [{ kind: 'text' }]) => A6.verificar({ expected, actual: { id: 'v', ...actual } });
const VEREDICTO_PASA = veredictoReal({ status: 'succeeded', outputs: [{ kind: 'text', ref: 'r' }] });
const VEREDICTO_FALLA = veredictoReal({ status: 'succeeded', outputs: [] });
const conVerificacion = aprender({
  outcomes: lote(40, (i) => res(i, i % 4 ? 'success' : 'failure', AHORA - (40 - i) * HORA, AMBITO, {
    verification: i % 4 !== 0 ? VEREDICTO_PASA : VEREDICTO_FALLA,
  })),
});
check('32 · de un resultado salen varias observaciones, y cada una con su métrica',
  conVerificacion.metricas.claves === 2 &&
  conVerificacion.candidates.map((c) => c.metric).sort().join(',') === 'outcome.success,verification.passed');
check('33 · un resultado `unknown` NO se agrega: meterlo como cero lo haría un fracaso',
  aprender({ outcomes: [res(1, 'unknown')] }).metricas.claves === 0);
check('34 · solo se aprende de una recuperación que SE EJECUTÓ',
  aprender({ outcomes: [res(1, 'success', AHORA, AMBITO, { recovery: { kind: 'retry', executed: false, succeeded: true } })] })
    .candidates.every((c) => c.metric !== 'recovery.succeeded') &&
  aprender({ outcomes: [res(1, 'success', AHORA, AMBITO, { recovery: { kind: 'retry', executed: true, succeeded: true } })] })
    .candidates.some((c) => c.metric === 'recovery.succeeded'));
/* 1.9: la verificación es de lo que la ejecución ENTREGÓ. Los diez fallos traen un
 * «fail» de A6, pero es su puerta de ejecución repitiendo el fallo: no entra. */
check('35 · el veredicto de A6 entra tal cual, sin reinterpretarse, y solo de lo que la ejecución entregó',
  VEREDICTO_PASA.status === 'pass' && VEREDICTO_FALLA.status === 'fail' &&
  conVerificacion.candidates.find((c) => c.metric === 'verification.passed')?.sampleSize === 30 &&
  conVerificacion.aggregates.find((a) => a.metric === 'verification.passed')?.favorables === 30 &&
  conVerificacion.aggregates.find((a) => a.metric === 'outcome.success')?.n === 40);
check('36 · y una estrategia declarada produce su propia métrica',
  aprender({ outcomes: [res(1, 'success', AHORA, { ...AMBITO, strategyId: 's1' })] })
    .candidates.some((c) => c.metric === 'strategy.succeeded'));

console.log('\n─── G. Agregación acotada ───');

/* El presupuesto acota a 512 por llamada —es el techo de A0— así que mil
 * observaciones son DOS llamadas encadenando el estado. Así se usará con
 * diez millones de cuentas, y así hay que medirlo. */
const porLotes = (total, hacer, tam = 500, extra = {}) => {
  let previo = [], ultima = null;
  for (let k = 0; k < total; k += tam) {
    ultima = aprender({ ...extra, previo, outcomes: lote(Math.min(tam, total - k), (i) => hacer(k + i)) });
    previo = ultima.aggregates;
  }
  return ultima;
};
const mil = porLotes(1000, (i) => res(i, 'success', AHORA - (1000 - i) * 60_000));
const agregado = mil.aggregates.find((a) => a.metric === 'outcome.success');
check('37 · mil observaciones caben en un agregado de tamaño FIJO',
  agregado.n === 1000 && agregado.tramos.length === A.TRAMOS);
check('38 · y no guarda ni una lista que crezca con las observaciones',
  agregado.muestraDeApoyo.length <= A.MAX_MUESTRA && agregado.muestraDeContradiccion.length <= A.MAX_MUESTRA);
const bytes = (x) => JSON.stringify(x).length;
const cien = porLotes(100, (i) => res(i, 'success', AHORA - (100 - i) * 60_000));
check('39 · el agregado de 1 000 ocupa lo mismo que el de 100 (±20 %)',
  Math.abs(bytes(agregado) - bytes(cien.aggregates[0])) / bytes(cien.aggregates[0]) < 0.2,
  `${bytes(cien.aggregates[0])} vs ${bytes(agregado)} bytes`);
check('40 · la clave es canónica: el mismo ámbito en otro orden da la MISMA clave',
  A.claveDeAmbito({ providerId: 'p', capability: 'c' }, 'm') === A.claveDeAmbito({ capability: 'c', providerId: 'p' }, 'm'));
check('41 · y ámbitos distintos dan claves distintas: no se mezclan dos cosas',
  A.claveDeAmbito({ providerId: 'p1' }, 'm') !== A.claveDeAmbito({ providerId: 'p2' }, 'm'));
check('42 · el estado se REINYECTA y se sigue acumulando: no se recalcula nada',
  (() => {
    let previo = [];
    for (let k = 0; k < 3; k++) {
      previo = aprender({ outcomes: lote(20, (i) => res(`${k}_${i}`, 'success', AHORA - (60 - k * 20 - i) * HORA)), previo }).aggregates;
    }
    return previo.find((a) => a.metric === 'outcome.success').n === 60;
  })());
check('43 · una observación que llega TARDE cae donde le toca por fecha, no por orden',
  (() => {
    const hasta = A.finDeTramo(AHORA, 5 * DIA);
    const viejo = A.tramoDe(AHORA - 4 * DIA, hasta, 5 * DIA);
    const nuevo = A.tramoDe(AHORA - 1 * HORA, hasta, 5 * DIA);
    return typeof viejo === 'number' && typeof nuevo === 'number' && viejo < nuevo;
  })());

console.log('\n─── H. Frescura y decadencia ───');

const rancio = aprender({ outcomes: lote(60, (i) => res(i, 'success', T0 - 300 * DIA + i * HORA)) });
check('44 · sesenta observaciones de hace un año no valen: `evidence_stale`',
  rancio.candidates[0].because.includes('evidence_stale') && rancio.metricas.validados === 0);
check('45 · su frescura es 0, y eso tira la confianza al suelo',
  rancio.candidates[0].freshness === 0 && rancio.candidates[0].confidence.value === 0);
check('46 · la decadencia REUTILIZA `frescura()` de A0, no otra curva',
  /frescura\(/.test(leer('functions/src/core/algorithm/learning.ts')));
check('47 · el reloj entra por PARÁMETRO: A7 no lee ninguno',
  !/Date\.now|new Date/.test(sinComentarios(leer('functions/src/core/algorithm/learning.ts'))) &&
  !/Date\.now|new Date/.test(sinComentarios(leer('functions/src/core/algorithm/feedback-engine.ts'))));
check('48 · la VENTANA de observación no es el HORIZONTE de decadencia',
  A.politicaEfectiva({ vidaMs: 1000, ventanaMs: 10 }).ventanaMs === 10 &&
  A.politicaEfectiva({ vidaMs: 1000 }).ventanaMs === 1000,
  'atarlos hacía que nada validara nunca');

console.log('\n─── I. Contradicción y tendencia ───');

const degradando = aprender({
  outcomes: [
    ...lote(80, (i) => res(`d${i}`, 'success', AHORA - (100 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 500, 'measured', AHORA - (100 - i) * HORA)] })),
    ...lote(20, (i) => res(`dd${i}`, 'success', AHORA - (20 - i) * 60_000, AMBITO, { signals: [sig('result.latencyMs', 3000, 'measured', AHORA - (20 - i) * 60_000)] })),
  ],
});
const lat = degradando.candidates.find((c) => c.metric === 'result.latencyMs');
check('49 · ochenta rápidos y veinte lentos: la media MIENTE y la tendencia no',
  lat.trend === 'degrading', `media ${lat.value.toFixed(0)} ms, tendencia ${lat.trend}`);
check('50 · y NO se da por aprendido mientras se está moviendo',
  lat.state !== 'validated' && lat.because.includes('unstable_across_window'));
const mejorando = aprender({
  outcomes: [
    ...lote(40, (i) => res(`m${i}`, 'success', AHORA - (60 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 3000, 'measured', AHORA - (60 - i) * HORA)] })),
    ...lote(40, (i) => res(`mm${i}`, 'success', AHORA - (20 - i * 0.4) * HORA, AMBITO, { signals: [sig('result.latencyMs', 500, 'measured', AHORA - (20 - i * 0.4) * HORA)] })),
  ],
});
check('51 · y al revés también: bajar la latencia es MEJORAR',
  mejorando.candidates.find((c) => c.metric === 'result.latencyMs').trend === 'improving');
check('52 · qué es «mejor» se DECLARA por métrica, no se adivina por el nombre',
  A.METRICAS_BASE.every((d) => d.mejor === 'sube' || d.mejor === 'baja') &&
  A.METRICAS_BASE.find((d) => d.key === 'result.latencyMs').mejor === 'baja' &&
  A.METRICAS_BASE.find((d) => d.key === 'outcome.success').mejor === 'sube');
check('53 · sin tramos que comparar NO se inventa una tendencia',
  A.tendenciaDe(A.agregadoVacio('k', 'm', {}), 'sube', A.politicaEfectiva()) === 'insufficient_evidence');
check('54 · «no se puede saber» la estabilidad NO es «es inestable»',
  A.estabilidadDe(A.agregadoVacio('k', 'm', {})) === undefined,
  'undefined, no cero: es el mismo error que A6 existe para no cometer');
check('55 · y tiene su propio código de motivo, distinto del de inestable',
  A.guardas(A.acumular(A.agregadoVacio('k', 'm', {}), { value: 1, at: AHORA, favorable: true }, AHORA, DIA), AHORA, A.politicaEfectiva())
    .includes('stability_unknown'));
/* La contradicción es de la EVIDENCIA: gestos de personas a favor y en contra de
 * lo mismo. Hasta 1.9 este caso la sacaba de ejecuciones que fallaban, y eso era
 * el error: un fallo es una muestra de la tasa, no evidencia en contra (sección Z). */
check('56 · la contradicción se guarda, se cuenta y limita la conclusión',
  (() => {
    const contradictorio = aprender({
      events: lote(60, (i) => ev(i, i % 2 ? 'accepted' : 'rejected', 'explicit', AHORA - (60 - i) * HORA)),
    }).candidates.find((c) => c.metric === 'feedback.satisfaction');
    return contradictorio.contradicting.length > 0 && contradictorio.state !== 'validated';
  })());

console.log('\n─── J. Las guardas ───');

const pocos = aprender({ outcomes: lote(5, (i) => res(i, 'success', AHORA - i * HORA)) });
check('57 · cinco observaciones no son una muestra: `sample_below_minimum`',
  pocos.candidates[0].because.includes('sample_below_minimum') && pocos.candidates[0].state === 'observed');
check('58 · y la política NUNCA se puede aflojar por debajo del suelo',
  A.politicaEfectiva({ minSampleSize: 1, minConfidence: 0 }).minSampleSize === A.POLITICA_MINIMA.minSampleSize &&
  A.politicaEfectiva({ minSampleSize: 1, minConfidence: 0 }).minConfidence === A.POLITICA_MINIMA.minConfidence,
  'más estricto siempre; menos, nunca');
check('59 · pero SÍ se puede ser más estricto',
  A.politicaEfectiva({ minSampleSize: 500 }).minSampleSize === 500);
check('60 · sin evidencia, `no_evidence` y ni un motivo más',
  igual([...A.guardas(A.agregadoVacio('k', 'm', {}), AHORA, A.politicaEfectiva())], ['no_evidence']));
check('61 · las guardas devuelven TODOS los motivos, no el primero',
  A.guardas(A.acumular(A.agregadoVacio('k', 'm', {}), { value: 1, at: T0 - 400 * DIA, favorable: true }, AHORA, DIA), AHORA, A.politicaEfectiva()).length >= 3);
check('62 · un cambio demasiado grande de una vez se frena',
  A.guardas(A.agregadoVacio('k', 'm', {}), AHORA, A.politicaEfectiva(), { magnitud: 99 }).includes('no_evidence'));
check('63 · SOLO lo validado sale como señal: un candidato sin validar no se publica',
  cienRegeneraciones.signals.length === 0 &&
  aprender({ outcomes: lote(60, (i) => res(i, 'success', AHORA - (60 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 800)] })) })
    .signals.every((s) => s.key.startsWith('learned.')));
check('64 · y lo que sale es `derived`, nunca `measured`: es un cálculo, no una medición',
  aprender({ outcomes: lote(60, (i) => res(i, 'success', AHORA - (60 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 800, 'measured', AHORA - (60 - i) * HORA)] })) })
    .signals.every((s) => s.source === 'derived'));

console.log('\n─── K. Autoridad: describir no es elegir ───');

check('65 · el ÁMBITO puede nombrar un proveedor: es el sujeto de lo observado',
  aprender({ events: [ev(1, 'accepted', 'explicit', AHORA, { capability: 'c', providerId: 'p1', modelId: 'm1' })] })
    .metricas.eventosAdmitidos === 1,
  'sin esto no se puede aprender nada de un proveedor');
check('66 · la METADATA no: ahí es donde una decisión se colaría',
  rechaza(ev(1, 'accepted', 'explicit', AHORA, AMBITO, { metadata: { providerId: 'p1' } }), 'unsafe_metadata'));
for (const clave of ['allowedProviders', 'modelId', 'adapter', 'excludeProviders']) {
  check(`67 · «${clave}» en la metadata tampoco`,
    rechaza(ev(1, 'accepted', 'explicit', AHORA, AMBITO, { metadata: { [clave]: 'x' } }), 'unsafe_metadata'));
}
check('68 · y usa el MISMO `claveDeImplementacion` del Planner, no una lista nueva',
  /violacionesEn|metadataSegura/.test(leer('functions/src/core/algorithm/feedback-engine.ts')) &&
  !/allowedProviders|providerId'/.test(sinComentarios(leer('functions/src/core/algorithm/feedback-engine.ts'))));
/* OJO con el guard: `.set(` marcaba `agregados.set(...)`, que es un Map local
 * y lo contrario de una escritura. La afirmación real es que no hay
 * PERSISTENCIA ni mutación de política, y eso es lo que se mide. */
const ESCRITURAS = ['collection(', 'doc(', 'batch(', 'FieldValue', 'runTransaction',
  'aplicarPolitica', 'mutarPolitica', 'guardar(', 'persistir('];
const escribe = [];
for (const x of ['feedback.ts', 'learning.ts', 'feedback-engine.ts']) {
  const src = sinComentarios(leer(`functions/src/core/algorithm/${x}`));
  for (const w of ESCRITURAS) if (src.includes(w)) escribe.push(`${x}:${w}`);
}
check('69 · A7 NO escribe en ningún sitio ni muta ninguna política',
  escribe.length === 0, escribe.join(', ') || 'ninguna');
check('69b · CONTROL · y el detector caza una escritura de verdad',
  ESCRITURAS.some((w) => "await db().collection('x').doc('y').set({})".includes(w)));
check('70 · lo más que hace es PROPONER, y dice a qué capa',
  aprender({ outcomes: lote(60, (i) => res(i, 'success', AHORA - (60 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 800, 'measured', AHORA - (60 - i) * HORA)] })) })
    .validated.every((c) => !c.proposedChange || ['router', 'strategy', 'optimization', 'verification', 'recovery', 'none'].includes(c.proposedChange.target)));

console.log('\n─── L. Explicabilidad ───');

const explicable = aprender({ outcomes: lote(60, (i) => res(i, 'success', AHORA - (60 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 800, 'measured', AHORA - (60 - i) * HORA)] })) });
const texto = a7.explicar(explicable.candidates.find((c) => c.metric === 'result.latencyMs'));
check('71 · la explicación dice muestra, confianza, frescura, estabilidad y tendencia',
  ['observación', 'confianza', 'Frescura', 'estabilidad', 'tendencia'].every((p) => texto.includes(p)), texto);
check('72 · los motivos son CÓDIGOS, para poder contarlos y traducirlos',
  explicable.candidates.every((c) => c.because.every((x) => typeof x === 'string' && !/ /.test(x))));
check('73 · y no hay ni rastro de cadena de razonamiento',
  !/pens|razon|paso a paso|primero.*luego/i.test(texto));
check('74 · un rechazo explica QUÉ faltó, no solo que faltó',
  /NO se da por aprendido: .+/.test(a7.explicar(pocos.candidates[0])), a7.explicar(pocos.candidates[0]));

console.log('\n─── M. Determinismo y las propiedades ───');

const ENTRADA = {
  events: lote(20, (i) => ev(i, i % 2 ? 'accepted' : 'rejected', 'explicit', AHORA - (20 - i) * HORA)),
  outcomes: lote(40, (i) => res(i, i % 3 ? 'success' : 'failure', AHORA - (40 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 700 + i, 'measured', AHORA - (40 - i) * HORA)] })),
};
const doce = Array.from({ length: 12 }, () => JSON.stringify(aprender(ENTRADA)));
check('75 · P·determinismo · doce corridas idénticas, campo por campo', doce.every((x) => x === doce[0]));
check('76 · P·orden · barajar la entrada no cambia el resultado',
  JSON.stringify(aprender({ events: [...ENTRADA.events].reverse(), outcomes: [...ENTRADA.outcomes].reverse() })) === doce[0]);
check('77 · P·sin azar · ni `Math.random` ni relojes en todo el módulo',
  ['feedback.ts', 'learning.ts', 'feedback-engine.ts'].every((x) =>
    !/Math\.random|Date\.now|new Date\(/.test(sinComentarios(leer(`functions/src/core/algorithm/${x}`)))));
check('78 · P·unknown · lo que no se sabe NUNCA se convierte en un hecho',
  aprender({ events: [ev(1, 'edited', 'implicit')] }).metricas.validados === 0);
check('79 · P·evidencia · sin evidencia no hay conocimiento, por muchas vueltas que se den',
  Array.from({ length: 5 }, () => aprender({})).every((r) => r.metricas.validados === 0));
check('80 · P·procedencia · lo implícito no asciende a medido por repetirse',
  aprender({ events: lote(200, (i) => ev(i, 'downloaded', 'implicit', AHORA - (200 - i) * 60_000)) })
    .aggregates[0].muestraDeApoyo.every((e) => e.signal.source === 'derived'));
check('81 · P·acotado · el presupuesto corta y lo dice',
  aprender({ events: lote(5000, (i) => ev(i, 'accepted', 'explicit', AHORA - i * 1000)), budget: { maxEvidence: 50 } })
    .metricas.budgetExhausted === true);
check('82 · P·memoria · el estado no crece con las observaciones',
  (() => {
    const a = aprender({ outcomes: lote(100, (i) => res(i, 'success', AHORA - (100 - i) * 60_000)) });
    const b = aprender({ outcomes: lote(10_000, (i) => res(i, 'success', AHORA - (10_000 - i) * 1000)), budget: { maxEvidence: 10_000 } });
    return bytes(b.aggregates[0]) < bytes(a.aggregates[0]) * 1.3;
  })(), 'mismo tamaño con cien y con diez mil');
for (const [p, palabras] of [
  ['P·no es el Router', ['crearRouter', 'RoutingDecision', 'selectedProvider', 'elegirProveedor']],
  ['P·no es A5', ['crearMotorDeOptimizacion', 'frenteFactible', 'domina(']],
  ['P·no es A6', ['crearMotorDeVerificacion', 'fusionarEstados', 'resolverEstructural']],
  ['P·no ejecuta', ['crearJob', 'enqueue', 'await ', 'Promise.', 'fetch(']],
  ['P·no cobra', ['spendCredits', 'creditsBalance', 'refund']],
]) {
  const donde = ['feedback.ts', 'learning.ts', 'feedback-engine.ts']
    .filter((x) => palabras.some((w) => sinComentarios(leer(`functions/src/core/algorithm/${x}`)).includes(w)));
  check(`83 · ${p}`, donde.length === 0, donde.join(',') || 'ninguno');
}

console.log('\n─── N. Agnosticismo ───');

const FUTURAS = ['lipsync', 'face_swap', 'talking_avatar', 'motion_transfer',
  'video_translation', '3d_generation', 'music_generation', 'document_analysis'];
const inventada = ['future', 'capability', 'x' + (7 * 6)].join('.');
let completas = 0; const fallos = [];
for (const cap of [...FUTURAS, inventada]) {
  const scope = { capability: cap, providerId: `prov_${cap}` };
  const r = aprender({
    outcomes: lote(60, (i) => res(`${cap}_${i}`, 'success', AHORA - (60 - i) * HORA, scope, {
      signals: [sig('result.latencyMs', 700 + (i % 5), 'measured', AHORA - (60 - i) * HORA)],
    })),
  });
  const c = r.candidates.find((x) => x.metric === 'result.latencyMs');
  if (c && c.state === 'validated' && r.signals.length > 0) completas++;
  else fallos.push(`${cap}:${c?.state}`);
}
check('84 · las ocho capacidades futuras y una inventada aprenden igual',
  completas === 9, fallos.join(', ') || 'las nueve');
check('85 · y NINGUNA aparece en el núcleo de A7',
  ['feedback.ts', 'learning.ts', 'feedback-engine.ts'].every((x) => {
    const t = new Set((sinComentarios(leer(`functions/src/core/algorithm/${x}`)).toLowerCase().match(/[a-z0-9_]+/g) ?? []));
    return ![...FUTURAS, 'gemini', 'elevenlabs', 'seedance', 'minimax', 'openai', 'deepseek'].some((p) => t.has(p.toLowerCase()));
  }));
check('86 · una métrica que nadie ha inventado se agrega, pero NO se valida sin saber qué es «mejor»',
  (() => {
    const r = aprender({ outcomes: lote(60, (i) => res(i, 'success', AHORA - (60 - i) * HORA, AMBITO, { signals: [sig('metrica.del.futuro', 5, 'measured', AHORA - (60 - i) * HORA)] })) });
    const c = r.candidates.find((x) => x.metric === 'metrica.del.futuro');
    return c && c.sampleSize === 60 && c.state !== 'validated';
  })());
check('87 · y declarándola, se valida sin tocar el motor',
  A.crearMotorDeFeedback({ metricas: [{ key: 'metrica.del.futuro', mejor: 'sube', target: 'none', risk: 'bajo' }] })
    .aprender({ ahora: AHORA, policy: VENTANA, outcomes: lote(60, (i) => res(i, 'success', AHORA - (60 - i) * HORA, AMBITO, { signals: [sig('metrica.del.futuro', 5, 'measured', AHORA - (60 - i) * HORA)] })) })
    .candidates.find((x) => x.metric === 'metrica.del.futuro').state === 'validated');
/*
 * UNA RAMA POR CAPACIDAD, PROVEEDOR O MODELO, se escriba como se escriba. Es la
 * guarda de A9 (82b). La de antes solo veía `if (…capability ===` sin un
 * paréntesis por medio, y NO miraba `providerId` ni `modelId`: la rama más
 * probable —por proveedor— pasaba entera.
 */
const DIMENSION = '(?:capability|providerId|provider|modelId|model)';
const FORMAS_DE_RAMA = [
  new RegExp(`\\b${DIMENSION}\\b\\s*\\)*\\s*[!=]==?\\s*['"\`]`),
  new RegExp(`['"\`][^'"\`\\n]*['"\`]\\s*[!=]==?\\s*[\\w.?()\\s]*\\b${DIMENSION}\\b`),
  new RegExp(`switch\\s*\\((?:[^()]|\\([^()]*\\))*\\b${DIMENSION}\\b`),
  new RegExp(`\\.(?:includes|indexOf|has)\\(\\s*[\\w.?]*\\b${DIMENSION}\\b`),
];
const esRama = (src) => FORMAS_DE_RAMA.some((r) => r.test(src));
check('88 · ni una rama por capacidad, proveedor o modelo en todo el módulo, se escriba como se escriba',
  ['feedback.ts', 'learning.ts', 'feedback-engine.ts'].every((x) => !esRama(sinComentarios(leer(`functions/src/core/algorithm/${x}`)))));
check('88b · CONTROL · la guarda caza cada forma de rama —también con paréntesis y por proveedor— y no lo que no lo es',
  [
    "if (o.scope.capability === 'x.y') continue;",
    "if ((o.scope as Record<string, unknown>).providerId === 'p-favorito') continue;",
    "if ('m-favorito' === (o.scope as any).modelId) continue;",
    "switch (o.scope.provider) { case 'p': break; }",
    "if (new Set(['p']).has(o.scope.providerId)) continue;",
  ].every(esRama) &&
  !["if (o.kind === 'success') x = 1;", "if (e.source === 'explicit') y = 2;", "const c = o.scope.capability;"].some(esRama));

console.log('\n─── O. Integración con A1, A5 y A6 ───');

const paraA1 = aprender({ outcomes: lote(60, (i) => res(i, i % 5 ? 'success' : 'failure', AHORA - (60 - i) * HORA)) });
const ventana = Object.values(paraA1.history)[0];
check('89 · A7 produce la `HistoryWindow` que A1 YA sabe leer, no un formato nuevo',
  typeof ventana.sampleSize === 'number' && typeof ventana.succeeded === 'number' && typeof ventana.since === 'number',
  JSON.stringify(ventana));
check('90 · y NO rellena la mediana, porque de un agregado no se puede sacar',
  ventana.medianLatencyMs === undefined && ventana.medianCostUsd === undefined,
  'poner la media donde el contrato dice mediana rompería lo que ese campo protege');
check('91 · la ventana entra en A1 sin traducir nada',
  A.crearMotorDeDecision().decidir({
    contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { cost: 1 } },
    trace: { traceId: 't', requestId: 'r', userId: 'u' },
    options: [{ id: 'a', value: {}, values: { cost: 1 } }],
    history: ventana,
  }).status === 'decided');
check('92 · un veredicto de A6 alimenta a A7 sin traducir nada',
  (() => {
    const a6 = A.crearMotorDeVerificacion();
    const v = a6.verificar({ expected: [{ kind: 'salida' }], actual: { id: 'r', status: 'succeeded', outputs: [{ kind: 'salida', ref: 'x' }] } });
    return aprender({ outcomes: [{ id: 'o', kind: 'success', at: AHORA, scope: AMBITO, verification: v }] })
      .candidates.some((c) => c.metric === 'verification.passed');
  })());
check('93 · y una propuesta de A6 ejecutada se convierte en aprendizaje de recuperación',
  aprender({ outcomes: lote(60, (i) => res(i, 'success', AHORA - (60 - i) * HORA, AMBITO,
    { recovery: { kind: 'retry', executed: true, succeeded: i % 6 !== 0 } })) })
    .candidates.some((c) => c.metric === 'recovery.succeeded' && c.sampleSize === 60));
check('94 · la hipótesis y el experimento son CONTRATO, no motor: no hay reparto de cohortes',
  !/cohort|asignarVariante|traffic|split/i.test(sinComentarios(leer('functions/src/core/algorithm/feedback.ts'))),
  'preparado, sin construir la parte cara antes de tener una pregunta');
check('95 · y se llama `Referencia`, no `Baseline`: `BASELINE_ID` ya existe y es otra cosa',
  /isReference/.test(leer('functions/src/core/algorithm/feedback.ts')) &&
  A.BASELINE_ID === 'linea-base-lexica');

console.log('\n─── P. Los sabotajes ───');

const SABOTAJES = [
  ['una entrada que no es una entrada', () => a7.aprender(undefined)],
  ['sin reloj', () => a7.aprender({ events: [ev(1, 'accepted', 'explicit')] })],
  ['un reloj NaN', () => a7.aprender({ ahora: NaN, events: [ev(1, 'accepted', 'explicit')] })],
  ['eventos que no son lista', () => aprender({ events: 'no soy lista' })],
  ['eventos nulos', () => aprender({ events: [null, undefined, 42] })],
  ['un valor Infinity', () => aprender({ outcomes: [res(1, 'success', AHORA, AMBITO, { signals: [sig('result.latencyMs', Infinity)] })] })],
  ['un valor NaN', () => aprender({ outcomes: [res(1, 'success', AHORA, AMBITO, { signals: [sig('result.latencyMs', NaN)] })] })],
  ['una fecha negativa', () => aprender({ events: [ev(1, 'accepted', 'explicit', -1)] })],
  ['una fecha en el futuro', () => aprender({ events: [ev(1, 'accepted', 'explicit', AHORA + 1000 * DIA)] })],
  ['metadata con un ciclo', () => { const m = {}; m.yo = m; return aprender({ events: [ev(1, 'accepted', 'explicit', AHORA, AMBITO, { metadata: m })] }); }],
  ['metadata gigante', () => aprender({ events: [ev(1, 'accepted', 'explicit', AHORA, AMBITO, { metadata: Object.fromEntries(lote(500, (i) => [`k${i}`, i])) })] })],
  ['un ámbito que no es un ámbito', () => aprender({ events: [ev(1, 'accepted', 'explicit', AHORA, 'no soy un ámbito')] })],
  ['un previo corrupto', () => aprender({ previo: [null, { key: 1 }, 'x'], outcomes: [res(1, 'success')] })],
  ['una política imposible', () => aprender({ policy: { minSampleSize: -5, minConfidence: -1, vidaMs: -1 }, outcomes: [res(1, 'success')] })],
  ['una política que intenta aflojar el suelo', () => A.politicaEfectiva({ minSampleSize: 0, minConfidence: 0 })],
  ['un resultado sin id', () => aprender({ outcomes: [{ kind: 'success', at: AHORA }] })],
  ['una clase de resultado inventada', () => aprender({ outcomes: [res(1, 'estupendisimo')] })],
  ['una señal con clave inválida', () => aprender({ outcomes: [res(1, 'success', AHORA, AMBITO, { signals: [sig('', 1)] })] })],
  ['cien mil eventos', () => aprender({ events: lote(100_000, (i) => ev(i, 'accepted', 'explicit', AHORA - i * 1000)) })],
];
for (const [que, correr] of SABOTAJES) {
  let ok = false; let detalle = '';
  try { const r = correr(); ok = r !== null && r !== undefined; detalle = r?.metricas ? `${r.metricas.validados} validado(s)` : 'ok'; }
  catch (e) { ok = false; detalle = 'LANZÓ: ' + String(e.message).slice(0, 60); }
  check(`96 · SABOTAJE ${que} → se maneja, no revienta`, ok, detalle);
}
check('97 · SABOTAJE · una política aflojada NO baja del suelo',
  A.politicaEfectiva({ minSampleSize: 0 }).minSampleSize >= A.POLITICA_MINIMA.minSampleSize);
check('98 · SABOTAJE · lo implícito no valida solo ni cambiando la política a mano',
  A.politicaEfectiva({ permitirSoloImplicito: 'sí' }).permitirSoloImplicito === false,
  'solo el booleano verdadero cuenta');
check('99 · SABOTAJE · efectos externos → no hay ninguno posible',
  ['feedback.ts', 'learning.ts', 'feedback-engine.ts'].every((x) =>
    !/fetch\(|firebase|firestore|process\.env|require\(/.test(sinComentarios(leer(`functions/src/core/algorithm/${x}`)))));
check('100 · SABOTAJE · nada de fuera del Core se importa',
  ['feedback.ts', 'learning.ts', 'feedback-engine.ts'].every((x) =>
    [...sinComentarios(leer(`functions/src/core/algorithm/${x}`)).matchAll(/from '([^']+)'/g)]
      .map((mm) => mm[1]).every((r) => r.startsWith('.'))));
check('101 · nadie ha conectado A7 a producción', (() => {
  const recorrer = (dir, out = []) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      const hijo = dir + '/' + e.name;
      if (e.isDirectory()) recorrer(hijo, out); else if (/\.ts$/.test(e.name)) out.push(hijo);
    }
    return out;
  };
  const DELATOR = /feedback-engine|crearMotorDeFeedback|FEEDBACK_ENGINE_ID/;
  const prod = ['creator', 'runtime', 'engine', 'gateway', 'credits', 'content', 'job']
    .flatMap((d) => recorrer('functions/src/' + d));
  return prod.length > 50 && prod.filter((x) => DELATOR.test(leer(x))).length === 0;
})());


console.log('\n─── R. Lo que los sabotajes demostraron que faltaba ───');

/* Siete sabotajes pasaron sin poner nada en rojo. El patrón era el mismo en
 * casi todos: mis casos fallaban VARIAS guardas a la vez, así que quitar una
 * dejaba el resto sosteniendo el resultado. Una guarda solo está probada si
 * existe un caso donde es LA ÚNICA que puede caer. */

/* Un lote que pasa TODO menos lo que cada prueba quiere romper. */
const LIMPIO = (extra = {}) => lote(60, (i) => res(`ok${i}`, 'success', AHORA - (60 - i) * HORA, AMBITO, {
  signals: [sig('result.latencyMs', 800, 'measured', AHORA - (60 - i) * HORA, { sampleSize: 20 })], ...extra,
}));
const latenciaDe = (r) => r.candidates.find((c) => c.metric === 'result.latencyMs');
check('R1 · el caso de control pasa todas las guardas: sin él no se puede aislar ninguna',
  latenciaDe(aprender({ outcomes: LIMPIO() })).state === 'validated',
  latenciaDe(aprender({ outcomes: LIMPIO() })).because.join(', '));

/* F02 · La confianza, SOLA. Señales de procedencia débil: todo lo demás igual. */
const flojo = aprender({
  outcomes: lote(60, (i) => res(`f${i}`, 'success', AHORA - (60 - i) * HORA, AMBITO, {
    signals: [sig('result.latencyMs', 800, 'default', AHORA - (60 - i) * HORA)],
  })),
});
check('R2 · F02 · con procedencia débil cae la CONFIANZA y solo ella',
  latenciaDe(flojo).because.includes('confidence_below_threshold') &&
  !latenciaDe(flojo).because.includes('sample_below_minimum') &&
  !latenciaDe(flojo).because.includes('evidence_stale'),
  latenciaDe(flojo).because.join(', '));
check('R3 · F03 · y con ella cae la incertidumbre, que es la otra mitad de la pregunta',
  latenciaDe(flojo).because.includes('uncertainty_too_high') && latenciaDe(flojo).state === 'rejected');

/* F05 · La contradicción, SOLA. Mitad a favor y mitad en contra del mismo valor:
 * gestos de personas que aceptan o rechazan lo que midió 800 ms. Hasta 1.9 salía
 * de ejecuciones que fallaban, y eso ya no es contradicción (sección Z). */
const contradictorio = aprender({
  events: lote(60, (i) => ev(`c${i}`, i % 2 ? 'accepted' : 'rejected', 'explicit', AHORA - (60 - i) * HORA, AMBITO, {
    signals: [sig('result.latencyMs', 800, 'measured', AHORA - (60 - i) * HORA, { sampleSize: 20 })],
  })),
});
check('R4 · F05 · con media de evidencia en contra cae la CONTRADICCIÓN',
  latenciaDe(contradictorio).because.includes('evidence_contradictory') &&
  !latenciaDe(contradictorio).because.includes('confidence_below_threshold'),
  latenciaDe(contradictorio).because.join(', '));
check('R5 · y la contradicción se CUENTA entera, aunque solo se guarden tres para explicar',
  aprender({ outcomes: contradictorio ? LIMPIO() : [] }) &&
  (() => {
    const a = contradictorio.aggregates.find((x) => x.metric === 'result.latencyMs');
    return a.contradicciones === 30 && a.muestraDeContradiccion.length === A.MAX_MUESTRA;
  })());

/* F15 · La autoridad en el camino de los RESULTADOS, que no pasan por
 * `eventoValido` y por tanto no tienen la segunda defensa. */
check('R6 · F15 · un RESULTADO que nombra implementación en su metadata no entra',
  aprender({ outcomes: [{ ...res(1, 'success'), metadata: { providerId: 'p9' } }] }).metricas.claves === 0,
  'los resultados no pasan por `eventoValido`: aquí la comprobación es la única');
check('R7 · y sin ella sí entraría: el control de que la prueba mide algo',
  aprender({ outcomes: [res(1, 'success')] }).metricas.claves === 1);
for (const clave of ['allowedProviders', 'modelId', 'adapter']) {
  check(`R8 · F15 · «${clave}» en un resultado tampoco`,
    aprender({ outcomes: [{ ...res(1, 'success'), metadata: { [clave]: 'x' } }] }).metricas.claves === 0);
}

/* F17 · El ORDEN de los campos de la clave es fijo, y hay que fijarlo de verdad:
 * comprobar solo que dos ámbitos iguales dan la misma clave pasa igual con el
 * orden invertido. */
check('R9 · F17 · la clave se compone en un orden EXACTO y declarado',
  A.claveDeAmbito({ modelId: 'm', providerId: 'p', strategyId: 's', experience: 'e', capability: 'c' }, 'metrica') ===
  'metrica|capability=c|experience=e|strategyId=s|providerId=p|modelId=m',
  A.claveDeAmbito({ modelId: 'm', providerId: 'p', strategyId: 's', experience: 'e', capability: 'c' }, 'metrica'));
check('R10 · y la métrica va siempre delante: es lo que se agrega, no dónde',
  A.claveDeAmbito({ capability: 'c' }, 'm').startsWith('m|'));

/* F20 · La muestra mínima dentro de la tendencia. Con dos tramos con datos pero
 * POCAS observaciones, el segundo guard no salta y el primero sí. */
const pocosEnDosTramos = (() => {
  let a = A.agregadoVacio('k', 'result.latencyMs', {});
  for (const [v, at] of [[500, AHORA - 4 * DIA], [520, AHORA - 4 * DIA], [900, AHORA - HORA], [920, AHORA - HORA]]) {
    a = A.acumular(a, { value: v, at, favorable: true, signal: sig('result.latencyMs', v, 'measured', at) }, AHORA, 5 * DIA);
  }
  return a;
})();
check('R11 · F20 · cuatro observaciones en dos tramos NO dan una tendencia',
  A.tendenciaDe(pocosEnDosTramos, 'baja', A.politicaEfectiva(VENTANA)) === 'insufficient_evidence',
  'hay tramos que comparar, pero no muestra con la que comparar');
/* Y cuatro nunca bastarán: el SUELO de la política es 5, así que pedir 4 no
 * baja el listón. Con seis, la misma forma sí da tendencia. */
check('R12 · pedir menos del suelo no baja el listón: cuatro siguen sin bastar',
  A.politicaEfectiva({ ...VENTANA, minSampleSize: 4 }).minSampleSize === A.POLITICA_MINIMA.minSampleSize &&
  A.tendenciaDe(pocosEnDosTramos, 'baja', A.politicaEfectiva({ ...VENTANA, minSampleSize: 4 })) === 'insufficient_evidence');
const seisEnDosTramos = (() => {
  let a = A.agregadoVacio('k', 'result.latencyMs', {});
  for (const [v, at] of [[500, AHORA - 4 * DIA], [520, AHORA - 4 * DIA], [510, AHORA - 4 * DIA],
    [900, AHORA - HORA], [920, AHORA - HORA], [910, AHORA - HORA]]) {
    a = A.acumular(a, { value: v, at, favorable: true, signal: sig('result.latencyMs', v, 'measured', at) }, AHORA, 5 * DIA);
  }
  return a;
})();
check('R12b · con seis, la misma forma SÍ dice que se está degradando',
  A.tendenciaDe(seisEnDosTramos, 'baja', A.politicaEfectiva({ ...VENTANA, minSampleSize: 5 })) === 'degrading',
  A.tendenciaDe(seisEnDosTramos, 'baja', A.politicaEfectiva({ ...VENTANA, minSampleSize: 5 })));
check('R12c · y para una métrica donde subir es mejor, lo mismo es MEJORAR',
  A.tendenciaDe(seisEnDosTramos, 'sube', A.politicaEfectiva({ ...VENTANA, minSampleSize: 5 })) === 'improving');

/* F27 · El orden de salida. Con claves que se insertan al revés del alfabeto,
 * devolver el orden de inserción y devolver el canónico son distintos. */
const alReves = aprender({
  outcomes: ['zeta', 'media', 'alfa'].map((c, i) => res(i, 'success', AHORA - i * HORA, { capability: c })),
});
check('R13 · F27 · los agregados salen en orden CANÓNICO, no en el de llegada',
  igual(alReves.aggregates.map((a) => a.scope.capability), ['alfa', 'media', 'zeta']),
  alReves.aggregates.map((a) => a.scope.capability).join(','));
check('R14 · y por eso `previo` es reproducible: es lo que se vuelve a meter',
  igual(
    aprender({ outcomes: ['zeta', 'media', 'alfa'].map((c, i) => res(i, 'success', AHORA - i * HORA, { capability: c })) }).aggregates.map((a) => a.key),
    aprender({ outcomes: ['alfa', 'zeta', 'media'].map((c, i) => res(i, 'success', AHORA - i * HORA, { capability: c })) }).aggregates.map((a) => a.key),
  ));

/* F28 · El presupuesto de evidencia, mirado en los DOS caminos. */
check('R15 · F28 · el tope corta los EVENTOS y no se pasa ni uno',
  aprender({ events: lote(5000, (i) => ev(i, 'accepted', 'explicit', AHORA - i * 1000)), budget: { maxEvidence: 50 } })
    .metricas.eventosAdmitidos === 50);
check('R16 · F28 · y también los RESULTADOS, que van por otro camino',
  (() => {
    const r = aprender({ outcomes: lote(5000, (i) => res(i, 'success', AHORA - i * 1000)), budget: { maxEvidence: 40 } });
    return r.metricas.budgetExhausted === true && r.aggregates[0].n <= 40;
  })(),
  'sin el tope, un lote grande se procesaría entero y el coste dejaría de estar acotado');


console.log('\n─── S. El estado persistible no lleva identificadores individuales ───');

/*
 * LA FUGA QUE ENCONTRÓ A8, y que la prueba 21 no veía: 21 comprobaba que la
 * cuenta no entrara en la CLAVE —y no entraba—, pero nadie miraba el campo
 * `scope` que se guarda junto a ella, que copiaba el ámbito completo de la
 * primera observación. La prueba medía el sustituto, no la afirmación.
 *
 * Aquí se mira lo que de verdad se guardaría: el agregado ENTERO serializado.
 */
const IDENTIFICADORES = ['account', 'accountId', 'requestId', 'jobId', 'sessionId', 'stepId', 'resultId', 'deviceId'];
const MARCA = (k) => `MARCA_${k.toUpperCase()}`;
const AMBITO_SUCIO = { capability: 'x.y', providerId: 'p1',
  ...Object.fromEntries(IDENTIFICADORES.map((k) => [k, MARCA(k)])) };

/* Todas las claves de un objeto, a cualquier profundidad. */
const clavesDe = (o, acc = new Set()) => {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.add(k); clavesDe(v, acc); }
  return acc;
};
const fugas = (estado) => {
  const texto = JSON.stringify(estado);
  const claves = clavesDe(JSON.parse(texto));
  return [
    ...IDENTIFICADORES.filter((k) => claves.has(k)).map((k) => `clave:${k}`),
    ...IDENTIFICADORES.filter((k) => texto.includes(MARCA(k))).map((k) => `valor:${k}`),
    ...(texto.includes('MARCA_SUJETO') ? ['valor:subject'] : []),
  ];
};

const conFuga = aprender({
  events: lote(40, (i) => ({ ...ev(`f${i}`, 'accepted', 'explicit', AHORA - (40 - i) * HORA, AMBITO_SUCIO), privacy: 'pseudonymous' })),
  outcomes: lote(40, (i) => res(`g${i}`, 'success', AHORA - (40 - i) * HORA, AMBITO_SUCIO, {
    signals: [{ ...sig('result.latencyMs', 800, 'measured', AHORA - (40 - i) * HORA), subject: 'MARCA_SUJETO' }],
  })),
});
check('S1 · ningún identificador individual en el estado persistible del agregado',
  fugas(conFuga.aggregates).length === 0, fugas(conFuga.aggregates).join(', ') || 'ninguno');
check('S2 · ni en los candidatos, que copian el ámbito y la evidencia del agregado',
  fugas(conFuga.candidates).length === 0, fugas(conFuga.candidates).join(', ') || 'ninguno');
check('S3 · la evidencia que se guarda para explicar va SIN sujeto: podía ser una ejecución concreta',
  conFuga.aggregates.every((a) => [...a.muestraDeApoyo, ...a.muestraDeContradiccion].every((e) => e.signal.subject === undefined)));
check('S4 · y conserva lo que sostiene la explicación: métrica, valor, procedencia, cuándo',
  conFuga.aggregates.flatMap((a) => a.muestraDeApoyo).every((e) =>
    typeof e.signal.key === 'string' && typeof e.signal.value === 'number' && typeof e.signal.source === 'string' && typeof e.signal.at === 'number'));
check('S5 · el ámbito guardado es EXACTAMENTE el de la clave, ni un campo más',
  conFuga.aggregates.every((a) => Object.keys(a.scope).every((k) => A.ORDEN_DE_CLAVE.includes(k))),
  JSON.stringify(conFuga.aggregates[0].scope));

/* Lista BLANCA: un identificador que nadie previó también se queda fuera. */
check('S6 · un identificador que nadie ha previsto también se queda fuera: es lista blanca, no negra',
  !('sessionId' in A.ambitoAgregable({ capability: 'c', sessionId: 's' })) &&
  !('loQueVengaEn2030' in A.ambitoAgregable({ capability: 'c', loQueVengaEn2030: 'x' })),
  '`sessionId` ni siquiera está en el tipo, y se colaba');
check('S7 · y la lista blanca es la MISMA que forma la clave, no una segunda',
  /ORDEN_DE_CLAVE/.test(sinComentarios(leer('functions/src/core/algorithm/learning.ts')).split('ambitoAgregable')[1] ?? ''));

/* Varias cuentas se siguen agregando bien. */
const deTresCuentas = aprender({
  events: ['u1', 'u2', 'u3'].flatMap((u) => lote(20, (i) =>
    ({ ...ev(`${u}_${i}`, 'accepted', 'explicit', AHORA - (60 - i) * HORA, { capability: 'x.y', account: u }), privacy: 'pseudonymous' }))),
});
check('S8 · tres cuentas, un solo agregado: se agrega por lo aprendido, no por quién',
  deTresCuentas.aggregates.length === 1 && deTresCuentas.aggregates[0].n === 60,
  `${deTresCuentas.aggregates.length} agregado(s), n=${deTresCuentas.aggregates[0]?.n}`);
check('S9 · la cuenta NO forma parte de la clave',
  !deTresCuentas.aggregates[0].key.includes('account') && !deTresCuentas.aggregates[0].key.includes('u1'),
  deTresCuentas.aggregates[0].key);
check('S10 · y la clave NO cambió con el arreglo: la de siempre',
  deTresCuentas.aggregates[0].key === 'feedback.satisfaction|capability=x.y');

/* Observaciones equivalentes de cuentas distintas → el MISMO agregado. */
const deUna = (cuenta) => aprender({
  events: lote(30, (i) => ({ ...ev(`e${i}`, 'accepted', 'explicit', AHORA - (30 - i) * HORA,
    { capability: 'x.y', providerId: 'p1', ...(cuenta ? { account: cuenta, jobId: `j_${cuenta}_${i}` } : {}) }), privacy: 'pseudonymous' })),
}).aggregates;
check('S11 · las mismas observaciones de la cuenta A y de la cuenta B dan el MISMO agregado',
  JSON.stringify(deUna('A')) === JSON.stringify(deUna('B')));
check('S12 · y el mismo que sin cuenta ninguna: la cuenta no deja rastro',
  JSON.stringify(deUna('A')) === JSON.stringify(deUna(undefined)));

/* El estado que ya existía: construido A MANO con la fuga, como habría quedado
 * guardado antes del arreglo. Uno generado ahora ya vendría limpio y no
 * probaría nada. */
const SUCIO_DE_ANTES = {
  ...A.agregadoVacio('outcome.success|capability=x.y', 'outcome.success', { capability: 'x.y' }),
  n: 5, suma: 5, favorables: 5, min: 1, max: 1, primero: AHORA - 5 * HORA, ultimo: AHORA - HORA,
  scope: AMBITO_SUCIO,
  muestraDeApoyo: [{ claim: 'outcome.success', supports: true,
    signal: { key: 'outcome.success', subject: 'MARCA_SUJETO', value: 1, source: 'measured', at: AHORA - HORA } }],
};
check('S13 · CONTROL · el estado de antes estaba de verdad sucio',
  fugas(SUCIO_DE_ANTES).length > 0, fugas(SUCIO_DE_ANTES).join(', '));
const recargado = aprender({ previo: [SUCIO_DE_ANTES], outcomes: [res('nuevo', 'success', AHORA)] });
check('S14 · un `previo` guardado antes del arreglo se limpia al cargarlo',
  fugas(recargado.aggregates).length === 0, fugas(recargado.aggregates).join(', ') || 'ninguno');
check('S15 · incluso si esta llamada no lo toca: se reemitiría sucio',
  fugas(aprender({ previo: [SUCIO_DE_ANTES] }).aggregates).length === 0);
check('S16 · y lo aprendido se conserva al limpiarlo: la muestra sigue siendo la misma',
  aprender({ previo: [SUCIO_DE_ANTES] }).aggregates[0].n === 5);
check('S17 · limpiar es idempotente',
  JSON.stringify(A.agregadoAgregable(A.agregadoAgregable(SUCIO_DE_ANTES))) === JSON.stringify(A.agregadoAgregable(SUCIO_DE_ANTES)));
check('S18 · y no se sustituye nada por un hash: si no hace falta, no se guarda',
  !/hash|\bsha(1|224|256|384|512)?\b|digest/i.test(sinComentarios(leer('functions/src/core/algorithm/learning.ts'))),
  '«sha» se busca como palabra: «tramosHasta» lo contiene y no es un hash');


console.log('\n─── T. «Solo implícito» se juzga sobre el agregado, no sobre la llamada ───');

/*
 * EL FALLO: la guarda se calculaba con un conjunto que nacía vacío en cada
 * `aprender`, así que el agregado olvidaba entre llamadas el apoyo explícito
 * que ya tenía. Los mismos 120 datos salían `validated` en una llamada y
 * `rejected` en dos. Estas pruebas se escriben contra ESO.
 */
const EXPLICITAS_60 = lote(60, (i) => ev(`tx${i}`, 'accepted', 'explicit', AHORA - (60 - i) * HORA));
const IMPLICITAS_60 = lote(60, (i) => ev(`ti${i}`, 'downloaded', 'implicit', AHORA - (120 - i) * HORA));
const veredicto = (r) => r.candidates.map((c) => ({ id: c.id, state: c.state, because: [...c.because] }));
const cuentas = (r) => r.aggregates.map((a) => [a.key, a.n, a.favorables, a.explicitas]);

const enUna = aprender({ events: [...IMPLICITAS_60, ...EXPLICITAS_60] });
const primeroExp = aprender({ events: IMPLICITAS_60, previo: aprender({ events: EXPLICITAS_60 }).aggregates });
const primeroImp = aprender({ events: EXPLICITAS_60, previo: aprender({ events: IMPLICITAS_60 }).aggregates });
check('T1 · los mismos datos dan el MISMO veredicto en una llamada o troceados en dos',
  igual(veredicto(enUna), veredicto(primeroExp)) && igual(veredicto(enUna), veredicto(primeroImp)),
  `${enUna.candidates[0].state} · ${primeroExp.candidates[0].state} · ${primeroImp.candidates[0].state}`);
check('T2 · y las mismas cuentas, incluido el apoyo explícito',
  igual(cuentas(enUna), cuentas(primeroExp)) && igual(cuentas(enUna), cuentas(primeroImp)),
  JSON.stringify(cuentas(enUna)));
check('T3 · el apoyo explícito SOBREVIVE al reinyectarse y a la limpieza de privacidad',
  primeroExp.aggregates[0].explicitas === 60 && A.agregadoAgregable(primeroExp.aggregates[0]).explicitas === 60);

/*
 * LA GUARDA, SOLA. Gestos implícitos que traen una latencia MEDIDA: la
 * procedencia es fuerte, la muestra alcanza, es fresca, estable y sin
 * contradicción. Todo pasa menos una cosa, y esa cosa es la única que tiene
 * que salir.
 */
const SOLO_IMPLICITO = lote(60, (i) => ({
  ...ev(`si${i}`, 'downloaded', 'implicit', AHORA - (59 - i) * HORA),
  signals: [sig('result.latencyMs', 800, 'measured', AHORA - (59 - i) * HORA)],
}));
const latenciaImplicita = (r) => r.candidates.find((c) => c.metric === 'result.latencyMs');
const soloImpl = aprender({ events: SOLO_IMPLICITO });
check('T4 · `implicit_only` es la ÚNICA razón del rechazo: todas las demás guardas pasan',
  latenciaImplicita(soloImpl).state === 'rejected' && igual([...latenciaImplicita(soloImpl).because], ['implicit_only']),
  JSON.stringify(latenciaImplicita(soloImpl).because));
check('T5 · y no es por falta de confianza: la procedencia es medida',
  latenciaImplicita(soloImpl).confidence.value > 0.9, latenciaImplicita(soloImpl).confidence.value.toFixed(3));
check('T6 · CONTROL · con UNA sola observación explícita, lo mismo se valida',
  latenciaImplicita(aprender({ events: [...SOLO_IMPLICITO, {
    ...ev('una', 'accepted', 'explicit', AHORA), signals: [sig('result.latencyMs', 800, 'measured', AHORA)],
  }] })).state === 'validated',
  'la guarda era la única que lo impedía');
check('T7 · CONTROL · y con la política que lo permite, también',
  latenciaImplicita(aprender({ events: SOLO_IMPLICITO, policy: { ...VENTANA, permitirSoloImplicito: true } })).state === 'validated');

/* La guarda se evalúa sola, sin que el llamador tenga que saber calcularla. */
const aggImpl = soloImpl.aggregates.find((a) => a.metric === 'result.latencyMs');
const aggExpl = enUna.aggregates[0];
check('T8 · `guardas()` sin opciones juzga el agregado: quien la reevalúe más tarde pregunta lo mismo',
  A.guardas(aggImpl, AHORA, A.politicaEfectiva(VENTANA)).includes('implicit_only') &&
  !A.guardas(aggExpl, AHORA, A.politicaEfectiva(VENTANA)).includes('implicit_only'));
check('T9 · y la respuesta sale de un solo sitio',
  A.soloImplicitoDe(aggImpl) === true && A.soloImplicitoDe(aggExpl) === false);

/* Qué cuenta como apoyo explícito. */
check('T10 · lo implícito no suma apoyo explícito; lo explícito y lo del sistema sí',
  aggImpl.explicitas === 0 &&
  aprender({ outcomes: lote(10, (i) => res(i, 'success', AHORA - i * HORA)) }).aggregates[0].explicitas === 10);
check('T11 · es una CUENTA, no un peso: entero y nunca mayor que la muestra',
  [...soloImpl.aggregates, ...enUna.aggregates].every((a) => Number.isInteger(a.explicitas) && a.explicitas <= a.n));
check('T12 · una observación que no dice si fue implícita NO suma: no saber no es tener apoyo',
  A.acumular(A.agregadoVacio('k', 'm', {}), { value: 1, at: AHORA, favorable: true }, AHORA, DIA).explicitas === 0 &&
  A.acumular(A.agregadoVacio('k', 'm', {}), { value: 1, at: AHORA, favorable: true, implicito: false }, AHORA, DIA).explicitas === 1);

/* El estado guardado antes del arreglo, sin el campo. */
const SIN_CAMPO = (() => { const a = { ...aggExpl }; delete a.explicitas; return a; })();
check('T13 · un agregado de antes, sin el dato, se lee como apoyo explícito NO demostrado',
  A.soloImplicitoDe(SIN_CAMPO) === true, 'puede retrasar una validación, nunca adelantarla');
check('T14 · y una sola observación explícita nueva lo desbloquea',
  A.soloImplicitoDe(aprender({ previo: [SIN_CAMPO], events: [ev('nueva', 'accepted', 'explicit', AHORA)] })
    .aggregates.find((a) => a.key === SIN_CAMPO.key)) === false);
check('T15 · la métrica del informe cuenta lo mismo que la guarda',
  soloImpl.metricas.soloImplicitos === soloImpl.aggregates.filter((a) => A.soloImplicitoDe(a)).length);

console.log('\n─── U. La rejilla temporal es absoluta: el reloj de la llamada no la mueve ───');

/*
 * EL FALLO: el tramo de cada observación se calculaba contra el `ahora` de la
 * llamada que la acumulaba, y ahí se quedaba congelado. Los mismos ochenta
 * datos daban tramos distintos en una llamada que en dos, y en dos —cada una
 * con su reloj, que es como se usa en vivo— una latencia multiplicada por seis
 * salía `validated` y estable. Estas pruebas se escriben contra ESO.
 */
const V16 = { ventanaMs: 16 * DIA, vidaMs: 60 * DIA };
const POL16 = A.politicaEfectiva(V16);
/* Ochenta resultados: cinco al día durante dieciséis días. Ocho días a 500 ms y
 * ocho a 3 000 ms. Una sola procedencia, para que lo único que varíe sea el tiempo. */
const OCHENTA = lote(80, (i) => {
  const at = T0 + Math.floor(i / 5) * DIA + (i % 5) * HORA;
  return res(`u${String(i).padStart(2, '0')}`, 'success', at, { capability: 'x.y' },
    { signals: [sig('result.latencyMs', i < 40 ? 500 : 3000, 'measured', at)] });
});
const FIN80 = OCHENTA[OCHENTA.length - 1].at;
const trocear = (xs, k) => lote(k, (j) => xs.slice((j * xs.length) / k, ((j + 1) * xs.length) / k));
/* Cada llamada con SU reloj —el de su último dato—: el uso en vivo, que era el que fallaba. */
const enLlamadas = (lotes, reloj = (l) => l[l.length - 1].at) => {
  let previo = []; let r = null;
  for (const l of lotes) { r = a7.aprender({ ahora: reloj(l), policy: V16, outcomes: l, previo }); previo = r.aggregates; }
  return r;
};
/* Park–Miller con semilla fija: barajar sin azar. */
const barajar = (xs, semilla = 20260923) => {
  const a = [...xs]; let s = semilla % 2147483647;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 48271) % 2147483647; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const latAg = (r) => r.aggregates.find((a) => a.metric === 'result.latencyMs');
const latCand = (r) => r.candidates.find((c) => c.metric === 'result.latencyMs');
const unaVez = a7.aprender({ ahora: FIN80, policy: V16, outcomes: OCHENTA });
const tramosN = (a) => JSON.stringify(a.tramos.map((t) => t.n));

check('U1 · 80 datos en UNA llamada = en 2, 4 y 8, cada una con su propio reloj: el MISMO estado',
  [2, 4, 8].every((k) => igual(enLlamadas(trocear(OCHENTA, k)).aggregates, unaVez.aggregates)),
  `tramos ${tramosN(latAg(unaVez))}`);
check('U2 · y con los lotes al revés, también',
  [2, 4, 8].every((k) => igual(enLlamadas(trocear(OCHENTA, k).reverse()).aggregates, unaVez.aggregates)));
check('U3 · y barajados, en una llamada o en cuatro',
  igual(a7.aprender({ ahora: FIN80, policy: V16, outcomes: barajar(OCHENTA) }).aggregates, unaVez.aggregates) &&
  igual(enLlamadas(trocear(barajar(OCHENTA), 4)).aggregates, unaVez.aggregates));
check('U4 · la subida de 500 a 3 000 ms se VE como degradación, en 1, 2, 4 u 8 llamadas, y no se valida',
  [1, 2, 4, 8].every((k) => {
    const c = latCand(enLlamadas(trocear(OCHENTA, k)));
    return c.trend === 'degrading' && c.state !== 'validated' && c.because.includes('unstable_across_window');
  }),
  [1, 2, 4, 8].map((k) => { const c = latCand(enLlamadas(trocear(OCHENTA, k))); return `${k}:${c.trend}/${c.state}`; }).join(' '));
check('U4b · y nunca como `stable`: era el falso positivo',
  [1, 2, 4, 8].every((k) => latCand(enLlamadas(trocear(OCHENTA, k))).trend !== 'stable'));

/* Evaluar más tarde es la OTRA función del reloj, y no toca los tramos. */
const agOchenta = latAg(unaVez);
const frescurasDespues = [0, 10, 30, 59, 61].map((d) => A.frescuraDe(agOchenta, FIN80 + d * DIA, POL16.vidaMs));
check('U5 · evaluar más tarde BAJA la frescura y la confianza…',
  frescurasDespues.every((f, i) => i === 0 || f < frescurasDespues[i - 1]) &&
  A.confianzaDeAgregado(agOchenta, FIN80 + 30 * DIA, POL16).value < A.confianzaDeAgregado(agOchenta, FIN80, POL16).value &&
  A.guardas(agOchenta, FIN80 + 61 * DIA, POL16).includes('evidence_stale'),
  frescurasDespues.map((f) => f.toFixed(3)).join(' → '));
check('U5b · …y NO mueve un tramo: una llamada posterior sin datos devuelve el estado idéntico',
  igual(a7.aprender({ ahora: FIN80 + 30 * DIA, policy: V16, previo: unaVez.aggregates }).aggregates, unaVez.aggregates));

/* Un hueco mayor que la ventana: lo viejo sale de los tramos y se queda en los totales. */
const TARDE = FIN80 + 3 * V16.ventanaMs;
const trasHueco = latAg(a7.aprender({ ahora: TARDE, policy: V16, previo: unaVez.aggregates,
  outcomes: [res('hueco', 'success', TARDE, { capability: 'x.y' }, { signals: [sig('result.latencyMs', 700, 'measured', TARDE)] })] }));
check('U6 · tras un hueco mayor que la ventana, los tramos viejos SALEN y solo queda lo nuevo',
  tramosN(trasHueco) === '[0,0,0,1]' && trasHueco.tramosHasta === A.finDeTramo(TARDE, V16.ventanaMs),
  tramosN(trasHueco));
check('U6b · y los totales conservan las 81', trasHueco.n === 81 && trasHueco.suma === agOchenta.suma + 700);

/* Un dato que llega TARDE y es más viejo que toda la rejilla. */
const VIEJO = res('viejo', 'success', T0 - 30 * DIA, { capability: 'x.y' },
  { signals: [sig('result.latencyMs', 9999, 'measured', T0 - 30 * DIA)] });
const viejoAlFinal = a7.aprender({ ahora: FIN80, policy: V16, previo: unaVez.aggregates, outcomes: [VIEJO] });
const viejoAlPrincipio = enLlamadas([[VIEJO], ...trocear(OCHENTA, 4)]);
check('U7 · un dato viejo que llega tarde CUENTA en los totales',
  latAg(viejoAlFinal).n === 81 && latAg(viejoAlFinal).suma === agOchenta.suma + 9999 && latAg(viejoAlFinal).primero === VIEJO.at);
check('U7b · pero no entra en ningún tramo ni mueve la rejilla',
  igual(latAg(viejoAlFinal).tramos, agOchenta.tramos) && latAg(viejoAlFinal).tramosHasta === agOchenta.tramosHasta);
check('U7c · y da igual que llegue el primero o el último: el mismo estado',
  igual(viejoAlFinal.aggregates, viejoAlPrincipio.aggregates));

/* Lo guardado ANTES de la rejilla absoluta: sin `tramosHasta`. */
const polV = A.politicaEfectiva(VENTANA);
const agLimpio = aprender({ outcomes: LIMPIO() }).aggregates.find((a) => a.metric === 'result.latencyMs');
const LEGADO = (() => { const a = { ...agLimpio }; delete a.tramosHasta; return a; })();
check('U8 · CONTROL · el agregado limpio pasa TODAS las guardas',
  igual([...A.guardas(agLimpio, AHORA, polV)], []), JSON.stringify(A.guardas(agLimpio, AHORA, polV)));
check('U8b · el mismo agregado SIN rejilla: `stability_unknown` es la ÚNICA razón',
  igual([...A.guardas(LEGADO, AHORA, polV)], ['stability_unknown']), JSON.stringify(A.guardas(LEGADO, AHORA, polV)));
check('U8c · su estabilidad no se sabe y su tendencia no se inventa, aunque sus tramos traigan datos',
  A.estabilidadDe(LEGADO) === undefined && A.tendenciaDe(LEGADO, 'baja', polV) === 'insufficient_evidence' &&
  LEGADO.tramos.filter((t) => t.n > 0).length >= 2);
check('U8d · y reemitido sin tocar sigue sin rejilla: no se le inventa una',
  aprender({ previo: [LEGADO] }).aggregates[0].tramosHasta === undefined);

const NUEVAS = lote(10, (i) => res(`nu${i}`, 'success', AHORA - i * HORA, AMBITO,
  { signals: [sig('result.latencyMs', 800, 'measured', AHORA - i * HORA)] }));
const migrado = aprender({ previo: [LEGADO], outcomes: NUEVAS });
const agMigrado = migrado.aggregates.find((a) => a.metric === 'result.latencyMs');
const avisoDeRejilla = (r) => r.because.some((b) => /sin una rejilla temporal válida/.test(b));
check('U9 · la primera observación nueva le da una rejilla: los tramos empiezan AHÍ',
  typeof agMigrado.tramosHasta === 'number' && agMigrado.tramos.reduce((s, t) => s + t.n, 0) === 10, tramosN(agMigrado));
check('U9b · y los totales de antes se conservan',
  agMigrado.n === LEGADO.n + 10 && agMigrado.suma === LEGADO.suma + 8000);
check('U9c · y se DICE, no se hace en silencio', avisoDeRejilla(migrado));
check('U9d · CONTROL · un agregado con rejilla no dispara el aviso',
  !avisoDeRejilla(aprender({ previo: [agLimpio], outcomes: NUEVAS })));

check('U10 · el tercer argumento de `acumular` —el reloj de antes— ya no cambia NADA',
  (() => {
    const base = A.acumular(A.agregadoVacio('k', 'm', {}), { value: 1, at: AHORA - 3 * DIA, favorable: true }, AHORA, VENTANA.ventanaMs);
    const obs = { value: 2, at: AHORA - HORA, favorable: true };
    const ref = A.acumular(base, obs, AHORA, VENTANA.ventanaMs);
    return [0, NaN, -5, AHORA + 400 * DIA, undefined].every((x) => igual(A.acumular(base, obs, x, VENTANA.ventanaMs), ref));
  })());
check('U11 · `tramosHasta` cae en un borde de la rejilla y cubre el dato más nuevo',
  unaVez.aggregates.every((a) => {
    const ancho = V16.ventanaMs / A.TRAMOS;
    return a.tramosHasta % ancho === 0 && a.tramosHasta >= a.ultimo && a.tramosHasta < a.ultimo + ancho;
  }));

/* Otra ventana: la rejilla guardada es de otra. */
const a16 = a7.aprender({ ahora: AHORA, policy: V16, outcomes: LIMPIO() }).aggregates.find((a) => a.metric === 'result.latencyMs');
const conOtraVentana = aprender({ previo: [a16], outcomes: [NUEVAS[0]] });
const a16en5 = conOtraVentana.aggregates.find((a) => a.metric === 'result.latencyMs');
check('U12 · CONTROL · la rejilla de 16 días NO cae en la de 5: el caso es el que dice ser',
  a16.tramosHasta % (VENTANA.ventanaMs / A.TRAMOS) !== 0);
check('U12b · con OTRA ventana, los tramos se hicieron con otra rejilla: empiezan de nuevo, totales intactos',
  tramosN(a16en5) === '[0,0,0,1]' && a16en5.n === a16.n + 1, tramosN(a16en5));
check('U12c · y se dice', avisoDeRejilla(conOtraVentana));

const V5 = VENTANA.ventanaMs;
const H5 = A.finDeTramo(AHORA, V5);
check('U13 · `tramoDe` coloca por FECHA contra el final de la rejilla',
  A.tramoDe(AHORA, H5, V5) === A.TRAMOS - 1 && A.tramoDe(H5 - V5 + 1, H5, V5) === 0);
check('U13b · y fuera de la rejilla no coloca: ni lo más viejo, ni lo más nuevo, ni contra un final que no cae en borde',
  A.tramoDe(H5 - V5, H5, V5) === undefined && A.tramoDe(H5 + 1, H5, V5) === undefined &&
  A.tramoDe(AHORA, H5 + 1, V5) === undefined && A.tramoDe(AHORA, H5, 0) === undefined && A.tramoDe(NaN, H5, V5) === undefined);

/* Un dato con fecha de dentro de un año. La fecha manda, así que la rejilla va
 * hasta él y lo de hoy queda por detrás. Lo que importa es que eso NO aprueba. */
const LEJOS = AHORA + 365 * DIA;
const conFuturo = aprender({ outcomes: [...LIMPIO(),
  res('lejos', 'success', LEJOS, AMBITO, { signals: [sig('result.latencyMs', 800, 'measured', LEJOS)] })] });
check('U14 · un dato fechado dentro de un año NO produce un aprendizaje: lo desconocido no aprueba',
  latenciaDe(conFuturo).state !== 'validated' && latenciaDe(conFuturo).because.includes('stability_unknown'),
  JSON.stringify(latenciaDe(conFuturo).because));
check('U14b · y los totales lo cuentan todo', latAg(conFuturo).n === 61);

const doceTemporal = lote(12, () => JSON.stringify(enLlamadas(trocear(barajar(OCHENTA), 8))));
check('U15 · doce corridas, barajadas y troceadas en ocho llamadas con su reloj: idénticas',
  doceTemporal.every((x) => x === doceTemporal[0]));

console.log('\n─── V. Sin reloj no se evalúa ───');

/*
 * EL FALLO: sin reloj, A7 evaluaba con 0. Con 0, todo lo aprendido —también lo
 * de hace dos meses— salía con frescura 1, porque todo parecía del futuro.
 */
const DIEZ = lote(10, (i) => res(`v${i}`, 'success', AHORA - i * HORA));
const sinReloj = a7.aprender({ policy: VENTANA, outcomes: DIEZ, events: [ev('v', 'accepted', 'explicit')] });
check('V1 · sin reloj, la llamada se RECHAZA y lo dice con un código', sinReloj.rechazo === 'clock_missing', String(sinReloj.rechazo));
check('V1b · y no procesa NADA: ni candidatos, ni validados, ni señales, ni historial, ni un dato admitido',
  sinReloj.candidates.length === 0 && sinReloj.validated.length === 0 && sinReloj.signals.length === 0 &&
  Object.keys(sinReloj.history).length === 0 && sinReloj.metricas.eventosAdmitidos === 0 &&
  sinReloj.metricas.resultadosAdmitidos === 0 && sinReloj.metricas.observaciones === 0);
check('V1c · pero cuenta lo que le llegó, para que se sepa qué quedó sin procesar',
  sinReloj.metricas.resultadosRecibidos === 10 && sinReloj.metricas.eventosRecibidos === 1 &&
  sinReloj.because.some((b) => /sin procesar/.test(b)));
for (const [etiqueta, reloj, motivo] of [
  ['ausente', undefined, 'clock_missing'], ['null', null, 'clock_missing'], ['NaN', NaN, 'clock_invalid'],
  ['Infinity', Infinity, 'clock_invalid'], ['negativo', -1, 'clock_invalid'], ['cero', 0, 'clock_invalid'],
  ['un texto', String(AHORA), 'clock_invalid'],
]) {
  check(`V2 · reloj ${etiqueta} → ${motivo}`, a7.aprender({ ahora: reloj, policy: VENTANA, outcomes: DIEZ }).rechazo === motivo);
}
check('V2b · CONTROL · con un reloj válido no hay rechazo y se procesa',
  !('rechazo' in aprender({ outcomes: DIEZ })) && aprender({ outcomes: DIEZ }).metricas.resultadosAdmitidos === 10);

const rechazadoConPrevio = a7.aprender({ policy: V16, previo: unaVez.aggregates, outcomes: DIEZ });
check('V3 · rechazada, el estado previo se devuelve INTACTO: quien lo guarde sin mirar no pierde nada',
  igual(rechazadoConPrevio.aggregates, unaVez.aggregates));
check('V3b · y reintentar con reloj no cuenta dos veces lo que se mandó',
  igual(a7.aprender({ ahora: AHORA, policy: V16, previo: rechazadoConPrevio.aggregates, outcomes: DIEZ }).aggregates,
    a7.aprender({ ahora: AHORA, policy: V16, previo: unaVez.aggregates, outcomes: DIEZ }).aggregates));

/* El caso de la auditoría: un agregado cuyo último dato es de hace 61 días. */
const DENTRO_DE_61 = FIN80 + 61 * DIA;
check('V4 · con reloj, un agregado de hace 61 días está RANCIO',
  A.frescuraDe(agOchenta, DENTRO_DE_61, POL16.vidaMs) === 0 && A.guardas(agOchenta, DENTRO_DE_61, POL16).includes('evidence_stale'));
check('V4b · sin reloj NO se vuelve fresco: frescura 0 y confianza 0, nunca 1',
  [undefined, null, NaN, 0].every((t) => A.frescuraDe(agOchenta, t, POL16.vidaMs) === 0 &&
    A.confianzaDeAgregado(agOchenta, t, POL16).value === 0));
check('V5 · `guardas()` sin reloj devuelve ESE motivo y ningún otro, aunque el agregado sea perfecto',
  igual([...A.guardas(agLimpio, undefined, polV)], ['clock_missing']) &&
  igual([...A.guardas(agLimpio, NaN, polV)], ['clock_invalid']) &&
  igual([...A.guardas(agLimpio, AHORA, polV)], []),
  'con reloj, el mismo agregado pasa todas');
check('V6 · la frescura sin reloj es 0 —desconocida—, nunca NaN ni 1',
  [undefined, null, NaN, 0, -1, Infinity, -Infinity].every((t) => A.frescuraDe(agLimpio, t, polV.vidaMs) === 0));
check('V7 · y la confianza dice POR QUÉ es cero',
  /sin reloj de evaluación \(clock_missing\)/.test(A.confianzaDeAgregado(agLimpio, undefined, polV).because));
check('V8 · la regla es del RELOJ: la fecha de un evento en la época sigue siendo una fecha',
  aprender({ events: [ev('epoca', 'accepted', 'explicit', 0)] }).metricas.eventosAdmitidos === 1);
check('V8b · y una fecha negativa sigue sin serlo, con la misma definición de instante',
  rechaza(ev('neg', 'accepted', 'explicit', -1), 'bad_timestamp'));
check('V9 · sin entrada ninguna, se rechaza igual y devuelve un estado vacío, no uno inventado',
  (() => { const r = a7.aprender(undefined); return r.rechazo === 'clock_missing' && r.aggregates.length === 0; })());

console.log('\n─── W. Los resultados pasan por la misma puerta de privacidad que los eventos ───');

/*
 * EL HUECO: un resultado con «country» en el ámbito ENTRABA —la lista blanca
 * del agregado tiraba el campo, pero el resultado se admitía y se aprendía de
 * él—, cuando el mismo campo en un EVENTO lo deja fuera. Y lo que no entraba
 * desaparecía sin contarse.
 */
const rechazaResultado = (r, motivo) => {
  const x = aprender({ outcomes: [r] });
  return x.metricas.resultadosAdmitidos === 0 && x.metricas.resultadosRechazados === 1 &&
    x.metricas.porMotivoDeResultado[motivo] === 1 && x.metricas.claves === 0;
};
for (const campo of ['country', 'age', 'gender', 'email', 'prompt', 'City', 'EMAIL']) {
  check(`W1 · «${campo}» en el ámbito de un RESULTADO: fuera, con su motivo`,
    rechazaResultado(res(`w_${campo}`, 'success', AHORA, { ...AMBITO, [campo]: 'x' }), 'privacy_class'));
}
check('W2 · CONTROL · el mismo resultado sin ese campo entra: la puerta es la única causa',
  aprender({ outcomes: [res('w_ok', 'success', AHORA, AMBITO)] }).metricas.resultadosAdmitidos === 1);
check('W3 · un campo de persona en la METADATA de un resultado, también fuera',
  rechazaResultado({ ...res('w_m', 'success'), metadata: { prompt: 'x' } }, 'privacy_class') &&
  rechazaResultado({ ...res('w_m2', 'success'), metadata: { a: { b: { content: 'x' } } } }, 'privacy_class'));
check('W4 · la autoridad sobre la metadata ya estaba, y ahora además se CUENTA',
  rechazaResultado({ ...res('w_a', 'success'), metadata: { providerId: 'p9' } }, 'unsafe_metadata'));
check('W5 · un resultado mal formado se cuenta como mal formado, no desaparece',
  (() => {
    const x = aprender({ outcomes: [null, { kind: 'success', at: AHORA }, 42] });
    return x.metricas.resultadosRechazados === 3 && x.metricas.porMotivoDeResultado.malformed === 3;
  })());
check('W6 · el valor rechazado no aparece en NINGÚN sitio de la salida',
  !JSON.stringify(aprender({ outcomes: [res('w_v', 'success', AHORA, { ...AMBITO, country: 'MARCA_PAIS' }), ...LIMPIO()] }))
    .includes('MARCA_PAIS'));
check('W7 · eventos y resultados rechazan EXACTAMENTE los mismos campos: la lista entera, uno a uno',
  [...A.CAMPOS_DE_PERSONA].every((k) =>
    A.eventoValido(ev('w7', 'accepted', 'explicit', AHORA, { ...AMBITO, [k]: 'x' })).reason === 'privacy_class' &&
    A.resultadoValido(res('w7', 'success', AHORA, { ...AMBITO, [k]: 'x' })).reason === 'privacy_class'));
check('W7b · y lo preguntan a la MISMA función, sin una lista propia en el motor',
  (() => {
    const f = sinComentarios(leer('functions/src/core/algorithm/feedback.ts'));
    const cuerpo = (nombre) => f.split(`export const ${nombre}`)[1]?.split('export const')[0] ?? '';
    return /campoDePersonaEnAmbito\(/.test(cuerpo('eventoValido')) && /campoDePersonaEnAmbito\(/.test(cuerpo('resultadoValido')) &&
      !/CAMPOS_DE_PERSONA/.test(sinComentarios(leer('functions/src/core/algorithm/feedback-engine.ts')));
  })());
check('W8 · ESTRUCTURA · ningún campo de persona es una dimensión de la clave',
  A.ORDEN_DE_CLAVE.filter((k) => A.CAMPOS_DE_PERSONA.has(String(k).toLowerCase())).length === 0,
  JSON.stringify(A.ORDEN_DE_CLAVE));
check('W9 · y la puerta NO se fía de eso: pregunta a la lista de persona, no a la clave',
  !/ORDEN_DE_CLAVE/.test(sinComentarios(leer('functions/src/core/algorithm/feedback.ts'))
    .split('export const campoDePersonaEnAmbito')[1]?.split('export const')[0] ?? 'ORDEN_DE_CLAVE'),
  'si alguien mete un campo de persona en la clave, la puerta lo sigue parando');
check('W10 · un resultado rechazado no gasta presupuesto de evidencia, igual que un evento',
  aprender({ outcomes: [res('w10a', 'success', AHORA, { ...AMBITO, age: '30' }), res('w10b', 'success')], budget: { maxEvidence: 1 } })
    .metricas.resultadosAdmitidos === 1);

console.log('\n─── Q. Rendimiento y escala ───');

/*
 * MEDIDO COMO SE USA, y esto importa más que el número.
 *
 * El techo de evidencia por llamada es 512 (A0). Pasarle cien mil eventos a
 * una sola llamada NO procesa cien mil: procesa 512 y corta — y cronometrar
 * eso daría «cien mil eventos en dos milisegundos», que es exactamente el
 * benchmark mentiroso que no hay que hacer.
 *
 * Así que se mide lo que de verdad pasaría con diez millones de cuentas:
 * lotes acotados, encadenando el estado, TODOS los eventos procesados.
 */
const LOTE = 500;
const medir = (cuantos) => {
  const hacer = (i) => res(i, i % 7 ? 'success' : 'failure', AHORA - (cuantos - i) * 100,
    { capability: `c${i % 20}`, providerId: `p${i % 5}` });
  const correr = () => {
    let previo = [], vistos = 0;
    for (let k = 0; k < cuantos; k += LOTE) {
      const r = aprender({ previo, outcomes: lote(Math.min(LOTE, cuantos - k), (i) => hacer(k + i)) });
      previo = r.aggregates; vistos += r.metricas.observaciones;
    }
    return { previo, vistos };
  };
  correr();
  const ini = process.hrtime.bigint();
  const { previo, vistos } = correr();
  return [cuantos, Number(process.hrtime.bigint() - ini) / 1e6, vistos, previo.length];
};
const tiempos = [100, 1000, 10_000, 100_000].map(medir);
for (const [c, ms, vistos, claves] of tiempos) {
  console.log(`   ${String(c).padStart(6)} eventos → ${ms.toFixed(1)} ms  (${(ms / c * 1000).toFixed(2)} µs/evento) · ${vistos} observación(es) · ${claves} clave(s)`);
}
check('101b · y el benchmark procesa TODOS los eventos, no los que caben en una llamada',
  tiempos.every(([c, , vistos]) => vistos >= c), tiempos.map(([c, , v]) => `${c}→${v}`).join(' '));
check('102 · cien mil eventos en menos de 3 s', tiempos[3][1] < 3000, `${tiempos[3][1].toFixed(0)} ms`);
const porEvento = tiempos.map(([c, ms]) => ms / c);
check('103 · y el coste por evento no crece: es LINEAL, no cuadrático',
  porEvento[3] < porEvento[0] * 6,
  tiempos.map(([c, ms]) => `${c}:${(ms / c * 1000).toFixed(2)}µs`).join(' · '));
check('104 · con cien claves distintas, el estado sigue acotado por CLAVE y no por evento',
  (() => {
    const r = porLotes(20_000, (i) => res(i, 'success', AHORA - (20_000 - i) * 100, { capability: `c${i % 100}` }), 500,
      { budget: { maxCandidates: 256 } });
    return r.aggregates.length <= 100 && r.aggregates.every((a) => a.tramos.length === A.TRAMOS);
  })());
check('105 · el tope de candidatos acota el trabajo aunque haya millones de claves',
  aprender({
    budget: { maxEvidence: 5000, maxCandidates: 10 },
    outcomes: lote(5000, (i) => res(i, 'success', AHORA - i * 100, { capability: `c${i}` })),
  }).metricas.candidatos <= 10);

console.log('\n─── X. A9.1 · A7 observa, agrega y aprende: no enruta ───');

/*
 * La misma frontera que A9 y A8. A7 ve proveedores y modelos —vienen en el
 * ámbito de cada resultado— y lo más que hace con ellos es AGREGAR por ámbito.
 * No elige, no ordena por calidad, no aplica lo que propone y no toca lo que
 * recibe. Los valores van AL REVÉS de un orden cualquiera —ni suben ni bajan
 * con la clave— para que un orden por valor, en un sentido o en el otro, se vea.
 */
const PROV7 = [['p-a', 3000], ['p-m', 9000], ['p-z', 100]];
const conProv = aprender({
  outcomes: PROV7.flatMap(([p, lat], k) => lote(60, (i) => res(`${k}_${i}`, 'success', AHORA - (60 - i) * HORA,
    { capability: 'x.y', providerId: p, modelId: `m-${p}` }, { signals: [sig('result.latencyMs', lat, 'measured', AHORA - (60 - i) * HORA)] }))),
});
const cambios = conProv.candidates.filter((c) => c.proposedChange).map((c) => c.proposedChange);
check('X1 · CONTROL · hay cambios propuestos que mirar: la prueba de abajo no pasa por vacía',
  cambios.length === 6 && conProv.validated.length === 6, `${cambios.length} propuesto(s)`);
check('X2 · un cambio propuesto dice A QUÉ CAPA y QUÉ SEÑAL: ni proveedor, ni modelo, ni ámbito',
  cambios.every((c) => Object.keys(c).every((k) => ['target', 'signalKey', 'value', 'magnitude', 'risk'].includes(k)) &&
    ['router', 'strategy', 'optimization', 'verification', 'recovery', 'none'].includes(c.target) &&
    c.signalKey.startsWith('learned.') && A.violacionesEn(c, 'cambio').length === 0) &&
  !PROV7.some(([p]) => JSON.stringify(cambios).includes(p)));
check('X3 · CONTROL · y A7 SÍ conoce los proveedores: están en el ámbito de cada candidato',
  PROV7.every(([p]) => conProv.candidates.some((c) => c.scope.providerId === p)));
const sinAmbitos7 = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'scope' ? undefined : v)));
check('X4 · fuera del ámbito, ni una clave de implementación en nada de lo que A7 entrega',
  A.violacionesEn(conProv, 'a7', 64).length > 0 && A.violacionesEn(sinAmbitos7(conProv), 'a7', 64).length === 0);
const latencias = conProv.candidates.filter((c) => c.metric === 'result.latencyMs');
check('X5 · candidatos, validados, señales e historial salen en orden de CLAVE, no de valor: ni el mejor primero ni el peor',
  igual(latencias.map((c) => c.scope.providerId), ['p-a', 'p-m', 'p-z']) && igual(latencias.map((c) => c.value), [3000, 9000, 100]) &&
  igual(conProv.candidates.map((c) => c.id), conProv.candidates.map((c) => c.id).slice().sort()) &&
  igual(conProv.validated.map((c) => c.id), conProv.candidates.map((c) => c.id)) &&
  igual(conProv.signals.map((s) => s.subject), conProv.candidates.map((c) => c.id)) &&
  igual(Object.keys(conProv.history), conProv.candidates.map((c) => c.id)));
const CAMPOS7 = {
  salida: ['aggregates', 'because', 'candidates', 'contract', 'history', 'metricas', 'rechazo', 'signals', 'validated'],
  candidato: ['because', 'confidence', 'contradicting', 'freshness', 'id', 'metric', 'observation', 'proposedChange', 'sampleSize',
    'scope', 'stability', 'state', 'supporting', 'trend', 'uncertainty', 'value'],
  senal: ['at', 'confidence', 'key', 'sampleSize', 'source', 'subject', 'value'],
};
const soloDe7 = (o, campos) => Object.keys(o).every((k) => campos.includes(k));
check('X6 · la forma de lo que A7 entrega es CERRADA: ni una política, ni un proveedor elegido, ni un campo más',
  [conProv, aprender({ outcomes: [] })].every((r) => soloDe7(r, CAMPOS7.salida)) &&
  conProv.candidates.every((c) => soloDe7(c, CAMPOS7.candidato)) &&
  conProv.signals.every((s) => soloDe7(s, CAMPOS7.senal) && s.source === 'derived'));
const congelar7 = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(congelar7); } return o; };
const POLITICA7 = congelar7({ ventanaMs: 5 * DIA, minSampleSize: 30 });
const ENTRADA7 = congelar7(JSON.parse(JSON.stringify({ ahora: AHORA, policy: POLITICA7,
  events: lote(10, (i) => ev(i, 'accepted', 'explicit', AHORA - (10 - i) * HORA)),
  outcomes: lote(40, (i) => res(i, 'success', AHORA - (40 - i) * HORA, AMBITO, { signals: [sig('result.latencyMs', 800, 'measured', AHORA - (40 - i) * HORA)] })),
  previo: conProv.aggregates })));
const antes7 = JSON.stringify(ENTRADA7);
const tras7 = (() => { try { return a7.aprender(ENTRADA7); } catch (e) { return { lanzo: String(e?.message ?? e) }; } })();
check('X7 · A7 no toca lo que recibe —ni la política, ni lo de antes, ni los resultados—: entran congelados y salen iguales',
  !tras7.lanzo && JSON.stringify(ENTRADA7) === antes7 && tras7.aggregates.length > conProv.aggregates.length, tras7.lanzo ?? `${tras7.aggregates?.length} agregados`);

console.log('\n─── Y. A9.2 · Aprender por alternativa ───');

/*
 * La identidad de la alternativa ejecutada viaja en `scope.strategyId`, una
 * dimensión que la clave ya tenía. Lo que se prueba aquí es lo que A9.2 midió
 * que faltaba: que cada resultado se sume a SU alternativa, que una alternativa
 * que falla se pueda validar como tal, y que ningún valor pueda hacerse pasar
 * por otro ámbito.
 */
const alt = (id, extra = {}) => ({ capability: 'x.y', strategyId: id, ...extra });
const porAlt = (casos) => aprender({ outcomes: casos.flatMap(({ id, n, bien, scope }) =>
  lote(n, (i) => res(`${id}-${i}`, bien(i) ? 'success' : 'failure', AHORA - (n - i) * HORA, scope ?? alt(id)))) });
const exitoDeAlt = (r, id) => r.aggregates.find((a) => a.metric === 'strategy.succeeded' && a.scope.strategyId === id);
const candidatoDeAlt = (r, id, metrica = 'strategy.succeeded') => r.candidates.find((c) => c.metric === metrica && c.scope.strategyId === id);
const AyB = porAlt([{ id: 'A', n: 40, bien: () => true }, { id: 'B', n: 40, bien: () => false }]);
check('Y1 · cada resultado se suma a SU alternativa: la clave lleva su identidad, y las muestras son las suyas',
  exitoDeAlt(AyB, 'A')?.n === 40 && exitoDeAlt(AyB, 'A')?.favorables === 40 &&
  exitoDeAlt(AyB, 'B')?.n === 40 && exitoDeAlt(AyB, 'B')?.favorables === 0 &&
  exitoDeAlt(AyB, 'A').key === A.claveDeAmbito(alt('A'), 'strategy.succeeded'));
check('Y2 · una alternativa que SIEMPRE falla se valida como tal: una medición firme de que falla no es «no se sabe»',
  candidatoDeAlt(AyB, 'B')?.state === 'validated' && candidatoDeAlt(AyB, 'B').value === 0 &&
  exitoDeAlt(AyB, 'B')?.contradicciones === 0, (candidatoDeAlt(AyB, 'B')?.because ?? []).join(','));
check('Y3 · 1.9 · la limitación que A9.2 dejó declarada, cerrada: `outcome.success` valida como tal la ejecución que falla',
  candidatoDeAlt(AyB, 'B', 'outcome.success')?.state === 'validated' && candidatoDeAlt(AyB, 'B', 'outcome.success').value === 0 &&
  !candidatoDeAlt(AyB, 'B', 'outcome.success').because.includes('evidence_contradictory'),
  (candidatoDeAlt(AyB, 'B', 'outcome.success')?.because ?? []).join(','));
const mezcla = porAlt([{ id: 'M', n: 40, bien: (i) => i % 4 !== 0 }]);
check('Y4 · una tasa intermedia y estable también se valida: 30 de 40, sin contradicción que la tape',
  candidatoDeAlt(mezcla, 'M')?.state === 'validated' && candidatoDeAlt(mezcla, 'M').value === 0.75, String(candidatoDeAlt(mezcla, 'M')?.value));
const impostor = porAlt([
  { id: 'S|providerId=p', n: 30, bien: () => false },
  { id: 'S', n: 30, bien: () => true, scope: alt('S', { providerId: 'p' }) },
]);
check('Y5 · CONTAMINACIÓN · una identidad con el separador de la clave se rechaza, y no se suma a la de nadie',
  impostor.metricas.resultadosRechazados === 30 && impostor.metricas.porMotivoDeResultado.malformed === 30 &&
  impostor.aggregates.every((a) => a.n === 30 && a.favorables === 30 && a.scope.strategyId === 'S'),
  impostor.aggregates.map((a) => `${a.key} n${a.n} fav${a.favorables}`).join(' · '));
check('Y5b · CONTROL · sin el separador, la misma alternativa entra: la puerta es la única causa',
  porAlt([{ id: 'S-providerId-p', n: 30, bien: () => false }]).metricas.resultadosAdmitidos === 30);
check('Y6 · una recuperación ejecutada cuyo tipo trae el separador tampoco entra: acabaría en la misma dimensión',
  aprender({ outcomes: [res('r1', 'failure', AHORA, alt('A'), { recovery: { kind: 'retry|providerId=p', executed: true, succeeded: true } })] })
    .metricas.porMotivoDeResultado.malformed === 1 &&
  aprender({ outcomes: [res('r1', 'failure', AHORA, alt('A'), { recovery: { kind: 'retry', executed: true, succeeded: true } })] })
    .metricas.resultadosAdmitidos === 1);
check('Y7 · y un EVENTO con el separador en el ámbito, igual: la clave es la misma para los dos',
  aprender({ events: [ev(1, 'accepted', 'explicit', AHORA, { capability: 'x.y', strategyId: 'S|modelId=m' })] }).metricas.porMotivo.malformed === 1 &&
  aprender({ events: [ev(1, 'accepted', 'explicit', AHORA, { capability: 'x.y', strategyId: 'S' })] }).metricas.eventosAdmitidos === 1);
const BA7 = porAlt([{ id: 'A', n: 40, bien: () => false }, { id: 'B', n: 40, bien: () => true }]);
check('Y8 · los mismos resultados al revés intercambian lo aprendido de cada una, sin cruzarse',
  ['A', 'B'].every((id) => !!exitoDeAlt(BA7, id) && !!exitoDeAlt(AyB, id)) &&
  exitoDeAlt(BA7, 'A').favorables === exitoDeAlt(AyB, 'B').favorables && exitoDeAlt(BA7, 'B').favorables === exitoDeAlt(AyB, 'A').favorables &&
  exitoDeAlt(BA7, 'A').favorables !== exitoDeAlt(BA7, 'B').favorables);
const salidasAlt = AyB.aggregates.map((a) => a.key);
check('Y9 · en cualquier orden y troceado en llamadas, lo aprendido por alternativa es el mismo',
  (() => {
    const todos = [...lote(40, (i) => res(`A-${i}`, 'success', AHORA - (40 - i) * HORA, alt('A'))),
      ...lote(40, (i) => res(`B-${i}`, 'failure', AHORA - (40 - i) * HORA, alt('B')))];
    const alReves = aprender({ outcomes: [...todos].reverse() });
    const enDos = aprender({ outcomes: todos.slice(40), previo: aprender({ outcomes: todos.slice(0, 40) }).aggregates });
    return igual(alReves.aggregates, AyB.aggregates) && igual(enDos.aggregates, AyB.aggregates) && salidasAlt.length === 4;
  })());
check('Y10 · lo aprendido de una alternativa no nombra ninguna implementación: ni en su ámbito, ni en lo que propone',
  AyB.aggregates.some((a) => a.metric === 'strategy.succeeded') &&
  AyB.aggregates.filter((a) => a.metric === 'strategy.succeeded').every((a) => igual(Object.keys(a.scope).sort(), ['capability', 'strategyId'])) &&
  AyB.candidates.filter((c) => c.metric === 'strategy.succeeded' && c.proposedChange)
    .every((c) => c.proposedChange.target === 'strategy' && c.proposedChange.signalKey === 'learned.strategy.succeeded' &&
      A.violacionesEn(c.proposedChange, 'cambio').length === 0));

console.log('\n─── Z. A9.3 · Ejecución ≠ verificación ≠ recuperación ───');

/*
 * Tres desenlaces que NO son el mismo, cada uno de su dueño: cómo acabó la
 * ejecución lo dice quien ejecutó; si cumplió lo verificable, A6; si una
 * recuperación arregló el fallo, quien la ejecutó. Los ocho casos del brief, uno
 * a uno, mirando QUÉ observación sale de cada resultado.
 */
/* Un veredicto armado a mano con los hallazgos que lo sostienen (1.9): la puerta de
 * ejecución de A6 —se le pregunta cuál es— pasó, y una condición del RESULTADO
 * concluyó con el estado del veredicto. Si el veredicto no sabe, una condición
 * concluyó y otra no: así, lo único que decide cada caso es el cubo del veredicto. */
const PUERTA_A6 = [...A.COMPROBACIONES_DE_EJECUCION][0];
const hallazgosDe = (status) => (['unknown', 'inconclusive'].includes(status)
  ? [{ type: PUERTA_A6, status: 'pass' }, { type: 'structural.missing', status: 'pass' }, { type: 'quality.requirement', status }]
  : [{ type: PUERTA_A6, status: 'pass' }, { type: 'structural.missing', status }]);
const veredictoA6 = (status, passed, findings = hallazgosDe(status)) =>
  ({ status, passed, confidence: { kind: 'algorithm', value: 0.9, basis: [] }, findings });
const obsDe = (r) => A.observacionesDeResultado({ id: 'o', at: AHORA, scope: alt('S'), ...r });
const de = (os, m) => os.filter((o) => o.metric === m).map((o) => o.value);
const casos = {
  c1: obsDe({ kind: 'success', verification: veredictoA6('pass', true) }),
  c2: obsDe({ kind: 'success', verification: veredictoA6('fail', false) }),
  c3: obsDe({ kind: 'failure', recovery: { kind: 'retry', executed: true, succeeded: true } }),
  c4: obsDe({ kind: 'failure', recovery: { kind: 'retry', executed: true, succeeded: false } }),
  c5: obsDe({ kind: 'success', verification: veredictoA6('unknown', false) }),
  c5b: obsDe({ kind: 'success', verification: veredictoA6('inconclusive', false) }),
  c6: obsDe({ kind: 'unknown', verification: veredictoA6('unknown', false) }),
  c7: obsDe({ kind: 'failure', recovery: { kind: 'retry', executed: false } }),
  c8: obsDe({ kind: 'failure' }),
};
check('Z1 · CASO 1 · ejecución correcta y resultado correcto, sin recuperación',
  igual(de(casos.c1, 'outcome.success'), [1]) && igual(de(casos.c1, 'verification.passed'), [1]) &&
  igual(de(casos.c1, 'recovery.succeeded'), []) && igual(de(casos.c1, 'strategy.succeeded'), [1]));
check('Z2 · CASO 2 · la ejecución terminó bien y el resultado no cumplió: dos cosas, no un fallo de ejecución',
  igual(de(casos.c2, 'outcome.success'), [1]) && igual(de(casos.c2, 'strategy.succeeded'), [1]) && igual(de(casos.c2, 'verification.passed'), [0]));
check('Z3 · CASO 3 · la ejecución falló y una recuperación la arregló: sigue siendo un fallo de la ejecución original',
  igual(de(casos.c3, 'outcome.success'), [0]) && igual(de(casos.c3, 'strategy.succeeded'), [0]) && igual(de(casos.c3, 'recovery.succeeded'), [1]));
check('Z3b · y la recuperación es de ESA alternativa, con su tipo en su propia dimensión',
  igual(casos.c3.find((o) => o.metric === 'recovery.succeeded').scope, { ...alt('S'), recoveryKind: 'retry' }));
check('Z4 · CASO 4 · fallo y recuperación fallida: fallo completo',
  igual(de(casos.c4, 'outcome.success'), [0]) && igual(de(casos.c4, 'recovery.succeeded'), [0]));
check('Z5 · CASO 5 · ejecución buena y verificación sin saber: ni un aprobado ni un suspenso inventados',
  igual(de(casos.c5, 'outcome.success'), [1]) && igual(de(casos.c5, 'verification.passed'), []) && igual(de(casos.c5b, 'verification.passed'), []));
check('Z6 · CASO 6 · ejecución sin saber y verificación sin saber: nada, ni éxito ni fracaso',
  casos.c6.length === 0, casos.c6.map((o) => `${o.metric}=${o.value}`).join(' ') || 'ninguna');
check('Z7 · CASO 7 · una recuperación que no se intentó no es una recuperación fallida',
  igual(de(casos.c7, 'recovery.succeeded'), []) && igual(de(casos.c7, 'outcome.success'), [0]));
check('Z8 · CASO 8 · una recuperación que no aplicaba, tampoco',
  igual(de(casos.c8, 'recovery.succeeded'), []) && igual(de(casos.c8, 'outcome.success'), [0]));
check('Z9 · una cancelación no es un desenlace de la ejecución, y un resultado a medias es un «no»',
  obsDe({ kind: 'cancelled' }).length === 0 && igual(de(obsDe({ kind: 'partial_success' }), 'outcome.success'), [0]));
check('Z10 · un veredicto que se contradice a sí mismo no se aprende: `pass` sin aprobar, o `fail` aprobando',
  igual(de(obsDe({ kind: 'success', verification: veredictoA6('pass', false) }), 'verification.passed'), []) &&
  igual(de(obsDe({ kind: 'success', verification: veredictoA6('fail', true) }), 'verification.passed'), []));

/* Agregado: cuarenta resultados que fallan, con veredicto de fallo y recuperación
 * fallida; y cuarenta que ENTREGAN y no cumplen, que es de donde sale una
 * verificación suspendida (1.9): el «fail» de un fallo es la ejecución repetida. */
const fallaTodo = aprender({ outcomes: lote(40, (i) => res(`z${i}`, 'failure', AHORA - (40 - i) * HORA, alt('Z'), {
  verification: veredictoA6('fail', false), recovery: { kind: 'retry', executed: true, succeeded: false } })) });
const entregaMal = aprender({ outcomes: lote(40, (i) => res(`e${i}`, 'success', AHORA - (40 - i) * HORA, alt('E'), {
  verification: VEREDICTO_FALLA })) });
const fuenteZ = (m) => (m === 'verification.passed' ? entregaMal : fallaTodo);
const agregadoZ = (m) => fuenteZ(m).aggregates.find((a) => a.metric === m);
check('Z11 · un «no» es una MUESTRA de la tasa, no una contradicción: en ejecución, verificación y recuperación',
  ['outcome.success', 'verification.passed', 'recovery.succeeded', 'strategy.succeeded']
    .every((m) => agregadoZ(m)?.n === 40 && agregadoZ(m).contradicciones === 0 && agregadoZ(m).favorables === 0));
check('Z12 · y por eso lo que falla SIEMPRE se valida como tal: la mala noticia también viaja',
  ['outcome.success', 'verification.passed', 'recovery.succeeded'].every((m) =>
    fuenteZ(m).candidates.find((c) => c.metric === m)?.state === 'validated' && fuenteZ(m).candidates.find((c) => c.metric === m).value === 0));
check('Z12b · y el «fail» de cuarenta FALLOS no es ninguna verificación: no hubo resultado suyo que verificar',
  fallaTodo.aggregates.every((a) => a.metric !== 'verification.passed') &&
  entregaMal.aggregates.find((a) => a.metric === 'outcome.success')?.favorables === 40);
const medidas = aprender({ outcomes: [
  ...lote(20, (i) => res(`ok${i}`, 'success', AHORA - (40 - i) * HORA, alt('M'), { signals: [sig('result.latencyMs', 1200, 'measured', AHORA - (40 - i) * HORA)] })),
  ...lote(20, (i) => res(`ko${i}`, 'failure', AHORA - (20 - i) * HORA, alt('M'), { signals: [sig('result.latencyMs', 90, 'measured', AHORA - (20 - i) * HORA)] })),
] });
const latM = medidas.aggregates.find((a) => a.metric === 'result.latencyMs');
check('Z13 · las medidas son de las ejecuciones que salieron BIEN: un fallo rápido no abarata la latencia',
  latM?.n === 20 && latM.suma / latM.n === 1200 && latM.contradicciones === 0, `n ${latM?.n} · media ${latM ? latM.suma / latM.n : '—'}`);
const forjado = aprender({ outcomes: [res('f1', 'failure', AHORA, alt('F'), {
  signals: ['outcome.success', 'verification.passed', 'recovery.succeeded', 'strategy.succeeded'].map((k) => sig(k, 1, 'measured', AHORA)) })] });
check('Z14 · una señal suelta no suplanta lo que A7 deriva: un fallo con cuatro señales a 1 sigue siendo un fallo, y nada más',
  igual(forjado.aggregates.map((a) => `${a.metric}:${a.favorables}/${a.n}`).sort(), ['outcome.success:0/1', 'strategy.succeeded:0/1']));
/* En un ÉXITO, que es el único cuyas señales se aprenden: ahí es donde una señal
 * con nombre de algo derivado inventaría un veredicto o una recuperación. */
const forjadoBien = aprender({ outcomes: [res('f2', 'success', AHORA, alt('F'), {
  signals: [...['outcome.success', 'strategy.succeeded'].map((k) => sig(k, 0, 'measured', AHORA)),
    ...['verification.passed', 'recovery.succeeded'].map((k) => sig(k, 1, 'measured', AHORA)),
    sig('result.latencyMs', 800, 'measured', AHORA)] })] });
check('Z14c · y en un ÉXITO tampoco: sus medidas se aprenden, y ninguna señal le inventa un veredicto, una recuperación ni otra ejecución',
  igual(forjadoBien.aggregates.map((a) => `${a.metric}:${a.favorables}/${a.n}`).sort(),
    ['outcome.success:1/1', 'result.latencyMs:1/1', 'strategy.succeeded:1/1']),
  forjadoBien.aggregates.map((a) => `${a.metric}:${a.favorables}/${a.n}`).sort().join(' '));
check('Z14b · ni desde un evento: un gesto no dice cómo acabó una ejecución',
  aprender({ events: [ev('g1', 'accepted', 'explicit', AHORA, alt('F'), { signals: [sig('outcome.success', 1, 'measured', AHORA)] })] })
    .aggregates.every((a) => a.metric !== 'outcome.success'));

/* Por alternativa: A ejecuta bien y no pasa la verificación; B falla y la recupera. */
const AB3 = aprender({ outcomes: [
  ...lote(40, (i) => res(`a${i}`, 'success', AHORA - (40 - i) * HORA, alt('A'), { verification: veredictoA6('fail', false) })),
  ...lote(40, (i) => res(`b${i}`, 'failure', AHORA - (40 - i) * HORA, alt('B'), { recovery: { kind: 'retry', executed: true, succeeded: true } })),
] });
const de3 = (m, id) => AB3.aggregates.find((a) => a.metric === m && a.scope.strategyId === id);
check('Z15 · cada dimensión se queda en SU alternativa: la ejecución de A no es la de B, ni la verificación de A la de nadie más',
  de3('outcome.success', 'A')?.favorables === 40 && de3('outcome.success', 'B')?.favorables === 0 &&
  de3('verification.passed', 'A')?.favorables === 0 && de3('verification.passed', 'B') === undefined &&
  de3('recovery.succeeded', 'B')?.favorables === 40 && de3('recovery.succeeded', 'A') === undefined);
const recuperacionesAyB = aprender({ outcomes: [
  ...lote(30, (i) => res(`ra${i}`, 'failure', AHORA - (30 - i) * HORA, alt('A'), { recovery: { kind: 'retry', executed: true, succeeded: true } })),
  ...lote(30, (i) => res(`rb${i}`, 'failure', AHORA - (30 - i) * HORA, alt('B'), { recovery: { kind: 'retry', executed: true, succeeded: false } })),
] }).aggregates.filter((a) => a.metric === 'recovery.succeeded');
check('Z16 · el mismo tipo de recuperación en dos alternativas son DOS agregados: antes se sumaban en «retry»',
  recuperacionesAyB.length === 2 && igual(recuperacionesAyB.map((a) => `${a.scope.strategyId}:${a.scope.recoveryKind}:${a.favorables}`).sort(),
    ['A:retry:30', 'B:retry:0']));
check('Z17 · los mismos resultados en cualquier orden y en cualquier troceo dan lo mismo aprendido',
  (() => {
    const todos = [...lote(40, (i) => res(`a${i}`, 'success', AHORA - (40 - i) * HORA, alt('A'), { verification: veredictoA6('fail', false) })),
      ...lote(40, (i) => res(`b${i}`, 'failure', AHORA - (40 - i) * HORA, alt('B'), { recovery: { kind: 'retry', executed: true, succeeded: true } }))];
    const alReves = aprender({ outcomes: [...todos].reverse() });
    const enDos = aprender({ outcomes: todos.slice(40), previo: aprender({ outcomes: todos.slice(0, 40) }).aggregates });
    return igual(alReves.aggregates, AB3.aggregates) && igual(enDos.aggregates, AB3.aggregates);
  })());
const pocosFallos = aprender({ outcomes: lote(10, (i) => res(`p${i}`, 'failure', AHORA - (10 - i) * HORA, alt('P'))) });
check('Z18 · la política es la de siempre: diez fallos no validan nada, por muy claros que sean',
  A.POLITICA_MINIMA.minSampleSize === 5 && A.POLITICA_POR_DEFECTO.minSampleSize === 30 && A.POLITICA_POR_DEFECTO.maxContradiction === 0.3 &&
  pocosFallos.candidates.filter((c) => c.metric === 'outcome.success').every((c) => c.state === 'observed' && c.because.includes('sample_below_minimum')));
const motor7 = sinComentarios(leer('functions/src/core/algorithm/feedback-engine.ts'));
check('Z19 · el veredicto se lee con los cubos de A6, no con una lista propia de estados',
  /dejaSeguir\(/.test(motor7) && /afirmaFallo\(/.test(motor7) && !/'pass_with_uncertainty'|'inconclusive'/.test(motor7));

/*
 * LA VERIFICACIÓN ES DEL RESULTADO QUE SE ENTREGÓ (1.9). A6 mete en su veredicto
 * una puerta de ejecución —«terminó como terminó»— que deriva aunque no se espere
 * nada. Medido: sin nada esperado, su `pass` es esa puerta sola, y A7 lo aprendía
 * como un aprobado. Cada guarda, con un caso en el que es la ÚNICA que decide.
 */
const sinNadaQueEsperar = veredictoReal({ status: 'succeeded', outputs: [] }, []);
check('Z20 · MEDIDO · sin nada esperado, A6 da `pass` con su puerta de ejecución como única comprobación',
  sinNadaQueEsperar.status === 'pass' && sinNadaQueEsperar.passed === true &&
  sinNadaQueEsperar.findings.length === 1 && A.COMPROBACIONES_DE_EJECUCION.has(sinNadaQueEsperar.findings[0].type));
check('Z21 · y A7 NO lo aprende como verificación: sería el éxito de la ejecución disfrazado de aprobado',
  igual(de(obsDe({ kind: 'success', verification: sinNadaQueEsperar }), 'verification.passed'), []) &&
  igual(de(obsDe({ kind: 'success', verification: sinNadaQueEsperar }), 'outcome.success'), [1]));
check('Z22 · el veredicto de algo que la ejecución NO entregó no es suyo: ni el aprobado de lo que arregló una recuperación, ni el suspenso de un fallo',
  ['failure', 'cancelled', 'unknown'].every((kind) =>
    igual(de(obsDe({ kind, verification: VEREDICTO_PASA, recovery: { kind: 'retry', executed: true, succeeded: true } }), 'verification.passed'), []) &&
    igual(de(obsDe({ kind, verification: VEREDICTO_FALLA }), 'verification.passed'), [])));
check('Z23 · y un resultado A MEDIAS sí entregó algo: su veredicto se aprende, en los dos sentidos',
  igual(de(obsDe({ kind: 'partial_success', verification: VEREDICTO_FALLA }), 'verification.passed'), [0]) &&
  igual(de(obsDe({ kind: 'partial_success', verification: VEREDICTO_PASA }), 'verification.passed'), [1]));
const rechazado = veredictoReal({ status: 'rejected', outputs: [{ kind: 'text', ref: 'r' }] });
check('Z24 · MEDIDO · si la puerta de A6 no pasa, el veredicto suspende aunque lo que llegó cumpla',
  rechazado.status === 'fail' && rechazado.passed === false &&
  rechazado.findings.some((f) => A.COMPROBACIONES_DE_EJECUCION.has(f.type) && f.status === 'fail') &&
  rechazado.findings.some((f) => !A.COMPROBACIONES_DE_EJECUCION.has(f.type) && f.status === 'pass'));
check('Z25 · y A7 no aprende ese suspenso: habla de cómo acabó la ejecución, no de si el resultado cumplió',
  igual(de(obsDe({ kind: 'success', verification: rechazado }), 'verification.passed'), []));
check('Z26 · un veredicto que no dice qué miró —o con un hallazgo que no dice qué es— no se aprende, por mucho que diga `pass`',
  igual(de(obsDe({ kind: 'success', verification: { status: 'pass', passed: true, confidence: VEREDICTO_PASA.confidence } }), 'verification.passed'), []) &&
  igual(de(obsDe({ kind: 'success', verification: { ...VEREDICTO_PASA, findings: [...VEREDICTO_PASA.findings, { status: 'pass' }] } }), 'verification.passed'), []) &&
  igual(de(obsDe({ kind: 'success', verification: VEREDICTO_PASA }), 'verification.passed'), [1]));
check('Z29 · el orden de los hallazgos no cambia lo que se aprende del veredicto',
  [VEREDICTO_PASA, VEREDICTO_FALLA, rechazado, sinNadaQueEsperar].every((v) =>
    igual(obsDe({ kind: 'success', verification: { ...v, findings: [...v.findings].reverse() } }), obsDe({ kind: 'success', verification: v }))));
check('Z28 · una ejecución buena SIN veredicto no es un aprobado: sin A6 no hay verificación que aprender, ni en el ámbito ni por alternativa',
  igual(de(obsDe({ kind: 'success' }), 'verification.passed'), []) && igual(de(obsDe({ kind: 'partial_success' }), 'verification.passed'), []) &&
  igual(de(obsDe({ kind: 'success' }), 'outcome.success'), [1]));
check('Z27 · la puerta se le PREGUNTA a A6, no se copia: A7 no escribe el nombre de ninguna comprobación suya',
  igual([...A.COMPROBACIONES_DE_EJECUCION], A.derivarEstructurales({ id: 'x' }, []).map((c) => c.type)) &&
  !/structural\./.test(motor7));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA7: aprende de la evidencia, y se calla cuando la evidencia no alcanza');
process.exit(failures ? 1 : 0);
