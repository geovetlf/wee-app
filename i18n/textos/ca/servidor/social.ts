/*
 * CATALÁN — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * `ecMismaPersona` habla del perfil para no marcar el género de quien lee («amb tu mateix/mateixa»).
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'No hi ha cap sol·licitud per acceptar.',
  ecRelacionInvalida: 'Aquesta sol·licitud no és vàlida.',
  ecNoLaRecibiste: 'Només pot acceptar qui ha rebut la sol·licitud.',
  ecYaSonContactos: 'Ja sou ËContacts.',
  ecIdentidadInvalida: 'Aquest perfil no és vàlid.',
  ecIdentidadDesconocida: 'Aquest perfil no existeix.',
  ecIdentidadAjena: 'Aquest perfil no és teu.',
  ecMismaPersona: 'No et pots connectar amb el teu propi perfil.',
  ecYaExiste: 'Ja hi ha una relació amb aquest perfil.',
  ecIniciaSesion: 'Inicia la sessió per fer servir ËContact.',
  ecNoSeCompleto: 'No s\'ha pogut completar l\'operació. Torna-ho a provar.',
  ecFaltaPerfilPropio: 'Falta amb quin perfil et connectes.',
  ecFaltaPerfilAjeno: 'Falta el perfil amb què et vols connectar.',
  ecFaltaPerfilQueAcepta: 'Falta amb quin perfil acceptes.',
  ecFaltaPerfilQueEnvia: 'Falta el perfil de qui te l\'ha enviada.',
  encSinEncuesta: 'Aquesta publicació no té enquesta.',
  encInvalida: 'Aquesta enquesta no és vàlida.',
  encAntigua: 'Aquesta enquesta és d\'una versió anterior de Weë i ja no admet vots.',
  encOpcionInexistente: 'Aquesta opció no existeix en aquesta enquesta.',
  encCerrada: 'Aquesta enquesta ja ha finalitzat.',
  encYaVotaste: 'Ja has votat en aquesta enquesta.',
  encPostNoExiste: 'Aquesta publicació ja no existeix.',
  encIniciaSesion: 'Has d\'iniciar la sessió per votar.',
  encFaltaPublicacion: 'Falta la publicació.',
  encFaltaOpcion: 'Falta l\'opció.',
  encNoSeRegistro: 'No s\'ha pogut registrar el teu vot. Torna-ho a provar.',
};
