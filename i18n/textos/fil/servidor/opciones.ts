/*
 * FILIPINO — Opciones del flujo guiado de Weë AI (233): los botones con los que se le contesta a Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Cada etiqueta conserva EXACTAMENTE el
 * emoji del español y UN espacio detrás, porque el servidor y `i18n/servidor.ts` lo quitan con /^\S+\s+/; las que
 * llevan subtítulo conservan su « · » («Isang produkto · packaging, muwebles, damit, teknolohiya»).
 *
 * LAS QUE ENTRAN EN UNA FRASE. Muchas etiquetas se pegan, sin emoji y con la inicial en minúscula, dentro del plan que
 * Weë enseña antes de crear (`plan/*.ts`). Cada grupo tiene la forma que pide su hueco filipino, y el botón sigue
 * leyéndose natural. Como el filipino enlaza con «-ng» / «na» y un hueco no puede llevar el «-ng» pegado, las frases
 * del plan ponen la etiqueta donde no hace falta enlazarla con lo que va delante:
 *  · lo que se diseña en Weë Design va detrás de «disenyo ng …» («disenyo ng packaging», «… ng bagay na lumilipad»,
 *    «… ng tindahan o puwesto») y lo que se anuncia detrás de «para ipaalam ang …» («ang promo», «ang event», «ang
 *    bagong produkto», «ang schedule o balita»): SIN «isang», que detrás de «ng» o «ang» sobra;
 *  · los estilos, tonos y voces son adjetivos que van detrás de «sa istilong …», «sa tonong …» o «boses na …» (el
 *    enlace lo lleva el sustantivo, no el hueco): Studio «kapansin-pansin», «magiliw», «elegante», «nakakatuwa»;
 *    Writer y Business «magiliw» (el «cercano», como `studio.valClose`), «propesyonal», «masaya», «madamdamin»; la voz
 *    de Weë Music «pambabae», «panlalaki», «neutral»; los estilos de Weë Home son los nombres con que se habla de
 *    interiores en Filipinas —«modern», «minimalist», «bohemian», como el «Minimalist» del glosario— más
 *    «maaliwalas», el «acogedor» de `catalogo`;
 *  · los géneros musicales son NOMBRES —«pop», «reggaeton o urban», «rock», «ballad», «electronic», los de
 *    `catalogo`— y el ánimo un adjetivo que entra como predicado: «… ang istilo at masaya ang mood»;
 *  · lo que se prueba en Weë Beauty va detrás de «Susubukan ko ang …»: «makeup look», «ibang gupit o hairstyle»,
 *    «balbas o malinis na ahit» (la barba o el afeitado), «disenyo ng kuko» («kuko» solo no se «prueba»), «mga
 *    accessory», «kumpletong bagong look»; y la ocasión detrás de «para sa …»: «araw-araw», «party», «trabaho»,
 *    «date», las palabras del mundo de la belleza en Filipinas (`catalogo`);
 *  · Weë Chef: las personas se leen solas entre comas, ya con su «para sa» —«para sa dalawa», «para sa pamilya»,
 *    «para sa marami»— y el tiempo detrás de «sa loob ng …» («15 minuto», «kalahating oras», «isang oras o higit
 *    pa»); «🤷 Da igual» es «Kahit gaano katagal», que es lo que contesta a «¿Cuánto tiempo tienes?»;
 *  · las habitaciones de Weë Home, sin artículo —«sala», «kuwarto», «kusina», «banyo»— entran detrás de «ang», «ng» o
 *    «para sa» («ang muwebles ng sala»);
 *  · lo que busca quien viaja va detrás de «ayon sa hinahanap mong …»: sustantivos —«pahinga», «bagong
 *    matutuklasan», «masarap na pagkain», «kalikasan», «gimik» (salir: la palabra filipina para salir de noche)—; el
 *    «-ng» lo lleva «mo», así que vale también lo que escriba la persona;
 *  · el «cómo» de Weë Photo va detrás de una coma, como en español: «natural at hindi halata», «may matingkad na
 *    kulay», «malinis o puting background», «artistiko o vintage»;
 *  · el tipo de vídeo «Una historia» es «Kuwento», sin artículo, porque entra en «10 segundong kuwento».
 *
 * LA VOZ DE LA PERSONA. «Solo para mí», «Mi oficina», «Mi CV», «Una mascota para mi marca» se escriben como los
 * diría ella, con el posesivo detrás y sin «ang» («Para sa akin lang», «Opisina ko», «Resume ko», «Mascot para sa
 * brand ko»); dentro del plan, Weë habla de «ti» con sus piezas
 * propias (`chefComensalesSoloParaMi`, `homeEspacioMiOficina`, `designCosaMascota`).
 *
 * LAS QUE NO ENTRAN EN NINGUNA FRASE —el «qué» de Design, Photo, Home, Business, Chef, Music, Writer, Travel y Brain,
 * los «dónde» y los ajustes de Design que el servidor convierte en sus propias frases— siguen el patrón de
 * `catalogo`: donde el español pone un infinitivo, el filipino pone el imperativo sin pronombre con que se le pide algo
 * a un asistente («Pagandahin ang layout», «Sagutin ang mga customer», «I-mix at i-master ang kanta ko»), y donde el
 * texto es el de una tarjeta del catálogo, la etiqueta es la de esa tarjeta, para que la respuesta diga lo mismo que
 * la tarjeta que se tocó. Las de Writer son los sustantivos de sus tarjetas («Pagsasalin», «Buod», «Pagwawasto»,
 * «Muling pagsulat»). Los «dónde» se contestan con su preposición («Sa Instagram o Facebook», «Sa story», «Para
 * i-print», «Sa YouTube»), que es como se contesta en filipino a «Saan …?». Los botones de Weë Photo son también el
 * título del paso (`photoPaso…`), así que dicen lo mismo.
 *
 * «NO SÉ». «🤷 No sé» es «🤷 Hindi ko alam» (glosario § 10 y § 15.30) y toda opción española que empieza por «🤷 No
 * sé» empieza aquí por «🤷 Hindi ko alam»; «🤷 Sorpréndeme», «🤷 Ikaw na ang bahala»; «🤷 Todavía no lo sé», «🤷 Hindi
 * ko pa alam» (glosario § 11.10); «💡 No sé qué cocinar», «💡 Hindi ko alam ang lulutuin» (`catalogo.chefAcIdkTitle`).
 *
 * PALABRAS, las de `catalogo` y el glosario: «redes», «social media»; «publicidad», «advertising»; «marca», «brand»;
 * «personaje», «karakter»; «mascota» de una marca, «mascot»; «criatura», «nilalang»; «paisaje», «tanawin»; «guion»,
 * «script»; «CV», «resume»; «portada», «cover»; «letra», «lyrics»; «postre», «dessert»; «receta», «recipe»; «plato»,
 * «luto»; «espacio», «espasyo»; «muebles», «muwebles»; «distribución», «layout»; «cliente», «customer»; «campaña»,
 * «kampanya»; «plan», «plano». La historia de Instagram es «story», como la llaman quienes
 * publican. Los idiomas de Writer llevan mayúscula, como todo nombre de idioma en filipino («Ingles», «Portuges»,
 * «Pranses», «Italyano»). «Equilibrado» es «Katamtaman» y no «Balanse», que en Weë es el saldo de Credits.
 *
 * Se escriben igual que en español porque ES la palabra filipina: «Natural» (Design), «Elegante» y «Rock». «Pop»
 * también. «Industriyal» y «Moderno» son las de `design.ts` (una idea, una palabra, guía § 0 y § 4.5): el estilo de
 * Weë Design se dice igual en sus opciones, en sus valores y en el plan de Weë Brain («industriyal ang itsura»).
 */
