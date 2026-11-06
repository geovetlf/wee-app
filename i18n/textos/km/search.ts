/*
 * JEMER — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que la persona escribe en el buscador entra por {{busqueda}} y no se toca.
 */
export const search: typeof import('../es/search').search = {
  title: 'ស្វែងរក',
  placeholder: 'ស្វែងរក​សហគមន៍ មនុស្ស ឬ​សារបង្ហោះ',
  communities: 'សហគមន៍',
  people: 'អ្នកប្រើ',
  posts: 'សារបង្ហោះ',
  loading: 'កំពុង​ផ្ទុក...',
  popularTopics: 'ប្រធានបទ​ពេញនិយម',
  trending: 'និន្នាការ',
  noPostsForTopic: 'គ្មាន​សារបង្ហោះ​សម្រាប់​ប្រធានបទ​នេះ​ទេ',
  results: 'លទ្ធផល',
  noCommunities: 'រក​មិន​ឃើញ​សហគមន៍​ទេ',
  member: 'សមាជិក',
  typeTwoForPeople: 'វាយ​យ៉ាងហោចណាស់ 2 តួអក្សរ​ដើម្បី​ស្វែងរក​អ្នកប្រើ',
  typeTwoForPosts: 'វាយ​យ៉ាងហោចណាស់ 2 តួអក្សរ​ដើម្បី​ស្វែងរក​សារបង្ហោះ',
  peopleFound: 'អ្នកប្រើ​ដែល​រកឃើញ',
  searchPeople: 'ស្វែងរក​អ្នកប្រើ',
  noPeopleFor: 'រក​មិន​ឃើញ​អ្នកប្រើ​សម្រាប់ "{{busqueda}}" ទេ',
  postsFound: 'សារបង្ហោះ​ដែល​រកឃើញ',
  searchPosts: 'ស្វែងរក​សារបង្ហោះ',
  noPostsFor: 'យើង​រក​មិន​ឃើញ​សារបង្ហោះ​សម្រាប់ "{{busqueda}}" ទេ',
};
