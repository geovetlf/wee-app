/*
 * DANÉS — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (glosario 9.1 y 9.5): Gem, Slet, Annuller
 * («Fortryd» es deshacer, no cancelar), Luk, Tilbage, Næste, Færdig, Send, Del; imperativo
 * desnudo, mayúscula solo al principio y sin punto. `accept` es el botón único de los avisos:
 * «OK». `done` es «Færdig» (glosario: «Udført» descartado): sirve como botón y como título corto de
 * un resultado («✨ Færdig»). `retry` es botón y también el CUERPO de un aviso, y dice lo mismo en
 * los dos sitios: «Prøv igen». `somethingWentWrong` lleva su punto, como en el glosario (9.5).
 * `new` es la etiqueta de algo nuevo sin género conocido (hoy, junto a «Opret min Weë-profil»):
 * «Nyhed», sustantivo, para que ningún adjetivo tenga que concordar con un nombre desconocido
 * (guía § 2). `user` es el nombre de respaldo que entra de sujeto en frases como «{{nombre}} synes
 * godt om dit opslag» y en la cabecera de un chat: «Bruger» encaja en los dos sitios. `seeAll`
 * conserva la flecha. «Opslag» es invariable: «1 opslag», «3 opslag».
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Annuller',
  save: 'Gem',
  delete: 'Slet',
  close: 'Luk',
  back: 'Tilbage',
  next: 'Næste',
  done: 'Færdig',
  accept: 'OK',
  send: 'Send',
  share: 'Del',
  retry: 'Prøv igen',
  loading: 'Indlæser…',
  error: 'Fejl',
  somethingWentWrong: 'Noget gik galt.',
  noResults: 'Ingen resultater',
  notAvailable: 'Ikke tilgængelig',
  comingSoon: 'Kommer snart',
  new: 'Nyhed',
  seeAll: 'Se alle →',
  guest: 'Gæst',
  anonymousUser: 'Anonym bruger',
  user: 'Bruger',
  yes: 'Ja',
  no: 'Nej',
  loadMore: 'Vis flere opslag',
  postsCount_one: '{{cantidad}} opslag',
  postsCount_other: '{{cantidad}} opslag',
};
