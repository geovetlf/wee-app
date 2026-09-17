/*
 * CHINO SIMPLIFICADO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Weë Chef" es marca y no está aquí; nunca 厨师. Lo que Chef comparte con Weë
 * Studio —"Ver todos", "Ajustes", "Listo"— vive en `studio`, y las siete
 * funciones que ya existían siguen en `weeai.chefAc…`.
 *
 * `panelStart` y `goalWith` son PLANTILLAS: los huecos, los separadores, los
 * paréntesis y el espacio final se copian TAL CUAL —sin pasarlos a ancho
 * completo—, porque lo que queda escrito en la caja es una frase empezada que
 * termina la persona.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: '菜谱、菜单和食材。\n用你家里已经有的东西。',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '写下你的想法、手边的食材，或者上传一张照片',
  addLabel: '添加照片',
  cameraLabel: '拍照',
  galleryLabel: '从相册选择照片',
  photoReady: '照片已添加',
  settingsLabel: '菜谱设置',
  voiceLabel: '语音输入',
  sendLabel: '开始烹饪',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: '你想做什么？',
  nutritionTitle: '营养信息',
  nutritionSubtitle: '热量、营养素和过敏原',
  swapTitle: '替换食材',
  swapSubtitle: '把没有的、不能吃的换掉',
  shoppingTitle: '购物清单',
  shoppingSubtitle: '需要买的东西',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: '选一个起点，再用自己的话把这句话写完。',
  panelStart: '{{panel}} · {{que}}: ',

  /* 营养信息 */
  nuCalories: '热量',
  nuProtein: '蛋白质',
  nuFat: '脂肪',
  nuCarbs: '碳水化合物',
  nuSugar: '糖',
  nuSodium: '钠',
  nuAllergens: '过敏原',
  nuPortion: '每份',
  nuAll: '全部',

  /* 替换食材 */
  swMissing: '少了一种食材',
  swLactose: '不含乳糖',
  swGluten: '不含麸质',
  swEgg: '不含鸡蛋',
  swNuts: '不含坚果',
  swVegetarian: '素食',
  swVegan: '纯素',
  swSugar: '不加糖',
  swCheaper: '更省钱',
  swPantry: '用手边的食材',

  /* 购物清单 */
  shRecipe: '来自一份菜谱',
  shMenu: '来自一份菜单',
  shWeek: '这一周的',
  shOccasion: '为某个场合',
  shPantry: '厨房常备',
  shAisles: '按超市区域排序',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: '开始烹饪前需要知道的',
  optPeople: '人数',
  optTime: '时间',
  optDiet: '饮食',
  optLevel: '难度',
  valAnyone: '多少都行',
  valOne: '就我一个',
  valTwo: '两个人',
  valFamily: '一家人',
  valMany: '一大桌',
  valAnyTime: '多久都行',
  valQuick: '15 分钟',
  valHalfHour: '半小时',
  valLong: '一小时以上',
  valNoDiet: '没有限制',
  valVegetarian: '素食',
  valVegan: '纯素',
  valGlutenFree: '无麸质',
  valLactoseFree: '无乳糖',
  valSugarFree: '无糖',
  valAnyLevel: '都可以',
  valEasy: '简单',
  valMedium: '中等',
  valPro: '大厨级',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: '我的项目',
  seeAll: '查看全部',
  projectsEmpty: '你还没有用 Weë 做过菜。',
  projectsEmptyHint: '在这里创作的内容都会保存下来，随时能在这一行找回。',
};
