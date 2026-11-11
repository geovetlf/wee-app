/*
 * WEË AI EVALUATION ENGINE — GRADERS DETERMINISTAS DEL ALGORITHM ENGINE (dominio `algoritmo`).
 *
 * Cada grader mira la decisión que devuelve el escenario (`escenario-algoritmo.mjs`) —el resultado del ciclo y, si lo
 * hay, su cierre, CRUDOS— y el caso. Deterministas: sin IA, sin red, sin azar, sin reloj; ningún juez-LLM. Miden lo que
 * se le pide a un motor EXPERIMENTAL en observación: decisiones reproducibles, restricciones respetadas, una estrategia
 * bien formada que conserva los pasos del Planner, paralelismo coherente con las dependencias, incertidumbre honesta,
 * un sobre coherente, y lo que no puede hacer —cruzar la frontera de autoridad, elegir proveedor, tener autoridad
 * financiera, ejecutar o aprender—, a $0.
 *
 * Dos clases de grader:
 *  · los INVARIANTES corren en todo caso al que se aplican, lo pida o no el caso: un motor que nombra un proveedor o
 *    devuelve un cobro está mal en cualquier caso;
 *  · los ESPERADOS solo corren si el caso trae su clave `expected.*`: `desenlace` (status y parada), `eleccion`
 *    (GOLDEN: el id de lo entregado, estructurado y determinista, como `router/eleccion`), los `grupos` de
 *    `paralelismo`, la `incertidumbre` exacta y lo esperado del `cierre`.
 *
 * Lo que el motor declara en ejecución (su contrato, la frontera del Planner, sus topes, el dueño de cada requisito,
 * sus vocabularios de verificación y de recuperación) se lee del motor (`MOTOR_ALGORITMICO`), no se copia. Las listas cerradas que
 * solo existen como tipos se copian aquí con su archivo de origen, y la suite las compara con el fuente.
 */
import { hashCanonico } from './contrato.mjs';
import { MOTOR_ALGORITMICO } from './escenario-algoritmo.mjs';

/* Qué dimensión mide cada grader DEL DOMINIO ALGORITMO. El motor de evals no lo lee: puntúa por la que trae cada resultado. */
export const DIMENSION_DE_GRADER_ALGORITMO = Object.freeze({
  'algoritmo/eleccion': 'QUALITY',
  'algoritmo/estrategia': 'QUALITY',
  'algoritmo/paralelismo': 'QUALITY',
  'algoritmo/restricciones': 'QUALITY',
  'algoritmo/desenlace': 'RELIABILITY',
  'algoritmo/coherencia': 'RELIABILITY',
  'algoritmo/reproducible': 'RELIABILITY',
  'algoritmo/incertidumbre': 'RELIABILITY',
  'algoritmo/frontera': 'RELIABILITY',
  'algoritmo/sin-proveedor': 'RELIABILITY',
  'algoritmo/experimental': 'RELIABILITY',
  'algoritmo/cierre': 'RELIABILITY',
  'algoritmo/presupuesto-de-pensar': 'LATENCY',
  'algoritmo/coste-cero': 'COST',
  'algoritmo/sin-autoridad-financiera': 'COST',
});

/** Las listas cerradas que el motor solo declara como TIPOS, copiadas de su fuente (la suite vigila que coincidan). */
export const VOCABULARIO = Object.freeze({
  /* DecisionStatus — functions/src/core/algorithm/decision.ts */
  estados: Object.freeze(['decided', 'undecided', 'invalid']),
  /* MotivoDeParada — functions/src/core/algorithm/integration.ts */
  paradas: Object.freeze(['malformed_request', 'ambiguous_alternatives', 'history_twice', 'context_rejected', 'context_refused',
    'approach_undecided', 'invalid_task', 'undecided', 'composition_emptied', 'max_depth_exceeded', 'budget_exceeded', 'authority_violation']),
  /* PasoDelCiclo, en el orden del ciclo — integration.ts */
  pasos: Object.freeze(['context', 'approach', 'decomposition', 'parallelization', 'strategy', 'optimization', 'decision', 'handoff']),
  /* Uncertainty — signals.ts */
  incertidumbres: Object.freeze(['known', 'probable', 'uncertain', 'unknown']),
  /* CierreDelCiclo.status y MotivoDeCierreInvalido — integration.ts */
  cierres: Object.freeze(['closed', 'invalid']),
  paradasDeCierre: Object.freeze(['not_decided', 'malformed_observation']),
  /* Los avisos de DecisionWarning que dicen que el presupuesto de pensar se acabó — decision.ts */
  avisosDePresupuesto: Object.freeze(['budget_exhausted', 'evidence_capped', 'counter_exhausted', 'candidates_capped']),
  /* EntregaDeEjecucion — integration.ts: lo ÚNICO que cruza la frontera */
  clavesDeLaEntrega: Object.freeze(['plan', 'elegida', 'constraints', 'expected']),
  /* Strategy — strategy.ts */
  clavesDelPlan: Object.freeze(['id', 'contract', 'label', 'proposedBy', 'fromDecomposition', 'steps', 'parallelGroups', 'checkpoints',
    'recovery', 'expected', 'criticalPath', 'evidence', 'isBaseline', 'isFallback', 'fallbackFrom']),
  /* PlanStep — functions/src/core/planner.ts */
  clavesDelPaso: Object.freeze(['id', 'capability', 'purpose', 'dependsOn', 'input', 'produces', 'hints', 'uses']),
  /* Budget — functions/src/core/cost.ts */
  clavesDelPresupuesto: Object.freeze(['maxCredits', 'maxUsd', 'prefer', 'onExceed']),
  /* QualityRequirement — functions/src/core/workflow.ts */
  clavesDeCalidad: Object.freeze(['minScore', 'checks', 'onBelow']),
});

