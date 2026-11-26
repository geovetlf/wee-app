/*
 * POLACO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre, el usuario, la biografía y el enlace de quien mira se pintan tal
 * cual; ËContacts/ẄContacts entran por hueco; el placeholder de la URL se deja
 * como en el molde. Las formas de pasado van sin género donde el español no lo
 * marca.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Dodaj zdjęcie w tle',
  permissionsTitle: 'Uprawnienia',
  galleryPermission: 'Potrzebne są uprawnienia, aby uzyskać dostęp do galerii',
  coverUploadFailed: 'Nie udało się przesłać zdjęcia w tle',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Wczytywanie profilu...',
  loadFailed: 'Błąd wczytywania profilu',
  loadFailedDetail: 'Nie udało się wczytać informacji o użytkowniku',
  backToLogin: 'Wróć do logowania',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Nazwa nie może być pusta',
  updateFailed: 'Nie udało się zaktualizować profilu',
  signOutFailed: 'Nie udało się wylogować',
  noSession: 'Brak aktywnej sesji',
  avatarUpdateFailed: 'Nie udało się zaktualizować awatara. Spróbuj ponownie.',
  imageUrlMissing: 'Nie otrzymano adresu URL obrazu',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Zobacz profil {{nombre}} w Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Edytuj profil',
  displayNameLabel: 'Nazwa użytkownika',
  displayNamePlaceholder: 'Twoja nazwa użytkownika',
  bioLabel: 'Biogram',
  bioPlaceholder: 'Opowiedz nam o sobie...',
  websiteLabel: 'Strona internetowa',
  websitePlaceholder: 'https://twojastrona.pl',
  charCount: '{{usados}}/{{maximo}} znaków',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Edytuj profil',
  createWeeProfile: 'Utwórz Profil Weë',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Posty',
  viewMyEcontacts: 'Zobacz swoje {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Media',
  tabReposts: 'Udostępnienia',
  tabLikes: 'Polubienia',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Wczytywanie postów...',
  postsFailed: 'Błąd wczytywania postów',
  retry: 'Spróbuj ponownie',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Nie masz jeszcze postów',
  emptyPostsHint: 'Udostępnij swój pierwszy post!',
  emptyMedia: 'Nie masz postów z multimediami',
  emptyMediaHint: 'Utwórz post ze zdjęciami lub filmami',
  emptyReposts: 'Nie masz jeszcze ponownych udostępnień',
  emptyRepostsHint: 'Udostępniaj treści innych użytkowników',
  emptyLikes: 'Nie masz polubionych postów',
  emptyLikesHint: 'Polub posty, które cię interesują',
  otherTitle: 'Profil',
  otherLoadFailed: 'Nie udało się wczytać profilu',
  seeFullProfile: 'Zobacz swój pełny profil',
  emptyCategory: 'Brak postów w tej kategorii',
  actionFailed: 'Nie udało się wykonać tej czynności',
  userNotFound: 'Użytkownik nie istnieje',
  shareOtherMessage: 'Zobacz profil @{{nombre}} w Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Użytkownik Weë',
  joinedOn: 'Dołączono {{fecha}}',
  tabPolls: 'Ankiety',
};
