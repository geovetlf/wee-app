/*
 * PORTUGUÉS (pt-BR) — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí, para que el verbo pueda ir donde el portugués lo pide.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). ËContact es marca y se copia tal cual; el nombre
 * de una comunidad llega por `{{comunidad}}` y sale sin tocar. Apóstrofo
 * tipográfico ’ siempre.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notificações',
  empty: 'Sem notificações',
  emptyHint: 'Quando alguém interagir com você, vai aparecer aqui',
  allRead: 'Você leu todas as suas notificações',
  noneNew: 'Sem notificações novas',
  like: '{{nombre}} curtiu sua publicação',
  comment: '{{nombre}} comentou na sua publicação',
  follow: '{{nombre}} começou a seguir você',
  econtactRequest: '{{nombre}} quer adicionar você ao ËContact',
  econtactAccepted: '{{nombre}} aceitou sua solicitação de ËContact',
  repost: '{{nombre}} compartilhou sua publicação',
  mention: '{{nombre}} mencionou você',
  reply: '{{nombre}} respondeu ao seu comentário',
  communityPost: '{{nombre}} publicou em {{comunidad}}',
  aCommunity: 'uma comunidade',
  generic: '{{nombre}} interagiu com você',
  now: 'agora',
  markAllRead: 'Marcar todas como lidas',
  all: 'Todas',
};
