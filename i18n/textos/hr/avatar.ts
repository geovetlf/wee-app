/*
 * El selector de avatar en croata, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»), imperativo de segunda persona en los botones. El motivo que
 * dé el sistema cuando la galería falla llega por {{motivo}} y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Odaberi avatar',

  aiSection: 'Ljudski AI avatar',
  aiTitle: 'Stvori moj ljudski avatar',
  aiSubtitle: 'Generiraj izmišljeno lice uz pomoć AI-ja',

  photoSection: 'Vlastita fotografija',
  takePhoto: 'Snimi fotografiju',
  pickImage: 'Odaberi sliku',
  fromGallery: 'Iz galerije',

  avatarsSection: 'Avatari',
  processing: 'Obrada slike...',

  galleryPermission: 'Trebamo pristup tvojoj galeriji da odabereš fotografiju',
  cameraPermission: 'Trebamo pristup tvojoj kameri da snimiš fotografiju',
  pickFailed: 'Sliku nije bilo moguće odabrati. Pokušaj ponovno.',
  photoFailed: 'Fotografiju nije bilo moguće snimiti',
  styleAdventurer: 'Pustolov',
  styleRobots: 'Roboti',
  styleSmile: 'Osmijeh',
  stylePeople: 'Ljudi',
};
