/*
 * MONGOL — WEË BRAIN, el sitio de trabajo del cerebro de Weë. «Weë Brain» y los satélites son marca y salen de
 * `constants/weeExperiences.ts`. Tipado contra el español.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Бүх зүйлд зориулсан таны ухаалаг туслах',
  slogan: 'Төсөөл · Асуу · Бүтээ · Холбогд',
  description: 'Weë-ийн бүх хүч, нэг л яриа дотор.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, Weë AI-ийн бусад хэсгүүдтэй холбогдсон',
  goTo: 'Очих: {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Мессежээ энд бичнэ үү...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Танд хэрхэн хариулахыг сонгоно уу.',
  searchGroup: 'Интернэтээс хайх',

  imageLabel: 'Зураг',
  settingsLabel: 'Тохиргоо',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Танд {{total}} хариултаас {{restantes}} үлдлээ',
};
