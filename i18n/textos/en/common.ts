/*
 * Lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  accept: 'OK',
  send: 'Send',
  share: 'Share',
  retry: 'Try again',
  loading: 'Loading…',
  error: 'Error',
  somethingWentWrong: 'Something went wrong',
  noResults: 'No results',
  notAvailable: 'Not available',
  comingSoon: 'Coming soon',
  new: 'New',
  seeAll: 'See all →',
  guest: 'Guest',
  anonymousUser: 'Anonymous user',
  user: 'Someone',
  yes: 'Yes',
  no: 'No',
  loadMore: 'Load more posts',
};
