/*
 * JAPONÉS — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`): el nombre va solo, sin さん.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: '新しいいいね',
  likeCuerpo: '{{nombre}}があなたの投稿にいいねしました',
  comentarioTitulo: '新しいコメント',
  comentarioCuerpo: '{{nombre}}があなたの投稿にコメントしました',
  seguidorTitulo: '新しいフォロワー',
  seguidorCuerpo: '{{nombre}}があなたをフォローしました',
  solicitudTitulo: '新しいËContactリクエスト',
  solicitudCuerpo: '{{nombre}}からËContactのリクエストが届きました',
  aceptadaTitulo: '新しいËContact',
  aceptadaCuerpo: '{{nombre}}がËContactのリクエストを承認しました',
  mencionTitulo: 'メンションされました',
  mencionCuerpo: '{{nombre}}が投稿であなたをメンションしました',
  repostTitulo: '新しいリポスト',
  repostCuerpo: '{{nombre}}があなたの投稿をリポストしました',
  respuestaTitulo: '新しい返信',
  respuestaCuerpo: '{{nombre}}があなたのコメントに返信しました',
  mensajeTitulo: '新しいメッセージ',
  mensajeCuerpo: '{{nombre}}からメッセージが届きました',
  alguien: '誰か',
  teEnvioUnMensaje: 'メッセージが届きました',
  fotoUnica: '1回限りの写真',
  imagen: '📷 画像',
  audio: '🎤 音声',
};
