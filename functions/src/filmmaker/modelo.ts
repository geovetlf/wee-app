import type { AspectRatio, CreativeParameters } from '../core/creative';
import { completarCreativos, versionCreativaActual } from '../core/creative';
import type { ContinuityAspect, ContinuityRequirements, SpatialRelationKind } from '../core/continuity';
import { ASPECTOS_DE_CONTINUIDAD, MAX_ANCLAJES, MAX_RELACIONES_ESPACIALES } from '../core/continuity';
import type { ElementBinding } from '../core/shot';
import {
  FORMA_DE_ID_DE_PLANO, MAX_DEPENDENCIAS_DE_PLANO, MAX_ELEMENTOS_POR_NODO, MAX_NARRATIVA, MAX_NOMBRE_DE_ESCENA,
} from '../core/shot';
import type { AssetKind } from '../core/content/asset';
import type { ExecutionHints } from '../core/gateway';

/**
 * WEË FILMMAKER — UNA PRODUCCIÓN, ESCRITA COMO DATOS.
 *
 * ── Para qué existe ─────────────────────────────────────────────────────────
 *
 * Alguien dice «quiero un anuncio de 20 segundos de una zapatilla, de noche, en
 * vertical» y Weë le enseña cinco planos que puede tocar uno a uno. Para poder
 * enseñarlos, cambiarlos y, más adelante, generarlos, primero tienen que existir
 * como algo que se pueda comprobar: la intención, la dirección, el formato, las
 * escenas y sus planos, quién sale, dónde, qué se oye, cómo se monta y cómo se
 * entrega. Eso es este archivo, y nada más.
 *
 * ── Lo que NO sabe, a propósito ─────────────────────────────────────────────
 *
 * Dónde se guarda, cómo se genera, con qué proveedor, con qué modelo, cuánto
 * cuesta, cómo se ejecuta y cómo se renderiza. Eso es de capas que ya existen
 * —Weë Brain, el Planner, el Registry, el Gateway, el Job Engine, el Credit
 * Engine, el Content Core— o que llegarán después. Aquí no hay Firestore, ni red,
 * ni reloj, ni azar: el mismo dato da siempre el mismo resultado.
 *
 * ── Lo que reutiliza sin tocar ─────────────────────────────────────────────
 *
 *   · cámara, plano, óptica, movimiento, luz, composición, transición y encuadre
 *     son `CreativeParameters` (core/creative.ts), el vocabulario cerrado de S2;
 *   · qué hay que conservar entre planos es el vocabulario de continuidad del
 *     Core (core/continuity.ts), con los ids de ESTA producción;
 *   · el puntero a una cosa de la cuenta es `ElementBinding` (core/shot.ts);
 *   · la calidad es la de `ExecutionHints` (core/gateway.ts);
 *   · los ids tienen la forma de los planos del Core, para que un plano de aquí
 *     pueda convertirse en un `ShotNode` sin renombrar nada.
 *
 * `ShotNode` no se modifica ni se sustituye: `requisitos.ts` traduce cada plano de
 * aquí a un borrador que el validador del Core acepta tal cual.
 */

/** La versión de este modelo. Un entero, como la de `CreativeParameters`: no es un contrato del Core. */
export const FILMMAKER_MODEL_VERSION = 1 as const;

/* ── Identificadores ──────────────────────────────────────────────────────── */

/**
 * LA FORMA DE UN ID: LA DE LOS PLANOS DEL CORE. `[A-Za-z0-9_-]`, de 4 a 128.
 *
 * Un único espacio de nombres para toda la producción —escenas, planos, líneas,
 * personajes, lugares, objetos, referencias, sonidos, exportaciones, marcas—: así
 * una ruta como `scenes.sc01.shots.sh03` señala una sola cosa y nadie tiene que
 * preguntarse de qué tipo es un id.
 */
export const FORMA_DE_ID: RegExp = FORMA_DE_ID_DE_PLANO;
export const esId = (v: unknown): v is string => typeof v === 'string' && FORMA_DE_ID.test(v);

/* ── Vocabularios cerrados ────────────────────────────────────────────────── */

/*
 * Cada lista es la ÚNICA fuente de lo que existe y su tipo se deriva de ella. Lo
 * que ya tenía nombre en el Core no se repite aquí: la cámara, el movimiento, la
 * luz y el encuadre son de `CreativeParameters`; las proporciones, de `PROPORCIONES`;
 * los tipos de material, de `TIPOS_DE_MATERIAL`; la calidad, de `ExecutionHints`.
 */

export const TIPOS_DE_PRODUCCION = Object.freeze([
  'video', 'short_film', 'ad', 'trailer', 'music_video', 'story', 'product', 'presentation', 'cinematic', 'social',
] as const);
export type ProductionType = typeof TIPOS_DE_PRODUCCION[number];

export const PRIORIDADES = Object.freeze(['quality', 'speed', 'cost', 'continuity'] as const);
export type IntentPriority = typeof PRIORIDADES[number];

export const RITMOS = Object.freeze(['slow', 'moderate', 'fast'] as const);
export type Pacing = typeof RITMOS[number];

/**
 * EL MOMENTO DEL DÍA ES UNA HORA, NO UNA LUZ. La hora dorada y la hora azul son
 * tipos de luz de `CreativeParameters` (`lighting.type`) y no se repiten aquí:
 * dos vocabularios para lo mismo acabarían diciendo cosas distintas.
 */
export const MOMENTOS_DEL_DIA = Object.freeze(['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'] as const);
export type TimeOfDay = typeof MOMENTOS_DEL_DIA[number];

export const CLIMAS = Object.freeze(['clear', 'cloudy', 'overcast', 'rain', 'storm', 'snow', 'fog', 'wind'] as const);
export type Weather = typeof CLIMAS[number];

