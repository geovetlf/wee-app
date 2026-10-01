/*
 * DANÉS — El compositor: lo que se escribe y lo que se adjunta antes de publicar,
 * y la hoja «Crear» del botón +.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Publicar es «Slå op» y la publicación, «opslag» (et opslag, invariable:
 * «dit opslag», «Nyt opslag»), glosario § 9.2. «Crear» es «Opret», como el
 * `create` de weeai. La comunidad es «fællesskabet»; la encuesta, «afstemning»,
 * y cada opción, «valgmulighed» (§ 9.2); la mención, «omtale» y mencionar,
 * «nævne». «Ubicación» es «placering» (§ 9.6) y «lugar», «sted». El watermark
 * es «vandmærke» (§ 9.4). «Face swap» es «ansigtsbytte».
 *
 * «PUBLICAR EN» va en mayúsculas porque así lo escribe el español (diseño, guía
 * § 3): «SLÅ OP I», encima de los destinos (Wäll y las comunidades). El muro
 * general es «Fælles Wäll»: adjetivo delante de la marca, sin declinarla.
 *
 * Weël es «en Weël», de género común como «en video» (guía § 4): «din Weël»,
 * «En Weël må højst vare…», «For lang Weël». La marca nunca se declina.
 *
 * Los huecos, sin nada pegado: la agenda —«ËContact», «ẄContact» o su plural,
 * que son marca— entra sola o detrás de una preposición («Nævn hvem som helst
 * fra {{lista}}»), sin un posesivo que tenga que concordar con ella. Donde el
 * español dice «tus ËContact» se dice «dine kontakter i ËContact».
 *
 * `bizNoAgenda` habla de un Perfil Biz que ya no existe (docs/I18N.md): se
 * traduce tal cual para no inventar, con «Biz-profilen» en compuesto con guion.
 * El Perfil Real y el Perfil Weë son «Ægte profil» y «Weë-profil» (§ 9.1).
 *
 * `multimedia` es «Galleri»: el botón abre la galería de fotos y vídeos. Los
 * avisos de permiso dicen «Vi skal have adgang til …» («vi» = Weë, guía § 2).
 * Los títulos de error dicen qué no se pudo hacer, sin punto; los cuerpos son
 * frases completas con punto final y, si hace falta, el paso siguiente.
 *
 * Plurales: «1 sekund / 3 sekunder», «1 minut / 3 minutter», «1 dag / 3 dage»,
 * «1 foto / 3 fotos». «Publicando...» del español lleva tres puntos: aquí es
 * «…», un carácter.
 *
 * `kindVideo` («Video») se escribe igual que en español y en inglés: es la
 * palabra danesa (glosario § 9.1). `kindWeel` y `econtact` son marca.
 */
