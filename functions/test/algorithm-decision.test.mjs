/*
 * A1 — EL MOTOR DE DECISIÓN.
 *
 * El primer algoritmo real de Weë. Todo se EJECUTA contra el compilado; lo que
 * no se puede ejecutar —que la capa no pueda llamar a un proveedor, que no use
 * azar— se mide sobre la fuente.
 *
 *  A. Quién es: registro, versión, estado.
 *  B. La matriz del brief, de la A a la Z.
 *  C. Propiedades que deben cumplirse SIEMPRE.
 *  D. Reproducibilidad.
 *  E. La línea base, y cuánto aporta el motor sobre ella.
 *  F. Los veinte sabotajes.
 *  G. Rendimiento.
 *  H. El historial es evidencia (contrato 1.7): qué lee A1, cuándo pesa y cuándo no.
 *  I. Cada alternativa, su identidad (contrato 1.8).
 *  J. Sigue sin estar conectado.
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
const motor = A.crearMotorDeDecision();
const base = A.crearLineaBase();

const TRAZA = { traceId: 't1', requestId: 'r1', userId: 'u1' };
const opt = (id, values, value) => ({ id, value: value ?? id, values });
const ctxDe = (options, extra = {}) => ({
  contract: ALGORITHM_CONTRACT_VERSION,
  objective: extra.objective ?? { weights: { quality: 2, cost: 1 } },
  trace: TRAZA, options, ...extra,
});
const senal = (key, value, source = 'measured', extra = {}) => ({ key, value, source, ...extra });
const paso = (id, capability, dependsOn) => ({ id, capability, purpose: `p${id}`, produces: 'text', ...(dependsOn ? { dependsOn } : {}) });
const conf = (v) => ({ kind: 'algorithm', value: v, basis: [{ claim: 'c', signal: senal('a.b', 1), supports: true }] });
const estrategia = (id, steps, extra = {}) => ({
  id, label: id, proposedBy: 'x@1', steps,
  expected: { confidence: conf(0.9), uncertainty: 'known', ...(extra.expected ?? {}) }, ...extra,
});

console.log('\n─── A. Quién es ───');

/* Versión 2 desde S2-A (contrato 1.10): A1 cambió lo que decide. */
check('1 · se registra por el Registry de A0, no por uno nuevo',
  !!A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DEL_MOTOR]).registro.obtener(A.DECISION_ENGINE_ID, 2));
check('2 · su descriptor es válido según A0', A.algoritmoValido(A.DESCRIPTOR_DEL_MOTOR),
  JSON.stringify(A.validarAlgoritmo(A.DESCRIPTOR_DEL_MOTOR)));
check('3 · es de la familia `decision` y PURO',
  A.DESCRIPTOR_DEL_MOTOR.category === 'decision' && A.DESCRIPTOR_DEL_MOTOR.purity === 'pure');
/* Lo más importante del grupo: corre y se mide, pero nadie lo elige solo. */
const { registro: reg } = A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DEL_MOTOR, A.DESCRIPTOR_DE_LA_BASE]);
check('4 · es EXPERIMENTAL: no es seleccionable automáticamente',
  A.DESCRIPTOR_DEL_MOTOR.status === 'experimental' && reg.seleccionable(A.DECISION_ENGINE_ID) === false);
check('5 · y la línea base es `draft`: nunca decide de verdad',
  A.DESCRIPTOR_DE_LA_BASE.status === 'draft' && reg.seleccionable(A.BASELINE_ID) === false);
check('6 · cada decisión dice qué algoritmo y qué versión la tomó',
  motor.decidir(ctxDe([opt('a', { quality: 1 })])).algorithm === `${A.DECISION_ENGINE_ID}@2`);
check('7 · el contrato no ha roto el mayor',
  Number(ALGORITHM_CONTRACT_VERSION.split('.')[0]) === 1 && Number(ALGORITHM_CONTRACT_VERSION.split('.')[1]) >= 1,
  ALGORITHM_CONTRACT_VERSION);

console.log('\n─── B. La matriz, de la A a la Z ───');

/* A · una sola opción válida. */
const soloUna = motor.decidir(ctxDe([opt('unica', { quality: 0.5, cost: 0.1 })]));
check('8 · A · con una sola opción, se elige y se dice',
  soloUna.status === 'decided' && soloUna.selected === 'unica' && soloUna.alternatives.length === 0);

/* B · varias. C · todas inválidas. */
const varias = motor.decidir(ctxDe([opt('a', { quality: 0.9, cost: 0.5 }), opt('b', { quality: 0.6, cost: 0.1 })]));
check('9 · B · con varias, hay elegida y ranking completo',
  varias.status === 'decided' && varias.candidates.length === 2 && varias.alternatives.length === 1);
const todasFuera = motor.decidir(ctxDe(
  [opt('a', { quality: 0.9, cost: 5 }), opt('b', { quality: 0.9, cost: 9 })],
  { constraints: { budget: { maxUsd: 0.1 } } }));
check('10 · C · si ninguna cumple, NO se devuelve una arbitraria',
  todasFuera.status === 'undecided' && todasFuera.failure === 'no_valid_strategy' && todasFuera.selected === undefined);
check('11 · y se cuenta por qué quedó fuera cada una',
  todasFuera.candidates.every((c) => c.reason === 'constraint:budget.maxUsd'), JSON.stringify(todasFuera.candidates.map((c) => c.reason)));

/* D · empate exacto. E · puntuación distinta. */
const empate = motor.decidir(ctxDe([opt('zeta', { quality: 0.7, cost: 0.2 }), opt('alfa', { quality: 0.7, cost: 0.2 })]));
check('12 · D · un empate exacto lo rompe el `id`, no el orden de llegada', empate.selected === 'alfa');
check('13 · E · con puntuación distinta, gana la mejor', varias.selected === 'b', varias.selected);

/* F · confianza distinta con puntuación igual. */
const conEvidencia = motor.decidir(ctxDe(
  [opt('sinDatos', { quality: 0.7, cost: 0.2 }), opt('conDatos', { quality: 0.7, cost: 0.2 })],
  { signals: [senal('option.quality', 0.7, 'measured', { subject: 'conDatos', at: 100, sampleSize: 50 })] }));
check('14 · F · a igual puntuación, gana la que tiene evidencia', conEvidencia.selected === 'conDatos',
  `${conEvidencia.selected} · confianza ${conEvidencia.confidence.value.toFixed(2)}`);

/* G · datos ausentes: NO son datos malos. */
const faltan = motor.decidir(ctxDe([opt('completa', { quality: 0.6, cost: 0.2 }), opt('aMedias', { quality: 0.8 })]));
const aMedias = faltan.candidates.find((c) => c.id === 'aMedias');
check('15 · G · un eje ausente NO se cuenta como 0', aMedias.score.fits.quality === 0.8 && aMedias.score.total === 0.8);
check('16 · y se nombra lo que falta, bajando la cobertura',
  igual([...aMedias.score.missing], ['cost']) && aMedias.score.coverage < 1);

/* H · señales en conflicto. */
const choque = motor.decidir(ctxDe([opt('a', { quality: 0.7 })], {
  signals: [senal('option.quality', 0.9, 'model', { subject: 'a', at: 999 }), senal('option.quality', 0.5, 'measured', { subject: 'a', at: 1 })],
}));
check('17 · H · dos señales que no coinciden se resuelven y se avisa', choque.warnings.includes('signal_conflict'));
const resuelto = A.resolverSenales([senal('x.y', 9, 'model', { at: 999 }), senal('x.y', 5, 'measured', { at: 1 })]);
check('18 · y manda la PROCEDENCIA, no la frescura',
  resuelto.resueltas.length === 1 && resuelto.resueltas[0].value === 5 && resuelto.conflictos[0].porque === 'fuente');
