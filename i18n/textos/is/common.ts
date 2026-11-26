/*
 * ISLANDÉS (is · is-IS) — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (guía docs/I18N-ISLANDES.md § 2): los botones van
 * en INFINITIVO sin «að» (Vista, Eyða, Hætta við, Loka, Senda, Deila), como la localización islandesa de
 * Android/iOS; las frases que se dirigen a la persona van en imperativo de «þú» (Reyndu, Veldu, Skrifaðu).
 * `accept` es el botón único de los avisos: «Í lagi». «Færsla» = publicación (glosario § 4).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Hætta við',
  save: 'Vista',
  delete: 'Eyða',
  close: 'Loka',
  back: 'Til baka',
  next: 'Áfram',
  done: 'Lokið',
  accept: 'Í lagi',
  send: 'Senda',
  share: 'Deila',
  retry: 'Reyna aftur',
  mediaUnavailable: 'Þessi skrá er ekki tiltæk',
  loading: 'Hleður…',
  error: 'Villa',
  somethingWentWrong: 'Eitthvað fór úrskeiðis',
  noResults: 'Engar niðurstöður',
  notAvailable: 'Ekki tiltækt',
  comingSoon: 'Væntanlegt',
  new: 'Nýtt',
  seeAll: 'Sjá allt →',
  guest: 'Gestur',
  anonymousUser: 'Nafnlaus notandi',
  user: 'Notandi',
  yes: 'Já',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'Nei',
  loadMore: 'Hlaða fleiri færslum',
  postsCount_one: '{{cantidad}} færsla',
  postsCount_other: '{{cantidad}} færslur',
  someone: 'Einhver',
};
