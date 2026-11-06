/*
 * JAPONÉS — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'ja',
  locale: 'ja_JP',
  alguien: '誰か',
  tituloDelEnlace: 'Weëの{{nombre}}',
  descripcionWeel: 'WeëのWeëlsです。',
  descripcionVideo: 'Weëの動画です。',
  descripcionImagen: 'Weëの画像です。',
  descripcionEncuesta: 'Weëのアンケートです。',
  descripcionPublicacion: 'Weëの投稿です。',
  explorar: 'Weëを見る',
  privacidad: 'プライバシー',
  terminos: '利用規約',
  ayuda: 'ヘルプ',
  yaNoDisponible: 'この投稿はもう利用できません。',
  noDisponible: 'この投稿は利用できません。',
  masEnWee: 'ほか{{contador}}件はWeëで',
  hechoCon: '使用ツール',
  reposteo: '{{nombre}}がリポストしました',
  perfilWee: 'Weëプロフィール',
  estoEsWee: 'これがWeëです',
  lema: 'AIで創作する人たちのネットワーク。発見し、学び、共有しましょう。',
};
