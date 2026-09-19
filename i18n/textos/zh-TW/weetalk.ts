/*
 * CHINO TRADICIONAL (TAIWÁN) — WeeTalk. El nombre es marca: se queda en
 * alfabeto latino, no se translitera y NO se cambia por la palabra común que
 * significa (no es 聊天). Los mensajes los escribe la gente y NUNCA pasan por
 * aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── EL VOCABULARIO DEL CHAT EN TAIWÁN ──────────────────────────────────────
 *
 * Un mensaje es 訊息 y se cuenta por 則; enviarlo es 傳送; un mensaje privado es
 * 私訊; una conversación es 對話; el álbum del teléfono es 相簿 y entrar en él
 * es 存取 —no 訪問—; el sonido grabado es 音訊 —no 音頻—. Y una publicación es
 * 貼文, no 動態.
 *
 * `youSaid` usa el patrón etiqueta «你：{{mensaje}}»: el hueco va detrás de los
 * dos puntos de ancho completo, que separan sin espacio y aceptan cualquier
 * cosa que haya escrito la persona. El emoji 🤝 se copia tal cual, y los tres
 * puntos ASCII de los marcadores de posición también, como en el español. Las
 * comillas de `noConversationsHint` son las 「」 de Taiwán.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: '輸入訊息…',
  send: '傳送',
  empty: '你還沒有任何對話',
  emptyHint: '從別人的個人檔案傳訊息給對方',
  loadFailed: '無法載入你的對話',
  sendFailed: '訊息傳送失敗',
  attach: '附件',
  photo: '照片',
  search: '搜尋…',
  noConversations: '沒有對話',
  deleteConversation: '刪除對話',
  areYouSure: '確定嗎？',
  messagePlaceholderShort: '訊息…',
  firstMessage: '傳出第一則訊息',
  photoSeen: '照片已查看',
  photoOnce: '閱後即焚照片',
  photoOpened: '已開啟',
  tapToView: '點擊查看',
  tapToClose: '點擊關閉',
  theme: '主題',
  background: '背景',
  permissions: '權限',
  photoPermission: '存取照片需要授予權限',
  audioPermission: '錄製音訊需要授予權限',
  imageFailed: '圖片傳送失敗',
  noConversationsHint: '在任何貼文上點「私密」，就能開始一段匿名對話',
  ephemeralMode: '閱後即焚模式',
  noMessagesYet: '還沒有訊息',
  youSaid: '你：{{mensaje}}',
  conversationStart: '這裡是你們私密對話的開始',
  beRespectful: '記得保持尊重和隱私 🤝',
  anonymousUser: '匿名使用者',
  ephemeralOn: '閱後即焚模式已開啟 · 離開後訊息會刪除',
  cameraNeeded: '需要相機存取權限',
  allow: '允許',
};
