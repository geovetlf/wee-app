/*
 * GRIEGO — La pantalla del perfil propio (y la del perfil ajeno). Tipado
 * contra el español.
 *
 * Los nombres entran por hueco sin declinar: se evita el genitivo del
 * nombre («Δες στο Weë το προφίλ: {{nombre}}», «το προφίλ @{{nombre}}»),
 * que el griego no puede formar sobre un hueco. Las pestañas Media/Reposts/
 * Likes se traducen (Πολυμέσα, Αναδημοσιεύσεις, Μου αρέσει). «Se unió en
 * {{fecha}}» va como «Εγγραφή: {{fecha}}» para no depender del caso del mes.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ── */
  addCover: 'Προσθήκη εξωφύλλου',
  permissionsTitle: 'Άδειες',
  galleryPermission: 'Χρειάζεται άδεια πρόσβασης στη συλλογή',
  coverUploadFailed: 'Δεν ήταν δυνατή η μεταφόρτωση της εικόνας εξωφύλλου',

  /* ── Los dos estados con los que puede abrirse la pantalla ── */
  loading: 'Φόρτωση προφίλ…',
  loadFailed: 'Σφάλμα κατά τη φόρτωση του προφίλ',
  /* Solo se lee si el error llega sin explicación propia. */
  loadFailedDetail: 'Δεν ήταν δυνατή η φόρτωση των στοιχείων του χρήστη',
  backToLogin: 'Επιστροφή στη σύνδεση',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ── */
  nameRequired: 'Το όνομα δεν μπορεί να είναι κενό',
  updateFailed: 'Δεν ήταν δυνατή η ενημέρωση του προφίλ',
  signOutFailed: 'Δεν ήταν δυνατή η αποσύνδεση',
  noSession: 'Δεν υπάρχει ενεργή σύνδεση',
  avatarUpdateFailed: 'Δεν ήταν δυνατή η ενημέρωση του άβαταρ. Δοκίμασε ξανά.',
  imageUrlMissing: 'Δεν ελήφθη URL εικόνας',

  /* ── Compartir el perfil. El nombre entra por hueco. ── */
  shareMessage: 'Δες στο Weë το προφίλ: {{nombre}}',

  /* ── El formulario de editar ── */
  editTitle: 'Επεξεργασία προφίλ',
  displayNameLabel: 'Όνομα χρήστη',
  displayNamePlaceholder: 'Το όνομα χρήστη σου',
  bioLabel: 'Βιογραφικό',
  bioPlaceholder: 'Πες μας για σένα…',
  websiteLabel: 'Ιστότοπος',
  /* Una dirección de EJEMPLO, no la de nadie: es texto que se lee. */
  websitePlaceholder: 'https://tosite-sou.gr',
  /* El contador de los tres campos: gastados y tope, los dos por hueco. */
  charCount: '{{usados}}/{{maximo}} χαρακτήρες',

  /* ── Los botones de debajo del nombre ── */
  editProfile: 'Επεξεργασία προφίλ',
  createWeeProfile: 'Δημιουργία Προφίλ Weë',

  /* ── La cifra de publicaciones y la pestaña ── */
  posts: 'Αναρτήσεις',
  /* Lector de pantalla. El nombre de la agenda y la cifra entran por hueco. */
  viewMyEcontacts: 'Προβολή των {{nombre}} μου, {{total}}',

  /* ── Las otras tres pestañas ── */
  tabMedia: 'Πολυμέσα',
  tabReposts: 'Αναδημοσιεύσεις',
  tabLikes: 'Μου αρέσει',

  /* ── La lista de publicaciones ── */
  loadingPosts: 'Φόρτωση αναρτήσεων…',
  postsFailed: 'Σφάλμα κατά τη φόρτωση των αναρτήσεων',
  retry: 'Δοκίμασε ξανά',

  /* ── Y cuando la pestaña está vacía ── */
  emptyPosts: 'Δεν έχεις ακόμη αναρτήσεις',
  emptyPostsHint: 'Μοιράσου την πρώτη σου ανάρτηση!',
  emptyMedia: 'Δεν έχεις αναρτήσεις με πολυμέσα',
  emptyMediaHint: 'Δημιούργησε μια ανάρτηση με φωτογραφίες ή βίντεο',
  emptyReposts: 'Δεν έχεις αναδημοσιεύσει τίποτα',
  emptyRepostsHint: 'Μοιράσου περιεχόμενο άλλων χρηστών',
  emptyLikes: 'Δεν έχεις πατήσει «Μου αρέσει» σε καμία ανάρτηση',
  emptyLikesHint: 'Πάτησε «Μου αρέσει» στις αναρτήσεις που σε ενδιαφέρουν',
  otherTitle: 'Προφίλ',
  otherLoadFailed: 'Δεν ήταν δυνατή η φόρτωση του προφίλ',
  seeFullProfile: 'Δες ολόκληρο το προφίλ μου',
  emptyCategory: 'Δεν υπάρχουν αναρτήσεις σε αυτή την κατηγορία',
  actionFailed: 'Δεν ήταν δυνατή η ολοκλήρωση',
  userNotFound: 'Ο χρήστης δεν υπάρχει',
  shareOtherMessage: 'Δες το προφίλ @{{nombre}} στο Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Χρήστης του Weë',
  joinedOn: 'Εγγραφή: {{fecha}}',
  tabPolls: 'Δημοσκοπήσεις',
};
