/*
 * TURCO — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`): `{{nombre}}` va de sujeto, sin sufijo.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Yeni beğeni',
  likeCuerpo: '{{nombre}} gönderini beğendi',
  comentarioTitulo: 'Yeni yorum',
  comentarioCuerpo: '{{nombre}} gönderine yorum yaptı',
  seguidorTitulo: 'Yeni takipçi',
  seguidorCuerpo: '{{nombre}} seni takip etmeye başladı',
  solicitudTitulo: 'Yeni ËContact isteği',
  solicitudCuerpo: '{{nombre}} seni ËContact listesine eklemek istiyor',
  aceptadaTitulo: 'Yeni ËContact',
  aceptadaCuerpo: '{{nombre}} ËContact isteğini kabul etti',
  mencionTitulo: 'Senden bahsedildi',
  mencionCuerpo: '{{nombre}} bir gönderide senden bahsetti',
  repostTitulo: 'Yeni yeniden paylaşım',
  repostCuerpo: '{{nombre}} gönderini yeniden paylaştı',
  respuestaTitulo: 'Yeni yanıt',
  respuestaCuerpo: '{{nombre}} yorumunu yanıtladı',
  mensajeTitulo: 'Yeni mesaj',
  mensajeCuerpo: '{{nombre}} sana mesaj gönderdi',
  alguien: 'Biri',
  teEnvioUnMensaje: 'Sana mesaj gönderdi',
  fotoUnica: 'Tek seferlik fotoğraf',
  imagen: '📷 Görsel',
  audio: '🎤 Ses',
};
