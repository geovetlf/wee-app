/*
 * HEBREO — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Home» es «דף הבית» (glosario). Los títulos de sección, que el español escribe en MAYÚSCULAS,
 * no tienen equivalente en hebreo (sin mayúsculas): van como sustantivos. «Cambiar al {{perfil}}»
 * usa «אל» separado para no pegar un prefijo al hueco. «Mi perfil Weë» lleva el artículo con guion
 * («פרופיל ה-Weë שלי»).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'דף הבית',
  realProfile: 'הפרופיל האמיתי',
  weeProfile: 'פרופיל Weë',
  createWeeProfile: 'יצירת פרופיל ה-Weë שלי',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'קהילות',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'הפרויקטים שלי',
  saved: 'שמורים',
  settings: 'הגדרות',
  help: 'עזרה',
  sectionProfile: 'פרופיל',
  sectionExplore: 'גילוי',
  activeReal: 'הפרופיל האמיתי פעיל',
  activeWee: 'פרופיל Weë פעיל',
  tapToSignIn: 'הקשה לכניסה',
  signOut: 'יציאה',
  terms: 'תנאים',
  privacy: 'פרטיות',
  signOutFailed: 'לא הצלחנו לצאת מהחשבון',
  profileActive: '{{perfil}}, פעיל',
  switchToProfile: 'מעבר אל {{perfil}}',
  signIn: 'כניסה',
  hideSpecialists: 'הסתרת המומחים',
  showSpecialists: 'הצגת המומחים',
  signOutConfirm: 'לצאת מ-Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
