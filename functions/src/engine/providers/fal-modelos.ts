import { EntradaDeMundo3D, ModelSpec, OrigenDeCampo } from '../types';

/**
 * LOS MODELOS DE fal.ai QUE WEË CONOCE, COMO DATOS.
 *
 * Aquí no hay lógica: qué modelo es, qué capacidad cubre, qué pide y qué devuelve (el esquema publicado), cuánto
 * cobra el proveedor y qué dice su licencia, con las fuentes oficiales leídas. El adaptador (`fal.ts`) solo los lee:
 * ni los precios ni el margen de Weë viven en él. El precio en Credits lo calcula el motor de coste.
 *
 * NINGUNO ES ELEGIBLE HOY. Cada uno nace DISABLED y con su revisión legal; solo entra en el Router un modelo APPROVED,
 * ACTIVE y permitido en las jurisdicciones de la operación (`modeloElegible`, la regla común de Weë). Activarlo es una
 * decisión del dueño (`aiProviders/fal.models[id].enabled`); aprobarlo, global o para una jurisdicción, es una revisión
 * legal con evidencia que se escribe AQUÍ, con sus fuentes: la configuración no aprueba ni levanta bloqueos.
 *
 * Investigación: 2026-10-05, solo fuentes oficiales (docs y páginas de modelo de fal, términos de fal, licencias de
 * Tencent en GitHub y Hugging Face).
 */

/** Términos de fal que aplican a CUALQUIER modelo servido por fal (se citan en cada uno). */
const TERMINOS_DE_FAL = Object.freeze({
  nombre: 'fal.ai Terms of Service (2026-09-08) y API Services Terms',
  url: 'https://fal.ai/legal/terms-of-service',
  notas: Object.freeze([
    '§2: el cliente debe asegurar que sus usuarios finales tienen al menos 18 años o la mayoría de edad local (decisión de producto y legal).',
    '§4(b)(ii): no exponer las APIs de fal directamente a los usuarios finales (Weë lo cumple: la clave vive en el servidor).',
    '§6(e): prohíbe revender o sublicenciar y el uso como «service bureau»; legal debe confirmar que cobrar a las personas por cada generación encaja en §4(b)(i).',
    'Ninguna cláusula asigna la propiedad del resultado ni sustituye la licencia del dueño del modelo (§14: materiales de terceros).',
  ]),
});

/**
 * HUNYUAN WORLD 1.0 — imagen → mundo 3D.
 *
 * RESTRICCIÓN TERRITORIAL, no bloqueo global: la licencia de Tencent («Tencent HunyuanWorld-1.0 Community License
 * Agreement», 2025-07-27) NO se aplica en la Unión Europea, el Reino Unido ni Corea del Sur, prohíbe usar o MOSTRAR los
 * resultados fuera de su territorio y se acepta también al usarlo a través de un servicio alojado (como fal). Así que:
 * BLOCKED_FOR_JURISDICTION en la UE, el Reino Unido y Corea del Sur; en cualquier otro país del catálogo de Weë la
 * licencia no lo prohíbe, y por la política de Weë (decisión del dueño, 2026-10-06: «territorio no bloqueado →
 * potencialmente elegible; bloqueado → excluido; sin país determinable → no elegible») el TERRITORIO no lo excluye
 * (`resto: 'APPROVED'`). Eso no lo activa: su revisión legal GLOBAL sigue REVIEW_REQUIRED y su estado DISABLED, así que
 * hoy no es elegible en ninguna parte. La etiqueta «Commercial use» de fal no menciona territorios ni enlaza ninguna
 * licencia que sustituya la de Tencent.
 *
 * Además: el formato real de `world_file` NO está verificado (el esquema solo dice «File»), y no existe en fal ningún
 * endpoint para AMPLIAR un mundo (WORLD_EXPANSION = NOT_SUPPORTED_BY_CURRENT_PROVIDER).
 */
