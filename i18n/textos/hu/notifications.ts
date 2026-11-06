/*
 * HÚNGARO — Notificaciones. El nombre entra como sujeto en nominativo y sin
 * sufijos pegados. Tipado contra el español.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Értesítések',
  empty: 'Nincsenek értesítések',
  emptyHint: 'Ha valaki interakcióba lép veled, itt fog megjelenni',
  allRead: 'Az összes értesítésedet elolvastad',
  noneNew: 'Nincsenek új értesítések',
  like: '{{nombre}} kedvelte a bejegyzésedet',
  comment: '{{nombre}} hozzászólt a bejegyzésedhez',
  follow: '{{nombre}} elkezdett követni téged',
  econtactRequest: '{{nombre}} ËContact-kérést küldött neked',
  econtactAccepted: '{{nombre}} elfogadta az ËContact-kérésedet',
  repost: '{{nombre}} megosztotta a bejegyzésedet',
  mention: '{{nombre}} megemlített téged',
  reply: '{{nombre}} válaszolt a hozzászólásodra',
  communityPost: '{{nombre}} bejegyzést tett közzé itt: {{comunidad}}',
  aCommunity: 'egy közösség',
  generic: '{{nombre}} interakcióba lépett veled',
  now: 'most',
  markAllRead: 'Az összes megjelölése olvasottként',
  all: 'Összes',
  unread: 'Olvasatlan',
  unreadWithCount: 'Olvasatlan ({{total}})',
};
