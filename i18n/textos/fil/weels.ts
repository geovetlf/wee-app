/*
 * FILIPINO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weëls es marca (guía § 6): la sección y el formato son «Weëls»; un vídeo, «Weël». No lleva afijos ni `mga`
 * delante («Wala pang Weëls», nunca «mga Weëls»), y va con marcador de cosa: «ang Weël», «ng Weëls». Crear una
 * Weël es «Gumawa ng Weël» (glosario § 11.2); la tarjeta de crear mide 68 o 92 puntos y admite dos renglones, y
 * «Gumawa ng Weël» y «Ang una mong Weël» caben. Un vídeo es «video», nunca «bidyo» (§ 4).
 *
 * «Ver Weël» (la etiqueta del lector de pantalla de cada miniatura) es «Panoorin ang Weël»: un vídeo se mira
 * («panoorin», como YouTube en filipino), y «Tingnan» es para lo que se lee o se abre. «Compartir» es «Ibahagi»
 * (nunca «I-share», § 14). «Descubre» es «Tuklasin», el verbo de descubrir; el rótulo «EXPLORE» del menú es otra
 * cosa. «Crea el primero desde el botón +» se escribe como instrucción con el verbo delante, «I-tap ang + para
 * gawin ang una.» (§ 2). `upTo15s` usa la unidad corta que escribe `Intl` en filipino, «15 seg.» (§ 8.1).
 *
 * Las etiquetas de los ejemplos son cortas, como sus vecinas: «AI na eksena» (sigla + `na` + sustantivo, como
 * «Sekswal na content» del glosario), «Sayaw», «Recipe» (glosario § 11.11, marcado «Validar» frente a «resipe») y
 * «Biyahe» (glosario § 11.11).
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Ibahagi ang Weël',
  empty: 'Wala pang Weëls',
  emptyHint: 'I-tap ang + para gawin ang una.',
  loadFailed: 'Hindi ma-load ang Weëls. Subukan ulit.',
  rowSubtitle: 'Tuklasin ang mga video na gawa ng komunidad.',
  seeAll: 'Tingnan ang lahat ng Weëls',
  create: 'Gumawa ng Weël',
  createFirst: 'Ang una mong Weël',
  open: 'Panoorin ang Weël',
  upTo15s: 'hanggang 15 seg.',
  noneYetHint: 'Wala pang Weëls mula sa komunidad. Ipinapakita ng mga halimbawa kung ano ang magiging itsura nila.',
  sampleAiScene: 'AI na eksena',
  sampleDance: 'Sayaw',
  sampleRecipe: 'Recipe',
  sampleTrip: 'Biyahe',
};
