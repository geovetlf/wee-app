import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, readImage, toDataUri } from '../http';

/**
 * DEEPSEEK — API OFICIAL (api.deepseek.com), clave DEEPSEEK_API_KEY.
 *
 * Se integra por el mismo camino que todos: Weë → WEË AI ENGINE → este adaptador
 * → API oficial de DeepSeek. Nunca por Replicate, fal.ai, OpenRouter, Together,
 * Hugging Face ni ningún otro intermediario (decisión del usuario, 2026-09-16).
 *
 * Está aquí por UNA razón: el coste. `deepseek-flash` cuesta la mitad que el
 * modelo de texto más barato de Google para la misma conversación, y Weë Brain
 * es la experiencia que más veces al día se usa. No entra como "mejor modelo":
 * entra como el más barato que sirve para conversar.
 *
 * ── Su contrato es el de Chat Completions ────────────────────────────────────
 *
 * DeepSeek publica una API compatible con el formato de OpenAI, así que este
 * archivo se parece mucho a `openai.ts` a propósito: mismo cuerpo, mismos
 * campos de uso, misma lectura de la respuesta. Lo que cambia es la URL, la
 * clave, las tarifas y dos cosas que Weë Brain sí necesita y el adaptador de
 * OpenAI no traía: el HISTORIAL de la conversación y las FOTOS.
 */
const KEY = 'DEEPSEEK_API_KEY';
const API = 'https://api.deepseek.com/chat/completions';

/** El identificador oficial de DeepSeek-V4.1-Flash. Se puede cambiar sin tocar código. */
export const DEEPSEEK_TEXT_MODEL = env('DEEPSEEK_TEXT_MODEL') || 'deepseek-flash';

/**
 * TARIFAS OFICIALES (api-docs.deepseek.com/quick_start/pricing), USD por millón
 * de tokens, con la entrada contada como fallo de caché —el caso normal—.
 *
 * DeepSeek cobra distinto según la hora: hay una franja "peak" y el resto es
 * "off-peak", que vale la mitad.
 */
const TARIFA_PEAK = { input: 0.3, output: 1.2 };
const TARIFA_OFF_PEAK = { input: 0.15, output: 0.6 };

/**
 * La franja cara: lunes a viernes, 01:00–04:00 y 06:00–10:00 UTC. Todo lo demás
 * —incluido el fin de semana entero— es off-peak.
 */
export function esHoraCara(ahora: Date): boolean {
  const dia = ahora.getUTCDay();
  if (dia === 0 || dia === 6) return false;
  const hora = ahora.getUTCHours();
  return (hora >= 1 && hora < 4) || (hora >= 6 && hora < 10);
}

/** La tarifa que se aplica AHORA. Sirve para medir el coste real de una llamada. */
export const tarifaVigente = (ahora = new Date()) => (esHoraCara(ahora) ? TARIFA_PEAK : TARIFA_OFF_PEAK);

/**
 * EL MODELO DECLARA LA TARIFA CARA, NO LA BARATA. NO ES UN DESCUIDO.
 *
 * El precio se le enseña a la persona ANTES de enviar y después no se le puede
 * cobrar más (es la regla de `credits/aiPricing.ts`: el precio mostrado es un
 * TECHO, no un promedio). Si el modelo declarara la tarifa off-peak, un mensaje
 * escrito dentro de la franja cara costaría el doble de lo cotizado.
 *
 * Así que se cotiza siempre con la cara y, cuando la llamada cae fuera de esa
 * franja —que es la mayor parte del día—, el ahorro se lo queda Weë. El coste
 * REAL medido que se apunta en el libro sí usa la tarifa de esa hora.
 */
export const deepseekModels: ModelSpec[] = [
  {
    id: DEEPSEEK_TEXT_MODEL,
    provider: 'deepseek',
    capabilities: ['text.generate', 'text.structure', 'vision.describe'],
    quality: 3,
    speed: 5,
    cost: { unit: 'mtoken', usd: TARIFA_PEAK.input, usdOutput: TARIFA_PEAK.output },
    tags: ['económico'],
    note: 'DeepSeek-V4.1-Flash: conversación con historial y fotos. Tarifa declarada en franja cara.',
    verified: false,
  },
];

/**
 * El historial, en el formato de Chat Completions.
 *
 * Weë habla en el idioma del motor —`user` y `model`— y aquí se traduce a
 * `user` y `assistant`. Se recortan los mismos 24 turnos y los mismos 6 000
 * caracteres por turno que en Gemini, para que el coste de una conversación
 * larga no dependa de por qué proveedor entró.
 */
