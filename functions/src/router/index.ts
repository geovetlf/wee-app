import {
  CoreCapabilityId,
  ImplementationRef,
  ImplementationResolver,
  ROUTER_CONTRACT_VERSION,
  Router,
  RouterPolicy,
  RouterRequest,
  RoutingDecision,
  TraceContext,
  crearRouter,
} from '../core';
import { registroDeWee } from '../registry';

/**
 * WEE ROUTER — LA COMPOSICIÓN.
 *
 * El Router del Core es puro: sabe elegir, pero no sabe qué tiene Weë. Eso lo
 * sabe el registro, y este archivo es el único punto donde se le pregunta.
 *
 * ── La costura que llevaba esperando desde la Fase 2 ────────────────────────
 *
 * `ImplementationResolver` se declaró en el Gateway y hasta hoy solo lo
 * implementaban las pruebas. Es el puerto por el que Weë Brain y el
 * Orchestrator piden «¿con qué atiendo esta capacidad?», y el Router es su
 * implementación de verdad. Enchufarlo aquí, y no dentro de ninguna de esas
 * capas, es lo que permite que ninguna de las dos sepa nunca de proveedores.
 *
 * ── Lo que NO hay aquí, y por qué ───────────────────────────────────────────
 *
 * No hay ejecución: elegir y ejecutar son dos cosas, y la segunda es del
 * Gateway. No hay cola ni reintento: eso es el Job Engine (Fase 8). No hay
 * saldo ni precio: eso es la Fase 9. Y no hay un router por producto ni por
 * Workplace: es UNO, el mismo para la app principal y para cualquier app
 * independiente, porque lo único que cambia entre ellas es el contexto.
 */

/** Una línea por decisión. Sin secretos y sin texto de nadie. */
export const trazaDelRouter = (decision: RoutingDecision): string =>
  `WEË ROUTER: ${decision.status} ${decision.capability}`
  + (decision.selected ? ` → ${decision.selected.providerId}/${decision.selected.modelId}` : '')
  + (decision.selectedScore ? ` score=${decision.selectedScore.total.toFixed(3)}` : '')
  + (decision.warnings.length ? ` avisos=${decision.warnings.join(',')}` : '')
  + ` traceId=${decision.trace.traceId}`;

/**
 * QUÉ HIZO FALTA PARA RESOLVER, cuando no se pudo.
 *
 * No es lo mismo «la petición estaba mal» que «hoy no lo sirve nadie», y
 * fundir las dos en un `undefined` deja a quien llame sin saber si arreglar
 * lo que pidió o esperar a que haya con qué. El puerto de la Fase 2 devuelve
 * `undefined` porque su firma es así; esto es la vía por la que se puede
 * saber el motivo sin cambiarla.
 */
export type ResolucionDeWee =
  | { ok: true; implementation: ImplementationRef; decision: RoutingDecision }
  | { ok: false; reason: 'invalid' | 'unavailable'; decision: RoutingDecision };

export interface RouterDeWeeDeps {
  /** Con qué se decide. Sin ella, la política por defecto del Core. */
  policy?: Partial<RouterPolicy>;
}

/**
 * El Router de Weë, sobre el registro real. Se construye por petición: no
 * guarda nada, así que un servidor puede desaparecer y otro decidir lo mismo.
 */
export const crearRouterDeWee = (deps: RouterDeWeeDeps = {}): Router =>
  crearRouter({ registry: registroDeWee(), ...(deps.policy ? { policy: deps.policy } : {}) });

/**
 * EL PUERTO QUE LA FASE 2 DEJÓ ABIERTO, POR FIN CONECTADO.
 *
 * Weë Brain y el Orchestrator piden una implementación para una capacidad y
 * reciben el trío resuelto, o nada si hoy no la sirve nadie. Ninguno de los
 * dos se entera de con qué: esa es exactamente la frontera.
 *
 * Es `async` porque el puerto lo es —lo declaró así para que una resolución
 * futura pueda necesitar ir a buscar algo—, pero esta no espera a nada: el
 * Router es síncrono y puro.
 */
export const resolverDeWee = (deps: RouterDeWeeDeps = {}): ImplementationResolver => {
  const router = crearRouterDeWee(deps);
  return {
    async resolver(capability: CoreCapabilityId, trace: TraceContext): Promise<ImplementationRef | undefined> {
      const r = resolverConContexto({ capability, trace }, deps, router);
      return r.ok ? r.implementation : undefined;
    },
  };
};

/**
 * RESOLVER CON TODO EL CONTEXTO, y sabiendo por qué cuando no se puede.
 *
 * El puerto de la Fase 2 solo sabe de capacidad y traza, que es lo que Weë
 * Brain necesita. Pero el Orchestrator entrega mucho más —idioma, pistas,
 * restricciones, el producto desde el que se pidió— y todo eso ACOTA la
 * elección: tirarlo hacía que el Router eligiera sin las condiciones duras
 * que le habían puesto. Esta es la vía completa, y la que usará el Job Engine.
 */
export const resolverConContexto = (
  peticion: Omit<RouterRequest, 'contract'>,
  deps: RouterDeWeeDeps = {},
  router: Router = crearRouterDeWee(deps),
): ResolucionDeWee => {
  const decision = router.resolver({ contract: ROUTER_CONTRACT_VERSION, ...peticion });
  if (decision.status === 'routed' && decision.selected) return { ok: true, implementation: decision.selected, decision };
  /* `invalid` es «arregla lo que pediste»; `unavailable` es «hoy no hay con qué». No es lo mismo. */
  return { ok: false, reason: decision.status === 'invalid' ? 'invalid' : 'unavailable', decision };
};
