import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { crearMaterialDesdeUrl } from '../content';
import {
  CapabilityId,
  JobDispatch,
  JobLimits,
  JobPolicy,
  LIMITES_DE_CONTEXTO,
  Tracer,
  crearRegistro,
  crearRouter,
  modalidadDe,
} from '../core';
import { creditEngine } from '../credits/creditEngine';
import { engine } from '../engine';
import { loadConfig } from '../engine/config';
import { crearGatewayDelMotor, trazaDeConsola } from '../engine/gateway';
import { Ledger, firestoreLedger } from '../engine/ledger';
import { ADAPTERS, DEFAULT_ROUTING } from '../engine/registry';
import { crearMotorDeTrabajosDeWee } from '../job';
import { datosDelRegistro } from '../registry';
import { almacenDeEjecuciones, almacenDeTrabajos, contadorDeCapacidad } from './almacen';
import { colaDeInvocacion } from './cola';
import { Conductor, PuertoDeMaterial, crearConductor } from './conductor';
import { ConstructorDeEntrada, resolutorDeBrain } from './contexto';
import { conversacionesDeBrain, entidadesDeWee } from './conversaciones';
import { LibroDeIntentos, crearEjecutor } from './ejecutor';
import { PuertoDeLiquidacion } from './liquidacion';
import { ReglaDePolitica, SIN_REGLAS, politicaPorReglas } from './politica';
import { CadenaDeProducto, resolutorPorCadena } from './resolucion';

/**
 * WEË RUNTIME — LA COMPOSICIÓN.
 *
 * El conductor es puro: recibe puertos y los junta. Aquí está lo que esos
 * puertos SON en Weë: el registro vivo, los adaptadores de verdad, el libro que
 * ya existe, el material que ya existe, Firestore.
 *
 * ── Una sola fuente para «qué hay» ──────────────────────────────────────────
 *
 * El Router de `router/index.ts` lee un registro fijo, construido al arrancar,
 * y el Gateway de `engine/gateway.ts` lee uno derivado de la configuración
 * viva. Con dos fotos distintas, el Router podía elegir un modelo que un
 * administrador acababa de apagar y el Gateway lo rechazaba después. Aquí los
 * dos miran el MISMO registro, el de la configuración viva: lo que está apagado
 * no es elegible, en vez de elegirse para fallar.
 *
 * ── De dónde sale la cadena de producto ─────────────────────────────────────
 *
 * De la función de decisión que ya usa producción (`engine.route`, la misma que
 * hoy calcula los Credits de un presupuesto). No se copia su lógica —cadenas,
 * interruptores, cortacircuitos, topes diarios, calidad por eslabón—: se le
 * PREGUNTA. Así, mientras dure la migración, el orden que ve el Core es por
 * construcción el mismo que obedece el camino de siempre, y el modelo que se
 * cotizó es el que se ejecuta.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA. `index.ts` no exporta nada de este
 * directorio y ningún callable lo importa.
 */

/** La cadena de producto, preguntándole a quien hoy decide. */
export const cadenaViva: CadenaDeProducto = {
  async cadena({ peticion, input, preferencias }) {
    /* Lo que el motor de hoy no enruta no tiene cadena: ahí decide el Router del Core solo. */
    if (!(peticion.capability in DEFAULT_ROUTING)) return undefined;
    const decision = await engine.route({
      capability: peticion.capability as CapabilityId,
      input: { ...input },
      userId: peticion.trace.userId,
      prefs: {
        ...(peticion.hints?.quality ? { quality: peticion.hints.quality } : {}),
        ...(peticion.hints?.durationSec !== undefined ? { durationSec: peticion.hints.durationSec } : {}),
        ...(preferencias?.allowedProviders ? { allowedProviders: [...preferencias.allowedProviders] } : {}),
        ...(preferencias?.excludeProviders ? { excludeProviders: [...preferencias.excludeProviders] } : {}),
        ...(preferencias?.modelId ? { modelId: preferencias.modelId } : {}),
      },
    });
    return decision.candidates.map((c) => ({
      providerId: c.provider,
      modelId: c.model.id,
      estimatedUsd: c.estimatedUsd,
      estimatedCredits: c.estimatedCredits,
    }));
  },
};

