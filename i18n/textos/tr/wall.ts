/*
 * TURCO — El Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Republicar» es «Yeniden paylaş» y quien lo hizo es el sujeto de la frase
 * («{{nombre}} yeniden paylaştı»), así el nombre no lleva sufijo (guía § 4). La
 * confirmación de borrar es una pregunta con «mi» separado («Bu gönderi silinsin
 * mi?»), sin «¿Estás seguro…?». «Enviar por WeeTalk» es «WeeTalk'tan gönder»,
 * como se dice «WhatsApp'tan gönder», con una de las terminaciones que admite la
 * marca (§ 9); Weëls lleva «'te» y Weë «'de», «'deki» y «'nin».
 *
 * `statViews`, `statAgree` y `statComments` van detrás de una cifra y de un
 * espacio que pone el código, así que van en singular: «1,2 B görüntülenme»,
 * «34 kişi katılıyor», «5 yorum». `publishedOnWee` firma el texto que sale al
 * compartir («- Weë'de paylaşıldı»). La caja «Cómo lo hice» se titula «Nasıl
 * yaptım» en mayúscula de frase: el español la escribe en mayúsculas, pero el
 * turco no usa las mayúsculas para dar énfasis (§ 3). «Oy verilemedi» y no «Oyun
 * kaydedilemedi», que se leería también «el juego no se guardó».
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} yeniden paylaştı',
  repost: 'Yeniden paylaş',
  undoRepost: 'Yeniden paylaşımı geri al',
  undoRepostConfirm: 'Yeniden paylaşımı geri al',
  sendByWeeTalk: 'WeeTalk\'tan gönder',
  save: 'Kaydet',
  unsave: 'Kaydedilenlerden kaldır',
  deletePost: 'Gönderiyi sil',
  deletePostConfirm: 'Bu gönderi silinsin mi?',
  deletePostFailed: 'Gönderi silinemedi. Yeniden dene.',
  sharePost: 'Gönderiyi paylaş',
  shareFailed: 'Gönderi paylaşılamadı. Yeniden dene.',
  preparingImage: 'Görsel hazırlanıyor…',
  publishedOnWee: 'Weë\'de paylaşıldı',
  viewInWeels: 'Weëls\'te izle',
  moreImages: 've {{contador}} tane daha',
  comment: 'Yorum yap',
  viewFullVideoInWeels: 'Videonun tamamını Weëls\'te izle',
  pollNoVotesYet: 'Henüz oy yok',
  pollVotes_one: '{{contador}} oy',
  pollVotes_other: '{{contador}} oy',
  pollVoted: 'Oy verdin',
  pollClosed: 'Anket sona erdi',
  pollDaysLeft_one: '{{contador}} gün kaldı',
  pollDaysLeft_other: '{{contador}} gün kaldı',
  pollHoursLeft_one: '{{contador}} saat kaldı',
  pollHoursLeft_other: '{{contador}} saat kaldı',
  pollLessThanAnHour: '1 saatten az kaldı',
  pollLegacy: 'Bu anket Weë\'nin eski bir sürümüne ait ve artık oy kabul etmiyor.',
  pollVoteFailed: 'Oy verilemedi',
  pollVoteOffline: 'Weë\'ye bağlanılamadı. Daha sonra yeniden dene.',
  closeComments: 'Yorumları kapat',
  removeImage: 'Görseli kaldır',
  attachImage: 'Görsel ekle',
  sendComment: 'Yorumu gönder',
  onePost: 'Gönderi',
  loadingComments: 'Yorumlar yükleniyor…',
  beFirstToComment: 'İlk yorumu sen yap',
  commentPlaceholder: 'Yorum yaz…',
  postNotFound: 'Bu gönderi bulunamadı',
  loadingPosts: 'Gönderiler yükleniyor…',
  loadingMorePosts: 'Daha fazla gönderi yükleniyor…',
  retry: 'Yeniden dene',
  howIMadeIt: 'Nasıl yaptım',
  madeWith: 'Kullanılan araçlar',
  holdToCopy: 'Kopyalamak için metne basılı tut',
  process: 'Süreç:',
  comments: 'Yorumlar',
  firstCommentHint: 'Her güzel sohbet bir fikirle başlar.',
  loadingPost: 'Gönderi yükleniyor…',
  useInEditor: 'Editörde kullan',
  edit: 'Düzenle',
  publishToCommunity: 'Topluluğumda paylaş',
  changesAndPurchases: 'Değişiklikler ve alışveriş listesi',
  shareAnonymously: 'Weë\'de anonim olarak fikrini paylaş',
  statViews: 'görüntülenme',
  statAgree: 'kişi katılıyor',
  statComments: 'yorum',
  commentImageFailed: 'Görsel yüklenemedi. Yeniden dene.',
  commentSendFailed: 'Yorum gönderilemedi. Yeniden dene.',
  shareText: '{{contenido}}\n\nWeë\'de oluşturuldu · World Encode Entity',
  shareTextEmpty: 'Weë\'deki bu gönderiye göz at',
  commentsWithCount: 'Yorumlar ({{total}})',
  agreeWithComment: 'Bu yoruma katılıyorum',
  disagreeWithComment: 'Bu yoruma katılmıyorum',
  showPrompt: 'Promptu göster',
  hidePrompt: 'Promptu gizle',
  copyPrompt: 'Promptu kopyala',
  promptCopied: 'Kopyalandı',
};
