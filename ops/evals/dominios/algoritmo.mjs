/*
 * EL DOMINIO ALGORITMO — el Algorithm Engine en el Eval Engine, EN OBSERVACIÓN.
 *
 * Mismo contrato de dominio que el Router (`functions/src/evals/motor/dominios.ts`), y lo único propio del Algorithm
 * Engine: el escenario que pide al ciclo vivo que decida —y, si el caso lo trae, que cierre sin aprender— sin ejecutar
 * nada (`escenario-algoritmo.mjs`, $0), sus graders deterministas (`graders-algoritmo.mjs`), la forma de su caso (una
 * PETICIÓN algorítmica sintética, sin contrato ni traza, que pone el entorno; y, si lo pide, un cronómetro determinista)
 * y qué identifica un caso para la contaminación (la petición, lo observado y el cronómetro). Todo lo demás —correr, puntuar, comparar con su baseline, holdout,
 * presupuesto, permisos, corrida— es el motor común: aquí no hay ni un bucle.
 *
 * EXPERIMENTAL / OBSERVACIONAL, NUNCA AUTORIDAD, y por eso:
 *  · es un dominio de DESARROLLO: decide sin ejecutar adaptadores y a $0, y vive en ops/evals, que Cloud Functions no
 *    empaqueta. No está —ni puede estar— en el registro real (`functions/src/evals/dominios.ts`): `evalRun` no lo corre;
 *  · NO declara superficie: Hillclimb no tiene nada que optimizar, porque no hay un valor «de producción» que mejorar —el
 *    motor no está conectado a nada salvo a la sombra, con su puerta cerrada—. Se evalúa; no se optimiza ni se promueve;
 *  · sus graders exigen que cada decisión diga que su motor es experimental, que nada de lo que devuelve sea un
 *    artefacto de ejecución, ni un cobro, ni nombre una implementación, y que el cierre no aprenda;
 *  · produce EVIDENCIA y un veredicto contra su baseline; nunca cambia producción.
 *
 * Registrado en `DOMINIOS` (`dominios.mjs`), el segundo después del Router: `evals-dominios` fija el registro como
 * router + algoritmo, y `node ops/evals/runner.mjs --dataset algoritmo` lo corre como a cualquier otro.
 */
import { decidirEscenario } from '../escenario-algoritmo.mjs';
import { calificar, CLAVES_DE_EXPECTED } from '../graders-algoritmo.mjs';
import { hashCanonico } from '../contrato.mjs';

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** La forma de un caso: una petición, sin lo que pone el entorno; lo observado, si cierra; y solo claves esperadas conocidas. */
const validarCaso = (caso) => {
  const id = (caso && caso.evalCaseId) || '?';
  if (!esObjeto(caso && caso.peticion)) return [`${id}: sin peticion`];
  const e = [];
  const d = caso.peticion.decision;
  if (esObjeto(d) && ('contract' in d || 'trace' in d)) e.push(`${id}: el contrato y la traza los pone el escenario, no el caso`);
  if (caso.cierre !== undefined && !(esObjeto(caso.cierre) && esObjeto(caso.cierre.observacion))) e.push(`${id}: cierre sin observacion`);
  if (caso.cronometro !== undefined && !(esObjeto(caso.cronometro) && Number.isFinite(caso.cronometro.paso) && caso.cronometro.paso >= 0)) {
    e.push(`${id}: cronometro sin un paso finito y no negativo`);
  }
  for (const k of Object.keys(esObjeto(caso.expected) ? caso.expected : {})) if (!CLAVES_DE_EXPECTED.includes(k)) e.push(`${id}: expected.${k} no es una clave de este dominio`);
  return e;
};

export const dominioAlgoritmo = Object.freeze({
  id: 'algoritmo',
  descripcion: 'El Algorithm Engine (crearCicloAlgoritmico) EN OBSERVACIÓN: decide —y cierra sin aprender— sobre peticiones sintéticas con la forma de la sombra; experimental y sin autoridad: no ejecuta, no elige proveedor ni modelo, no cobra ($0).',
  decidir: (caso) => decidirEscenario(caso),
  calificar: (decision, caso, medicion) => calificar(decision, caso, medicion),
  validarCaso,
  claveDeCaso: (caso) => hashCanonico({ peticion: caso.peticion, cierre: caso.cierre || null, ...(caso.cronometro ? { cronometro: caso.cronometro } : {}) }).slice(0, 24),
});
