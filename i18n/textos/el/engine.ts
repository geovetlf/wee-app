/*
 * GRIEGO — El panel del WEË AI ENGINE (solo administración). Tipado contra el español.
 * Ids, capacidades, colecciones de Firestore, `engineAdmin`/`setRouting` y nombres de
 * proveedores se copian tal cual. «Fallback» va como «εναλλακτικές αλυσίδες» (término
 * técnico explicado); «engine» dentro de frase, «μηχανή».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Ανανέωση',
  statusFailed: 'Δεν μπόρεσα να διαβάσω την κατάσταση της μηχανής. Είναι ενεργός ο διακομιστής;',
  changeFailed: 'Δεν ήταν δυνατή η εφαρμογή της αλλαγής',

  adminOnly: 'Μόνο για διαχειριστές',
  adminOnlyNote: 'Αυτός ο πίνακας είναι για την ομάδα του Weë. Αν είσαι μέλος της ομάδας, ζήτησε να προστεθεί ο λογαριασμός σου ως διαχειριστή.',

  settingsTitle: 'Ρυθμίσεις',
  settingsLine: 'Τιμές: {{precios}} · {{credits}} Credits ανά USD · περιθώριο {{margen}} % · πολιτική {{politica}} · λειτουργία επίδειξης ως τελευταία λύση: {{demo}}',
  pricesTest: 'δοκιμαστικές',
  pricesReal: 'πραγματικές',
  yes: 'ναι',
  no: 'όχι',
  configFrom: 'Η διαμόρφωση διαβάστηκε από {{origen}}.',
  sourceDefaults: 'τις προεπιλεγμένες τιμές του κώδικα',
  resetHealth: 'Επαναφορά υγείας',
  healthReset: 'Η υγεία επαναφέρθηκε.',
  seedDone: 'Οι προεπιλεγμένες τιμές αποθηκεύτηκαν στο Firestore.',

  providers: 'Πάροχοι',
  priority: 'προτεραιότητα {{numero}}',
  enable: 'Ενεργοποίηση {{proveedor}}',
  disable: 'Απενεργοποίηση {{proveedor}}',
  withKey: 'με κλειδί',
  withoutKey: 'χωρίς κλειδί',
  active: 'ενεργός',
  inactive: 'ανενεργός',
  pausedByFailures: 'σε παύση λόγω σφαλμάτων',
  recentFailures_one: '{{contador}} πρόσφατο σφάλμα',
  recentFailures_other: '{{contador}} πρόσφατα σφάλματα',
  modelLine: '• {{id}} · ποιότητα {{calidad}}/5 · ταχύτητα {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · έως {{segundos}} δευτ.',
  pendingVerification: ' · εκκρεμεί επαλήθευση',

  chains: 'Εναλλακτικές αλυσίδες (fallback)',
  policyLabel: 'Πολιτική για {{capacidad}}: {{politica}}',
  onlyDemo: 'μόνο λειτουργία επίδειξης (χωρίς πραγματικό πάροχο ακόμη)',
  editNote: 'Για να αλλάξεις τη σειρά μιας αλυσίδας ή να ορίσεις σταθερό μοντέλο, επεξεργάσου το aiRouting/{{capacidad}} στο Firestore ή χρησιμοποίησε το engineAdmin · setRouting.',

  policyQualityFirst: 'Πρώτα η ποιότητα',
  policyBalanced: 'Ισορροπημένη',
  policyCostFirst: 'Πρώτα το κόστος',

  modalityText: 'κείμενο',
  modalityVision: 'όραση',
  modalityImage: 'εικόνα',
  modalityVideo: 'βίντεο',
  modalityVoice: 'φωνή',
  modalityMusic: 'μουσική',
  modalityDoc: 'έγγραφα',
  rowSubtitle: 'Πάροχοι, εναλλακτικές αλυσίδες και ρυθμίσεις (μόνο για διαχειριστές)',
};
