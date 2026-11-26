/*
 * HEBREO — Configuración → Idioma.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del idioma («עברית») NO va aquí: vive en el catálogo `i18n/idiomas.ts`. «Seleccionado»
 * concuerda con «שפה»… pero es la etiqueta de la fila marcada y se deja en masculino genérico
 * («נבחר»), como el resto de etiquetas de estado; anotado para el revisor.
 */
export const language: typeof import('../es/language').language = {
  title: 'שפה',
  explanation: 'שינוי שפת הממשק של Weë. הפוסטים והתגובות ממשיכים להופיע כפי שכל אחד כתב אותם.',
  comingSoon: 'בקרוב',
  comingSoonTitle: 'בדרך',
  selected: 'נבחר',
};
