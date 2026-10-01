/*
 * DANÉS — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weëls es marca y no se declina (guía § 4): la sección es «Weëls»; una sola, «en Weël»; varias,
 * «Weëls». Por eso «Din første Weël», «Del Weël» y «den første» (género común), sin forma
 * definida pegada a la marca. Crear una Weël es hacer una obra, así que es «Lav en Weël» y no
 * «Opret» (glosario 9.1: «Opret» para objetos, «Lav» para obras); la tarjeta de crear mide 68 o 92
 * puntos y admite dos renglones, y «Lav en Weël» y «Din første Weël» caben. Un vídeo es «video»
 * (pl. videoer). `upTo15s` lleva un espacio fijo (U+00A0) entre la cifra y la unidad, «15 s», para
 * que no se partan (guía § 5). Las etiquetas de los ejemplos son de una palabra, como sus vecinas:
 * «AI-scene» (sigla + palabra, con guion obligatorio), «Dans», «Opskrift», «Rejse». El botón + se
 * nombra como en la Ayuda: «knappen +».
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Del Weël',
  empty: 'Ingen Weëls endnu',
  emptyHint: 'Lav den første med knappen +',
  loadFailed: 'Weëls kunne ikke indlæses. Prøv igen.',
  rowSubtitle: 'Opdag videoer, som fællesskabet har lavet.',
  seeAll: 'Se alle Weëls',
  create: 'Lav en Weël',
  createFirst: 'Din første Weël',
  open: 'Se Weël',
  upTo15s: 'op til 15 s',
  noneYetHint: 'Der er endnu ingen Weëls fra fællesskabet. Eksemplerne viser, hvordan de kan se ud.',
  sampleAiScene: 'AI-scene',
  sampleDance: 'Dans',
  sampleRecipe: 'Opskrift',
  sampleTrip: 'Rejse',
};
