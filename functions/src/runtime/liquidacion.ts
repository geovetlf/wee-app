import { Job, JobAttempt, esTrabajoTerminal } from '../core';

/**
 * WEË RUNTIME — QUÉ HAY QUE HACER CON EL DINERO DE UN TRABAJO.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * Hoy la liquidación de una operación vive en el `try/catch` de la llamada que
 * la empezó (`creator/brain.ts`). Para un texto que se contesta en dos segundos
 * eso basta y está probado en producción. Para un vídeo de veinte minutos no:
 * la llamada devuelve mucho antes de que el proveedor termine, y si el proceso
 * que la atendía desaparece, no queda NADIE que cobre o devuelva lo reservado.
 * Los Credits se quedan retenidos para siempre, y la persona no lo sabe.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * El trabajo guardado tiene que bastar. Esto es la función que lo lee y dice
 * qué toca hacer, sin preguntarle nada a nadie: sin reloj propio, sin red, sin
 * memoria y sin saber quién la llama. Que la respuesta dependa SOLO de lo que
 * está escrito es lo que permite que la tome otro proceso, media hora después,
 * y le salga lo mismo.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es un segundo sistema de liquidación. No mueve dinero, no conoce el
 * Credit Engine, no sabe de saldos ni de precios y no decide cuánto vale nada:
 * el importe ya venía decidido desde que se cotizó, y viaja en el trabajo. Solo
 * contesta la pregunta que hoy no se hace nadie cuando el proceso se muere.
 *
 * ── Las dos cosas que nunca hace ────────────────────────────────────────────
 *
 *   1. NO devuelve el dinero de un trabajo que sigue vivo. Da igual cuánto
 *      tiempo lleve: mientras la evidencia guardada diga que hay alguien
 *      ejecutándolo —una concesión viva—, reembolsar sería quitarle la reserva
 *      a quien está trabajando, y su cobro posterior no encontraría nada que
 *      cobrar. Es el mismo fallo que ya se corrigió en pequeño para las
 *      invocaciones duplicadas.
 *   2. NO devuelve el dinero de un desenlace DESCONOCIDO. «Salió hacia el
 *      proveedor y no se sabe cómo acabó» no es «no pasó nada»: puede haber un
 *      vídeo hecho y cobrado del otro lado. Eso se RECONCILIA —lo resuelve el
 *      aviso del proveedor o una persona—, no se adivina.
 *
 * Que la llamada que lo empezó ya no exista NO es evidencia de nada. Que se
 * haya pasado un plazo, tampoco por sí solo: un plazo solo cuenta cuando el
 * motor de trabajos ya lo ha convertido en un estado final, que es cuando hay
 * constancia de que el intento no sigue vivo.
 *
 * La usa el barrido DESPLEGADO (\`barridoDeLiquidacion\`, cada 5 min) para cerrar lo que tiene desenlace; los trabajos
 * que la llegan a usar solo los crea el conductor, que sigue detrás de \`aiSettings/runtime\`, cerrada.
 */

/** Dónde vive, dentro del trabajo, lo que hace falta para liquidarlo. */
export const CLAVE_DE_TRANSACCION = 'creditTransactionId';
export const CLAVE_DE_PETICION_DE_CREDITS = 'creditRequestId';
export const CLAVE_DE_CREDITS = 'creditsEstimated';
export const CLAVE_DE_SERVICIO = 'service';
/**
 * EL HUECO DEL CUPO DIARIO que ocupa la operación, si lo ocupa (hoy, solo el mundo 3D): cómo la nombró el limitador y el
 * día en que la contó. Viajan con el trabajo para que, si el dinero se DEVUELVE, vuelva lo que esa operación ocupó
 * (el limitador lo tiene anotado) y a ESE día, no al de quien liquida.
 */
export const CLAVE_DE_LA_OPERACION_DEL_CUPO = 'quotaOperation';
export const CLAVE_DEL_DIA_DEL_CUPO = 'quotaDay';
/**
 * SI LA TARIFA COTIZADA ES EL COSTE (un modelo que cobra por petición, `tarifaExacta` de engine/pricing.ts). Lo decide
 * quien cotiza, con el modelo que eligió el Router, y viaja con el trabajo: al cerrar el coste de lo que el proveedor
 * aceptó (RUNTIME §25c) no se vuelve a preguntar a la configuración del momento. Sin la marca, es una estimación.
 */
export const CLAVE_DE_TARIFA_EXACTA = 'estimatedUsdExact';

