/*
 * El compositor: lo que se escribe y lo que se adjunta antes de publicar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const composer: typeof import('../es/composer').composer = {
  publish: 'Post',
  createPost: 'Create a post',
  sharePhoto: 'Share a photo',
  photoOrVideo: 'Photo or video',
  camera: 'Camera',
  location: 'Location',
  poll: 'Poll',
  remove: 'Remove',
  change: 'Change',
};
