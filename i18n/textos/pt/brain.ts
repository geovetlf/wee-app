/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Seu assistente inteligente para tudo',
  slogan: 'Imagine · Pergunte · Crie · Conecte',
  description: 'Todo o poder de Weë, em uma só conversa.',
  systemLabel: 'Weë Brain, conectado com as outras seções de Weë AI',
  goTo: 'Ir para {{seccion}}',
  placeholder: 'Escreva aqui sua mensagem...',
  settingsHint: 'Como você quer que ele responda.',
  searchGroup: 'Buscar na internet',
  imageLabel: 'Imagem',
  settingsLabel: 'Configurações',
  blockLeft: 'Restam {{restantes}} de {{total}} respostas',
};
