/*
 * INDONESIO — Mis creaciones: la biblioteca de material de la CUENTA, y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Mis creaciones» es «Karya Saya» y una creación, «karya» (guía § 4); el
 * indonesio no flexiona el número, así que `count_one` y `count_other` son
 * idénticas y llevan `{{contador}}`. Los nombres de las experiencias (Weë
 * Design, Weë Studio…) y el nombre de la creación entran por hueco sin tocar.
 * Los estados dicen lo que se sabe: «Memproses» y «Siap», nunca un porcentaje.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Karya Saya',
  intro: 'Semua yang Anda buat dengan Weë AI, di satu tempat. Ini milik akun Anda: tampilannya sama dari Profil Asli maupun dari Profil Weë.',

  /* Filtros por tipo. */
  filterAll: 'Semua',
  filterImages: 'Gambar',
  filterVideos: 'Video',
  filterAudio: 'Audio',
  filterDocuments: 'Dokumen',
  filterModel3d: '3D',
  filterLabel: 'Filter berdasarkan jenis',

  /* Orden. */
  sortRecent: 'Terbaru',
  sortOldest: 'Terlama',
  sortLabel: 'Urutkan',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'Memuat karya Anda…',
  loadFailed: 'Karya Anda tidak dapat dimuat.',
  retry: 'Coba lagi',
  loadMore: 'Muat lebih banyak',
  emptyTitle: 'Anda belum punya karya',
  emptyText: 'Semua yang Anda buat dengan Weë AI akan muncul di sini, lengkap dengan gambar, video, atau audionya.',
  emptyAction: 'Buat sesuatu dengan Weë AI',
  emptyFiltered: 'Tidak ada karya jenis ini.',
  count_one: '{{contador}} karya',
  count_other: '{{contador}} karya',

  /* Estados de una creación. */
  statusUploading: 'Mengunggah',
  statusProcessing: 'Memproses',
  statusReady: 'Siap',
  statusFailed: 'Tidak berhasil',
  statusDeleted: 'Dihapus',
  pendingDeletion: 'File akan segera dihapus.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Gambar',
  kindVideo: 'Video',
  kindAudio: 'Audio',
  kindDocument: 'Dokumen',
  kindModel3d: '3D',
  kindText: 'Teks',

  /* Acciones sobre una creación. */
  open: 'Buka',
  openCreation: 'Buka karya: {{nombre}}',
  download: 'Unduh',
  downloaded: 'Tersimpan di galeri Anda.',
  downloadFailed: 'Tidak dapat mengunduhnya. Coba lagi.',
  downloadPermission: 'Weë memerlukan izin untuk menyimpan ke galeri Anda.',
  savedInCreations: 'Tersimpan di Karya Saya',
  save: 'Simpan',
  saved: 'Tersimpan',
  useInProject: 'Gunakan di proyek',
  publish: 'Terbitkan',
  share: 'Bagikan',
  delete: 'Hapus',
  deleteConfirm: 'Hapus karya ini? File-nya akan dihapus. Yang sudah Anda terbitkan tidak berubah.',
  deleteConfirmWeb: 'Hapus karya ini? File-nya akan dihapus. Yang sudah Anda terbitkan tidak berubah.',
  deleted: 'Karya dihapus.',
  deleteFailed: 'Tidak dapat menghapusnya. Coba lagi.',
  createdWith: 'Dibuat dengan {{nombre}}',
  createdOn: 'Dibuat pada {{fecha}}',

  /* El progreso de un trabajo, mientras se hace (antes escrito a mano). */
  progressWorking: '{{nombre}} sedang bekerja',
  progressStarting: 'Memulai…',
  progressSteps: '{{hechos}} dari {{total}} langkah selesai',
  progressFindLater: 'Anda bisa meninggalkan layar ini; hasilnya akan ada di “Karya Saya” setelah siap.',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer
     —nunca el nombre de la licencia, que nombra al modelo—. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: 'Dunia 3D',
  kindWorld: 'Dunia 3D',
  noViewer3d: 'Weë belum memiliki penampil 3D. Unduh untuk membukanya di aplikasi 3D.',
  rightsTitle: 'Apa yang bisa Anda lakukan dengan karya ini',
  rightsProvenance: 'Dibuat dengan AI di Weë, menggunakan model pihak ketiga yang memiliki lisensinya sendiri.',
  rightsCommercialAllowed: 'Anda dapat menggunakannya untuk tujuan komersial.',
  rightsCommercialRestricted: 'Penggunaan komersialnya memiliki syarat.',
  rightsCommercialUnclear: 'Belum jelas apakah dapat digunakan untuk tujuan komersial.',
  rightsCommercialNotAllowed: 'Tidak dapat digunakan untuk tujuan komersial.',
  rightsAttribution: 'Lisensinya meminta atribusi.',
  rightsBlockedIn: 'Tidak dapat digunakan atau ditampilkan di: {{lugares}}.',
};
