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

check('1 · se registra por el Registry de A0, no por uno nuevo',
  !!A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DEL_MOTOR]).registro.obtener(A.DECISION_ENGINE_ID, 1));
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
  motor.decidir(ctxDe([opt('a', { quality: 1 })])).algorithm === `${A.DECISION_ENGINE_ID}@1`);
check('7 · el contrato subió a 1.1 y sigue siendo compatible en mayor',
  ALGORITHM_CONTRACT_VERSION === '1.1' && ALGORITHM_CONTRACT_VERSION.split('.')[0] === '1');

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
check('31 · R · la versión viaja en la decisión y en el registro',
  mismo().algorithm === A.DECISION_ENGINE_REF && A.DECISION_ENGINE_REF.endsWith('@1'));
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

console.log('\n─── H. Sigue sin estar conectado ───');

const conectado = ['functions/src/creator', 'functions/src/runtime', 'functions/src/engine', 'functions/src/orchestrator', 'functions/src/router', 'functions/src/planner']
  .filter((d) => {
    try { return require_('node:child_process').execSync(`grep -rl "core/algorithm\\|crearMotorDeDecision\\|AlgorithmDecision" ${d} 2>/dev/null || true`, { cwd: RAIZ, encoding: 'utf8' }).trim().length > 0; }
    catch { return false; }
  });
check('77 · nadie lo ha conectado a ninguna ruta de producción', conectado.length === 0, conectado.join(', ') || 'ninguna');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA1: el motor decide, se explica y no puede saltarse a nadie');
process.exit(failures ? 1 : 0);