check('19 · dos mediciones idénticas no son un conflicto',
  A.resolverSenales([senal('x.y', 5), senal('x.y', 5)]).conflictos.length === 0);

/* I · restricción dura vs J · objetivo blando. LA REGLA CENTRAL. */
const duraGana = motor.decidir(ctxDe(
  [opt('carisima', { quality: 1, cost: 0.40 }), opt('modesta', { quality: 0.5, cost: 0.05 })],
  { constraints: { budget: { maxUsd: 0.1 } } }));
check('20 · I · una restricción dura NO se compensa con calidad',
  duraGana.selected === 'modesta' && duraGana.candidates.find((c) => c.id === 'carisima').eligible === false,
  duraGana.selected);
check('21 · J · el objetivo blando decide entre las que SÍ cumplen',
  motor.decidir(ctxDe([opt('a', { quality: 0.9, cost: 0.05 }), opt('b', { quality: 0.5, cost: 0.05 })])).selected === 'a');

/* K · multiobjetivo. L · Pareto. */
const multi = motor.decidir(ctxDe(
  [opt('calidad', { quality: 0.95, cost: 0.30 }), opt('precio', { quality: 0.88, cost: 0.10 })],
  { objective: { weights: { quality: 1, cost: 1 } } }));
check('22 · K · con dos ejes en conflicto sigue eligiendo', multi.status === 'decided');
check('23 · L · y dice que no hay ganadora objetiva', igual([...multi.paretoFront].sort(), ['calidad', 'precio']),
  JSON.stringify(multi.paretoFront));
const dominada = motor.decidir(ctxDe([opt('buena', { quality: 0.9, cost: 0.1 }), opt('peor', { quality: 0.5, cost: 0.9 })]));
check('24 · una dominada NO entra en el frente', dominada.paretoFront === undefined && dominada.selected === 'buena');

/* M · presupuesto agotado. N · tope de candidatos. O · iteraciones. */
const muchas = Array.from({ length: 500 }, (_, i) => opt(`o${String(i).padStart(3, '0')}`, { quality: i / 500, cost: 0.01 }));
const acotada = motor.decidir(ctxDe(muchas));
check('25 · M+N · 500 opciones se acotan al tope y se avisa',
  acotada.warnings.includes('candidates_capped') && acotada.spend.candidates <= A.TOPES_MAXIMOS.maxCandidates,
  `${acotada.spend.candidates} candidatos`);
check('26 · y aun así devuelve una decisión, no un error', acotada.status === 'decided');
const conTope = motor.decidir(ctxDe(muchas, { budget: { maxCandidates: 5 } }));
check('27 · un tope más estrecho manda', conTope.spend.candidates === 5 && conTope.candidates.length === 5,
  `${conTope.spend.candidates}`);
check('28 · O · las iteraciones también se cuentan', acotada.spend.iterations > 0 && acotada.spend.algorithmCalls === 1);

/* P · orden determinista. Q · misma entrada repetida. */
const mismo = () => motor.decidir(ctxDe([opt('b', { quality: 0.5 }), opt('a', { quality: 0.5 }), opt('c', { quality: 0.5 })]));
check('29 · P · el orden es estable y alfabético al empatar',
  igual(mismo().candidates.map((c) => c.id), ['a', 'b', 'c']));
check('30 · Q · dos ejecuciones idénticas dan lo MISMO, campo por campo',
  igual(mismo(), mismo()));

/* R · versionado. S · sin evidencia. T · evidencia insuficiente. */
/* @2 desde S2-A (contrato 1.10): A1 cambió lo que decide —la frontera en lo que se pide y el desempate por contenido—. */
check('31 · R · la versión viaja en la decisión y en el registro',
  mismo().algorithm === A.DECISION_ENGINE_REF && A.DECISION_ENGINE_REF.endsWith('@2'));
const sinEv = motor.decidir(ctxDe([opt('a', { quality: 0.9, cost: 0.1 })]));
check('32 · S · sin evidencia, confianza 0 e incertidumbre `unknown`',
  sinEv.confidence.value === 0 && sinEv.uncertainty === 'unknown' && sinEv.warnings.includes('low_confidence'));
check('33 · pero NO se oculta: se elige igual y la explicación lo dice',
  sinEv.status === 'decided' && sinEv.explanation.some((f) => f.includes('no hay evidencia')));
const exigente = motor.decidir(ctxDe([opt('a', { quality: 0.9, cost: 0.1 })], { constraints: { minConfidence: 0.5 } }));
check('34 · T · con confianza mínima exigida, se rechaza y se dice cuál es el fallo',
  exigente.status === 'undecided' && exigente.failure === 'insufficient_evidence',
  `${exigente.status}/${exigente.failure}`);
check('35 · y el candidato queda marcado con su motivo',
  exigente.candidates.some((c) => c.reason === 'constraint:minConfidence'));

/* U · ninguna válida (ya en 10). V · fallo del algoritmo. W · dato incomprobable. */
for (const [que, ctx] of [['sin contexto', undefined], ['sin objetivo', { trace: TRAZA, options: [] }],
                          ['sin traza', { objective: { weights: {} }, options: [] }]]) {
  const d = motor.decidir(ctx);
  check(`36 · V · ${que} → algorithm_failure, no una elección inventada`,
    d.status === 'invalid' && d.failure === 'algorithm_failure' && d.selected === undefined);
}
const incomprobable = motor.decidir(ctxDe([opt('a', { quality: 0.9 })], { constraints: { budget: { maxUsd: 0.1 } } }));
check('37 · W · lo que no se puede comprobar no compite, y se distingue de «no cumple»',
  incomprobable.failure === 'insufficient_evidence' && incomprobable.candidates[0].reason === 'unverifiable:budget.maxUsd',
  `${incomprobable.failure} · ${incomprobable.candidates[0].reason}`);
const permisivo = A.crearMotorDeDecision({ datoAusente: 'admit' });
check('38 · y la política contraria es explícita, no un accidente',
  permisivo.decidir(ctxDe([opt('a', { quality: 0.9 })], { constraints: { budget: { maxUsd: 0.1 } } })).status === 'decided');

/* X · sin opciones. Y · duplicadas. Z · malformadas. */
const vacio = motor.decidir(ctxDe([]));
check('39 · X · sin opciones no se inventa ninguna', vacio.status === 'undecided' && vacio.failure === 'insufficient_evidence');
const dupes = motor.decidir(ctxDe([opt('a', { quality: 0.9 }), opt('a', { quality: 0.1 })]));
check('40 · Y · con ids duplicados sigue siendo determinista', igual(dupes, motor.decidir(ctxDe([opt('a', { quality: 0.9 }), opt('a', { quality: 0.1 })]))));
const malformadas = motor.decidir(ctxDe([{ id: 'x' }, opt('b', { quality: 0.5, cost: 0.1 })]));
check('41 · Z · una opción sin `values` no rompe ni gana por ausencia',
  malformadas.status === 'decided' && malformadas.selected === 'b', malformadas.selected);
check('42 · y un contexto con `options` que no es lista se rechaza',
  motor.decidir({ ...ctxDe([]), options: 'no soy una lista' }).failure === 'algorithm_failure');

