/*
 * ALEMÁN SUIZO (de-CH) — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Variante del alemán base (de/common.ts): ortografía suiza (sin ß: «Schliessen»);
 * todo lo demás, igual que el alemán. Son las palabras más cortas que existen
 * para cada botón, porque estas etiquetas viven en barras estrechas.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Abbrechen',
  save: 'Speichern',
  delete: 'Löschen',
  close: 'Schliessen',
  back: 'Zurück',
  next: 'Weiter',
  done: 'Fertig',
  accept: 'OK',
  send: 'Senden',
  share: 'Teilen',
  retry: 'Erneut versuchen',
  mediaUnavailable: 'Diese Datei ist nicht verfügbar',
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
  user: 'Nutzer',
  yes: 'Ja',
  no: 'Nein',
  loadMore: 'Mehr Beiträge laden',
  postsCount_one: '{{cantidad}} Beitrag',
  postsCount_other: '{{cantidad}} Beiträge',
  someone: 'Jemand',
};
