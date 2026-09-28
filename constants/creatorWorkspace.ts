/**
 * WEË CREATOR · LO QUE ENSEÑA SU BARRA LATERAL, COMO CLAVES.
 *
 * Weë Creator es el taller profesional de Weë AI (decisión del usuario,
 * 2026-09-27): una interfaz propia, orientada a escritorio, con su navegación.
 * Este archivo se importa fuera de React, donde no hay traductor: guarda CLAVES,
 * iconos y a qué ruta de la pila de Weë Creator lleva cada cosa; quien pinta
 * resuelve.
 *
 * Ni una herramienta nueva: cada entrada abre una pantalla que YA existe —el
 * especialista de siempre, Filmmaker, Mis creaciones— o una de las cuatro de
 * Weë Creator (Inicio, Inspira, Proyectos, Video). Los especialistas salen de su
 * fuente única, `constants/weeExperiences.ts`, por su id; aquí solo se dice en qué
 * orden se enseñan y con qué icono de línea.
 */

/** Las rutas de la pila de Weë Creator (`navigation/CreatorNavigator.tsx`). */
export type RutaDeCreator =
  | 'CreatorInicio'
  | 'CreatorInspira'
  | 'CreatorProyectos'
  | 'CreatorVideo'
  | 'MisCreaciones'
  | 'Production'
  | 'Specialist'
  | 'CreatorFlow'
  | 'Project'
  | 'Projects';

export interface EntradaDeCreator {
  /** Identificador estable: con él se sabe cuál está encendida. */
  readonly id: string;
  /** La clave de i18n de su nombre. Sin ella, el nombre es el de la experiencia (`experienceId`). */
  readonly clave?: string;
  /** Si abre un especialista, su id en `constants/weeExperiences.ts`: el nombre es su marca. */
  readonly experienceId?: string;
  readonly icono: string;
  readonly ruta: RutaDeCreator;
}

/** Lo que es de TODO el taller: dónde empezar, de dónde sacar ideas y lo que ya es tuyo. */
export const SECCIONES_DE_CREATOR: readonly EntradaDeCreator[] = Object.freeze([
  { id: 'inicio', clave: 'workspace.navHome', icono: 'home-outline', ruta: 'CreatorInicio' },
  { id: 'inspira', clave: 'workspace.navInspire', icono: 'sparkles-outline', ruta: 'CreatorInspira' },
  { id: 'proyectos', clave: 'workspace.navProjects', icono: 'folder-open-outline', ruta: 'CreatorProyectos' },
  { id: 'creaciones', clave: 'workspace.navCreations', icono: 'images-outline', ruta: 'MisCreaciones' },
]);

/**
 * Las herramientas. Filmmaker primero —es el taller profesional por excelencia— y
 * Video, que es la puerta rápida a un solo clip; después los especialistas de
 * siempre, con su marca.
 */
export const HERRAMIENTAS_DE_CREATOR: readonly EntradaDeCreator[] = Object.freeze([
  { id: 'filmmaker', clave: 'workspace.toolFilmmaker', icono: 'film-outline', ruta: 'Production' },
  { id: 'video', clave: 'workspace.toolVideo', icono: 'videocam-outline', ruta: 'CreatorVideo' },
  { id: 'photo', experienceId: 'photo', icono: 'image-outline', ruta: 'Specialist' },
  { id: 'design', experienceId: 'design', icono: 'color-palette-outline', ruta: 'Specialist' },
  { id: 'writer', experienceId: 'writer', icono: 'document-text-outline', ruta: 'Specialist' },
  { id: 'music', experienceId: 'music', icono: 'musical-notes-outline', ruta: 'Specialist' },
  { id: 'business', experienceId: 'business', icono: 'briefcase-outline', ruta: 'Specialist' },
  { id: 'chef', experienceId: 'chef', icono: 'restaurant-outline', ruta: 'Specialist' },
  { id: 'beauty', experienceId: 'beauty', icono: 'color-wand-outline', ruta: 'Specialist' },
  { id: 'home', experienceId: 'home', icono: 'home-outline', ruta: 'Specialist' },
  { id: 'travel', experienceId: 'travel', icono: 'airplane-outline', ruta: 'Specialist' },
  { id: 'brain', experienceId: 'brain', icono: 'bulb-outline', ruta: 'Specialist' },
]);

/**
 * QUÉ ENTRADA VA ENCENDIDA, a partir de la ruta de la pila y sus parámetros.
 *
 * Un especialista se enciende por su id; Filmmaker por su ruta; un trabajo en
 * curso (`CreatorFlow`) enciende la herramienta de la que sale, si se sabe; y lo
 * que no es de nadie —un proyecto abierto— enciende Proyectos.
 */
export const entradaEncendida = (ruta: string | undefined, params: Record<string, unknown> | undefined): string => {
  switch (ruta) {
    case undefined:
    case 'CreatorInicio':
      return 'inicio';
    case 'CreatorInspira':
      return 'inspira';
    case 'CreatorProyectos':
    case 'Projects':
    case 'Project':
      return 'proyectos';
    case 'MisCreaciones':
      return 'creaciones';
    case 'Production':
      return 'filmmaker';
    case 'CreatorVideo':
      return 'video';
    case 'Specialist': {
      const id = typeof params?.id === 'string' ? params.id : 'brain';
      return id === 'studio' ? 'video' : id;
    }
    case 'CreatorFlow': {
      const id = typeof params?.experienceId === 'string' ? params.experienceId : '';
      return id === 'studio' ? 'video' : id;
    }
    default:
      return '';
  }
};
