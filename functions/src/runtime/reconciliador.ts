import { Job, JobStore } from '../core';
import { AtencionDeps, DesenlaceDeAtencion, atenderAviso } from './atencion';
import { PlazosDeCapacidad } from './plazos';
import { AccionDeReconciliacion, MotivoDeNoSaber, ResolutorDeEstadoDeProveedor, decidirReconciliacion } from './reconciliacion';

/**
 * WEË RUNTIME — EL QUE PREGUNTA CUANDO NADIE HA AVISADO.
 *
 * Hermano del barrendero, y con el mismo carácter: entra, mira lo que le dejan
 * mirar, y sale. No es un bucle, no tiene temporizadores por trabajo, no vive
 * dentro de Weë Brain y no sabe quién lo llama ni cada cuánto.
 *
 * ── Por qué van en este orden ───────────────────────────────────────────────
 *
 *     primero preguntar, después liquidar
 *
 * El barrendero cierra el dinero de lo que YA tiene desenlace, y no devuelve
 * nada de lo que no lo tiene —lo aparta para reconciliar—. Este es quien
 * consigue ese desenlace. Si corriera después, cada pasada del barrendero
 * miraría trabajos cuya respuesta estaba a una pregunta de distancia.
 *
 * ── Lo que NO hace, nunca ───────────────────────────────────────────────────
 *
 * No cierra trabajos por su cuenta: lo que consigue es un aviso, y el aviso lo
 * aplica el motor de siempre por el mismo camino que un webhook. No devuelve
 * Credits. No decide que algo falló porque el proveedor no conteste. Y no toca
 * un trabajo que alguien esté ejecutando ahora mismo.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA. No está programado y no se
 * despliega en este bloque.
 */

export interface ReconciliadorDeps extends AtencionDeps {
  /**
   * De dónde salen los candidatos. Es la MISMA consulta que ya usa la
   * recuperación del motor —no terminales, sin mover desde hace un rato—, a
   * propósito: un índice nuevo para esto sería un índice de más, y los
   * trabajos que no hay que preguntar los descarta `decidirReconciliacion`
   * mirando lo guardado, sin coste.
   */
  trabajos: AtencionDeps['trabajos'] & Pick<JobStore, 'recuperables'>;
  /** Quien sabe preguntarle a cada proveedor. Si no hay ninguno para uno, no se pregunta. */
  resolutores: Readonly<Record<string, ResolutorDeEstadoDeProveedor>>;
  /** Los relojes de la capacidad. De aquí sale hasta cuándo el proveedor recuerda. */
  plazos: Pick<PlazosDeCapacidad, 'horizonteDeReconciliacionMs'>;
  /** Cuánto tiene que llevar parado un trabajo para molestarse en preguntar. */
  quietoDesdeMs?: number;
  porPagina?: number;
  maxPaginas?: number;
  /**
   * CUÁNTAS PREGUNTAS COMO MUCHO EN UNA PASADA. Lo que impide que esto se coma
   * su propio plazo.
   *
   * Mirar trabajos es barato —se descartan leyendo lo guardado— pero PREGUNTAR
   * es una llamada por la red, en serie, con su propio tiempo límite. Sin tope,
   * una pasada con muchos trabajos esperando se quedaría a medias cuando la
   * tarea programada venciera, y lo que se hubiera hecho hasta ahí se
   * conservaría igual pero sin dejar dicho dónde se quedó.
   *
   * Con tope, la pasada TERMINA, dice que quedaron trabajos por preguntar, y la
   * siguiente sigue. No se pierde nada: un trabajo que no se preguntó hoy sigue
   * esperando exactamente igual, y esperar es seguro.
   */
  maxPreguntas?: number;
  observarPregunta?: (v: VistoAlReconciliar) => void;
}

export interface VistoAlReconciliar {
  jobId: string;
  accion: AccionDeReconciliacion['tipo'];
  motivo?: string;
  providerId?: string;
  operationId?: string;
  /** Qué contestó, o por qué no se pudo saber. */
  respuesta?: 'conocido' | MotivoDeNoSaber;
  desenlace?: DesenlaceDeAtencion['estado'];
}

export interface InformeDelReconciliador {
  mirados: number;
  /** Se les preguntó de verdad. Incluye a los que no contestaron: si no, un proveedor caído se vería como nada. */
  preguntados: number;
  /** Contestaron algo que movió el trabajo. */
  resueltos: number;
  /** Contestaron que sigue en marcha: se queda esperando, que es lo correcto. */
  enMarcha: number;
  /** No se pudo saber. NO son fallos del trabajo, y no cuestan un Credit. */
  sinRespuesta: number;
  /** Fuera de la ventana en la que el proveedor recuerda: se deja de preguntar, no se cierra. */
  rendidos: number;
  /** Terminó bien y no se pudo guardar el resultado: se vuelve a intentar. */
  aplazados: number;
  /** No había nada que preguntar. */
  omitidos: number;
  /** Se llegó al tope de preguntas: quedan trabajos por preguntar, y los coge la siguiente pasada. */
  agotadas: boolean;
  cursor?: string;
  vistos: readonly VistoAlReconciliar[];
}

