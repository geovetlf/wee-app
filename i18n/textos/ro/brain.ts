/*
 * RUMANO — WEË BRAIN: el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Brain» y los nombres de los satélites son marca y salen de
 * `constants/weeExperiences.ts`; las herramientas de la caja y los precios
 * viven en `weeai`.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Asistentul tău inteligent pentru orice',
  slogan: 'Imaginează · Întreabă · Creează · Conectează',
  description: 'Toată puterea Weë, într-o singură conversație.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, conectat cu celelalte secțiuni din Weë AI',
  goTo: 'Mergi la {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Scrie aici mesajul tău...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Cum vrei să îți răspundă.',
  searchGroup: 'Caută pe internet',

  imageLabel: 'Imagine',
  settingsLabel: 'Setări',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Îți mai rămân {{restantes}} din {{total}} răspunsuri',
};
