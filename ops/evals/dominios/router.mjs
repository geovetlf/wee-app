/*
 * EL DOMINIO ROUTER — el primero del Eval Engine (`ops/evals/dominios.mjs`).
 *
 * Lo único propio del Router: el escenario que reconstruye el router vivo con dependencias falsas
 * (`escenario-router.mjs`: decide sin ejecutar adaptadores, $0), sus graders (`graders.mjs`), la forma de su caso
 * (capability + world) y qué identifica un caso para la contaminación (capability + world + request).
 * Todo lo demás —correr, puntuar, comparar, holdout, presupuesto, permisos, corrida— es del motor común.
 */
import { decidirEscenario } from '../escenario-router.mjs';
import { calificar } from '../graders.mjs';
import { hashCanonico } from '../contrato.mjs';

export const dominioRouter = Object.freeze({
  id: 'router',
  descripcion: 'El router vivo del WEË AI ENGINE (createRouter().route()) con dependencias falsas: decide sin ejecutar adaptadores ($0).',
  decidir: (caso) => decidirEscenario(caso),
  calificar: (decision, caso) => calificar(decision, caso),
  validarCaso: (caso) => [
    ...(caso.capability ? [] : [`${caso.evalCaseId || '?'}: sin capability`]),
    ...(caso.world && typeof caso.world === 'object' ? [] : [`${caso.evalCaseId || '?'}: sin world`]),
  ],
  claveDeCaso: (caso) => hashCanonico({ capability: caso.capability, world: caso.world, request: caso.request || {} }).slice(0, 24),
});
