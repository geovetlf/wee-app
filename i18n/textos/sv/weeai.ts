/*
 * SUECO — WEË AI: el armazón, la conversación guiada y Weë Brain. Los nombres
 * de las experiencias y de los modelos son marca y no entran aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Tú eliges el resultado. Weë elige la IA.»: aquí no se nombra ningún modelo
 * ni proveedor. «La IA» sería «AI:n», y la guía pide no declinar la
 * abreviatura en la interfaz (§ 3): el lema es «Du väljer resultatet. Weë
 * väljer rätt AI.» y «Weë se encarga de la IA», «Weë tar hand om AI-delen».
 *
 * Los especialistas son «experter» y los de Weë AI, «Weë-experter» (glosario
 * § 9.4): «Los especialistas de Weë» es «Weë-experterna», con la forma
 * definida en el sustantivo del compuesto, nunca en la marca. El «otro Weë»
 * del saludo de Weë Brain es «en annan Weë-expert». «Mis creaciones» es
 * «Mina skapelser» (término que no está en el glosario).
 *
 * El dinero: «Recargar» es «Fyll på», el verbo de las recargas de saldo; el
 * costo, «kostnad»; el precio de prueba, «testpris». «No te cobré» es «Inga
 * Credits har dragits»: «dra» es el verbo sueco del cargo («pengarna drogs»),
 * y en pasiva se entiende sin que Weë tenga que hablar del cobro en primera
 * persona. Lo que se enseña ANTES de crear nunca dice que ya se cobró: «Du
 * använde» solo sale en `youSpent`, cuando el cargo ya se hizo. «Te quedan {{saldo}}»
 * es «du har {{saldo}} Credits kvar»: en la línea de Weë Brain va detrás de
 * «11 av 12 svar kvar» (`brain.blockLeft`) y sin la palabra Credits las dos
 * cosas que quedan se confundirían. Es lo único añadido al español, y es la
 * marca. `creditsAndCost` es una frase («Du har 3 Credits och det här kostar
 * 5»): como rótulos, «Tillgängliga Credits · Kostnad» pondría dos palabras en
 * mayúscula, que en sueco se lee como un título a la inglesa.
 *
 * Piezas que se pegan a otras en pantalla y conservan su borde:
 * `testPriceSuffix` va detrás de «≈ 12 Credits»; `youSpent` y `spentNothing`,
 * detrás de `finishedGoal`; `testPriceParenthesis` entra en {{nota}} y
 * `regeneratePriceSuffix` en {{precio}}, pegados como en español.
 *
 * Las fechas del viaje las escribe Intl («30 september 2026», «oktober 2026»)
 * y en una etiqueta el sueco no les pone artículo: un día es «{{fecha}}», un
 * tramo del mismo mes «12–18 oktober 2026» (raya media sin espacios, § 5) y
 * dos meses distintos «30 september 2026 – 5 oktober 2026» (con espacios,
 * porque los extremos tienen varias palabras). El plural sí cambia: «1 dag /
 * 3 dagar», «1 natt / 3 nätter», «1 bild / 3 bilder». El % lleva delante un
 * espacio fijo (U+00A0): «−15 % mängdrabatt».
 *
 * Tras dos puntos va minúscula si sigue una lista o una explicación, y
 * mayúscula si sigue una frase completa (§ 5): «Just nu i demoläge: Du ser…».
 *
 * `demo` es «demoläge»: «demo» a secas sería la misma cadena que en español y
 * en inglés. «Tu espacio» (Weë Home) es «ditt rum», como en el catálogo (la foto es de una habitación).
 * La propuesta elegida es «✓ Förslag 2 valt», al lado de las otras
 * («Förslag 3»). Las frases de cambio rápido (`makeItRealistic`…) viajan como
 * petición a Weë Brain, así que son órdenes completas y cortas.
 *
 * El logo es «logga», como en el resto del sueco de Weë (`creator`,
 * `projects`). La excepción es `trySearchWords`: sugiere palabras para el
 * buscador, y las palabras clave de las experiencias solo existen en español
 * (constants/weeExperiences.ts). «Logo» también es sueco y encuentra Weë
 * Design; «logga» no. Hoy solo «logo», «video», «foto», «text» y «look»
 * encuentran algo; «låt», «recept», «hem» y «företag», no.
 */
