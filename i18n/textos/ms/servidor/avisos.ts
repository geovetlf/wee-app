/*
 * MALAYO — Las notificaciones push (ver `../../es/servidor/avisos.ts`). El NOMBRE entra como valor y no se traduce.
 *
 * `fotoUnica`, `imagen` y `audio` dicen lo mismo que la vista previa de WeeTalk.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Suka baharu',
  likeCuerpo: '{{nombre}} menyukai siaran anda',
  comentarioTitulo: 'Komen baharu',
  comentarioCuerpo: '{{nombre}} mengulas siaran anda',
  seguidorTitulo: 'Pengikut baharu',
  seguidorCuerpo: '{{nombre}} mula mengikuti anda',
  solicitudTitulo: 'Permintaan ËContact baharu',
  solicitudCuerpo: '{{nombre}} mahu menambah anda ke ËContact',
  aceptadaTitulo: 'ËContact baharu',
  aceptadaCuerpo: '{{nombre}} menerima permintaan ËContact anda',
  mencionTitulo: 'Anda telah disebut',
  mencionCuerpo: '{{nombre}} menyebut anda dalam siaran',
  repostTitulo: 'Siar semula baharu',
  repostCuerpo: '{{nombre}} menyiarkan semula siaran anda',
  respuestaTitulo: 'Balasan baharu',
  respuestaCuerpo: '{{nombre}} membalas komen anda',
  mensajeTitulo: 'Mesej baharu',
  mensajeCuerpo: '{{nombre}} menghantar mesej kepada anda',
  alguien: 'Seseorang',
  teEnvioUnMensaje: 'Menghantar mesej kepada anda',
  fotoUnica: 'Foto sekali lihat',
  imagen: '📷 Imej',
  audio: '🎤 Audio',
};
