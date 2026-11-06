/*
 * FINÉS — Buscar: comunidades, personas y publicaciones. Tipado contra el
 * español: si allí hay una clave que aquí falta, no compila.
 *
 * «Haku» es el título y «Hae» el verbo de los botones (glosario). Lo que la
 * persona escribe en el buscador entra entre comillas finlandesas ”…” y en
 * nominativo: el caso lo lleva la palabra anterior («Haulla ”{{busqueda}}”»).
 * «Tendencias» es «Nousussa», el término habitual en las apps finlandesas.
 */
export const search: typeof import('../es/search').search = {
  title: 'Haku',
  placeholder: 'Hae yhteisöjä, ihmisiä tai julkaisuja',
  communities: 'Yhteisöt',
  people: 'Käyttäjät',
  posts: 'Julkaisut',
  loading: 'Ladataan...',
  popularTopics: 'Suositut aiheet',
  trending: 'Nousussa',
  noPostsForTopic: 'Tästä aiheesta ei ole julkaisuja',
  results: 'Tulokset',
  noCommunities: 'Yhteisöjä ei löytynyt',
  member: 'Jäsen',
  typeTwoForPeople: 'Kirjoita vähintään 2 merkkiä hakeaksesi käyttäjiä',
  typeTwoForPosts: 'Kirjoita vähintään 2 kirjainta hakeaksesi julkaisuja',
  peopleFound: 'Löytyneet käyttäjät',
  searchPeople: 'Hae käyttäjiä',
  noPeopleFor: 'Haulla ”{{busqueda}}” ei löytynyt käyttäjiä',
  postsFound: 'Löytyneet julkaisut',
  searchPosts: 'Hae julkaisuja',
  noPostsFor: 'Haulla ”{{busqueda}}” ei löytynyt julkaisuja',
};
