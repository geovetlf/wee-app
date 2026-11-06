/*
 * MALAYO — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `home` es «Laman Utama», igual que en `nav` (glosario § 4).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Laman Utama',
  realProfile: 'Profil Sebenar',
  weeProfile: 'Profil Weë',
  createWeeProfile: 'Cipta profil Weë saya',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Komuniti',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Projek Saya',
  saved: 'Disimpan',
  settings: 'Tetapan',
  help: 'Bantuan',
  sectionProfile: 'PROFIL',
  sectionExplore: 'TEROKA',
  activeReal: 'Profil Sebenar aktif',
  activeWee: 'Profil Weë aktif',
  tapToSignIn: 'Ketik untuk log masuk',
  signOut: 'Log keluar',
  terms: 'Terma',
  privacy: 'Privasi',
  signOutFailed: 'Tidak dapat log keluar',
  profileActive: '{{perfil}}, aktif',
  switchToProfile: 'Tukar ke {{perfil}}',
  signIn: 'Log masuk',
  hideSpecialists: 'Sembunyikan pakar',
  showSpecialists: 'Lihat pakar',
  signOutConfirm: 'Adakah anda mahu keluar dari Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
