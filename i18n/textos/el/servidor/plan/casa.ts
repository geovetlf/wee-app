/*
 * GRIEGO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega en acusativo y con su artículo («το σαλόνι», «την κουζίνα»), como objeto directo o detrás de «για».
 * `{{comensales}}` trae su «για» («για δύο»); `{{tiempo}}` entra detrás de «μέσα σε»; `{{estilo}}`, detrás de «στιλ».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Θα ξεκινήσω από τη φωτογραφία σου και θα βελτιώσω τον φωτισμό. Το πιάτο μένει ακριβώς όπως είναι.',
  chefExplicaRetoqueFondo: 'Θα ξεκινήσω από τη φωτογραφία σου και θα αλλάξω το φόντο. Το πιάτο μένει ακριβώς όπως είναι.',
  chefExplicaRetoqueApetitoso: 'Θα ξεκινήσω από τη φωτογραφία σου και θα το κάνω να δείχνει πιο λαχταριστό. Το πιάτο μένει ακριβώς όπως είναι.',
  chefExplicaRetoqueRestaurante: 'Θα ξεκινήσω από τη φωτογραφία σου και θα της δώσω όψη φωτογραφίας εστιατορίου. Το πιάτο μένει ακριβώς όπως είναι.',
  chefExplicaRetoqueQuitar: 'Θα ξεκινήσω από τη φωτογραφία σου και θα αφαιρέσω ό,τι περισσεύει. Το πιάτο μένει ακριβώς όπως είναι.',
  chefExplicaRetoqueNoSe: 'Θα ξεκινήσω από τη φωτογραφία σου και θα βελτιώσω την εμφάνισή της χωρίς να αλλάξω το πιάτο. Το πιάτο μένει ακριβώς όπως είναι.',
  chefExplicaRetoqueLibre: 'Θα ξεκινήσω από τη φωτογραφία σου και θα κάνω μόνο τις αλλαγές που μου ζήτησες. Το πιάτο μένει ακριβώς όπως είναι.',

  chefExplicaMenuTresDias: 'Θα φτιάξω ένα μενού για τρεις μέρες, {{comensales}}, και θα σου αφήσω τη λίστα αγορών.',
  chefExplicaMenuTodaLaSemana: 'Θα φτιάξω ένα μενού για όλη την εβδομάδα, {{comensales}}, και θα σου αφήσω τη λίστα αγορών.',
  chefExplicaMenuParaLaSemana: 'Θα φτιάξω ένα μενού για την εβδομάδα, {{comensales}}, και θα σου αφήσω τη λίστα αγορών.',
  chefExplicaMenu: 'Θα φτιάξω ένα μενού (διάρκεια: {{duracion}}), {{comensales}}, και θα σου αφήσω τη λίστα αγορών.',

  chefExplicaRecetaEnTiempo: 'Θα ετοιμάσω μια συνταγή βήμα προς βήμα μέσα σε {{tiempo}}, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',
  chefExplicaRecetaSinApuro: 'Θα ετοιμάσω μια συνταγή βήμα προς βήμα χωρίς βιασύνη, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',
  chefExplicaConLoQueTienesEnTiempo: 'Θα ετοιμάσω μια συνταγή με ό,τι έχεις στο σπίτι μέσα σε {{tiempo}}, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',
  chefExplicaConLoQueTienesSinApuro: 'Θα ετοιμάσω μια συνταγή με ό,τι έχεις στο σπίτι χωρίς βιασύνη, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',
  chefExplicaSaludableEnTiempo: 'Θα ετοιμάσω μια υγιεινή συνταγή μέσα σε {{tiempo}}, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',
  chefExplicaSaludableSinApuro: 'Θα ετοιμάσω μια υγιεινή συνταγή χωρίς βιασύνη, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',
  chefExplicaPostreEnTiempo: 'Θα ετοιμάσω ένα γλυκό μέσα σε {{tiempo}}, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',
  chefExplicaPostreSinApuro: 'Θα ετοιμάσω ένα γλυκό χωρίς βιασύνη, {{comensales}}, και μια φωτογραφία του έτοιμου πιάτου.',

  chefDecisionAlgoRico: 'σου προτείνω κάτι νόστιμο και εύκολο με ό,τι έχεις συνήθως στο σπίτι',
  chefDecisionParaDos: 'το σκέφτηκα για δύο',
  chefDecisionSinApuro: 'το κάνω χωρίς βιασύνη',
  chefDecisionTodaLaSemana: 'το κάνω για όλη την εβδομάδα',

  chefPasoMirarIngredientes: 'Έλεγχος των υλικών που έχεις',
  chefPasoEscribirReceta: 'Συγγραφή της συνταγής βήμα προς βήμα',
  chefPasoFotoDelPlato: 'Δημιουργία φωτογραφίας του πιάτου',
  chefPasoArmarMenu: 'Δημιουργία του μενού',
  chefPasoPreciosIngredientes: 'Έλεγχος του κόστους των υλικών',
  chefPasoListaDeCompras: 'Δημιουργία της λίστας αγορών',
  chefPasoRetocarFoto: 'Ρετούς στη φωτογραφία του πιάτου σου',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Θα κοιτάξω {{espacio}} και θα σου πω τι θα άλλαζα —έπιπλα, χρώματα, διάταξη— για να διαλέξεις από πού θα ξεκινήσεις. Δεν δημιουργώ ακόμη καμία εικόνα.',
  homeExplicaIdeas: 'Θα αναζητήσω τρεις ιδέες για {{espacio}} με στιλ {{estilo}} και θα σου εξηγήσω πώς να τις πετύχεις.',
  homeExplicaDistribucion: 'Θα κοιτάξω {{espacio}}, θα σου προτείνω μια διάταξη που αξιοποιεί καλύτερα τον χώρο και θα σου δείξω πώς θα έμοιαζε με τα ίδια σου τα έπιπλα.',
  homeExplicaRedisenar: 'Θα σχεδιάσω ξανά {{espacio}} με στιλ {{estilo}}, σε δύο προτάσεις, και θα σου αφήσω τη λίστα αλλαγών και αγορών.',
  homeExplicaMuebles: 'Θα αλλάξω τα έπιπλα για {{espacio}} με στιλ {{estilo}}, σε δύο προτάσεις, και θα σου αφήσω τη λίστα αλλαγών και αγορών.',
  homeExplicaColores: 'Θα αλλάξω την αισθητική και τα χρώματα για {{espacio}} με στιλ {{estilo}}, σε δύο προτάσεις, και θα σου αφήσω τη λίστα αλλαγών και αγορών.',
  homeExplicaExterior: 'Θα σχεδιάσω τον εξωτερικό σου χώρο με στιλ {{estilo}}, σε δύο προτάσεις, και θα σου αφήσω τη λίστα αλλαγών και αγορών.',

  homeDecisionEmpiezoPorLaSala: 'ξεκινώ από το σαλόνι',
  homeDecisionEstiloAcogedor: 'διάλεξα ένα ζεστό στιλ',

  homePasoMirarFotoDelEspacio: 'Εξέταση της φωτογραφίας του χώρου',
  homePasoRedisenar: 'Νέος σχεδιασμός για {{espacio}} με στιλ {{estilo}}',
  homePasoMuebles: 'Αλλαγή επίπλων για {{espacio}} με στιλ {{estilo}}',
  homePasoColores: 'Αλλαγή αισθητικής και χρωμάτων για {{espacio}} με στιλ {{estilo}}',
  homePasoExterior: 'Σχεδιασμός του εξωτερικού σου χώρου με στιλ {{estilo}}',
  homePasoListaDeCambios: 'Δημιουργία της λίστας αλλαγών και αγορών',
  homePasoProponerDistribucion: 'Πρόταση για καλύτερη διάταξη',
  homePasoMostrarComoQuedaria: 'Πώς θα έμοιαζε',
  homePasoBuscarIdeas: 'Αναζήτηση ιδεών για {{espacio}}',
  homePasoExplicarComoLograrlo: 'Εξήγηση για το πώς θα το πετύχεις',
  homePasoMirarFotoDeTuEspacio: 'Εξέταση της φωτογραφίας του χώρου σου',
  homePasoContarQueVeo: 'Τι βλέπω και τι θα έκανα',

  chefComensalesSoloParaMi: 'μόνο για σένα',
  homeEspacioMiOficina: 'το γραφείο σου',
};
