/*
 * GRIEGO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y `archivo…` de este archivo. `{{archivo}}` va entre
 * paréntesis detrás de «αρχείο», porque «documento» y «audio» no piden el mismo artículo.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Κάτι λείπει από το αίτημά σου. Έλεγξέ το και δοκίμασε ξανά.',
  unauthorized: 'Συνδέσου για να δημιουργήσεις με το Weë.',
  accountRequired: 'Για να δημιουργήσεις περιεχόμενο με το Weë AI, συνδέσου ή δημιούργησε λογαριασμό.',
  providerError: 'Η AI δεν κατάφερε να ολοκληρώσει τη δημιουργία σου αυτή τη φορά. Δεν σε χρέωσα: δοκίμασε ξανά σε λίγο.',
  generationFailed: 'Δεν κατάφερα να ολοκληρώσω τη δημιουργία σου. Δεν σε χρέωσα: δοκίμασε ξανά.',
  timeout: 'Άργησε υπερβολικά και το σταμάτησα. Δεν σε χρέωσα: δοκίμασε ξανά.',
  rateLimited: 'Έκανες πολλές δημιουργίες στη σειρά. Δεν σε χρέωσα: περίμενε λίγο και δοκίμασε ξανά.',
  duplicate: 'Αυτή η δημιουργία είναι ήδη σε εξέλιξη.',
  notAvailable: 'Αυτή η λειτουργία δεν είναι ακόμη διαθέσιμη.',
  inputRejected: 'Η φωτογραφία ή το βίντεο δεν μπόρεσαν να χρησιμοποιηθούν: δεν επιτρέπονται πραγματικά πρόσωπα ούτε αυτό το περιεχόμενο. Δοκίμασε άλλη εικόνα ή περιγραφή.',
  faltaCampo: 'Λείπει: {{campo}}.',
  revisaCampo: 'Έλεγξε {{campo}}: πρέπει να έχει από 1 έως {{max}} χαρακτήρες.',
  campoMensaje: 'το μήνυμά σου',
  campoDescripcionVideo: 'την περιγραφή του βίντεο',
  conversacionNoEncontrada: 'Δεν βρήκαμε αυτή τη συνομιλία.',
  sinPlan: 'Αυτή η εργασία δεν έχει ακόμη σχέδιο.',
  sinUnPlan: 'Αυτή η εργασία δεν έχει ακόμη κάποιο σχέδιο.',
  yaTienePlan: 'Αυτή η εργασία έχει ήδη σχέδιο.',
  subeFoto: 'Ανέβασε μια φωτογραφία για να μπορέσει το Weë να δουλέψει με αυτήν.',
  trabajoNoEncontrado: 'Δεν βρήκαμε αυτή την εργασία.',
  trabajoAjeno: 'Αυτή η εργασία δεν είναι δική σου.',
  experienciaDesconocida: 'Άγνωστη εμπειρία.',
  faltaTrabajo: 'Λείπει η εργασία.',
  intentoSinTiempo: 'Ο χρόνος αυτής της προσπάθειας τελείωσε και σου επέστρεψα τα Credits. Μπορείς να δοκιμάσεις ξανά.',
  fotoDireccion: 'Η διεύθυνση της φωτογραφίας δεν είναι έγκυρη.',
  fotoSubir: 'Η φωτογραφία πρέπει να ανέβει στο Weë πριν χρησιμοποιηθεί.',
  fotoAjena: 'Αυτή η φωτογραφία δεν είναι δική σου.',
  archivoSube: 'Ανέβασε το αρχείο ({{archivo}}) για να μπορέσει το Weë να το διαβάσει.',
  archivoDireccion: 'Η διεύθυνση του αρχείου ({{archivo}}) δεν είναι έγκυρη.',
  archivoSubir: 'Το αρχείο ({{archivo}}) πρέπει να ανέβει στο Weë πριν χρησιμοποιηθεί.',
  archivoAjeno: 'Αυτό το αρχείο ({{archivo}}) δεν είναι δικό σου.',
  archivoDocumento: 'έγγραφο',
  archivoAudio: 'ήχος',
  sinTiempoAntes: 'Ο χρόνος τελείωσε πριν ξεκινήσει. Δεν σε χρέωσα.',
  sinProveedor: 'Αυτή τη στιγμή δεν υπάρχει διαθέσιμη AI για αυτό. Δοκίμασε αργότερα.',
  noDisponibleActualmente: 'Αυτή η λειτουργία δεν είναι διαθέσιμη προς το παρόν.',
  noDisponibleAhora: 'Αυτή η λειτουργία δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.',
  noDisponibleOpciones: 'Αυτή η λειτουργία δεν είναι διαθέσιμη με τις επιλογές που διάλεξες. Δοκίμασε άλλες.',
  describeVideo: 'Πες μου τι βίντεο θέλεις να δημιουργήσεις.',
  creacionTerminada: 'Αυτή η δημιουργία έχει ολοκληρωθεί και δεν επαναλαμβάνεται. Αναζήτησέ τη στις δημιουργίες σου.',
  tomaInvalida: 'Αυτή η λήψη δεν έχει έγκυρη μορφή.',
  planoInvalido: 'Αυτό το πλάνο δεν έχει έγκυρη μορφή.',
  produccionNoEncontrada: 'Δεν βρήκαμε αυτή την παραγωγή.',
  tomaNoGenerable: 'Αυτή η λήψη δεν μπορεί να δημιουργηθεί έτσι.',
  creacionNoEncontrada: 'Δεν βρήκαμε αυτή τη δημιουργία.',
  debesIniciarSesion: 'Πρέπει να συνδεθείς',
};
