/*
 * WEË CHEF — el sitio donde se cocina.
 *
 * Serbio (ekaviano, cirílico). Mismas claves que el español. "Weë Chef" es
 * marca y no entra; lo compartido con Weë Studio se lee de `studio` y las siete
 * funciones que ya existían siguen en `weeai`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Рецепти, менији и састојци.\nОд онога што већ имаш код куће.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /* La caja va VACÍA: esto es el nombre del campo para quien lo escucha en vez de verlo. */
  placeholder: 'Напиши своју идеју, своје састојке или искористи фотографију',
  addLabel: 'Додај фотографију',
  cameraLabel: 'Сними фотографију',
  galleryLabel: 'Изабери фотографију из галерије',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Фотографија је додата',
  settingsLabel: 'Подешавања рецепта',
  voiceLabel: 'Диктирај',
  sendLabel: 'Кувај',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Шта желиш да урадиш?',
  /* Las cinco primeras y la última viven en `weeai`. Las tres nuevas son estas. */
  nutritionTitle: 'Нутритивне информације',
  nutritionSubtitle: 'Калорије, макронутријенти и алергени',
  swapTitle: 'Замени састојке',
  swapSubtitle: 'Замени оно што немаш или не смеш',
  shoppingTitle: 'Списак за куповину',
  shoppingSubtitle: 'Шта треба купити',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Изабери одакле да почнеш и доврши реченицу својим речима.',
  /* Frase empezada que la persona termina; desde ahí sigue el camino de siempre. */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Калорије',
  nuProtein: 'Протеини',
  nuFat: 'Масти',
  nuCarbs: 'Угљени хидрати',
  nuSugar: 'Шећер',
  nuSodium: 'Натријум',
  nuAllergens: 'Алергени',
  nuPortion: 'По порцији',
  nuAll: 'Све',

  /* Sustituir ingredientes */
  swMissing: 'Немам један састојак',
  swLactose: 'Без лактозе',
  swGluten: 'Без глутена',
  swEgg: 'Без јаја',
  swNuts: 'Без орашастих плодова',
  swVegetarian: 'Вегетаријански',
  swVegan: 'Вегански',
  swSugar: 'Без шећера',
  swCheaper: 'Јефтиније',
  swPantry: 'Од онога што имам',

  /* Lista de compras */
  shRecipe: 'По рецепту',
  shMenu: 'По менију',
  shWeek: 'За целу недељу',
  shOccasion: 'За посебну прилику',
  shPantry: 'Основне намирнице',
  shAisles: 'Поређано по одељењима',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Шта треба да знамо да бисмо то скували',
  optPeople: 'Особе',
  optTime: 'Време',
  optDiet: 'Исхрана',
  optLevel: 'Захтевност',
  valAnyone: 'Било колико',
  valOne: 'За мене',
  valTwo: 'За двоје',
  valFamily: 'За породицу',
  valMany: 'За много људи',
  valAnyTime: 'Колико треба',
  valQuick: '15 минута',
  valHalfHour: 'Пола сата',
  valLong: 'Сат или више',
  valNoDiet: 'Без ограничења',
  valVegetarian: 'Вегетаријанска',
  valVegan: 'Веганска',
  valGlutenFree: 'Без глутена',
  valLactoseFree: 'Без лактозе',
  valSugarFree: 'Без шећера',
  valAnyLevel: 'Било која',
  valEasy: 'Лака',
  valMedium: 'Средња',
  valPro: 'За шефове кухиње',
  /* Lo elegido viaja con la idea, a la vista: "Пилетина из рерне (За двоје · Пола сата)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Моји пројекти',
  /* Aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Прикажи све',
  projectsEmpty: 'Уз Weë још ништа није скувано.',
  projectsEmptyHint: 'Оно што овде креираш чува се и поново га налазиш у овом реду.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Реци ми шта желиш да куваш…',
  heroLead: 'Твој AI кувар,',
  heroAccent: 'увек уз тебе',
  chipRecipes: 'Рецепти',
  chipMenus: 'Менији',
  chipHealthy: 'Здраво',
  chipQuick: 'Брзо',
};
