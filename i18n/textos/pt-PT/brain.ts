/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`.
 *
 * Portugués de PORTUGAL: trato de «tu», pronombres pegados al verbo
 * («Restam-te…») y «Definições» en vez de «Configurações».
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'O teu assistente inteligente para tudo',
  slogan: 'Imagina · Pergunta · Cria · Conecta',
  description: 'Todo o poder de Weë, numa só conversa.',
  systemLabel: 'Weë Brain, ligado às outras secções de Weë AI',
  goTo: 'Ir para {{seccion}}',
  placeholder: 'Escreve aqui a tua mensagem...',
  settingsHint: 'Como queres que te responda.',
  searchGroup: 'Pesquisar na internet',
  imageLabel: 'Imagem',
  settingsLabel: 'Definições',
  blockLeft: 'Restam-te {{restantes}} de {{total}} respostas',
};
