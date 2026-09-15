/*
 * El selector de avatar, que es el mismo en cuatro sitios.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * SE ABRE DESDE CUATRO PANTALLAS —el alta, el Perfil Weë, el perfil propio y el
 * detalle de una publicación— y en las cuatro dice lo mismo. Por eso tiene
 * módulo propio en vez de vivir dentro de una de ellas.
 *
 * LO QUE NO ENTRA AQUÍ: el motivo que dé el sistema cuando la galería falla,
 * que llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar = {
  title: 'Seleccionar Avatar',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Avatar Humano IA',
  aiTitle: 'Crear mi avatar humano',
  aiSubtitle: 'Genera un rostro ficticio con IA',

  photoSection: 'Foto personalizada',
  takePhoto: 'Tomar foto',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Seleccionar imagen',
  fromGallery: 'Desde galería',

  avatarsSection: 'Avatares',
  processing: 'Procesando imagen...',

  galleryPermission: 'Necesitamos acceso a tu galería para seleccionar una foto',
  cameraPermission: 'Necesitamos acceso a tu cámara para tomar una foto',
  pickFailed: 'No se pudo seleccionar la imagen: {{motivo}}',
  photoFailed: 'No se pudo tomar la foto',
};
