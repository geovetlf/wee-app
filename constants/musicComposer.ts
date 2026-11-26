/**
 * WEË MUSIC — EL COMPOSER, COMO DATOS.
 *
 * Qué puntos de partida ofrece, qué parámetros sugiere y con qué opciones. Solo CLAVES de i18n (`music.*`) e
 * identificadores: los ids viajan al contrato (`functions/src/music/contract.ts`) y no se traducen; lo que se lee
 * lo resuelve quien pinta. El idioma de la canción se escribe con `nombreDelIdioma` (i18n/formato.ts), así que aquí
 * solo van los códigos. Nada de aquí llama a nadie.
 *
 * Los parámetros son SUGERENCIAS: ninguno es obligatorio, y cada uno declara de qué CAPACIDAD depende para que la
 * pantalla diga «pendiente» en vez de prometer (p. ej. el tempo solo existe si el proveedor lo admite: hoy no hay
 * proveedor, así que el control está preparado y marcado).
 */
import type { IdDeCapacidadMusic } from './musicCapabilities';

export type PuntoDePartidaId = 'idea' | 'lyrics' | 'audio' | 'hum' | 'upload' | 'instrumental' | 'draft';

export interface PuntoDePartida {
  readonly id: PuntoDePartidaId;
  /** Ionicons. */
  readonly icono: string;
  readonly claveTitulo: string;
  readonly claveAyuda: string;
  readonly capacidad: IdDeCapacidadMusic;
  /** Pide un audio (grabado o subido). */
  readonly pideAudio: boolean;
}

export const PUNTOS_DE_PARTIDA: readonly PuntoDePartida[] = [
  { id: 'idea', icono: 'bulb-outline', claveTitulo: 'startIdea', claveAyuda: 'startIdeaHelp', capacidad: 'generate', pideAudio: false },
  { id: 'lyrics', icono: 'document-text-outline', claveTitulo: 'startLyrics', claveAyuda: 'startLyricsHelp', capacidad: 'lyrics', pideAudio: false },
  { id: 'audio', icono: 'musical-notes-outline', claveTitulo: 'startAudio', claveAyuda: 'startAudioHelp', capacidad: 'referenceAudio', pideAudio: true },
  { id: 'hum', icono: 'mic-outline', claveTitulo: 'startHum', claveAyuda: 'startHumHelp', capacidad: 'humToSong', pideAudio: true },
  { id: 'upload', icono: 'cloud-upload-outline', claveTitulo: 'startUpload', claveAyuda: 'startUploadHelp', capacidad: 'referenceAudio', pideAudio: true },
  { id: 'instrumental', icono: 'pulse-outline', claveTitulo: 'startInstrumental', claveAyuda: 'startInstrumentalHelp', capacidad: 'instrumental', pideAudio: false },
  { id: 'draft', icono: 'bookmark-outline', claveTitulo: 'startDraft', claveAyuda: 'startDraftHelp', capacidad: 'draft', pideAudio: false },
];

/*
 * LAS PESTAÑAS DEL COMPOSER: POR DÓNDE SE EMPIEZA, A LA VISTA.
 *
 * Texto, Letra y Audio llevan a sus puntos de partida. Imagen, Extender y Remix no lo son: no hay canción de la que partir
 * ni motor conectado, y la pestaña lo dice. `claveEntera` es la clave completa: el rótulo ya existe en otro módulo y se
 * reutiliza para que la misma palabra se traduzca igual.
 */
export type PestanaDeMusic = 'text' | 'lyrics' | 'image' | 'audio' | 'extend' | 'remix';
export const PESTANAS_DE_MUSIC: readonly { readonly id: PestanaDeMusic; readonly icono: string; readonly claveEntera: string }[] = [
  { id: 'text', icono: 'text-outline', claveEntera: 'composer.kindText' },
  { id: 'lyrics', icono: 'document-text-outline', claveEntera: 'music.lyricsTitle' },
  { id: 'image', icono: 'image-outline', claveEntera: 'composer.kindImage' },
  { id: 'audio', icono: 'mic-outline', claveEntera: 'creaciones.kindAudio' },
  { id: 'extend', icono: 'play-forward-outline', claveEntera: 'music.trExtend' },
  { id: 'remix', icono: 'shuffle-outline', claveEntera: 'music.trRemix' },
];

/** Los puntos de partida que caben en la pestaña Audio. */
export const PUNTOS_DE_AUDIO: readonly PuntoDePartidaId[] = ['audio', 'hum', 'upload'];

export const pestanaDelPunto = (punto: PuntoDePartidaId): PestanaDeMusic =>
  punto === 'lyrics' ? 'lyrics' : PUNTOS_DE_AUDIO.includes(punto) ? 'audio' : 'text';

