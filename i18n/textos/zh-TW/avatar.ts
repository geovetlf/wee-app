/*
 * CHINO TRADICIONAL (TAIWÁN) — el selector de avatar, que es el mismo en cuatro
 * sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * SE ABRE DESDE CUATRO PANTALLAS —el alta, el Perfil Weë, el perfil propio y el
 * detalle de una publicación— y en las cuatro dice lo mismo. Por eso tiene
 * módulo propio en vez de vivir dentro de una de ellas.
 *
 * Vocabulario de Taiwán: el álbum del teléfono es 相簿 —no 相冊—, entrar en él
 * es 存取 —no 訪問—, «personalizada» es 自訂 —no 自定義— y crear es 建立 —no
 * 創建—.
 *
 * LO QUE NO ENTRA AQUÍ: el motivo que dé el sistema cuando la galería falla,
 * que llega por `{{motivo}}` y sale sin tocar. Va detrás de dos puntos de ancho
 * completo, que separan sin espacio venga en hanzi o en alfabeto latino.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: '選擇頭像',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'AI 真人頭像',
  aiTitle: '建立我的真人頭像',
  aiSubtitle: '用 AI 生成一張虛構的臉',

  photoSection: '自訂照片',
  takePhoto: '拍照',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: '選擇圖片',
  fromGallery: '從相簿選擇',

  avatarsSection: '頭像',
  processing: '正在處理圖片…',

  galleryPermission: '需要存取相簿才能選擇照片',
  cameraPermission: '需要存取相機才能拍照',
  pickFailed: '無法選擇圖片：{{motivo}}',
  photoFailed: '拍照失敗',
};
