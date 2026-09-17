/*
 * CHINO TRADICIONAL (TAIWÁN) — la pantalla donde se buscan, se crean y se dejan
 * las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── EN TAIWÁN UNA COMUNIDAD ES UN 社群, NUNCA UN 社區 ──────────────────────
 *
 * 社區 es el barrio, el bloque de pisos donde vives; el grupo de gente que
 * comparte un interés en internet es 社群, y esa es la palabra que usa este
 * módulo entero. Igual pasa con lo demás: 搜尋 (no 搜索), 建立 (no 創建), 載入
 * (no 加載) y 貼文 —que es como Taiwán llama a una publicación, donde el
 * continente dice 動態—.
 *
 * LO QUE NO ENTRA AQUÍ: el nombre de una comunidad y su descripción, que los
 * escribe una persona y se pintan tal cual. Cuando una frase de Weë los nombra,
 * entran por hueco —`{{nombre}}`— y salen sin tocar. Como por ese hueco puede
 * pasar tanto hanzi como alfabeto latino, el nombre va entre comillas 「」, las
 * de Taiwán —no las “” del continente—, que separan solas y no obligan a
 * elegir espacio.
 *
 * ── `members` NO TIENE PLURAL, PORQUE EL CHINO NO LO TIENE ──────────────────
 *
 * `Intl.PluralRules('zh')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO —«{{contador}}
 * 位成員»— con 位, el clasificador de personas, que vale para 0, 1 y 1.000.
 */
export const communities: typeof import('../es/communities').communities = {
  create: '建立社群',
  searchPlaceholder: '搜尋社群…',
  loading: '正在載入社群…',

  joinedSection: '已加入的社群',
  discoverSection: '發現社群',

  official: '官方',
  members_one: '{{contador}} 位成員',
  members_other: '{{contador}} 位成員',
  memberOf: '已加入',
  join: '加入',

  leaveTitle: '退出社群',
  leaveConfirm: '確定要退出「{{nombre}}」嗎？',
  leave: '退出',
  leaveFailed: '退出社群失敗',
  actionFailed: '無法完成這項操作',

  newCommunity: '新增社群',
  name: '名稱',
  namePlaceholder: '例：咖啡愛好者',
  description: '簡介',
  descriptionPlaceholder: '這個社群是關於什麼的？',
  createFailed: '建立社群失敗',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: '{{nombre}} 社群',
  empty: '目前沒有可加入的社群',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: '找到屬於你的社群。',
  searchLabel: '搜尋社群',
  members: '成員',
  posts: '貼文',
  rules: '社群規則',
  one: '社群',
  loadFailed: '社群載入失敗',
  noPosts: '還沒有貼文',
  beTheFirst: '成為第一個在這個社群發文的人',
  createPost: '發布貼文',
  understoodJoin: '我知道了，加入',
};
