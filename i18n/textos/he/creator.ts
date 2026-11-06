/*
 * HEBREO — lo que describe cada experiencia de WEË AI. Los nombres —Weë Design,
 * Weë Studio…— son marca y viven en constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: las descripciones son listas de sustantivos, como en español.
 * Los ejemplos hablan en primera persona de quien escribe, y donde el español
 * se marca en género («No sé qué cocinar», «Cómo me quedaría el cabello largo»)
 * el hebreo busca una forma neutra: «אין לי מושג מה לבשל היום», «איך שיער ארוך
 * היה נראה עליי»; «אני רוצה» se lee igual para los dos géneros sin niqud. «IA»
 * es «AI». «Beauty» en «Weë Studio · Beauty» queda en latino porque nombra la
 * sección Weë Beauty. «Hogar & Diseño» es «בית ועיצוב» (conjunción, no «&»).
 * «Cuéntale a {{especialista}}» se dice impersonal con el prefijo y guion
 * («מספרים ל-{{especialista}}») para que la marca no lleve prefijo pegado.
 * Las comillas tipográficas de `exampleQuoted` se conservan tal cual.
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'לוגואים, פוסטרים, איורים וחומרים לרשתות החברתיות שלך',
  studio: 'יצירה ושינוי של תמונות וסרטונים עם AI.',
  photo: 'שיפור, שחזור ושינוי של התמונות שלך',
  writer: 'פוסטים, סיפורים, תסריטים, אימיילים וספרים',
  music: 'שירים, מוזיקה אינסטרומנטלית, קולות וקריינות',
  beauty: 'איפור, שיער, זקן, אאוטפיטים ושינויי לוק',
  chef: 'השף האישי שלך: מה לבשל, מתכונים ותפריטים',
  home: 'עיצוב הבית, עיצוב פנים, שיפוץ וגינות',
  business: 'אופנה, סטייל, יופי ויצירת תוכן ויזואלי.',
  travel: 'תכנון הטיול שלך: לאן לנסוע, מה לעשות ואיך להתנייד',
  brain: 'לא ברור איפה לחפש? אפשר לשאול את Weë',
  designEx1: 'לוגו לעסק שלי',
  designEx2: 'פוסט לאינסטגרם',
  designEx3: 'הכריכה של הספר שלי',
  studioEx1: 'סרטון לקידום המסעדה שלי',
  studioEx2: 'להפוך את התמונה שלי לסרטון',
  studioEx3: 'Weël עם המוצר שלי',
  photoEx1: 'לשפר את האיכות של תמונה',
  photoEx2: 'להסיר משהו מיותר מהתמונה',
  photoEx3: 'להחליף את הרקע של התמונה שלי',
  writerEx1: 'תסריט לסרטון שלי',
  writerEx2: 'אימייל ללקוח',
  writerEx3: 'לתקן את הטקסט שלי',
  musicEx1: 'ג׳ינגל למותג שלי',
  musicEx2: 'מוזיקת רקע לסרטון שלי',
  musicEx3: 'להפוך את הטקסט שלי לקול',
  beautyEx1: 'איך שיער ארוך היה נראה עליי',
  beautyEx2: 'לוק למסיבה',
  beautyEx3: 'לנסות צבע שיער אחר',
  chefEx1: 'מתכון עם מה שיש לי בבית',
  chefEx2: 'תפריט שבועי בריא',
  chefEx3: 'אין לי מושג מה לבשל היום',
  homeEx1: 'איך הסלון שלי היה נראה בסגנון אחר',
  homeEx2: 'רעיונות לעיצוב החדר שלי',
  homeEx3: 'גינה קטנה לחצר שלי',
  businessEx1: 'תוכנית למיזם שלי',
  businessEx2: 'קורות החיים שלי, מעודכנים',
  businessEx3: 'מצגת למשקיעים',
  travelEx1: 'יפן באוקטובר',
  travelEx2: 'אני רוצה חוף שקט וזול',
  travelEx3: 'אין לי מושג לאן לנסוע',
  brainEx1: 'אין לי מושג מאיפה להתחיל',
  brainEx2: 'להסביר לי את זה בפשטות',
  brainEx3: 'לתרגם את הטקסט הזה',
  areaStudioPhotos: 'Weë Studio · תמונות',
  areaStudioVideos: 'Weë Studio · סרטונים',
  areaStudioBeauty: 'Weë Studio · Beauty',
  areaDesignHome: 'Weë Design · בית ועיצוב',
  areaHomeName: 'בית ועיצוב',
  tellTheSpecialist: 'מספרים ל-{{especialista}} מה רוצים להשיג, עונים על שתיים-שלוש שאלות פשוטות, והשאר כבר מטופל. אחר כך מפרסמים ישירות בקהילה שלך.',
  exampleQuoted: '“{{ejemplo}}”',
};
