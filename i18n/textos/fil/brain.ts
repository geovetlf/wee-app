/*
 * FILIPINO — WEË BRAIN: el sitio de trabajo del cerebro de Weë (la cabecera, el dibujo del cerebro con sus
 * satélites, la caja y el bloque de respuestas).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. "Weë Brain" y los nombres de los seis
 * satélites son marca y no pasan por aquí: salen de `constants/weeExperiences.ts`. Weë Brain va siempre con su
 * marcador de cosa («ang Weë Brain», guía § 6 y decisión cerrada 4), nunca con «si/ni».
 *
 * La cabecera dice lo mismo que la presentación de Weë Brain en el catálogo (`catalogo.brainIntro`): «Ang matalino
 * mong assistant para sa lahat». El lema son cuatro verbos, uno por cosa, como el español: «Mangarap · Magtanong ·
 * Lumikha · Kumonekta» («Lumikha», y no el «Gumawa» de los botones, porque es un lema, como en `studio.slogan`).
 * «Todo el poder de Weë» se dice «Lahat ng kaya ng Weë» (todo lo que Weë puede hacer), y la conversación es «chat»
 * (glosario § 11.3).
 *
 * La caja sigue el patrón de los placeholders, «Magsulat ng …» (glosario § 11.2). «Buscar en internet» es «Maghanap sa
 * internet», la frase del glosario § 11.10 y la misma que `weeai.searchInternet`: las dos claves son el mismo ajuste.
 * La pista de los ajustes la dice Weë Brain en primera persona, como el español: «Piliin kung paano kita sasagutin.».
 * «Imagen» es «Larawan» y «Ajustes», «Mga setting».
 *
 * El bloque de respuestas va en la línea pequeña del costo, entre « · ». Las cifras van DETRÁS del sustantivo
 * («Natitirang sagot: 11 sa 12»): así no hay enlace que elegir delante de un número que no tiene plural (§ 8.3,
 * regla 7).
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Ang matalino mong assistant para sa lahat',
  slogan: 'Mangarap · Magtanong · Lumikha · Kumonekta',
  description: 'Lahat ng kaya ng Weë, sa iisang chat.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, nakakonekta sa iba pang seksyon ng Weë AI',
  goTo: 'Pumunta sa {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Magsulat ng mensahe…',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Piliin kung paano kita sasagutin.',
  searchGroup: 'Maghanap sa internet',
  imageLabel: 'Larawan',
  settingsLabel: 'Mga setting',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Natitirang sagot: {{restantes}} sa {{total}}',
};
