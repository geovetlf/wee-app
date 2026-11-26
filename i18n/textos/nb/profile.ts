/*
 * NORUEGO BOKMÅL — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre, el usuario, la biografía y el enlace de quien mira se pintan tal
 * cual; ËContacts y ẄContacts entran por hueco; `{{motivo}}` es del servidor.
 * La dirección de EJEMPLO del enlace sí se traduce («https://dittnettsted.no»).
 * «Like» es «liker» (glosario) y «repost» es «delt på nytt»; la pestaña se
 * llama «Delt på nytt». «Media» se dice «Medier».
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Legg til forsidebilde',
  permissionsTitle: 'Tillatelser',
  galleryPermission: 'Du må gi tillatelse til å bruke galleriet',
  coverUploadFailed: 'Kunne ikke laste opp forsidebildet',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Laster profil…',
  loadFailed: 'Kunne ikke laste profilen',
  /* Solo se lee si el error llega sin explicación propia. */
  loadFailedDetail: 'Kunne ikke hente brukerinformasjonen',
  backToLogin: 'Tilbake til innlogging',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Navnet kan ikke være tomt',
  updateFailed: 'Kunne ikke oppdatere profilen',
  signOutFailed: 'Kunne ikke logge ut',
  noSession: 'Ingen aktiv økt',
  /* `{{motivo}}` lo escribe quien falló —el almacén, la red—: se enseña crudo. */
  avatarUpdateFailed: 'Kunne ikke oppdatere avataren. Prøv igjen.',
  imageUrlMissing: 'Mottok ingen bilde-URL',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Se profilen til {{nombre}} på Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Rediger profil',
  displayNameLabel: 'Brukernavn',
  displayNamePlaceholder: 'Brukernavnet ditt',
  bioLabel: 'Biografi',
  bioPlaceholder: 'Fortell oss om deg selv…',
  websiteLabel: 'Nettsted',
  /* Una dirección de EJEMPLO, no la de nadie: es texto que se lee. */
  websitePlaceholder: 'https://dittnettsted.no',
  /* El contador de los tres campos: gastados y tope, los dos por hueco. */
  charCount: '{{usados}}/{{maximo}} tegn',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Rediger profil',
  createWeeProfile: 'Opprett Profil Weë',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Innlegg',
  /* Lector de pantalla. El nombre de la agenda y la cifra entran por hueco. */
  viewMyEcontacts: 'Se mine {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Medier',
  tabReposts: 'Delt på nytt',
  tabLikes: 'Liker',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Laster innlegg…',
  postsFailed: 'Kunne ikke laste innleggene',
  retry: 'Prøv igjen',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Du har ingen innlegg ennå',
  emptyPostsHint: 'Del ditt første innlegg!',
  emptyMedia: 'Du har ingen innlegg med medier',
  emptyMediaHint: 'Lag et innlegg med bilder eller videoer',
  emptyReposts: 'Du har ikke delt noe på nytt',
  emptyRepostsHint: 'Del innhold fra andre brukere',
  emptyLikes: 'Du har ingen innlegg du liker',
  emptyLikesHint: 'Lik innleggene som interesserer deg',
  otherTitle: 'Profil',
  otherLoadFailed: 'Kunne ikke laste profilen',
  seeFullProfile: 'Se hele profilen min',
  emptyCategory: 'Ingen innlegg i denne kategorien',
  actionFailed: 'Kunne ikke fullføre',
  userNotFound: 'Brukeren finnes ikke',
  shareOtherMessage: 'Se profilen til @{{nombre}} på Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Bruker på Weë',
  joinedOn: 'Ble med {{fecha}}',
  tabPolls: 'Avstemninger',
};
