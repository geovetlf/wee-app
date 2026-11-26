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
  /* WITE · Transform Your Identity (2026-11-26, screens/TransformarIdentidadScreen.tsx). Sin revisión nativa. */
  witeTitle: 'Baguhin ang iyong pagkakakilanlan',
  witeIntro: 'I-record ang sarili mo, pumili ng isa sa mga karakter mo, at ibibigay sa iyo ng Weë ang itsura nito sa sarili mong video.',
  witeStepVideo: 'Ang video mo',
  witeVideoLimits: '{{min}} hanggang {{max}} seg · mp4 o mov',
  witeChangeVideo: 'Palitan ang video',
  witeUploading: 'Ina-upload ang video mo…',
  witeSeconds: '{{segundos}} seg',
  witeVideoLength: 'Masyadong maikli o masyadong mahaba ang video na iyan.',
  witeVideoFormat: 'Hindi puwede ang file na iyan: gumamit ng mp4 o mov na video na hanggang 200 MB.',
  witeStepCharacter: 'Ang karakter mo',
  witeNoCharacters: 'Wala ka pang karakter na may larawan. Gumawa ng Weë Profile at lagyan ito ng portrait.',
  witeOwnerYou: 'Iyo',
  witeVisualOk: 'May available na itsura',
  witeVisualMissing: 'Walang reference na larawan',
  witeVoiceUnavailable: 'Boses: hindi pa available',
  witeStepSubject: 'Sino ka sa video?',
  witeSubjectOnly: 'Ako lang ang tao',
  witeSubjectLeft: 'Sa kaliwa',
  witeSubjectCenter: 'Sa gitna',
  witeSubjectRight: 'Sa kanan',
  witeSubjectClosest: 'Pinakamalapit sa camera',
  witeStepLook: 'Ano ang magbabago',
  witePrimaryMode: 'Buong pagpapalit',
  witeLookFixed: 'Ang mukha, katawan, buhok at itsura mo ay magiging sa karakter mo.',
  witeChangeClothes: 'Palitan din ang damit',
  witeStepAudio: 'Audio',
  witeAudioOriginal: 'Orihinal na boses',
  witeAudioOriginalHint: 'Sinisikap naming panatilihin ang boses mo, ang usapan, ang musika at ang paligid.',
  witeAudioCharacter: 'Boses ng karakter',
  witeAudioCharacterHint: 'Hindi pa available: walang karakter na may awtorisadong boses.',
  witeNotGuaranteed: 'Sinisikap ng AI na panatilihin ang mga galaw, kumpas at ekspresyon mo, pero hindi ito laging nagtatagumpay. Lagi mo itong sinusuri bago i-post.',
  witeConsentMe: 'Ako ang taong binabago sa video na ito.',
  witeConsentOthers: 'Hindi dapat magbago ang ibang tao sa video.',
  witePrice: 'Presyo',
  witePriceNote: 'Inirereserba sa simula. Kung pumalya dahil sa error ng Weë, ibabalik ito sa iyo.',
  witeNoBalance: 'Kulang ang Credits mo.',
  witeBuyCredits: 'Bumili ng Credits',
  witeTransform: 'Baguhin',
  witeStatusQueued: 'Nakapila',
  witeStatusAnalyzing: 'Sinusuri ang video mo',
  witeStatusTransforming: 'Binabago ang pagkakakilanlan mo',
  witeStatusQuality: 'Sinusuri ang resulta',
  witeStatusCancelled: 'Kinansela ang pagbabago',
  witeAs: 'Bilang si {{nombre}}',
  witeWait: 'Maaaring tumagal ito ng ilang minuto.',
  witeCancel: 'Kanselahin',
  witeCannotCancel: 'Tumatakbo na ito at hindi na makakansela.',
  witeDemoNotice: 'Sample ito mula sa test mode, hindi totoong pagbabago. Hindi ito mapo-post.',
  witeReviewNotice: 'Huwag magmadali: mapo-post lang kung ikaw ang magpapasya.',
  witeCompare: 'Bago at pagkatapos',
  witeResult: 'Binago',
  witeOriginal: 'Orihinal',
  witeQualityDuration: 'Hindi kasinghaba ng video mo ang resulta. Suriin itong mabuti.',
  witeUse: 'Gamitin ang video na ito',
  witeRetry: 'Baguhin ulit',
  witeAdjust: 'Palitan ang karakter o settings',
  witeDiscard: 'Itapon',
  witeErrNotAvailable: 'Hindi pa available ang feature na ito sa account mo.',
  witeErrPriceChanged: 'Nagbago ang presyo. Suriin ito at subukan ulit.',
  witeErrCharacter: 'Hindi magagamit ang karakter na iyan.',
  witeErrConsent: 'Lagyan ng tsek ang dalawang kahon para magpatuloy.',
  witeErrRealFace: 'Hindi tumatanggap ang provider ng mga video na may totoong mukha nang walang paunang pahintulot ng taong iyon.',
  witeErrLimit: 'Naabot mo na ang limitasyon ng video ngayong araw. Subukan bukas.',
  witeErrGeneric: 'Hindi nabago ang video. Ibinalik ang mga nireserbang Credits.',
  witeErrUpload: 'Hindi na-upload ang video. Subukan ulit.',
  /* WITE · calidad adaptativa y consumo real (2026-11-26). Sin revisión nativa. */
  witeUpTo: 'Hanggang {{credits}} Credits',
  witeCharged: 'Siningil ang {{credits}} Credits',
  witeQuality: 'Kalidad {{resolucion}}',
  witeOtherResolution: 'Subukan sa {{resolucion}} (hiwalay na presyo)',
  witeNoOriginalAudio: 'Hindi napanatili ang orihinal na audio. Suriin bago gamitin.',
  /* WITE · asistente de cuatro pasos (2026-11-26). Sin revisión nativa. */
  witeRecord: 'I-record',
  witeFromGallery: 'Pumili mula sa gallery',
  witeStepOf: 'Hakbang {{paso}} ng {{total}}',
  witeNext: 'Susunod',
  witeStepConfirm: 'Suriin at kumpirmahin',
  witeCreateCharacter: 'Gumawa o kumpletuhin ang karakter',
  witeComingSoon: 'Malapit na',
  witeSubjectHint: 'I-tap kung nasaan ka sa video.',
};
