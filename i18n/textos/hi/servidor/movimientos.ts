/*
 * HINDI — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{base}}` es otro concepto de esta lista; `{{experiencia}}` es una marca y llega tal cual. En pantalla, «Weë AI».
 * `_one` vale para 0 y 1, y «जवाब» no cambia en plural.
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'पिछला बैलेंस',
  bienvenida: 'स्वागत वाले Credits',
  ajusteMenos: 'समायोजन: रिज़र्व से कम खर्च हुआ',
  reembolsoFallida: 'जनरेशन पूरा न होने पर रिफ़ंड',
  compra: 'Credits की खरीद',
  regalo: 'उपहार में मिले Credits',
  recargaPrueba: 'टेस्ट के लिए Credits',
  compraRestaurada: 'वापस लाई गई खरीद',
  reembolsoAdmin: 'एडमिन की ओर से रिफ़ंड',
  avatar: 'Weë अवतार',
  fotoConAvatar: 'आपके Weë अवतार के साथ फ़ोटो',
  noSePudoTerminar: '{{base}} · पूरा नहीं हो सका',
  brainBusqueda: 'Weë Brain · खोज',
  brainRespuestas_one: 'Weë Brain · {{contador}} जवाब',
  brainRespuestas_other: 'Weë Brain · {{contador}} जवाब',
  brainNoPudo: 'Weë Brain · जवाब नहीं दिया जा सका',
  brainMuestra: 'Weë Brain · सैंपल जवाब, कोई शुल्क नहीं',
  studioVideo: 'Weë Studio · वीडियो',
  studioSinTiempo: 'Weë Studio · पिछली कोशिश में समय खत्म हो गया',
  studioNoSePudo: 'Weë Studio · वीडियो जनरेट नहीं हो सका',
  studioMundo: 'Weë Studio · 3D वर्ल्ड',
  studioMundoNoSePudo: 'Weë Studio · 3D वर्ल्ड नहीं बन सका',
  weeAi: 'Weë AI · {{experiencia}}',
  operacionIncompleta: 'Weë · यह काम पूरा नहीं हुआ',
  servicioAiImageLite: 'स्टैंडर्ड इमेज',
  servicioAiImageEnhanceLite: 'स्टैंडर्ड एडिट',
  servicioAiImage: 'इमेज जनरेशन',
  servicioAiImageEnhance: 'इमेज एडिटिंग',
  servicioAiImagePro: 'सबसे सटीक इमेज',
  servicioAiTryon: 'कपड़े पहनकर देखना',
  servicioAiVideoDraft: 'झलक वाला वीडियो',
  servicioAiVideo: 'वीडियो जनरेशन',
  servicioAiVideoHd: 'हाई क्वालिटी वीडियो',
  servicioAiVideoAdvanced: 'एडवांस वीडियो',
  servicioAiVideoMax: 'सबसे अच्छी क्वालिटी का वीडियो',
  servicioAiVideoEdit: 'वीडियो एडिटिंग',
  servicioAiAudio: 'आवाज़ जनरेशन',
  servicioAiTranscribe: 'ट्रांसक्रिप्शन और सबटाइटल',
  servicioAiMusic: 'संगीत जनरेशन',
  servicioAiWorld: '3D वर्ल्ड जनरेशन',
  servicioAiBrain: 'Weë Brain का जवाब',
  servicioAiText: 'टेक्स्ट जनरेशन',
  servicioAiTranslate: 'अनुवाद',
  servicioAiTextPro: 'सबसे अच्छी क्वालिटी का लंबा टेक्स्ट',
  servicioAiSearch: 'AI खोज',
  servicioAiBook: 'किताब बनाना',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'पोस्ट का Boost',
  boostNoIniciado: 'Boost शुरू नहीं हुआ',
  boostSinEntregas: 'Boost से कोई डिलीवरी नहीं · पूरा रिफ़ंड हुआ',
};
