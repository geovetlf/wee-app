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
 * Las experiencias de Weë AI tampoco están aquí: ya tenían su fuente única
 * en `constants/weeExperiences.ts`, y esa manda.
 *
 * ─── EL ORDEN DEL REDISEÑO (decisión del dueño, 2026-11-15) ──────────────────
 *
 *   Inicio / Ẅall · Weëls · Explorar · Comunidades · Proyectos · WeëPages
 *   MyWeës
 *   Guardados · Historial · Credits · Configuración
 *   Ayuda y soporte
 *
 * Lo que dejó de ser una FILA —y sigue existiendo, con su pantalla y su ruta—:
 *
 *   · WeeTalk: es «Mensajes», en la barra inferior;
 *   · la agenda (ËContact con el Perfil Real, ẄContact con el Perfil Weë): se
 *     entra desde Mi Weë, que ya la enlazaba;
 *   · Perfil Real y Perfil Weë: son el selector de identidad de la cabecera del
 *     menú, con la misma lógica de cambio de perfil y de tema;
 *   · el desplegable de Weë AI con sus experiencias: es la tarjeta de WeëAI, que
 *     abre el centro creativo, donde están todas;
 *   · «Mis proyectos» es la fila Proyectos, y «Mis creaciones» se alcanza desde
 *     WeëAI, desde Proyectos y como acceso de MyWeës.
 *
 * Sus entradas siguen en `MENU_ITEM` porque el catálogo es también de dónde
 * sacan su nombre y su dibujo el selector, la tarjeta y los accesos de MyWeës;
 * lo que ya no están es en `WEE_MENU`, que es lo que se pinta como filas.
 */

import { NombreDeIcono } from '../components/icons/trazosDeWee';

/** Cada opción del menú, por su nombre. */
export type MenuItemId =
  | 'home'
  | 'explore'
  | 'mywees'
  | 'history'
  | 'realProfile'
  | 'weeProfile'
  | 'credits'
  | 'econtact'
  | 'pages'
  | 'communities'
  | 'weels'
  | 'weetalk'
  | 'creator'
  | 'projects'
  | 'creations'
  | 'saved'
  | 'settings'
  | 'language'
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
  /* Inicio y Ẅall son el mismo sitio: la portada. La etiqueta lo dice con los dos nombres. */
  home: { id: 'home', icono: 'casa', clave: 'menu.homeWall', emoji: '🏠', label: 'Inicio / Ẅall' },
  /* Explorar es la pantalla de búsqueda de siempre (`Search`), con este nombre. */
  explore: { id: 'explore', icono: 'brujula', clave: 'menu.explore', emoji: '🧭', label: 'Explorar' },
  /* MyWeës: el organizador personal de accesos directos (screens/MyWeesScreen.tsx). Es marca. */
  mywees: { id: 'mywees', icono: 'capas', clave: 'menu.myWees', emoji: '🗂️', label: 'MyWeës' },
  /* Historial: la cronología de los trabajos de WeëAI (screens/HistorialScreen.tsx). */
  history: { id: 'history', icono: 'reloj', clave: 'menu.history', emoji: '🕘', label: 'Historial' },
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
  /* WeëPages: las Páginas públicas de la cuenta (personajes, empresas, marcas…). Entidades, no caras. */
  pages: { id: 'pages', icono: 'documento', clave: 'menu.pages', emoji: '📄', label: 'WeëPages' },
  communities: { id: 'communities', icono: 'comunidades', clave: 'menu.communities', emoji: '👥', label: 'Comunidades' },
  weels: { id: 'weels', icono: 'weels', clave: 'menu.weels', emoji: '📹', label: 'Weëls' },
  weetalk: { id: 'weetalk', icono: 'weetalk', clave: 'menu.weetalk', emoji: '💬', label: 'WeeTalk' },
  /*
   * El área se llama «WeëAI» (nombre visible decidido el 2026-11-15). En el menú
   * ya no es una fila que se despliega: es la tarjeta destacada que abre el
   * centro creativo.
   *
   * El id sigue siendo `creator`: lo usan la ruta, el estado del menú y los
   * datos ya guardados, y cambiarlo no se vería pero sí rompería cosas.
   */
  creator: { id: 'creator', icono: 'cerebro', clave: 'nav.weeAi', emoji: '🤖', label: 'WeëAI' },
  /* Proyectos: la entrada principal a los proyectos de Weë AI y, desde ellos, a las creaciones. */
  projects: { id: 'projects', icono: 'carpeta', clave: 'menu.projectsTitle', emoji: '📁', label: 'Proyectos' },
  /*
   * La biblioteca de material de la CUENTA (Fase 11). Una sola, no una por
   * perfil: lo que se genera es de la cuenta. La clave vive en su propio
   * módulo de i18n porque el nombre es el título de la pantalla.
   */
  creations: { id: 'creations', icono: 'galeria', clave: 'creaciones.title', emoji: '🖼️', label: 'Mis creaciones' },
  /*
   * Notificaciones NO está aquí, y no es un olvido: es la campana de la
   * cabecera del Home. La pantalla, su ruta y su servicio siguen exactamente
   * donde estaban.
   */
  saved: { id: 'saved', icono: 'marcador', clave: 'menu.saved', emoji: '🔖', label: 'Guardados' },
  settings: { id: 'settings', icono: 'engranaje', clave: 'menu.settings', emoji: '⚙️', label: 'Configuración' },
  /* Idioma: abre Configuración → Idioma (la misma pantalla y la misma preferencia). El nombre es el de esa pantalla; el idioma puesto se ve a la derecha, en su lengua. */
  language: { id: 'language', icono: 'globo', clave: 'language.title', emoji: '🌐', label: 'Idioma' },
  help: { id: 'help', icono: 'ayuda', clave: 'menu.helpSupport', emoji: '❓', label: 'Ayuda y soporte' },
};

export interface MenuSection {
  items: MenuItemId[];
  /** true si el grupo empieza con una línea que lo separa del anterior. */
  divisor?: boolean;
  /**
   * true en el grupo que se pinta como TARJETA destacada y no como fila: MyWeës,
   * con su descripción breve y su botón «Personalizar». Sus accesos no se
   * despliegan en el menú: viven en su pantalla.
   */
  destacado?: boolean;
}

/**
 * El orden del menú: las doce entradas, en cuatro grupos.
 *
 *  1. A dónde ir: Inicio / Ẅall, Weëls, Explorar, Comunidades, Proyectos, WeëPages.
 *  2. MyWeës, destacada.
 *  3. Lo tuyo: Guardados, Historial, Credits, Configuración.
 *  4. Ayuda y soporte.
 *
 * Encima van la cabecera de cuenta, el selector de identidad y la tarjeta de
 * WeëAI; debajo, el pie legal y cerrar sesión. Eso lo pinta cada componente.
 */
export const WEE_MENU: MenuSection[] = [
  { items: ['home', 'weels', 'explore', 'communities', 'projects', 'pages'] },
  { items: ['mywees'], destacado: true },
  { items: ['saved', 'history', 'credits', 'settings', 'language'], divisor: true },
  { items: ['help'], divisor: true },
];

/** Todas las opciones, en el orden en que se ven. Sirve para comprobarlo. */
export const MENU_ORDER: MenuItemId[] = WEE_MENU.flatMap((s) => s.items);
