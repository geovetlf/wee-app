import {
  Orchestrator,
  PreparedWorkflow,
  PrepareResult,
  WeeError,
  crearOrchestrator,
  prepararWorkflow,
} from '../core';

/**
 * WEE ORCHESTRATOR — LA COMPOSICIÓN.
 *
 * El Orchestrator del Core es una función pura: recibe un workflow preparado,
 * mira una ejecución y dice qué toca ahora. No necesita reloj, ni traza, ni
 * registro, ni nada del mundo — y por eso aquí no se le enchufa nada.
 *
 * ── Entonces, ¿para qué existe este archivo? ────────────────────────────────
 *
 * Para que quien coordine no tenga que enhebrar dos piezas a mano. Un
 * workflow —recién construido o leído de donde se guardó— se prepara con el
 * motor de la Fase 5 y sobre ese preparado se monta el coordinador. Son dos
 * líneas, y hacerlas una evita que cada llamante invente su propia forma de
 * juntarlas, que es como aparecen los segundos motores.
 *
 * ── Lo que NO hay aquí, y por qué ───────────────────────────────────────────
 *
 * No hay quien ejecute los pasos que salen: cada despacho es un
 * `GatewayRequest` al que le falta `implementation`, y ese hueco lo llenará
 * el Router (Fase 7) antes de que el Gateway lo ejecute. No hay cola, ni
 * reintento, ni plazo, ni reanudación: eso es el Job Engine (Fase 8). No hay
 * saldo ni precio: eso es la Fase 9.
 *
 * Y no hay un coordinador por producto ni por Workplace. Es UNO, el mismo
 * para la app principal y para cualquier app independiente: lo único que
 * cambia entre ellas es el contexto que traen, nunca el motor.
 */

export type OrquestadorDeWee = { ok: true; prepared: PreparedWorkflow; orchestrator: Orchestrator } | { ok: false; error: WeeError };

/**
 * De un workflow a algo que coordina su ejecución. El workflow se revisa con
 * el lector de la Fase 5 —venga de donde venga— antes de montar nada encima.
 */
export const orquestadorDeWee = (workflow: unknown): OrquestadorDeWee => {
  const preparado: PrepareResult = prepararWorkflow(workflow);
  if (!preparado.ok) return { ok: false, error: preparado.error };
  return { ok: true, prepared: preparado.prepared, orchestrator: crearOrchestrator(preparado.prepared) };
};
