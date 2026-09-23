import { CapabilityId } from '../creator/types';
import { EngineSettings, MAX_PROPUESTAS_POR_PASO } from '../engine/types';

import { ImageSize, chooseImageModel, imageModelOf, isEditCapability, usdFor, volumeFactor } from '../engine/imageModels';
import { resolveForModel } from '../engine/resolutionPolicy';
import { SEEDANCE_MODEL_IDS, SeedanceResolution, clampDuration, resolveResolution, seedanceCostUsd, specOf } from '../engine/providers/seedance';
import { CreditService, getCreditCost, getCreditMargin, getCreditPricingMode } from './creditCosts';

/**
 * PRECIOS DE IA — punto único (docs/CREDITS.md).
 *
 * Ninguna sección de Weë (Beauty, Photo, Studio…) fija precios: todas preguntan
 * aquí. Este módulo traduce
 *
 *   proveedor → modelo → operación → coste oficial en USD → Credits
 *
 * usando exclusivamente las tarifas publicadas por cada proveedor y los ajustes
 * del Credit Engine (creditsPerUsd y margen en aiSettings/global, y el catálogo
 * de creditCosts.ts sobreescribible en creditCosts/{servicio}).
 *
 * Se puede cambiar el precio de cualquier operación sin tocar código:
 *   - creditCosts/{servicio}.credits  → precio fijo de ese servicio
 *   - aiSettings/global.margin        → margen sobre el coste real
 *   - aiSettings/global.pricingMode   → 'simulated' (catálogo) | 'real' (coste medido)
 */

export interface OperationPrice {
  /** Servicio del catálogo con el que se cobra y se registra. */
  service: CreditService;
  /** Credits que se cobran a la persona. */
  credits: number;
  /** Coste oficial estimado del proveedor, en USD. */
  usd: number;
  provider: string;
  model: string;
  /** Detalle para el registro (aiGenerations) y para el panel de administración. */
  detail: Record<string, unknown>;
}

/** USD → Credits, con el margen del motor. Redondea siempre hacia arriba. */
export function usdToCredits(usd: number, settings: Pick<EngineSettings, 'creditsPerUsd' | 'margin'>): number {
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd * settings.creditsPerUsd * (1 + settings.margin)));
}

/**
 * Credits de una operación.
 *  - Modo real: coste oficial × Credits por dólar × (1 + margen).
 *  - Modo prueba: el precio del catálogo (configurable en creditCosts/{servicio}).
 *
 * En los dos casos se aplica un suelo: **nunca se cobra menos de lo que cuesta la
 * API**. Un precio fijo por tramo no puede cubrir todas las duraciones (una historia
 * de 20 s cuesta el triple que un clip de 5 s), así que el coste sin margen manda
 * cuando el catálogo se queda corto. Para vender más barato se baja el margen o
 * los Credits por dólar en aiSettings/global, no el suelo.
 */
const creditsOf = (service: CreditService, usd: number, settings: Pick<EngineSettings, 'pricingMode' | 'creditsPerUsd' | 'margin'>): number => {
  /*
   * El margen y el modo se preguntan POR SERVICIO, y la respuesta por defecto es
   * la general. Quien no declara nada —imagen, video, voz, búsqueda— recibe
   * exactamente lo mismo que antes de que esto existiera.
   *
   * La fórmula sigue siendo una sola: `usdToCredits`. Lo único que cambia es qué
   * margen se le pasa. No hay un segundo cálculo de precios en Weë.
   */
  const margin = getCreditMargin(service, settings.margin);
  const withMargin = usdToCredits(usd, { creditsPerUsd: settings.creditsPerUsd, margin });
  if (getCreditPricingMode(service, settings.pricingMode) === 'real') return withMargin;
  const atCost = usd > 0 ? Math.ceil(usd * settings.creditsPerUsd) : 0;
  return Math.max(getCreditCost(service), atCost);
};

// ──────── COSTE DE PROVEEDOR DE CUALQUIER OPERACIÓN (texto, voz, búsqueda, audio) ────────

/**
 * Tarifas oficiales del modelo MÁS CARO que puede atender cada nivel. Se usa el
 * más caro a propósito: el precio que ve la persona tiene que ser un techo, no
 * un promedio, porque después de confirmar no se le puede cobrar más.
 *
 * Texto (USD por millón de tokens, entrada / salida):
 *   standard → Gemini 3.1 Flash-Lite   0.25 / 1.50  (sustituye a Gemini 2.5 Flash-Lite,
 *                                                    0.10 / 0.40, retirado para claves nuevas)
 *   high     → Gemini 3.8 Flash        0.75 / 3.75
 *   max      → Gemini 3.8 Flash        0.75 / 3.75
 *
 * El nivel máximo lo sirve Gemini 3.8 Flash con razonamiento bajo, así que su
 * tarifa coincide con la del nivel alto y lo que separa a los dos niveles es el
 * tamaño de la respuesta, no el precio por token. AVISO PARA LA FASE 4: cuando se
 * integre Claude hay que revisar este techo, porque Claude Sonnet 5 cuesta
 * 2.00 / 10.00 y encarecería el nivel máximo.
 */
