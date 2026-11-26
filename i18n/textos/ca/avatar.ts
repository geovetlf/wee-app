/*
 * CATALÁN — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El motivo que dé el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Selecciona un avatar',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Avatar humà amb IA',
  aiTitle: 'Crea el meu avatar humà',
  aiSubtitle: 'Genera un rostre fictici amb IA',

  photoSection: 'Foto personalitzada',
  takePhoto: 'Fes una foto',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Selecciona una imatge',
  fromGallery: 'Des de la galeria',

  avatarsSection: 'Avatars',
  processing: 'S\'està processant la imatge...',

  galleryPermission: 'Necessitem accés a la galeria per seleccionar una foto',
  cameraPermission: 'Necessitem accés a la càmera per fer una foto',
  pickFailed: 'No s\'ha pogut seleccionar la imatge. Torna-ho a provar.',
  photoFailed: 'No s\'ha pogut fer la foto',
  styleAdventurer: 'Aventurer',
  styleRobots: 'Robots',
  styleSmile: 'Somriure',
  stylePeople: 'Persones',
};
