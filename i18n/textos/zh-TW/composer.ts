/*
 * El compositor: lo que se escribe y lo que se adjunta antes de publicar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * TAIWÁN, NO UNA CONVERSIÓN DEL SIMPLIFICADO. Lo que cambia no son los trazos
 * sino las palabras: un vídeo es «影片» (no «視頻»), la comunidad «社群», la
 * galería «相簿» (no «相冊»), la marca de agua «浮水印», entrar «登入», los
 * ajustes «設定», la conexión «連線», la red «網路», buscar «搜尋», seleccionar
 * «選取», aplicar «套用», añadir una opción «新增», lo opcional «選填» y el
 * permiso de cámara o fotos se pide para «取用», no para «訪問». Una publicación
 * se cuenta con «則». Las comillas son las de Taiwán: 「」, no “”.
 *
 * EN CHINO NO HAY PLURALES: `Intl.PluralRules('zh')` solo declara `other`, así
 * que `_one` no se lee nunca y las dos formas dicen exactamente lo mismo, con el
 * clasificador que toca: {{contador}} 天, {{contador}} 秒, {{contador}} 分鐘,
 * {{contador}} 張. `removeMentions` es la excepción: el español no dice la
 * cantidad en ninguna de sus dos formas, así que el chino tampoco la inventa y
 * el botón se queda en «移除提及».
 *
 * LAS MARCAS NO PASAN A HANZI: Weël, Wäll y ËContact se escriben igual que en
 * español, con sus diéresis. Lo técnico que los demás idiomas dejaron tal cual
 * —face swap, Firebase Storage— también se queda.
 *
 * ESPACIADO: un espacio entre hanzi y latín o cifras («最長 {{segundos}} 秒»,
 * «公共 Wäll»), ninguno entre palabras chinas, y puntuación de ancho completo.
 *
 * VOCABULARIO COMPARTIDO con el resto del chino, para que la misma cosa se llame
 * igual en todas las pantallas: una publicación es «貼文» (wall, notifications),
 * que es lo que se dice en Taiwán —el continente dice 動態—, y las dos
 * identidades son «真實個人檔案» y «Weë 個人檔案» —en Taiwán 主頁 es la página de inicio y chocaba con 首頁— (menu, profile, onboarding).
 *
 * Ojo: «動態» sigue apareciendo en `studio.optMotion` y `studio.vidMotion`, pero
 * allí significa MOVIMIENTO, no publicación, y en `settings` dentro de 最新動態,
 * que es «novedades». Son palabras distintas que se escriben igual.
 */
