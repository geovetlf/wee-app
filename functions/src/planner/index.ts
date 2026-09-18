import {
  CapabilityAvailability,
  CoreCapabilityId,
  Planner,
  PlannerPorts,
  Tracer,
  crearPlanner,
  puedeEjecutarse,
} from '../core';
import { registroDeWee } from '../registry';

/**
 * WEE PLANNER — LA COMPOSICIÓN.
 *
 * El Planner del Core es puro: sabe convertir un entendimiento en un plan de
 * capacidades, pero no sabe qué puede servir Weë hoy. Eso lo sabe el registro,
 * y este archivo es el único punto donde se le pregunta.
 *
 * ── La pregunta, y cómo está formulada ──────────────────────────────────────
 *
 * «¿Hay con qué hacer esto?», por CAPACIDAD. Nunca «¿está tal proveedor
 * configurado?». La diferencia no es de estilo: la segunda ata una decisión del
 * sistema a una empresa concreta, y era exactamente la deuda que arrastraba el
 * planificador de Weë Creator.
 *
 * ── Por qué solo cuentan las matrices ───────────────────────────────────────
 *
 * El modo demo atiende cualquier capacidad —para eso está—, así que contarlo
 * haría que TODO pareciera disponible siempre y que el sistema creyera poder
 * hacer cosas que nadie puede hacer de verdad. Se mira el TIPO de proveedor, que
 * es un contrato de la Fase 1, no un nombre: aquí no se nombra a nadie.
 */

/** Lo que Weë puede servir de verdad hoy, preguntándoselo al registro. */
export const disponibilidadDeWee: CapabilityAvailability = {
  disponible(capability: CoreCapabilityId): boolean {
    return registroDeWee()
      .getCapabilityImplementations(capability)
      .some((impl) => impl.provider.type === 'matrix' && puedeEjecutarse(impl).ok);
  },
};

/** Una disponibilidad fija, para quien necesite planificar contra un conjunto conocido. */
export const disponibilidadDe = (capacidades: readonly CoreCapabilityId[]): CapabilityAvailability => ({
  disponible: (capability) => capacidades.includes(capability),
});

/** Una línea por plan. Ni más ni menos: lo demás es del sistema de observabilidad de fases posteriores. */
export const trazaDelPlanner: Tracer = {
  record: (t) => {
    const fallo = t.errorCode ? ` error=${t.errorCode}` : '';
    console.log(`WEË PLANNER: ${t.status} ${t.capability} ${t.latencyMs} ms${fallo} requestId=${t.requestId} traceId=${t.traceId}`);
  },
};

export interface PlannerDeWeeDeps {
  availability?: CapabilityAvailability;
  tracer?: Tracer;
  now?: () => number;
}

/**
 * El Planner de Weë. Se construye por petición: no guarda nada, así que un
 * servidor puede desaparecer y otro planificar lo mismo con el mismo resultado.
 */
export const crearPlannerDeWee = (deps: PlannerDeWeeDeps = {}): Planner =>
  crearPlanner({
    availability: deps.availability ?? disponibilidadDeWee,
    tracer: deps.tracer ?? trazaDelPlanner,
    now: deps.now ?? (() => Date.now()),
  } satisfies PlannerPorts);
