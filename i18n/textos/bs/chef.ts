/*
 * WEË CHEF — el sitio donde se cocina, en bosnio (bs-BA, ijekaviano, latino).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). "Weë Chef" es marca y no se traduce. Lo que Chef comparte con
 * Weë Studio vive en `studio` y se lee de allí; las siete funciones que ya
 * existían siguen en `weeai`. Los valores de los ajustes concuerdan con su
 * etiqueta: «Ishrana» (f.), «Težina» (f.).
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Recepti, meniji i sastojci.\nOd onoga što već imaš kod kuće.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Napiši svoju ideju, sastojke ili koristi fotografiju',
  addLabel: 'Dodaj fotografiju',
  cameraLabel: 'Snimi fotografiju',
  galleryLabel: 'Odaberi fotografiju iz galerije',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Fotografija dodana',
  settingsLabel: 'Postavke recepta',
  voiceLabel: 'Diktiraj',
  sendLabel: 'Kuhaj',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Šta želiš napraviti?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Nutritivne informacije',
  nutritionSubtitle: 'Kalorije, makronutrijenti i alergeni',
  swapTitle: 'Zamijeni sastojke',
  swapSubtitle: 'Promijeni ono što nemaš ili ne smiješ',
  shoppingTitle: 'Lista za kupovinu',
  shoppingSubtitle: 'Ono što treba kupiti',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Odaberi odakle ćeš početi i završi rečenicu svojim riječima.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"piletina iz rerne"— y desde ahí sigue el
   * camino de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalorije',
  nuProtein: 'Proteini',
  nuFat: 'Masti',
  nuCarbs: 'Ugljikohidrati',
  nuSugar: 'Šećer',
  nuSodium: 'Natrij',
  nuAllergens: 'Alergeni',
  nuPortion: 'Po porciji',
  nuAll: 'Sve',

  /* Sustituir ingredientes */
  swMissing: 'Nemam jedan sastojak',
  swLactose: 'Bez laktoze',
  swGluten: 'Bez glutena',
  swEgg: 'Bez jaja',
  swNuts: 'Bez orašastih plodova',
  swVegetarian: 'Vegetarijansko',
  swVegan: 'Vegansko',
  swSugar: 'Bez šećera',
  swCheaper: 'Jeftinije',
  swPantry: 'S onim što imam',

  /* Lista de compras */
  shRecipe: 'Iz recepta',
  shMenu: 'Iz menija',
  shWeek: 'Za sedmicu',
  shOccasion: 'Za posebnu priliku',
  shPantry: 'Osnovne namirnice',
  shAisles: 'Poredana po odjelima',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Ono što treba znati da bi se skuhalo',
  optPeople: 'Osobe',
  optTime: 'Vrijeme',
  optDiet: 'Ishrana',
  optLevel: 'Težina',
  valAnyone: 'Koliko god',
  valOne: 'Za mene',
  valTwo: 'Za dvoje',
  valFamily: 'Za porodicu',
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
  valPro: 'Za profesionalce',
  /* Lo elegido viaja con la idea, a la vista: "Piletina iz rerne (Za dvoje · Pola sata)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Moji projekti',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Prikaži sve',
  projectsEmpty: 'Uz Weë još ništa nije skuhano.',
  projectsEmptyHint: 'Ono što ovdje kreiraš čuva se i ponovo ćeš ga naći u ovom redu.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Reci mi šta želiš kuhati…',
  heroLead: 'Tvoj AI kuhar,',
  heroAccent: 'uvijek uz tebe',
  chipRecipes: 'Recepti',
  chipMenus: 'Meniji',
  chipHealthy: 'Zdravo',
  chipQuick: 'Brzo',
};
