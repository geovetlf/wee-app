/*
 * ÁRABE — WEË BRAIN: el sitio de trabajo del cerebro de Weë. Tipado contra
 * el español.
 *
 * «Weë Brain» y los nombres de los satélites son marca y salen de
 * `constants/weeExperiences.ts`. `blockLeft` dice «من أصل {{total}} من الردود»
 * para que concuerde con cualquier total sin elegir forma de plural.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'مساعدك الذكي لكل شيء',
  slogan: 'تخيّل · اسأل · أبدع · تواصل',
  description: 'كل قوة Weë، في محادثة واحدة.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain، متصل ببقية أقسام Weë AI',
  goTo: 'الانتقال إلى {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'اكتب رسالتك هنا...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'كيف تريد أن أردّ عليك.',
  searchGroup: 'البحث في الإنترنت',

  imageLabel: 'صورة',
  settingsLabel: 'الإعدادات',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'تبقّى لك {{restantes}} من أصل {{total}} من الردود',
};
