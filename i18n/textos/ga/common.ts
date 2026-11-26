/*
 * IRLANDÉS — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Botones en imperativo de 2.ª singular. `accept` es el botón de un aviso, no el de aceptar a una
 * persona (eso lo hace `econtact`): «Glac leis». El contador de publicaciones lleva las cinco
 * formas: «postáil» (1, 0 y 11+), «phostáil» (2-6, lenición), «bpostáil» (7-10, eclipsis).
 */
import { ConPlurales } from './plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Cealaigh',
  save: 'Sábháil',
  delete: 'Scrios',
  close: 'Dún',
  back: 'Ar ais',
  next: 'Ar aghaidh',
  done: 'Déanta',
  accept: 'Glac leis',
  send: 'Seol',
  share: 'Roinn',
  retry: 'Bain triail eile as',
  mediaUnavailable: 'Níl an comhad seo ar fáil',
  loading: 'Á lódáil…',
  error: 'Earráid',
  somethingWentWrong: 'Chuaigh rud éigin amú',
  noResults: 'Gan torthaí',
  notAvailable: 'Níl ar fáil',
  comingSoon: 'Go luath',
  new: 'Nua',
  seeAll: 'Féach ar gach ceann →',
  guest: 'Aoi',
  anonymousUser: 'Úsáideoir gan ainm',
  user: 'Úsáideoir',
  yes: 'Tá',
  no: 'Níl',
  loadMore: 'Lódáil tuilleadh postálacha',
  postsCount_one: '{{cantidad}} postáil',
  postsCount_two: '{{cantidad}} phostáil',
  postsCount_few: '{{cantidad}} phostáil',
  postsCount_many: '{{cantidad}} bpostáil',
  postsCount_other: '{{cantidad}} postáil',
  someone: 'Duine éigin',
};
