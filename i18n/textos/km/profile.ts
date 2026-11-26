/*
 * JEMER — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Perfil» es «ប្រវត្តិរូប», «Perfil Weë» «ប្រវត្តិរូប Weë», «publicación»
 * «ប៉ុស្តិ៍», «Like» «ចូលចិត្ត» y «repost» «បង្ហោះឡើងវិញ» (glosario § 4). Las
 * pestañas son sustantivos cortos. La dirección de EJEMPLO del enlace lleva
 * el dominio en jemer, como el hindi: nadie la visita, se lee. «Media» es
 * «មេឌៀ», el préstamo habitual. ËContacts/ẄContacts entran por hueco. Entre
 * palabras va ZWSP (U+200B).
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'បន្ថែម​រូបគម្រប',
  permissionsTitle: 'ការអនុញ្ញាត',
  galleryPermission: 'ត្រូវការ​ការអនុញ្ញាត​ដើម្បី​ចូលប្រើ​វិចិត្រសាល',
  coverUploadFailed: 'មិនអាច​បង្ហោះ​ឡើង​រូបភាព​គម្រប​បានទេ',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'កំពុង​ផ្ទុក​ប្រវត្តិរូប...',
  loadFailed: 'មាន​កំហុស​ក្នុង​ការផ្ទុក​ប្រវត្តិរូប',
  loadFailedDetail: 'មិន​អាច​ផ្ទុក​ព័ត៌មាន​គណនី​របស់​អ្នក​បាន​ទេ',
  backToLogin: 'ត្រឡប់​ទៅ​ទំព័រ​ចូល',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'ឈ្មោះ​មិនអាច​ទទេ​បានទេ',
  updateFailed: 'មិនអាច​ធ្វើ​បច្ចុប្បន្នភាព​ប្រវត្តិរូប​បានទេ',
  signOutFailed: 'មិនអាច​ចាកចេញ​បានទេ',
  noSession: 'គ្មាន​វគ្គ​សកម្ម​ទេ',
  avatarUpdateFailed: 'មិនអាច​ធ្វើ​បច្ចុប្បន្នភាព​រូបតំណាង​បានទេ។ សូម​ព្យាយាម​ម្តងទៀត។',
  imageUrlMissing: 'មិនបាន​ទទួល URL រូបភាព​ទេ',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'មើល​ប្រវត្តិរូប​របស់ {{nombre}} នៅលើ Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'កែសម្រួល​ប្រវត្តិរូប',
  displayNameLabel: 'ឈ្មោះ​បង្ហាញ',
  displayNamePlaceholder: 'ឈ្មោះ​បង្ហាញ​របស់​អ្នក',
  bioLabel: 'ប្រវត្តិសង្ខេប',
  bioPlaceholder: 'ប្រាប់​យើង​អំពី​អ្នក...',
  websiteLabel: 'គេហទំព័រ',
  websitePlaceholder: 'ឧទាហរណ៍៖ https://yoursite.com',
  charCount: '{{usados}}/{{maximo}} តួអក្សរ',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'កែសម្រួល​ប្រវត្តិរូប',
  createWeeProfile: 'បង្កើត​ប្រវត្តិរូប Weë',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'សារបង្ហោះ',
  viewMyEcontacts: 'មើល {{nombre}} របស់ខ្ញុំ {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'មេឌៀ',
  tabReposts: 'បង្ហោះ​ឡើងវិញ',
  tabLikes: 'ចូលចិត្ត',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'កំពុង​ផ្ទុក​សារបង្ហោះ...',
  postsFailed: 'មាន​កំហុស​ក្នុង​ការផ្ទុក​សារបង្ហោះ',
  retry: 'ព្យាយាម​ម្តង​ទៀត',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'អ្នក​មិនទាន់​មាន​សារបង្ហោះ​នៅឡើយទេ',
  emptyPostsHint: 'ចែករំលែក​សារបង្ហោះ​ដំបូង​របស់អ្នក!',
  emptyMedia: 'អ្នក​មិនមាន​សារបង្ហោះ​ដែល​មាន​មេឌៀ​ទេ',
  emptyMediaHint: 'បង្កើត​សារបង្ហោះ​ជាមួយ​រូបថត​ឬ​វីដេអូ',
  emptyReposts: 'អ្នក​មិនទាន់​បាន​បង្ហោះ​អ្វី​ឡើងវិញ​ទេ',
  emptyRepostsHint: 'ចែករំលែក​មាតិកា​របស់​អ្នកប្រើ​ដទៃ',
  emptyLikes: 'អ្នក​មិន​ទាន់​បាន​ចូលចិត្ត​សារបង្ហោះ​ណា​មួយ​ទេ',
  emptyLikesHint: 'ចុច​ចូលចិត្ត​លើ​សារបង្ហោះ​ដែល​អ្នក​ចាប់អារម្មណ៍',
  otherTitle: 'ប្រវត្តិរូប',
  otherLoadFailed: 'មិនអាច​ផ្ទុក​ប្រវត្តិរូប​បានទេ',
  seeFullProfile: 'មើល​ប្រវត្តិរូប​ពេញ​របស់ខ្ញុំ',
  emptyCategory: 'គ្មាន​សារបង្ហោះ​ក្នុង​ប្រភេទ​នេះទេ',
  actionFailed: 'មិនអាច​បញ្ចប់​បានទេ',
  userNotFound: 'អ្នកប្រើ​នេះ​មិនមាន​ទេ',
  shareOtherMessage: 'មើល​ប្រវត្តិរូប​របស់ @{{nombre}} នៅលើ Weë!\n\n{{bio}}',
  shareOtherNoBio: 'អ្នកប្រើ Weë',
  joinedOn: 'បាន​ចូលរួម​នៅ {{fecha}}',
  tabPolls: 'ការស្ទង់មតិ',
};
