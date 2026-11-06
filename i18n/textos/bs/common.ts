/*
 * BOSNIO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti») e imperativo de 2.ª singular. Son las etiquetas más cortas,
 * porque viven en barras estrechas: `seeAll` es «Sve →» y no «Pogledaj sve →».
 * `accept` es el botón de un aviso, no el de aceptar a una persona: por eso
 * «U redu» y no «Prihvati», que sí usa `econtact`.
 *
 * PLURALES: one / few / other, así que `postsCount` lleva `_few`
 * («1 objava», «2 objave», «5 objava»).
 */
import { ConPlurales } from '../ru/plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Otkaži',
  save: 'Sačuvaj',
  delete: 'Izbriši',
  close: 'Zatvori',
  back: 'Nazad',
  next: 'Dalje',
  done: 'Gotovo',
  accept: 'U redu',
  send: 'Pošalji',
  share: 'Podijeli',
  retry: 'Pokušaj ponovo',
  mediaUnavailable: 'Ovaj fajl nije dostupan',
  loading: 'Učitavanje…',
  error: 'Greška',
  somethingWentWrong: 'Nešto je pošlo po zlu',
  noResults: 'Nema rezultata',
  notAvailable: 'Nedostupno',
  comingSoon: 'Uskoro',
  new: 'Novo',
  seeAll: 'Vidi sve →',
  guest: 'Gost',
  anonymousUser: 'Anonimni korisnik',
  user: 'Korisnik',
  yes: 'Da',
  no: 'Ne',
  loadMore: 'Učitaj još objava',
  postsCount_one: '{{cantidad}} objava',
  postsCount_few: '{{cantidad}} objave',
  postsCount_other: '{{cantidad}} objava',
  someone: 'Neko',
};