export const TEXT_RATES: Record<'standard' | 'high' | 'max', { input: number; output: number }> = {
  standard: { input: 0.25, output: 1.5 },
  high: { input: 0.75, output: 3.75 },
  max: { input: 0.75, output: 3.75 },
};

/**
 * Gemini 3.5 Flash-Lite: el modelo 3.x más barato que Google declara compatible
 * con búsqueda con fuentes, PDF y audio a la vez. Sirve esas tres funciones, y
 * cuesta más que el modelo económico de texto, así que el suelo tiene que usar
 * SU tarifa y no la del nivel. El audio tiene precio propio, más caro que el texto.
 * USD por millón de tokens (ai.google.dev/gemini-api/docs/pricing).
 */
export const MULTIMODAL_RATE = { input: 0.3, output: 2.5, audioInput: 0.3 };

/** Tarifa que cubre a las dos: el suelo nunca puede quedar por debajo de ninguna. */
const ceilingOf = (a: { input: number; output: number }, b: { input: number; output: number }) => ({
  input: Math.max(a.input, b.input),
  output: Math.max(a.output, b.output),
});

/** USD por 1 000 caracteres de voz: ElevenLabs v3 y Multilingual v2, los más caros de la cadena. */
export const VOICE_USD_PER_KCHAR = 0.1;
/** USD por consulta de búsqueda con fuentes, pasado el cupo mensual gratuito de Google. */
export const SEARCH_USD_PER_QUERY = 0.014;
/** Tokens que consume cada entrada, según la documentación oficial de Gemini. */
export const TOKENS = { perImage: 1300, perDocumentPage: 258, perAudioSecond: 32 };
/** Cuando no se conoce el tamaño del adjunto se asume este, y el motor rechaza lo que lo supere. */
export const ASSUMED = { documentPages: 60, audioSeconds: 600 };
/** Salida máxima por defecto de los adaptadores de texto: el techo del coste de salida. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 1200;

const chars = (value: unknown): number => (typeof value === 'string' ? value.length : 0);

/**
 * Tokens de entrada de una petición de texto, contando TODO lo que se envía:
 * prompt, instrucciones, historial de la conversación, fotos, documentos y audio.
 * Ignorar el historial y los adjuntos era la causa de que el precio mostrado
 * pudiera quedarse por debajo del coste real.
 */
export function estimateInputTokens(input: Record<string, unknown>): number {
  let text = chars(input.prompt) + chars(input.purpose) + chars(input.system) + chars(input.brief) + chars(input.text) + chars(input.content);
  if (Array.isArray(input.history)) {
    for (const turn of input.history) text += chars((turn as any)?.text);
  }
  if (Array.isArray(input.previous)) {
    for (const p of input.previous) text += chars(p);
  }
  let tokens = Math.max(400, Math.round(text / 4) + 300);

  const images = (input.imageUrl ? 1 : 0) + (Array.isArray(input.imageUrls) ? input.imageUrls.length : 0) + (Array.isArray(input.referenceImages) ? input.referenceImages.length : 0);
  tokens += images * TOKENS.perImage;
  if (input.documentUrl) tokens += Number(input.documentPages ?? ASSUMED.documentPages) * TOKENS.perDocumentPage;
  if (input.audioUrl) tokens += Number(input.audioSeconds ?? ASSUMED.audioSeconds) * TOKENS.perAudioSecond;
  return tokens;
}

export type Tier = 'standard' | 'high' | 'max';

const tierOf = (input: Record<string, unknown>): Tier => {
  const q = String(input.quality ?? '');
  return q === 'max' ? 'max' : q === 'high' ? 'high' : 'standard';
};

/**
 * Tokens de razonamiento por cada token de respuesta. Google cobra la respuesta
 * como la suma de los tokens de salida y los de razonamiento, así que la
 * estimación tiene que contarlos o el suelo queda por debajo del coste real.
 *  - standard: Gemini 3.1 Flash-Lite es de la generación 3 y razona por defecto → 1 a 1.
 *    (con Gemini 2.5 Flash-Lite era 0, porque aquel traía el razonamiento apagado).
 *  - high: Gemini 3.8 Flash con su nivel por defecto (medio) → se asume 1 a 1.
 *  - max: Gemini 3.8 Flash con el nivel fijado en bajo → se asume la mitad.
 * Es una proporción SUPUESTA, no medida. Se corrige con la primera generación real.
 */
