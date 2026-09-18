import { CapabilityId, Modality } from '../capability';
import { CAPABILITY_CONTRACT_VERSION } from '../contracts';

/**
 * WEE CORE — EL CATÁLOGO DE CAPACIDADES.
 *
 * ── Por qué hay dos uniones y no una ────────────────────────────────────────
 *
 * `CapabilityId` (en `../capability.ts`) es lo que el MOTOR sabe enrutar hoy:
 * veintiocho, exactamente las mismas que tiene `DEFAULT_ROUTING`, que es un
 * `Record` TOTAL. Añadirle una capacidad rompe la compilación del motor hasta
 * que alguien escriba su entrada de enrutado — y peor: haría que el motor
 * afirmara que enruta algo que no puede.
 *
 * `CoreCapabilityId` es el CATÁLOGO: todo lo que Weë sabe nombrar, enrutable o
 * no. Incluye a la otra por construcción, así que no son dos listas paralelas
 * sino una lista y su subconjunto. Una prueba comprueba que la relación se
 * mantiene.
 *
 * Esto es exactamente lo que permite declarar `3d.generate` hoy, sin proveedor,
 * sin mentir y sin tocar el motor.
 *
 * ── Una capacidad NO es un proveedor ────────────────────────────────────────
 *
 * Aquí no aparece —ni puede aparecer— el nombre de ninguna matriz. `3d.generate`
 * describe qué se quiere conseguir; quién lo consigue se declara en el registro
 * de proveedores, fuera del Core. Por eso `render.architecture` existe separada
 * de `3d.generate`: son dos cosas distintas y el día que haya un motor de
 * render especializado entrará sin tocar nada de 3D.
 */

/**
 * EL CATÁLOGO COMPLETO. Superconjunto de `CapabilityId`.
 *
 * Las familias nuevas no tienen implementación todavía y el catálogo lo dice
 * con `status`. Declararlas ahora no es adivinar: es reservar el nombre
 * correcto para que, cuando llegue la matriz, no haya que renombrar nada ni
 * inventarse una capacidad a medida del proveedor que aparezca.
 */
export type CoreCapabilityId =
  | CapabilityId
  /* TEXTO — razonar y transformar son distintas de generar. */
  | 'text.reason'
  | 'text.analyze'
  | 'text.transform'
  /* IMAGEN */
  | 'image.analyze'
  | 'image.transform'
  /* VÍDEO */
  | 'video.extend'
  | 'video.analyze'
  /* AUDIO */
  | 'audio.generate'
  | 'audio.edit'
  | 'audio.analyze'
  /* MÚSICA */
  | 'music.edit'
  | 'music.extend'
  | 'music.analyze'
  /* 3D */
  | '3d.generate'
  | '3d.edit'
  | '3d.analyze'
  | '3d.texture'
  | '3d.retopology'
  | '3d.rig'
  | '3d.convert'
  | '3d.export'
  /* DISEÑO — por disciplina, no por proveedor. */
  | 'architecture.design'
  | 'architecture.render'
  | 'product.design'
  | 'industrial.design'
  | 'vehicle.design'
  | 'furniture.design'
  | 'fashion.design'
  | 'packaging.design'
  | 'scene.generate'
  /* RENDER — independiente de 3D a propósito. */
  | 'render.generate'
  | 'render.product'
  | 'render.architecture'
  | 'render.interior'
  | 'render.scene'
  /* DOCUMENTO */
  | 'document.generate'
  | 'document.analyze'
  | 'document.transform'
  /*
   * TRADUCCIÓN — una capacidad propia, no una variante de texto.
   *
   * Traducir no es generar: se mide distinto (los proveedores cobran por
   * caracteres), se elige distinto (importa el PAR de idiomas, no solo la
   * calidad) y se juzga distinto. Meterla en `text.transform` obligaría a
   * adivinar por el contenido qué se pidió, que es justo lo que una capacidad
   * existe para evitar.
   *
   * Empieza por texto porque es lo único que Weë sabe traducir hoy; documento,
   * subtítulos, voz y vídeo entran como capacidades hermanas cuando lleguen sus
   * fases, sin tocar nada de esto.
   */
  | 'translation.text'
  | 'translation.detect';

/**
 * Hasta dónde llega una capacidad HOY.
 *
 * `ROUTABLE` es la única que promete algo: significa que el motor tiene una
 * cadena para ella. `DECLARED` es un nombre reservado sin implementación, y no
 * es lo mismo que `PENDING`, que es un nombre con una matriz candidata ya
 * identificada. La diferencia importa cuando alguien pregunta «¿cuándo?».
 */
