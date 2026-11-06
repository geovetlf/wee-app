/*
 * HEBREO — el alta guiada y la creación del Perfil Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: «Perfil Weë» es «פרופיל Weë» y «Perfil Real» «הפרופיל האמיתי»
 * (glosario § 6). Las instrucciones son impersonales («יש להזין», «יש לבחור»,
 * «אפשר לעבור») y los botones sustantivos de acción (המשך, סיום). «שלך»,
 * «עליך» y «משלך» se leen igual para los dos géneros sin niqud. «Hombre /
 * Mujer / Otro» → «גבר / אישה / אחר». «Avatar» es «אווטאר» (préstamo). «Debes
 * tener al menos 13 años» se dice «השימוש ב-Weë מגיל 13 ומעלה», sin tutear.
 * El ejemplo «SombraOscura» se traduce («צלאפל») y «Anon123» queda en latino.
 * «Opcional» es «לא חובה». «Header» (la cabecera de la app) es «הכותרת העליונה».
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'ברוכים הבאים ל-Weë',
  welcomeSubtitle: 'כמה פרטים עליך. אחר כך אפשר ליצור פרופיל Weë: הזהות שלך ליצירה עם AI.',
  yourName: 'השם שלך',
  yourNameHint: 'השם הזה יוצג בפרופיל הציבורי שלך.',
  yourNamePlaceholder: 'השם המלא שלך',
  birthDate: 'תאריך לידה',
  birthDateHint: 'השימוש ב-Weë מגיל 13 ומעלה.',
  gender: 'מגדר',
  genderMale: 'גבר',
  genderFemale: 'אישה',
  genderOther: 'אחר',
  country: 'מדינה',
  pickCountry: 'בחירת המדינה שלך',
  searchCountry: 'חיפוש מדינה...',
  customiseProfile: 'התאמה אישית של הפרופיל',
  yourAvatar: 'האווטאר שלך',
  yourAvatarHint: 'הקשה כדי לבחור אווטאר מוכן או להעלות תמונה משלך',
  bioPlaceholder: 'כמה מילים עליך... (לא חובה)',
  saving: 'שומרים...',
  completed: 'הושלם!',
  complete: 'סיום',
  continueStep: 'המשך',
  nameMissingTitle: 'חסר שם',
  nameMissing: 'יש להזין שם כדי להמשיך.',
  nameShortTitle: 'השם קצר מדי',
  nameShort: 'השם צריך לכלול לפחות 2 אותיות.',
  birthMissingTitle: 'חסר תאריך לידה',
  birthMissing: 'יש לבחור יום, חודש ושנה.',
  genderMissingTitle: 'חסר מגדר',
  genderMissing: 'יש לבחור אפשרות כדי להמשיך.',
  countryMissingTitle: 'חסרה מדינה',
  countryMissing: 'יש לבחור מדינה כדי להמשיך.',
  saveFailedTitle: 'לא הצלחנו לשמור את הפרופיל',
  saveFailed: 'כדאי לנסות שוב.',
  weeTitle: 'יצירת פרופיל Weë',
  weeIntro: 'הפרופיל הזה נפרד מהזהות האמיתית שלך. הפוסטים והפעולות שנעשים איתו ב-Weë לא יקושרו לפרופיל הראשי שלך.',
  weePhoto: 'תמונת פרופיל',
  weePhotoHint: 'הקשה כדי לבחור תמונה או אווטאר מוכן',
  weeName: 'שם אנונימי',
  weeNamePlaceholder: 'לדוגמה: צלאפל, Anon123...',
  weeBioPlaceholder: 'תיאור האלטר אגו שלך...',
  weeCreatedTitle: 'פרופיל Weë נוצר',
  weeCreated: 'הזהות האנונימית שלך מוכנה. אפשר לעבור בין הפרופילים מהכותרת העליונה.',
  weeCreateFailed: 'לא הצלחנו ליצור את פרופיל Weë',
  birthDay: 'יום',
  birthMonth: 'חודש',
  birthYear: 'שנה',
  stepOf: 'שלב {{paso}} מתוך {{total}}',
  customiseProfileHint: 'בחירת אווטאר והוספת תיאור (לא חובה)',
  bioLabel: 'תיאור (לא חובה)',
  weeNameCounter: '{{usados}}/{{maximo}} - לפחות {{minimo}} תווים',
  weeBio: 'ביוגרפיה (לא חובה)',
};
