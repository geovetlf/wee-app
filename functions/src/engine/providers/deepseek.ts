import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, ProviderError, readImage, toDataUri } from '../http';
import { pideTextoPlano, SISTEMA_POR_DEFECTO } from '../promptLanguage';
import { sanitizeForLog } from '../sanitize';

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
 * ── FICHEROS (lectura de documentos) ─────────────────────────────────────────
 *
 * api-docs.deepseek.com/guides/document_parsing y /files_api (leídas el 2026-11-18). Un documento NO viaja en el chat:
 * se sube a `POST /files` (multipart; `purpose` y `expires_after[*]` ANTES de `file`, si no, 400), la respuesta llega
 * cuando ya está parseado con un `id` (`file-api-…`), y el chat lo referencia solo por ese id. `DELETE /files/{id}` lo
 * borra; ni el original ni el resultado se pueden descargar.
 *
 *   text_recognition          PDF, DOC/DOCX, PPT/PPTX e imágenes: solo el texto (el que usa Weë por defecto).
 *   rich_layout_recognition   además recorta figuras y gráficos: más caro y lento, NO se usa por defecto.
 *   user_data                 TXT/MD/CSV/JSON/XLSX y EPUB/MOBI: se convierten a Markdown en la subida, sin facturar.
 */
const FILES_API = 'https://api.deepseek.com/files';
export type PropositoDeFichero = 'text_recognition' | 'rich_layout_recognition' | 'user_data';

/** USD por 1 000 páginas parseadas, solo si el parseo tiene éxito (api-docs.deepseek.com/quick_start/pricing). */
export const PARSEO_USD_POR_MIL_PAGINAS = 0.225;
/** Límites oficiales por documento. */
export const LIMITES_DE_FICHEROS = Object.freeze({
  bytesPdfWordPpt: 100 * 1024 * 1024,
  bytesTextoEbook: 32 * 1024 * 1024,
  paginas: 1000,
  textoExtraidoBytes: 8 * 1024 * 1024,
});
/** Expiración que se le pide al subir: el fichero se borra además explícitamente en cuanto se lee. */
export const EXPIRACION_DE_FICHERO_SEG = 3600;

const FICHERO_VALIDO = /^file-api-[A-Za-z0-9_-]{4,100}$/;
const ESTADOS_PASAJEROS = new Set([408, 429, 500, 503, 504]);

const errorDeFicheros = (accion: string, estado: number): ProviderError =>
  new ProviderError(`deepseek: ${accion} fallo con estado ${estado}`, 'deepseek', estado, ESTADOS_PASAJEROS.has(estado));

type Fetch = typeof fetch;

/**
 * Sube un documento y devuelve su id cuando DeepSeek ya lo parseó. El contenido nunca se registra: solo el estado.
 * `fetchImpl` existe para las pruebas (simular el adaptador sin red).
 */
export async function subirFicheroDeepseek(
  archivo: { buffer: Buffer; nombre: string; mime: string; proposito: PropositoDeFichero; expiraEnSeg?: number },
  fetchImpl: Fetch = fetch,
): Promise<{ id: string }> {
  const apiKey = env(KEY);
  if (!apiKey) throw new NotConfiguredError('deepseek', KEY);
  const form = new FormData();
  /* El orden importa: todo lo que no es el fichero va ANTES de `file`. */
  form.append('purpose', archivo.proposito);
  form.append('expires_after[anchor]', 'created_at');
  form.append('expires_after[seconds]', String(Math.min(2_592_000, Math.max(3600, archivo.expiraEnSeg ?? EXPIRACION_DE_FICHERO_SEG))));
  form.append('file', new Blob([new Uint8Array(archivo.buffer)], { type: archivo.mime }), archivo.nombre);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 125_000);
  try {
    const response = await fetchImpl(FILES_API, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: controller.signal });
    if (!response.ok) throw errorDeFicheros('la subida', response.status);
    const data = (await response.json().catch(() => ({}))) as { id?: unknown };
    if (typeof data.id !== 'string' || !FICHERO_VALIDO.test(data.id)) throw new ProviderError('deepseek: la subida no devolvio un id valido', 'deepseek', undefined, false);
    return { id: data.id };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`deepseek: la subida no se completo (${sanitizeForLog(error, 120)})`, 'deepseek', undefined, true);
  } finally {
    clearTimeout(timer);
  }
}

/** Borra el fichero. Nunca lanza: quien lo llama ya tiene lo que necesitaba y la expiración corta es el seguro. */
export async function borrarFicheroDeepseek(id: string, fetchImpl: Fetch = fetch): Promise<boolean> {
  const apiKey = env(KEY);
  if (!apiKey || !FICHERO_VALIDO.test(id)) return false;
  try {
    const response = await fetchImpl(`${FILES_API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${apiKey}` } });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * EL TECHO DE USD DE LEER UN DOCUMENTO (no el promedio: el precio se enseña antes y no sube después). Parseo por página
 * solo si el formato se parsea (`paginasParseadas` > 0), entrada y salida con la tarifa CARA.
 */
