/*
 * MALAYO — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Brain» y los nombres de los satélites son marca y salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Pembantu pintar anda untuk segalanya',
  slogan: 'Bayangkan · Tanya · Cipta · Berhubung',
  description: 'Seluruh kuasa Weë, dalam satu perbualan.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, berhubung dengan bahagian lain Weë AI',
  goTo: 'Pergi ke {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Tulis mesej anda di sini...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Bagaimana anda mahu dijawab.',
  searchGroup: 'Cari di internet',

  imageLabel: 'Imej',
  settingsLabel: 'Tetapan',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Tinggal {{restantes}} daripada {{total}} jawapan untuk anda',
};
