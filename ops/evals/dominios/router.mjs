/*
 * EL DOMINIO ROUTER — el primero del Eval Engine (`ops/evals/dominios.mjs`).
 *
 * Lo único propio del Router: el escenario que reconstruye el router vivo con dependencias falsas
 * (`escenario-router.mjs`: decide sin ejecutar adaptadores, $0), sus graders (`graders.mjs`), la forma de su caso
 * (capability + world), qué identifica un caso para la contaminación (capability + world + request) y su SUPERFICIE:
 * lo que Hillclimb (F6) puede cambiar del Router, con valores cerrados y el de producción como baseline.
 * Todo lo demás —correr, puntuar, comparar, holdout, presupuesto, permisos, corrida, el bucle de Hillclimb— es común.
 */
import { decidirEscenario } from '../escenario-router.mjs';
import { calificar } from '../graders.mjs';
import { hashCanonico } from '../contrato.mjs';

/*
 * Superficie v1, deliberadamente pequeña: la política que el router usa cuando la cadena de una capacidad no fija la
 * suya (`aiSettings.defaultPolicy`). Los valores son los de `RoutingPolicy` (functions/src/engine/types.ts) y el
 * baseline, el de producción (`balanced`, el que el escenario usa si no se dice otro).
 */
const SUPERFICIE = Object.freeze({
  version: 'router-superficie@1',
  parametros: Object.freeze({
    defaultPolicy: Object.freeze({ tipo: 'enum', valores: Object.freeze(['balanced', 'quality-first', 'cost-first']), baseline: 'balanced' }),
  }),
});

/* Un valor POR DEFECTO solo vale donde el caso no fija el suyo: un caso que lo fija es un escenario aparte. */
const aplicarCandidato = (caso, candidato) => {
  const settings = (caso.world && caso.world.settings) || {};
  if (Object.prototype.hasOwnProperty.call(settings, 'defaultPolicy')) return caso;
  return { ...caso, world: { ...(caso.world || {}), settings: { ...settings, defaultPolicy: candidato.defaultPolicy } } };
};

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
  superficie: SUPERFICIE,
  aplicarCandidato,
});
