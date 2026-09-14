/**
 * El menú de Weë, escrito una sola vez.
 *
 * Weë enseña el mismo menú en dos sitios: el cajón que abre el ☰ (móvil y web
 * estrecha) y la barra fija de escritorio. Eran dos componentes con dos listas
 * escritas a mano, y por eso se habían separado: en el cajón había "Perfil Real"
 * y "Perfil Weë", en la barra un solo "Perfil"; en uno los Credits estaban con la
 * cuenta y en la otra eran una píldora suelta arriba; Weëls llevaba 📹 en un sitio
 * y 🎬 en el otro. Nada de eso era una decisión: era que nadie las miraba juntas.
 *
 * Aquí viven el orden, los nombres y los iconos. Cada componente los pinta a su
 * manera —el cajón se desliza y se cierra, la barra está siempre— pero los dos
 * leen esto, así que no pueden volver a discrepar.
 *
 * Lo que NO vive aquí: qué hace cada opción. Navegar desde el cajón exige
 * cerrarlo antes; desde la barra, no. Esa diferencia es real y se queda en cada
 * componente.
 *
 * Las experiencias de Weë Creator tampoco están aquí: ya tenían su fuente única
 * en `constants/weeExperiences.ts`, y esa manda.
 */

import { NombreDeIcono } from '../components/icons/trazosDeWee';

/** Cada opción del menú, por su nombre. */
export type MenuItemId =
  | 'realProfile'
  | 'weeProfile'
  | 'credits'
  | 'econtact'
  | 'communities'
  | 'weels'
  | 'weetalk'
  | 'creator'
  | 'projects'
  | 'saved'
  | 'settings'
  | 'help';

export interface MenuItem {
  id: MenuItemId;
  /**
   * El icono dibujado, de `components/icons/trazosDeWee`.
   *
   * Es lo que pinta el cajón. Un emoji lo dibuja el sistema operativo: cambia de
   * un teléfono a otro, no acepta color ni grosor, y puestos en columna cada uno
   * viene de una familia distinta. Estos están dibujados con las mismas reglas.
   */
  icono: NombreDeIcono;
  /**
   * La clave de i18n de la etiqueta. Lo que se PINTA sale de aquí.
   *
   * `label` se queda debajo como el texto en español: sirve de documentación
   * cuando se lee esta tabla y de red de seguridad si algún sitio todavía no
   * hubiera pasado por `t()`.
   */
  clave: string;
  /**
   * El emoji de siempre.
   *
   * Sigue aquí porque la barra lateral de escritorio (`components/Sidebar.tsx`)
   * todavía lo pinta. El día que también use `icono`, este campo se va.
   */
  emoji: string;
  label: string;
}

/**
 * Nombres e iconos. Cambiar uno aquí lo cambia en las dos plataformas, que es
 * justo lo que faltaba.
 */
export const MENU_ITEM: Record<MenuItemId, MenuItem> = {
  realProfile: { id: 'realProfile', icono: 'perfilReal', clave: 'menu.realProfile', emoji: '👤', label: 'Perfil Real' },
  weeProfile: { id: 'weeProfile', icono: 'perfilWee', clave: 'menu.weeProfile', emoji: '🎭', label: 'Perfil Weë' },
  credits: { id: 'credits', icono: 'credits', clave: 'menu.credits', emoji: '💳', label: 'Credits' },
  /*
   * El nombre de tu agenda depende del perfil activo —ËContact con el Real,
   * ẄContact con el Weë—, así que los dos menús lo sobrescriben con lo que diga
   * `useIdentidadActiva`. Este es el de por defecto: el del Perfil Real, y el
   * que se ve sin sesión.
   */
  econtact: { id: 'econtact', icono: 'econtact', clave: 'menu.econtact', emoji: '🤝', label: 'ËContact' },
  communities: { id: 'communities', icono: 'comunidades', clave: 'menu.communities', emoji: '👥', label: 'Comunidades' },
  weels: { id: 'weels', icono: 'weels', clave: 'menu.weels', emoji: '📹', label: 'Weëls' },
  weetalk: { id: 'weetalk', icono: 'weetalk', clave: 'menu.weetalk', emoji: '💬', label: 'WeeTalk' },
  /*
   * En el menú la entrada se llama "Weë AI", con la marca escrita como se
   * escribe en todas partes. El área conserva su nombre en versales —"WEË AI"—
   * donde es un título: la miga de pan de sus pantallas, el atajo de la hoja
   * Crear, la Ayuda. Aquí es una opción de una lista, no un rótulo.
   *
   * El id sigue siendo `creator`: lo usan la ruta, el estado del menú y los
   * datos ya guardados, y cambiarlo no se vería pero sí rompería cosas.
   */
  creator: { id: 'creator', icono: 'cerebro', clave: 'menu.creator', emoji: '🤖', label: 'Weë AI' },
  projects: { id: 'projects', icono: 'carpeta', clave: 'menu.projects', emoji: '📁', label: 'Mis proyectos' },
  /*
   * Notificaciones NO está aquí, y no es un olvido: es el quinto destino de la
   * barra inferior (`components/BarraInferior.tsx`), que se ve siempre. Tenerlo
   * también en el menú era ofrecer dos puertas a la misma pantalla. La pantalla,
   * su ruta y su servicio siguen exactamente donde estaban.
   */
  saved: { id: 'saved', icono: 'marcador', clave: 'menu.saved', emoji: '🔖', label: 'Guardados' },
  settings: { id: 'settings', icono: 'engranaje', clave: 'menu.settings', emoji: '⚙️', label: 'Configuración' },
  help: { id: 'help', icono: 'ayuda', clave: 'menu.help', emoji: '❓', label: 'Ayuda' },
};

export interface MenuSection {
  /** El rótulo del grupo, en versales. Sin rótulo, el grupo cierra la lista. */
  label?: string;
  items: MenuItemId[];
  /** true en el grupo que se despliega con las experiencias de Weë Creator. */
  creator?: boolean;
  /**
   * true si el grupo empieza con una línea, en vez de con un rótulo.
   *
   * Hasta ahora los grupos se separaban solo con su rótulo en versales, que es
   * suficiente cuando el grupo tiene nombre. ËContact no lo tiene: es una sola
   * opción entre lo tuyo y los destinos, y sin una línea quedaría pegada a los
   * Credits como si fuera parte de tu cuenta.
   */
  divisor?: boolean;
}

/**
 * El orden del menú.
 *
 * Credits va con los perfiles, no con Explora: es lo que TIENES, no un sitio al
 * que ir. Y quien busca su saldo lo busca donde está su cuenta.
 *
 * ËContact va solo, entre líneas, justo después de tu cuenta y antes de los
 * destinos. Ni es información tuya ni es un sitio donde explorar: es tu gente.
 */
export const WEE_MENU: MenuSection[] = [
  { label: 'PERFIL', items: ['realProfile', 'weeProfile', 'credits'] },
  { items: ['econtact'], divisor: true },
  { label: 'EXPLORA', items: ['communities', 'weels', 'weetalk'], divisor: true },
  { items: ['creator'], creator: true },
  { items: ['saved', 'settings', 'help'] },
];

/** Todas las opciones, en el orden en que se ven. Sirve para comprobarlo. */
export const MENU_ORDER: MenuItemId[] = WEE_MENU.flatMap((s) => s.items);
