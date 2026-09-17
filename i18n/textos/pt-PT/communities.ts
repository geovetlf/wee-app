/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» —«Tens a certeza», «as tuas comunidades»— y
 * el gerundio va `estar a + infinitivo`: `loading` dice «A carregar
 * comunidades...» y el estado de `memberOf` dice «A participar», no
 * «Participando». En Portugal se PROCURA, no se busca. El nombre de una
 * comunidad lo escribe una persona: entra por `{{nombre}}` y sale sin tocar.
 *
 * EL CERO CAE EN PLURAL. `Intl.PluralRules` mete el 0 en `other` para `pt-PT`
 * —al revés que en Brasil—, así que una comunidad vacía dirá «0 membros», que es
 * lo correcto aquí. Las dos formas llevan `{{contador}}` y nunca un 1 escrito a
 * mano. Apóstrofo tipográfico ’ siempre.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Criar comunidade',
  searchPlaceholder: 'Procurar comunidades...',
  loading: 'A carregar comunidades...',

  joinedSection: 'As tuas comunidades',
  discoverSection: 'Descobrir comunidades',

  official: 'Oficial',
  members_one: '{{contador}} membro',
  members_other: '{{contador}} membros',
  memberOf: 'A participar',
  join: 'Participar',

  leaveTitle: 'Sair da comunidade',
  leaveConfirm: 'Tens a certeza de que queres sair de "{{nombre}}"?',
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

  findYours: 'Encontra as tuas.',
  searchLabel: 'Procurar comunidades',
  members: 'membros',
  posts: 'posts',
  rules: 'Regras da comunidade',
  one: 'Comunidade',
  loadFailed: 'Não foi possível carregar a comunidade',
  noPosts: 'Não há publicações',
  beTheFirst: 'Sê a primeira pessoa a publicar nesta comunidade',
  createPost: 'Criar post',
  understoodJoin: 'Entendi, participar',
};
