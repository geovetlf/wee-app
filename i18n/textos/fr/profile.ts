/*
 * FRANCÉS — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu), apóstrofo tipográfico ’ y espacio antes de ? ! y :.
 * "Reposts" y "Bio" se dicen igual en francés. `{{nombre}}` de la agenda
 * (ËContact) y `{{motivo}}` del servidor salen sin tocar: no son palabras
 * nuestras.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Ajouter une couverture',
  permissionsTitle: 'Autorisations',
  galleryPermission: 'Weë a besoin d’une autorisation pour accéder à ta galerie',
  coverUploadFailed: 'L’image de couverture n’a pas pu être envoyée',

  loading: 'Chargement du profil...',
  loadFailed: 'Le profil n’a pas pu être chargé',
  loadFailedDetail: 'Les informations de ton compte n’ont pas pu être chargées',
  backToLogin: 'Retour à la connexion',

  nameRequired: 'Le nom ne peut pas être vide',
  updateFailed: 'Le profil n’a pas pu être mis à jour',
  signOutFailed: 'La déconnexion a échoué',
  noSession: 'Aucune session active',
  avatarUpdateFailed: 'L’avatar n’a pas pu être mis à jour : {{motivo}}',
  imageUrlMissing: 'Aucune URL d’image n’a été reçue',

  shareMessage: 'Regarde le profil de {{nombre}} sur Weë',

  editTitle: 'Modifier le profil',
  displayNameLabel: 'Nom d’utilisateur',
  displayNamePlaceholder: 'Ton nom d’utilisateur',
  bioLabel: 'Bio',
  bioPlaceholder: 'Parle-nous de toi...',
  websiteLabel: 'Site web',
  websitePlaceholder: 'https://tonsite.com',
  charCount: '{{usados}}/{{maximo}} caractères',

  editProfile: 'Modifier le profil',
  createWeeProfile: 'Créer un Profil Weë',

  posts: 'Publications',
  viewMyEcontacts: 'Voir mes {{nombre}}, {{total}}',

  tabMedia: 'Médias',
  tabReposts: 'Reposts',
  tabLikes: 'J’aime',

  loadingPosts: 'Chargement des publications...',
  postsFailed: 'Les publications n’ont pas pu être chargées',
  retry: 'Réessayer',

  emptyPosts: 'Tu n’as pas encore de publications',
  emptyPostsHint: 'Partage ta première publication !',
  emptyMedia: 'Tu n’as aucune publication avec photo ou vidéo',
  emptyMediaHint: 'Crée une publication avec des photos ou des vidéos',
  emptyReposts: 'Tu n’as encore rien republié',
  emptyRepostsHint: 'Partage ce que créent les autres',
  emptyLikes: 'Tu n’as aimé aucune publication',
  emptyLikesHint: 'Aime les publications qui t’intéressent',
  otherTitle: 'Profil',
  otherLoadFailed: 'Le profil n’a pas pu être chargé',
  seeFullProfile: 'Voir mon profil complet',
  emptyCategory: 'Aucune publication dans cette catégorie',
  actionFailed: 'L’action n’a pas pu être effectuée',
};
