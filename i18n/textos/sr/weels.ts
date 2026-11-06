/*
 * SERBIO (ћирилица) — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weëls» y «Weël» son marca: quedan en latino y no se declinan (nunca «Рилс»);
 * donde el serbio pediría un caso se reformula con un sustantivo puente.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Подели Weël',
  empty: 'Још нема Weëls',
  emptyHint: 'Направи први дугметом +',
  loadFailed: 'Није било могуће учитати Weëls',
  rowSubtitle: 'Откриј видео-снимке које је направила заједница.',
  seeAll: 'Прикажи све Weëls',
  create: 'Креирај Weël',
  createFirst: 'Твој први Weël',
  open: 'Погледај Weël',
  upTo15s: 'до 15 с',
  noneYetHint: 'Заједница још нема Weëls. Примери показују како ће изгледати.',
  sampleAiScene: 'AI сцена',
  sampleDance: 'Плес',
  sampleRecipe: 'Рецепт',
  sampleTrip: 'Путовање',
};
