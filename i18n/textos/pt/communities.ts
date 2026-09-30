/*
 * PORTUGUÉS (pt-BR) — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). El nombre de una comunidad lo escribe una
 * persona: entra por `{{nombre}}` y sale sin tocar. En portugués el CERO cae en
 * la forma singular, por eso `members_one` lleva `{{contador}}` y nunca un 1
 * escrito a mano. Apóstrofo tipográfico ’ siempre.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Criar comunidade',
  searchPlaceholder: 'Buscar comunidades...',
  loading: 'Carregando comunidades...',

  joinedSection: 'Suas comunidades',
  discoverSection: 'Descobrir comunidades',

  official: 'Oficial',
  members_one: '{{contador}} membro',
  members_other: '{{contador}} membros',
  memberOf: 'Participando',
  join: 'Participar',

  leaveTitle: 'Sair da comunidade',
  leaveConfirm: 'Tem certeza de que quer sair de "{{nombre}}"?',
  leave: 'Sair',
  leaveFailed: 'Não foi possível sair da comunidade',
  actionFailed: 'Não foi possível concluir a ação',

  newCommunity: 'Nova comunidade',
  name: 'Nome',
  namePlaceholder: 'Ex.: Amantes de café',
  description: 'Descrição',
  descriptionPlaceholder: 'Sobre o que é esta comunidade?',
  createFailed: 'Não foi possível criar a comunidade',
  defaultDescription: 'Comunidade de {{nombre}}',
  empty: 'Não há comunidades disponíveis',

  findYours: 'Encontre as suas.',
  searchLabel: 'Buscar comunidades',
  members: 'membros',
  posts: 'posts',
  rules: 'Regras da comunidade',
  one: 'Comunidade',
  loadFailed: 'Não foi possível carregar a comunidade',
  noPosts: 'Não há publicações',
  beTheFirst: 'Seja a primeira pessoa a publicar nesta comunidade',
  createPost: 'Criar post',
  understoodJoin: 'Entendi, participar',
  memberCount_one: '{{cantidad}} membro',
  memberCount_other: '{{cantidad}} membros',
  postCount_one: '{{contador}} post',
  postCount_other: '{{contador}} posts',
};
