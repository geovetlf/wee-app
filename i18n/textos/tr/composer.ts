/*
 * TURCO — El compositor: lo que se escribe y lo que se adjunta antes de publicar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Publicar» es «Paylaş», como en Instagram y Facebook (glosario: compartir
 * cubre también publicar una publicación), y la publicación es «gönderi».
 * «Foto» es «fotoğraf» e «imagen», «görsel» (glosario).
 *
 * El singular «Weël» del español no existe en turco: la marca va siempre como
 * «Weëls» y, cuando hace falta un sustantivo o un sufijo, «Weëls videosu» (el
 * patrón de «Reels videosu» de Instagram; guía § 9). Escribir «Weël» pegaría
 * una letra a la marca «Weë».
 *
 * El «Wäll general» es «Genel Wäll». La cabecera «PUBLICAR EN» no va en
 * mayúsculas (guía § 3: no es costumbre turca y rompe la i): es «Paylaşım
 * yerleri», en plural porque ahí se marcan varios destinos a la vez, y el
 * destino encendido del atajo del muro es «şu anki paylaşım yeri».
 *
 * Los huecos, sin sufijo (guía § 4): el nombre de la agenda —«ËContact»,
 * «ẄContact» o su plural, que son marca— entra como «{{lista}} listende» /
 * «{{lista}} listenden»; el país, «{{pais}} içindeki yerler»; la foto número
 * n, con el ordinal de la TDK («{{numero}}. fotoğrafı kaldır»); y lo que la
 * persona escribió como lugar va entre comillas turcas detrás de una etiqueta
 * («Şunu kullan: “{{texto}}”»). Poner un lugar en la publicación es «konum
 * eklemek»: «etiket» es el hashtag en el glosario y aquí confundiría.
 *
 * `profileNoAgenda` habla de «bu profil», sin nombrar una cara que ya no
 * existe (el Perfil Biz se eliminó el 2026-09-19).
 *
 * Los títulos de error son sintagmas («Video yükleme hatası») y los cuerpos,
 * frases con qué pasó y qué hacer. «Ir a Configuración» es «Ayarları aç». Los
 * avisos de permiso dicen «…erişmemiz gerekiyor», en la primera persona del
 * plural del español. Tras una cifra, singular: «{{contador}} gün»,
 * «{{contador}} saniye», «en fazla {{maximo}} seçenek».
 *
 * `kindVideo` se escribe igual que en español y en inglés: en turco el vídeo
 * es «Video» (glosario).
 */