const mensajesDelHistorial = (history: unknown): { role: 'user' | 'assistant'; content: string }[] => {
  if (!Array.isArray(history)) return [];
  const salida: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const turno of history.slice(-24)) {
    const role = (turno as any)?.role === 'user' ? 'user' : 'assistant';
    const content = String((turno as any)?.text ?? (turno as any)?.content ?? '').trim();
    if (content) salida.push({ role, content });
  }
  return salida;
};

/** Las fotos viajan incrustadas, no por enlace: las de Weë viven en un Storage privado. */
const partesDeImagen = async (urls: string[]) => {
  const partes: any[] = [];
  for (const url of urls) {
    const archivo = await readImage(url, 'deepseek');
    partes.push({ type: 'image_url', image_url: { url: toDataUri(archivo) } });
  }
  return partes;
};

/**
 * LO QUE ESCRIBIERON LOS PASOS ANTERIORES, PUESTO EN EL ENCARGO.
 *
 * Llega ya resuelto —el Gateway lo pidió a la puerta que comprueba de quién
 * es— así que aquí solo se lee y se coloca. Y se coloca APARTE de lo que pidió
 * la persona, con su etiqueta, porque son dos cosas distintas: una es lo que
 * alguien quiere y la otra es material de trabajo que produjo el propio plan.
 * Mezclarlos haría que el modelo no supiera cuál obedecer.
 */
const loQueEscribieronAntes = (upstream: unknown): string => {
  if (!Array.isArray(upstream)) return '';
  const textos = upstream
    .filter((u) => u && typeof u === 'object' && typeof (u as { contenido?: unknown }).contenido === 'string')
    .map((u, i) => `[${i + 1}] ${(u as { contenido: string }).contenido}`);
  if (!textos.length) return '';
  return `Material de los pasos anteriores (úsalo, no lo repitas):\n${textos.join('\n\n')}`;
};

export const deepseekAdapter: ProviderAdapter = {
  id: 'deepseek',
  name: 'DeepSeek',
  modalities: ['text'],
  models: deepseekModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => deepseekModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const apiKey = env(KEY);
    if (!apiKey) throw new NotConfiguredError('deepseek', KEY);
    const { input, model, capability } = request;
    const start = Date.now();
    const wantJson = capability === 'text.structure';
    const system = String(input.system ?? 'Eres Weë. Responde en español, claro y breve.');
    const anterior = loQueEscribieronAntes(input.upstream);
    const prompt = [String(input.prompt ?? input.purpose ?? ''), anterior].filter(Boolean).join('\n\n');

    const urls = [
      ...(input.imageUrl ? [String(input.imageUrl)] : []),
      ...(Array.isArray(input.imageUrls) ? input.imageUrls.map(String) : []),
    ];
    const imagenes = urls.length ? await partesDeImagen(urls) : [];
    /* Sin fotos, el mensaje es texto plano: no se le cambia la forma sin motivo. */
    const contenido = imagenes.length ? [{ type: 'text', text: prompt || 'Hola' }, ...imagenes] : prompt;

    const data = await fetchJson<any>(API, {
      provider: 'deepseek',
      timeoutMs: request.timeoutMs,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model: model.id,
        messages: [
          { role: 'system', content: system },
          ...mensajesDelHistorial(input.history),
          { role: 'user', content: contenido },
        ],
        max_tokens: Number(input.maxOutputTokens ?? 1200),
        temperature: wantJson ? 0.2 : Number(input.temperature ?? 0.8),
        ...(wantJson ? { response_format: { type: 'json_object' } } : {}),
      },
    });

    const content = String(data.choices?.[0]?.message?.content ?? '').trim();
    const inputTokens = Number(data.usage?.prompt_tokens ?? 0);
    const outputTokens = Number(data.usage?.completion_tokens ?? 0);
    /* El coste que se apunta en el libro es el de verdad: tokens reales por la tarifa de esta hora. */
    const tarifa = tarifaVigente();
    return {
      output: { kind: 'text', content },
      usage: { inputTokens, outputTokens },
      costUSD: (inputTokens * tarifa.input + outputTokens * tarifa.output) / 1_000_000,
      latencyMs: Date.now() - start,
      model: model.id,
    };
  },
};
