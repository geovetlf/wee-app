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
  officialNameFilmAnimation: '电影与动画',
  officialNameArtCreativity: '艺术与创意',
  officialNameCreatorsInfluencers: '创作者与网红',
  officialNameBusinessEntrepreneurship: '商业与创业',
  officialNameTechAi: '科技与 AI',
  officialNameGamingVirtualWorlds: '游戏与虚拟世界',
  officialNameEducationLearning: '教育与学习',
  officialNameFutureSociety: '未来与社会',
  officialRuleShare: '分享你用 AI 创作的作品，并说说你是怎么做的',
  officialRuleRespect: '提问和回答都要互相尊重',
  officialRuleNoSpam: '禁止发布垃圾信息或不属于你的内容',
  popularDescFilmmakers: '用 AI 拍电影、做视频的人。展示你的创作过程，也向别人学习。',
  popularDescInfluencers: '用 AI 产出内容的网红和创作者。',
  popularDescDesigners: '用 AI 工作的设计师：品牌设计、插画、数字艺术。',
  popularDescWriters: '用 AI 创作的写作者：书籍、剧本、文章和诗歌。',
  popularDescMusicians: '用 AI 做音乐和音频的人。',
  popularDescDevelopers: '用 AI 做开发的程序员。',
  popularDescEntrepreneurs: '在生意中用上 AI 的创业者。',
  popularDescGamers: 'AI 与电子游戏：角色、世界和体验。',
};
