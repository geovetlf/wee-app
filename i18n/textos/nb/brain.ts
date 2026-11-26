/*
 * NORUEGO BOKMÅL — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weë Brain» y los nombres de los satélites son marca y salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Din smarte assistent for alt',
  slogan: 'Forestill deg · Spør · Skap · Knytt kontakt',
  description: 'Hele kraften i Weë, i én samtale.',

  systemLabel: 'Weë Brain, koblet til de andre seksjonene i Weë AI',
  goTo: 'Gå til {{seccion}}',

  placeholder: 'Skriv meldingen din her…',

  settingsHint: 'Hvordan du vil at svarene skal være.',
  searchGroup: 'Søk på internett',

  imageLabel: 'Bilde',
  settingsLabel: 'Innstillinger',

  blockLeft: 'Du har {{restantes}} av {{total}} svar igjen',
};
