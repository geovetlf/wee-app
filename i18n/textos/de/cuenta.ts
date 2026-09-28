/*
 * ALEMÁN — «Tu cuenta», en la pestaña Perfil: lo que es de la cuenta y no de
 * una cara —los Credits, el idioma, la configuración, la privacidad—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tratamiento informal (du). «Credits» y «Weë Creator» son marca y no se traducen.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  title: 'Dein Konto',
  creditsNote: 'Die Credits deines Kontos – dieselben in deinen beiden Profilen',
  history: 'Verlauf',
  buy: 'Kaufen',
  language: 'Sprache',
  settings: 'Kontoeinstellungen',
  privacy: 'Datenschutz',
  help: 'Hilfecenter',
  saved: 'Gespeichert',
  creator: 'Weë Creator',
};
