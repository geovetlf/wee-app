/*
 * Weë Brain: su sitio de trabajo —la cabecera, la caja y el bloque de respuestas—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres —Weë Brain y sus seis satélites— son marca y no pasan por aquí:
 * salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Ton assistant intelligent pour tout',
  slogan: 'Imaginer · Demander · Créer · Connecter',
  description: 'Toute la puissance de Weë, dans une seule conversation.',
  systemLabel: 'Weë Brain, connecté à toutes les autres sections de Weë AI',
  goTo: 'Aller à {{seccion}}',
  placeholder: 'Écris ton message ici...',
  settingsHint: 'Comment tu veux que je te réponde.',
  searchGroup: 'Rechercher sur internet',
  imageLabel: 'Image',
  settingsLabel: 'Réglages',
  blockLeft: 'Réponses restantes : {{restantes}} sur {{total}}',
};
