/*
 * ALEMÁN SUIZO (de-CH) — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Variante del alemán base (de/avatar.ts). Aquí el alemán base no tiene ß, comillas
 * ni léxico que cambie en Suiza, así que las frases son las mismas. El motivo que
 * da el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Avatar auswählen',

  aiSection: 'Menschlicher KI-Avatar',
  aiTitle: 'Meinen menschlichen Avatar erstellen',
  aiSubtitle: 'Erzeuge ein fiktives Gesicht mit KI',

  photoSection: 'Eigenes Foto',
  takePhoto: 'Foto aufnehmen',
  pickImage: 'Bild auswählen',
  fromGallery: 'Aus der Galerie',

  avatarsSection: 'Avatare',
  processing: 'Bild wird verarbeitet...',

  galleryPermission: 'Weë braucht Zugriff auf deine Galerie, um ein Foto auszuwählen',
  cameraPermission: 'Weë braucht Zugriff auf deine Kamera, um ein Foto aufzunehmen',
  pickFailed: 'Das Bild konnte nicht ausgewählt werden. Versuch es noch einmal.',
  photoFailed: 'Das Foto konnte nicht aufgenommen werden',
  styleAdventurer: 'Abenteurer',
  styleRobots: 'Roboter',
  styleSmile: 'Lächeln',
  stylePeople: 'Menschen',
};
