/*
 * ITALIANO — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El nombre de una comunidad lo escribe una persona:
 * entra por `{{nombre}}` y sale sin tocar. En italiano "community" es invariable
 * y el cero cae en la forma plural, igual que en español, así que `members_one`
 * es solo el 1.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Crea una community',
  searchPlaceholder: 'Cerca community...',
  loading: 'Caricamento delle community...',

  joinedSection: 'Le tue community',
  discoverSection: 'Scopri le community',

  official: 'Ufficiale',
  members_one: '{{contador}} membro',
  members_other: '{{contador}} membri',
  memberOf: 'Iscritto',
  join: 'Unisciti',

  leaveTitle: 'Esci dalla community',
  leaveConfirm: 'Vuoi davvero uscire da "{{nombre}}"?',
  leave: 'Esci',
  leaveFailed: 'Non è stato possibile uscire dalla community',
  actionFailed: 'Non è stato possibile completare l’azione',

  newCommunity: 'Nuova community',
  name: 'Nome',
  namePlaceholder: 'Es.: Amanti del caffè',
  description: 'Descrizione',
  descriptionPlaceholder: 'Di cosa parla questa community?',
  createFailed: 'Non è stato possibile creare la community',
  defaultDescription: 'Community di {{nombre}}',
  empty: 'Non c’è nessuna community disponibile',
  findYours: 'Trova le tue.',
  searchLabel: 'Cerca community',
  members: 'membri',
  posts: 'post',
  rules: 'Regole della community',
  one: 'Community',
  loadFailed: 'Non è stato possibile caricare la community',
  noPosts: 'Nessun post',
  beTheFirst: 'Sii il primo a pubblicare in questa community',
  createPost: 'Crea un post',
  understoodJoin: 'Ho capito, unisciti',
  memberCount_one: '{{cantidad}} membro',
  memberCount_other: '{{cantidad}} membri',
  postCount_one: '{{contador}} post',
  postCount_other: '{{contador}} post',
};
