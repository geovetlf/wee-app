/*
 * DANÉS — Opciones del flujo guiado de Weë AI (233): los botones con los que se le contesta a Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Cada etiqueta conserva EXACTAMENTE el
 * emoji del español y UN espacio detrás, porque el servidor y `i18n/servidor.ts` lo quitan con /^\S+\s+/; las que
 * llevan subtítulo conservan su « · » («Et produkt · emballage, møbler, tøj, teknologi»).
 *
 * LAS QUE ENTRAN EN UNA FRASE. Muchas etiquetas se pegan, sin emoji y con la inicial en minúscula, dentro del plan que
 * Weë enseña antes de crear. Por eso cada grupo tiene la forma que pide su hueco danés, no la del español palabra por
 * palabra, y el botón sigue leyéndose natural:
 *  · lo que se diseña en Weë Design (message, item, machine, place, who) va detrás de «forslag til …» / «annoncere …»:
 *    sintagmas nominales con su artículo y su género («et tilbud», «en emballage», «et møbel», «noget, der flyver»,
 *    «en butik eller et lokale»); la mascota es «en maskot for mit brand», con «for» para no decir «til … til»;
 *  · lo que se prueba en Weë Beauty va detrás de «prøve …»: «et makeuplook», «en anden hårfarve», «med eller uden
 *    skæg» (la barba o el afeitado, sin un adjetivo suelto), «et negledesign», «tilbehør», «et helt nyt look»; y la
 *    ocasión detrás de «til»: «hverdag», «en fest», «arbejde», «en date»;
 *  · los adjetivos de estilo, tono, ánimo y voz van en su forma base, la de género común, que es la que concuerda en
 *    «i en … stil», «i en … tone», «med en … stemning» y «en … stemme»: Studio «slagkraftig», «varm» (el «cercano»
 *    de un vídeo; «personlig stil» se leería como «tu estilo propio»), «elegant», «sjov»; Writer y Business
 *    «personlig» (el «cercano» de un tono, como `studio.valClose`), «professionel», «sjov», «rørende»; Music
 *    «glad», «rolig», «episk», «romantisk» y la voz «kvindelig», «mandlig», «kønsneutral» (más claro que «neutral»
 *    para una voz); Home «moderne», «hyggelig», «minimalistisk», «bohemisk»;
 *  · los géneros musicales son NOMBRES —«pop», «reggaeton eller urban», «rock», «ballade», «elektronisk musik»—: en
 *    danés no se ponen delante de «stil» («pop stil» sería særskrivning); van solos o detrás («stilen pop»);
 *  · las habitaciones de Weë Home, en forma definida —«stuen», «soveværelset», «køkkenet», «badeværelset»— y «mit
 *    kontor»: se leen bien detrás de cualquier preposición («møblerne i stuen», «idéer til køkkenet»);
 *  · Weë Chef: las personas se leen solas detrás del plato —«kun til mig», «til to», «til familien», «til mange»
 *    (con «til»: «for mange» sería «demasiados»), como en `chef`—, el tiempo detrás de «på» —«15 minutter», «en
 *    halv time», «en time eller mere»— y los días detrás de la madplan —«tre dage», «hele ugen»—;
 *  · lo que Weë Photo hace con la foto va en INFINITIVO sin «at» («forbedre kvaliteten og opløsningen», «fjerne
 *    noget, der skal væk», «farvelægge et sort-hvidt foto»…): entra en «… sørger jeg for at …», contesta bien a
 *    «Hvad skal vi gøre med dit foto?» y es también el título del resultado. Que «Forbedr» se evite (guía § 3) es
 *    regla del imperativo, no del infinitivo. El detalle va detrás de una coma: «naturligt, så det ikke ses», «med
 *    levende farver», «ren eller hvid baggrund»;
 *  · lo que busca quien viaja (vibe) va detrás de «du søger»: sustantivos —«afslapning», «nye opdagelser», «god
 *    mad», «natur», «natteliv»— y no la mezcla de infinitivos y nombres del español;
 *  · el tipo de vídeo de Studio, sintagmas nominales —«en reklame for noget», «indhold til mine sociale medier», «en
 *    historie»— que se leen bien detrás de «lave»/«generere»; animar una foto es «et animeret foto», un tipo de
 *    vídeo, porque contesta a «Hvilken slags video?».
 *
 * LAS QUE NO ENTRAN EN NINGUNA FRASE —el «qué» de Design, Home, Business, Chef, Music, Writer, Travel y Brain, y los
 * ajustes de Design que el servidor convierte en sus propias frases (FRASES_DESIGN)— siguen el patrón de `catalogo`:
 * donde el español pone un infinitivo, el danés pone el imperativo con que se le pide algo a un asistente, y donde el
 * texto español es el de una tarjeta del catálogo, la etiqueta danesa es la de esa tarjeta, para que la respuesta
 * diga lo mismo que la tarjeta que se tocó («Indret mit rum på ny», «Udnyt rummet bedre», «Udeområder og have»,
 * «Analysér resultater», «Giv mig en opskrift», «Mix og master min sang», «Oplevelser og spisesteder», «Sådan
 * kommer jeg rundt»). Las de Writer son los sustantivos de sus tarjetas («Oversættelse», «Resumé», «Korrektur»,
 * «Omskrivning»), que contestan a «Hvad skal vi skrive?» mejor que un verbo. Los adjetivos de Design concuerdan con
 * lo que describen: con «dit brand» y con el producto («det»), en neutro: «Seriøst og troværdigt», «Luksuriøst»,
 * «Industrielt»; y una marca «cercana» es «imødekommende», que es como se describe un brand en danés.
 *
 * «NO SÉ». «🤷 No sé» es «Ved ikke», la respuesta danesa de siempre y la de `help`; «🤷 Sorpréndeme», «Overrask mig»
 * (los chips de `catalogo`); «🤷 Todavía no lo sé», «Det ved jeg ikke endnu» (`weeai.dontKnowYet`); «💡 No sé qué
 * cocinar», «Ved ikke, hvad jeg skal lave» (`catalogo.chefAcIdkTitle`); «🤷 Da igual», «Lige meget» (`chef`); y
 * «🤷 No sé por dónde empezar», «Ved ikke, hvor jeg skal starte».
 *
 * PALABRAS, las de `catalogo`: «redes», «sociale medier»; «marca», «brand» (et brand: «mit brand»); «personaje»,
 * «karakter»; «guion», «manuskript»; «portada», «forside»; «postre», «dessert»; «maquillaje», «makeup»
 * («makeuplook», junto); «accesorios», «tilbehør»; «uñas», «negledesign»; «acogedor», «hyggelig»; «un local o
 * negocio» (un sitio), «en butik eller et lokale»; «algo de tecnología», «et stykke elektronik»; «una historia»
 * de Instagram, «en story», como lo dicen en danés quienes publican (`business`: «Instagram-story»). Los «dónde» se
 * contestan con su preposición («På Instagram eller Facebook», «I en story», «Til print», «På YouTube»), que es como
 * se contesta en danés a «Hvor …?» y evita copiar «WhatsApp» tal cual. Los idiomas de Writer llevan mayúscula solo
 * porque abren el botón («Engelsk»); dentro de la frase vuelven a la minúscula danesa («til engelsk»).
 *
 * Se escriben igual que en español porque ES la palabra danesa: «Pop» y «Rock», como `catalogo.musicEj1Subtitle`.
 */