/* Restricciones contradictorias. */
const imposible = motor.decidir(ctxDe([opt('a', { quality: 0.5 })], {
  constraints: { requiredCapabilities: ['voice.tts'], forbiddenCapabilities: ['voice.tts'] } }));
check('43 · unas restricciones que se contradicen se dicen, no se «resuelven»',
  imposible.failure === 'constraint_conflict' && imposible.explanation[0].includes('imposibles'));

console.log('\n─── C. Propiedades que deben cumplirse SIEMPRE ───');

/* Una rechazada por restricción dura nunca puede ganar. Probado sobre 200 casos. */
let violaciones = 0;
for (let i = 0; i < 200; i++) {
  const tope = 0.05 + (i % 20) / 100;
  const ops = Array.from({ length: 6 }, (_, k) => opt(`o${k}`, { quality: ((i + k) % 10) / 10, cost: ((i * 3 + k * 7) % 50) / 100 }));
  const d = motor.decidir(ctxDe(ops, { constraints: { budget: { maxUsd: tope } } }));
  if (d.status !== 'decided') continue;
  const elegido = ops.find((o) => o.id === d.selected);
  if (elegido.values.cost > tope) violaciones++;
}
check('44 · PROPIEDAD · lo rechazado por una restricción dura nunca gana (200 casos)', violaciones === 0, `${violaciones} violaciones`);

/* Bajar el presupuesto nunca produce una elección que lo viole. */
let malas = 0;
for (let t = 1; t <= 40; t++) {
  const tope = t / 100;
  const ops = [opt('a', { quality: 0.9, cost: 0.30 }), opt('b', { quality: 0.6, cost: 0.10 }), opt('c', { quality: 0.3, cost: 0.02 })];
  const d = motor.decidir(ctxDe(ops, { constraints: { budget: { maxUsd: tope } } }));
  if (d.status === 'decided' && ops.find((o) => o.id === d.selected).values.cost > tope) malas++;
}
check('45 · PROPIEDAD · reducir el presupuesto nunca devuelve algo que lo viole', malas === 0);

/*
 * Mejorar el eje que se maximiza no puede empeorar la posición. Se afirma con
 * desigualdad ESTRICTA: en el empate exacto manda el desempate, y ahí gana
 * «fija» por orden alfabético — que es lo correcto y lo que se comprueba aparte.
 */
let peores = 0; const posiciones = [];
for (let q = 1; q <= 20; q++) {
  const ops = [opt('sube', { quality: q / 20, cost: 0.1 }), opt('fija', { quality: 0.5, cost: 0.1 })];
  const pos = motor.decidir(ctxDe(ops, { objective: { weights: { quality: 1 } } })).candidates.findIndex((c) => c.id === 'sube');
  posiciones.push(pos);
  if (q / 20 > 0.5 && pos !== 0) peores++;
}
check('46 · PROPIEDAD · subir el eje que se maximiza nunca baja de puesto', peores === 0, `${peores} anomalías`);
/* Y la posición solo puede mejorar al subir: nunca va a peor por subir. */
check('46b · PROPIEDAD · la posición es monótona en ese eje',
  posiciones.every((p, i) => i === 0 || p <= posiciones[i - 1]), posiciones.join(''));
check('46c · y en el empate exacto decide el `id`, de forma reproducible',
  motor.decidir(ctxDe([opt('sube', { quality: 0.5, cost: 0.1 }), opt('fija', { quality: 0.5, cost: 0.1 })],
    { objective: { weights: { quality: 1 } } })).selected === 'fija');

/* Una dominada nunca se elige si existe una dominante compatible. */
let dominadaElegida = 0;
for (let i = 0; i < 50; i++) {
  const ops = [opt('mejor', { quality: 0.9, cost: 0.1 }), opt('peor', { quality: 0.9 - (i + 1) / 100, cost: 0.1 + (i + 1) / 100 })];
  if (motor.decidir(ctxDe(ops)).selected === 'peor') dominadaElegida++;
}
check('47 · PROPIEDAD · una dominada no se elige habiendo una dominante (50 casos)', dominadaElegida === 0);

/* Y el desempate es una política declarada, no una costumbre. */
check('48 · el desempate está declarado como datos, en orden',
  igual(A.COMPARADORES.map((c) => c.nombre), ['objective', 'confidence', 'coverage', 'reliability', 'cost', 'latency', 'id']));
check('49 · y se puede sustituir por otra política', A.crearMotorDeDecision({
  comparadores: [{ nombre: 'alReves', comparar: (a, b) => (a.id < b.id ? 1 : -1) }],
}).decidir(ctxDe([opt('a', { quality: 0.5 }), opt('z', { quality: 0.5 })])).selected === 'z');
/*
 * Y si esa política de fuera devuelve NaN —restar dos infinitos, por ejemplo—,
 * NO puede cortar la cadena: `NaN !== 0` es cierto y el desempate se detendría
 * antes del `id`, que es justo el fallo que se encontró en A1. Con un solo
 * comparador roto, el resultado tiene que seguir siendo reproducible.
 */
const rota = A.crearMotorDeDecision({ comparadores: [{ nombre: 'rota', comparar: () => NaN }, ...A.COMPARADORES] });
const conRota = () => rota.decidir(ctxDe([opt('zeta', { quality: 0.5 }), opt('alfa', { quality: 0.5 })]));
check('49b · un comparador que devuelve NaN no rompe el determinismo',
  conRota().selected === 'alfa' && igual(conRota(), conRota()), conRota().selected);

console.log('\n─── D. Reproducibilidad ───');

const contexto = ctxDe(
  [opt('a', { quality: 0.8, cost: 0.2, latency: 500 }), opt('b', { quality: 0.8, cost: 0.2, latency: 900 })],
  { signals: [senal('option.quality', 0.8, 'measured', { subject: 'a', at: 10, sampleSize: 30 })] });
const corridas = Array.from({ length: 12 }, () => motor.decidir(contexto));
check('50 · doce ejecuciones idénticas dan doce resultados idénticos',
  corridas.every((d) => igual(d, corridas[0])));
check('51 · y el registro de la decisión también',
  igual(A.registroDeDecision(corridas[0], contexto, 1, 'a'), A.registroDeDecision(corridas[11], contexto, 1, 'a')));
check('52 · el registro guarda CLAVES de señal, nunca valores',
  igual([...A.registroDeDecision(corridas[0], contexto, 1, 'a').signalKeys], ['option.quality']));
check('53 · y la decisión lleva objetivo Y restricciones: sin las dos no se reproduce',
  !!corridas[0].objective && corridas[0].constraints === undefined && !!corridas[0].signalKeys);
const conRestric = motor.decidir(ctxDe([opt('a', { quality: 0.9, cost: 0.01 })], { constraints: { budget: { maxUsd: 1 } } }));
/* Con `?.`: una guarda que lanza aborta la batería y oculta todo lo que venga detrás. */
check('54 · cuando hay restricciones, viajan con la decisión', conRestric.constraints?.budget?.maxUsd === 1,
  JSON.stringify(conRestric.constraints ?? null));

console.log('\n─── E. La línea base, y qué aporta el motor ───');

const escenario = ctxDe([
  opt('alfa', { quality: 0.70, cost: 0.20, latency: 5000 }),
  opt('beta', { quality: 0.82, cost: 0.18, latency: 4000 }),
]);
const dBase = base.decidir(escenario);
const dMotor = motor.decidir(escenario);
check('55 · la línea base elige la primera alfabética, y lo admite',
  dBase.selected === 'alfa' && dBase.explanation.some((f) => f.includes('No es una decisión informada')));