export const opciones: typeof import('../../es/servidor/opciones').opciones = {
  designWhatLogo: '🔤 Logo o ang brand ko · kung wala ka pa nito',
  designWhatPoster: '🪧 Para sa social media o advertising · para may maipaalam ka',
  designWhatProduct: '📦 Isang produkto · packaging, muwebles, damit, teknolohiya',
  designWhatObject: '🏎️ Sasakyan o makina · kotse, eroplano, imbensyon',
  designWhatScene: '🏙️ Lugar o tagpuan · bahay, tindahan, tanawin',
  designWhatCharacter: '🧑‍🚀 Isang karakter · mascot, bayani, nilalang',
  designFeelSerious: '🏛️ Seryoso at mapagkakatiwalaan',
  designFeelModern: '✨ Moderno',
  designFeelClose: '🎈 Magiliw at masaya',
  designFeelLuxury: '💎 Marangya',
  designFeelNatural: '🌿 Natural',
  designFeelIdk: '🤷 Hindi ko alam',
  designMessagePromo: '🏷️ Promo',
  designMessageEvent: '📅 Event',
  designMessageLaunch: '🆕 Bagong produkto',
  designMessageNews: '🕒 Schedule o balita',
  designWhereFeed: '📱 Sa Instagram o Facebook',
  designWhereStory: '📖 Sa story',
  designWhereWhatsapp: '💬 Sa WhatsApp',
  designWherePrint: '🖨️ Para i-print',
  designWhereIdk: '🤷 Hindi ko alam',
  designItemPack: '📦 Packaging',
  designItemFurniture: '🛋️ Muwebles',
  designItemClothes: '👟 Damit o sapatos',
  designItemGadget: '📱 Gadget',
  designLookClean: '✨ Moderno at malinis',
  designLookNatural: '🌿 Natural',
  designLookLuxury: '💎 Marangya',
  designLookFun: '🎈 Masaya',
  designLookIndustrial: '🏭 Industriyal',
  designLookIdk: '🤷 Hindi ko alam',
  designMachineCar: '🏎️ Kotse',
  designMachineAir: '🚁 Bagay na lumilipad',
  designMachineBike: '🏍️ Motorsiklo',
  designMachineEngine: '⚙️ Engine o piyesa',
  designEraFuture: '🚀 Hinaharap',
  designEraNow: '🏁 Kasalukuyan',
  designEraClassic: '🕰️ Klasiko',
  designEraScifi: '🤖 Sci-fi',
  designEraIdk: '🤷 Hindi ko alam',
  designPlaceHouse: '🏠 Bahay',
  designPlaceShop: '🏪 Tindahan o puwesto',
  designPlaceCity: '🌆 Lungsod',
  designPlaceNature: '🌄 Tanawin',
  designInoutOutside: '🏠 Mula sa labas',
  designInoutInside: '🛋️ Mula sa loob',
  designInoutWide: '🌄 Malawak na tanaw',
  designInoutIdk: '🤷 Hindi ko alam',
  designWhoMascot: '🐶 Mascot para sa brand ko',
  designWhoHero: '🦸 Bayani o bida',
  designWhoRobot: '🤖 Robot',
  designWhoCreature: '🐉 Nilalang',
  designDrawCartoon: '🎨 Cartoon',
  designDrawReal: '📷 Makatotohanan',
  designDrawGame: '🕹️ Parang video game',
  designDrawPencil: '✏️ Guhit sa lapis',
  designDrawCute: '🧸 Cute',
  designDrawIdk: '🤷 Hindi ko alam',
  studioTypePromo: '📣 Para mag-promote ng isang bagay',
  studioTypeSocial: '📱 Para sa social media ko',
  studioTypeStory: '🎞️ Kuwento',
  studioTypeAnimate: '🖼️ I-animate ang larawan',
  studioTypeIdk: '🤷 Hindi ko alam',
  studioStyleImpact: '🔥 Kapansin-pansin',
  studioStyleWarm: '🤗 Magiliw',
  studioStyleElegant: '✨ Elegante',
  studioStyleFun: '😂 Nakakatuwa',
  studioStyleIdk: '🤷 Ikaw na ang bahala',
  studioWhereVertical: '📱 Sa Instagram o TikTok',
  studioWhereHorizontal: '▶️ Sa YouTube',
  studioWhereSquare: '💬 Sa WhatsApp o Facebook',
  studioWhereIdk: '🤷 Hindi ko alam',
  photoActionEnhance: '✨ Pagandahin ang kalidad at resolution',
  photoActionRemove: '🧽 Alisin ang hindi kailangan',
  photoActionBackground: '🪄 Palitan o alisin ang background',
  photoActionRestore: '🕰️ I-restore ang lumang larawan',
  photoActionRetouch: '🙂 Natural na retouch ng mukha',
  photoActionColorize: '🌈 Kulayan ang black and white',
  photoActionTransform: '🎇 Bigyan ng ibang istilo',
  photoActionGenerate: '🖼️ Gumawa ng larawan mula sa simula',
  photoActionIdk: '🤷 Hindi ko alam',
  photoDetailNatural: '🍃 Natural at hindi halata',
  photoDetailVivid: '🌈 May matingkad na kulay',
  photoDetailClean: '⬜ Malinis o puting background',
  photoDetailArtistic: '🎨 Artistiko o vintage',
  photoDetailIdk: '🤷 Ikaw na ang bahala',
  writerWhatPost: '📱 Post',
  writerWhatStory: '📖 Kuwento o nobela',
  writerWhatScript: '🎬 Script',
  writerWhatArticle: '📰 Artikulo o blog',
  writerWhatEmail: '✉️ Email o liham',
  writerWhatDocument: '📄 Dokumento',
  writerWhatCv: '🧑‍💼 Resume ko',
  writerWhatCover: '📕 Cover ng libro ko',
  writerWhatTranslate: '🌐 Pagsasalin',
  writerWhatSummary: '🗒️ Buod',
  writerWhatIdeas: '💡 Mga ideya',
  writerWhatFix: '✔️ Pagwawasto',
  writerWhatRewrite: '🔁 Muling pagsulat',
  writerWhatCitations: '❝ Mga citation at reference',
  writerWhatIdk: '🤷 Hindi ko alam',
  writerToneFriendly: '😊 Magiliw',
  writerTonePro: '💼 Propesyonal',
  writerToneFun: '😄 Masaya',
  writerToneEmotional: '💛 Madamdamin',
  writerToneIdk: '🤷 Ikaw na ang bahala',
  writerLanguageEn: '🇺🇸 Ingles',
  writerLanguagePt: '🇧🇷 Portuges',
  writerLanguageFr: '🇫🇷 Pranses',
  writerLanguageIt: '🇮🇹 Italyano',
  writerLanguageIdk: '🤷 Hindi ko alam',
  musicWhatSong: '🎤 Kanta',
  musicWhatInstrumental: '🎹 Beat o instrumental',
  musicWhatJingle: '📣 Jingle para sa brand ko',
  musicWhatVoice: '🗣️ Boses o narasyon',
  musicWhatLyrics: '📝 Lyrics',
  musicWhatMix: '🎚️ I-mix at i-master ang kanta ko',
  musicWhatVideo: '🎬 Music video para sa kanta ko',
  musicWhatIdk: '🤷 Hindi ko alam',
  musicStylePop: '🎵 Pop',
  musicStyleUrban: '🔥 Reggaeton o urban',
  musicStyleRock: '🎸 Rock',
  musicStyleBallad: '🎹 Ballad',
  musicStyleElectronic: '🎧 Electronic',
  musicStyleIdk: '🤷 Ikaw na ang bahala',
  musicMoodHappy: '☀️ Masaya',
  musicMoodCalm: '🌙 Kalmado',
  musicMoodEpic: '⚡ Epiko',
  musicMoodRomantic: '💘 Romantiko',
  musicMoodIdk: '🤷 Ikaw na ang bahala',
  musicVoiceFemale: '👩 Pambabae',
  musicVoiceMale: '👨 Panlalaki',
  musicVoiceNeutral: '🤖 Neutral',
  musicVoiceIdk: '🤷 Ikaw na ang bahala',
  beautyWhatMakeup: '💄 Makeup look',
  beautyWhatHair: '💇 Ibang gupit o hairstyle',
  beautyWhatHaircolor: '🎨 Ibang kulay ng buhok',
  beautyWhatBeard: '🧔 Balbas o malinis na ahit',
  beautyWhatOutfit: '👗 Outfit',
  beautyWhatNails: '💅 Disenyo ng kuko',
  beautyWhatAccessories: '🕶️ Mga accessory',
  beautyWhatSkin: '🧴 Skincare',
  beautyWhatFace: '🪞 Ang istilong bagay sa mukha ko',
  beautyWhatTransform: '✨ Kumpletong bagong look',
  beautyWhatIdk: '🤷 Ikaw na ang bahala',
  beautyOccasionDaily: '☕ Araw-araw',
  beautyOccasionParty: '🎉 Party',
  beautyOccasionWork: '💼 Trabaho',
  beautyOccasionDate: '💘 Date',
  beautyOccasionIdk: '🤷 Hindi ko alam',
  chefWhatRecipe: '🍽️ Gusto ko ng recipe',
  chefWhatCook: '🧊 Magluto gamit ang mayroon ako',
  chefWhatMenu: '📋 Gumawa ng menu',
  chefWhatHealthy: '🥗 Masustansyang makakain',
  chefWhatDessert: '🍰 Dessert',
  chefWhatEdit: '📸 I-retouch ang larawan ng luto ko',
  chefWhatIdk: '💡 Hindi ko alam ang lulutuin',
  chefChangeLight: '💡 Pagandahin ang ilaw',
  chefChangeBackground: '🪵 Palitan ang background',
  chefChangeAppetizing: '🤤 Gawing mas katakam-takam',
  chefChangePro: '📷 Gawing mukhang pang-restaurant',
  chefChangeClean: '🧹 Alisin ang hindi kailangan',
  chefChangeIdk: '🤷 Hindi ko alam',
  chefPeople1: '👤 Para sa akin lang',
  chefPeople2: '👥 Para sa dalawa',
  chefPeople4: '👨‍👩‍👧 Para sa pamilya',
  chefPeople8: '🎉 Para sa marami',
  chefPeopleIdk: '🤷 Hindi ko alam',
  chefTime15: '⚡ 15 minuto',
  chefTime30: '⏱️ Kalahating oras',
  chefTime60: '🕐 Isang oras o higit pa',
  chefTimeIdk: '🤷 Kahit gaano katagal',
  chefDays3: '📆 Tatlong araw',
  chefDays7: '🗓️ Buong linggo',
  chefDaysIdk: '🤷 Hindi ko alam',
  homeWhatDesign: '🏠 Idisenyo ulit ang espasyo ko',
  homeWhatFurniture: '🪑 Palitan o subukan ang muwebles',
  homeWhatColors: '🎨 Palitan ang istilo at kulay',
  homeWhatLayout: '📐 Pagandahin ang layout',
  homeWhatGarden: '🌿 Labas ng bahay at hardin',
  homeWhatIdeas: '💡 Maghanap ng ideya',
  homeWhatIdk: '🤷 Hindi ko alam',
  homeSpaceLiving: '🛋️ Sala',
  homeSpaceBedroom: '🛏️ Kuwarto',
  homeSpaceKitchen: '🍳 Kusina',
  homeSpaceBath: '🛁 Banyo',
  homeSpaceOffice: '💻 Opisina ko',
  homeSpaceIdk: '🤷 Hindi ko alam',
  homeStyleModern: '🏙️ Moderno',
  homeStyleCozy: '🕯️ Maaliwalas',
  homeStyleMinimal: '◻️ Minimalist',
  homeStyleBoho: '🌵 Bohemian',
  homeStyleIdk: '🤷 Ikaw na ang bahala',
  businessWhatIdea: '💡 Mga ideya at estratehiya',
  businessWhatContent: '✨ Gumawa ng content para sa social media ko',
  businessWhatSchedule: '📅 I-schedule ang mga post',
  businessWhatPublish: '🚀 Ihanda para i-post',
  businessWhatReply: '💬 Sagutin ang mga customer',
  businessWhatAnalyze: '📊 Suriin ang mga resulta',
  businessWhatMarketing: '📣 Kampanya o advertising',
  businessWhatCv: '📄 Resume ko',
  businessWhatDeck: '📽️ Presentasyon',
  businessWhatPlan: '🗺️ Plano o dokumento',
  businessWhatIdk: '🤷 Hindi ko alam',
  businessToneCasual: '😊 Magiliw',
  businessTonePro: '💼 Propesyonal',
  businessToneIdk: '🤷 Hindi ko alam',
  travelWhatPlan: '🗺️ Magplano ng biyahe',
  travelWhatWhere: '🌎 Hindi ko alam kung saan pupunta',
  travelWhatDoing: '🍽️ Ano ang gagawin at saan kakain',
  travelWhatMoving: '🧭 Paano lumibot',
  travelVibeRest: '🌴 Pahinga',
  travelVibeDiscover: '🏛️ Bagong matutuklasan',
  travelVibeFood: '🍽️ Masarap na pagkain',
  travelVibeNature: '🏔️ Kalikasan',
  travelVibeParty: '🎉 Gimik',
  travelVibeIdk: '🤷 Hindi ko alam',
  travelDatesIdk: '🤷 Hindi ko pa alam',
  travelInterestCulture: '🏛️ Kultura at kasaysayan',
  travelInterestNature: '🏔️ Kalikasan',
  travelInterestFood: '🍽️ Pagkain',
  travelInterestRest: '🌴 Pahinga',
  travelInterestParty: '🎉 Nightlife',
  travelInterestIdk: '🤷 Ikaw na ang bahala',
  travelPaceSlow: '🐢 Relaks, walang pagmamadali',
  travelPaceBalanced: '🚶 Katamtaman',
  travelPaceIntense: '⚡ Puspusan, sulitin ang bawat araw',
  travelPaceIdk: '🤷 Ikaw na ang bahala',
  brainWhatLearn: '📚 May gusto akong matutunan',
  brainWhatSolve: '🧩 Lutasin ang isang problema',
  brainWhatPlan: '🗓️ Mag-organisa o magplano',
  brainWhatTranslate: '🌐 Magsalin o magbuod',
  brainWhatIdk: '🤷 Hindi ko alam kung saan magsisimula',
};
