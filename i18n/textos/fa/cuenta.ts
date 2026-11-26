/*
 * PERSA — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = حذف, la misma palabra que el botón «Eliminar» (common.delete); el persa no tiene mayúsculas. Sin cifras escritas a mano.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'حذف حساب',
  sectionDanger: 'منطقهٔ خطر',
  title: 'حذف حساب',
  goesFaces: 'همهٔ پروفایل‌های شما: پروفایل واقعی و آلتر ایگوهای شما',
  goesCharacter: 'کاراکتر شما و آواتارش',
  goesPosts: 'پست‌ها، نظرها و واکنش‌های شما',
  goesMessages: 'پیام‌های شما در WeeTalk: خالی می‌شوند و گفت‌وگوی طرف مقابل بدون آن‌ها می‌ماند',
  goesCreations: 'آثار، پروژه‌ها و گفت‌وگوهای شما در Weë AI',
  goesContacts: 'مخاطبان، انجمن‌ها و ذخیره‌شده‌های شما',
  goesCredits: 'Credits باقی‌مانده: از بین می‌روند و بازگردانده نمی‌شوند',
  whatStaysTitle: 'چه چیزهایی می‌ماند',
  staysRecords: 'سوابق حسابداری Credits و پرداخت‌ها. این سوابق بدون نام شما و اطلاعات پروفایلتان نگه داشته می‌شوند، چون حسابداری Weë هستند.',
  confirmLabel: 'برای تأیید، «{{palabra}}» را بنویسید',
  confirmWord: 'حذف',
  confirmPlaceholder: 'کلمه را اینجا بنویسید',
  dialogTitle: 'حساب شما حذف شود؟',
  dialogConfirm: 'حذف',
  doneTitle: 'حساب شما حذف شد',
  doneBody: 'ممنون که بخشی از Weë بودید.',
  reauthTitle: 'دوباره وارد شوید',
  reauthBody: 'برای امنیت شما، برای حذف حساب باید به‌تازگی وارد شده باشید. از حساب خارج شوید، دوباره وارد شوید و این مراحل را تکرار کنید.',
  reauthButton: 'خروج برای ورود دوباره',
  errorTitle: 'کار تمام نشد',
  errorBody: 'در میانهٔ کار مشکلی پیش آمد. دوباره امتحان کنید: از همان‌جا که مانده بود ادامه پیدا می‌کند.',
  retry: 'تلاش دوباره',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'غیرفعال می‌شود و پس از 30 روز همه‌چیز پاک می‌شود',
  introDesactivar: 'حساب شما همین حالا غیرفعال می‌شود و اگر ظرف 30 روز برنگردید، همه‌چیز برای همیشه پاک می‌شود.',
  nowTitle: 'حالا چه می‌شود',
  nowHidden: 'حساب شما دیگر دیده نمی‌شود: هیچ‌کس پروفایل‌ها و پست‌های شما را نمی‌بیند',
  nowCharacterOff: 'خودمختاری کاراکتر شما خاموش می‌شود و دیگر هزینه‌ای کسر نمی‌کند',
  nowComeBack_one: '{{contador}} روز برای برگشتن فرصت دارید: دوباره وارد شوید و «فعال‌سازی حساب» را انتخاب کنید',
  nowComeBack_other: '{{contador}} روز برای برگشتن فرصت دارید: دوباره وارد شوید و «فعال‌سازی حساب» را انتخاب کنید',
  whatGoesLaterTitle: 'اگر برنگردید، چه چیزهایی پاک می‌شود',
  deactivateButton: 'حذف حسابم',
  dialogBodyDesactivar: 'حساب شما دیگر دیده نمی‌شود. اگر ظرف 30 روز برنگردید، همه‌چیز پاک می‌شود و دیگر نمی‌توانید آن را برگردانید.',
  deactivating: 'در حال غیرفعال کردن حساب شما…',
  deactivatedTitle: 'حساب شما غیرفعال است',
  deactivatedBody: 'تا {{fecha}} برای برگشتن فرصت دارید. پس از آن همه‌چیز برای همیشه پاک می‌شود.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'حساب شما غیرفعال است',
  activarBody: 'درخواست حذف حسابتان را داده‌اید. تا وقتی غیرفعال است، هیچ‌کس پروفایل‌ها و پست‌های شما را نمی‌بیند.',
  activarDaysLeft_one: '{{contador}} روز تا حذف همیشگی مانده است',
  activarDaysLeft_other: '{{contador}} روز تا حذف همیشگی مانده است',
  activarDate: 'اگر فعالش نکنید، در {{fecha}} برای همیشه پاک می‌شود.',
  activarCharacterNote: 'خودمختاری کاراکترتان خاموش می‌ماند؛ هر وقت بخواهید می‌توانید دوباره برنامه‌ریزی‌اش کنید.',
  activarButton: 'فعال‌سازی حساب',
  activating: 'در حال فعال کردن حساب شما…',
  activatedTitle: 'حساب شما دوباره فعال است',
  activarExpiredTitle: 'مهلت برگشتن تمام شد',
  activarExpiredBody: 'حساب شما در چند ساعت آینده کاملاً پاک می‌شود.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits باقی‌مانده: از بین می‌روند و بازگردانده نمی‌شوند',
};
