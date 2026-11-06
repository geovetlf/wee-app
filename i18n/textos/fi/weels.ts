/*
 * FINÉS — Weëls: la fila del Home y el visor. Tipado contra el español: si allí
 * hay una clave que aquí falta, no compila.
 *
 * «Weëls» y «Weël» son marca y no se declinan: cuando hace falta un caso se les
 * pone una cabeza («Weëls-videoita», «Weël-videosi»). Nunca «Reels».
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Jaa Weël',
  empty: 'Ei vielä yhtään Weëls-videota',
  emptyHint: 'Luo ensimmäinen painikkeella +',
  loadFailed: 'Weëls-videoita ei voitu ladata',
  rowSubtitle: 'Löydä yhteisön luomia videoita.',
  seeAll: 'Näytä kaikki Weëls',
  create: 'Luo Weël',
  createFirst: 'Ensimmäinen Weël-videosi',
  open: 'Avaa Weël',
  upTo15s: 'enintään 15 s',
  noneYetHint: 'Yhteisön Weëls-videoita ei vielä ole. Esimerkit näyttävät, miltä ne tulevat näyttämään.',
  sampleAiScene: 'Tekoälykohtaus',
  sampleDance: 'Tanssi',
  sampleRecipe: 'Resepti',
  sampleTrip: 'Matka',
};
