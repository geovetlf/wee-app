/*
 * FINÉS — El selector de avatar, el mismo en cuatro pantallas. Tipado contra el
 * español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar» es préstamo asentado en finés (avatar, avatarit). El motivo que dé
 * el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Valitse avatar',

  aiSection: 'Ihmisavatar tekoälyllä',
  aiTitle: 'Luo oma ihmisavatar',
  aiSubtitle: 'Luo kuvitteelliset kasvot tekoälyllä',

  photoSection: 'Oma kuva',
  takePhoto: 'Ota kuva',
  pickImage: 'Valitse kuva',
  fromGallery: 'Galleriasta',

  avatarsSection: 'Avatarit',
  processing: 'Käsitellään kuvaa...',

  galleryPermission: 'Tarvitsemme pääsyn galleriaasi, jotta voit valita kuvan',
  cameraPermission: 'Tarvitsemme pääsyn kameraasi, jotta voit ottaa kuvan',
  pickFailed: 'Kuvaa ei voitu valita. Yritä uudelleen.',
  photoFailed: 'Kuvaa ei voitu ottaa',
  styleAdventurer: 'Seikkailija',
  styleRobots: 'Robotit',
  styleSmile: 'Hymy',
  stylePeople: 'Ihmiset',
};
