/*
 * ITALIANO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El motivo que da el sistema cuando la galería
 * falla llega por `{{motivo}}` y sale sin tocar. Apóstrofo tipográfico ’ siempre:
 * un’immagine, l’IA, l’immagine.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Scegli un avatar',

  aiSection: 'Avatar umano IA',
  aiTitle: 'Crea il mio avatar umano',
  aiSubtitle: 'Genera un volto fittizio con l’IA',

  photoSection: 'Foto personalizzata',
  takePhoto: 'Scatta una foto',
  pickImage: 'Scegli un’immagine',
  fromGallery: 'Dalla galleria',

  avatarsSection: 'Avatar',
  processing: 'Elaborazione dell’immagine...',

  galleryPermission: 'Weë ha bisogno di accedere alla tua galleria per scegliere una foto',
  cameraPermission: 'Weë ha bisogno di accedere alla tua fotocamera per scattare una foto',
  pickFailed: 'Non è stato possibile selezionare l’immagine. Riprova.',
  photoFailed: 'Non è stato possibile scattare la foto',
  styleAdventurer: 'Avventuriero',
  styleRobots: 'Robot',
  styleSmile: 'Sorriso',
  stylePeople: 'Persone',
};
