/*
 * ISLANDÉS (is · is-IS) — Notificaciones. El nombre de quien la provoca entra como valor y no se traduce.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * {{nombre}} va siempre de sujeto en nominativo. «Líkar við» es impersonal (pide dativo), así que `like` se
 * construye con «merkti … með „líkar við“» para no declinar el nombre. {{comunidad}} va en aposición tras
 * «samfélaginu»; si falta el nombre, `aCommunity` («sem þú ert í») completa la misma frase.
 * «Minntist á þig» (mención, pendiente, guía § 6). «ËContact» invariable tras preposición (guía § 2.3).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Tilkynningar',
  empty: 'Engar tilkynningar',
  emptyHint: 'Þegar einhver hefur samskipti við þig birtist það hér',
  allRead: 'Þú hefur lesið allar tilkynningarnar þínar',
  noneNew: 'Engar nýjar tilkynningar',
  like: '{{nombre}} merkti færsluna þína með „líkar við“',
  comment: '{{nombre}} skrifaði athugasemd við færsluna þína',
  follow: '{{nombre}} byrjaði að fylgja þér',
  econtactRequest: '{{nombre}} vill bæta þér við í ËContact',
  econtactAccepted: '{{nombre}} samþykkti beiðni þína í ËContact',
  repost: '{{nombre}} deildi færslunni þinni',
  mention: '{{nombre}} minntist á þig',
  reply: '{{nombre}} svaraði athugasemdinni þinni',
  communityPost: '{{nombre}} birti færslu í samfélaginu {{comunidad}}',
  aCommunity: 'sem þú ert í',
  generic: '{{nombre}} hafði samskipti við þig',
  now: 'núna',
  markAllRead: 'Merkja allt sem lesið',
  all: 'Allar',
  unread: 'Ólesið',
  unreadWithCount: 'Ólesið ({{total}})',
};
