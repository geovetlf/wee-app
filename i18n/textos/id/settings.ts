/*
 * INDONESIO — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Pengaturan» (nunca el malayo «tetapan»). «Keluar» es cerrar sesión (glosario § 4). «Sembrar»
 * los valores por defecto se dice «Isi nilai default» / «Isi»: es lo que hace el botón, escribir
 * lo que falta. Las secciones con mayúscula inicial en cada palabra («Komunitas Saya») siguen la
 * convención de títulos de la app.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Pengaturan',
  sectionContent: 'Konten',
  sectionPrivacy: 'Privasi',
  sectionPreferences: 'Preferensi',
  sectionSupport: 'Bantuan',
  myCommunities: 'Komunitas Saya',
  communitiesJoined_one: '{{contador}} komunitas diikuti',
  communitiesJoined_other: '{{contador}} komunitas diikuti',
  privateReplies: 'Balasan privat',
  privateRepliesHint: 'Izinkan orang lain mengirimi Anda pesan privat',
  pushNotifications: 'Notifikasi push',
  language: 'Bahasa',
  languageSubtitle: 'Pilih bahasa Weë',
  help: 'Bantuan',
  privacyPolicy: 'Kebijakan privasi',
  about: 'Tentang Weë',
  signOut: 'Keluar',
  signOutFailed: 'Tidak dapat keluar dari akun',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Isi nilai default',
  seedDefaultsConfirm: 'Menulis ke Firestore penyedia, rantai, dan pengaturan default yang belum ada. Tidak menghapus apa pun.',
  seed: 'Isi',
  sectionNotifications: 'Notifikasi',
  sectionInfo: 'Informasi',
  sectionAccount: 'Akun',
  privacyPolicyHint: 'Apa yang kami lakukan dengan data Anda, dalam bahasa sederhana',
  pushNotificationsHint: 'Terima notifikasi pesan dan aktivitas baru',
  aboutHint: 'Apa itu Weë dan versi mana yang Anda gunakan',
  helpHint: 'Pertanyaan umum dan kontak',
  signOutHint: 'Keluar dari akun Anda',
  aboutBody: 'Weë (World Encode Entity) adalah jejaring sosial bagi orang-orang yang berkarya dengan Kecerdasan Buatan.\n\nVersi 1.0.0 · © {{anio}} Weë. Hak cipta dilindungi undang-undang.\n\nData geografis: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Lokasi',
  locationLine: '{{estado}} Lokasi persis Anda tidak pernah ditampilkan secara publik.',
  locationOff: 'Nonaktif. Izinkan Weë memakai perkiraan lokasi Anda untuk menyarankan tempat di sekitar dan wilayah Anda saat menambahkan lokasi ke postingan. Lokasi persis Anda tidak pernah ditampilkan secara publik.',
  locationUnavailable: 'Perangkat ini tidak dapat memberikan lokasi Anda kepada kami.',
  locationDisabled: 'Lokasi dimatikan di pengaturan perangkat Anda.',
  locationPermissionDenied: 'Anda menolak izin dari sistem. Ketuk di sini untuk mengubahnya di pengaturan perangkat Anda.',
  locationPermissionNotDetermined: 'Weë akan meminta izin saat diperlukan.',
  locationApproximate: 'Weë mengetahui wilayah Anda, bukan titik persisnya.',
  locationPrecise: 'Weë dapat memakai lokasi Anda secara detail saat suatu fitur memerlukannya.',
};
