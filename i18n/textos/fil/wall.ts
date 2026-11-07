/*
 * FILIPINO — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (§ 11): «post», «komento», «larawan»,
 * «I-repost» / «Alisin ang repost», «I-save», «I-delete», «Ibahagi», «poll» y
 * «boto». Quien reposteó va con «si» porque es una persona y el verbo va
 * delante: «Nag-repost si {{nombre}}» (§ 12); sin nombre, «May nag-repost»
 * (`repostedBySinNombre`), porque «si» no va delante de «User». El botón de quitar la
 * republicación es «Alisin ang repost» y su etiqueta del lector de pantalla,
 * «Alisin ang repost mo», para que no sean la misma cadena. «Guardados» es
 * «Mga naka-save», con mayúscula porque es el nombre de la sección.
 *
 * Borrar un post es definitivo: la confirmación sigue el patrón de la guía
 * («Gusto mo bang i-delete …? Hindi na ito maibabalik.»). Los errores dicen
 * «Hindi ma-… / Hindi mai-…» y el paso siguiente, «Subukan ulit».
 *
 * Plural (§ 8.3): la cifra va justo delante del sustantivo, así que `_other`
 * lleva el enlace «na» («4 na boto», «6 na natitirang araw») y `_one` no. Las
 * etiquetas `statViews`, `statAgree` y `statComments` van detrás de una cifra
 * que formatea el código y no tienen plural propio: sin enlace («view»,
 * «sang-ayon», «komento»), como pide la regla 7. `moreImages` es «at
 * {{contador}} pa» (la partícula «pa» va detrás: tampoco lleva enlace).
 *
 * «CÓMO LO HICE» es un rótulo de diseño en mayúsculas: «PAANO KO GINAWA».
 * `publishedOnWee` firma el texto que sale al compartir («- Na-post sa Weë») y
 * «World Encode Entity» es el nombre largo de la marca: no se traduce.
 * «Lista de cambios y compras» (en Weë AI, lo que hay que cambiar y lo que hay
 * que comprar) es «Mga pagbabago at bibilhin»: «bibilhin» es «lo que se va a
 * comprar», la palabra de «listahan ng bibilhin».
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: 'Nag-repost si {{nombre}}',
  repostedBySinNombre: 'May nag-repost',
  repost: 'I-repost',
  undoRepost: 'Alisin ang repost',
  undoRepostConfirm: 'Alisin ang repost mo',
  sendByWeeTalk: 'Ipadala sa WeeTalk',
  save: 'I-save',
  unsave: 'Alisin sa Mga naka-save',
  deletePost: 'I-delete ang post',
  deletePostConfirm: 'Gusto mo bang i-delete ang post na ito? Hindi na ito maibabalik.',
  deletePostFailed: 'Hindi ma-delete ang post. Subukan ulit.',
  sharePost: 'Ibahagi ang post',
  shareFailed: 'Hindi maibahagi ang post. Subukan ulit.',
  preparingImage: 'Inihahanda ang larawan…',
  publishedOnWee: 'Na-post sa Weë',
  viewInWeels: 'Tingnan sa Weëls',
  moreImages: 'at {{contador}} pa',
  comment: 'Magkomento',
  viewFullVideoInWeels: 'Panoorin ang buong video sa Weëls',
  pollNoVotesYet: 'Wala pang boto',
  pollVotes_one: '{{contador}} boto',
  pollVotes_other: '{{contador}} na boto',
  pollVoted: 'Bumoto ka',
  pollClosed: 'Tapos na ang poll',
  pollDaysLeft_one: '{{contador}} natitirang araw',
  pollDaysLeft_other: '{{contador}} na natitirang araw',
  pollHoursLeft_one: '{{contador}} natitirang oras',
  pollHoursLeft_other: '{{contador}} na natitirang oras',
  pollLessThanAnHour: 'Wala nang 1 oras ang natitira',
  pollLegacy: 'Galing sa lumang bersyon ng Weë ang poll na ito, kaya hindi na ito tumatanggap ng boto.',
  pollVoteFailed: 'Hindi maitala ang boto mo',
  pollVoteOffline: 'Hindi makakonekta sa Weë. Subukan ulit mamaya.',
  closeComments: 'Isara ang mga komento',
  removeImage: 'Alisin ang larawan',
  attachImage: 'Mag-attach ng larawan',
  sendComment: 'Ipadala ang komento',
  onePost: 'Post',
  loadingComments: 'Naglo-load ang mga komento…',
  beFirstToComment: 'Maging unang magkomento',
  commentPlaceholder: 'Magsulat ng komento…',
  postNotFound: 'Hindi mahanap ang post na ito',
  loadingPosts: 'Naglo-load ang mga post…',
  loadingMorePosts: 'Naglo-load ng iba pang post…',
  retry: 'Subukan ulit',
  howIMadeIt: 'PAANO KO GINAWA',
  madeWith: 'Ginawa gamit ang',
  holdToCopy: 'Pindutin nang matagal ang text para kopyahin ito',
  process: 'Proseso:',
  comments: 'Mga komento',
  firstCommentHint: 'Bawat magandang usapan, nagsisimula sa isang ideya.',
  loadingPost: 'Naglo-load ang post…',
  useInEditor: 'Gamitin sa editor',
  edit: 'I-edit',
  publishToCommunity: 'I-post sa komunidad ko',
  changesAndPurchases: 'Mga pagbabago at bibilhin',
  shareAnonymously: 'Ibahagi ang opinyon mo nang anonymous sa Weë',
  statViews: 'view',
  statAgree: 'sang-ayon',
  statComments: 'komento',
  commentImageFailed: 'Hindi ma-upload ang larawan. Subukan ulit.',
  commentSendFailed: 'Hindi maipadala ang komento. Subukan ulit.',
  shareText: '{{contenido}}\n\nGinawa sa Weë · World Encode Entity',
  shareTextEmpty: 'Tingnan ang post na ito sa Weë',
  commentsWithCount: 'Mga komento ({{total}})',
  agreeWithComment: 'Sang-ayon sa komentong ito',
  disagreeWithComment: 'Hindi sang-ayon sa komentong ito',
  showPrompt: 'Tingnan ang prompt',
  hidePrompt: 'Itago ang prompt',
  copyPrompt: 'Kopyahin ang prompt',
  promptCopied: 'Nakopya',
};
