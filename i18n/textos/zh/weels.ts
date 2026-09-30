/*
 * CHINO SIMPLIFICADO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weël y Weëls son MARCA: se quedan en alfabeto latino, no se transliteran y NO
 * se cambian por la palabra común que significan (no son 短视频). Dentro del
 * hanzi llevan UN espacio a cada lado, y donde el chino pedía un sustantivo
 * detrás —视频, 列表— se apoya en él en vez de forzar la marca.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: '分享 Weël',
  empty: '还没有 Weëls',
  emptyHint: '用 + 按钮创建第一个',
  loadFailed: '无法加载 Weëls',
  rowSubtitle: '看看社区创作的视频。',
  seeAll: '查看全部 Weëls',
  create: '创建 Weël',
  createFirst: '你的第一个 Weël',
  open: '查看 Weël',
  upTo15s: '最长 15 秒',
  noneYetHint: '社区还没有 Weëls。下面的示例先让你看看它们长什么样。',
  sampleAiScene: 'AI 场景',
  sampleDance: '舞蹈',
  sampleRecipe: '菜谱',
  sampleTrip: '旅行',
};
