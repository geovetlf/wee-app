/*
 * RUMANO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El motivo que dé el sistema cuando la galería falla llega por {{motivo}} y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Alege un avatar',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Avatar uman cu IA',
  aiTitle: 'Creează-mi avatarul uman',
  aiSubtitle: 'Generează un chip fictiv cu IA',

  photoSection: 'Fotografie personalizată',
  takePhoto: 'Fă o fotografie',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Alege o imagine',
  fromGallery: 'Din galerie',

  avatarsSection: 'Avataruri',
  processing: 'Se procesează imaginea...',

  galleryPermission: 'Avem nevoie de acces la galeria ta pentru a alege o fotografie',
  cameraPermission: 'Avem nevoie de acces la camera ta pentru a face o fotografie',
  pickFailed: 'Imaginea nu a putut fi aleasă. Încearcă din nou.',
  photoFailed: 'Fotografia nu a putut fi făcută',
  styleAdventurer: 'Aventurier',
  styleRobots: 'Roboți',
  styleSmile: 'Zâmbet',
  stylePeople: 'Persoane',
};
