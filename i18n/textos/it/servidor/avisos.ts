/*
 * ITALIANO — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nuovo Mi piace',
  likeCuerpo: 'A {{nombre}} piace il tuo post',
  comentarioTitulo: 'Nuovo commento',
  comentarioCuerpo: '{{nombre}} ha commentato il tuo post',
  seguidorTitulo: 'Nuovo follower',
  seguidorCuerpo: '{{nombre}} ha iniziato a seguirti',
  solicitudTitulo: 'Nuova richiesta ËContact',
  solicitudCuerpo: '{{nombre}} vuole aggiungerti a ËContact',
  aceptadaTitulo: 'Nuovo ËContact',
  aceptadaCuerpo: '{{nombre}} ha accettato la tua richiesta ËContact',
  mencionTitulo: 'Nuova menzione',
  mencionCuerpo: '{{nombre}} ti ha menzionato in un post',
  repostTitulo: 'Nuova condivisione',
  repostCuerpo: '{{nombre}} ha condiviso il tuo post',
  respuestaTitulo: 'Nuova risposta',
  respuestaCuerpo: '{{nombre}} ha risposto al tuo commento',
  mensajeTitulo: 'Nuovo messaggio',
  mensajeCuerpo: '{{nombre}} ti ha inviato un messaggio',
  alguien: 'Qualcuno',
  teEnvioUnMensaje: 'Ti ha inviato un messaggio',
  fotoUnica: 'Foto singola',
  imagen: '📷 Immagine',
  audio: '🎤 Audio',
};
