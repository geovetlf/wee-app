/*
 * JAPONÉS — Los cinco destinos de la barra inferior y los accesos de la barra lateral.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `current` se lee pegado detrás del destino («ホーム, 表示中»): dice un estado, no es una frase. Los «Ir a…» son
 * etiquetas para el lector de pantalla y van como en las apps japonesas: 〜に移動 (lo mismo en brain.goTo,
 * weeai.goHome y weeai.goToSpecialist). «Ir al inicio» y el texto de la tarjeta de Weë AI son las mismas frases
 * españolas que weeai.goHome y weeai.tellWee, y dicen lo mismo que ellas, carácter a carácter.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'ホーム',
  search: '検索',
  create: '作成',
  talk: 'WeeTalk',
  notifications: '通知',
  current: '表示中',
  goTo: '{{nombre}}に移動',
  weeNavigation: 'Weëのナビゲーション',
  goHome: 'ホームに移動',
  myProfile: 'プロフィールに移動',
  openWeeAi: 'Weë AIを開く',
  goToWeeAi: 'Weë AIへ',
  weeAiQuestion: '今日は何を作りますか？',
  weeAiPitch: '作りたいものをWeëに伝えるだけです。AIのことはWeëにおまかせください。',
  documentTitle: 'Weë - 未来のコミュニティ',
};
