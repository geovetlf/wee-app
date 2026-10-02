/*
 * ESPAÑOL — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact
 * (`functions/src/social/econtact.ts`, `MENSAJES` y los demás `HttpsError`) y las encuestas
 * (`functions/src/social/polls.ts`). La app enseñaba `error.message` tal cual; ahora reconoce la frase del servidor y la
 * pinta en el idioma de quien mira. Son EXACTAMENTE las del servidor.
 */
export const social = {
  ecSinRelacion: 'No hay ninguna solicitud que aceptar.',
  ecRelacionInvalida: 'Esta solicitud no es válida.',
  ecNoLaRecibiste: 'Solo puede aceptar quien recibió la solicitud.',
  ecYaSonContactos: 'Ya sois ËContacts.',
  ecIdentidadInvalida: 'Ese perfil no es válido.',
  ecIdentidadDesconocida: 'Ese perfil no existe.',
  ecIdentidadAjena: 'Ese perfil no es tuyo.',
  ecMismaPersona: 'No puedes conectar contigo misma.',
  ecYaExiste: 'Ya hay una relación con este perfil.',
  ecIniciaSesion: 'Inicia sesión para usar ËContact.',
  ecNoSeCompleto: 'No se pudo completar la operación. Inténtalo de nuevo.',
  ecFaltaPerfilPropio: 'Falta con qué perfil conectas.',
  ecFaltaPerfilAjeno: 'Falta el perfil con el que conectar.',
  ecFaltaPerfilQueAcepta: 'Falta con qué perfil aceptas.',
  ecFaltaPerfilQueEnvia: 'Falta el perfil de quien te la envió.',
  encSinEncuesta: 'Esta publicación no tiene encuesta.',
  encInvalida: 'Esta encuesta no es válida.',
  encAntigua: 'Esta encuesta es de una versión anterior de Weë y ya no admite votos.',
  encOpcionInexistente: 'Esa opción no existe en esta encuesta.',
  encCerrada: 'Esta encuesta ya ha finalizado.',
  encYaVotaste: 'Ya has votado en esta encuesta.',
  encPostNoExiste: 'Esta publicación ya no existe.',
  encIniciaSesion: 'Debes iniciar sesión para votar.',
  encFaltaPublicacion: 'Falta la publicación.',
  encFaltaOpcion: 'Falta la opción.',
  encNoSeRegistro: 'No se pudo registrar tu voto. Inténtalo de nuevo.',
};
