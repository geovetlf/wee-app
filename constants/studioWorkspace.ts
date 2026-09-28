import type { EntradaDeStudio } from './studioExperiences';

/**
 * WEË STUDIO · LO QUE ENSEÑA SU WORKSPACE, COMO CLAVES.
 *
 * Weë Studio es uno de los módulos de Weë AI y el único con este workspace: en
 * la web, una barra lateral con lo SUYO —dónde empezar, de dónde sacar ideas,
 * lo que ya es tuyo y sus herramientas—; en el teléfono, sus cuatro pestañas.
 * Nada de otros módulos de Weë AI (Brain, Design, Chef, Music, Travel…): siguen
 * en Weë AI, como siempre.
 *
 * Este archivo se importa fuera de React, donde no hay traductor: guarda CLAVES,
 * iconos y a qué ruta de la pila del Studio lleva cada cosa; quien pinta
 * resuelve. Ni una herramienta nueva: Filmmaker, la creación de vídeo y las
 * puertas de siempre del Studio (Imágenes, Texto, Voz), con sus mismas claves.
 */

/** Las rutas de la pila de Weë Studio (`navigation/StudioNavigator.tsx`). */
export type RutaDeStudio =
  | 'StudioInicio'
  | 'StudioInspira'
  | 'StudioProyectos'
  | 'StudioPerfil'
  | 'StudioVideo'
  | 'MisCreaciones'
  | 'Production'
  | 'CreatorFlow'
  | 'Project'
  | 'Projects';

export interface EntradaDelMarco {
  /** Identificador estable: con él se sabe cuál está encendida. */
  readonly id: string;
  /** La clave de i18n de su nombre. */
  readonly clave: string;
  readonly icono: string;
  readonly ruta: RutaDeStudio;
  /** Lo que la ruta necesita para abrir lo que la entrada promete: una puerta del Studio. */
  readonly params?: { readonly puerta: EntradaDeStudio };
}

/** Lo que es de todo el Studio: dónde empezar, de dónde sacar ideas y lo que ya es tuyo. */
export const SECCIONES_DEL_STUDIO: readonly EntradaDelMarco[] = Object.freeze([
  { id: 'inicio', clave: 'workspace.navHome', icono: 'home-outline', ruta: 'StudioInicio' },
  { id: 'inspira', clave: 'workspace.navInspire', icono: 'sparkles-outline', ruta: 'StudioInspira' },
  { id: 'proyectos', clave: 'workspace.navProjects', icono: 'folder-open-outline', ruta: 'StudioProyectos' },
  { id: 'creaciones', clave: 'workspace.navCreations', icono: 'images-outline', ruta: 'MisCreaciones' },
]);

/**
 * Las herramientas del Studio. Filmmaker primero —es el workspace profesional por
 * excelencia— y Vídeo, la puerta rápida a un solo clip; después las puertas de
 * siempre del Studio, que abren su panel en el inicio.
 */
export const HERRAMIENTAS_DEL_STUDIO: readonly EntradaDelMarco[] = Object.freeze([
  { id: 'filmmaker', clave: 'workspace.toolFilmmaker', icono: 'film-outline', ruta: 'Production' },
  { id: 'video', clave: 'workspace.toolVideo', icono: 'videocam-outline', ruta: 'StudioVideo' },
  { id: 'imagenes', clave: 'studio.imagesTitle', icono: 'image-outline', ruta: 'StudioInicio', params: { puerta: 'images' } },
  { id: 'texto', clave: 'studio.textTitle', icono: 'create-outline', ruta: 'StudioInicio', params: { puerta: 'text' } },
  { id: 'voz', clave: 'studio.voiceTitle', icono: 'mic-outline', ruta: 'StudioInicio', params: { puerta: 'voice' } },
] as EntradaDelMarco[]);

/**
 * WEË STUDIO EN EL TELÉFONO: CUATRO PESTAÑAS (referencia móvil del usuario,
 * 2026-09-28). Son del Studio, no de Weë: la navegación de la App no cambia y
 * esta barra solo existe dentro del workspace. Crear es el inicio del Studio;
 * Perfil, la cuenta —Credits, ajustes— y la vuelta a Weë.
 */
export interface PestanaDeStudio {
  readonly id: 'crear' | 'inspira' | 'proyectos' | 'perfil';
  readonly clave: string;
  readonly icono: string;
  readonly iconoPuesto: string;
  readonly ruta: RutaDeStudio;
}

export const PESTANAS_DE_STUDIO: readonly PestanaDeStudio[] = Object.freeze([
  { id: 'crear', clave: 'nav.create', icono: 'add-circle-outline', iconoPuesto: 'add-circle', ruta: 'StudioInicio' },
  { id: 'inspira', clave: 'nav.inspire', icono: 'compass-outline', iconoPuesto: 'compass', ruta: 'StudioInspira' },
  { id: 'proyectos', clave: 'nav.projects', icono: 'folder-outline', iconoPuesto: 'folder', ruta: 'StudioProyectos' },
  { id: 'perfil', clave: 'nav.profile', icono: 'person-circle-outline', iconoPuesto: 'person-circle', ruta: 'StudioPerfil' },
] as PestanaDeStudio[]);

/** Qué pestaña va puesta: lo que se crea es de Crear; lo que ya es tuyo, de Proyectos. */
export const pestanaDeStudio = (ruta: string | undefined): PestanaDeStudio['id'] => {
  switch (ruta) {
    case 'StudioInspira':
      return 'inspira';
    case 'StudioProyectos':
    case 'Projects':
    case 'Project':
    case 'MisCreaciones':
      return 'proyectos';
    case 'StudioPerfil':
      return 'perfil';
    default:
      return 'crear';
  }
};

/** Qué herramienta es cada experiencia de un trabajo en curso: la de la puerta de la que sale. */
const HERRAMIENTA_DE_LA_EXPERIENCIA: Readonly<Record<string, string>> = Object.freeze({
  studio: 'video', photo: 'imagenes', writer: 'texto', music: 'voz',
});
const HERRAMIENTA_DE_LA_PUERTA: Readonly<Record<string, string>> = Object.freeze({
  images: 'imagenes', videos: 'video', text: 'texto', voice: 'voz',
});

/**
 * QUÉ ENTRADA VA ENCENDIDA, a partir de la ruta de la pila y sus parámetros.
 *
 * El inicio con una puerta enciende esa puerta; Filmmaker, por su ruta; un
 * trabajo en curso (`CreatorFlow`) enciende la herramienta de la que sale, si se
 * sabe; y lo que ya es tuyo —un proyecto abierto— enciende Proyectos.
 */
export const entradaEncendida = (ruta: string | undefined, params: Readonly<Record<string, unknown>> | undefined): string => {
  switch (ruta) {
    case undefined:
    case 'StudioInicio': {
      const puerta = typeof params?.puerta === 'string' ? params.puerta : '';
      return HERRAMIENTA_DE_LA_PUERTA[puerta] ?? 'inicio';
    }
    case 'StudioInspira':
      return 'inspira';
    case 'StudioProyectos':
    case 'Projects':
    case 'Project':
      return 'proyectos';
    case 'MisCreaciones':
      return 'creaciones';
    case 'Production':
      return 'filmmaker';
    case 'StudioVideo':
      return 'video';
    case 'CreatorFlow': {
      const id = typeof params?.experienceId === 'string' ? params.experienceId : '';
      return HERRAMIENTA_DE_LA_EXPERIENCIA[id] ?? '';
    }
    default:
      return '';
  }
};
