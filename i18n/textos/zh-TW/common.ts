/*
 * CHINO TRADICIONAL (TAIWÁN) — lo que se repite por toda la app: botones,
 * estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── ESTO NO ES EL SIMPLIFICADO CON OTROS TRAZOS ────────────────────────────
 *
 * Taiwán no dice lo mismo que el continente con caracteres distintos: dice
 * OTRAS PALABRAS. Aquí se ven tres: «guardar» es 儲存 y no 保存, «cargar» es
 * 載入 y no 加載, y «usuario» es 使用者 y no 用戶. La misma regla vale para
 * 搜尋 (no 搜索), 設定 (no 設置), 影片 (no 視頻), 專案 (no 項目) y 社群 (no
 * 社區), que aparecen en los demás módulos.
 *
 * Los botones van en forma verbal corta de dos caracteres —儲存, 取消, 刪除,
 * 關閉—, que es como se escriben en chino. `accept` es el «確定» de los
 * diálogos, no un «接受»: aquí es el botón de OK. `send` es 傳送, que es como
 * se manda un mensaje en Taiwán. La flecha → de `seeAll` se copia tal cual,
 * con su espacio delante.
 *
 * Puntuación de ancho completo (。，、？！：；), comillas 「」 —las de Taiwán,
 * no las “” del continente— y UN espacio entre hanzi y alfabeto latino o
 * cifras.
 */
export const common: typeof import('../es/common').common = {
  cancel: '取消',
  save: '儲存',
  delete: '刪除',
  close: '關閉',
  back: '返回',
  next: '下一步',
  done: '完成',
  accept: '確定',
  send: '傳送',
  share: '分享',
  retry: '再試一次',
  loading: '載入中…',
  error: '錯誤',
  somethingWentWrong: '出了點問題',
  noResults: '沒有結果',
  notAvailable: '無法使用',
  comingSoon: '即將推出',
  new: '新',
  seeAll: '查看全部 →',
  guest: '訪客',
  anonymousUser: '匿名使用者',
  user: '使用者',
  yes: '是',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: '否',
  loadMore: '載入更多貼文',
  postsCount_one: '{{cantidad}} 則貼文',
  postsCount_other: '{{cantidad}} 則貼文',
};
