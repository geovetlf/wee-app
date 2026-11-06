/*
 * GRIEGO — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Νέο «Μου αρέσει»',
  likeCuerpo: '{{nombre}} έκανε «Μου αρέσει» στην ανάρτησή σου',
  comentarioTitulo: 'Νέο σχόλιο',
  comentarioCuerpo: '{{nombre}} σχολίασε την ανάρτησή σου',
  seguidorTitulo: 'Νέος ακόλουθος',
  seguidorCuerpo: '{{nombre}} άρχισε να σε ακολουθεί',
  solicitudTitulo: 'Νέο αίτημα ËContact',
  solicitudCuerpo: '{{nombre}} θέλει να σε προσθέσει στο ËContact',
  aceptadaTitulo: 'Νέο ËContact',
  aceptadaCuerpo: '{{nombre}} αποδέχτηκε το αίτημά σου στο ËContact',
  mencionTitulo: 'Σε ανέφεραν',
  mencionCuerpo: '{{nombre}} σε ανέφερε σε μια ανάρτηση',
  repostTitulo: 'Νέα κοινοποίηση',
  repostCuerpo: '{{nombre}} κοινοποίησε την ανάρτησή σου',
  respuestaTitulo: 'Νέα απάντηση',
  respuestaCuerpo: '{{nombre}} απάντησε στο σχόλιό σου',
  mensajeTitulo: 'Νέο μήνυμα',
  mensajeCuerpo: '{{nombre}} σου έστειλε μήνυμα',
  alguien: 'Κάποιος',
  teEnvioUnMensaje: 'Σου έστειλε μήνυμα',
  fotoUnica: 'Φωτογραφία μίας προβολής',
  imagen: '📷 Εικόνα',
  audio: '🎤 Ήχος',
};
