/*
 * FILIPINO — El compositor: lo que se escribe y lo que se adjunta antes de publicar, y la hoja «Crear» del botón +.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (§ 11): publicar es «I-post» y la publicación, «post»; «Crear» es «Gumawa», como
 * la pestaña + (`nav.create`); la foto es «larawan», la comunidad «komunidad», la encuesta «poll» y cada opción,
 * «opsyon» («Magdagdag ng opsyon», § 3.1). Mencionar es «I-mention» y la ubicación, «lokasyon»; el lugar elegido, «lugar»,
 * y la zona aproximada, «tinatayang area» (como `settings`: «ng area mo»). El watermark es «watermark» y la vista
 * previa, «preview» (§ 11.10). Los estados siguen la lista cerrada del § 11.4: «Pino-post…», «Ina-upload ang {{n}} sa
 * {{total}}…», «Ina-apply…» (reduplicación de *apply* como la de *upload*, § 3.3). «Publicando...» del español, con
 * tres puntos, es aquí «…», un carácter.
 *
 * «PUBLICAR EN» va en mayúsculas porque así lo escribe el español (diseño, § 5.5): «I-POST SA», el ejemplo de la guía.
 * El muro general es «Pangkalahatang Wäll»: el enlace lo lleva el adjetivo, delante, y la marca queda intacta. El
 * Perfil Real y el Perfil Weë son «Tunay na profile» y «Weë profile» (§ 6); `profileNoAgenda` habla de «profile na
 * ito», sin nombrar una cara que ya no existe, y la agenda es la «listahan ng contact» de `econtact.noAgenda`. Donde
 * el español dice «tus ËContact» se dice «ang mga contact mo sa ËContact»: la marca no lleva `mga` delante. Los
 * huecos `{{lista}}` (la agenda, que es marca) van detrás de «sa» o con «mo» detrás, sin nada pegado.
 *
 * Los avisos de permiso los pide Weë con el «kami» exclusivo (§ 2): «Kailangan namin ng access sa camera.». Los
 * títulos de error dicen qué no se pudo hacer, sin punto («Hindi ma-upload ang video»; el de publicar, «Hindi natuloy
 * ang pag-post», como `settings.signOutFailed`); los cuerpos, frase completa y el paso siguiente, «Subukan ulit.».
 * «Ir a Configuración» abre los ajustes del teléfono: «Buksan ang mga setting». «Visibilidad» es «Sino ang
 * makakakita», la pregunta con la que Facebook en filipino elige el público. `multimedia` es «Gallery»: el botón abre
 * la galería de fotos y vídeos. La cita de lo que escribió la persona va entre “…” (§ 7).
 *
 * Plurales (§ 8.3): la cifra va justo delante del sustantivo, así que `_other` lleva el enlace «na» («4 na araw»,
 * «Hanggang 4 na larawan…»). `seconds_*` y `minutes_*` entran en «Umaabot sa {{duracion}} ang video mo» con la
 * unidad corta que escribe `Intl` en filipino, «seg.» y «min.» (§ 8.1, como `weels.upTo15s`): ante una abreviatura no
 * hay enlace y las dos formas son iguales (regla 2); la forma larga, «20 segundo», sería la misma cadena que el español. `removeMentions_*` es el caso del § 12: la diferencia del español es de
 * sentido, no de cifra, y las dos dicen «Huwag nang i-mention». Los números de claves sin plural (`{{maximo}}
 * character`, `{{segundos}} segundo`) van sin enlace (regla 7). `distanceUnder` / `distanceOver` son las formas
 * filipinas de «menos de» y «más de»: «Wala pang 1 km», «Mahigit 60 km».
 *
 * Se escriben igual que en inglés porque ES la palabra del glosario: «Camera», «Poll», «Text» (como en `studio`).
 * `kindVideo` («Video») y `kindPost` («Post») también; `kindWeel` y `econtact` son marca.
 */