export const composer: typeof import('../es/composer').composer = {
  publish: '發布',
  createPost: '發布貼文',
  sharePhoto: '分享一張照片',
  photoOrVideo: '照片或影片',
  camera: '相機',
  location: '位置',
  poll: '投票',
  sheetTitle: '創作',
  sheetSubtitle: '今天想分享點什麼？',
  kindPost: '貼文',
  kindWeel: 'Weël',
  kindImage: '圖片',
  kindVideo: '影片',
  kindText: '文字',
  kindQuestion: '提問',
  needAiTool: '需要 AI 工具嗎？',
  needAiToolNote: '影片、圖片、文字、音樂等',
  econtact: 'ËContact',
  openOptions: '{{campo}} 開啟發布選項。',
  showOptions: '顯示發布選項',
  hideOptions: '隱藏發布選項',
  currentDestination: '{{destino}}，目前的發布位置',
  generalWall: '公共 Wäll',
  placeholderPollExtra: '還想補充點什麼（選填）…',
  placeholderQuestion: '想問社群什麼？',
  placeholderWeel: '說說你的 Weël 做了什麼，用了哪些 AI…',
  placeholderVideo: '說說你創作了什麼，用了哪些 AI…',
  placeholderImage: '展示你的圖片，說說是怎麼做出來的…',
  placeholderText: '分享一段文字、一個提示詞或一個想法…',
  placeholderDefault: '寫點什麼…',
  postTextLabel: '貼文內文',
  weelHint: 'Weël：最長 {{segundos}} 秒的影片。分享到 Weë 以外時，會帶上一個小小的浮水印。',
  newPost: '新貼文',
  you: '我',
  shareWithCommunity: '分享給 Weë 社群',
  publicVisibility: '公開',
  visibilityIs: '可見範圍：{{estado}}',
  publicExplain: '目前 Weë 上的貼文都是公開的。',
  profileReal: '真實個人檔案',
  profileWee: 'Weë 個人檔案',
  multimedia: '多媒體',
  actionWithBadge: '{{accion}}，{{insignia}}',
  removeVideo: '移除影片',
  removePhotoNumber: '移除第 {{numero}} 張照片',
  addMoreMedia: '再加入照片或影片',
  addMoreMediaLabel: '再加入照片或影片，已選 {{puestas}}/{{tope}}',
  placeIs: '地點：{{lugar}}',
  removePlace: '移除地點',
  approxZone: '大致區域',
  postingFromZone: '正在從你的大致區域發布',
  removeMyLocation: '移除我的位置',
  removeMentions_one: '移除提及',
  removeMentions_other: '移除提及',
  signInToMention: '登入 Weë 才能提及你的 ËContact。',
  bizNoAgenda: 'Biz 個人檔案沒有 ËContact 通訊錄。切換到真實個人檔案或 Weë 個人檔案就能提及別人。',
  noContactsYet: '你還沒有 {{lista}}。在別人的個人檔案上建立連結後，對方就會出現在這裡，可以直接提及。',
  mentionAnyone: '從你的 {{lista}} 裡提及任何人',
  publishIn: '發布到',
  publishing: '正在發布…',
  publishingOverlay: '正在發布…',
  uploadingVideo: '正在上傳影片：{{porcentaje}}%',
  readyInAMoment: '你的貼文馬上就好',
  pollQuestionPlaceholder: '想問什麼？',
  pollOptionPlaceholder: '選項 {{numero}}',
  pollAddOption: '新增選項',
  pollDurationLabel: '投票時長',
  pollDays_one: '{{contador}} 天',
  pollDays_other: '{{contador}} 天',
  pollErrEmptyQuestion: '寫下你的投票問題。',
  pollErrLongQuestion: '問題不能超過 {{maximo}} 個字。',
  pollErrFewOptions: '一個投票至少需要 {{minimo}} 個選項。',
  pollErrManyOptions: '一個投票最多只能有 {{maximo}} 個選項。',
  pollErrEmptyOption: '每個選項都要寫點內容。',
  pollErrLongOption: '選項不能超過 {{maximo}} 個字。',
  pollErrDuplicateOption: '有兩個選項寫的是同一件事。',
  pollErrInvalid: '這個投票無效。',
  pollErrDuration: '選一下投票要持續多久。',
  pollWithVideo: '投票可以配一張照片，但不能配影片',
  pollMaxPhotos_one: '投票最多只能配 {{contador}} 張照片',
  pollMaxPhotos_other: '投票最多只能配 {{contador}} 張照片',
  notAvailable: '暫不開放',
  permissionRequired: '需要權限',
  cameraAccess: '我們需要取用相機的權限。',
  galleryAccess: '我們需要取用相簿的權限。',
  permissionsNeeded: '需要開啟權限',
  cameraForPhotos: '要拍照，我們需要取用你的相機',
  goToSettings: '前往設定',
  faceSwapFailed: '沒能套用 face swap，請再試一次。',
  weelTooLong: 'Weël 太長了',
  videoTooLong: '影片太長了',
  weelMaxDuration: '一個 Weël 最長 {{maximo}} 秒。你的影片有 {{duracion}}。',
  videoMaxDuration: '影片最長 {{maximo}} 秒。你的影片有 {{duracion}}。',
  seconds_one: '{{contador}} 秒',
  seconds_other: '{{contador}} 秒',
  minutes_one: '{{contador}} 分鐘',
  minutes_other: '{{contador}} 分鐘',
  noVideoWithMedia: '已經加了媒體，就不能再加影片了',
  noImagesWithVideo: '已經加了影片，就不能再加圖片了',
  pickImagesFailed: '沒能選取圖片',
  takePhotoFailed: '沒能拍下照片',
  mustSignIn: '登入之後才能發布',
  videoUploadFailed: '影片上傳失敗',
  imageUploadFailed: '圖片上傳失敗',
  publishFailed: '發布失敗',
  unknownError: '不明的錯誤',
  uploadErrorBody: '錯誤：{{detalle}}\n\n請檢查：\n• 網路是否正常連線\n• Firebase Storage 是否已設定\n• Storage 規則是否允許寫入',
  publishErrorBody: '貼文沒能發布。\n\n錯誤：{{detalle}}\n\n請再試一次。',
  addLocation: '新增地點',
  searchPlace: '搜尋地點、城市或國家',
  clearSearch: '清除搜尋內容',
  useAsTyped: '直接使用「{{texto}}」',
  asYouTypedIt: '和你輸入的一模一樣',
  tagPostWithIt: '用你輸入的內容標記這則貼文，然後返回',
  chooseThisPlace: '選好這個地點，回到貼文',
  placeOption: '{{lugar}}，{{detalle}}',
  country: '國家',
  placesNearYou: '📍 附近的地點',
  placesIn: '📍 {{pais}} 的地點',
  yourCountry: '你所在的國家',
  seeMore: '查看更多',
  seeLess: '收合',
  galleryForImages: '要選取圖片，我們需要取用你的相簿',
  results: '搜尋結果',
  useAsTypedShort: '使用「{{texto}}」',
  imageFetchFailed: '取得圖片時發生錯誤：{{estado}} {{texto}}',
  askCommunity: '向社群提問',
  applyingFaceSwap: '正在套用 face swap…',
  searchPlaceHint: '搜尋一座城市或一個國家，為你的貼文加上地點。',
};
