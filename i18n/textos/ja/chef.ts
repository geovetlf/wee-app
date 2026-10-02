/*
 * JAPONÉS — Weë Chef: la caja, las ocho funciones con sus paneles, los ajustes de la receta y Mis proyectos.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los valores de los ajustes se leen también SOLOS, como fichas debajo de la caja, y dentro de goalWith
 * (「肉じゃが（2人分、30分、かんたん）」): por eso dicen qué son (1人分, 30分) sin depender del título del grupo.
 * Las opciones «da igual» del español, distintas en cada grupo, siguen distintas: 何人でも, 時間は気にしない,
 * こだわらない. panelStart deja la frase empezada en la caja y la persona la termina: 「栄養成分 · カロリー：」,
 * con el « · » de Weë y sus espacios y dos puntos de ancho completo SIN el espacio final del español: el ：
 * ya trae su aire, y en japonés lo que se escribe detrás va pegado (「…：肉じゃが」), no tras un espacio.
 * «Sin X» es 「Xなし」, salvo グルテンフリー, que es como se dice; «menú» es 献立; la dificultad sigue a las apps
 * de recetas (かんたん・ふつう). «Galería» es 写真ライブラリ (glosario 10.7), como en weeai.
 */
export const chef: typeof import('../es/chef').chef = {
  description: 'レシピも献立も、食材のことも。\n家にあるもので作れます。',

  placeholder: 'アイデアや食材を入力、または写真を使用',
  addLabel: '写真を追加',
  cameraLabel: '写真を撮る',
  galleryLabel: '写真ライブラリから選択',
  photoReady: '写真を追加済み',
  settingsLabel: 'レシピの設定',
  voiceLabel: '音声入力',
  sendLabel: '作る',

  gridTitle: '何をしますか？',
  nutritionTitle: '栄養成分',
  nutritionSubtitle: 'カロリー、栄養素、アレルゲン',
  swapTitle: '食材の置き換え',
  swapSubtitle: 'ないものや食べられないものを別の食材に',
  shoppingTitle: '買い物リスト',
  shoppingSubtitle: '買い足すもの',

  panelHint: '始め方を選んで、続きは自分の言葉で書いてください。',
  panelStart: '{{panel}} · {{que}}：',

  nuCalories: 'カロリー',
  nuProtein: 'たんぱく質',
  nuFat: '脂質',
  nuCarbs: '炭水化物',
  nuSugar: '糖分',
  nuSodium: '塩分',
  nuAllergens: 'アレルゲン',
  nuPortion: '1食あたり',
  nuAll: 'すべて',

  swMissing: '足りない食材がある',
  swLactose: '乳糖なし',
  swGluten: 'グルテンフリー',
  swEgg: '卵なし',
  swNuts: 'ナッツなし',
  swVegetarian: 'ベジタリアン',
  swVegan: 'ヴィーガン',
  swSugar: '砂糖なし',
  swCheaper: 'もっと安く',
  swPantry: '家にあるもので',

  shRecipe: 'レシピから',
  shMenu: '献立から',
  shWeek: '1週間分',
  shOccasion: '特別な日に',
  shPantry: '基本の常備食材',
  shAisles: '売り場ごとに整理',

  settingsHint: '作るのに必要な情報',
  optPeople: '人数',
  optTime: '調理時間',
  optDiet: '食事制限',
  optLevel: '難易度',
  valAnyone: '何人でも',
  valOne: '1人分',
  valTwo: '2人分',
  valFamily: '家族分',
  valMany: '大人数分',
  valAnyTime: '時間は気にしない',
  valQuick: '15分',
  valHalfHour: '30分',
  valLong: '1時間以上',
  valNoDiet: '制限なし',
  valVegetarian: 'ベジタリアン',
  valVegan: 'ヴィーガン',
  valGlutenFree: 'グルテンフリー',
  valLactoseFree: '乳糖なし',
  valSugarFree: '砂糖なし',
  valAnyLevel: 'こだわらない',
  valEasy: 'かんたん',
  valMedium: 'ふつう',
  valPro: 'プロ級',
  goalWith: '{{idea}}（{{ajustes}}）',

  projectsTitle: 'マイプロジェクト',
  seeAll: 'すべて表示',
  projectsEmpty: 'Weëで作った料理はまだありません。',
  projectsEmptyHint: 'ここで作ったものは保存され、この一覧からまた開けます。',
};
