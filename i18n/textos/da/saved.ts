/*
 * DANÉS — Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó para verlo otra vez.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «Gemte» (glosario § 9.2). El estado vacío es «Du har ikke gemt noget endnu»: lo guardado no son
 * solo publicaciones, así que «Ingen gemte opslag endnu» se quedaría corto. El marcador de una publicación es
 * «bogmærket». «Prompt» es préstamo con plural «prompts» (glosario 9.1); «tutoriales» son «vejledninger» y los
 * «trabajos» de la comunidad, «værker». «Explorar el Home» es «Udforsk forsiden»: el Home es la portada social, y
 * «Hjem» a secas es el nombre de la pestaña. La instrucción va con «… for at …» (guía § 2). El fallo de carga lleva
 * el paso siguiente (guía § 8).
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Gemte',
  empty: 'Du har ikke gemt noget endnu',
  exploreHome: 'Udforsk forsiden',
  loadFailed: 'Dine gemte opslag kunne ikke indlæses. Prøv igen.',
  emptyHint: 'Tryk på bogmærket ved et opslag for at gemme prompts, vejledninger og værker, du gerne vil se igen.',
};
