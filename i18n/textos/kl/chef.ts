/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Weë Chef: el sitio donde se cocina.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Cocinar = «igagit» (botón de enviar), receta =
 * «nerisassiornermut ilitsersuut», ingrediente = «nerisassiassaq», menú = «nerisassanut
 * pilersaarut» (guía §4.14). «Sin X» = «X-qanngitsoq» / «X-nik peqanngitsoq». La nutrición usa
 * préstamos ya oídos en groenlandés («kaloriit», «proteinit», «sukkut») y formaciones propias
 * donde no los hay (carbohidratos, frutos secos, alérgenos): todo pendiente de confirmación
 * nativa. «Weë Chef» no pasa por aquí. {{panel}}, {{que}}, {{idea}}, {{ajustes}} se copian.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Nerisassiornermut ilitsersuutit, nerisassanut pilersaarutit nerisassiassallu. Angerlarsimaffimmi pigisatit atorlugit.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Isumassarsiat imaluunniit nerisassiassatit allakkit, imaluunniit assi atoruk',
  addLabel: 'Assimik ilanngussigit',
  cameraLabel: 'Assiliigit',
  galleryLabel: 'Assinut toqqorsivimmit assi toqqaruk',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Assi ilanngunneqarpoq',
  settingsLabel: 'Nerisassiornermut ilitsersuutip aaqqissuussinera',
  voiceLabel: 'Oqaatigiuk, allanneqassaaq',
  sendLabel: 'Igagit',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Suna iliorusuppit?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Nerisassap imai',
  nutritionSubtitle: 'Kaloriit, nukissiutit pingaarnerit nerisassallu timimut akuerineqanngitsut',
  swapTitle: 'Nerisassiassat taarsikkit',
  swapSubtitle: 'Pigisanngisatit nerisinnaanngisatilluunniit taarsikkit',
  shoppingTitle: 'Pisiassat allattorsimaffiat',
  shoppingSubtitle: 'Pisiarisariaqartut',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Sumit aallartinnissat toqqaruk, oqaaseqatigiillu oqaatsitit atorlugit naammassiguk.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"pollo al horno"— y desde ahí sigue el camino
   * de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kaloriit',
  nuProtein: 'Proteinit',
  nuFat: 'Orsoq',
  nuCarbs: 'Nukissiutit naasuneersut',
  nuSugar: 'Sukkut',
  nuSodium: 'Taratsumik imaqassuseq',
  nuAllergens: 'Timimut akuerineqanngitsut',
  nuPortion: 'Nerisassap ilaanut ataatsimut',
  nuAll: 'Tamarmik',

  /* Sustituir ingredientes */
  swMissing: 'Nerisassiassamik ataatsimik amigaateqarpunga',
  swLactose: 'Immup sukkutaanik peqanngitsoq',
  swGluten: 'Gluteneqanngitsoq',
  swEgg: 'Manneqanngitsoq',
  swNuts: 'Naasut manniinik peqanngitsoq',
  swVegetarian: 'Neqeqanngitsoq',
  swVegan: 'Uumasuneersumik ilaqanngitsoq',
  swSugar: 'Sukkuteqanngitsoq',
  swCheaper: 'Akikinnerusoq',
  swPantry: 'Pigisakka atorlugit',

  /* Lista de compras */
  shRecipe: 'Nerisassiornermut ilitsersuummit',
  shMenu: 'Nerisassanut pilersaarummit',
  shWeek: 'Sapaatip akunneranut',
  shOccasion: 'Nalliuttumut',
  shPantry: 'Nerisassivimmi tunngaviusut',
  shAisles: 'Niuertarfimmi aqqutit naapertorlugit tulleriiaagaq',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Iganiarnissamut ilisimasariaqartut',
  optPeople: 'Inuit',
  optTime: 'Piffissaq',
  optDiet: 'Nerisaqarneq',
  optLevel: 'Ajornassuseq',
  valAnyone: 'Qassiuneri apeqqutaanngilaq',
  valOne: 'Uannut',
  valTwo: 'Marlunnut',
  valFamily: 'Ilaqutariinnut',
  valMany: 'Amerlasuunut',
  valAnyTime: 'Pisariaqartinneqartoq',
  valQuick: '15 minutsi',
  valHalfHour: 'Nalunaaquttap akunnerata affaa',
  valLong: 'Nalunaaquttap akunnera ataaseq sivisunerusorluunniit',
  valNoDiet: 'Killilersuuteqanngitsoq',
  valVegetarian: 'Neqeqanngitsoq',
  valVegan: 'Uumasuneersumik ilaqanngitsoq',
  valGlutenFree: 'Gluteneqanngitsoq',
  valLactoseFree: 'Immup sukkutaanik peqanngitsoq',
  valSugarFree: 'Sukkuteqanngitsoq',
  valAnyLevel: 'Apeqqutaanngilaq',
  valEasy: 'Oqitsoq',
  valMedium: 'Akunnattoq',
  valPro: 'Igasoq pikkorissoq',
  /* Lo elegido viaja con la idea, a la vista: "Pollo al horno (Para dos · Media hora)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Suliniutikka',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Tamaasa takukkit',
  projectsEmpty: 'Suli Weë atorlugu igasimanngilatit.',
  projectsEmptyHint: 'Maani pilersitatit toqqorneqartarput, titarnermilu matumani nassaaqqissinnaavatit.',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  cookPrompt: 'Suna igarusunnerlugu oqaluttuarinnga…',
  heroLead: 'Igasutit AI atorlugu,',
  heroAccent: 'ataavartumik ilinniittoq',
  chipRecipes: 'Nerisassiornermut ilitsersuutit',
  chipMenus: 'Nerisassat allattorsimaffii',
  chipHealthy: 'Peqqinnartoq',
  chipQuick: 'Sukkasoq',
};
