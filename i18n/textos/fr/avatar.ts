/*
 * FRANCÉS — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El motivo que da el sistema cuando la galería
 * falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Choisir un avatar',

  aiSection: 'Avatar humain IA',
  aiTitle: 'Créer mon avatar humain',
  aiSubtitle: 'Génère un visage fictif avec l’IA',

  photoSection: 'Ta propre photo',
  takePhoto: 'Prendre une photo',
  pickImage: 'Choisir une image',
  fromGallery: 'Depuis la galerie',

  avatarsSection: 'Avatars',
  processing: 'Traitement de l’image...',

  galleryPermission: 'Weë a besoin d’accéder à ta galerie pour choisir une photo',
  cameraPermission: 'Weë a besoin d’accéder à ton appareil photo pour prendre une photo',
  pickFailed: 'L’image n’a pas pu être sélectionnée. Réessaie.',
  photoFailed: 'La photo n’a pas pu être prise',
  styleAdventurer: 'Aventurier',
  styleRobots: 'Robots',
  styleSmile: 'Sourire',
  stylePeople: 'Personnes',
};
