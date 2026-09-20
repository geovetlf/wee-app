import {
  CoreCapabilityId,
  GatewayMetadata,
  Principal,
  ThoughtRequest,
  ThoughtResult,
  Thinker,
  WORKFLOW_CONTRACT_VERSION,
  WeeError,
  errorDelCore,
} from '../core';
import { AvisoDelConductor, Conductor, ResultadoDelConductor } from './conductor';
import { CLAVE_DE_REFERENCIA, ReferenciaDeContexto } from './contexto';
import { PreferenciasDeRuteo } from './resolucion';

/**
 * WEË RUNTIME — EL PENSADOR DE WEË BRAIN, SOBRE EL CONDUCTOR.
 *
 * Weë Brain llega a un modelo por un solo puerto: `Thinker`. Hoy lo implementa
 * `creator/brain.ts` en línea, llamando al motor de siempre. Esto es la otra
 * implementación —la que pasa por el conductor—, para que el día del canary
 * cambiar de camino sea cambiar de pensador y NADA más: ni Brain, ni la
 * cotización, ni la contabilidad se enteran.
 *
 * ── Un mensaje es un workflow de un paso ────────────────────────────────────
 *
 * Y su entrada es una REFERENCIA (`contexto.ts`), no el mensaje: el trabajo que
 * queda guardado dice qué conversación y qué mensaje, y nada de lo que se
 * escribió en ella.
 *
 * ── La pregunta que de verdad importa: ¿se puede reembolsar? ────────────────
 *
 * `creator/brain.ts` reembolsa en su `catch`: si el pensador lanza, devuelve lo
 * reservado. Con el motor de siempre eso es correcto, porque un error significa
 * que ESTA invocación —la única que existe— no consiguió nada.
 *
 * Con trabajos ya no basta. Dos invocaciones del mismo mensaje comparten UN
 * trabajo: mientras una ejecuta, la otra puede llegar, encontrarlo «en marcha»,
 * no tener nada que devolver… y lanzar. Si su `catch` reembolsa, deshace la
 * reserva de la que SÍ está ejecutando, cuyo `completeCredits` no hará nada
 * después sobre una transacción ya reembolsada: respuesta entregada, nada
 * cobrado, ningún error. Es el mismo fallo que impide hoy migrar lo asíncrono,
 * en pequeño.
 *
 * Por eso este pensador NO lanza un error cualquiera. Lanza uno que dice, sin
 * ambigüedad, si reembolsar es SEGURO:
 *
 *   reembolsoSeguro: true    el trabajo terminó mal, o nunca llegó a existir.
 *                            Ninguna invocación va a completar nada: reembolsar
 *                            no puede chocar con un cobro.
 *   reembolsoSeguro: false   salió y no se sabe cómo acabó, lo tiene otro
 *                            proceso, o ya terminó bien en otra invocación. Un
 *                            reembolso aquí podría deshacer un cobro legítimo.
 *                            La reserva se queda como está — igual que hoy
 *                            cuando el proceso muere — y quien llamó recibe
 *                            «sigue en curso», no «falló».
 *
 * La regla con la que se enchufe al callable es una línea: reembolsar solo si
 * `reembolsoSeguro`. Aquí se decide y se prueba; enchufarlo es del canary.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

export type MotivoDelPensador =
  /* El trabajo terminó mal, o no llegó a crearse. */
  | 'failed'
  /* Salió hacia el proveedor y no se sabe cómo acabó. */
  | 'outcome_unknown'
  /* Otro proceso lo está ejecutando, o queda un reintento que esta invocación no puede esperar. */
  | 'in_progress_elsewhere'
  /* Terminó bien, pero en OTRA invocación: lo que contestó el proveedor no se guarda, así que aquí no está. */
  | 'completed_elsewhere';

export class FalloDelPensador extends Error {
  constructor(
    readonly motivo: MotivoDelPensador,
    /** ¿Puede quien llama reembolsar sin arriesgarse a deshacer un cobro? */
    readonly reembolsoSeguro: boolean,
    /** El error del Core, ya normalizado. Sin mensaje crudo de ningún proveedor. */
    readonly weeError: WeeError,
    readonly avisos: readonly AvisoDelConductor[] = [],
  ) {
    super(`Weë Brain no pudo pensar: ${motivo}`);
    this.name = 'FalloDelPensador';
  }
}

