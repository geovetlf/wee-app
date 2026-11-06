/*
 * NORUEGO BOKMÅL — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de un proyecto lo escribe la persona y entra por `{{nombre}}`; el botón
 * citado entra por `{{accion}}`. Comillas noruegas «…».
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Kreasjonene dine, ordnet etter prosjekt',
  introText: 'Et prosjekt kan ha logo, bilder, annonser, videoer, musikk og dokumenter. Lagre hvert resultat i sitt prosjekt via «{{accion}}».',
  sectionTitle: 'Prosjekter',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Eksempel: Restauranten min',
  emptyTitle: 'Du har ingen prosjekter ennå',
  emptyText: 'Opprett det første, eller lagre en kreasjon i et prosjekt fra resultatet.',
  emptyAction: 'Opprett mitt første prosjekt',
  open: 'Åpne',
  fallbackTitle: 'Prosjekt',
  notFound: 'Vi fant ikke dette prosjektet.',
  saveName: 'Lagre navn',
  rename: 'Endre navn',
  deleteProject: 'Slett prosjekt',
  deleteConfirmWeb: 'Vil du slette prosjektet «{{nombre}}»? Kreasjonene dine slettes ikke.',
  deleteConfirm: 'Vil du slette «{{nombre}}»? Kreasjonene dine slettes ikke.',
  creations_one: '{{contador}} kreasjon',
  creations_other: '{{contador}} kreasjoner',
  creationsTitle: 'Kreasjoner',
  add: 'Legg til',
  noCreations: 'Ingen kreasjoner her ennå. Lag noe med en av spesialistene, og lagre det i dette prosjektet.',
  whatIsMissing: 'Hva mangler i dette prosjektet?',
  whatIsMissingNote: 'En logo, bilder, en annonse, en video, musikk eller et dokument: alle spesialistene i Weë kan bidra her.',
  createSomethingNew: 'Lag noe nytt',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} prosjekt',
  count_other: '{{contador}} prosjekter',
  updatedOn: 'Oppdatert {{fecha}}',
  searchPlaceholder: 'Søk i prosjekter',
  sortUpdated: 'Nylig oppdatert',
  sortName: 'Navn (A–Å)',
  noMatches: 'Ingen prosjekter passer til søket ditt.',
  emptySpaceTitle: 'Ditt kreative rom begynner her',
  moreActions: 'Flere handlinger',
};
