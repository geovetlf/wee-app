/*
 * SERBIO (ћирилица) — Lo que contestan las Functions sociales (ver `../../es/servidor/social.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Нема захтева за прихватање.',
  ecRelacionInvalida: 'Овај захтев није важећи.',
  ecNoLaRecibiste: 'Захтев може да прихвати само особа која га је примила.',
  ecYaSonContactos: 'Већ сте ËContacts.',
  ecIdentidadInvalida: 'Тај профил није важећи.',
  ecIdentidadDesconocida: 'Тај профил не постоји.',
  ecIdentidadAjena: 'Тај профил није твој.',
  ecMismaPersona: 'Не можеш да се повежеш са собом.',
  ecYaExiste: 'Већ постоји веза са овим профилом.',
  ecIniciaSesion: 'Пријави се да користиш ËContact.',
  ecNoSeCompleto: 'Радња није могла да се доврши. Покушај поново.',
  ecFaltaPerfilPropio: 'Недостаје профил којим се повезујеш.',
  ecFaltaPerfilAjeno: 'Недостаје профил са којим се повезујеш.',
  ecFaltaPerfilQueAcepta: 'Недостаје профил којим прихваташ.',
  ecFaltaPerfilQueEnvia: 'Недостаје профил особе која ти га је послала.',
  encSinEncuesta: 'Ова објава нема анкету.',
  encInvalida: 'Ова анкета није важећа.',
  encAntigua: 'Ова анкета је из старије верзије апликације Weë и више не прима гласове.',
  encOpcionInexistente: 'Та опција не постоји у овој анкети.',
  encCerrada: 'Ова анкета је завршена.',
  encYaVotaste: 'Твој глас је већ забележен у овој анкети.',
  encPostNoExiste: 'Ова објава више не постоји.',
  encIniciaSesion: 'Пријави се за гласање.',
  encFaltaPublicacion: 'Недостаје објава.',
  encFaltaOpcion: 'Недостаје опција.',
  encNoSeRegistro: 'Твој глас није могао да се забележи. Покушај поново.',
};