const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.length ? v : undefined);

/**
 * EL LIBRO DE SIEMPRE, POR EL PUERTO DEL EJECUTOR.
 *
 * Las filas de `aiGenerations` salen con la MISMA forma que escribe el router
 * de hoy: los informes de coste, el panel de administración y la liquidación
 * de Credits no distinguen por dónde pasó una generación. No hay un segundo
 * libro. `settle` no se llama aquí: lo llama quien conoce el desenlace de los
 * Credits, que es quien los reservó.
 */
/**
 * Quién es esta operación PARA EL LIBRO, cuando quien la pide ya tiene su
 * propia forma de nombrarla.
 *
 * Por defecto la fila se identifica con lo que sabe el trabajo: la ejecución,
 * el paso y la clave del intento. Es lo más preciso que hay. Pero durante una
 * migración hay algo que importa más que la precisión: que la fila se parezca a
 * la que habría escrito el camino de siempre, para que lo de antes y lo de
 * ahora se puedan comparar y sumar sin traducir nada. Quien migra pasa su
 * identidad; nadie más la necesita.
 */
export type IdentidadDelLibro = (dispatch: JobDispatch) => { requestId?: string; jobId?: string; stepId?: string };

export const libroDelMotor = (ledger: Ledger = firestoreLedger, identidad?: IdentidadDelLibro): LibroDeIntentos => ({
  async abrir(dispatch) {
    if (!dispatch.capability || !dispatch.implementation) return undefined;
    const meta = dispatch.metadata ?? {};
    const { settings } = await loadConfig();
    const suya = identidad?.(dispatch) ?? {};
    return ledger.open({
      userId: dispatch.trace.userId,
      jobId: suya.jobId ?? dispatch.trace.runId ?? dispatch.jobId,
      stepId: suya.stepId ?? dispatch.trace.stepId,
      experienceId: dispatch.trace.workplace,
      /* Es lo que une esta fila con el trabajo (`jobs.trace.requestId`) y con la transacción de Credits. */
      requestId: suya.requestId ?? dispatch.trace.requestId,
      capability: dispatch.capability as CapabilityId,
      modality: modalidadDe(dispatch.capability as CapabilityId),
      provider: dispatch.implementation.providerId,
      model: dispatch.implementation.modelId,
      attempt: dispatch.attempt,
      estimatedUsd: numero(meta.estimatedUsd) ?? 0,
      pricingMode: settings.pricingMode,
      service: texto(meta.service),
      creditTransactionId: texto(meta.creditTransactionId),
    });
  },
  async cerrar(fila, { dispatch, resultado, durationMs }) {
    const meta = dispatch.metadata ?? {};
    const uso = resultado.usage
      ? Object.fromEntries(Object.entries(resultado.usage).filter((par): par is [string, number] => typeof par[1] === 'number'))
      : undefined;
    await ledger.close(fila, {
      status: resultado.status === 'failed' ? 'FAILED' : 'COMPLETED',
      providerCost: resultado.response?.actual.provider.usd ?? 0,
      creditsEstimated: numero(meta.creditsEstimated) ?? numero(meta.estimatedCredits),
      durationMs,
      outputType: resultado.response?.kind,
      /* El CÓDIGO, nunca el mensaje crudo del proveedor. */
      error: resultado.error?.code,
      usage: uso && Object.keys(uso).length ? uso : undefined,
      videoDurationSec: resultado.response?.durationSec,
    });
  },
});

