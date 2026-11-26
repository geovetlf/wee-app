/*
 * GRIEGO — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Δεν υπάρχει κανένα αίτημα για αποδοχή.',
  ecRelacionInvalida: 'Αυτό το αίτημα δεν είναι έγκυρο.',
  ecNoLaRecibiste: 'Μόνο όποιος έλαβε το αίτημα μπορεί να το αποδεχτεί.',
  ecYaSonContactos: 'Είστε ήδη ËContacts.',
  ecIdentidadInvalida: 'Αυτό το προφίλ δεν είναι έγκυρο.',
  ecIdentidadDesconocida: 'Αυτό το προφίλ δεν υπάρχει.',
  ecIdentidadAjena: 'Αυτό το προφίλ δεν είναι δικό σου.',
  ecMismaPersona: 'Δεν μπορείς να συνδεθείς με τον εαυτό σου.',
  ecYaExiste: 'Υπάρχει ήδη σχέση με αυτό το προφίλ.',
  ecIniciaSesion: 'Συνδέσου για να χρησιμοποιήσεις το ËContact.',
  ecNoSeCompleto: 'Η ενέργεια δεν ολοκληρώθηκε. Δοκίμασε ξανά.',
  ecFaltaPerfilPropio: 'Λείπει το προφίλ με το οποίο συνδέεσαι.',
  ecFaltaPerfilAjeno: 'Λείπει το προφίλ με το οποίο θέλεις να συνδεθείς.',
  ecFaltaPerfilQueAcepta: 'Λείπει το προφίλ με το οποίο αποδέχεσαι.',
  ecFaltaPerfilQueEnvia: 'Λείπει το προφίλ του ατόμου που σου το έστειλε.',
  encSinEncuesta: 'Αυτή η ανάρτηση δεν έχει δημοσκόπηση.',
  encInvalida: 'Αυτή η δημοσκόπηση δεν είναι έγκυρη.',
  encAntigua: 'Αυτή η δημοσκόπηση είναι από παλαιότερη έκδοση του Weë και δεν δέχεται πλέον ψήφους.',
  encOpcionInexistente: 'Αυτή η επιλογή δεν υπάρχει στη δημοσκόπηση.',
  encCerrada: 'Αυτή η δημοσκόπηση έχει ολοκληρωθεί.',
  encYaVotaste: 'Έχεις ήδη ψηφίσει σε αυτή τη δημοσκόπηση.',
  encPostNoExiste: 'Αυτή η ανάρτηση δεν υπάρχει πια.',
  encIniciaSesion: 'Πρέπει να συνδεθείς για να ψηφίσεις.',
  encFaltaPublicacion: 'Λείπει η ανάρτηση.',
  encFaltaOpcion: 'Λείπει η επιλογή.',
  encNoSeRegistro: 'Η ψήφος σου δεν καταχωρίστηκε. Δοκίμασε ξανά.',
};
