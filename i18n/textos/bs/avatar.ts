/*
 * BOSNIO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El motivo que dé el sistema cuando la galería falla llega por {{motivo}} y
 * sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Odaberi avatar',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Ljudski AI avatar',
  aiTitle: 'Kreiraj moj ljudski avatar',
  aiSubtitle: 'Generiši izmišljeno lice uz AI',

  photoSection: 'Vlastita fotografija',
  takePhoto: 'Uslikaj',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Odaberi sliku',
  fromGallery: 'Iz galerije',

  avatarsSection: 'Avatari',
  processing: 'Obrada slike...',

  galleryPermission: 'Potreban nam je pristup tvojoj galeriji da odabereš fotografiju',
  cameraPermission: 'Potreban nam je pristup tvojoj kameri da uslikaš fotografiju',
  pickFailed: 'Nismo mogli odabrati sliku. Pokušaj ponovo.',
  photoFailed: 'Nismo mogli uslikati fotografiju',
  styleAdventurer: 'Avanturist',
  styleRobots: 'Roboti',
  styleSmile: 'Osmijeh',
  stylePeople: 'Ljudi',
};
