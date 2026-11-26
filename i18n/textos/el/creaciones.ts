/*
 * GRIEGO — Mis creaciones: la biblioteca de material de la cuenta y el
 * progreso de un trabajo de Weë AI. Tipado contra el español.
 *
 * Los estados de una creación concuerdan con «δημιουργία» (femenino):
 * «Αποθηκεύτηκε», «Διαγράφηκε». «Listo» de estado = «Έτοιμο».
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Οι δημιουργίες μου',
  intro: 'Όλα όσα έχεις φτιάξει με το Weë AI, σε ένα μέρος. Ανήκουν στον λογαριασμό σου: τα βλέπεις ίδια από το Πραγματικό προφίλ και από το Προφίλ Weë.',

  /* Filtros por tipo. */
  filterAll: 'Όλα',
  filterImages: 'Εικόνες',
  filterVideos: 'Βίντεο',
  filterAudio: 'Ήχος',
  filterDocuments: 'Έγγραφα',
  filterModel3d: '3D',
  filterLabel: 'Φιλτράρισμα κατά τύπο',

  /* Orden. */
  sortRecent: 'Πρόσφατες',
  sortOldest: 'Παλαιότερες',
  sortLabel: 'Ταξινόμηση',

  /* Estados de la lista. */
  loading: 'Φόρτωση των δημιουργιών σου…',
  loadFailed: 'Δεν μπορέσαμε να φορτώσουμε τις δημιουργίες σου.',
  retry: 'Δοκίμασε ξανά',
  loadMore: 'Φόρτωση περισσότερων',
  emptyTitle: 'Δεν έχεις ακόμη δημιουργίες',
  emptyText: 'Ό,τι φτιάχνεις με το Weë AI θα εμφανίζεται εδώ, με την εικόνα, το βίντεο ή τον ήχο του.',
  emptyAction: 'Φτιάξε κάτι με το Weë AI',
  emptyFiltered: 'Δεν υπάρχουν δημιουργίες αυτού του τύπου.',
  count_one: '{{contador}} δημιουργία',
  count_other: '{{contador}} δημιουργίες',

  /* Estados de una creación. */
  statusUploading: 'Μεταφόρτωση',
  statusProcessing: 'Επεξεργασία',
  statusReady: 'Έτοιμο',
  statusFailed: 'Δεν πέτυχε',
  statusDeleted: 'Διαγράφηκε',
  pendingDeletion: 'Το αρχείο θα αφαιρεθεί σύντομα.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Εικόνα',
  kindVideo: 'Βίντεο',
  kindAudio: 'Ήχος',
  kindDocument: 'Έγγραφο',
  kindModel3d: '3D',
  kindText: 'Κείμενο',

  /* Acciones sobre una creación. */
  open: 'Άνοιγμα',
  openCreation: 'Άνοιγμα δημιουργίας: {{nombre}}',
  download: 'Λήψη',
  downloaded: 'Αποθηκεύτηκε στη συλλογή σου.',
  downloadFailed: 'Δεν μπορέσαμε να την κατεβάσουμε. Δοκίμασε ξανά.',
  downloadPermission: 'Το Weë χρειάζεται άδεια για να αποθηκεύει στη συλλογή σου.',
  savedInCreations: 'Αποθηκεύτηκε στις δημιουργίες σου',
  save: 'Αποθήκευση',
  saved: 'Αποθηκεύτηκε',
  useInProject: 'Χρήση σε έργο',
  publish: 'Δημοσίευση',
  share: 'Κοινοποίηση',
  delete: 'Διαγραφή',
  deleteConfirm: 'Διαγραφή αυτής της δημιουργίας; Το αρχείο σβήνεται. Ό,τι έχεις ήδη δημοσιεύσει δεν αλλάζει.',
  deleteConfirmWeb: 'Διαγραφή αυτής της δημιουργίας; Το αρχείο σβήνεται. Ό,τι έχεις ήδη δημοσιεύσει δεν αλλάζει.',
  deleted: 'Η δημιουργία διαγράφηκε.',
  deleteFailed: 'Δεν μπορέσαμε να τη διαγράψουμε. Δοκίμασε ξανά.',
  createdWith: 'Φτιαγμένο με {{nombre}}',
  createdOn: 'Δημιουργήθηκε στις {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: 'Το {{nombre}} δουλεύει',
  progressStarting: 'Ξεκινάμε…',
  progressSteps: '{{hechos}} από {{total}} βήματα έτοιμα',
  progressFindLater: 'Μπορείς να φύγεις από αυτή την οθόνη· θα το βρεις στην ενότητα «Οι δημιουργίες μου» όταν είναι έτοιμο.',

  /* Mundos 3D. */
  filterWorlds: 'Κόσμοι 3D',
  kindWorld: 'Κόσμος 3D',
  noViewer3d: 'Το Weë δεν έχει ακόμη πρόγραμμα προβολής 3D. Κατέβασέ το για να το ανοίξεις σε μια εφαρμογή 3D.',
  rightsTitle: 'Τι μπορείς να κάνεις με αυτό',
  rightsProvenance: 'Φτιαγμένο με AI στο Weë, με μοντέλο τρίτου που έχει τη δική του άδεια χρήσης.',
  rightsCommercialAllowed: 'Μπορείς να το χρησιμοποιήσεις για εμπορικούς σκοπούς.',
  rightsCommercialRestricted: 'Η εμπορική του χρήση έχει όρους.',
  rightsCommercialUnclear: 'Δεν είναι ακόμη σαφές αν μπορεί να χρησιμοποιηθεί για εμπορικούς σκοπούς.',
  rightsCommercialNotAllowed: 'Δεν μπορεί να χρησιμοποιηθεί για εμπορικούς σκοπούς.',
  rightsAttribution: 'Η άδειά του απαιτεί αναφορά δημιουργού.',
  rightsBlockedIn: 'Δεν μπορεί να χρησιμοποιηθεί ούτε να προβληθεί σε: {{lugares}}.',
};
