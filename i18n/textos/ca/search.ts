/*
 * CATALÁN — Buscar («Cerca»): comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que la persona escribe en el buscador llega por `{{busqueda}}` y no se traduce.
 */
export const search: typeof import('../es/search').search = {
  title: 'Cerca',
  placeholder: 'Cerca comunitats, persones o publicacions',
  communities: 'Comunitats',
  people: 'Usuaris',
  posts: 'Publicacions',
  loading: 'S\'està carregant...',
  popularTopics: 'Temes populars',
  trending: 'Tendències',
  noPostsForTopic: 'No hi ha publicacions amb aquest tema',
  results: 'Resultats',
  noCommunities: 'No s\'ha trobat cap comunitat',
  member: 'Membre',
  typeTwoForPeople: 'Escriu almenys 2 caràcters per cercar usuaris',
  typeTwoForPosts: 'Escriu almenys 2 lletres per cercar publicacions',
  peopleFound: 'Usuaris trobats',
  searchPeople: 'Cerca usuaris',
  noPeopleFor: 'No s\'ha trobat cap usuari per a «{{busqueda}}»',
  postsFound: 'Publicacions trobades',
  searchPosts: 'Cerca publicacions',
  noPostsFor: 'No hem trobat publicacions per a «{{busqueda}}»',
};
