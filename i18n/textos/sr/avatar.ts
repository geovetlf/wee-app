/*
 * SERBIO (ћирилица) — el selector de avatar, que es el mismo en cuatro pantallas.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «IA» se escribe «AI», como la sigla que usa la interfaz serbia junto a nombres.
 * El motivo que dé el sistema cuando la galería falla llega por {{motivo}} y
 * sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Изабери аватар',

  aiSection: 'AI људски аватар',
  aiTitle: 'Креирај мој људски аватар',
  aiSubtitle: 'Генериши измишљено лице уз AI',

  photoSection: 'Сопствена фотографија',
  takePhoto: 'Сними фотографију',
  pickImage: 'Изабери слику',
  fromGallery: 'Из галерије',

  avatarsSection: 'Аватари',
  processing: 'Обрада слике...',

  galleryPermission: 'Потребан нам је приступ твојој галерији да изабереш фотографију',
  cameraPermission: 'Потребан нам је приступ твојој камери да снимиш фотографију',
  pickFailed: 'Није било могуће изабрати слику. Покушај поново.',
  photoFailed: 'Фотографија није могла да се сними',
  styleAdventurer: 'Авантуриста',
  styleRobots: 'Роботи',
  styleSmile: 'Осмех',
  stylePeople: 'Људи',
};
