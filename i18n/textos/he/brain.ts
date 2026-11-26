/*
 * HEBREO — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Brain» y los nombres de los satélites son marca y salen de `constants/weeExperiences.ts`.
 * El eslogan va en infinitivos («לדמיין · לשאול · ליצור · להתחבר»), que en hebreo no tienen
 * género. «Ir a {{seccion}}» usa «אל» separado para no pegar un prefijo al hueco.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'העוזר החכם שלך לכל דבר',
  slogan: 'לדמיין · לשאול · ליצור · להתחבר',
  description: 'כל העוצמה של Weë, בשיחה אחת.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, מחובר לשאר המקטעים של Weë AI',
  goTo: 'מעבר אל {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'כתיבת ההודעה כאן...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'איך לענות לך.',
  searchGroup: 'חיפוש באינטרנט',

  imageLabel: 'תמונה',
  settingsLabel: 'הגדרות',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'נותרו לך {{restantes}} מתוך {{total}} תשובות',
};
