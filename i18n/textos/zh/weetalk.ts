/*
 * CHINO SIMPLIFICADO — WeeTalk. El nombre es marca: se queda en alfabeto latino,
 * no se translitera y NO se cambia por la palabra común que significa (no es
 * 聊天). Los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `youSaid` usa el patrón etiqueta «你：{{mensaje}}»: el hueco va detrás de los
 * dos puntos de ancho completo, que separan sin espacio y aceptan cualquier
 * cosa que haya escrito la persona. El emoji 🤝 se copia tal cual, y los tres
 * puntos ASCII de los marcadores de posición también, como en el español.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: '写条消息…',
  send: '发送',
  empty: '你还没有会话',
  emptyHint: '去别人的主页上给对方发消息',
  loadFailed: '无法加载你的会话',
  sendFailed: '消息发送失败',
  attach: '附件',
  photo: '照片',
  search: '搜索…',
  noConversations: '没有会话',
  deleteConversation: '删除会话',
  areYouSure: '确定吗？',
  messagePlaceholderShort: '消息…',
  firstMessage: '发出第一条消息',
  photoSeen: '照片已查看',
  photoOnce: '阅后即焚照片',
  photoOpened: '已打开',
  tapToView: '点击查看',
  tapToClose: '点击关闭',
  theme: '主题',
  background: '背景',
  permissions: '权限',
  photoPermission: '访问照片需要授予权限',
  audioPermission: '录制音频需要授予权限',
  imageFailed: '图片发送失败',
  noConversationsHint: '在任意动态上点“私密”，就能开始一段匿名会话',
  ephemeralMode: '阅后即焚模式',
  noMessagesYet: '还没有消息',
  youSaid: '你：{{mensaje}}',
  conversationStart: '这里是你们私密会话的开始',
  beRespectful: '记得保持尊重和隐私 🤝',
  anonymousUser: '匿名用户',
  ephemeralOn: '阅后即焚模式已开启 · 退出后消息会删除',
  cameraNeeded: '需要相机访问权限',
  allow: '允许',
};
