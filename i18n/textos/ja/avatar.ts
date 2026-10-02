/*
 * JAPONÉS — el selector de avatar, el mismo en las cuatro pantallas que lo abren.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar Humano IA» es AIヒューマンアバター, igual que en aiAvatar. «Galería» es 写真ライブラリ (glosario § 10.7).
 * photoFailed dice lo mismo que composer.takePhotoFailed, y con la misma forma: los dos son el mismo aviso.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'アバターを選択',

  aiSection: 'AIヒューマンアバター',
  aiTitle: 'ヒューマンアバターを作成',
  aiSubtitle: 'AIで架空の顔を生成',

  photoSection: '自分の写真',
  takePhoto: '写真を撮る',
  pickImage: '画像を選択',
  fromGallery: '写真ライブラリから選択',

  avatarsSection: 'アバター',
  processing: '画像を処理中…',

  galleryPermission: '写真を選ぶには、写真ライブラリへのアクセスを許可してください。',
  cameraPermission: '写真を撮るには、カメラへのアクセスを許可してください。',
  pickFailed: '画像を選択できませんでした。もう一度お試しください。',
  photoFailed: '写真を撮影できませんでした',
  styleAdventurer: '冒険者',
  styleRobots: 'ロボット',
  styleSmile: '笑顔',
  stylePeople: '人物',
};
