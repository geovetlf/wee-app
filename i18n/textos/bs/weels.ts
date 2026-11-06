/*
 * BOSNIO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weëls» y «Weël» son marca y no se declinan: donde el caso lo pide va el
 * sustantivo puente («Weëls videa»). Nunca «Reels».
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Podijeli Weël',
  empty: 'Još nema Weëls videa',
  emptyHint: 'Kreiraj prvi dugmetom +',
  loadFailed: 'Nismo mogli učitati Weëls',
  rowSubtitle: 'Otkrij videe koje je napravila zajednica.',
  seeAll: 'Pogledaj sve Weëls',
  create: 'Kreiraj Weël',
  createFirst: 'Tvoj prvi Weël',
  open: 'Pogledaj Weël',
  upTo15s: 'do 15 s',
  noneYetHint: 'Zajednica još nema Weëls videa. Primjeri pokazuju kako će izgledati.',
  sampleAiScene: 'AI scena',
  sampleDance: 'Ples',
  sampleRecipe: 'Recept',
  sampleTrip: 'Putovanje',
};
