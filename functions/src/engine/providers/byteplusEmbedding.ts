import { fetchJson, ProviderError, readImage, toDataUri } from '../http';
import { arkBase, arkHeaders, isArkConfigured } from './ark';

/**
 * EMBEDDINGS DE BYTEPLUS (Skylark-embedding-vision) vía ModelArk.
 *
 * Convierte un texto (o un texto con una imagen) en un vector de números para
 * buscar por significado: es la memoria de los personajes con IA. Usa la MISMA
 * puerta y la MISMA clave que Seedance y Seedream (`ark.ts`, ARK_API_KEY): pasar de
 * la cuenta personal de pruebas a la de empresa es cambiar el valor del secreto,
 * no el código.
 *
 * Contrato, leído en la documentación oficial (2026-11-22):
 *   docs.byteplus.com/en/docs/ModelArk/multimodal-vectorization-api
 *   docs.byteplus.com/en/docs/ModelArk/vectorization
 *
 *   POST {ARK_BASE_URL}/embeddings/multimodal
 *   { model, input: [{ type: 'text', text } | { type: 'image_url', image_url: { url } }],
 *     encoding_format: 'float', dimensions: 1024 | 2048, instructions? }
 *   → { data: { embedding: number[], object: 'embedding' }, usage: { prompt_tokens, total_tokens, ... } }
 *
 * Tres cosas del contrato que deciden el diseño:
 *   · TODO lo que va en `input` se vectoriza COMO UNA SOLA COSA. Para tener un
 *     vector por recuerdo hay que hacer una petición por recuerdo.
 *   · `model` admite el id del modelo o un id de punto de acceso (`ep-…`), que es
 *     lo que suele usar una cuenta de empresa para sus límites y su facturación.
 *   · `instructions` solo lo admiten skylark-embedding-vision-251215 y posteriores,
 *     y la documentación pide no usar el valor por defecto: una plantilla para la
 *     CONSULTA y otra para el DOCUMENTO guardado (búsqueda asimétrica).
 *
 * Texto: hasta 8 000 tokens por texto según la documentación; se recomienda no
 * pasar de 4 096. Aquí se corta por caracteres de forma conservadora.
 */

export const BYTEPLUS_EMBEDDING_PROVIDER = 'byteplus-embedding';

export type RolDeEmbedding = 'consulta' | 'documento';
export type DimensionesDeEmbedding = 1024 | 2048;

export interface ModeloDeEmbedding {
  id: string;
  /** Si acepta el campo `instructions` (251215 en adelante). */
  admiteInstrucciones: boolean;
  /** Dimensiones que admite. */
  dimensiones: DimensionesDeEmbedding[];
  nota?: string;
}

/** Modelos conocidos por la documentación. Un `ep-…` de empresa se trata como el modelo al que apunta (ver `admiteInstrucciones` en la configuración). */
export const MODELOS_DE_EMBEDDING_BYTEPLUS: ModeloDeEmbedding[] = [
  { id: 'skylark-embedding-vision-251215', admiteInstrucciones: true, dimensiones: [1024, 2048], nota: 'Admite instructions: mejor precisión según la documentación.' },
  { id: 'skylark-embedding-vision-250615', admiteInstrucciones: false, dimensiones: [1024, 2048], nota: 'Ejemplo de la referencia de la API; sin instructions.' },
];

/** Máximo de caracteres por texto que se manda (conservador frente a 8 000 tokens). */
export const MAX_CARACTERES_POR_TEXTO = 6000;

/**
 * Plantillas oficiales de `instructions` para búsqueda de texto (asimétrica):
 * la consulta dice qué se busca; el documento guardado usa la plantilla fija.
 * Literales tal cual la documentación; solo se rellena el hueco.
 */
export const plantillaDeInstrucciones = (rol: RolDeEmbedding, modalidadObjetivo = 'text'): string =>
  rol === 'consulta'
    ? `Target_modality: ${modalidadObjetivo}.\nInstruction:Generate an embedding for this sentence to retrieve related articles\nQuery:`
    : `Instruction:Compress the ${modalidadObjetivo} into one word.\nQuery:`;