export const PROPOSITOS_NARRATIVOS = Object.freeze([
  'hook', 'setup', 'development', 'turning_point', 'climax', 'resolution', 'reveal', 'transition', 'call_to_action',
] as const);
export type NarrativePurpose = typeof PROPOSITOS_NARRATIVOS[number];

export const ENFOQUES = Object.freeze([
  'face', 'eyes', 'hands', 'upper_body', 'full_body', 'group', 'object', 'detail', 'environment',
] as const);
export type SubjectFocus = typeof ENFOQUES[number];

/**
 * TRES MANERAS DE QUE SE OIGA UNA FRASE, y no son la misma:
 *   dialogue   un personaje habla y se le ve.
 *   voiceover  un personaje habla y no se le ve.
 *   narration  habla un narrador, que no es ningún personaje.
 */
export const TIPOS_DE_LINEA = Object.freeze(['dialogue', 'voiceover', 'narration'] as const);
export type DialogueKind = typeof TIPOS_DE_LINEA[number];

/** Lo que suena y no es una voz. La voz y el diálogo tienen su propio sitio. */
export const TIPOS_DE_SONIDO = Object.freeze(['music', 'sfx', 'ambience'] as const);
export type AudioCueKind = typeof TIPOS_DE_SONIDO[number];

export const PAPELES_DE_REFERENCIA = Object.freeze([
  'style', 'character', 'location', 'object', 'first_frame', 'last_frame', 'motion', 'audio', 'general',
] as const);
export type ReferenceRole = typeof PAPELES_DE_REFERENCIA[number];

export const TIPOS_DE_OBJETO = Object.freeze(['prop', 'product', 'vehicle', 'brand', 'other'] as const);
export type ObjectKind = typeof TIPOS_DE_OBJETO[number];

export const AMBIENTES = Object.freeze(['interior', 'exterior'] as const);
export type LocationSetting = typeof AMBIENTES[number];

export const RESOLUCIONES = Object.freeze(['480p', '720p', '1080p', '4k'] as const);
export type ResolutionTarget = typeof RESOLUCIONES[number];

/** `burned`: dentro de la imagen. `sidecar`: un archivo aparte. */
export const MODOS_DE_SUBTITULO = Object.freeze(['none', 'burned', 'sidecar'] as const);
export type SubtitleMode = typeof MODOS_DE_SUBTITULO[number];

export const POSICIONES_DE_SUBTITULO = Object.freeze(['bottom', 'top', 'center'] as const);
export type SubtitlePosition = typeof POSICIONES_DE_SUBTITULO[number];

export const ESTILOS_DE_SUBTITULO = Object.freeze(['standard', 'bold', 'boxed'] as const);
export type SubtitleStyle = typeof ESTILOS_DE_SUBTITULO[number];

export const PISTAS = Object.freeze(['video', 'dialogue', 'narration', 'music', 'sfx', 'ambience', 'subtitles'] as const);
export type EditTrackKind = typeof PISTAS[number];

export const PROPOSITOS_DE_EXPORTACION = Object.freeze(['final', 'preview'] as const);
export type ExportPurpose = typeof PROPOSITOS_DE_EXPORTACION[number];

/** Vista previa antes de lo caro: `frames` pide un fotograma por plano antes del vídeo. */
export const PREVISUALIZACIONES = Object.freeze(['none', 'frames'] as const);
export type PreviewPolicy = typeof PREVISUALIZACIONES[number];

/** La calidad de `ExecutionHints`, sin inventar otra escala. */
export type ProductionQuality = NonNullable<ExecutionHints['quality']>;
export const CALIDADES: readonly ProductionQuality[] = Object.freeze(['standard', 'high', 'max'] as ProductionQuality[]);

export const RELACIONES_ENTRE_PERSONAJES = Object.freeze([
  'family', 'partner', 'friend', 'rival', 'colleague', 'mentor', 'other',
] as const);
export type RelationshipKind = typeof RELACIONES_ENTRE_PERSONAJES[number];

/**
 * LOS RASGOS DE UNA APARIENCIA, separados. Es la interfaz que un futuro Weë
 * Appearance Engine necesitará para leer y conservar cada uno por su lado; aquí
 * solo se describen, no se generan.
 */
export const RASGOS = Object.freeze([
  'face', 'hair', 'body', 'wardrobe', 'accessories', 'makeup', 'materials', 'colors', 'lighting', 'visualStyle', 'environment',
] as const);
export type AppearanceTraitKey = typeof RASGOS[number];

export const TIPOS_DE_RESTRICCION = Object.freeze([
  'max_duration', 'min_duration', 'aspect_ratio', 'no_dialogue', 'no_music', 'no_narration', 'include_character', 'note',
] as const);
export type IntentConstraintKind = typeof TIPOS_DE_RESTRICCION[number];

export const PRESETS = Object.freeze([
  'tiktok', 'instagram_reels', 'youtube_shorts', 'youtube', 'ads', 'stories',
] as const);
export type FormatPresetId = typeof PRESETS[number];

/* ── Límites ──────────────────────────────────────────────────────────────── */

/**
 * LÍMITES DEL DOMINIO, no de ningún proveedor. Qué dura un plano como mucho lo
 * decide quien lo genere; aquí solo se descarta lo absurdo. Los que ya existían en
 * el Core se toman de allí para que un plano de aquí quepa en un `ShotNode`.
 */
