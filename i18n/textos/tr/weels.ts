/*
 * TURCO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El singular «Weël» no se escribe nunca: en turco se leería como Weë con un sufijo pegado. Un
 * vídeo es «Weëls videosu», como «Reels videosu» en Instagram (glosario 10.2), y la marca sola va
 * donde no hace falta caso («Weëls oluştur»). La tarjeta de crear mide 68 o 92 puntos y admite dos
 * renglones: por eso «Weëls oluştur» e «İlk Weëls videon», que se parten bien. Las etiquetas de los
 * ejemplos caben en un solo renglón de unos 76 puntos: «Escena con IA» es «Sahne», una palabra
 * como sus vecinas («Dans», «Tarif», «Seyahat»); «YZ sahnesi» ya se cortaba en la tarjeta (revisión
 * visual). El botón + se nombra como en la Ayuda.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Weëls videosunu paylaş',
  empty: 'Henüz Weëls videosu yok',
  emptyHint: 'İlkini + düğmesinden oluştur',
  loadFailed: 'Weëls videoları yüklenemedi',
  rowSubtitle: 'Topluluğun oluşturduğu videoları keşfet.',
  seeAll: 'Tüm Weëls videolarını gör',
  create: 'Weëls oluştur',
  createFirst: 'İlk Weëls videon',
  open: 'Weëls videosunu izle',
  upTo15s: 'en fazla 15 sn',
  noneYetHint: 'Topluluktan henüz Weëls videosu yok. Örnekler nasıl görüneceklerini gösteriyor.',
  sampleAiScene: 'Sahne',
  sampleDance: 'Dans',
  sampleRecipe: 'Tarif',
  sampleTrip: 'Seyahat',
};
