/*
 * ÁRABE — Notificaciones. Tipado contra el español.
 *
 * El nombre de quien la provoca entra por `{{nombre}}`. La frase va en orden
 * verbo‑sujeto («أعجب {{nombre}} بمنشورك»), que es el natural en árabe; el
 * verbo queda en masculino genérico porque el género de la persona no se
 * conoce aquí (anotado para el revisor).
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'الإشعارات',
  empty: 'لا توجد إشعارات',
  emptyHint: 'عندما يتفاعل أحد معك، سيظهر ذلك هنا',
  allRead: 'لقد قرأت جميع إشعاراتك',
  noneNew: 'لا توجد إشعارات جديدة',
  like: 'أعجب {{nombre}} بمنشورك',
  comment: 'علّق {{nombre}} على منشورك',
  follow: 'بدأ {{nombre}} بمتابعتك',
  econtactRequest: 'يريد {{nombre}} إضافتك إلى ËContact',
  econtactAccepted: 'قبل {{nombre}} طلبك في ËContact',
  repost: 'شارك {{nombre}} منشورك',
  mention: 'أشار إليك {{nombre}}',
  reply: 'ردّ {{nombre}} على تعليقك',
  communityPost: 'نشر {{nombre}} في {{comunidad}}',
  aCommunity: 'مجتمع',
  generic: 'تفاعل {{nombre}} معك',
  now: 'الآن',
  markAllRead: 'تعليم الكل كمقروء',
  all: 'الكل',
  unread: 'غير المقروءة',
  unreadWithCount: 'غير المقروءة ({{total}})',
};
