/*
 * HEBREO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los identificadores del motor (ids de proveedor y de modelo, capacidades, colecciones de
 * Firestore, `engineAdmin`, Gemini, Seedance, ElevenLabs) se copian tal cual. «engine» en minúscula
 * del español es «המנוע» (el motor); «fallback» es «גיבוי». Los adjetivos de estado («פעיל»,
 * «מושהה») concuerdan con «ספק» (proveedor), masculino, que es lo que describen. El contador de
 * fallos declara el dual.
 */
import { ConPlurales } from './plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'רענון',
  statusFailed: 'לא ניתן היה לקרוא את מצב המנוע. האם השרת פועל?',
  changeFailed: 'לא ניתן היה להחיל את השינוי',

  adminOnly: 'לניהול בלבד',
  adminOnlyNote: 'הלוח הזה מיועד לצוות Weë. מי שחלק מהצוות יכול לבקש שהחשבון שלו יתווסף כמנהל.',

  settingsTitle: 'הגדרות',
  settingsLine: 'מחירים: {{precios}} · {{credits}} Credits לדולר · מרווח {{margen}} % · מדיניות {{politica}} · מצב הדגמה כמוצא אחרון: {{demo}}',
  pricesTest: 'ניסיוניים',
  pricesReal: 'אמיתיים',
  yes: 'כן',
  no: 'לא',
  configFrom: 'מקור התצורה: {{origen}}.',
  sourceDefaults: 'ברירות המחדל שבקוד',
  resetHealth: 'איפוס מצב התקינות',
  healthReset: 'מצב התקינות אופס.',
  seedDone: 'ברירות המחדל נשמרו ב-Firestore.',

  providers: 'ספקים',
  priority: 'עדיפות {{numero}}',
  enable: 'הפעלת {{proveedor}}',
  disable: 'השבתת {{proveedor}}',
  withKey: 'עם מפתח',
  withoutKey: 'ללא מפתח',
  active: 'פעיל',
  inactive: 'לא פעיל',
  pausedByFailures: 'מושהה בגלל כשלים',
  recentFailures_one: 'כשל אחד לאחרונה',
  recentFailures_two: 'שני כשלים לאחרונה',
  recentFailures_other: '{{contador}} כשלים לאחרונה',
  modelLine: '• {{id}} · איכות {{calidad}}/5 · מהירות {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · עד {{segundos}} שניות',
  pendingVerification: ' · ממתין לאימות',

  chains: 'שרשראות גיבוי',
  policyLabel: 'מדיניות {{capacidad}}: {{politica}}',
  onlyDemo: 'מצב הדגמה בלבד (עדיין אין ספק אמיתי)',
  editNote: 'כדי לשנות את סדר השרשרת או לקבע מודל, יש לערוך את aiRouting/{{capacidad}} ב-Firestore או להשתמש ב-engineAdmin · setRouting.',

  policyQualityFirst: 'איכות קודם',
  policyBalanced: 'מאוזן',
  policyCostFirst: 'עלות קודם',

  modalityText: 'טקסט',
  modalityVision: 'ראייה',
  modalityImage: 'תמונה',
  modalityVideo: 'וידאו',
  modalityVoice: 'קול',
  modalityMusic: 'מוזיקה',
  modalityDoc: 'מסמכים',
  rowSubtitle: 'ספקים, שרשראות גיבוי והגדרות (לניהול בלבד)',
};
