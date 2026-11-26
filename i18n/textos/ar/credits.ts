/*
 * ÁRABE — Credits: saldo, recarga e historial. Tipado contra el español.
 *
 * «Credits» es marca y no se traduce ni se translitera (nunca «كريدت»); se
 * trata como sustantivo plural («Credits المتاحة», «رصيد Credits»). Las
 * flechas de «Ver historial →» apuntan a la izquierda («←»), que es «hacia
 * delante» en una interfaz RTL.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits المتاحة',
  yourBalance: 'رصيدك',
  currentBalance: 'الرصيد الحالي',
  free: 'مجانًا',
  testTopUp: 'شحن تجريبي',
  testTopUpReady: 'الشحن التجريبي جاهز',
  testPrices: 'أسعار تجريبية أثناء بناء Weë AI',
  topUp: 'شحن الرصيد',
  seeHistory: 'عرض السجل ←',
  seeHistoryLabel: 'عرض السجل',
  history: 'السجل',
  myWallet: 'محفظتي',
  earned: 'المكتسبة',
  spent: 'المستخدمة',
  noMovements: 'لا توجد حركات بعد',
  testTopUpDone: 'تمت إضافة {{cantidad}} Credits إلى حسابك. هذا شحن تجريبي: لم يُخصم أي مبلغ.',
  balanceAfter: 'الرصيد: {{saldo}}',
  topUpFailed: 'تعذّر إتمام الشحن. يُرجى المحاولة مرة أخرى.',
  terms: 'شحن تجريبي: لا يُخصم أي مبلغ حتى الآن. ستُعلن الأسعار النهائية عندما يستخدم Weë AI نماذج الذكاء الاصطناعي الحقيقية؛ وحتى ذلك الحين، يعرض كل إبداع تكلفته التجريبية قبل البدء.',
  youHaveLabel: 'لديك {{saldo}} Credits',
  topUpButton: 'شحن {{cantidad}} Credits · تجريبي',
  txPurchase: 'شراء Credits',
  txGrant: 'Credits مستلمة',
  txRefund: 'استرداد',
  txUsage: 'استخدام Credits',
  txRefunded: 'تم الاسترداد',
  txPending: 'قيد المعالجة',
  purchasesComingSoon: 'ستتوفر عمليات شراء Credits قريبًا. لا يمكن إجراء عمليات شحن هنا حاليًا.',
  topUpFailedTitle: 'عذرًا',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'كم تريد من Credits؟',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'شراء {{cantidad}} Credits · {{precio}}',
  buyLess: 'أقل',
  buyMore: 'أكثر',
  buyNoticeTitle: 'لم يتم ربط المدفوعات بعد',
  buyNoticeBody: 'لم يُخصم أي مبلغ وبقي رصيدك كما هو.',
  buyChecking: 'جارٍ التحقق من المتجر…',
  buyCatalogError: 'تعذّر الاتصال بالمتجر. انقر لإعادة المحاولة.',
  buyMarketUnavailable: 'المدفوعات بهذه العملة غير متاحة بعد. لم يُخصم أي مبلغ.',
  historyLoading: 'جارٍ تحميل الحركات…',
  historyError: 'تعذّر تحميل السجل.',
  historyRetry: 'إعادة المحاولة',
};