check('56 · el motor elige otra cosa', dMotor.selected === 'beta');
const valorDe = (id) => escenario.options.find((o) => o.id === id).values;
const valor = A.valorAportado(A.DECISION_ENGINE_REF,
  { quality: valorDe('alfa').quality, costUsd: valorDe('alfa').cost, latencyMs: valorDe('alfa').latency },
  { quality: valorDe('beta').quality, costUsd: valorDe('beta').cost, latencyMs: valorDe('beta').latency },
  dMotor.spend);
check('57 · y se puede medir cuánto aportó, con la báscula de A0',
  valor.improved === true && valor.regressions.length === 0,
  valor.deltas.map((d) => `${d.axis} ${d.absolute > 0 ? '+' : ''}${d.absolute.toFixed(3)}`).join(' · '));
check('58 · la línea base aplica las MISMAS restricciones: la comparación mide elegir, no filtrar',
  base.decidir(ctxDe([opt('caro', { quality: 1, cost: 9 }), opt('barato', { quality: 0.1, cost: 0.01 })],
    { constraints: { budget: { maxUsd: 0.1 } } })).selected === 'barato');
check('59 · y no se puede activar: es `draft` por contrato', A.DESCRIPTOR_DE_LA_BASE.status === 'draft');
check('60 · `userValue` sigue sin fórmula inventada',
  A.EJES.includes('userValue') && !/userValue\s*[:=]\s*[0-9(]/.test(sinComentarios(leer('functions/src/core/algorithm/decision-engine.ts'))));

console.log('\n─── F. Los veinte sabotajes ───');

const FUENTES = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/algorithm'))
  .filter((f) => f.endsWith('.ts')).map((f) => ({ f, src: leer(`functions/src/core/algorithm/${f}`) }));

/* 1 · quitar el filtro de restricciones → probado por la propiedad 44 y por 20. */
check('61 · SABOTAJE 1 · sin filtro de restricciones, una cara ganaría → hoy no gana',
  duraGana.selected === 'modesta' && duraGana.candidates.find((c) => c.id === 'carisima').eligible === false);

/* 2, 18, 19, 20 · una opción que nombra una implementación. */
for (const [que, mala] of [
  ['2 · opción prohibida', estrategia('s', [{ ...paso('a', 'voice.tts'), input: { provider: 'elevenlabs' } }])],
  ['18 · provider dentro de la estrategia', estrategia('s', [{ ...paso('a', 'voice.tts'), input: { providerId: 'x' } }])],
  ['19 · model como autoridad', estrategia('s', [{ ...paso('a', 'voice.tts'), modelId: 'eleven_v3' }])],
  ['20 · allowedProviders', estrategia('s', [{ ...paso('a', 'voice.tts'), input: { allowedProviders: ['minimax'] } }])],
]) {
  const d = motor.decidir(ctxDe([
    { id: 'mala', value: mala, values: { quality: 1, cost: 0.001 } },
    opt('limpia', { quality: 0.1, cost: 0.5 }, estrategia('limpia', [paso('a', 'text.generate')])),
  ]));
  const veredicto = d.candidates.find((c) => c.id === 'mala');
  check(`62 · SABOTAJE ${que} → rechazada aunque sea la mejor`,
    d.selected !== mala && veredicto && !veredicto.eligible && veredicto.reason.startsWith('authority:'),
    veredicto ? veredicto.reason : 'NO DETECTADA');
}
/*
 * Y la frontera vale para CUALQUIER opción, no solo para las que se reconocen
 * como estrategia. Reconocer primero y vigilar después dejaría una puerta del
 * tamaño de «no parezcas una estrategia»: bastaría omitir `expected`.
 */
const noEsEstrategia = motor.decidir(ctxDe([
  { id: 'disfrazada', value: { id: 'x', steps: [{ id: 'a', input: { providerId: 'elevenlabs' } }] }, values: { quality: 1 } },
  opt('limpia', { quality: 0.1 }),
]));
check('62b · una opción que NO es estrategia también se revisa',
  noEsEstrategia.selected === 'limpia' &&
  noEsEstrategia.candidates.find((c) => c.id === 'disfrazada').reason === 'authority:providerId',
  noEsEstrategia.candidates.find((c) => c.id === 'disfrazada').reason);
check('62c · y una descomposición no se confunde con una estrategia mal formada',
  A.crearMotorDeDecision().decidir(ctxDe([
    { id: 'desc', value: { id: 'T:x', steps: [paso('a', 'text.generate')], tandas: [['a']] }, values: { steps: 1 } },
  ])).status === 'decided');
check('63 · y la frontera es la de A0, sin segunda lista',
  leer('functions/src/core/algorithm/decision-engine.ts').includes("violacionesDeEstrategia") &&
  leer('functions/src/core/algorithm/authority.ts').includes("import { claveDeImplementacion } from '../planner'"));

/* 3 · convertir missing en cero. */
check('64 · SABOTAJE 3 · si «falta» valiera 0, `aMedias` perdería; hoy no',
  aMedias.score.total === 0.8 && !aMedias.score.missing.includes('quality'));

/* 4 · ignorar confidence. 5 · ignorar evidence. */
check('65 · SABOTAJE 4 · la confianza desempata de verdad', conEvidencia.selected === 'conDatos');
check('66 · SABOTAJE 5 · la evidencia mueve la confianza',
  conEvidencia.confidence.value > 0 && sinEv.confidence.value === 0);
/*
 * Y la cobertura también, que es la otra mitad. Con la MISMA evidencia, medir
 * la mitad de los ejes con peso no puede dar la misma confianza que medirlos
 * todos: un total sacado de la mitad dice la mitad.
 */
const mismaEvidencia = (id) => senal('option.quality', 0.8, 'measured', { subject: id, at: 5, sampleSize: 40 });
const completa = motor.decidir(ctxDe([opt('todo', { quality: 0.8, cost: 0.2 })], { signals: [mismaEvidencia('todo')] }));
const parcial = motor.decidir(ctxDe([opt('todo', { quality: 0.8 })], { signals: [mismaEvidencia('todo')] }));
check('66b · SABOTAJE 5b · con la misma evidencia, media cobertura da menos confianza',
  completa.confidence.value > parcial.confidence.value && parcial.confidence.value > 0,
  `completa ${completa.confidence.value.toFixed(2)} vs parcial ${parcial.confidence.value.toFixed(2)}`);
/* 0,67 y no 0,50: los pesos son 2:1, así que `quality` sola cubre dos tercios. */
check('66c · y la confianza explica de dónde sale',
  /cobertura 0\.67/.test(parcial.confidence.because) && /sin medir: cost/.test(parcial.confidence.because),
  parcial.confidence.because);

/* 6 · saltarse Pareto. */
check('67 · SABOTAJE 6 · el frente se declara cuando lo hay', igual([...multi.paretoFront].sort(), ['calidad', 'precio']));

/* 7 · romper el desempate determinista. */
check('68 · SABOTAJE 7 · el desempate termina siempre en el `id`',
  A.COMPARADORES[A.COMPARADORES.length - 1].nombre === 'id' && igual(mismo(), mismo()));

/* 8, 9, 10 · presupuesto, candidatos, iteraciones. */
check('69 · SABOTAJE 8+9 · el presupuesto corta y lo dice',
  conTope.spend.candidates === 5 && acotada.warnings.includes('budget_exhausted'));
const cIter = A.contadorDelMotor({ maxIterations: 3 });
let vueltas = 0; while (cIter.gastar('iterations') && vueltas < 10000) vueltas++;
check('70 · SABOTAJE 10 · las iteraciones tienen techo', vueltas === 3, `${vueltas}`);

/* 11, 12 · azar y reloj. 13-17 · proveedor, Router, Credits, Asset, Job. */
for (const prohibido of ['Math.random', 'Date.now', 'fetch(', 'firebase', 'process.env']) {
  const donde = FUENTES.filter(({ src }) => sinComentarios(src).includes(prohibido)).map((x) => x.f);
  check(`71 · SABOTAJE 11/12 · nada de «${prohibido}»`, donde.length === 0, donde.join(',') || 'ninguno');
}
for (const [que, palabras] of [
  ['13 · llamar a un proveedor', ['adapterRun', 'providers/', 'ejecutar(']],
  ['14 · tocar el Router', ['crearRouter', 'RouterPorts', 'RoutingDecision', "from '../router'"]],
  ['15 · tocar Credits', ['spendCredits', 'refundCredits', 'holdCredits', 'creditsBalance']],
  ['16 · crear un Asset', ['createAsset', 'materialesDeResultado', 'ownerId']],
  ['17 · crear un Job', ['crearJob', 'JobStore', 'enqueue']],
]) {
  const donde = FUENTES.filter(({ src }) => palabras.some((p) => sinComentarios(src).includes(p))).map((x) => x.f);
  check(`72 · SABOTAJE ${que} → el verbo no existe en la capa`, donde.length === 0, donde.join(',') || 'ninguno');
}
const importes = FUENTES.flatMap(({ f, src }) =>
  [...sinComentarios(src).matchAll(/from '([^']+)'/g)].map((m) => m[1]).filter((r) => !r.startsWith('.')).map((r) => `${f}→${r}`));
check('73 · y la capa sigue sin importar nada de fuera del Core', importes.length === 0, importes.join(', ') || 'ninguno');
/* No hay LLM: ni el nombre de un modelo aparece. */
for (const modelo of ['gemini', 'deepseek', 'openai', 'anthropic', 'claude']) {
  const donde = FUENTES.filter(({ src }) => new RegExp(modelo, 'i').test(sinComentarios(src))).map((x) => x.f);
  check(`74 · NO LLM · «${modelo}» no aparece`, donde.length === 0, donde.join(',') || 'ninguno');
}

console.log('\n─── G. Rendimiento ───');

/*
 * No es una promesa de latencia: es comprobar el orden de magnitud. Decidir
 * tiene que ser despreciable frente a una llamada a un proveedor —segundos—, o
 * la capa cuesta más de lo que ahorra, que es la trampa que `valorAportado`
 * existe para detectar.
 */
const medir = (cuantas) => {
  const ops = Array.from({ length: cuantas }, (_, i) =>
    opt(`o${String(i).padStart(3, '0')}`, { quality: (i % 97) / 97, cost: (i % 31) / 100, latency: 100 + (i % 17) * 50, reliability: (i % 11) / 11 }));
  const c = ctxDe(ops, { budget: { maxCandidates: 256 } });
  motor.decidir(c);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) motor.decidir(c);
  return Number(process.hrtime.bigint() - t0) / 20 / 1e6;
};
const tiempos = [10, 50, 100, 256].map((k) => [k, medir(k)]);
for (const [k, ms] of tiempos) console.log(`   ${String(k).padStart(3)} opciones → ${ms.toFixed(2)} ms`);
check('75 · 256 opciones se deciden en menos de 50 ms', tiempos[3][1] < 50, `${tiempos[3][1].toFixed(2)} ms`);
/* Y que no explote: cuadruplicar las opciones no puede multiplicar por veinte el tiempo. */
const factor = tiempos[3][1] / Math.max(tiempos[1][1], 0.001);
check('76 · y de 50 a 256 el coste crece de forma razonable, no cuadrática', factor < 20, `×${factor.toFixed(1)}`);

console.log('\n─── H. El historial es EVIDENCIA (contrato 1.7) ───');

/*
 * A1 no leía `history`. Ahora lo lee, y lo que hace con él lo decide lo que el
 * historial ES. El del ÁMBITO es de todas las alternativas a la vez: se declara
 * y no ordena. El de CADA alternativa entra como su probabilidad de éxito
 * medida, con cinco reglas, y es lo único que puede cambiar una decisión.
 */
const DOS = [opt('rapida', { latency: 800 }, { n: 'rapida' }), opt('lenta', { latency: 1200 }, { n: 'lenta' })];
const HIST = Object.freeze({ rapida: Object.freeze({ sampleSize: 40, succeeded: 5 }), lenta: Object.freeze({ sampleSize: 40, succeeded: 38 }) });
const EXITO = { weights: { latency: 1, successProbability: 2 } };
/* La elegida, y solo si lo que se entrega (`selected`) es la que el ranking marca: si discrepan, no hay elegida. */
const elegidaDe = (d) => {
  const marcada = d.candidates.find((c) => c.reason === 'selected');
  return marcada && d.selected === marcada.value ? marcada.id : undefined;
};
/* Lo que el historial NO debe tocar cuando no puede ordenar: todo menos lo que dice que lo leyó. */
const sinLectura = (d) => JSON.stringify({ ...d, signalKeys: undefined, explanation: undefined });

const sinHist = motor.decidir(ctxDe(DOS, { objective: EXITO }));
const conHist = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: HIST }));
check('78 · CONTROL · sin historial gana la rápida: el objetivo solo puede medir la latencia',
  elegidaDe(sinHist) === 'rapida' && sinHist.selectedScore.missing.includes('successProbability'));
