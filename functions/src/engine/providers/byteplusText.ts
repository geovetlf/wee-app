import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, ProviderError } from '../http';
import { EngineError } from '../errors';
import { SISTEMA_POR_DEFECTO } from '../promptLanguage';
import { providerLog } from '../sanitize';
import { ARK_KEY, arkBase, arkHeaders, isArkConfigured } from './ark';

/**
 * TEXTO DE BYTEPLUS (familia Seed) vía ModelArk — Chat API.
 *
 * Misma puerta y misma clave que Seedance, Seedream y los embeddings (`ark.ts`,
 * ARK_API_KEY / ARK_BASE_URL): pasar de la cuenta personal de pruebas a la de
 * empresa es cambiar el valor del secreto, no el código.
 *
 * NO ESTÁ EN NINGUNA CADENA POR DEFECTO y su proveedor nace DESACTIVADO
 * (`DEFAULT_PROVIDERS['byteplus-text']`). Se enciende solo desde Firestore
 * (docs/AI-ENGINE.md § «BytePlus como texto», docs/AUTONOMIA.md). La cadena de
 * `text.generate` no cambia: también la usa Weë Brain.
 *
 * ── Contrato, leído en la documentación oficial (2026-11-23) ──────────────────
 *   docs.byteplus.com/en/docs/ModelArk/Chat                 (Chat API)
 *   docs.byteplus.com/api/docs/ModelArk/1330626             (compatible con OpenAI)
 *   docs.byteplus.com/api/docs/ModelArk/1585128             (Chat API vs Responses API)
 *   docs.byteplus.com/docs/modelark/model-pricing           (modelos y precios)
 *
 *   POST {ARK_BASE_URL}/chat/completions      Authorization: Bearer ARK_API_KEY
 *   { model, messages: [{ role: 'system'|'user'|'assistant', content }],
 *     max_tokens | max_completion_tokens, temperature, thinking: { type: 'enabled'|'disabled' } }
 *   → { choices: [{ message: { content, reasoning_content? }, finish_reason: 'stop'|'length'|'content_filter' }],
 *       usage: { prompt_tokens, completion_tokens, total_tokens, completion_tokens_details: { reasoning_tokens } } }
 *
 * Lo que decide el diseño:
 *   · `max_tokens` (por defecto 4096) limita la RESPUESTA; `max_completion_tokens` (0–64k) limita respuesta +
 *     razonamiento. No se pueden mandar los dos a la vez (error). Aquí: razonamiento apagado → `max_tokens`;
 *     encendido a propósito → `max_completion_tokens`, para que el techo cubra también lo que piensa.
 *   · `thinking` se APAGA por defecto: los personajes conversan, no resuelven problemas, y el razonamiento se
 *     factura como salida (`completion_tokens_details.reasoning_tokens`).
 *   · `model` admite el id del modelo o un punto de acceso de empresa (`ep-…`), que es lo que ARK_TEXT_MODEL
 *     puede traer.
 *   · `finish_reason: 'length'` es una respuesta cortada y `content_filter` una respuesta interceptada por la
 *     moderación del proveedor: ninguna de las dos pasa por buena (misma regla que `deepseek.ts`).
 *
 * [VERIFICAR] en la consola de BytePlus antes de encenderlo: la versión exacta de cada modelo (el aviso de
 * retirada de modelos menciona 260228/260215 y la página de precios 260428), su ventana de contexto y si la
 * cuenta los tiene activados.
 */

export const BYTEPLUS_TEXT_PROVIDER = 'byteplus-text';

/** Equilibrado: Seed 2.0 Lite. */
export const SEED_TEXT_LITE = 'seed-2-0-lite-260428';
/** Económico: Seed 2.0 Mini. */
export const SEED_TEXT_MINI = 'seed-2-0-mini-260428';

/** El modelo por defecto (equilibrado). Cambiable sin tocar código: ARK_TEXT_MODEL (id o `ep-…`). */
export const ARK_TEXT_MODEL = env('ARK_TEXT_MODEL') || SEED_TEXT_LITE;

/**
 * TARIFA OFICIAL: NULL HASTA CONFIRMARLA (regla 6: nunca inventar precios).
 *
 * La página de precios de ModelArk muestra varias filas para los mismos modelos sin decir a qué región o
 * cuenta corresponde cada una, así que no se copia ninguna. Mientras sea `null`:
 *   · el modelo declara `cost` 0 en el catálogo — que significa DESCONOCIDO, no gratis —, y no está en ninguna
 *     cadena por defecto, así que no puede ganarle a nadie por precio sin que alguien lo pida en Firestore;
 *   · el resultado devuelve `costUSD: 0` y `meta.tarifaPendiente: true`, con los tokens reales en `usage`: el
 *     libro (`aiGenerations`) guarda lo medido y el coste se puede recalcular cuando haya tarifa;
 *   · el proveedor lleva un tope de llamadas diario por defecto (`DEFAULT_PROVIDERS`).
 * Cuando haya tarifa confirmada: ponerla aquí (USD por millón, entrada/salida) o en
 * `aiProviders/byteplus-text.models[id].cost`, y el coste medido sale solo.
 */