export const LIMITES = Object.freeze({
  duracionMinimaSec: 0.5,
  planoMaxSec: 600,
  escenaMaxSec: 3600,
  produccionMaxSec: 10800,
  escenas: 200,
  planosPorEscena: 100,
  planos: 1000,
  personajes: 64,
  lugares: 64,
  objetos: 128,
  referencias: 256,
  referenciasPorCosa: 32,
  lineasPorBloque: 100,
  sonidos: 256,
  exportaciones: 8,
  marcas: 64,
  accionesPorBloque: 16,
  etiquetas: 32,
  restricciones: 32,
  paleta: 16,
  relaciones: 16,
  nombre: MAX_NOMBRE_DE_ESCENA,
  frase: MAX_NARRATIVA,
  texto: 2000,
  linea: 1000,
  textoLibre: 4000,
  elementosPorBloque: MAX_ELEMENTOS_POR_NODO,
  dependencias: MAX_DEPENDENCIAS_DE_PLANO,
  anclajes: MAX_ANCLAJES,
  relacionesEspaciales: MAX_RELACIONES_ESPACIALES,
  edadMaxima: 150,
  /** Cuánto pueden no cuadrar dos duraciones sin que sea un error: 50 ms. */
  toleranciaMs: 50,
});

/* ── La intención ─────────────────────────────────────────────────────────── */

/**
 * LO QUE SE PIDIÓ. Puede quedarse en lenguaje natural y ningún campo es
 * obligatorio: una intención a medias sigue siendo una intención. Es lo que la
 * persona quiere; lo que se decidió hacer está en la dirección y en las escenas.
 */
export interface ProductionIntent {
  readonly objective?: string;
  readonly productionType?: ProductionType;
  readonly audience?: string;
  readonly requestedDurationSec?: number;
  readonly aspectRatio?: AspectRatio;
  readonly preset?: FormatPresetId;
  readonly tone?: string;
  readonly style?: string;
  readonly theme?: string;
  readonly narrative?: string;
  readonly constraints?: readonly IntentConstraint[];
  readonly referenceIds?: readonly string[];
  readonly priorities?: readonly IntentPriority[];
  /** Lo que la persona escribió, tal cual. Es contenido: no se traduce. */
  readonly freeText?: string;
}

/** Restricciones que se pueden COMPROBAR. Lo que no se puede comprobar va en `note`. */
export type IntentConstraint =
  | { readonly kind: 'max_duration'; readonly seconds: number }
  | { readonly kind: 'min_duration'; readonly seconds: number }
  | { readonly kind: 'aspect_ratio'; readonly aspectRatio: AspectRatio }
  | { readonly kind: 'no_dialogue' }
  | { readonly kind: 'no_music' }
  | { readonly kind: 'no_narration' }
  | { readonly kind: 'include_character'; readonly characterId: string }
  | { readonly kind: 'note'; readonly text: string };

/* ── La dirección creativa ───────────────────────────────────────────────── */

/**
 * CÓMO SE VA A VER Y A SENTIR, cuando se sabe. La luz, la composición y la
 * cámara NO tienen campo propio: están en `cinematography`, que es el
 * `CreativeParameters` del Core. Un segundo vocabulario para lo mismo sería el
 * primer paso para que dos sitios dijeran cosas distintas.
 */
export interface CreativeDirection {
  readonly visualStyle?: string;
  readonly mood?: string;
  readonly tone?: string;
  readonly pacing?: Pacing;
  readonly color?: ColorDirection;
  /** Lo que vale para toda la producción, salvo que una escena o un plano digan otra cosa. */
  readonly cinematography?: CreativeParameters;
  readonly referenceIds?: readonly string[];
}

export interface ColorDirection {
  /** Colores `#RRGGBB`. */
  readonly palette?: readonly string[];
  readonly grading?: string;
}

/* ── Formato, duración y presets ─────────────────────────────────────────── */

export interface ProductionFormat {
  readonly aspectRatio: AspectRatio;
  readonly resolution?: ResolutionTarget;
  /** De qué preset salió, si salió de uno. Informativo: el formato es lo de arriba. */
  readonly preset?: FormatPresetId;
}

/** `strict`: la suma de las escenas TIENE que dar el objetivo. Sin él, el objetivo orienta. */
export interface ProductionDuration {
  readonly targetSec?: number;
  readonly strict?: boolean;
}

/**
 * UN PRESET ES CONFIGURACIÓN, NO UN PRODUCTO. Rellena formato, resolución y una
 * duración recomendada; no crea nada aparte ni ata la producción a una red. Las
 * duraciones son valores por defecto de Weë, editables, no límites de ninguna
 * plataforma.
 */
export interface FormatPreset {
  readonly id: FormatPresetId;
  readonly aspectRatio: AspectRatio;
  readonly resolution: ResolutionTarget;
  readonly recommendedDurationSec: number;
}

