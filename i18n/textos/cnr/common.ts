/*
 * MONTENEGRINO (ijekaviano, latino) — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tuteo e imperativos cortos («Otkaži», «Sačuvaj», «Obriši»). `accept` es el botón de un aviso, no el de aceptar a
 * una persona: por eso «U redu» y no «Prihvati», que sí usa `econtact`.
 * `postsCount` lleva las tres formas (one / few / other): «objava / objave / objava».
 */
import { ConPlurales } from '../ru/plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Otkaži',
  save: 'Sačuvaj',
  delete: 'Obriši',
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
  somethingWentWrong: 'Nešto je pošlo naopako',
  noResults: 'Nema rezultata',
  notAvailable: 'Nedostupno',
  comingSoon: 'Uskoro',
  new: 'Novo',
  seeAll: 'Pogledaj sve →',
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
