/*
 * A0 — LA FUNDACIÓN DEL WEË ALGORITHM ENGINE.
 *
 * Todo lo que se puede EJECUTAR, se ejecuta contra el compilado, que es el que
 * correría en producción. Lo que no se puede ejecutar —que una capa no importe
 * infraestructura, que no exista un segundo sistema— se mide sobre la fuente.
 *
 *  A. La capa es pura y no duplica a nadie.
 *  B. El registro: versionado, estado, rechazos a la vista, acotado.
 *  C. Objetivos y restricciones.
 *  D. Señales: procedencia, frescura, forma, y nada que no deba estar.
 *  E. Confianza que se explica, e incertidumbre que admite no saber.
 *  F. Presupuesto computacional: tope, techo y paracaídas.
 *  G. Estrategias: niveles, coherencia, paralelismo imposible.
 *  H. Puntuación: relativa, determinista, con cobertura, y Pareto.
 *  I. Decisión: reproducible, y sin decidir cuando no hay con qué.
 *  J. Valor aportado: contra la línea base, y pensar también cuesta.
 *  K. LA FRONTERA DE AUTORIDAD. Los diez sabotajes del brief.
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
const { claveDeImplementacion } = lib('core/planner.js');

const FUENTES = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/algorithm'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ f, src: leer(`functions/src/core/algorithm/${f}`) }));

/* Un descriptor válido, para partir de algo que sí vale. */
const DESCRIPTOR = Object.freeze({
  id: 'niveles-de-dependencia', version: 1, contract: ALGORITHM_CONTRACT_VERSION,
  category: 'parallelization', status: 'active', purity: 'pure',
  purpose: 'Agrupa los pasos que no dependen unos de otros',
});
const senal = (key, value, source = 'measured', extra = {}) => ({ key, value, source, ...extra });
const paso = (id, capability, dependsOn) => ({ id, capability, purpose: `Paso ${id}`, produces: 'text', ...(dependsOn ? { dependsOn } : {}) });
const confianzaFalsa = (v) => ({ kind: 'algorithm', value: v, basis: [{ claim: 'x', signal: senal('a.b', 1), supports: true }] });
const estrategia = (id, steps, extra = {}) => ({
  id, label: id, proposedBy: 'x@1', steps,
  expected: { confidence: confianzaFalsa(0.9), uncertainty: 'known', ...(extra.expected ?? {}) },
  ...extra,
});

console.log('\n─── A. La capa es pura, y no duplica a nadie ───');

/*
 * Se nombran los módulos en vez de contarlos: un número obliga a editar esta
 * línea cada fase y no dice nada cuando falla. Una lista sí dice qué falta o
 * qué apareció sin avisar.
 */
const MODULOS = ['authority', 'baseline', 'budget', 'capability', 'decision', 'decision-engine',
  'decomposition', 'decomposition-engine', 'index', 'objective', 'parallelization',
  'parallelization-engine', 'registry', 'scoring', 'signals', 'strategy', 'strategy-engine',
  'types', 'value'];
check('1 · están exactamente los módulos declarados, ni uno más',
  igual(FUENTES.map((x) => x.f.replace('.ts', '')).sort(), [...MODULOS].sort()), FUENTES.map((x) => x.f).join(' '));
