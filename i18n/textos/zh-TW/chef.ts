/*
 * CHINO TRADICIONAL (TAIWÁN) — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Weë Chef" es marca y no está aquí; nunca 廚師. Lo que Chef comparte con Weë
 * Studio —"Ver todos", "Ajustes", "Listo"— vive en `studio`, y las siete
 * funciones que ya existían siguen en `weeai.chefAc…`.
 *
 * `panelStart` y `goalWith` son PLANTILLAS: los huecos, los separadores, los
 * paréntesis y el espacio final se copian TAL CUAL —sin pasarlos a ancho
 * completo—, porque lo que queda escrito en la caja es una frase empezada que
 * termina la persona.
 *
 * VOCABULARIO DE TAIWÁN, no conversión de trazos: la receta es 食譜, cocinar es
 * 料理, «añadir» es 新增, la galería es 相簿, los ajustes son 設定, un proyecto
 * es 專案, guardar es 儲存 y la información es 資訊. El único 菜單 que hay aquí
 * es el de la comida —la carta, el menú de la semana—, que en Taiwán se llama
 * así; el 選單 de la interfaz es otra palabra y no aparece en esta pantalla.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: '食譜、菜單和食材。\n用你家裡已經有的東西。',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '寫下你的想法、手邊的食材，或上傳一張照片',
  addLabel: '新增照片',
  cameraLabel: '拍照',
  galleryLabel: '從相簿選擇照片',
  photoReady: '照片已新增',
  settingsLabel: '食譜設定',
  voiceLabel: '語音輸入',
  sendLabel: '開始料理',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: '你想做什麼？',
  nutritionTitle: '營養資訊',
  nutritionSubtitle: '熱量、營養素和過敏原',
  swapTitle: '替換食材',
  swapSubtitle: '把沒有的、不能吃的換掉',
  shoppingTitle: '購物清單',
  shoppingSubtitle: '需要買的東西',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: '選一個起點，再用自己的話把這句話寫完。',
  panelStart: '{{panel}} · {{que}}: ',

  /* 營養資訊 */
  nuCalories: '熱量',
  nuProtein: '蛋白質',
  nuFat: '脂肪',
  nuCarbs: '碳水化合物',
  nuSugar: '糖',
  nuSodium: '鈉',
  nuAllergens: '過敏原',
  nuPortion: '每份',
  nuAll: '全部',

  /* 替換食材 */
  swMissing: '少了一種食材',
  swLactose: '不含乳糖',
  swGluten: '不含麩質',
  swEgg: '不含蛋',
  swNuts: '不含堅果',
  swVegetarian: '素食',
  swVegan: '純素',
  swSugar: '不加糖',
  swCheaper: '更省錢',
  swPantry: '用手邊的食材',

  /* 購物清單 */
  shRecipe: '來自一份食譜',
  shMenu: '來自一份菜單',
  shWeek: '這一週的',
  shOccasion: '為某個場合',
  shPantry: '廚房常備',
  shAisles: '依賣場分區排序',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: '開始料理前需要知道的',
  optPeople: '人數',
  optTime: '時間',
  optDiet: '飲食',
  optLevel: '難度',
  valAnyone: '多少都行',
  valOne: '就我一個',
  valTwo: '兩個人',
  valFamily: '一家人',
  valMany: '一大桌',
  valAnyTime: '多久都行',
  valQuick: '15 分鐘',
  valHalfHour: '半小時',
  valLong: '一小時以上',
  valNoDiet: '沒有限制',
  valVegetarian: '素食',
  valVegan: '純素',
  valGlutenFree: '無麩質',
  valLactoseFree: '無乳糖',
  valSugarFree: '無糖',
  valAnyLevel: '都可以',
  valEasy: '簡單',
  valMedium: '中等',
  valPro: '大廚級',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: '我的專案',
  seeAll: '查看全部',
  projectsEmpty: '你還沒有用 Weë 做過菜。',
  projectsEmptyHint: '在這裡做出來的東西都會儲存下來，隨時能在這一排找回來。',
};
