/*
 * FILIPINO — Weë AI: el armazón, la conversación guiada y Weë Brain. Los nombres de las experiencias y de los
 * modelos son marca y no entran aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * VOZ. Weë habla de tú («ka», «mo», «kita»), sin «po», y en primera persona cuando es Weë Brain («Hindi kita
 * siningil», «Dadalhin kita doon»); cuando habla como equipo, «kami» exclusivo («Aabisuhan ka namin»). Las marcas
 * van con su marcador de cosa, nunca con «si/ni» (§ 6): «Ako ang Weë Brain», «Nag-iisip ang Weë Brain…», «Natapos
 * ng {{nombre}}…». Las frases fijas son las del glosario § 11.10, palabra por palabra: «Sabihin sa Weë ang gusto mo.
 * Ang Weë na ang bahala sa AI.», «Ikaw ang pipili ng resulta. Ang Weë ang pipili ng AI.», «Hindi ko pa alam»,
 * «Kuwentuhan mo pa ako…», «Demo mode: walang babayaran.», «Hindi ko ito nagawa nang maayos. Hindi kita siningil.»,
 * «Gawing mas makatotohanan», «Mas kapansin-pansin», «Dati» / «Pagkatapos» («bago» es también «nuevo»), y
 * `brainBetterFit` es la del § 12.
 *
 * PALABRAS. Una creación es «likha» y «Mis creaciones», «Mga likha ko», igual que en el menú y en Weë Studio; los
 * especialistas son «mga espesyalista ng Weë» y el «otro Weë» del saludo de Weë Brain, «ibang espesyalista ng Weë»
 * (como el catálogo). «Crear» es «Gumawa» en los botones (el de crear un proyecto y el del plan); la pregunta
 * grande, «Ano ang gusto mong likhain?» (§ 11.10). Una propuesta (de diseño) es «mungkahi»: «Mungkahi {{numero}}».
 * El espacio de Weë Home es «espasyo» (catálogo). «Muestra» es «sample» y la voz de Weë, «Boses ng Weë». Avisar es
 * «abisuhan» (§ 11.2: «Abisuhan ako»), y «de verdad» —cuando deja de ser demo— «talaga». El trabajo terminado
 * (`jobDone`) es «Tapos na», como `common.done` y el «Listo» del servidor (`servidor/progreso.listo`), para no
 * confundirlo con «Handa nang gawin», el que espera; «Muy pronto», «Malapit na» (§ 11.4).
 *
 * EL DINERO sigue el glosario § 11.9: «Available na Credits», «Halaga: …» (coste = halaga), «pansubok na presyo»,
 * «Mag-top up», «Kumuha ng Credits», «Kulang ang Credits mo», «May {{saldo}} Credits ka», «Gumamit ka ng {{credits}}
 * Credits», «Wala kang nagastos na Credits». `creditsNote` y `eachChangeRecreates` no repiten «Credits» porque el
 * español no lo escribe y la marca no se añade donde el original no la tiene (lo vigila la suite): lo que se
 * descuenta es «ang halaga», la cantidad («Ibabawas ang halaga kapag tapos na. Kung may pumalya, ibabalik ito.»),
 * que se lee justo debajo de «≈ 12 Credits». «Te quedan {{saldo}}» es «may natitira kang {{saldo}}» (la cifra al
 * final, sin enlace, § 8.3 regla 7).
 * «Unos {{usd}} USD» es «mga {{usd}} USD»: «mga» delante de una cifra es «aproximadamente», y detrás nunca se pone.
 * «Enviar por {{credits}} Credits» es «Ipadala sa halagang {{credits}} Credits».
 *
 * EL BUSCADOR. `trySearchWords` sugiere palabras que el buscador de experiencias de verdad encuentra: las mismas
 * nueve del español, dichas como las escribiría alguien en Filipinas y presentes en la lista `fil` de
 * `PALABRAS_POR_IDIOMA` (constants/weeExperiences.ts) o en las palabras clave comunes: logo, video, larawan, text,
 * kanta, look, recipe, bahay y negosyo.
 *
 * FECHAS Y PLURALES. Las fechas las escribe Intl («Oktubre 12, 2026», el día suelto «12», el mes con su año «Oktubre
 * 2026»); el filipino las ordena con «sa» para un día (agenda, § 8.1) y «mula … hanggang …» para un tramo, como el
 * catálogo: «mula 12 hanggang 18 ng Oktubre 2026». Plurales (§ 8.3): «{{contador}} araw» / «{{contador}} na araw»,
 * «gabi», «larawan», y en `openTravel`/`closeTravel` el enlace va tras la cifra («ang {{contador}} na paraan»); el
 * `_one` lleva `{{contador}}` aunque el español no lo escriba, porque `one` sale también para 2, 3, 5… Los segundos
 * usan la unidad corta de Intl, «seg.» (§ 8.1), y el `%` va pegado.
 *
 * Piezas que se pegan a otras en pantalla y conservan su borde: `testPriceSuffix` va detrás de «≈ 12 Credits»;
 * `youSpent` y `spentNothing`, detrás de `finishedGoal`; `testPriceParenthesis` entra en {{nota}} y
 * `regeneratePriceSuffix` en {{precio}}, pegados como en español. `emojiLabel` lleva dos puntos («Emoji: …»), como en
 * projects.
 */
