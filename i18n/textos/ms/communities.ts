/*
 * MALAYO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Comunidad» es «komuniti», «unirse» es «sertai», «miembro» es «ahli» y
 * «publicación» es «siaran» (glosario de docs/I18N-MALAYO.md). Las formas
 * `_one` y `_other` son idénticas porque Intl solo tiene «other». El nombre
 * y la descripción de una comunidad los escribe una persona: entran por hueco
 * y salen sin tocar. Los nombres de las comunidades oficiales sí se traducen,
 * porque son interfaz; «Gaming» e «Influencer» se quedan como préstamos.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Cipta komuniti',
  searchPlaceholder: 'Cari komuniti...',
  loading: 'Memuatkan komuniti...',

  joinedSection: 'Komuniti yang disertai',
  discoverSection: 'Teroka komuniti',

  official: 'Rasmi',
  members_one: '{{contador}} ahli',
  members_other: '{{contador}} ahli',
  memberOf: 'Disertai',
  join: 'Sertai',

  leaveTitle: 'Keluar dari komuniti',
  leaveConfirm: 'Adakah anda pasti mahu keluar dari "{{nombre}}"?',
  leave: 'Keluar',
  leaveFailed: 'Tidak dapat keluar dari komuniti',
  actionFailed: 'Tindakan tidak dapat diselesaikan',

  newCommunity: 'Komuniti baharu',
  name: 'Nama',
  namePlaceholder: 'Cth: Pencinta kopi',
  description: 'Penerangan',
  descriptionPlaceholder: 'Komuniti ini tentang apa?',
  createFailed: 'Komuniti tidak dapat dicipta',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Komuniti {{nombre}}',
  empty: 'Tiada komuniti tersedia',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Temui komuniti anda.',
  searchLabel: 'Cari komuniti',
  members: 'ahli',
  posts: 'siaran',
  rules: 'Peraturan komuniti',
  one: 'Komuniti',
  loadFailed: 'Komuniti tidak dapat dimuatkan',
  noPosts: 'Tiada siaran',
  beTheFirst: 'Jadilah yang pertama menyiarkan dalam komuniti ini',
  createPost: 'Cipta siaran',
  understoodJoin: 'Saya faham, sertai',
  memberCount_one: '{{cantidad}} ahli',
  memberCount_other: '{{cantidad}} ahli',
  postCount_one: '{{contador}} siaran',
  postCount_other: '{{contador}} siaran',
  officialNameFilmAnimation: 'Filem & Animasi',
  officialNameArtCreativity: 'Seni & Kreativiti',
  officialNameCreatorsInfluencers: 'Pencipta & Influencer',
  officialNameBusinessEntrepreneurship: 'Perniagaan & Keusahawanan',
  officialNameTechAi: 'Teknologi & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Dunia Maya',
  officialNameEducationLearning: 'Pendidikan & Pembelajaran',
  officialNameFutureSociety: 'Masa Depan & Masyarakat',
  officialRuleShare: 'Kongsi apa yang anda cipta dengan AI dan ceritakan cara anda membuatnya',
  officialRuleRespect: 'Bertanya dan menjawab dengan hormat',
  officialRuleNoSpam: 'Tiada spam atau kandungan yang bukan milik anda',
  popularDescFilmmakers: 'Orang yang menggunakan AI untuk filem dan produksi audiovisual. Tunjukkan proses anda dan belajar daripada proses orang lain.',
  popularDescInfluencers: 'Influencer dan pencipta kandungan yang menghasilkan kandungan dengan AI.',
  popularDescDesigners: 'Pereka yang bekerja dengan AI: penjenamaan, ilustrasi, seni digital.',
  popularDescWriters: 'Penulis yang mencipta dengan AI: buku, skrip, artikel dan puisi.',
  popularDescMusicians: 'Pencipta muzik dan audio dengan AI.',
  popularDescDevelopers: 'Pengaturcara yang membina dengan AI.',
  popularDescEntrepreneurs: 'Usahawan yang menggunakan AI dalam perniagaan mereka.',
  popularDescGamers: 'AI dan permainan video: watak, dunia dan pengalaman.',
};
