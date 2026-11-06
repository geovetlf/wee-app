/*
 * RUMANO — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Apreciere nouă',
  likeCuerpo: '{{nombre}} a apreciat postarea ta',
  comentarioTitulo: 'Comentariu nou',
  comentarioCuerpo: '{{nombre}} a comentat la postarea ta',
  seguidorTitulo: 'Urmăritor nou',
  seguidorCuerpo: '{{nombre}} a început să te urmărească',
  solicitudTitulo: 'Cerere nouă de ËContact',
  solicitudCuerpo: '{{nombre}} vrea să te adauge în ËContact',
  aceptadaTitulo: 'ËContact nou',
  aceptadaCuerpo: '{{nombre}} a acceptat cererea ta de ËContact',
  mencionTitulo: 'Ai fost menționat',
  mencionCuerpo: '{{nombre}} te-a menționat într-o postare',
  repostTitulo: 'Redistribuire nouă',
  repostCuerpo: '{{nombre}} a redistribuit postarea ta',
  respuestaTitulo: 'Răspuns nou',
  respuestaCuerpo: '{{nombre}} a răspuns la comentariul tău',
  mensajeTitulo: 'Mesaj nou',
  mensajeCuerpo: '{{nombre}} ți-a trimis un mesaj',
  alguien: 'Cineva',
  teEnvioUnMensaje: 'Ți-a trimis un mesaj',
  fotoUnica: 'Fotografie cu afișare unică',
  imagen: '📷 Imagine',
  audio: '🎤 Audio',
};
