/*
 * JAPONÉS — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: '承認するリクエストはありません。',
  ecRelacionInvalida: 'このリクエストは無効です。',
  ecNoLaRecibiste: '承認できるのは、リクエストを受け取った人だけです。',
  ecYaSonContactos: 'すでにËContactsです。',
  ecIdentidadInvalida: 'このプロフィールは無効です。',
  ecIdentidadDesconocida: 'このプロフィールは存在しません。',
  ecIdentidadAjena: 'このプロフィールはあなたのものではありません。',
  ecMismaPersona: '自分自身とはつながれません。',
  ecYaExiste: 'このプロフィールとはすでにつながりがあります。',
  ecIniciaSesion: 'ËContactを使うにはログインしてください。',
  ecNoSeCompleto: '操作を完了できませんでした。もう一度お試しください。',
  ecFaltaPerfilPropio: 'つながりに使うプロフィールが指定されていません。',
  ecFaltaPerfilAjeno: 'つながる相手のプロフィールが指定されていません。',
  ecFaltaPerfilQueAcepta: '承認に使うプロフィールが指定されていません。',
  ecFaltaPerfilQueEnvia: 'リクエストを送った人のプロフィールが指定されていません。',
  encSinEncuesta: 'この投稿にはアンケートがありません。',
  encInvalida: 'このアンケートは無効です。',
  encAntigua: 'このアンケートはWeëの旧バージョンのもので、投票できなくなっています。',
  encOpcionInexistente: 'この選択肢はアンケートにありません。',
  encCerrada: 'このアンケートはすでに終了しています。',
  encYaVotaste: 'このアンケートにはすでに投票しています。',
  encPostNoExiste: 'この投稿はすでに存在しません。',
  encIniciaSesion: '投票するにはログインしてください。',
  encFaltaPublicacion: '投稿が指定されていません。',
  encFaltaOpcion: '選択肢が指定されていません。',
  encNoSeRegistro: '投票を記録できませんでした。もう一度お試しください。',
};
