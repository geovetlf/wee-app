/*
 * CROATA — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). El nombre, el usuario, la biografía y el enlace de quien mira
 * se pintan tal cual; ËContacts/ẄContacts entran por hueco; `{{motivo}}` es
 * del servidor. La dirección de EJEMPLO del sitio web se deja como en el
 * molde. Weë es marca y no se declina («u aplikaciji Weë»).
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Dodaj naslovnu sliku',
  permissionsTitle: 'Dopuštenja',
  galleryPermission: 'Za pristup galeriji potrebna su dopuštenja',
  coverUploadFailed: 'Naslovnu sliku nije bilo moguće prenijeti',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Učitavanje profila...',
  loadFailed: 'Pogreška pri učitavanju profila',
  loadFailedDetail: 'Podatke o korisniku nije bilo moguće učitati',
  backToLogin: 'Natrag na prijavu',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Ime ne može biti prazno',
  updateFailed: 'Profil nije bilo moguće ažurirati',
  signOutFailed: 'Odjava nije uspjela',
  noSession: 'Nema aktivne sesije',
  avatarUpdateFailed: 'Avatar nije bilo moguće ažurirati. Pokušaj ponovno.',
  imageUrlMissing: 'URL slike nije primljen',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Pogledaj profil korisnika {{nombre}} u aplikaciji Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Uredi profil',
  displayNameLabel: 'Korisničko ime',
  displayNamePlaceholder: 'Tvoje korisničko ime',
  bioLabel: 'Biografija',
  bioPlaceholder: 'Reci nam nešto o sebi...',
  websiteLabel: 'Web-stranica',
  websitePlaceholder: 'https://tvojastranica.hr',
  charCount: '{{usados}}/{{maximo}} znakova',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Uredi profil',
  createWeeProfile: 'Stvori Weë profil',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Objave',
  viewMyEcontacts: 'Prikaži moje {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Multimedija',
  tabReposts: 'Ponovno podijeljeno',
  tabLikes: 'Sviđanja',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Učitavanje objava...',
  postsFailed: 'Pogreška pri učitavanju objava',
  retry: 'Pokušaj ponovno',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Još nemaš objava',
  emptyPostsHint: 'Podijeli svoju prvu objavu!',
  emptyMedia: 'Nemaš objava s multimedijom',
  emptyMediaHint: 'Stvori objavu s fotografijama ili videozapisima',
  emptyReposts: 'Još nema ponovno podijeljenih objava',
  emptyRepostsHint: 'Podijeli sadržaj drugih korisnika',
  emptyLikes: 'Nemaš objava koje ti se sviđaju',
  emptyLikesHint: 'Označi sa „sviđa mi se“ objave koje te zanimaju',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profil nije bilo moguće učitati',
  seeFullProfile: 'Prikaži moj cijeli profil',
  emptyCategory: 'Nema objava u ovoj kategoriji',
  actionFailed: 'Nije bilo moguće dovršiti',
  userNotFound: 'Korisnik ne postoji',
  shareOtherMessage: 'Pogledaj profil @{{nombre}} u aplikaciji Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Korisnik aplikacije Weë',
  joinedOn: 'Član od {{fecha}}',
  tabPolls: 'Ankete',
};
