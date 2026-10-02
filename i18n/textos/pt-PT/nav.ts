/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» y el gerundio va `estar a + infinitivo`.
 * Las cinco etiquetas son cortas porque la barra es estrecha, y son exactamente
 * las mismas que usa el menú ☰ (`menu`): Início, Procurar, Criar, WeeTalk,
 * Notificações. En Portugal se busca «procurando», no «buscando»: la etiqueta
 * es «Procurar». Y la sección se escribe «secção», no «seção».
 * Apóstrofo tipográfico ’ siempre.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Início',
  search: 'Procurar',
  create: 'Criar',
  talk: 'WeeTalk',
  notifications: 'Notificações',
  current: 'secção atual',
  goTo: 'Ir para {{nombre}}',
  weeNavigation: 'Navegação do Weë',
  goHome: 'Ir para o início',
  myProfile: 'Ir para o meu perfil',
  openWeeAi: 'Abrir Weë AI',
  goToWeeAi: 'Ir para Weë AI',
  weeAiQuestion: 'O que queres criar hoje?',
  weeAiPitch: 'Diz ao Weë o que queres. O Weë trata da IA.',
  documentTitle: 'Weë - A comunidade do futuro',
};
