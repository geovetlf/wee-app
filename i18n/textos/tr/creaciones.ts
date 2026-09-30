/*
 * TURCO — Mis creaciones (Oluşturduklarım): la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una creación es «içerik» y la biblioteca, «Oluşturduklarım» (glosario 10.4). La experiencia que
 * trabaja entra por `{{nombre}}` y es marca: va de sujeto («{{nombre}} çalışıyor») o delante de
 * «ile» («{{nombre}} ile oluşturuldu»), nunca con un sufijo pegado; la fecha, con «tarihinde». Los
 * pasos se cuentan como en las apps turcas: «{{hechos}}/{{total}} adım tamamlandı». El orden es un
 * conmutador que enseña el OTRO orden: «En eski» / «En yeni». «Publicar» una creación es llevarla
 * al muro de Weë: «Weë'de paylaş», para no confundirla con «Paylaş» (compartir fuera). «Video» se
 * escribe igual que en español porque es la palabra turca (glosario 10.1); «3D», también.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Oluşturduklarım',
  intro: 'Weë AI ile oluşturduğun her şey tek bir yerde. Hesabına ait olduğu için Gerçek profilinden de Weë profilinden de aynısını görürsün.',

  filterAll: 'Tümü',
  filterImages: 'Görseller',
  filterVideos: 'Videolar',
  filterAudio: 'Ses',
  filterDocuments: 'Belgeler',
  filterModel3d: '3D',
  filterLabel: 'Türe göre filtrele',

  sortRecent: 'En yeni',
  sortOldest: 'En eski',
  sortLabel: 'Sırala',

  loading: 'Oluşturdukların yükleniyor…',
  loadFailed: 'Oluşturdukların yüklenemedi.',
  retry: 'Yeniden dene',
  loadMore: 'Daha fazla yükle',
  emptyTitle: 'Henüz bir şey oluşturmadın',
  emptyText: 'Weë AI ile yaptığın her şey görseli, videosu ya da sesiyle burada görünecek.',
  emptyAction: 'Weë AI ile bir şey oluştur',
  emptyFiltered: 'Bu türde içerik yok.',
  count_one: '{{contador}} içerik',
  count_other: '{{contador}} içerik',

  statusUploading: 'Yükleniyor',
  statusProcessing: 'İşleniyor',
  statusReady: 'Hazır',
  statusFailed: 'Başarısız',
  statusDeleted: 'Silindi',
  pendingDeletion: 'Dosya kısa süre içinde kaldırılacak.',

  kindImage: 'Görsel',
  kindVideo: 'Video',
  kindAudio: 'Ses',
  kindDocument: 'Belge',
  kindModel3d: '3D',
  kindText: 'Metin',

  open: 'Aç',
  openCreation: 'İçeriği aç: {{nombre}}',
  download: 'İndir',
  downloaded: 'Galerine kaydedildi.',
  downloadFailed: 'İndirilemedi. Yeniden dene.',
  downloadPermission: 'Galerine kaydetmek için Weë\'nin izne ihtiyacı var.',
  savedInCreations: 'Oluşturduklarına kaydedildi',
  save: 'Kaydet',
  saved: 'Kaydedildi',
  useInProject: 'Projede kullan',
  publish: 'Weë\'de paylaş',
  share: 'Paylaş',
  delete: 'Sil',
  deleteConfirm: 'Bu içerik silinsin mi? Dosya silinir; daha önce paylaştıkların değişmez.',
  deleteConfirmWeb: 'Bu içerik silinsin mi? Dosya silinir; daha önce paylaştıkların değişmez.',
  deleted: 'İçerik silindi.',
  deleteFailed: 'Silinemedi. Yeniden dene.',
  createdWith: '{{nombre}} ile oluşturuldu',
  createdOn: '{{fecha}} tarihinde oluşturuldu',

  progressWorking: '{{nombre}} çalışıyor',
  progressStarting: 'Başlıyor…',
  progressSteps: '{{hechos}}/{{total}} adım tamamlandı',
  progressFindLater: 'Bu ekrandan çıkabilirsin; hazır olduğunda “Oluşturduklarım” bölümünde bulacaksın.',
};
