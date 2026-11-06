/*
 * IRLANDÉS — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El motivo que dé el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Roghnaigh abhatár',

  aiSection: 'Abhatár daonna IS',
  aiTitle: 'Cruthaigh m\'abhatár daonna',
  aiSubtitle: 'Gin aghaidh fhicseanúil le hIS',

  photoSection: 'Grianghraf saincheaptha',
  takePhoto: 'Tóg grianghraf',
  pickImage: 'Roghnaigh íomhá',
  fromGallery: 'Ón ngailearaí',

  avatarsSection: 'Abhatáir',
  processing: 'Ag próiseáil na híomhá...',

  galleryPermission: 'Teastaíonn rochtain ar do ghailearaí uainn chun grianghraf a roghnú',
  cameraPermission: 'Teastaíonn rochtain ar do cheamara uainn chun grianghraf a thógáil',
  pickFailed: 'Níorbh fhéidir an íomhá a roghnú. Bain triail eile as.',
  photoFailed: 'Níorbh fhéidir an grianghraf a thógáil',
  styleAdventurer: 'Eachtránaí',
  styleRobots: 'Róbait',
  styleSmile: 'Meangadh gáire',
  stylePeople: 'Daoine',
};
