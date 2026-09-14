/*
 * My projects: the list and one project's detail.
 *
 * Typed against the Spanish file: a key missing here does not compile. Project
 * names and creation goals belong to the person and never go through the
 * translator; they arrive by interpolation.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Your creations, sorted by project',
  introText: 'A project can hold a logo, photos, ads, videos, music and documents. Save each result into its own from "{{accion}}".',
  sectionTitle: 'Projects',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Example: My restaurant',
  emptyTitle: 'You don’t have any projects yet',
  emptyText: 'Create the first one, or save a creation into a project from its result.',
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
};
