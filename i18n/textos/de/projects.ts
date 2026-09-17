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
  introTitle: 'Deine Kreationen, nach Projekt sortiert',
  introText: 'Ein Projekt kann Logo, Fotos, Anzeigen, Videos, Musik und Dokumente enthalten. Speichere jedes Ergebnis über "{{accion}}" im passenden Projekt.',
  sectionTitle: 'Projekte',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Beispiel: Mein Restaurant',
  emptyTitle: 'Du hast noch keine Projekte',
  emptyText: 'Erstelle das erste, oder speichere eine Kreation aus ihrem Ergebnis in einem Projekt.',
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
};
