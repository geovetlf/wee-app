/*
 * WEË FILMMAKER — "Customize voice and sounds". Typed against Spanish: a missing key does not compile.
 */
import { ConPlurales } from './plurales';

export const filmmakerSonido: ConPlurales<typeof import('../es/filmmakerSonido').filmmakerSonido> = {
  title: 'تخصيص الصوت والمؤثرات',
  subCharacter: 'ستستخدم كل مشاهده هذا الصوت. يمكنك تغييره مشهدًا بمشهد.',
  subScene: 'يستخدم هذا المشهد صوت الشخصية. غيّره هنا فقط إن أردت.',
  subShot: 'يستخدم هذا اللقطة صوت مشهدها. غيّره هنا فقط إن أردت.',
  forName: 'من أجل {{nombre}}',

  layerVoice: 'الصوت',
  layerMusic: 'الموسيقى',
  layerEffects: 'المؤثرات الصوتية',

  voiceAuto: 'Weë تتولى الأمر عني',
  voiceAutoNote: 'Weë تختار الصوت الأنسب.',
  voiceInherit: 'استخدم صوت {{origen}}',
  voiceInheritNow: 'يبدو مثل: {{voz}}',
  originCharacter: 'الشخصية',
  originScene: 'المشهد',
  originAuto: 'Weë',
  selected: 'مختار',

  filterLanguage: 'اللغة',
  filterTone: 'النبرة',
  filterAll: 'الكل',
  langEs: 'الإسبانية',
  langEn: 'الإنجليزية',
  langPt: 'البرتغالية',
  langFr: 'الفرنسية',
  toneWarm: 'دافئ',
  toneDeep: 'عميق',
  toneClear: 'واضح',
  toneSoft: 'ناعم',
  toneNarrator: 'راوٍ',
  voiceCount_zero: 'لا أصوات',
  voiceCount_one: 'صوت واحد',
  voiceCount_two: 'صوتان',
  voiceCount_few: '{{contador}} أصوات',
  voiceCount_many: '{{contador}} صوتًا',
  voiceCount_other: '{{contador}} صوت',
  noMatch: 'لا يوجد صوت يطابق هذه اللغة والنبرة.',
  clearFilters: 'مسح التصفية',

  exampleTag: 'مثال',
  exampleNote: 'هذه الأصوات أمثلة: الكتالوج الحقيقي لم يصل إلى التطبيق بعد.',
  sampleListen: 'استمع إلى عيّنة من {{voz}}',
  sampleClosed: 'مغلق: الاستماع إلى عيّنة يستهلك Credits وسعره قيد التأكيد.',

  uploadTitle: 'رفع ملف بنبرة صوت',
  uploadClosed: 'مغلق حتى يُسمح برفع الصوت واستخدام صوتك بموافقتك. Weë لا تستنسخ الأصوات حاليًا.',
  musicClosed: 'مغلق: Weë Music غير متصلة بعد.',
  effectsClosed: 'مغلق: المؤثرات الصوتية بلا مزوّد ولا سعر مقاس بعد.',

  priceTitle: 'السعر',
  priceUnknown: 'السعر قيد التأكيد',
  priceNote: 'ستظهر التكلفة بـ Credits هنا عند قياسها.',
  done: 'تم',
};
