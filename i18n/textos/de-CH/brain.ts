/*
 * ALEMÁN SUIZO (de-CH) — Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Variante del alemán base (de/brain.ts). Aquí el alemán base no tiene ß, comillas
 * ni léxico que cambie en Suiza, así que las frases son las mismas. Los nombres
 * —Weë Brain y sus satélites— son marca y salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Dein smarter Assistent für alles',
  slogan: 'Träumen · Fragen · Erstellen · Verbinden',
  description: 'Die ganze Kraft von Weë, in einem einzigen Gespräch.',
  systemLabel: 'Weë Brain, verbunden mit allen anderen Bereichen von Weë AI',
  goTo: 'Zu {{seccion}}',
  placeholder: 'Schreib hier deine Nachricht...',
  settingsHint: 'Wie ich dir antworten soll.',
  searchGroup: 'Im Internet suchen',
  imageLabel: 'Bild',
  settingsLabel: 'Einstellungen',
  blockLeft: 'Noch {{restantes}} von {{total}} Antworten',
};
