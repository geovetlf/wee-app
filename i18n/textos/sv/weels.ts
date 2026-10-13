/*
 * SUECO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weëls es marca y no se declina (guía § 4): la sección es «Weëls»; una sola, «en Weël»; varias,
 * «Weëls», como Instagram con «Reels» / «en reel». Por eso «Din första Weël» y «Dela Weël», sin
 * forma definida. Un vídeo es «video» (pl. videor). La tarjeta de crear mide 68 o 92 puntos y
 * admite dos renglones: «Skapa Weël» y «Din första Weël» caben. `upTo15s` lleva un espacio fijo
 * (U+00A0) entre la cifra y la unidad, «15 s», para que no se partan (guía § 5). Las etiquetas
 * de los ejemplos son de una palabra, como sus vecinas: «AI-scen» (abreviatura + palabra, con
 * guion), «Dans», «Recept», «Resa». El botón + se nombra como en la Ayuda: «knappen +».
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Dela Weël',
  empty: 'Inga Weëls ännu',
  emptyHint: 'Skapa den första med knappen +',
  loadFailed: 'Det gick inte att ladda Weëls',
  rowSubtitle: 'Upptäck videor som communityn har skapat.',
  seeAll: 'Visa alla Weëls',
  create: 'Skapa Weël',
  createFirst: 'Din första Weël',
  open: 'Visa Weël',
  upTo15s: 'upp till 15 s',
  noneYetHint: 'Det finns inga Weëls från communityn ännu. Exemplen visar hur de kan se ut.',
  sampleAiScene: 'AI-scen',
  sampleDance: 'Dans',
  sampleRecipe: 'Recept',
  sampleTrip: 'Resa',
  pickVideo: 'Välj från galleriet',
  changeVideo: 'Byt video',
  preview: 'Förhandsvisning av Weël',
  requirements: 'Stående video på upp till {{segundos}} sekunder',
  descriptionLabel: 'Beskrivning av Weël',
  publish: 'Publicera Weël',
  uploading: 'Laddar upp din video …',
  publishing: 'Publicerar din Weël …',
  publishFailed: 'Din Weël kunde inte publiceras. Din video finns kvar här.',
  horizontalTitle: 'Videon är liggande',
  horizontalBody: 'Weëls tittar man på stående, i helskärm. Vill du använda den ändå?',
  horizontalAccept: 'Använd den ändå',
  galleryForVideo: 'För att välja video till din Weël behöver Weë komma åt ditt galleri.',
};
