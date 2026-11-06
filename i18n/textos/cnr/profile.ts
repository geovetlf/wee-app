/*
 * MONTENEGRINO — la pantalla del perfil propio, entera.
 *
 * Ijekaviano, latino. Tipado contra el español: si allí hay una clave que aquí
 * falta, no compila. El nombre, el usuario, la biografía y el enlace de quien
 * mira se pintan tal cual; ËContacts/ẄContacts entran por `{{nombre}}`; la
 * dirección de EJEMPLO del sitio web sí se traduce porque solo se lee.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Dodaj naslovnu sliku',
  permissionsTitle: 'Dozvole',
  galleryPermission: 'Potrebne su dozvole za pristup galeriji',
  coverUploadFailed: 'Naslovna slika nije mogla da se otpremi',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Učitavanje profila...',
  loadFailed: 'Greška pri učitavanju profila',
  /* Solo se lee si el error llega sin explicación propia. */
  loadFailedDetail: 'Podaci o korisniku nijesu mogli da se učitaju',
  backToLogin: 'Nazad na prijavu',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Ime ne može biti prazno',
  updateFailed: 'Profil nije mogao da se ažurira',
  signOutFailed: 'Odjavljivanje nije uspjelo',
  noSession: 'Nema aktivne sesije',
  /* `{{motivo}}` lo escribe quien falló —el almacén, la red—: se enseña crudo. */
  avatarUpdateFailed: 'Avatar nije mogao da se ažurira. Pokušaj ponovo.',
  imageUrlMissing: 'URL slike nije primljen',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Pogledaj profil {{nombre}} na Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Izmijeni profil',
  displayNameLabel: 'Korisničko ime',
  displayNamePlaceholder: 'Tvoje korisničko ime',
  bioLabel: 'Biografija',
  bioPlaceholder: 'Reci nam nešto o sebi...',
  websiteLabel: 'Veb-sajt',
  /* Una dirección de EJEMPLO, no la de nadie: es texto que se lee. */
  websitePlaceholder: 'https://tvojsajt.com',
  /* El contador de los tres campos: gastados y tope, los dos por hueco. */
  charCount: '{{usados}}/{{maximo}} znakova',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Izmijeni profil',
  createWeeProfile: 'Kreiraj Weë profil',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Objave',
  /* Lector de pantalla. El nombre de la agenda y la cifra entran por hueco. */
  viewMyEcontacts: 'Pogledaj moje {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Multimedija',
  tabReposts: 'Podijeljeno',
  tabLikes: 'Sviđanja',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Učitavanje objava...',
  postsFailed: 'Greška pri učitavanju objava',
  retry: 'Pokušaj ponovo',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Još nemaš objava',
  emptyPostsHint: 'Podijeli svoju prvu objavu!',
  emptyMedia: 'Nemaš objava s multimedijom',
  emptyMediaHint: 'Kreiraj objavu s fotografijama ili videosnimcima',
  emptyReposts: 'Nijesi ništa podijelio/la ponovo',
  emptyRepostsHint: 'Podijeli sadržaj drugih korisnika',
  emptyLikes: 'Nemaš objava koje ti se sviđaju',
  emptyLikesHint: 'Označi da ti se sviđaju objave koje te zanimaju',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profil nije mogao da se učita',
  seeFullProfile: 'Pogledaj moj cijeli profil',
  emptyCategory: 'Nema objava u ovoj kategoriji',
  actionFailed: 'Radnja nije mogla da se izvrši',
  userNotFound: 'Korisnik ne postoji',
  shareOtherMessage: 'Pogledaj profil @{{nombre}} na Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Korisnik aplikacije Weë',
  joinedOn: 'Pridružio/la se {{fecha}}',
  tabPolls: 'Ankete',
};
