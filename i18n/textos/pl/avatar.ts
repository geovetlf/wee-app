/*
 * POLACO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar» es «awatar» (con w, como manda la ortografía polaca). El motivo que
 * dé el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Wybierz awatar',

  aiSection: 'Ludzki awatar AI',
  aiTitle: 'Utwórz swój ludzki awatar',
  aiSubtitle: 'Wygeneruj fikcyjną twarz z pomocą AI',

  photoSection: 'Własne zdjęcie',
  takePhoto: 'Zrób zdjęcie',
  pickImage: 'Wybierz obraz',
  fromGallery: 'Z galerii',

  avatarsSection: 'Awatary',
  processing: 'Przetwarzanie obrazu...',

  galleryPermission: 'Potrzebujemy dostępu do twojej galerii, aby wybrać zdjęcie',
  cameraPermission: 'Potrzebujemy dostępu do twojego aparatu, aby zrobić zdjęcie',
  pickFailed: 'Nie udało się wybrać obrazu. Spróbuj ponownie.',
  photoFailed: 'Nie udało się zrobić zdjęcia',
  styleAdventurer: 'Poszukiwacz przygód',
  styleRobots: 'Roboty',
  styleSmile: 'Uśmiech',
  stylePeople: 'Ludzie',
};
