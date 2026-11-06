/*
 * INDONESIO — Las notificaciones push (ver `../../es/servidor/avisos.ts`). El NOMBRE entra como valor y no se traduce.
 *
 * `fotoUnica`, `imagen` y `audio` dicen lo mismo que la vista previa de WeeTalk.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Suka baru',
  likeCuerpo: '{{nombre}} menyukai postingan Anda',
  comentarioTitulo: 'Komentar baru',
  comentarioCuerpo: '{{nombre}} mengomentari postingan Anda',
  seguidorTitulo: 'Pengikut baru',
  seguidorCuerpo: '{{nombre}} mulai mengikuti Anda',
  solicitudTitulo: 'Permintaan ËContact baru',
  solicitudCuerpo: '{{nombre}} ingin menambahkan Anda ke ËContact',
  aceptadaTitulo: 'ËContact baru',
  aceptadaCuerpo: '{{nombre}} menerima permintaan ËContact Anda',
  mencionTitulo: 'Anda disebut',
  mencionCuerpo: '{{nombre}} menyebut Anda dalam postingan',
  repostTitulo: 'Posting ulang baru',
  repostCuerpo: '{{nombre}} memposting ulang postingan Anda',
  respuestaTitulo: 'Balasan baru',
  respuestaCuerpo: '{{nombre}} membalas komentar Anda',
  mensajeTitulo: 'Pesan baru',
  mensajeCuerpo: '{{nombre}} mengirimi Anda pesan',
  alguien: 'Seseorang',
  teEnvioUnMensaje: 'Mengirimi Anda pesan',
  fotoUnica: 'Foto sekali lihat',
  imagen: '📷 Gambar',
  audio: '🎤 Audio',
};
