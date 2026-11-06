/*
 * GRIEGO — El menú ☰ único. Tipado contra el español.
 * Las cabeceras en mayúsculas sostenidas se escriben sin tilde («ΠΡΟΦΙΛ», «ΕΞΕΡΕΥΝΗΣΗ»).
 * `wcontact` repite «ËContact» porque así lo hace el español.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Αρχική',
  realProfile: 'Πραγματικό προφίλ',
  weeProfile: 'Προφίλ Weë',
  createWeeProfile: 'Δημιουργία του Προφίλ Weë μου',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Κοινότητες',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Τα έργα μου',
  saved: 'Αποθηκευμένα',
  settings: 'Ρυθμίσεις',
  help: 'Βοήθεια',
  sectionProfile: 'ΠΡΟΦΙΛ',
  sectionExplore: 'ΕΞΕΡΕΥΝΗΣΗ',
  activeReal: 'Ενεργό: Πραγματικό προφίλ',
  activeWee: 'Ενεργό: Προφίλ Weë',
  tapToSignIn: 'Πάτησε για σύνδεση',
  signOut: 'Αποσύνδεση',
  terms: 'Όροι',
  privacy: 'Απόρρητο',
  signOutFailed: 'Δεν μπορέσαμε να σε αποσυνδέσουμε',
  profileActive: '{{perfil}}, ενεργό',
  switchToProfile: 'Αλλαγή σε {{perfil}}',
  signIn: 'Σύνδεση',
  hideSpecialists: 'Απόκρυψη ειδικών',
  showSpecialists: 'Εμφάνιση ειδικών',
  signOutConfirm: 'Θέλεις να βγεις από το Weë;',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
