/*
 * FRANCÉS — «Tu cuenta», en la pestaña Perfil (2026-09-27): lo que es de la
 * cuenta y no de una cara —los Credits, el idioma, la configuración, la
 * privacidad— a un toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo (tu) y apóstrofo tipográfico ’. «Credits» y «Weë Studio» son marca y no
 * se traducen; Configuración es «Réglages» y lo guardado «Enregistrés», como en
 * el menú ☰.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  title: 'Ton compte',
  creditsNote: 'Les Credits de ton compte, les mêmes sur tes deux profils',
  history: 'Historique',
  buy: 'Acheter',
  language: 'Langue',
  settings: 'Réglages du compte',
  privacy: 'Confidentialité',
  help: 'Centre d’aide',
};
