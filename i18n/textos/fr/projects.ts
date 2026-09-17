/*
 * FRANCÉS — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El nombre de un proyecto lo escribe la persona y
 * entra por `{{nombre}}`: no se traduce. El contador de creaciones conserva sus
 * dos formas y quien elige es `Intl.PluralRules`; en francés el cero cae en la
 * singular, por eso `_one` lleva `{{contador}}` y nunca un 1 escrito a mano.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Tes créations, classées par projet',
  introText: 'Un projet peut contenir un logo, des photos, des annonces, des vidéos, de la musique et des documents. Enregistre chaque résultat dans le sien depuis "{{accion}}".',
  sectionTitle: 'Projets',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Exemple : Mon restaurant',
  emptyTitle: 'Tu n’as pas encore de projets',
  emptyText: 'Crée le premier, ou enregistre une création dans un projet depuis son résultat.',
  emptyAction: 'Créer mon premier projet',
  open: 'Ouvrir',
  fallbackTitle: 'Projet',
  notFound: 'Nous n’avons pas trouvé ce projet.',
  saveName: 'Enregistrer le nom',
  rename: 'Renommer',
  deleteProject: 'Supprimer le projet',
  deleteConfirmWeb: 'Supprimer le projet "{{nombre}}" ? Tes créations ne sont pas supprimées.',
  deleteConfirm: 'Supprimer "{{nombre}}" ? Tes créations ne sont pas supprimées.',
  creations_one: '{{contador}} création',
  creations_other: '{{contador}} créations',
  creationsTitle: 'Créations',
  add: 'Ajouter',
  noCreations: 'Il n’y a pas encore de créations ici. Crée quelque chose avec n’importe quel spécialiste et enregistre-le dans ce projet.',
  whatIsMissing: 'Que manque-t-il à ce projet ?',
  whatIsMissingNote: 'Un logo, des photos, une annonce, une vidéo, de la musique ou un document : n’importe quel spécialiste de Weë peut contribuer ici.',
  createSomethingNew: 'Créer quelque chose de nouveau',
};
