/*
 * CHINO TRADICIONAL (TAIWÁN) — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * PERFIL REAL Y PERFIL WEË NO SE ESCRIBEN IGUAL: el real es 真實主頁, pero el otro
 * es «Weë 主頁», con la marca en alfabeto latino. Weë no se traduce ni se pasa a
 * hanzi: ni 威, ni 維, ni nada.
 *
 * VOCABULARIO DE TAIWÁN, NO CONVERSIÓN DE CARACTERES: quien usa la app es un
 * 使用者 y nunca un 用戶; se 登出 y no 退出登錄; una publicación es una 貼文; un
 * vídeo es una 影片 y nunca 視頻; dar me gusta es 按讚 y nunca 點贊; se 載入 y no
 * 加載; los permisos son para 存取 el 相簿.
 *
 * `{{nombre}}` de la agenda (ËContact/ẄContact) y `{{motivo}}` del servidor salen
 * sin tocar: no son palabras nuestras. Van entre espacios porque lo que salga de
 * ahí puede venir en alfabeto latino.
 *
 * La dirección de `websitePlaceholder` es un EJEMPLO que se lee, no la de nadie:
 * por eso sí se traduce.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: '新增封面',
  permissionsTitle: '權限',
  galleryPermission: '需要存取相簿的權限',
  coverUploadFailed: '無法上傳封面圖片',

  loading: '正在載入個人檔案…',
  loadFailed: '無法載入個人檔案',
  loadFailedDetail: '無法載入使用者資料',
  backToLogin: '回到登入頁',

  nameRequired: '名稱不能留空',
  updateFailed: '無法更新個人檔案',
  signOutFailed: '無法登出',
  noSession: '目前沒有登入的帳號',
  avatarUpdateFailed: '無法更新頭像。請再試一次。',
  imageUrlMissing: '沒有收到圖片 URL',

  shareMessage: '來 Weë 看看 {{nombre}} 的個人檔案',

  editTitle: '編輯資料',
  displayNameLabel: '顯示名稱',
  displayNamePlaceholder: '你的顯示名稱',
  bioLabel: '個人簡介',
  bioPlaceholder: '介紹一下你自己…',
  websiteLabel: '網站',
  websitePlaceholder: 'https://你的網站.com',
  charCount: '{{usados}}/{{maximo}} 個字元',

  editProfile: '編輯資料',
  createWeeProfile: '建立 Weë 個人檔案',

  posts: '貼文',
  viewMyEcontacts: '查看我的 {{nombre}}，共 {{total}} 位',

  tabMedia: '媒體',
  tabReposts: '轉發',
  tabLikes: '讚',

  loadingPosts: '正在載入貼文…',
  postsFailed: '無法載入貼文',
  retry: '重試',

  emptyPosts: '你還沒有發過貼文',
  emptyPostsHint: '發布你的第一則貼文吧！',
  emptyMedia: '你還沒有帶圖片或影片的貼文',
  emptyMediaHint: '發一則帶照片或影片的貼文',
  emptyReposts: '你還沒有轉發過內容',
  emptyRepostsHint: '把別人的內容分享出去',
  emptyLikes: '你還沒有按讚過任何貼文',
  emptyLikesHint: '看到喜歡的貼文就按個讚吧',
  otherTitle: '個人檔案',
  otherLoadFailed: '無法載入個人檔案',
  seeFullProfile: '查看我的完整個人檔案',
  emptyCategory: '這個分類下還沒有貼文',
  actionFailed: '無法完成這個操作',
};