export interface PensadorSobreConductorDeps {
  conductor: Conductor;
  /** QUIÉN, según la capa de identidad. */
  principal: Principal;
  /** Dónde está el contexto. Lo que viaja en el trabajo es esto, no el mensaje. */
  referencia: ReferenciaDeContexto;
  locale?: string;
  /** Lo que el servidor ya tiene decidido: el modelo que se cotizó. */
  ruteo?: PreferenciasDeRuteo;
  /** Lo que el libro tiene que anotar: servicio, transacción de Credits y lo que vale. */
  contabilidad?: GatewayMetadata;
  contexto?: { appId?: string; workspaceId?: string; operationId?: string };
  /** Cuándo muere el callable que lo aloja. */
  deadlineAt?: number;
}

const PASO = 'pensar';

const sinNada = (reason: string): WeeError => errorDelCore('INTERNAL_ERROR', 'runtime', { details: { reason } });

/** Lee el resultado del conductor como lo que es para la contabilidad: o hay respuesta, o se sabe si reembolsar es seguro. */
const interpretar = (r: ResultadoDelConductor): ThoughtResult => {
  const paso = r.pasos.find((p) => p.stepId === PASO);

  if (r.estado === 'invalida') throw new FalloDelPensador('failed', true, r.error ?? sinNada('invalid_execution'), r.avisos);

  if (r.estado === 'terminada') {
    if (r.cierre?.state === 'done') {
      if (paso?.respuesta) {
        return {
          response: paso.respuesta,
          ...(paso.usage ? { usage: paso.usage } : {}),
          /* De muestra solo si quien lo sirvió es INTERNO, y eso lo dice el registro. El Router no lo da por elegible salvo que su política lo permita. */
          synthetic: paso.sintetico === true,
        };
      }
      /* Hecho, y no por mí: la respuesta se la llevó la invocación que lo ejecutó. NO se reembolsa: probablemente ya se cobró. */
      throw new FalloDelPensador('completed_elsewhere', false, sinNada('result_not_available_here'), r.avisos);
    }
    /* Falló o se canceló: es terminal. Nadie va a completar nada. */
    throw new FalloDelPensador('failed', true, paso?.error ?? r.error ?? sinNada('step_failed'), r.avisos);
  }

  /* `en_curso`: lo único seguro es NO tocar el dinero. */
  const desconocido = r.avisos.includes('outcome_unknown');
  throw new FalloDelPensador(desconocido ? 'outcome_unknown' : 'in_progress_elsewhere', false,
    errorDelCore(desconocido ? 'PROVIDER_ERROR' : 'DUPLICATE_REQUEST', 'runtime', { details: { reason: desconocido ? 'outcome_unknown' : 'in_progress' } }), r.avisos);
};

export const pensadorSobreConductor = (deps: PensadorSobreConductorDeps): Thinker => ({
  async pensar(request: ThoughtRequest): Promise<ThoughtResult> {
    const capability: CoreCapabilityId = request.capability;
    const resultado = await deps.conductor.ejecutar({
      principal: deps.principal,
      trace: request.trace,
      workflow: {
        /* El mismo mensaje, la misma ejecución: así una petición repetida RETOMA en vez de repetir. */
        id: `wf_${request.trace.requestId}`,
        contract: WORKFLOW_CONTRACT_VERSION,
        goal: 'brain.reply',
        ...(request.trace.workplace ? { workplace: request.trace.workplace } : {}),
        ...(request.language ? { language: request.language } : {}),
        ...(request.hints ? { hints: request.hints } : {}),
        steps: [{
          id: PASO,
          capability,
          purpose: 'Contestar a la persona',
          /* UNA REFERENCIA. Ni el mensaje, ni el historial, ni un adjunto: eso ya vive en la conversación. */
          input: { [CLAVE_DE_REFERENCIA]: deps.referencia, ...(deps.locale ? { locale: deps.locale } : {}) },
        }],
      },
      ...(deps.ruteo ? { ruteo: { [PASO]: deps.ruteo } } : {}),
      ...(deps.contabilidad ? { contabilidad: { [PASO]: deps.contabilidad } } : {}),
      ...(deps.contexto ? { contexto: deps.contexto } : {}),
      ...(deps.deadlineAt !== undefined ? { deadlineAt: deps.deadlineAt } : {}),
    });
    return interpretar(resultado);
  },
});
