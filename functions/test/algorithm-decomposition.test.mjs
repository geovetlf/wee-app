/*
 * A2 — EL MOTOR DE DESCOMPOSICIÓN.
 *
 * Genera formas de organizar un trabajo; NO elige entre ellas. Todo se ejecuta
 * contra el compilado; lo que no se puede ejecutar se mide sobre la fuente.
 *
 *  A. El DAG: ciclos, dependencias, raíz.
 *  B. Profundidad.
 *  C. Pasos.
 *  D. Paralelismo.
 *  E. Capacidades.
 *  F. Alternativas.
 *  G. Determinismo.
 *  H. Propiedades sobre grafos generados.
 *  I. Integración con A1 — A2 propone, A1 decide.
 *  J. Observabilidad y respaldo.
 *  K. Los diez sabotajes.
 *  L. Rendimiento.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CAPAS_DE_PRODUCCION, PATRON_A2, describirHallazgos, guardaDeConexion } from './guardas.mjs';

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
const d2 = A.crearMotorDeDescomposicion();

const paso = (id, capability = 'text.generate', dependsOn) =>
  ({ id, capability, purpose: `paso ${id}`, produces: 'text', ...(dependsOn ? { dependsOn } : {}) });
const tarea = (id, steps) => ({ id, goal: 'una prueba', steps });
const motivos = (r) => [...r.problemas.map((p) => p.reason), ...r.rechazadas.map((x) => x.reason)];
const ids = (r) => r.opciones.map((o) => o.value.heuristica);

/* Un abanico: a → (b,c,d,e) → f. El caso que distingue las tres heurísticas. */
const ABANICO = [paso('a'), paso('b', 'image.generate', ['a']), paso('c', 'image.generate', ['a']),
  paso('d', 'image.generate', ['a']), paso('e', 'image.generate', ['a']), paso('f', 'video.generate', ['b', 'c', 'd', 'e'])];
/* Una cadena: a → b → c. Aquí solo hay UNA forma de hacerlo. */
const CADENA = [paso('a'), paso('b', 'text.generate', ['a']), paso('c', 'text.generate', ['b'])];

console.log('\n─── A. El DAG ───');

check('1 · el motor se registra por el Registry de A0 y su descriptor vale',
  A.algoritmoValido(A.DESCRIPTOR_DE_DESCOMPOSICION) &&
  A.DESCRIPTOR_DE_DESCOMPOSICION.category === 'decomposition' && A.DESCRIPTOR_DE_DESCOMPOSICION.purity === 'pure',
  JSON.stringify(A.validarAlgoritmo(A.DESCRIPTOR_DE_DESCOMPOSICION)));
check('2 · y es EXPERIMENTAL: nadie lo elige solo',
  A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_DESCOMPOSICION]).registro.seleccionable(A.DECOMPOSITION_ENGINE_ID) === false);

check('3 · un DAG válido no tiene problemas', A.validarDAG(tarea('T', ABANICO)).length === 0);
check('4 · una tarea vacía se rechaza', igual(A.validarDAG(tarea('T', [])).map((p) => p.reason), ['empty_decomposition']));
check('5 · y una tarea que no es tarea, también', igual(A.validarDAG(undefined).map((p) => p.reason), ['empty_decomposition']));

/* Ciclo directo, indirecto y autodependencia. */
const cicloDirecto = A.validarDAG(tarea('T', [paso('a', 'text.generate', ['b']), paso('b', 'text.generate', ['a'])]));
check('6 · un ciclo directo se detecta', cicloDirecto.some((p) => p.reason === 'decomposition_cycle'),
  JSON.stringify(cicloDirecto.map((p) => p.detail)));
const cicloIndirecto = A.validarDAG(tarea('T', [
  paso('a', 'text.generate', ['c']), paso('b', 'text.generate', ['a']), paso('c', 'text.generate', ['b'])]));
