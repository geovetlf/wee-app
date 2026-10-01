/*
 * SUECO — El compositor: lo que se escribe y lo que se adjunta antes de publicar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Publicar» es «Publicera» y la publicación, «inlägg» (glosario § 9.1), que
 * no cambia en plural. La comunidad es «communityn» (forma definida del
 * glosario); la encuesta, «omröstning», como en Facebook, Instagram y X; cada
 * opción, «alternativ» (tampoco cambia en plural); la mención, «omnämnande»
 * («omnämnandena» en plural definido). «Ubicación» y «lugar» son los dos
 * «plats». El watermark es «vattenstämpel». «Face swap» es «byta ansikte».
 *
 * Weël es «en Weël», de género común como «en video» (guía § 4): «din Weël»,
 * «En Weël får vara…», «För lång Weël». La marca nunca se declina: ni
 * «Weëlen» ni «Weëls» como genitivo.
 *
 * Los huecos, sin nada pegado: la agenda —«ËContact», «ẄContact» o su plural,
 * que son marca— entra sola o detrás de una preposición («Nämn vem du vill i
 * {{lista}}»), sin un posesivo que tenga que concordar con ella. Donde el
 * español dice «tus ËContact» se dice «dina kontakter i ËContact».
 *
 * `profileNoAgenda` habla de «den här profilen», sin nombrar una cara que ya
 * no existe (el Perfil Biz se eliminó el 2026-09-19). El Perfil Real y el
 * Perfil Weë son «Riktig profil» y «Weë-profil» (glosario § 9.1); dentro de
 * una frase, «din riktiga profil».
 *
 * `multimedia` es «Galleri»: el botón abre la galería de fotos y vídeos, y
 * «Media» sería la misma cadena que en inglés. `currentDestination` es
 * «aktuellt val» («aktuell» es «actual» en sueco, no «real»). El muro general
 * es «Allmänna Wäll», adjetivo en forma débil delante del nombre, como
 * «Gamla stan».
 *
 * Los títulos de error son sintagmas («Fel vid publicering») y los cuerpos,
 * frases con qué pasó y qué hacer («Det gick inte att … Försök igen.»). Los
 * avisos de permiso dicen «Weë behöver åtkomst till …»: la guía pide poco
 * «vi» (§ 2), y así quien pide el permiso tiene nombre. Las instrucciones
 * siguen «… om du vill X» (§ 2), nunca «För att X, …».
 *
 * Plurales: «1 sekund / 3 sekunder», «1 minut / 3 minuter», «1 dag /
 * 3 dagar», «1 foto / 3 foton». «Publicando...» del español lleva tres
 * puntos: aquí es «…», un carácter. «PUBLICAR EN» va en mayúsculas porque así
 * lo escribe el español (diseño, guía § 3): «PUBLICERA I», como el «Publicera
 * i grupp» de Facebook.
 *
 * `kindVideo` («Video») se escribe igual que en español y en inglés, y
 * `kindText` («Text») igual que en inglés: son las palabras suecas (glosario
 * § 9.1). `kindWeel` y `econtact` son marca.
 */
