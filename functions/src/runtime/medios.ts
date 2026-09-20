import {
  CanonicalResponse,
  CoreCapabilityId,
  GatewayMetadata,
  GatewayUsage,
  LanguageContext,
  Principal,
  TraceContext,
  WeeError,
  WORKFLOW_CONTRACT_VERSION,
  errorDelCore,
} from '../core';
import { AvisoDelConductor, Conductor, ResultadoDelConductor } from './conductor';
import { PreferenciasDeRuteo } from './resolucion';

/**
 * WEË RUNTIME — UN PASO DE MEDIOS, POR EL CONDUCTOR.
 *
 * Hermano de `pensador.ts`, y distinto en lo único que importa: **un texto se
 * contesta dentro de la llamada y un vídeo no**.
 *
 * Weë Brain necesita la respuesta AHORA: si el conductor devuelve «en curso»,
 * para Brain eso es un fallo, porque no tiene nada que contestarle a la
 * persona. Un vídeo es al revés: «en curso» es el desenlace BUENO y esperado.
 * El proveedor cogió la tarea, dijo cómo la llama, y va a tardar minutos. La
 * llamada termina, el proceso se va, y el trabajo sigue vivo con su dinero
 * reservado hasta que alguien pregunte por él.
 *
 * Por eso son dos archivos y no un parámetro: interpretan el MISMO resultado de
 * forma opuesta, y meterlos juntos obligaría a que un `if` decidiera si algo es
 * un éxito o un fracaso.
 *
 * ── Lo que esto NO hace ─────────────────────────────────────────────────────
 *
 * No mueve dinero. No cobra, no devuelve y no decide si devolver: solo dice
 * qué pasó y si tocar el dinero es seguro. Quien lo mueve es quien lo reservó.
 *
 * Y no habla con ningún proveedor: eso es del Gateway, dos capas más abajo.
 */

export type MotivoDeEsperaDelMedio =
  /*
   * Salió hacia el proveedor y no se sabe cómo acabó DENTRO de esta invocación.
   * Es lo que produce una aceptación asíncrona: el trabajo queda esperando con
   * la referencia del proveedor puesta, y la reconciliación lo cerrará.
   */
  | 'outcome_unknown'
  /* Otro proceso lo tiene con la concesión viva. Ni se repite ni se toca el dinero. */
  | 'leased_elsewhere'
  /* Queda un reintento que esta invocación no puede esperar. */
  | 'retry_pending'
  /* Se acabó el margen de la invocación con algo todavía en vuelo. */
  | 'invocation_deadline';

export type DesenlaceDelMedio =
  /*
   * EN MARCHA. El desenlace bueno de un medio asíncrono.
   *
   * NO SE COBRA Y NO SE DEVUELVE. El dinero se queda reservado dentro del
   * trabajo —con su transacción y su petición—, y lo cierra la liquidación
   * cuando el trabajo llegue a su final. Tocarlo aquí sería decidir sobre una
   * tarea que sigue viva en casa de otro.
   */
  | { estado: 'en_marcha'; motivo: MotivoDeEsperaDelMedio; jobId?: string; runId?: string; estadoDelTrabajo?: string }
  /* Terminó DENTRO de esta invocación: un proveedor que contestó del tirón, o el modo demo. */
  | { estado: 'terminado'; respuesta: CanonicalResponse; usage?: GatewayUsage; sintetico: boolean; jobId?: string; runId?: string }
  /*
   * Terminal y mal. `reembolsoSeguro` es lo único que quien reservó necesita
   * para decidir, y se dice explícitamente en vez de deducirse de un código.
   */
  | { estado: 'fallado'; error: WeeError; reembolsoSeguro: boolean; jobId?: string; runId?: string };

export interface PasoDeMedioDeps {
  conductor: Conductor;
  /** QUIÉN, según la capa de identidad. Nunca lo que mande el cliente. */
  principal: Principal;
  trace: TraceContext;
  capability: CoreCapabilityId;
  /** La entrada ya normalizada por quien cotizó. La misma que se cotizó, o el precio y lo pedido dejarían de coincidir. */
  input: Readonly<Record<string, unknown>>;
  /** Para qué es, en una frase. Va al workflow, no al proveedor. */
  proposito: string;
  language?: LanguageContext;
  /** Lo que el servidor ya decidió: el modelo cotizado y de quién se admite. */
  ruteo?: PreferenciasDeRuteo;
  /** Lo que el libro anota y lo que la liquidación necesitará leer del trabajo guardado. */
  contabilidad?: GatewayMetadata;
  contexto?: { appId?: string; workspaceId?: string; operationId?: string };
  /** Cuándo muere la invocación que aloja al conductor. */
  deadlineAt?: number;
}

