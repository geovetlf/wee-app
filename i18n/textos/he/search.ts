/*
 * HEBREO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Lo que la persona escribe en el buscador y los resultados no pasan por aquí. «Usuarios» es
 * «משתמשים» (plural genérico); «Miembro» es la etiqueta de una persona concreta y lleva la barra
 * («חבר/ה»), anotada para el revisor. «Escribe al menos 2…» va en impersonal («יש להקליד…»).
 */
export const search: typeof import('../es/search').search = {
  title: 'חיפוש',
  placeholder: 'חיפוש קהילות, אנשים או פוסטים',
  communities: 'קהילות',
  people: 'אנשים',
  posts: 'פוסטים',
  loading: 'בטעינה...',
  popularTopics: 'נושאים פופולריים',
  trending: 'טרנדים',
  noPostsForTopic: 'אין פוסטים בנושא הזה',
  results: 'תוצאות',
  noCommunities: 'לא נמצאו קהילות',
  member: 'חבר/ה',
  typeTwoForPeople: 'יש להקליד לפחות 2 תווים כדי לחפש אנשים',
  typeTwoForPosts: 'יש להקליד לפחות 2 אותיות כדי לחפש פוסטים',
  peopleFound: 'אנשים שנמצאו',
  searchPeople: 'חיפוש אנשים',
  noPeopleFor: 'לא נמצאו אנשים עבור "{{busqueda}}"',
  postsFound: 'פוסטים שנמצאו',
  searchPosts: 'חיפוש פוסטים',
  noPostsFor: 'לא מצאנו פוסטים עבור "{{busqueda}}"',
};
