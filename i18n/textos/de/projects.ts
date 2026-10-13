/*
 * ALEMÁN — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). El nombre de un proyecto lo escribe la persona y
 * entra por `{{nombre}}`: no se traduce. El contador de creaciones conserva sus
 * dos formas y quien elige es `Intl.PluralRules`.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Deine laufende Arbeit',
  introText: 'Was du mit Weë AI machst, bleibt hier, damit du jederzeit weitermachen kannst. Speichere jedes Ergebnis über „{{accion}}“ in seinem Projekt; was du fertigstellst und behalten möchtest, kommt in Meine Kreationen.',
  sectionTitle: 'Projekte',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Beispiel: Mein Restaurant',
  emptyTitle: 'Du hast noch keine Projekte',
  emptyAction: 'Mein erstes Projekt erstellen',
  open: 'Öffnen',
  fallbackTitle: 'Projekt',
  notFound: 'Wir haben dieses Projekt nicht gefunden.',
  saveName: 'Namen speichern',
  rename: 'Umbenennen',
  deleteProject: 'Projekt löschen',
  deleteConfirmWeb: 'Das Projekt "{{nombre}}" löschen? Deine Kreationen werden nicht gelöscht.',
  deleteConfirm: '"{{nombre}}" löschen? Deine Kreationen werden nicht gelöscht.',
  creations_one: '{{contador}} Kreation',
  creations_other: '{{contador}} Kreationen',
  creationsTitle: 'Kreationen',
  add: 'Hinzufügen',
  noCreations: 'Hier gibt es noch keine Kreationen. Erschaffe etwas mit einem beliebigen Spezialisten und speichere es in diesem Projekt.',
  whatIsMissing: 'Was fehlt diesem Projekt?',
  whatIsMissingNote: 'Ein Logo, Fotos, eine Anzeige, ein Video, Musik oder ein Dokument: Jeder Spezialist von Weë kann hier etwas beitragen.',
  createSomethingNew: 'Etwas Neues erstellen',

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: 'Deine Projekte werden geladen …',
  loadFailed: 'Deine Projekte konnten nicht geladen werden.',
  retry: 'Erneut versuchen',
  emptyStart: 'Ein Projekt ist eine laufende Arbeit, die du jederzeit fortsetzen kannst. Erstelle hier eins oder speichere ein Ergebnis über „{{accion}}“ in einem Projekt.',
  stateInProgress: 'In Arbeit',
  updatedAgo: 'Geändert {{cuando}}',
  continue: 'Fortsetzen',
  continueProject: '{{nombre}} fortsetzen',
  noThumbnail: 'Keine Vorschau',
  loadProjectFailed: 'Dieses Projekt konnte nicht geöffnet werden.',
  jobsLoadFailed: 'Der Inhalt dieses Projekts konnte nicht geladen werden.',
};