/*
 * Lo que delataría AUTORIDAD si apareciera en lo que devuelve el motor —esto es observación de la evaluación, no la
 * frontera del Core (esa es la de authority.ts: la lista del Planner y la lectura por responsabilidad)—. Cada clave tiene dueño en `EFECTOS_PROHIBIDOS` (authority.ts):
 *  · DINERO (Financial Core): un importe de Credits, un precio, un cobro, un reembolso, un saldo. Un TOPE de Credits
 *    para el Router (`constraints.budget.maxCredits`, dueño `router` en DESTINO_DEL_REQUISITO) es un requisito, no un
 *    cobro, y es lo único con «credit» que puede viajar; `costUsd` es coste estimado de proveedor, no Credits.
 *  · EJECUCIÓN (Job Engine, Asset Core, Gateway): un trabajo, un material, una generación, la referencia de un proveedor.
 */
const CLAVES_DE_DINERO = new Set(['price', 'prices', 'precio', 'charge', 'charged', 'cobro', 'cobrar', 'refund', 'refunded', 'reembolso',
  'reembolsar', 'payment', 'pago', 'settle', 'settled', 'settlement', 'invoice', 'factura', 'wallet', 'saldo', 'ledger']);
const TOPE_DE_CREDITS_PARA_EL_ROUTER = /(^|\.)constraints\.budget\.maxCredits$/;
const ARTEFACTOS_DE_EJECUCION = new Set(['jobid', 'workflowid', 'runid', 'executionid', 'dispatchid', 'assetid', 'materialid',
  'generationid', 'providerref', 'credittransactionid', 'outputurl', 'downloadurl']);

/* Los requisitos que acotan por arriba (el más estrecho es el menor) y por abajo (el mayor). */
const TOPES_POR_ARRIBA = ['maxSteps', 'maxParallel', 'maxRisk', 'maxLatencyMs', 'deadlineAt'];
const CLAVES_ESPERADAS = ['status', 'parada', 'elegida', 'grupos', 'incertidumbre', 'cierre'];

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => (Array.isArray(v) ? v : []);
const igual = (a, b) => hashCanonico(a ?? null) === hashCanonico(b ?? null);
const finito01 = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const numero = (x) => typeof x === 'number' && Number.isFinite(x);
const normal = (k) => String(k).toLowerCase().replace(/[-_]/g, '');
const veredicto = (fallos) => ({ ok: fallos.length === 0, detail: [...new Set(fallos)].slice(0, 4).join(' · ') });

const MAX_NODOS = 500_000;
/**
 * Todas las claves de un valor, a CUALQUIER profundidad —sin el tope de 8 niveles ni de 4096 nodos de `violacionesEn`,
 * que existe para no caerse en producción, no para auditar— y sin colgarse en un ciclo. Devuelve las rutas cuya
 * clave cumple el predicado y si el recorrido fue completo (si no, quien pregunta falla cerrado).
 */
export const rutasDe = (valor, predicado) => {
  const rutas = [];
  const enCamino = new Set();
  let restantes = MAX_NODOS;
  const andar = (v, ruta) => {
    if (v === null || typeof v !== 'object' || enCamino.has(v) || restantes-- <= 0) return;
    enCamino.add(v);
    if (Array.isArray(v)) v.forEach((x, i) => andar(x, `${ruta}[${i}]`));
    else {
      for (const [k, x] of Object.entries(v)) {
        const r = ruta ? `${ruta}.${k}` : k;
        if (predicado(k, r)) rutas.push(r);
        andar(x, r);
      }
    }
    enCamino.delete(v);
  };
  andar(valor, '');
  return { rutas: [...new Set(rutas)].sort(), completo: restantes > 0 };
};

const esImplementacion = (k) => MOTOR_ALGORITMICO.claveDeImplementacion(k);
const esDeDinero = (k, ruta) => {
  const n = normal(k);
  if (n.includes('credit')) return !TOPE_DE_CREDITS_PARA_EL_ROUTER.test(ruta);
  return CLAVES_DE_DINERO.has(n);
};

const resultadoDe = (d) => (esObjeto(d) && esObjeto(d.resultado) ? d.resultado : null);
const peticionDe = (caso) => (esObjeto(caso.peticion) ? caso.peticion : {});
const ladosDeRestricciones = (p) => [p.decision?.constraints, p.decision?.objective?.constraints].filter(esObjeto);
const decisionesDeA1 = (r) => [r?.approach, r?.decision].filter(esObjeto);
/** La tarea que se estructuró: la de la petición o, si antes hubo que elegir enfoque, la elegida. */
const tareaDecidida = (p, r) => p.tarea ?? r?.approach?.selected ?? null;
const masEstrecho = (lados, campo, porArriba = true) => {
  const vs = lados.map((l) => l[campo]).filter(numero);
  if (!vs.length) return undefined;
  return porArriba ? Math.min(...vs) : Math.max(...vs);
};

