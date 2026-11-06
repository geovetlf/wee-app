/*
 * CATALÁN — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre del proyecto lo escribe la persona y entra por `{{nombre}}`; el contador
 * tiene sus dos formas (one/other) con `{{contador}}`.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Les teves creacions, ordenades per projecte',
  introText: 'Un projecte pot tenir logo, fotos, anuncis, vídeos, música i documents. Desa cada resultat al seu des de «{{accion}}».',
  sectionTitle: 'Projectes',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Exemple: El meu restaurant',
  emptyTitle: 'Encara no tens projectes',
  emptyText: 'Crea el primer o desa una creació en un projecte des del seu resultat.',
  emptyAction: 'Crea el meu primer projecte',
  open: 'Obre',
  fallbackTitle: 'Projecte',
  notFound: 'No trobem aquest projecte.',
  saveName: 'Desa el nom',
  rename: 'Canvia el nom',
  deleteProject: 'Elimina el projecte',
  deleteConfirmWeb: 'Vols eliminar el projecte «{{nombre}}»? Les teves creacions no s\'esborren.',
  deleteConfirm: 'Vols eliminar «{{nombre}}»? Les teves creacions no s\'esborren.',
  creations_one: '{{contador}} creació',
  creations_other: '{{contador}} creacions',
  creationsTitle: 'Creacions',
  add: 'Afegeix',
  noCreations: 'Encara no hi ha creacions aquí. Crea alguna cosa amb qualsevol especialista i desa-ho en aquest projecte.',
  whatIsMissing: 'Què li falta a aquest projecte?',
  whatIsMissingNote: 'Un logo, fotos, un anunci, un vídeo, música o un document: qualsevol especialista de Weë hi pot contribuir.',
  createSomethingNew: 'Crea alguna cosa nova',
};
