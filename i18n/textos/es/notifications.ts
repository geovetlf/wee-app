/*
 * Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí, para que en otros idiomas el verbo pueda ir donde toque.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const notifications = {
  title: 'Notificaciones',
  empty: 'Sin notificaciones',
  emptyHint: 'Cuando alguien interactúe contigo, aparecerá aquí',
  allRead: 'Has leído todas tus notificaciones',
  noneNew: 'Sin notificaciones nuevas',
  like: '{{nombre}} le gustó tu publicación',
  comment: '{{nombre}} comentó en tu publicación',
  follow: '{{nombre}} comenzó a seguirte',
  econtactRequest: '{{nombre}} quiere agregarte a ËContact',
  econtactAccepted: '{{nombre}} aceptó tu solicitud de ËContact',
  repost: '{{nombre}} compartió tu publicación',
  mention: '{{nombre}} te mencionó',
  reply: '{{nombre}} respondió a tu comentario',
  communityPost: '{{nombre}} publicó en {{comunidad}}',
  aCommunity: 'una comunidad',
  generic: '{{nombre}} interactuó contigo',
  now: 'ahora',
  markAllRead: 'Marcar todas como leídas',
  all: 'Todas',
};