/** Los topes de pensar que rigen: lo declarado (finito y no negativo) o el defecto del motor, nunca sobre su techo. */
const topesEfectivos = (budget) => Object.fromEntries(Object.keys(MOTOR_ALGORITMICO.topesPorDefecto).map((k) => {
  const v = esObjeto(budget) ? budget[k] : undefined;
  return [k, Math.min(numero(v) && v >= 0 ? v : MOTOR_ALGORITMICO.topesPorDefecto[k], MOTOR_ALGORITMICO.topesMaximos[k])];
}));
/** `maxAlgorithmCalls` vigila `algorithmCalls`: el contador de cada tope. */
const contadorDe = (tope) => tope.charAt(3).toLowerCase() + tope.slice(4);

/** De quién depende cada paso, directa o indirectamente. Un ciclo no se recorre dos veces (lo dice otro grader). */
const ancestros = (pasos) => {
  const deps = new Map(lista(pasos).map((s) => [s?.id, lista(s?.dependsOn)]));
  const memo = new Map();
  const de = (id, enCurso = new Set()) => {
    if (memo.has(id)) return memo.get(id);
    const salida = new Set();
    if (enCurso.has(id)) return salida;
    enCurso.add(id);
    for (const dep of deps.get(id) ?? []) {
      salida.add(dep);
      for (const x of de(dep, enCurso)) salida.add(x);
    }
    enCurso.delete(id);
    memo.set(id, salida);
    return salida;
  };
  return de;
};
const hayCiclo = (pasos) => {
  const pendientes = new Map(lista(pasos).map((s) => [s?.id, new Set(lista(s?.dependsOn))]));
  let avanza = true;
  while (pendientes.size && avanza) {
    avanza = false;
    for (const [id, deps] of pendientes) {
      if ([...deps].every((d) => !pendientes.has(d))) { pendientes.delete(id); avanza = true; }
    }
  }
  return pendientes.size > 0;
};