const POR_PAGINA = 100;
const MAX_PAGINAS = 10;
/** Un trabajo que acaba de moverse no necesita que nadie pregunte por él. */
const QUIETO_DESDE_MS = 60_000;
/**
 * DOCE. Sale de una cuenta, no de una intuición: una consulta al proveedor tiene
 * treinta segundos de tiempo límite y la tarea programada tiene novecientos. Doce
 * preguntas que se agotaran TODAS son trescientos sesenta segundos, que deja
 * sitio de sobra para el resto de la pasada y para la liquidación que viene
 * detrás. Lo normal es que contesten en menos de un segundo y no se llegue.
 */
const MAX_PREGUNTAS = 12;

export const reconciliarTrabajos = async (deps: ReconciliadorDeps): Promise<InformeDelReconciliador> => {
  const porPagina = Math.max(1, Math.min(Math.floor(deps.porPagina ?? POR_PAGINA), 500));
  const maxPaginas = Math.max(1, Math.min(Math.floor(deps.maxPaginas ?? MAX_PAGINAS), 100));
  const quieto = Math.max(0, Math.floor(deps.quietoDesdeMs ?? QUIETO_DESDE_MS));
  const maxPreguntas = Math.max(1, Math.min(Math.floor(deps.maxPreguntas ?? MAX_PREGUNTAS), 100));
  const vistos: VistoAlReconciliar[] = [];
  let mirados = 0; let preguntados = 0; let resueltos = 0; let enMarcha = 0;
  let sinRespuesta = 0; let rendidos = 0; let aplazados = 0; let omitidos = 0;
  let agotadas = false;
  let cursor: string | undefined;

  for (let pagina = 0; pagina < maxPaginas && !agotadas; pagina++) {
    const ahora = deps.ahora();
    const { jobs, cursor: siguiente } = await deps.trabajos.recuperables({ before: ahora - quieto, limit: porPagina, ...(cursor ? { cursor } : {}) });
    for (const job of jobs) {
      /*
       * Se acabaron las preguntas de esta pasada. Se para ANTES de mirar, no
       * después: mirar y no preguntar contaría un trabajo como visto sin
       * haberle hecho nada, y la siguiente pasada tiene que verlo igual.
       */
      if (preguntados >= maxPreguntas) { agotadas = true; break; }
      mirados++;
      const visto = await reconciliarUno(deps, job);
      vistos.push(visto);
      if (visto.accion === 'rendirse') { rendidos++; continue; }
      if (visto.accion === 'nada') { omitidos++; continue; }
      /* Se preguntó: cuente lo que cuente la respuesta. Contar solo los que contestan escondería al proveedor caído. */
      preguntados++;
      if (visto.respuesta !== 'conocido') sinRespuesta++;
      else if (visto.desenlace === 'aplicado') resueltos++;
      else if (visto.desenlace === 'aplazado') aplazados++;
      else enMarcha++;
    }
    cursor = siguiente;
    if (!cursor) break;
  }

  return { mirados, preguntados, resueltos, enMarcha, sinRespuesta, rendidos, aplazados, omitidos, agotadas, ...(cursor ? { cursor } : {}), vistos };
};

/** Un trabajo, de principio a fin. Aparte para que se lea, y para poder probarlo solo. */
export const reconciliarUno = async (deps: ReconciliadorDeps, job: Job): Promise<VistoAlReconciliar> => {
  const accion = decidirReconciliacion(job, deps.ahora(), deps.plazos);
  const anotar = (v: VistoAlReconciliar): VistoAlReconciliar => { deps.observarPregunta?.(v); return v; };

  if (accion.tipo !== 'preguntar') {
    return anotar({ jobId: job.jobId, accion: accion.tipo, motivo: accion.motivo });
  }

  const resolutor = deps.resolutores[accion.operacion.providerId];
  /* Sin nadie que sepa hablar con ese proveedor no se pregunta, y eso NO es un fallo del trabajo. */
  if (!resolutor) {
    return anotar({ jobId: job.jobId, accion: 'preguntar', ...accion.operacion, respuesta: 'no_configurado' });
  }

  const estado = await resolutor.consultar(accion.operacion);
  if (!estado.conocido) {
    /*
     * NO SE SUPO. El trabajo se queda EXACTAMENTE como estaba: esperando. Ni se
     * cierra, ni se marca, ni se devuelve nada. Se volverá a preguntar mientras
     * el proveedor recuerde.
     */
    return anotar({ jobId: job.jobId, accion: 'preguntar', ...accion.operacion, respuesta: estado.motivo });
  }

  /* Contestó. A partir de aquí es el mismo camino que un webhook, y por eso no pueden discrepar. */
  const desenlace = await atenderAviso(deps, estado.aviso);
  return anotar({ jobId: job.jobId, accion: 'preguntar', ...accion.operacion, respuesta: 'conocido', desenlace: desenlace.estado });
};
