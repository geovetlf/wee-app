/*
 * JAPONÉS — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * «No te cobré» es Creditsは消費されていません, como en `credits.ts`.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: '開始しています…',
  ajustandoVertical: 'Weëlsを縦長に調整しています…',
  montando: 'Weëlsを編集しています…',
  generandoWeel: 'Weëlsを生成しています…',
  creandoImagen: '画像を作成しています…',
  grabandoVoz: '音声を録音しています…',
  efectosDeSonido: '効果音を追加しています…',
  componiendo: '音楽を作っています…',
  mirandoFoto: '写真を確認しています…',
  preparandoDocumento: 'ドキュメントを準備しています…',
  escribiendoGuion: '脚本を書いています…',
  dividiendoEscenas: 'ストーリーをシーンに分けています…',
  creandoSubtitulos: '字幕を作成しています…',
  escribiendo: '書いています…',
  paso: '{{proposito}}…',
  sinTiempo: '時間切れになりました。Creditsを返還しました。',
  listo: '✨ 完了',
  fallaVideo: '今回は動画を生成できませんでした。Creditsは消費されていません。少し待ってから、もう一度お試しください。',
  fallaImagen: '今回は画像を作成できませんでした。Creditsは消費されていません。少し待ってから、もう一度お試しください。',
  fallaGeneral: '今回はうまくいきませんでした。Creditsは消費されていません。少し待ってから、もう一度お試しください。',
  fallaCorta: 'うまくいきませんでした。Creditsは消費されていません。',
};