export type CatalogStatus = 'ROUTABLE' | 'PENDING' | 'DECLARED' | 'DEPRECATED';

/** Qué disciplina cubre. Sirve para agrupar en paneles, nunca para enrutar. */
export type CapabilityCategory =
  | 'text' | 'image' | 'video' | 'audio' | 'music'
  | '3d' | 'design' | 'render' | 'document' | 'translation';

/** Una entrada del catálogo. Sin proveedores, sin modelos, sin precios. */
export interface CatalogEntry {
  id: CoreCapabilityId;
  contract: typeof CAPABILITY_CONTRACT_VERSION;
  category: CapabilityCategory;
  /** Modalidades que acepta de entrada. Vacío = no necesita material. */
  accepts: readonly Modality[];
  produces: Modality;
  status: CatalogStatus;
  /** Frase corta para administración. Nunca se le enseña a nadie. */
  note?: string;
}

const e = (
  id: CoreCapabilityId,
  category: CapabilityCategory,
  accepts: readonly Modality[],
  produces: Modality,
  status: CatalogStatus,
  note?: string,
): CatalogEntry => ({ id, contract: CAPABILITY_CONTRACT_VERSION, category, accepts, produces, status, note });

/**
 * EL CATÁLOGO.
 *
 * Las veintiocho primeras son `ROUTABLE` porque el motor tiene cadena para
 * ellas — salvo cuatro que el propio motor declara con cadena VACÍA
 * (`video.compose`, `video.montage`, `video.vertical`, `doc.render`): esas se
 * marcan `DECLARED`, porque un nombre enrutado a nadie no es una promesa.
 *
 * Y música: `music.generate` y `audio.sfx` tienen cadena, pero su único eslabón
 * está desactivado a propósito mientras no haya una matriz con API oficial y
 * licencia comercial. Eso es `PENDING`, no `ROUTABLE`.
 */