check('7 · uno indirecto también, y se dice quién lo forma',
  cicloIndirecto.some((p) => p.reason === 'decomposition_cycle' && /a → /.test(p.detail ?? '')),
  JSON.stringify(cicloIndirecto.filter((p) => p.reason === 'decomposition_cycle').map((p) => p.detail)));
check('8 · una autodependencia se detecta y NO se cuenta como ciclo',
  igual(A.validarDAG(tarea('T', [paso('a', 'text.generate', ['a'])])).map((p) => p.reason).sort(), ['invalid_root', 'self_dependency']));
check('9 · una dependencia inexistente se detecta, y se dice a qué apuntaba',
  A.validarDAG(tarea('T', [paso('a'), paso('b', 'text.generate', ['fantasma'])]))
    .some((p) => p.reason === 'invalid_dependency' && p.detail === 'fantasma'));
check('10 · una dependencia declarada dos veces se detecta',
  A.validarDAG(tarea('T', [paso('a'), paso('b', 'text.generate', ['a', 'a'])])).some((p) => p.reason === 'duplicate_dependency'));
check('11 · dos subtareas con el mismo id se detectan',
  A.validarDAG(tarea('T', [paso('a'), paso('a')])).some((p) => p.reason === 'duplicate_step'));
check('12 · sin raíz no hay por dónde empezar',
  A.validarDAG(tarea('T', [paso('a', 'text.generate', ['b']), paso('b', 'text.generate', ['c']), paso('c')]))
    .every((p) => p.reason !== 'invalid_root'));

/* El ciclo se devuelve en orden canónico: dos ejecuciones dan la misma lista. */
const c1 = A.detectarCiclos([paso('c', 'text.generate', ['b']), paso('b', 'text.generate', ['a']), paso('a', 'text.generate', ['c'])]);
const c2 = A.detectarCiclos([paso('a', 'text.generate', ['c']), paso('c', 'text.generate', ['b']), paso('b', 'text.generate', ['a'])]);
check('13 · el ciclo se describe igual venga como venga el array', igual(c1, c2), JSON.stringify(c1));
check('14 · y empieza por el id menor', c1[0][0] === 'a', JSON.stringify(c1[0]));
check('15 · un grafo sin ciclos no reporta ninguno', A.detectarCiclos(ABANICO).length === 0);
/* Acotado: un grafo grande no puede convertir la comprobación en la caída. */
const enorme = Array.from({ length: 3000 }, (_, i) => paso(`n${i}`, 'text.generate', i ? [`n${i - 1}`] : undefined));
const t0 = process.hrtime.bigint();
const sinCiclos = A.detectarCiclos(enorme);
check('16 · 3 000 nodos en cadena: sin ciclos y sin reventar la pila',
  sinCiclos.length === 0 && Number(process.hrtime.bigint() - t0) / 1e6 < 200,
  `${(Number(process.hrtime.bigint() - t0) / 1e6).toFixed(1)} ms`);

console.log('\n─── B. Profundidad ───');

const conDepth = (t, max) => d2.descomponer(t, undefined, { maxDepth: max });
check('17 · con profundidad de sobra, salen las disposiciones', conDepth(tarea('T', ABANICO), 6).opciones.length >= 1);
/* La más plana es `por-niveles`; si ESA no cabe, ninguna cabe. */
const apretado = conDepth(tarea('T', ABANICO), 2);
check('18 · con maxDepth=2 no cabe ninguna, y se dice por qué',
  apretado.opciones.length === 0 && apretado.rechazadas.every((x) => x.reason === 'max_depth_exceeded'),
  JSON.stringify(apretado.rechazadas.map((x) => `${x.heuristica}:${x.detail}`)));
check('19 · nunca se ignora el límite en silencio', apretado.metricas.maxDepthRejections === apretado.rechazadas.length);
check('20 · maxDepth=0 no deja pasar nada', conDepth(tarea('T', CADENA), 0).opciones.length === 0);
check('21 · maxDepth=1 solo admite trabajos sin dependencias',
  conDepth(tarea('T', CADENA), 1).opciones.length === 0 &&
  conDepth(tarea('T', [paso('a'), paso('b')]), 1).opciones.length === 1);