/* Cuánto se enseña de una vez. No cambia qué se manda: solo cuántos controles se ven. */
export type ModoDeMusic = 'simple' | 'custom' | 'advanced';
export const MODOS_DE_MUSIC: readonly { readonly id: ModoDeMusic; readonly claveTitulo: string }[] = [
  { id: 'simple', claveTitulo: 'modeSimple' },
  { id: 'custom', claveTitulo: 'modeCustom' },
  { id: 'advanced', claveTitulo: 'modeAdvanced' },
];

/** Las secciones de una canción que se enseñan en Avanzado: su estructura, todavía sin poder elegirse. */
export const SECCIONES_DE_ESTRUCTURA = ['intro', 'verse', 'chorus', 'bridge', 'outro'] as const;

export const puntoDePartida = (id: unknown): PuntoDePartida | undefined => PUNTOS_DE_PARTIDA.find((p) => p.id === id);

export interface OpcionDeMusic { readonly id: string; readonly clave: string }
export interface GrupoDeMusic {
  readonly id: 'genre' | 'mood' | 'voice' | 'duration' | 'language' | 'result';
  readonly claveTitulo: string;
  readonly opciones: readonly OpcionDeMusic[];
  /** Se puede elegir más de una. */
  readonly multiple?: boolean;
}

const o = (id: string, prefijo: string): OpcionDeMusic => ({ id, clave: `${prefijo}_${id}` });

export const GENEROS = ['pop', 'rock', 'hiphop', 'electronic', 'latin', 'rnb', 'jazz', 'classical', 'folk', 'reggaeton'] as const;

export const GRUPOS_DE_MUSIC: readonly GrupoDeMusic[] = [
  { id: 'genre', claveTitulo: 'groupGenre', opciones: GENEROS.map((g) => o(g, 'genre')) },
  { id: 'mood', claveTitulo: 'groupMood', opciones: ['happy', 'melancholic', 'energetic', 'calm', 'epic', 'romantic', 'dark', 'nostalgic'].map((g) => o(g, 'mood')) },
  { id: 'voice', claveTitulo: 'groupVoice', opciones: ['female', 'male', 'duet', 'none'].map((g) => o(g, 'voice')) },
  { id: 'duration', claveTitulo: 'groupDuration', opciones: ['30', '60', '120', '180'].map((g) => ({ id: g, clave: `duration_${g}` })) },
  { id: 'result', claveTitulo: 'groupResult', opciones: ['song', 'instrumental', 'jingle', 'loop'].map((g) => o(g, 'result')) },
];

/** Idiomas de la canción: solo códigos; el nombre sale de `nombreDelIdioma`. */
export const IDIOMAS_DE_CANCION = ['es', 'en', 'pt', 'fr', 'it', 'de', 'ja', 'ko'] as const;

/** Límite de la descripción (solo de la interfaz; el límite real lo fija cada proveedor). */
export const MAX_DESCRIPCION = 500;
/** Límite de la letra en la interfaz (conservador: el menor límite documentado entre proveedores es 3 000). */
export const MAX_LETRA = 3000;

/** Avanzadas: cada una cuelga de una capacidad y se marca como pendiente si no se puede usar. */
export interface AvanzadaDeMusic { readonly id: string; readonly claveTitulo: string; readonly claveAyuda: string; readonly capacidad: IdDeCapacidadMusic; readonly claveEntera?: string }
export const AVANZADAS_DE_MUSIC: readonly AvanzadaDeMusic[] = [
  { id: 'instruments', claveTitulo: 'toolInstruments', claveAyuda: 'capInstrumentNote', capacidad: 'instrumentEdit' },
  { id: 'tempo', claveTitulo: 'advTempo', claveAyuda: 'advTempoHelp', capacidad: 'generate' },
  { id: 'key', claveTitulo: 'advKey', claveAyuda: 'advTempoHelp', capacidad: 'generate' },
  { id: 'structure', claveTitulo: 'advStructure', claveAyuda: 'advStructureHelp', capacidad: 'sectionEdit' },
  { id: 'keepMelody', claveTitulo: 'advKeepMelody', claveAyuda: 'advKeepMelodyHelp', capacidad: 'referenceAudio' },
];

/** Qué hacer con la melodía de referencia. Solo se ofrece lo que el proveedor admita; hoy, nada está conectado. */
export const INTENCIONES_DE_REFERENCIA = ['keepMelody', 'inspire', 'transform', 'rhythm'] as const;
export type IntencionDeReferencia = (typeof INTENCIONES_DE_REFERENCIA)[number];

