/*
 * IRLANDÉS — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo. Nombre, usuario, biografía, enlace y `{{motivo}}` llegan por hueco y
 * salen sin tocar; ËContacts/ẄContacts son marca. La URL de ejemplo se deja
 * tal cual. La pestaña «Likes» es «Is maith liom», como la acción.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ── */
  addCover: 'Cuir clúdach leis',
  permissionsTitle: 'Ceadanna',
  galleryPermission: 'Tá ceadanna ag teastáil chun an gailearaí a rochtain',
  coverUploadFailed: 'Níorbh fhéidir íomhá an chlúdaigh a uaslódáil',

  /* ── Los dos estados con los que puede abrirse la pantalla ── */
  loading: 'Próifíl á lódáil...',
  loadFailed: 'Earráid agus an phróifíl á lódáil',
  loadFailedDetail: 'Níorbh fhéidir eolas an úsáideora a lódáil',
  backToLogin: 'Ar ais go dtí an logáil isteach',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ── */
  nameRequired: 'Ní féidir leis an ainm a bheith folamh',
  updateFailed: 'Níorbh fhéidir an phróifíl a nuashonrú',
  signOutFailed: 'Níorbh fhéidir logáil amach',
  noSession: 'Níl aon seisiún gníomhach ann',
  avatarUpdateFailed: 'Níorbh fhéidir an t-abhatár a nuashonrú. Bain triail eile as.',
  imageUrlMissing: 'Ní bhfuarthas URL íomhá',

  /* ── Compartir el perfil ── */
  shareMessage: 'Féach ar phróifíl {{nombre}} ar Weë',

  /* ── El formulario de editar ── */
  editTitle: 'Cuir an phróifíl in eagar',
  displayNameLabel: 'Ainm úsáideora',
  displayNamePlaceholder: 'D\'ainm úsáideora',
  bioLabel: 'Beathaisnéis',
  bioPlaceholder: 'Inis dúinn fút féin...',
  websiteLabel: 'Suíomh gréasáin',
  websitePlaceholder: 'https://dosuiomh.ie',
  charCount: '{{usados}}/{{maximo}} carachtar',

  /* ── Los botones de debajo del nombre ── */
  editProfile: 'Cuir an phróifíl in eagar',
  createWeeProfile: 'Cruthaigh Próifíl Weë',

  /* ── La cifra de publicaciones y la pestaña ── */
  posts: 'Postálacha',
  viewMyEcontacts: 'Féach ar mo {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ── */
  tabMedia: 'Meáin',
  tabReposts: 'Athphostálacha',
  tabLikes: 'Is maith liom',

  /* ── La lista de publicaciones ── */
  loadingPosts: 'Postálacha á lódáil...',
  postsFailed: 'Earráid agus na postálacha á lódáil',
  retry: 'Bain triail eile as',

  /* ── Y cuando la pestaña está vacía ── */
  emptyPosts: 'Níl aon phostálacha agat fós',
  emptyPostsHint: 'Roinn do chéad phostáil!',
  emptyMedia: 'Níl aon phostálacha le meáin agat',
  emptyMediaHint: 'Cruthaigh postáil le grianghraif nó le físeáin',
  emptyReposts: 'Níor athphostáil tú rud ar bith',
  emptyRepostsHint: 'Roinn ábhar ó úsáideoirí eile',
  emptyLikes: 'Níl aon phostálacha ann is maith leat',
  emptyLikesHint: 'Tabhair “Is maith liom” do na postálacha a bhfuil spéis agat iontu',
  otherTitle: 'Próifíl',
  otherLoadFailed: 'Níorbh fhéidir an phróifíl a lódáil',
  seeFullProfile: 'Féach ar mo phróifíl iomlán',
  emptyCategory: 'Gan postálacha sa chatagóir seo',
  actionFailed: 'Níorbh fhéidir é a chur i gcrích',
  userNotFound: 'Níl an t-úsáideoir ann',
  shareOtherMessage: 'Féach ar phróifíl @{{nombre}} ar Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Úsáideoir Weë',
  joinedOn: 'Ball ó {{fecha}}',
  tabPolls: 'Pobalbhreitheanna',
};