check('22 · y la que cabe es la plana, con los dos a la vez',
  igual(conDepth(tarea('T', [paso('a'), paso('b')]), 1).opciones[0].value.tandas, [['a', 'b']]));

console.log('\n─── C. Pasos ───');

const seis = d2.descomponer(tarea('T', ABANICO));
check('23 · se cuentan los pasos que forman parte de la disposición',
  seis.opciones.every((o) => o.value.medidas.steps === 6 && o.value.tandas.flat().length === 6));
/* Lo descartado NO cuenta como trabajo: es el error que el brief pide cazar. */
const conDescartes = d2.descomponer(tarea('T', ABANICO), { maxParallel: 2 });
check('24 · una disposición rechazada no suma pasos a las demás',
  conDescartes.rechazadas.length > 0 && conDescartes.opciones.every((o) => o.value.medidas.steps === 6),
  `${conDescartes.rechazadas.length} rechazadas`);
check('25 · maxSteps en el límite exacto pasa',
  d2.descomponer(tarea('T', ABANICO), { maxSteps: 6 }).opciones.length >= 1);
const pocos = d2.descomponer(tarea('T', ABANICO), { maxSteps: 5 });
check('26 · y uno por debajo no deja pasar nada',
  pocos.opciones.length === 0 && pocos.metricas.maxStepsRejections === pocos.rechazadas.length);

console.log('\n─── D. Paralelismo ───');

const libre = d2.descomponer(tarea('T', ABANICO));
const niveles = libre.opciones.find((o) => o.value.heuristica === 'por-niveles');
const fila = libre.opciones.find((o) => o.value.heuristica === 'secuencial');
check('27 · las tareas independientes se agrupan', igual(niveles.value.tandas, [['a'], ['b', 'c', 'd', 'e'], ['f']]));
check('28 · las dependientes no', igual(fila.value.tandas, [['a'], ['b'], ['c'], ['d'], ['e'], ['f']]));
check('29 · y la secuencial tiene paralelismo 1 y la máxima profundidad',
  fila.value.medidas.parallelism === 1 && fila.value.medidas.depth === 6);
check('30 · el paralelismo POSIBLE se calcula aparte de lo que cada disposición hace',
  A.paralelismoPosible(ABANICO) === 4 && fila.value.medidas.parallelism === 1);

const acotado = d2.descomponer(tarea('T', ABANICO), { maxParallel: 2 });
const parcial = acotado.opciones.find((o) => o.value.heuristica === 'acotada');
check('31 · con maxParallel=2 aparece la disposición acotada',
  !!parcial && igual(parcial.value.tandas, [['a'], ['b', 'c'], ['d', 'e'], ['f']]));
check('32 · ninguna opción pide más de lo permitido',
  acotado.opciones.every((o) => o.value.medidas.parallelism <= 2),
  JSON.stringify(acotado.opciones.map((o) => o.value.medidas.parallelism)));
/* Y la consecuencia real: acotar el paralelismo AÑADE profundidad. */
check('33 · acotar el paralelismo aumenta la profundidad, y se ve',
  parcial.value.medidas.depth === 4 && niveles.value.medidas.depth === 3);
check('34 · maxParallel=1 deja solo la secuencial',
  igual(ids(d2.descomponer(tarea('T', ABANICO), { maxParallel: 1 })), ['secuencial']));
check('35 · y con maxParallel mayor que el posible, no se inventa una acotada',
  !ids(d2.descomponer(tarea('T', ABANICO), { maxParallel: 99 })).includes('acotada'));

console.log('\n─── E. Capacidades ───');

