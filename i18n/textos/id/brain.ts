/*
 * INDONESIO — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Brain» y los nombres de los satélites son marca y salen de `constants/weeExperiences.ts`; aquí
 * solo entra lo que los describe. Las herramientas de la caja y los precios viven en `weeai`.
 * `goTo` recibe el nombre de la sección: «Pergi ke Weë Studio». `blockLeft` cuenta lo que queda, no lo
 * gastado, como el español.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Asisten cerdas Anda untuk segalanya',
  slogan: 'Bayangkan · Tanyakan · Buat · Terhubung',
  description: 'Seluruh kekuatan Weë, dalam satu percakapan.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, terhubung dengan bagian-bagian lain Weë AI',
  goTo: 'Pergi ke {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Tulis pesan Anda di sini...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Bagaimana Anda ingin dijawab.',
  searchGroup: 'Cari di internet',

  imageLabel: 'Gambar',
  settingsLabel: 'Pengaturan',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Tersisa {{restantes}} dari {{total}} jawaban',
};
