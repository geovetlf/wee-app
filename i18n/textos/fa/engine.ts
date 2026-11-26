/*
 * PERSA — El panel del WEË AI ENGINE (Configuración → Weë AI Engine), solo
 * administración. Los ids de proveedor y modelo, las capacidades, las
 * colecciones de Firestore, `engineAdmin` y los nombres de los proveedores se
 * copian tal cual. Tipado contra el español.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'به‌روزرسانی',
  statusFailed: 'نتوانستم وضعیت engine را بخوانم. آیا سرور روشن است؟',
  changeFailed: 'تغییر اعمال نشد',

  adminOnly: 'فقط مدیریت',
  adminOnlyNote: 'این پنل برای تیم Weë است. اگر عضو تیم هستید، بخواهید حساب شما را به‌عنوان مدیر اضافه کنند.',

  settingsTitle: 'تنظیمات',
  settingsLine: 'قیمت‌ها: {{precios}} · {{credits}} Credits به ازای هر دلار · حاشیه سود {{margen}} ٪ · سیاست {{politica}} · حالت نمایشی به‌عنوان آخرین راه: {{demo}}',
  pricesTest: 'آزمایشی',
  pricesReal: 'واقعی',
  yes: 'بله',
  no: 'خیر',
  configFrom: 'پیکربندی از {{origen}} خوانده شد.',
  sourceDefaults: 'مقادیر پیش‌فرض کد',
  resetHealth: 'بازنشانی سلامت',
  healthReset: 'سلامت بازنشانی شد.',
  seedDone: 'مقادیر پیش‌فرض در Firestore ذخیره شد.',

  providers: 'ارائه‌دهندگان',
  priority: 'اولویت {{numero}}',
  enable: 'فعال کردن {{proveedor}}',
  disable: 'غیرفعال کردن {{proveedor}}',
  withKey: 'با کلید',
  withoutKey: 'بدون کلید',
  active: 'فعال',
  inactive: 'غیرفعال',
  pausedByFailures: 'به دلیل خطاها متوقف شده',
  recentFailures_one: '{{contador}} خطای اخیر',
  recentFailures_other: '{{contador}} خطای اخیر',
  modelLine: '• {{id}} · کیفیت {{calidad}}/5 · سرعت {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · تا {{segundos}} ثانیه',
  pendingVerification: ' · در انتظار تأیید',

  chains: 'زنجیره‌های پشتیبان',
  policyLabel: 'سیاست {{capacidad}}: {{politica}}',
  onlyDemo: 'فقط حالت نمایشی (هنوز ارائه‌دهنده واقعی ندارد)',
  editNote: 'برای تغییر ترتیب یک زنجیره یا ثابت کردن یک مدل، aiRouting/{{capacidad}} را در Firestore ویرایش کنید یا از engineAdmin · setRouting استفاده کنید.',

  policyQualityFirst: 'اول کیفیت',
  policyBalanced: 'متعادل',
  policyCostFirst: 'اول هزینه',

  modalityText: 'متن',
  modalityVision: 'بینایی',
  modalityImage: 'تصویر',
  modalityVideo: 'ویدیو',
  modalityVoice: 'صدا',
  modalityMusic: 'موسیقی',
  modalityDoc: 'اسناد',
  rowSubtitle: 'ارائه‌دهندگان، زنجیره‌های پشتیبان و تنظیمات (فقط مدیریت)',
};
