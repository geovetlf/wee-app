/*
 * FRANCÉS — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). "Weël" y "Weëls" son marca y no se traducen; en
 * francés se usan como masculino: le Weël, ton premier Weël.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Partager le Weël',
  empty: 'Pas encore de Weëls',
  emptyHint: 'Crée le premier depuis le bouton +',
  loadFailed: 'Les Weëls n’ont pas pu être chargés',
  rowSubtitle: 'Découvre les vidéos créées par la communauté.',
  seeAll: 'Voir tous les Weëls',
  create: 'Créer un Weël',
  createFirst: 'Ton premier Weël',
  open: 'Voir le Weël',
  upTo15s: 'jusqu’à 15 s',
  noneYetHint: 'Il n’y a pas encore de Weëls de la communauté. Les exemples montrent à quoi ils ressembleront.',
  sampleAiScene: 'Scène IA',
  sampleDance: 'Danse',
  sampleRecipe: 'Recette',
  sampleTrip: 'Voyage',
  pickVideo: 'Choisir dans la galerie',
  changeVideo: 'Changer de vidéo',
  preview: 'Aperçu du Weël',
  requirements: 'Vidéo verticale de {{segundos}} secondes maximum',
  descriptionLabel: 'Description du Weël',
  publish: 'Publier le Weël',
  uploading: 'Envoi de ta vidéo…',
  publishing: 'Publication de ton Weël…',
  publishFailed: 'Impossible de publier ton Weël. Ta vidéo est toujours là.',
  horizontalTitle: 'Cette vidéo est horizontale',
  horizontalBody: 'Les Weëls se regardent à la verticale, en plein écran. L’utiliser quand même ?',
  horizontalAccept: 'L’utiliser quand même',
  galleryForVideo: 'Pour choisir la vidéo de ton Weël, Weë doit accéder à ta galerie.',
};
