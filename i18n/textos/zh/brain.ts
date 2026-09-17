/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`. Tampoco se pasan a hanzi: "Weë Brain"
 * NUNCA es «大脑» ni «威布大脑».
 *
 * ESPACIADO: un espacio entre hanzi y latín o cifras («Weë Brain，与 Weë AI…»),
 * y ninguno entre palabras chinas. La puntuación va en ancho completo.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: '你的全能智能助手',
  slogan: '想象 · 提问 · 创作 · 连接',
  description: 'Weë 的全部能力，尽在一场对话里。',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain，与 Weë AI 的其他板块相连',
  goTo: '前往 {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: '在这里输入你的消息…',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: '选择你想要的回答方式。',
  searchGroup: '联网搜索',

  imageLabel: '图片',
  settingsLabel: '设置',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  /* Lo que queda, no lo gastado: antes de escribir interesa cuántas faltan. */
  blockLeft: '还剩 {{restantes}}/{{total}} 次回答',
};