export const THINKING_FACTOR: Record<Tier, number> = { standard: 1, high: 1, max: 0.5 };

/** Razonamiento del modelo que sirve búsqueda, PDF y audio (Gemini 3.5 Flash-Lite). */
export const MULTIMODAL_THINKING_FACTOR = 1;

/** Salida facturable: la respuesta más los tokens de razonamiento que se cobran con ella. */
export const billableOutput = (outputTokens: number, factor: number): number => Math.round(outputTokens * (1 + factor));

/**
 * Coste oficial estimado de una operación que NO es de imagen ni de video.
 * Siempre por arriba: modelo más caro del nivel y salida al máximo permitido.
 */
export interface ModeloDeTexto {
  provider: string;
  modelId: string;
  /** USD por millón de tokens de entrada. */
  input: number;
  /** USD por millón de tokens de salida. */
  output: number;
}

export function estimateProviderUsd(capability: CapabilityId, input: Record<string, unknown> = {}, modelo?: ModeloDeTexto): number {
  const tier = tierOf(input);
  if (capability === 'voice.tts') {
    const text = Math.max(chars(input.text) || chars(input.prompt) || chars(input.content), 200);
    return (text / 1000) * VOICE_USD_PER_KCHAR;
  }
  if (capability === 'audio.transcribe') {
    const seconds = Number(input.audioSeconds ?? ASSUMED.audioSeconds);
    // El audio se factura con su propia tarifa, no con la de texto del mismo modelo.
    const rate = ceilingOf(TEXT_RATES[tier], MULTIMODAL_RATE);
    const audioIn = Math.max(MULTIMODAL_RATE.audioInput, TEXT_RATES[tier].input);
    const salida = billableOutput(DEFAULT_MAX_OUTPUT_TOKENS, Math.max(THINKING_FACTOR[tier], MULTIMODAL_THINKING_FACTOR));
    return (seconds * TOKENS.perAudioSecond * audioIn + salida * rate.output) / 1_000_000;
  }
  // Búsqueda con fuentes y PDF los sirve Gemini 3.5 Flash-Lite, más caro que el
  // modelo económico: el techo tiene que ser el suyo y no el del nivel pedido.
  const multimodal = capability === 'text.search' || capability === 'doc.read';
  /*
   * SI YA SE SABE QUÉ MODELO VA A RESPONDER, MANDA SU TARIFA.
   *
   * `TEXT_RATES` es un techo por NIVEL, no por modelo: el del modelo más caro
   * que puede atender ese nivel. Sirve para cotizar cuando todavía no se sabe
   * quién atenderá —y por eso se queda—, pero es incorrecto cuando el modelo ya
   * está decidido: Weë Brain pide `deepseek-flash` por su nombre, y cotizarlo
   * con tarifas de Google sería cobrar por un proveedor que no interviene.
   *
   * Es el mismo trato que ya tienen imagen y video, que preguntan al modelo
   * elegido (`usdFor(model, …)`, `seedanceCostUsd(specOf(id))`). El texto era la
   * única modalidad que seguía mirando una tabla en vez de al modelo.
   */
  const rate = modelo
    ? { input: modelo.input, output: modelo.output }
    : multimodal ? ceilingOf(TEXT_RATES[tier], MULTIMODAL_RATE) : TEXT_RATES[tier];
  const factor = multimodal ? Math.max(THINKING_FACTOR[tier], MULTIMODAL_THINKING_FACTOR) : THINKING_FACTOR[tier];
  const inputTokens = estimateInputTokens(input);
  // La salida facturable incluye los tokens de razonamiento, que Google cobra con ella
  const outputTokens = billableOutput(Number(input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS), factor);
  const usd = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  return capability === 'text.search' ? usd + SEARCH_USD_PER_QUERY : usd;
}

/**
 * Precio de cualquier operación con coste de proveedor que no sea imagen ni video.
 * Aplica el mismo suelo: nunca por debajo del coste oficial estimado.
 */