/** Del resultado de un proveedor al material de la cuenta. Igual que lo hace hoy `creatorRun`, por el mismo Content Core. */
export const materialDeWee: PuertoDeMaterial = {
  async registrar({ principal, dispatch, job, respuesta }) {
    const urls = respuesta?.urls?.length ? respuesta.urls : job.result?.outputRefs ?? [];
    const ids: string[] = [];
    for (const url of urls) {
      try {
        const material = await crearMaterialDesdeUrl({
          ownerAccountId: principal.userId,
          url,
          kind: !respuesta || respuesta.kind === 'text' ? 'document' : respuesta.kind,
          durationSec: respuesta?.durationSec,
          name: dispatch.purpose,
          metadata: dispatch.trace.workplace ? { experienceId: dispatch.trace.workplace } : undefined,
          provenance: {
            createdAt: job.updatedAt,
            jobId: job.jobId,
            stepId: dispatch.stepId,
            requestId: dispatch.trace.requestId,
            /* La procedencia de hoy solo conoce las capacidades que el motor enruta; las del catálogo ampliado se anotan cuando el Content Core las admita. */
            capability: dispatch.capability in DEFAULT_ROUTING ? (dispatch.capability as CapabilityId) : undefined,
            provider: job.implementation?.providerId,
          },
        });
        if (material) ids.push(material.assetId);
      } catch {
        /* Un paso que salió bien no se tira por un problema de catalogación: se queda sin ficha, y se ve. */
        console.error(`WEË RUNTIME: no se pudo crear el material del paso ${dispatch.stepId} (${dispatch.trace.requestId})`);
      }
    }
    return ids;
  },
};

/**
 * LA LIQUIDACIÓN, POR EL MOTOR DE CREDITS QUE YA EXISTE.
 *
 * Dos llamadas, y son exactamente las dos que hace hoy `creator/brain.ts`
 * cuando conoce el desenlace: `completeCredits` para cobrar lo reservado y
 * `refundCredits` para devolverlo, más la fila del libro que se liquida con el
 * mismo identificador de transacción. No hay un segundo libro, ni un segundo
 * motor financiero, ni un estado nuevo: los que hay —`AUTHORIZED`,
 * `COMPLETED`, `REFUNDED`— ya cubren esto, y las dos operaciones ya son
 * idempotentes por `requestId`, que es lo que permite que dos barrenderos, o un
 * barrendero y un trabajador, hagan esto a la vez sin cobrar dos veces.
 *
 * Lo único que cambia respecto de hoy es QUIÉN las llama: hoy, la invocación
 * que empezó la operación; con esto, también quien la encuentre abierta
 * después, leyendo del trabajo guardado.
 */
export const liquidacionDeWee = (deps: { credits?: typeof creditEngine; ledger?: Ledger } = {}): PuertoDeLiquidacion => {
  const credits = deps.credits ?? creditEngine;
  const ledger = deps.ledger ?? firestoreLedger;
  const cerrarFila = async (creditTransactionId: string, finalAmount: number) => {
    await ledger.settle({ creditTransactionId, finalAmount }).catch(() => undefined);
  };
  return {
    async liquidar({ userId, reserva, importe, jobId }) {
      try {
        /*
         * `completeCredits` solo mueve algo si la transacción está
         * `AUTHORIZED`; si ya estaba `COMPLETED`, `FAILED` o `REFUNDED`
         * devuelve el estado y no toca nada. Esa es toda la protección contra
         * el doble cobro, y es del motor de Credits, no de aquí.
         */
        const r = await credits.completeCredits({ userId, requestId: reserva.requestId, finalAmount: importe, meta: { jobId } });
        await cerrarFila(reserva.transactionId, importe);
        return { desenlace: r.status === 'COMPLETED' ? 'liquidada' : 'ya_estaba', estado: r.status };
      } catch (e) {
        return { desenlace: 'fallo', error: e instanceof Error ? e.name : 'error' };
      }
    },
    async reembolsar({ userId, reserva }) {
      try {
        const r = await credits.refundCredits({ userId, requestId: reserva.requestId, reason: 'Weë · la operación no llegó a completarse', source: 'weë-runtime' });
        await cerrarFila(reserva.transactionId, 0);
        return { desenlace: r.duplicate ? 'ya_estaba' : 'reembolsada', estado: 'REFUNDED' };
      } catch (e) {
        /* Ya estaba devuelta, o ya se cobró y no se toca sin que lo decida una persona: no es un fallo del barrendero. */
        const code = (e as { code?: string })?.code;
        if (code === 'ALREADY_REFUNDED' || code === 'ALREADY_COMPLETED') return { desenlace: 'ya_estaba', estado: code };
        return { desenlace: 'fallo', error: e instanceof Error ? e.name : 'error' };
      }
    },
  };
};