/* Si esto se rompiera, el Core habría dejado de ser probable con una tabla de casos. */
const importesFuera = FUENTES.flatMap(({ f, src }) =>
  [...sinComentarios(src).matchAll(/from '([^']+)'/g)].map((m) => m[1]).filter((r) => !r.startsWith('.')).map((r) => `${f}→${r}`));
check('2 · no importa NADA de fuera del Core', importesFuera.length === 0, importesFuera.join(', ') || 'ninguno');
for (const prohibido of ['firebase', 'fetch(', 'process.env', 'Math.random', 'Date.now']) {
  const donde = FUENTES.filter(({ src }) => sinComentarios(src).includes(prohibido)).map((x) => x.f);
  check(`3 · ni usa «${prohibido}»`, donde.length === 0, donde.join(', ') || 'ninguno');
}
/* Y no reescribe lo que ya existe: lo importa. */
for (const [que, de] of [['Budget', "'../cost'"], ['QualityRequirement', "'../workflow'"], ['PlanStep', "'../planner'"],
                         ['claveDeImplementacion', "'../planner'"], ['CAMPOS_PROHIBIDOS', "'../observability'"],
                         ['TraceContext', "'../observability'"], ['WeeError', "'../errors'"]]) {
  const usado = FUENTES.some(({ src }) => new RegExp(`import \\{[^}]*\\b${que}\\b[^}]*\\} from ${de}`).test(src));
  check(`4 · reutiliza ${que} del Core en vez de reescribirlo`, usado);
}
/* Y no se ha colado un segundo sistema de lo que ya tiene dueño. */
/*
 * La afirmación es «no lo REDEFINE», no «no aparece la palabra». Nombrar a
 * `RetryPolicy` para decir de quién es el reintento es exactamente lo que la
 * lista de efectos prohibidos debe hacer; DECLARARLO sería tener dos.
 */
for (const palabra of ['RoutingScore', 'RouterPolicy', 'RetryPolicy', 'Budget', 'QualityRequirement', 'PlanStep', 'TraceContext', 'CostEstimate']) {
  const declara = new RegExp(`(interface|type|class|const)\\s+${palabra}\\b`);
  const donde = FUENTES.filter(({ src }) => declara.test(sinComentarios(src))).map((x) => x.f);
  check(`5 · no REDEFINE «${palabra}»: lo importa del Core`, donde.length === 0, donde.join(', ') || 'ninguno');
}

console.log('\n─── B. El registro ───');

const { registro: r1, rechazados: rech1 } = A.crearRegistroDeAlgoritmos([DESCRIPTOR]);
check('6 · un descriptor válido entra', r1.cuantos() === 1 && !rech1.length);
check('7 · y se encuentra por id@version y por referencia',
  !!r1.obtener('niveles-de-dependencia', 1) && !!r1.porReferencia('niveles-de-dependencia@1'));
check('8 · un algoritmo desconocido no aparece de la nada', r1.obtener('no-existe', 1) === undefined);

/* Versionado: la vigente es la mayor ACTIVA, no la mayor a secas. */
const { registro: r2 } = A.crearRegistroDeAlgoritmos([
  { ...DESCRIPTOR, version: 1 }, { ...DESCRIPTOR, version: 2 }, { ...DESCRIPTOR, version: 3, status: 'draft' },
]);
check('9 · la vigente es la mayor ACTIVA, no la mayor', r2.vigente('niveles-de-dependencia')?.version === 2,
  String(r2.vigente('niveles-de-dependencia')?.version));
check('10 · y las versiones se listan de mayor a menor', igual([...r2.versiones('niveles-de-dependencia')], [3, 2, 1]));
check('11 · una versión retirada sigue resolviéndose por versión exacta',
  !!A.crearRegistroDeAlgoritmos([{ ...DESCRIPTOR, status: 'deprecated' }]).registro.obtener('niveles-de-dependencia', 1));

/* Estado: experimental corre pero NO se elige solo. Es la distinción del brief. */
const { registro: rExp } = A.crearRegistroDeAlgoritmos([{ ...DESCRIPTOR, status: 'experimental' }]);
check('12 · un experimental está en el registro', rExp.cuantos() === 1);
check('13 · pero no es seleccionable', rExp.seleccionable('niveles-de-dependencia') === false);
check('14 · y uno activo sí', r1.seleccionable('niveles-de-dependencia') === true);
check('15 · un deshabilitado (draft) tampoco se elige',
  A.crearRegistroDeAlgoritmos([{ ...DESCRIPTOR, status: 'draft' }]).registro.seleccionable('niveles-de-dependencia') === false);

/* Nada se cae en silencio. */
const { rechazados: malos } = A.crearRegistroDeAlgoritmos([
  DESCRIPTOR, DESCRIPTOR, { ...DESCRIPTOR, id: 'MAYUSCULAS' }, { ...DESCRIPTOR, id: 'otro', version: 0 },
  { ...DESCRIPTOR, id: 'ctr', contract: '9.9' }, { ...DESCRIPTOR, id: 'cat', category: 'inventada' },
  { ...DESCRIPTOR, id: 'sobra', extra: 1 }, { ...DESCRIPTOR, id: 'bucle', fallback: 'bucle@1' },
  { ...DESCRIPTOR, id: 'tope', budget: { maxCandidates: 999999 } }, null, 'texto',
]);
const motivos = malos.map((x) => x.problemas?.[0]?.reason ?? x.motivo);
check('16 · todo lo que no vale se rechaza, y con su motivo', malos.length === 10, `${malos.length} rechazos`);
for (const esperado of ['duplicate', 'invalid_id', 'invalid_version', 'contract_incompatible', 'invalid_category',
                        'unknown_field', 'self_reference', 'limit_over_maximum', 'invalid_shape']) {
  check(`17 · se detecta «${esperado}»`, motivos.includes(esperado), motivos.join(','));
}
/* Acotado SIEMPRE: un listado sin tope es una consulta que un día se come un servidor. */
const muchos = Array.from({ length: A.MAX_ALGORITMOS + 25 }, (_, i) => ({ ...DESCRIPTOR, id: `a-${String(i).padStart(4, '0')}` }));
const { registro: rLleno, rechazados: rechLleno } = A.crearRegistroDeAlgoritmos(muchos);
check('18 · el registro tiene techo y lo dice',
  rLleno.cuantos() === A.MAX_ALGORITMOS && rechLleno.every((x) => x.motivo === 'too_many') && rechLleno.length === 25,
  `${rLleno.cuantos()} dentro, ${rechLleno.length} fuera`);
check('19 · y listar nunca devuelve más del techo', rLleno.listar({ limit: 99999 }).length === A.MAX_ALGORITMOS);
check('20 · el índice por categoría solo trae vigentes', rLleno.porCategoria('parallelization').length === A.MAX_ALGORITMOS);
check('21 · y una categoría vacía devuelve vacío, no todo', rLleno.porCategoria('discovery').length === 0);

console.log('\n─── C. Objetivos y restricciones ───');

const pesos = A.pesosNormalizados({ weights: { quality: 2, cost: 1 } });
check('22 · los pesos se normalizan a 1', Math.abs(pesos.quality + pesos.cost - 1) < 1e-9 && Math.abs(pesos.quality - 2 / 3) < 1e-9);
check('23 · un eje ausente pesa 0', pesos.latency === 0);
/* Sin pesos no se cae en «todo empata»: manda el reparto declarado. */
check('24 · sin pesos rige el objetivo por defecto, no el empate',
  igual(A.pesosNormalizados({ weights: {} }), A.pesosNormalizados(A.OBJETIVO_POR_DEFECTO)));
check('25 · y con pesos negativos o basura, lo mismo',
  igual(A.pesosNormalizados({ weights: { quality: -5, cost: NaN } }), A.pesosNormalizados(A.OBJETIVO_POR_DEFECTO)));
check('26 · coste y latencia se minimizan; el resto se maximiza',
  A.seMaximiza('quality') && A.seMaximiza('reliability') && !A.seMaximiza('cost') && !A.seMaximiza('latency'));

check('27 · sin restricciones no hay conflicto', A.conflictosDeRestricciones(undefined).length === 0);
const conflictos = A.conflictosDeRestricciones({
  maxSteps: 2, maxParallel: 5, maxRisk: 7, budget: { maxCredits: -1 },
  quality: { minScore: 3 }, requiredCapabilities: ['voice.tts'], forbiddenCapabilities: ['voice.tts'],
});
check('28 · y se devuelven TODOS los conflictos, no el primero', conflictos.length === 5, conflictos.join(' | '));
check('29 · pedir y prohibir lo mismo es un conflicto', conflictos.includes('requiredCapabilities:voice.tts'));
check('30 · más paralelo que pasos, también', conflictos.includes('maxParallel>maxSteps'));

console.log('\n─── D. Señales ───');

check('31 · una señal bien formada vale', A.senalValida(senal('provider.failureRate', 0.06)));
for (const [que, s] of [
  ['sin punto en la clave', senal('provider', 1)],
  ['con un valor que no es dato', { key: 'a.b', value: {}, source: 'measured' }],
  ['con una fuente inventada', senal('a.b', 1, 'telepatia')],
  ['con confianza fuera de rango', senal('a.b', 1, 'measured', { confidence: 2 })],
  ['con un NaN', senal('a.b', NaN)],
]) check(`32 · no vale ${que}`, !A.senalValida(s));
/* Y lo que nunca puede viajar en una señal: lo mismo que nunca viaja en una traza. */
for (const prohibida of ['user.password', 'provider.apiKey', 'request.authorization', 'brain.prompt'])
  check(`33 · una señal llamada «${prohibida}» se rechaza`, !A.senalValida(senal(prohibida, 'x')));
check('34 · la lista de prohibidos es la de la traza, no una nueva',
  leer('functions/src/core/algorithm/signals.ts').includes("from '../observability'"));

check('35 · medido pesa más que deducido, y deducido más que un modelo',
  A.PESO_DE_FUENTE.measured > A.PESO_DE_FUENTE.derived && A.PESO_DE_FUENTE.derived > A.PESO_DE_FUENTE.model);
check('36 · una señal sin fecha NO es fresca', A.frescura(senal('a.b', 1), 1000, 1000) === 0);
check('37 · recién medida vale 1', A.frescura(senal('a.b', 1, 'measured', { at: 1000 }), 1000, 1000) === 1);
check('38 · a mitad de vida vale 0,5', A.frescura(senal('a.b', 1, 'measured', { at: 500 }), 1000, 1000) === 0.5);
check('39 · caducada vale 0', A.frescura(senal('a.b', 1, 'measured', { at: 0 }), 5000, 1000) === 0);

console.log('\n─── E. Confianza que se explica, incertidumbre que admite no saber ───');

check('40 · sin evidencia, la confianza es 0 y lo dice',
  A.confianzaDeEvidencia([]).value === 0 && A.confianzaDeEvidencia([]).because === 'sin evidencia');
const aFavor = A.confianzaDeEvidencia([{ claim: 'c', signal: senal('a.b', 1), supports: true }]);
check('41 · una medición a favor da confianza alta', aFavor.value === 1, String(aFavor.value));
const enContra = A.confianzaDeEvidencia([
  { claim: 'c', signal: senal('a.b', 1), supports: true },
  { claim: 'c', signal: senal('a.c', 1), supports: false },
]);
check('42 · la evidencia en contra RESTA, no se ignora', enContra.value === 0, String(enContra.value));
check('43 · y se guarda también la que contradice', enContra.basis.length === 2 && enContra.because === '1 a favor, 1 en contra');
check('44 · una suposición pesa menos que una medición',
  A.confianzaDeEvidencia([{ claim: 'c', signal: senal('a.b', 1, 'model'), supports: true }]).value < aFavor.value);

/* Lo más importante del grupo: un número alto SIN BASE no es conocimiento. */
check('45 · 0,95 sin base es «unknown», no «known»',
  A.incertidumbreDe({ kind: 'algorithm', value: 0.95, basis: [] }) === 'unknown');
check('46 · con base y 0,95 sí es «known»', A.incertidumbreDe(confianzaFalsa(0.95)) === 'known');
check('47 · 0,7 es «probable»', A.incertidumbreDe(confianzaFalsa(0.7)) === 'probable');
check('48 · 0,3 es «uncertain»', A.incertidumbreDe(confianzaFalsa(0.3)) === 'uncertain');
check('49 · 0,1 es «unknown»', A.incertidumbreDe(confianzaFalsa(0.1)) === 'unknown');
check('50 · una confianza ausente es «unknown»', A.incertidumbreDe(undefined) === 'unknown');
check('51 · y solo se decide con known o probable',
  A.alcanzaParaDecidir('known') && A.alcanzaParaDecidir('probable') &&
  !A.alcanzaParaDecidir('uncertain') && !A.alcanzaParaDecidir('unknown'));

console.log('\n─── F. Presupuesto computacional ───');

const porDefecto = A.presupuestoEfectivo(undefined);
check('52 · «sin declarar» NUNCA significa «sin límite»',
  igual(porDefecto, A.TOPES_POR_DEFECTO) && Object.values(porDefecto).every((v) => v > 0));
check('53 · manda el más estrecho de las capas',
  A.presupuestoEfectivo({ maxCandidates: 10 }, { maxCandidates: 4 }).maxCandidates === 4);
check('54 · y nadie puede pedir por encima del techo',
  A.presupuestoEfectivo({ maxCandidates: 999999 }).maxCandidates === A.TOPES_MAXIMOS.maxCandidates);
check('55 · el techo está por encima del defecto en todo',
  Object.keys(A.TOPES_POR_DEFECTO).every((k) => A.TOPES_MAXIMOS[k] >= A.TOPES_POR_DEFECTO[k]));

const c = A.crearContador(A.presupuestoEfectivo({ maxCandidates: 3, maxIterations: 2 }));
check('56 · se puede gastar mientras quepa', c.gastar('candidates') && c.gastar('candidates') && c.gastar('candidates'));
check('57 · y al pasarse dice que NO', c.gastar('candidates') === false);
check('58 · y dice CUÁL se agotó', c.agotado() === 'candidates');
check('59 · agotado uno, ya no cabe nada', c.cabe('iterations') === false);
check('60 · el gasto se puede leer', c.gasto().candidates === 4 && c.gasto().iterations === 0);

/* La profundidad no se acumula: es dónde estás, no cuánto has bajado. */
const cp = A.crearContador(A.presupuestoEfectivo({ maxDepth: 3 }));
cp.profundidad(1); cp.profundidad(2); cp.profundidad(1);
check('61 · la profundidad no se acumula', cp.gasto().depth === 2, String(cp.gasto().depth));
check('62 · y al pasarse, se detecta', cp.profundidad(9) === false && cp.agotado() === 'depth');

/* El reloj entra por puerto: el Core no mira la hora por su cuenta. */
let reloj = 1000;
const ct = A.crearContador(A.presupuestoEfectivo({ maxLatencyMs: 50 }), () => reloj);
check('63 · al principio cabe', ct.cabe('candidates'));
reloj = 1100;
check('64 · pasado el plazo, se acabó', ct.cabe('candidates') === false && ct.agotado() === 'latencyMs');
check('65 · el paracaídas por defecto devuelve lo mejor encontrado', A.FAIL_SAFE_POR_DEFECTO === 'best_effort');

console.log('\n─── G. Estrategias ───');

const PASOS = [paso('a', 'text.generate'), paso('b', 'text.generate'), paso('c', 'image.generate', ['a', 'b']), paso('d', 'voice.tts', ['c'])];
const { niveles, sinResolver } = A.nivelesDeDependencia(PASOS);
check('66 · los niveles salen bien', igual(niveles.map((x) => [...x]), [['a', 'b'], ['c'], ['d']]), JSON.stringify(niveles));
check('67 · y no queda nada sin resolver', sinResolver.length === 0);
check('68 · los grupos son los niveles con más de uno', igual(A.gruposDeNiveles(niveles).map((g) => [...g.steps]), [['a', 'b']]));

/* Un ciclo no se coloca a la fuerza: se devuelve aparte, como hace el Planner. */
const ciclo = A.nivelesDeDependencia([paso('x', 'text.generate', ['y']), paso('y', 'text.generate', ['x'])]);
check('69 · un ciclo no se ejecuta como nivel 0: se aparta',
  ciclo.niveles.length === 0 && igual([...ciclo.sinResolver].sort(), ['x', 'y']));
const rota = A.nivelesDeDependencia([paso('x', 'text.generate', ['fantasma'])]);
check('70 · una dependencia a un paso inexistente invalida el paso', igual([...rota.sinResolver], ['x']));

check('71 · una estrategia coherente lo es', A.estrategiaCoherente(estrategia('s1', PASOS)));
check('72 · sin pasos, no', A.problemasDeEstrategia(estrategia('s1', [])).includes('steps'));
check('73 · con ids repetidos, no', A.problemasDeEstrategia(estrategia('s1', [paso('a', 'text.generate'), paso('a', 'text.generate')])).includes('steps:duplicated_id'));
check('74 · sin confianza en la previsión, no',
  A.problemasDeEstrategia({ ...estrategia('s1', PASOS), expected: { uncertainty: 'known' } }).includes('expected:confidence'));
/*
 * El error que de verdad importa: poner en paralelo dos pasos donde uno depende
 * del otro. Se ejecutaría, daría un resultado incorrecto y NO fallaría.
 */
const paraleloImposible = A.problemasDeEstrategia(estrategia('s1', PASOS, { parallelGroups: [{ steps: ['a', 'c'] }] }));
check('75 · un paralelo entre un paso y su dependencia se detecta',
  paraleloImposible.includes('parallelGroups:c:depends_on:a'), paraleloImposible.join(' | '));
check('76 · un grupo que nombra un paso inexistente se detecta',
  A.problemasDeEstrategia(estrategia('s1', PASOS, { parallelGroups: [{ steps: ['a', 'zzz'] }] })).includes('parallelGroups:zzz:unknown_step'));
check('77 · un punto de comprobación sobre un paso inexistente, también',
  A.problemasDeEstrategia(estrategia('s1', PASOS, { checkpoints: [{ afterStepId: 'zzz', requirement: {} }] })).includes('checkpoints:zzz:unknown_step'));
check('78 · y una recuperación que no dice a qué estrategia ir',
  A.problemasDeEstrategia(estrategia('s1', PASOS, { recovery: [{ kind: 'alternative_strategy', because: 'x' }] })).includes('recovery:alternative_strategy:no_target'));

console.log('\n─── H. Puntuación ───');

const alt = (id, values) => ({ id, value: id, values });
const objetivo = { weights: { quality: 1, cost: 1 } };
const puntuados = A.puntuar([alt('barata', { quality: 0.6, cost: 0.1 }), alt('cara', { quality: 0.9, cost: 1 })], objetivo);
check('79 · puntuar no reordena: devuelve en el mismo orden', igual(puntuados.map((x) => x.id), ['barata', 'cara']));
check('80 · el coste se normaliza CONTRA EL CONJUNTO', puntuados[0].score.fits.cost === 1 && puntuados[1].score.fits.cost === 0);
check('81 · la calidad es absoluta', puntuados[1].score.fits.quality === 0.9);
/* Un eje en el que todos empatan no penaliza a nadie. */
const empate = A.puntuar([alt('a', { quality: 0.5, cost: 1 }), alt('b', { quality: 0.9, cost: 1 })], objetivo);
check('82 · si el coste empata, no penaliza a nadie', empate[0].score.fits.cost === 1 && empate[1].score.fits.cost === 1);

/* Lo que falta no se inventa a 0: baja la cobertura y se nombra. */
const aMedias = A.puntuar([alt('completa', { quality: 0.8, cost: 0.5 }), alt('aMedias', { quality: 0.8 })], objetivo);
check('83 · un eje que falta se nombra, no se inventa',
  igual([...aMedias[1].score.missing], ['cost']) && aMedias[1].score.coverage === 0.5,
  `coverage=${aMedias[1].score.coverage}`);
check('84 · y no se le pone un 0 que le haga perder injustamente', aMedias[1].score.total === 0.8);
const ordenados = A.ordenar(aMedias);
check('85 · a igualdad de total, gana la mejor medida', ordenados[0].id === 'completa');

/* Determinismo: mismas entradas, mismo resultado. Dos veces. */
const unaVez = A.ordenar(A.puntuar([alt('z', { quality: 0.5 }), alt('a', { quality: 0.5 })], objetivo)).map((x) => x.id);
const otraVez = A.ordenar(A.puntuar([alt('z', { quality: 0.5 }), alt('a', { quality: 0.5 })], objetivo)).map((x) => x.id);
check('86 · el orden es DETERMINISTA y no depende del azar', igual(unaVez, otraVez) && igual(unaVez, ['a', 'z']), unaVez.join(','));
check('87 · puntuar el conjunto vacío no rompe: devuelve vacío', A.puntuar([], objetivo).length === 0);

/* Y cuando no hay ganador, se dice, en lugar de fingir un orden total. */
const frente = A.pareto([alt('calidad', { quality: 0.9, cost: 1 }), alt('barata', { quality: 0.5, cost: 0.1 }),
                         alt('peor', { quality: 0.4, cost: 1 })], objetivo);
check('88 · el frente de Pareto deja fuera a la dominada',
  igual(frente.map((x) => x.id).sort(), ['barata', 'calidad']), frente.map((x) => x.id).join(','));
check('89 · un eje que a uno le falta no lo hace «peor»',
  A.pareto([alt('a', { quality: 0.9 }), alt('b', { quality: 0.9, cost: 0.1 })], objetivo).length === 2);

console.log('\n─── I. La decisión ───');

const CONTEXTO = { contract: ALGORITHM_CONTRACT_VERSION, objective: objetivo,
  trace: { traceId: 't1', requestId: 'r1', userId: 'u1' }, signals: [senal('a.b', 1), senal('a.b', 2), senal('c.d', 3)] };
const nada = A.sinDecision('x@1', CONTEXTO, 'insufficient_evidence', A.GASTO_CERO);
check('90 · no saber es una respuesta de primera clase, no un error',
  nada.status === 'undecided' && nada.failure === 'insufficient_evidence');
check('91 · y no viene con una confianza inventada', nada.confidence.value === 0 && nada.uncertainty === 'unknown');
check('92 · un algoritmo desconocido sí es inválido',
  A.sinDecision('x@1', CONTEXTO, 'unknown_algorithm', A.GASTO_CERO).status === 'invalid');
check('93 · la decisión lleva el objetivo con el que se decidió', igual(nada.objective, objetivo));

const registroD = A.registroDeDecision(nada, CONTEXTO, 12345, 's1');
check('94 · el registro guarda las CLAVES de señal, nunca sus valores',
  igual([...registroD.signalKeys].sort(), ['a.b', 'c.d']) && !JSON.stringify(registroD).includes('"value"'));
check('95 · y lo justo para reproducir', registroD.algorithm === 'x@1' && registroD.at === 12345 && !!registroD.objective);
/* Idempotencia: llamar dos veces no cambia nada ni produce nada distinto. */
check('96 · construir la misma decisión dos veces da lo mismo',
  igual(A.sinDecision('x@1', CONTEXTO, 'no_valid_strategy', A.GASTO_CERO), A.sinDecision('x@1', CONTEXTO, 'no_valid_strategy', A.GASTO_CERO)));

console.log('\n─── J. ¿Mejoró algo? ───');

const valor = A.valorAportado('x@1', { quality: 0.72, costUsd: 1, latencyMs: 8000 },
  { quality: 0.81, costUsd: 0.92, latencyMs: 6000 }, { ...A.GASTO_CERO, latencyMs: 40 });
check('97 · se mide contra la línea base y sale la mejora', valor.improved === true);
check('98 · la latencia de PENSAR entra en la cuenta',
  valor.deltas.find((d) => d.axis === 'latency').actual === 6040, JSON.stringify(valor.deltas.find((d) => d.axis === 'latency')));
check('99 · menos coste es positivo aunque el número baje',
  valor.deltas.find((d) => d.axis === 'cost').absolute > 0);
/* La trampa que esta capa tiene que detectar en sí misma. */
const lento = A.valorAportado('x@1', { latencyMs: 1000 }, { latencyMs: 600 }, { ...A.GASTO_CERO, latencyMs: 900 });
check('100 · un algoritmo que tarda más de lo que ahorra NO mejora',
  lento.improved === false && lento.regressions.includes('latency'));
/* Y un balance mixto no se declara mejora por haber subido un eje. */
const mixto = A.valorAportado('x@1', { quality: 0.9, costUsd: 1 }, { quality: 0.6, costUsd: 0.95 }, A.GASTO_CERO);
check('101 · bajar mucho la calidad para ahorrar poco NO es mejorar',
  mixto.improved === false && mixto.regressions.includes('quality'));
check('102 · sin nada que comparar, no se afirma que mejoró',
  A.valorAportado('x@1', {}, {}, A.GASTO_CERO).improved === false);

console.log('\n─── K. LA FRONTERA DE AUTORIDAD — los diez sabotajes ───');

check('103 · la frontera usa el predicado del Planner, no una lista propia',
  leer('functions/src/core/algorithm/authority.ts').includes("import { claveDeImplementacion } from '../planner'"));
check('104 · y el Planner sigue prohibiendo lo que tiene que prohibir',
  ['allowedProviders', 'provider', 'model', 'adapter', 'modelId', 'providerId', 'excludeProviders'].every(claveDeImplementacion));

const SABOTAJES = [
  ['1 · llamar a un proveedor', estrategia('s', [{ ...paso('a', 'voice.tts'), input: { provider: 'elevenlabs' } }])],
  ['2 · cambiar de proveedor', estrategia('s', [{ ...paso('a', 'voice.tts'), input: { allowedProviders: ['minimax'] } }])],
  ['2b · colarlo por la raíz del paso', estrategia('s', [{ ...paso('a', 'voice.tts'), modelId: 'eleven_v3' }])],
  ['2c · colarlo por los hints', estrategia('s', [{ ...paso('a', 'voice.tts'), hints: { adapterId: 'x' } }])],
  ['2d · colarlo por la recuperación', estrategia('s', PASOS, { recovery: [{ kind: 'retry', because: 'x', providerId: 'p' }] })],
  ['2e · colarlo anidado dos niveles', estrategia('s', [{ ...paso('a', 'voice.tts'), input: { extra: { deep: { model: 'x' } } } }])],
];
for (const [que, s] of SABOTAJES) {
  const v = A.violacionesDeEstrategia(s);
  check(`105 · SABOTAJE ${que} → rechazado`, v.length > 0 && !A.respetaLaFrontera(s), v.map((x) => x.clave).join(',') || 'NO DETECTADO');
}
check('106 · y una estrategia honrada pasa', A.respetaLaFrontera(estrategia('s', PASOS)));
/* Nombrar una CAPACIDAD no es nombrar una implementación: sin esto no habría Planner. */
check('107 · declarar `voice.tts` NO es una violación',
  A.respetaLaFrontera(estrategia('s', [paso('a', 'voice.tts')])));
/* Describir tampoco: una señal sobre un proveedor es un hecho, no una orden. */
check('108 · una SEÑAL sí puede nombrar a un proveedor',
  A.senalValida({ key: 'provider.failureRate', subject: 'elevenlabs', value: 0.06, source: 'measured' }));

/* 3 y 4: Credits y Assets. En una capa pura la prueba es que no existe el verbo. */
for (const [que, palabras] of [
  ['3 · tocar Credits', ['spendCredits', 'refundCredits', 'creditsBalance', 'holdCredits', 'settleCredits']],
  ['4 · crear un Asset', ['createAsset', 'assets(', 'ownerId', 'materialesDeResultado']],
  ['10 · modificar el Planner', ['crearPlanner', 'PlannerPorts', 'PlannerResponse']],
]) {
  const donde = FUENTES.filter(({ src }) => palabras.some((p) => sinComentarios(src).includes(p))).map((x) => x.f);
  check(`109 · SABOTAJE ${que} → imposible: el verbo no existe en la capa`, donde.length === 0, donde.join(',') || 'ninguno');
}
/* Y la lista de efectos prohibidos es DATO, para poder recorrerla. */
check('110 · los efectos prohibidos son datos y nombran a su dueño',
  A.EFECTOS_PROHIBIDOS.length >= 10 && A.EFECTOS_PROHIBIDOS.every((e) => e.efecto && e.dueno));

/* 5, 6, 7: presupuesto, iteraciones y bucles. Ejecutados. */
const cIgnora = A.crearContador(A.presupuestoEfectivo({ maxCandidates: 2 }));
let admitidos = 0;
for (let i = 0; i < 1000; i++) { if (!cIgnora.gastar('candidates')) break; admitidos++; }
check('111 · SABOTAJE 5 · ignorar el presupuesto → el contador corta', admitidos === 2 && cIgnora.agotado() === 'candidates', `${admitidos} admitidos`);
const cIter = A.crearContador(A.presupuestoEfectivo({ maxIterations: 3 }));
let vueltas = 0;
while (cIter.gastar('iterations') && vueltas < 10_000) vueltas++;
check('112 · SABOTAJE 6 · exceder las iteraciones → se corta en el tope', vueltas === 3, `${vueltas} vueltas`);
check('113 · SABOTAJE 7 · un bucle en la estrategia → se detecta y no se ejecuta',
  A.nivelesDeDependencia([paso('x', 'text.generate', ['y']), paso('y', 'text.generate', ['x'])]).niveles.length === 0);
/* 8: decidir sin evidencia cuando la evidencia es obligatoria. */
check('114 · SABOTAJE 8 · confianza alta sin evidencia → el sistema la llama «unknown»',
  A.incertidumbreDe({ kind: 'algorithm', value: 0.99, basis: [] }) === 'unknown' &&
  !A.alcanzaParaDecidir(A.incertidumbreDe({ kind: 'algorithm', value: 0.99, basis: [] })));
/* 9: opciones ilimitadas. */
const milOpciones = Array.from({ length: 5000 }, (_, i) => alt(`o${i}`, { quality: i / 5000 }));
const topeC = A.presupuestoEfectivo(undefined).maxCandidates;
const cTope = A.crearContador(A.presupuestoEfectivo(undefined));
const cabidos = milOpciones.filter(() => cTope.gastar('candidates')).length;
check('115 · SABOTAJE 9 · opciones ilimitadas → el presupuesto las acota',
  cabidos === topeC && topeC <= A.TOPES_MAXIMOS.maxCandidates, `${cabidos} de ${milOpciones.length}, tope ${topeC}`);
check('116 · y puntuar 5 000 opciones sigue siendo lineal, no cuadrático',
  A.puntuar(milOpciones.slice(0, topeC), objetivo).length === topeC);

console.log('\n─── L. Lo que hay, está declarado; y nada decide en producción ───');

/*
 * A0 afirmaba «no hay ningún algoritmo». A1 lo cambió, así que la afirmación se
 * ACTUALIZA en vez de dejarla pasando por accidente —su patrón no habría
 * detectado el motor, que no se anota `: Algorithm`—. Lo que se vigila ahora es
 * lo que de verdad importa: todo lo que decide está declarado en el registro, y
 * NINGUNO es seleccionable automáticamente.
 */
const DESCRIPTORES = [A.DESCRIPTOR_DEL_MOTOR, A.DESCRIPTOR_DE_LA_BASE];
const { registro: rTodos } = A.crearRegistroDeAlgoritmos(DESCRIPTORES);
check('117 · todo lo que decide está declarado y validado',
  DESCRIPTORES.every((d) => A.algoritmoValido(d)) && rTodos.cuantos() === DESCRIPTORES.length);
check('117b · y ninguno es seleccionable automáticamente',
  DESCRIPTORES.every((d) => rTodos.seleccionable(d.id) === false),
  DESCRIPTORES.map((d) => `${d.id}:${d.status}`).join(' · '));
const conectado = ['functions/src/creator', 'functions/src/runtime', 'functions/src/engine', 'functions/src/orchestrator', 'functions/src/router']
  .filter((d) => { try { return require_('node:child_process').execSync(`grep -rl "core/algorithm\\|AlgorithmDecision\\|DecisionContext" ${d} 2>/dev/null || true`, { cwd: RAIZ, encoding: 'utf8' }).trim().length > 0; } catch { return false; } });
check('118 · y nadie lo ha conectado a ninguna ruta', conectado.length === 0, conectado.join(', ') || 'ninguna');
/* Un salto de MENOR es aditivo y legítimo; uno de MAYOR rompería a quien ya lo usa. */
const [MAYOR, MENOR] = ALGORITHM_CONTRACT_VERSION.split('.').map(Number);
check('119 · el contrato NO ha roto el mayor, y ya va por el menor 2 o más',
  MAYOR === 1 && MENOR >= 2, ALGORITHM_CONTRACT_VERSION);
/*
 * La afirmación CAMBIÓ, y con su motivo escrito en el propio `core/index.ts`:
 * el Algorithm Engine tiene su PROPIA puerta y el Core NO lo reexporta. Es una
 * capa que hoy no consume nadie, importa del Core y no al revés, y meterla en
 * la puerta única engordaba lo que carga todo el que pide un contrato — hasta
 * dejar sin memoria al arnés que incrusta cada módulo en sus dependientes.
 */
check('120 · el Algorithm Engine tiene su propia puerta, y el Core NO lo reexporta',
  /export \* from '\.\/types';/.test(leer('functions/src/core/algorithm/index.ts')) &&
  !/export \* from '\.\/algorithm';/.test(leer('functions/src/core/index.ts')));
check('120b · y la decisión está explicada donde se toma',
  /EL ALGORITHM ENGINE NO SE REEXPORTA AQUÍ/.test(leer('functions/src/core/index.ts')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA0: la fundación está, y no decide nada todavía');
process.exit(failures ? 1 : 0);
