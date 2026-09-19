import {
  GATEWAY_CONTRACT_VERSION,
  GatewayRequest,
  GatewayResult,
  ImplementationRef,
  JOB_ENGINE_CONTRACT_VERSION,
  Job,
  JobAttempt,
  JobDispatch,
  JobEngine,
  JobPolicy,
  JobRequest,
  JobStore,
  JobTransition,
  POLITICA_DE_TRABAJO,
  Principal,
  ProviderOperationRef,
  AttemptReport,
  claveDeIdempotencia,
  alcanceDeIdempotencia,
  crearJobEngine,
} from '../core';

/**
 * WEE JOB ENGINE — LA COMPOSICIÓN.
 *
 * El motor del Core es puro: sabe decidir, pero no sabe guardar, ni ejecutar,
 * ni qué hora es. Aquí está lo único que le falta para ser útil sin dejar de
 * ser puro: la forma exacta en que su decisión se convierte en una llamada al
 * Gateway, y la forma en que lo que el Gateway conteste vuelve a ser una
 * decisión.
 *
 * ── La frontera que este archivo defiende ───────────────────────────────────
 *
 *   JOB ENGINE administra → GATEWAY ejecuta → ADAPTADOR traduce → PROVEEDOR
 *
 * El Job Engine no llama a nadie. Produce un `JobDispatch`, que es un
 * `GatewayRequest` con la identidad del trabajo encima, y quien lo ejecuta es
 * el Gateway — exactamente igual que el Orchestrator produce un `StepDispatch`
 * y quien elige con qué es el Router. `peticionDeGateway()` es esa conversión,
 * y está aquí y no en el Core a propósito: es una decisión de cableado, no un
 * contrato, y tenerla dentro haría que el Core conociera la forma de otra capa.
 *
 * ── Lo que NO hay aquí, y por qué ───────────────────────────────────────────
 *
 * No hay almacén. `JobStore` es un puerto y su implementación será de
 * infraestructura: Firestore, o lo que venga. Escribirla ahora dentro del Core
 * o pegada a él sería justo lo que ninguna de las ocho fases anteriores hizo.
 * No hay cola ni planificador: la cola ES el almacén con `availableAt`, y quien
 * despierte a los trabajadores es infraestructura. No hay bucle de sondeo: un
 * `while` esperando a un proveedor es un proceso, no un contrato. Y no hay
 * dinero: lo que costó se transporta para que la Fase 9 lo lea.
 */

export interface MotorDeTrabajosDeWee {
  motor: JobEngine;
  politica: JobPolicy;
}

/**
 * El motor de Weë. Se construye por petición y no guarda nada: un servidor
 * puede desaparecer a media frase y otro decidir exactamente lo mismo.
 */
export const crearMotorDeTrabajosDeWee = (politica: JobPolicy = POLITICA_DE_TRABAJO): MotorDeTrabajosDeWee =>
  Object.freeze({ motor: crearJobEngine(politica), politica });

/**
 * DE UN PAQUETE DE TRABAJO A UNA PETICIÓN DEL GATEWAY.
 *
 * Aquí se ve que no falta ni sobra nada: el Gateway pide capacidad,
 * implementación, entrada, hilo, idioma, clave de idempotencia, metadatos y
 * opciones de ejecución, y el paquete los trae todos. Lo único que se añade es
 * el contrato del Gateway, que es suyo y no del trabajo.
 *
 * La clave que baja es la DEL INTENTO. Reanudar el mismo intento repite la
 * clave —y un proveedor que deduplica no cobra dos veces—; un intento nuevo
 * lleva otra, porque sí queremos que vuelva a ocurrir.
 */
export const peticionDeGateway = (dispatch: JobDispatch): GatewayRequest => {
  /*
   * UNA TAREA GENERAL NO PASA POR AQUÍ. El Gateway ejecuta operaciones de IA
   * contra un proveedor; una miniatura o una transcodificación las hace otro
   * ejecutor, que se enchufa por su propio camino (Fase 11). Convertirla en una
   * petición de Gateway sería mandar a un proveedor algo que no es suyo, y
   * antes de que eso pudiera pasar en silencio, se dice aquí.
   */
  if (dispatch.task || !dispatch.capability || !dispatch.implementation) {
    throw new Error(`peticionDeGateway: una tarea general (${dispatch.task?.name ?? 'sin capacidad'}) no es una operación de IA`);
  }
  return congelarPeticion(dispatch, dispatch.capability, dispatch.implementation);
};