export const techoDeLecturaDeDocumento = (v: { paginasParseadas: number; tokensEntrada: number; tokensSalida: number }): number =>
  (Math.max(0, v.paginasParseadas) / 1000) * PARSEO_USD_POR_MIL_PAGINAS +
  (Math.max(0, v.tokensEntrada) * TARIFA_PEAK.input + Math.max(0, v.tokensSalida) * TARIFA_PEAK.output) / 1_000_000;

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
    const wantJson = !pideTextoPlano(input) && capability === 'text.structure';
    const system = String(input.system ?? SISTEMA_POR_DEFECTO);
    const anterior = loQueEscribieronAntes(input.upstream);
    const prompt = [String(input.prompt ?? input.purpose ?? ''), anterior].filter(Boolean).join('\n\n');

    const urls = [
      ...(input.imageUrl ? [String(input.imageUrl)] : []),
      ...(Array.isArray(input.imageUrls) ? input.imageUrls.map(String) : []),
    ];
    const imagenes = urls.length ? await partesDeImagen(urls) : [];
    /* Sin fotos, el mensaje es texto plano: no se le cambia la forma sin motivo. */
    /* Un documento ya subido se referencia SOLO por su id (`documentFileId`); el texto va después, y el id debe tener la forma oficial. */
    const ficheroId = typeof input.documentFileId === 'string' ? input.documentFileId : '';
    if (ficheroId && !FICHERO_VALIDO.test(ficheroId)) throw new ProviderError('deepseek: el id del documento no es valido', 'deepseek', 400, false);
    const contenido = ficheroId
      ? [{ type: 'file', file_id: ficheroId }, { type: 'text', text: prompt || 'Hola' }, ...imagenes]
      : imagenes.length
        ? [{ type: 'text', text: prompt || 'Hola' }, ...imagenes]
        : prompt;

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
    /*
     * ── POR QUÉ EL DESENLACE SE GUARDA Y EL VACÍO SE RECHAZA ────────────────────────
     *
     * En un canary de Weë Brain esta API contestó con `content` vacío habiendo
     * gastado los 1.400 tokens de salida enteros. Sin `finish_reason` no hay forma
     * de saber si la cortaron por el techo, si decidió no escribir nada o si se
     * negó, y cada una de las tres pide algo distinto. Lo devuelve la API en cada
     * respuesta y aquí se tiraba, así que ahora viaja en `meta`, que es el canal que
     * ya existía para esto y que el Router ya guarda en el libro.
     *
     * Y una respuesta vacía deja de pasar por buena. Pasaba: el Router cerraba la
     * fila COMPLETED, ascendía al proveedor a verificado y se cobraba el Credit, todo
     * por un texto que no existía. Gemini ya lo rechazaba desde su primer día; esto
     * es la misma regla en el otro adaptador, no una nueva.
     */
    const finishReason = data.choices?.[0]?.finish_reason;
    /*
     * ── LOS CONTADORES SE LEEN ANTES DE RECHAZAR, NO DESPUÉS ──────────────────────
     *
     * Cuando una respuesta se corta, lo primero que hace falta saber es CUÁNTO
     * gastó, y hasta ahora se tiraba: las guardas de abajo lanzaban antes de que
     * nadie mirara `usage`, así que una llamada truncada no dejaba ni un número.
     * El dato ya venía en la respuesta; solo estaba leyendo dos líneas más tarde.
     *
     * Se apunta lo que el proveedor da y nada más: si falta un contador, no se
     * inventa. Lo que significan esos `completion_tokens` —y por qué una petición
     * gasta más que otra— no se decide aquí: aquí solo se anota lo observado.
     */
    const usage = (data.usage ?? {}) as Record<string, unknown>;
    const contados = (['prompt_tokens', 'completion_tokens', 'total_tokens'] as const)
      .filter((k) => typeof usage[k] === 'number')
      .map((k) => `${k}: ${usage[k]}`);
    const gasto = contados.length ? `, ${contados.join(', ')}` : '';
    /*
     * ── Y UNA RESPUESTA CORTADA TAMPOCO ES UNA RESPUESTA ──────────────────────────
     *
     * El mismo canary, otra vez, con otra ropa: el modelo compuso bien los tres
     * pasos y se quedó sin techo mientras escribía el tercero. Llegó un JSON sin
     * cerrar, que NO está vacío, así que la guarda de arriba no lo veía: pasaba
     * por bueno, `JSON.parse` fallaba en silencio y el entendimiento se rellenaba
     * con señales. Un plan degradado, y cobrado.
     *
     * Manda el MOTIVO DE TERMINACIÓN, no la forma del texto. Si la API dice
     * que cortó por el techo, da igual que lo escrito hasta ahí resulte parsear:
     * falta lo que no llegó a escribir. Aquí no se repara nada ni se adivina el
     * final; se dice que no hubo respuesta y quien llamó decide.
     */
    if (finishReason === 'length') {
      throw new ProviderError(
        `deepseek: la respuesta se cortó por el techo de tokens (finish_reason: length${gasto})`,
        'deepseek',
      );
    }
    if (!content) {
      throw new ProviderError(
        `deepseek: la respuesta llegó vacía${finishReason ? ` (finish_reason: ${finishReason}${gasto})` : gasto ? ` (${gasto.slice(2)})` : ''}`,
        'deepseek',
      );
    }
    const inputTokens = Number(usage.prompt_tokens ?? 0);
    const outputTokens = Number(usage.completion_tokens ?? 0);
    /* El coste que se apunta en el libro es el de verdad: tokens reales por la tarifa de esta hora. */
    const tarifa = tarifaVigente();
    return {
      output: { kind: 'text', content },
      usage: { inputTokens, outputTokens },
      costUSD: (inputTokens * tarifa.input + outputTokens * tarifa.output) / 1_000_000,
      latencyMs: Date.now() - start,
      model: model.id,
      /* Aditivo: no cambia salida, uso ni coste. Si la API no lo manda, no se inventa. */
      ...(finishReason ? { meta: { finishReason } } : {}),
    };
  },
};
