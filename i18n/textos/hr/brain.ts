/*
 * WEË BRAIN en croata — el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). "Weë Brain" y los nombres de los satélites son marca y salen
 * de `constants/weeExperiences.ts`; «Weë» no se declina («aplikacije Weë»).
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Tvoj pametni pomoćnik za sve',
  slogan: 'Zamisli · Pitaj · Stvori · Poveži se',
  description: 'Sva snaga aplikacije Weë u jednom razgovoru.',

  systemLabel: 'Weë Brain, povezan s ostalim odjeljcima Weë AI',
  goTo: 'Idi na {{seccion}}',

  placeholder: 'Ovdje napiši svoju poruku...',

  settingsHint: 'Kako želiš da ti odgovara.',
  searchGroup: 'Pretraži internet',

  imageLabel: 'Slika',
  settingsLabel: 'Postavke',

  blockLeft: 'Preostalo ti je {{restantes}} od {{total}} odgovora',
};