const congelarPeticion = (
  dispatch: JobDispatch,
  capability: NonNullable<JobDispatch['capability']>,
  implementation: NonNullable<JobDispatch['implementation']>,
): GatewayRequest => Object.freeze({
  contract: GATEWAY_CONTRACT_VERSION,
  capability,
  implementation,
  input: dispatch.input,
  trace: dispatch.trace,
  ...(dispatch.language ? { language: dispatch.language } : {}),
  idempotencyKey: dispatch.idempotencyKey,
  ...(dispatch.metadata ? { metadata: dispatch.metadata } : {}),
  execution: Object.freeze({
    /*
     * SIEMPRE `sync`, Y NO ES UN DESCUIDO.
     *
     * Bajaba `dispatch.mode`, que por defecto es `async`, y el Gateway rechaza
     * ese modo de plano (`execution_mode_unsupported`): la costura entera
     * estaba rota y ningún trabajo habría llegado nunca a un proveedor. Son
     * dos cosas distintas con el mismo nombre. El `mode` del TRABAJO dice si
     * quien lo pidió espera el resultado o lo recoge luego; el del GATEWAY
     * dice si la llamada se hace y se espera, y siempre se hace y se espera —lo
     * que puede ser largo es la operación del proveedor, y para eso el Gateway
     * ya contesta `accepted`, que es justo el camino que lleva a `waiting`.
     */
    mode: 'sync' as const,
    timeoutMs: dispatch.timeoutMs,
    deadlineAt: dispatch.deadlineAt,
    ...(dispatch.hints ? { hints: dispatch.hints } : {}),
  }),
});

/**
 * DE LO QUE CONTESTÓ EL GATEWAY A CÓMO TERMINÓ EL INTENTO.
 *
 * Tres desenlaces y ninguno inventado:
 *
 *   `completed` → salió bien, y lo que dejó viaja como referencias.
 *   `failed`    → salió mal, con el error ya normalizado del Core.
 *   `accepted`  → el proveedor lo cogió y contestará luego. NO es un final:
 *                 el trabajo se queda esperando, y este es el camino de las
 *                 operaciones largas que el Gateway dejó declarado en la Fase 2.
 *
 * `dispatched: true` en los tres casos porque los tres significan que la
 * operación salió de Weë. Eso es lo que hará que, si el proceso muere después,
 * nadie la repita a ciegas.
 */
export const informeDelGateway = (
  dispatch: JobDispatch,
  resultado: GatewayResult,
  /*
   * CÓMO LLAMA EL PROVEEDOR A ESTA OPERACIÓN, cuando alguien lo sabe.
   *
   * Entra por aquí y no se adivina del resultado. Cada proveedor guarda su
   * identificador donde quiere —`taskId`, `id`, `generation_id`, dentro de
   * `meta`, fuera— y escribir aquí el nombre que use uno sería meter un
   * proveedor concreto en el camino común. Quien lo conoce es su adaptador, y
   * es quien lo pasa. Sin él, el trabajo sigue funcionando: lo que se pierde es
   * poder preguntar por esa operación si un día no se sabe cómo acabó.
   */
  ref?: ProviderOperationRef,
): AttemptReport => {
  if (resultado.status === 'completed') {
    return {
      attemptId: dispatch.attemptId,
      outcome: 'succeeded',
      dispatched: true,
      ...(resultado.usage ? { usage: resultado.usage } : {}),
      ...(ref ? { providerRef: ref } : {}),
      result: {
        outputRefs: referenciasDe(resultado),
        ...(resultado.usage ? { usage: resultado.usage } : {}),
      },
    };
  }

  if (resultado.status === 'accepted') {
    /*
     * ACEPTADO NO ES TERMINADO, y confundirlos es el error clásico.
     *
     * El proveedor dijo «lo tengo». Cerrar el intento como bueno aquí sería
     * dar por hecho un resultado que todavía no existe. Se informa como
     * desenlace DESCONOCIDO con la referencia del proveedor: el motor lo
     * dejará esperando, y quien lo termine será el aviso del proveedor o el
     * plazo.
     */
    return {
      attemptId: dispatch.attemptId,
      outcome: 'unknown',
      dispatched: true,
      /* Lo que ya dijo haber consumido al aceptar también se transporta: la Fase 9 lo leerá. */
      ...(resultado.usage ? { usage: resultado.usage } : {}),
      ...(ref ? { providerRef: ref } : {}),
    };
  }

  return {
    attemptId: dispatch.attemptId,
    outcome: resultado.error?.code === 'TIMEOUT' ? 'timed_out' : 'failed',
    dispatched: true,
    error: resultado.error ?? { code: 'PROVIDER_ERROR', source: 'gateway' },
    ...(resultado.usage ? { usage: resultado.usage } : {}),
    ...(ref ? { providerRef: ref } : {}),
  };
};

