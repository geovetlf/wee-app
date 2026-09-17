/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`. Tampoco se pasan a hanzi: "Weë Brain"
 * NUNCA es «大腦» ni una transliteración.
 *
 * TAIWÁN, NO UNA CONVERSIÓN: inteligente es «智慧» (en China continental,
 * «智能»), un asistente es «助理», un mensaje es «訊息» —«消息» allí son
 * noticias—, contestar es «回覆», ajustes son «設定» y buscar es «搜尋» por la
 * «網路», nunca «搜索» ni «網絡».
 *
 * ESPACIADO: un espacio entre hanzi y latín o cifras («Weë Brain，與 Weë AI…»),
 * y ninguno entre palabras chinas. La puntuación va en ancho completo.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: '你的全能智慧助理',
  slogan: '想像 · 提問 · 創作 · 連結',
  description: 'Weë 的全部能力，盡在一場對話之中。',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain，與 Weë AI 的其他專區相連',
  goTo: '前往 {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: '在這裡輸入你的訊息…',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: '選擇你想要的回覆方式。',
  searchGroup: '網路搜尋',

  imageLabel: '圖片',
  settingsLabel: '設定',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  /* Lo que queda, no lo gastado: antes de escribir interesa cuántas faltan. */
  blockLeft: '還剩 {{restantes}}/{{total}} 次回覆',
};
