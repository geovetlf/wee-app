/*
 * INDONESIO — El menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que
 * los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `home` es «Beranda» (glosario § 4), igual que `nav.home`. Las cabeceras de sección van en
 * mayúsculas como en el español («PROFIL», «JELAJAHI»). «Tersimpan» es Guardados (nunca el malayo
 * «Disimpan»). `switchToProfile` recibe el nombre del perfil: «Beralih ke Profil Weë».
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Beranda',
  realProfile: 'Profil Asli',
  weeProfile: 'Profil Weë',
  createWeeProfile: 'Buat profil Weë saya',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Komunitas',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Proyek Saya',
  saved: 'Tersimpan',
  settings: 'Pengaturan',
  help: 'Bantuan',
  sectionProfile: 'PROFIL',
  sectionExplore: 'JELAJAHI',
  activeReal: 'Profil Asli aktif',
  activeWee: 'Profil Weë aktif',
  tapToSignIn: 'Ketuk untuk masuk',
  signOut: 'Keluar',
  terms: 'Ketentuan',
  privacy: 'Privasi',
  signOutFailed: 'Tidak dapat keluar dari akun',
  profileActive: '{{perfil}}, aktif',
  switchToProfile: 'Beralih ke {{perfil}}',
  signIn: 'Masuk',
  hideSpecialists: 'Sembunyikan spesialis',
  showSpecialists: 'Lihat spesialis',
  signOutConfirm: 'Keluar dari Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