export const TARIFAS_OFICIALES_BYTEPLUS_TEXTO: Readonly<Record<string, { input: number; output: number } | null>> = Object.freeze({
  [SEED_TEXT_LITE]: null,
  [SEED_TEXT_MINI]: null,
});

/** Límites de tamaño (mismos que DeepSeek y Gemini para el historial: el coste no depende del proveedor). */
export const LIMITES_BYTEPLUS_TEXTO = Object.freeze({
  turnosDeHistorial: 24,
  caracteresPorTurno: 6_000,
  caracteresDelSistema: 12_000,
  caracteresDelPrompt: 24_000,
  maxTokensSalida: 4_096,
  maxTokensConRazonamiento: 16_000,
});

const SIN_TARIFA = { unit: 'mtoken' as const, usd: 0, usdOutput: 0 };

const modelo = (id: string, quality: ModelSpec['quality'], speed: ModelSpec['speed'], note: string): ModelSpec => ({
  id,
  provider: BYTEPLUS_TEXT_PROVIDER,
  capabilities: ['text.generate'],
  quality,
  speed,
  cost: SIN_TARIFA,
  tags: ['byteplus', 'sin-tarifa'],
  note,
  verified: false,
});

/** Los modelos que el router puede elegir. Un `ep-…` de ARK_TEXT_MODEL entra como uno más. */
export const byteplusTextModels: ModelSpec[] = [
  modelo(SEED_TEXT_LITE, 3, 4, 'Seed 2.0 Lite: equilibrado para conversar. Tarifa sin confirmar.'),
  modelo(SEED_TEXT_MINI, 2, 5, 'Seed 2.0 Mini: el económico. Tarifa sin confirmar.'),
  ...(ARK_TEXT_MODEL !== SEED_TEXT_LITE && ARK_TEXT_MODEL !== SEED_TEXT_MINI
    ? [modelo(ARK_TEXT_MODEL, 3, 4, 'Modelo o punto de acceso fijado en ARK_TEXT_MODEL. Tarifa sin confirmar.')]
    : []),
];

const recortar = (texto: string, max: number): string => {
  const limpio = texto.trim();
  const letras = Array.from(limpio);
  return letras.length > max ? letras.slice(0, max).join('') : limpio;
};

/** El historial del motor (`user` / `model`) en el formato de la Chat API (`user` / `assistant`). */
export const mensajesDelHistorial = (history: unknown): { role: 'user' | 'assistant'; content: string }[] => {
  if (!Array.isArray(history)) return [];
  const salida: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const turno of history.slice(-LIMITES_BYTEPLUS_TEXTO.turnosDeHistorial)) {
    const role = (turno as { role?: unknown })?.role === 'user' ? 'user' : 'assistant';
    const content = recortar(String((turno as { text?: unknown })?.text ?? (turno as { content?: unknown })?.content ?? ''), LIMITES_BYTEPLUS_TEXTO.caracteresPorTurno);
    if (content) salida.push({ role, content });
  }
  return salida;
};

/** El cuerpo de la petición. Exportado para las pruebas del contrato. */
export function cuerpoDeLaPeticion(modelId: string, input: Record<string, unknown>): Record<string, unknown> {
  const system = recortar(String(input.system ?? SISTEMA_POR_DEFECTO), LIMITES_BYTEPLUS_TEXTO.caracteresDelSistema);
  const prompt = recortar(String(input.prompt ?? input.purpose ?? ''), LIMITES_BYTEPLUS_TEXTO.caracteresDelPrompt);
  const historial = mensajesDelHistorial(input.history);
  if (!prompt && !historial.length) throw new EngineError('INVALID_REQUEST', 'Falta el texto que hay que responder.', { field: 'prompt' });
  const razonar = input.thinking === true;
  const pedidos = Number(input.maxOutputTokens);
  const techo = razonar ? LIMITES_BYTEPLUS_TEXTO.maxTokensConRazonamiento : LIMITES_BYTEPLUS_TEXTO.maxTokensSalida;
  const tokens = Number.isFinite(pedidos) && pedidos > 0 ? Math.min(Math.round(pedidos), techo) : razonar ? 4_000 : 1_200;
  const temperatura = Number(input.temperature);
  return {
    model: modelId,
    messages: [
      { role: 'system', content: system },
      ...historial,
      ...(prompt ? [{ role: 'user', content: prompt }] : []),
    ],
    ...(razonar ? { max_completion_tokens: tokens } : { max_tokens: tokens }),
    temperature: Number.isFinite(temperatura) ? Math.min(2, Math.max(0, temperatura)) : 0.8,
    thinking: { type: razonar ? 'enabled' : 'disabled' },
  };
}