export const composer: typeof import('../es/composer').composer = {
  publish: 'Slå op',
  createPost: 'Opret et opslag',
  sharePhoto: 'Del et foto',
  photoOrVideo: 'Foto eller video',
  camera: 'Kamera',
  location: 'Placering',
  poll: 'Afstemning',
  sheetTitle: 'Opret',
  sheetSubtitle: 'Hvad vil du dele i dag?',
  kindPost: 'Opslag',
  kindWeel: 'Weël',
  kindImage: 'Billede',
  kindVideo: 'Video',
  kindText: 'Tekst',
  kindQuestion: 'Spørgsmål',
  needAiTool: 'Har du brug for et AI-værktøj?',
  needAiToolNote: 'Video, billede, tekst, musik og mere',
  econtact: 'ËContact',
  openOptions: '{{campo}} Åbner mulighederne for opslaget.',
  showOptions: 'Vis mulighederne for opslaget',
  hideOptions: 'Skjul mulighederne for opslaget',
  currentDestination: '{{destino}}, valgt',
  generalWall: 'Fælles Wäll',
  placeholderPollExtra: 'Tilføj mere, hvis du vil (valgfrit)…',
  placeholderQuestion: 'Hvad vil du spørge fællesskabet om?',
  placeholderWeel: 'Fortæl, hvad du har lavet til din Weël, og med hvilken AI…',
  placeholderVideo: 'Fortæl, hvad du har lavet, og med hvilken AI…',
  placeholderImage: 'Vis dit billede, og fortæl, hvordan du lavede det…',
  placeholderText: 'Del en tekst, en prompt eller en idé…',
  placeholderDefault: 'Skriv noget…',
  postTextLabel: 'Opslagets tekst',
  weelHint: 'Weël: en video på op til {{segundos}} sekunder. Når den deles uden for Weë, får den et lille vandmærke.',
  newPost: 'Nyt opslag',
  you: 'Du',
  shareWithCommunity: 'Del med fællesskabet på Weë',
  publicVisibility: 'Offentlig',
  visibilityIs: 'Synlighed: {{estado}}',
  publicExplain: 'Indtil videre er alle opslag på Weë offentlige.',
  profileReal: 'Ægte profil',
  profileWee: 'Weë-profil',
  multimedia: 'Galleri',
  actionWithBadge: '{{accion}}, {{insignia}}',
  removeVideo: 'Fjern videoen',
  removePhotoNumber: 'Fjern foto {{numero}}',
  addMoreMedia: 'Tilføj flere fotos eller videoer',
  addMoreMediaLabel: 'Tilføj flere fotos eller videoer, du har tilføjet {{puestas}} af {{tope}}',
  placeIs: 'Sted: {{lugar}}',
  removePlace: 'Fjern stedet',
  approxZone: 'Omtrentligt område',
  postingFromZone: 'Slår op fra dit omtrentlige område',
  removeMyLocation: 'Fjern min placering',
  removeMentions_one: 'Fjern omtalen',
  removeMentions_other: 'Fjern omtalerne',
  signInToMention: 'Log ind på Weë for at nævne dine kontakter i ËContact.',
  bizNoAgenda: 'Biz-profilen har ingen ËContact-liste. Skift til din ægte profil eller din Weë-profil for at nævne nogen.',
  noContactsYet: 'Du har ingen {{lista}} endnu. Personer, du opretter forbindelse til via deres profil, vises her, så du kan nævne dem.',
  mentionAnyone: 'Nævn hvem som helst fra {{lista}}',
  publishIn: 'SLÅ OP I',
  publishing: 'Slår op…',
  publishingOverlay: 'Slår op…',
  uploadingFiles: 'Uploader {{n}} af {{total}}…',
  readyInAMoment: 'Dit opslag er klar om et øjeblik',
  pollQuestionPlaceholder: 'Hvad vil du spørge om?',
  pollOptionPlaceholder: 'Valgmulighed {{numero}}',
  pollAddOption: 'Tilføj valgmulighed',
  pollDurationLabel: 'Afstemningens varighed',
  pollDays_one: '{{contador}} dag',
  pollDays_other: '{{contador}} dage',
  pollErrEmptyQuestion: 'Skriv spørgsmålet til din afstemning.',
  pollErrLongQuestion: 'Spørgsmålet må højst være på {{maximo}} tegn.',
  pollErrFewOptions: 'En afstemning skal have mindst {{minimo}} valgmuligheder.',
  pollErrManyOptions: 'En afstemning kan højst have {{maximo}} valgmuligheder.',
  pollErrEmptyOption: 'Alle valgmuligheder skal have en tekst.',
  pollErrLongOption: 'En valgmulighed må højst være på {{maximo}} tegn.',
  pollErrDuplicateOption: 'To valgmuligheder siger det samme.',
  pollErrInvalid: 'Afstemningen er ikke gyldig.',
  pollErrDuration: 'Vælg, hvor længe afstemningen skal vare.',
  pollWithVideo: 'En afstemning kan have et foto, men ikke en video.',
  pollMaxPhotos_one: 'En afstemning kan højst have {{contador}} foto.',
  pollMaxPhotos_other: 'En afstemning kan højst have {{contador}} fotos.',
  notAvailable: 'Ikke tilgængelig',
  permissionRequired: 'Tilladelse påkrævet',
  cameraAccess: 'Vi skal have adgang til dit kamera.',
  galleryAccess: 'Vi skal have adgang til dit galleri.',
  permissionsNeeded: 'Der mangler tilladelser',
  cameraForPhotos: 'Vi skal have adgang til dit kamera for at kunne tage fotos.',
  goToSettings: 'Gå til Indstillinger',
  faceSwapFailed: 'Ansigtsbyttet kunne ikke gennemføres. Prøv igen.',
  weelTooLong: 'For lang Weël',
  videoTooLong: 'For lang video',
  weelMaxDuration: 'En Weël må højst vare {{maximo}} sekunder. Din video varer {{duracion}}.',
  videoMaxDuration: 'Videoen må højst vare {{maximo}} sekunder. Din video varer {{duracion}}.',
  seconds_one: '{{contador}} sekund',
  seconds_other: '{{contador}} sekunder',
  minutes_one: '{{contador}} minut',
  minutes_other: '{{contador}} minutter',
  noVideoWithMedia: 'Du kan ikke tilføje en video, når du allerede har vedhæftet medier.',
  noImagesWithVideo: 'Du kan ikke tilføje billeder, når du allerede har vedhæftet en video.',
  pickImagesFailed: 'Billederne kunne ikke vælges. Prøv igen.',
  takePhotoFailed: 'Fotoet kunne ikke tages. Prøv igen.',
  mustSignIn: 'Du skal være logget ind for at slå op.',
  videoUploadFailed: 'Videoen kunne ikke uploades',
  imageUploadFailed: 'Billedet kunne ikke uploades',
  publishFailed: 'Opslaget kunne ikke slås op',
  uploadErrorBody: 'Filen kunne ikke uploades. Tjek din forbindelse, og prøv igen.',
  publishErrorBody: 'Noget gik galt. Prøv igen.',
  addLocation: 'Tilføj placering',
  searchPlace: 'Søg efter et sted, en by eller et land',
  clearSearch: 'Ryd søgningen',
  useAsTyped: 'Brug ”{{texto}}”, som du skrev det',
  asYouTypedIt: 'Præcis som du skrev det',
  tagPostWithIt: 'Tilføjer det, du skrev, som sted og går tilbage til opslaget',
  chooseThisPlace: 'Vælger dette sted og går tilbage til opslaget',
  placeOption: '{{lugar}}, {{detalle}}',
  country: 'Land',
  placesNearYou: '📍 Steder i nærheden',
  placesIn: '📍 Steder i {{pais}}',
  yourCountry: 'dit land',
  seeMore: 'Vis mere',
  seeLess: 'Vis mindre',
  galleryForImages: 'Vi skal have adgang til dit galleri for at kunne vælge billeder.',
  results: 'Resultater',
  useAsTypedShort: 'Brug ”{{texto}}”',
  imageFetchFailed: 'Billedet kunne ikke hentes: {{estado}} {{texto}}',
  askCommunity: 'Stil et spørgsmål til fællesskabet',
  applyingFaceSwap: 'Bytter ansigt…',
  searchPlaceHint: 'Søg efter en by eller et land for at tilføje et sted til dit opslag.',
  aiProcessCreatedWith: 'Lavet med {{nombre}} i Weë AI',
  aiProcessDemoPreview: '{{proceso}} (forhåndsvisning i demotilstand)',
};
