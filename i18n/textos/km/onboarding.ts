/*
 * JEMER — el alta guiada y la creación del Perfil Weë: quién eres, y quién
 * eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Perfil Weë» es «ប្រវត្តិរូប Weë» (glosario § 4), «avatar» «រូបតំណាង»,
 * «alter ego» «អត្តសញ្ញាណទីពីរ» (segunda identidad). «SombraOscura» se traduce
 * como ejemplo («ស្រមោលងងឹត»); «Anon123» se queda. «Bio» es «ប្រវត្តិសង្ខេប»
 * y «Descripción» «ការពិពណ៌នា», dos palabras distintas como en el molde. Las
 * cifras (13 años, 2 letras) son latinas, como las pone Intl. Entre
 * palabras va ZWSP (U+200B).
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'សូម​ស្វាគមន៍​មកកាន់ Weë',
  welcomeSubtitle: 'ប្រាប់​យើង​ថា​អ្នក​ជា​នរណា។ បន្ទាប់មក អ្នក​អាច​បង្កើត​ប្រវត្តិរូប Weë របស់អ្នក៖ អត្តសញ្ញាណ​របស់អ្នក​សម្រាប់​បង្កើត​ជាមួយ AI។',
  yourName: 'ឈ្មោះ​របស់អ្នក',
  yourNameHint: 'ឈ្មោះ​នេះ​នឹង​បង្ហាញ​នៅលើ​ប្រវត្តិរូប​សាធារណៈ​របស់អ្នក។',
  yourNamePlaceholder: 'ឈ្មោះ​ពេញ​របស់អ្នក',
  birthDate: 'ថ្ងៃខែឆ្នាំ​កំណើត',
  birthDateHint: 'Weë មាន​សម្រាប់​តែ​មនុស្ស​ដែល​មាន​អាយុ {{edad}} ឆ្នាំ​ឡើង​ទៅ​ប៉ុណ្ណោះ។',
  gender: 'ភេទ',
  genderMale: 'ប្រុស',
  genderFemale: 'ស្រី',
  genderOther: 'ផ្សេងទៀត',
  country: 'ប្រទេស',
  pickCountry: 'ជ្រើសរើស​ប្រទេស​របស់អ្នក',
  searchCountry: 'ស្វែងរក​ប្រទេស...',
  customiseProfile: 'ប្ដូរ​ប្រវត្តិរូប​តាម​បំណង',
  yourAvatar: 'រូបតំណាង​របស់អ្នក',
  yourAvatarHint: 'ចុច​ដើម្បី​ជ្រើសរើស​រូបតំណាង​ដែល​មាន​ស្រាប់ ឬ​បង្ហោះ​ឡើង​រូបភាព​ផ្ទាល់ខ្លួន',
  bioPlaceholder: 'ប្រាប់​យើង​អំពី​អ្នក... (ជា​ជម្រើស)',
  saving: 'កំពុង​រក្សាទុក...',
  completed: 'បាន​បញ្ចប់!',
  complete: 'បញ្ចប់',
  continueStep: 'បន្ត',
  nameMissingTitle: 'ខ្វះ​ឈ្មោះ​របស់អ្នក',
  nameMissing: 'វាយ​ឈ្មោះ​របស់អ្នក​ដើម្បី​បន្ត។',
  nameShortTitle: 'ឈ្មោះ​ខ្លីពេក',
  nameShort: 'ឈ្មោះ​របស់អ្នក​ត្រូវ​មាន​យ៉ាងតិច 2 តួអក្សរ។',
  birthMissingTitle: 'ខ្វះ​ថ្ងៃខែឆ្នាំ​កំណើត',
  birthMissing: 'ជ្រើសរើស​ថ្ងៃ ខែ និង​ឆ្នាំ។',
  underAgeTitle: 'អាយុ​អប្បបរមា៖ {{edad}} ឆ្នាំ',
  birthInvalidTitle: 'កាលបរិច្ឆេទ​មិន​ត្រឹមត្រូវ',
  birthInvalid: 'កាលបរិច្ឆេទ​នេះ​មិន​មាន​ក្នុង​ប្រតិទិន​ទេ។',
  genderMissingTitle: 'ខ្វះ​ភេទ​របស់អ្នក',
  genderMissing: 'ជ្រើសរើស​ជម្រើស​មួយ​ដើម្បី​បន្ត។',
  countryMissingTitle: 'ខ្វះ​ប្រទេស​របស់អ្នក',
  countryMissing: 'ជ្រើសរើស​ប្រទេស​របស់អ្នក​ដើម្បី​បន្ត។',
  saveFailedTitle: 'យើង​មិនអាច​រក្សាទុក​ប្រវត្តិរូប​របស់អ្នក​បានទេ',
  saveFailed: 'សូម​ព្យាយាម​ម្តងទៀត។',
  weeTitle: 'បង្កើត​ប្រវត្តិរូប Weë',
  weeIntro: 'ប្រវត្តិរូប​នេះ​ឯករាជ្យ​ពី​អត្តសញ្ញាណ​ពិត​របស់អ្នក។ សារបង្ហោះ​និង​សកម្មភាព​ដែល​អ្នក​ធ្វើ​ជាមួយ Weë នឹង​មិន​ភ្ជាប់​ទៅ​ប្រវត្តិរូប​ចម្បង​របស់អ្នក​ទេ។',
  weePhoto: 'រូបថត​ប្រវត្តិរូប',
  weePhotoHint: 'ចុច​ដើម្បី​ជ្រើសរើស​រូបថត ឬ​រូបតំណាង​ដែល​មាន​ស្រាប់',
  weeName: 'ឈ្មោះ​អនាមិក',
  weeNamePlaceholder: 'ឧ. ស្រមោលងងឹត, Anon123...',
  weeBioPlaceholder: 'ពិពណ៌នា​អំពី​អត្តសញ្ញាណ​ទីពីរ​របស់អ្នក...',
  weeCreatedTitle: 'បាន​បង្កើត​ប្រវត្តិរូប Weë',
  weeCreated: 'អត្តសញ្ញាណ​អនាមិក​របស់អ្នក​រួចរាល់​ហើយ។ អ្នក​អាច​ប្តូរ​រវាង​ប្រវត្តិរូប​ពី​ផ្នែក​ខាងលើ​នៃ​អេក្រង់។',
  weeCreateFailed: 'មិនអាច​បង្កើត​ប្រវត្តិរូប Weë បានទេ',
  birthDay: 'ថ្ងៃ',
  birthMonth: 'ខែ',
  birthYear: 'ឆ្នាំ',
  stepOf: 'ជំហាន {{paso}} នៃ {{total}}',
  customiseProfileHint: 'ជ្រើសរើស​រូបតំណាង និង​បន្ថែម​ការពិពណ៌នា (ជា​ជម្រើស)',
  bioLabel: 'ការពិពណ៌នា (ជា​ជម្រើស)',
  weeNameCounter: '{{usados}}/{{maximo}} - យ៉ាងតិច {{minimo}} តួអក្សរ',
  weeBio: 'ប្រវត្តិសង្ខេប (ជា​ជម្រើស)',
};
