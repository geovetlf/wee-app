/*
 * GRIEGO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteo («εσύ»), «λογαριασμός» como en auth, «χαρακτήρας» para el personaje; la pregunta lleva «;» griego.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Διαγραφή λογαριασμού',
  sectionDanger: 'Ζώνη κινδύνου',
  title: 'Διαγραφή λογαριασμού',
  goesFaces: 'Όλα σου τα προφίλ: το Πραγματικό προφίλ και τα άλτερ έγκο σου',
  goesCharacter: 'Ο χαρακτήρας σου και το άβατάρ του',
  goesPosts: 'Οι αναρτήσεις, τα σχόλια και οι αντιδράσεις σου',
  goesMessages: 'Τα μηνύματά σου στο WeeTalk: αδειάζουν, και η συνομιλία του άλλου ατόμου μένει χωρίς αυτά',
  goesCreations: 'Οι δημιουργίες, τα έργα και οι συνομιλίες σου στο Weë AI',
  goesContacts: 'Οι επαφές, οι κοινότητες και τα αποθηκευμένα σου',
  goesCredits: 'Τα Credits που σου απομένουν: χάνονται και δεν επιστρέφονται',
  whatStaysTitle: 'Τι διατηρείται',
  staysRecords: 'Οι λογιστικές εγγραφές για Credits και πληρωμές. Φυλάσσονται χωρίς το όνομά σου και τα στοιχεία του προφίλ σου, γιατί είναι τα λογιστικά βιβλία του Weë.',
  confirmLabel: 'Για επιβεβαίωση, γράψε «{{palabra}}»',
  confirmWord: 'ΔΙΑΓΡΑΦΗ',
  confirmPlaceholder: 'Γράψε τη λέξη εδώ',
  dialogTitle: 'Διαγραφή του λογαριασμού σου;',
  dialogConfirm: 'Διαγραφή',
  doneTitle: 'Ο λογαριασμός σου διαγράφηκε',
  doneBody: 'Ευχαριστούμε που ήσουν μέρος του Weë.',
  reauthTitle: 'Συνδέσου ξανά',
  reauthBody: 'Για την ασφάλειά σου, για να διαγράψεις τον λογαριασμό πρέπει να έχεις συνδεθεί πρόσφατα. Αποσυνδέσου, συνδέσου ξανά και επανάλαβε αυτά τα βήματα.',
  reauthButton: 'Αποσύνδεση για να συνδεθείς ξανά',
  errorTitle: 'Δεν ολοκληρώθηκε',
  errorBody: 'Κάτι απέτυχε στη μέση. Δοκίμασε ξανά: θα συνεχίσει από εκεί που σταμάτησε.',
  retry: 'Δοκίμασε ξανά',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Απενεργοποιείται και, μετά από 30 ημέρες, διαγράφονται όλα',
  introDesactivar: 'Ο λογαριασμός σου απενεργοποιείται τώρα και, αν δεν επιστρέψεις μέσα σε 30 ημέρες, όλα διαγράφονται για πάντα.',
  nowTitle: 'Τι γίνεται τώρα',
  nowHidden: 'Ο λογαριασμός σου δεν είναι πια ορατός: κανείς δεν θα βλέπει τα προφίλ ή τις αναρτήσεις σου',
  nowCharacterOff: 'Η αυτονομία του χαρακτήρα σου απενεργοποιείται και σταματούν οι χρεώσεις',
  nowComeBack_one: 'Έχεις {{contador}} ημέρα για να επιστρέψεις: συνδέσου ξανά και επίλεξε «Ενεργοποίηση λογαριασμού»',
  nowComeBack_other: 'Έχεις {{contador}} ημέρες για να επιστρέψεις: συνδέσου ξανά και επίλεξε «Ενεργοποίηση λογαριασμού»',
  whatGoesLaterTitle: 'Τι διαγράφεται αν δεν επιστρέψεις',
  deactivateButton: 'Διαγραφή του λογαριασμού μου',
  dialogBodyDesactivar: 'Ο λογαριασμός σου δεν θα είναι πια ορατός. Αν δεν επιστρέψεις μέσα σε 30 ημέρες, όλα θα διαγραφούν και δεν θα μπορείς να τα ανακτήσεις.',
  deactivating: 'Απενεργοποιείται ο λογαριασμός σου…',
  deactivatedTitle: 'Ο λογαριασμός σου είναι απενεργοποιημένος',
  deactivatedBody: 'Έχεις προθεσμία έως {{fecha}} για να επιστρέψεις. Μετά, όλα θα διαγραφούν για πάντα.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Ο λογαριασμός σου είναι απενεργοποιημένος',
  activarBody: 'Ζήτησες να διαγραφεί ο λογαριασμός σου. Όσο είναι απενεργοποιημένος, κανείς δεν βλέπει τα προφίλ ή τις αναρτήσεις σου.',
  activarDaysLeft_one: 'Απομένει {{contador}} ημέρα για την οριστική διαγραφή',
  activarDaysLeft_other: 'Απομένουν {{contador}} ημέρες για την οριστική διαγραφή',
  activarDate: 'Αν δεν τον ενεργοποιήσεις, θα διαγραφεί για πάντα στις {{fecha}}.',
  activarCharacterNote: 'Η αυτονομία του χαρακτήρα σου θα μείνει απενεργοποιημένη. Μπορείς να την προγραμματίσεις ξανά όποτε θέλεις.',
  activarButton: 'Ενεργοποίηση λογαριασμού',
  activating: 'Ενεργοποιείται ο λογαριασμός σου…',
  activatedTitle: 'Ο λογαριασμός σου είναι ξανά ενεργός',
  activarExpiredTitle: 'Η προθεσμία επιστροφής έληξε',
  activarExpiredBody: 'Ο λογαριασμός σου θα διαγραφεί οριστικά τις επόμενες ώρες.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Τα {{creditos}} Credits που σου απομένουν: χάνονται και δεν επιστρέφονται',
};
