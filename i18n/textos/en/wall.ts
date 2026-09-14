/*
 * El Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} reposted',
  repost: 'Repost',
  undoRepost: 'Undo repost',
  undoRepostConfirm: 'Undo the repost',
  sendByWeeTalk: 'Send via WeeTalk',
  save: 'Save',
  unsave: 'Remove from Saved',
  deletePost: 'Delete post',
  deletePostConfirm: 'Are you sure you want to delete this post?',
  deletePostFailed: 'The post could not be deleted. Please try again.',
  reportPost: 'Report post',
  reportWhy: 'Why do you want to report this post?',
  reportSpam: 'Spam',
  reportOffensive: 'Offensive content',
  reportOther: 'Another reason',
  reportSent: 'Report sent',
  reportThanks: 'Thanks for your report. We will review it soon.',
  sharePost: 'Share post',
  shareFailed: 'The post could not be shared. Please try again.',
  preparingImage: 'Preparing image...',
  publishedOnWee: 'Posted on Weë',
  viewInWeels: 'View in Weëls',
  moreImages: 'and {{contador}} more',
};