check('36 · una capacidad del catálogo se admite', A.capacidadDelCatalogo('text.generate'));
check('37 · una inventada, no', !A.capacidadDelCatalogo('magia.instantanea'));
/*
 * POR DEFECTO EL MOTOR NO EXIGE EL CATÁLOGO, y es deliberado: atarlo hacía que
 * una capacidad futura se rechazara de entrada, y entonces esta capa no podía
 * razonar sobre nada que no conociera ya. No saber si algo existe no es lo
 * mismo que saber que no existe.
 */
const permisivo = d2.descomponer(tarea('T', [paso('a', 'magia.instantanea')]));
check('37b · sin puerto, una capacidad desconocida NO se rechaza',
  permisivo.opciones.length === 1 && permisivo.problemas.length === 0,
  JSON.stringify(permisivo.problemas.map((p) => p.reason)));
/* Y quien quiera exigir el catálogo lo pide en una línea. */
const d2Estricto = A.crearMotorDeDescomposicion({ capacidades: { conocida: A.capacidadDelCatalogo } });
const inventada = d2Estricto.descomponer(tarea('T', [paso('a', 'magia.instantanea')]));
check('38 · con el puerto del catálogo, una capacidad desconocida invalida la tarea',
  inventada.opciones.length === 0 && inventada.problemas.some((p) => p.reason === 'unknown_capability'),
  JSON.stringify(inventada.problemas.map((p) => p.reason)));
check('39 · y se contabiliza', inventada.metricas.capabilityRejections === 1 && inventada.metricas.failures === 1);
/* Sin puerto de disponibilidad NO se afirma que falte: no saber ≠ no estar. */
const pendiente = d2.descomponer(tarea('T', [paso('a', 'music.generate')]));
check('40 · sin puerto de disponibilidad no se inventa una ausencia', pendiente.opciones.length === 1);
const conPuerto = A.crearMotorDeDescomposicion({ capacidades: { disponible: A.capacidadEnrutable } });
check('41 · con puerto, una capacidad que hoy no sirve nadie se marca',
  conPuerto.descomponer(tarea('T', [paso('a', 'music.generate')])).problemas.some((p) => p.reason === 'missing_capability'));
check('42 · y una que sí se sirve pasa',
  conPuerto.descomponer(tarea('T', [paso('a', 'text.generate')])).opciones.length === 1);
check('43 · el catálogo NO se copia: se pregunta al del Core',
  leer('functions/src/core/algorithm/decomposition-engine.ts').includes("from '../registry/capabilities'"));

console.log('\n─── F. Alternativas ───');

check('44 · un abanico da varias formas de hacerlo', libre.opciones.length === 2, ids(libre).join(', '));
/* Una cadena solo tiene UNA forma: no se inventa una segunda idéntica. */
const cadena = d2.descomponer(tarea('T', CADENA));
check('45 · una cadena lineal da UNA sola, no dos iguales',
  cadena.opciones.length === 1 && cadena.metricas.duplicatesCollapsed === 1,
  `${cadena.opciones.length} opciones, ${cadena.metricas.duplicatesCollapsed} colapsadas`);
check('46 · una sola subtarea también da una sola', d2.descomponer(tarea('T', [paso('a')])).opciones.length === 1);
check('47 · A2 NO elige: no existe ninguna función que devuelva una sola descomposición',
  !/elegirLaMejor|mejorDescomposicion|chooseBest|seleccionarDescomposicion/i
    .test(sinComentarios(leer('functions/src/core/algorithm/decomposition-engine.ts'))));
