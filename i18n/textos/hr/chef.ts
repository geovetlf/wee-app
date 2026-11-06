/*
 * WEË CHEF en croata — el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»), imperativo de segunda persona. Los valores de los ajustes
 * concuerdan con su ajuste: «prehrana» y «težina» son femeninos (Vegetarijanska,
 * Laka, Majstorska). «Todavía no has cocinado nada» va en forma impersonal
 * («Još ništa nije skuhano») para no fijar el género. «Weë» es marca y va en
 * latino tal cual.
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
  description: 'Recepti, jelovnici i sastojci.\nS onime što već imaš kod kuće.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Napiši svoju ideju, sastojke ili upotrijebi fotografiju',
  addLabel: 'Dodaj fotografiju',
  cameraLabel: 'Snimi fotografiju',
  galleryLabel: 'Odaberi fotografiju iz galerije',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Fotografija dodana',
  settingsLabel: 'Postavke recepta',
  voiceLabel: 'Diktiraj',
  sendLabel: 'Kuhaj',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Što želiš napraviti?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Nutritivne informacije',
  nutritionSubtitle: 'Kalorije, makronutrijenti i alergeni',
  swapTitle: 'Zamijeni sastojke',
  swapSubtitle: 'Promijeni ono što nemaš ili ne smiješ',
  shoppingTitle: 'Popis za kupnju',
  shoppingSubtitle: 'Ono što treba kupiti',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Odaberi odakle početi i dovrši rečenicu svojim riječima.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"pollo al horno"— y desde ahí sigue el camino
   * de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalorije',
  nuProtein: 'Bjelančevine',
  nuFat: 'Masti',
  nuCarbs: 'Ugljikohidrati',
  nuSugar: 'Šećer',
  nuSodium: 'Natrij',
  nuAllergens: 'Alergeni',
  nuPortion: 'Po porciji',
  nuAll: 'Sve',

  /* Sustituir ingredientes */
  swMissing: 'Nemam neki sastojak',
  swLactose: 'Bez laktoze',
  swGluten: 'Bez glutena',
  swEgg: 'Bez jaja',
  swNuts: 'Bez orašastih plodova',
  swVegetarian: 'Vegetarijansko',
  swVegan: 'Vegansko',
  swSugar: 'Bez šećera',
  swCheaper: 'Jeftinije',
  swPantry: 'S onime što imam',

  /* Lista de compras */
  shRecipe: 'Iz recepta',
  shMenu: 'Iz jelovnika',
  shWeek: 'Za tjedan',
  shOccasion: 'Za prigodu',
  shPantry: 'Osnovne namirnice',
  shAisles: 'Složeno po odjelima',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Što treba znati da bi se to skuhalo',
  optPeople: 'Osobe',
  optTime: 'Vrijeme',
  optDiet: 'Prehrana',
  optLevel: 'Težina',
  valAnyone: 'Koliko god',
  valOne: 'Za mene',
  valTwo: 'Za dvoje',
  valFamily: 'Za obitelj',
  valMany: 'Za mnogo ljudi',
  valAnyTime: 'Koliko god treba',
  valQuick: '15 minuta',
  valHalfHour: 'Pola sata',
  valLong: 'Sat ili više',
  valNoDiet: 'Bez ograničenja',
  valVegetarian: 'Vegetarijanska',
  valVegan: 'Veganska',
  valGlutenFree: 'Bez glutena',
  valLactoseFree: 'Bez laktoze',
  valSugarFree: 'Bez šećera',
  valAnyLevel: 'Bilo koja',
  valEasy: 'Laka',
  valMedium: 'Srednja',
  valPro: 'Majstorska',
  /* Lo elegido viaja con la idea, a la vista: "Pollo al horno (Para dos · Media hora)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Moji projekti',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Prikaži sve',
  projectsEmpty: 'Još ništa nije skuhano uz Weë.',
  projectsEmptyHint: 'Ono što ovdje stvoriš sprema se i ponovno ga pronalaziš u ovom redu.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Reci mi što želiš kuhati…',
  heroLead: 'Tvoj AI kuhar,',
  heroAccent: 'uvijek uz tebe',
  chipRecipes: 'Recepti',
  chipMenus: 'Jelovnici',
  chipHealthy: 'Zdravo',
  chipQuick: 'Brzo',
};
