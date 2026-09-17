/*
 * COREANO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체 y botones en forma nominal corta. SE ABRE DESDE CUATRO
 * PANTALLAS —el alta, el Perfil Weë, el perfil propio y el detalle de una
 * publicación— y en las cuatro dice lo mismo.
 *
 * LO QUE NO ENTRA AQUÍ: el motivo que dé el sistema cuando la galería falla,
 * que llega por `{{motivo}}` y sale sin tocar. Va detrás de dos puntos, que es
 * donde el coreano no pide partícula.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: '아바타 선택',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'AI 휴먼 아바타',
  aiTitle: '내 휴먼 아바타 만들기',
  aiSubtitle: 'AI로 가상의 얼굴을 만들어요',

  photoSection: '나만의 사진',
  takePhoto: '사진 찍기',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: '이미지 선택',
  fromGallery: '갤러리에서 선택',

  avatarsSection: '아바타',
  processing: '이미지를 처리하는 중...',

  galleryPermission: '사진을 선택하려면 갤러리 접근 권한이 필요해요',
  cameraPermission: '사진을 찍으려면 카메라 접근 권한이 필요해요',
  pickFailed: '이미지를 선택하지 못했어요: {{motivo}}',
  photoFailed: '사진을 찍지 못했어요',
};