export type MotivoDeEspera =
  /* Alguien lo está ejecutando ahora mismo: la concesión está viva. */
  | 'en_marcha'
  /*
   * EL PROVEEDOR LA ACEPTÓ y sigue con ella. Salió, no se sabe cómo acabará
   * todavía, pero NO es incertidumbre: hay un acuse con el nombre que el
   * proveedor le da, y por eso hay a quién preguntarle. Se espera.
   */
  | 'aceptada_por_el_proveedor'
  /* Nadie lo tiene, pero el motor de trabajos todavía puede moverlo. No es asunto del dinero. */
  | 'recuperable';

export type MotivoDeReembolso =
  /* Nunca salió hacia el proveedor: no hay nada que pagar. */
  | 'no_salio'
  /* Salió, y se sabe que acabó mal. */
  | 'fallo_definitivo';

export type AccionDeLiquidacion =
  /* No hay reserva que cerrar: este trabajo no cobró nada por adelantado. */
  | { tipo: 'nada'; motivo: 'sin_reserva' }
  | { tipo: 'esperar'; motivo: MotivoDeEspera }
  /* Terminó bien: se cobra lo que se cotizó, ni un Credit más. */
  | { tipo: 'liquidar'; importe: number }
  | { tipo: 'reembolsar'; motivo: MotivoDeReembolso }
  /* Salió y no se sabe cómo acabó. Ni se cobra ni se devuelve: hace falta saber. */
  | { tipo: 'reconciliar'; motivo: 'desenlace_desconocido' };

/** Lo que el trabajo guarda sobre su dinero. Sin esto, no hay nada que liquidar. */
export interface ReservaDelTrabajo {
  /** La misma con la que se reservó. El Credit Engine deriva de ella el identificador de la transacción. */
  requestId: string;
  /** El identificador de la transacción, que es lo que ata la fila del libro con la reserva. */
  transactionId: string;
  /** Lo que se cotizó. Cero es un número legítimo: hay respuestas que no cobran. */
  importe: number;
  service?: string;
  /** El hueco del cupo del día que ocupa, si ocupa uno: su operación en el limitador y su día. Si la reserva se devuelve, vuelve con ella. */
  cupo?: { operacion: string; dia: string };
  /** La tarifa cotizada ES el coste (lo decidió quien cotizó). Ausente: el coste de lo que salga es una estimación. */
  tarifaExacta?: true;
}

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.length ? v : undefined);
const entero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined);

/**
 * LA RESERVA, LEÍDA DEL TRABAJO GUARDADO. Estricta: sin la petición con la que
 * se reservó no se puede liquidar nada, y adivinarla a partir del identificador
 * de la transacción sería fiarse de cómo se escribe un nombre.
 */
export const reservaDe = (job: Job): ReservaDelTrabajo | undefined => {
  const meta = job.metadata ?? {};
  const requestId = texto(meta[CLAVE_DE_PETICION_DE_CREDITS]);
  const transactionId = texto(meta[CLAVE_DE_TRANSACCION]);
  if (!requestId || !transactionId) return undefined;
  const operacion = texto(meta[CLAVE_DE_LA_OPERACION_DEL_CUPO]);
  const dia = texto(meta[CLAVE_DEL_DIA_DEL_CUPO]);
  return {
    requestId,
    transactionId,
    importe: entero(meta[CLAVE_DE_CREDITS]) ?? 0,
    ...(texto(meta[CLAVE_DE_SERVICIO]) ? { service: texto(meta[CLAVE_DE_SERVICIO]) as string } : {}),
    ...(operacion && dia ? { cupo: { operacion, dia } } : {}),
    ...(meta[CLAVE_DE_TARIFA_EXACTA] === true ? { tarifaExacta: true as const } : {}),
  };
};

const ultimoIntento = (job: Job): JobAttempt | undefined => job.attempts[job.attempts.length - 1];
const concesionViva = (job: Job, at: number): boolean => {
  const lease = ultimoIntento(job)?.lease;
  return !!lease && lease.until > at;
};
/**
 * ── ACEPTADA Y «NO SE SABE» SON DOS COSAS ───────────────────────────────────
 *
 * Las dos dejan el intento con el desenlace sin conocer, porque el vocabulario
 * del Job Engine no tiene un desenlace «aceptado» —y no se le inventa uno—. Lo
 * que las separa está escrito igual de durable: la REFERENCIA DEL PROVEEDOR.
 *
 *   con referencia   el proveedor acusó recibo y le puso nombre a la tarea.
 *                    Hay a quién preguntarle. Es una operación EN CURSO.
 *   sin referencia   salió y no volvió nadie. No hay a quién preguntar.
 *                    Eso sí es incertidumbre, y eso es lo que se reconcilia.
 *
 * Confundirlas llenaría la cola de reconciliación de vídeos perfectamente sanos.
 */
