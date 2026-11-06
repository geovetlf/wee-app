/*
 * CHINO SIMPLIFICADO — Textos del servidor: avisos (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Espacio entre hanzi y latín o cifras; los huecos de texto van pegados o detrás de dos puntos, para que entre cualquier opción.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: '新的赞',
  likeCuerpo: '{{nombre}} 赞了你的动态',
  comentarioTitulo: '新评论',
  comentarioCuerpo: '{{nombre}} 评论了你的动态',
  seguidorTitulo: '新粉丝',
  seguidorCuerpo: '{{nombre}} 关注了你',
  solicitudTitulo: '新的 ËContact 请求',
  solicitudCuerpo: '{{nombre}} 想把你加到 ËContact',
  aceptadaTitulo: '新的 ËContact',
  aceptadaCuerpo: '{{nombre}} 接受了你的 ËContact 请求',
  mencionTitulo: '有人提到了你',
  mencionCuerpo: '{{nombre}} 在一条动态中提到了你',
  repostTitulo: '新的转发',
  repostCuerpo: '{{nombre}} 转发了你的动态',
  respuestaTitulo: '新回复',
  respuestaCuerpo: '{{nombre}} 回复了你的评论',
  mensajeTitulo: '新消息',
  mensajeCuerpo: '{{nombre}} 给你发了一条消息',
  alguien: '有人',
  teEnvioUnMensaje: '给你发了一条消息',
  fotoUnica: '一次性照片',
  imagen: '📷 图片',
  audio: '🎤 语音',
};
