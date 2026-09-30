/*
 * ALEMÁN — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). "Reposts" y "Likes" se dicen igual en alemán.
 * `{{nombre}}` de la agenda (ËContact) y `{{motivo}}` del servidor salen sin
 * tocar: no son palabras nuestras.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Titelbild hinzufügen',
  permissionsTitle: 'Berechtigungen',
  galleryPermission: 'Weë braucht Zugriff auf deine Galerie',
  coverUploadFailed: 'Das Titelbild konnte nicht hochgeladen werden',

  loading: 'Profil wird geladen...',
  loadFailed: 'Das Profil konnte nicht geladen werden',
  loadFailedDetail: 'Deine Kontodaten konnten nicht geladen werden',
  backToLogin: 'Zurück zur Anmeldung',

  nameRequired: 'Der Name darf nicht leer sein',
  updateFailed: 'Das Profil konnte nicht aktualisiert werden',
  signOutFailed: 'Du konntest nicht abgemeldet werden',
  noSession: 'Es gibt keine aktive Sitzung',
  avatarUpdateFailed: 'Der Avatar konnte nicht aktualisiert werden. Versuch es noch einmal.',
  imageUrlMissing: 'Es kam keine Bild-URL zurück',

  shareMessage: 'Schau dir {{nombre}} auf Weë an',

  editTitle: 'Profil bearbeiten',
  displayNameLabel: 'Anzeigename',
  displayNamePlaceholder: 'Dein Anzeigename',
  bioLabel: 'Bio',
  bioPlaceholder: 'Erzähl uns von dir...',
  websiteLabel: 'Website',
  websitePlaceholder: 'https://deineseite.de',
  charCount: '{{usados}}/{{maximo}} Zeichen',

  editProfile: 'Profil bearbeiten',
  createWeeProfile: 'Weë Profil erstellen',

  posts: 'Beiträge',
  viewMyEcontacts: 'Meine {{nombre}} ansehen, {{total}}',

  tabMedia: 'Medien',
  tabReposts: 'Reposts',
  tabLikes: 'Likes',

  loadingPosts: 'Beiträge werden geladen...',
  postsFailed: 'Die Beiträge konnten nicht geladen werden',
  retry: 'Erneut versuchen',

  emptyPosts: 'Du hast noch keine Beiträge',
  emptyPostsHint: 'Teil deinen ersten Beitrag!',
  emptyMedia: 'Du hast keine Beiträge mit Fotos oder Videos',
  emptyMediaHint: 'Erstelle einen Beitrag mit Fotos oder Videos',
  emptyReposts: 'Du hast noch nichts repostet',
  emptyRepostsHint: 'Teil, was andere machen',
  emptyLikes: 'Dir gefällt noch kein Beitrag',
  emptyLikesHint: 'Gib den Beiträgen ein Gefällt mir, die dich interessieren',
  otherTitle: 'Profil',
  otherLoadFailed: 'Das Profil konnte nicht geladen werden',
  seeFullProfile: 'Mein vollständiges Profil ansehen',
  emptyCategory: 'Keine Beiträge in dieser Kategorie',
  actionFailed: 'Das konnte nicht abgeschlossen werden',
  userNotFound: 'Dieses Konto gibt es nicht',
  shareOtherMessage: 'Schau dir das Profil von @{{nombre}} auf Weë an!\n\n{{bio}}',
  shareOtherNoBio: 'Mitglied bei Weë',
  joinedOn: 'Dabei seit {{fecha}}',
  tabPolls: 'Umfragen',
};