const aceptadaYEnMarcha = (a: JobAttempt): boolean => a.dispatched === true && a.outcome === 'unknown' && !!a.providerRef;
const sinSaberYSinPistas = (a: JobAttempt): boolean => a.dispatched === true && a.outcome === 'unknown' && !a.providerRef;

/** ¿Hay algún intento que salió y del que no se sabe nada, ni siquiera cómo lo llama el proveedor? */
const saliaYNoSeSabe = (job: Job): boolean => job.attempts.some(sinSaberYSinPistas);
/** ¿Hay alguno que el proveedor aceptó y sigue en marcha? */
const aceptadaPorElProveedor = (job: Job): boolean => job.attempts.some(aceptadaYEnMarcha);
/** ¿Salió alguna vez hacia el proveedor? */
const saliaAlguna = (job: Job): boolean => job.attempts.some((a) => a.dispatched === true);

/**
 * QUÉ TOCA HACER CON EL DINERO DE ESTE TRABAJO.
 *
 * `at` es el ahora de quien pregunta, y sirve para UNA sola cosa: saber si la
 * concesión del último intento sigue viva. No se usa para decidir que algo
 * «lleva demasiado tiempo»: eso lo decide el motor de trabajos con sus plazos,
 * y aquí solo se lee el estado al que ya llegó.
 */
export const decidirLiquidacion = (job: Job, at: number): AccionDeLiquidacion => {
  if (!reservaDe(job)) return { tipo: 'nada', motivo: 'sin_reserva' };

  if (!esTrabajoTerminal(job.state)) {
    /* Alguien lo tiene ahora mismo. No se toca su dinero, cueste lo que cueste esperar. */
    if (concesionViva(job, at)) return { tipo: 'esperar', motivo: 'en_marcha' };
    /* El proveedor la aceptó y sigue con ella. Esperar no es no saber: es saber que falta. */
    if (aceptadaPorElProveedor(job)) return { tipo: 'esperar', motivo: 'aceptada_por_el_proveedor' };
    /*
     * `waiting` con un intento que salió y del que no volvió nadie: esto es lo
     * que un barrendero ingenuo reembolsaría. Puede haber un resultado hecho y
     * cobrado del otro lado, y aquí ni siquiera hay a quién preguntarle.
     */
    if (saliaYNoSeSabe(job)) return { tipo: 'reconciliar', motivo: 'desenlace_desconocido' };
    /* Sin dueño y sin incertidumbre: el motor de trabajos todavía puede moverlo. El dinero no opina. */
    return { tipo: 'esperar', motivo: 'recuperable' };
  }

  if (job.state === 'completed') return { tipo: 'liquidar', importe: reservaDe(job)!.importe };

  /*
   * Terminal y no completado —`failed`, `timed_out`, `cancelled`—. Aquí sí se
   * puede devolver, pero solo si consta que no quedó nada al otro lado. Una
   * tarea que el proveedor aceptó y que murió por plazo TAMPOCO se devuelve
   * sola: se le pregunta a él, que para eso quedó anotado cómo la llama.
   */
  if (saliaYNoSeSabe(job) || aceptadaPorElProveedor(job)) return { tipo: 'reconciliar', motivo: 'desenlace_desconocido' };
  return { tipo: 'reembolsar', motivo: saliaAlguna(job) ? 'fallo_definitivo' : 'no_salio' };
};

/* ── El coste de lo que el proveedor aceptó ────────────────────────────────── */

/**
 * CÓMO ACABÓ CADA INTENTO QUE EL PROVEEDOR ACEPTÓ, leído del trabajo guardado (RUNTIME §22.5). Pura.
 *
 * La fila del libro de un intento aceptado no se cierra al aceptarse —el proveedor solo dijo «lo tengo»—: queda en
 * curso con el nombre de su tarea. Quien liquida la cierra con esto —después del dinero y ANTES de liquidar la fila—, y por eso el coste de
 * un trabajo largo llega al libro y al uso del día una vez y en el mismo sitio que su cobro o su devolución.
 *
 * Solo los intentos que SALIERON con el nombre que les dio el proveedor y cuyo final ya se sabe. Uno sin saberse
 * (`unknown`) no está: su fila sigue en curso, que es lo que es —eso se reconcilia, no se adivina—. Aquí no hay
 * dinero: el coste lo pone el libro con la tarifa de su fila, y cuánto se sabe de él, la composición.
 */
export interface DesenlaceDeUnaAceptada {
  /** Como llama el proveedor a la tarea: lo mismo que guardó la fila del libro (`providerTaskId`). */
  operationId: string;
  desenlace: 'salio' | 'fallo' | 'cancelada';
  /** Desde que salió hacia el proveedor hasta que se supo cómo acabó. */
  durationMs: number;
  /** El código del error, nunca su mensaje. */
  error?: string;
  /** Lo que el proveedor dijo haber consumido, si dijo un número. */
  usage?: Readonly<Record<string, number>>;
}

