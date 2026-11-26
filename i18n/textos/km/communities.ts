/*
 * JEMER — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Comunidad» es «សហគមន៍» y «miembro» «សមាជិក», invariables: las dos formas
 * de cada contador son idénticas con su hueco. El nombre de una comunidad lo
 * escribe una persona y entra por `{{nombre}}` sin tocarse. En los nombres
 * oficiales el «&» se conserva tal cual; «Influencers» se dice
 * «អ្នកមានឥទ្ធិពល», «IA» es «AI». Entre palabras va ZWSP (U+200B).
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'បង្កើត​សហគមន៍',
  searchPlaceholder: 'ស្វែងរក​សហគមន៍...',
  loading: 'កំពុង​ផ្ទុក​សហគមន៍...',

  joinedSection: 'សហគមន៍​ដែល​បាន​ចូលរួម',
  discoverSection: 'ស្វែងយល់​សហគមន៍',

  official: 'ផ្លូវការ',
  members_one: '{{contador}} សមាជិក',
  members_other: '{{contador}} សមាជិក',
  memberOf: 'បាន​ចូលរួម',
  join: 'ចូលរួម',

  leaveTitle: 'ចាកចេញ​ពី​សហគមន៍',
  leaveConfirm: 'តើអ្នក​ប្រាកដ​ថា​ចង់​ចាកចេញ​ពី "{{nombre}}" មែនទេ?',
  leave: 'ចាកចេញ',
  leaveFailed: 'មិនអាច​ចាកចេញ​ពី​សហគមន៍​បានទេ',
  actionFailed: 'មិនអាច​បញ្ចប់​សកម្មភាព​បានទេ',

  newCommunity: 'សហគមន៍​ថ្មី',
  name: 'ឈ្មោះ',
  namePlaceholder: 'ឧ. អ្នក​ស្រឡាញ់​កាហ្វេ',
  description: 'ការពិពណ៌នា',
  descriptionPlaceholder: 'តើ​សហគមន៍​នេះ​និយាយ​អំពី​អ្វី?',
  createFailed: 'មិនអាច​បង្កើត​សហគមន៍​បានទេ',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'សហគមន៍ {{nombre}}',
  empty: 'មិនមាន​សហគមន៍​ទេ',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'រក​សហគមន៍​របស់អ្នក។',
  searchLabel: 'ស្វែងរក​សហគមន៍',
  members: 'សមាជិក',
  posts: 'សារបង្ហោះ',
  rules: 'វិធាន​សហគមន៍',
  one: 'សហគមន៍',
  loadFailed: 'មិនអាច​ផ្ទុក​សហគមន៍​បានទេ',
  noPosts: 'មិនមាន​សារបង្ហោះ​ទេ',
  beTheFirst: 'ក្លាយជា​អ្នកដំបូង​ដែល​បង្ហោះ​ក្នុង​សហគមន៍​នេះ',
  createPost: 'បង្កើត​សារបង្ហោះ',
  understoodJoin: 'យល់ហើយ ចូលរួម',
  memberCount_one: '{{cantidad}} សមាជិក',
  memberCount_other: '{{cantidad}} សមាជិក',
  postCount_one: '{{contador}} សារបង្ហោះ',
  postCount_other: '{{contador}} សារបង្ហោះ',
  officialNameFilmAnimation: 'ភាពយន្ត & គំនូរជីវចល',
  officialNameArtCreativity: 'សិល្បៈ & ការច្នៃប្រឌិត',
  officialNameCreatorsInfluencers: 'អ្នកបង្កើត & អ្នកមានឥទ្ធិពល',
  officialNameBusinessEntrepreneurship: 'អាជីវកម្ម & សហគ្រិនភាព',
  officialNameTechAi: 'បច្ចេកវិទ្យា & AI',
  officialNameGamingVirtualWorlds: 'ហ្គេម & ពិភពនិម្មិត',
  officialNameEducationLearning: 'ការអប់រំ & ការរៀនសូត្រ',
  officialNameFutureSociety: 'អនាគត & សង្គម',
  officialRuleShare: 'ចែករំលែក​អ្វី​ដែល​អ្នក​បាន​បង្កើត​ជាមួយ AI និង​ប្រាប់​ពី​របៀប​ដែល​អ្នក​ធ្វើវា',
  officialRuleRespect: 'សួរ​និង​ឆ្លើយ​ដោយ​ការគោរព',
  officialRuleNoSpam: 'គ្មាន​សារ​ឥតបានការ ឬ​មាតិកា​ដែល​មិនមែន​ជា​របស់អ្នក',
  popularDescFilmmakers: 'មនុស្ស​ដែល​ប្រើ AI សម្រាប់​ភាពយន្ត​និង​ការផលិត​សោតទស្សន៍។ បង្ហាញ​ដំណើរការ​របស់អ្នក និង​រៀន​ពី​អ្នកដទៃ។',
  popularDescInfluencers: 'អ្នកមានឥទ្ធិពល​និង​អ្នកបង្កើត​មាតិកា​ដែល​ផលិត​ដោយ AI។',
  popularDescDesigners: 'អ្នករចនា​ដែល​ធ្វើការ​ជាមួយ AI៖ ម៉ាកយីហោ រូបគំនូរ សិល្បៈ​ឌីជីថល។',
  popularDescWriters: 'អ្នកនិពន្ធ​ដែល​បង្កើត​ជាមួយ AI៖ សៀវភៅ អត្ថបទរឿង អត្ថបទ និង​កំណាព្យ។',
  popularDescMusicians: 'អ្នកបង្កើត​តន្ត្រី​និង​សំឡេង​ជាមួយ AI។',
  popularDescDevelopers: 'អ្នក​អភិវឌ្ឍ​កម្មវិធី​ដែល​បង្កើត​ជាមួយ AI។',
  popularDescEntrepreneurs: 'សហគ្រិន​ដែល​ប្រើ AI ក្នុង​អាជីវកម្ម​របស់ពួកគេ។',
  popularDescGamers: 'AI និង​ហ្គេម​វីដេអូ៖ តួអង្គ ពិភព និង​បទពិសោធន៍។',
};
