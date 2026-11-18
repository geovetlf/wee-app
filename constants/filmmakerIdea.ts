/**
 * EL TALLER DE IDEA DE WEË FILMMAKER (etapa 1, 2026-11-17). Diseño: `_filmmaker-mision-2026-11-17/diseno/IDEA-NOTAS-DE-DISENO.md` y la
 * constitución de la misión. Solo DATOS de diseño: claves de `filmmaker.idea*`, identificadores e iconos. Nada de frases ni de lógica
 * (la lógica pura vive en `utils/ideaDeFilmmaker.ts`). Los identificadores viajan tal cual; lo que se lee se resuelve con `t()` donde se pinta.
 */
import type { NombreDeIcono } from '../components/icons/trazosDeWee';

/* La etapa siguiente a la Idea es el UNIVERSO (ola 2): «Continuar» crea la producción con la operación de siempre y abre la lámina. */

/**
 * EL COPILOTO QUE PROPONE Y COMPLETA — decisión **D5** (profundidad del copiloto y si preparar consume Credits): PENDIENTE.
 * Mientras sea `false` el taller NO llama a ninguna IA ni inventa respuestas: la interfaz recoge lo que la persona dice (tarjeta editable,
 * estructura derivada de sus respuestas) y la fila «Weë propone» sale cerrada con su motivo. Abrirlo es cambiar esta constante Y conectar
 * el canal de Weë Brain (la misma caja común, el contexto por parámetros): no hay otro asistente.
 */
export const COPILOTO_DEL_TALLER_ABIERTO = false;

/** Los tipos que tienen taller hoy. Serie y Videoclip siguen cerrados en la primera capa. */
export type TipoDeTaller = 'short' | 'film' | 'ad';
export const TIPOS_CON_TALLER: readonly TipoDeTaller[] = ['short', 'film', 'ad'];

/** Si se escribe y se envía sin haber elegido tipo, el taller arranca con este y lo dice (no se adivina con IA: no hay IA aquí). */
export const TIPO_POR_DEFECTO_AL_ENVIAR: TipoDeTaller = 'short';

/** Los topes de lo que se escribe en el taller (caracteres). El guion pegado admite hasta 12 000 (referencia Magiclight). */
export const TOPES = { titulo: 80, campo: 200, idea: 600, guion: 12000 } as const;

/** «Empezar con»: Idea y Guion funcionan; Libro y Visuales dependen de capacidades que no existen hoy (documento, imágenes de referencia: D1). */
export const EMPEZAR_CON = [
  { id: 'idea', clave: 'filmmaker.ideaStartIdea', cerrada: false },
  { id: 'script', clave: 'filmmaker.ideaStartScript', cerrada: false },
  { id: 'book', clave: 'filmmaker.ideaStartBook', cerrada: true, claveMotivo: 'filmmaker.ideaBookClosed' },
  { id: 'visuals', clave: 'filmmaker.ideaStartVisuals', cerrada: true, claveMotivo: 'filmmaker.ideaVisualsClosed' },
] as const;
export type EmpezarCon = (typeof EMPEZAR_CON)[number]['id'];

/** La hoja del «+»: Pegar texto abierto; el resto cerrado con su motivo (no se simula ninguna capacidad). */
export const ADJUNTOS = [
  { id: 'paste', clave: 'filmmaker.attachPaste', claveSub: 'filmmaker.attachPasteSub', icono: 'texto' as NombreDeIcono, cerrado: false },
  { id: 'document', clave: 'filmmaker.attachDocument', claveSub: 'filmmaker.attachDocumentSub', icono: 'documento' as NombreDeIcono, cerrado: true, claveMotivo: 'filmmaker.attachDocumentClosed' },
  { id: 'image', clave: 'filmmaker.attachImage', claveSub: 'filmmaker.attachImageSub', icono: 'galeria' as NombreDeIcono, cerrado: true, claveMotivo: 'filmmaker.hubClosedContract' },
  { id: 'audio', clave: 'filmmaker.attachAudio', claveSub: 'filmmaker.attachAudioSub', icono: 'ondas' as NombreDeIcono, cerrado: true, claveMotivo: 'filmmaker.hubAudioClosed' },
] as const;

export interface Opcion { readonly id: string; readonly clave: string; readonly icono?: NombreDeIcono }

/** La sensación con la que arranca el modo Guiado (5 tarjetas + «No sé»). */
export const SENSACIONES: readonly Opcion[] = [
  { id: 'emotion', clave: 'filmmaker.feelEmotion', icono: 'meGusta' },
  { id: 'intrigue', clave: 'filmmaker.feelIntrigue', icono: 'ojo' },
  { id: 'laugh', clave: 'filmmaker.feelLaugh', icono: 'risa' },
  { id: 'inspire', clave: 'filmmaker.feelInspire', icono: 'chispas' },
  { id: 'mystery', clave: 'filmmaker.feelMystery', icono: 'brujula' },
];

