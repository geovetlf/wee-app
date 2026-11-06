/*
 * FINÉS — El menú ☰. Tipado contra el español: si allí hay una clave que aquí
 * falta, no compila.
 *
 * Los nombres de Weë son marca y no se traducen; «Perfil Weë» es el compuesto
 * «Weë-profiili» y «Perfil Real» es «Oikea profiili». «Cambiar al {{perfil}}»
 * se dice «Ota käyttöön: {{perfil}}» para que el nombre del perfil entre en
 * nominativo sin terminación pegada. «Home» aquí es la portada: «Koti».
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Koti',
  realProfile: 'Oikea profiili',
  weeProfile: 'Weë-profiili',
  createWeeProfile: 'Luo oma Weë-profiili',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Yhteisöt',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Omat projektit',
  saved: 'Tallennetut',
  settings: 'Asetukset',
  help: 'Ohje',
  sectionProfile: 'PROFIILI',
  sectionExplore: 'TUTKI',
  activeReal: 'Oikea profiili käytössä',
  activeWee: 'Weë-profiili käytössä',
  tapToSignIn: 'Kirjaudu sisään napauttamalla',
  signOut: 'Kirjaudu ulos',
  terms: 'Käyttöehdot',
  privacy: 'Tietosuoja',
  signOutFailed: 'Uloskirjautuminen ei onnistunut',
  profileActive: '{{perfil}}, käytössä',
  switchToProfile: 'Ota käyttöön: {{perfil}}',
  signIn: 'Kirjaudu sisään',
  hideSpecialists: 'Piilota asiantuntijat',
  showSpecialists: 'Näytä asiantuntijat',
  signOutConfirm: 'Haluatko kirjautua ulos Weë-sovelluksesta?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