export const PRESETS_DE_FORMATO: Readonly<Record<FormatPresetId, FormatPreset>> = Object.freeze({
  tiktok: Object.freeze({ id: 'tiktok', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
  instagram_reels: Object.freeze({ id: 'instagram_reels', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
  youtube_shorts: Object.freeze({ id: 'youtube_shorts', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
  youtube: Object.freeze({ id: 'youtube', aspectRatio: '16:9', resolution: '1080p', recommendedDurationSec: 60 }),
  ads: Object.freeze({ id: 'ads', aspectRatio: '4:5', resolution: '1080p', recommendedDurationSec: 15 }),
  stories: Object.freeze({ id: 'stories', aspectRatio: '9:16', resolution: '1080p', recommendedDurationSec: 15 }),
} as Record<FormatPresetId, FormatPreset>);

/** Lo que un preset produce: formato y duración. Nada más. */
export const configuracionDePreset = (
  id: FormatPresetId,
): { readonly format: ProductionFormat; readonly duration: ProductionDuration } => {
  const p = PRESETS_DE_FORMATO[id];
  return {
    format: { aspectRatio: p.aspectRatio, resolution: p.resolution, preset: p.id },
    duration: { targetSec: p.recommendedDurationSec },
  };
};

/* ── Dirección de una escena o de un plano ───────────────────────────────── */

export interface VisualDirection {
  /** Lo que cambia respecto a lo de fuera. Lo que no diga, lo hereda. */
  readonly creative?: CreativeParameters;
  /** El look, en palabras. */
  readonly style?: string;
  readonly mood?: string;
}

export interface AudioDirection {
  readonly notes?: string;
  /** Si el vídeo generado debe traer su propio sonido. Ausente = sin preferencia. */
  readonly withSound?: boolean;
}

/**
 * QUÉ HAY QUE CONSERVAR, con los ids de esta producción.
 *
 * Es `ContinuityRequirements` del Core —las mismas listas `preserve`/`mayChange`,
 * los mismos 83 aspectos, la misma fuerza— con una sola diferencia: los anclajes
 * y las relaciones espaciales señalan personajes, lugares y objetos de ESTA
 * producción, que aún pueden no ser Elements de la cuenta. `requisitos.ts` lo
 * traduce a los del Core cuando esas cosas tienen su `element`.
 */
export type ContinuityRule = Omit<ContinuityRequirements, 'anchors' | 'spatial'> & {
  readonly anchors?: readonly string[];
  readonly spatial?: readonly EntitySpatialConstraint[];
};

export interface EntitySpatialConstraint {
  readonly subject: string;
  readonly relation: SpatialRelationKind;
  readonly object: string;
}

/* ── Escenas y planos ─────────────────────────────────────────────────────── */

/**
 * UNA ESCENA: lo que comparten varios planos seguidos.
 *
 * `order` es su posición, desde 0 —como `SceneNode.order`—. La persona ve
 * «Escena 1»; el número humano es `order + 1`, y `escenaPorNumero` lo traduce.
 *
 * `durationSec` solo hace falta si la escena no tiene planos: con planos, dura
 * lo que suman y, si también la declara, las dos cifras tienen que cuadrar.
 *
 * `dialogue` son las líneas de la escena que aún no están asignadas a un plano.
 * Una línea vive en un solo sitio: en la escena o en uno de sus planos.
 */
export interface ProductionScene {
  readonly id: string;
  readonly order: number;
  readonly title?: string;
  readonly description?: string;
  readonly narrativePurpose?: NarrativePurpose;
  readonly durationSec?: number;
  readonly timeOfDay?: TimeOfDay;
  readonly weather?: Weather;
  readonly locationId?: string;
  /** Quién anda por la escena. Si se declara, los planos solo pueden sacar a estos. */
  readonly characterIds?: readonly string[];
  readonly objectIds?: readonly string[];
  readonly characterStates?: readonly CharacterState[];
  readonly actions?: readonly string[];
  readonly dialogue?: readonly DialogueLine[];
  readonly visual?: VisualDirection;
  readonly audio?: AudioDirection;
  readonly continuity?: ContinuityRule;
  /** De qué escenas continúa esta. Si una cambia, esta puede tener que rehacerse. */
  readonly dependsOn?: readonly string[];
  readonly shots: readonly ProductionShot[];
}

/**
 * UN PLANO, tal como lo necesita una producción.
 *
 * No sustituye a `ShotNode`: es lo que la producción sabe del plano, y
 * `requisitos.ts` lo traduce a un `ShotNode` en borrador. Tipo de plano, cámara,
 * óptica, movimiento y composición están en `visual.creative`; el look en
 * palabras, en `visual.style`.
 *
 * ── Lo que un plano NO lleva ────────────────────────────────────────────────
 *
 * Ni proveedor, ni modelo, ni semilla, ni URL: la misma lista que el Core
 * prohíbe en un nodo, y la validación la aplica aquí. El prompt avanzado es la
 * ÚNICA excepción, y vive aparte, en `advanced.prompt`: es texto de la persona
 * para cuando quiere escribirlo ella; nunca pasa a un `ShotNode` y nunca se
 * mezcla con el vocabulario creativo.
 */
export interface ProductionShot {
  readonly id: string;
  readonly order: number;
  readonly durationSec?: number;
  readonly description?: string;
  readonly visual?: VisualDirection;
  readonly subject?: ShotSubject;
  readonly characterIds?: readonly string[];
  readonly objectIds?: readonly string[];
  readonly characterStates?: readonly CharacterState[];
  readonly actions?: readonly string[];
  readonly dialogue?: readonly DialogueLine[];
  readonly audio?: AudioDirection;
  readonly referenceIds?: readonly string[];
  readonly continuity?: ContinuityRule;
  /** De qué planos depende su resultado. El mismo límite que `ShotNode.dependsOnShotIds`. */
  readonly dependsOn?: readonly string[];
  readonly generation?: ShotGeneration;
  readonly advanced?: AdvancedDirection;
}

/** A quién o a qué mira la cámara, y a qué parte. */
export interface ShotSubject {
  readonly characterId?: string;
  readonly objectId?: string;
  readonly focus?: SubjectFocus;
  readonly description?: string;
}

/** Cómo está un personaje AQUÍ: la ropa de esta escena, que va mojado… */
export interface CharacterState {
  readonly characterId: string;
  readonly wardrobe?: string;
  readonly appearanceNotes?: string;
}

export interface ShotGeneration {
  readonly quality?: ProductionQuality;
}

/** El texto que la persona escribe cuando quiere dirigir con sus palabras. */
export interface AdvancedDirection {
  readonly prompt: string;
}

export interface DialogueLine {
  readonly id: string;
  readonly kind: DialogueKind;
  /** Quién habla. Obligatorio en `dialogue` y `voiceover`; prohibido en `narration`. */
  readonly characterId?: string;
  /** Lo que se dice. Es contenido: no se traduce. */
  readonly text: string;
  /** BCP 47. Ausente = el idioma de la producción. */
  readonly language?: string;
  readonly emotion?: string;
  /** Si alguien ya sabe cuánto dura, manda sobre la estimación. */
  readonly estimatedSec?: number;
}

/* ── Personajes, apariencia, lugares, objetos y referencias ──────────────── */

/**
 * UN PERSONAJE, preparado para un futuro Weë Character Identity Engine.
 *
 * Todo es descripción: no hay embeddings, ni identidad biométrica, ni ids de un
 * proveedor —tampoco un id de voz—. Si el personaje ya es un Element de la
 * cuenta, `element` lo dice, en su versión.
 */
export interface ProductionCharacter {
  readonly id: string;
  readonly name: string;
  readonly identityDescription?: string;
  readonly apparentAge?: ApparentAge;
  readonly physicalCharacteristics?: readonly string[];
  readonly appearance?: AppearanceProfile;
  readonly referenceIds?: readonly string[];
  readonly voice?: VoiceReference;
  readonly relationships?: readonly CharacterRelationship[];
  readonly continuity?: CharacterContinuity;
  readonly element?: ElementBinding;
}

export interface ApparentAge {
  readonly minYears?: number;
  readonly maxYears?: number;
}

/** Cómo suena alguien, descrito. `referenceId` señala una referencia de audio de la producción. */
export interface VoiceReference {
  readonly description?: string;
  readonly referenceId?: string;
  readonly language?: string;
}

export interface CharacterRelationship {
  readonly characterId: string;
  readonly kind: RelationshipKind;
  readonly description?: string;
}

/** Qué rasgos de este personaje no cambian en toda la producción. */
export interface CharacterContinuity {
  readonly locked?: readonly AppearanceTraitKey[];
  readonly strength?: ContinuityRequirements['strength'];
}

export interface AppearanceTrait {
  readonly description?: string;
  readonly referenceIds?: readonly string[];
}

export interface AppearanceColors extends AppearanceTrait {
  /** Colores `#RRGGBB`. */
  readonly palette?: readonly string[];
}

/**
 * LA APARIENCIA, RASGO A RASGO. La misma interfaz sirve a un personaje (rostro,
 * pelo, cuerpo, vestuario, maquillaje), a un objeto (materiales, colores) y a un
 * lugar (entorno, luz): cada uno rellena lo suyo.
 */
export interface AppearanceProfile {
  readonly face?: AppearanceTrait;
  readonly hair?: AppearanceTrait;
  readonly body?: AppearanceTrait;
  readonly wardrobe?: AppearanceTrait;
  readonly accessories?: AppearanceTrait;
  readonly makeup?: AppearanceTrait;
  readonly materials?: AppearanceTrait;
  readonly colors?: AppearanceColors;
  readonly lighting?: AppearanceTrait;
  readonly visualStyle?: AppearanceTrait;
  readonly environment?: AppearanceTrait;
}

export interface ProductionLocation {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly setting?: LocationSetting;
  readonly appearance?: AppearanceProfile;
  readonly referenceIds?: readonly string[];
  readonly element?: ElementBinding;
}

export interface ProductionObject {
  readonly id: string;
  readonly name: string;
  readonly kind?: ObjectKind;
  readonly description?: string;
  readonly appearance?: AppearanceProfile;
  readonly referenceIds?: readonly string[];
  readonly element?: ElementBinding;
}

/**
 * UNA REFERENCIA: un material que ya existe y que la producción usa. Se señala
 * por su id —del Content Core o de un Element—, nunca por una URL: una URL aquí
 * sería una puerta a cualquier sitio.
 */
export interface ProductionReference {
  readonly id: string;
  readonly kind: AssetKind;
  readonly role?: ReferenceRole;
  readonly assetId?: string;
  readonly element?: ElementBinding;
  readonly description?: string;
}

/* ── Audio ────────────────────────────────────────────────────────────────── */

/**
 * CINCO COSAS QUE SUENAN, cada una en su sitio:
 *   voz        la del narrador aquí; la de cada personaje, en su ficha.
 *   diálogo    las líneas, dentro de las escenas y los planos.
 *   música, efectos y ambiente: `cues`, con a qué parte de la producción van.
 * Son requisitos: qué tiene que sonar, no con qué se hace.
 */
export interface AudioPlan {
  readonly narrator?: VoiceReference;
  readonly cues: readonly AudioCue[];
}

export interface AudioCue {
  readonly id: string;
  readonly kind: AudioCueKind;
  readonly description: string;
  readonly target: AudioTarget;
  /** Lo que tiene que durar, si no es lo que dura su tramo. */
  readonly durationSec?: number;
  /** Nivel en la mezcla, de 0 a 1. */
  readonly volume?: number;
  readonly referenceIds?: readonly string[];
}

export type AudioTarget =
  | { readonly scope: 'production' }
  | { readonly scope: 'scenes'; readonly sceneIds: readonly string[] }
  | { readonly scope: 'shot'; readonly shotId: string };

/* ── Generación, montaje y entrega ───────────────────────────────────────── */

/** Preferencias, no órdenes de ejecución: quién genera y cómo es de otra capa. */
export interface GenerationPreferences {
  readonly quality?: ProductionQuality;
  readonly preview?: PreviewPolicy;
}

/**
 * EL MONTAJE, COMO PLAN. La secuencia y las marcas de escena se DERIVAN del orden
 * de escenas y planos —`lineaDeTiempo` en requisitos.ts—; las transiciones son
 * las de `creative.transition` de cada plano. Aquí queda lo que no se puede
 * derivar: la mezcla de cada pista, los subtítulos y las marcas propias.
 */
export interface EditPlan {
  readonly tracks?: readonly EditTrack[];
  readonly subtitles?: SubtitlePlan;
  readonly markers?: readonly EditMarker[];
}

export interface EditTrack {
  readonly kind: EditTrackKind;
  readonly muted?: boolean;
  readonly volume?: number;
}

export interface SubtitlePlan {
  readonly enabled: boolean;
  readonly language?: string;
  readonly position?: SubtitlePosition;
  readonly style?: SubtitleStyle;
}

export interface EditMarker {
  readonly id: string;
  readonly atShotId: string;
  readonly label?: string;
}

export interface ExportPlan {
  readonly targets: readonly ExportTarget[];
}

/** Una entrega. Sin formato propio, es el de la producción. */
export interface ExportTarget {
  readonly id: string;
  readonly purpose?: ExportPurpose;
  readonly aspectRatio?: AspectRatio;
  readonly resolution?: ResolutionTarget;
  readonly maxDurationSec?: number;
  readonly subtitleMode?: SubtitleMode;
  /** Para qué destino es. Un preset, no una publicación. */
  readonly context?: FormatPresetId;
}

/** `revision` sube uno con cada operación que cambia algo: sin reloj, y comparable. */
export interface ProductionMetadata {
  readonly revision: number;
  /** El idioma de trabajo de la producción (diálogos y subtítulos). BCP 47. */
  readonly locale?: string;
  readonly tags?: readonly string[];
}

/* ── La producción ────────────────────────────────────────────────────────── */

export interface FilmmakerProduction {
  readonly version: typeof FILMMAKER_MODEL_VERSION;
  /** Id lógico, si quien la guarde se lo da. El dominio no lo necesita. */
  readonly id?: string;
  readonly title: string;
  readonly intent: ProductionIntent;
  readonly creativeDirection: CreativeDirection;
  readonly format: ProductionFormat;
  readonly duration: ProductionDuration;
  readonly scenes: readonly ProductionScene[];
  readonly characters: readonly ProductionCharacter[];
  readonly locations: readonly ProductionLocation[];
  readonly objects: readonly ProductionObject[];
  readonly references: readonly ProductionReference[];
  readonly audio: AudioPlan;
  /** Lo que vale para toda la producción. Las escenas y los planos lo afinan. */
  readonly continuity?: ContinuityRule;
  readonly generation: GenerationPreferences;
  readonly editPlan: EditPlan;
  readonly exportPlan: ExportPlan;
  readonly metadata: ProductionMetadata;
}

/** Una producción sin nada dentro. Sin reloj ni azar: lo que se le pasa es lo que sale. */
export const produccionVacia = (p: {
  readonly title: string;
  readonly aspectRatio: AspectRatio;
  readonly id?: string;
  readonly resolution?: ResolutionTarget;
}): FilmmakerProduction => ({
  version: FILMMAKER_MODEL_VERSION,
  ...(p.id !== undefined ? { id: p.id } : {}),
  title: p.title,
  intent: {},
  creativeDirection: {},
  format: { aspectRatio: p.aspectRatio, ...(p.resolution !== undefined ? { resolution: p.resolution } : {}) },
  duration: {},
  scenes: [],
  characters: [],
  locations: [],
  objects: [],
  references: [],
  audio: { cues: [] },
  generation: {},
  editPlan: {},
  exportPlan: { targets: [] },
  metadata: { revision: 0 },
});

/* ── Leer una producción ──────────────────────────────────────────────────── */

export interface UbicacionDePlano {
  readonly scene: ProductionScene;
  readonly shot: ProductionShot;
  readonly sceneIndex: number;
  readonly shotIndex: number;
}

export const buscarEscena = (
  prod: FilmmakerProduction,
  sceneId: string,
): { readonly scene: ProductionScene; readonly index: number } | undefined => {
  const index = prod.scenes.findIndex((s) => s.id === sceneId);
  return index < 0 ? undefined : { scene: prod.scenes[index], index };
};

export const buscarPlano = (prod: FilmmakerProduction, shotId: string): UbicacionDePlano | undefined => {
  for (let i = 0; i < prod.scenes.length; i++) {
    const j = prod.scenes[i].shots.findIndex((s) => s.id === shotId);
    if (j >= 0) return { scene: prod.scenes[i], shot: prod.scenes[i].shots[j], sceneIndex: i, shotIndex: j };
  }
  return undefined;
};

/** «La escena 3» de una persona es `order` 2. El número humano empieza en 1. */
export const escenaPorNumero = (prod: FilmmakerProduction, numero: number): ProductionScene | undefined =>
  Number.isInteger(numero) && numero >= 1 ? prod.scenes[numero - 1] : undefined;

export const planoPorNumero = (
  prod: FilmmakerProduction,
  numeroDeEscena: number,
  numeroDePlano: number,
): ProductionShot | undefined => {
  const escena = escenaPorNumero(prod, numeroDeEscena);
  return escena && Number.isInteger(numeroDePlano) && numeroDePlano >= 1 ? escena.shots[numeroDePlano - 1] : undefined;
};

/**
 * LAS UNIDADES QUE SE GENERAN: cada plano, y cada escena que aún no tiene planos
 * (se genera entera, como un plano implícito). En orden de montaje.
 */
export interface Unidad {
  /** El id del plano, o el de la escena si es implícita. */
  readonly unitId: string;
  readonly scene: ProductionScene;
  readonly shot?: ProductionShot;
  readonly sceneIndex: number;
  readonly shotIndex?: number;
}

export const unidades = (prod: FilmmakerProduction): readonly Unidad[] => {
  const salida: Unidad[] = [];
  prod.scenes.forEach((scene, sceneIndex) => {
    if (!scene.shots.length) { salida.push({ unitId: scene.id, scene, sceneIndex }); return; }
    scene.shots.forEach((shot, shotIndex) => salida.push({ unitId: shot.id, scene, shot, sceneIndex, shotIndex }));
  });
  return salida;
};

/** Todos los ids de la producción: el espacio de nombres único. */
export const idsDeLaProduccion = (prod: FilmmakerProduction): Set<string> => {
  const ids = new Set<string>();
  for (const s of prod.scenes) {
    ids.add(s.id);
    for (const l of s.dialogue ?? []) ids.add(l.id);
    for (const p of s.shots) {
      ids.add(p.id);
      for (const l of p.dialogue ?? []) ids.add(l.id);
    }
  }
  for (const c of prod.characters) ids.add(c.id);
  for (const l of prod.locations) ids.add(l.id);
  for (const o of prod.objects) ids.add(o.id);
  for (const r of prod.references) ids.add(r.id);
  for (const c of prod.audio.cues) ids.add(c.id);
  for (const t of prod.exportPlan.targets) ids.add(t.id);
  for (const m of prod.editPlan.markers ?? []) ids.add(m.id);
  return ids;
};

/**
 * UN ID NUEVO, DERIVADO Y NO INVENTADO: `base-2`, `base-3`… el primero libre.
 * Sin azar ni reloj, así que la misma producción da siempre el mismo id.
 */
export const derivarId = (base: string, ocupados: ReadonlySet<string>): string => {
  for (let n = 2; ; n++) {
    const sufijo = `-${n}`;
    const candidato = `${base.slice(0, 128 - sufijo.length)}${sufijo}`;
    if (!ocupados.has(candidato)) return candidato;
  }
};

/* ── Duraciones, en milisegundos enteros ─────────────────────────────────── */

/*
 * Se suman milisegundos enteros, no segundos con decimales: 5,1 + 0,2 en coma
 * flotante no es 5,3, y una producción no puede depender de cómo redondea nadie.
 */
export const aMs = (sec: number): number => Math.round(sec * 1000);
export const aSec = (ms: number): number => ms / 1000;

/** Lo que dura una escena: lo que suman sus planos o, si no se sabe, lo que declara. */
export const duracionDeEscenaMs = (scene: ProductionScene): number | undefined => {
  if (scene.shots.length && scene.shots.every((s) => s.durationSec !== undefined)) {
    return scene.shots.reduce((t, s) => t + aMs(s.durationSec as number), 0);
  }
  return scene.durationSec !== undefined ? aMs(scene.durationSec) : undefined;
};

/** Lo que dura la producción entera, o `undefined` si alguna escena no se sabe. */
export const duracionTotalMs = (prod: FilmmakerProduction): number | undefined => {
  let total = 0;
  for (const s of prod.scenes) {
    const d = duracionDeEscenaMs(s);
    if (d === undefined) return undefined;
    total += d;
  }
  return total;
};

/** Lo que dura una unidad generable. */
export const duracionDeUnidadMs = (u: Unidad): number | undefined =>
  u.shot ? (u.shot.durationSec !== undefined ? aMs(u.shot.durationSec) : undefined) : duracionDeEscenaMs(u.scene);

/* ── Lo que vale en cada plano: lo propio y lo heredado ──────────────────── */

/**
 * LA INTENCIÓN CREATIVA QUE VALE EN UN PLANO: la suya, completada con la de la
 * escena y después con la de la producción, con `completarCreativos` del Core
 * —lo más cercano manda, lo de fuera solo rellena—. El encuadre es siempre el
 * formato de la producción.
 *
 * Una cámara quieta no tiene velocidad: es la regla de coherencia del Core. Si
 * el plano dice `static` y la velocidad venía de fuera, la velocidad heredada no
 * se aplica; no es una prioridad inventada, es que no significa nada.
 */
export const creativoEfectivo = (
  prod: FilmmakerProduction,
  scene: ProductionScene,
  shot?: ProductionShot,
): CreativeParameters => {
  const encuadre: CreativeParameters = { version: versionCreativaActual(), framing: { aspectRatio: prod.format.aspectRatio } };
  const heredado = completarCreativos(
    completarCreativos(shot?.visual?.creative, scene.visual?.creative),
    prod.creativeDirection.cinematography,
  );
  const efectivo = completarCreativos(heredado, encuadre) as CreativeParameters;
  return efectivo.movement?.type === 'static' && efectivo.movement.speed !== undefined
    ? { ...efectivo, movement: { type: 'static' } }
    : efectivo;
};

/**
 * LA CONTINUIDAD QUE VALE EN UN PLANO. Para cada aspecto decide el nivel más
 * cercano que hable de él —plano, escena, producción—: si la escena dice que la
 * ropa puede cambiar, eso manda sobre la producción que la conservaba. Los
 * anclajes y las relaciones se suman; la fuerza es la del nivel más cercano que
 * la diga. Sin nada que conservar no hay requisito.
 */
export const continuidadEfectiva = (
  prod: FilmmakerProduction,
  scene: ProductionScene,
  shot?: ProductionShot,
): ContinuityRule | undefined => {
  const niveles = [shot?.continuity, scene.continuity, prod.continuity]
    .filter((c): c is ContinuityRule => c !== undefined);
  if (!niveles.length) return undefined;
  const decision = new Map<ContinuityAspect, 'preserve' | 'mayChange'>();
  for (const nivel of niveles) {
    for (const a of nivel.preserve) if (!decision.has(a)) decision.set(a, 'preserve');
    for (const a of nivel.mayChange ?? []) if (!decision.has(a)) decision.set(a, 'mayChange');
  }
  const preserve = ASPECTOS_DE_CONTINUIDAD.filter((a) => decision.get(a) === 'preserve');
  if (!preserve.length) return undefined;
  const mayChange = ASPECTOS_DE_CONTINUIDAD.filter((a) => decision.get(a) === 'mayChange');
  const anchors: string[] = [];
  const spatial: EntitySpatialConstraint[] = [];
  const vistas = new Set<string>();
  for (const nivel of niveles) {
    for (const a of nivel.anchors ?? []) if (!anchors.includes(a)) anchors.push(a);
    for (const r of nivel.spatial ?? []) {
      const clave = `${r.subject}|${r.relation}|${r.object}`;
      if (!vistas.has(clave)) { vistas.add(clave); spatial.push(r); }
    }
  }
  const strength = niveles.map((n) => n.strength).find((s) => s !== undefined);
  return {
    preserve,
    ...(mayChange.length ? { mayChange } : {}),
    ...(strength !== undefined ? { strength } : {}),
    ...(anchors.length ? { anchors } : {}),
    ...(spatial.length ? { spatial } : {}),
  };
};

/** Cómo está un personaje en un plano: lo que diga el plano, y lo que no, lo de su escena. */
export const estadoEfectivo = (
  scene: ProductionScene,
  shot: ProductionShot | undefined,
  characterId: string,
): CharacterState | undefined => {
  const deEscena = (scene.characterStates ?? []).find((s) => s.characterId === characterId);
  const dePlano = (shot?.characterStates ?? []).find((s) => s.characterId === characterId);
  if (!deEscena && !dePlano) return undefined;
  const wardrobe = dePlano?.wardrobe ?? deEscena?.wardrobe;
  const appearanceNotes = dePlano?.appearanceNotes ?? deEscena?.appearanceNotes;
  return {
    characterId,
    ...(wardrobe !== undefined ? { wardrobe } : {}),
    ...(appearanceNotes !== undefined ? { appearanceNotes } : {}),
  };
};

/** Quién sale en un plano: los suyos, o los de la escena si el plano no dice nada. */
export const repartoDelPlano = (scene: ProductionScene, shot?: ProductionShot): readonly string[] =>
  shot?.characterIds ?? scene.characterIds ?? [];

/** La voz con la que suena una línea: la del narrador o la de su personaje. */
export const vozDeLinea = (prod: FilmmakerProduction, line: DialogueLine): VoiceReference | undefined =>
  line.kind === 'narration'
    ? prod.audio.narrator
    : prod.characters.find((c) => c.id === line.characterId)?.voice;

export const idiomaDeLinea = (prod: FilmmakerProduction, line: DialogueLine): string | undefined =>
  line.language ?? prod.metadata.locale;

/* ── Cuánto se tarda en decir algo ────────────────────────────────────────── */

/**
 * UN RITMO DE HABLA RÁPIDO, a propósito: sirve para avisar de que un diálogo
 * PROBABLEMENTE no cabe, y con un ritmo rápido solo se avisa cuando ni así
 * cabría. Las escrituras sin espacios —chino, japonés, coreano— se cuentan por
 * caracteres. Es una estimación y se dice que lo es; si una línea trae
 * `estimatedSec`, manda esa.
 */
export const RITMO_DE_HABLA = Object.freeze({ palabrasPorSegundo: 3, caracteresCjkPorSegundo: 6 });

/** Kana, ideogramas CJK y hangul: escrituras donde una palabra no se separa con espacios. */
const rango = (desde: number, hasta: number): string => `${String.fromCharCode(desde)}-${String.fromCharCode(hasta)}`;
const CJK = new RegExp(`[${rango(0x3040, 0x30ff)}${rango(0x3400, 0x4dbf)}${rango(0x4e00, 0x9fff)}${rango(0xac00, 0xd7af)}${rango(0xf900, 0xfaff)}]`, 'g');
/** Lo que no es una palabra: signos y símbolos sueltos, también los de ancho completo de las escrituras CJK. */
const PUNTUACION = new RegExp(`[.,;:!?¡¿"'«»“”‘’()[\\]{}…–—\\-_/\\\\*&%$#@+=<>|~^\`${rango(0x3000, 0x303f)}${rango(0xff00, 0xffef)}]`, 'g');

export const estimarHablaSec = (texto: string): number => {
  const cjk = (texto.match(CJK) ?? []).length;
  const palabras = texto.replace(CJK, ' ').split(/\s+/).filter((w) => w.replace(PUNTUACION, '').length > 0).length;
  return palabras / RITMO_DE_HABLA.palabrasPorSegundo + cjk / RITMO_DE_HABLA.caracteresCjkPorSegundo;
};

/** Lo que dura una línea: lo que diga ella, o la estimación. En milisegundos. */
export const duracionDeLineaMs = (l: DialogueLine): number =>
  aMs(l.estimatedSec !== undefined ? l.estimatedSec : estimarHablaSec(l.text));

/* ── Comparar sin depender del orden de las claves ───────────────────────── */

/**
 * JSON CON LAS CLAVES ORDENADAS. Dos objetos con lo mismo dan la misma cadena
 * aunque se construyeran en otro orden: es lo que permite comparar producciones
 * y firmas sin que el resultado dependa de cómo se escribió el código.
 */
export const canonico = (v: unknown): string => {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canonico(x))).join(',')}]`;
  const o = v as Record<string, unknown>;
  const claves = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`).join(',')}}`;
};

/** Orden de cadenas que no depende del idioma de la máquina. */
export const compararTexto = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
