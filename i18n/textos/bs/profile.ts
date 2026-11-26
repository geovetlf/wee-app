/*
 * BOSNIO (bs-BA, ijekaviano, latino) — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre, el usuario, la biografía y el enlace de quien mira entran por
 * hueco y no se tocan; ËContacts/ẄContacts son marca y viajan por `{{nombre}}`.
 * Tuteo. Donde el bosnio marcaría el género de quien mira se elige una forma
 * neutra («Član od {{fecha}}», «Još nema ponovo podijeljenih objava»). El nombre
 * de otra persona no se declina: entra con sustantivo puente («profil korisnika
 * {{nombre}}»).
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Dodaj naslovnu sliku',
  permissionsTitle: 'Dozvole',
  galleryPermission: 'Potrebne su dozvole za pristup galeriji',
  coverUploadFailed: 'Naslovnu sliku nije bilo moguće učitati',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Učitavanje profila...',
  loadFailed: 'Greška pri učitavanju profila',
  loadFailedDetail: 'Podatke o korisniku nije bilo moguće učitati',
  backToLogin: 'Nazad na prijavu',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Ime ne može biti prazno',
  updateFailed: 'Profil nije bilo moguće ažurirati',
  signOutFailed: 'Odjava nije uspjela',
  noSession: 'Nema aktivne sesije',
  avatarUpdateFailed: 'Avatar nije bilo moguće ažurirati. Pokušaj ponovo.',
  imageUrlMissing: 'URL slike nije primljen',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Pogledaj profil korisnika {{nombre}} na Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Uredi profil',
  displayNameLabel: 'Korisničko ime',
  displayNamePlaceholder: 'Tvoje korisničko ime',
  bioLabel: 'Biografija',
  bioPlaceholder: 'Reci nam nešto o sebi...',
  websiteLabel: 'Web stranica',
  websitePlaceholder: 'https://tvojastranica.com',
  charCount: '{{usados}}/{{maximo}} znakova',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Uredi profil',
  createWeeProfile: 'Kreiraj Weë profil',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Objave',
  viewMyEcontacts: 'Pogledaj moje {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Multimedija',
  tabReposts: 'Ponovo podijeljeno',
  tabLikes: 'Sviđanja',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Učitavanje objava...',
  postsFailed: 'Greška pri učitavanju objava',
  retry: 'Pokušaj ponovo',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Još nemaš objava',
  emptyPostsHint: 'Podijeli svoju prvu objavu!',
  emptyMedia: 'Nemaš objava s multimedijom',
  emptyMediaHint: 'Kreiraj objavu s fotografijama ili videima',
  emptyReposts: 'Još nema ponovo podijeljenih objava',
  emptyRepostsHint: 'Podijeli sadržaj drugih korisnika',
  emptyLikes: 'Nemaš objava koje ti se sviđaju',
  emptyLikesHint: 'Označi da ti se sviđaju objave koje te zanimaju',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profil nije bilo moguće učitati',
  seeFullProfile: 'Pogledaj moj cijeli profil',
  emptyCategory: 'Nema objava u ovoj kategoriji',
  actionFailed: 'Nije bilo moguće izvršiti',
  userNotFound: 'Korisnik ne postoji',
  shareOtherMessage: 'Pogledaj profil @{{nombre}} na Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Korisnik aplikacije Weë',
  joinedOn: 'Član od {{fecha}}',
  tabPolls: 'Ankete',
};
