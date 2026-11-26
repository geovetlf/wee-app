/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — La pantalla del perfil propio, entera.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Perfil = «profili» (préstamo, pendiente), portada = «saqqaa»,
 * biografía = «imminut oqaluttuarineq», republicar = «saqqummiuteqqiguk», likes =
 * «nuannarisat». Cargar = «takutinneqalerpoq…» (empieza a mostrarse). El nombre ({{nombre}})
 * va aislado tras dos puntos («Profili takuuk: {{nombre}} · Weë»), nunca con sufijo.
 * Nombre, usuario, biografía, enlace y {{motivo}} no pasan por aquí.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Saqqamik ilanngussigit',
  permissionsTitle: 'Akuersissutit',
  galleryPermission: 'Akuersissut pisariaqarpoq: assinut toqqorsivik',
  coverUploadFailed: 'Saqqamut assip ikkunnera iluatsinngilaq',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Profili takutinneqalerpoq…',
  loadFailed: 'Profilip takutinnera iluatsinngilaq',
  /* Solo se lee si el error llega sin explicación propia. */
  loadFailedDetail: 'Atuisup paasissutissai takutinneqarsinnaanngillat',
  backToLogin: 'Isernermut uterit',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Ateq imaqanngitsuusinnaanngilaq',
  updateFailed: 'Profilip nutarternera iluatsinngilaq',
  signOutFailed: 'Anineq iluatsinngilaq',
  noSession: 'Isersimasoqanngilaq',
  /* `{{motivo}}` lo escribe quien falló —el almacén, la red—: se enseña crudo. */
  avatarUpdateFailed: 'Profilimut assip nutarternera iluatsinngilaq. Misileqqiguk.',
  imageUrlMissing: 'Assip URL-ia tigusaanngilaq',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Profili takuuk: {{nombre}} · Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Profili aaqqissoruk',
  displayNameLabel: 'Atuisutut ateq',
  displayNamePlaceholder: 'Atuisutut atit',
  bioLabel: 'Imminut oqaluttuarineq',
  bioPlaceholder: 'Illit pillutit oqaluttuarisigut…',
  websiteLabel: 'Nittartagaq',
  /* Una dirección de EJEMPLO, no la de nadie: es texto que se lee. */
  websitePlaceholder: 'https://nittartakkat.com',
  /* El contador de los tres campos: gastados y tope, los dos por hueco. */
  charCount: '{{usados}}/{{maximo}} naqinnerit',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Profili aaqqissoruk',
  createWeeProfile: 'Profili Weë pilersiguk',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Saqqummiussat',
  /* Lector de pantalla. El nombre de la agenda y la cifra entran por hueco. */
  viewMyEcontacts: 'Takukkit: {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Assit videollu',
  tabReposts: 'Saqqummiuteqqitat',
  tabLikes: 'Nuannarisat',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Saqqummiussat takutinneqalerput…',
  postsFailed: 'Saqqummiussat takutinneqarsinnaanngillat',
  retry: 'Misileqqiguk',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Suli saqqummiussaqanngilatit',
  emptyPostsHint: 'Saqqummiussaq siulleq siammarteruk!',
  emptyMedia: 'Saqqummiussanik assilinnik videolinnilluunniit peqanngilatit',
  emptyMediaHint: 'Saqqummiussamik assilimmik videolimmilluunniit pilersitsigit',
  emptyReposts: 'Suli sumik saqqummiuteqqisimanngilatit',
  emptyRepostsHint: 'Atuisut allat imarisaannik siammartitsigit',
  emptyLikes: 'Saqqummiussanik nuannarisanik peqanngilatit',
  emptyLikesHint: 'Saqqummiussat soqutigisatit nuannarikkit',
  otherTitle: 'Profili',
  otherLoadFailed: 'Profili takutinneqarsinnaanngilaq',
  seeFullProfile: 'Profilera tamakkiisoq takuuk',
  emptyCategory: 'Immikkoortumi matumani saqqummiussaqanngilaq',
  actionFailed: 'Naammassineqarsinnaanngilaq',
  userNotFound: 'Atuisoq peqanngilaq',
  shareOtherMessage: 'Profili takuuk: @{{nombre}} · Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Atuisoq · Weë',
  joinedOn: 'Ilaasortanngorpoq: {{fecha}}',
  tabPolls: 'Apersuinerit',
};