export const HUNYUAN_WORLD_IMAGEN_A_MUNDO: ModelSpec = Object.freeze({
  id: 'fal-ai/hunyuan_world/image-to-world',
  provider: 'fal',
  capabilities: ['world.generate'],
  quality: 4,
  speed: 2,
  cost: { unit: 'call', usd: 0.3 },
  tags: ['3d', 'world'],
  note: 'Hunyuan World 1.0 (Tencent) servido por fal. Bloqueado en la UE, el Reino Unido y Corea del Sur; en el resto, lo decide su revisión legal global (pendiente).',
  territorio: Object.freeze({
    bloqueadas: Object.freeze(['EU', 'GB', 'KR']),
    aprobadas: Object.freeze([]),
    resto: 'APPROVED',
    fuente: 'Tencent HunyuanWorld-1.0 Community License Agreement (2025-07-27): «Territory» = todo el mundo salvo la UE, '
      + 'el Reino Unido y Corea del Sur; prohíbe usar o mostrar el Output fuera del Territory, también vía «Hosted Service». '
      + 'El resto, aprobado por territorio según la política de Weë (decisión del dueño, 2026-10-06).',
  }),
  gobierno: Object.freeze({
    providerModelId: 'fal-ai/hunyuan_world/image-to-world',
    version: 'hunyuan-world-1.0 (fal, publicado 2025-07-28)',
    reviewStatus: 'REVIEW_REQUIRED',
    active: 'DISABLED',
    commercialUseStatus: 'RESTRICTED',
    licenseStatus: 'RESTRICTED',
    outputRightsStatus: 'RESTRICTED',
    attributionRequired: true,
    licencias: Object.freeze([
      Object.freeze({
        nombre: 'Tencent HunyuanWorld-1.0 Community License Agreement (2025-07-27)',
        url: 'https://github.com/Tencent-Hunyuan/HunyuanWorld-1.0/blob/main/LICENSE',
        notas: Object.freeze([
          'No se aplica en la UE, el Reino Unido ni Corea del Sur; concesión solo dentro del «Territory».',
          'Prohíbe usar, distribuir o mostrar las obras o el Output fuera del territorio; también vía «Hosted Service».',
          'Umbral de 1 millón de usuarios activos mensuales en la fecha de publicación: pedir licencia a Tencent.',
          'AUP punto 12: identificar de forma visible lo generado por máquina al difundirlo en público.',
          'Hay que entregar una copia del acuerdo a terceros que reciban las obras o productos que las usan.',
          'Prohíbe usar las obras o sus resultados para mejorar otros modelos de IA. Ley de Hong Kong.',
        ]),
      }),
      TERMINOS_DE_FAL,
    ]),
    pricingMode: 'per_generation',
    providerPricing: Object.freeze({
      usd: 0.3, unidad: 'petición', fuente: 'https://fal.ai/models/fal-ai/hunyuan_world/image-to-world', consultadoEn: '2026-10-05',
    }),
    supportedFormats: Object.freeze(['entrada: jpg, png, webp, gif, avif, heic, heif (interfaz de fal, no el esquema)', 'salida: NO VERIFICADO']),
    inputSchema: Object.freeze([
      Object.freeze({ nombre: 'image_url', tipo: 'image_url', requerido: true, descripcion: 'URL de la imagen' }),
      Object.freeze({ nombre: 'labels_fg1', tipo: 'string', requerido: true, descripcion: 'Etiquetas del 1.er objeto en primer plano' }),
      Object.freeze({ nombre: 'labels_fg2', tipo: 'string', requerido: true, descripcion: 'Etiquetas del 2.º objeto en primer plano' }),
      Object.freeze({ nombre: 'classes', tipo: 'string', requerido: true, descripcion: 'Clases de la escena' }),
      Object.freeze({ nombre: 'export_drc', tipo: 'boolean', requerido: false, descripcion: 'Exportar «DRC» (sin documentar qué devuelve)' }),
    ]),
    outputSchema: Object.freeze([
      /* El ÚNICO archivo que declara: el mundo. Este modelo no da vista previa, y Weë no se la inventa. */
      Object.freeze({ nombre: 'world_file', tipo: 'file', requerido: true, papel: 'principal', descripcion: 'File: url, content_type, file_name, file_size. Formato NO VERIFICADO' }),
    ]),
    noSoportado: Object.freeze(['world.expand']),
    fuentes: Object.freeze([
      'https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/hunyuan_world/image-to-world',
      'https://fal.ai/models/fal-ai/hunyuan_world/image-to-world',
      'https://github.com/Tencent-Hunyuan/HunyuanWorld-1.0/blob/main/LICENSE',
      'https://fal.ai/legal/terms-of-service',
      'https://fal.ai/legal/api-services',
    ]),
    lastVerifiedAt: '2026-10-05',
    motivo: 'Bloqueado en la UE, el Reino Unido y Corea del Sur por la licencia de Tencent (ver `territorio`). En el resto, el '
      + 'territorio no lo excluye, pero la revisión GLOBAL sigue REVIEW_REQUIRED: legal tiene que confirmar si que el operador (Weë) '
      + 'esté establecido en España impide usarlo en '
      + 'operaciones de fuera de la UE, cómo se cumple que el resultado no se muestre en territorio excluido, y los '
      + 'términos de fal (§2 edad mínima, §6(e) service bureau), además del umbral de 1M MAU y el etiquetado del AUP.',
  }),
}) as ModelSpec;

