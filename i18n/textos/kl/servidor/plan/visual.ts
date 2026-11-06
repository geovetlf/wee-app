/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — El plan de Weë Design, Weë Studio y Weë Photo
 * (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Kalaallisut, NO danés. Las opciones elegidas llegan sin emoji y con minúscula inicial, como sintagmas sueltos,
 * así que cada hueco va aislado (tras «:», «—», coma o entre paréntesis) y nunca con sufijo. Las piezas
 * (`designAlma…`, `designMatiz…`, `studioFormato…`) están escritas para leerse detrás de una coma. Los números van
 * delante del sustantivo («{{numero}} siunnersuutit»). «Sekundi/sekundit» y «video» son préstamos integrados;
 * «ilisarnaat» (logo) y «siunnersuut» (propuesta) están «pendientes de confirmación nativa», como todo lo demás.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: '{{numero}} ilisarnaatit pilersissavakka, ateq: »{{nombre}}«.',
  designExplicaLogoConNombreYAlma: '{{numero}} ilisarnaatit pilersissavakka, ateq: »{{nombre}}«, {{alma}}.',
  designAlmaSerious: 'pimoorussisutut tatigisaasutullu isikkoqartillugit',
  designAlmaModern: 'nutaaliatut isikkoqartillugit',
  designAlmaClose: 'ikinngutinnersutut nuannersutullu isikkoqartillugit',
  designAlmaLuxury: 'akisuumik isikkoqartillugit',
  designAlmaNatural: 'pinngortitatut isikkoqartillugit',

  designExplicaAnuncio: '{{numero}} siunnersuutit pilersissavakka, una ussassaarutigalugu: {{anuncio}}.',
  designExplicaAnuncioConDonde: '{{numero}} siunnersuutit pilersissavakka, una ussassaarutigalugu: {{anuncio}}, {{donde}}.',
  designDondeFeed: 'sisamakkamik iluseqartoq, atugassaq: Instagram imaluunniit Facebook',
  designDondeStory: 'nappasumik iluseqartoq, oqaluttuamut atugassaq',
  designDondeWhatsapp: 'iluseqartoq WhatsApp atorlugu siammarteriaannaasoq',
  designDondePrint: 'A4-mik iluseqartoq, naqiteriaannaasoq',

  designExplicaPropuestas: '{{numero}} siunnersuutit pilersissavakka: {{cosa}}.',
  designExplicaPropuestasConMatiz: '{{numero}} siunnersuutit pilersissavakka: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'nutaaliamik eqqiluitsumillu isikkulik',
  designMatizLookNatural: 'pinngortitamut assingusumik isikkulik',
  designMatizLookLuxury: 'akisuumik isikkulik',
  designMatizLookFun: 'nuannersumik qalipaatilimmillu isikkulik',
  designMatizLookIndustrial: 'suliffissuarnisut isikkulik',
  designMatizEraFuture: 'siunissamiittutut',
  designMatizEraNow: 'ullumikkutut',
  designMatizEraClassic: 'siornatut isikkulik',
  designMatizEraScifi: 'siunissamut eqqarsaatersugatut',
  designMatizInoutOutside: 'silataanit takuneqartoq',
  designMatizInoutInside: 'iluaniit takuneqartoq',
  designMatizInoutWide: 'ungasissumit annertuumik takuneqartoq',
  designMatizDrawCartoon: 'titartakkatut aalasutut',
  designMatizDrawReal: 'piviusutut',
  designMatizDrawGame: 'qarasaasiami pinnguaatitut isikkulik',
  designMatizDrawPencil: 'titartaatimik titartagaq',
  designMatizDrawCute: 'asanninnartutut isikkulik',

  designPasoConcepto: 'Isumassarsiap aalajangersarnera',
  designPasoLogos: '{{numero}} ilisarnaatinik pilersitsineq',
  designPasoPropuestas: '{{numero}} siunnersuutinik pilersitsineq',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'Assit misissussavara aalatissavaralu, isikkoq atorlugu: {{estilo}}. Inerneq tassaassaaq video {{segundos}} sekundinik sivisussusilik, siammarteriaannaasoq.',

  studioExplicaVideo: 'Filmimut allaaserisaq naatsoq allassavara, una pilersissavara: {{video}} ({{segundos}} sekundit, {{formato}}), isikkoq atorlugu: {{estilo}}, oqaluttuarinerlu immiussavara.',
  studioExplicaVideoPromo: 'Filmimut allaaserisaq naatsoq allassavara, video arlaannik ussassaarutissaq pilersissavara ({{segundos}} sekundit, {{formato}}), isikkoq atorlugu: {{estilo}}, oqaluttuarinerlu immiussavara.',
  studioExplicaVideoMisRedes: 'Filmimut allaaserisaq naatsoq allassavara, video attaveqaatinnut atugassaq pilersissavara ({{segundos}} sekundit, {{formato}}), isikkoq atorlugu: {{estilo}}, oqaluttuarinerlu immiussavara.',
  studioVideoRedes: 'video attaveqaatinnut atugassaq',
  studioEstiloRitmo: 'ikinngutinnersoq sukkasuumillu ingerlasoq',
  studioFormatoVertical: 'nappasoq, Instagram aamma TikTok atorlugit',
  studioFormatoHorizontal: 'sanimut sammisoq, YouTube atorlugu',
  studioFormatoCuadrado: 'sisamakkasoq, WhatsApp aamma Facebook atorlugit',
  studioDecisionRedes: 'attaveqaatinnut piareersassavara',
  studioDecisionEstilo: 'isikkoq ikinngutinnersoq sukkasuumillu ingerlasoq toqqarpara',
  studioDecisionVertical: 'nappasumik sanassavara, Instagram aamma TikTok atorlugit naleqquttoq',

  studioPasoMirarFoto: 'Assinnik misissuineq',
  studioPasoMovimiento: 'Assip aalatinnera',
  studioPasoGuion: 'Filmimut allaaserisamik allaneq ({{numero}} takutitat)',
  studioPasoVideo: 'Videomik pilersitsineq',
  studioPasoNarracion: 'Oqaluttuarinerup immiunnera',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'Oqaluttuarisatit tunngavigalugit {{numero}} assit pilersissavakka, {{como}}.',

  photoExplicaMejorarCalidad: 'Siullermik assit misissussavara, taava pitsaassusia ersarissusialu pitsanngorsassavakka, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaQuitarAlgo: 'Siullermik assit misissussavara, taava pisariaqanngitsoq peerussavara, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaFondo: 'Siullermik assit misissussavara, taava tunuliaqut allanngortissavara imaluunniit peerussavara, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaRestaurar: 'Siullermik assit misissussavara, taava assi pisoqaaq iluarsissavara, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaRetoque: 'Siullermik assit misissussavara, taava kiinaq pinngortitatut aaqqissussavara, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaColorizar: 'Siullermik assit misissussavara, taava assi qernertoq qaqortorlu qalipaasissavara, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaTransformar: 'Siullermik assit misissussavara, taava isikkumik allamik allanngortissavara, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaSinAccion: 'Siullermik assit misissussavara, taava pitsaassusia pitsanngorsassavara, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoExplicaAccion: 'Siullermik assit misissussavara, taava una isumagissavara: {{accion}}, {{como}}. Sinneri tamaasa allanngortissanngilakka.',
  photoComoNatural: 'sapinngisamik pinngortitatut',
  photoDecisionCalidad: 'pitsaassusiata pitsanngorsarneranik aallartissaanga',
  photoDecisionNatural: 'sapinngisamik pinngortitatut sanassavara',
  photoDecisionNaturales: 'sapinngisamik pinngortitatut sanassavakka',

  photoPasoMirarFoto: 'Assip misissornera, imarisaa paasiniarlugu',
  photoPasoImagenes: '{{numero}} assinik pilersitsineq',
  photoPasoMejorarFoto: 'Assip pitsanngorsarnera',
  photoPasoMejorarCalidad: 'Pitsaanerulersitsineq ersarinnerulersitsinerlu',
  photoPasoQuitarAlgo: 'Pisariaqanngitsup peernera',
  photoPasoFondo: 'Tunuliaqutip allanngortinnera imaluunniit peernera',
  photoPasoRestaurar: 'Assip pisoqaap iluarsinera',
  photoPasoRetoque: 'Kiinnap pinngortitatut aaqqissornera',
  photoPasoColorizar: 'Assip qernertup qaqortullu qalipaasernera',
  photoPasoTransformar: 'Isikkumik allamik allanngortitsineq',

  /* La voz de quien habla: Weë habla de «ti» (niuernerpit = de tu negocio). */
  designCosaMascota: 'niuernerpit ilisarnaataatut uumasoq',
};
