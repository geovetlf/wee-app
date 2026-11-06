/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica, ekavski) — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español. El nombre, el usuario, la biografía y el enlace
 * los escribe la persona; ËContacts/ẄContacts entran por `{{nombre}}`. La
 * dirección de EJEMPLO del enlace se lee, no se visita: va en cirílico con «.com». Las frases en pasado con
 * sujeto variable («Se unió», «No has reposteado») van sin género.
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
  loadFailedDetail: 'Podaci o korisniku nisu mogli da se učitaju',
  backToLogin: 'Nazad na prijavu',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Ime ne može biti prazno',
  updateFailed: 'Profil nije mogao da se ažurira',
  signOutFailed: 'Odjava nije uspela',
  noSession: 'Nema aktivne sesije',
  avatarUpdateFailed: 'Avatar nije mogao da se ažurira. Pokušaj ponovo.',
  imageUrlMissing: 'URL slike nije primljen',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Pogledaj profil korisnika {{nombre}} na Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Izmeni profil',
  displayNameLabel: 'Ime za prikaz',
  displayNamePlaceholder: 'Tvoje ime za prikaz',
  bioLabel: 'Biografija',
  bioPlaceholder: 'Reci nam nešto o sebi...',
  websiteLabel: 'Veb-sajt',
  websitePlaceholder: 'https://tvoj-sajt.com',
  charCount: '{{usados}}/{{maximo}} znakova',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Izmeni profil',
  createWeeProfile: 'Napravi Weë profil',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Objave',
  viewMyEcontacts: 'Prikaži moje {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Mediji',
  tabReposts: 'Ponovna deljenja',
  tabLikes: 'Lajkovi',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Učitavanje objava...',
  postsFailed: 'Greška pri učitavanju objava',
  retry: 'Pokušaj ponovo',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Još nemaš objava',
  emptyPostsHint: 'Podeli svoju prvu objavu!',
  emptyMedia: 'Nemaš objave sa fotografijama ili video-snimcima',
  emptyMediaHint: 'Napravi objavu sa fotografijama ili video-snimcima',
  emptyReposts: 'Još nema ponovnih deljenja',
  emptyRepostsHint: 'Podeli sadržaj drugih korisnika',
  emptyLikes: 'Nemaš lajkovanih objava',
  emptyLikesHint: 'Lajkuj objave koje te zanimaju',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profil nije mogao da se učita',
  seeFullProfile: 'Prikaži moj ceo profil',
  emptyCategory: 'Nema objava u ovoj kategoriji',
  actionFailed: 'Nije moguće završiti radnju',
  userNotFound: 'Korisnik ne postoji',
  shareOtherMessage: 'Pogledaj profil @{{nombre}} na Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Korisnik aplikacije Weë',
  joinedOn: 'Član od {{fecha}}',
  tabPolls: 'Ankete',
};
