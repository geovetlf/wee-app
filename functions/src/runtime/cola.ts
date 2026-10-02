import { QueueDelivery, QueueMessage, QueuePort } from '../core';

/**
 * WEË RUNTIME — LA COLA DE UNA INVOCACIÓN.
 *
 * ── Qué es, dicho sin adornos ───────────────────────────────────────────────
 *
 * NO es una cola distribuida y NO es durable. Es el transporte de los avisos
 * que se producen DENTRO de una invocación del conductor: lo que aquí se encola
 * lo atiende este mismo proceso antes de responder, y cuando la invocación
 * acaba, esta cola deja de existir. No la comparte nadie.
 *
 * Eso es exactamente lo que hace falta para un trabajo cuyo resultado espera
 * la persona en la misma petición —un mensaje de Weë Brain—, y es lo mínimo
 * que permite ejercitar `QueuePort` de verdad sin presentar como
 * infraestructura algo que no lo es.
 *
 * ── Por qué no contradice al puerto ─────────────────────────────────────────
 *
 * `core/job-queue.ts` advierte contra «una cola en memoria dentro del código de
 * producción: un `Array` haciéndose pasar por infraestructura». La advertencia
 * va contra una cola A NIVEL DE MÓDULO, compartida entre peticiones, que el día
 * que haya dos procesos pierde la mitad de los avisos sin que nada falle. Esta
 * no guarda nada entre peticiones: se crea con cada ejecución y muere con ella.
 *
 * LO DURABLE ES EL ALMACÉN. Si el proceso muere con avisos sin atender, no se
 * pierde ningún trabajo: siguen guardados, y los encuentra el barrido
 * (`barrerRecuperables`) o la siguiente llamada con la misma operación. Perder
 * un aviso cuesta tiempo, nunca un trabajo ni un cobro.
 *
 * ── Cuándo deja de servir ───────────────────────────────────────────────────
 *
 * El día que un trabajo tenga que sobrevivir a la petición que lo creó —un
 * vídeo de veinte minutos— hace falta un transporte de verdad detrás de
 * `QueuePort`. Esta cola no lo es ni pretende serlo: se sustituye, y ni el
 * conductor, ni el trabajador, ni el almacén, ni el trabajo se enteran.
 */

/** Cuántos avisos VIVOS caben. Un workflow tiene como mucho mil pasos; esto es un tope, no un objetivo. */
const MAX_AVISOS_VIVOS = 1_024;

interface Aviso {
  id: number;
  message: QueueMessage;
  visibleAt: number;
  entregas: number;
  vuelo?: { deliveryId: string; until: number };
  hecho: boolean;
}

export interface ColaDeInvocacion extends QueuePort {
  /** Avisos que siguen sin confirmar. */
  pendientes(): number;
  /**
   * Cuándo se podrá coger el próximo aviso que ahora mismo no se puede.
   * `undefined` = no hay ninguno esperando.
   *
   * En el puerto esto es OPCIONAL; aquí es OBLIGATORIO, y es lo único que
   * distingue a esta cola de cualquier otra: vive dentro de una invocación, así
   * que esperar aquí dentro a que llegue la hora de un reintento sí tiene
   * sentido. Un transporte que sobrevive a la invocación no debe contestarla.
   */
  proximoVisible(at: number): number | undefined;
}

/**
 * Una cola para UNA ejecución. El reloj entra por la puerta —como en todo el
 * Job Engine— porque `nack` tiene que saber desde cuándo cuenta la espera y el
 * puerto no se lo dice.
 */
export const colaDeInvocacion = (ahora: () => number): ColaDeInvocacion => {
  let avisos: Aviso[] = [];
  let serie = 0;
  const enVuelo = (deliveryId: string): Aviso | undefined => avisos.find((a) => a.vuelo?.deliveryId === deliveryId);

  return {
    guarantee: 'at_least_once',

    async enqueue(message: QueueMessage): Promise<void> {
      /* Lo ya confirmado no ocupa sitio: se olvida al encolar, que es cuando importa cuánto hay. */
      avisos = avisos.filter((a) => !a.hecho);
      if (avisos.length >= MAX_AVISOS_VIVOS) throw new Error('cola de invocación llena');
      avisos.push({ id: ++serie, message, visibleAt: message.notBefore ?? 0, entregas: 0, hecho: false });
    },

    async claim({ at, visibilityMs }): Promise<QueueDelivery | undefined> {
      const aviso = avisos.find((a) => !a.hecho && a.visibleAt <= at && (!a.vuelo || a.vuelo.until <= at));
      if (!aviso) return undefined;
      aviso.entregas++;
      /* Un recibo por ENTREGA, no por aviso: confirmar una entrega vieja después de otra nueva no hace nada. */
      aviso.vuelo = { deliveryId: `inv.${aviso.id}.${aviso.entregas}`, until: at + visibilityMs };
      return { deliveryId: aviso.vuelo.deliveryId, message: aviso.message, deliveryCount: aviso.entregas, receivedAt: at };
    },

    async ack(deliveryId: string): Promise<void> {
      const aviso = enVuelo(deliveryId);
      if (aviso) { aviso.hecho = true; aviso.vuelo = undefined; }
    },

    async nack(deliveryId: string, options?: { delayMs?: number }): Promise<void> {
      const aviso = enVuelo(deliveryId);
      if (aviso) { aviso.visibleAt = ahora() + Math.max(0, options?.delayMs ?? 0); aviso.vuelo = undefined; }
    },

    pendientes: () => avisos.filter((a) => !a.hecho).length,

    proximoVisible(at: number): number | undefined {
      const esperas = avisos.filter((a) => !a.hecho).map((a) => Math.max(a.visibleAt, a.vuelo?.until ?? 0)).filter((t) => t > at);
      return esperas.length ? Math.min(...esperas) : undefined;
    },
  };
};