check('79 · con el historial PROPIO de cada una, gana la que de verdad sale bien: el cambio es válido',
  elegidaDe(conHist) === 'lenta', `rápida 5/40 · lenta 38/40 · ${conHist.candidates.map((c) => `${c.id} ${c.score?.total?.toFixed(3)}`).join(' · ')}`);
check('80 · y se EXPLICA: qué historial se usó, como qué, y quién salió elegida',
  conHist.explanation.some((f) => /Historial propio usado como probabilidad de éxito: «lenta», «rapida»/.test(f)) &&
  conHist.explanation[0].includes('«lenta»') && conHist.signalKeys.includes('history.successRate'));
check('81 · con su procedencia: una señal DERIVADA con su muestra, en la evidencia de la elegida',
  conHist.evidence.some((e) => e.claim === 'lenta:history.successRate' && e.signal.source === 'derived' &&
    e.signal.sampleSize === 40 && e.signal.value === 38 / 40 && e.signal.subject === 'lenta'));
check('82 · el historial PESA, no decide: si el objetivo pesa más la latencia, sigue ganando la rápida',
  elegidaDe(motor.decidir(ctxDe(DOS, { objective: { weights: { latency: 3, successProbability: 1 } }, historyByOption: HIST }))) === 'rapida');

const soloLatencia = motor.decidir(ctxDe(DOS, { objective: { weights: { latency: 1 } } }));
const soloLatenciaConHist = motor.decidir(ctxDe(DOS, { objective: { weights: { latency: 1 } }, historyByOption: HIST }));
check('83 · REGLA 2 · si el objetivo no pondera la probabilidad de éxito, el historial no toca NADA de la evaluación',
  sinLectura(soloLatenciaConHist) === sinLectura(soloLatencia));
check('84 · y lo dice, alternativa a alternativa',
  soloLatenciaConHist.explanation.filter((f) => /no pondera la probabilidad de éxito/.test(f)).length === 2);