export const opciones: typeof import('../../es/servidor/opciones').opciones = {
  designWhatLogo: '🔤 Et logo eller mit brand · hvis du ikke har et endnu',
  designWhatPoster: '🪧 Til sociale medier eller reklame · for at annoncere noget',
  designWhatProduct: '📦 Et produkt · emballage, møbler, tøj, teknologi',
  designWhatObject: '🏎️ Et køretøj eller en maskine · biler, fly, opfindelser',
  designWhatScene: '🏙️ Et sted eller et miljø · huse, lokaler, landskaber',
  designWhatCharacter: '🧑‍🚀 En karakter · maskotter, helte, væsener',
  designFeelSerious: '🏛️ Seriøst og troværdigt',
  designFeelModern: '✨ Moderne',
  designFeelClose: '🎈 Imødekommende og sjovt',
  designFeelLuxury: '💎 Luksuriøst',
  designFeelNatural: '🌿 Naturligt',
  designFeelIdk: '🤷 Ved ikke',
  designMessagePromo: '🏷️ Et tilbud',
  designMessageEvent: '📅 Et arrangement',
  designMessageLaunch: '🆕 Et nyt produkt',
  designMessageNews: '🕒 Åbningstider eller en nyhed',
  designWhereFeed: '📱 På Instagram eller Facebook',
  designWhereStory: '📖 I en story',
  designWhereWhatsapp: '💬 På WhatsApp',
  designWherePrint: '🖨️ Til print',
  designWhereIdk: '🤷 Ved ikke',
  designItemPack: '📦 En emballage',
  designItemFurniture: '🛋️ Et møbel',
  designItemClothes: '👟 Tøj eller sko',
  designItemGadget: '📱 Et stykke elektronik',
  designLookClean: '✨ Moderne og stilrent',
  designLookNatural: '🌿 Naturligt',
  designLookLuxury: '💎 Luksuriøst',
  designLookFun: '🎈 Sjovt',
  designLookIndustrial: '🏭 Industrielt',
  designLookIdk: '🤷 Ved ikke',
  designMachineCar: '🏎️ En bil',
  designMachineAir: '🚁 Noget, der flyver',
  designMachineBike: '🏍️ En motorcykel',
  designMachineEngine: '⚙️ En motor eller en komponent',
  designEraFuture: '🚀 Fra fremtiden',
  designEraNow: '🏁 Fra nutiden',
  designEraClassic: '🕰️ Klassisk',
  designEraScifi: '🤖 Science fiction',
  designEraIdk: '🤷 Ved ikke',
  designPlaceHouse: '🏠 Et hus',
  designPlaceShop: '🏪 En butik eller et lokale',
  designPlaceCity: '🌆 En by',
  designPlaceNature: '🌄 Et landskab',
  designInoutOutside: '🏠 Udefra',
  designInoutInside: '🛋️ Indefra',
  designInoutWide: '🌄 Et bredt udsyn',
  designInoutIdk: '🤷 Ved ikke',
  designWhoMascot: '🐶 En maskot for mit brand',
  designWhoHero: '🦸 En helt eller hovedperson',
  designWhoRobot: '🤖 En robot',
  designWhoCreature: '🐉 Et væsen',
  designDrawCartoon: '🎨 Tegnefilm',
  designDrawReal: '📷 Realistisk',
  designDrawGame: '🕹️ Som et computerspil',
  designDrawPencil: '✏️ Blyantstegning',
  designDrawCute: '🧸 Nuttet',
  designDrawIdk: '🤷 Ved ikke',
  studioTypePromo: '📣 En reklame for noget',
  studioTypeSocial: '📱 Indhold til mine sociale medier',
  studioTypeStory: '🎞️ En historie',
  studioTypeAnimate: '🖼️ Et animeret foto',
  studioTypeIdk: '🤷 Ved ikke',
  studioStyleImpact: '🔥 Slagkraftig',
  studioStyleWarm: '🤗 Varm',
  studioStyleElegant: '✨ Elegant',
  studioStyleFun: '😂 Sjov',
  studioStyleIdk: '🤷 Overrask mig',
  studioWhereVertical: '📱 På Instagram eller TikTok',
  studioWhereHorizontal: '▶️ På YouTube',
  studioWhereSquare: '💬 På WhatsApp eller Facebook',
  studioWhereIdk: '🤷 Ved ikke',
  photoActionEnhance: '✨ Forbedre kvaliteten og opløsningen',
  photoActionRemove: '🧽 Fjerne noget, der skal væk',
  photoActionBackground: '🪄 Skifte eller fjerne baggrunden',
  photoActionRestore: '🕰️ Restaurere et gammelt foto',
  photoActionRetouch: '🙂 Retouchere ansigtet naturligt',
  photoActionColorize: '🌈 Farvelægge et sort-hvidt foto',
  photoActionTransform: '🎇 Give det en ny stil',
  photoActionGenerate: '🖼️ Lave et billede fra bunden',
  photoActionIdk: '🤷 Ved ikke',
  photoDetailNatural: '🍃 Naturligt, så det ikke kan ses',
  photoDetailVivid: '🌈 Med levende farver',
  photoDetailClean: '⬜ Ren eller hvid baggrund',
  photoDetailArtistic: '🎨 Kunstnerisk eller vintage',
  photoDetailIdk: '🤷 Overrask mig',
  writerWhatPost: '📱 Et opslag',
  writerWhatStory: '📖 En historie eller roman',
  writerWhatScript: '🎬 Et manuskript',
  writerWhatArticle: '📰 En artikel eller et blogindlæg',
  writerWhatEmail: '✉️ En e-mail eller et brev',
  writerWhatDocument: '📄 Et dokument',
  writerWhatCv: '🧑‍💼 Mit CV',
  writerWhatCover: '📕 Forsiden til min bog',
  writerWhatTranslate: '🌐 Oversættelse',
  writerWhatSummary: '🗒️ Resumé',
  writerWhatIdeas: '💡 Idéer',
  writerWhatFix: '✔️ Korrektur',
  writerWhatRewrite: '🔁 Omskrivning',
  writerWhatCitations: '❝ Citater og referencer',
  writerWhatIdk: '🤷 Ved ikke',
  writerToneFriendly: '😊 Personlig',
  writerTonePro: '💼 Professionel',
  writerToneFun: '😄 Sjov',
  writerToneEmotional: '💛 Rørende',
  writerToneIdk: '🤷 Overrask mig',
  writerLanguageEn: '🇺🇸 Engelsk',
  writerLanguagePt: '🇧🇷 Portugisisk',
  writerLanguageFr: '🇫🇷 Fransk',
  writerLanguageIt: '🇮🇹 Italiensk',
  writerLanguageIdk: '🤷 Ved ikke',
  musicWhatSong: '🎤 En sang',
  musicWhatInstrumental: '🎹 Et beat eller instrumentalnummer',
  musicWhatJingle: '📣 En jingle til mit brand',
  musicWhatVoice: '🗣️ En stemme eller oplæsning',
  musicWhatLyrics: '📝 En sangtekst',
  musicWhatMix: '🎚️ Mix og master min sang',
  musicWhatVideo: '🎬 En musikvideo til min sang',
  musicWhatIdk: '🤷 Ved ikke',
  musicStylePop: '🎵 Pop',
  musicStyleUrban: '🔥 Reggaeton eller urban',
  musicStyleRock: '🎸 Rock',
  musicStyleBallad: '🎹 Ballade',
  musicStyleElectronic: '🎧 Elektronisk musik',
  musicStyleIdk: '🤷 Overrask mig',
  musicMoodHappy: '☀️ Glad',
  musicMoodCalm: '🌙 Rolig',
  musicMoodEpic: '⚡ Episk',
  musicMoodRomantic: '💘 Romantisk',
  musicMoodIdk: '🤷 Overrask mig',
  musicVoiceFemale: '👩 Kvindelig',
  musicVoiceMale: '👨 Mandlig',
  musicVoiceNeutral: '🤖 Kønsneutral',
  musicVoiceIdk: '🤷 Overrask mig',
  beautyWhatMakeup: '💄 Et makeuplook',
  beautyWhatHair: '💇 En anden klipning eller frisure',
  beautyWhatHaircolor: '🎨 En anden hårfarve',
  beautyWhatBeard: '🧔 Med eller uden skæg',
  beautyWhatOutfit: '👗 Et outfit',
  beautyWhatNails: '💅 Et negledesign',
  beautyWhatAccessories: '🕶️ Tilbehør',
  beautyWhatSkin: '🧴 Hudpleje',
  beautyWhatFace: '🪞 Den stil, der klæder mit ansigt',
  beautyWhatTransform: '✨ Et helt nyt look',
  beautyWhatIdk: '🤷 Overrask mig',
  beautyOccasionDaily: '☕ Hverdag',
  beautyOccasionParty: '🎉 En fest',
  beautyOccasionWork: '💼 Arbejde',
  beautyOccasionDate: '💘 En date',
  beautyOccasionIdk: '🤷 Ved ikke',
  chefWhatRecipe: '🍽️ Giv mig en opskrift',
  chefWhatCook: '🧊 Lav mad med det, jeg har',
  chefWhatMenu: '📋 Lav en menu',
  chefWhatHealthy: '🥗 Noget sundt',
  chefWhatDessert: '🍰 En dessert',
  chefWhatEdit: '📸 Retoucher fotoet af min ret',
  chefWhatIdk: '💡 Ved ikke, hvad jeg skal lave',
  chefChangeLight: '💡 Gør lyset bedre',
  chefChangeBackground: '🪵 Skift baggrunden',
  chefChangeAppetizing: '🤤 Gør retten mere appetitlig',
  chefChangePro: '📷 Giv fotoet et restaurantlook',
  chefChangeClean: '🧹 Fjern noget, der skal væk',
  chefChangeIdk: '🤷 Ved ikke',
  chefPeople1: '👤 Kun til mig',
  chefPeople2: '👥 Til to',
  chefPeople4: '👨‍👩‍👧 Til familien',
  chefPeople8: '🎉 Til mange',
  chefPeopleIdk: '🤷 Ved ikke',
  chefTime15: '⚡ 15 minutter',
  chefTime30: '⏱️ En halv time',
  chefTime60: '🕐 En time eller mere',
  chefTimeIdk: '🤷 Lige meget',
  chefDays3: '📆 Tre dage',
  chefDays7: '🗓️ Hele ugen',
  chefDaysIdk: '🤷 Ved ikke',
  homeWhatDesign: '🏠 Indret mit rum på ny',
  homeWhatFurniture: '🪑 Skift eller prøv møbler',
  homeWhatColors: '🎨 Skift stil og farver',
  homeWhatLayout: '📐 Udnyt rummet bedre',
  homeWhatGarden: '🌿 Udeområder og have',
  homeWhatIdeas: '💡 Find idéer',
  homeWhatIdk: '🤷 Ved ikke',
  homeSpaceLiving: '🛋️ Stuen',
  homeSpaceBedroom: '🛏️ Soveværelset',
  homeSpaceKitchen: '🍳 Køkkenet',
  homeSpaceBath: '🛁 Badeværelset',
  homeSpaceOffice: '💻 Mit kontor',
  homeSpaceIdk: '🤷 Ved ikke',
  homeStyleModern: '🏙️ Moderne',
  homeStyleCozy: '🕯️ Hyggelig',
  homeStyleMinimal: '◻️ Minimalistisk',
  homeStyleBoho: '🌵 Bohemisk',
  homeStyleIdk: '🤷 Overrask mig',
  businessWhatIdea: '💡 Idéer og strategi',
  businessWhatContent: '✨ Lav indhold til mine sociale medier',
  businessWhatSchedule: '📅 Planlæg opslag',
  businessWhatPublish: '🚀 Gør klar til at slå op',
  businessWhatReply: '💬 Svar mine kunder',
  businessWhatAnalyze: '📊 Analysér resultater',
  businessWhatMarketing: '📣 En kampagne eller reklame',
  businessWhatCv: '📄 Mit CV',
  businessWhatDeck: '📽️ En præsentation',
  businessWhatPlan: '🗺️ En plan eller et dokument',
  businessWhatIdk: '🤷 Ved ikke',
  businessToneCasual: '😊 Personlig',
  businessTonePro: '💼 Professionel',
  businessToneIdk: '🤷 Ved ikke',
  travelWhatPlan: '🗺️ Planlæg en rejse',
  travelWhatWhere: '🌎 Ved ikke, hvor jeg skal hen',
  travelWhatDoing: '🍽️ Oplevelser og spisesteder',
  travelWhatMoving: '🧭 Sådan kommer jeg rundt',
  travelVibeRest: '🌴 Afslapning',
  travelVibeDiscover: '🏛️ Nye opdagelser',
  travelVibeFood: '🍽️ God mad',
  travelVibeNature: '🏔️ Natur',
  travelVibeParty: '🎉 Natteliv',
  travelVibeIdk: '🤷 Ved ikke',
  travelDatesIdk: '🤷 Det ved jeg ikke endnu',
  travelInterestCulture: '🏛️ Kultur og historie',
  travelInterestNature: '🏔️ Natur',
  travelInterestFood: '🍽️ Madoplevelser',
  travelInterestRest: '🌴 Afslapning',
  travelInterestParty: '🎉 Natteliv',
  travelInterestIdk: '🤷 Overrask mig',
  travelPaceSlow: '🐢 Roligt, uden stress',
  travelPaceBalanced: '🚶 Afbalanceret',
  travelPaceIntense: '⚡ Intenst, med fuldt program',
  travelPaceIdk: '🤷 Overrask mig',
  brainWhatLearn: '📚 Jeg vil gerne lære noget',
  brainWhatSolve: '🧩 Løs et problem',
  brainWhatPlan: '🗓️ Organiser eller planlæg',
  brainWhatTranslate: '🌐 Oversæt eller opsummer',
  brainWhatIdk: '🤷 Ved ikke, hvor jeg skal starte',
};
