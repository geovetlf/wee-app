/*
 * DANÉS — WEË AI: el armazón, la conversación guiada y Weë Brain. Los nombres
 * de las experiencias y de los modelos son marca y no entran aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los especialistas son «specialister» y los de Weë AI, «Weë-specialister»
 * (glosario § 9.4); «Los especialistas de Weë» es «Weë-specialisterne», con la
 * forma definida en el sustantivo del compuesto y nunca en la marca. El «otro
 * Weë» del saludo de Weë Brain es «en anden Weë-specialist». Una creación es
 * «kreation» y «Mis creaciones», «Mine kreationer» (§ 9.1).
 *
 * «Crear» (`create`) es «Opret»: el mismo botón crea un proyecto (ProjectPicker,
 * ProjectsScreen) y arranca el plan (PlanCard), así que va el verbo de los
 * objetos; la pregunta grande, «¿Qué quieres crear?», es «Hvad vil du lave?»
 * (§ 9.1: «Lav» para obras). El estado de un trabajo en marcha es «Genererer…».
 *
 * El dinero sigue la fila «Credits y dinero» del glosario: «Recargar» es «Tank
 * op», el costo «pris», el precio de prueba «testpris», el cobro «trække» y el
 * reembolso «få tilbage». «No te cobré» es «Der er ikke trukket nogen
 * Credits»: en pasiva, sin que Weë hable del cobro en primera persona. «Te
 * quedan {{saldo}}» es «du har {{saldo}} Credits tilbage» en `creditsLeft` y
 * en `youHaveLeft` (misma frase española, misma danesa); la palabra Credits se
 * añade porque en Weë Brain va detrás de «11 af 12 svar tilbage». `creditsAndCost`
 * solo sale cuando el saldo no alcanza, así que es una frase con «men» («Du har 3
 * Credits, men det koster 5 Credits»), con la palabra Credits en las dos cifras
 * para que nadie lea coronas; como dos rótulos («… · Pris: …») sería inglés.
 *
 * El lema no declina la sigla («AI'en»): «Du vælger resultatet. Weë vælger den
 * rette AI.» `demo` es «demotilstand», como «testtilstand» del glosario (§ 9.6);
 * «demo» a secas sería el español y el inglés. «Tu espacio» (Weë Home) es «dit
 * rum»: la foto es de una habitación. «Avísame cuando esté de verdad» habla de
 * la experiencia (en oplevelse → «den») y «de verdad» es «for alvor».
 *
 * Las fechas del viaje las escribe Intl («30. september 2026», el día suelto
 * «12.»); el danés las pone en la frase con «den» y el tramo con «fra … til …»,
 * que el lector de pantalla lee mejor que un guion (borger.dk): «fra den 12.
 * til den 18. oktober 2026». Plurales: «1 dag / 3 dage», «1 nat / 3 nætter»,
 * «1 billede / 3 billeder». El % lleva delante un espacio fijo (U+00A0).
 *
 * `trySearchWords` sugiere palabras para el buscador, y el buscador solo
 * conoce las palabras clave españolas de constants/weeExperiences.ts y los
 * nombres de marca. Por eso la lista danesa son préstamos que el danés usa y
 * que el buscador encuentra (logo, video, foto, blog, podcast, look, menu,
 * hotel, marketing: una por experiencia); «tekst», «sang», «opskrift», «hjem»
 * o «virksomhed» no encontrarían nada.
 *
 * Piezas que se pegan a otras en pantalla y conservan su borde:
 * `testPriceSuffix` va detrás de «≈ 12 Credits»; `youSpent` y `spentNothing`,
 * detrás de `finishedGoal`; `testPriceParenthesis` entra en {{nota}} y
 * `regeneratePriceSuffix` en {{precio}}, pegados como en español.
 */
