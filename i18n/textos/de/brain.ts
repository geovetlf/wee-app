/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`.
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
