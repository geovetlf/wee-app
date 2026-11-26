/*
 * CATALÁN — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de una comunidad lo escribe una persona: entra por `{{nombre}}` y
 * sale sin tocar.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Crea una comunitat',
  searchPlaceholder: 'Cerca comunitats...',
  loading: 'S\'estan carregant les comunitats...',

  joinedSection: 'Les teves comunitats',
  discoverSection: 'Descobreix comunitats',

  official: 'Oficial',
  members_one: '{{contador}} membre',
  members_other: '{{contador}} membres',
  memberOf: 'Membre',
  join: 'Uneix-t\'hi',

  leaveTitle: 'Surt de la comunitat',
  leaveConfirm: 'Segur que vols sortir de «{{nombre}}»?',
  leave: 'Surt',
  leaveFailed: 'No s\'ha pogut sortir de la comunitat',
  actionFailed: 'No s\'ha pogut completar l\'acció',

  newCommunity: 'Comunitat nova',
  name: 'Nom',
  namePlaceholder: 'Ex.: Amants del cafè',
  description: 'Descripció',
  descriptionPlaceholder: 'De què va aquesta comunitat?',
  createFailed: 'No s\'ha pogut crear la comunitat',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Comunitat: {{nombre}}',
  empty: 'No hi ha comunitats disponibles',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Troba les teves.',
  searchLabel: 'Cerca comunitats',
  members: 'membres',
  posts: 'publicacions',
  rules: 'Normes de la comunitat',
  one: 'Comunitat',
  loadFailed: 'No s\'ha pogut carregar la comunitat',
  noPosts: 'No hi ha publicacions',
  beTheFirst: 'Sigues la primera persona a publicar en aquesta comunitat',
  createPost: 'Crea una publicació',
  understoodJoin: 'Ho entenc, vull unir-m\'hi',
  memberCount_one: '{{cantidad}} membre',
  memberCount_other: '{{cantidad}} membres',
  postCount_one: '{{contador}} publicació',
  postCount_other: '{{contador}} publicacions',
  officialNameFilmAnimation: 'Cinema & Animació',
  officialNameArtCreativity: 'Art & Creativitat',
  officialNameCreatorsInfluencers: 'Creadors & Influencers',
  officialNameBusinessEntrepreneurship: 'Negocis & Emprenedoria',
  officialNameTechAi: 'Tecnologia & IA',
  officialNameGamingVirtualWorlds: 'Gaming & Mons Virtuals',
  officialNameEducationLearning: 'Educació & Aprenentatge',
  officialNameFutureSociety: 'Futur & Societat',
  officialRuleShare: 'Comparteix el que has creat amb IA i explica com ho has fet',
  officialRuleRespect: 'Pregunta i respon amb respecte',
  officialRuleNoSpam: 'Ni spam ni contingut que no sigui teu',
  popularDescFilmmakers: 'Persones que fan servir la IA per al cinema i la producció audiovisual. Mostra el teu procés i aprèn del dels altres.',
  popularDescInfluencers: 'Influencers i creadors de contingut que produeixen amb IA.',
  popularDescDesigners: 'Dissenyadors que treballen amb IA: branding, il·lustració, art digital.',
  popularDescWriters: 'Escriptors que creen amb IA: llibres, guions, articles i poesia.',
  popularDescMusicians: 'Creadors de música i àudio amb IA.',
  popularDescDevelopers: 'Programadors que construeixen amb IA.',
  popularDescEntrepreneurs: 'Emprenedors que fan servir la IA als seus negocis.',
  popularDescGamers: 'IA i videojocs: personatges, mons i experiències.',
};
