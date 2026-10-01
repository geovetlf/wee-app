/*
 * SUECO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (glosario 9.1 y 9.5): Spara, Ta bort,
 * Avbryt, Stäng, Tillbaka, Nästa, Skicka, Dela; imperativo desnudo, mayúscula solo al principio y
 * sin punto. `accept` es el botón único de los avisos: «OK». `done` es «Klar», el «Listo» de iOS
 * en sueco: sirve como botón y como título corto de un resultado («✨ Klar»). `retry` es el
 * CUERPO de un aviso, no un botón, pero dice lo mismo que el botón: «Försök igen». `new` es la
 * etiqueta de algo nuevo sin género conocido: en neutro, «Nytt» (guía § 2). `user` es el nombre de
 * respaldo que entra de sujeto en frases como «{{nombre}} gillade ditt inlägg» y en la cabecera
 * de un chat: «Användare» encaja en los dos sitios. «Inlägg» es invariable: «1 inlägg», «3 inlägg».
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Avbryt',
  save: 'Spara',
  delete: 'Ta bort',
  close: 'Stäng',
  back: 'Tillbaka',
  next: 'Nästa',
  done: 'Klar',
  accept: 'OK',
  send: 'Skicka',
  share: 'Dela',
  retry: 'Försök igen',
  loading: 'Laddar…',
  error: 'Fel',
  somethingWentWrong: 'Något gick fel',
  noResults: 'Inga resultat',
  notAvailable: 'Inte tillgänglig',
  comingSoon: 'Kommer snart',
  new: 'Nytt',
  seeAll: 'Visa alla →',
  guest: 'Gäst',
  anonymousUser: 'Anonym användare',
  user: 'Användare',
  yes: 'Ja',
  no: 'Nej',
  loadMore: 'Visa fler inlägg',
  postsCount_one: '{{cantidad}} inlägg',
  postsCount_other: '{{cantidad}} inlägg',
  someone: 'Någon',
};
