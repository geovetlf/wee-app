/*
 * JEMER — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «ការជូនដំណឹងភ្លាមៗ» (notificaciones instantáneas) para «push», que no tiene préstamo
 * asentado. El jemer no tiene plural: las dos formas del contador son idénticas.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'ការកំណត់',
  sectionContent: 'មាតិកា',
  sectionPrivacy: 'ភាពឯកជន',
  sectionPreferences: 'ចំណូលចិត្ត',
  sectionSupport: 'ជំនួយ',
  myCommunities: 'សហគមន៍​របស់ខ្ញុំ',
  communitiesJoined_one: 'បាន​ចូលរួម {{contador}} សហគមន៍',
  communitiesJoined_other: 'បាន​ចូលរួម {{contador}} សហគមន៍',
  privateReplies: 'ការឆ្លើយតប​ឯកជន',
  privateRepliesHint: 'អនុញ្ញាត​ឱ្យ​អ្នកដទៃ​ផ្ញើ​សារ​ឯកជន​មក​អ្នក',
  pushNotifications: 'ការជូនដំណឹង​ភ្លាមៗ',
  language: 'ភាសា',
  languageSubtitle: 'ជ្រើសរើស​ភាសា​របស់ Weë',
  help: 'ជំនួយ',
  privacyPolicy: 'គោលការណ៍​ឯកជនភាព',
  about: 'អំពី Weë',
  signOut: 'ចាកចេញ',
  signOutFailed: 'មិន​អាច​ចាក​ចេញ​ពី​គណនី​បាន​ទេ',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'បញ្ចូល​តម្លៃ​លំនាំដើម',
  seedDefaultsConfirm: 'សរសេរ​ទៅក្នុង Firestore នូវ​អ្នកផ្តល់សេវា ខ្សែសង្វាក់ និង​ការកំណត់​លំនាំដើម​ដែល​មិនទាន់​មាន។ មិន​លុប​អ្វី​ទាំងអស់។',
  seed: 'បញ្ចូល',
  sectionNotifications: 'ការជូនដំណឹង',
  sectionInfo: 'ព័ត៌មាន',
  sectionAccount: 'គណនី',
  privacyPolicyHint: 'អ្វី​ដែល​យើង​ធ្វើ​ជាមួយ​ទិន្នន័យ​របស់អ្នក ដោយ​ពាក្យ​សាមញ្ញ',
  pushNotificationsHint: 'ទទួល​ការជូនដំណឹង​អំពី​សារ​ថ្មី​និង​សកម្មភាព',
  aboutHint: 'Weë ជា​អ្វី និង​អ្នក​កំពុង​ប្រើ​កំណែ​ណា',
  helpHint: 'សំណួរ​ដែល​សួរ​ញឹកញាប់ និង​ទំនាក់ទំនង',
  signOutHint: 'ចេញ​ពី​គណនី​របស់អ្នក',
  aboutBody: 'Weë (World Encode Entity) ជា​បណ្តាញ​សង្គម​របស់​អ្នក​ដែល​បង្កើត​ស្នាដៃ​ជាមួយ​បញ្ញាសិប្បនិម្មិត។\n\nកំណែ 1.0.0 · © {{anio}} Weë។ រក្សាសិទ្ធិ​គ្រប់យ៉ាង។\n\nទិន្នន័យ​ភូមិសាស្ត្រ៖ GeoNames (geonames.org), CC BY 4.0។',
  location: '📍 ទីតាំង',
  locationLine: '{{estado}} ទីតាំង​ពិតប្រាកដ​របស់អ្នក​មិនដែល​ត្រូវបាន​បង្ហាញ​ជា​សាធារណៈ​ឡើយ។',
  locationOff: 'បាន​បិទ។ អនុញ្ញាត​ឱ្យ Weë ប្រើ​ទីតាំង​ប្រហាក់ប្រហែល​របស់អ្នក ដើម្បី​ណែនាំ​កន្លែង​នៅជិត និង​តំបន់​របស់អ្នក នៅពេល​អ្នក​បន្ថែម​ទីតាំង​ទៅ​សារបង្ហោះ។ ទីតាំង​ពិតប្រាកដ​របស់អ្នក​មិនដែល​ត្រូវបាន​បង្ហាញ​ជា​សាធារណៈ​ឡើយ។',
  locationUnavailable: 'ឧបករណ៍​នេះ​មិនអាច​ផ្តល់​ទីតាំង​របស់អ្នក​មក​យើង​បានទេ។',
  locationDisabled: 'ទីតាំង​ត្រូវបាន​បិទ​ក្នុង​ការកំណត់​ឧបករណ៍​របស់អ្នក។',
  locationPermissionDenied: 'អ្នក​បាន​បដិសេធ​ការ​អនុញ្ញាត​ក្នុង​ប្រព័ន្ធ។ ចុច​ទីនេះ​ដើម្បី​ផ្លាស់ប្តូរ​ក្នុង​ការកំណត់​ឧបករណ៍​របស់អ្នក។',
  locationPermissionNotDetermined: 'Weë នឹង​សុំ​ការអនុញ្ញាត​នៅពេល​ត្រូវការ។',
  locationApproximate: 'Weë ដឹង​តំបន់​របស់អ្នក មិនមែន​ចំណុច​ពិតប្រាកដ​ទេ។',
  locationPrecise: 'Weë អាច​ប្រើ​ទីតាំង​របស់អ្នក​ដោយ​លម្អិត នៅពេល​មុខងារ​ណាមួយ​ត្រូវការ។',
};
