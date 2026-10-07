/*
 * WEË AI EVALUATION ENGINE — ESCENARIO DEL ALGORITHM ENGINE (dominio `algoritmo`, EN OBSERVACIÓN).
 *
 * Reconstruye el ciclo VIVO del Algorithm Engine (`functions/lib/core/algorithm`, `crearCicloAlgoritmico`) y le pide
 * lo mismo que le pide la sombra del plan (`creator/sombra.ts`): DECIDIR. Si el caso trae lo que se observó al
 * ejecutar, también CERRAR, y sin aprender —la sombra ni siquiera cierra; aquí se cierra para ver que el cierre no se
 * deja atribuir a otra alternativa y que lo que propone es solo propuesta—. Es el MISMO motor, no una copia: si cambia,
 * el eval lo ve (requiere `functions/lib` al día, como el escenario del Router).
 *
 * OBSERVACIONAL, NUNCA AUTORIDAD. El Algorithm Engine es experimental (`DESCRIPTOR_DEL_MOTOR.status`) y en producción
 * solo lo carga la sombra, detrás de su puerta cerrada. Aquí se carga desde `functions/lib/core` y nada más: ni una
 * ruta, ni el Router, ni el Gateway, ni el libro, ni el Credit Engine. Lo que decide se mide y se tira. El motor no
 * tiene adaptadores ni puertos de ejecución —ejecutar es de otros, `EFECTOS_PROHIBIDOS`—, así que `ejecuciones` es 0
 * por construcción; la suite comprueba, en un proceso aparte, que cargar esto no trae nada de fuera de
 * `functions/lib/core` y del motor de evals.
 *
 * Lo único que pone el escenario es lo del ENTORNO de la evaluación: el contrato vigente del motor y la traza de la
 * identidad de las evals (`eval`, nunca una cuenta). Todo lo demás sale del caso tal cual. Y si el caso lo pide
 * (`cronometro: { paso }`), el ciclo recibe un cronómetro DETERMINISTA —un reloj de mentira que avanza `paso` ms en
 * cada lectura, empezando en 0—: el mismo puerto con que la sombra le pasa el suyo (misión de cierre). Sin él, el
 * motor no lee ningún reloj, como siempre.
 *
 * La reproducibilidad no se supone: se MIDE en cada caso. La misma petición, con un motor y una copia nuevos, da el
 * mismo resultado byte a byte (y el mismo cierre); con las señales, las opciones y los enfoques en orden inverso, el
 * mismo núcleo de decisión —el orden de llegada no decide—; y la petición que recibió el motor sale intacta.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { hashCanonico } from './contrato.mjs';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORE = path.join(RAIZ, 'functions/lib/core');
const A = require(path.join(CORE, 'algorithm/index.js'));
const { ALGORITHM_CONTRACT_VERSION } = require(path.join(CORE, 'contracts.js'));
/* La lista de implementación del Planner, para el grader de la frontera; la frontera ENTERA —esa lista y la lectura por
   responsabilidad de authority.ts— la aplica `violacionesEn`. Aquí no se escribe otra. */
const { claveDeImplementacion } = require(path.join(CORE, 'planner.js'));

/** La identidad de las evaluaciones (`IDENTIDAD_EVAL` del motor de evals): firma la traza; nunca es una cuenta. */
export const IDENTIDAD_DEL_ESCENARIO = 'eval';

/**
 * Lo que los graders necesitan saber del motor, leído de él y no copiado: su contrato, su estado, la frontera de
 * autoridad del Planner, sus topes de pensar, el dueño de cada requisito y sus vocabularios de verificación y
 * recuperación. Un solo sitio carga el motor (este); los graders lo leen de aquí.
 */
export const MOTOR_ALGORITMICO = Object.freeze({
  contrato: ALGORITHM_CONTRACT_VERSION,
  motorDeDecision: A.DECISION_ENGINE_REF,
  estadoDelMotor: A.DESCRIPTOR_DEL_MOTOR.status,
  claveDeImplementacion,
  violacionesEn: A.violacionesEn,
  topesPorDefecto: A.TOPES_POR_DEFECTO,
  topesMaximos: A.TOPES_MAXIMOS,
  destinoDelRequisito: A.DESTINO_DEL_REQUISITO,
  estadosDeVerificacion: A.ESTADOS,
  recuperaciones: A.RECUPERACIONES,
});

/** La petición que recibe el motor: la del caso, copiada, con el contrato vigente y la traza de la identidad `eval`. */
export const peticionDelCaso = (caso) => {
  const p = structuredClone(caso.peticion || {});
  if (p.decision && typeof p.decision === 'object' && !Array.isArray(p.decision)) {
    const id = `eval_${caso.evalCaseId}`;
    p.decision = { ...p.decision, contract: ALGORITHM_CONTRACT_VERSION, trace: { traceId: id, requestId: id, userId: IDENTIDAD_DEL_ESCENARIO } };
  }
  return p;
};