export const CAPABILITY_CATALOG: readonly CatalogEntry[] = [
  /* ── TEXTO ─────────────────────────────────────────────────────────────── */
  e('text.generate', 'text', ['text'], 'text', 'ROUTABLE'),
  e('text.structure', 'text', ['text'], 'text', 'ROUTABLE'),
  e('text.search', 'text', ['text'], 'text', 'ROUTABLE'),
  e('script.write', 'text', ['text'], 'text', 'ROUTABLE'),
  e('scene.split', 'text', ['text'], 'text', 'ROUTABLE'),
  e('subtitle.generate', 'text', ['text'], 'text', 'ROUTABLE'),
  e('text.reason', 'text', ['text'], 'text', 'DECLARED', 'Razonar es distinto de generar: otra calidad y otro coste.'),
  e('text.analyze', 'text', ['text'], 'text', 'DECLARED'),
  e('text.transform', 'text', ['text'], 'text', 'DECLARED'),

  /* ── IMAGEN ────────────────────────────────────────────────────────────── */
  e('image.generate', 'image', ['text'], 'image', 'ROUTABLE'),
  e('image.edit', 'image', ['image', 'text'], 'image', 'ROUTABLE'),
  e('image.reference', 'image', ['image', 'text'], 'image', 'ROUTABLE'),
  e('image.background_remove', 'image', ['image'], 'image', 'ROUTABLE'),
  e('image.object_remove', 'image', ['image', 'text'], 'image', 'ROUTABLE'),
  e('image.identity_edit', 'image', ['image', 'text'], 'image', 'ROUTABLE', 'Conservar el rostro es lo que la define.'),
  e('image.space_restyle', 'image', ['image', 'text'], 'image', 'ROUTABLE'),
  e('image.try_on', 'image', ['image'], 'image', 'ROUTABLE'),
  e('image.upscale', 'image', ['image'], 'image', 'ROUTABLE'),
  e('vision.describe', 'image', ['image'], 'text', 'ROUTABLE'),
  e('image.analyze', 'image', ['image'], 'text', 'DECLARED'),
  e('image.transform', 'image', ['image'], 'image', 'DECLARED'),

  /* ── VÍDEO ─────────────────────────────────────────────────────────────── */
  e('video.generate', 'video', ['text'], 'video', 'ROUTABLE'),
  e('video.image_to_video', 'video', ['image', 'text'], 'video', 'ROUTABLE'),
  e('video.reference', 'video', ['image', 'video', 'text'], 'video', 'ROUTABLE'),
  e('video.compose', 'video', ['video'], 'video', 'DECLARED', 'El motor la declara con cadena vacía: nadie la sirve.'),
  e('video.montage', 'video', ['video'], 'video', 'DECLARED', 'Cadena vacía en el motor.'),
  e('video.vertical', 'video', ['video'], 'video', 'DECLARED', 'Cadena vacía en el motor.'),
  e('video.extend', 'video', ['video'], 'video', 'DECLARED'),
  e('video.analyze', 'video', ['video'], 'text', 'DECLARED'),

  /* ── AUDIO Y VOZ ───────────────────────────────────────────────────────── */
  e('voice.tts', 'audio', ['text'], 'voice', 'ROUTABLE'),
  e('audio.transcribe', 'audio', ['voice'], 'text', 'ROUTABLE'),
  e('audio.sfx', 'audio', ['text'], 'music', 'PENDING', 'Su único eslabón está desactivado mientras no haya matriz.'),
  e('audio.generate', 'audio', ['text'], 'music', 'DECLARED'),
  e('audio.edit', 'audio', ['music'], 'music', 'DECLARED'),
  e('audio.analyze', 'audio', ['music'], 'text', 'DECLARED'),

  /* ── MÚSICA ────────────────────────────────────────────────────────────── */
  e('music.generate', 'music', ['text'], 'music', 'PENDING', 'Sin matriz con API oficial y licencia comercial todavía.'),
  e('music.edit', 'music', ['music', 'text'], 'music', 'DECLARED'),
  e('music.extend', 'music', ['music'], 'music', 'DECLARED'),
  e('music.analyze', 'music', ['music'], 'text', 'DECLARED'),

  /* ── 3D ────────────────────────────────────────────────────────────────── */
  e('3d.generate', '3d', ['text', 'image'], 'image', 'DECLARED', 'Produce geometría; la modalidad visual es lo más cercano que hay hoy.'),
  e('3d.edit', '3d', ['image', 'text'], 'image', 'DECLARED'),
  e('3d.analyze', '3d', ['image'], 'text', 'DECLARED'),
  e('3d.texture', '3d', ['image', 'text'], 'image', 'DECLARED'),
  e('3d.retopology', '3d', ['image'], 'image', 'DECLARED'),
  e('3d.rig', '3d', ['image'], 'image', 'DECLARED'),
  e('3d.convert', '3d', ['image'], 'image', 'DECLARED', 'Cambiar de formato: glTF, USDZ, OBJ…'),
  e('3d.export', '3d', ['image'], 'doc', 'DECLARED'),

  /* ── DISEÑO — por disciplina, nunca por proveedor ──────────────────────── */
  e('architecture.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
  e('architecture.render', 'design', ['image', 'text'], 'image', 'DECLARED'),
  e('product.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
  e('industrial.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
  e('vehicle.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
  e('furniture.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
  e('fashion.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
  e('packaging.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
  e('scene.generate', 'design', ['text', 'image'], 'image', 'DECLARED'),

  /* ── RENDER — separado de 3D a propósito ───────────────────────────────── */
  e('render.generate', 'render', ['image', 'text'], 'image', 'DECLARED'),
  e('render.product', 'render', ['image', 'text'], 'image', 'DECLARED'),
  e('render.architecture', 'render', ['image', 'text'], 'image', 'DECLARED'),
  e('render.interior', 'render', ['image', 'text'], 'image', 'DECLARED'),
  e('render.scene', 'render', ['image', 'text'], 'image', 'DECLARED'),

  /* ── DOCUMENTO ─────────────────────────────────────────────────────────── */
  e('doc.read', 'document', ['doc'], 'text', 'ROUTABLE'),
  e('doc.render', 'document', ['text'], 'doc', 'DECLARED', 'Cadena vacía en el motor.'),
  e('document.generate', 'document', ['text'], 'doc', 'DECLARED'),
  e('document.analyze', 'document', ['doc'], 'text', 'DECLARED'),
  e('document.transform', 'document', ['doc'], 'doc', 'DECLARED'),

  /* ── TRADUCCIÓN — declarada, sin nadie que la sirva todavía ─────────────── */
  e('translation.text', 'translation', ['text'], 'text', 'DECLARED', 'Weë Translation. Sin matriz integrada: la elección de proveedor llega en la Fase 20.'),
  e('translation.detect', 'translation', ['text'], 'text', 'DECLARED', 'En qué idioma está esto. Lo consumirá el Language Intelligence Layer (Fase 10).'),
];

/** 'image' de 'image.generate'; '3d' de '3d.texture'. */
export const familiaDeCapacidad = (id: CoreCapabilityId): string => String(id).split('.')[0];

/** Las que el motor puede servir de verdad hoy. */
export const capacidadesEnrutables = (): readonly CatalogEntry[] =>
  CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE');
