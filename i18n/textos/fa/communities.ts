/*
 * PERSA — La pantalla donde se buscan, se crean y se dejan las comunidades.
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Comunidad» es «انجمن» (glosario § 4). Los nombres de las comunidades
 * OFICIALES y sus descripciones son interfaz y se traducen; el «&» del
 * español se vuelve «و», que es como se enlazan dos nombres en persa. El
 * nombre que escribe una persona entra por `{{nombre}}` y sale sin tocar.
 * `_one` = `_other`.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'ایجاد انجمن',
  searchPlaceholder: 'جستجوی انجمن‌ها...',
  loading: 'در حال بارگذاری انجمن‌ها...',

  joinedSection: 'انجمن‌هایی که عضو شده‌اید',
  discoverSection: 'کشف انجمن‌ها',

  official: 'رسمی',
  members_one: '{{contador}} عضو',
  members_other: '{{contador}} عضو',
  memberOf: 'عضو',
  join: 'عضویت',

  leaveTitle: 'خروج از انجمن',
  leaveConfirm: 'آیا مطمئن هستید که می‌خواهید از «{{nombre}}» خارج شوید؟',
  leave: 'خروج',
  leaveFailed: 'خروج از انجمن انجام نشد',
  actionFailed: 'عملیات انجام نشد',

  newCommunity: 'انجمن جدید',
  name: 'نام',
  namePlaceholder: 'مثلاً: عاشقان قهوه',
  description: 'توضیحات',
  descriptionPlaceholder: 'این انجمن درباره چیست؟',
  createFailed: 'انجمن ایجاد نشد',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'انجمن {{nombre}}',
  empty: 'انجمنی در دسترس نیست',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'انجمن‌های خودتان را پیدا کنید.',
  searchLabel: 'جستجوی انجمن‌ها',
  members: 'عضو',
  posts: 'پست',
  rules: 'قوانین انجمن',
  one: 'انجمن',
  loadFailed: 'انجمن بارگذاری نشد',
  noPosts: 'پستی وجود ندارد',
  beTheFirst: 'اولین نفری باشید که در این انجمن پست می‌گذارد',
  createPost: 'ایجاد پست',
  understoodJoin: 'متوجه شدم، عضو می‌شوم',
  memberCount_one: '{{cantidad}} عضو',
  memberCount_other: '{{cantidad}} عضو',
  postCount_one: '{{contador}} پست',
  postCount_other: '{{contador}} پست',
  officialNameFilmAnimation: 'سینما و انیمیشن',
  officialNameArtCreativity: 'هنر و خلاقیت',
  officialNameCreatorsInfluencers: 'تولیدکنندگان محتوا و اینفلوئنسرها',
  officialNameBusinessEntrepreneurship: 'کسب‌وکار و کارآفرینی',
  officialNameTechAi: 'فناوری و هوش مصنوعی',
  officialNameGamingVirtualWorlds: 'گیمینگ و دنیاهای مجازی',
  officialNameEducationLearning: 'آموزش و یادگیری',
  officialNameFutureSociety: 'آینده و جامعه',
  officialRuleShare: 'آنچه را با هوش مصنوعی ساخته‌اید به اشتراک بگذارید و توضیح دهید چطور آن را ساختید',
  officialRuleRespect: 'با احترام بپرسید و پاسخ دهید',
  officialRuleNoSpam: 'نه هرزنامه، نه محتوایی که مال شما نیست',
  popularDescFilmmakers: 'افرادی که از هوش مصنوعی برای سینما و تولید سمعی‌بصری استفاده می‌کنند. روند کارتان را نشان دهید و از روند کار دیگران بیاموزید.',
  popularDescInfluencers: 'اینفلوئنسرها و تولیدکنندگانی که با هوش مصنوعی محتوا می‌سازند.',
  popularDescDesigners: 'طراحانی که با هوش مصنوعی کار می‌کنند: برندینگ، تصویرسازی، هنر دیجیتال.',
  popularDescWriters: 'نویسندگانی که با هوش مصنوعی می‌نویسند: کتاب، فیلم‌نامه، مقاله و شعر.',
  popularDescMusicians: 'سازندگان موسیقی و صدا با هوش مصنوعی.',
  popularDescDevelopers: 'برنامه‌نویسانی که با هوش مصنوعی می‌سازند.',
  popularDescEntrepreneurs: 'کارآفرینانی که در کسب‌وکارشان از هوش مصنوعی استفاده می‌کنند.',
  popularDescGamers: 'هوش مصنوعی و بازی‌های رایانه‌ای: شخصیت‌ها، دنیاها و تجربه‌ها.',
};
