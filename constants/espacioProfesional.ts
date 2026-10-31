import { Platform } from 'react-native';
import { WEE_EXPERIENCES } from './weeExperiences';

/**
 * WEË VERSIÓN CREATOR DE LA WEB, COMO DATOS.
 *
 * Todas las secciones de Weë AI que se ven en el menú salen de su fuente única,
 * así que una sección nueva aparece aquí sin tocar nada. Este archivo se importa
 * fuera de React: guarda claves e identificadores, y quien pinta resuelve.
 */
export const RUTA_DE_INICIO = 'WeeCreator';

/** Solo existe en la web: la app móvil no tiene ni la ruta, ni la dirección, ni la píldora. */
export const VERSION_PROFESIONAL_EN_LA_WEB = Platform.OS === 'web';

/** Lo que es de la cuenta: sin sesión, llevan a iniciarla. */
export const TRABAJO_DE_LA_CUENTA = Object.freeze([
  { id: 'projects', clave: 'profesional.projects', icono: 'folder-open-outline', ruta: 'Projects' },
  { id: 'creations', clave: 'profesional.creations', icono: 'images-outline', ruta: 'MisCreaciones' },
] as const);

const ICONOS: Readonly<Record<string, string>> = {
  brain: 'bulb-outline',
  studio: 'videocam-outline',
  design: 'color-palette-outline',
  music: 'musical-notes-outline',
  chef: 'restaurant-outline',
  business: 'shirt-outline',
  travel: 'airplane-outline',
};

export interface HerramientaProfesional {
  readonly id: string;
  /** Nombre de identidad: es marca y no se traduce. */
  readonly nombre: string;
  readonly icono: string;
}

export const HERRAMIENTAS_PROFESIONALES: readonly HerramientaProfesional[] = Object.freeze(
  WEE_EXPERIENCES.map((exp) => ({ id: exp.id, nombre: exp.name, icono: ICONOS[exp.id] ?? 'sparkles-outline' })),
);

/** Qué entrada va encendida según la ruta de la pila y su parámetro. */
export const entradaEncendida = (ruta: string | undefined, idDeSeccion: string, experiencia: string): string => {
  if (ruta === 'Specialist') return idDeSeccion;
  if (ruta === 'CreatorFlow' || ruta === 'WriterEditor') return experiencia;
  if (ruta === 'Projects' || ruta === 'Project') return 'projects';
  if (ruta === 'MisCreaciones') return 'creations';
  return 'home';
};
