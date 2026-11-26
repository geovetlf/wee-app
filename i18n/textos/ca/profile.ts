/*
 * CATALÁN — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre, el usuario, la biografía y el enlace de quien mira se pintan tal
 * cual; ËContacts/ẄContacts entran por `{{nombre}}`; `{{motivo}}` es del
 * servidor. La dirección de EJEMPLO del hueco sí se traduce: se lee, no se
 * visita.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ─────────────────────────────────────────────────────── */
  addCover: 'Afegeix una portada',
  permissionsTitle: 'Permisos',
  galleryPermission: 'Calen permisos per accedir a la galeria',
  coverUploadFailed: 'No s\'ha pogut pujar la imatge de portada',

  /* ── Los dos estados con los que puede abrirse la pantalla ──────────── */
  loading: 'S\'està carregant el perfil...',
  loadFailed: 'Error en carregar el perfil',
  loadFailedDetail: 'No s\'ha pogut carregar la informació de l\'usuari',
  backToLogin: 'Torna a l\'inici de sessió',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ──────── */
  nameRequired: 'El nom no pot estar buit',
  updateFailed: 'No s\'ha pogut actualitzar el perfil',
  signOutFailed: 'No s\'ha pogut tancar la sessió',
  noSession: 'No hi ha cap sessió activa',
  avatarUpdateFailed: 'No s\'ha pogut actualitzar l\'avatar. Torna-ho a provar.',
  imageUrlMissing: 'No s\'ha rebut cap URL d\'imatge',

  /* ── Compartir el perfil. El nombre entra por hueco. ────────────────── */
  shareMessage: '{{nombre}} és a Weë. Mira el seu perfil.',

  /* ── El formulario de editar ────────────────────────────────────────── */
  editTitle: 'Edita el perfil',
  displayNameLabel: 'Nom d\'usuari',
  displayNamePlaceholder: 'El teu nom d\'usuari',
  bioLabel: 'Biografia',
  bioPlaceholder: 'Explica\'ns coses sobre tu...',
  websiteLabel: 'Lloc web',
  websitePlaceholder: 'https://elteulloc.com',
  charCount: '{{usados}}/{{maximo}} caràcters',

  /* ── Los botones de debajo del nombre ───────────────────────────────── */
  editProfile: 'Edita el perfil',
  createWeeProfile: 'Crea el Perfil Weë',

  /* ── La cifra de publicaciones y la pestaña ─────────────────────────── */
  posts: 'Publicacions',
  viewMyEcontacts: 'Mostra els meus {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ────────────────────────────────────────── */
  tabMedia: 'Multimèdia',
  tabReposts: 'Republicacions',
  tabLikes: 'M\'agrada',

  /* ── La lista de publicaciones ──────────────────────────────────────── */
  loadingPosts: 'S\'estan carregant les publicacions...',
  postsFailed: 'No s\'han pogut carregar les publicacions',
  retry: 'Torna-ho a provar',

  /* ── Y cuando la pestaña está vacía ─────────────────────────────────── */
  emptyPosts: 'Encara no tens publicacions',
  emptyPostsHint: 'Comparteix la teva primera publicació!',
  emptyMedia: 'No tens publicacions amb multimèdia',
  emptyMediaHint: 'Crea una publicació amb fotos o vídeos',
  emptyReposts: 'No has tornat a publicar res',
  emptyRepostsHint: 'Comparteix contingut d\'altres usuaris',
  emptyLikes: 'Encara no has marcat cap publicació amb «M\'agrada»',
  emptyLikesHint: 'Marca «M\'agrada» a les publicacions que t\'interessin',
  otherTitle: 'Perfil',
  otherLoadFailed: 'No s\'ha pogut carregar el perfil',
  seeFullProfile: 'Mostra el meu perfil complet',
  emptyCategory: 'Sense publicacions en aquesta categoria',
  actionFailed: 'No s\'ha pogut completar',
  userNotFound: 'L\'usuari no existeix',
  shareOtherMessage: 'Mira el perfil de @{{nombre}} a Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Usuari de Weë',
  joinedOn: 'S\'hi va unir: {{fecha}}',
  tabPolls: 'Enquestes',
};
