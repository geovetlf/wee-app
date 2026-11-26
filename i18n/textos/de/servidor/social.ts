/*
 * ALEMÁN — Lo que contestan ËContact y las encuestas cuando algo no se puede hacer (ver `../../es/servidor/social.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Es gibt keine Anfrage zum Annehmen.',
  ecRelacionInvalida: 'Diese Anfrage ist ungültig.',
  ecNoLaRecibiste: 'Nur wer die Anfrage erhalten hat, kann sie annehmen.',
  ecYaSonContactos: 'Ihr seid bereits ËContacts.',
  ecIdentidadInvalida: 'Dieses Profil ist ungültig.',
  ecIdentidadDesconocida: 'Dieses Profil existiert nicht.',
  ecIdentidadAjena: 'Dieses Profil gehört nicht dir.',
  ecMismaPersona: 'Du kannst dich nicht mit dir selbst verbinden.',
  ecYaExiste: 'Mit diesem Profil besteht bereits eine Verbindung.',
  ecIniciaSesion: 'Melde dich an, um ËContact zu nutzen.',
  ecNoSeCompleto: 'Der Vorgang konnte nicht abgeschlossen werden. Versuch es noch einmal.',
  ecFaltaPerfilPropio: 'Es fehlt das Profil, mit dem du dich verbindest.',
  ecFaltaPerfilAjeno: 'Es fehlt das Profil, mit dem du dich verbinden möchtest.',
  ecFaltaPerfilQueAcepta: 'Es fehlt das Profil, mit dem du annimmst.',
  ecFaltaPerfilQueEnvia: 'Es fehlt das Profil der Person, die dir die Anfrage geschickt hat.',
  encSinEncuesta: 'Dieser Beitrag enthält keine Umfrage.',
  encInvalida: 'Diese Umfrage ist ungültig.',
  encAntigua: 'Diese Umfrage stammt aus einer älteren Version von Weë und nimmt keine Stimmen mehr an.',
  encOpcionInexistente: 'Diese Option gibt es in dieser Umfrage nicht.',
  encCerrada: 'Diese Umfrage ist bereits beendet.',
  encYaVotaste: 'Du hast bei dieser Umfrage bereits abgestimmt.',
  encPostNoExiste: 'Diesen Beitrag gibt es nicht mehr.',
  encIniciaSesion: 'Melde dich an, um abzustimmen.',
  encFaltaPublicacion: 'Der Beitrag fehlt.',
  encFaltaOpcion: 'Die Option fehlt.',
  encNoSeRegistro: 'Deine Stimme konnte nicht gespeichert werden. Versuch es noch einmal.',
};
