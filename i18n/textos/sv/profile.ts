/*
 * SUECO — la pantalla del perfil propio, entera, y la cabecera del perfil de
 * otra persona.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El campo «Nombre de usuario» del formulario es el displayName —el @usuario se
 * pinta aparte—, así que es «Visningsnamn» y no «Användarnamn», que en sueco es
 * el identificador. La biografía es «Presentation», como en Instagram y Facebook
 * en sueco (y porque «bio» en sueco es también el cine). La portada es la
 * «omslagsbild», el sitio web la «webbplats» y los permisos, «behörigheter».
 *
 * `posts` es a la vez el rótulo de debajo de la cifra y el nombre de la pestaña:
 * «Inlägg» sirve para las dos porque no cambia en plural. Las demás pestañas son
 * cortas, porque van cinco en una fila: «Media» (se escribe igual que en español
 * y en inglés porque es la palabra sueca, la de X y Bluesky), «Återpublicerat»,
 * «Gillat» (como el «Gillat» de Instagram) y «Omröstningar».
 *
 * Compartir un perfil no puede decir «{{nombre}}s profil» sin pegarle el
 * genitivo al hueco, así que se dice «Kolla in {{nombre}} på Weë». `joinedOn` es
 * «Gick med i {{fecha}}», con la fecha que escribe `Intl` («september 2026»).
 * `viewMyEcontacts` solo lo oye el lector de pantalla: `{{nombre}}` es la agenda
 * (ËContacts o ẄContacts), que no se toca. Y `{{motivo}}` o los detalles del
 * servidor no pasan por aquí: son suyos.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Lägg till omslagsbild',
  permissionsTitle: 'Behörigheter',
  galleryPermission: 'Weë behöver åtkomst till bildgalleriet',
  coverUploadFailed: 'Det gick inte att ladda upp omslagsbilden',

  loading: 'Laddar profilen…',
  loadFailed: 'Det gick inte att ladda profilen',
  loadFailedDetail: 'Det gick inte att ladda användaruppgifterna',
  backToLogin: 'Tillbaka till inloggningen',

  nameRequired: 'Namnet får inte vara tomt',
  updateFailed: 'Det gick inte att uppdatera profilen',
  signOutFailed: 'Det gick inte att logga ut',
  noSession: 'Du är inte inloggad',
  avatarUpdateFailed: 'Det gick inte att uppdatera avataren. Försök igen.',
  imageUrlMissing: 'Ingen bild-URL kom tillbaka',

  shareMessage: 'Kolla in {{nombre}} på Weë',

  editTitle: 'Redigera profil',
  displayNameLabel: 'Visningsnamn',
  displayNamePlaceholder: 'Ditt visningsnamn',
  bioLabel: 'Presentation',
  bioPlaceholder: 'Berätta lite om dig själv…',
  websiteLabel: 'Webbplats',
  websitePlaceholder: 'https://dinsida.se',
  charCount: '{{usados}}/{{maximo}} tecken',

  editProfile: 'Redigera profil',
  createWeeProfile: 'Skapa Weë-profil',

  posts: 'Inlägg',
  viewMyEcontacts: 'Visa mina {{nombre}}, {{total}}',

  tabMedia: 'Media',
  tabReposts: 'Återpublicerat',
  tabLikes: 'Gillat',

  loadingPosts: 'Laddar inlägg…',
  postsFailed: 'Det gick inte att ladda inläggen',
  retry: 'Försök igen',

  emptyPosts: 'Inga inlägg ännu',
  emptyPostsHint: 'Publicera ditt första inlägg!',
  emptyMedia: 'Inga inlägg med foton eller videor ännu',
  emptyMediaHint: 'Skapa ett inlägg med foton eller videor',
  emptyReposts: 'Du har inte återpublicerat något ännu',
  emptyRepostsHint: 'Återpublicera inlägg från andra',
  emptyLikes: 'Du har inte gillat några inlägg ännu',
  emptyLikesHint: 'Gilla inlägg som intresserar dig',
  otherTitle: 'Profil',
  otherLoadFailed: 'Det gick inte att ladda profilen',
  seeFullProfile: 'Visa hela min profil',
  emptyCategory: 'Inga inlägg i den här kategorin',
  actionFailed: 'Det gick inte att slutföra',
  userNotFound: 'Användaren finns inte',
  shareOtherMessage: 'Kolla in @{{nombre}} på Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Användare på Weë',
  joinedOn: 'Gick med i {{fecha}}',
  tabPolls: 'Omröstningar',
};
