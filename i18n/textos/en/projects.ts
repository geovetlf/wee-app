/*
 * My projects: the list and one project's detail.
 *
 * Typed against the Spanish file: a key missing here does not compile. Project
 * names and creation goals belong to the person and never go through the
 * translator; they arrive by interpolation.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Your work in progress',
  introText: 'What you’re making with Weë AI stays here so you can continue whenever you like. Save each result into its project from "{{accion}}"; what you finish and decide to keep goes to My creations.',
  sectionTitle: 'Projects',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Example: My restaurant',
  emptyTitle: 'You don’t have any projects yet',
  emptyAction: 'Create my first project',
  open: 'Open',
  fallbackTitle: 'Project',
  notFound: 'We couldn’t find this project.',
  saveName: 'Save name',
  rename: 'Rename',
  deleteProject: 'Delete project',
  deleteConfirmWeb: 'Delete the project "{{nombre}}"? Your creations are not deleted.',
  deleteConfirm: 'Delete "{{nombre}}"? Your creations are not deleted.',
  creations_one: '{{contador}} creation',
  creations_other: '{{contador}} creations',
  creationsTitle: 'Creations',
  add: 'Add',
  noCreations: 'No creations here yet. Make something with any specialist and save it into this project.',
  whatIsMissing: 'What’s missing from this project?',
  whatIsMissingNote: 'A logo, photos, an ad, a video, music or a document: any Weë specialist can add to this.',
  createSomethingNew: 'Create something new',

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: 'Loading your projects…',
  loadFailed: 'We couldn’t load your projects.',
  retry: 'Try again',
  emptyStart: 'A project is work in progress that you can pick up whenever you like. Create one here, or save a result into a project from “{{accion}}”.',
  stateInProgress: 'In progress',
  updatedAgo: 'Edited {{cuando}}',
  continue: 'Continue',
  continueProject: 'Continue {{nombre}}',
  noThumbnail: 'No preview',
  loadProjectFailed: 'We couldn’t open this project.',
  jobsLoadFailed: 'We couldn’t load what’s in this project.',
};
