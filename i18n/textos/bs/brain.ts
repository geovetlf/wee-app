/*
 * BOSNIO — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weë Brain» y los nombres de los seis satélites son marca y salen de
 * `constants/weeExperiences.ts`; aquí solo está lo que los rodea.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Tvoj pametni asistent za sve',
  slogan: 'Zamisli · Pitaj · Kreiraj · Poveži se',
  description: 'Sva moć aplikacije Weë u jednom razgovoru.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, povezan s ostalim sekcijama Weë AI',
  goTo: 'Idi na {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Ovdje napiši svoju poruku...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Kako želiš da ti odgovara.',
  searchGroup: 'Pretraži internet',
  imageLabel: 'Slika',
  settingsLabel: 'Postavke',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Preostalo ti je {{restantes}} od {{total}} odgovora',
};
