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
  /*
   * CUANDO NO SE SABE QUIÉN FUE (el perfil no tiene nombre). En español, y en los idiomas que pueden poner «Alguien»
   * en el hueco del nombre, es la misma frase de arriba: la pantalla rellena {{nombre}} con common.someone, como
   * siempre. Existe porque en filipino el nombre va con «si/ni», que no admiten un sustantivo común: allí la frase
   * se escribe sin nombre («May nag-like sa post mo»). Si una frase de aquí no lleva {{nombre}}, la pantalla no pinta
   * ningún nombre en negrita.
   */
  likeSinNombre: '{{nombre}} le gustó tu publicación',
  commentSinNombre: '{{nombre}} comentó en tu publicación',
  followSinNombre: '{{nombre}} comenzó a seguirte',
  econtactRequestSinNombre: '{{nombre}} quiere agregarte a ËContact',
  econtactAcceptedSinNombre: '{{nombre}} aceptó tu solicitud de ËContact',
  repostSinNombre: '{{nombre}} compartió tu publicación',
  mentionSinNombre: '{{nombre}} te mencionó',
  replySinNombre: '{{nombre}} respondió a tu comentario',
  communityPostSinNombre: '{{nombre}} publicó en {{comunidad}}',
  genericSinNombre: '{{nombre}} interactuó contigo',
  now: 'ahora',
  markAllRead: 'Marcar todas como leídas',
  all: 'Todas',
  unread: 'No leídas',
  unreadWithCount: 'No leídas ({{total}})',
};