const propia = [opt('rapida', { latency: 800, successProbability: 0.9 }, { n: 'rapida' }), DOS[1]];
const conPropia = motor.decidir(ctxDe(propia, { objective: EXITO, historyByOption: HIST }));
check('85 · REGLA 3 · lo que la alternativa trae NO se pisa: su 0,9 sigue siendo su 0,9',
  conPropia.candidates.find((c) => c.id === 'rapida').score.fits.successProbability === 0.9 &&
  conPropia.explanation.some((f) => /«rapida» sin usar: trae su propia probabilidad de éxito/.test(f)));

const fueraPorTope = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: HIST, constraints: { maxLatencyMs: 1000 } }));
check('86 · REGLA 4 · una alternativa fuera por restricciones sigue fuera, con el mejor historial del mundo',
  fueraPorTope.candidates.find((c) => c.id === 'lenta').eligible === false &&
  fueraPorTope.candidates.find((c) => c.id === 'lenta').reason === 'constraint:maxLatencyMs' && elegidaDe(fueraPorTope) === 'rapida');
check('87 · y se dice que el historial no rescata a nadie',
  fueraPorTope.explanation.some((f) => /1 alternativa\(s\) con historial no competían: el historial no rescata a nadie/.test(f)));
const conMinimo = (h) => motor.decidir(ctxDe(DOS, { objective: EXITO, constraints: { minConfidence: 0.5 }, ...(h ? { historyByOption: h } : {}) }));
check('88 · REGLA 4 · la confianza mínima se juzga SIN el historial: ni con él entra quien no llegaba',
  conMinimo().failure === 'insufficient_evidence' && conMinimo(HIST).failure === 'insufficient_evidence' &&
  conMinimo(HIST).candidates.every((c) => c.reason === 'constraint:minConfidence'),
  'el historial reordena a las que compiten; no mete a nadie');
check('88b · y cuando no compite ninguna, también lo dice: el historial no rescató a nadie',
  conMinimo(HIST).explanation.some((f) => f === '2 alternativa(s) con historial no competían: el historial no rescata a nadie.') &&
  !conMinimo().explanation.some((f) => /historial/.test(f)));

/*
 * Cada ventana mala va con la de la rápida BUENA al lado. Solo así el caso es de
 * los que prueban algo: si la de la lenta se usara, con su 38 de 40 ganaría la
 * lenta (es el 79). Sin la de la rápida, la rápida ganaba igual —lo que no
 * tiene historial no se castiga— y la guarda podía desaparecer sin que se viera.
 */
const SUELO = A.POLITICA_MINIMA.minSampleSize;
for (const [que, ventana] of [
  ['nombra un proveedor', { sampleSize: 40, succeeded: 38, providerId: 'p-favorito' }],
  ['nombra un modelo', { sampleSize: 40, succeeded: 38, modelId: 'm-favorito' }],
  ['nombra un adaptador', { sampleSize: 40, succeeded: 38, adapterId: 'a-favorito' }],
  ['no tiene muestra', { sampleSize: 0, succeeded: 0 }],
  ['tiene más éxitos que muestra', { sampleSize: 10, succeeded: 11 }],
  ['no es un número', { sampleSize: '40', succeeded: 38 }],
  ['no es una ventana', 'mucho éxito'],
  ['es una anécdota: una muestra por debajo del suelo de A7', { sampleSize: SUELO - 1, succeeded: SUELO - 1 }],
]) {
  const d = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: { rapida: HIST.rapida, lenta: ventana } }));
  check(`89 · REGLA 5 · una ventana que ${que} no se usa, y se dice`,
    elegidaDe(d) === 'rapida' &&
    d.explanation.some((f) => f === 'Historial propio usado como probabilidad de éxito: «rapida».') &&
    d.explanation.some((f) => /«lenta» sin usar: su historial no se puede leer/.test(f)));
}
const soloLaLenta = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: { lenta: HIST.lenta } }));
check('89b · a quien no tiene historial no se le castiga: lo que falta no cuenta como malo, y la rápida sigue ganando',
  elegidaDe(soloLaLenta) === 'rapida' &&
  soloLaLenta.candidates.find((c) => c.id === 'rapida').score.missing.includes('successProbability') &&
  soloLaLenta.signalKeys.includes('history.successRate'),
  'el historial reajusta a la alternativa de la que es; no degrada a las demás');
check('90 · el historial nunca cambia QUÉ se elige, solo cómo puntúa: el valor entregado es el de la alternativa, intacto',
  conHist.selected === DOS[1].value && !('successProbability' in DOS[1].values));
const conVentanaDeProveedor = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: { rapida: HIST.rapida, lenta: { sampleSize: 40, succeeded: 38, providerId: 'p' } } }));
check('91 · y la decisión no lleva ninguna implementación, venga lo que venga en el historial',
  A.violacionesEn({ providerId: 'p' }, 'control').length > 0 &&
  A.violacionesEn(conVentanaDeProveedor, 'decision').length === 0 &&
  A.violacionesEn(conHist, 'decision').length === 0);

const ambito = motor.decidir(ctxDe(DOS, { objective: EXITO, history: { sampleSize: 40, succeeded: 38 } }));
check('92 · el historial del ÁMBITO se LEE: queda declarado en lo que A1 miró',
  ambito.signalKeys.includes('history.decision') && !sinHist.signalKeys.includes('history.decision'));
check('93 · y NO ordena: es de todas a la vez, así que todo lo demás es idéntico byte a byte',
  sinLectura(ambito) === sinLectura(sinHist));
check('94 · y se explica por qué no ordena',
  ambito.explanation.some((f) => /Historial del ámbito de la decisión: 40 ejecución\(es\), 38 bien\. Es de todas las alternativas a la vez/.test(f)));
const ambitoRoto = motor.decidir(ctxDe(DOS, { objective: EXITO, history: { sampleSize: 5, succeeded: 9 } }));
check('95 · un historial del ámbito que no se puede leer no se declara como leído, y se dice',
  !ambitoRoto.signalKeys.includes('history.decision') && ambitoRoto.explanation.some((f) => /no se puede leer/.test(f)) &&
  sinLectura(ambitoRoto) === sinLectura(sinHist));

const doceConHist = Array.from({ length: 12 }, () => JSON.stringify(motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: HIST }))));
check('96 · la misma petición con el mismo historial, doce veces: idéntica', doceConHist.every((x) => x === doceConHist[0]));
/*
 * TODAS las permutaciones, no una. Con cuatro alternativas son 24, y cada
 * contexto pasa por un camino donde el orden de llegada se colaba antes de
 * 1.7: el frente de Pareto, las descartadas por restricciones o por confianza,
 * el fallo sin ninguna por encima del mínimo y el tope de candidatos. Cada uno
 * lleva su control: si el camino no se ejercita, la igualdad no prueba nada.
 */
