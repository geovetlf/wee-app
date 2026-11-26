/*
 * HÚNGARO — Weë Brain: cabecera, caja y ajustes del asistente. Tipado
 * contra el español.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Az okos asszisztensed mindenhez',
  slogan: 'Képzeld el · Kérdezz · Alkoss · Kapcsolódj',
  description: 'A Weë teljes ereje egyetlen beszélgetésben.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, a Weë AI többi szakaszával összekapcsolva',
  goTo: 'Ugrás ide: {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Írd ide az üzenetedet...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Hogyan válaszoljak neked.',
  searchGroup: 'Keresés az interneten',

  imageLabel: 'Kép',
  settingsLabel: 'Beállítások',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Hátralévő válaszok: {{restantes}} / {{total}}',
};
