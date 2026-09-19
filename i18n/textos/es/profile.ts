/*
 * La pantalla del perfil propio, entera.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * LO QUE NO ENTRA AQUÍ:
 *
 *   · EL NOMBRE, EL USUARIO, LA BIOGRAFÍA Y EL ENLACE de quien mira. Los
 *     escribió una persona y se pintan tal cual;
 *
 *   · ËContacts y ẄContacts, que son marca y además cambian con la identidad
 *     puesta: entran por hueco y salen sin tocar;
 *
 *   · lo que la persona escriba de verdad en su enlace. La dirección de EJEMPLO
 *     del hueco sí se traduce: nadie la visita, se lee;
 *
 *   · lo que dice el servidor cuando algo falla —`{{motivo}}`—: es suyo, y
 *     traducirlo sería inventárselo.
 *
 * Y lo que se repite por toda la app NO se copia aquí: "Guardar", "Compartir",
 * "Error" y "Error desconocido" ya existen y se piden donde viven.
 */
export const profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Agregar portada',
  permissionsTitle: 'Permisos',
  galleryPermission: 'Se necesitan permisos para acceder a la galería',
  coverUploadFailed: 'No se pudo subir la imagen de portada',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Cargando perfil...',
  loadFailed: 'Error al cargar el perfil',
  /* Solo se lee si el error llega sin explicación propia. */
  loadFailedDetail: 'No se pudo cargar la información del usuario',
  backToLogin: 'Volver al Login',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'El nombre no puede estar vacío',
  updateFailed: 'No se pudo actualizar el perfil',
  signOutFailed: 'No se pudo cerrar sesión',
  noSession: 'No hay sesión activa',
  /* `{{motivo}}` lo escribe quien falló —el almacén, la red—: se enseña crudo. */
  avatarUpdateFailed: 'No se pudo actualizar el avatar. Inténtalo de nuevo.',
  imageUrlMissing: 'No se recibió URL de imagen',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Mira el perfil de {{nombre}} en Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Editar Perfil',
  displayNameLabel: 'Nombre de usuario',
  displayNamePlaceholder: 'Tu nombre de usuario',
  bioLabel: 'Biografía',
  bioPlaceholder: 'Cuéntanos sobre ti...',
  websiteLabel: 'Sitio web',
  /* Una dirección de EJEMPLO, no la de nadie: es texto que se lee. */
  websitePlaceholder: 'https://tusitio.com',
  /* El contador de los tres campos: gastados y tope, los dos por hueco. */
  charCount: '{{usados}}/{{maximo}} caracteres',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Editar perfil',
  createWeeProfile: 'Crear perfil Weë',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Publicaciones',
  /* Lector de pantalla. El nombre de la agenda y la cifra entran por hueco. */
  viewMyEcontacts: 'Ver mis {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Media',
  tabReposts: 'Reposts',
  tabLikes: 'Likes',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Cargando publicaciones...',
  postsFailed: 'Error al cargar las publicaciones',
  retry: 'Reintentar',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Aún no tienes publicaciones',
  emptyPostsHint: '¡Comparte tu primer post!',
  emptyMedia: 'No tienes publicaciones con multimedia',
  emptyMediaHint: 'Crea un post con fotos o videos',
  emptyReposts: 'No has reposteado nada',
  emptyRepostsHint: 'Comparte contenido de otros usuarios',
  emptyLikes: 'No tienes publicaciones que te gusten',
  emptyLikesHint: 'Dale me gusta a las publicaciones que te interesen',
  otherTitle: 'Perfil',
  otherLoadFailed: 'No se pudo cargar el perfil',
  seeFullProfile: 'Ver mi perfil completo',
  emptyCategory: 'Sin publicaciones en esta categoría',
  actionFailed: 'No se pudo completar',
};
