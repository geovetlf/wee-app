/*
 * FINÉS — Lo que se repite por toda la app: botones, estados y errores comunes.
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Botones en imperativo de 2.ª persona (Peruuta, Tallenna, Poista); «OK» es la
 * confirmación genérica de los diálogos finlandeses, como en el inglés. El
 * contador de publicaciones va en nominativo con 1 y en partitivo con el resto.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Peruuta',
  save: 'Tallenna',
  delete: 'Poista',
  close: 'Sulje',
  back: 'Takaisin',
  next: 'Seuraava',
  done: 'Valmis',
  accept: 'OK',
  send: 'Lähetä',
  share: 'Jaa',
  retry: 'Yritä uudelleen',
  mediaUnavailable: 'Tämä tiedosto ei ole saatavilla',
  loading: 'Ladataan…',
  error: 'Virhe',
  somethingWentWrong: 'Jokin meni pieleen',
  noResults: 'Ei tuloksia',
  notAvailable: 'Ei saatavilla',
  comingSoon: 'Tulossa pian',
  new: 'Uusi',
  seeAll: 'Näytä kaikki →',
  guest: 'Vieras',
  anonymousUser: 'Anonyymi käyttäjä',
  user: 'Käyttäjä',
  yes: 'Kyllä',
  no: 'Ei',
  loadMore: 'Lataa lisää julkaisuja',
  postsCount_one: '{{cantidad}} julkaisu',
  postsCount_other: '{{cantidad}} julkaisua',
  someone: 'Joku',
};