export function priceOperation(capability: CapabilityId, input: Record<string, unknown>, service: CreditService, settings: EngineSettings, modelo?: ModeloDeTexto): OperationPrice {
  const usd = estimateProviderUsd(capability, input, modelo);
  return {
    service,
    credits: creditsOf(service, usd, settings),
    usd,
    /* Quien sepa qué modelo va a responder lo dice; quien no, sigue diciendo "la cadena". */
    provider: modelo?.provider ?? 'router',
    model: modelo?.modelId ?? 'según la cadena',
    detail: {
      tier: tierOf(input),
      estimatedInputTokens: estimateInputTokens(input),
      maxOutputTokens: Number(input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS),
      ...(modelo ? { rateInput: modelo.input, rateOutput: modelo.output } : null),
    },
  };
}

// ──────────────────────────── VIDEO (Seedance, ByteDance) ────────────────────────────

export interface VideoPriceInput {
  /** Id oficial del modelo de la familia Seedance ya elegido por el Weë Video Engine. */
  modelId: string;
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  /** Segundos de video de entrada (encarece la generación y cambia la tarifa). */
  inputVideoSec?: number;
}

/**
 * Tramo de precio del video. Sigue a la familia Seedance: cada modelo tiene su
 * tarifa oficial, así que cada uno tiene su propio servicio de Credits.
 */
export function videoServiceFor(modelId: string, resolution: SeedanceResolution): CreditService {
  if (modelId === SEEDANCE_MODEL_IDS.SEEDANCE_2_5) return resolution === '1080p' ? 'ai_video_max' : 'ai_video_advanced';
  if (modelId === SEEDANCE_MODEL_IDS.SEEDANCE_2_0) return resolution === '1080p' || resolution === '4k' ? 'ai_video_max' : 'ai_video_hd';
  return resolution === '480p' ? 'ai_video_draft' : 'ai_video';
}

/** Coste oficial y Credits de una generación de video, antes de llamar al proveedor. */
export function priceVideo(input: VideoPriceInput, settings: EngineSettings): OperationPrice {
  const modelId = SEEDANCE_MODEL_IDS[input.modelId as keyof typeof SEEDANCE_MODEL_IDS] || input.modelId;
  const spec = specOf(modelId);
  const resolution = resolveResolution(modelId, input.resolution, input.quality);
  const durationSec = clampDuration(modelId, input.durationSec ?? 5);
  const { usd, tokens, ratePerMillion } = seedanceCostUsd({
    modelId,
    resolution,
    durationSec,
    ratio: input.aspectRatio,
    inputVideoSec: input.inputVideoSec,
  });
  const service = videoServiceFor(modelId, resolution);
  return {
    service,
    credits: creditsOf(service, usd, settings),
    usd,
    provider: 'seedance',
    model: modelId,
    detail: { family: spec.key, resolution, durationSec, estimatedTokens: tokens, usdPerMillionTokens: ratePerMillion, inputVideoSec: input.inputVideoSec ?? 0 },
  };
}

// ──────────────────────────── IMAGEN (Gemini y compañía) ────────────────────────────

/** Operaciones que necesitan el modelo de máxima precisión: conservar la identidad. */
export const PRO_IMAGE_KINDS = new Set(['restore', 'retouch', 'look', 'identity']);

export const needsProImage = (capability: CapabilityId, input: Record<string, unknown> = {}): boolean =>
  capability === 'image.identity_edit' ||
  PRO_IMAGE_KINDS.has(String(input.kind ?? '')) ||
  String(input.quality ?? '') === 'max';

export interface ImagePriceInput {
  capability: CapabilityId;
  /** Modelo ya elegido (si la persona seleccionó una opción concreta). */
  modelId?: string;
  count?: number;
  quality?: string;
  resolution?: string;
  kind?: string;
  references?: number;
  /**
   * Tamaño real de cada imagen de entrada, cuando se conoce. Los proveedores que
   * cobran por megapíxel facturan también los píxeles de lo que se les manda a
   * editar. Si falta, se usa la cota inferior de 1 MP por referencia.
   */
  referenceSizes?: { width: number; height: number }[];
  /**
   * Proporción pedida al CREAR desde cero ("16:9"). En una edición no se usa: la
   * proporción sale de la foto, porque deformarla nunca es la respuesta.
   */
  aspectRatio?: string | number;
  /** La resolución la fijó el motor (mínimo técnico del modelo), no la pidió nadie. */
  resolutionFromEngine?: boolean;
  /** Proveedores con clave configurada, para no ofrecer lo que no se puede servir. */
  available?: (provider: string) => boolean;
}

