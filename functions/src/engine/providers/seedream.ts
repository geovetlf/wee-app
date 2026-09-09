import { CapabilityId } from '../../creator/types';
import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { fetchJson, persistRemoteFile, ProviderError, readImage, toDataUri } from '../http';
import { arkBase, arkHeaders, isArkConfigured } from './ark';
import { aspectOf, nearestAspectLabel } from '../resolutionPolicy';

/** Proporción de las medidas que resolvió el motor, si es una que Seedream sirve. */
const aspectFromOutput = (input: Record<string, unknown>): string | undefined => {
  const width = Number(input.outputWidth);
  const height = Number(input.outputHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  return nearestAspectLabel(aspectOf(width, height));
};

/**
 * ByteDance Seedream (imagen) vía BytePlus ModelArk.
 * Contrato: POST /images/generations → data[].url, verificado con una llamada real
 * del 5.0 lite.
 *
 * Tarifas por imagen confirmadas en la tabla oficial de precios
 * (docs.byteplus.com/en/docs/ModelArk/1544106, consultada el 2026-09-07):
 * 5.0 pro 0.045 hasta 2,61 millones de píxeles y 0.09 por encima · 5.0 lite 0.035 ·
 * 4.5 0.04 · 4.0 0.030. La imagen de entrada no se cobra en ninguno de ellos.
 */
/**
 * Lo que Seedream sabe hacer. Editar con instrucciones es UNA sola operación
 * (imagen de entrada + prompt), así que quitar el fondo, quitar un objeto y
 * restilar un espacio son la misma llamada con distinto prompt: se declaran.
 * NO se declara image.identity_edit (no conserva el rostro de forma fiable, por
 * eso la escalera lo marca keepsIdentity: false) ni image.upscale (sin soporte
 * oficial). Declarar de menos dejaba estas capacidades sin ruta real.
 */
const SEEDREAM_CAPS: CapabilityId[] = ['image.generate', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.space_restyle', 'image.reference'];

export const seedreamModels: ModelSpec[] = [
  { id: 'dola-seedream-5-0-pro-260628', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 5, speed: 3, cost: { unit: 'image', usd: 0.045 }, tags: ['máxima calidad', 'capas editables'], note: 'Admite layer_decomposition: devuelve el diseño separado en capas.', verified: false },
  { id: 'seedream-5-0-lite-260128', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 4, speed: 5, cost: { unit: 'image', usd: 0.035 }, tags: ['económico'], verified: false },
  { id: 'seedream-4-5-251128', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, verified: false },
  { id: 'seedream-4-0-250828', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 3, speed: 4, cost: { unit: 'image', usd: 0.03 }, tags: ['legado'], verified: false },
];

/**
 * Alfa transparente (parámetro `background: 'transparent'`). La documentación lo
 * limita a UN modelo: "Supported model: Seedream 5.0 pro"
 * (docs.byteplus.com/en/docs/ModelArk/1541523, campo `background`). Ni el 5.0 lite,
 * ni el 4.5, ni el 4.0 lo admiten.
 *
 * Antes se comprobaba con modelId.includes('seedream-5-0'), que también daba
 * verdadero para el lite: se le habría mandado un parámetro que no admite. Se
 * declara modelo por modelo para que añadir uno nuevo no lo herede por el nombre.
 */
const ALPHA_MODELS = new Set(['dola-seedream-5-0-pro-260628']);
export const supportsAlpha = (modelId: string): boolean => ALPHA_MODELS.has(modelId);

/**
 * Dimensiones por proporción, POR FAMILIA DE MODELO y por nivel de resolución.
 *
 * El mínimo de píxeles totales NO es el mismo en todos los Seedream
 * (docs.byteplus.com/en/docs/ModelArk/1541523, campo `size`):
 *
 *   Seedream 4.0        entre     921 600 y 16 777 216 → sí llega a 1K
 *   Seedream 5.0 lite   entre   3 686 400 y 16 777 216 → empieza en 2K
 *   Seedream 4.5        entre   3 686 400 y 16 777 216 → empieza en 2K
 *
 * En todos, la proporción tiene que quedar entre 1/16 y 16, y las dos condiciones
 * se cumplen a la vez. El campo viaja como cadena "<ancho>x<alto>". Tratarlos como
 * una sola familia era lo que obligaba a entregar 2K siempre.
 *
 * Todas las medidas son múltiplos de 16, con la proporción exacta y con holgura
 * sobre el mínimo. En 16:9, 1280x720 son exactamente 921 600 píxeles, justo el
 * límite del 4.0: no se usa, porque la documentación no aclara si el extremo entra.
 */
type SizeTable = Record<string, Record<string, string>>;

/** Mínimo 3 686 400 píxeles. Tabla ya validada con una generación real. */
const SIZES_MIN_2K: SizeTable = {
  '2K': {
    '1:1': '2048x2048',
    '16:9': '2560x1440',
    '9:16': '1440x2560',
    '4:3': '2304x1728',
    '3:4': '1728x2304',
    '2:3': '1664x2496',
    '3:2': '2496x1664',
  },
};

/** Mínimo 921 600 píxeles: la más pequeña de aquí son 1 048 576, un 14 % por encima. */
const SIZES_MIN_1K: SizeTable = {
  '1K': {
    '1:1': '1024x1024',
    '16:9': '1536x864',
    '9:16': '864x1536',
    '4:3': '1216x912',
    '3:4': '912x1216',
    '2:3': '896x1344',
    '3:2': '1344x896',
  },
  '2K': SIZES_MIN_2K['2K'],
  '4K': {
    '1:1': '3968x3968',
    '16:9': '3840x2160',
    '9:16': '2160x3840',
    '4:3': '3648x2736',
    '3:4': '2736x3648',
    '2:3': '2624x3936',
    '3:2': '3936x2624',
  },
};

/**
 * Qué tabla le toca a cada modelo. Se declara uno por uno a propósito: el 4.5
 * empieza por "seedream-4-" y sin embargo NO puede bajar de 2K, así que deducirlo
 * del nombre lo habría roto. Lo que no esté aquí usa la tabla conservadora.
 */
const SIZES_BY_MODEL: Record<string, SizeTable> = {
  'seedream-4-0-250828': SIZES_MIN_1K,
};

/**
 * Se respeta la resolución que pide Weë cuando ese modelo la admite. Cuando no,
 * se usa la más baja que sí admite: nunca por debajo de su mínimo oficial, y nunca
 * una resolución mayor que la pedida, que se cobraría igual pero tardaría más.
 */
export const sizeFor = (modelId: string, aspect: string, resolution?: string): string => {
  const tablas = SIZES_BY_MODEL[modelId] || SIZES_MIN_2K;
  const pedido = String(resolution || '').toUpperCase();
  const tabla = tablas[pedido] || tablas[Object.keys(tablas)[0]];
  return tabla[aspect] || tabla['1:1'];
};

export const seedreamAdapter: ProviderAdapter = {
  id: 'seedream',
  name: 'ByteDance Seedream',
  modalities: ['image'],
  models: seedreamModels,
  isConfigured: isArkConfigured,
  supports: (capability) => seedreamModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { input, model, ctx } = request;
    const start = Date.now();
    const headers = arkHeaders('seedream');
    const count = Math.max(1, Math.min(4, Number(input.count ?? 1)));
    const prompt = [String(input.prompt ?? input.purpose ?? ''), String(input.brief ?? '')].filter(Boolean).join('\n');
    /*
     * La imagen de entrada se lee AQUÍ, en el servidor, y viaja INCRUSTADA.
     *
     * La API oficial admite "a Base64 string or an accessible URL", y para el caso
     * incrustado exige exactamente `data:image/<formato>;base64,<base64>` con el
     * formato en minúsculas (docs.byteplus.com/en/docs/ModelArk/1541523, campo
     * `image`). Se manda incrustada y no como URL para no depender de que nuestro
     * Storage sea alcanzable desde fuera: en desarrollo la dirección apunta a la
     * propia máquina y BytePlus no podría descargarla, y en producción ataría el
     * funcionamiento a que el archivo siga siendo público.
     *
     * Se lee UNA sola vez aunque se pidan varias imágenes.
     */
    const imageUrl = String(input.imageUrl ?? '');
    let image = '';
    if (imageUrl) {
      if (imageUrl.startsWith('data:')) image = imageUrl;
      else {
        const file = await readImage(imageUrl, 'seedream');
        image = toDataUri({ ...file, contentType: file.contentType.toLowerCase() });
      }
    }

    const urls: string[] = [];
    /** Uso que informa BytePlus. Solo se registra: no se usa para cobrar. */
    let providerUsage: Record<string, unknown> | undefined;
    for (let i = 0; i < count; i++) {
      const data = await fetchJson<any>(`${arkBase()}/images/generations`, {
        provider: 'seedream',
        headers,
        timeoutMs: request.timeoutMs,
        body: {
          model: model.id,
          prompt,
          // La proporción, de las medidas que ya resolvió el motor desde la foto
          // real; 1:1 solo cuando no hay ninguna de las dos cosas (fase 2E-59).
          size: sizeFor(model.id, String(input.aspectRatio ?? aspectFromOutput(input) ?? '1:1'), typeof input.resolution === 'string' ? input.resolution : undefined),
          response_format: 'url',
          watermark: false,
          ...(image ? { image } : {}),
          ...(input.transparent && supportsAlpha(model.id) ? { background: 'transparent', output_format: 'png' } : {}),
        },
      });
      const remote = data.data?.[0]?.url;
      if (!remote) throw new ProviderError('seedream: la respuesta no trajo imagen', 'seedream');
      if (data.usage) providerUsage = data.usage;
      urls.push(await persistRemoteFile(ctx.userId, remote, 'seedream', `image-${i + 1}`));
    }

    return {
      output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined },
      usage: { images: urls.length },
      costUSD: urls.length * model.cost.usd,
      latencyMs: Date.now() - start,
      model: model.id,
      // Lo que informa BytePlus, tal cual, para poder contrastar la tarifa oficial
      // con lo que acabe facturando de verdad. No se usa para cobrar.
      ...(providerUsage ? { meta: { providerUsage } } : {}),
    };
  },
};
