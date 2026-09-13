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
  emoji: string;
  label: string;
}

/**
 * Nombres e iconos. Cambiar uno aquí lo cambia en las dos plataformas, que es
 * justo lo que faltaba.
 */
export const MENU_ITEM: Record<MenuItemId, MenuItem> = {
  realProfile: { id: 'realProfile', emoji: '👤', label: 'Perfil Real' },
  weeProfile: { id: 'weeProfile', emoji: '🎭', label: 'Perfil Weë' },
  credits: { id: 'credits', emoji: '💳', label: 'Credits' },
  /*
   * El nombre de tu agenda depende del perfil activo —ËContact con el Real,
   * ẄContact con el Weë—, así que los dos menús lo sobrescriben con lo que diga
   * `useIdentidadActiva`. Este es el de por defecto: el del Perfil Real, y el
   * que se ve sin sesión.
   */
  econtact: { id: 'econtact', emoji: '🤝', label: 'ËContact' },
  communities: { id: 'communities', emoji: '👥', label: 'Comunidades' },
  weels: { id: 'weels', emoji: '📹', label: 'Weëls' },
  weetalk: { id: 'weetalk', emoji: '💬', label: 'WeeTalk' },
  /*
   * El nombre visible es WEË AI. El id sigue siendo `creator`: lo usan la ruta,
   * el estado del menú y los datos ya guardados, y cambiarlo no se vería pero sí
   * rompería cosas.
   */
  creator: { id: 'creator', emoji: '🤖', label: 'WEË AI' },
  projects: { id: 'projects', emoji: '📁', label: 'Mis proyectos' },
  /*
   * Notificaciones NO está aquí, y no es un olvido: es el quinto destino de la
   * barra inferior (`components/BarraInferior.tsx`), que se ve siempre. Tenerlo
   * también en el menú era ofrecer dos puertas a la misma pantalla. La pantalla,
   * su ruta y su servicio siguen exactamente donde estaban.
   */
  saved: { id: 'saved', emoji: '🔖', label: 'Guardados' },
  settings: { id: 'settings', emoji: '⚙️', label: 'Configuración' },
  help: { id: 'help', emoji: '❓', label: 'Ayuda' },
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
