/*
 * POLACO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo e imperativos cortos, porque estas etiquetas viven en barras estrechas
 * y el polaco alarga: por eso `seeAll` es «Wszystkie →» y no «Zobacz wszystkie →».
 *
 * `accept` es el botón de un aviso, no el de aceptar a una persona: por eso
 * «OK», que es lo que dicen los diálogos en polaco, y no «Zaakceptuj», que sí
 * usa `econtact`. `postsCount` lleva las cuatro formas del plural polaco.
 */
import { ConPlurales } from '../ru/plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Anuluj',
  save: 'Zapisz',
  delete: 'Usuń',
  close: 'Zamknij',
  back: 'Wstecz',
  next: 'Dalej',
  done: 'Gotowe',
  accept: 'OK',
  send: 'Wyślij',
  share: 'Udostępnij',
  retry: 'Spróbuj ponownie',
  mediaUnavailable: 'Ten plik jest niedostępny',
  loading: 'Ładowanie…',
  error: 'Błąd',
  somethingWentWrong: 'Coś poszło nie tak',
  noResults: 'Brak wyników',
  notAvailable: 'Niedostępne',
  comingSoon: 'Wkrótce',
  new: 'Nowe',
  seeAll: 'Wszystkie →',
  guest: 'Gość',
  anonymousUser: 'Anonimowy użytkownik',
  user: 'Użytkownik',
  yes: 'Tak',
  no: 'Nie',
  loadMore: 'Wczytaj więcej postów',
  postsCount_one: '{{cantidad}} post',
  postsCount_few: '{{cantidad}} posty',
  postsCount_many: '{{cantidad}} postów',
  postsCount_other: '{{cantidad}} posta',
  someone: 'Ktoś',
};
