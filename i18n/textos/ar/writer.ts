/*
 * ÁRABE — Weë Writer, dentro de Weë Studio. Tipado contra el español.
 *
 * El texto que escribe la persona nunca pasa por aquí: solo las herramientas.
 * Los botones son sustantivos de acción (تحسين، اختصار، تصحيح…). `words`
 * cuenta palabras y tiene las seis formas: por eso `ConPlurales`.
 */
import { ConPlurales } from './plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'اطلب من Weë',
  writeSomethingFirst: 'اكتب شيئًا أولًا',
  writeSomethingHint: 'اكتب شيئًا أولًا وسيعمل Weë عليه معك.',
  save: 'حفظ',
  saving: 'جارٍ الحفظ…',
  deleteDocument: 'حذف المستند',
  improve: 'تحسين',
  improveGoal: 'تحسين هذا النص',
  shorten: 'اختصار',
  shortenGoal: 'اختصار هذا النص دون فقدان المهم',
  expand: 'توسيع',
  expandGoal: 'توسيع هذا النص أكثر',
  fix: 'تصحيح',
  fixGoal: 'تصحيح الإملاء والأسلوب في هذا النص',
  tone: 'تغيير النبرة',
  toneGoal: 'إعادة كتابة هذا النص بنبرة مختلفة',
  summarize: 'تلخيص',
  summarizeGoal: 'تلخيص هذا النص في أفكار رئيسية',
  translate: 'ترجمة',
  translateGoal: 'ترجمة هذا النص',
  words_zero: 'لا كلمات',
  words_one: 'كلمة واحدة',
  words_two: 'كلمتان',
  words_few: '{{contador}} كلمات',
  words_many: '{{contador}} كلمةً',
  words_other: '{{contador}} كلمة',
  savedInDocuments: ' · محفوظ في مستنداتي',
  couldNotSaveToDocuments: 'تعذّر الحفظ في مستنداتي',
  myDocuments: 'مستنداتي',
  newDocument: 'مستند جديد',
  noDocumentsYet: 'ليس لديك مستندات بعد. اكتب مستندًا جديدًا أو اطلب من Weë أن يبدأ نيابةً عنك.',
  editedWhen: 'عُدّل {{cuando}}',
  titleLabel: 'عنوان المستند',
  bodyLabel: 'نص المستند',
  editorTitle: '✍️ المحرر',
  docTitlePlaceholder: 'عنوان المستند',
  bodyPlaceholder: 'اكتب هنا. متى شئت، اطلب من Weë تحسينه أو تصحيحه أو ترجمته.',
  resultHint: 'يعمل Weë على ما كتبته ويعيد إليك النتيجة هنا، جاهزة لمواصلة التحرير.',
  weeWorksWithYou: 'يعمل Weë عليه معك.',
  saved: '✓ تم الحفظ',
};
