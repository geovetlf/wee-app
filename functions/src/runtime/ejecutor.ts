import {
  AttemptReport,
  Gateway,
  GatewayResult,
  JobDispatch,
  JobExecutor,
  ProviderOperationRef,
  errorDelCore,
} from '../core';
import { informeDelGateway, peticionDeGateway } from '../job';
import { PuertoDeMaterializacion, materialDeTexto } from './materializacion';
import { CLAVE_DE_REFERENCIA, ResolutorDeContexto } from './contexto';

/**
 * WEË RUNTIME — QUIEN EJECUTA UN INTENTO.
 *
 * El trabajador (`job/worker.ts`) tiene un solo puerto que toca el mundo:
 * `JobExecutor`. Esto es su implementación para una operación de IA, y lo único
 * que hace es bajar el paquete del trabajo al Gateway y devolver cómo acabó:
 *
 *   JobDispatch → peticionDeGateway() → Gateway.ejecutar() → informeDelGateway() → AttemptReport
 *
 * Las dos conversiones ya existían en la composición del Job Engine
 * (`job/index.ts`) desde la Fase 8, esperando a alguien que las usara. No se
 * reescriben aquí: se usan.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * NO ELIGE. El paquete ya trae `implementation`: la puso el Router ANTES de que
 * el trabajo existiera, y el Job Engine lo dice sin ambigüedad —«La que eligió
 * el Router. Aquí no se vuelve a elegir»—. Hay dos motivos, y los dos son de
 * dinero: la huella de idempotencia del trabajo incluye la implementación, y el
 * precio que vio la persona es el de ESE modelo. Un ejecutor que volviera a
 * elegir podría ejecutar algo distinto de lo que se cotizó.
 *
 * No reintenta: los intentos son del Job Engine. No hace respaldo a otro
 * proveedor. No cobra, no reserva y no reembolsa.
 *
 * ── El libro ────────────────────────────────────────────────────────────────
 *
 * La documentación del Core preveía escribir `aiGenerations` inyectando el
 * libro como `Tracer` del Gateway. No cabe: `OperationTrace` no lleva el uso, y
 * el Gateway anota siempre `attempt: 1` (`core/gateway.ts`). Quien SÍ tiene el
 * resultado entero y el número de intento de verdad es este ejecutor, así que
 * el libro entra por un puerto suyo. No se toca ningún contrato cerrado.
 *
 * ── El contexto viaja por referencia ────────────────────────────────────────
 *
 * Un trabajo no guarda una conversación: guarda DÓNDE está (`contexto.ts`). Si la
 * entrada trae una referencia, se resuelve AQUÍ, contra la fuente de verdad y
 * con el dueño del trabajo LEÍDO DEL ALMACÉN —el paquete no lo lleva, y la traza
 * es un dato que viajó, no una prueba de quién es nadie—. Se resuelve antes de
 * abrir el libro y antes de salir: si la referencia no es de la cuenta, no se
 * anota ni se paga nada. Lo resuelto no se guarda en ningún sitio.
 *
 * ── Sigo vivo ───────────────────────────────────────────────────────────────
 *
 * Una concesión dura un minuto y un texto puede tardar noventa segundos. Sin
 * renovar, la recuperación le quitaría el trabajo a un ejecutor que sigue
 * trabajando y saldría dos veces hacia el proveedor. Mientras espera al
 * Gateway, renueva.
 */

/** Dónde queda anotado lo que costó un intento. Lo implementa la composición sobre el libro que ya existe. */
export interface LibroDeIntentos {
  /** Antes de salir. Devuelve la fila, o `undefined` si este libro no abre filas. */
  abrir(dispatch: JobDispatch): Promise<string | undefined>;
  /** Al volver, con el resultado entero: uso, coste medido, modelo real y error. */
  cerrar(fila: string, cierre: { dispatch: JobDispatch; resultado: GatewayResult; durationMs: number }): Promise<void>;
}

