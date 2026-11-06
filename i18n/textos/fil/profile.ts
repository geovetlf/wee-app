/*
 * FILIPINO — la pantalla del perfil propio, entera, y la cabecera del perfil de otra persona.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (§ 11.3): «profile», «cover photo», «bio», «avatar», «post», «poll»,
 * «pahintulot» (Android) y «website». El campo «Nombre de usuario» del formulario es el displayName —el @usuario se
 * pinta aparte—, así que es «Pangalan» y no «username», que en filipino es el identificador. Weë profile lleva la
 * marca intacta (§ 6): «Gumawa ng Weë profile».
 *
 * `posts` es a la vez el rótulo de debajo de la cifra y el nombre de la pestaña: «Mga post» sirve para las dos (el
 * plural lo pone «mga», § 4). Las demás pestañas son cortas, porque van cinco en una fila: «Media», «Mga repost»,
 * «Mga nagustuhan» (los posts que te gustaron, como «Mga nagustuhang video» de YouTube en filipino) y «Mga poll».
 * Los estados vacíos son «Wala ka pang …» (§ 10).
 *
 * El nombre de una persona va con su marcador: «ang profile ni {{nombre}}», «ni @{{nombre}}» (§ 12, posesivo de
 * persona). `joinedOn` es el ejemplo del § 8.1, «Sumali noong {{fecha}}», con la fecha que escribe `Intl`
 * («Setyembre 2026»). `viewMyEcontacts` solo lo oye el lector de pantalla: `{{nombre}}` es la agenda (ËContacts o
 * ẄContacts), que no se toca ni lleva «mga» delante: «Tingnan ang {{nombre}} ko». Y `{{motivo}}` o los detalles del
 * servidor no pasan por aquí: son suyos.
 *
 * Los permisos del español no nombran a Weë («Se necesitan permisos…») y aquí tampoco: «Kailangan ng pahintulot…».
 * Los errores dicen «Hindi ma-…» y el paso siguiente, «Subukan ulit» (§ 3.4); `signOutFailed` dice lo mismo que el
 * título de Configuración, «Hindi natuloy ang pag-sign out». La dirección de ejemplo del sitio web se lee
 * («https://websitemo.com»).
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Magdagdag ng cover photo',
  permissionsTitle: 'Mga pahintulot',
  galleryPermission: 'Kailangan ng pahintulot para ma-access ang gallery mo.',
  coverUploadFailed: 'Hindi ma-upload ang cover photo. Subukan ulit.',

  loading: 'Naglo-load ang profile…',
  loadFailed: 'Hindi ma-load ang profile',
  loadFailedDetail: 'Hindi ma-load ang impormasyon ng account mo.',
  backToLogin: 'Bumalik sa pag-sign in',

  nameRequired: 'Hindi puwedeng blangko ang pangalan.',
  updateFailed: 'Hindi ma-update ang profile. Subukan ulit.',
  signOutFailed: 'Hindi natuloy ang pag-sign out. Subukan ulit.',
  noSession: 'Hindi ka naka-sign in.',
  avatarUpdateFailed: 'Hindi ma-update ang avatar. Subukan ulit.',
  imageUrlMissing: 'Walang natanggap na URL ng larawan.',

  shareMessage: 'Tingnan ang profile ni {{nombre}} sa Weë',

  editTitle: 'I-edit ang profile',
  displayNameLabel: 'Pangalan',
  displayNamePlaceholder: 'Pangalan mo',
  bioLabel: 'Bio',
  bioPlaceholder: 'Magkuwento tungkol sa sarili mo…',
  websiteLabel: 'Website',
  websitePlaceholder: 'https://websitemo.com',
  charCount: '{{usados}}/{{maximo}} character',

  editProfile: 'I-edit ang profile',
  createWeeProfile: 'Gumawa ng Weë profile',

  posts: 'Mga post',
  viewMyEcontacts: 'Tingnan ang {{nombre}} ko, {{total}}',

  tabMedia: 'Media',
  tabReposts: 'Mga repost',
  tabLikes: 'Mga nagustuhan',

  loadingPosts: 'Naglo-load ang mga post…',
  postsFailed: 'Hindi ma-load ang mga post.',
  retry: 'Subukan ulit',

  emptyPosts: 'Wala ka pang post',
  emptyPostsHint: 'Ibahagi ang una mong post!',
  emptyMedia: 'Wala ka pang post na may larawan o video',
  emptyMediaHint: 'Gumawa ng post na may larawan o video',
  emptyReposts: 'Wala ka pang na-repost',
  emptyRepostsHint: 'Ibahagi ang content ng ibang user',
  emptyLikes: 'Wala ka pang nagustuhang post',
  emptyLikesHint: 'I-like ang mga post na interesante sa iyo',
  otherTitle: 'Profile',
  otherLoadFailed: 'Hindi ma-load ang profile. Subukan ulit.',
  seeFullProfile: 'Tingnan ang buong profile ko',
  emptyCategory: 'Walang post sa kategoryang ito',
  actionFailed: 'Hindi makumpleto. Subukan ulit.',
  userNotFound: 'Hindi mahanap ang user na ito.',
  shareOtherMessage: 'Tingnan ang profile ni @{{nombre}} sa Weë!\n\n{{bio}}',
  shareOtherNoBio: 'User ng Weë',
  joinedOn: 'Sumali noong {{fecha}}',
  tabPolls: 'Mga poll',
};
