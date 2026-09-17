/*
 * RUSO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las siete funciones que ya existían siguen en `weeai.chefAc…`.
 *
 * `panelStart` y `goalWith` son PLANTILLAS: los huecos no se tocan, ni se
 * renombran, ni se traducen, y `panelStart` termina en espacio a propósito
 * porque la persona sigue escribiendo justo ahí.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Рецепты, меню и ингредиенты.\nИз того, что уже есть дома.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Напишите идею, ингредиенты или добавьте фото',
  addLabel: 'Добавить фото',
  cameraLabel: 'Сделать фото',
  galleryLabel: 'Выбрать фото из галереи',
  photoReady: 'Фото добавлено',
  settingsLabel: 'Настройки рецепта',
  voiceLabel: 'Продиктовать',
  sendLabel: 'Готовить',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Что хотите сделать?',
  nutritionTitle: 'Пищевая ценность',
  nutritionSubtitle: 'Калории, макросы и аллергены',
  swapTitle: 'Заменить ингредиенты',
  swapSubtitle: 'Замените то, чего нет или что нельзя',
  shoppingTitle: 'Список покупок',
  shoppingSubtitle: 'Что нужно купить',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Выберите, с чего начать, и закончите фразу своими словами.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Пищевая ценность */
  nuCalories: 'Калории',
  nuProtein: 'Белки',
  nuFat: 'Жиры',
  nuCarbs: 'Углеводы',
  nuSugar: 'Сахар',
  nuSodium: 'Натрий',
  nuAllergens: 'Аллергены',
  nuPortion: 'На порцию',
  nuAll: 'Всё',

  /* Заменить ингредиенты */
  swMissing: 'Нет одного ингредиента',
  swLactose: 'Без лактозы',
  swGluten: 'Без глютена',
  swEgg: 'Без яиц',
  swNuts: 'Без орехов',
  swVegetarian: 'Вегетарианское',
  swVegan: 'Веганское',
  swSugar: 'Без сахара',
  swCheaper: 'Дешевле',
  swPantry: 'Из того, что есть',

  /* Список покупок */
  shRecipe: 'По рецепту',
  shMenu: 'По меню',
  shWeek: 'На неделю',
  shOccasion: 'Для особого случая',
  shPantry: 'Базовые продукты',
  shAisles: 'По отделам магазина',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Что нужно знать, чтобы это приготовить',
  optPeople: 'Сколько человек',
  optTime: 'Время',
  optDiet: 'Диета',
  optLevel: 'Сложность',
  valAnyone: 'Сколько угодно',
  valOne: 'Для себя',
  valTwo: 'На двоих',
  valFamily: 'Для семьи',
  valMany: 'Для большой компании',
  valAnyTime: 'Сколько понадобится',
  valQuick: '15 минут',
  valHalfHour: 'Полчаса',
  valLong: 'Час или больше',
  valNoDiet: 'Без ограничений',
  valVegetarian: 'Вегетарианская',
  valVegan: 'Веганская',
  valGlutenFree: 'Без глютена',
  valLactoseFree: 'Без лактозы',
  valSugarFree: 'Без сахара',
  valAnyLevel: 'Любая',
  valEasy: 'Простая',
  valMedium: 'Средняя',
  valPro: 'Как у шефа',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Мои проекты',
  seeAll: 'Смотреть все',
  projectsEmpty: 'Вы ещё ничего не готовили с Weë.',
  projectsEmptyHint: 'Всё, что вы создадите здесь, сохранится и снова появится в этом ряду.',
};