export interface EjecutorDeps {
  gateway: Gateway;
  libro?: LibroDeIntentos;
  /** Quien convierte una referencia de contexto en la entrada de verdad. Sin él, un trabajo con referencia NO se ejecuta. */
  contexto?: ResolutorDeContexto;
  /** De quién es un trabajo, según el ALMACÉN. Hace falta para resolver contexto: la cuenta no se saca de la traza. */
  duenoDelTrabajo?: (jobId: string) => Promise<string | undefined>;
  ahora: () => number;
  /** Cada cuánto se dice «sigo vivo». Tiene que ser bastante menos que lo que dura una concesión. */
  latidoMs?: number;
  /** Cómo se repite algo cada cierto tiempo. Entra por la puerta para que una prueba no dependa del reloj. */
  repetir?: (ms: number, tarea: () => void) => () => void;
  /**
   * Cómo llama el PROVEEDOR a esta operación, cuando alguien lo sabe. Cada uno
   * guarda su identificador donde quiere; adivinarlo aquí metería un proveedor
   * concreto en el camino común. Sin él se usa el que trae el propio resultado,
   * que es el que el Gateway devuelve al aceptar una tarea.
   */
  referenciaDeProveedor?: (resultado: GatewayResult) => ProviderOperationRef | undefined;
  /**
   * QUIEN GUARDA UN RESULTADO DE TEXTO COMO MATERIAL. Opcional a propósito.
   *
   * Es el MISMO puerto que ya guarda un vídeo cuando un proveedor avisa de que
   * terminó; lo único que cambia es que un texto llega entero en la respuesta y
   * no por un enlace que caduca.
   *
   * Sin él, un resultado de texto se comporta exactamente como antes: sale sin
   * referencia y el paso siguiente no recibe nada. Eso NO es un descuido — es
   * lo que había, y así una composición que no lo enchufe no cambia de
   * comportamiento por haberse añadido esto.
   */
  material?: PuertoDeMaterializacion;
  /**
   * SE LE PIDIÓ AL PROVEEDOR QUE ACEPTE Y SUELTE. Cerrado por defecto, y es la
   * misma bandera que lleva el Gateway.
   *
   * Entonces lo único que sale hacia él es el POST que crea la tarea, y un POST
   * que se queda SIN respuesta —el plazo que vence con la petición en vuelo, la
   * conexión que se corta— no dice si la tarea existe. Con esto encendido ese
   * intento se informa como lo que es: desenlace DESCONOCIDO, sin referencia.
   * Ni se devuelve el dinero ni se repite el POST: el Job Engine lo deja
   * esperando y la liquidación lo aparta para reconciliar. Una respuesta del
   * proveedor —un 4xx, un 429, un 5xx— sigue siendo un fallo: él contestó.
   */
  aceptaAsincrono?: boolean;
}

/**
 * ¿SALIÓ EL POST Y NO VOLVIÓ NADA?
 *
 * Solo un fallo del ADAPTADOR, sin respuesta HTTP —no hay código del proveedor—
 * y que el propio adaptador dio por reintentable: el plazo que vence con la
 * petición en vuelo, o la conexión que se corta. Un error antes de salir (una
 * entrada que no vale) llega como no reintentable, y una respuesta del
 * proveedor trae su código: ninguno de los dos es un desenlace desconocido.
 */
const sinRespuestaDelProveedor = (resultado: GatewayResult): boolean => {
  const error = resultado.status === 'failed' ? resultado.error : undefined;
  if (!error || !String(error.source ?? '').startsWith('adapter:') || error.providerCode !== undefined) return false;
  if (error.code === 'TIMEOUT') return true;
  return error.code === 'PROVIDER_ERROR' && (error.details as Record<string, unknown> | undefined)?.providerRetryable === true;
};

/** Salió y no se sabe cómo acabó: sin referencia —no la hay, y no se inventa— y con el error que se vio. */
const desenlaceDesconocido = (dispatch: JobDispatch, resultado: GatewayResult): AttemptReport => ({
  attemptId: dispatch.attemptId,
  outcome: 'unknown',
  dispatched: true,
  ...(resultado.error ? { error: resultado.error } : {}),
});

