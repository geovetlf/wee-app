/*
 * JEMER — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (glosario § 4): រក្សាទុក, លុប, បោះបង់,
 * បិទ, ត្រឡប់, បន្ទាប់, ផ្ញើ, ចែករំលែក. `accept` = «យល់ព្រម» (el botón único de los avisos).
 * `yes`/`no` = «បាទ/ចាស» / «ទេ», la pareja habitual de las interfaces jemeres. «ប៉ុស្តិ៍» es
 * invariable y el jemer no tiene plural: las dos formas del contador son idénticas.
 * Entre palabras va ZWSP (U+200B) para que el navegador pueda cortar línea.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'បោះបង់',
  save: 'រក្សាទុក',
  delete: 'លុប',
  close: 'បិទ',
  back: 'ត្រឡប់',
  next: 'បន្ទាប់',
  done: 'រួចរាល់',
  accept: 'យល់ព្រម',
  send: 'ផ្ញើ',
  share: 'ចែករំលែក',
  retry: 'ព្យាយាម​ម្តង​ទៀត',
  mediaUnavailable: 'ឯកសារ​នេះ​មិន​អាច​ប្រើ​បាន​ទេ',
  loading: 'កំពុង​ផ្ទុក…',
  error: 'កំហុស',
  somethingWentWrong: 'មាន​អ្វីមួយ​ខុសប្រក្រតី',
  noResults: 'គ្មាន​លទ្ធផល',
  notAvailable: 'មិនមាន',
  comingSoon: 'មកដល់​ឆាប់ៗនេះ',
  new: 'ថ្មី',
  seeAll: 'មើល​ទាំងអស់ →',
  guest: 'ភ្ញៀវ',
  anonymousUser: 'អ្នកប្រើ​អនាមិក',
  user: 'អ្នកប្រើ',
  yes: 'បាទ/ចាស',
  no: 'ទេ',
  loadMore: 'ផ្ទុក​សារបង្ហោះ​បន្ថែម',
  postsCount_one: '{{cantidad}} សារបង្ហោះ',
  postsCount_other: '{{cantidad}} សារបង្ហោះ',
  someone: 'នរណាម្នាក់',
};
