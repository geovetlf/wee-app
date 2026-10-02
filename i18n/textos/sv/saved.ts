/*
 * SUECO — Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la
 * persona apartó para verlo otra vez.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «Sparat» (glosario § 9.2, el término de Instagram) y el
 * estado vacío sigue el patrón «Inget … ännu» (guía § 8). El marcador de una
 * publicación es «bokmärke». «Prompt» es préstamo y se declina en sueco:
 * «promptar» (glosario § 9.4); «tutoriales» son «guider». «Explorar el Home»
 * es «Utforska startsidan»: el Home es la portada social, y «Hem» a secas es
 * el nombre de la pestaña. La instrucción va con «… om du vill …» (guía § 2),
 * nunca «Para X, haz Y».
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Sparat',
  empty: 'Inget sparat ännu',
  exploreHome: 'Utforska startsidan',
  loadFailed: 'Det gick inte att ladda sparade inlägg',
  emptyHint: 'Tryck på bokmärket i ett inlägg om du vill spara promptar, guider och arbeten till senare.',
};
