import {
  Brain,
  BrainAttachment,
  GatewayRequest,
  GATEWAY_CONTRACT_VERSION,
  Gateway,
  ImplementationResolver,
  LIMITES_DE_CONTEXTO,
  Thinker,
  ThoughtRequest,
  ThoughtResult,
  Tracer,
  crearBrain,
  normalizarUso,
} from '../core';
import { EngineResult } from '../engine/types';

/**
 * WEË BRAIN — LA COMPOSICIÓN.
 *
 * El Brain del Core (`core/brain.ts`) es puro: entiende, decide y normaliza,
 * pero no sabe hablar con ningún modelo. Este archivo es quien lo sabe, y es lo
 * único que lo sabe:
 *
 *   · `peticionAlMotor`      — del contexto de Brain al input que leen los
 *     adaptadores (`prompt`, `history`, `imageUrl`…). Función pura.
 *   · `pensamientoDesde`     — de lo que devuelve el motor a `ThoughtResult`.
 *   · `pensadorSobreGateway` — el puerto `Thinker` sobre el AI Gateway de la
 *     Fase 2, con un `ImplementationResolver` inyectado: esa es la costura por
 *     la que entrará el Router (Fase 7) sin tocar ni Brain ni el Gateway.
 *   · `crearBrainDeWee`      — enchufa pensador, traza y reloj.
 *
 * ── Lo que NO hay aquí, y por qué ───────────────────────────────────────────
 *
 * No hay un singleton `brainDeWee()`. Un Brain compuesto sobre la cadena
 * general contestaría con un modelo distinto del que se cotizó, y quien lo
 * usara rompería sin enterarse la promesa de que lo que se enseña y lo que se
 * cobra son el mismo número. `crearBrain` es barato y sin estado, así que quien
 * lo necesite lo construye con SU pensador, que es quien sabe con qué se paga.
 *
 * Tampoco hay nombres de proveedor ni de modelo: Brain expresa una capacidad y
 * quien elige la implementación es otra capa.
 */

/** Cómo se arma el texto que se le manda al modelo. El prompt lo pone quien compone: aquí no vive ninguno. */
export interface OpcionesDePeticion {
  /** Instrucciones del sistema, ya armadas por quien conoce el tono y el idioma. */
  system: string;
  maxOutputTokens?: number;
  temperature?: number;
}

/** La primera dirección de material de una clase, si la hay. */
const primeraUrl = (adjuntos: readonly BrainAttachment[], kind: BrainAttachment['kind']): string | undefined =>
  adjuntos.find((a) => a.kind === kind && !!a.url)?.url;

/**
 * DEL CONTEXTO DE BRAIN AL INPUT DEL MOTOR.
 *
 * Pura y sin sorpresas: el mensaje va como `prompt`, los turnos como
 * `history` con el vocabulario que esperan los adaptadores, y el material como
 * las direcciones que ya leen hoy. Nada se inventa: lo que no viene, no sale.
 */
export const peticionAlMotor = (request: ThoughtRequest, opciones: OpcionesDePeticion): Record<string, unknown> => {
  const { inmediato, conversacion } = request.context;
  const imagenes = inmediato.attachments.filter((a) => a.kind === 'image' && !!a.url).map((a) => a.url as string);
  return {
    system: opciones.system,
    prompt: inmediato.text,
    history: conversacion.recent.map((t) => ({ role: t.role === 'user' ? 'user' : 'model', text: t.text })),
    ...(imagenes.length ? { imageUrl: imagenes[0], ...(imagenes.length > 1 ? { imageUrls: imagenes } : {}) } : {}),
    ...(primeraUrl(inmediato.attachments, 'document') ? { documentUrl: primeraUrl(inmediato.attachments, 'document') } : {}),
    ...(primeraUrl(inmediato.attachments, 'audio') ? { audioUrl: primeraUrl(inmediato.attachments, 'audio') } : {}),
    kind: request.kind === 'understand' ? 'analysis' : 'answer',
    ...(opciones.maxOutputTokens !== undefined ? { maxOutputTokens: opciones.maxOutputTokens } : {}),
    ...(opciones.temperature !== undefined ? { temperature: opciones.temperature } : {}),
  };
};

