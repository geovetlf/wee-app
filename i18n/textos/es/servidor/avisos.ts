/*
 * ESPAÑOL — Las notificaciones push (el aviso del sistema operativo, no la pantalla de Notificaciones).
 *
 * Las manda el servidor (`functions/src/social/avisos.ts` y `functions/src/index.ts`), así que el servidor tiene que
 * saber el texto en el idioma de quien la recibe: lo lee de estos diccionarios a través de
 * `functions/src/social/textosDeAvisos.ts`, que GENERA `scripts/i18n-textos-del-servidor.mjs` y vigila
 * `functions/test/i18n-servidor.test.mjs`. El español es el de siempre, palabra por palabra.
 *
 * `fotoUnica`, `imagen` y `audio` son lo que la app GUARDA como contenido de un mensaje sin texto; el push los
 * reconoce y los dice en el idioma de quien lo recibe.
 */
export const avisos = {
  likeTitulo: 'Nuevo like',
  likeCuerpo: '{{nombre}} le dio like a tu post',
  comentarioTitulo: 'Nuevo comentario',
  comentarioCuerpo: '{{nombre}} comentó en tu post',
  seguidorTitulo: 'Nuevo seguidor',
  seguidorCuerpo: '{{nombre}} comenzó a seguirte',
  solicitudTitulo: 'Nueva solicitud de ËContact',
  solicitudCuerpo: '{{nombre}} quiere agregarte a ËContact',
  aceptadaTitulo: 'Nuevo ËContact',
  aceptadaCuerpo: '{{nombre}} aceptó tu solicitud de ËContact',
  mencionTitulo: 'Te mencionaron',
  mencionCuerpo: '{{nombre}} te mencionó en un post',
  repostTitulo: 'Nuevo repost',
  repostCuerpo: '{{nombre}} reposteó tu publicación',
  respuestaTitulo: 'Nueva respuesta',
  respuestaCuerpo: '{{nombre}} respondió a tu comentario',
  mensajeTitulo: 'Nuevo mensaje',
  mensajeCuerpo: '{{nombre}} te envió un mensaje',
  alguien: 'Alguien',
  teEnvioUnMensaje: 'Te envió un mensaje',
  fotoUnica: 'Foto única',
  imagen: '📷 Imagen',
  audio: '🎤 Audio',
};