export const GENEROS: readonly Opcion[] = [
  { id: 'drama', clave: 'filmmaker.genreDrama' },
  { id: 'adventure', clave: 'filmmaker.genreAdventure' },
  { id: 'scifi', clave: 'filmmaker.genreScifi' },
  { id: 'romance', clave: 'filmmaker.genreRomance' },
  { id: 'fantasy', clave: 'filmmaker.genreFantasy' },
];

/** En un anuncio la segunda pregunta es el escenario. */
export const ESCENARIOS: readonly Opcion[] = [
  { id: 'home', clave: 'filmmaker.sceneHome' },
  { id: 'city', clave: 'filmmaker.sceneCity' },
  { id: 'nature', clave: 'filmmaker.sceneNature' },
  { id: 'studio', clave: 'filmmaker.sceneStudio' },
  { id: 'abstract', clave: 'filmmaker.sceneAbstract' },
];

export const PROTAGONISTAS: readonly Opcion[] = [
  { id: 'young', clave: 'filmmaker.heroYoung' },
  { id: 'kid', clave: 'filmmaker.heroKid' },
  { id: 'elder', clave: 'filmmaker.heroElder' },
  { id: 'animal', clave: 'filmmaker.heroAnimal' },
  { id: 'robot', clave: 'filmmaker.heroRobot' },
];

/** Duraciones objetivo sugeridas por tipo (segundos). Son del diseño, no del contrato; el tope por plano lo marca el modelo en Planos (D7). */
export const DURACIONES: Record<TipoDeTaller, readonly number[]> = { short: [30, 60, 90, 120], film: [120, 180, 300, 600], ad: [15, 30] };
export const DURACION_POR_DEFECTO: Record<TipoDeTaller, number> = { short: 60, film: 120, ad: 15 };
export const FORMATOS_DE_ANUNCIO: readonly string[] = ['4:5', '9:16'];

/** Arranques del modo Directo: rellenan la frase de la tarjeta (no son una respuesta de IA). */
export const ARRANQUES: Record<TipoDeTaller, readonly { id: string; clave: string; claveFrase: string }[]> = {
  short: [
    { id: 'goodbye', clave: 'filmmaker.startGoodbye', claveFrase: 'filmmaker.startGoodbyeIdea' },
    { id: 'secret', clave: 'filmmaker.startSecret', claveFrase: 'filmmaker.startSecretIdea' },
    { id: 'chase', clave: 'filmmaker.startChase', claveFrase: 'filmmaker.startChaseIdea' },
  ],
  film: [
    { id: 'goodbye', clave: 'filmmaker.startGoodbye', claveFrase: 'filmmaker.startGoodbyeIdea' },
    { id: 'secret', clave: 'filmmaker.startSecret', claveFrase: 'filmmaker.startSecretIdea' },
    { id: 'chase', clave: 'filmmaker.startChase', claveFrase: 'filmmaker.startChaseIdea' },
  ],
  ad: [
    { id: 'everyday', clave: 'filmmaker.startAdEveryday', claveFrase: 'filmmaker.startAdEverydayIdea' },
    { id: 'before', clave: 'filmmaker.startAdBefore', claveFrase: 'filmmaker.startAdBeforeIdea' },
    { id: 'promise', clave: 'filmmaker.startAdPromise', claveFrase: 'filmmaker.startAdPromiseIdea' },
  ],
};

/** Las preguntas del modo Guiado, por tipo. `choice` = tarjetas con «No sé»; `text` = se contesta en la caja común (con «Saltar»). */
export type PasoGuiado =
  | { readonly campo: string; readonly clase: 'choice'; readonly claveTitulo: string; readonly opciones: readonly Opcion[] }
  | { readonly campo: string; readonly clase: 'text'; readonly claveTitulo: string; readonly clavePlaceholder: string };

const PASO_SENSACION: PasoGuiado = { campo: 'sensation', clase: 'choice', claveTitulo: 'filmmaker.askFeeling', opciones: SENSACIONES };
export const PASOS_GUIADOS: Record<TipoDeTaller, readonly PasoGuiado[]> = {
  short: [
    PASO_SENSACION,
    { campo: 'genre', clase: 'choice', claveTitulo: 'filmmaker.askGenre', opciones: GENEROS },
    { campo: 'protagonist', clase: 'choice', claveTitulo: 'filmmaker.askHero', opciones: PROTAGONISTAS },
    { campo: 'more', clase: 'text', claveTitulo: 'filmmaker.askMore', clavePlaceholder: 'filmmaker.askMorePlaceholder' },
  ],
  film: [
    PASO_SENSACION,
    { campo: 'genre', clase: 'choice', claveTitulo: 'filmmaker.askGenre', opciones: GENEROS },
    { campo: 'protagonist', clase: 'choice', claveTitulo: 'filmmaker.askHero', opciones: PROTAGONISTAS },
    { campo: 'more', clase: 'text', claveTitulo: 'filmmaker.askMore', clavePlaceholder: 'filmmaker.askMorePlaceholder' },
  ],
  ad: [
    PASO_SENSACION,
    { campo: 'scene', clase: 'choice', claveTitulo: 'filmmaker.askScene', opciones: ESCENARIOS },
    { campo: 'product', clase: 'text', claveTitulo: 'filmmaker.askProduct', clavePlaceholder: 'filmmaker.askProductPlaceholder' },
  ],
};

