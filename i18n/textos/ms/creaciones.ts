/*
 * MALAYO — Mis creaciones: la biblioteca de material de la CUENTA, y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Mis creaciones» es «Ciptaan Saya», «proyecto» es «projek», «descargar» es
 * «muat turun» y «subir» es «muat naik» (glosario de docs/I18N-MALAYO.md).
 * Los estados dicen lo que se sabe: «Memproses», «Sedia», «Tidak berjaya».
 * `count_one` y `count_other` son idénticas porque Intl solo tiene «other».
 * Los nombres de experiencia entran por hueco y no se traducen.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Ciptaan Saya',
  intro: 'Semua yang anda cipta dengan Weë AI, di satu tempat. Ia milik akaun anda: anda melihat kandungan yang sama pada Profil Sebenar dan Profil Weë.',

  /* Filtros por tipo. */
  filterAll: 'Semua',
  filterImages: 'Imej',
  filterVideos: 'Video',
  filterAudio: 'Audio',
  filterDocuments: 'Dokumen',
  filterModel3d: '3D',
  filterLabel: 'Tapis mengikut jenis',

  /* Orden. */
  sortRecent: 'Terkini',
  sortOldest: 'Terlama',
  sortLabel: 'Susun',

  /* Estados de la lista. */
  loading: 'Memuatkan ciptaan anda…',
  loadFailed: 'Kami tidak dapat memuatkan ciptaan anda.',
  retry: 'Cuba lagi',
  loadMore: 'Muatkan lagi',
  emptyTitle: 'Anda belum mempunyai ciptaan',
  emptyText: 'Semua yang anda buat dengan Weë AI akan muncul di sini, dengan imej, video atau audionya.',
  emptyAction: 'Cipta sesuatu dengan Weë AI',
  emptyFiltered: 'Tiada ciptaan jenis ini.',
  count_one: '{{contador}} ciptaan',
  count_other: '{{contador}} ciptaan',

  /* Estados de una creación. */
  statusUploading: 'Memuat naik',
  statusProcessing: 'Memproses',
  statusReady: 'Sedia',
  statusFailed: 'Tidak berjaya',
  statusDeleted: 'Dipadam',
  pendingDeletion: 'Fail akan dialih keluar tidak lama lagi.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Imej',
  kindVideo: 'Video',
  kindAudio: 'Audio',
  kindDocument: 'Dokumen',
  kindModel3d: '3D',
  kindText: 'Teks',

  /* Acciones sobre una creación. */
  open: 'Buka',
  openCreation: 'Buka ciptaan: {{nombre}}',
  download: 'Muat turun',
  downloaded: 'Disimpan dalam galeri anda.',
  downloadFailed: 'Kami tidak dapat memuat turunnya. Cuba lagi.',
  downloadPermission: 'Weë memerlukan kebenaran untuk menyimpan ke galeri anda.',
  savedInCreations: 'Disimpan dalam ciptaan anda',
  save: 'Simpan',
  saved: 'Disimpan',
  useInProject: 'Guna dalam projek',
  publish: 'Siarkan',
  share: 'Kongsi',
  delete: 'Padam',
  deleteConfirm: 'Padam ciptaan ini? Fail akan dipadam. Apa yang telah anda siarkan tidak berubah.',
  deleteConfirmWeb: 'Padam ciptaan ini? Fail akan dipadam. Apa yang telah anda siarkan tidak berubah.',
  deleted: 'Ciptaan dipadam.',
  deleteFailed: 'Kami tidak dapat memadamnya. Cuba lagi.',
  createdWith: 'Dicipta dengan {{nombre}}',
  createdOn: 'Dicipta pada {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} sedang bekerja',
  progressStarting: 'Memulakan…',
  progressSteps: '{{hechos}} daripada {{total}} langkah selesai',
  progressFindLater: 'Anda boleh keluar dari skrin ini; anda akan menemuinya dalam “Ciptaan Saya” apabila ia sedia.',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer. */
  filterWorlds: 'Dunia 3D',
  kindWorld: 'Dunia 3D',
  noViewer3d: 'Weë belum mempunyai pemapar 3D. Muat turun untuk membukanya dalam aplikasi 3D.',
  rightsTitle: 'Apa yang anda boleh lakukan dengannya',
  rightsProvenance: 'Dibuat dengan AI di Weë, menggunakan model pihak ketiga yang mempunyai lesennya sendiri.',
  rightsCommercialAllowed: 'Anda boleh menggunakannya untuk tujuan komersial.',
  rightsCommercialRestricted: 'Penggunaan komersialnya tertakluk pada syarat.',
  rightsCommercialUnclear: 'Masih belum jelas sama ada ia boleh digunakan untuk tujuan komersial.',
  rightsCommercialNotAllowed: 'Tidak boleh digunakan untuk tujuan komersial.',
  rightsAttribution: 'Lesennya memerlukan atribusi.',
  rightsBlockedIn: 'Tidak boleh digunakan atau dipaparkan di: {{lugares}}.',
};
