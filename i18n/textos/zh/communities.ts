/*
 * CHINO SIMPLIFICADO — la pantalla donde se buscan, se crean y se dejan las
 * comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * LO QUE NO ENTRA AQUÍ: el nombre de una comunidad y su descripción, que los
 * escribe una persona y se pintan tal cual. Cuando una frase de Weë los nombra,
 * entran por hueco —`{{nombre}}`— y salen sin tocar. Como por ese hueco puede
 * pasar tanto hanzi como alfabeto latino, el nombre va entre comillas de ancho
 * completo «“{{nombre}}”», que separan solas y no obligan a elegir espacio.
 *
 * ── `members` NO TIENE PLURAL, PORQUE EL CHINO NO LO TIENE ──────────────────
 *
 * `Intl.PluralRules('zh')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO —«{{contador}}
 * 位成员»— con 位, el clasificador de personas, que vale para 0, 1 y 1.000.
 */
export const communities: typeof import('../es/communities').communities = {
  create: '创建社区',
  searchPlaceholder: '搜索社区…',
  loading: '正在加载社区…',

  joinedSection: '已加入的社区',
  discoverSection: '发现社区',

  official: '官方',
  members_one: '{{contador}} 位成员',
  members_other: '{{contador}} 位成员',
  memberOf: '已加入',
  join: '加入',

  leaveTitle: '退出社区',
  leaveConfirm: '确定要退出“{{nombre}}”吗？',
  leave: '退出',
  leaveFailed: '退出社区失败',
  actionFailed: '操作没能完成',

  newCommunity: '新建社区',
  name: '名称',
  namePlaceholder: '例：咖啡爱好者',
  description: '简介',
  descriptionPlaceholder: '这个社区是关于什么的？',
  createFailed: '创建社区失败',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: '{{nombre}} 社区',
  empty: '暂时没有可加入的社区',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: '找到属于你的社区。',
  searchLabel: '搜索社区',
  members: '成员',
  posts: '动态',
  rules: '社区规则',
  one: '社区',
  loadFailed: '社区加载失败',
  noPosts: '还没有动态',
  beTheFirst: '成为第一个在这个社区发动态的人',
  createPost: '发布动态',
  understoodJoin: '我知道了，加入',
  memberCount_one: '{{cantidad}} 位成员',
  memberCount_other: '{{cantidad}} 位成员',
  postCount_one: '{{contador}} 条动态',
  postCount_other: '{{contador}} 条动态',
};