export interface EntradaDeEmbedding {
  texto?: string;
  /** Imagen opcional (URL del Storage de Weë o `data:`). */
  imagenUrl?: string;
}

export interface PeticionDeEmbedding {
  entradas: EntradaDeEmbedding[];
  modelo: string;
  dimensiones: DimensionesDeEmbedding;
  rol: RolDeEmbedding;
  /** Si el modelo (o el `ep-…` de empresa) admite `instructions`. */
  admiteInstrucciones: boolean;
  timeoutMs?: number;
}

export interface ResultadoDeEmbedding {
  vectores: number[][];
  tokens: number;
  latenciaMs: number;
  modelo: string;
  /** Lo que informa BytePlus, tal cual, para contrastar con la factura. */
  usoDelProveedor: Record<string, unknown>[];
}

const recortarTexto = (t: string): string => Array.from(t.replace(/\s+/g, ' ').trim()).slice(0, MAX_CARACTERES_POR_TEXTO).join('');

export const byteplusEmbeddingAdapter = {
  id: BYTEPLUS_EMBEDDING_PROVIDER,
  name: 'BytePlus Skylark-embedding-vision',
  isConfigured: isArkConfigured,
  models: MODELOS_DE_EMBEDDING_BYTEPLUS,

  async embed(peticion: PeticionDeEmbedding): Promise<ResultadoDeEmbedding> {
    const inicio = Date.now();
    const headers = arkHeaders(BYTEPLUS_EMBEDDING_PROVIDER);
    const vectores: number[][] = []; const usoDelProveedor: Record<string, unknown>[] = []; let tokens = 0;
    for (const entrada of peticion.entradas) {
      const input: Record<string, unknown>[] = [];
      const texto = recortarTexto(String(entrada.texto ?? ''));
      if (texto) input.push({ type: 'text', text: texto });
      if (entrada.imagenUrl) {
        // La imagen viaja incrustada y se lee aquí, en el servidor (mismo motivo que en Seedream:
        // no depender de que el Storage sea alcanzable desde fuera).
        const url = entrada.imagenUrl.startsWith('data:') ? entrada.imagenUrl : toDataUri(await readImage(entrada.imagenUrl, BYTEPLUS_EMBEDDING_PROVIDER));
        input.push({ type: 'image_url', image_url: { url } });
      }
      if (!input.length) throw new ProviderError('byteplus-embedding: entrada vacía', BYTEPLUS_EMBEDDING_PROVIDER);
      const data = await fetchJson<any>(`${arkBase()}/embeddings/multimodal`, {
        provider: BYTEPLUS_EMBEDDING_PROVIDER,
        headers,
        timeoutMs: peticion.timeoutMs,
        body: {
          model: peticion.modelo,
          input,
          encoding_format: 'float',
          dimensions: peticion.dimensiones,
          ...(peticion.admiteInstrucciones ? { instructions: plantillaDeInstrucciones(peticion.rol, entrada.imagenUrl && texto ? 'text and image' : entrada.imagenUrl ? 'image' : 'text') } : {}),
        },
      });
      const v = data?.data?.embedding;
      if (!Array.isArray(v) || v.length !== peticion.dimensiones || !v.every((x: unknown) => typeof x === 'number' && Number.isFinite(x))) {
        throw new ProviderError(`byteplus-embedding: la respuesta no trajo un vector de ${peticion.dimensiones} números`, BYTEPLUS_EMBEDDING_PROVIDER);
      }
      vectores.push(v as number[]);
      if (data.usage) { usoDelProveedor.push(data.usage); tokens += Number(data.usage.total_tokens ?? data.usage.prompt_tokens ?? 0) || 0; }
    }
    return { vectores, tokens, latenciaMs: Date.now() - inicio, modelo: peticion.modelo, usoDelProveedor };
  },
};
