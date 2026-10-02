/*
 * CHINO SIMPLIFICADO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las cinco etiquetas son de dos caracteres —首页, 搜索, 创建, WeeTalk, 通知— y
 * son EXACTAMENTE las mismas que usa el menú ☰ (`menu`). WeeTalk es marca: se
 * queda en alfabeto latino dentro del hanzi y NO se pasa a 聊天.
 *
 * `goTo` no puede decir «前往{{nombre}}» ni «前往 {{nombre}}»: por el hueco pasa
 * tanto el nombre de una comunidad escrito en hanzi —donde el espacio sobra—
 * como el de una sección de Weë en alfabeto latino —donde el espacio hace
 * falta—. Se resuelve con dos puntos de ancho completo, que separan solos.
 *
 * Entre hanzi y alfabeto latino o cifras va UN espacio: «Weë AI», «15 秒».
 */
export const nav: typeof import('../es/nav').nav = {
  home: '首页',
  search: '搜索',
  create: '创建',
  talk: 'WeeTalk',
  notifications: '通知',
  current: '当前页面',
  goTo: '前往：{{nombre}}',
  weeNavigation: 'Weë 导航',
  goHome: '前往首页',
  myProfile: '前往我的主页',
  openWeeAi: '打开 Weë AI',
  goToWeeAi: '前往 Weë AI',
  weeAiQuestion: '今天想创建点什么？',
  weeAiPitch: '告诉 Weë 你想要什么，AI 的事交给 Weë。',
  documentTitle: 'Weë - 未来的社区',
};
