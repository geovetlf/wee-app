/*
 * NORUEGO BOKMÅL — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El motivo que dé el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Velg avatar',

  aiSection: 'Menneskelig KI-avatar',
  aiTitle: 'Lag min menneskelige avatar',
  aiSubtitle: 'Generer et fiktivt ansikt med KI',

  photoSection: 'Eget bilde',
  takePhoto: 'Ta bilde',
  pickImage: 'Velg bilde',
  fromGallery: 'Fra galleriet',

  avatarsSection: 'Avatarer',
  processing: 'Behandler bilde…',

  galleryPermission: 'Vi trenger tilgang til galleriet ditt for å velge et bilde',
  cameraPermission: 'Vi trenger tilgang til kameraet ditt for å ta et bilde',
  pickFailed: 'Kunne ikke velge bildet. Prøv igjen.',
  photoFailed: 'Kunne ikke ta bildet',
  styleAdventurer: 'Eventyrer',
  styleRobots: 'Roboter',
  styleSmile: 'Smil',
  stylePeople: 'Personer',
};
