/*
 * DANÉS — el menú ☰: sus entradas, las dos caras del perfil y la salida. Los nombres de Weë son
 * marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los nombres de Weë (Credits, ËContact, Weëls, WeeTalk, Weë AI) van tal cual. Perfil Real es
 * «Ægte profil» y Perfil Weë, «Weë-profil», con guion (glosario 9.1 y guía § 4); «Rigtig profil»
 * se descartó porque también se lee «perfil correcto». Las etiquetas son cortas porque el menú es
 * estrecho, y dicen lo mismo que la barra inferior (`nav`) y el resto del glosario: Hjem,
 * Fællesskaber, Mine projekter, Gemte, Indstillinger, Hjælp. `sectionProfile` y `sectionExplore`
 * van en mayúsculas porque así los escribe el español en el diccionario: es diseño, no ortografía
 * (guía § 3); «UDFORSK» es el imperativo de «Explora». `terms` y `privacy` son los enlaces del
 * pie, «Vilkår» y «Privatliv»; `privacy` dice lo mismo que `settings.sectionPrivacy`, porque el
 * español es el mismo. `profileActive` y `switchToProfile` solo los oye el lector de pantalla y su
 * hueco es la etiqueta de la cara («Ægte profil», «Weë-profil»), que va entera y sin declinar;
 * las dos son de género común, así que «aktiv» concuerda. `signOutFailed` dice lo mismo que en
 * Indstillinger. `wcontact` copia el valor del español, como el resto de idiomas (la clave no se
 * usa hoy en ninguna pantalla).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Hjem',
  realProfile: 'Ægte profil',
  weeProfile: 'Weë-profil',
  createWeeProfile: 'Opret min Weë-profil',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Fællesskaber',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Mine projekter',
  saved: 'Gemte',
  settings: 'Indstillinger',
  help: 'Hjælp',
  sectionProfile: 'PROFIL',
  sectionExplore: 'UDFORSK',
  activeReal: 'Ægte profil er aktiv',
  activeWee: 'Weë-profil er aktiv',
  tapToSignIn: 'Tryk for at logge ind',
  signOut: 'Log ud',
  terms: 'Vilkår',
  privacy: 'Privatliv',
  signOutFailed: 'Vi kunne ikke logge dig ud',
  profileActive: '{{perfil}}, aktiv',
  switchToProfile: 'Skift til {{perfil}}',
  signIn: 'Log ind',
  hideSpecialists: 'Skjul specialister',
  showSpecialists: 'Vis specialister',
  signOutConfirm: 'Vil du logge ud af Weë?',
};
