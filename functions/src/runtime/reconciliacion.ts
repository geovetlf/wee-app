import { Job, JobAttempt, ProviderOperationRef, esTrabajoTerminal } from '../core';
import { AvisoNormalizado } from './aviso';
import { PlazosDeCapacidad } from './plazos';

/**
 * WEË RUNTIME — PREGUNTARLE AL PROVEEDOR, CUANDO NADIE HA AVISADO.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Un aviso de proveedor es un mensaje por la red, y los mensajes por la red se
 * pierden. ModelArk reintenta tres veces y se rinde; si esas tres caen en un
 * despliegue, una caída o un error de quinientos, el trabajo se queda esperando
 * un desenlace que ya ocurrió del otro lado —y el dinero, reservado con él—.
 *
 * Que el callback sea la ÚNICA forma de enterarse convierte una pérdida de red
 * en Credits retenidos para siempre. Así que hay una segunda: preguntar.
 *
 * ── Lo que esto es y lo que no ──────────────────────────────────────────────
 *
 * Esto NO pregunta. Aquí no hay red, ni reloj, ni Firestore: solo la decisión
 * de si hay algo que preguntar, a quién, y cuándo deja de tener sentido
 * hacerlo. Quien pregunta de verdad es un adaptador —él conoce su API— y quien
 * los junta es la composición, fuera del runtime, igual que el barrendero.
 *
 * ── La regla que protege el dinero ──────────────────────────────────────────
 *
 *     NO SABER NUNCA ES HABER FALLADO.
 *
 * El proveedor no contesta, contesta algo que no entendemos, o ya no se acuerda
 * de la tarea: ninguna de las tres es prueba de que saliera mal. Ninguna cierra
 * el trabajo y ninguna devuelve Credits. Lo que hacen es dejarlo donde estaba
 * —esperando— para que alguien vuelva a mirar. Un fallo hay que verlo, no
 * deducirlo de un silencio.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

/**
 * LO QUE CONTESTA UN PROVEEDOR CUANDO SE LE PREGUNTA POR UNA OPERACIÓN SUYA.
 *
 * `conocido: false` no es un fallo de la operación: es un fallo de la PREGUNTA.
 * Están separados a propósito, porque confundirlos es exactamente la forma de
 * devolverle el dinero a alguien cuyo vídeo se estaba haciendo.
 */
export type EstadoSegunElProveedor =
  /* Contestó, y lo que dijo ya viene traducido a palabras de Weë. */
  | { conocido: true; aviso: AvisoNormalizado }
  /* No contestó, o contestó algo que no se puede usar. El trabajo NO se mueve. */
  | { conocido: false; motivo: MotivoDeNoSaber };

export type MotivoDeNoSaber =
  /* Red, tiempo agotado, un error suyo. Se vuelve a preguntar más tarde. */
  | 'no_contesta'
  /*
   * Contestó que no sabe de esa tarea. Suena a «no existió», y NO se trata como
   * tal: los proveedores olvidan —ModelArk guarda siete días— y una tarea
   * olvidada es indistinguible de una que nunca existió. Cobrar o devolver por
   * un olvido sería decidir con la memoria del otro.
   */
  | 'no_la_conoce'
  /* Ni siquiera se le puede preguntar: no hay credenciales, o no hay adaptador. */
  | 'no_configurado'
  /* Contestó algo que no se entiende. Igual que el silencio. */
  | 'ilegible';

/** El puerto. Un adaptador que sepa hablar con su proveedor lo implementa; el runtime solo lo declara. */
export interface ResolutorDeEstadoDeProveedor {
  /** ¿Qué fue de esta operación? Nunca lanza: no saber se CONTESTA, no se rompe. */
  consultar(ref: ProviderOperationRef): Promise<EstadoSegunElProveedor>;
}

export type AccionDeReconciliacion =
  /* No hay nada que preguntar. */
  | { tipo: 'nada'; motivo: MotivoDeNoPreguntar }
  /* Hay una operación viva del otro lado y hay con qué preguntar por ella. */
  | { tipo: 'preguntar'; operacion: ProviderOperationRef }
  /*
   * Se pasó la ventana en la que el proveedor recuerda. Preguntar ya no puede
   * contestar nada, así que se deja de preguntar —pero NO se cierra ni se
   * devuelve nada: queda como lo que es, un trabajo cuyo desenlace no se supo,
   * y eso lo mira una persona.
   */
  | { tipo: 'rendirse'; motivo: 'fuera_de_la_memoria_del_proveedor' };

export type MotivoDeNoPreguntar =
  /* Ya terminó. Su desenlace está escrito y no se revisa. */
  | 'trabajo_terminal'
  /* Nadie ha salido hacia ningún proveedor todavía. */
  | 'no_salio'
  /* Salió, pero no volvió con nombre: no hay por qué operación preguntar. Esto se reconcilia a mano. */
  | 'sin_referencia'
  /* Alguien lo está ejecutando ahora mismo. Preguntar por encima de quien trabaja es pisarle. */
  | 'en_otras_manos';

const ultimoIntento = (job: Job): JobAttempt | undefined => job.attempts[job.attempts.length - 1];

/**
 * ¿HAY QUE PREGUNTAR POR ESTE TRABAJO? Pura, y decidida solo por lo guardado.
 *
 * `desde` es cuándo salió hacia el proveedor —lo dice el intento—, y contra eso
 * se mide la ventana de consulta, que la pone el proveedor y no nosotros. No se
 * mide contra la vida del trabajo: son relojes distintos (`plazos.ts`), y
 * confundirlos es dejar de preguntar por tareas que el proveedor todavía
 * recuerda perfectamente.
 */
export const decidirReconciliacion = (job: Job, at: number, plazos: Pick<PlazosDeCapacidad, 'horizonteDeReconciliacionMs'>): AccionDeReconciliacion => {
  if (esTrabajoTerminal(job.state)) return { tipo: 'nada', motivo: 'trabajo_terminal' };

  const intento = ultimoIntento(job);
  if (!intento || intento.dispatched !== true) return { tipo: 'nada', motivo: 'no_salio' };

  /*
   * ALGUIEN LO ESTÁ EJECUTANDO. Una concesión viva significa que hay un proceso
   * dentro de la llamada, y ese proceso va a contestar antes y mejor. Preguntar
   * ahora solo añadiría una carrera contra él.
   */
  if (intento.lease && intento.lease.until > at) return { tipo: 'nada', motivo: 'en_otras_manos' };

  /* Ya se sabe cómo acabó este intento: no hay incertidumbre que resolver. */
  if (intento.outcome !== undefined && intento.outcome !== 'unknown') return { tipo: 'nada', motivo: 'trabajo_terminal' };

  const ref = intento.providerRef;
  if (!ref) return { tipo: 'nada', motivo: 'sin_referencia' };

  const desde = intento.endedAt ?? intento.startedAt;
  if (typeof desde === 'number' && at - desde > plazos.horizonteDeReconciliacionMs) {
    return { tipo: 'rendirse', motivo: 'fuera_de_la_memoria_del_proveedor' };
  }
  return { tipo: 'preguntar', operacion: { providerId: ref.providerId, operationId: ref.operationId } };
};
