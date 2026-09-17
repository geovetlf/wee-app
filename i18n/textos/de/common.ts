/*
 * ALEMÁN — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). Son las palabras más cortas que existen en alemán
 * para cada botón, porque estas etiquetas viven en barras estrechas.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Abbrechen',
  save: 'Speichern',
  delete: 'Löschen',
  close: 'Schließen',
  back: 'Zurück',
  next: 'Weiter',
  done: 'Fertig',
  accept: 'OK',
  send: 'Senden',
  share: 'Teilen',
  retry: 'Erneut versuchen',
  loading: 'Wird geladen…',
  error: 'Fehler',
  somethingWentWrong: 'Etwas ist schiefgelaufen',
  noResults: 'Keine Ergebnisse',
  notAvailable: 'Nicht verfügbar',
  comingSoon: 'Bald verfügbar',
  new: 'Neu',
  seeAll: 'Alle ansehen →',
  guest: 'Gast',
  anonymousUser: 'Anonymer Nutzer',
  user: 'Jemand',
  yes: 'Ja',
  no: 'Nein',
  loadMore: 'Mehr Beiträge laden',
};
