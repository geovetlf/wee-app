/*
 * CROATA — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»), imperativo de segunda persona en los botones. `accept` es el
 * botón de un aviso, no el de aceptar a una persona: por eso «U redu» y no
 * «Prihvati», que sí usa `econtact`.
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `postsCount`.
 */
import { ConPlurales } from '../ru/plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Odustani',
  save: 'Spremi',
  delete: 'Izbriši',
  close: 'Zatvori',
  back: 'Natrag',
  next: 'Dalje',
  done: 'Gotovo',
  accept: 'U redu',
  send: 'Pošalji',
  share: 'Podijeli',
  retry: 'Pokušaj ponovno',
  mediaUnavailable: 'Ova datoteka nije dostupna',
  loading: 'Učitavanje…',
  error: 'Pogreška',
  somethingWentWrong: 'Nešto je pošlo po zlu',
  noResults: 'Nema rezultata',
  notAvailable: 'Nije dostupno',
  comingSoon: 'Uskoro',
  new: 'Novo',
  seeAll: 'Prikaži sve →',
  guest: 'Gost',
  anonymousUser: 'Anonimni korisnik',
  user: 'Korisnik',
  yes: 'Da',
  no: 'Ne',
  loadMore: 'Učitaj više objava',
  postsCount_one: '{{cantidad}} objava',
  postsCount_few: '{{cantidad}} objave',
  postsCount_other: '{{cantidad}} objava',
  someone: 'Netko',
};