export const weeai: typeof import('../es/weeai').weeai = {
  searchInWee: 'Sök på Weë…',
  searchLabel: 'Sök på Weë',
  myProfile: 'Min profil',
  notifications: 'Aviseringar',
  goHome: 'Gå till startsidan',
  myProjects: 'Mina projekt',
  myCreations: 'Mina skapelser',
  buyCredits: 'Köp Credits →',
  yourCredits: 'Dina Credits',
  topUp: 'Fyll på',
  theSpecialists: 'Weë-experterna',
  availableToday: 'Tillgängligt i dag',
  start: 'Börja',
  whatDoYouWant: 'Jag vill ha en snygg video som marknadsför min restaurang…',
  describeYourIdea: 'Beskriv din idé',
  tellWee: 'Berätta för Weë vad du vill ha. Weë tar hand om AI-delen.',
  avatarForWeeProfile: 'AI-avatar för din Weë-profil',
  createAlterEgo: 'Skapa ditt digitala alter ego och ge det en avatar med AI.',
  changeAlterEgo: 'Generera eller byt avatar för ditt alter ego med AI.',
  notYetOurs: 'Vi vet inte än vem som kan hjälpa dig med det',
  thatIsFor: 'Här får du hjälp med det',
  notifyMe: 'Meddela mig när det är klart',
  notifyMeReal: 'Meddela mig när det finns på riktigt',
  stopNotifying: 'Sluta meddela mig',
  couldNotSave: 'Det gick inte att spara',
  tryAgainInAMoment: 'Försök igen om en stund.',
  clear: 'Rensa',
  comingVerySoon: 'Snart här',
  oneMoment: 'Ett ögonblick…',
  send: 'Skicka',
  sendIdea: 'Skicka idé',
  uploadYourPhoto: 'Ladda upp fotot du vill arbeta med',
  uploadHint: 'Från galleriet eller med kameran',
  uploadFormats: 'JPG, PNG eller WEBP (högst 10 MB)',
  uploadingPhoto: 'Laddar upp fotot…',
  photoReady: 'Fotot är klart. Berätta vad vi ska göra med det.',
  photoHelps: 'Ett foto hjälper mig att behålla hur platsen faktiskt ser ut.',
  uploadToWork: 'Ladda upp ett foto så att Weë kan arbeta med det.',
  pickFromPhotos: 'Välj bland mina foton',
  orAlso: 'Eller så kan du',
  takeAPhoto: 'Ta ett foto',
  changePhoto: 'Byt foto',
  removePhoto: 'Ta bort foto',
  photoAttached: 'Foto bifogat',
  couldNotPickPhoto: 'Det gick inte att välja fotot',
  couldNotAttach: 'Det gick inte att bifoga',
  preferWords: 'Jag beskriver hellre med ord',
  change: 'Byt',
  remove: 'Ta bort',
  tryAgain: 'Försök igen',
  itDidNotWork: 'Det blev inte bra. Inga Credits har dragits.',
  notEnoughCredits: 'Du har inte tillräckligt med Credits',
  getCredits: 'Skaffa Credits',
  calculatingCost: 'Beräknar kostnaden…',
  couldNotCalculate: 'Det gick inte att beräkna kostnaden',
  quality: 'Kvalitet',
  create: 'Skapa',
  changeSomething: 'Ändra något',
  noCost: 'Ingen kostnad',
  demoMode: 'Demoläge: inget att betala.',
  creditsNote: 'De dras när det är klart. Om något går fel får du tillbaka dem.',
  brainThinking: 'Weë Brain tänker…',
  brainSearching: 'Weë Brain söker…',
  keepTelling: 'Berätta mer…',
  searchInternet: 'Sök på internet',
  previewDemo: 'Förhandsvisning · demo',
  savedIn: 'Sparat i {{proyecto}}',
  saveToProject: 'Spara i ett projekt',
  newProject: 'Nytt projekt',
  projectName: 'Projektnamn',
  createProject: 'Skapa projekt',
  close: 'Stäng',
  choose: 'Välj',
  play: 'Spela upp',
  pause: 'Pausa',
  playing: 'Spelas upp',
  playingPreview: 'Spelas upp · förhandsvisning',
  hideChanges: 'Dölj listan med ändringar och inköp',
  makeItRealistic: 'Gör det mer realistiskt',
  changeItsColor: 'Byt färg',
  moreStriking: 'Mer iögonfallande',
  simpler: 'Enklare',
  before: 'Före',
  after: 'Efter',
  couldNotLoadCreations: 'Det gick inte att ladda dina skapelser',
  couldNotLoadProjects: 'Det gick inte att ladda projekten',
  couldNotCreateProject: 'Det gick inte att skapa projektet',
  couldNotSaveToProject: 'Det gick inte att spara i projektet. Försök igen.',
  seeMore: 'Visa mer',
  seeAllCreations: 'Visa alla',
  demo: 'demoläge',
  jobAsking: 'Svar saknas',
  jobPlanned: 'Redo att skapas',
  jobRunning: 'Skapar…',
  jobDone: 'Klart',
  jobFailed: 'Misslyckades',
  jobCancelled: 'Avbrutet',
  brainGreeting: 'Hej! Jag är Weë Brain. Fråga mig, berätta något eller be om det du behöver. Om en annan Weë-expert kan det bättre tar jag dig dit.',
  brainBetterFit: '{{emoji}} {{especialista}} kan hjälpa dig bättre med det här. Jag kan ta dig dit med det du redan har berättat, eller så fortsätter vi här.',
  goToSpecialist: 'Gå till {{especialista}}',
  stayHere: 'Fortsätt här',
  creditsAndCost: 'Du har {{saldo}} Credits och det här kostar {{costo}}',
  sendForCredits: 'Skicka för {{credits}} Credits',
  writeToKnowCost: 'Skriv ditt meddelande så säger jag vad det kostar innan du skickar det.',
  approxUsd: 'cirka {{usd}} USD',
  creditsLeft: 'du har {{saldo}} Credits kvar',
  attach: 'Bifoga',

  /* ── LO QUE CUESTA, EN PALABRAS ─────────────────────────────────────────
   * Las cifras ya las escribe el formato de Weë con el locale activo;
   * aquí solo está el texto que las acompaña.
   */
  creditsAvailable: 'Tillgängliga Credits: {{saldo}}',
  costLine: 'Kostnad: {{coste}}',
  youHaveLeft: 'du har {{saldo}} Credits kvar',
  testPriceSuffix: ' · testpris',
  testPriceParenthesis: ' (testpris)',
  youSpent: ' Du använde {{credits}} Credits{{nota}}.',
  spentNothing: ' Du använde inga Credits.',
  calculatingTheCost: 'Beräknar kostnaden…',
  costFailed: 'Det gick inte att beräkna kostnaden. Försök igen.',
  avatarCost: 'Weë-avatar · {{credits}} Credits{{saldo}}',
  /* Lo que Weë Brain dice que va a hacer, que llega desde el servidor. */
  quoteSearch: 'Sökning med källor',
  quoteBrain: 'Svar från Weë Brain',
  speak: 'Tala',
  speakComingSoon: 'Att tala med Weë kommer i en senare version. Skriv så länge.',
  searchInternetOn: 'Sök på internet: ja',
  newConversation: 'Ny chatt',
  couldNotCalculateRetry: 'Det gick inte att beräkna kostnaden. Försök igen.',
  expandSection: '{{titulo}}. Visa {{contenido}}',
  collapseSection: '{{titulo}}. Dölj {{contenido}}',
  openTravel_one: '{{titulo}}. Öppna Weë Travel: rutan där du beskriver resan och ett sätt att börja',
  openTravel_other: '{{titulo}}. Öppna Weë Travel: rutan där du beskriver resan och {{contador}} sätt att börja',
  closeTravel_one: '{{titulo}}. Dölj Weë Travel: rutan där du beskriver resan och ett sätt att börja',
  closeTravel_other: '{{titulo}}. Dölj Weë Travel: rutan där du beskriver resan och {{contador}} sätt att börja',
  tellWeeTheTrip: 'Berätta om resan för Weë',
  theMotto: 'Du väljer resultatet. Weë väljer rätt AI.',
  trySearchWords: 'Prova ord som logo, video, foto, text, låt, look, recept, hem eller företag. Eller fråga Weë Brain.',
  whatToCreate: 'Vad vill du skapa?',
  willNotifyYou: '✓ Vi meddelar dig när det finns på riktigt',
  projectsNote: 'Samla dina skapelser på ett ställe: logga, foton, videor, musik och dokument.',
  errNotEnoughCredits: 'Du har inte tillräckligt med Credits för det här. Skaffa Credits och försök igen.',
  errRateLimited: 'Du har skapat mycket på kort tid. Vänta en stund och försök igen.',
  errTimeout: 'Det tog för lång tid, så jag stoppade det. Inga Credits har dragits. Försök igen.',
  errDuplicate: 'Det här håller redan på att skapas.',
  errNoAccount: 'Slutför din profil om du vill använda Weë AI.',
  errSignIn: 'Logga in om du vill skapa med Weë.',
  errOffline: 'Det gick inte att ansluta till Weë AI. Kontrollera anslutningen och försök igen.',
  errGeneric: 'Det blev inte bra. Ska vi försöka igen? Inga Credits har dragits.',
  dayExpand: '{{titulo}}. Tryck för att visa dagen',
  dayCollapse: '{{titulo}}. Tryck för att fälla ihop',
  pathRedesign: '🏠 Designa om helt',
  pathColors: '🎨 Byt stil och färger',
  pathFurniture: '🪑 Arbeta med möblerna',
  sidebarTagline: 'Ett bättre du,\ni en mer\nkreativ värld',
  youHaveCredits: 'Du har {{saldo}} Credits',
  creditsBoxNote: 'Weë-experterna använder Credits. Fyll på när du vill.',
  startWith: 'Börja med {{nombre}}',
  previousMonth: 'Föregående månad',
  nextMonth: 'Nästa månad',
  dontKnowYet: 'Jag vet inte än',
  confirmDates: 'Bekräfta datumen',
  optionCredits: '{{nombre}}, {{credits}} Credits',
  emojiLabel: 'Emojin {{emoji}}',
  chooseProposal: 'Välj förslag {{numero}}',
  generatedVideo: 'Genererad video',
  playVideo: 'Spela upp videon',
  continueVia: 'Fortsätt med: {{camino}}',
  youChooseWeeChooses: 'Du väljer resultatet. Weë väljer rätt AI.',
  demoToday: 'Just nu i demoläge: Du ser hur det fungerar utan att använda Credits.',
  titleWithDetail: '{{titulo}}. {{detalle}}',
  inferredAnswer: '{{respuesta}} · det förstod jag av det du skrev',
  goalWithChange: '{{objetivo}} · Ändring: {{cambio}}',
  uploadDishPhoto: 'Ladda upp ett foto av din färdiga rätt',
  uploadIngredientsPhoto: 'Ladda upp ett foto av kylskåpet eller ingredienserna du har',
  uploadingYourSpace: 'Laddar upp ditt rum…',
  yourSpace: 'Ditt rum',
  finishedGoal: '{{nombre}} har gjort klart ”{{objetivo}}”.',
  chosenProposal: '✓ Förslag {{numero}} valt',
  proposalNumber: 'Förslag {{numero}}',
  sample: 'exempel',
  weeVoice: 'Weë-röst',
  weeVoiceDuration: '{{duracion}} · Weë-röst',
  previewWithDuration: '{{duracion}} · förhandsvisning',
  regeneratePriceSuffix: ' · ≈ {{credits}} Credits',
  anotherVersion: 'Skapa en ny version{{precio}}',
  eachChangeRecreates: 'Varje ändring skapar resultatet på nytt{{precio}}. De dras när det är klart.',
  showChanges: 'Visa listan med ändringar och inköp',
  nameThinking: '{{nombre}} tänker…',
  tapDepartureDay: 'Tryck på avresedagen.',
  tapReturnDay: 'Tryck nu på hemresedagen.',
  tripOneDay: '{{fecha}}',
  tripSameMonth: '{{dia}}–{{diaFinal}} {{mesYAnio}}',
  tripRange: '{{salida}} – {{regreso}}',
  tripDays_one: '{{contador}} dag',
  tripDays_other: '{{contador}} dagar',
  tripNights_one: '{{contador}} natt',
  tripNights_other: '{{contador}} nätter',
  tripDuration: '{{dias}} · {{noches}}',
  tripSummary: '{{fechas}} · {{duracion}}',
  imageCount_one: '{{contador}} bild',
  imageCount_other: '{{contador}} bilder',
  durationSeconds: '{{segundos}} s',
  volumeDiscount: '−{{descuento}} % mängdrabatt',
};