/** Los campos de la tarjeta viva «Tu idea», por tipo. `text` se edita escribiendo; `choice` y `duration`/`format` se eligen entre opciones. */
export interface CampoDeIdea {
  readonly id: string;
  readonly clave: string;
  readonly clase: 'text' | 'choice' | 'duration' | 'format';
  readonly opciones?: readonly Opcion[];
  readonly tope: number;
  /** Escritura larga (la frase de la idea): varias líneas. */
  readonly larga?: boolean;
}
const C = {
  title: { id: 'title', clave: 'filmmaker.fieldTitle', clase: 'text', tope: TOPES.titulo } as CampoDeIdea,
  idea: { id: 'idea', clave: 'filmmaker.fieldIdea', clase: 'text', tope: TOPES.idea, larga: true } as CampoDeIdea,
  sensation: { id: 'sensation', clave: 'filmmaker.fieldTone', clase: 'choice', opciones: SENSACIONES, tope: 0 } as CampoDeIdea,
  genre: { id: 'genre', clave: 'filmmaker.fieldGenre', clase: 'choice', opciones: GENEROS, tope: 0 } as CampoDeIdea,
  protagonist: { id: 'protagonist', clave: 'filmmaker.fieldHero', clase: 'choice', opciones: PROTAGONISTAS, tope: 0 } as CampoDeIdea,
  script: { id: 'script', clave: 'filmmaker.fieldScript', clase: 'text', tope: TOPES.guion, larga: true } as CampoDeIdea,
  twist: { id: 'twist', clave: 'filmmaker.fieldTwist', clase: 'text', tope: TOPES.campo } as CampoDeIdea,
  duration: { id: 'duration', clave: 'filmmaker.fieldDuration', clase: 'duration', tope: 0 } as CampoDeIdea,
  scene: { id: 'scene', clave: 'filmmaker.fieldScene', clase: 'choice', opciones: ESCENARIOS, tope: 0 } as CampoDeIdea,
  product: { id: 'product', clave: 'filmmaker.fieldProduct', clase: 'text', tope: TOPES.campo } as CampoDeIdea,
  brand: { id: 'brand', clave: 'filmmaker.fieldBrand', clase: 'text', tope: TOPES.campo } as CampoDeIdea,
  cta: { id: 'cta', clave: 'filmmaker.fieldCta', clase: 'text', tope: TOPES.campo } as CampoDeIdea,
  format: { id: 'format', clave: 'filmmaker.fieldFormat', clase: 'format', tope: 0 } as CampoDeIdea,
};
export const CAMPOS_DE_IDEA: Record<TipoDeTaller, readonly CampoDeIdea[]> = {
  short: [C.title, C.idea, C.script, C.sensation, C.genre, C.duration, C.protagonist, C.twist],
  film: [C.title, C.idea, C.script, C.sensation, C.genre, C.duration, C.protagonist, C.twist],
  ad: [C.title, C.idea, C.product, C.brand, C.cta, C.scene, C.sensation, C.duration, C.format],
};

/** La estructura base de cada tipo: los beats. Sale de la plantilla del tipo, no de una IA. */
export const ESTRUCTURA: Record<TipoDeTaller, readonly { id: string; clave: string }[]> = {
  short: [{ id: 'a1', clave: 'filmmaker.beatSetup' }, { id: 'a2', clave: 'filmmaker.beatConflict' }, { id: 'a3', clave: 'filmmaker.beatResolution' }],
  film: [{ id: 'a1', clave: 'filmmaker.beatAct1' }, { id: 'a2', clave: 'filmmaker.beatAct2' }, { id: 'a3', clave: 'filmmaker.beatAct3' }],
  ad: [{ id: 'b1', clave: 'filmmaker.beatHook' }, { id: 'b2', clave: 'filmmaker.beatProduct' }, { id: 'b3', clave: 'filmmaker.beatCta' }],
};

/** Segundos por plano que se asumen para estimar cuántos planos caben: es una estimación del diseño («≈»), no un límite del motor. */
export const SEGUNDOS_POR_PLANO_ESTIMADOS = 6;
