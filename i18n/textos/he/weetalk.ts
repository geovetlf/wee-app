/*
 * HEBREO — WeeTalk. El nombre es marca; los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Tú: {{mensaje}}» se traduce «אני: …» (yo), como hace Gmail en hebreo con los mensajes propios:
 * la segunda persona obliga a elegir género. «¿Estás seguro?» pasa a «האם להמשיך?» por lo mismo.
 * «Chat» es «צ׳אט» con geresh (glosario). «Toca para…» se resuelve con sustantivo («הקשה לצפייה»).
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'כתיבת הודעה…',
  send: 'שליחה',
  empty: 'עדיין אין שיחות',
  emptyHint: 'אפשר לכתוב למישהו מתוך הפרופיל שלו',
  loadFailed: 'לא ניתן היה לטעון את השיחות שלך',
  sendFailed: 'לא ניתן היה לשלוח את ההודעה',
  attach: 'צירוף',
  photo: 'תמונה',
  search: 'חיפוש...',
  noConversations: 'אין שיחות',
  deleteConversation: 'מחיקת השיחה',
  areYouSure: 'האם להמשיך?',
  messagePlaceholderShort: 'הודעה...',
  firstMessage: 'שליחת ההודעה הראשונה',
  photoSeen: 'התמונה נצפתה',
  photoOnce: 'תמונה חד-פעמית',
  photoOpened: 'נפתחה',
  tapToView: 'הקשה לצפייה',
  tapToClose: 'הקשה לסגירה',
  theme: 'ערכת נושא',
  background: 'רקע',
  permissions: 'הרשאות',
  photoPermission: 'נדרשת הרשאת גישה לתמונות',
  audioPermission: 'נדרשת הרשאת גישה למיקרופון',
  imageFailed: 'לא ניתן היה לשלוח את התמונה',
  noConversationsHint: 'אפשר לפתוח את התפריט ⋮ בכל פוסט ולבחור "שליחה ב-WeeTalk" כדי להתחיל שיחה פרטית',
  ephemeralMode: 'מצב זמני',
  noMessagesYet: 'עדיין אין הודעות',
  youSaid: 'אני: {{mensaje}}',
  conversationStart: 'זו תחילת השיחה הפרטית שלך',
  beRespectful: 'חשוב לשמור על כבוד הדדי ועל פרטיות 🤝',
  anonymousUser: 'משתמש אנונימי',
  ephemeralOn: 'מצב זמני פעיל · ההודעות נמחקות ביציאה',
  cameraNeeded: 'נדרשת גישה למצלמה',
  allow: 'אישור',
  recordAudio: 'הקלטת אודיו',
  viewOnceOn: 'צפייה חד-פעמית',
  keepInChat: 'שמירה בצ׳אט',
  themeClassic: 'קלאסי',
  themeMidnight: 'חצות',
  themeForest: 'יער',
  themeSunset: 'שקיעה',
  themeOcean: 'אוקיינוס',
  themePurple: 'סגול',
  imagePreview: '📷 תמונה',
  audioPreview: '🎤 אודיו',
  today: 'היום',
};
