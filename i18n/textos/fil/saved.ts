/*
 * FILIPINO — Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó para verlo otra vez.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «Mga naka-save» (glosario § 6 y § 11.1, como Android: «Mga naka-save na device»). Dentro de una
 * frase la sección va en minúscula («ang mga naka-save mo»): con la «M» de rótulo en medio de la frase se leería
 * como un error. El estado vacío es «Wala ka pang na-save» (completado con `na-`, § 3.3): lo guardado no son solo
 * publicaciones, así que no se nombra ningún objeto. El marcador de una publicación es «bookmark», el préstamo que
 * ve la gente en el navegador y en Android. «Prompt» y «tutorial» se quedan como préstamos sin «-s» (el plural lo
 * pone `mga`, § 4); los «trabajos» de la comunidad son «likha» (glosario § 6: `likha` = obra creada), aquí con el
 * enlace pegado: «likhang gusto mong balikan». «Explorar el Home» es «I-explore ang Home» (§ 11.1). El fallo de
 * carga lleva el paso siguiente, «Subukan ulit.» (§ 2: qué pasó + qué hacer).
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Mga naka-save',
  empty: 'Wala ka pang na-save',
  exploreHome: 'I-explore ang Home',
  loadFailed: 'Hindi ma-load ang mga naka-save mo. Subukan ulit.',
  emptyHint: 'I-tap ang bookmark ng isang post para i-save ang mga prompt, tutorial at likhang gusto mong balikan.',
};