/** Servicio de Credits de una operación de imagen, según el nivel del modelo elegido. */
export function imageServiceFor(capability: CapabilityId, input: Record<string, unknown> = {}, tier?: string): CreditService {
  // Probarse ropa tiene su propio precio: BFL cobra por megapíxel y devuelve el coste real
  if (capability === 'image.try_on') return 'ai_tryon';
  const level = tier || (needsProImage(capability, input) ? 'max' : undefined);
  if (level === 'max') return 'ai_image_pro';
  if (level === 'standard') return isEditCapability(capability) ? 'ai_image_enhance_lite' : 'ai_image_lite';
  return isEditCapability(capability) ? 'ai_image_enhance' : 'ai_image';
}

/**
 * Coste oficial y Credits de una operación de imagen.
 *
 * Elige el modelo más barato capaz de hacer la tarea (engine/imageModels.ts),
 * salvo que se pase uno concreto porque la persona eligió una opción superior.
 * El precio depende siempre de tres cosas: modelo, resolución y cantidad.
 */
export function priceImage(input: ImagePriceInput, settings: EngineSettings): OperationPrice {
  const count = Math.max(1, Math.min(MAX_PROPUESTAS_POR_PASO, Number(input.count ?? 1)));
  const need = { capability: input.capability, kind: input.kind, quality: input.quality, resolution: input.resolution, references: input.references, resolutionFromEngine: input.resolutionFromEngine };
  const chosen = input.modelId && imageModelOf(input.modelId)
    ? { model: imageModelOf(input.modelId)!, size: (input.resolution as ImageSize) || '1K', tier: imageModelOf(input.modelId)!.tier, reason: 'lo eligió la persona' }
    : chooseImageModel(need, input.available);
  const edit = isEditCapability(input.capability);
  /*
   * LAS DIMENSIONES LAS DECIDE LA WEË RESOLUTION POLICY, y aquí solo se
   * consumen. Es la única forma de que el precio y lo que se acabe enviando al
   * proveedor no puedan discrepar: antes el precio razonaba con una etiqueta
   * ("1K") y cada adaptador decidía por su cuenta los píxeles de esa etiqueta.
   *
   * En una edición la proporción sale de la foto; al crear desde cero, de lo que
   * pida la operación. Si el modelo no tiene rejilla declarada todavía, se sigue
   * sin dimensiones y `usdFor` usa su nominal de siempre: nadie se rompe.
   */
  const plan = resolveForModel(chosen.model.modelId, {
    quality: chosen.tier,
    input: edit ? input.referenceSizes?.[0] : undefined,
    aspect: input.aspectRatio,
  });

  /*
   * Cuando se conocen las dimensiones de las imágenes de entrada se pasan tal
   * cual y el precio es exacto. Si no llegan, se usa la cota inferior de 1 MP por
   * referencia, que es el mínimo que factura el proveedor. Una edición cuenta
   * siempre al menos una entrada: la foto que se está editando.
   */
  const usdPerImage = usdFor(chosen.model, chosen.size, edit, {
    output: plan ? { width: plan.width, height: plan.height } : undefined,
    references: Math.max(input.references ?? 0, edit ? 1 : 0),
    referenceSizes: input.referenceSizes,
  });
  const discount = volumeFactor(count);
  /*
   * COSTE PROTEGIDO → SUELO → PRECIO BASE → DESCUENTO COMERCIAL → PRECIO FINAL
   *
   * El coste protegido es lo que cobra el proveedor por las imágenes, SIN el
   * descuento comercial de Weë: el proveedor no nos hace descuento por volumen,
   * así que restarlo del coste hundía el suelo por debajo del gasto real. Este es
   * además el coste que se guarda en el libro de generaciones.
   */
  const usd = count * usdPerImage;
  const floor = Math.ceil(usd * settings.creditsPerUsd);
  const service = imageServiceFor(input.capability, { kind: input.kind, quality: input.quality }, chosen.tier);
  // El descuento solo puede rebajar el precio mientras quede margen sobre el suelo
  const base = creditsOf(service, usd, settings);
  const credits = Math.max(floor, Math.round(base * discount));
  return {
    service,
    credits,
    usd,
    provider: chosen.model.provider,
    model: chosen.model.modelId,
    detail: {
      tier: chosen.tier,
      label: chosen.model.label,
      imageSize: chosen.size,
      count,
      usdPerImage,
      // Las dimensiones que decidió la política, para poder auditar el precio y
      // para que la FASE 2D-3 mande exactamente estas al proveedor.
      ...(plan ? { outputWidth: plan.width, outputHeight: plan.height, outputPixels: plan.pixels, aspectExact: plan.aspectExact, aboveTarget: plan.aboveTarget } : {}),
      costFloor: floor,
      creditsBeforeDiscount: base,
      volumeDiscount: discount < 1 ? Math.round((1 - discount) * 100) : 0,
      reason: chosen.reason,
      edit,
    },
  };
}
