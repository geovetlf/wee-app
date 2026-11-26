/*
 * HEBREO — Mis creaciones: la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: «creación» es «יצירה» (femenino), y por eso «Guardada» /
 * «Eliminada» concuerdan en femenino («נשמרה», «נמחקה») mientras «Creado con»
 * se queda en masculino genérico («נוצר עם»), que es como habla de un archivo
 * el hebreo. El contador declara el dual con `ConPlurales`: «יצירה אחת / שתי
 * יצירות / {{contador}} יצירות». El filtro «Videos» es «סרטונים» (así se dice la
 * lista) y el tipo «Video» es «וידאו» (glosario § 6). Weë se trata en femenino
 * («Weë צריכה הרשאה») porque es una aplicación (אפליקציה): duda al revisor.
 * «{{nombre}} está trabajando» → «{{nombre}} בפעולה», sin darle género al
 * especialista. «Atribución» es «ציון מקור», no «קרדיט», que es la marca Credits
 * transliterada y está prohibida. Las comillas « » del español se vuelven "…"
 * rectas, que es lo que usa el hebreo.
 */
import { ConPlurales } from './plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'היצירות שלי',
  intro: 'כל מה שיצרת עם Weë AI, במקום אחד. זה שייך לחשבון שלך: רואים את אותו הדבר מהפרופיל האמיתי ומפרופיל Weë.',

  /* Filtros por tipo. */
  filterAll: 'הכול',
  filterImages: 'תמונות',
  filterVideos: 'סרטונים',
  filterAudio: 'אודיו',
  filterDocuments: 'מסמכים',
  filterModel3d: '3D',
  filterLabel: 'סינון לפי סוג',

  /* Orden. */
  sortRecent: 'אחרונות',
  sortOldest: 'הישנות ביותר',
  sortLabel: 'מיון',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'טוענים את היצירות שלך…',
  loadFailed: 'לא הצלחנו לטעון את היצירות שלך.',
  retry: 'ניסיון נוסף',
  loadMore: 'טעינת עוד',
  emptyTitle: 'עדיין אין לך יצירות',
  emptyText: 'כל מה שייווצר עם Weë AI יופיע כאן, עם התמונה, הסרטון או האודיו שלו.',
  emptyAction: 'ליצור משהו עם Weë AI',
  emptyFiltered: 'אין יצירות מהסוג הזה.',
  count_one: 'יצירה אחת',
  count_two: 'שתי יצירות',
  count_other: '{{contador}} יצירות',

  /* Estados de una creación. */
  statusUploading: 'בהעלאה',
  statusProcessing: 'בעיבוד',
  statusReady: 'מוכן',
  statusFailed: 'לא הצליח',
  statusDeleted: 'נמחקה',
  pendingDeletion: 'הקובץ יוסר בקרוב.',

  /* Tipos, para la tarjeta. */
  kindImage: 'תמונה',
  kindVideo: 'וידאו',
  kindAudio: 'אודיו',
  kindDocument: 'מסמך',
  kindModel3d: '3D',
  kindText: 'טקסט',

  /* Acciones sobre una creación. */
  open: 'פתיחה',
  openCreation: 'פתיחת היצירה: {{nombre}}',
  download: 'הורדה',
  downloaded: 'נשמר בגלריה שלך.',
  downloadFailed: 'לא הצלחנו להוריד אותה. כדאי לנסות שוב.',
  downloadPermission: 'Weë צריך הרשאה כדי לשמור בגלריה שלך.',
  savedInCreations: 'נשמרה ביצירות שלך',
  save: 'שמירה',
  saved: 'נשמרה',
  useInProject: 'שימוש בפרויקט',
  publish: 'פרסום',
  share: 'שיתוף',
  delete: 'מחיקה',
  deleteConfirm: 'למחוק את היצירה הזאת? הקובץ יימחק. מה שכבר פורסם לא ישתנה.',
  deleteConfirmWeb: 'למחוק את היצירה הזאת? הקובץ יימחק. מה שכבר פורסם לא ישתנה.',
  deleted: 'היצירה נמחקה.',
  deleteFailed: 'לא הצלחנו למחוק אותה. כדאי לנסות שוב.',
  createdWith: 'נוצר עם {{nombre}}',
  createdOn: 'נוצר ב-{{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} בפעולה',
  progressStarting: 'מתחילים…',
  progressSteps: '{{hechos}} מתוך {{total}} שלבים הושלמו',
  progressFindLater: 'אפשר לצאת מהמסך הזה; כשהיא תהיה מוכנה, היא תופיע ב"היצירות שלי".',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer. */
  filterWorlds: 'עולמות 3D',
  kindWorld: 'עולם 3D',
  noViewer3d: 'ל-Weë עדיין אין מציג 3D. אפשר להוריד אותו ולפתוח אותו באפליקציית 3D.',
  rightsTitle: 'מה אפשר לעשות איתו',
  rightsProvenance: 'נוצר עם AI ב-Weë, באמצעות מודל של צד שלישי שיש לו רישיון משלו.',
  rightsCommercialAllowed: 'אפשר להשתמש בו למטרות מסחריות.',
  rightsCommercialRestricted: 'לשימוש המסחרי בו יש תנאים.',
  rightsCommercialUnclear: 'עדיין לא ברור אם אפשר להשתמש בו למטרות מסחריות.',
  rightsCommercialNotAllowed: 'אי אפשר להשתמש בו למטרות מסחריות.',
  rightsAttribution: 'הרישיון שלו דורש ציון מקור.',
  rightsBlockedIn: 'אי אפשר להשתמש בו או להציג אותו במקומות האלה: {{lugares}}.',
};
