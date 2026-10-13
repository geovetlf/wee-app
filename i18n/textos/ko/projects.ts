/*
 * COREANO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. QUÉ NO ENTRA AQUÍ: el nombre de un proyecto, que lo escribe
 * la persona y se guarda tal cual, ni la meta de una creación, que también es
 * suya. Cuando uno de esos valores va dentro de una frase, entra por
 * interpolación y nunca pegando cadenas.
 *
 * ── `creations` NO TIENE PLURAL, PORQUE EL COREANO NO LO TIENE ──────────────
 *
 * `Intl.PluralRules('ko')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO —«창작물
 * {{contador}}개»— y funcionan igual con 0, con 1 y con 100. El contador 개 es
 * el que toca para cosas.
 *
 * `introText` cita el botón de `weeai.saveToProject` y no puede decir
 * «"{{accion}}"으로», porque (으)로 cambia con la última letra de lo que traiga
 * el hueco: entre medias va la palabra fija 버튼.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: '진행 중인 작업',
  introText: 'Weë AI로 만들고 있는 것이 여기에 남아 언제든 이어서 할 수 있어요. 각 결과는 “{{accion}}”에서 프로젝트에 저장하고, 완성해서 남기기로 한 것은 내 창작물로 가요.',
  sectionTitle: '프로젝트',
  emojiLabel: '이모지 {{emoji}}',
  namePlaceholder: '예: 내 레스토랑',
  emptyTitle: '아직 프로젝트가 없어요',
  emptyAction: '내 첫 프로젝트 만들기',
  open: '열기',
  fallbackTitle: '프로젝트',
  notFound: '이 프로젝트를 찾을 수 없어요.',
  saveName: '이름 저장',
  rename: '이름 변경',
  deleteProject: '프로젝트 삭제',
  deleteConfirmWeb: '"{{nombre}}" 프로젝트를 삭제할까요? 창작물은 그대로 남아요.',
  deleteConfirm: '"{{nombre}}" 삭제할까요? 창작물은 그대로 남아요.',
  creations_one: '창작물 {{contador}}개',
  creations_other: '창작물 {{contador}}개',
  creationsTitle: '창작물',
  add: '추가',
  noCreations: '아직 여기에 창작물이 없어요. 어떤 전문가로든 무언가 만들어서 이 프로젝트에 담아 보세요.',
  whatIsMissing: '이 프로젝트에 무엇이 더 필요할까요?',
  whatIsMissingNote: '로고, 사진, 광고, 영상, 음악, 문서 — Weë의 어떤 전문가든 여기에 보탤 수 있어요.',
  createSomethingNew: '새로 만들기',

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: '프로젝트를 불러오는 중…',
  loadFailed: '프로젝트를 불러오지 못했어요.',
  retry: '다시 시도',
  emptyText: '첫 프로젝트를 만들거나, 창작물의 결과 화면에서 프로젝트에 담아 보세요.',
  emptyStart: '프로젝트는 언제든 이어서 할 수 있는 진행 중인 작업이에요.',
  stateInProgress: '진행 중',
  updatedAgo: '수정됨: {{cuando}}',
  continue: '이어서 하기',
  continueProject: '{{nombre}} 이어서 하기',
  noThumbnail: '미리보기 없음',
  loadProjectFailed: '이 프로젝트를 열지 못했어요.',
  jobsLoadFailed: '이 프로젝트의 내용을 불러오지 못했어요.',
};
