/*
 * GRIEGO — Notificaciones. Tipado contra el español.
 * {{nombre}} va en nominativo y sin artículo para no marcar género.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Ειδοποιήσεις',
  empty: 'Καμία ειδοποίηση',
  emptyHint: 'Όταν κάποιος αλληλεπιδράσει μαζί σου, θα εμφανιστεί εδώ',
  allRead: 'Έχεις διαβάσει όλες τις ειδοποιήσεις σου',
  noneNew: 'Καμία νέα ειδοποίηση',
  like: '{{nombre}} έκανε «Μου αρέσει» στην ανάρτησή σου',
  comment: '{{nombre}} σχολίασε την ανάρτησή σου',
  follow: '{{nombre}} άρχισε να σε ακολουθεί',
  econtactRequest: '{{nombre}} θέλει να σε προσθέσει στο ËContact',
  econtactAccepted: '{{nombre}} αποδέχτηκε το αίτημά σου στο ËContact',
  repost: '{{nombre}} κοινοποίησε την ανάρτησή σου',
  mention: '{{nombre}} σε ανέφερε',
  reply: '{{nombre}} απάντησε στο σχόλιό σου',
  communityPost: '{{nombre}} δημοσίευσε σε {{comunidad}}',
  aCommunity: 'μια κοινότητα',
  generic: '{{nombre}} αλληλεπίδρασε μαζί σου',
  now: 'τώρα',
  markAllRead: 'Σήμανση όλων ως αναγνωσμένων',
  all: 'Όλες',
  unread: 'Μη αναγνωσμένες',
  unreadWithCount: 'Μη αναγνωσμένες ({{total}})',
};