/**
 * El ejecutor, más el único sitio donde queda lo que el Gateway contestó.
 *
 * Un trabajo guarda REFERENCIAS, nunca contenido: el texto de una respuesta no
 * va dentro de su documento. Pero quien pidió la ejecución dentro de esta misma
 * invocación —Weë Brain esperando qué contestar— sí lo necesita. Se queda aquí,
 * en memoria y por intento, y desaparece con la invocación. Si el proceso muere
 * antes de entregarlo se pierde, exactamente igual que hoy.
 */
export interface EjecutorDelConductor extends JobExecutor {
  resultadoDe(attemptId: string): GatewayResult | undefined;
}

const LATIDO_POR_DEFECTO_MS = 20_000;

const cadaCuanto = (ms: number, tarea: () => void): (() => void) => {
  const timer = setInterval(tarea, ms);
  /* Que un latido pendiente no mantenga vivo el proceso cuando ya no hay nada más que hacer. */
  if (typeof timer.unref === 'function') timer.unref();
  return () => clearInterval(timer);
};

export const crearEjecutor = (deps: EjecutorDeps): EjecutorDelConductor => {
  const resultados = new Map<string, GatewayResult>();
  const repetir = deps.repetir ?? cadaCuanto;
  const latidoMs = deps.latidoMs ?? LATIDO_POR_DEFECTO_MS;

  const noSalio = (dispatch: JobDispatch, reason: string, code: 'INVALID_REQUEST' | 'INTERNAL_ERROR'): AttemptReport => ({
    attemptId: dispatch.attemptId,
    outcome: 'failed',
    /* NO SALIÓ. Es lo que le permite al Job Engine reintentar sin miedo a pagar dos veces. */
    dispatched: false,
    error: errorDelCore(code, 'runtime', { details: { reason } }),
  });

  return {
    resultadoDe: (attemptId) => resultados.get(attemptId),

    async ejecutar(dispatch, control): Promise<AttemptReport> {
      /* Una miniatura o una transcodificación las hace otro ejecutor. Mandarla a un proveedor de IA sería un error caro. */
      if (dispatch.task || !dispatch.capability || !dispatch.implementation) return noSalio(dispatch, 'not_an_ai_operation', 'INVALID_REQUEST');

      /*
       * ¿LA ENTRADA ES UNA REFERENCIA? Entonces se resuelve, o no se ejecuta.
       * Mandarle al proveedor `{ contextRef: … }` como si fuera el encargo sería
       * pagar por una respuesta a nada.
       */
      let entrada = dispatch.input;
      if (Object.prototype.hasOwnProperty.call(dispatch.input, CLAVE_DE_REFERENCIA)) {
        if (!deps.contexto || !deps.duenoDelTrabajo) return noSalio(dispatch, 'context_resolver_missing', 'INVALID_REQUEST');
        let dueno: string | undefined;
        try {
          dueno = await deps.duenoDelTrabajo(dispatch.jobId);
        } catch {
          return noSalio(dispatch, 'context_unavailable', 'INTERNAL_ERROR');
        }
        if (!dueno) return noSalio(dispatch, 'context_not_found', 'INVALID_REQUEST');
        let resuelto;
        try {
          resuelto = await deps.contexto.resolver({ ownerUserId: dueno, input: dispatch.input });
        } catch {
          return noSalio(dispatch, 'context_unavailable', 'INTERNAL_ERROR');
        }
        /* No es de la cuenta, no existe, o ya no es lo que se cotizó: NO SALIÓ, y no se reintenta —no va a cambiar—. */
        if (!resuelto.ok) return { attemptId: dispatch.attemptId, outcome: 'failed', dispatched: false, error: resuelto.error };
        entrada = resuelto.input;
      }
      const peticion = peticionDeGateway(entrada === dispatch.input ? dispatch : { ...dispatch, input: entrada });

      /* Sin poder anotarlo, no sale: una operación que cuesta dinero y no deja rastro no puede existir por accidente. */
      let fila: string | undefined;
      try {
        fila = await deps.libro?.abrir(dispatch);
      } catch {
        return noSalio(dispatch, 'ledger_unavailable', 'INTERNAL_ERROR');
      }

      const parar = repetir(latidoMs, () => { void control.renovar().catch(() => false); });
      const inicio = deps.ahora();
      let resultado: GatewayResult;
      try {
        resultado = await deps.gateway.ejecutar(peticion);
      } finally {
        parar();
      }

      resultados.set(dispatch.attemptId, resultado);
      if (fila !== undefined) {
        /*
         * El proveedor YA contestó. Fallar el intento porque el libro no cerró
         * sería repetirlo —y pagarlo otra vez— por un problema de anotación. Se
         * avisa y se sigue: la fila queda abierta, que es visible y reconciliable.
         */
        try {
          await deps.libro?.cerrar(fila, { dispatch, resultado, durationMs: Math.max(0, deps.ahora() - inicio) });
        } catch {
          console.warn(`WEË RUNTIME: no se pudo cerrar la fila del libro (${dispatch.trace.requestId})`);
        }
      }
      /*
       * LA REFERENCIA DEL PROVEEDOR, que con `accepted` no es un adorno: es lo
       * único que queda de una tarea que sigue viva del otro lado. El Gateway ya
       * la devuelve en el resultado, así que no hace falta que la composición
       * sepa de ningún proveedor para conservarla.
       */
      const ref = deps.referenciaDeProveedor?.(resultado)
        ?? (resultado.operation ? { providerId: resultado.operation.providerId, operationId: resultado.operation.operationId } : undefined);
      /* Un POST que no volvió, cuando se pidió aceptar y soltar, no es un fallo: no se sabe. */
      const informe = deps.aceptaAsincrono === true && sinRespuestaDelProveedor(resultado)
        ? desenlaceDesconocido(dispatch, resultado)
        : informeDelGateway(dispatch, resultado, ref);

      /*
       * ── EL TEXTO, CONVERTIDO EN MATERIAL ──────────────────────────────────
       *
       * Aquí y no antes: el Gateway EJECUTA y no puede convertirse en quien
       * administra material, y el Job TRANSPORTA y no puede convertirse en
       * dueño de nada. Este es el punto donde el resultado ya existe, el
       * trabajo todavía no se ha cerrado, y ya hay un puerto para hablar con la
       * Fase 11 — el mismo que guarda un vídeo cuando llega su aviso.
       *
       * Y se AÑADE a lo que ya hubiera: un resultado puede traer URLs y texto,
       * y quedarse con uno solo sería tirar la mitad.
       */
      if (deps.material && informe.outcome === 'succeeded') {
        const aGuardar = materialDeTexto(dispatch, resultado.response?.content, deps.ahora());
        if (aGuardar) {
          const guardado = await deps.material.guardar(aGuardar).catch(() => ({ ok: false as const, motivo: 'fallo' as const }));
          if (guardado.ok) {
            /*
             * La referencia es el identificador del material, no una URL. El
             * contrato nunca dijo que `outputRefs` fueran direcciones —son
             * referencias— y lo que las consume pregunta por ellas a la Fase 11,
             * que es quien sabe de quién es cada cosa.
             */
            const previas = informe.result?.outputRefs ?? [];
            return {
              ...informe,
              result: { ...(informe.result ?? {}), outputRefs: Object.freeze([...previas, guardado.assetId]) },
            };
          }
          /*
           * No se pudo guardar. El resultado SIGUE siendo bueno —ya se ejecutó y
           * ya se pagó—, así que el intento no se convierte en un fallo: lo que
           * se pierde es la referencia, y quien dependa de ella lo notará en su
           * sitio. Mentir aquí habría cobrado dos veces por lo mismo.
           */
          console.warn(`WEË RUNTIME: no se pudo guardar el texto como material (${dispatch.trace.requestId})`);
        }
      }
      return informe;
    },
  };
};
