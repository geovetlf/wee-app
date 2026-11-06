/*
 * COREANO — Textos del servidor: avisos (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Ninguna partícula variable (은/는, 이/가, 을/를, 와/과, (으)로) va pegada a un hueco de texto: la frase se reordena o el hueco va detrás de dos puntos.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: '새로운 좋아요',
  likeCuerpo: '{{nombre}} 님이 내 게시물을 좋아해요',
  comentarioTitulo: '새 댓글',
  comentarioCuerpo: '{{nombre}} 님이 내 게시물에 댓글을 남겼어요',
  seguidorTitulo: '새 팔로워',
  seguidorCuerpo: '{{nombre}} 님이 나를 팔로우하기 시작했어요',
  solicitudTitulo: '새 ËContact 요청',
  solicitudCuerpo: '{{nombre}} 님이 나를 ËContact에 추가하고 싶어 해요',
  aceptadaTitulo: '새 ËContact',
  aceptadaCuerpo: '{{nombre}} 님이 내 ËContact 요청을 수락했어요',
  mencionTitulo: '누군가 나를 언급했어요',
  mencionCuerpo: '{{nombre}} 님이 게시물에서 나를 언급했어요',
  repostTitulo: '새 공유',
  repostCuerpo: '{{nombre}} 님이 내 게시물을 공유했어요',
  respuestaTitulo: '새 답글',
  respuestaCuerpo: '{{nombre}} 님이 내 댓글에 답글을 남겼어요',
  mensajeTitulo: '새 메시지',
  mensajeCuerpo: '{{nombre}} 님이 메시지를 보냈어요',
  alguien: '누군가',
  teEnvioUnMensaje: '메시지를 보냈어요',
  fotoUnica: '한 번만 볼 수 있는 사진',
  imagen: '📷 이미지',
  audio: '🎤 오디오',
};
