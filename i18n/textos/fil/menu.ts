/*
 * FILIPINO — el menú ☰: sus entradas, las dos caras del perfil y la salida. Los nombres de Weë son marca y no se
 * traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los nombres de Weë (Credits, ËContact, Weëls, WeeTalk, Weë AI) van tal cual y sin nada pegado (§ 6). Las dos
 * caras son las del glosario (§ 6 y § 11.1): «Tunay na profile» (con mayúscula, como nombre de una de las dos caras;
 * «Totoong profile» se descartó porque «totoo» se opone a «falso») y «Weë profile», marca + sustantivo, como
 * «Facebook profile». Las etiquetas dicen lo mismo que la barra inferior (`nav`), la barra lateral y el resto del
 * glosario: Home, Mga komunidad, Mga proyekto ko, Mga naka-save, Mga setting, Tulong. `sectionProfile` y
 * `sectionExplore` van en mayúsculas porque así los escribe el español en el diccionario: es diseño, no ortografía
 * (§ 5.5): «PROFILE» y «EXPLORE» (§ 11.1, como Android y Facebook).
 *
 * El acceso es la pareja «Mag-sign in» / «Mag-sign out» (decisión cerrada 8; nunca «Mag-log in»), y «Toca para
 * iniciar sesión» es «I-tap para mag-sign in» (§ 11.7). `terms` y `privacy` son los enlaces del pie: «Mga tuntunin»
 * y «Privacy», la misma palabra que `settings.sectionPrivacy`, porque el español es el mismo. `signOutFailed` dice
 * lo mismo que en Mga setting («Hindi natuloy ang pag-sign out»), porque el español también. La confirmación de
 * salir sigue el patrón «Gusto mo bang …?» (§ 3.4) y la marca va con «sa»: «Gusto mo bang mag-sign out sa Weë?».
 *
 * `profileActive` y `switchToProfile` solo los oye el lector de pantalla y su hueco es la etiqueta de la cara
 * («Tunay na profile», «Weë profile»), que va entera detrás de «sa» o delante de la coma: «Lumipat sa {{perfil}}»
 * (§ 12), «{{perfil}}, aktibo». Los dos estados de la cabecera del menú empiezan por el predicado, sin «ay»: «Aktibo
 * ang Weë profile» (§ 11.4). Mostrar y ocultar los especialistas es la pareja «Ipakita» / «Itago». `wcontact` copia el
 * valor del español, como el resto de idiomas (la clave no se usa hoy en ninguna pantalla).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Home',
  realProfile: 'Tunay na profile',
  weeProfile: 'Weë profile',
  createWeeProfile: 'Gumawa ng Weë profile ko',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Mga komunidad',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Mga proyekto ko',
  saved: 'Mga naka-save',
  settings: 'Mga setting',
  help: 'Tulong',
  sectionProfile: 'PROFILE',
  sectionExplore: 'EXPLORE',
  activeReal: 'Aktibo ang Tunay na profile',
  activeWee: 'Aktibo ang Weë profile',
  tapToSignIn: 'I-tap para mag-sign in',
  signOut: 'Mag-sign out',
  terms: 'Mga tuntunin',
  privacy: 'Privacy',
  signOutFailed: 'Hindi natuloy ang pag-sign out',
  profileActive: '{{perfil}}, aktibo',
  switchToProfile: 'Lumipat sa {{perfil}}',
  signIn: 'Mag-sign in',
  hideSpecialists: 'Itago ang mga espesyalista',
  showSpecialists: 'Ipakita ang mga espesyalista',
  signOutConfirm: 'Gusto mo bang mag-sign out sa Weë?',
};
