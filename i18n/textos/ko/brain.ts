/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`. Tampoco se transliteran al hangul:
 * "Weë Brain" nunca es «브레인».
 *
 * `goTo` lleva un hueco, así que la frase se reordena («{{seccion}} 열기»): las
 * partículas 을/를 y (으)로 cambian según la palabra anterior y detrás de un
 * hueco no se sabe cuál vendrá.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: '무엇이든 도와주는 똑똑한 어시스턴트',
  slogan: '상상 · 질문 · 창작 · 연결',
  description: 'Weë의 모든 힘을 대화 하나에 담았어요.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, Weë AI의 다른 섹션들과 연결되어 있어요',
  goTo: '{{seccion}} 열기',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: '여기에 메시지를 적어보세요...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: '어떻게 답해줄지 골라보세요.',
  searchGroup: '인터넷 검색',

  imageLabel: '이미지',
  settingsLabel: '설정',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: '답변 {{restantes}}/{{total}} 남음',
};
