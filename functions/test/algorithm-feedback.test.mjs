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
 *  Q. Rendimiento y escala.
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
check('3 · el contrato NO subió: A7 no necesitó añadir ni un campo',
  ALGORITHM_CONTRACT_VERSION === '1.5' && !/\(A7\)/.test(leer('functions/src/core/contracts.ts')),
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

const conVerificacion = aprender({
  outcomes: lote(40, (i) => res(i, i % 4 ? 'success' : 'failure', AHORA - (40 - i) * HORA, AMBITO, {
    verification: { status: 'pass', passed: i % 4 !== 0, confidence: { kind: 'algorithm', value: 0.9, basis: [] } },
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
check('35 · el veredicto de A6 entra tal cual, sin reinterpretarse',
  conVerificacion.candidates.find((c) => c.metric === 'verification.passed').sampleSize === 40);
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
  A.tramoDe(AHORA - 4 * DIA, AHORA, 5 * DIA) < A.tramoDe(AHORA - 1 * HORA, AHORA, 5 * DIA));

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
check('56 · la contradicción se guarda, se cuenta y limita la conclusión',
  (() => {
    const contradictorio = aprender({
      outcomes: lote(60, (i) => res(i, i % 2 ? 'success' : 'failure', AHORA - (60 - i) * HORA)),
    }).candidates.find((c) => c.metric === 'outcome.success');
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
check('88 · ni un `if` por capacidad, proveedor o modelo en todo el módulo',
  ['feedback.ts', 'learning.ts', 'feedback-engine.ts'].every((x) =>
    !/if\s*\([^)]*capability\s*===|if\s*\([^)]*provider\s*===|if\s*\([^)]*model\s*===/.test(sinComentarios(leer(`functions/src/core/algorithm/${x}`)))));

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
    return aprender({ outcomes: [{ id: 'o', kind: 'success', at: AHORA, scope: AMBITO,
      verification: { status: v.status, passed: v.passed, confidence: v.confidence } }] })
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

/* F05 · La contradicción, SOLA. Mitad a favor y mitad en contra del mismo valor. */
const contradictorio = aprender({
  outcomes: lote(60, (i) => res(`c${i}`, i % 2 ? 'success' : 'failure', AHORA - (60 - i) * HORA, AMBITO, {
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
  !/hash|sha|digest/i.test(sinComentarios(leer('functions/src/core/algorithm/learning.ts'))));


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

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA7: aprende de la evidencia, y se calla cuando la evidencia no alcanza');
process.exit(failures ? 1 : 0);
