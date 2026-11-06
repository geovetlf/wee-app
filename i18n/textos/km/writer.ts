/*
 * JEMER — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «សំនៀង» = tono (del texto). El jemer no tiene plural: las dos formas del contador son idénticas.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'សុំ​ឱ្យ Weë ជួយ',
  writeSomethingFirst: 'សរសេរ​អ្វីមួយ​ជាមុនសិន',
  writeSomethingHint: 'សរសេរ​អ្វីមួយ​ជាមុនសិន ហើយ Weë នឹង​ធ្វើការ​លើវា​ជាមួយ​អ្នក។',
  save: 'រក្សាទុក',
  saving: 'កំពុង​រក្សាទុក…',
  deleteDocument: 'លុប​ឯកសារ',
  improve: 'កែលម្អ',
  improveGoal: 'កែលម្អ​អត្ថបទ​នេះ',
  shorten: 'បង្រួម',
  shortenGoal: 'បង្រួម​អត្ថបទ​នេះ​ដោយ​មិន​បាត់បង់​ចំណុច​សំខាន់',
  expand: 'ពង្រីក',
  expandGoal: 'ពង្រីក​អត្ថបទ​នេះ​បន្ថែមទៀត',
  fix: 'កែតម្រូវ',
  fixGoal: 'កែតម្រូវ​អក្ខរាវិរុទ្ធ​និង​រចនាប័ទ្ម​នៃ​អត្ថបទ​នេះ',
  tone: 'ប្តូរ​សំនៀង',
  toneGoal: 'សរសេរ​អត្ថបទ​នេះ​ឡើងវិញ​ដោយ​សំនៀង​ផ្សេង',
  summarize: 'សង្ខេប',
  summarizeGoal: 'សង្ខេប​អត្ថបទ​នេះ​ជា​គំនិត​សំខាន់ៗ',
  translate: 'បកប្រែ',
  translateGoal: 'បកប្រែ​អត្ថបទ​នេះ',
  words_one: '{{contador}} ពាក្យ',
  words_other: '{{contador}} ពាក្យ',
  savedInDocuments: ' · បាន​រក្សាទុក​ក្នុង​ឯកសារ​របស់ខ្ញុំ',
  couldNotSaveToDocuments: 'មិនអាច​រក្សាទុក​ក្នុង​ឯកសារ​របស់ខ្ញុំ​បានទេ',
  myDocuments: 'ឯកសារ​របស់ខ្ញុំ',
  newDocument: 'ឯកសារ​ថ្មី',
  noDocumentsYet: 'អ្នក​មិនទាន់​មាន​ឯកសារ​នៅឡើយទេ។ សរសេរ​ថ្មី​មួយ ឬ​សុំ​ឱ្យ Weë ចាប់ផ្តើម​ជំនួស​អ្នក។',
  editedWhen: 'បាន​កែសម្រួល {{cuando}}',
  titleLabel: 'ចំណងជើង​ឯកសារ',
  bodyLabel: 'អត្ថបទ​ឯកសារ',
  editorTitle: '✍️ កម្មវិធី​កែសម្រួល',
  docTitlePlaceholder: 'ចំណងជើង​ឯកសារ',
  bodyPlaceholder: 'សរសេរ​នៅទីនេះ។ ពេលណា​អ្នក​ចង់ សុំ​ឱ្យ Weë កែលម្អ កែតម្រូវ ឬ​បកប្រែ​វា។',
  resultHint: 'Weë ធ្វើការ​លើ​អ្វី​ដែល​អ្នក​សរសេរ ហើយ​ផ្តល់​លទ្ធផល​មកវិញ​នៅទីនេះ រួចរាល់​សម្រាប់​កែសម្រួល​បន្ត។',
  weeWorksWithYou: 'Weë ធ្វើការ​លើវា​ជាមួយ​អ្នក។',
  saved: '✓ បាន​រក្សាទុក',
};
