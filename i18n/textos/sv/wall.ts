/*
 * SUECO — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Republicar» es «Återpublicera» (glosario § 9.2, como Bluesky) y quien lo hizo
 * es el sujeto de la frase: «{{nombre}} återpublicerade», sin nada pegado al
 * hueco. Borrar un post es «Ta bort», y la confirmación sigue el patrón de la
 * guía: pregunta completa y aviso de que no se puede deshacer, porque el borrado
 * es definitivo. Los errores dicen «Det gick inte att …» y el paso siguiente,
 * «Försök igen». La encuesta es «omröstning»; el voto, «röst» / «röster»; lo que
 * queda, «kvar» («2 dagar kvar», «Mindre än 1 timme kvar»). «Guardados» es
 * «Sparat», con mayúscula porque es el nombre de la sección.
 *
 * `statViews`, `statAgree` y `statComments` van detrás de una cifra que pone el
 * código y NO tienen forma de plural propia: «visningar» y «kommentarer» van en
 * plural, que es lo que se lee casi siempre, y «håller med» vale para cualquier
 * cifra. La caja «CÓMO LO HICE» se escribe en mayúsculas como en el español,
 * porque es un rótulo de diseño: «SÅ GJORDE JAG» (glosario § 9.4). «Proceso:» es
 * «Arbetsgång:». `publishedOnWee` firma el texto que sale al compartir
 * («- Publicerat på Weë»), y los Weëls son una sección: «i Weëls».
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} återpublicerade',
  repost: 'Återpublicera',
  undoRepost: 'Ångra återpublicering',
  undoRepostConfirm: 'Ångra återpubliceringen',
  sendByWeeTalk: 'Skicka via WeeTalk',
  save: 'Spara',
  unsave: 'Ta bort från Sparat',
  deletePost: 'Ta bort inlägg',
  deletePostConfirm: 'Vill du ta bort inlägget? Det går inte att ångra.',
  deletePostFailed: 'Det gick inte att ta bort inlägget. Försök igen.',
  sharePost: 'Dela inlägg',
  shareFailed: 'Det gick inte att dela inlägget. Försök igen.',
  preparingImage: 'Förbereder bilden…',
  publishedOnWee: 'Publicerat på Weë',
  viewInWeels: 'Visa i Weëls',
  moreImages: 'och {{contador}} till',
  comment: 'Kommentera',
  viewFullVideoInWeels: 'Titta på hela videon i Weëls',
  pollNoVotesYet: 'Inga röster ännu',
  pollVotes_one: '{{contador}} röst',
  pollVotes_other: '{{contador}} röster',
  pollVoted: 'Du har röstat',
  pollClosed: 'Omröstningen är avslutad',
  pollDaysLeft_one: '{{contador}} dag kvar',
  pollDaysLeft_other: '{{contador}} dagar kvar',
  pollHoursLeft_one: '{{contador}} timme kvar',
  pollHoursLeft_other: '{{contador}} timmar kvar',
  pollLessThanAnHour: 'Mindre än 1 timme kvar',
  pollLegacy: 'Den här omröstningen kommer från en tidigare version av Weë och tar inte längre emot röster.',
  pollVoteFailed: 'Det gick inte att registrera rösten',
  pollVoteOffline: 'Det gick inte att ansluta till Weë. Försök igen senare.',
  closeComments: 'Stäng kommentarerna',
  removeImage: 'Ta bort bilden',
  attachImage: 'Bifoga en bild',
  sendComment: 'Skicka kommentar',
  onePost: 'Inlägg',
  loadingComments: 'Laddar kommentarer…',
  beFirstToComment: 'Bli först med att kommentera',
  commentPlaceholder: 'Skriv en kommentar…',
  postNotFound: 'Det gick inte att hitta inlägget',
  loadingPosts: 'Laddar inlägg…',
  loadingMorePosts: 'Laddar fler inlägg…',
  retry: 'Försök igen',
  howIMadeIt: 'SÅ GJORDE JAG',
  madeWith: 'Skapat med',
  holdToCopy: 'Tryck länge på texten för att kopiera den',
  process: 'Arbetsgång:',
  comments: 'Kommentarer',
  firstCommentHint: 'Alla stora samtal börjar med en idé.',
  loadingPost: 'Laddar inlägget…',
  useInEditor: 'Använd i redigeraren',
  edit: 'Redigera',
  publishToCommunity: 'Publicera i min community',
  changesAndPurchases: 'Ändringar och inköp',
  shareAnonymously: 'Tyck till anonymt på Weë',
  statViews: 'visningar',
  statAgree: 'håller med',
  statComments: 'kommentarer',
  commentImageFailed: 'Det gick inte att ladda upp bilden. Försök igen.',
  commentSendFailed: 'Det gick inte att skicka kommentaren. Försök igen.',
  shareText: '{{contenido}}\n\nSkapat på Weë · World Encode Entity',
  shareTextEmpty: 'Kolla in det här inlägget på Weë',
  commentsWithCount: 'Kommentarer ({{total}})',
  agreeWithComment: 'Håller med om kommentaren',
  disagreeWithComment: 'Håller inte med om kommentaren',
  showPrompt: 'Visa prompt',
  hidePrompt: 'Dölj prompt',
  copyPrompt: 'Kopiera prompt',
  promptCopied: 'Kopierat!',
};
