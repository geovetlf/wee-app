/*
 * FRANCÉS — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Son las palabras más cortas que existen en francés
 * para cada botón, porque estas etiquetas viven en barras estrechas.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Annuler',
  save: 'Enregistrer',
  delete: 'Supprimer',
  close: 'Fermer',
  back: 'Retour',
  next: 'Suivant',
  done: 'Terminé',
  accept: 'OK',
  send: 'Envoyer',
  share: 'Partager',
  retry: 'Réessayer',
  loading: 'Chargement…',
  error: 'Erreur',
  somethingWentWrong: 'Une erreur est survenue',
  noResults: 'Aucun résultat',
  notAvailable: 'Non disponible',
  comingSoon: 'Bientôt disponible',
  new: 'Nouveau',
  seeAll: 'Tout voir →',
  guest: 'Invité',
  anonymousUser: 'Utilisateur anonyme',
  user: 'Utilisateur',
  yes: 'Oui',
  no: 'Non',
  loadMore: 'Charger plus de publications',
  postsCount_one: '{{cantidad}} publication',
  postsCount_other: '{{cantidad}} publications',
  someone: 'Quelqu’un',
};
