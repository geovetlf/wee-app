/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica) — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo e imperativo de 2.ª singular, con las formas más cortas que admite el
 * serbio porque estas etiquetas viven en barras estrechas. `accept` es el botón
 * de un aviso, no el de aceptar a una persona: por eso «U redu» y no «Prihvati»,
 * que sí usa `econtact`. `postsCount` lleva one / few / other («objava / objave /
 * objava»), las tres con {{cantidad}}.
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
  share: 'Podeli',
  retry: 'Pokušaj ponovo',
  mediaUnavailable: 'Ovaj fajl nije dostupan',
  loading: 'Učitavanje…',
  error: 'Greška',
  somethingWentWrong: 'Došlo je do greške',
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
  loadMore: 'Učitaj još objava',
  postsCount_one: '{{cantidad}} objava',
  postsCount_few: '{{cantidad}} objave',
  postsCount_other: '{{cantidad}} objava',
  someone: 'Neko',
};
