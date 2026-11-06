/*
 * FILIPINO — El concepto de cada movimiento del historial de Credits (`creditTransactions.reason`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Son rótulos de un historial, no frases: sin punto, mayúscula solo al principio y, detrás de « · », en minúscula.
 * Todo sale del glosario § 11.9 y de `credits.ts`: «Credits» no se traduce, no se declina, no cambia con la cifra y
 * nunca lleva «mga» delante. La compra es «Pagbili ng Credits» (la MISMA de `credits.txPurchase`), la recarga de
 * prueba «Pansubok na top-up» (`credits.testTopUp`) y el reembolso «Refund» (`credits.txRefund`). «Saldo anterior»
 * es el saldo que se trajo de la billetera vieja: «Dating balanse». Los Credits de bienvenida se dan al crear la
 * cuenta: «Credits sa pagsali». «Ajuste» es «Adjustment», como en un extracto filipino; restaurar una compra,
 * «Na-restore na pagbili». Un fallo es «hindi natuloy» (glosario § 11.4).
 *
 * Las marcas van enteras y sin nada pegado: «Weë Brain · paghahanap», «Weë Studio · paggawa ng video». El avatar
 * es el del Weë profile: «Paggawa ng Weë avatar» (marca + sustantivo, § 6), y la foto con él, «Larawan kasama ang
 * Weë avatar mo». `servicioAiBrain` es «Sagot ng Weë Brain». `weeAi` se escribe «Weë AI», la grafía aprobada en toda
 * la interfaz (como en inglés y en danés); el servidor guarda «WEË AI» en versales, pero es la misma marca.
 *
 * `{{base}} · hindi natapos` envuelve a otra frase de esta lista, que ya llega traducida. Plural (§ 8.3):
 * `{{contador}}` va delante de «sagot», así que `_other` lleva el enlace «na» («4 na sagot») y `_one` no; nunca un
 * «1» a mano.
 *
 * Las `servicio…` son nombres de servicio y siguen un solo molde: «Paggawa ng …» para generar (§ 3.3: el verbo
 * nativo en vez de reduplicar *generate*), «Pag-edit ng …» para editar y montar, y el adjetivo delante con «na» para
 * las variantes («Standard na larawan», «Preview na video», «Advanced na video»). «Máxima calidad» es «pinakamataas
 * ang kalidad» y «máxima precisión», «Pinakatumpak». «Prueba de ropa» es «Pagsukat ng damit», el mismo verbo de
 * `studio.xpTryOn` («Magsukat ng damit»). Los subtítulos son «subtitle» (glosario § 11.11, cámara).
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'Dating balanse',
  bienvenida: 'Credits sa pagsali',
  ajusteMenos: 'Adjustment: mas mababa ang halaga kaysa sa inilaan',
  reembolsoFallida: 'Refund dahil hindi natuloy ang paggawa',
  compra: 'Pagbili ng Credits',
  regalo: 'Regalong Credits',
  recargaPrueba: 'Pansubok na top-up',
  compraRestaurada: 'Na-restore na pagbili',
  reembolsoAdmin: 'Refund mula sa admin',
  avatar: 'Paggawa ng Weë avatar',
  fotoConAvatar: 'Larawan kasama ang Weë avatar mo',
  noSePudoTerminar: '{{base}} · hindi natapos',
  brainBusqueda: 'Weë Brain · paghahanap',
  brainRespuestas_one: 'Weë Brain · {{contador}} sagot',
  brainRespuestas_other: 'Weë Brain · {{contador}} na sagot',
  brainNoPudo: 'Weë Brain · hindi nakasagot',
  studioVideo: 'Weë Studio · paggawa ng video',
  studioSinTiempo: 'Weë Studio · naubusan ng oras ang naunang pagsubok',
  studioNoSePudo: 'Weë Studio · hindi na-generate ang video',
  studioMundo: 'Weë Studio · mundong 3D',
  studioMundoNoSePudo: 'Weë Studio · hindi nagawa ang mundong 3D',
  weeAi: 'Weë AI · {{experiencia}}',
  operacionIncompleta: 'Weë · hindi nakumpleto ang transaksyon',
  servicioAiImageLite: 'Standard na larawan',
  servicioAiImageEnhanceLite: 'Standard na pag-edit',
  servicioAiImage: 'Paggawa ng larawan',
  servicioAiImageEnhance: 'Pag-edit ng larawan',
  servicioAiImagePro: 'Pinakatumpak na larawan',
  servicioAiTryon: 'Pagsukat ng damit',
  servicioAiVideoDraft: 'Preview na video',
  servicioAiVideo: 'Paggawa ng video',
  servicioAiVideoHd: 'Video na mataas ang kalidad',
  servicioAiVideoAdvanced: 'Advanced na video',
  servicioAiVideoMax: 'Video na pinakamataas ang kalidad',
  servicioAiVideoEdit: 'Pag-edit ng video',
  servicioAiAudio: 'Paggawa ng boses',
  servicioAiTranscribe: 'Transcription at subtitle',
  servicioAiMusic: 'Paggawa ng musika',
  servicioAiWorld: 'Paggawa ng mundong 3D',
  servicioAiBrain: 'Sagot ng Weë Brain',
  servicioAiText: 'Paggawa ng text',
  servicioAiTextPro: 'Mahabang text na pinakamataas ang kalidad',
  servicioAiSearch: 'Paghahanap gamit ang AI',
  servicioAiBook: 'Paggawa ng libro',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost ng post',
  boostNoIniciado: 'Hindi nasimulan ang Boost',
  boostSinEntregas: 'Boost na hindi naipakita · ibinalik lahat',
};
