/*
 * CHINO SIMPLIFICADO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * SE ABRE DESDE CUATRO PANTALLAS —el alta, el Perfil Weë, el perfil propio y el
 * detalle de una publicación— y en las cuatro dice lo mismo. Por eso tiene
 * módulo propio en vez de vivir dentro de una de ellas.
 *
 * LO QUE NO ENTRA AQUÍ: el motivo que dé el sistema cuando la galería falla,
 * que llega por `{{motivo}}` y sale sin tocar. Va detrás de dos puntos de ancho
 * completo, que separan sin espacio venga en hanzi o en alfabeto latino.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: '选择头像',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'AI 真人头像',
  aiTitle: '创建我的真人头像',
  aiSubtitle: '用 AI 生成一张虚构的脸',

  photoSection: '自定义照片',
  takePhoto: '拍照',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: '选择图片',
  fromGallery: '从相册选择',

  avatarsSection: '头像',
  processing: '正在处理图片…',

  galleryPermission: '需要访问相册才能选择照片',
  cameraPermission: '需要访问相机才能拍照',
  pickFailed: '无法选择图片。请再试一次。',
  photoFailed: '拍照失败',
  styleAdventurer: '冒险家',
  styleRobots: '机器人',
  styleSmile: '笑脸',
  stylePeople: '人物',
};
