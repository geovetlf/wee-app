/*
 * ÁRABE — la pantalla donde se buscan, se crean y se dejan las comunidades.
 * Tipado contra el español.
 *
 * Los nombres de las comunidades oficiales y las descripciones de las
 * populares son interfaz y se traducen; el nombre que escribe una persona
 * entra por `{{nombre}}` sin tocar. Miembros y posts llevan los seis plurales
 * del árabe, por eso `ConPlurales`. Las comillas rectas del español pasan a
 * «…».
 */
import { ConPlurales } from './plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'إنشاء مجتمع',
  searchPlaceholder: 'البحث عن مجتمعات...',
  loading: 'جارٍ تحميل المجتمعات...',

  joinedSection: 'مجتمعات انضممت إليها',
  discoverSection: 'اكتشاف مجتمعات',

  official: 'رسمي',
  members_zero: 'لا أعضاء',
  members_one: 'عضو واحد',
  members_two: 'عضوان',
  members_few: '{{contador}} أعضاء',
  members_many: '{{contador}} عضوًا',
  members_other: '{{contador}} عضو',
  memberOf: 'تم الانضمام',
  join: 'انضمام',

  leaveTitle: 'مغادرة المجتمع',
  leaveConfirm: 'هل تريد حقًا مغادرة «{{nombre}}»؟',
  leave: 'مغادرة',
  leaveFailed: 'تعذّرت مغادرة المجتمع',
  actionFailed: 'تعذّر إكمال الإجراء',

  newCommunity: 'مجتمع جديد',
  name: 'الاسم',
  namePlaceholder: 'مثال: عشّاق القهوة',
  description: 'الوصف',
  descriptionPlaceholder: 'ما موضوع هذا المجتمع؟',
  createFailed: 'تعذّر إنشاء المجتمع',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'مجتمع {{nombre}}',
  empty: 'لا توجد مجتمعات متاحة',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'اعثر على ما يناسبك.',
  searchLabel: 'البحث عن مجتمعات',
  members: 'أعضاء',
  posts: 'منشورات',
  rules: 'قواعد المجتمع',
  one: 'مجتمع',
  loadFailed: 'تعذّر تحميل المجتمع',
  noPosts: 'لا توجد منشورات',
  beTheFirst: 'كن أول من ينشر في هذا المجتمع',
  createPost: 'إنشاء منشور',
  understoodJoin: 'فهمت، أريد الانضمام',
  /* `{{cantidad}}` no está exento del hueco como `{{contador}}`: la cifra la
     pinta Intl y el sustantivo va en singular tras 1 y 2 («2 عضو»), que es la
     convención de las apps en árabe cuando el número se muestra. */
  memberCount_one: '{{cantidad}} عضو',
  memberCount_two: '{{cantidad}} عضو',
  memberCount_few: '{{cantidad}} أعضاء',
  memberCount_many: '{{cantidad}} عضوًا',
  memberCount_other: '{{cantidad}} عضو',
  postCount_zero: 'لا منشورات',
  postCount_one: 'منشور واحد',
  postCount_two: 'منشوران',
  postCount_few: '{{contador}} منشورات',
  postCount_many: '{{contador}} منشورًا',
  postCount_other: '{{contador}} منشور',
  officialNameFilmAnimation: 'السينما والرسوم المتحركة',
  officialNameArtCreativity: 'الفن والإبداع',
  officialNameCreatorsInfluencers: 'صنّاع المحتوى والمؤثرون',
  officialNameBusinessEntrepreneurship: 'الأعمال وريادة الأعمال',
  officialNameTechAi: 'التكنولوجيا والذكاء الاصطناعي',
  officialNameGamingVirtualWorlds: 'الألعاب والعوالم الافتراضية',
  officialNameEducationLearning: 'التعليم والتعلّم',
  officialNameFutureSociety: 'المستقبل والمجتمع',
  officialRuleShare: 'شارك ما أنشأته بالذكاء الاصطناعي واحكِ كيف صنعته',
  officialRuleRespect: 'اسأل وأجب باحترام',
  officialRuleNoSpam: 'لا للرسائل المزعجة ولا لمحتوى ليس لك',
  popularDescFilmmakers: 'أشخاص يستخدمون الذكاء الاصطناعي في السينما والإنتاج السمعي البصري. اعرض طريقتك وتعلّم من طرق الآخرين.',
  popularDescInfluencers: 'مؤثرون وصنّاع محتوى ينتجون بالذكاء الاصطناعي.',
  popularDescDesigners: 'مصممون يعملون بالذكاء الاصطناعي: هوية بصرية ورسوم توضيحية وفن رقمي.',
  popularDescWriters: 'كتّاب يبدعون بالذكاء الاصطناعي: كتب وسيناريوهات ومقالات وشعر.',
  popularDescMusicians: 'صنّاع موسيقى وصوت بالذكاء الاصطناعي.',
  popularDescDevelopers: 'مطوّرون يبنون حلولًا بالذكاء الاصطناعي.',
  popularDescEntrepreneurs: 'روّاد أعمال يستخدمون الذكاء الاصطناعي في أعمالهم.',
  popularDescGamers: 'الذكاء الاصطناعي وألعاب الفيديو: شخصيات وعوالم وتجارب.',
};
