/*
 * ENGLISH — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las encuestas. Ver
 * `../../es/servidor/social.ts`. «ËContact» es marca y no se traduce.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'There’s no request to accept.',
  ecRelacionInvalida: 'This request isn’t valid.',
  ecNoLaRecibiste: 'Only the person who received the request can accept it.',
  ecYaSonContactos: 'You’re already ËContacts.',
  ecIdentidadInvalida: 'That profile isn’t valid.',
  ecIdentidadDesconocida: 'That profile doesn’t exist.',
  ecIdentidadAjena: 'That profile isn’t yours.',
  ecMismaPersona: 'You can’t connect with yourself.',
  ecYaExiste: 'There’s already a connection with this profile.',
  ecIniciaSesion: 'Sign in to use ËContact.',
  ecNoSeCompleto: 'The operation couldn’t be completed. Please try again.',
  ecFaltaPerfilPropio: 'The profile you’re connecting from is missing.',
  ecFaltaPerfilAjeno: 'The profile to connect with is missing.',
  ecFaltaPerfilQueAcepta: 'The profile you’re accepting with is missing.',
  ecFaltaPerfilQueEnvia: 'The profile of the person who sent it is missing.',
  encSinEncuesta: 'This post doesn’t have a poll.',
  encInvalida: 'This poll isn’t valid.',
  encAntigua: 'This poll is from an earlier version of Weë and no longer accepts votes.',
  encOpcionInexistente: 'That option doesn’t exist in this poll.',
  encCerrada: 'This poll has ended.',
  encYaVotaste: 'You’ve already voted in this poll.',
  encPostNoExiste: 'This post no longer exists.',
  encIniciaSesion: 'You need to sign in to vote.',
  encFaltaPublicacion: 'The post is missing.',
  encFaltaOpcion: 'The option is missing.',
  encNoSeRegistro: 'Your vote couldn’t be registered. Please try again.',
};