/**
 * La tarifa con la que se mide el coste: la oficial de este archivo o, si la administración la puso en
 * `aiProviders/byteplus-text.models[id].cost` (el router ya la aplica al modelo que llega), esa. Si ninguna, null.
 */
export const tarifaDe = (model: Pick<ModelSpec, 'id' | 'cost'>): { input: number; output: number } | null => {
  const oficial = TARIFAS_OFICIALES_BYTEPLUS_TEXTO[model.id];
  if (oficial) return oficial;
  const c = model.cost;
  return c?.unit === 'mtoken' && c.usd > 0 ? { input: c.usd, output: c.usdOutput ?? c.usd } : null;
};

export const byteplusTextAdapter: ProviderAdapter = {
  id: BYTEPLUS_TEXT_PROVIDER,
  name: 'BytePlus Seed (texto)',
  modalities: ['text'],
  models: byteplusTextModels,
  isConfigured: isArkConfigured,
  supports: (capability) => byteplusTextModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    if (!isArkConfigured()) throw new NotConfiguredError(BYTEPLUS_TEXT_PROVIDER, ARK_KEY);
    const start = Date.now();
    const body = cuerpoDeLaPeticion(request.model.id, request.input);
    const data = await fetchJson<any>(`${arkBase()}/chat/completions`, {
      provider: BYTEPLUS_TEXT_PROVIDER,
      headers: arkHeaders(BYTEPLUS_TEXT_PROVIDER),
      timeoutMs: request.timeoutMs,
      body,
    });

    const choice = data?.choices?.[0];
    const finishReason: string | undefined = typeof choice?.finish_reason === 'string' ? choice.finish_reason : undefined;
    const usage = (data?.usage ?? {}) as Record<string, any>;
    const inputTokens = Number(usage.prompt_tokens ?? 0) || 0;
    const outputTokens = Number(usage.completion_tokens ?? 0) || 0;
    const reasoningTokens = Number(usage.completion_tokens_details?.reasoning_tokens ?? 0) || 0;
    const gasto = `prompt_tokens: ${inputTokens}, completion_tokens: ${outputTokens}`;

    if (finishReason === 'content_filter') {
      console.warn(providerLog({ provider: BYTEPLUS_TEXT_PROVIDER, model: request.model.id, requestId: request.ctx.requestId, code: 'content_filter', message: 'respuesta interceptada por el filtro de contenido del proveedor' }));
      throw new ProviderError(`${BYTEPLUS_TEXT_PROVIDER}: el filtro de contenido del proveedor interceptó la respuesta (finish_reason: content_filter, ${gasto})`, BYTEPLUS_TEXT_PROVIDER, undefined, false);
    }
    if (finishReason === 'length') {
      throw new ProviderError(`${BYTEPLUS_TEXT_PROVIDER}: la respuesta se cortó por el techo de tokens (finish_reason: length, ${gasto})`, BYTEPLUS_TEXT_PROVIDER);
    }
    const content = String(choice?.message?.content ?? '').trim();
    if (!content) {
      throw new ProviderError(`${BYTEPLUS_TEXT_PROVIDER}: la respuesta llegó vacía${finishReason ? ` (finish_reason: ${finishReason}, ${gasto})` : ` (${gasto})`}`, BYTEPLUS_TEXT_PROVIDER);
    }

    const tarifa = tarifaDe(request.model);
    return {
      output: { kind: 'text', content },
      usage: { inputTokens, outputTokens, ...(reasoningTokens ? { reasoningTokens } : {}) },
      // Coste del proveedor, separado de los Credits: medido con la tarifa oficial, o 0 + `tarifaPendiente` si aún no la hay.
      costUSD: tarifa ? (inputTokens * tarifa.input + outputTokens * tarifa.output) / 1_000_000 : 0,
      latencyMs: Date.now() - start,
      model: request.model.id,
      meta: {
        ...(finishReason ? { finishReason } : {}),
        ...(tarifa ? {} : { tarifaPendiente: true }),
        ...(typeof data?.model === 'string' ? { modeloDelProveedor: data.model } : {}),
      },
    };
  },
};
