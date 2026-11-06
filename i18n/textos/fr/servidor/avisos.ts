/*
 * FRANCÉS — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nouveau j’aime',
  likeCuerpo: '{{nombre}} a aimé ta publication',
  comentarioTitulo: 'Nouveau commentaire',
  comentarioCuerpo: '{{nombre}} a commenté ta publication',
  seguidorTitulo: 'Nouvel abonné',
  seguidorCuerpo: '{{nombre}} a commencé à te suivre',
  solicitudTitulo: 'Nouvelle demande ËContact',
  solicitudCuerpo: '{{nombre}} veut t’ajouter à ËContact',
  aceptadaTitulo: 'Nouvel ËContact',
  aceptadaCuerpo: '{{nombre}} a accepté ta demande ËContact',
  mencionTitulo: 'Nouvelle mention',
  mencionCuerpo: '{{nombre}} t’a mentionné dans une publication',
  repostTitulo: 'Nouveau partage',
  repostCuerpo: '{{nombre}} a partagé ta publication',
  respuestaTitulo: 'Nouvelle réponse',
  respuestaCuerpo: '{{nombre}} a répondu à ton commentaire',
  mensajeTitulo: 'Nouveau message',
  mensajeCuerpo: '{{nombre}} t’a envoyé un message',
  alguien: 'Quelqu’un',
  teEnvioUnMensaje: 'T’a envoyé un message',
  fotoUnica: 'Photo unique',
  imagen: '📷 Image',
  audio: '🎤 Audio',
};
