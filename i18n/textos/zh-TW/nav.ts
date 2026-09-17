/*
 * CHINO TRADICIONAL (TAIWÁN) — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las cinco etiquetas son de dos caracteres —首頁, 搜尋, 建立, WeeTalk, 通知— y
 * son EXACTAMENTE las mismas que usa el menú ☰ (`menu`). En Taiwán «buscar» es
 * 搜尋 y no 搜索, y «crear» es 建立 y no 創建: son palabras distintas, no el
 * mismo carácter con otros trazos. WeeTalk es marca: se queda en alfabeto
 * latino dentro del hanzi y NO se pasa a 聊天.
 *
 * `goTo` no puede decir «前往{{nombre}}» ni «前往 {{nombre}}»: por el hueco pasa
 * tanto el nombre de una comunidad escrito en hanzi —donde el espacio sobra—
 * como el de una sección de Weë en alfabeto latino —donde el espacio hace
 * falta—. Se resuelve con dos puntos de ancho completo, que separan solos.
 *
 * `weeNavigation` es la etiqueta de accesibilidad de la barra: en Taiwán eso es
 * 導覽, porque 導航 es lo del GPS del coche. `myProfile` dice 主頁, el mismo
 * nombre que le dan al perfil de una persona `menu`, `profile` y `weeai`.
 *
 * Entre hanzi y alfabeto latino o cifras va UN espacio: «Weë AI», «15 秒».
 */
export const nav: typeof import('../es/nav').nav = {
  home: '首頁',
  search: '搜尋',
  create: '建立',
  talk: 'WeeTalk',
  notifications: '通知',
  current: '目前頁面',
  goTo: '前往：{{nombre}}',
  weeNavigation: 'Weë 導覽',
  goHome: '前往首頁',
  myProfile: '前往我的個人檔案',
  openWeeAi: '開啟 Weë AI',
  goToWeeAi: '前往 Weë AI',
  weeAiQuestion: '今天想創作什麼？',
  weeAiPitch: '告訴 Weë 你想要什麼，AI 的事交給 Weë。',
};