export const weeai: typeof import('../es/weeai').weeai = {
  searchInWee: 'Søg på Weë…',
  searchLabel: 'Søg på Weë',
  myProfile: 'Min profil',
  notifications: 'Notifikationer',
  goHome: 'Gå til forsiden',
  myProjects: 'Mine projekter',
  myCreations: 'Mine kreationer',
  buyCredits: 'Køb Credits →',
  yourCredits: 'Dine Credits',
  topUp: 'Tank op',
  theSpecialists: 'Weë-specialisterne',
  availableToday: 'Tilgængeligt i dag',
  start: 'Kom i gang',
  whatDoYouWant: 'Jeg vil gerne have en flot video, der reklamerer for min restaurant…',
  describeYourIdea: 'Beskriv din idé',
  tellWee: 'Fortæl Weë, hvad du gerne vil. Weë klarer AI-delen.',
  avatarForWeeProfile: 'AI-avatar til din Weë-profil',
  createAlterEgo: 'Skab dit digitale alter ego, og giv det en avatar med AI.',
  changeAlterEgo: 'Generér eller skift avataren til dit alter ego med AI.',
  notYetOurs: 'Vi ved endnu ikke, hvem der kan hjælpe dig med det',
  thatIsFor: 'Her kan du få hjælp til det',
  notifyMe: 'Giv mig besked, når den er klar',
  notifyMeReal: 'Giv mig besked, når den er helt klar',
  stopNotifying: 'Stop med at give mig besked',
  couldNotSave: 'Det kunne ikke gemmes',
  tryAgainInAMoment: 'Prøv igen om et øjeblik.',
  clear: 'Ryd',
  comingVerySoon: 'Kommer meget snart',
  oneMoment: 'Et øjeblik…',
  send: 'Send',
  sendIdea: 'Send idé',
  uploadYourPhoto: 'Upload det foto, du vil arbejde med',
  uploadHint: 'Fra dit galleri eller med kameraet',
  uploadFormats: 'JPG, PNG eller WEBP (maks. 10 MB)',
  uploadingPhoto: 'Uploader dit foto…',
  photoReady: 'Dit foto er klar. Fortæl mig, hvad vi skal gøre med det.',
  photoHelps: 'Med et foto kan jeg bevare, hvordan stedet rent faktisk ser ud.',
  uploadToWork: 'Upload et foto, så Weë kan arbejde med det.',
  pickFromPhotos: 'Vælg blandt mine fotos',
  orAlso: 'Eller du kan også',
  takeAPhoto: 'Tag et foto',
  changePhoto: 'Skift foto',
  removePhoto: 'Fjern foto',
  photoAttached: 'Foto vedhæftet',
  couldNotPickPhoto: 'Fotoet kunne ikke vælges',
  couldNotAttach: 'Det kunne ikke vedhæftes',
  preferWords: 'Jeg vil hellere beskrive det med ord',
  change: 'Skift',
  remove: 'Fjern',
  tryAgain: 'Prøv igen',
  itDidNotWork: 'Det lykkedes ikke. Der er ikke trukket nogen Credits.',
  notEnoughCredits: 'Du har ikke nok Credits',
  getCredits: 'Få Credits',
  calculatingCost: 'Beregner prisen…',
  couldNotCalculate: 'Prisen kunne ikke beregnes',
  quality: 'Kvalitet',
  create: 'Opret',
  changeSomething: 'Ret noget',
  noCost: 'Gratis',
  demoMode: 'Demotilstand: Du skal ikke betale noget.',
  creditsNote: 'Credits trækkes først, når det er færdigt. Hvis noget går galt, får du dem tilbage.',
  brainThinking: 'Weë Brain tænker…',
  brainSearching: 'Weë Brain søger…',
  keepTelling: 'Fortæl mere…',
  searchInternet: 'Søg på internettet',
  previewDemo: 'Forhåndsvisning · demo',
  savedIn: 'Gemt i {{proyecto}}',
  saveToProject: 'Gem i et projekt',
  newProject: 'Nyt projekt',
  projectName: 'Projektnavn',
  createProject: 'Opret projekt',
  close: 'Luk',
  choose: 'Vælg',
  play: 'Afspil',
  pause: 'Sæt på pause',
  playing: 'Afspiller',
  playingPreview: 'Afspiller · forhåndsvisning',
  hideChanges: 'Skjul listen over ændringer og indkøb',
  makeItRealistic: 'Gør det mere realistisk',
  changeItsColor: 'Skift farven',
  moreStriking: 'Mere iøjnefaldende',
  simpler: 'Enklere',
  before: 'Før',
  after: 'Efter',
  couldNotLoadCreations: 'Dine kreationer kunne ikke indlæses',
  couldNotLoadProjects: 'Projekterne kunne ikke indlæses',
  couldNotCreateProject: 'Projektet kunne ikke oprettes',
  couldNotSaveToProject: 'Jeg kunne ikke gemme i projektet. Prøv igen.',
  seeMore: 'Vis mere',
  seeAllCreations: 'Se alle',
  demo: 'demotilstand',
  jobAsking: 'Mangler svar',
  jobPlanned: 'Klar til at gå i gang',
  jobRunning: 'Genererer…',
  jobDone: 'Færdig',
  jobFailed: 'Mislykkedes',
  jobCancelled: 'Annulleret',
  brainGreeting: 'Hej! Jeg er Weë Brain. Spørg mig, fortæl mig noget, eller bed om det, du har brug for. Hvis en anden Weë-specialist er bedre til det, tager jeg dig derhen.',
  brainBetterFit: '{{emoji}} {{especialista}} kan hjælpe dig bedre med det her. Jeg kan tage dig derhen med det, du allerede har fortalt, eller vi kan fortsætte her.',
  goToSpecialist: 'Gå til {{especialista}}',
  stayHere: 'Bliv her',
  creditsAndCost: 'Du har {{saldo}} Credits, men det koster {{costo}} Credits',
  sendForCredits: 'Send for {{credits}} Credits',
  writeToKnowCost: 'Skriv din besked, så fortæller jeg dig, hvad den koster, før du sender den.',
  approxUsd: 'ca. {{usd}} USD',
  creditsLeft: 'du har {{saldo}} Credits tilbage',
  attach: 'Vedhæft',

  /* ── LO QUE CUESTA, EN PALABRAS ─────────────────────────────────────────
   * Las cifras ya las escribe el formato de Weë con el locale activo;
   * aquí solo está el texto que las acompaña.
   */
  creditsAvailable: 'Tilgængelige Credits: {{saldo}}',
  costLine: 'Pris: {{coste}}',
  youHaveLeft: 'du har {{saldo}} Credits tilbage',
  testPriceSuffix: ' · testpris',
  testPriceParenthesis: ' (testpris)',
  youSpent: ' Du brugte {{credits}} Credits{{nota}}.',
  spentNothing: ' Du brugte ingen Credits.',
  calculatingTheCost: 'Beregner prisen…',
  costFailed: 'Vi kunne ikke beregne prisen. Prøv igen.',
  avatarCost: 'Weë-avatar · {{credits}} Credits{{saldo}}',
  /* Lo que Weë Brain dice que va a hacer, que llega desde el servidor. */
  quoteSearch: 'Søgning med kilder',
  quoteBrain: 'Svar fra Weë Brain',
  speak: 'Tal',
  speakComingSoon: 'Muligheden for at tale med Weë kommer i en senere version. Indtil videre kan du skrive det.',
  searchInternetOn: 'Søg på internettet: slået til',
  newConversation: 'Ny samtale',
  couldNotCalculateRetry: 'Vi kunne ikke beregne prisen. Prøv igen.',
  expandSection: '{{titulo}}. Vis {{contenido}}',
  collapseSection: '{{titulo}}. Skjul {{contenido}}',
  openTravel_one: '{{titulo}}. Åbn Weë Travel: feltet til din rejse og måden at komme i gang på',
  openTravel_other: '{{titulo}}. Åbn Weë Travel: feltet til din rejse og de {{contador}} måder at komme i gang på',
  closeTravel_one: '{{titulo}}. Skjul Weë Travel: feltet til din rejse og måden at komme i gang på',
  closeTravel_other: '{{titulo}}. Skjul Weë Travel: feltet til din rejse og de {{contador}} måder at komme i gang på',
  tellWeeTheTrip: 'Fortæl Weë om rejsen',
  theMotto: 'Du vælger resultatet. Weë vælger den rette AI.',
  trySearchWords: 'Prøv med ord som logo, video, foto, blog, podcast, look, menu, hotel eller marketing. Eller spørg Weë Brain.',
  whatToCreate: 'Hvad vil du lave?',
  willNotifyYou: '✓ Vi giver dig besked, når den er helt klar',
  projectsNote: 'Saml dine kreationer på ét sted: logo, fotos, videoer, musik og dokumenter.',
  errNotEnoughCredits: 'Du har ikke nok Credits til denne opgave. Få flere Credits, og prøv igen.',
  errRateLimited: 'Du har lavet mange kreationer i træk. Vent et øjeblik, og prøv igen.',
  errTimeout: 'Det tog for lang tid, så jeg stoppede det. Der er ikke trukket nogen Credits. Prøv igen.',
  errDuplicate: 'Den kreation er allerede i gang.',
  errNoAccount: 'Gør din profil færdig, så du kan bruge Weë AI.',
  errSignIn: 'Log ind for at skabe med Weë.',
  errOffline: 'Jeg kunne ikke få forbindelse til Weë AI. Tjek din forbindelse, og prøv igen.',
  errGeneric: 'Det lykkedes ikke. Skal vi prøve igen? Der er ikke trukket nogen Credits.',
  dayExpand: '{{titulo}}. Tryk for at se dagen',
  dayCollapse: '{{titulo}}. Tryk for at folde sammen',
  pathRedesign: '🏠 Indret det helt på ny',
  pathColors: '🎨 Skift stil og farver',
  pathFurniture: '🪑 Arbejd med møblerne',
  sidebarTagline: 'Et bedre dig,\ni en mere\nkreativ verden',
  youHaveCredits: 'Du har {{saldo}} Credits',
  creditsBoxNote: 'Weë-specialisterne bruger Credits. Tank op, når du vil.',
  startWith: 'Kom i gang med {{nombre}}',
  previousMonth: 'Forrige måned',
  nextMonth: 'Næste måned',
  dontKnowYet: 'Det ved jeg ikke endnu',
  confirmDates: 'Bekræft datoerne',
  optionCredits: '{{nombre}}, {{credits}} Credits',
  emojiLabel: 'Emoji {{emoji}}',
  chooseProposal: 'Vælg forslag {{numero}}',
  generatedVideo: 'Genereret video',
  playVideo: 'Afspil video',
  continueVia: 'Fortsæt med: {{camino}}',
  youChooseWeeChooses: 'Du vælger resultatet. Weë vælger den rette AI.',
  demoToday: 'Lige nu i demotilstand: Du kan se, hvordan det virker, uden at bruge Credits.',
  titleWithDetail: '{{titulo}}. {{detalle}}',
  inferredAnswer: '{{respuesta}} · det forstod jeg ud fra det, du skrev',
  goalWithChange: '{{objetivo}} · Ændring: {{cambio}}',
  uploadDishPhoto: 'Upload et foto af din færdige ret',
  uploadIngredientsPhoto: 'Upload et foto af dit køleskab eller de ingredienser, du har',
  uploadingYourSpace: 'Uploader dit rum…',
  yourSpace: 'Dit rum',
  finishedGoal: '{{nombre}} er færdig med ”{{objetivo}}”.',
  chosenProposal: '✓ Forslag {{numero}} er valgt',
  proposalNumber: 'Forslag {{numero}}',
  sample: 'eksempel',
  weeVoice: 'Weë-stemme',
  weeVoiceDuration: '{{duracion}} · Weë-stemme',
  previewWithDuration: '{{duracion}} · forhåndsvisning',
  regeneratePriceSuffix: ' · ≈ {{credits}} Credits',
  anotherVersion: 'Lav en ny version{{precio}}',
  eachChangeRecreates: 'Hver ændring laver resultatet forfra{{precio}}. Credits trækkes først, når det er færdigt.',
  showChanges: 'Vis listen over ændringer og indkøb',
  nameThinking: '{{nombre}} tænker…',
  tapDepartureDay: 'Tryk på afrejsedagen.',
  tapReturnDay: 'Tryk nu på hjemrejsedagen.',
  tripOneDay: 'den {{fecha}}',
  tripSameMonth: 'fra den {{dia}} til den {{diaFinal}} {{mesYAnio}}',
  tripRange: 'fra den {{salida}} til den {{regreso}}',
  tripDays_one: '{{contador}} dag',
  tripDays_other: '{{contador}} dage',
  tripNights_one: '{{contador}} nat',
  tripNights_other: '{{contador}} nætter',
  tripDuration: '{{dias}} · {{noches}}',
  tripSummary: '{{fechas}} · {{duracion}}',
  imageCount_one: '{{contador}} billede',
  imageCount_other: '{{contador}} billeder',
  durationSeconds: '{{segundos}} s',
  volumeDiscount: '−{{descuento}} % mængderabat',
};
