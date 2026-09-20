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
  ahora: () => number;
  /** Cada cuánto se dice «sigo vivo». Tiene que ser bastante menos que lo que dura una concesión. */
  latidoMs?: number;
  /** Cómo se repite algo cada cierto tiempo. Entra por la puerta para que una prueba no dependa del reloj. */
  repetir?: (ms: number, tarea: () => void) => () => void;
  /**
   * Cómo llama el PROVEEDOR a esta operación, cuando alguien lo sabe. Cada uno
   * guarda su identificador donde quiere; adivinarlo aquí metería un proveedor
   * concreto en el camino común. Sin él, el trabajo funciona igual.
   */
  referenciaDeProveedor?: (resultado: GatewayResult) => ProviderOperationRef | undefined;
}

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
      const peticion = peticionDeGateway(dispatch);

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
      return informeDelGateway(dispatch, resultado, deps.referenciaDeProveedor?.(resultado));
    },
  };
};
