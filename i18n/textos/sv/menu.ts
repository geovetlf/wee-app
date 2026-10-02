/*
 * SUECO — el menú ☰: sus entradas, las dos caras del perfil y la salida. Los nombres de Weë son
 * marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los nombres de Weë (Credits, ËContact, Weëls, WeeTalk, Weë AI) van tal cual. Perfil Real es
 * «Riktig profil» y Perfil Weë, «Weë-profil», con guion (glosario 9.1 y guía § 4). Las etiquetas
 * son cortas porque el menú es estrecho, y dicen lo mismo que la barra inferior (`nav`): Hem,
 * Sök, Skapa, WeeTalk, Aviseringar. `sectionProfile` y `sectionExplore` van en mayúsculas porque
 * así los escribe el español en el diccionario: es diseño, no ortografía (guía § 3). `terms` y
 * `privacy` son los enlaces del pie, «Villkor» e «Integritet», como en Instagram; `privacy` dice
 * lo mismo que `settings.sectionPrivacy`, porque el español es el mismo. `profileActive` y
 * `switchToProfile` solo los oye el lector de pantalla y su hueco es la etiqueta de la cara
 * («Riktig profil», «Weë-profil»), que va entera y sin declinar. `wcontact` copia el valor del
 * español, como el resto de idiomas (la clave no se usa hoy en ninguna pantalla).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Hem',
  realProfile: 'Riktig profil',
  weeProfile: 'Weë-profil',
  createWeeProfile: 'Skapa min Weë-profil',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Communities',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Mina projekt',
  saved: 'Sparat',
  settings: 'Inställningar',
  help: 'Hjälp',
  sectionProfile: 'PROFIL',
  sectionExplore: 'UTFORSKA',
  activeReal: 'Riktig profil aktiv',
  activeWee: 'Weë-profil aktiv',
  tapToSignIn: 'Tryck för att logga in',
  signOut: 'Logga ut',
  terms: 'Villkor',
  privacy: 'Integritet',
  signOutFailed: 'Det gick inte att logga ut',
  profileActive: '{{perfil}}, aktiv',
  switchToProfile: 'Byt till {{perfil}}',
  signIn: 'Logga in',
  hideSpecialists: 'Dölj experter',
  showSpecialists: 'Visa experter',
  signOutConfirm: 'Vill du logga ut från Weë?',
};
