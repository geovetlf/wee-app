/*
 * NORUEGO BOKMÅL — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto: Lagre, Slett, Avbryt, Lukk, Tilbake,
 * Neste, Ferdig, Send, Del; imperativo desnudo, mayúscula solo al principio y sin punto.
 * `accept` es el botón único de los avisos: «OK». `retry` dice lo mismo como botón y como
 * cuerpo de aviso: «Prøv igjen». «Innlegg» es invariable: «1 innlegg», «3 innlegg».
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Avbryt',
  save: 'Lagre',
  delete: 'Slett',
  close: 'Lukk',
  back: 'Tilbake',
  next: 'Neste',
  done: 'Ferdig',
  accept: 'OK',
  send: 'Send',
  share: 'Del',
  retry: 'Prøv igjen',
  mediaUnavailable: 'Denne filen er ikke tilgjengelig',
  loading: 'Laster…',
  error: 'Feil',
  somethingWentWrong: 'Noe gikk galt',
  noResults: 'Ingen resultater',
  notAvailable: 'Ikke tilgjengelig',
  comingSoon: 'Kommer snart',
  new: 'Nytt',
  seeAll: 'Se alle →',
  guest: 'Gjest',
  anonymousUser: 'Anonym bruker',
  user: 'Bruker',
  yes: 'Ja',
  no: 'Nei',
  loadMore: 'Last inn flere innlegg',
  postsCount_one: '{{cantidad}} innlegg',
  postsCount_other: '{{cantidad}} innlegg',
  someone: 'Noen',
};