/**
 * DE LO QUE DEVUELVE EL MOTOR A LO QUE ENTIENDE BRAIN.
 *
 * El coste medido y el uso viajan tal cual —Brain los transporta, no los
 * calcula— y `demo` se convierte en `synthetic`, que es como se sabe aguas
 * abajo que un resultado es de muestra sin comparar el id de nadie.
 */
export const pensamientoDesde = (result: EngineResult): ThoughtResult => ({
  response: {
    kind: result.output.kind,
    content: result.output.content,
    urls: result.output.urls ?? (result.output.url ? [result.output.url] : undefined),
    durationSec: result.output.durationSec,
    sources: result.output.sources,
    actual: {
      provider: { lines: [], usd: result.costUSD, model: result.modelId },
      latencyMs: result.latencyMs,
    },
    model: result.modelId,
    /* El id de la generación es lo que ata esta respuesta a su fila del libro. */
    meta: { ...(result.meta ?? {}), generationId: result.generationId },
  },
  usage: result.usage ? normalizarUso(result.usage, result.output.kind) : undefined,
  synthetic: result.demo === true,
});

export interface PensadorSobreGatewayDeps {
  gateway: Gateway;
  /** Quien elige la implementación. Hasta la Fase 7, solo lo implementan las pruebas. */
  resolver: ImplementationResolver;
  opciones: (request: ThoughtRequest) => OpcionesDePeticion;
}

/**
 * EL PENSADOR SOBRE EL AI GATEWAY.
 *
 * Es el camino que Weë tomará cuando exista el Router: Brain dice qué capacidad
 * necesita, el resolver dice con qué se atiende, y el Gateway lo ejecuta. Brain
 * no elige y el Gateway no decide; entre los dos hay un puerto, que es
 * exactamente donde encaja el Router sin tocar a ninguno.
 */
export const pensadorSobreGateway = (deps: PensadorSobreGatewayDeps): Thinker => ({
  async pensar(request) {
    const implementation = await deps.resolver.resolver(request.capability, request.trace);
    if (!implementation) {
      throw new Error(`sin implementación para ${request.capability}`);
    }
    const peticion: GatewayRequest = {
      contract: GATEWAY_CONTRACT_VERSION,
      capability: request.capability,
      implementation,
      input: peticionAlMotor(request, deps.opciones(request)),
      trace: request.trace,
      language: request.language,
      execution: { mode: 'sync', hints: request.hints },
    };
    const resultado = await deps.gateway.ejecutar(peticion);
    if (resultado.status !== 'completed' || !resultado.response) {
      throw Object.assign(new Error('el Gateway no pudo ejecutar'), { weeError: resultado.error });
    }
    return {
      response: resultado.response,
      usage: resultado.usage,
      synthetic: resultado.implementation.type === 'internal',
    };
  },
});

/**
 * Una línea por operación. No es el sistema de observabilidad —ese llega
 * después—: es la garantía de que nada que pase por aquí gaste dinero sin
 * dejar, al menos, rastro de qué, quién y cuánto. Sin texto de nadie.
 */
export const trazaDeBrain: Tracer = {
  record: (t) => {
    const coste = t.providerUsd === undefined ? '' : ` usd=${t.providerUsd.toFixed(4)}`;
    const fallo = t.errorCode ? ` error=${t.errorCode}` : '';
    console.log(`WEË BRAIN: ${t.status} ${t.capability} ${t.latencyMs} ms${coste}${fallo} requestId=${t.requestId} traceId=${t.traceId}`);
  },
};

export interface BrainDeWeeDeps {
  /** Quien piensa. Lo trae quien compone, porque es quien sabe con qué se paga. */
  pensador: Thinker;
  tracer?: Tracer;
  now?: () => number;
  /** Ids de especialista a los que se puede derivar. Sin lista, no se deriva a nadie. */
  experiences?: readonly string[];
}

/**
 * Weë Brain, listo para usar. Se construye por petición: no guarda nada de
 * nadie, así que una instancia puede desaparecer y otra seguir el trabajo con
 * lo que esté persistido.
 */
export const crearBrainDeWee = (deps: BrainDeWeeDeps): Brain =>
  crearBrain({
    thinker: deps.pensador,
    tracer: deps.tracer ?? trazaDeBrain,
    now: deps.now ?? (() => Date.now()),
    experiences: deps.experiences,
    limits: { turnos: LIMITES_DE_CONTEXTO.turnos, caracteresDelMensaje: LIMITES_DE_CONTEXTO.caracteresDelMensaje },
  });
