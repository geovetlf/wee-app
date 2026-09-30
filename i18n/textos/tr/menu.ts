/*
 * TURCO — el menú ☰: sus entradas, las dos caras del perfil y la salida.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los nombres de Weë (Credits, ËContact, Weëls, WeeTalk, Weë AI) van tal cual. Perfil Real es
 * «Gerçek profil» y Perfil Weë, «Weë profili» (glosario 10.1); «activo» es «aktif», la palabra de
 * las redes sociales turcas. `sectionProfile` y `sectionExplore` van en mayúsculas porque así los
 * pinta el diseño y ningún `textTransform` lo hace por nosotros: se escriben a mano, con la İ con
 * punto (PROFİL, KEŞFET). `profileActive` y `switchToProfile` solo los oye el lector de pantalla y
 * su hueco es el nombre del perfil, que no admite sufijo: por eso «Profile geç: {{perfil}}», con
 * el patrón de etiqueta. `wcontact` copia el valor del español, como el resto de idiomas (la clave
 * no se usa hoy en ninguna pantalla).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Ana sayfa',
  realProfile: 'Gerçek profil',
  weeProfile: 'Weë profili',
  createWeeProfile: 'Weë profilimi oluştur',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Topluluklar',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Projelerim',
  saved: 'Kaydedilenler',
  settings: 'Ayarlar',
  help: 'Yardım',
  sectionProfile: 'PROFİL',
  sectionExplore: 'KEŞFET',
  activeReal: 'Gerçek profil aktif',
  activeWee: 'Weë profili aktif',
  tapToSignIn: 'Giriş yapmak için dokun',
  signOut: 'Çıkış yap',
  terms: 'Koşullar',
  privacy: 'Gizlilik',
  signOutFailed: 'Çıkış yapılamadı',
  profileActive: '{{perfil}}, aktif',
  switchToProfile: 'Profile geç: {{perfil}}',
  signIn: 'Giriş yap',
  hideSpecialists: 'Uzmanları gizle',
  showSpecialists: 'Uzmanları göster',
  signOutConfirm: 'Weë\'den çıkış yapmak istiyor musun?',
};
