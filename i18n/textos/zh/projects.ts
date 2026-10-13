/*
 * CHINO SIMPLIFICADO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * QUÉ NO ENTRA AQUÍ: el nombre de un proyecto, que lo escribe la persona y se
 * guarda tal cual, ni la meta de una creación, que también es suya. Cuando uno
 * de esos valores va dentro de una frase, entra por interpolación y nunca
 * pegando cadenas; va entre comillas de ancho completo, que separan solas
 * tanto si lo que llega es hanzi como si es alfabeto latino.
 *
 * ── `creations` NO TIENE PLURAL, PORQUE EL CHINO NO LO TIENE ────────────────
 *
 * `Intl.PluralRules('zh')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO —«{{contador}}
 * 个作品»— y funcionan igual con 0, con 1 y con 100.
 *
 * `introText` cita el botón de `weeai.saveToProject` («保存到项目»): si allí
 * cambia la palabra, aquí cambia también.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: '进行中的工作',
  introText: '你用 Weë AI 正在做的内容会留在这里，随时可以继续。通过“{{accion}}”把每个结果保存到对应项目；完成并决定保留的内容会进入我的作品。',
  sectionTitle: '项目',
  emojiLabel: '表情 {{emoji}}',
  namePlaceholder: '例：我的餐厅',
  emptyTitle: '你还没有项目',
  emptyAction: '创建我的第一个项目',
  open: '打开',
  fallbackTitle: '项目',
  notFound: '没有找到这个项目。',
  saveName: '保存名称',
  rename: '重命名',
  deleteProject: '删除项目',
  deleteConfirmWeb: '要删除项目“{{nombre}}”吗？你的作品不会被删除。',
  deleteConfirm: '要删除“{{nombre}}”吗？你的作品不会被删除。',
  creations_one: '{{contador}} 个作品',
  creations_other: '{{contador}} 个作品',
  creationsTitle: '作品',
  add: '添加',
  noCreations: '这里还没有作品。找任意一位专家做点东西，然后保存到这个项目里。',
  whatIsMissing: '这个项目还缺点什么？',
  whatIsMissingNote: 'logo、照片、广告、视频、音乐或文档：Weë 的每一位专家都能往这里添点东西。',
  createSomethingNew: '创建新东西',

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: '正在加载你的项目…',
  loadFailed: '无法加载你的项目。',
  retry: '重试',
  emptyText: '创建第一个项目，或者在作品的结果上把它保存进一个项目。',
  emptyStart: '项目是可以随时继续的进行中工作。',
  stateInProgress: '进行中',
  updatedAgo: '修改于{{cuando}}',
  continue: '继续',
  continueProject: '继续：{{nombre}}',
  noThumbnail: '无预览',
  loadProjectFailed: '无法打开此项目。',
  jobsLoadFailed: '无法加载此项目的内容。',
};