/** Transformaciones de estilo: cada una, atada a una operación del contrato. Sin operación cerrada, quedan «pendientes». */
export interface TransformacionDeMusic { readonly id: string; readonly claveTitulo: string; readonly claveAyuda: string; readonly capacidad: IdDeCapacidadMusic }
export const TRANSFORMACIONES_DE_MUSIC: readonly TransformacionDeMusic[] = [
  { id: 'changeStyle', claveTitulo: 'trChangeStyle', claveAyuda: 'trChangeStyleHelp', capacidad: 'remix' },
  { id: 'remix', claveTitulo: 'trRemix', claveAyuda: 'trRemixHelp', capacidad: 'remix' },
  { id: 'extend', claveTitulo: 'trExtend', claveAyuda: 'trExtendHelp', capacidad: 'extend' },
  { id: 'variation', claveTitulo: 'trVariation', claveAyuda: 'trVariationHelp', capacidad: 'generate' },
  { id: 'cover', claveTitulo: 'trCover', claveAyuda: 'trCoverHelp', capacidad: 'referenceAudio' },
  { id: 'remaster', claveTitulo: 'trRemaster', claveAyuda: 'trRemasterHelp', capacidad: 'audioProcessing' },
  { id: 'energy', claveTitulo: 'trEnergy', claveAyuda: 'trEnergyHelp', capacidad: 'sectionEdit' },
];

export interface SeleccionDeMusic {
  /** grupo → ids elegidos. */
  elegidas: Record<string, string[]>;
  idk: boolean;
  idioma?: string;
  intencion?: IntencionDeReferencia;
}
export const SELECCION_VACIA_MUSIC: SeleccionDeMusic = { elegidas: {}, idk: false };

/** Alterna una opción: los grupos no múltiples son de una sola; volver a tocarla la quita. */
export const alternarOpcionMusic = (s: SeleccionDeMusic, grupo: GrupoDeMusic, id: string): SeleccionDeMusic => {
  const actuales = s.elegidas[grupo.id] ?? [];
  const ya = actuales.includes(id);
  const nuevas = ya ? actuales.filter((x) => x !== id) : grupo.multiple ? [...actuales, id] : [id];
  return { ...s, elegidas: { ...s.elegidas, [grupo.id]: nuevas } };
};

export const hayEleccionMusic = (s: SeleccionDeMusic): boolean =>
  s.idk || !!s.idioma || Object.values(s.elegidas).some((v) => v.length > 0);

/**
 * LA INTENCIÓN ESTRUCTURADA — lo que el Composer le entregaría al contrato el día que haya generación validada.
 * Hoy NO sale de la pantalla (no hay a quién dárselo). Ids puros, sin frases, sin audio (el audio nunca se guarda).
 */
export interface IntencionDeMusic {
  punto: PuntoDePartidaId;
  descripcion: string;
  letra?: string;
  generos: string[];
  ambiente: string[];
  voz?: string;
  duracionSec?: number;
  resultado?: string;
  idioma?: string;
  referencia?: { origen: 'grabada' | 'subida'; intencion?: IntencionDeReferencia; duracionSec?: number };
  noSe: boolean;
}

export const crearIntencionMusic = (
  punto: PuntoDePartidaId,
  s: SeleccionDeMusic,
  descripcion: string,
  letra: string,
  referencia?: { origen: 'grabada' | 'subida'; duracionSec?: number },
): IntencionDeMusic => ({
  punto,
  descripcion: descripcion.trim().slice(0, MAX_DESCRIPCION),
  letra: letra.trim() ? letra.trim().slice(0, MAX_LETRA) : undefined,
  generos: s.elegidas.genre ?? [],
  ambiente: s.elegidas.mood ?? [],
  voz: s.elegidas.voice?.[0],
  duracionSec: s.elegidas.duration?.[0] ? Number(s.elegidas.duration[0]) : undefined,
  resultado: s.elegidas.result?.[0],
  idioma: s.idioma,
  referencia: referencia ? { ...referencia, intencion: s.intencion } : undefined,
  noSe: s.idk,
});

/** ¿Qué falta para poder pedir la canción? Ids de lo que falta (el botón de generar sigue cerrado de todos modos). */
export const queFaltaMusic = (
  punto: PuntoDePartidaId,
  descripcion: string,
  letra: string,
  hayReferencia: boolean,
): ('description' | 'lyrics' | 'audio')[] => {
  const falta: ('description' | 'lyrics' | 'audio')[] = [];
  const p = puntoDePartida(punto);
  if (p?.pideAudio && !hayReferencia) falta.push('audio');
  if (punto === 'lyrics' && !letra.trim()) falta.push('lyrics');
  if ((punto === 'idea' || punto === 'instrumental') && !descripcion.trim()) falta.push('description');
  return falta;
};
