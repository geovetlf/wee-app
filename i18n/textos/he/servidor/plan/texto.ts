/*
 * HEBREO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}` y `{{estilo}}` en masculino («בטון», «בסגנון»); `{{animo}}` en femenino («באווירה»); `{{voz}}` en masculino
 * («בקול»). `{{idioma}}` va con guion detrás del prefijo, como pide la guía: «ל-{{idioma}}».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'אחפש ציטוטים אמיתיים בנושא ואשאיר לך את המקור של כל אחד, כדי שאפשר יהיה לבדוק אותם.',
  writerPasoCitas: 'חיפוש הציטוטים והמקורות שלהם',

  writerExplicaTraducir: 'אתרגם את הטקסט שלך ל-{{idioma}} תוך שמירה על המשמעות והטון.',
  writerPasoTraducir: 'תרגום ל-{{idioma}}',
  writerDecisionIdiomaIngles: 'אתרגם אותו לאנגלית',
  writerIdiomaEn: 'אנגלית',
  writerIdiomaPt: 'פורטוגזית',
  writerIdiomaFr: 'צרפתית',
  writerIdiomaIt: 'איטלקית',

  writerExplicaResumir: 'אסכם את הטקסט שלך לרעיונות המרכזיים, בכמה שורות.',
  writerPasoResumir: 'סיכום לרעיונות מרכזיים',
  writerExplicaCorregir: 'אתקן את האיות, הסגנון והבהירות בלי לשנות את מה שרצית לומר.',
  writerPasoCorregir: 'תיקון איות, סגנון ובהירות',
  writerExplicaIdeas: 'אציע לך כמה רעיונות ונקודת התחלה, כדי שהכתיבה לא תיתקע.',
  writerPasoIdeas: 'הצעת רעיונות לכתיבה',

  writerExplicaPortada: 'אגדיר את הקונספט של הכריכה ואצור שלוש הצעות לבחירה.',
  writerPasoConceptoPortada: 'הגדרת הקונספט של הכריכה',
  writerPasoPropuestasPortada: 'יצירת 3 הצעות לכריכה',

  writerExplicaReescribir: 'אכתוב מחדש את הטקסט שלך בטון {{tono}}, תוך שמירה על הרעיון.',
  writerPasoReescribir: 'כתיבה מחדש של הטקסט',
  writerExplicaCv: 'אכתוב את קורות החיים שלך בטון {{tono}}, מוכנים לשימוש בעורך ולשליחה.',
  writerPasoCv: 'כתיבת קורות החיים שלך',

  writerExplicaPublicacion: 'אכתוב את הפוסט בטון {{tono}} ואחר כך אלטש אותו עד שיהיה מוכן.',
  writerExplicaHistoria: 'אכתוב את הסיפור בטון {{tono}} ואחר כך אלטש אותו עד שיהיה מוכן.',
  writerExplicaGuion: 'אכתוב את התסריט בטון {{tono}} ואחר כך אלטש אותו עד שיהיה מוכן.',
  writerExplicaArticulo: 'אכתוב את המאמר בטון {{tono}} ואחר כך אלטש אותו עד שיהיה מוכן.',
  writerExplicaEmail: 'אנסח את האימייל בטון {{tono}} ואחר כך אלטש אותו עד שיהיה מוכן.',
  writerExplicaDocumento: 'אנסח את המסמך בטון {{tono}} ואחר כך אלטש אותו עד שיהיה מוכן.',
  writerPasoPublicacion: 'כתיבת הפוסט',
  writerPasoHistoria: 'כתיבת הסיפור',
  writerPasoGuion: 'כתיבת התסריט',
  writerPasoArticulo: 'כתיבת המאמר',
  writerPasoEmail: 'ניסוח האימייל',
  writerPasoDocumento: 'ניסוח המסמך',
  writerPasoPulir: 'ליטוש הטקסט עד שיהיה מוכן',

  writerDecisionEmpiezoPublicacion: 'אתחיל מפוסט',
  writerDecisionTonoCercano: 'אשתמש בטון ידידותי',
  writerDecisionTonoProfesional: 'אשתמש בטון מקצועי',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'אכין את הטקסט ואקליט אותו בקול {{voz}}.',
  musicExplicaVozCalida: 'אכין את הטקסט ואקליט אותו בקול חם וברור.',
  musicPasoTextoNarracion: 'הכנת הטקסט לקריינות',
  musicPasoGrabarVoz: 'הקלטת הקול',

  musicExplicaLetra: 'אכתוב את המילים המלאות לשיר, בסגנון {{estilo}}.',
  musicPasoLetraCompleta: 'כתיבת המילים המלאות',

  musicExplicaMezcla: 'אקשיב לשיר שלך ואעשה לו מיקס ומאסטרינג כדי שיישמע מקצועי.',
  musicPasoAnotarMezcla: 'האזנה לשיר שלך ורישום הערות למיקס',
  musicPasoMasterizar: 'מיקס ומאסטרינג',

  musicExplicaVideoclip: 'אצור את השיר ({{estilo}}, {{animo}}) ואת הסצנות, ואערוך את הווידאו קליפ המלא שלך. אין צורך לצאת מ-Weë Music.',
  musicPasoIdeaYLetra: 'כתיבת הרעיון והמילים',
  musicPasoEscenas: 'יצירת הסצנות של הקליפ',
  musicPasoArmarVideoclip: 'עריכת הקליפ עם השיר שלך',

  musicExplicaJingle: 'אצור ג׳ינגל קצר וקליט בסגנון {{estilo}}, באווירה {{animo}}.',
  musicPasoFraseJingle: 'כתיבת המשפט של הג׳ינגל',
  musicPasoJingle: 'יצירת הג׳ינגל',
  musicExplicaBeat: 'אצור ביט בסגנון {{estilo}}, באווירה {{animo}}.',
  musicPasoIdeaMusical: 'הגדרת הרעיון המוזיקלי',
  musicPasoBeat: 'יצירת הביט',

  musicExplicaCancion: 'אכתוב את המילים, אצור את השיר בסגנון {{estilo}} ובאווירה {{animo}} ואעצב את העטיפה שלו.',
  musicPasoLetra: 'כתיבת המילים',
  musicPasoCancion: 'יצירת השיר',
  musicPasoPortada: 'עיצוב העטיפה',

  musicDecisionEmpiezoCancion: 'אתחיל משיר',
  musicDecisionEstiloPop: 'בחרתי סגנון פופ',
  musicDecisionAnimoAlegre: 'באווירה שמחה',
  musicDecisionVozCalida: 'בחרתי קול חם וברור',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'אסתכל על התמונה שלך ואכין שגרת טיפוח עור פשוטה, עם מוצרים שקל להשיג.',
  beautyPasoRutina: 'הכנת שגרת הטיפוח שלך',

  beautyExplicaRostro: 'אסתכל על הפנים שלך, אמליץ על התספורות והסגנונות שהכי מתאימים לך ואנסה שניים מהם על התמונה שלך.',
  beautyPasoMirarRostro: 'בדיקת הפנים שלך',
  beautyPasoRecomendar: 'המלצה על תספורות, משקפיים וסגנונות',
  beautyPasoProbarDosEstilos: 'ניסיון של שני הסגנונות שהכי מתאימים לך',

  beautyExplicaProbar: 'אנסה {{cambio}} עבור {{ocasion}} בשתי גרסאות, תוך שמירה על הפנים, העור והתאורה של התמונה.',
  beautyPasoProbar: 'ניסיון של {{cambio}} תוך שמירה על הפנים שלך',
  beautyOcasionElDiaADia: 'היום יום',

  beautyDecisionCambioCompleto: 'אציע שינוי מראה מלא',
  beautyDecisionOcasionDiaADia: 'חשבתי על היום יום',
};
