/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Il tuo assistente intelligente per tutto',
  slogan: 'Immagina · Chiedi · Crea · Connetti',
  description: 'Tutta la potenza di Weë, in una sola conversazione.',
  systemLabel: 'Weë Brain, collegato con le altre sezioni di Weë AI',
  goTo: 'Vai a {{seccion}}',
  placeholder: 'Scrivi qui il tuo messaggio...',
  settingsHint: 'Come vuoi che ti risponda.',
  searchGroup: 'Cerca su internet',
  imageLabel: 'Immagine',
  settingsLabel: 'Impostazioni',
  blockLeft: 'Ti restano {{restantes}} risposte su {{total}}',
};
