/*
 * GRIEGO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` llega ya escrito por la app («στις 12 Οκτωβρίου 2026», «12–22 Οκτωβρίου 2026», «από … έως …»), con su
 * preposición cuando la lleva, y entra detrás de «το ταξίδι σου». `{{busca}}` es objeto directo de «ψάχνεις».
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Θα κατανοήσω την επιχείρησή σου, θα γράψω την ανάρτηση με ύφος {{tono}} και θα δημιουργήσω την εικόνα που τη συνοδεύει.',
  businessExplicaCalendario: 'Θα φτιάξω το εβδομαδιαίο ημερολόγιο αναρτήσεων, με ημέρα, ώρα και δίκτυο για την καθεμία.',
  businessExplicaPublicar: 'Θα ετοιμάσω την ανάρτηση και θα την προσαρμόσω σε κάθε δίκτυο, έτοιμη να την αντιγράψεις και να τη δημοσιεύσεις εσύ. Το Weë δεν είναι ακόμη συνδεδεμένο με τα δίκτυά σου, οπότε δεν δημοσιεύει για σένα.',
  businessExplicaRespuesta: 'Θα γράψω μια ευγενική και σαφή απάντηση για τον πελάτη σου, έτοιμη για αποστολή.',
  businessExplicaResultados: 'Θα εξετάσω τα αποτελέσματά σου και θα σου πω τι λειτούργησε και τι αξίζει να κάνεις αυτή την εβδομάδα.',
  businessExplicaCampana: 'Θα κατανοήσω την επιχείρησή σου, θα σχεδιάσω την καμπάνια με ύφος {{tono}} και θα δημιουργήσω την κύρια εικόνα της.',
  businessExplicaCv: 'Θα κατανοήσω την εμπειρία σου και θα συντάξω το βιογραφικό σου με ύφος {{tono}}, έτοιμο για χρήση.',
  businessExplicaPresentacion: 'Πρώτα κατανοώ την επιχείρησή σου και μετά γράφω την παρουσίαση διαφάνεια προς διαφάνεια με ύφος {{tono}}.',
  businessExplicaDocumento: 'Πρώτα κατανοώ την επιχείρησή σου και μετά συντάσσω το έγγραφο με ύφος {{tono}}.',
  businessExplicaIdeas: 'Πρώτα κατανοώ την επιχείρησή σου και μετά σου προτείνω συγκεκριμένες ιδέες και μια στρατηγική για να αναπτυχθείς.',

  businessTonoProfesionalPeroCercano: 'επαγγελματικό αλλά φιλικό',

  businessDecisionTonoProfesionalPeroCercano: 'χρησιμοποιώ επαγγελματικό αλλά φιλικό ύφος',
  businessDecisionTonoCercanoYProfesional: 'χρησιμοποιώ φιλικό και επαγγελματικό ύφος',
  businessDecisionTonoProfesional: 'χρησιμοποιώ επαγγελματικό ύφος',
  businessDecisionIdeasConcretas: 'ξεκινώ με συγκεκριμένες ιδέες',

  businessPasoEntender: 'Κατανόηση της επιχείρησης και του στόχου σου',
  businessPasoImagenPublicacion: 'Δημιουργία της εικόνας για την ανάρτηση',
  businessPasoCalendario: 'Δημιουργία του ημερολογίου αναρτήσεων',
  businessPasoPrepararPublicacion: 'Προετοιμασία της ανάρτησης',
  businessPasoAdaptarACadaRed: 'Προσαρμογή σε κάθε δίκτυο',
  businessPasoRespuesta: 'Συγγραφή της απάντησης για τον πελάτη σου',
  businessPasoResultados: 'Εξέταση και εξήγηση των αποτελεσμάτων σου',
  businessPasoCampana: 'Σχεδιασμός της καμπάνιας',
  businessPasoImagenCampana: 'Δημιουργία της εικόνας της καμπάνιας',
  businessPasoPresentacion: 'Συγγραφή της παρουσίασης (διαφάνεια προς διαφάνεια)',
  businessPasoMercado: 'Έρευνα για την τωρινή κατάσταση της αγοράς σου',
  businessPasoIdeas: 'Πρόταση ιδεών και στρατηγικής',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Θα σου προτείνω τρεις προορισμούς για το ταξίδι σου {{fechas}}, με δεδομένο ότι ψάχνεις {{busca}}. Με όποιον διαλέξεις, θα σου ετοιμάσω ολόκληρο το ταξίδι.',
  travelExplicaDestinosDias_one: 'Θα σου προτείνω τρεις προορισμούς για {{contador}} ημέρα · {{lasNoches}}, με δεδομένο ότι ψάχνεις {{busca}}. Με όποιον διαλέξεις, θα σου ετοιμάσω ολόκληρο το ταξίδι.',
  travelExplicaDestinosDias_other: 'Θα σου προτείνω τρεις προορισμούς για {{contador}} ημέρες · {{lasNoches}}, με δεδομένο ότι ψάχνεις {{busca}}. Με όποιον διαλέξεις, θα σου ετοιμάσω ολόκληρο το ταξίδι.',
  travelExplicaDestinosDiasAviso_one: 'Θα σου προτείνω τρεις προορισμούς για {{contador}} ημέρα · {{lasNoches}}, με δεδομένο ότι ψάχνεις {{busca}}. Με όποιον διαλέξεις, θα σου ετοιμάσω ολόκληρο το ταξίδι. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή.',
  travelExplicaDestinosDiasAviso_other: 'Θα σου προτείνω τρεις προορισμούς για {{contador}} ημέρες · {{lasNoches}}, με δεδομένο ότι ψάχνεις {{busca}}. Με όποιον διαλέξεις, θα σου ετοιμάσω ολόκληρο το ταξίδι. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή.',
  travelExplicaDestinosTuViaje: 'Θα σου προτείνω τρεις προορισμούς για το ταξίδι σου, με δεδομένο ότι ψάχνεις {{busca}}. Με όποιον διαλέξεις, θα σου ετοιμάσω ολόκληρο το ταξίδι.',
  travelExplicaDestinosTuViajeAviso: 'Θα σου προτείνω τρεις προορισμούς για το ταξίδι σου, με δεδομένο ότι ψάχνεις {{busca}}. Με όποιον διαλέξεις, θα σου ετοιμάσω ολόκληρο το ταξίδι. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή.',

  travelBuscaSorpresa: 'κάτι που θα σε εκπλήξει',

  travelExplicaItinerarioFechas_one: 'Θα ετοιμάσω το πρόγραμμα για το ταξίδι σου {{fechas}} ({{contador}} ημέρα · {{lasNoches}}), μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό.',
  travelExplicaItinerarioFechas_other: 'Θα ετοιμάσω το πρόγραμμα για το ταξίδι σου {{fechas}} ({{contador}} ημέρες · {{lasNoches}}), μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό.',
  travelExplicaItinerarioDias_one: 'Θα ετοιμάσω το πρόγραμμα για {{contador}} ημέρα · {{lasNoches}}, μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό.',
  travelExplicaItinerarioDias_other: 'Θα ετοιμάσω το πρόγραμμα για {{contador}} ημέρες · {{lasNoches}}, μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό.',
  travelExplicaItinerarioDiasAviso_one: 'Θα ετοιμάσω το πρόγραμμα για {{contador}} ημέρα · {{lasNoches}}, μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή.',
  travelExplicaItinerarioDiasAviso_other: 'Θα ετοιμάσω το πρόγραμμα για {{contador}} ημέρες · {{lasNoches}}, μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή.',
  travelExplicaItinerarioTuViaje: 'Θα ετοιμάσω το πρόγραμμα του ταξιδιού σου, μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό.',
  travelExplicaItinerarioTuViajeAviso: 'Θα ετοιμάσω το πρόγραμμα του ταξιδιού σου, μέρα με τη μέρα και με έναν κατά προσέγγιση προϋπολογισμό. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή.',

  travelExplicaQueHacer: 'Θα αναζητήσω τι αξίζει να δεις και πού να φας, και θα σου αφήσω την πηγή για το καθένα ώστε να μπορείς να το ελέγξεις.',
  travelExplicaMoverse: 'Θα αναζητήσω τους τρόπους μετακίνησής σου, με τον χρόνο και το κατά προσέγγιση κόστος τους.',

  travelLasNoches_one: '{{contador}} νύχτα',
  travelLasNoches_other: '{{contador}} νύχτες',

  travelDecisionTresViajes: 'σου προτείνω τρία πολύ διαφορετικά ταξίδια',
  travelDecisionTresViajesAviso: 'σου προτείνω τρία πολύ διαφορετικά ταξίδια. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή',
  travelDecisionReparto: 'μοιράζω τις μέρες ανάμεσα στα καλύτερα από το καθετί',
  travelDecisionRepartoAviso: 'μοιράζω τις μέρες ανάμεσα στα καλύτερα από το καθετί. Όταν μάθεις τις ημερομηνίες, πες μου τες για να το ταιριάξω με την εποχή',

  travelPasoDestinos: 'Αναζήτηση τριών προορισμών που ταιριάζουν',
  travelPasoQueHacer: 'Αναζήτηση για το τι αξίζει να δεις και πού να φας',
  travelPasoMoverse: 'Αναζήτηση τρόπων μετακίνησης',
  travelPasoItinerario_one: 'Προετοιμασία του προγράμματος για {{contador}} ημέρα',
  travelPasoItinerario_other: 'Προετοιμασία του προγράμματος για {{contador}} ημέρες',
  travelPasoItinerarioTuViaje: 'Προετοιμασία του προγράμματος του ταξιδιού σου',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Θα κατανοήσω καλά αυτό που χρειάζεσαι και θα σου ετοιμάσω μια σαφή απάντηση, με τα επόμενα βήματα.',
  brainDecisionPuntoDePartida: 'σου προτείνω ένα σημείο εκκίνησης και, αν χρειαστεί, σε πηγαίνω στον κατάλληλο ειδικό του Weë',
  brainPasoEntender: 'Κατανόηση αυτού που χρειάζεσαι',
  brainPasoRespuesta: 'Σαφής απάντηση με τα επόμενα βήματα',
};
