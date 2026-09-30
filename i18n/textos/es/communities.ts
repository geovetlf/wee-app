/*
 * La pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * LO QUE NO ENTRA AQUÍ: el nombre de una comunidad y su descripción, que los
 * escribe una persona y se pintan tal cual. Cuando una frase de Weë los
 * nombra, entran por hueco —`{{nombre}}`— y salen sin tocar.
 */
export const communities = {
  create: 'Crear comunidad',
  searchPlaceholder: 'Buscar comunidades...',
  loading: 'Cargando comunidades...',

  joinedSection: 'Comunidades unidas',
  discoverSection: 'Descubrir comunidades',

  official: 'Oficial',
  members_one: '{{contador}} miembro',
  members_other: '{{contador}} miembros',
  memberOf: 'Unido',
  join: 'Unirse',

  leaveTitle: 'Salir de comunidad',
  leaveConfirm: '¿Estás seguro de que quieres salir de "{{nombre}}"?',
  leave: 'Salir',
  leaveFailed: 'No se pudo salir de la comunidad',
  actionFailed: 'No se pudo completar la acción',

  newCommunity: 'Nueva comunidad',
  name: 'Nombre',
  namePlaceholder: 'Ej: Amantes del café',
  description: 'Descripción',
  descriptionPlaceholder: '¿De qué trata esta comunidad?',
  createFailed: 'No se pudo crear la comunidad',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Comunidad de {{nombre}}',
  empty: 'No hay comunidades disponibles',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Encuentra las tuyas.',
  searchLabel: 'Buscar comunidades',
  members: 'miembros',
  posts: 'posts',
  rules: 'Reglas de la comunidad',
  one: 'Comunidad',
  loadFailed: 'No se pudo cargar la comunidad',
  noPosts: 'No hay publicaciones',
  beTheFirst: 'Sé el primero en publicar en esta comunidad',
  createPost: 'Crear post',
  understoodJoin: 'Entiendo, unirme',
  memberCount_one: '{{cantidad}} miembro',
  memberCount_other: '{{cantidad}} miembros',
  postCount_one: '{{contador}} post',
  postCount_other: '{{contador}} posts',
};