export interface ConductorDeWeeDeps {
  db: Firestore;
  ahora?: () => number;
  politica?: JobPolicy;
  limites?: JobLimits;
  tracer?: Tracer;
  libro?: LibroDeIntentos;
  paralelismo?: number;
  /**
   * De lo que guarda la conversación a la entrada exacta del motor. Lo pone
   * quien COTIZA —su misma función—, porque cotizar y ejecutar tienen que
   * construir la entrada por el mismo camino. Sin él, un trabajo cuya entrada sea
   * una referencia no se ejecuta.
   */
  construirEntradaDeBrain?: ConstructorDeEntrada;
  /** Las restricciones EXPLÍCITAS conocidas. Hoy no hay ninguna, y sin ellas no se bloquea nada. */
  reglas?: readonly ReglaDePolitica[];
}

/**
 * El conductor de Weë. Se construye POR EJECUCIÓN: no guarda nada, así que un
 * servidor puede desaparecer a media frase y otro seguir con lo que quedó
 * guardado. El trabajador lleva una identidad nueva cada vez, porque la
 * concesión de un trabajo es de UN proceso y no de «el conductor».
 */
export const conductorDeWee = async (deps: ConductorDeWeeDeps): Promise<Conductor> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const config = await loadConfig();
  const registro = crearRegistro(datosDelRegistro(ADAPTERS, config.providers));
  const router = crearRouter({ registry: registro });
  const gateway = crearGatewayDelMotor({ adapters: ADAPTERS, loadConfig, tracer: deps.tracer ?? trazaDeConsola, now: ahora });
  const { motor } = crearMotorDeTrabajosDeWee(deps.politica);
  const capacidad = deps.limites ? contadorDeCapacidad(deps.db, deps.limites) : undefined;
  const trabajos = almacenDeTrabajos(deps.db);
  const contexto = deps.construirEntradaDeBrain
    ? resolutorDeBrain({
      conversaciones: conversacionesDeBrain(deps.db),
      entidades: entidadesDeWee(deps.db),
      construirEntrada: deps.construirEntradaDeBrain,
      turnos: LIMITES_DE_CONTEXTO.turnos,
    })
    : undefined;

  return crearConductor({
    trabajos,
    ejecuciones: almacenDeEjecuciones(deps.db, ahora),
    cola: colaDeInvocacion(ahora),
    motor,
    resolver: resolutorPorCadena(router, cadenaViva, politicaPorReglas(deps.reglas ?? SIN_REGLAS)),
    ejecutor: crearEjecutor({
      gateway, libro: deps.libro ?? libroDelMotor(), ahora,
      ...(contexto ? { contexto } : {}),
      /* El dueño, del ALMACÉN. El paquete no lo lleva y la traza no es prueba de quién es nadie. */
      duenoDelTrabajo: async (jobId) => (await trabajos.obtener(jobId))?.owner.userId,
    }),
    material: materialDeWee,
    trabajador: {
      worker: `inv-${randomUUID()}`,
      visibilityMs: 60_000,
      backpressureDelayMs: 5_000,
      ...(deps.limites ? { limits: deps.limites } : {}),
    },
    ...(capacidad ? { capacidad, capacidadAlCrear: (principal) => capacidad.alCrear(principal) } : {}),
    ...(deps.limites ? { limites: deps.limites } : {}),
    ahora,
    esperar: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ...(deps.paralelismo !== undefined ? { paralelismo: deps.paralelismo } : {}),
  });
};

export { crearConductor } from './conductor';
export type { Conductor, EjecucionPreparada, ResultadoDelConductor } from './conductor';
export { decidirRuntime, leerPuerta, PUERTA_CERRADA } from './puerta';
export type { ConfiguracionDePuerta, DecisionDePuerta } from './puerta';
export { configuracionDeLaPuerta, olvidarLaPuerta } from './configuracion';
export { huellaDeEntrada } from './contexto';
export type { LibroDeIntentos } from './ejecutor';
export { barrerLiquidaciones } from './barrendero';
export type { BarrenderoDeps, InformeDelBarrendero, VistoPorElBarrendero } from './barrendero';
export { decidirLiquidacion, reservaDe } from './liquidacion';
export type { AccionDeLiquidacion, PuertoDeLiquidacion, ReservaDelTrabajo } from './liquidacion';
export type { AlmacenDeTrabajosDeWee } from './almacen';
export { FalloDelPensador, pensadorSobreConductor } from './pensador';
