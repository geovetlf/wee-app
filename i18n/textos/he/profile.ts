/*
 * HEBREO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: «portada» (la imagen de arriba) es «תמונת רקע». Las tres pestañas
 * que el inglés deja igual se traducen: «מדיה», «שיתופים מחדש», «לייקים»
 * (glosario § 6: Like = לייק, repostear = שיתוף מחדש). «Usuario» se evita
 * donde tendría género: «פרטי החשבון», «החשבון הזה לא קיים»; donde no hay
 * escapatoria, «משתמש/ת». «שיתפת», «סימנת», «שלך» se leen igual para los dos
 * géneros sin niqud. En `viewMyEcontacts` el hueco es la marca de la agenda
 * (ËContacts / ẄContacts), así que va con artículo y guion: «ה-{{nombre}}».
 * La dirección de ejemplo del sitio web queda en latino («https://yoursite.com»).
 * «Se unió en {{fecha}}» → «הצטרפות: {{fecha}}», sin género.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'הוספת תמונת רקע',
  permissionsTitle: 'הרשאות',
  galleryPermission: 'נדרשת הרשאה כדי לגשת לגלריה',
  coverUploadFailed: 'לא הצלחנו להעלות את תמונת הרקע',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'טוענים את הפרופיל...',
  loadFailed: 'שגיאה בטעינת הפרופיל',
  loadFailedDetail: 'לא הצלחנו לטעון את פרטי החשבון',
  backToLogin: 'חזרה לכניסה',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'השם לא יכול להישאר ריק',
  updateFailed: 'לא הצלחנו לעדכן את הפרופיל',
  signOutFailed: 'לא הצלחנו לצאת מהחשבון',
  noSession: 'אין כניסה פעילה',
  avatarUpdateFailed: 'לא הצלחנו לעדכן את האווטאר. כדאי לנסות שוב.',
  imageUrlMissing: 'לא התקבלה כתובת URL של התמונה',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'כדאי לראות את הפרופיל של {{nombre}} ב-Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'עריכת הפרופיל',
  displayNameLabel: 'שם תצוגה',
  displayNamePlaceholder: 'שם התצוגה שלך',
  bioLabel: 'ביוגרפיה',
  bioPlaceholder: 'כמה מילים עליך...',
  websiteLabel: 'אתר אינטרנט',
  websitePlaceholder: 'https://yoursite.com',
  charCount: '{{usados}}/{{maximo}} תווים',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'עריכת פרופיל',
  createWeeProfile: 'יצירת פרופיל Weë',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'פוסטים',
  viewMyEcontacts: 'הצגת ה-{{nombre}} שלי, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'מדיה',
  tabReposts: 'שיתופים מחדש',
  tabLikes: 'לייקים',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'טוענים פוסטים...',
  postsFailed: 'שגיאה בטעינת הפוסטים',
  retry: 'ניסיון נוסף',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'עדיין אין לך פוסטים',
  emptyPostsHint: 'הפוסט הראשון שלך מחכה!',
  emptyMedia: 'אין לך פוסטים עם מדיה',
  emptyMediaHint: 'אפשר ליצור פוסט עם תמונות או סרטונים',
  emptyReposts: 'עדיין לא שיתפת מחדש שום דבר',
  emptyRepostsHint: 'אפשר לשתף תוכן של אנשים אחרים',
  emptyLikes: 'אין פוסטים שסימנת בלייק',
  emptyLikesHint: 'אפשר לתת לייק לפוסטים שמעניינים אותך',
  otherTitle: 'פרופיל',
  otherLoadFailed: 'לא הצלחנו לטעון את הפרופיל',
  seeFullProfile: 'הצגת הפרופיל המלא שלי',
  emptyCategory: 'אין פוסטים בקטגוריה הזאת',
  actionFailed: 'לא הצלחנו להשלים את הפעולה',
  userNotFound: 'החשבון הזה לא קיים',
  shareOtherMessage: 'כדאי לראות את הפרופיל של @{{nombre}} ב-Weë!\n\n{{bio}}',
  shareOtherNoBio: 'משתמש/ת ב-Weë',
  joinedOn: 'הצטרפות: {{fecha}}',
  tabPolls: 'סקרים',
};