const usoNumerico = (uso: unknown): Readonly<Record<string, number>> | undefined => {
  if (!uso || typeof uso !== 'object') return undefined;
  const numeros = Object.entries(uso as Record<string, unknown>).filter((par): par is [string, number] => typeof par[1] === 'number' && Number.isFinite(par[1]));
  return numeros.length ? Object.freeze(Object.fromEntries(numeros)) : undefined;
};

export const desenlacesDeLasAceptadas = (job: Job): readonly DesenlaceDeUnaAceptada[] => {
  const ultimo = ultimoIntento(job);
  /* Una parada que se consuma con el «falló» del proveedor sigue siendo una cancelación: la pidió alguien. */
  const cancelada = (a: JobAttempt): boolean => a.outcome === 'cancelled' || (a === ultimo && job.state === 'cancelled');
  return Object.freeze(job.attempts
    .filter((a) => a.dispatched === true && !!a.providerRef?.operationId && a.outcome !== undefined && a.outcome !== 'unknown')
    .map((a): DesenlaceDeUnaAceptada => {
      const uso = usoNumerico(a.usage);
      return Object.freeze({
        operationId: (a.providerRef as { operationId: string }).operationId,
        desenlace: a.outcome === 'succeeded' ? 'salio' : cancelada(a) ? 'cancelada' : 'fallo',
        durationMs: Math.max(0, (a.endedAt ?? job.updatedAt) - a.startedAt),
        ...(a.error?.code ? { error: a.error.code } : {}),
        ...(uso ? { usage: uso } : {}),
      });
    }));
};

/* ── El puerto que mueve el dinero ─────────────────────────────────────────── */

/**
 * CÓMO QUEDÓ, no quién lo hizo.
 *
 * `liquidada` significa «la reserva está cerrada y cobrada», no «la cobré yo».
 * La diferencia importa y no se puede fingir: `completeCredits` contesta
 * `COMPLETED` tanto si acaba de cobrar como si ya estaba cobrada, así que desde
 * fuera no hay forma de distinguirlo — y decir lo contrario sería inventar un
 * dato. El reembolso sí lo distingue, porque el motor devuelve `duplicate`.
 *
 * Que no se distinga no afecta a lo que importa: quien cobra de verdad es el
 * Credit Engine, y cobra UNA vez. Solo afecta a cuánto puede presumir el
 * barrendero en su informe, y por eso su informe no presume.
 */
export type DesenlaceDeLiquidacion =
  /* Queda cobrada. Puede haberla cobrado esta llamada o una anterior. */
  | 'liquidada'
  /* Queda devuelta, y la devolvió esta llamada. */
  | 'reembolsada'
  /* El motor dijo explícitamente que no había nada que hacer. */
  | 'ya_estaba'
  /* No se pudo, y se sabrá por qué. Se reintentará: nada se dio por hecho. */
  | 'fallo';

export interface ResultadoDeLiquidacion {
  desenlace: DesenlaceDeLiquidacion;
  /** Lo que el Credit Engine dice que es ahora la transacción. Para poder auditarlo. */
  estado?: string;
  error?: string;
}

/**
 * QUIEN SÍ MUEVE EL DINERO. Lo implementa la composición sobre el Credit Engine
 * que ya existe: `completeCredits` y `refundCredits`, las mismas dos llamadas
 * que hace hoy `creator/brain.ts`. No hay un segundo libro ni un segundo motor
 * financiero, y este puerto no puede inventar importes: el que liquida es el
 * que venía en el trabajo.
 *
 * `job` es el trabajo guardado tal como lo leyó quien liquida: de él salen los desenlaces de lo que el proveedor
 * aceptó (`desenlacesDeLasAceptadas`), para cerrar su coste en el libro DESPUÉS del dinero y ANTES de liquidar la fila
 * (`settle` sella la transacción: una fila en curso que llegue tarde ya no recibiría sus Credits). OBLIGATORIO: sin él
 * no habría con qué cerrar lo aceptado, y el orden no dependería solo de quien compone.
 */
export interface PuertoDeLiquidacion {
  liquidar(orden: { userId: string; reserva: ReservaDelTrabajo; importe: number; jobId: string; job: Job }): Promise<ResultadoDeLiquidacion>;
  reembolsar(orden: { userId: string; reserva: ReservaDelTrabajo; motivo: MotivoDeReembolso; jobId: string; job: Job }): Promise<ResultadoDeLiquidacion>;
}
