/*
 * DANÉS — El concepto de cada movimiento del historial de Credits (`creditTransactions.reason`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Son rótulos de un extracto, no frases: sin punto, mayúscula solo al principio y, detrás de « · », en
 * minúscula. Todo sale de la fila «Credits y dinero» del glosario (§ 9.6) y de `credits.ts`: «Credits» no se
 * traduce, no se declina y no cambia con la cifra, así que lo que habría que declinar lo lleva otra palabra
 * («Køb af Credits», la MISMA de `credits.txPurchase`; «Credits i velkomstgave», «Credits i gave»). La
 * recarga de prueba es «Testoptankning» (`credits.testTopUp`) y el reembolso, «refundering»
 * (`credits.txRefund`). «Saldo anterior» es el saldo que se trajo de la billetera vieja: «Overført saldo»,
 * como en un extracto bancario. Restaurar una compra es «gendanne» («Gendannet køb», como Apple en danés).
 *
 * Las marcas van enteras y sin declinar: «Weë Brain · søgning», «Weë Studio · video». El avatar es
 * «Weë-avatar», con guion, como `weeai.avatarCost`. `servicioAiBrain` es la MISMA frase que
 * `weeai.quoteBrain` («Svar fra Weë Brain»). `weeAi` se escribe «Weë AI», la grafía del glosario (§ 4) y de
 * toda la interfaz danesa; el servidor guarda «WEË AI» en mayúsculas, pero es la misma marca.
 *
 * `{{base}} · blev ikke færdig` envuelve a otra frase de esta lista, que ya llega traducida. Los plurales:
 * «svar» es invariable («1 svar», «3 svar») y el `_one` lleva `{{contador}}`, nunca un «1» (guía § 6).
 *
 * Las `servicio…` son nombres de servicio: compuestos juntos («Billedgenerering», «Videoredigering»,
 * «Stemmegenerering»; guía § 3) y con guion delante de la sigla («AI-søgning»). «Máxima calidad» es «højeste
 * kvalitet» y «máxima precisión», «højeste præcision». «Prueba de ropa» es «Prøv tøj», el nombre que la
 * persona vio en Weë Studio (`studio.xpTryOn`).
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'Overført saldo',
  bienvenida: 'Credits i velkomstgave',
  ajusteMenos: 'Justering: Det kostede mindre end reserveret',
  reembolsoFallida: 'Refundering for mislykket generering',
  compra: 'Køb af Credits',
  regalo: 'Credits i gave',
  recargaPrueba: 'Testoptankning',
  compraRestaurada: 'Gendannet køb',
  reembolsoAdmin: 'Refundering fra en administrator',
  avatar: 'Weë-avatar',
  fotoConAvatar: 'Foto med din Weë-avatar',
  noSePudoTerminar: '{{base}} · blev ikke færdig',
  brainBusqueda: 'Weë Brain · søgning',
  brainRespuestas_one: 'Weë Brain · {{contador}} svar',
  brainRespuestas_other: 'Weë Brain · {{contador}} svar',
  brainNoPudo: 'Weë Brain · kunne ikke svare',
  studioVideo: 'Weë Studio · video',
  studioSinTiempo: 'Weë Studio · tiden løb ud for det forrige forsøg',
  studioNoSePudo: 'Weë Studio · videoen kunne ikke genereres',
  weeAi: 'Weë AI · {{experiencia}}',
  operacionIncompleta: 'Weë · handlingen blev ikke gennemført',
  servicioAiImageLite: 'Standardbillede',
  servicioAiImageEnhanceLite: 'Standardredigering',
  servicioAiImage: 'Billedgenerering',
  servicioAiImageEnhance: 'Billedredigering',
  servicioAiImagePro: 'Billede med højeste præcision',
  servicioAiTryon: 'Prøv tøj',
  servicioAiVideoDraft: 'Video til forhåndsvisning',
  servicioAiVideo: 'Videogenerering',
  servicioAiVideoHd: 'Video i høj kvalitet',
  servicioAiVideoAdvanced: 'Avanceret video',
  servicioAiVideoMax: 'Video i højeste kvalitet',
  servicioAiVideoEdit: 'Videoredigering',
  servicioAiAudio: 'Stemmegenerering',
  servicioAiTranscribe: 'Transskription og undertekster',
  servicioAiMusic: 'Musikgenerering',
  servicioAiBrain: 'Svar fra Weë Brain',
  servicioAiText: 'Tekstgenerering',
  servicioAiTextPro: 'Lang tekst i højeste kvalitet',
  servicioAiSearch: 'AI-søgning',
  servicioAiBook: 'Bogskrivning',
};
