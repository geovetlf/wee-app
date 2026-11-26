/**
 * WEË MUSIC — EL MODELO DE UNA CANCIÓN EN LA INTERFAZ, Y LAS REGLAS DE HONESTIDAD.
 *
 * Puro: sin React, sin red. Aquí viven las reglas que impiden que la pantalla prometa más de lo que hay:
 *  · una lista de INSTRUMENTOS no es una lista de PISTAS: solo hay mezcla por pista si cada pista trae su propio
 *    audio (`urlStem`); con un solo estéreo, los instrumentos son una descripción, no canales;
 *  · una canción de EJEMPLO (`esEjemplo`) es un dato de diseño, nunca contenido de la persona;
 *  · editar una sección solo es «localizado» si el motor lo garantiza (`garantizaResto`); si no, es regenerar.
 *
 * Los tipos de sección e instrumento son identificadores de datos (viajan al contrato), no frases; sus nombres
 * visibles salen de las claves `music.section_*` / `music.instr_*`.
 */

export const TIPOS_DE_SECCION = ['intro', 'verse', 'preChorus', 'chorus', 'bridge', 'interlude', 'outro', 'other'] as const;
export type TipoDeSeccion = (typeof TIPOS_DE_SECCION)[number];

export const TIPOS_DE_INSTRUMENTO = ['vocals', 'drums', 'bass', 'piano', 'guitar', 'strings', 'synth', 'other'] as const;
export type TipoDeInstrumento = (typeof TIPOS_DE_INSTRUMENTO)[number];

export interface SeccionDeCancion {
  id: string;
  tipo: TipoDeSeccion;
  /** Se muestran solo si se conocen. */
  inicioSec?: number;
  finSec?: number;
}

export interface PistaDeCancion {
  id: string;
  tipo: TipoDeInstrumento;
  /** El audio PROPIO de esta pista. Sin él no hay mezcla por pista: solo un instrumento declarado. */
  urlStem?: string;
  volumen: number; // 0..1
  silenciada: boolean;
  solo: boolean;
}

export interface VersionDeCancion { id: string; creadaEn: number; etiqueta?: string }

export interface CancionDeMusic {
  id: string;
  titulo: string;
  /** Clave de género de `constants/musicComposer.ts`, si se conoce. */
  genero?: string;
  duracionSec?: number;
  voz?: string;
  audioUrl?: string;
  /** Niveles reales (0..1) de la forma de onda, si se calcularon del audio. */
  picos?: number[];
  letra?: string;
  secciones: SeccionDeCancion[];
  pistas: PistaDeCancion[];
  versiones: VersionDeCancion[];
  /** El motor garantiza que lo no seleccionado se conserva al regenerar una sección. */
  garantizaResto: boolean;
  /** DATO DE DISEÑO: se marca en pantalla y no se guarda como contenido de nadie. */
  esEjemplo: boolean;
  favorita?: boolean;
}

export type EstadoDeCapa =
  | 'vacio' | 'borrador' | 'preparado' | 'pendienteIntegracion' | 'noCompatible' | 'enProgreso' | 'completado'
  | 'error' | 'cancelado' | 'sinPermisos' | 'archivoIncompatible' | 'proveedorNoConfigurado' | 'costeDesconocido'
  | 'resultadoNoDisponible';

/** Clave de i18n del nombre visible de cada estado. */
export const CLAVE_DE_ESTADO_MUSIC: Record<EstadoDeCapa, string> = {
  vacio: 'stateEmpty', borrador: 'stateDraft', preparado: 'stateReady', pendienteIntegracion: 'statePending',
  noCompatible: 'stateIncompatible', enProgreso: 'stateInProgress', completado: 'stateDone', error: 'stateError',
  cancelado: 'stateCancelled', sinPermisos: 'stateNoPermission', archivoIncompatible: 'stateBadFile',
  proveedorNoConfigurado: 'stateNoProvider', costeDesconocido: 'stateUnknownCost', resultadoNoDisponible: 'stateNoResult',
};