check('48 · ni puntúa: no hay pesos ni objetivo en esta capa',
  !/pesosNormalizados|puntuar\(|ordenarPorPolitica|StrategyScore/
    .test(sinComentarios(leer('functions/src/core/algorithm/decomposition-engine.ts'))));
check('49 · cada opción dice quién la propuso, con versión',
  libre.opciones.every((o) => o.value.proposedBy === A.DECOMPOSITION_ENGINE_REF));
check('50 · y los pasos son LOS MISMOS en todas: A2 no inventa trabajo',
  libre.opciones.every((o) => igual(o.value.steps.map((s) => s.id), ABANICO.map((s) => s.id))));

console.log('\n─── G. Determinismo ───');

const doce = Array.from({ length: 12 }, () => d2.descomponer(tarea('T', ABANICO), { maxParallel: 2 }));
check('51 · doce corridas idénticas, campo por campo', doce.every((r) => igual(r, doce[0])));
/* El orden de llegada de los pasos no puede cambiar el resultado. */
const barajado = [...ABANICO].reverse();
check('52 · y el orden del array de entrada no cambia nada',
  igual(d2.descomponer(tarea('T', barajado), { maxParallel: 2 }).opciones.map((o) => o.value.tandas),
        doce[0].opciones.map((o) => o.value.tandas)));
check('53 · dentro de una tarea, el orden lo decide la profundidad',
  igual(libre.opciones.map((o) => o.value.medidas.depth), [3, 6]), JSON.stringify(libre.opciones.map((o) => o.id)));
/*
 * Y el orden canónico entero, probado como UNIDAD.
 *
 * Hace falta hacerlo así porque dentro de una misma tarea la complejidad nunca
 * desempata: todas las disposiciones llevan los mismos pasos y las mismas
 * dependencias, así que `complexity` sale idéntica. El criterio existe para
 * cuando se comparen descomposiciones de tareas distintas —y para que el orden
 * esté COMPLETO—, y sin esta prueba sería un criterio que nadie vigila.
 */
const fake = (id, medidas) => ({ id, value: { medidas: { steps: 0, depth: 0, parallelism: 0, dependencies: 0, branchingFactor: 0, complexity: 0, ...medidas } }, values: {} });
const ordenar2 = (a, b) => [a, b].sort(A.ordenCanonico).map((x) => x.id);
check('53b · 1.º la complejidad, menos es antes',
  igual(ordenar2(fake('z', { complexity: 5 }), fake('a', { complexity: 9 })), ['z', 'a']));
check('53c · 2.º la profundidad', igual(ordenar2(fake('z', { depth: 9 }), fake('a', { depth: 2 })), ['a', 'z']));
check('53d · 3.º los pasos', igual(ordenar2(fake('z', { steps: 1 }), fake('a', { steps: 4 })), ['z', 'a']));
check('53e · 4.º el paralelismo, y aquí MÁS es antes',
  igual(ordenar2(fake('z', { parallelism: 4 }), fake('a', { parallelism: 1 })), ['z', 'a']));
check('53f · y 5.º el id, que nunca empata', igual(ordenar2(fake('z', {}), fake('a', {})), ['a', 'z']));
for (const prohibido of ['Math.random', 'Date.now', 'fetch(', 'firebase', 'process.env']) {
  const donde = ['decomposition.ts', 'decomposition-engine.ts']
    .filter((f) => sinComentarios(leer(`functions/src/core/algorithm/${f}`)).includes(prohibido));
  check(`54 · nada de «${prohibido}»`, donde.length === 0, donde.join(',') || 'ninguno');
}

console.log('\n─── H. Propiedades sobre grafos generados ───');

/* Grafos por capas, deterministas: cada nodo depende de algunos de la capa anterior. */
const generar = (semilla, capas, ancho) => {
  const steps = []; let previa = [];
  for (let c = 0; c < capas; c++) {
    const actual = [];
    for (let k = 0; k < ancho; k++) {
      const id = `n${c}_${k}`;
      const deps = previa.filter((_, j) => (semilla + c * 7 + k * 13 + j * 3) % 3 === 0);
      steps.push(paso(id, 'text.generate', deps.length ? deps : undefined));
      actual.push(id);
    }
    previa = actual;
  }
  return steps;
};
let malos = 0; let comprobados = 0;
for (let s = 0; s < 60; s++) {
  const steps = generar(s, 3 + (s % 3), 2 + (s % 3));
  const r = d2.descomponer(tarea(`G${s}`, steps), undefined, { maxDepth: 16 });
  if (r.problemas.length) { malos++; continue; }
  for (const o of r.opciones) {
    comprobados++;
    const t = o.value.tandas;
    const plano = t.flat();
    /* 1 · cada paso aparece exactamente una vez. */
    if (plano.length !== steps.length || new Set(plano).size !== steps.length) { malos++; continue; }
    /* 2 · ninguna dependencia se ejecuta después que quien la necesita. */
    const cuando = new Map(t.flatMap((g, i) => g.map((id) => [id, i])));
    const ordenOk = steps.every((p) => (p.dependsOn ?? []).every((dep) => cuando.get(dep) < cuando.get(p.id)));
    if (!ordenOk) { malos++; continue; }
    /* 3 · las medidas declaradas coinciden con la disposición real. */
    const m = o.value.medidas;
    if (m.steps !== steps.length || m.depth !== t.length || m.parallelism !== Math.max(...t.map((g) => g.length))) malos++;
  }
}
check('55 · PROPIEDAD · 60 grafos generados: cada paso una vez, orden válido, medidas exactas',
  malos === 0 && comprobados >= 100, `${comprobados} disposiciones, ${malos} anomalías`);

/* Y lo que el brief subraya: nada de lo generado puede tener un ciclo. */
let conCiclo = 0;
for (let s = 0; s < 60; s++) if (A.detectarCiclos(generar(s, 4, 3)).length) conCiclo++;
check('56 · PROPIEDAD · un grafo por capas nunca tiene ciclos', conCiclo === 0);
/* Bajar maxParallel nunca puede producir una disposición que lo viole. */
let violan = 0;
for (let p = 1; p <= 5; p++) {
  const r = d2.descomponer(tarea('T', ABANICO), { maxParallel: p }, { maxDepth: 16 });
  if (r.opciones.some((o) => o.value.medidas.parallelism > p)) violan++;
}
check('57 · PROPIEDAD · reducir maxParallel nunca devuelve algo que lo viole', violan === 0);

console.log('\n─── I. A2 propone, A1 decide ───');

const motorA1 = A.crearMotorDeDecision();
const resultado = d2.descomponer(tarea('T', ABANICO), { maxParallel: 3 });
const decision = motorA1.decidir({
  contract: ALGORITHM_CONTRACT_VERSION,
  objective: { weights: { depth: 2, parallelism: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' },
  options: resultado.opciones,
  signals: resultado.signals,
});
check('58 · las opciones de A2 entran en A1 sin traducir nada', decision.status === 'decided', decision.failure ?? '');
check('59 · y A1 elige la más plana cuando el objetivo lo pide',
  decision.selected.heuristica !== 'secuencial', decision.selected.heuristica);
check('60 · con el objetivo contrario, elige la otra',
  motorA1.decidir({
    contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { parallelism: 1 } },
    trace: { traceId: 't', requestId: 'r', userId: 'u' }, options: resultado.opciones, signals: resultado.signals,
  }).selected.heuristica !== 'secuencial');
check('61 · minimizar pasos no discrimina, porque todas tienen los mismos',
  resultado.opciones.every((o) => o.values.steps === 6));
/* Las señales de A2 son evidencia en A1: por eso la confianza deja de ser 0. */
check('62 · las señales medidas de A2 dan confianza real en A1',
  decision.confidence.value > 0 && decision.uncertainty !== 'unknown',
  `${decision.confidence.value.toFixed(2)} · ${decision.uncertainty}`);
check('63 · y A1 dice en qué se fijó, por claves',
  decision.signalKeys.includes('decomposition.depth') && decision.signalKeys.includes('decomposition.parallelism'),
  decision.signalKeys.join(', '));
check('64 · los tres ejes estructurales existen en el objetivo',
  ['steps', 'depth', 'parallelism'].every((e) => A.EJES.includes(e)));
check('65 · pasos y profundidad se MINIMIZAN; el paralelismo se maximiza',
  !A.seMaximiza('steps') && !A.seMaximiza('depth') && A.seMaximiza('parallelism'));
/* Y solo se declara lo que se midió: nada de coste, latencia o calidad inventados. */
check('66 · A2 no rellena ejes que no sabe',
  resultado.opciones.every((o) => igual(Object.keys(o.values).sort(), ['depth', 'parallelism', 'steps'])),
  JSON.stringify(Object.keys(resultado.opciones[0].values)));

console.log('\n─── J. Observabilidad y respaldo ───');

check('67 · cada corrida deja sus contadores', libre.metricas.attempts === 1 && libre.metricas.success === 1
  && libre.metricas.optionsGenerated === 2);
check('68 · y los rechazos se cuentan por motivo',
  acotado.metricas.maxParallelRejections === 1 && acotado.metricas.optionsRejected === 1);
check('69 · un fallo se cuenta como fallo', inventada.metricas.failures === 1 && inventada.metricas.success === 0);
check('69b · y una corrida permisiva se cuenta como éxito', permisivo.metricas.success === 1 && permisivo.metricas.failures === 0);
check('70 · los ciclos se cuentan',
  d2.descomponer(tarea('T', [paso('a', 'text.generate', ['b']), paso('b', 'text.generate', ['a'])])).metricas.cyclesDetected === 1);
/* Y las métricas no llevan nada de nadie: son números sobre la estructura. */
check('71 · las métricas son solo números',
  Object.values(libre.metricas).every((v) => typeof v === 'number' || typeof v === 'boolean'));
check('72 · el tope de opciones está declarado y se puede alcanzar',
  A.DESCRIPTOR_DE_DESCOMPOSICION.budget.maxCandidates === 8 &&
  d2.descomponer(tarea('T', ABANICO), { maxParallel: 2 }, { maxCandidates: 1 }).metricas.optionLimitReached === true);
check('73 · y con el tope a 1 solo sale una', d2.descomponer(tarea('T', ABANICO), { maxParallel: 2 }, { maxCandidates: 1 }).opciones.length === 1);
/*
 * La afirmación es que no EXISTE un segundo tope, no que la palabra no se
 * escriba: el comentario que explica por qué no hay `maxOptions` la contiene, y
 * eso es exactamente lo que debe hacer.
 */
check('74 · no se inventó un `maxOptions` paralelo: se reutiliza el presupuesto',
  ['decomposition-engine.ts', 'types.ts', 'budget.ts', 'objective.ts']
    .every((f) => !/maxOptions/.test(sinComentarios(leer(`functions/src/core/algorithm/${f}`)))) &&
  A.CONTADORES.includes('candidates') && !A.CONTADORES.includes('options'),
  A.CONTADORES.join(','));
check('75 · un respaldo iría marcado, nunca como la mejor',
  /esFallback/.test(leer('functions/src/core/algorithm/decomposition-engine.ts')) &&
  libre.opciones.every((o) => o.value.esFallback === undefined));

console.log('\n─── K. Los diez sabotajes ───');

const FUENTES = ['decomposition.ts', 'decomposition-engine.ts'].map((f) => ({ f, src: leer(`functions/src/core/algorithm/${f}`) }));
check('76 · SABOTAJE 1 · sin detección de ciclos, un grafo circular pasaría → hoy no',
  d2.descomponer(tarea('T', [paso('a', 'text.generate', ['b']), paso('b', 'text.generate', ['a'])])).opciones.length === 0);
check('77 · SABOTAJE 2 · cambiar maxDepth se nota', conDepth(tarea('T', ABANICO), 2).opciones.length === 0
  && conDepth(tarea('T', ABANICO), 6).opciones.length === 2);
check('78 · SABOTAJE 3 · contar nodos descartados se notaría',
  acotado.opciones.every((o) => o.value.medidas.steps === 6) && acotado.rechazadas.length === 1);
check('79 · SABOTAJE 4 · ignorar maxParallel se nota', acotado.opciones.every((o) => o.value.medidas.parallelism <= 2));
check('80 · SABOTAJE 5 · quitar la validación de capacidades se nota (con el puerto puesto)', inventada.opciones.length === 0);
check('81 · SABOTAJE 6 · alterar el orden se nota', igual(d2.descomponer(tarea('T', barajado)).opciones.map((o) => o.id),
  libre.opciones.map((o) => o.id)));
check('82 · SABOTAJE 7 · introducir azar se nota', doce.every((r) => igual(r, doce[0])));
check('83 · SABOTAJE 8 · aceptar una dependencia inexistente se nota',
  d2.descomponer(tarea('T', [paso('a'), paso('b', 'text.generate', ['fantasma'])])).opciones.length === 0);
check('84 · SABOTAJE 9 · saltarse una restricción se nota', pocos.opciones.length === 0);
check('85 · SABOTAJE 10 · duplicar una alternativa se nota', cadena.opciones.length === 1);
/* Y las fronteras de siempre. */
for (const [que, palabras] of [
  ['proveedor', ['elevenlabs', 'gemini', 'seedance', 'openai', 'deepseek']],
  ['Credits', ['spendCredits', 'creditsBalance', 'holdCredits']],
  ['Asset', ['createAsset', 'ownerId', 'materialesDeResultado']],
  ['Job', ['crearJob', 'JobStore', 'enqueue']],
  ['Router', ['crearRouter', 'RoutingDecision', 'RouterPolicy']],
]) {
  const donde = FUENTES.filter(({ src }) => palabras.some((p) => new RegExp(p, 'i').test(sinComentarios(src)))).map((x) => x.f);
  check(`86 · A2 no toca ${que}`, donde.length === 0, donde.join(',') || 'ninguno');
}
const importes = FUENTES.flatMap(({ f, src }) =>
  [...sinComentarios(src).matchAll(/from '([^']+)'/g)].map((m) => m[1]).filter((r) => !r.startsWith('.')).map((r) => `${f}→${r}`));
check('87 · y sigue sin importar nada de fuera del Core', importes.length === 0, importes.join(', ') || 'ninguno');
/*
 * S1.2 · Con Node y no con `grep`: el `2>/dev/null || true` hacía que en Windows
 * la búsqueda no corriera y la guarda aprobara siempre. Y con la IDENTIDAD de A2,
 * no con la palabra inglesa: `decomposition` a secas casaba con
 * `layer_decomposition`, una capacidad de Seedream que no es A2 (`guardas.mjs`).
 */
const guarda88 = guardaDeConexion({ raiz: RAIZ, capas: CAPAS_DE_PRODUCCION, patron: PATRON_A2 });
check('88 · nadie ha conectado A2 a producción', guarda88.ok && guarda88.leidos > 50, describirHallazgos(guarda88));

console.log('\n─── L. Rendimiento ───');

const medir = (capas, ancho) => {
  const steps = generar(1, capas, ancho);
  const t = tarea('P', steps);
  d2.descomponer(t, { maxParallel: 3 }, { maxDepth: 16 });
  const ini = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) d2.descomponer(t, { maxParallel: 3 }, { maxDepth: 16 });
  return [steps.length, Number(process.hrtime.bigint() - ini) / 20 / 1e6];
};
const tiempos = [[2, 5], [5, 10], [10, 20], [20, 50]].map(([c, a]) => medir(c, a));
for (const [pasos, ms] of tiempos) console.log(`   ${String(pasos).padStart(4)} subtareas → ${ms.toFixed(2)} ms`);
check('89 · 1 000 subtareas se descomponen en menos de 100 ms', tiempos[3][1] < 100, `${tiempos[3][1].toFixed(2)} ms`);
check('90 · y el coste no explota al crecer',
  tiempos[3][1] / Math.max(tiempos[1][1], 0.001) < 200, `×${(tiempos[3][1] / Math.max(tiempos[1][1], 0.001)).toFixed(0)}`);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA2: propone formas de hacerlo, y deja decidir a A1');
process.exit(failures ? 1 : 0);
