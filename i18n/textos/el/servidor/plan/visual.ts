/*
 * GRIEGO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Las `…Decision…` cierran «Αφού δεν το είχες ξεκάθαρο, {{decision}}.» y empiezan por el verbo en primera persona.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Θα δημιουργήσω {{numero}} λογότυπα για «{{nombre}}».',
  designExplicaLogoConNombreYAlma: 'Θα δημιουργήσω {{numero}} λογότυπα για «{{nombre}}», {{alma}}.',
  designAlmaSerious: 'με σοβαρή και αξιόπιστη αίσθηση',
  designAlmaModern: 'με μοντέρνα αίσθηση',
  designAlmaClose: 'με φιλική και διασκεδαστική αίσθηση',
  designAlmaLuxury: 'με αίσθηση πολυτέλειας',
  designAlmaNatural: 'με φυσική αίσθηση',

  designExplicaAnuncio: 'Θα δημιουργήσω {{numero}} προτάσεις για να ανακοινώσεις {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Θα δημιουργήσω {{numero}} προτάσεις για να ανακοινώσεις {{anuncio}}, {{donde}}.',
  designDondeFeed: 'σε τετράγωνη μορφή, για Instagram ή Facebook',
  designDondeStory: 'σε κάθετη μορφή, για μια ιστορία',
  designDondeWhatsapp: 'σε μορφή που μοιράζεται εύκολα στο WhatsApp',
  designDondePrint: 'σε μορφή A4, έτοιμη για εκτύπωση',

  designExplicaPropuestas: 'Θα δημιουργήσω {{numero}} προτάσεις για {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Θα δημιουργήσω {{numero}} προτάσεις για {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'με μοντέρνα και καθαρή εμφάνιση',
  designMatizLookNatural: 'με φυσική εμφάνιση',
  designMatizLookLuxury: 'με πολυτελή εμφάνιση',
  designMatizLookFun: 'με διασκεδαστική και πολύχρωμη εμφάνιση',
  designMatizLookIndustrial: 'με βιομηχανική εμφάνιση',
  designMatizEraFuture: 'από το μέλλον',
  designMatizEraNow: 'του σήμερα',
  designMatizEraClassic: 'σε κλασικό στιλ',
  designMatizEraScifi: 'σε στιλ επιστημονικής φαντασίας',
  designMatizInoutOutside: 'από έξω',
  designMatizInoutInside: 'από μέσα',
  designMatizInoutWide: 'σε ευρεία άποψη',
  designMatizDrawCartoon: 'σε στιλ κινούμενων σχεδίων',
  designMatizDrawReal: 'σε ρεαλιστικό στιλ',
  designMatizDrawGame: 'με αισθητική βιντεοπαιχνιδιού',
  designMatizDrawPencil: 'σχεδιασμένο με μολύβι',
  designMatizDrawCute: 'με χαριτωμένη αίσθηση',

  designPasoConcepto: 'Καθορισμός της ιδέας',
  designPasoLogos: 'Δημιουργία {{numero}} λογότυπων',
  designPasoPropuestas: 'Δημιουργία {{numero}} προτάσεων',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Θα κοιτάξω τη φωτογραφία σου και θα της δώσω κίνηση με στιλ {{estilo}}: ένα κλιπ {{segundos}} δευτερολέπτων, έτοιμο για κοινοποίηση.',

  studioExplicaVideo: 'Θα γράψω ένα σύντομο σενάριο, θα δημιουργήσω {{video}} {{segundos}} δευτερολέπτων, {{formato}}, με στιλ {{estilo}}, και θα ηχογραφήσω την αφήγηση.',
  studioExplicaVideoPromo: 'Θα γράψω ένα σύντομο σενάριο, θα δημιουργήσω ένα βίντεο {{segundos}} δευτερολέπτων για να προωθήσεις κάτι, {{formato}}, με στιλ {{estilo}}, και θα ηχογραφήσω την αφήγηση.',
  studioExplicaVideoMisRedes: 'Θα γράψω ένα σύντομο σενάριο, θα δημιουργήσω ένα βίντεο {{segundos}} δευτερολέπτων για τα social σου, {{formato}}, με στιλ {{estilo}}, και θα ηχογραφήσω την αφήγηση.',
  studioVideoRedes: 'ένα βίντεο για τα social σου',
  studioEstiloRitmo: 'φιλικό και με ρυθμό',
  studioFormatoVertical: 'κάθετο για Instagram και TikTok',
  studioFormatoHorizontal: 'οριζόντιο για YouTube',
  studioFormatoCuadrado: 'τετράγωνο για WhatsApp και Facebook',
  studioDecisionRedes: 'το ετοιμάζω για τα social σου',
  studioDecisionEstilo: 'διάλεξα ένα στιλ φιλικό και με ρυθμό',
  studioDecisionVertical: 'το κάνω κάθετο, που ταιριάζει σε Instagram και TikTok',

  studioPasoMirarFoto: 'Εξέταση της φωτογραφίας σου',
  studioPasoMovimiento: 'Κίνηση στη φωτογραφία',
  studioPasoGuion: 'Σενάριο {{numero}} σκηνών',
  studioPasoVideo: 'Δημιουργία του βίντεο',
  studioPasoNarracion: 'Ηχογράφηση της αφήγησης',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Θα δημιουργήσω {{numero}} εικόνες με βάση όσα μου είπες, {{como}}.',

  photoExplicaMejorarCalidad: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά βελτιώνω την ποιότητα και την ανάλυση, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaQuitarAlgo: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά αφαιρώ ό,τι περισσεύει, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaFondo: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά αλλάζω ή αφαιρώ το φόντο, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaRestaurar: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά αποκαθιστώ την παλιά φωτογραφία, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaRetoque: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά κάνω ένα φυσικό ρετούς στο πρόσωπο, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaColorizar: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά δίνω χρώμα στην ασπρόμαυρη εικόνα, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaTransformar: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά τη μεταμορφώνω με ένα στιλ, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaSinAccion: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά βελτιώνω την ποιότητα, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoExplicaAccion: 'Πρώτα κοιτάζω τη φωτογραφία σου και μετά αναλαμβάνω αυτό: {{accion}}, {{como}}. Όλα τα υπόλοιπα μένουν ως έχουν.',
  photoComoNatural: 'όσο πιο φυσικά γίνεται',
  photoDecisionCalidad: 'ξεκινώ βελτιώνοντας την ποιότητα',
  photoDecisionNatural: 'το κάνω όσο πιο φυσικό γίνεται',
  photoDecisionNaturales: 'τις κάνω όσο πιο φυσικές γίνεται',

  photoPasoMirarFoto: 'Εξέταση της φωτογραφίας για να καταλάβω τι έχει',
  photoPasoImagenes: 'Δημιουργία {{numero}} εικόνων',
  photoPasoMejorarFoto: 'Βελτίωση της φωτογραφίας',
  photoPasoMejorarCalidad: 'Βελτίωση ποιότητας και ανάλυσης',
  photoPasoQuitarAlgo: 'Αφαίρεση κάποιου περιττού στοιχείου',
  photoPasoFondo: 'Αλλαγή ή αφαίρεση φόντου',
  photoPasoRestaurar: 'Αποκατάσταση παλιάς φωτογραφίας',
  photoPasoRetoque: 'Φυσικό ρετούς προσώπου',
  photoPasoColorizar: 'Χρωματισμός ασπρόμαυρης φωτογραφίας',
  photoPasoTransformar: 'Μεταμόρφωση με ένα στιλ',

  designCosaMascota: 'μια μασκότ για τη μάρκα σου',
};