/** 'pistasReales' si hay al menos una pista con audio propio; si no, 'soloEstereo' (no hay canales que mezclar). */
export const modoDeMezcla = (c: CancionDeMusic): 'pistasReales' | 'soloEstereo' =>
  c.pistas.some((p) => !!p.urlStem) ? 'pistasReales' : 'soloEstereo';

export const pistasConAudio = (c: CancionDeMusic): PistaDeCancion[] => c.pistas.filter((p) => !!p.urlStem);

/** Lo que se puede decir al editar una sección: regeneración localizada garantizada o regeneración que puede cambiar el resto. */
export const alcanceDeEdicion = (c: CancionDeMusic): 'localizada' | 'completa' => (c.garantizaResto ? 'localizada' : 'completa');

/** La duración de una sección, si sus dos extremos se conocen. */
export const duracionDeSeccion = (s: SeccionDeCancion): number | undefined =>
  s.inicioSec !== undefined && s.finSec !== undefined && s.finSec > s.inicioSec ? s.finSec - s.inicioSec : undefined;

/** Mm:ss con el formateador de números del idioma activo. */
export const tiempoMmSs = (seg: number, numero: (v: number, o?: Intl.NumberFormatOptions) => string): string => {
  const s = Math.max(0, Math.round(seg));
  return `${numero(Math.floor(s / 60))}:${numero(s % 60, { minimumIntegerDigits: 2 })}`;
};

/** Con «solo» activo en alguna pista, solo suenan las que lo tienen; una pista silenciada nunca suena. */
export const pistaSuena = (p: PistaDeCancion, todas: PistaDeCancion[]): boolean =>
  !p.silenciada && (!todas.some((x) => x.solo) || p.solo);

/**
 * LA CANCIÓN DE EJEMPLO — SOLO DISEÑO. Sin audio, sin portada y marcada `esEjemplo`. Sirve para ver la
 * workstation completa (timeline, secciones, pistas) antes de que exista una canción real. Nunca se guarda,
 * nunca se comparte y siempre lleva el aviso «Ejemplo de diseño». El título va vacío: la pantalla pone el texto
 * traducido del ejemplo (`music.exampleTitle`).
 */
export const cancionDeEjemplo = (): CancionDeMusic => ({
  id: 'ejemplo',
  titulo: '',
  genero: 'pop',
  duracionSec: 210,
  secciones: [
    { id: 's1', tipo: 'intro', inicioSec: 0, finSec: 15 },
    { id: 's2', tipo: 'verse', inicioSec: 15, finSec: 50 },
    { id: 's3', tipo: 'chorus', inicioSec: 50, finSec: 80 },
    { id: 's4', tipo: 'verse', inicioSec: 80, finSec: 115 },
    { id: 's5', tipo: 'chorus', inicioSec: 115, finSec: 150 },
    { id: 's6', tipo: 'bridge', inicioSec: 150, finSec: 180 },
    { id: 's7', tipo: 'outro', inicioSec: 180, finSec: 210 },
  ],
  pistas: TIPOS_DE_INSTRUMENTO.slice(0, 6).map((tipo, i) => ({ id: `p${i}`, tipo, urlStem: 'ejemplo', volumen: 0.8, silenciada: false, solo: false })),
  versiones: [{ id: 'v1', creadaEn: 0 }],
  garantizaResto: true,
  esEjemplo: true,
});

/**
 * EXPORTACIÓN DERIVADA DE LO QUE EXISTE. No hay una lista fija: cada formato sale de un recurso real de la canción.
 * `disponible` es verdadero solo si ese recurso existe hoy; MIDI no existe en ninguna operación del contrato y por eso
 * siempre figura como no disponible (nunca se ofrece como descarga).
 */
export type FormatoDeExportacion = 'audio' | 'stems' | 'lyrics' | 'midi';
export const formatosDeExportacion = (c: CancionDeMusic): { id: FormatoDeExportacion; disponible: boolean }[] => [
  { id: 'audio', disponible: !!c.audioUrl },
  { id: 'stems', disponible: pistasConAudio(c).length > 0 && !c.esEjemplo },
  { id: 'lyrics', disponible: !!c.letra?.trim() },
  { id: 'midi', disponible: false },
];
