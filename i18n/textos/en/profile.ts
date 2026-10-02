/*
 * ENGLISH — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 *
 * Tres nombres se quedan como están porque en inglés se dicen igual: Media,
 * Reposts y Likes. No es un olvido, es la palabra.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Add cover',
  permissionsTitle: 'Permissions',
  galleryPermission: 'Weë needs permission to access your gallery',
  coverUploadFailed: 'The cover image could not be uploaded',

  loading: 'Loading profile...',
  loadFailed: 'The profile could not be loaded',
  loadFailedDetail: 'Your account information could not be loaded',
  backToLogin: 'Back to sign in',

  nameRequired: 'The name cannot be empty',
  updateFailed: 'The profile could not be updated',
  signOutFailed: 'You could not be signed out',
  noSession: 'There is no active session',
  avatarUpdateFailed: 'The avatar could not be updated. Please try again.',
  imageUrlMissing: 'No image URL came back',

  shareMessage: 'Take a look at {{nombre}} on Weë',

  editTitle: 'Edit profile',
  displayNameLabel: 'Display name',
  displayNamePlaceholder: 'Your display name',
  bioLabel: 'Bio',
  bioPlaceholder: 'Tell us about yourself...',
  websiteLabel: 'Website',
  websitePlaceholder: 'https://yoursite.com',
  charCount: '{{usados}}/{{maximo}} characters',

  editProfile: 'Edit profile',
  createWeeProfile: 'Create Weë profile',

  posts: 'Posts',
  viewMyEcontacts: 'View my {{nombre}}, {{total}}',

  tabMedia: 'Media',
  tabReposts: 'Reposts',
  tabLikes: 'Likes',

  loadingPosts: 'Loading posts...',
  postsFailed: 'The posts could not be loaded',
  retry: 'Try again',

  emptyPosts: 'You have no posts yet',
  emptyPostsHint: 'Share your first post!',
  emptyMedia: 'You have no posts with photos or video',
  emptyMediaHint: 'Create a post with photos or video',
  emptyReposts: 'You have not reposted anything',
  emptyRepostsHint: 'Share what other people make',
  emptyLikes: 'You have not liked any posts',
  emptyLikesHint: 'Like the posts that interest you',
  otherTitle: 'Profile',
  otherLoadFailed: 'The profile could not be loaded',
  seeFullProfile: 'See my full profile',
  emptyCategory: 'No posts in this category',
  actionFailed: 'It could not be completed',
  userNotFound: 'This user doesn\'t exist',
  shareOtherMessage: 'Take a look at @{{nombre}}\'s profile on Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Weë user',
  joinedOn: 'Joined {{fecha}}',
  tabPolls: 'Polls',
};
