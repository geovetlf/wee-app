/*
 * HEBREO — Guardados.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «שמורים» (glosario). «Explorar el Home» es el botón que lleva al Home: «לדף הבית».
 * «Aún no guardaste nada» conserva la segunda persona porque «שמרת» se escribe igual en los dos
 * géneros sin niqud.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'שמורים',
  empty: 'עדיין לא שמרת כלום',
  exploreHome: 'לדף הבית',
  loadFailed: 'לא ניתן היה לטעון את השמורים שלך',
  emptyHint: 'הקשה על הסימנייה של פוסט שומרת פרומפטים, מדריכים ועבודות שרוצים לראות שוב.',
};
