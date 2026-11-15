/**
 * LO QUE SE PUEDE AÑADIR A MYWEËS, Y CÓMO SE LLAMA.
 *
 * Este catálogo guarda CLAVES, no frases: se importa fuera de React, donde no
 * hay traductor. Quien pinta resuelve —`t(clave)` para lo que es interfaz, el
 * nombre tal cual para lo que es marca—.
 *
 * Solo destinos con ruta real: la tabla de rutas está en `utils/myWees.ts`
 * (`destinoDeAcceso`) y los identificadores son los mismos. Añadir aquí un
 * destino sin su ruta allí no compila.
 */
import { NombreDeIcono } from '../components/icons/trazosDeWee';
import { ExperienciaDeMyWees, FuncionDeMyWees } from '../utils/myWees';

/**
 * LOS NOMBRES VISIBLES DE LAS EXPERIENCIAS (decisión del dueño, 2026-11-15).
 *
 * Pegados —WeëStudio, WeëDesign…— salvo Weë Brain. Son marca: se escriben igual
 * en todos los idiomas y no pasan por el diccionario. Los ids no cambian
 * (`business` sigue siendo el de WeëFashion): lo que cambia es lo que se lee.
 *
 * Es la fuente de estos nombres para las superficies del rediseño (MyWeës e
 * Historial). El catálogo de siempre, `constants/weeExperiences.ts`, conserva
 * su grafía hasta que se decida extenderla al resto de la app.
 */
export const NOMBRE_VISIBLE_DE_EXPERIENCIA: Record<ExperienciaDeMyWees, string> = {
  studio: 'WeëStudio',
  design: 'WeëDesign',
  chef: 'WeëChef',
  music: 'WeëMusic',
  business: 'WeëFashion',
  travel: 'WeëTravel',
  brain: 'Weë Brain',
};

/** El nombre corto del chip de Weë Brain en la tarjeta de WeëAI. Marca: igual en todos los idiomas. */
export const NOMBRE_CORTO_DE_BRAIN = 'Brain';

/** El nombre visible de una experiencia por su id; si no es una de las de arriba, el que traiga el catálogo. */
export const nombreVisibleDeExperiencia = (id: string, respaldo: string): string =>
  (NOMBRE_VISIBLE_DE_EXPERIENCIA as Record<string, string>)[id] ?? respaldo;

export interface FuncionAnadible {
  id: FuncionDeMyWees;
  icono: NombreDeIcono;
  /** La clave de i18n del nombre. `null` en la agenda: su nombre —ËContact o ẄContact— depende del perfil activo y lo da `useIdentidadActiva`. */
  clave: string | null;
}

/** Las funciones de Weë que se pueden añadir, en el orden en que se ofrecen. */
export const FUNCIONES_ANADIBLES: FuncionAnadible[] = [
  { id: 'pages', icono: 'documento', clave: 'menu.pages' },
  { id: 'projects', icono: 'carpeta', clave: 'menu.projectsTitle' },
  { id: 'creations', icono: 'galeria', clave: 'creaciones.title' },
  { id: 'saved', icono: 'marcador', clave: 'menu.saved' },
  { id: 'history', icono: 'reloj', clave: 'menu.history' },
  { id: 'communities', icono: 'comunidades', clave: 'menu.communities' },
  { id: 'weels', icono: 'weels', clave: 'menu.weels' },
  { id: 'explore', icono: 'brujula', clave: 'menu.explore' },
  { id: 'contacts', icono: 'econtact', clave: null },
  { id: 'messages', icono: 'weetalk', clave: 'nav.messages' },
  { id: 'credits', icono: 'credits', clave: 'menu.credits' },
];
