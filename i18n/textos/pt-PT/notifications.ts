/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí, para que el verbo pueda ir donde el portugués lo pide.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» y el gerundio va `estar a + infinitivo`. En
 * Portugal no se «curte» una publicación: se GOSTA de ella, y no se
 * «compartilha»: se PARTILHA. Una petición de conexión es un «pedido», no una
 * «solicitação» —la misma palabra que usa `econtact`—. ËContact es marca y se
 * copia tal cual; el nombre de una comunidad llega por `{{comunidad}}` y sale
 * sin tocar. Apóstrofo tipográfico ’ siempre.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notificações',
  empty: 'Sem notificações',
  emptyHint: 'Quando alguém interagir contigo, vai aparecer aqui',
  allRead: 'Já leste todas as tuas notificações',
  noneNew: 'Sem notificações novas',
  like: '{{nombre}} gostou da tua publicação',
  comment: '{{nombre}} comentou a tua publicação',
  follow: '{{nombre}} começou a seguir-te',
  econtactRequest: '{{nombre}} quer adicionar-te ao ËContact',
  econtactAccepted: '{{nombre}} aceitou o teu pedido de ËContact',
  repost: '{{nombre}} partilhou a tua publicação',
  mention: '{{nombre}} mencionou-te',
  reply: '{{nombre}} respondeu ao teu comentário',
  communityPost: '{{nombre}} publicou em {{comunidad}}',
  aCommunity: 'uma comunidade',
  generic: '{{nombre}} interagiu contigo',
  now: 'agora',
  markAllRead: 'Marcar todas como lidas',
  all: 'Todas',
};
