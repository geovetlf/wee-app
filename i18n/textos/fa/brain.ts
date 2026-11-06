/*
 * PERSA — WEË BRAIN: el sitio de trabajo del cerebro de Weë. «Weë Brain» y los
 * nombres de los satélites son marca y salen de `constants/weeExperiences.ts`;
 * las herramientas de la caja y los precios viven en `weeai`. Tipado contra el
 * español.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'دستیار هوشمند شما برای همه‌چیز',
  slogan: 'تصور کنید · بپرسید · بسازید · ارتباط بگیرید',
  description: 'همه توان Weë، در یک گفتگو.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain، متصل به بخش‌های دیگر Weë AI',
  goTo: 'رفتن به {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'پیام خود را اینجا بنویسید...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'می‌خواهید چطور به شما پاسخ دهد.',
  searchGroup: 'جستجو در اینترنت',

  imageLabel: 'تصویر',
  settingsLabel: 'تنظیمات',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: '{{restantes}} از {{total}} پاسخ برایتان باقی مانده',
};
