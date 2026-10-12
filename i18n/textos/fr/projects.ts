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
  introTitle: 'Ton travail en cours',
  introText: 'Ce que tu fais avec Weë AI reste ici pour que tu le reprennes quand tu veux. Enregistre chaque résultat dans son projet depuis « {{accion}} » ; ce que tu termines et décides de garder va dans Mes créations.',
  sectionTitle: 'Projets',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Exemple : Mon restaurant',
  emptyTitle: 'Tu n’as pas encore de projets',
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

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: 'Chargement de tes projets…',
  loadFailed: 'Impossible de charger tes projets.',
  retry: 'Réessayer',
  emptyStart: 'Un projet est un travail en cours que tu peux reprendre quand tu veux. Crées-en un ici ou enregistre un résultat dans un projet depuis « {{accion}} ».',
  stateInProgress: 'En cours',
  updatedAgo: 'Modifié {{cuando}}',
  continue: 'Continuer',
  continueProject: 'Continuer {{nombre}}',
  noThumbnail: 'Pas d’aperçu',
  loadProjectFailed: 'Impossible d’ouvrir ce projet.',
  jobsLoadFailed: 'Impossible de charger le contenu de ce projet.',
};
