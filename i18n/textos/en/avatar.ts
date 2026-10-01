/*
 * ENGLISH — el selector de avatar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Choose an avatar',

  aiSection: 'AI human avatar',
  aiTitle: 'Create my human avatar',
  aiSubtitle: 'Generate a fictional face with AI',

  photoSection: 'Your own photo',
  takePhoto: 'Take a photo',
  pickImage: 'Choose an image',
  fromGallery: 'From gallery',

  avatarsSection: 'Avatars',
  processing: 'Processing image...',

  galleryPermission: 'Weë needs access to your gallery to pick a photo',
  cameraPermission: 'Weë needs access to your camera to take a photo',
  pickFailed: 'The image could not be selected. Please try again.',
  photoFailed: 'The photo could not be taken',
  styleAdventurer: 'Adventurer',
  styleRobots: 'Robots',
  styleSmile: 'Big smile',
  stylePeople: 'People',
};
