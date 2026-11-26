/*
 * FRANCÉS — Lo que contestan las Functions sociales: ËContact y encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Il n’y a aucune demande à accepter.',
  ecRelacionInvalida: 'Cette demande n’est pas valide.',
  ecNoLaRecibiste: 'Seule la personne qui a reçu la demande peut l’accepter.',
  ecYaSonContactos: 'Vous êtes déjà ËContacts.',
  ecIdentidadInvalida: 'Ce profil n’est pas valide.',
  ecIdentidadDesconocida: 'Ce profil n’existe pas.',
  ecIdentidadAjena: 'Ce profil n’est pas à toi.',
  ecMismaPersona: 'Tu ne peux pas te connecter à ton propre profil.',
  ecYaExiste: 'Il existe déjà une relation avec ce profil.',
  ecIniciaSesion: 'Connecte-toi pour utiliser ËContact.',
  ecNoSeCompleto: 'L’opération n’a pas pu aboutir. Réessaie.',
  ecFaltaPerfilPropio: 'Il manque le profil avec lequel tu te connectes.',
  ecFaltaPerfilAjeno: 'Il manque le profil auquel te connecter.',
  ecFaltaPerfilQueAcepta: 'Il manque le profil avec lequel tu acceptes.',
  ecFaltaPerfilQueEnvia: 'Il manque le profil de la personne qui te l’a envoyée.',
  encSinEncuesta: 'Cette publication n’a pas de sondage.',
  encInvalida: 'Ce sondage n’est pas valide.',
  encAntigua: 'Ce sondage date d’une version antérieure de Weë et n’accepte plus de votes.',
  encOpcionInexistente: 'Cette option n’existe pas dans ce sondage.',
  encCerrada: 'Ce sondage est terminé.',
  encYaVotaste: 'Tu as déjà voté à ce sondage.',
  encPostNoExiste: 'Cette publication n’existe plus.',
  encIniciaSesion: 'Tu dois te connecter pour voter.',
  encFaltaPublicacion: 'Il manque la publication.',
  encFaltaOpcion: 'Il manque l’option.',
  encNoSeRegistro: 'Ton vote n’a pas pu être enregistré. Réessaie.',
};
