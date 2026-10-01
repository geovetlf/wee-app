/*
 * DANÉS — la pantalla del perfil propio, entera, y la cabecera del perfil de
 * otra persona.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El campo «Nombre de usuario» del formulario es el displayName —el @usuario se
 * pinta aparte—, así que es «Visningsnavn» (glosario § 9.6) y no «Brugernavn»,
 * que en danés es el identificador. La biografía es «Bio», la portada el
 * «coverbillede», el sitio web el «websted» (Apple, Microsoft e Instagram en
 * danés) y los permisos, «Tilladelser».
 *
 * `posts` es a la vez el rótulo de debajo de la cifra y el nombre de la pestaña:
 * «Opslag» sirve para las dos porque no cambia en plural. Las demás pestañas son
 * cortas, porque van cinco en una fila: «Medier», «Delt igen» (Repost = «Del
 * igen», glosario § 9.2), «Likes» (se escribe igual que en español y en inglés
 * porque es la palabra danesa del contador, Retskrivningsordbogen: «like»,
 * pl. «likes») y «Afstemninger». Los estados vacíos son «Ingen … endnu».
 *
 * Compartir un perfil no puede decir «{{nombre}}s profil» sin pegarle el
 * genitivo al hueco (y los nombres en -s llevarían apóstrofo), así que se dice
 * «Se profilen for {{nombre}} på Weë». `joinedOn` es «Medlem siden {{fecha}}»,
 * con la fecha que escribe `Intl` («september 2026»). `viewMyEcontacts` solo lo
 * oye el lector de pantalla: `{{nombre}}` es la agenda (ËContacts o
 * ẄContacts), que no se toca. Y `{{motivo}}` o los detalles del servidor no
 * pasan por aquí: son suyos.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Tilføj coverbillede',
  permissionsTitle: 'Tilladelser',
  galleryPermission: 'Weë skal have tilladelse til at bruge dit galleri.',
  coverUploadFailed: 'Coverbilledet kunne ikke uploades. Prøv igen.',

  loading: 'Indlæser profil…',
  loadFailed: 'Profilen kunne ikke indlæses',
  loadFailedDetail: 'Brugeroplysningerne kunne ikke indlæses.',
  backToLogin: 'Tilbage til login',

  nameRequired: 'Skriv et visningsnavn.',
  updateFailed: 'Profilen kunne ikke opdateres. Prøv igen.',
  signOutFailed: 'Vi kunne ikke logge dig ud. Prøv igen.',
  noSession: 'Du er ikke logget ind.',
  avatarUpdateFailed: 'Avataren kunne ikke opdateres. Prøv igen.',
  imageUrlMissing: 'Vi modtog ingen billed-URL.',

  shareMessage: 'Se profilen for {{nombre}} på Weë',

  editTitle: 'Rediger profil',
  displayNameLabel: 'Visningsnavn',
  displayNamePlaceholder: 'Dit visningsnavn',
  bioLabel: 'Bio',
  bioPlaceholder: 'Fortæl lidt om dig selv…',
  websiteLabel: 'Websted',
  websitePlaceholder: 'https://ditwebsted.dk',
  charCount: '{{usados}}/{{maximo}} tegn',

  editProfile: 'Rediger profil',
  createWeeProfile: 'Opret Weë-profil',

  posts: 'Opslag',
  viewMyEcontacts: 'Se mine {{nombre}}, {{total}}',

  tabMedia: 'Medier',
  tabReposts: 'Delt igen',
  tabLikes: 'Likes',

  loadingPosts: 'Indlæser opslag…',
  postsFailed: 'Opslagene kunne ikke indlæses.',
  retry: 'Prøv igen',

  emptyPosts: 'Ingen opslag endnu',
  emptyPostsHint: 'Del dit første opslag!',
  emptyMedia: 'Ingen opslag med billeder eller videoer endnu',
  emptyMediaHint: 'Lav et opslag med billeder eller videoer',
  emptyReposts: 'Du har ikke delt noget igen endnu',
  emptyRepostsHint: 'Del andres opslag igen',
  emptyLikes: 'Du har ikke syntes godt om noget endnu',
  emptyLikesHint: 'Tryk på Synes godt om ved de opslag, der interesserer dig',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profilen kunne ikke indlæses.',
  seeFullProfile: 'Se hele min profil',
  emptyCategory: 'Ingen opslag i denne kategori',
  actionFailed: 'Handlingen kunne ikke gennemføres',
  userNotFound: 'Brugeren findes ikke.',
  shareOtherMessage: 'Se profilen for @{{nombre}} på Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Bruger på Weë',
  joinedOn: 'Medlem siden {{fecha}}',
  tabPolls: 'Afstemninger',
};