export const weeai: typeof import('../es/weeai').weeai = {
  searchInWee: 'Maghanap sa Weë…',
  searchLabel: 'Maghanap sa Weë',
  myProfile: 'Profile ko',
  notifications: 'Mga notification',
  goHome: 'Bumalik sa Home',
  myProjects: 'Mga proyekto ko',
  myCreations: 'Mga likha ko',
  buyCredits: 'Bumili ng Credits →',
  yourCredits: 'Credits mo',
  topUp: 'Mag-top up',
  theSpecialists: 'Mga espesyalista ng Weë',
  availableToday: 'Available ngayon',
  start: 'Magsimula',
  whatDoYouWant: 'Gusto ko ng magandang video para i-promote ang restaurant ko…',
  describeYourIdea: 'Ilarawan ang ideya mo',
  tellWee: 'Sabihin sa Weë ang gusto mo. Ang Weë na ang bahala sa AI.',
  avatarForWeeProfile: 'AI avatar para sa Weë profile mo',
  createAlterEgo: 'Gumawa ng sarili mong digital alter ego at i-generate ang avatar nito gamit ang AI.',
  changeAlterEgo: 'I-generate o palitan ang avatar ng alter ego mo gamit ang AI.',
  notYetOurs: 'Hindi pa namin alam kung sino ang bahala diyan',
  thatIsFor: 'Ito ang makakatulong diyan',
  notifyMe: 'Abisuhan ako kapag handa na',
  notifyMeReal: 'Abisuhan ako kapag handa na talaga',
  stopNotifying: 'Huwag na akong abisuhan',
  couldNotSave: 'Hindi ma-save',
  tryAgainInAMoment: 'Subukan ulit maya-maya.',
  clear: 'I-clear',
  comingVerySoon: 'Malapit na',
  oneMoment: 'Sandali lang…',
  send: 'Ipadala',
  sendIdea: 'Ipadala ang ideya',
  uploadYourPhoto: 'I-upload ang larawang gagamitin natin',
  uploadHint: 'Mula sa gallery mo o gamit ang camera',
  uploadFormats: 'JPG, PNG o WEBP (hanggang 10 MB)',
  uploadingPhoto: 'Ina-upload ang larawan mo…',
  photoReady: 'Handa na ang larawan mo. Sabihin mo kung ano ang gagawin natin dito.',
  photoHelps: 'Makakatulong ang larawan para mapanatili ko ang totoong ayos ng lugar.',
  uploadToWork: 'Mag-upload ng larawan para magamit ito ng Weë.',
  pickFromPhotos: 'Pumili mula sa mga larawan ko',
  orAlso: 'O puwede ka ring',
  takeAPhoto: 'Kumuha ng larawan',
  changePhoto: 'Palitan ang larawan',
  removePhoto: 'Alisin ang larawan',
  photoAttached: 'Naka-attach ang larawan',
  couldNotPickPhoto: 'Hindi mapili ang larawan',
  couldNotAttach: 'Hindi ma-attach',
  preferWords: 'Mas gusto kong ilarawan ito sa salita',
  change: 'Palitan',
  remove: 'Alisin',
  tryAgain: 'Subukan ulit',
  itDidNotWork: 'Hindi ko ito nagawa nang maayos. Hindi kita siningil.',
  notEnoughCredits: 'Kulang ang Credits mo',
  getCredits: 'Kumuha ng Credits',
  calculatingCost: 'Kinakalkula ang halaga…',
  couldNotCalculate: 'Hindi makalkula ang halaga',
  quality: 'Kalidad',
  create: 'Gumawa',
  changeSomething: 'May gusto akong baguhin',
  noCost: 'Walang bayad',
  demoMode: 'Demo mode: walang babayaran.',
  creditsNote: 'Ibabawas ang halaga kapag tapos na. Kung may pumalya, ibabalik ito.',
  brainThinking: 'Nag-iisip ang Weë Brain…',
  brainSearching: 'Naghahanap ang Weë Brain…',
  keepTelling: 'Kuwentuhan mo pa ako…',
  searchInternet: 'Maghanap sa internet',
  previewDemo: 'Preview · demo',
  savedIn: 'Na-save sa {{proyecto}}',
  saveToProject: 'I-save sa isang proyekto',
  newProject: 'Bagong proyekto',
  projectName: 'Pangalan ng proyekto',
  createProject: 'Gumawa ng proyekto',
  close: 'Isara',
  choose: 'Pumili',
  play: 'I-play',
  pause: 'I-pause',
  playing: 'Nagpe-play',
  playingPreview: 'Nagpe-play · preview',
  hideChanges: 'Itago ang listahan ng mga pagbabago at bibilhin',
  makeItRealistic: 'Gawing mas makatotohanan',
  changeItsColor: 'Palitan ang kulay nito',
  moreStriking: 'Mas kapansin-pansin',
  simpler: 'Mas simple',
  before: 'Dati',
  after: 'Pagkatapos',
  couldNotLoadCreations: 'Hindi ma-load ang mga likha mo',
  couldNotLoadProjects: 'Hindi ma-load ang mga proyekto',
  couldNotCreateProject: 'Hindi magawa ang proyekto',
  couldNotSaveToProject: 'Hindi ko ito ma-save sa proyekto. Subukan ulit.',
  seeMore: 'Tingnan pa',
  seeAllCreations: 'Tingnan lahat',
  demo: 'demo',
  jobAsking: 'Kulang pa ang sagot',
  jobPlanned: 'Handa nang gawin',
  jobRunning: 'Ginagawa…',
  jobDone: 'Tapos na',
  jobFailed: 'Hindi natuloy',
  jobCancelled: 'Kinansela',
  brainGreeting: 'Kumusta! Ako ang Weë Brain. Magtanong, magkuwento, o sabihin lang sa akin ang kailangan mo. Kung mas magaling dito ang ibang espesyalista ng Weë, dadalhin kita doon.',
  brainBetterFit: 'Mas makakatulong sa iyo dito ang {{emoji}} {{especialista}}. Dadalhin kita doon kasama ang mga nasabi mo na, o dito na lang tayo.',
  goToSpecialist: 'Pumunta sa {{especialista}}',
  stayHere: 'Dito na lang',
  creditsAndCost: 'Available na Credits: {{saldo}} · Halaga: {{costo}}',
  sendForCredits: 'Ipadala sa halagang {{credits}} Credits',
  writeToKnowCost: 'Isulat ang mensahe mo at sasabihin ko kung magkano ito bago mo ipadala.',
  approxUsd: 'mga {{usd}} USD',
  creditsLeft: 'may natitira kang {{saldo}}',
  attach: 'I-attach',

  /* ── LO QUE CUESTA, EN PALABRAS ─────────────────────────────────────────
   * Las cifras ya las escribe el formato de Weë con el locale activo;
   * aquí solo está el texto que las acompaña.
   */
  creditsAvailable: 'Available na Credits: {{saldo}}',
  costLine: 'Halaga: {{coste}}',
  youHaveLeft: 'may natitira kang {{saldo}}',
  testPriceSuffix: ' · pansubok na presyo',
  testPriceParenthesis: ' (pansubok na presyo)',
  youSpent: ' Gumamit ka ng {{credits}} Credits{{nota}}.',
  spentNothing: ' Wala kang nagastos na Credits.',
  calculatingTheCost: 'Kinakalkula ang halaga…',
  costFailed: 'Hindi namin makalkula ang halaga. Subukan ulit.',
  avatarCost: 'Weë avatar · {{credits}} Credits{{saldo}}',
  /* Lo que Weë Brain dice que va a hacer, que llega desde el servidor. */
  quoteSearch: 'Paghahanap na may mga source',
  quoteBrain: 'Sagot ng Weë Brain',
  speak: 'Magsalita',
  speakComingSoon: 'Sa susunod na bersyon, puwede mo nang kausapin ang Weë. Sa ngayon, isulat mo muna ito.',
  searchInternetOn: 'Maghanap sa internet: naka-on',
  newConversation: 'Bagong chat',
  couldNotCalculateRetry: 'Hindi namin makalkula ang halaga. Subukan ulit.',
  expandSection: '{{titulo}}. Ipakita ang {{contenido}}',
  collapseSection: '{{titulo}}. Itago ang {{contenido}}',
  openTravel_one: '{{titulo}}. Buksan ang Weë Travel: ang pagsulat ng biyahe mo at ang {{contador}} paraan para magsimula',
  openTravel_other: '{{titulo}}. Buksan ang Weë Travel: ang pagsulat ng biyahe mo at ang {{contador}} na paraan para magsimula',
  closeTravel_one: '{{titulo}}. Itago ang Weë Travel: ang pagsulat ng biyahe mo at ang {{contador}} paraan para magsimula',
  closeTravel_other: '{{titulo}}. Itago ang Weë Travel: ang pagsulat ng biyahe mo at ang {{contador}} na paraan para magsimula',
  tellWeeTheTrip: 'Ikuwento ang biyahe sa Weë',
  theMotto: 'Ikaw ang pipili ng resulta. Ang Weë ang pipili ng AI.',
  trySearchWords: 'Subukan ang mga salitang tulad ng logo, video, larawan, text, kanta, look, recipe, bahay o negosyo. O magtanong sa Weë Brain.',
  whatToCreate: 'Ano ang gusto mong likhain?',
  willNotifyYou: '✓ Aabisuhan ka namin kapag handa na talaga',
  projectsNote: 'Pagsama-samahin ang mga likha mo sa iisang lugar: logo, larawan, video, musika at dokumento.',
  errNotEnoughCredits: 'Kulang ang Credits mo para sa likhang ito. Kumuha ng Credits at subukan ulit.',
  errRateLimited: 'Marami kang nagawang likha nang sunod-sunod. Maghintay sandali at subukan ulit.',
  errTimeout: 'Masyadong natagalan kaya itinigil ko ito. Hindi kita siningil. Subukan ulit.',
  errDuplicate: 'Ginagawa na ang likhang iyan.',
  errNoAccount: 'Tapusin muna ang profile mo para magamit ang Weë AI.',
  errSignIn: 'Mag-sign in para makagawa gamit ang Weë.',
  errOffline: 'Hindi ako makakonekta sa Weë AI. Tingnan ang koneksyon mo at subukan ulit.',
  errGeneric: 'Hindi ko ito nagawa nang maayos. Subukan natin ulit? Hindi kita siningil.',
  dayExpand: '{{titulo}}. I-tap para makita ang araw',
  dayCollapse: '{{titulo}}. I-tap para isara',
  pathRedesign: '🏠 Baguhin ang buong disenyo',
  pathColors: '🎨 Palitan ang istilo at kulay',
  pathFurniture: '🪑 Ayusin ang muwebles',
  sidebarTagline: 'Mas mabuting ikaw,\nsa mundong\nmas malikhain',
  youHaveCredits: 'May {{saldo}} Credits ka',
  creditsBoxNote: 'Gumagamit ng Credits ang mga espesyalista ng Weë. Mag-top up kahit kailan mo gusto.',
  startWith: 'Magsimula sa {{nombre}}',
  previousMonth: 'Nakaraang buwan',
  nextMonth: 'Susunod na buwan',
  dontKnowYet: 'Hindi ko pa alam',
  confirmDates: 'Kumpirmahin ang mga petsa',
  optionCredits: '{{nombre}}, {{credits}} Credits',
  emojiLabel: 'Emoji: {{emoji}}',
  chooseProposal: 'Piliin ang mungkahi {{numero}}',
  generatedVideo: 'Na-generate na video',
  playVideo: 'I-play ang video',
  continueVia: 'Magpatuloy sa: {{camino}}',
  youChooseWeeChooses: 'Ikaw ang pipili ng resulta. Ang Weë ang pipili ng AI.',
  demoToday: 'Naka-demo mode ngayon: makikita mo kung paano ito gumagana nang hindi gumagastos ng Credits.',
  titleWithDetail: '{{titulo}}. {{detalle}}',
  inferredAnswer: '{{respuesta}} · nakuha ko ito sa isinulat mo',
  goalWithChange: '{{objetivo}} · Pagbabago: {{cambio}}',
  uploadDishPhoto: 'Mag-upload ng larawan ng natapos mong luto',
  uploadIngredientsPhoto: 'Mag-upload ng larawan ng ref mo o ng mga sangkap na mayroon ka',
  uploadingYourSpace: 'Ina-upload ang larawan ng espasyo mo…',
  yourSpace: 'Ang espasyo mo',
  finishedGoal: 'Natapos ng {{nombre}} ang “{{objetivo}}”.',
  chosenProposal: '✓ Napili · Mungkahi {{numero}}',
  proposalNumber: 'Mungkahi {{numero}}',
  sample: 'sample',
  weeVoice: 'Boses ng Weë',
  weeVoiceDuration: '{{duracion}} · boses ng Weë',
  previewWithDuration: '{{duracion}} · preview',
  regeneratePriceSuffix: ' · ≈ {{credits}} Credits',
  anotherVersion: 'Gumawa ng isa pang bersyon{{precio}}',
  eachChangeRecreates: 'Gagawin ulit ang likha sa bawat pagbabago{{precio}}. Ibabawas ang halaga kapag tapos na.',
  showChanges: 'Ipakita ang listahan ng mga pagbabago at bibilhin',
  nameThinking: 'Nag-iisip ang {{nombre}}…',
  tapDepartureDay: 'I-tap ang araw ng pag-alis mo.',
  tapReturnDay: 'Ngayon, i-tap ang araw ng pagbalik mo.',
  tripOneDay: 'sa {{fecha}}',
  tripSameMonth: 'mula {{dia}} hanggang {{diaFinal}} ng {{mesYAnio}}',
  tripRange: 'mula {{salida}} hanggang {{regreso}}',
  tripDays_one: '{{contador}} araw',
  tripDays_other: '{{contador}} na araw',
  tripNights_one: '{{contador}} gabi',
  tripNights_other: '{{contador}} na gabi',
  tripDuration: '{{dias}} · {{noches}}',
  tripSummary: '{{fechas}} · {{duracion}}',
  imageCount_one: '{{contador}} larawan',
  imageCount_other: '{{contador}} na larawan',
  durationSeconds: '{{segundos}} seg.',
  volumeDiscount: '−{{descuento}}% dahil sa dami',
  createWork: 'Gumawa',
};
