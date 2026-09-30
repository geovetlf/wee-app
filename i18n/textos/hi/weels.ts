/*
 * HINDI — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weëls es marca y va en latino (guía § 6): la sección es «Weëls»; una sola, «Weël» (m); varias,
 * «Weëls» (m pl), como «Reels» en el hindi de Instagram. Por eso «Weël शेयर करें», «आपका पहला Weël»
 * y «Weëls लोड नहीं किए जा सके». Un vídeo es «वीडियो» (m, invariable). La tarjeta de crear admite
 * dos renglones: «Weël बनाएँ» y «आपका पहला Weël» caben. `upTo15s` escribe la unidad entera
 * («15 सेकंड तक»): las abreviaturas con «॰» solo las pone `Intl` (guía § 9). Las etiquetas de los
 * ejemplos son cortas, como sus vecinas: «AI सीन», «डांस», «रेसिपी» (glosario § 11.6), «यात्रा».
 * «Descubre videos…» es «… वीडियो देखें»: «खोजें» se lee como buscar. El botón + se nombra como en
 * la Ayuda: «+ बटन».
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Weël शेयर करें',
  empty: 'अभी तक कोई Weëls नहीं हैं',
  emptyHint: '+ बटन से पहला Weël बनाएँ',
  loadFailed: 'Weëls लोड नहीं किए जा सके',
  rowSubtitle: 'कम्यूनिटी के बनाए वीडियो देखें.',
  seeAll: 'सभी Weëls देखें',
  create: 'Weël बनाएँ',
  createFirst: 'आपका पहला Weël',
  open: 'Weël देखें',
  upTo15s: '15 सेकंड तक',
  noneYetHint: 'कम्यूनिटी के Weëls अभी तक नहीं आए हैं. ये उदाहरण दिखाते हैं कि वे कैसे दिखेंगे.',
  sampleAiScene: 'AI सीन',
  sampleDance: 'डांस',
  sampleRecipe: 'रेसिपी',
  sampleTrip: 'यात्रा',
};