export const composer: typeof import('../es/composer').composer = {
  publish: 'I-post',
  createPost: 'Gumawa ng post',
  sharePhoto: 'Magbahagi ng larawan',
  photoOrVideo: 'Larawan o video',
  camera: 'Camera',
  location: 'Lokasyon',
  poll: 'Poll',
  sheetTitle: 'Gumawa',
  sheetSubtitle: 'Ano ang gusto mong ibahagi ngayon?',
  kindPost: 'Post',
  kindWeel: 'Weël',
  kindImage: 'Larawan',
  kindVideo: 'Video',
  kindText: 'Text',
  kindQuestion: 'Tanong',
  needAiTool: 'Kailangan mo ba ng AI tool?',
  needAiToolNote: 'Video, larawan, text, musika at iba pa',
  econtact: 'ËContact',
  openOptions: '{{campo}} Bubuksan nito ang mga opsyon sa pag-post.',
  showOptions: 'Ipakita ang mga opsyon sa pag-post',
  hideOptions: 'Itago ang mga opsyon sa pag-post',
  currentDestination: '{{destino}}, napili',
  generalWall: 'Pangkalahatang Wäll',
  placeholderPollExtra: 'Magdagdag pa ng iba kung gusto mo (opsyonal)…',
  placeholderQuestion: 'Ano ang gusto mong itanong sa komunidad?',
  placeholderWeel: 'Ikuwento ang ginawa mo para sa Weël mo at kung anong AI ang ginamit mo…',
  placeholderVideo: 'Ikuwento ang ginawa mo at kung anong AI ang ginamit mo…',
  placeholderImage: 'Ipakita ang larawan mo at kung paano mo ito ginawa…',
  placeholderText: 'Magbahagi ng text, prompt o ideya…',
  placeholderDefault: 'Magsulat ng kahit ano…',
  postTextLabel: 'Text ng post',
  weelHint: 'Weël: video na hanggang {{segundos}} segundo. Kapag ibinahagi ito sa labas ng Weë, may maliit itong watermark.',
  newPost: 'Bagong post',
  you: 'Ikaw',
  shareWithCommunity: 'Ibahagi sa komunidad ng Weë',
  profileReal: 'Tunay na profile',
  profileWee: 'Weë profile',
  multimedia: 'Gallery',
  actionWithBadge: '{{accion}}, {{insignia}}',
  removeVideo: 'Alisin ang video',
  removePhotoNumber: 'Alisin ang larawan {{numero}}',
  addMoreMedia: 'Magdagdag pa ng larawan o video',
  addMoreMediaLabel: 'Magdagdag pa ng larawan o video, nakapaglagay ka na ng {{puestas}} sa {{tope}}',
  placeIs: 'Lugar ng post: {{lugar}}',
  removePlace: 'Alisin ang lugar',
  approxZone: 'Tinatayang area',
  postingFromZone: 'Nagpo-post mula sa tinatayang area mo',
  removeMyLocation: 'Alisin ang lokasyon ko',
  removeMentions_one: 'Huwag nang i-mention',
  removeMentions_other: 'Huwag nang i-mention',
  signInToMention: 'Mag-sign in sa Weë para ma-mention ang mga contact mo sa ËContact.',
  profileNoAgenda: 'Walang listahan ng contact sa ËContact ang profile na ito. Lumipat sa Tunay na profile mo o sa Weë profile mo para makapag-mention ng iba.',
  noContactsYet: 'Wala ka pang {{lista}}. Kapag kumonekta ka sa isang tao mula sa profile niya, lalabas siya dito para ma-mention mo siya.',
  mentionAnyone: 'I-mention ang kahit sino mula sa {{lista}} mo',
  publishIn: 'I-POST SA',
  publishing: 'Pino-post…',
  publishingOverlay: 'Pino-post…',
  uploadingFiles: 'Ina-upload ang {{n}} sa {{total}}…',
  readyInAMoment: 'Ilang sandali na lang at handa na ang post mo',
  pollQuestionPlaceholder: 'Ano ang gusto mong itanong?',
  pollOptionPlaceholder: 'Opsyon {{numero}}',
  pollAddOption: 'Magdagdag ng opsyon',
  pollDurationLabel: 'Tagal ng poll',
  pollDays_one: '{{contador}} araw',
  pollDays_other: '{{contador}} na araw',
  pollErrEmptyQuestion: 'Isulat ang tanong ng poll mo.',
  pollErrLongQuestion: 'Hindi puwedeng lumampas sa {{maximo}} character ang tanong.',
  pollErrFewOptions: 'Dapat may hindi bababa sa {{minimo}} opsyon ang poll.',
  pollErrManyOptions: 'Hanggang {{maximo}} opsyon lang ang puwede sa poll.',
  pollErrEmptyOption: 'Kailangang may text ang bawat opsyon.',
  pollErrLongOption: 'Hindi puwedeng lumampas sa {{maximo}} character ang isang opsyon.',
  pollErrDuplicateOption: 'May dalawang opsyon na pareho ang sinasabi.',
  pollErrInvalid: 'Hindi wasto ang poll na ito.',
  pollErrDuration: 'Piliin kung gaano katagal ang poll.',
  pollWithVideo: 'Puwedeng lagyan ng larawan ang poll, pero hindi ng video',
  pollMaxPhotos_one: 'Hanggang {{contador}} larawan lang ang puwede sa poll',
  pollMaxPhotos_other: 'Hanggang {{contador}} na larawan lang ang puwede sa poll',
  notAvailable: 'Hindi available',
  permissionRequired: 'Kailangan ng pahintulot',
  cameraAccess: 'Kailangan namin ng access sa camera.',
  galleryAccess: 'Kailangan namin ng access sa gallery.',
  permissionsNeeded: 'Kailangan ng mga pahintulot',
  cameraForPhotos: 'Kailangan namin ng access sa camera mo para makakuha ng larawan',
  goToSettings: 'Buksan ang mga setting',
  faceSwapFailed: 'Hindi ma-apply ang face swap. Subukan ulit.',
  weelTooLong: 'Masyadong mahaba ang Weël',
  videoTooLong: 'Masyadong mahaba ang video',
  weelMaxDuration: 'Hanggang {{maximo}} segundo lang ang puwedeng haba ng isang Weël. Umaabot sa {{duracion}} ang video mo.',
  videoMaxDuration: 'Hanggang {{maximo}} segundo lang ang puwedeng haba ng video. Umaabot sa {{duracion}} ang video mo.',
  seconds_one: '{{contador}} seg.',
  seconds_other: '{{contador}} seg.',
  minutes_one: '{{contador}} min.',
  minutes_other: '{{contador}} min.',
  noVideoWithMedia: 'Hindi ka puwedeng magdagdag ng video kapag may naka-attach na media',
  noImagesWithVideo: 'Hindi ka puwedeng magdagdag ng larawan kapag may naka-attach na video',
  pickImagesFailed: 'Hindi mapili ang mga larawan. Subukan ulit.',
  takePhotoFailed: 'Hindi makakuha ng larawan. Subukan ulit.',
  mustSignIn: 'Kailangan mong mag-sign in para makapag-post',
  videoUploadFailed: 'Hindi ma-upload ang video',
  imageUploadFailed: 'Hindi ma-upload ang larawan',
  publishFailed: 'Hindi natuloy ang pag-post',
  uploadErrorBody: 'Hindi ma-upload ang file. Tingnan ang koneksyon mo at subukan ulit.',
  publishErrorBody: 'Hindi ito ma-post. Subukan ulit.',
  addLocation: 'Magdagdag ng lokasyon',
  searchPlace: 'Maghanap ng lugar, lungsod o bansa',
  clearSearch: 'I-clear ang paghahanap',
  useAsTyped: 'Gamitin ang “{{texto}}” gaya ng pagkakasulat mo',
  asYouTypedIt: 'Gaya ng pagkakasulat mo',
  tagPostWithIt: 'Ilalagay sa post ang isinulat mo bilang lugar, at babalik ka sa post',
  chooseThisPlace: 'Pipiliin ang lugar na ito at babalik ka sa post',
  placeOption: '{{lugar}}, {{detalle}}',
  country: 'Bansa',
  placesNearYou: '📍 Mga lugar na malapit sa iyo',
  placesIn: '📍 Mga lugar sa {{pais}}',
  yourCountry: 'bansa mo',
  seeMore: 'Tingnan pa',
  seeLess: 'Magpakita ng mas kaunti',
  galleryForImages: 'Kailangan namin ng access sa gallery mo para makapili ng larawan',
  results: 'Mga resulta',
  useAsTypedShort: 'Gamitin ang “{{texto}}”',
  imageFetchFailed: 'Hindi makuha ang larawan: {{estado}} {{texto}}',
  askCommunity: 'Magtanong sa komunidad',
  applyingFaceSwap: 'Ina-apply ang face swap…',
  searchPlaceHint: 'Maghanap ng lungsod o bansa na ita-tag sa post mo.',
  aiProcessCreatedWith: 'Ginawa gamit ang {{nombre}} sa Weë AI',
  aiProcessDemoPreview: '{{proceso}} (preview sa demo mode)',
  distanceUnder: 'Wala pang {{distancia}}',
  distanceOver: 'Mahigit {{distancia}}',
};