const permutaciones = (xs) => (xs.length <= 1 ? [xs]
  : xs.flatMap((x, i) => permutaciones([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
const CUATRO = [
  opt('rapida', { latency: 800, cost: 3 }, { n: 'rapida' }), opt('lenta', { latency: 1200, cost: 1 }, { n: 'lenta' }),
  opt('media', { latency: 1000, cost: 2 }, { n: 'media' }), opt('lentisima', { latency: 5000, cost: 0.5 }, { n: 'lentisima' }),
];
const H4 = Object.freeze({ rapida: { sampleSize: 40, succeeded: 5 }, lenta: { sampleSize: 40, succeeded: 38 },
  media: { sampleSize: 10, succeeded: 7 }, lentisima: { sampleSize: 40, succeeded: 40 } });
const OBJ4 = { weights: { latency: 1, cost: 1, successProbability: 2 } };
/* Señales que SÍ cuentan: tienen por sujeto una alternativa, así que mueven su confianza. */
const SEN4 = [
  senal('latency.p50', 1150, 'measured', { subject: 'lenta' }), senal('cost.real', 2, 'measured', { subject: 'media' }),
  senal('latency.p50', 790, 'estimated', { subject: 'rapida' }), senal('demanda.hora', 3, 'derived'),
];
for (const [que, extra, control] of [
  ['con historial y frente de Pareto', { objective: OBJ4, historyByOption: H4 },
    (d) => d.paretoFront?.length === 4 && d.signalKeys.includes('history.successRate')],
  ['sin historial y frente de Pareto', { objective: { weights: { latency: 1, cost: 1 } } }, (d) => d.paretoFront?.length === 4],
  ['con descartadas por restricciones', { objective: OBJ4, historyByOption: H4, constraints: { maxLatencyMs: 900 } },
    (d) => d.candidates.filter((c) => c.reason === 'constraint:maxLatencyMs').length === 3],
  ['con descartadas por confianza mínima', { objective: OBJ4, historyByOption: H4, signals: SEN4, constraints: { minConfidence: 0.2 } },
    (d) => d.status === 'decided' && d.candidates.filter((c) => c.reason === 'constraint:minConfidence').length === 2],
  ['sin ninguna por encima de la confianza mínima', { objective: OBJ4, historyByOption: H4, constraints: { minConfidence: 0.2 } },
    (d) => d.failure === 'insufficient_evidence' && d.candidates.length === 4],
  ['bajo un tope de candidatos', { objective: OBJ4, historyByOption: H4, budget: { maxCandidates: 2 } },
    (d) => d.warnings.includes('candidates_capped') && d.candidates.length === 2],
]) {
  const salidas = new Set(permutaciones(CUATRO).map((p) => JSON.stringify(motor.decidir(ctxDe(p, extra)))));
  check(`97 · las 24 permutaciones de las alternativas ${que}: una sola decisión, byte a byte`,
    control(motor.decidir(ctxDe(CUATRO, extra))) && salidas.size === 1, `${salidas.size} salida(s)`);
}
check('97b · bajo un tope se miran las primeras por `id`, no las primeras en llegar',
  igual(motor.decidir(ctxDe([...CUATRO].reverse(), { objective: OBJ4, budget: { maxCandidates: 2 } })).candidates.map((c) => c.id).sort(),
    ['lenta', 'lentisima']));
check('98 · el historial en otro orden de claves, mismo resultado',
  JSON.stringify(motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: { lenta: HIST.lenta, rapida: HIST.rapida } }))) === JSON.stringify(conHist));
const conSenales = motor.decidir(ctxDe(CUATRO, { objective: OBJ4, historyByOption: H4, signals: SEN4 }));
const salidasPorSenales = new Set(permutaciones(SEN4).map((s) => JSON.stringify(motor.decidir(ctxDe(CUATRO, { objective: OBJ4, historyByOption: H4, signals: s })))));
check('99 · las 24 permutaciones de unas señales que SÍ mueven la decisión: una sola, byte a byte',
  conSenales.confidence.value !== motor.decidir(ctxDe(CUATRO, { objective: OBJ4, historyByOption: H4 })).confidence.value &&
  salidasPorSenales.size === 1, `${salidasPorSenales.size} salida(s)`);

/* El mapa de historial vigilado: cada clave que A1 consulta, y si lo recorre. */
const vistas = { recorridos: 0, claves: new Set() };
const vigilado = new Proxy(Object.fromEntries(Array.from({ length: 50_000 }, (_, i) => [`fantasma${i}`, { sampleSize: 40, succeeded: 40 }])), {
  ownKeys(t) { vistas.recorridos++; return Reflect.ownKeys(t); },
  get(t, k, r) { vistas.claves.add(String(k)); return Reflect.get(t, k, r); },
  getOwnPropertyDescriptor(t, k) { vistas.claves.add(String(k)); return Reflect.getOwnPropertyDescriptor(t, k); },
  has(t, k) { vistas.claves.add(String(k)); return Reflect.has(t, k); },
});
const conFantasmas = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: vigilado }));
check('100 · A1 pregunta al historial por SUS alternativas y por nada más: ni lo recorre ni mira las que no están sobre la mesa',
  vistas.recorridos === 0 && igual([...vistas.claves].sort(), ['lenta', 'rapida']),
  `claves consultadas: ${vistas.claves.size} (${[...vistas.claves].slice(0, 4).join(', ') || 'ninguna'}${vistas.claves.size > 4 ? ', …' : ''}) · recorridos: ${vistas.recorridos}`);
check('100b · y lo que no está sobre la mesa no deja rastro: la decisión es la de sin historial, byte a byte',
  JSON.stringify(conFantasmas) === JSON.stringify(sinHist));

/* ── El suelo de muestra: no se inventa, es el de A7 ── */
check('101 · el suelo es el de A7, el que ninguna política de aprendizaje puede aflojar', SUELO === 5);
for (const n of [1, SUELO - 1]) {
  const d = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: { rapida: { sampleSize: n, succeeded: 0 }, lenta: { sampleSize: n, succeeded: n } } }));
  check(`102 · una muestra de ${n} no es una muestra: A1 decide como sin historial, y lo dice`,
    sinLectura(d) === sinLectura(sinHist) && !d.signalKeys.includes('history.successRate') &&
    d.explanation.filter((f) => f.includes(`por debajo de ${SUELO}: no es una muestra`)).length === 2);
}
const enElSuelo = motor.decidir(ctxDe(DOS, { objective: EXITO, historyByOption: { rapida: { sampleSize: SUELO, succeeded: 0 }, lenta: { sampleSize: SUELO, succeeded: SUELO } } }));
check('103 · y en el suelo exacto ya es muestra: la frontera es la de A7, no una nueva',
  elegidaDe(enElSuelo) === 'lenta' && enElSuelo.signalKeys.includes('history.successRate'));
const ambitoCorto = motor.decidir(ctxDe(DOS, { objective: EXITO, history: { sampleSize: SUELO - 1, succeeded: 1 } }));
check('104 · un historial del ámbito por debajo del suelo tampoco se declara como leído',
  !ambitoCorto.signalKeys.includes('history.decision') && ambitoCorto.explanation.some((f) => /no es una muestra/.test(f)) &&
  sinLectura(ambitoCorto) === sinLectura(sinHist));
