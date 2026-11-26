/*
 * CATALÁN — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weë Brain» y los nombres de los satélites son marca: no están aquí ni se traducen.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'El teu assistent intel·ligent per a tot',
  slogan: 'Imagina · Consulta · Crea · Connecta',
  description: 'Tot el poder de Weë, en una sola conversa.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, connectat amb les altres seccions de Weë AI',
  goTo: 'Ves a {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Escriu aquí el missatge...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Com vols que et contesti.',
  searchGroup: 'Cerca a internet',

  imageLabel: 'Imatge',
  settingsLabel: 'Ajustos',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'Et queden {{restantes}} de {{total}} respostes',
};
