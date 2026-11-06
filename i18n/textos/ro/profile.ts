/*
 * RUMANO — la pantalla del perfil propio, entera. Tipado contra el español.
 *
 * El nombre, el usuario, la biografía y el enlace de quien mira, ËContacts y
 * ẄContacts y el `{{motivo}}` del servidor entran por hueco y salen sin tocar.
 * Como el rumano pone el artículo al final de la palabra y no sabemos qué
 * entra por el hueco, nunca se declina: «profilul utilizatorului {{nombre}}».
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Adaugă o copertă',
  permissionsTitle: 'Permisiuni',
  galleryPermission: 'Sunt necesare permisiuni pentru a accesa galeria',
  coverUploadFailed: 'Imaginea de copertă nu a putut fi încărcată',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Se încarcă profilul...',
  loadFailed: 'Eroare la încărcarea profilului',
  loadFailedDetail: 'Informațiile utilizatorului nu au putut fi încărcate',
  backToLogin: 'Înapoi la conectare',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Numele nu poate fi gol',
  updateFailed: 'Profilul nu a putut fi actualizat',
  signOutFailed: 'Deconectarea nu a reușit',
  noSession: 'Nu există nicio sesiune activă',
  avatarUpdateFailed: 'Avatarul nu a putut fi actualizat. Încearcă din nou.',
  imageUrlMissing: 'Nu s-a primit niciun URL de imagine',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Vezi profilul utilizatorului {{nombre}} pe Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Editează profilul',
  displayNameLabel: 'Nume de utilizator',
  displayNamePlaceholder: 'Numele tău de utilizator',
  bioLabel: 'Biografie',
  bioPlaceholder: 'Spune-ne despre tine...',
  websiteLabel: 'Site web',
  websitePlaceholder: 'https://siteultau.com',
  charCount: '{{usados}}/{{maximo}} caractere',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Editează profilul',
  createWeeProfile: 'Creează un profil Weë',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Postări',
  viewMyEcontacts: 'Vezi lista mea de {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Multimedia',
  tabReposts: 'Redistribuiri',
  tabLikes: 'Aprecieri',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Se încarcă postările...',
  postsFailed: 'Eroare la încărcarea postărilor',
  retry: 'Încearcă din nou',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Încă nu ai postări',
  emptyPostsHint: 'Publică prima ta postare!',
  emptyMedia: 'Nu ai postări cu conținut multimedia',
  emptyMediaHint: 'Creează o postare cu fotografii sau videoclipuri',
  emptyReposts: 'Nu ai redistribuit nimic',
  emptyRepostsHint: 'Redistribuie conținut de la alți utilizatori',
  emptyLikes: 'Încă nu ai apreciat nicio postare',
  emptyLikesHint: 'Apreciază postările care te interesează',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profilul nu a putut fi încărcat',
  seeFullProfile: 'Vezi profilul meu complet',
  emptyCategory: 'Nicio postare în această categorie',
  actionFailed: 'Acțiunea nu a putut fi finalizată',
  userNotFound: 'Utilizatorul nu există',
  shareOtherMessage: 'Vezi profilul @{{nombre}} pe Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Utilizator Weë',
  joinedOn: 'Membru din {{fecha}}',
  tabPolls: 'Sondaje',
};