/** Todos los modelos de fal que conoce Weë. Añadir uno = una entrada aquí, con su gobierno y sus fuentes. */
export const MODELOS_FAL: readonly ModelSpec[] = Object.freeze([HUNYUAN_WORLD_IMAGEN_A_MUNDO]);

/* ── De la entrada de Weë al esquema de cada modelo ───────────────────────── */

/**
 * DE DÓNDE SALE CADA CAMPO QUE PIDE UN MODELO, en el contrato de Weë (`EntradaDeMundo3D`, el de `world.generate`).
 *
 * Esto es lo ÚNICO que sabe de los nombres de fal, y son datos: si fal cambia su esquema, cambia esta tabla y nada
 * más —ni la app, ni la puerta, ni el contrato—. Un campo del esquema que no esté aquí no se manda; si además es
 * obligatorio, el adaptador falla cerrado antes de llamar a nadie. Nada se inventa: un valor que Weë no tiene no se
 * rellena con uno de muestra.
 */
export const ENTRADA_DE_WEE_POR_MODELO: Readonly<Record<string, Readonly<Record<string, OrigenDeCampo<EntradaDeMundo3D>>>>> = Object.freeze({
  [HUNYUAN_WORLD_IMAGEN_A_MUNDO.id]: Object.freeze({
    /* La foto de la persona. El adaptador la lee de su carpeta y la manda EN LÍNEA, nunca como una URL de Weë. */
    image_url: Object.freeze({ de: 'imagen' }),
    /* Abierto o cerrado: el modelo distingue «outdoor» e «indoor». */
    classes: Object.freeze({ de: 'espacio', valores: Object.freeze({ exterior: 'outdoor', interior: 'indoor' }) }),
    /* Lo que destaca delante: el modelo lo separa en dos capas de primer plano. */
    labels_fg1: Object.freeze({
      de: 'elementos', posicion: 0,
      vacio: Object.freeze({ fuente: 'Demo oficial de HunyuanWorld-1.0 (demo_scenegen.py): sin etiquetas de primer plano por defecto. El esquema de fal las marca obligatorias sin decir si admite el texto vacío: NO VERIFICADO en fal.' }),
    }),
    labels_fg2: Object.freeze({
      de: 'elementos', posicion: 1,
      vacio: Object.freeze({ fuente: 'Demo oficial de HunyuanWorld-1.0 (demo_scenegen.py): sin etiquetas de primer plano por defecto. El esquema de fal las marca obligatorias sin decir si admite el texto vacío: NO VERIFICADO en fal.' }),
    }),
    /* export_drc NO se manda: el proveedor no documenta qué devuelve, y Weë no pide lo que no sabe leer. */
    /* La descripción de la persona tampoco: este modelo no tiene entrada de texto. Se guarda como nombre del mundo. */
  }),
});