const importsDeA1 = [...sinComentarios(leer('functions/src/core/algorithm/decision-engine.ts')).matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
check('105 · de A7, A1 toma la DEFINICIÓN de muestra y nada más: ni su motor, ni su aprendizaje, ni nada de A8',
  /import\s*\{\s*POLITICA_MINIMA\s*\}\s*from\s*'\.\/feedback'/.test(leer('functions/src/core/algorithm/decision-engine.ts')) &&
  !importsDeA1.some((p) => /feedback-engine|learning|context|integration/.test(p)), importsDeA1.join(' '));
/* `usoDeHistorial` ordena por sí mismo: A1 ya le pasa las alternativas en orden de `id`,
 * así que solo una llamada directa, desordenada, prueba que no depende de quien lo llame. */
const usoDirecto = A.usoDeHistorial({ zeta: HIST.lenta, alfa: HIST.rapida, beta: { sampleSize: 0, succeeded: 0 }, gamma: HIST.lenta },
  [opt('zeta', { latency: 1 }), opt('gamma', { latency: 1 }), opt('beta', { latency: 1 }), opt('alfa', { latency: 1 })], EXITO);
check('106 · el uso del historial sale en orden de `id` aunque las alternativas lleguen desordenadas',
  igual(usoDirecto.usadas, ['alfa', 'gamma', 'zeta']) && igual(usoDirecto.sinUsar.map((s) => s.id), ['beta']));

console.log('\n─── I. Cada alternativa, su identidad (contrato 1.8) ───');

/*
 * Una decisión compara alternativas que se distinguen por su `id`. Dos con el
 * mismo no son dos alternativas: son una ambigüedad, y A1 no la resuelve —ni
 * quedándose con una, ni renombrando, ni desempatando por el orden de llegada—.
 * Dice que la petición no tiene forma, y lo dice igual llegue como llegue.
 */
const DUP = [opt('beta', { latency: 900 }), opt('alfa', { latency: 800 }), opt('beta', { latency: 700 }), opt('gamma', { latency: 1000 })];
const rechazoDup = motor.decidir(ctxDe(DUP, { objective: EXITO }));
check('107 · ids repetidos: la petición NO tiene forma, y A1 no decide',
  rechazoDup.status === 'invalid' && rechazoDup.selected === undefined && rechazoDup.candidates.length === 0 &&
  rechazoDup.explanation.some((f) => f.includes('options: ids repetidos «beta»')), rechazoDup.explanation.join(' | '));
check('107b · y no «arregla» nada: ni se queda con una, ni renombra, ni concatena',
  !JSON.stringify(rechazoDup).includes('beta#') && !JSON.stringify(rechazoDup).includes('beta-2') &&
  rechazoDup.alternatives.length === 0 && rechazoDup.paretoFront === undefined);
const rechazosPorOrden = new Set(permutaciones(DUP).map((p) => JSON.stringify(motor.decidir(ctxDe(p, { objective: EXITO })))));
check('108 · con los repetidos en cualquier orden, el MISMO rechazo, byte a byte (las 24 permutaciones)',
  rechazosPorOrden.size === 1 && JSON.parse([...rechazosPorOrden][0]).status === 'invalid');
check('109 · y con un tope de candidatos que dejaría el repetido fuera, el mismo rechazo: se miran TODAS antes del tope',
  JSON.stringify(motor.decidir(ctxDe([...DUP].reverse(), { objective: EXITO, budget: { maxCandidates: 2 } }))) ===
  JSON.stringify(motor.decidir(ctxDe(DUP, { objective: EXITO, budget: { maxCandidates: 2 } }))) &&
  motor.decidir(ctxDe(DUP, { objective: EXITO, budget: { maxCandidates: 2 } })).status === 'invalid');
check('110 · y con historial por alternativa, el mismo rechazo: el historial no desempata identidades',
  motor.decidir(ctxDe(DUP, { objective: EXITO, historyByOption: { beta: { sampleSize: 40, succeeded: 40 } } })).status === 'invalid' &&
  JSON.stringify({ ...motor.decidir(ctxDe(DUP, { objective: EXITO, historyByOption: { beta: { sampleSize: 40, succeeded: 40 } } })), spend: undefined }) ===
  JSON.stringify({ ...rechazoDup, spend: undefined }));
/* Sin identidad, sin decisión: y si la puerta faltara, que se vea por aserción y no porque la suite reviente. */
const sinReventar = (fn) => { try { return fn(); } catch (e) { return { lanzo: String(e?.message ?? e) }; } };
for (const [que, rota] of [['sin id', { value: 'x', values: { latency: 1 } }], ['con id vacío', opt('', { latency: 1 })],
  ['con un id que no es texto', { id: 7, value: 'x', values: { latency: 1 } }], ['que no es una alternativa', null]]) {
  const d = sinReventar(() => motor.decidir(ctxDe([opt('alfa', { latency: 1 }), rota], { objective: EXITO })));
  check(`111 · una alternativa ${que} tampoco tiene identidad: no se decide`,
    d.status === 'invalid' && (d.explanation ?? []).some((f) => /sin identidad/.test(f)), d.lanzo ?? d.status);
}
check('112 · la línea base comparte la misma puerta: tampoco decide con identidades repetidas',
  base.decidir(ctxDe(DUP, { objective: EXITO })).status === 'invalid');
const muchasRepetidas = Array.from({ length: 40 }, (_, i) => opt(`id${i % 20}`, { latency: 100 + i }));
check('113 · el motivo está acotado: cinco ids como mucho, y cuántos más',
  motor.decidir(ctxDe(muchasRepetidas, { objective: EXITO })).explanation.some((f) => /«id0», «id1», «id10», «id11», «id12» y 15 más/.test(f)),
  motor.decidir(ctxDe(muchasRepetidas, { objective: EXITO })).explanation.join(' | '));
check('114 · CONTROL · las mismas alternativas con ids distintos sí se deciden',
  motor.decidir(ctxDe(DUP.map((o, i) => ({ ...o, id: `${o.id}${i}` })), { objective: EXITO })).status === 'decided');
/* Y los ocho del brief con identidades únicas: todas las permutaciones, el mismo historial, el tope. */
const unicas = new Set(permutaciones(CUATRO).map((p) => JSON.stringify(motor.decidir(ctxDe(p, { objective: OBJ4, historyByOption: H4 })))));
check('115 · ids únicos barajados, con el mismo historial: una sola decisión, byte a byte',
  unicas.size === 1 && JSON.parse([...unicas][0]).status === 'decided');
check('116 · y con un tope, la selección es determinista: las primeras por `id`, lleguen como lleguen',
  new Set(permutaciones(CUATRO).map((p) => JSON.stringify(motor.decidir(ctxDe(p, { objective: OBJ4, historyByOption: H4, budget: { maxCandidates: 2 } }))))).size === 1 &&
  igual(motor.decidir(ctxDe([...CUATRO].reverse(), { objective: OBJ4, budget: { maxCandidates: 2 } })).candidates.map((c) => c.id).sort(), ['lenta', 'lentisima']));

console.log('\n─── J. Sigue sin estar conectado ───');

/*
 * Con Node y no con `grep`: el `2>/dev/null` hacía que en Windows no corriera
 * nunca y aprobara siempre. Y con UNA excepción desde S1: la sombra, que carga
 * la capa por su puerta para observar. A1 por su nombre, ni ella.
 */
const PUERTA_DE_LA_SOMBRA = 'functions/src/creator/sombra.ts';
const recorrer77 = (dir, out = []) => {
  for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
    const h = dir + '/' + e.name;
    if (e.isDirectory()) recorrer77(h, out); else out.push(h);
  }
  return out;
};
const archivos77 = ['functions/src/creator', 'functions/src/runtime', 'functions/src/engine', 'functions/src/orchestrator', 'functions/src/router', 'functions/src/planner']
  .flatMap((d) => (fs.existsSync(path.resolve(RAIZ, d)) ? recorrer77(d) : []));
const conectado = archivos77.filter((f) => /core\/algorithm|crearMotorDeDecision|AlgorithmDecision/.test(leer(f)));
check('77 · nadie lo ha conectado a ninguna ruta de producción: solo la sombra observa, y sin nombrar a A1',
  archivos77.length > 50 && conectado.every((f) => f === PUERTA_DE_LA_SOMBRA) && !/crearMotorDeDecision/.test(leer(PUERTA_DE_LA_SOMBRA)),
  conectado.filter((f) => f !== PUERTA_DE_LA_SOMBRA).join(', ') || 'ninguna de más');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA1: el motor decide, se explica y no puede saltarse a nadie');
process.exit(failures ? 1 : 0);
