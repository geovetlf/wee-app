/*
 * HÚNGARO — La pantalla del perfil propio y la de otra persona. Tipado contra
 * el español.
 *
 * El nombre de la persona entra por hueco como poseedor sin marca («Nézd meg
 * {{nombre}} profilját»), nunca con sufijo pegado. Media, Reposts y Likes se
 * quedan en inglés porque el español también los deja así.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── Borítókép ── */
  addCover: 'Borítókép hozzáadása',
  permissionsTitle: 'Engedélyek',
  galleryPermission: 'Engedély szükséges a galéria eléréséhez',
  coverUploadFailed: 'Nem sikerült feltölteni a borítóképet',

  /* ── Betöltés ── */
  loading: 'Profil betöltése...',
  loadFailed: 'Nem sikerült betölteni a profilt',
  loadFailedDetail: 'Nem sikerült betölteni a felhasználó adatait',
  backToLogin: 'Vissza a bejelentkezéshez',

  /* ── Hibák ── */
  nameRequired: 'A név nem lehet üres',
  updateFailed: 'Nem sikerült frissíteni a profilt',
  signOutFailed: 'Nem sikerült kijelentkezni',
  noSession: 'Nincs aktív munkamenet',
  avatarUpdateFailed: 'Nem sikerült frissíteni az avatart. Próbáld újra.',
  imageUrlMissing: 'Nem érkezett kép-URL',

  /* ── Megosztás ── */
  shareMessage: 'Nézd meg {{nombre}} profilját a Weë-n',

  /* ── Szerkesztés ── */
  editTitle: 'Profil szerkesztése',
  displayNameLabel: 'Felhasználónév',
  displayNamePlaceholder: 'A felhasználóneved',
  bioLabel: 'Bemutatkozás',
  bioPlaceholder: 'Mesélj magadról...',
  websiteLabel: 'Weboldal',
  websitePlaceholder: 'https://weboldalad.hu',
  charCount: '{{usados}}/{{maximo}} karakter',

  /* ── Gombok ── */
  editProfile: 'Profil szerkesztése',
  createWeeProfile: 'Weë-profil létrehozása',

  /* ── Bejegyzések ── */
  posts: 'Bejegyzések',
  viewMyEcontacts: 'Saját {{nombre}} megtekintése, {{total}}',

  /* ── Fülek ── */
  tabMedia: 'Média',
  tabReposts: 'Újraosztások',
  tabLikes: 'Kedvelések',

  /* ── Bejegyzéslista ── */
  loadingPosts: 'Bejegyzések betöltése...',
  postsFailed: 'Nem sikerült betölteni a bejegyzéseket',
  retry: 'Próbáld újra',

  /* ── Üres fülek ── */
  emptyPosts: 'Még nincsenek bejegyzéseid',
  emptyPostsHint: 'Oszd meg az első bejegyzésedet!',
  emptyMedia: 'Nincsenek fotót vagy videót tartalmazó bejegyzéseid',
  emptyMediaHint: 'Hozz létre egy bejegyzést fotókkal vagy videókkal',
  emptyReposts: 'Még nem osztottál újra semmit',
  emptyRepostsHint: 'Oszd meg mások tartalmait',
  emptyLikes: 'Még nem kedveltél egy bejegyzést sem',
  emptyLikesHint: 'Kedveld azokat a bejegyzéseket, amelyek érdekelnek',
  otherTitle: 'Profil',
  otherLoadFailed: 'Nem sikerült betölteni a profilt',
  seeFullProfile: 'A teljes profilom megtekintése',
  emptyCategory: 'Ebben a kategóriában nincsenek bejegyzések',
  actionFailed: 'Nem sikerült befejezni',
  userNotFound: 'A felhasználó nem létezik',
  shareOtherMessage: 'Nézd meg @{{nombre}} profilját a Weë-n!\n\n{{bio}}',
  shareOtherNoBio: 'Weë-felhasználó',
  joinedOn: 'Csatlakozott: {{fecha}}',
  tabPolls: 'Szavazások',
};
