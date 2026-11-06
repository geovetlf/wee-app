/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Notificaciones.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. El nombre ({{nombre}}) va siempre en absolutivo: como sujeto de un verbo
 * antipasivo/intransitivo («{{nombre}} saqqummiussannik nuannarinnippoq») o aislado tras
 * dos puntos («Taaneqarputit: {{nombre}}»). Nunca se le pega un sufijo.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Nalunaarutit',
  empty: 'Nalunaaruteqanngilatit',
  emptyHint: 'Arlaanni ilinnut attaveqartoqarpat maani takussaassaaq',
  allRead: 'Nalunaarutitit tamaasa atuarsimavatit',
  noneNew: 'Nalunaarut nutaaq peqanngilaq',
  like: '{{nombre}} saqqummiussannik nuannarinnippoq',
  comment: '{{nombre}} saqqummiussannut oqaaseqarpoq',
  follow: '{{nombre}} malinnaasunnut ilanngussimavoq',
  econtactRequest: '{{nombre}} ilinnut attaveqalerusuppoq · ËContact',
  econtactAccepted: '{{nombre}} qinnutinnut akuersivoq · ËContact',
  repost: '{{nombre}} saqqummiussannik siammartitsivoq',
  mention: 'Taaneqarputit: {{nombre}}',
  reply: '{{nombre}} oqaaseqaatinnut akivoq',
  communityPost: '{{nombre}} saqqummiussivoq · {{comunidad}}',
  aCommunity: 'peqatigiiffik',
  generic: '{{nombre}} ilinnut attaveqarpoq',
  now: 'maanna',
  markAllRead: 'Tamaasa atuarsimasutut nalunaaqutsikkit',
  all: 'Tamarmik',
  unread: 'Atuarneqarsimanngitsut',
  unreadWithCount: 'Atuarneqarsimanngitsut ({{total}})',
};