export const composer: typeof import('../es/composer').composer = {
  publish: 'Paylaş',
  createPost: 'Gönderi oluştur',
  sharePhoto: 'Fotoğraf paylaş',
  photoOrVideo: 'Fotoğraf veya video',
  camera: 'Kamera',
  location: 'Konum',
  poll: 'Anket',
  sheetTitle: 'Oluştur',
  sheetSubtitle: 'Bugün ne paylaşmak istersin?',
  kindPost: 'Gönderi',
  kindWeel: 'Weëls',
  kindImage: 'Görsel',
  kindVideo: 'Video',
  kindText: 'Metin',
  kindQuestion: 'Soru',
  needAiTool: 'Yapay zekâ aracına mı ihtiyacın var?',
  needAiToolNote: 'Video, görsel, metin, müzik ve daha fazlası',
  econtact: 'ËContact',
  openOptions: '{{campo}} Paylaşım seçeneklerini açar.',
  showOptions: 'Paylaşım seçeneklerini göster',
  hideOptions: 'Paylaşım seçeneklerini gizle',
  currentDestination: '{{destino}}, şu anki paylaşım yeri',
  generalWall: 'Genel Wäll',
  placeholderPollExtra: 'İstersen bir şey daha ekle (isteğe bağlı)…',
  placeholderQuestion: 'Topluluğa ne sormak istiyorsun?',
  placeholderWeel: 'Weëls videonda neyi, hangi yapay zekâyla oluşturduğunu anlat…',
  placeholderVideo: 'Neyi, hangi yapay zekâyla oluşturduğunu anlat…',
  placeholderImage: 'Görselini ve nasıl yaptığını göster…',
  placeholderText: 'Bir metin, prompt ya da fikir paylaş…',
  placeholderDefault: 'Bir şeyler yaz…',
  postTextLabel: 'Gönderi metni',
  weelHint: 'Weëls: en fazla {{segundos}} saniyelik video. Weë dışında küçük bir filigranla paylaşılır.',
  newPost: 'Yeni gönderi',
  you: 'Sen',
  shareWithCommunity: 'Weë topluluğuyla paylaş',
  publicVisibility: 'Herkese açık',
  visibilityIs: 'Görünürlük: {{estado}}',
  publicExplain: 'Şimdilik Weë\'deki tüm gönderiler herkese açık.',
  profileReal: 'Gerçek profil',
  profileWee: 'Weë profili',
  multimedia: 'Medya',
  actionWithBadge: '{{accion}}, {{insignia}}',
  removeVideo: 'Videoyu kaldır',
  removePhotoNumber: '{{numero}}. fotoğrafı kaldır',
  addMoreMedia: 'Daha fazla fotoğraf veya video ekle',
  addMoreMediaLabel: 'Daha fazla fotoğraf veya video ekle, eklenen: {{puestas}}, en fazla: {{tope}}',
  placeIs: 'Yer: {{lugar}}',
  removePlace: 'Yeri kaldır',
  approxZone: 'Yaklaşık bölge',
  postingFromZone: 'Yaklaşık bölgenden paylaşılıyor',
  removeMyLocation: 'Konumumu kaldır',
  removeMentions_one: 'Bahsetmeyi kaldır',
  removeMentions_other: 'Bahsetmeleri kaldır',
  signInToMention: 'ËContact kişilerinden bahsetmek için Weë\'ye giriş yap.',
  profileNoAgenda: 'Bu profilde ËContact listesi yok. Birinden bahsetmek için Gerçek profile ya da Weë profiline geç.',
  noContactsYet: 'Henüz {{lista}} listende kimse yok. Birinin profilinden bağlantı kurduğunda burada görünür ve ondan bahsedebilirsin.',
  mentionAnyone: '{{lista}} listenden istediğin kişiden bahset',
  publishIn: 'Paylaşım yerleri',
  publishing: 'Paylaşılıyor…',
  publishingOverlay: 'Paylaşılıyor…',
  uploadingFiles: '{{n}}/{{total}} yükleniyor…',
  readyInAMoment: 'Gönderin birazdan hazır olacak',
  pollQuestionPlaceholder: 'Ne sormak istiyorsun?',
  pollOptionPlaceholder: 'Seçenek {{numero}}',
  pollAddOption: 'Seçenek ekle',
  pollDurationLabel: 'Anket süresi',
  pollDays_one: '{{contador}} gün',
  pollDays_other: '{{contador}} gün',
  pollErrEmptyQuestion: 'Anketinin sorusunu yaz.',
  pollErrLongQuestion: 'Soru en fazla {{maximo}} karakter olabilir.',
  pollErrFewOptions: 'Bir ankette en az {{minimo}} seçenek olmalı.',
  pollErrManyOptions: 'Bir ankette en fazla {{maximo}} seçenek olabilir.',
  pollErrEmptyOption: 'Her seçeneğe bir metin yaz.',
  pollErrLongOption: 'Bir seçenek en fazla {{maximo}} karakter olabilir.',
  pollErrDuplicateOption: 'İki seçenek aynı şeyi söylüyor.',
  pollErrInvalid: 'Bu anket geçerli değil.',
  pollErrDuration: 'Anketin ne kadar süreceğini seç.',
  pollWithVideo: 'Ankete fotoğraf eklenebilir ama video eklenemez',
  pollMaxPhotos_one: 'Ankete en fazla {{contador}} fotoğraf eklenebilir',
  pollMaxPhotos_other: 'Ankete en fazla {{contador}} fotoğraf eklenebilir',
  notAvailable: 'Kullanılamıyor',
  permissionRequired: 'İzin gerekli',
  cameraAccess: 'Kameraya erişmemiz gerekiyor.',
  galleryAccess: 'Galerine erişmemiz gerekiyor.',
  permissionsNeeded: 'İzinler gerekli',
  cameraForPhotos: 'Fotoğraf çekmek için kamerana erişmemiz gerekiyor',
  goToSettings: 'Ayarları aç',
  faceSwapFailed: 'Yüz değiştirme uygulanamadı. Yeniden dene.',
  weelTooLong: 'Weëls videosu çok uzun',
  videoTooLong: 'Video çok uzun',
  weelMaxDuration: 'Weëls videosu en fazla {{maximo}} saniye olabilir. Videonun süresi: {{duracion}}.',
  videoMaxDuration: 'Video en fazla {{maximo}} saniye olabilir. Videonun süresi: {{duracion}}.',
  seconds_one: '{{contador}} saniye',
  seconds_other: '{{contador}} saniye',
  minutes_one: '{{contador}} dakika',
  minutes_other: '{{contador}} dakika',
  noVideoWithMedia: 'Medya eklediysen video ekleyemezsin',
  noImagesWithVideo: 'Video eklediysen görsel ekleyemezsin',
  pickImagesFailed: 'Görseller seçilemedi',
  takePhotoFailed: 'Fotoğraf çekilemedi',
  mustSignIn: 'Paylaşmak için giriş yapmalısın',
  videoUploadFailed: 'Video yükleme hatası',
  imageUploadFailed: 'Görsel yükleme hatası',
  publishFailed: 'Paylaşım hatası',
  uploadErrorBody: 'Dosya yüklenemedi. Bağlantını kontrol edip yeniden dene.',
  publishErrorBody: 'Gönderin paylaşılamadı. Yeniden dene.',
  addLocation: 'Konum ekle',
  searchPlace: 'Yer, şehir veya ülke ara',
  clearSearch: 'Aramayı temizle',
  useAsTyped: 'Şunu olduğu gibi kullan: “{{texto}}”',
  asYouTypedIt: 'Yazdığın gibi',
  tagPostWithIt: 'Yazdığını gönderiye konum olarak ekler ve gönderiye döner',
  chooseThisPlace: 'Bu yeri seçer ve gönderiye döner',
  placeOption: '{{lugar}}, {{detalle}}',
  country: 'Ülke',
  placesNearYou: '📍 Yakınındaki yerler',
  placesIn: '📍 {{pais}} içindeki yerler',
  yourCountry: 'ülken',
  seeMore: 'Daha fazla göster',
  seeLess: 'Daha az göster',
  galleryForImages: 'Görsel seçmek için galerine erişmemiz gerekiyor',
  results: 'Sonuçlar',
  useAsTypedShort: 'Şunu kullan: “{{texto}}”',
  imageFetchFailed: 'Görsel alınamadı: {{estado}} {{texto}}',
  askCommunity: 'Topluluğa soru sor',
  applyingFaceSwap: 'Yüz değiştirme uygulanıyor…',
  searchPlaceHint: 'Gönderine konum eklemek için bir şehir ya da ülke ara.',
  aiProcessCreatedWith: 'Weë AI\'da {{nombre}} ile oluşturuldu',
  aiProcessDemoPreview: '{{proceso}} (demo modu önizlemesi)',
  distanceUnder: '{{distancia}} içinde',
  distanceOver: '{{distancia}} üzeri',
};
