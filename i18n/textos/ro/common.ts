/*
 * RUMANO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El contador de publicaciones lleva las tres formas del rumano.
 */
import { ConPlurales } from '../ru/plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Anulează',
  save: 'Salvează',
  delete: 'Șterge',
  close: 'Închide',
  back: 'Înapoi',
  next: 'Următorul',
  done: 'Gata',
  accept: 'Acceptă',
  send: 'Trimite',
  share: 'Distribuie',
  retry: 'Încearcă din nou',
  mediaUnavailable: 'Acest fișier nu este disponibil',
  loading: 'Se încarcă…',
  error: 'Eroare',
  somethingWentWrong: 'Ceva nu a mers bine',
  noResults: 'Niciun rezultat',
  notAvailable: 'Indisponibil',
  comingSoon: 'În curând',
  new: 'Nou',
  seeAll: 'Vezi tot →',
  guest: 'Invitat',
  anonymousUser: 'Utilizator anonim',
  user: 'Utilizator',
  yes: 'Da',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'Nu',
  loadMore: 'Încarcă mai multe postări',
  postsCount_one: '{{cantidad}} postare',
  postsCount_few: '{{cantidad}} postări',
  postsCount_other: '{{cantidad}} de postări',
  someone: 'Cineva',
};
