/*
 * GRIEGO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}` entra detrás de «ύφος» en neutro («με ύφος φιλικό»); `{{idioma}}`, detrás de «στα» («στα αγγλικά»), y los
 * nombres de idioma van en minúscula, como en griego. Estilo y ánimo de Music van como etiqueta («στιλ: ποπ, διάθεση:
 * χαρούμενη»), porque un género musical no concuerda con nada.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Αναζητώ πραγματικά παραθέματα για το θέμα και σου αφήνω την πηγή του καθενός για να μπορείς να τα ελέγξεις.',
  writerPasoCitas: 'Αναζήτηση παραθεμάτων και πηγών',

  writerExplicaTraducir: 'Θα μεταφράσω το κείμενό σου στα {{idioma}}, διατηρώντας το νόημα και το ύφος.',
  writerPasoTraducir: 'Μετάφραση στα {{idioma}}',
  writerDecisionIdiomaIngles: 'το μεταφράζω στα αγγλικά',
  writerIdiomaEn: 'αγγλικά',
  writerIdiomaPt: 'πορτογαλικά',
  writerIdiomaFr: 'γαλλικά',
  writerIdiomaIt: 'ιταλικά',

  writerExplicaResumir: 'Θα συνοψίσω το κείμενό σου στις βασικές ιδέες, σε λίγες γραμμές.',
  writerPasoResumir: 'Περίληψη στις βασικές ιδέες',
  writerExplicaCorregir: 'Θα διορθώσω την ορθογραφία, το ύφος και τη σαφήνεια, χωρίς να αλλάξω αυτό που ήθελες να πεις.',
  writerPasoCorregir: 'Διόρθωση ορθογραφίας, ύφους και σαφήνειας',
  writerExplicaIdeas: 'Θα σου προτείνω διάφορες ιδέες και ένα σημείο εκκίνησης για να γράψεις χωρίς να κολλήσεις.',
  writerPasoIdeas: 'Ιδέες για να γράψεις',

  writerExplicaPortada: 'Θα καθορίσω την ιδέα του εξωφύλλου και θα δημιουργήσω τρεις προτάσεις για να διαλέξεις.',
  writerPasoConceptoPortada: 'Καθορισμός της ιδέας του εξωφύλλου',
  writerPasoPropuestasPortada: 'Δημιουργία 3 προτάσεων εξωφύλλου',

  writerExplicaReescribir: 'Θα ξαναγράψω το κείμενό σου με ύφος {{tono}}, διατηρώντας την ιδέα.',
  writerPasoReescribir: 'Επανεγγραφή του κειμένου',
  writerExplicaCv: 'Θα γράψω το βιογραφικό σου με ύφος {{tono}}, έτοιμο για χρήση στον επεξεργαστή και για αποστολή.',
  writerPasoCv: 'Σύνταξη του βιογραφικού σου',

  writerExplicaPublicacion: 'Θα γράψω την ανάρτηση με ύφος {{tono}} και μετά θα τη γυαλίσω για να είναι έτοιμη.',
  writerExplicaHistoria: 'Θα γράψω την ιστορία με ύφος {{tono}} και μετά θα τη γυαλίσω για να είναι έτοιμη.',
  writerExplicaGuion: 'Θα γράψω το σενάριο με ύφος {{tono}} και μετά θα το γυαλίσω για να είναι έτοιμο.',
  writerExplicaArticulo: 'Θα γράψω το άρθρο με ύφος {{tono}} και μετά θα το γυαλίσω για να είναι έτοιμο.',
  writerExplicaEmail: 'Θα συντάξω το email με ύφος {{tono}} και μετά θα το γυαλίσω για να είναι έτοιμο.',
  writerExplicaDocumento: 'Θα συντάξω το έγγραφο με ύφος {{tono}} και μετά θα το γυαλίσω για να είναι έτοιμο.',
  writerPasoPublicacion: 'Συγγραφή της ανάρτησης',
  writerPasoHistoria: 'Συγγραφή της ιστορίας',
  writerPasoGuion: 'Συγγραφή του σεναρίου',
  writerPasoArticulo: 'Συγγραφή του άρθρου',
  writerPasoEmail: 'Σύνταξη του email',
  writerPasoDocumento: 'Σύνταξη του εγγράφου',
  writerPasoPulir: 'Τελικό γυάλισμα του κειμένου',

  writerDecisionEmpiezoPublicacion: 'ξεκινώ με μια ανάρτηση',
  writerDecisionTonoCercano: 'χρησιμοποιώ φιλικό ύφος',
  writerDecisionTonoProfesional: 'χρησιμοποιώ επαγγελματικό ύφος',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Θα ετοιμάσω το κείμενο και θα το ηχογραφήσω με {{voz}} φωνή.',
  musicExplicaVozCalida: 'Θα ετοιμάσω το κείμενο και θα το ηχογραφήσω με ζεστή και καθαρή φωνή.',
  musicPasoTextoNarracion: 'Προετοιμασία του κειμένου της αφήγησης',
  musicPasoGrabarVoz: 'Ηχογράφηση της φωνής',

  musicExplicaLetra: 'Θα γράψω ολόκληρους τους στίχους (στιλ: {{estilo}}).',
  musicPasoLetraCompleta: 'Συγγραφή ολόκληρων των στίχων',

  musicExplicaMezcla: 'Θα ακούσω το τραγούδι σου, θα κάνω τη μίξη και το mastering για να ακούγεται επαγγελματικό.',
  musicPasoAnotarMezcla: 'Ακρόαση του τραγουδιού σου και σημειώσεις για τη μίξη',
  musicPasoMasterizar: 'Μίξη και mastering',

  musicExplicaVideoclip: 'Θα δημιουργήσω το τραγούδι ({{estilo}}, {{animo}}), τις σκηνές και ολόκληρο το βιντεοκλίπ σου. Δεν χρειάζεται να βγεις από το Weë Music.',
  musicPasoIdeaYLetra: 'Συγγραφή της ιδέας και των στίχων',
  musicPasoEscenas: 'Δημιουργία των σκηνών του βιντεοκλίπ',
  musicPasoArmarVideoclip: 'Μοντάζ του βιντεοκλίπ με το τραγούδι σου',

  musicExplicaJingle: 'Θα δημιουργήσω ένα σύντομο και πιασάρικο jingle (στιλ: {{estilo}}, διάθεση: {{animo}}).',
  musicPasoFraseJingle: 'Συγγραφή της φράσης του jingle',
  musicPasoJingle: 'Δημιουργία του jingle',
  musicExplicaBeat: 'Θα δημιουργήσω ένα beat (στιλ: {{estilo}}, διάθεση: {{animo}}).',
  musicPasoIdeaMusical: 'Καθορισμός της μουσικής ιδέας',
  musicPasoBeat: 'Δημιουργία του beat',

  musicExplicaCancion: 'Θα γράψω τους στίχους, θα δημιουργήσω το τραγούδι (στιλ: {{estilo}}, διάθεση: {{animo}}) και θα σχεδιάσω το εξώφυλλό του.',
  musicPasoLetra: 'Συγγραφή των στίχων',
  musicPasoCancion: 'Δημιουργία του τραγουδιού',
  musicPasoPortada: 'Σχεδιασμός του εξωφύλλου',

  musicDecisionEmpiezoCancion: 'ξεκινώ με ένα τραγούδι',
  musicDecisionEstiloPop: 'διάλεξα στιλ ποπ',
  musicDecisionAnimoAlegre: 'διάλεξα χαρούμενη διάθεση',
  musicDecisionVozCalida: 'διάλεξα μια ζεστή και καθαρή φωνή',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Θα κοιτάξω τη φωτογραφία σου και θα φτιάξω μια απλή ρουτίνα περιποίησης δέρματος, με προϊόντα που βρίσκονται εύκολα.',
  beautyPasoRutina: 'Δημιουργία της ρουτίνας περιποίησής σου',

  beautyExplicaRostro: 'Θα κοιτάξω το πρόσωπό σου, θα σου προτείνω τα κουρέματα και τα στιλ που σου ταιριάζουν καλύτερα και θα δοκιμάσω δύο στη φωτογραφία σου.',
  beautyPasoMirarRostro: 'Εξέταση του προσώπου σου',
  beautyPasoRecomendar: 'Προτάσεις για κουρέματα, γυαλιά και στιλ',
  beautyPasoProbarDosEstilos: 'Δοκιμή των δύο στιλ που σου ταιριάζουν καλύτερα',

  beautyExplicaProbar: 'Θα δοκιμάσω {{cambio}} για {{ocasion}} σε δύο εκδοχές, διατηρώντας το πρόσωπό σου, το δέρμα σου και το φως της φωτογραφίας.',
  beautyPasoProbar: 'Δοκιμή: {{cambio}}, διατηρώντας το πρόσωπό σου',
  beautyOcasionElDiaADia: 'την καθημερινότητα',

  beautyDecisionCambioCompleto: 'προτείνω μια ολική αλλαγή εμφάνισης',
  beautyDecisionOcasionDiaADia: 'το σκέφτηκα για την καθημερινότητα',
};
