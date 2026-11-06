/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — Lo que contestan las Functions sociales: ËContact y encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana. Una petición de conexión es un «pedido» y una encuesta, una «sondagem».
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Não há nenhum pedido para aceitar.',
  ecRelacionInvalida: 'Este pedido não é válido.',
  ecNoLaRecibiste: 'Só quem recebeu o pedido o pode aceitar.',
  ecYaSonContactos: 'Já são ËContacts.',
  ecIdentidadInvalida: 'Esse perfil não é válido.',
  ecIdentidadDesconocida: 'Esse perfil não existe.',
  ecIdentidadAjena: 'Esse perfil não é teu.',
  ecMismaPersona: 'Não te podes ligar ao teu próprio perfil.',
  ecYaExiste: 'Já existe uma ligação com este perfil.',
  ecIniciaSesion: 'Inicia sessão para usares o ËContact.',
  ecNoSeCompleto: 'Não foi possível concluir a operação. Tenta de novo.',
  ecFaltaPerfilPropio: 'Falta indicar com que perfil te ligas.',
  ecFaltaPerfilAjeno: 'Falta o perfil a que te queres ligar.',
  ecFaltaPerfilQueAcepta: 'Falta indicar com que perfil aceitas.',
  ecFaltaPerfilQueEnvia: 'Falta o perfil de quem enviou o pedido.',
  encSinEncuesta: 'Esta publicação não tem sondagem.',
  encInvalida: 'Esta sondagem não é válida.',
  encAntigua: 'Esta sondagem é de uma versão anterior do Weë e já não aceita votos.',
  encOpcionInexistente: 'Essa opção não existe nesta sondagem.',
  encCerrada: 'Esta sondagem já terminou.',
  encYaVotaste: 'Já votaste nesta sondagem.',
  encPostNoExiste: 'Esta publicação já não existe.',
  encIniciaSesion: 'Inicia sessão para votares.',
  encFaltaPublicacion: 'Falta a publicação.',
  encFaltaOpcion: 'Falta a opção.',
  encNoSeRegistro: 'Não foi possível registar o teu voto. Tenta de novo.',
};
