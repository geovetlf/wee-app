/*
 * HEBREO — Credits: el saldo, la recarga y el historial. «Credits» es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Recarga» es «טעינה» (lo que dicen las apps de pago israelíes); «de prueba» es «ניסיון». El
 * artículo con la marca va con guion («ה-Credits»; «ב-Credits»; «כש-Weë AI»). Weë AI es femenino
 * cuando hace de sujeto, como Weë en el resto del diccionario.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits זמינים',
  yourBalance: 'היתרה שלך',
  currentBalance: 'יתרה נוכחית',
  free: 'חינם',
  testTopUp: 'טעינת ניסיון',
  testTopUpReady: 'טעינת הניסיון מוכנה',
  testPrices: 'מחירי ניסיון בזמן שאנחנו בונים את Weë AI',
  topUp: 'טעינה',
  seeHistory: 'הצגת ההיסטוריה ←',
  seeHistoryLabel: 'הצגת ההיסטוריה',
  history: 'היסטוריה',
  myWallet: 'הארנק שלי',
  earned: 'התקבלו',
  spent: 'נוצלו',
  noMovements: 'עדיין אין תנועות',
  testTopUpDone: '{{cantidad}} Credits נוספו לחשבון שלך. זו טעינת ניסיון: לא חויב דבר.',
  balanceAfter: 'יתרה: {{saldo}}',
  topUpFailed: 'לא ניתן היה להשלים את הטעינה. כדאי לנסות שוב.',
  terms: 'טעינת ניסיון: עדיין לא מחייבים דבר. המחירים הסופיים יגיעו כש-Weë AI יעבוד עם הבינה המלאכותית האמיתית; בינתיים כל יצירה מציגה את מחיר הניסיון שלה לפני שמתחילים.',
  youHaveLabel: 'יש לך {{saldo}} Credits',
  topUpButton: 'טעינת {{cantidad}} Credits · ניסיון',
  txPurchase: 'רכישת Credits',
  txGrant: 'Credits שהתקבלו',
  txRefund: 'החזר',
  txUsage: 'שימוש ב-Credits',
  txRefunded: 'הוחזר',
  txPending: 'בתהליך',
  purchasesComingSoon: 'רכישת Credits תגיע בקרוב. בינתיים אי אפשר לבצע טעינות כאן.',
  topUpFailedTitle: 'אופס',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'כמה Credits רוצים?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'רכישת {{cantidad}} Credits · {{precio}}',
  buyLess: 'פחות',
  buyMore: 'יותר',
  buyNoticeTitle: 'התשלומים עדיין לא מחוברים',
  buyNoticeBody: 'שום דבר לא חויב והיתרה שלך לא השתנתה.',
  buyChecking: 'בודקים את החנות…',
  buyCatalogError: 'לא הצלחנו להתחבר לחנות. אפשר להקיש כדי לנסות שוב.',
  buyMarketUnavailable: 'תשלומים במטבע הזה עדיין לא זמינים. שום דבר לא חויב.',
  historyLoading: 'טוענים תנועות…',
  historyError: 'לא הצלחנו לטעון את ההיסטוריה.',
  historyRetry: 'ניסיון נוסף',
};
