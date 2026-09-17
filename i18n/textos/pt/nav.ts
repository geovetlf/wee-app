/*
 * PORTUGUÉS (pt-BR) — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). Las cinco etiquetas son cortas porque la barra es
 * estrecha, y son exactamente las mismas que usa el menú ☰ (`menu`): Início,
 * Buscar, Criar, WeeTalk, Notificações. Apóstrofo tipográfico ’ siempre.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Início',
  search: 'Buscar',
  create: 'Criar',
  talk: 'WeeTalk',
  notifications: 'Notificações',
  current: 'seção atual',
  goTo: 'Ir para {{nombre}}',
  weeNavigation: 'Navegação do Weë',
  goHome: 'Ir para o início',
  myProfile: 'Ir para o meu perfil',
  openWeeAi: 'Abrir Weë AI',
  goToWeeAi: 'Ir para Weë AI',
  weeAiQuestion: 'O que você quer criar hoje?',
  weeAiPitch: 'Diga ao Weë o que você quer. O Weë cuida da IA.',
};