export const composer: typeof import('../es/composer').composer = {
  publish: 'Publicera',
  createPost: 'Skapa ett inlägg',
  sharePhoto: 'Dela ett foto',
  photoOrVideo: 'Foto eller video',
  camera: 'Kamera',
  location: 'Plats',
  poll: 'Omröstning',
  sheetTitle: 'Skapa',
  sheetSubtitle: 'Vad vill du dela i dag?',
  kindPost: 'Inlägg',
  kindWeel: 'Weël',
  kindImage: 'Bild',
  kindVideo: 'Video',
  kindText: 'Text',
  kindQuestion: 'Fråga',
  needAiTool: 'Behöver du ett AI-verktyg?',
  needAiToolNote: 'Video, bild, text, musik och mer',
  econtact: 'ËContact',
  openOptions: '{{campo}} Öppnar publiceringsalternativen.',
  showOptions: 'Visa publiceringsalternativen',
  hideOptions: 'Dölj publiceringsalternativen',
  currentDestination: '{{destino}}, aktuellt val',
  generalWall: 'Allmänna Wäll',
  placeholderPollExtra: 'Lägg till något mer om du vill (valfritt)…',
  placeholderQuestion: 'Vad vill du fråga communityn?',
  placeholderWeel: 'Berätta vad du skapat i din Weël och med vilken AI…',
  placeholderVideo: 'Berätta vad du skapat och med vilken AI…',
  placeholderImage: 'Visa din bild och hur du gjorde den…',
  placeholderText: 'Dela en text, en prompt eller en idé…',
  placeholderDefault: 'Skriv något…',
  postTextLabel: 'Inläggets text',
  weelHint: 'Weël: en video på högst {{segundos}} sekunder. När den delas utanför Weë får den en liten vattenstämpel.',
  newPost: 'Nytt inlägg',
  you: 'Du',
  shareWithCommunity: 'Dela med communityn på Weë',
  publicVisibility: 'Offentligt',
  visibilityIs: 'Synlighet: {{estado}}',
  publicExplain: 'Just nu är alla inlägg på Weë offentliga.',
  profileReal: 'Riktig profil',
  profileWee: 'Weë-profil',
  multimedia: 'Galleri',
  actionWithBadge: '{{accion}}, {{insignia}}',
  removeVideo: 'Ta bort videon',
  removePhotoNumber: 'Ta bort foto {{numero}}',
  addMoreMedia: 'Lägg till fler foton eller videor',
  addMoreMediaLabel: 'Lägg till fler foton eller videor, du har lagt till {{puestas}} av {{tope}}',
  placeIs: 'Plats: {{lugar}}',
  removePlace: 'Ta bort platsen',
  approxZone: 'Ungefärligt område',
  postingFromZone: 'Publiceras från ditt ungefärliga område',
  removeMyLocation: 'Ta bort min plats',
  removeMentions_one: 'Ta bort omnämnandet',
  removeMentions_other: 'Ta bort omnämnandena',
  signInToMention: 'Logga in på Weë om du vill nämna dina kontakter i ËContact.',
  profileNoAgenda: 'Den här profilen har ingen ËContact-lista. Byt till din riktiga profil eller din Weë-profil om du vill nämna någon.',
  noContactsYet: 'Du har inga {{lista}} ännu. Personer som du skapar kontakt med via deras profil visas här, så att du kan nämna dem.',
  mentionAnyone: 'Nämn vem du vill i {{lista}}',
  publishIn: 'PUBLICERA I',
  publishing: 'Publicerar…',
  publishingOverlay: 'Publicerar…',
  uploadingFiles: 'Laddar upp {{n}} av {{total}}…',
  readyInAMoment: 'Ditt inlägg är klart om en liten stund',
  pollQuestionPlaceholder: 'Vad vill du fråga?',
  pollOptionPlaceholder: 'Alternativ {{numero}}',
  pollAddOption: 'Lägg till alternativ',
  pollDurationLabel: 'Omröstningens längd',
  pollDays_one: '{{contador}} dag',
  pollDays_other: '{{contador}} dagar',
  pollErrEmptyQuestion: 'Skriv en fråga till omröstningen.',
  pollErrLongQuestion: 'Frågan får vara högst {{maximo}} tecken.',
  pollErrFewOptions: 'En omröstning behöver minst {{minimo}} alternativ.',
  pollErrManyOptions: 'En omröstning kan ha högst {{maximo}} alternativ.',
  pollErrEmptyOption: 'Alla alternativ måste ha en text.',
  pollErrLongOption: 'Ett alternativ får vara högst {{maximo}} tecken.',
  pollErrDuplicateOption: 'Två alternativ säger samma sak.',
  pollErrInvalid: 'Omröstningen är inte giltig.',
  pollErrDuration: 'Välj hur länge omröstningen ska pågå.',
  pollWithVideo: 'En omröstning kan ha ett foto men ingen video',
  pollMaxPhotos_one: 'En omröstning kan ha högst {{contador}} foto',
  pollMaxPhotos_other: 'En omröstning kan ha högst {{contador}} foton',
  notAvailable: 'Inte tillgänglig',
  permissionRequired: 'Behörighet krävs',
  cameraAccess: 'Weë behöver åtkomst till kameran.',
  galleryAccess: 'Weë behöver åtkomst till galleriet.',
  permissionsNeeded: 'Behörigheter krävs',
  cameraForPhotos: 'Weë behöver åtkomst till kameran för att kunna ta foton',
  goToSettings: 'Gå till Inställningar',
  faceSwapFailed: 'Det gick inte att byta ansikte. Försök igen.',
  weelTooLong: 'För lång Weël',
  videoTooLong: 'För lång video',
  weelMaxDuration: 'En Weël får vara högst {{maximo}} sekunder. Din video är {{duracion}} lång.',
  videoMaxDuration: 'Videon får vara högst {{maximo}} sekunder. Din video är {{duracion}} lång.',
  seconds_one: '{{contador}} sekund',
  seconds_other: '{{contador}} sekunder',
  minutes_one: '{{contador}} minut',
  minutes_other: '{{contador}} minuter',
  noVideoWithMedia: 'Du kan inte lägga till en video när du redan har bifogat media',
  noImagesWithVideo: 'Du kan inte lägga till bilder när du redan har bifogat en video',
  pickImagesFailed: 'Det gick inte att välja bilderna',
  takePhotoFailed: 'Det gick inte att ta fotot',
  mustSignIn: 'Du måste vara inloggad för att publicera',
  videoUploadFailed: 'Fel vid uppladdning av video',
  imageUploadFailed: 'Fel vid uppladdning av bild',
  publishFailed: 'Fel vid publicering',
  uploadErrorBody: 'Det gick inte att ladda upp filen. Kontrollera anslutningen och försök igen.',
  publishErrorBody: 'Det gick inte att publicera. Försök igen.',
  addLocation: 'Lägg till plats',
  searchPlace: 'Sök plats, stad eller land',
  clearSearch: 'Rensa sökningen',
  useAsTyped: 'Använd ”{{texto}}” som du skrev det',
  asYouTypedIt: 'Precis som du skrev det',
  tagPostWithIt: 'Lägger till det du skrev som plats och går tillbaka till inlägget',
  chooseThisPlace: 'Väljer den här platsen och går tillbaka till inlägget',
  placeOption: '{{lugar}}, {{detalle}}',
  country: 'Land',
  placesNearYou: '📍 Platser nära dig',
  placesIn: '📍 Platser i {{pais}}',
  yourCountry: 'ditt land',
  seeMore: 'Visa mer',
  seeLess: 'Visa mindre',
  galleryForImages: 'Weë behöver åtkomst till galleriet för att kunna välja bilder',
  results: 'Resultat',
  useAsTypedShort: 'Använd ”{{texto}}”',
  imageFetchFailed: 'Det gick inte att hämta bilden: {{estado}} {{texto}}',
  askCommunity: 'Ställ en fråga till communityn',
  applyingFaceSwap: 'Byter ansikte…',
  searchPlaceHint: 'Sök efter en stad eller ett land om du vill lägga till en plats i inlägget.',
  aiProcessCreatedWith: 'Skapat med {{nombre}} i Weë AI',
  aiProcessDemoPreview: '{{proceso}} (förhandsvisning i demoläge)',
  distanceUnder: 'Under {{distancia}}',
  distanceOver: 'Över {{distancia}}',
};
