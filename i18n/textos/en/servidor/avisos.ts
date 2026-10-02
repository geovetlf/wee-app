/*
 * ENGLISH — Las notificaciones push (el aviso del sistema operativo, no la pantalla de Notificaciones). Ver
 * `../../es/servidor/avisos.ts`. El NOMBRE de quien la provoca entra como valor y no se traduce.
 *
 * `fotoUnica`, `imagen` y `audio` dicen lo mismo que la vista previa de WeeTalk (`weetalk.photoOnce`,
 * `imagePreview`, `audioPreview`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'New like',
  likeCuerpo: '{{nombre}} liked your post',
  comentarioTitulo: 'New comment',
  comentarioCuerpo: '{{nombre}} commented on your post',
  seguidorTitulo: 'New follower',
  seguidorCuerpo: '{{nombre}} started following you',
  solicitudTitulo: 'New ËContact request',
  solicitudCuerpo: '{{nombre}} wants to add you to ËContact',
  aceptadaTitulo: 'New ËContact',
  aceptadaCuerpo: '{{nombre}} accepted your ËContact request',
  mencionTitulo: 'You were mentioned',
  mencionCuerpo: '{{nombre}} mentioned you in a post',
  repostTitulo: 'New repost',
  repostCuerpo: '{{nombre}} reposted your post',
  respuestaTitulo: 'New reply',
  respuestaCuerpo: '{{nombre}} replied to your comment',
  mensajeTitulo: 'New message',
  mensajeCuerpo: '{{nombre}} sent you a message',
  alguien: 'Someone',
  teEnvioUnMensaje: 'Sent you a message',
  fotoUnica: 'One-time photo',
  imagen: '📷 Photo',
  audio: '🎤 Voice message',
};
