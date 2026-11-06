/*
 * ÁRABE — el panel del WEË AI ENGINE (Configuración → Weë AI Engine), solo
 * administración. Tipado contra el español.
 *
 * Los identificadores del motor —ids de proveedor y de modelo, capacidades,
 * colecciones de Firestore, `engineAdmin`, Gemini/Seedance/ElevenLabs— se
 * copian tal cual. `recentFailures` cuenta cosas y en árabe eso son seis
 * formas: por eso `ConPlurales`. «fallback» se dice «احتياط».
 */
import { ConPlurales } from './plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'تحديث',
  statusFailed: 'تعذّرت قراءة حالة المحرك. هل الخادم يعمل؟',
  changeFailed: 'تعذّر تطبيق التغيير',

  adminOnly: 'للإدارة فقط',
  adminOnlyNote: 'هذه اللوحة مخصصة لفريق Weë. إن كنت من أعضاء الفريق، فاطلب إضافة حسابك كمسؤول.',

  settingsTitle: 'الإعدادات',
  settingsLine: 'الأسعار: {{precios}} · {{credits}} Credits لكل دولار أمريكي · الهامش {{margen}} % · السياسة {{politica}} · الوضع التجريبي كملاذ أخير: {{demo}}',
  pricesTest: 'تجريبية',
  pricesReal: 'حقيقية',
  yes: 'نعم',
  no: 'لا',
  configFrom: 'تمت قراءة الإعدادات من {{origen}}.',
  sourceDefaults: 'القيم الافتراضية في الكود',
  resetHealth: 'إعادة ضبط الحالة الصحية',
  healthReset: 'تمت إعادة ضبط الحالة الصحية.',
  seedDone: 'تم حفظ القيم الافتراضية في Firestore.',

  providers: 'مزوّدو الخدمة',
  priority: 'الأولوية {{numero}}',
  enable: 'تفعيل {{proveedor}}',
  disable: 'تعطيل {{proveedor}}',
  withKey: 'بمفتاح',
  withoutKey: 'بدون مفتاح',
  active: 'نشط',
  inactive: 'غير نشط',
  pausedByFailures: 'متوقف مؤقتًا بسبب الأعطال',
  recentFailures_zero: 'لا أعطال حديثة',
  recentFailures_one: 'عطل واحد حديث',
  recentFailures_two: 'عطلان حديثان',
  recentFailures_few: '{{contador}} أعطال حديثة',
  recentFailures_many: '{{contador}} عطلًا حديثًا',
  recentFailures_other: '{{contador}} عطل حديث',
  modelLine: '• {{id}} · الجودة {{calidad}}/5 · السرعة {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · حتى {{segundos}} ث',
  pendingVerification: ' · بانتظار التحقق',

  chains: 'سلاسل الاحتياط',
  policyLabel: 'سياسة {{capacidad}}: {{politica}}',
  onlyDemo: 'الوضع التجريبي فقط (لا يوجد مزوّد حقيقي بعد)',
  editNote: 'لتغيير ترتيب سلسلة أو تثبيت نموذج، عدّل aiRouting/{{capacidad}} في Firestore أو استخدم engineAdmin · setRouting.',

  policyQualityFirst: 'الجودة أولًا',
  policyBalanced: 'متوازن',
  policyCostFirst: 'التكلفة أولًا',

  modalityText: 'نص',
  modalityVision: 'رؤية',
  modalityImage: 'صورة',
  modalityVideo: 'فيديو',
  modalityVoice: 'صوت',
  modalityMusic: 'موسيقى',
  modalityDoc: 'مستندات',
  rowSubtitle: 'مزوّدو الخدمة وسلاسل الاحتياط والإعدادات (للإدارة فقط)',
};
