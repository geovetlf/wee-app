/*
 * FRANCÉS — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Lo que la persona escribe en el buscador y los
 * resultados no pasan por aquí: son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Rechercher',
  placeholder: 'Rechercher des communautés, des personnes ou des publications',
  communities: 'Communautés',
  people: 'Personnes',
  posts: 'Publications',
  loading: 'Chargement...',
  popularTopics: 'Sujets populaires',
  trending: 'Tendances',
  noPostsForTopic: 'Aucune publication sur ce sujet',
  results: 'Résultats',
  noCommunities: 'Aucune communauté trouvée',
  member: 'Membre',
  typeTwoForPeople: 'Écris au moins 2 caractères pour chercher des personnes',
  typeTwoForPosts: 'Écris au moins 2 lettres pour chercher des publications',
  peopleFound: 'Personnes trouvées',
  searchPeople: 'Rechercher des personnes',
  noPeopleFor: 'Aucune personne trouvée pour « {{busqueda}} »',
  postsFound: 'Publications trouvées',
  searchPosts: 'Rechercher des publications',
  noPostsFor: 'Nous n’avons trouvé aucune publication pour « {{busqueda}} »',
};