/* Catálogo: id → (decisión, esperado, caso, medición) → { ok, detail } | null (null = no aplica a este caso). */
const CATALOGO = {
  /* ── Lo esperado ─────────────────────────────────────────────────────────── */

  'algoritmo/desenlace': (d, e) => {
    if (!('status' in e)) return null;
    const f = [];
    if (d.status !== e.status) f.push(`status ${d.status}; esperado ${e.status}`);
    if ('parada' in e && (d.parada ?? null) !== e.parada) f.push(`parada ${d.parada ?? '—'}; esperada ${e.parada ?? '—'}`);
    return veredicto(f);
  },

  /* GOLDEN: qué se entregó, por su id (el del plan o el de la opción); `null` cuando no se entrega nada. */
  'algoritmo/eleccion': (d, e) => {
    if (!('elegida' in e)) return null;
    const ok = (d.elegida ?? null) === e.elegida;
    return { ok, detail: ok ? '' : `entregó ${d.elegida ?? '(nada)'}; esperado ${e.elegida ?? '(nada)'}` };
  },

  /* ── Lo que vale siempre ─────────────────────────────────────────────────── */

  /* El sobre dice una sola cosa: estado, parada, recorrido, entrega y elección cuadran entre sí y con lo pedido. */
  'algoritmo/coherencia': (d, _e, caso) => {
    const r = resultadoDe(d);
    if (!r) return { ok: false, detail: 'sin resultado del ciclo' };
    const p = peticionDe(caso);
    const V = VOCABULARIO;
    const f = [];
    if (r.contract !== MOTOR_ALGORITMICO.contrato || d.contrato !== MOTOR_ALGORITMICO.contrato) f.push(`contrato ${r.contract} (vigente ${MOTOR_ALGORITMICO.contrato})`);
    if (!V.estados.includes(r.status) || d.status !== r.status) f.push(`status fuera del vocabulario o distinto del normalizado: ${r.status}`);
    const recorrido = lista(r.recorrido);
    if (!igual(recorrido, d.recorrido)) f.push('el recorrido normalizado no es el del ciclo');
    const posiciones = recorrido.map((x) => V.pasos.indexOf(x));
    if (posiciones.some((i, k) => i < 0 || (k > 0 && i <= posiciones[k - 1]))) f.push(`recorrido desconocido o fuera de orden: ${recorrido.join('>')}`);
    const decidido = r.status === 'decided';
    if (decidido !== esObjeto(r.entrega)) f.push('una decisión tomada, y solo ella, lleva entrega');
    if (decidido !== (recorrido[recorrido.length - 1] === 'handoff')) f.push('el recorrido acaba en la entrega si y solo si se decidió');
    if (decidido && r.parada !== undefined) f.push('decidió y dice por qué paró');
    if (!decidido && !V.paradas.includes(r.parada)) f.push(`parada fuera del vocabulario: ${r.parada}`);
    if ((d.parada ?? null) !== (r.parada ?? null)) f.push('la parada normalizada no es la del ciclo');
    if (!Array.isArray(r.because) || !r.because.length || !r.because.every((x) => typeof x === 'string' && x.length)) f.push('sin un porqué legible');
    /* Lo pedido se compone; lo no pedido, no. */
    const pedido = {
      context: esObjeto(p.aprendido), approach: lista(p.enfoques).length > 0,
      decomposition: Boolean(p.tarea) || lista(p.enfoques).length > 0,
      parallelization: p.componer?.paralelizar === true, optimization: p.componer?.optimizar === true,
    };
    for (const [paso, sePidio] of Object.entries(pedido)) if (recorrido.includes(paso) && !sePidio) f.push(`compuso ${paso} sin que se pidiera`);
    if (decidido && p.tarea) for (const paso of ['parallelization', 'optimization']) if (pedido[paso] && !recorrido.includes(paso)) f.push(`se pidió ${paso} y decidió sin él`);
    /* Lo entregado es lo que eligió A1, y nada más. */
    const entregado = decidido && esObjeto(r.entrega) ? (r.entrega.plan ? r.entrega.plan.id : r.entrega.elegida) : null;
    if ((d.elegida ?? null) !== (entregado ?? null)) f.push('la elegida normalizada no es la entregada');
    if (decidido && esObjeto(r.entrega)) {
      const dec = r.decision;
      const elegidas = lista(dec?.candidates).filter((c) => c?.reason === 'selected');
      if (dec?.status !== 'decided' || dec?.contract !== MOTOR_ALGORITMICO.contrato) f.push('se entregó sin una decisión tomada con el contrato vigente');
      if (elegidas.length !== 1 || elegidas[0].id !== entregado || elegidas[0].eligible !== true) f.push(`lo entregado (${entregado}) no es la única candidata elegida y elegible`);
      if (r.entrega.plan) {
        if (!igual(r.entrega.plan, dec?.selected)) f.push('el plan entregado no es el que eligió A1');
        if (lista(dec?.alternatives).some((a) => a?.id === entregado)) f.push('lo elegido aparece también como alternativa');
      } else if (!lista(p.decision?.options).some((o) => o?.id === entregado)) f.push(`la alternativa entregada (${entregado}) no es una de las opciones dadas`);
    }
    return veredicto(f);
  },

  /* Mismo input → mismo resultado; el orden de llegada no decide; el motor no toca lo que recibe. */
  'algoritmo/reproducible': (d) => {
    const x = d.reproducibilidad;
    if (!esObjeto(x)) return { ok: false, detail: 'sin medida de reproducibilidad' };
    const f = [];
    if (!x.huella || x.huella !== x.huellaRepetida) f.push('la misma petición dio otro resultado');
    if (!x.nucleo || x.nucleo !== x.nucleoPermutado) f.push('el orden de llegada cambió la decisión');
    if ((x.huellaDelCierre ?? null) !== (x.huellaDelCierreRepetido ?? null)) f.push('el mismo cierre dio otro resultado');
    if (x.entradaIntacta !== true) f.push('el motor tocó la petición que recibió');
    return veredicto(f);
  },

  /* Sin evidencia no hay conocimiento: lo que no se sabe se dice «unknown»; y ningún número sale sin su confianza. */
  'algoritmo/incertidumbre': (d, e) => {
    const r = resultadoDe(d);
    const decisiones = decisionesDeA1(r);
    if (!decisiones.length && !('incertidumbre' in e)) return null;
    const f = [];
    for (const dec of decisiones) {
      const c = dec.confidence;
      if (!VOCABULARIO.incertidumbres.includes(dec.uncertainty)) f.push(`incertidumbre fuera del vocabulario: ${dec.uncertainty}`);
      if (!esObjeto(c) || !finito01(c.value) || !Array.isArray(c.basis)) f.push('una confianza sin valor en [0,1] o sin base');
      else if (c.basis.length === 0 && dec.uncertainty !== 'unknown') f.push(`sin evidencia que la sostenga dice «${dec.uncertainty}»: solo vale «unknown»`);
    }
    const plan = r?.entrega?.plan;
    if (plan && (!esObjeto(plan.expected?.confidence) || !finito01(plan.expected.confidence.value) || !VOCABULARIO.incertidumbres.includes(plan.expected?.uncertainty))) {
      f.push('el plan entregado promete números sin su confianza o su incertidumbre');
    }
    if ('incertidumbre' in e && (r?.decision?.uncertainty ?? null) !== e.incertidumbre) f.push(`incertidumbre ${r?.decision?.uncertainty ?? '—'}; esperada ${e.incertidumbre ?? '—'}`);
    return veredicto(f);
  },

  /*
   * LA FRONTERA DE AUTORIDAD, con la lista del Planner (`claveDeImplementacion`), recorrida entera: nada que cruza
   * (la entrega) ni nada elegido o elegible nombra una implementación; si la petición no nombraba ninguna, el motor no
   * introduce ninguna en ninguna parte —lo mismo que mira la sombra con `violacionesEn`—; y si la nombraba, se niega a
   * entregar.
   */
  'algoritmo/frontera': (d, _e, caso) => {
    const r = resultadoDe(d);
    if (!r) return { ok: false, detail: 'sin resultado del ciclo' };
    const f = [];
    const entrada = rutasDe({ peticion: caso.peticion ?? null, observacion: caso.cierre?.observacion ?? null }, esImplementacion);
    const entrega = rutasDe(r.entrega ?? null, esImplementacion);
    const elegido = rutasDe([r.decision?.selected ?? null, ...lista(r.decision?.alternatives), r.approach?.selected ?? null,
      ...lista(r.decision?.candidates).filter((c) => c?.eligible).map((c) => c.value)], esImplementacion);
    if (entrega.rutas.length) f.push(`la entrega nombra una implementación: ${entrega.rutas.join(', ')}`);
    if (elegido.rutas.length) f.push(`lo elegido o elegible nombra una implementación: ${elegido.rutas.join(', ')}`);
    if (entrada.rutas.length) {
      if (r.status === 'decided' || r.entrega) f.push(`la petición nombraba una implementación (${entrada.rutas.join(', ')}) y aun así se entregó`);
    } else {
      const todo = rutasDe({ resultado: r, cierre: d.cierre ?? null }, esImplementacion);
      if (todo.rutas.length) f.push(`el motor introdujo una implementación: ${todo.rutas.join(', ')}`);
      if (MOTOR_ALGORITMICO.violacionesEn(r, 'algoritmo').length) f.push('la guarda de la sombra (violacionesEn) lo ve cruzar la frontera');
      if (!todo.completo) f.push('el resultado no se pudo revisar entero');
    }
    if (!entrada.completo || !entrega.completo || !elegido.completo) f.push('no se pudo revisar entero');
    return veredicto(f);
  },

  /*
   * NI ELIGE PROVEEDOR POR LA PUERTA DE ATRÁS: lo que cruza tiene la forma cerrada del contrato —la entrega, el plan y
   * sus pasos con sus campos y ninguno más; cada requisito con su dueño (`DESTINO_DEL_REQUISITO`: Router, Orchestrator,
   * ejecución o decisión), ninguno un proveedor; la opción elegida, una de las dadas—. Donde no hay campo, no cabe una
   * elección: un `vendor` o un `backend` que la lista del Planner no conoce tampoco pasan.
   */
  'algoritmo/sin-proveedor': (d, _e, caso) => {
    const entrega = resultadoDe(d)?.entrega;
    if (entrega === undefined || entrega === null) return null;
    const V = VOCABULARIO;
    const f = [];
    const soloDelContrato = (obj, permitidas, donde) => {
      if (obj === undefined) return;
      if (!esObjeto(obj)) { f.push(`${donde} no es un objeto`); return; }
      for (const k of Object.keys(obj)) if (!permitidas.includes(k)) f.push(`${donde}.${k} no es un campo del contrato`);
    };
    soloDelContrato(entrega, V.clavesDeLaEntrega, 'entrega');
    if (entrega.plan !== undefined) {
      soloDelContrato(entrega.plan, V.clavesDelPlan, 'plan');
      lista(entrega.plan?.steps).forEach((s, i) => soloDelContrato(s, V.clavesDelPaso, `plan.steps[${i}]`));
    }
    if (entrega.elegida !== undefined && !lista(peticionDe(caso).decision?.options).some((o) => o?.id === entrega.elegida)) {
      f.push(`la elegida (${entrega.elegida}) no es una de las opciones que se dieron`);
    }
    if (entrega.constraints !== undefined) {
      soloDelContrato(entrega.constraints, Object.keys(MOTOR_ALGORITMICO.destinoDelRequisito), 'constraints');
      soloDelContrato(entrega.constraints?.budget, V.clavesDelPresupuesto, 'constraints.budget');
      soloDelContrato(entrega.constraints?.quality, V.clavesDeCalidad, 'constraints.quality');
    }
    return veredicto(f);
  },

  /*
   * EXPERIMENTAL Y EN OBSERVACIÓN: cada decisión tomada dice que su motor es experimental (`experimental_algorithm`:
   * corre, se mide, nadie lo elige solo); lo que devuelve no lleva ningún artefacto de ejecución; y el cierre no aprende.
   */
  'algoritmo/experimental': (d) => {
    const r = resultadoDe(d);
    if (!r) return { ok: false, detail: 'sin resultado del ciclo' };
    const f = [];
    for (const dec of decisionesDeA1(r)) {
      if (dec.status === 'decided' && !lista(dec.warnings).includes('experimental_algorithm')) f.push('una decisión tomada no dice que su motor es experimental');
    }
    const artefactos = rutasDe({ resultado: r, cierre: d.cierre ?? null }, (k) => ARTEFACTOS_DE_EJECUCION.has(normal(k)));
    if (artefactos.rutas.length) f.push(`artefactos de ejecución en lo que devuelve: ${artefactos.rutas.join(', ')}`);
    if (!artefactos.completo) f.push('no se pudo revisar entero');
    if (esObjeto(d.cierre) && 'learning' in d.cierre) f.push('el cierre aprendió: en observación no se aprende');
    return veredicto(f);
  },

  /* El cierre: lo observado se atribuye a lo ENTREGADO (nunca a lo que diga quien ejecuta) y recuperar es proponer. */
  'algoritmo/cierre': (d, e, caso) => {
    if (!caso.cierre && !('cierre' in e)) return null;
    const c = d.cierre;
    if (!esObjeto(c)) return { ok: false, detail: 'el caso trae lo observado y no hubo cierre' };
    const obs = caso.cierre?.observacion ?? {};
    const f = [];
    if (c.contract !== MOTOR_ALGORITMICO.contrato) f.push(`el cierre no lleva el contrato vigente (${c.contract})`);
    if (!VOCABULARIO.cierres.includes(c.status)) f.push(`estado de cierre desconocido: ${c.status}`);
    if (c.status === 'invalid' && !VOCABULARIO.paradasDeCierre.includes(c.parada)) f.push(`cierre inválido sin un motivo del vocabulario: ${c.parada}`);
    if (c.status === 'closed') {
      if (d.status !== 'decided') f.push('cerró algo que no se decidió');
      const o = c.outcome;
      if (!esObjeto(o)) f.push('cerrado sin resultado');
      else {
        if ((o.scope?.strategyId ?? null) !== (d.elegida ?? null)) f.push(`el resultado se atribuye a ${o.scope?.strategyId}, no a lo entregado (${d.elegida})`);
        if (o.id !== obs.actual?.id || o.kind !== obs.kind) f.push('el resultado no es lo que se observó');
        if (lista(o.signals).some((s) => s?.subject !== obs.actual?.id)) f.push('se le atribuyen medidas de otro sujeto');
      }
      if (!lista(MOTOR_ALGORITMICO.estadosDeVerificacion).includes(c.verification?.status)) f.push(`verificación fuera del vocabulario: ${c.verification?.status}`);
      const evaluadas = new Set(lista(resultadoDe(d)?.strategies?.estrategias).map((x) => x?.id));
      for (const pr of lista(c.recovery?.proposals)) {
        if (!lista(MOTOR_ALGORITMICO.recuperaciones).includes(pr?.kind)) f.push(`recuperación fuera del vocabulario: ${pr?.kind}`);
        if (pr?.kind === 'alternative_strategy' && (!evaluadas.has(pr.strategyId) || pr.strategyId === d.elegida)) f.push(`propone ir a ${pr.strategyId}, que no es otra estrategia ya evaluada`);
      }
    }
    const x = e.cierre;
    if (esObjeto(x)) {
      if (x.status !== undefined && c.status !== x.status) f.push(`cierre ${c.status}; esperado ${x.status}`);
      if ('parada' in x && (c.parada ?? null) !== x.parada) f.push(`parada del cierre ${c.parada ?? '—'}; esperada ${x.parada ?? '—'}`);
      if (x.verificacion !== undefined && c.verification?.status !== x.verificacion) f.push(`verificación ${c.verification?.status}; esperada ${x.verificacion}`);
      if (x.propone !== undefined && (lista(c.recovery?.proposals).length > 0) !== x.propone) f.push(`${x.propone ? 'no propone' : 'propone'} recuperación`);
    }
    return veredicto(f);
  },

  /* ── La calidad de lo decidido ───────────────────────────────────────────── */

  /*
   * UNA ESTRATEGIA BIEN FORMADA, DE QUIEN DEBE Y CON LOS PASOS DEL PLANNER: la forma es del motor —qué va con qué, qué
   * se comprueba, qué hacer si falla—; los pasos, del Planner, tal cual (ni uno más, ni uno menos, ni cambiado).
   */
  'algoritmo/estrategia': (d, _e, caso) => {
    const r = resultadoDe(d);
    const plan = r?.entrega?.plan;
    if (!plan) return null;
    const f = [];
    if (typeof plan.id !== 'string' || !plan.id) f.push('plan sin id');
    if (typeof plan.label !== 'string' || !plan.label.trim()) f.push('plan sin etiqueta');
    if (!/^[a-z0-9][a-z0-9.-]*@\d+$/.test(String(plan.proposedBy))) f.push(`proposedBy sin la forma id@versión: ${plan.proposedBy}`);
    if (plan.contract !== MOTOR_ALGORITMICO.contrato) f.push(`el plan no lleva el contrato vigente (${plan.contract})`);
    const pasos = lista(plan.steps);
    const ids = pasos.map((s) => s?.id);
    const existentes = new Set(ids);
    if (!pasos.length) f.push('plan sin pasos');
    if (existentes.size !== ids.length) f.push('ids de paso repetidos');
    for (const s of pasos) for (const dep of lista(s?.dependsOn)) if (!existentes.has(dep)) f.push(`${s.id} depende de un paso que no existe: ${dep}`);
    if (hayCiclo(pasos)) f.push('las dependencias del plan forman un ciclo');
    for (const c of lista(plan.checkpoints)) if (!existentes.has(c?.afterStepId)) f.push(`comprobación tras un paso que no existe: ${c?.afterStepId}`);
    for (const id of lista(plan.criticalPath)) if (!existentes.has(id)) f.push(`camino crítico con un paso que no existe: ${id}`);
    for (const rec of lista(plan.recovery)) if (rec?.kind === 'alternative_strategy' && !rec.strategyId) f.push('recuperación alternativa sin estrategia a la que ir');
    if (plan.isFallback && !plan.fallbackFrom) f.push('un respaldo que no dice de qué');
    /* Solo A3 genera estrategias y A5 propone: lo entregado tiene que salir de ahí. */
    const generadas = new Set([...lista(r.strategies?.estrategias).map((x) => x?.id), ...lista(r.optimization?.proposals).map((x) => x?.result?.id)]);
    if (!generadas.has(plan.id)) f.push(`el plan entregado (${plan.id}) no salió de A3 ni de A5`);
    const tarea = tareaDecidida(peticionDe(caso), r);
    const delPlanner = new Map(lista(tarea?.steps).map((s) => [s?.id, s]));
    const sinOrden = (s) => ({ ...s, dependsOn: [...lista(s?.dependsOn)].sort() });
    if (delPlanner.size !== existentes.size || ids.some((id) => !delPlanner.has(id))) f.push('el plan no tiene exactamente los pasos del Planner');
    else for (const s of pasos) if (!igual(sinOrden(s), sinOrden(delPlanner.get(s.id)))) f.push(`el paso ${s.id} no es el del Planner`);
    return veredicto(f);
  },

  /*
   * EL PARALELISMO, COHERENTE CON LAS DEPENDENCIAS: nada va a la vez que algo de lo que depende, ni directa ni
   * INDIRECTAMENTE (la guarda del propio motor solo mira la directa); grupos de dos o más pasos reales, sin repetir, en
   * un solo grupo cada uno; y nunca más a la vez que `maxParallel`. Con `expected.grupos`, además, los grupos exactos.
   */
  'algoritmo/paralelismo': (d, e, caso) => {
    const plan = resultadoDe(d)?.entrega?.plan;
    if (!plan) return 'grupos' in e ? { ok: false, detail: 'se esperaban grupos y no se entregó un plan' } : null;
    const f = [];
    const pasos = lista(plan.steps);
    const existentes = new Set(pasos.map((s) => s?.id));
    const deQuienDepende = ancestros(pasos);
    const grupos = lista(plan.parallelGroups);
    const tope = masEstrecho(ladosDeRestricciones(peticionDe(caso)), 'maxParallel');
    const vistos = new Set();
    for (const g of grupos) {
      const ps = lista(g?.steps);
      if (ps.length < 2) f.push('un grupo de menos de dos pasos');
      if (new Set(ps).size !== ps.length) f.push('un grupo con pasos repetidos');
      for (const x of ps) {
        if (!existentes.has(x)) f.push(`un grupo con un paso que no existe: ${x}`);
        if (vistos.has(x)) f.push(`${x} está en dos grupos`);
        vistos.add(x);
      }
      for (const x of ps) for (const y of ps) if (x !== y && deQuienDepende(x).has(y)) f.push(`${x} va a la vez que ${y}, del que depende`);
      if (g?.maxConcurrency !== undefined && !(Number.isInteger(g.maxConcurrency) && g.maxConcurrency >= 1)) f.push('maxConcurrency no es un entero ≥ 1');
      const aLaVez = Math.min(ps.length, g?.maxConcurrency ?? Infinity);
      if (tope !== undefined && aLaVez > tope) f.push(`${aLaVez} a la vez con maxParallel ${tope}`);
    }
    if ('grupos' in e) {
      const canon = (gs) => gs.map((g) => [...lista(Array.isArray(g) ? g : g?.steps)].sort())
        .sort((a, b) => (a.join() < b.join() ? -1 : a.join() > b.join() ? 1 : 0));
      if (!igual(canon(grupos), canon(lista(e.grupos)))) f.push(`grupos ${JSON.stringify(canon(grupos))}; esperados ${JSON.stringify(canon(lista(e.grupos)))}`);
    }
    return veredicto(f);
  },

  /*
   * LAS RESTRICCIONES, RESPETADAS: si se decidió, el plan cumple lo comprobable de las dos caras (petición y objetivo)
   * y la entrega lleva cada requisito al menos tan estrecho como el más estrecho de los dos lados; si no se decidió,
   * no cruza nada.
   */
  'algoritmo/restricciones': (d, _e, caso) => {
    const lados = ladosDeRestricciones(peticionDe(caso));
    if (!lados.length) return null;
    const r = resultadoDe(d);
    const f = [];
    if (r?.status !== 'decided') {
      if (r?.entrega) f.push('sin decidir, entregó algo');
      return veredicto(f);
    }
    const plan = r.entrega?.plan;
    if (plan) {
      const capacidades = new Set(lista(plan.steps).map((s) => s?.capability));
      const maxSteps = masEstrecho(lados, 'maxSteps');
      if (maxSteps !== undefined && lista(plan.steps).length > maxSteps) f.push(`${lista(plan.steps).length} pasos con maxSteps ${maxSteps}`);
      for (const lado of lados) {
        for (const c of lista(lado.requiredCapabilities)) if (!capacidades.has(c)) f.push(`falta la capacidad exigida ${c}`);
        for (const c of lista(lado.forbiddenCapabilities)) if (capacidades.has(c)) f.push(`usa la capacidad prohibida ${c}`);
      }
      const maxRisk = masEstrecho(lados, 'maxRisk');
      if (maxRisk !== undefined && numero(plan.expected?.risk) && plan.expected.risk > maxRisk) f.push(`riesgo ${plan.expected.risk} > maxRisk ${maxRisk}`);
      const maxLatencyMs = masEstrecho(lados, 'maxLatencyMs');
      if (maxLatencyMs !== undefined && numero(plan.expected?.latencyMs) && plan.expected.latencyMs > maxLatencyMs) f.push(`latencia prevista ${plan.expected.latencyMs} > maxLatencyMs ${maxLatencyMs}`);
    }
    const minConfidence = masEstrecho(lados, 'minConfidence', false);
    if (minConfidence !== undefined && !(r.decision?.confidence?.value >= minConfidence - 1e-12) && !lista(r.decision?.warnings).includes('below_min_confidence')) {
      f.push(`confianza ${r.decision?.confidence?.value} por debajo de minConfidence ${minConfidence}, sin decirlo`);
    }
    const exigido = r.entrega?.constraints;
    if (!esObjeto(exigido)) f.push('decidió con restricciones y no las entrega');
    else {
      for (const lado of lados) {
        for (const [campo, valor] of Object.entries(lado)) {
          const v = exigido[campo];
          if (TOPES_POR_ARRIBA.includes(campo)) { if (!(numero(v) && v <= valor)) f.push(`entrega ${campo}=${v}, más ancho que ${valor}`); }
          else if (campo === 'minConfidence') { if (!(numero(v) && v >= valor)) f.push(`entrega minConfidence=${v}, más ancho que ${valor}`); }
          else if (campo === 'forbiddenCapabilities' || campo === 'requiredCapabilities') {
            const faltan = lista(valor).filter((c) => !lista(v).includes(c));
            if (faltan.length) f.push(`entrega ${campo} sin ${faltan.join(', ')}`);
          } else if (campo === 'budget') {
            for (const [k, x] of Object.entries(esObjeto(valor) ? valor : {})) if (numero(x) && !(numero(v?.[k]) && v[k] <= x)) f.push(`entrega budget.${k}=${v?.[k]}, más ancho que ${x}`);
          } else if (campo === 'quality') {
            if (numero(valor?.minScore) && !(numero(v?.minScore) && v.minScore >= valor.minScore)) f.push(`entrega quality.minScore=${v?.minScore}, más ancho que ${valor.minScore}`);
          } else if (!(campo in exigido)) f.push(`no entrega ${campo}`);
        }
      }
    }
    return veredicto(f);
  },

  /* ── El tiempo de pensar ─────────────────────────────────────────────────── */

  /*
   * EL PRESUPUESTO DE PENSAR NUNCA SE PASA EN SILENCIO: si un contador supera el tope que rige, la decisión lo dice
   * (un aviso de presupuesto o `budget_exceeded`); y el ciclo llama `budget_exceeded` solo a lo que de verdad se quedó
   * sin presupuesto. Contadores deterministas —el motor no lee relojes—, no milisegundos medidos.
   */
  'algoritmo/presupuesto-de-pensar': (d, _e, caso) => {
    const r = resultadoDe(d);
    const decisiones = decisionesDeA1(r);
    if (!decisiones.length && r?.parada !== 'budget_exceeded') return null;
    const topes = topesEfectivos(peticionDe(caso).decision?.budget);
    const f = [];
    for (const dec of decisiones) {
      const gasto = dec.spend;
      if (!esObjeto(gasto)) { f.push('una decisión sin lo que gastó pensando'); continue; }
      const pasados = [];
      for (const tope of Object.keys(topes)) {
        const v = gasto[contadorDe(tope)];
        if (!(numero(v) && v >= 0)) f.push(`el contador ${contadorDe(tope)} no es un número`);
        else if (v > topes[tope]) pasados.push(`${contadorDe(tope)} ${v} > ${tope} ${topes[tope]}`);
      }
      const loDice = lista(dec.warnings).some((w) => VOCABULARIO.avisosDePresupuesto.includes(w)) || dec.failure === 'budget_exceeded';
      if (pasados.length && !loDice) f.push(`se pasó sin decirlo: ${pasados.join(', ')}`);
    }
    if (r?.decision?.failure === 'budget_exceeded' && r.parada !== 'budget_exceeded') f.push('A1 se quedó sin presupuesto y el ciclo lo llama de otra forma');
    if (r?.parada === 'budget_exceeded' && r.decision?.failure !== 'budget_exceeded'
      && !(r.strategies?.metricas?.budgetExhausted || r.parallelization?.metricas?.budgetExhausted || r.decomposition?.metricas?.optionLimitReached)) {
      f.push('dice budget_exceeded sin que ningún motor marcara el presupuesto agotado');
    }
    return veredicto(f);
  },

  /* ── El dinero ───────────────────────────────────────────────────────────── */

  /* $0: el dominio no ejecuta nada y el corredor no midió coste. Con un coste simulado por caso, falla: no es su sitio. */
  'algoritmo/coste-cero': (d, _e, _caso, medicion) => {
    const coste = esObjeto(medicion) ? medicion.costeUsd : 0;
    const ok = d.ejecuciones === 0 && coste === 0;
    return { ok, detail: ok ? '' : `ejecuciones ${d.ejecuciones} · coste medido $${coste}: este dominio solo corre a $0` };
  },

  /* NINGUNA AUTORIDAD FINANCIERA: ni un importe de Credits, ni un precio, ni un cobro o reembolso en nada de lo que devuelve. */
  'algoritmo/sin-autoridad-financiera': (d) => {
    const r = resultadoDe(d);
    if (!r) return { ok: false, detail: 'sin resultado del ciclo' };
    const dinero = rutasDe({ resultado: r, cierre: d.cierre ?? null }, esDeDinero);
    if (dinero.rutas.length) return { ok: false, detail: `Credits o cobros en lo que devuelve: ${dinero.rutas.join(', ')}` };
    return { ok: dinero.completo, detail: dinero.completo ? '' : 'no se pudo revisar entero' };
  },
};

/** Las claves de `expected` que este dominio entiende. Una desconocida es un error del dataset, no un grader que no corre. */
export const CLAVES_DE_EXPECTED = Object.freeze([...CLAVES_ESPERADAS]);

/**
 * Corre todos los graders aplicables a un caso sobre su decisión. Devuelve [{ id, dimension, ok, detail }]. Un grader
 * que no puede leer la decisión no se salta: falla (cerrado), con el motivo.
 */
export const calificar = (decision, caso, medicion) => {
  const res = [];
  for (const [id, fn] of Object.entries(CATALOGO)) {
    let r;
    try {
      r = fn(decision || {}, (caso && caso.expected) || {}, caso || {}, medicion);
    } catch (e) {
      r = { ok: false, detail: `el grader no pudo leer la decisión: ${String((e && e.message) || e).slice(0, 120)}` };
    }
    if (r) res.push({ id, dimension: DIMENSION_DE_GRADER_ALGORITMO[id], ok: r.ok, detail: r.detail });
  }
  return res;
};

export const GRADERS_ALGORITMO = Object.freeze(Object.keys(CATALOGO));