/**
 * DÓNDE QUEDÓ LO QUE SE PRODUJO.
 *
 * Referencias, nunca contenido. Hoy lo que hay es la URL o el identificador
 * que devolvió el proveedor; cuando exista el sistema de material (Fase 11)
 * será una referencia suya, y esta función es el único sitio que habrá que
 * tocar. Un vídeo dentro del documento de un trabajo no es una opción.
 */
const referenciasDe = (resultado: GatewayResult): readonly string[] => {
  /*
   * `urls` es el campo del contrato de la Fase 0 —`CanonicalResponse`—, y es el
   * único que se lee. Un resultado de texto todavía no tiene referencia: su
   * contenido viaja en `content` y guardarlo dentro del trabajo sería meter el
   * resultado en el documento, que es justo lo que no se hace. Cuando exista el
   * sistema de material, esta función devolverá su referencia y no habrá que
   * tocar nada más.
   */
  const urls = resultado.response?.urls;
  if (!Array.isArray(urls)) return Object.freeze([]);
  return Object.freeze(urls.slice(0, 64).filter((u): u is string => typeof u === 'string' && u.length > 0 && u.length <= 512));
};

/**
 * CREAR UN TRABAJO SIN QUE DOS PETICIONES CREEN DOS.
 *
 * El protocolo entero, en un sitio, porque hacerlo a mano es exactamente donde
 * aparece la carrera:
 *
 *   1. se busca por la clave de idempotencia;
 *   2. el motor decide: crear, devolver el que hay, o conflicto;
 *   3. si toca crear, el almacén lo hace SOLO SI NO ESTÁ —una operación
 *      atómica, no un `si no existe, crea`—;
 *   4. si mientras tanto lo creó otro, se vuelve al paso 2 con el que ganó.
 *
 * El paso 4 es el que convierte una carrera en una repetición inofensiva: dos
 * peticiones simultáneas con la misma clave acaban las dos devolviendo el mismo
 * trabajo, y solo una operación se ejecuta de verdad.
 */
export const crearTrabajo = async (
  store: JobStore,
  motor: JobEngine,
  request: JobRequest,
): Promise<{ ok: true; job: Job; created: boolean } | { ok: false; decision: ReturnType<JobEngine['crear']> }> => {
  const scope = alcanceDeIdempotencia(request.principal?.userId ?? '');
  /*
   * LA MISMA REGLA QUE EL CORE, LETRA POR LETRA.
   *
   * El Core solo acepta la clave si es TEXTO y si no, usa el `requestId`. Aquí
   * decía `?? `, que acepta un número o un `false`: con una clave así, la
   * búsqueda previa miraba en un sitio y el Core creaba en otro. No se llegaba
   * a duplicar nada —quien lo impide es `crearSiAusente`— pero cada petición
   * pasaba por el camino de la carrera sin necesidad.
   */
  const clave = typeof request.idempotencyKey === 'string' ? request.idempotencyKey : (request.trace?.requestId ?? '');
  const existente = await store.porIdempotencia(scope, clave);

  const decision = motor.crear(request, existente);
  if (decision.status === 'noop' && decision.job) return { ok: true, job: decision.job, created: false };
  if (decision.status !== 'transition' || !decision.transition) return { ok: false, decision };

  const { created, job } = await store.crearSiAusente(decision.transition.job);
  if (created) return { ok: true, job, created: true };

  /* Ganó otro. Se vuelve a decidir CON el que ganó: o es la misma operación, o es un conflicto. */
  const segunda = motor.crear(request, job);
  if (segunda.status === 'noop' && segunda.job) return { ok: true, job: segunda.job, created: false };
  return { ok: false, decision: segunda };
};

/** La identidad con la que el almacén deduplica. Se exporta para que la infraestructura la use TAL CUAL. */
export const identidadDeTrabajo = (userId: string, key: string): string =>
  claveDeIdempotencia(alcanceDeIdempotencia(userId), key);

/** Lo que hay que aplicar, tal como el motor lo dejó. Se expone para que nadie lo reconstruya a mano. */
export type TransicionDeTrabajo = JobTransition;
export type IntentoDeTrabajo = JobAttempt;
export type ImplementacionElegida = ImplementationRef;
export type QuienLoPide = Principal;

/** La versión del contrato que esta composición habla. */
export const CONTRATO_DE_TRABAJOS = JOB_ENGINE_CONTRACT_VERSION;
