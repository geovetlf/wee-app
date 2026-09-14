/*
 * ENGLISH — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Create community',
  searchPlaceholder: 'Search communities...',
  loading: 'Loading communities...',

  joinedSection: 'Communities you joined',
  discoverSection: 'Discover communities',

  official: 'Official',
  members_one: '{{contador}} member',
  members_other: '{{contador}} members',
  memberOf: 'Joined',
  join: 'Join',

  leaveTitle: 'Leave community',
  leaveConfirm: 'Are you sure you want to leave "{{nombre}}"?',
  leave: 'Leave',
  leaveFailed: 'You could not leave the community',
  actionFailed: 'The action could not be completed',

  newCommunity: 'New community',
  name: 'Name',
  namePlaceholder: 'E.g. Coffee lovers',
  description: 'Description',
  descriptionPlaceholder: 'What is this community about?',
  createFailed: 'The community could not be created',
  defaultDescription: '{{nombre}} community',
  empty: 'There are no communities available',
};