/** UN paso, y se llama siempre igual: dos ejecuciones de la misma petición retoman la misma. */
export const PASO_DE_MEDIO = 'crear';

const sinNada = (reason: string): WeeError => errorDelCore('INTERNAL_ERROR', 'runtime', { details: { reason } });

/** De los avisos del conductor al motivo de la espera. El orden importa: lo más concreto primero. */
const motivoDeEspera = (avisos: readonly AvisoDelConductor[]): MotivoDeEsperaDelMedio =>
  avisos.includes('outcome_unknown') ? 'outcome_unknown'
    : avisos.includes('leased_elsewhere') ? 'leased_elsewhere'
      : avisos.includes('retry_pending') ? 'retry_pending'
        : 'invocation_deadline';

/**
 * QUÉ PASÓ, LEÍDO COMO LO NECESITA QUIEN PAGÓ. Pura: no toca nada.
 */
export const interpretarMedio = (r: ResultadoDelConductor): DesenlaceDelMedio => {
  const paso = r.pasos.find((p) => p.stepId === PASO_DE_MEDIO);
  const donde = { ...(paso?.jobId ? { jobId: paso.jobId } : {}), ...(r.runId ? { runId: r.runId } : {}) };

  /* Ni siquiera se pudo empezar: nada salió, así que devolver es seguro. */
  if (r.estado === 'invalida') return { estado: 'fallado', error: r.error ?? sinNada('invalid_execution'), reembolsoSeguro: true, ...donde };

  if (r.estado === 'terminada') {
    if (r.cierre?.state === 'done') {
      if (paso?.respuesta) {
        return {
          estado: 'terminado',
          respuesta: paso.respuesta,
          ...(paso.usage ? { usage: paso.usage } : {}),
          sintetico: paso.sintetico === true,
          ...donde,
        };
      }
      /*
       * Cerró bien y la respuesta no está aquí: la ejecutó OTRA invocación. No
       * se devuelve nada —probablemente ya se cobró—, y tampoco es un fallo del
       * trabajo. Se trata como lo que es: no está en esta mano.
       */
      return { estado: 'fallado', error: sinNada('result_not_available_here'), reembolsoSeguro: false, ...donde };
    }
    /* Falló o se canceló, y es terminal: nadie va a completarlo. */
    return { estado: 'fallado', error: paso?.error ?? r.error ?? sinNada('step_failed'), reembolsoSeguro: true, ...donde };
  }

  /*
   * `en_curso`. Para un vídeo esto NO es un fallo: es lo normal. El trabajo
   * queda guardado con su reserva, y quien lo cierre será la liquidación —no
   * esta llamada, que ya se ha ido—.
   */
  return {
    estado: 'en_marcha',
    motivo: motivoDeEspera(r.avisos),
    ...donde,
    ...(paso?.estadoDelTrabajo ? { estadoDelTrabajo: paso.estadoDelTrabajo } : {}),
  };
};

/**
 * PEDIR UN MEDIO POR EL CONDUCTOR.
 *
 * Un workflow de UN paso, con el identificador derivado de la petición: dos
 * llamadas con el mismo `requestId` RETOMAN la misma ejecución en vez de crear
 * una segunda. Es lo que impide que un reintento del cliente se convierta en un
 * segundo vídeo pagado.
 */
export const pedirMedio = async (deps: PasoDeMedioDeps): Promise<DesenlaceDelMedio> => {
  const resultado = await deps.conductor.ejecutar({
    principal: deps.principal,
    trace: deps.trace,
    workflow: {
      id: `wf_${deps.trace.requestId}`,
      contract: WORKFLOW_CONTRACT_VERSION,
      goal: 'media.create',
      ...(deps.trace.workplace ? { workplace: deps.trace.workplace } : {}),
      ...(deps.language ? { language: deps.language } : {}),
      steps: [{
        id: PASO_DE_MEDIO,
        capability: deps.capability,
        purpose: deps.proposito,
        input: deps.input,
      }],
    },
    ...(deps.ruteo ? { ruteo: { [PASO_DE_MEDIO]: deps.ruteo } } : {}),
    ...(deps.contabilidad ? { contabilidad: { [PASO_DE_MEDIO]: deps.contabilidad } } : {}),
    ...(deps.contexto ? { contexto: deps.contexto } : {}),
    ...(deps.deadlineAt !== undefined ? { deadlineAt: deps.deadlineAt } : {}),
  });
  return interpretarMedio(resultado);
};
