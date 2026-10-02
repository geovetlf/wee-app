/*
 * DANÉS — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Republicar» es «Del igen» (glosario § 9.2) y quien lo hizo es el sujeto de la
 * frase: «{{nombre}} delte igen», sin nada pegado al hueco. Quitarlo es
 * «Fortryd deling» (botón) y «Fortryd delingen» (lector de pantalla): «Fortryd»
 * es deshacer, y deshacer es lo que hace ese botón. Borrar un post es «Slet», y
 * la confirmación sigue el patrón de la guía («Vil du slette …? Det kan ikke
 * fortrydes.») porque el borrado es definitivo. Los errores dicen «… kunne ikke
 * …» y el paso siguiente, «Prøv igen». La encuesta es «afstemning»; el voto,
 * «stemme» / «stemmer»; lo que queda, «tilbage» («2 dage tilbage»). «Guardados»
 * es «Gemte», con mayúscula porque es el nombre de la sección. «Enviar por
 * WeeTalk» es «Send i WeeTalk»: preposición, sin declinar la marca.
 *
 * `statViews`, `statAgree` y `statComments` van detrás de una cifra que pone el
 * código y NO tienen forma de plural propia: «visninger» y «kommentarer» van en
 * plural, que es lo que se lee casi siempre, y «er enige» vale para cualquier
 * cifra. La caja «CÓMO LO HICE» se escribe en mayúsculas como en el español,
 * porque es un rótulo de diseño: «SÅDAN LAVEDE JEG DET» (glosario § 9.4).
 * «Proceso:» es «Fremgangsmåde:», que es como se dice en danés «cómo se hizo».
 * `publishedOnWee` firma el texto que sale al compartir («- Slået op på Weë»);
 * «World Encode Entity» es el nombre largo de la marca y no se traduce.
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} delte igen',
  repost: 'Del igen',
  undoRepost: 'Fortryd deling',
  undoRepostConfirm: 'Fortryd delingen',
  sendByWeeTalk: 'Send i WeeTalk',
  save: 'Gem',
  unsave: 'Fjern fra Gemte',
  deletePost: 'Slet opslag',
  deletePostConfirm: 'Vil du slette opslaget? Det kan ikke fortrydes.',
  deletePostFailed: 'Opslaget kunne ikke slettes. Prøv igen.',
  sharePost: 'Del opslag',
  shareFailed: 'Opslaget kunne ikke deles. Prøv igen.',
  preparingImage: 'Gør billedet klar…',
  publishedOnWee: 'Slået op på Weë',
  viewInWeels: 'Se i Weëls',
  moreImages: 'og {{contador}} til',
  comment: 'Kommenter',
  viewFullVideoInWeels: 'Se hele videoen i Weëls',
  pollNoVotesYet: 'Ingen stemmer endnu',
  pollVotes_one: '{{contador}} stemme',
  pollVotes_other: '{{contador}} stemmer',
  pollVoted: 'Du har stemt',
  pollClosed: 'Afstemningen er afsluttet',
  pollDaysLeft_one: '{{contador}} dag tilbage',
  pollDaysLeft_other: '{{contador}} dage tilbage',
  pollHoursLeft_one: '{{contador}} time tilbage',
  pollHoursLeft_other: '{{contador}} timer tilbage',
  pollLessThanAnHour: 'Under 1 time tilbage',
  pollLegacy: 'Denne afstemning er fra en tidligere version af Weë og kan ikke længere modtage stemmer.',
  pollVoteFailed: 'Din stemme blev ikke registreret',
  pollVoteOffline: 'Der kunne ikke oprettes forbindelse til Weë. Prøv igen senere.',
  closeComments: 'Luk kommentarer',
  removeImage: 'Fjern billedet',
  attachImage: 'Vedhæft et billede',
  sendComment: 'Send kommentar',
  onePost: 'Opslag',
  loadingComments: 'Indlæser kommentarer…',
  beFirstToComment: 'Bliv den første til at kommentere',
  commentPlaceholder: 'Skriv en kommentar…',
  postNotFound: 'Vi kunne ikke finde opslaget.',
  loadingPosts: 'Indlæser opslag…',
  loadingMorePosts: 'Indlæser flere opslag…',
  retry: 'Prøv igen',
  howIMadeIt: 'SÅDAN LAVEDE JEG DET',
  madeWith: 'Lavet med',
  holdToCopy: 'Tryk længe på teksten for at kopiere den',
  process: 'Fremgangsmåde:',
  comments: 'Kommentarer',
  firstCommentHint: 'Alle gode samtaler starter med en idé.',
  loadingPost: 'Indlæser opslaget…',
  useInEditor: 'Brug i editoren',
  edit: 'Rediger',
  publishToCommunity: 'Slå op i mit fællesskab',
  changesAndPurchases: 'Ændringer og indkøb',
  shareAnonymously: 'Sig din mening anonymt på Weë',
  statViews: 'visninger',
  statAgree: 'er enige',
  statComments: 'kommentarer',
  commentImageFailed: 'Billedet kunne ikke uploades. Prøv igen.',
  commentSendFailed: 'Kommentaren kunne ikke sendes. Prøv igen.',
  shareText: '{{contenido}}\n\nSkabt på Weë · World Encode Entity',
  shareTextEmpty: 'Se dette opslag på Weë',
  commentsWithCount: 'Kommentarer ({{total}})',
  agreeWithComment: 'Enig i kommentaren',
  disagreeWithComment: 'Uenig i kommentaren',
  showPrompt: 'Vis prompt',
  hidePrompt: 'Skjul prompt',
  copyPrompt: 'Kopiér prompt',
  promptCopied: 'Kopieret!',
};
