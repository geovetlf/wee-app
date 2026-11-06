/*
 * El selector de avatar en montenegrino (ijekaviano, latino), el mismo en cuatro pantallas.
 * El motivo del sistema cuando la galería falla llega por {{motivo}} y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Izaberi avatar',

  aiSection: 'AI ljudski avatar',
  aiTitle: 'Kreiraj moj ljudski avatar',
  aiSubtitle: 'Generiši izmišljeno lice uz AI',

  photoSection: 'Sopstvena fotografija',
  takePhoto: 'Snimi fotografiju',
  pickImage: 'Izaberi sliku',
  fromGallery: 'Iz galerije',

  avatarsSection: 'Avatari',
  processing: 'Obrada slike...',

  galleryPermission: 'Potreban nam je pristup tvojoj galeriji da izabereš fotografiju',
  cameraPermission: 'Potreban nam je pristup tvojoj kameri da snimiš fotografiju',
  pickFailed: 'Slika nije mogla da se izabere. Pokušaj ponovo.',
  photoFailed: 'Fotografija nije mogla da se snimi',
  styleAdventurer: 'Avanturista',
  styleRobots: 'Roboti',
  styleSmile: 'Osmijeh',
  stylePeople: 'Ljudi',
};
