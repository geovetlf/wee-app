/*
 * MONGOL — buscar, crear y dejar comunidades. Tipado contra el español.
 *
 * El nombre de una comunidad y su descripción los escribe una persona y entran
 * por hueco —`{{nombre}}`— sin tocar.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Нийгэмлэг үүсгэх',
  searchPlaceholder: 'Нийгэмлэг хайх...',
  loading: 'Нийгэмлэгүүдийг ачаалж байна...',

  joinedSection: 'Нэгдсэн нийгэмлэгүүд',
  discoverSection: 'Нийгэмлэгүүдийг нээх',

  official: 'Албан ёсны',
  members_one: '{{contador}} гишүүн',
  members_other: '{{contador}} гишүүн',
  memberOf: 'Нэгдсэн',
  join: 'Нэгдэх',

  leaveTitle: 'Нийгэмлэгээс гарах',
  leaveConfirm: 'Та "{{nombre}}" нийгэмлэгээс гарахдаа итгэлтэй байна уу?',
  leave: 'Гарах',
  leaveFailed: 'Нийгэмлэгээс гарч чадсангүй',
  actionFailed: 'Үйлдлийг гүйцэтгэж чадсангүй',

  newCommunity: 'Шинэ нийгэмлэг',
  name: 'Нэр',
  namePlaceholder: 'Жишээ нь: Кофенд дуртай хүмүүс',
  description: 'Тайлбар',
  descriptionPlaceholder: 'Энэ нийгэмлэг юуны тухай вэ?',
  createFailed: 'Нийгэмлэгийг үүсгэж чадсангүй',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: '{{nombre}} нийгэмлэг',
  empty: 'Одоогоор нийгэмлэг алга',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Өөрийн нийгэмлэгээ олоорой.',
  searchLabel: 'Нийгэмлэг хайх',
  members: 'гишүүн',
  posts: 'нийтлэл',
  rules: 'Нийгэмлэгийн дүрэм',
  one: 'Нийгэмлэг',
  loadFailed: 'Нийгэмлэгийг ачаалж чадсангүй',
  noPosts: 'Нийтлэл алга',
  beTheFirst: 'Энэ нийгэмлэгт хамгийн түрүүнд та нийтлээрэй',
  createPost: 'Нийтлэл үүсгэх',
  understoodJoin: 'Ойлголоо, нэгдэх',
  memberCount_one: '{{cantidad}} гишүүн',
  memberCount_other: '{{cantidad}} гишүүн',
  postCount_one: '{{contador}} нийтлэл',
  postCount_other: '{{contador}} нийтлэл',
  officialNameFilmAnimation: 'Кино & Анимейшн',
  officialNameArtCreativity: 'Урлаг & Бүтээлч байдал',
  officialNameCreatorsInfluencers: 'Бүтээгчид & Инфлүүнсерүүд',
  officialNameBusinessEntrepreneurship: 'Бизнес & Гарааны бизнес',
  officialNameTechAi: 'Технологи & Хиймэл оюун',
  officialNameGamingVirtualWorlds: 'Гейминг & Виртуал ертөнц',
  officialNameEducationLearning: 'Боловсрол & Суралцахуй',
  officialNameFutureSociety: 'Ирээдүй & Нийгэм',
  officialRuleShare: 'Хиймэл оюунаар бүтээснээ хуваалцаж, яаж хийснээ яриарай',
  officialRuleRespect: 'Хүндэтгэлтэйгээр асууж, хариулаарай',
  officialRuleNoSpam: 'Спам болон өөрийнх биш контент хориотой',
  popularDescFilmmakers: 'Кино, дүрс бичлэгийн үйлдвэрлэлд хиймэл оюун ашигладаг хүмүүс. Өөрийн үйл явцаа үзүүлж, бусдаас суралцаарай.',
  popularDescInfluencers: 'Хиймэл оюунаар контент бүтээдэг инфлүүнсер, контент бүтээгчид.',
  popularDescDesigners: 'Хиймэл оюунтай ажилладаг дизайнерууд: брэндинг, иллюстрац, дижитал урлаг.',
  popularDescWriters: 'Хиймэл оюунаар бүтээдэг зохиолчид: ном, кино зохиол, нийтлэл, яруу найраг.',
  popularDescMusicians: 'Хиймэл оюунаар хөгжим, аудио бүтээгчид.',
  popularDescDevelopers: 'Хиймэл оюунаар бүтээдэг программистууд.',
  popularDescEntrepreneurs: 'Бизнестээ хиймэл оюун ашигладаг бизнес эрхлэгчид.',
  popularDescGamers: 'Хиймэл оюун ба видео тоглоом: дүрүүд, ертөнцүүд, туршлага.',
};
