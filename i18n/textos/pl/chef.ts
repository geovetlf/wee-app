/*
 * WEË CHEF — el sitio donde se cocina.
 *
 * Traducción al polaco, tipada contra el molde español. Los valores de dieta y
 * de dificultad concuerdan en femenino con «dieta» y «trudność».
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Chef", que es marca. Tampoco lo que Chef comparte con
 * Weë Studio y significa exactamente lo mismo —"Ver todos", "Ajustes",
 * "Listo"—: eso vive en `studio` y se lee de allí, para que dos pantallas de la
 * misma familia no puedan acabar diciendo cosas distintas. Y tampoco las siete
 * funciones que ya existían (`weeai.chefAc…`), que siguen donde estaban porque
 * son las mismas que abren la conversación guiada.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Przepisy, menu i składniki.\nZ tego, co już masz w domu.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Wpisz swój pomysł, składniki albo użyj zdjęcia',
  addLabel: 'Dodaj zdjęcie',
  cameraLabel: 'Zrób zdjęcie',
  galleryLabel: 'Wybierz zdjęcie z galerii',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Zdjęcie dodane',
  settingsLabel: 'Ustawienia przepisu',
  voiceLabel: 'Dyktuj',
  sendLabel: 'Gotuj',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Co chcesz zrobić?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Wartości odżywcze',
  nutritionSubtitle: 'Kalorie, makroskładniki i alergeny',
  swapTitle: 'Zamień składniki',
  swapSubtitle: 'Zmień to, czego nie masz lub nie możesz jeść',
  shoppingTitle: 'Lista zakupów',
  shoppingSubtitle: 'To, co trzeba kupić',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Wybierz, od czego zacząć, i dokończ zdanie własnymi słowami.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"kurczak z piekarnika"— y desde ahí sigue el
   * camino de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalorie',
  nuProtein: 'Białko',
  nuFat: 'Tłuszcze',
  nuCarbs: 'Węglowodany',
  nuSugar: 'Cukier',
  nuSodium: 'Sód',
  nuAllergens: 'Alergeny',
  nuPortion: 'Na porcję',
  nuAll: 'Wszystko',

  /* Sustituir ingredientes */
  swMissing: 'Brakuje mi składnika',
  swLactose: 'Bez laktozy',
  swGluten: 'Bez glutenu',
  swEgg: 'Bez jajek',
  swNuts: 'Bez orzechów',
  swVegetarian: 'Wegetariańskie',
  swVegan: 'Wegańskie',
  swSugar: 'Bez cukru',
  swCheaper: 'Taniej',
  swPantry: 'Z tego, co mam',

  /* Lista de compras */
  shRecipe: 'Z przepisu',
  shMenu: 'Z menu',
  shWeek: 'Na tydzień',
  shOccasion: 'Na okazję',
  shPantry: 'Podstawy do spiżarni',
  shAisles: 'Według alejek',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'To, co trzeba wiedzieć, żeby to ugotować',
  optPeople: 'Osoby',
  optTime: 'Czas',
  optDiet: 'Dieta',
  optLevel: 'Trudność',
  valAnyone: 'Dowolna liczba',
  valOne: 'Dla mnie',
  valTwo: 'Dla dwojga',
  valFamily: 'Dla rodziny',
  valMany: 'Dla wielu osób',
  valAnyTime: 'Ile trzeba',
  valQuick: '15 minut',
  valHalfHour: 'Pół godziny',
  valLong: 'Godzina lub dłużej',
  valNoDiet: 'Bez ograniczeń',
  valVegetarian: 'Wegetariańska',
  valVegan: 'Wegańska',
  valGlutenFree: 'Bezglutenowa',
  valLactoseFree: 'Bez laktozy',
  valSugarFree: 'Bez cukru',
  valAnyLevel: 'Dowolna',
  valEasy: 'Łatwa',
  valMedium: 'Średnia',
  valPro: 'Jak u szefa kuchni',
  /* Lo elegido viaja con la idea, a la vista: "Kurczak z piekarnika (Dla dwojga · Pół godziny)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Moje projekty',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Pokaż wszystkie',
  projectsEmpty: 'Jeszcze nic nie ugotowano z Weë.',
  projectsEmptyHint: 'To, co tu stworzysz, zapisze się, a potem znajdziesz to w tym rzędzie.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Powiedz, co chcesz ugotować…',
  heroLead: 'Twój szef kuchni z AI,',
  heroAccent: 'zawsze przy tobie',
  chipRecipes: 'Przepisy',
  chipMenus: 'Menu',
  chipHealthy: 'Zdrowo',
  chipQuick: 'Ekspresowo',
};
