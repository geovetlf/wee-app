/*
 * ITALIANO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El nombre de un proyecto lo escribe la persona y
 * entra por `{{nombre}}`: no se traduce. El contador de creaciones conserva sus
 * dos formas y quien elige es `Intl.PluralRules`; en italiano el cero cae en la
 * plural, igual que en español, así que `_one` es solo el 1.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Le tue creazioni, ordinate per progetto',
  introText: 'Un progetto può contenere un logo, foto, annunci, video, musica e documenti. Salva ogni risultato nel suo da "{{accion}}".',
  sectionTitle: 'Progetti',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Esempio: Il mio ristorante',
  emptyTitle: 'Non hai ancora progetti',
  emptyText: 'Crea il primo, oppure salva una creazione in un progetto dal suo risultato.',
  emptyAction: 'Crea il mio primo progetto',
  open: 'Apri',
  fallbackTitle: 'Progetto',
  notFound: 'Non abbiamo trovato questo progetto.',
  saveName: 'Salva il nome',
  rename: 'Rinomina',
  deleteProject: 'Elimina progetto',
  deleteConfirmWeb: 'Vuoi eliminare il progetto "{{nombre}}"? Le tue creazioni non vengono cancellate.',
  deleteConfirm: 'Vuoi eliminare "{{nombre}}"? Le tue creazioni non vengono cancellate.',
  creations_one: '{{contador}} creazione',
  creations_other: '{{contador}} creazioni',
  creationsTitle: 'Creazioni',
  add: 'Aggiungi',
  noCreations: 'Qui non ci sono ancora creazioni. Crea qualcosa con un qualsiasi specialista e salvalo in questo progetto.',
  whatIsMissing: 'Cosa manca a questo progetto?',
  whatIsMissingNote: 'Un logo, delle foto, un annuncio, un video, della musica o un documento: qualsiasi specialista di Weë può aggiungere qualcosa qui.',
  createSomethingNew: 'Crea qualcosa di nuovo',
};