/**
 * El cronómetro del caso, NUEVO para cada ciclo: la misma secuencia de lecturas en la decisión, en su repetición y en
 * la permutada, así que la reproducibilidad se sigue midiendo byte a byte.
 */
const cronometroDelCaso = (caso) => {
  const paso = caso && caso.cronometro && typeof caso.cronometro === 'object' ? caso.cronometro.paso : undefined;
  if (!(typeof paso === 'number' && Number.isFinite(paso) && paso >= 0)) return undefined;
  let t = 0;
  return () => (t += paso);
};
const cicloDelCaso = (caso) => {
  const cronometro = cronometroDelCaso(caso);
  return A.crearCicloAlgoritmico(cronometro ? { cronometro } : undefined);
};

/* Lo que puede llegar en otro orden sin que eso deba cambiar nada: señales, opciones y enfoques. */
const LISTAS_SIN_ORDEN = [['decision', 'signals'], ['decision', 'options'], [null, 'enfoques']];
const listaDe = (p, [padre, campo]) => (padre ? p[padre] && p[padre][campo] : p[campo]);
const alReves = (p) => {
  const q = structuredClone(p);
  for (const [padre, campo] of LISTAS_SIN_ORDEN) {
    const dueno = padre ? q[padre] : q;
    if (dueno && Array.isArray(dueno[campo])) dueno[campo] = [...dueno[campo]].reverse();
  }
  return q;
};
const permutable = (p) => LISTAS_SIN_ORDEN.some((ruta) => Array.isArray(listaDe(p, ruta)) && listaDe(p, ruta).length > 1);

/** Lo que se entregó, por su identidad: el id del plan o el de la opción elegida. */
export const elegidaDe = (r) => (r && r.entrega ? (r.entrega.plan ? r.entrega.plan.id : (r.entrega.elegida ?? null)) : null);

/** El núcleo de una decisión: lo que no puede depender del orden en que llegaron las cosas. */
const nucleoDe = (r) => ({
  status: r.status, parada: r.parada ?? null, recorrido: r.recorrido, entrega: r.entrega ?? null, elegida: elegidaDe(r),
  confianza: r.decision?.confidence?.value ?? null, incertidumbre: r.decision?.uncertainty ?? null,
  avisos: [...(r.decision?.warnings ?? [])].sort(), fallo: r.decision?.failure ?? null,
});

/**
 * Un caso contra el motor vivo. Devuelve la decisión NORMALIZADA —estado, parada, recorrido, lo entregado—, el
 * resultado y el cierre crudos (los graders los recorren enteros) y lo medido de su reproducibilidad. Puro: sin red,
 * sin reloj de verdad (el del caso, si lo hay, es de mentira y determinista), sin Firestore, sin coste.
 */
export const decidirEscenario = (caso) => {
  const peticion = peticionDelCaso(caso);
  const paraRepetir = structuredClone(peticion);
  const paraPermutar = alReves(peticion);
  const antes = hashCanonico(peticion);

  const ciclo = cicloDelCaso(caso);
  const resultado = ciclo.decidir(peticion);
  const entradaIntacta = hashCanonico(peticion) === antes;
  const otroCiclo = cicloDelCaso(caso);
  const repetido = otroCiclo.decidir(paraRepetir);
  const permutado = cicloDelCaso(caso).decidir(paraPermutar);

  /* El cierre, si el caso trae lo observado: sin aprendizaje, que es lo que mantiene esto en observación. */
  const observacion = caso.cierre && caso.cierre.observacion;
  const cierre = observacion ? ciclo.cerrar(resultado, structuredClone(observacion)) : null;
  const cierreRepetido = observacion ? otroCiclo.cerrar(repetido, structuredClone(observacion)) : null;

  return {
    ejecuciones: 0,
    contrato: ALGORITHM_CONTRACT_VERSION,
    status: resultado.status,
    parada: resultado.parada ?? null,
    recorrido: [...resultado.recorrido],
    elegida: elegidaDe(resultado),
    resultado,
    cierre,
    reproducibilidad: {
      huella: hashCanonico(resultado),
      huellaRepetida: hashCanonico(repetido),
      nucleo: hashCanonico(nucleoDe(resultado)),
      nucleoPermutado: hashCanonico(nucleoDe(permutado)),
      permutable: permutable(peticion),
      huellaDelCierre: cierre ? hashCanonico(cierre) : null,
      huellaDelCierreRepetido: cierreRepetido ? hashCanonico(cierreRepetido) : null,
      entradaIntacta,
    },
  };
};
