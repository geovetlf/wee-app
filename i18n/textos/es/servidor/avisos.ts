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
 *
 * `<clave>SinNombre` es la frase de cuando quien la provoca no tiene un nombre que enseñar, como en la pantalla
 * (`notifications.<clave>SinNombre`). En español es la MISMA frase, con `alguien` en el hueco: aquí no cambia nada. Un
 * idioma donde «alguien» no puede ir en el sitio del nombre (el filipino: «si»/«ni» no van delante de un sustantivo
 * común) escribe otra frase, sin {{nombre}}. `tituloDelMensajeSinNombre` es el título del push de un mensaje de
 * WeeTalk —que con nombre es el nombre— y `teEnvioUnMensajeSinNombre`, su texto cuando el mensaje no trae palabras.
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
  likeCuerpoSinNombre: '{{nombre}} le dio like a tu post',
  comentarioCuerpoSinNombre: '{{nombre}} comentó en tu post',
  seguidorCuerpoSinNombre: '{{nombre}} comenzó a seguirte',
  solicitudCuerpoSinNombre: '{{nombre}} quiere agregarte a ËContact',
  aceptadaCuerpoSinNombre: '{{nombre}} aceptó tu solicitud de ËContact',
  mencionCuerpoSinNombre: '{{nombre}} te mencionó en un post',
  repostCuerpoSinNombre: '{{nombre}} reposteó tu publicación',
  respuestaCuerpoSinNombre: '{{nombre}} respondió a tu comentario',
  mensajeCuerpoSinNombre: '{{nombre}} te envió un mensaje',
  tituloDelMensajeSinNombre: '{{nombre}}',
  teEnvioUnMensajeSinNombre: 'Te envió un mensaje',
  fotoUnica: 'Foto única',
  imagen: '📷 Imagen',
  audio: '🎤 Audio',
};
