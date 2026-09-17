/*
 * RUSO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato con «вы» en minúscula, y los permisos en impersonal («Нужен доступ…»),
 * que es como los pide el ruso de producto. El motivo que da el sistema llega
 * por `{{motivo}}` y sale sin tocar: lo escribió el teléfono, no Weë.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Выбор аватара',
  aiSection: 'Человеческий аватар с ИИ',
  aiTitle: 'Создать человеческий аватар',
  aiSubtitle: 'Сгенерируйте вымышленное лицо с помощью ИИ',
  photoSection: 'Своё фото',
  takePhoto: 'Сделать фото',
  pickImage: 'Выбрать изображение',
  fromGallery: 'Из галереи',
  avatarsSection: 'Аватары',
  processing: 'Обработка изображения...',
  galleryPermission: 'Нужен доступ к галерее, чтобы выбрать фото',
  cameraPermission: 'Нужен доступ к камере, чтобы сделать фото',
  pickFailed: 'Не удалось выбрать изображение: {{motivo}}',
  photoFailed: 'Не удалось сделать фото',
};
