/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * WEË CHEF — el sitio donde se cocina.
 *
 * Serbio (ekaviano, cirílico). Mismas claves que el español. "Weë Chef" es
 * marca y no entra; lo compartido con Weë Studio se lee de `studio` y las siete
 * funciones que ya existían siguen en `weeai`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Recepti, meniji i sastojci.\nOd onoga što već imaš kod kuće.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /* La caja va VACÍA: esto es el nombre del campo para quien lo escucha en vez de verlo. */
  placeholder: 'Napiši svoju ideju, svoje sastojke ili iskoristi fotografiju',
  addLabel: 'Dodaj fotografiju',
  cameraLabel: 'Snimi fotografiju',
  galleryLabel: 'Izaberi fotografiju iz galerije',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Fotografija je dodata',
  settingsLabel: 'Podešavanja recepta',
  voiceLabel: 'Diktiraj',
  sendLabel: 'Kuvaj',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Šta želiš da uradiš?',
  /* Las cinco primeras y la última viven en `weeai`. Las tres nuevas son estas. */
  nutritionTitle: 'Nutritivne informacije',
  nutritionSubtitle: 'Kalorije, makronutrijenti i alergeni',
  swapTitle: 'Zameni sastojke',
  swapSubtitle: 'Zameni ono što nemaš ili ne smeš',
  shoppingTitle: 'Spisak za kupovinu',
  shoppingSubtitle: 'Šta treba kupiti',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Izaberi odakle da počneš i dovrši rečenicu svojim rečima.',
  /* Frase empezada que la persona termina; desde ahí sigue el camino de siempre. */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalorije',
  nuProtein: 'Proteini',
  nuFat: 'Masti',
  nuCarbs: 'Ugljeni hidrati',
  nuSugar: 'Šećer',
  nuSodium: 'Natrijum',
  nuAllergens: 'Alergeni',
  nuPortion: 'Po porciji',
  nuAll: 'Sve',

  /* Sustituir ingredientes */
  swMissing: 'Nemam jedan sastojak',
  swLactose: 'Bez laktoze',
  swGluten: 'Bez glutena',
  swEgg: 'Bez jaja',
  swNuts: 'Bez orašastih plodova',
  swVegetarian: 'Vegetarijanski',
  swVegan: 'Veganski',
  swSugar: 'Bez šećera',
  swCheaper: 'Jeftinije',
  swPantry: 'Od onoga što imam',

  /* Lista de compras */
  shRecipe: 'Po receptu',
  shMenu: 'Po meniju',
  shWeek: 'Za celu nedelju',
  shOccasion: 'Za posebnu priliku',
  shPantry: 'Osnovne namirnice',
  shAisles: 'Poređano po odeljenjima',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Šta treba da znamo da bismo to skuvali',
  optPeople: 'Osobe',
  optTime: 'Vreme',
  optDiet: 'Ishrana',
  optLevel: 'Zahtevnost',
  valAnyone: 'Bilo koliko',
  valOne: 'Za mene',
  valTwo: 'Za dvoje',
  valFamily: 'Za porodicu',
  valMany: 'Za mnogo ljudi',
  valAnyTime: 'Koliko treba',
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
  valPro: 'Za šefove kuhinje',
  /* Lo elegido viaja con la idea, a la vista: "Piletina iz rerne (Za dvoje · Pola sata)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Moji projekti',
  /* Aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Prikaži sve',
  projectsEmpty: 'Uz Weë još ništa nije skuvano.',
  projectsEmptyHint: 'Ono što ovde kreiraš čuva se i ponovo ga nalaziš u ovom redu.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Reci mi šta želiš da kuvaš…',
  heroLead: 'Tvoj AI kuvar,',
  heroAccent: 'uvek uz tebe',
  chipRecipes: 'Recepti',
  chipMenus: 'Meniji',
  chipHealthy: 'Zdravo',
  chipQuick: 'Brzo',
};
