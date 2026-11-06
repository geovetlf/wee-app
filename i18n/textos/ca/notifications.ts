/*
 * CATALÁN — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * En «like» el nombre va detrás de «A» porque en catalán «agradar» pide dativo («A X li ha agradat»).
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notificacions',
  empty: 'Sense notificacions',
  emptyHint: 'Quan algú interactuï amb tu, apareixerà aquí',
  allRead: 'Has llegit totes les notificacions',
  noneNew: 'Sense notificacions noves',
  like: 'A {{nombre}} li ha agradat la teva publicació',
  comment: '{{nombre}} ha comentat la teva publicació',
  follow: '{{nombre}} ha començat a seguir-te',
  econtactRequest: '{{nombre}} vol afegir-te a ËContact',
  econtactAccepted: '{{nombre}} ha acceptat la teva sol·licitud d\'ËContact',
  repost: '{{nombre}} ha compartit la teva publicació',
  mention: '{{nombre}} t\'ha mencionat',
  reply: '{{nombre}} ha respost al teu comentari',
  communityPost: '{{nombre}} ha publicat a {{comunidad}}',
  aCommunity: 'una comunitat',
  generic: '{{nombre}} ha interactuat amb tu',
  now: 'ara',
  markAllRead: 'Marca-les totes com a llegides',
  all: 'Totes',
  unread: 'No llegides',
  unreadWithCount: 'No llegides ({{total}})',
};
