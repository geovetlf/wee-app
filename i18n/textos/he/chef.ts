/*
 * HEBREO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español con el inglés como segunda referencia (guía docs/I18N-HEBREO.md).
 *
 * Decisiones: la receta es «מתכון» (glosario § 6); los ingredientes, «מצרכים»;
 * el menú, «תפריט». El botón «Cocinar» va en infinitivo («לבשל») porque el
 * sustantivo «בישול» suena a categoría y no a acción. Las «Personas» del ajuste
 * son «סועדים» (comensales). Los valores concuerdan con su ajuste y no con la
 * persona: la dieta («תזונה», f.) es «צמחונית / טבעונית»; la dificultad («רמת
 * קושי», f.) es «קלה / בינונית / ברמת שף». «בישלת» se escribe igual en los dos
 * géneros. `panelStart` conserva el «: » final y `goalWith` los paréntesis, porque
 * la pantalla concatena con ellos. «Weë Chef» no aparece aquí: es marca.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'מתכונים, תפריטים ומצרכים.\nעם מה שכבר יש בבית.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'כתיבת רעיון או מצרכים, או שימוש בתמונה',
  addLabel: 'הוספת תמונה',
  cameraLabel: 'צילום תמונה',
  galleryLabel: 'בחירת תמונה מהגלריה',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'התמונה נוספה',
  settingsLabel: 'הגדרות המתכון',
  voiceLabel: 'הכתבה',
  sendLabel: 'לבשל',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'מה תרצו להכין?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'מידע תזונתי',
  nutritionSubtitle: 'קלוריות, מאקרו ואלרגנים',
  swapTitle: 'החלפת מצרכים',
  swapSubtitle: 'החלפה של מה שאין או שאסור',
  shoppingTitle: 'רשימת קניות',
  shoppingSubtitle: 'מה שצריך לקנות',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'אפשר לבחור מאיפה להתחיל ולהשלים את המשפט במילים שלך.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"pollo al horno"— y desde ahí sigue el camino
   * de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'קלוריות',
  nuProtein: 'חלבונים',
  nuFat: 'שומנים',
  nuCarbs: 'פחמימות',
  nuSugar: 'סוכר',
  nuSodium: 'נתרן',
  nuAllergens: 'אלרגנים',
  nuPortion: 'למנה',
  nuAll: 'הכול',

  /* Sustituir ingredientes */
  swMissing: 'חסר לי מצרך',
  swLactose: 'ללא לקטוז',
  swGluten: 'ללא גלוטן',
  swEgg: 'ללא ביצים',
  swNuts: 'ללא אגוזים',
  swVegetarian: 'צמחוני',
  swVegan: 'טבעוני',
  swSugar: 'ללא סוכר',
  swCheaper: 'זול יותר',
  swPantry: 'עם מה שיש לי',

  /* Lista de compras */
  shRecipe: 'ממתכון',
  shMenu: 'מתפריט',
  shWeek: 'לשבוע',
  shOccasion: 'לאירוע',
  shPantry: 'הבסיס למזווה',
  shAisles: 'מסודרת לפי מעברים',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'מה שצריך לדעת כדי לבשל את זה',
  optPeople: 'סועדים',
  optTime: 'זמן',
  optDiet: 'תזונה',
  optLevel: 'רמת קושי',
  valAnyone: 'לא משנה כמה',
  valOne: 'בשבילי',
  valTwo: 'לשניים',
  valFamily: 'למשפחה',
  valMany: 'להרבה אנשים',
  valAnyTime: 'כמה שצריך',
  valQuick: '15 דקות',
  valHalfHour: 'חצי שעה',
  valLong: 'שעה או יותר',
  valNoDiet: 'ללא הגבלות',
  valVegetarian: 'צמחונית',
  valVegan: 'טבעונית',
  valGlutenFree: 'ללא גלוטן',
  valLactoseFree: 'ללא לקטוז',
  valSugarFree: 'ללא סוכר',
  valAnyLevel: 'לא משנה',
  valEasy: 'קלה',
  valMedium: 'בינונית',
  valPro: 'ברמת שף',
  /* Lo elegido viaja con la idea, a la vista: "Pollo al horno (Para dos · Media hora)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'הפרויקטים שלי',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'הצגת הכול',
  projectsEmpty: 'עדיין לא בישלת כלום עם Weë.',
  projectsEmptyHint: 'מה שנוצר כאן נשמר, ואפשר למצוא אותו שוב בשורה הזאת.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'מה מתחשק לך לבשל…',
  heroLead: 'השף שלך עם AI,',
  heroAccent: 'תמיד איתך',
  chipRecipes: 'מתכונים',
  chipMenus: 'תפריטים',
  chipHealthy: 'בריא',
  chipQuick: 'מהיר',
};
