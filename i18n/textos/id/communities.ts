/*
 * INDONESIO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Comunidad» es «komunitas» y «publicación», «postingan» (guía § 4). El
 * indonesio no flexiona el número, así que en `members`, `memberCount` y
 * `postCount` las formas `_one` y `_other` son idénticas y llevan el hueco.
 * El nombre y la descripción de una comunidad los escribe una persona: entran
 * por `{{nombre}}` y salen sin tocar. El «&» de los nombres oficiales se queda.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Buat komunitas',
  searchPlaceholder: 'Cari komunitas...',
  loading: 'Memuat komunitas...',

  joinedSection: 'Komunitas yang diikuti',
  discoverSection: 'Temukan komunitas',

  official: 'Resmi',
  members_one: '{{contador}} anggota',
  members_other: '{{contador}} anggota',
  memberOf: 'Bergabung',
  join: 'Gabung',

  leaveTitle: 'Keluar dari komunitas',
  leaveConfirm: 'Anda yakin ingin keluar dari "{{nombre}}"?',
  leave: 'Keluar',
  leaveFailed: 'Tidak dapat keluar dari komunitas',
  actionFailed: 'Tindakan tidak dapat diselesaikan',

  newCommunity: 'Komunitas baru',
  name: 'Nama',
  namePlaceholder: 'Mis.: Pencinta kopi',
  description: 'Deskripsi',
  descriptionPlaceholder: 'Tentang apa komunitas ini?',
  createFailed: 'Komunitas tidak dapat dibuat',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Komunitas {{nombre}}',
  empty: 'Tidak ada komunitas yang tersedia',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Temukan komunitas Anda.',
  searchLabel: 'Cari komunitas',
  members: 'anggota',
  posts: 'postingan',
  rules: 'Aturan komunitas',
  one: 'Komunitas',
  loadFailed: 'Komunitas tidak dapat dimuat',
  noPosts: 'Belum ada postingan',
  beTheFirst: 'Jadilah yang pertama memposting di komunitas ini',
  createPost: 'Buat postingan',
  understoodJoin: 'Saya mengerti, gabung',
  memberCount_one: '{{cantidad}} anggota',
  memberCount_other: '{{cantidad}} anggota',
  postCount_one: '{{contador}} postingan',
  postCount_other: '{{contador}} postingan',
  officialNameFilmAnimation: 'Film & Animasi',
  officialNameArtCreativity: 'Seni & Kreativitas',
  officialNameCreatorsInfluencers: 'Kreator & Influencer',
  officialNameBusinessEntrepreneurship: 'Bisnis & Kewirausahaan',
  officialNameTechAi: 'Teknologi & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Dunia Virtual',
  officialNameEducationLearning: 'Pendidikan & Pembelajaran',
  officialNameFutureSociety: 'Masa Depan & Masyarakat',
  officialRuleShare: 'Bagikan apa yang Anda buat dengan AI dan ceritakan cara membuatnya',
  officialRuleRespect: 'Bertanya dan menjawab dengan sopan',
  officialRuleNoSpam: 'Tanpa spam dan tanpa konten yang bukan milik Anda',
  popularDescFilmmakers: 'Orang-orang yang memakai AI untuk film dan produksi audiovisual. Tunjukkan proses Anda dan belajar dari proses orang lain.',
  popularDescInfluencers: 'Influencer dan kreator konten yang berkarya dengan AI.',
  popularDescDesigners: 'Desainer yang bekerja dengan AI: branding, ilustrasi, seni digital.',
  popularDescWriters: 'Penulis yang berkarya dengan AI: buku, naskah, artikel, dan puisi.',
  popularDescMusicians: 'Kreator musik dan audio dengan AI.',
  popularDescDevelopers: 'Programmer yang membangun dengan AI.',
  popularDescEntrepreneurs: 'Wirausahawan yang memakai AI dalam bisnisnya.',
  popularDescGamers: 'AI dan gim video: karakter, dunia, dan pengalaman.',
};
