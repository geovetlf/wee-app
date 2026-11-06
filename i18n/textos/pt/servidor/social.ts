/*
 * PORTUGUÉS (pt-BR) — Lo que contestan las Functions sociales: ËContact y encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Não há nenhuma solicitação para aceitar.',
  ecRelacionInvalida: 'Esta solicitação não é válida.',
  ecNoLaRecibiste: 'Só quem recebeu a solicitação pode aceitá-la.',
  ecYaSonContactos: 'Vocês já são ËContacts.',
  ecIdentidadInvalida: 'Esse perfil não é válido.',
  ecIdentidadDesconocida: 'Esse perfil não existe.',
  ecIdentidadAjena: 'Esse perfil não é seu.',
  ecMismaPersona: 'Não dá para se conectar com o próprio perfil.',
  ecYaExiste: 'Já existe uma relação com este perfil.',
  ecIniciaSesion: 'Entre para usar o ËContact.',
  ecNoSeCompleto: 'Não foi possível concluir a operação. Tente de novo.',
  ecFaltaPerfilPropio: 'Falta dizer com qual perfil você se conecta.',
  ecFaltaPerfilAjeno: 'Falta o perfil com o qual se conectar.',
  ecFaltaPerfilQueAcepta: 'Falta dizer com qual perfil você aceita.',
  ecFaltaPerfilQueEnvia: 'Falta o perfil de quem enviou a solicitação.',
  encSinEncuesta: 'Esta publicação não tem enquete.',
  encInvalida: 'Esta enquete não é válida.',
  encAntigua: 'Esta enquete é de uma versão anterior do Weë e não aceita mais votos.',
  encOpcionInexistente: 'Essa opção não existe nesta enquete.',
  encCerrada: 'Esta enquete já terminou.',
  encYaVotaste: 'Você já votou nesta enquete.',
  encPostNoExiste: 'Esta publicação não existe mais.',
  encIniciaSesion: 'Entre para votar.',
  encFaltaPublicacion: 'Falta a publicação.',
  encFaltaOpcion: 'Falta a opção.',
  encNoSeRegistro: 'Não foi possível registrar seu voto. Tente de novo.',
};
