import { Job, JobEngine, JobStore, Principal, ProviderOperationRef, esTrabajoTerminal } from '../core';
import { ResolutorDeEstadoDeProveedor, ResultadoDeParada } from './reconciliacion';

/**
 * WEË RUNTIME — PEDIR QUE ALGO PARE.
 *
 * Lo pide la persona (cancelar desde la app) o lo pide Weë (el proveedor superó lo que se le concedió y no acepta que
 * se lo digamos). Son dos cosas, en este orden, y ninguna es «marcarlo cancelado»:
 *
 *   1. el Job Engine registra la petición (`cancelar`): un trabajo en cola se cancela en el acto —ahí sí no hay nada
 *      que parar—; uno que el proveedor tiene pasa a `cancel_requested`: se PIDE parar, que no es parar;
 *   2. si el proveedor sabe parar (`cancelar` en su resolutor), se le pide. Si no contesta, se le volverá a pedir.
 *
 * El final lo dice después el proveedor por el camino de siempre (aviso o reconciliación): si llega antes el final
 * bueno, gana el final —el resultado existe, es de la persona y se cobra—; si llega un fallo, la parada se consuma y la
 * liquidación de siempre devuelve la reserva. Aquí no se mueve dinero, no hay reloj propio y no se habla con nadie
 * más que con el motor de siempre y con el resolutor de su proveedor.
 */
export interface ParadaDeps {
  motor: Pick<JobEngine, 'cancelar'>;
  almacen: Pick<JobStore, 'aplicar'>;
  resolutores: Readonly<Record<string, ResolutorDeEstadoDeProveedor>>;
  ahora: () => number;
}

export type DesenlaceDeParada =
  /* Estaba en la cola de Weë: parado de verdad, sin nada que preguntarle a nadie. */
  | { estado: 'cancelado'; job: Job }
  /* El proveedor lo tiene: se pidió parar. `proveedor`, lo que contestó él, si sabe parar. */
  | { estado: 'pedida'; job: Job; proveedor?: ResultadoDeParada }
  /* Llegó tarde: ya tenía final, y ese final se queda. */
  | { estado: 'ya_terminado'; job: Job }
  /* No se pudo escribir la petición (otro escribió antes) o el motor la rechazó: se puede volver a pedir. */
  | { estado: 'no_se_pudo'; motivo: string };

const ultimaReferencia = (job: Job): ProviderOperationRef | undefined => job.attempts[job.attempts.length - 1]?.providerRef;

/**
 * PEDIR PARADA. `principal` es quien la pide: la dueña del trabajo, o Weë EN SU NOMBRE cuando vence lo concedido al
 * proveedor —el Job Engine solo deja parar a la dueña—.
 */
export const pedirParada = async (deps: ParadaDeps, job: Job, principal: Principal): Promise<DesenlaceDeParada> => {
  if (esTrabajoTerminal(job.state)) return { estado: 'ya_terminado', job };
  let actual = job;
  if (job.state !== 'cancel_requested') {
    const decision = deps.motor.cancelar(job, principal, deps.ahora());
    if (decision.status === 'transition' && decision.transition) {
      const escrito = await deps.almacen.aplicar(decision.transition);
      if (!escrito.applied) return { estado: 'no_se_pudo', motivo: 'otro_escribio_antes' };
      actual = escrito.job;
    } else if (decision.status !== 'noop') {
      return { estado: 'no_se_pudo', motivo: String(decision.status) };
    }
  }
  if (esTrabajoTerminal(actual.state)) return actual.state === 'cancelled' ? { estado: 'cancelado', job: actual } : { estado: 'ya_terminado', job: actual };
  const ref = ultimaReferencia(actual);
  const resolutor = ref ? deps.resolutores[ref.providerId] : undefined;
  if (!ref || !resolutor?.cancelar) return { estado: 'pedida', job: actual };
  const proveedor = await resolutor.cancelar(ref).catch((): ResultadoDeParada => 'no_contesta');
  return { estado: 'pedida', job: actual, proveedor };
};
