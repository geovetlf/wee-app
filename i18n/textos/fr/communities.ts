/*
 * FRANCÉS — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El nombre de una comunidad lo escribe una persona:
 * entra por `{{nombre}}` y sale sin tocar. En francés el cero cae en la forma
 * singular, por eso `members_one` dice "{{contador}} membre" y nunca "1 membre".
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Créer une communauté',
  searchPlaceholder: 'Rechercher des communautés...',
  loading: 'Chargement des communautés...',

  joinedSection: 'Tes communautés',
  discoverSection: 'Découvrir des communautés',

  official: 'Officielle',
  members_one: '{{contador}} membre',
  members_other: '{{contador}} membres',
  memberOf: 'Rejointe',
  join: 'Rejoindre',

  leaveTitle: 'Quitter la communauté',
  leaveConfirm: 'Veux-tu vraiment quitter "{{nombre}}" ?',
  leave: 'Quitter',
  leaveFailed: 'La communauté n’a pas pu être quittée',
  actionFailed: 'L’action n’a pas pu être effectuée',

  newCommunity: 'Nouvelle communauté',
  name: 'Nom',
  namePlaceholder: 'Ex. : Amoureux du café',
  description: 'Description',
  descriptionPlaceholder: 'De quoi parle cette communauté ?',
  createFailed: 'La communauté n’a pas pu être créée',
  defaultDescription: 'Communauté de {{nombre}}',
  empty: 'Il n’y a aucune communauté disponible',
  findYours: 'Trouve les tiennes.',
  searchLabel: 'Rechercher des communautés',
  members: 'membres',
  posts: 'publications',
  rules: 'Règles de la communauté',
  one: 'Communauté',
  loadFailed: 'La communauté n’a pas pu être chargée',
  noPosts: 'Aucune publication',
  beTheFirst: 'Sois le premier à publier dans cette communauté',
  createPost: 'Créer une publication',
  understoodJoin: 'J’ai compris, rejoindre',
  memberCount_one: '{{cantidad}} membre',
  memberCount_other: '{{cantidad}} membres',
  postCount_one: '{{contador}} publication',
  postCount_other: '{{contador}} publications',
  officialNameFilmAnimation: 'Cinéma & Animation',
  officialNameArtCreativity: 'Art & Créativité',
  officialNameCreatorsInfluencers: 'Créateurs & Influenceurs',
  officialNameBusinessEntrepreneurship: 'Business & Entrepreneuriat',
  officialNameTechAi: 'Technologie & IA',
  officialNameGamingVirtualWorlds: 'Gaming & Mondes virtuels',
  officialNameEducationLearning: 'Éducation & Apprentissage',
  officialNameFutureSociety: 'Avenir & Société',
  officialRuleShare: 'Partage ce que tu as créé avec l’IA et raconte comment tu l’as fait',
  officialRuleRespect: 'Pose tes questions et réponds avec respect',
  officialRuleNoSpam: 'Pas de spam ni de contenu qui n’est pas le tien',
  popularDescFilmmakers: 'Des personnes qui utilisent l’IA pour le cinéma et la production audiovisuelle. Montre ton processus et apprends de celui des autres.',
  popularDescInfluencers: 'Influenceurs et créateurs de contenu qui produisent avec l’IA.',
  popularDescDesigners: 'Designers qui travaillent avec l’IA : branding, illustration, art numérique.',
  popularDescWriters: 'Auteurs qui créent avec l’IA : livres, scénarios, articles et poésie.',
  popularDescMusicians: 'Créateurs de musique et de son avec l’IA.',
  popularDescDevelopers: 'Développeurs qui programment avec l’IA.',
  popularDescEntrepreneurs: 'Entrepreneurs qui utilisent l’IA dans leur entreprise.',
  popularDescGamers: 'IA et jeux vidéo : personnages, mondes et expériences.',
};
