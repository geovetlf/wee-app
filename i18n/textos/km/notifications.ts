/*
 * JEMER — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre va delante y el verbo después, como en jemer; «ចូលចិត្ត» = like (glosario § 4).
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'ការជូនដំណឹង',
  empty: 'គ្មាន​ការជូនដំណឹង',
  emptyHint: 'នៅពេល​នរណាម្នាក់​ធ្វើ​អន្តរកម្ម​ជាមួយ​អ្នក វា​នឹង​បង្ហាញ​នៅទីនេះ',
  allRead: 'អ្នក​បាន​អាន​ការជូនដំណឹង​ទាំងអស់​ហើយ',
  noneNew: 'គ្មាន​ការជូនដំណឹង​ថ្មី',
  like: '{{nombre}} បាន​ចូលចិត្ត​សារបង្ហោះ​របស់អ្នក',
  comment: '{{nombre}} បាន​បញ្ចេញ​មតិ​លើ​សារបង្ហោះ​របស់អ្នក',
  follow: '{{nombre}} បាន​ចាប់ផ្តើម​តាមដាន​អ្នក',
  econtactRequest: '{{nombre}} ចង់​បន្ថែម​អ្នក​ទៅ ËContact',
  econtactAccepted: '{{nombre}} បាន​ទទួលយក​សំណើ ËContact របស់អ្នក',
  repost: '{{nombre}} បាន​ចែករំលែក​សារបង្ហោះ​របស់អ្នក',
  mention: '{{nombre}} បាន​លើកឡើង​អំពី​អ្នក',
  reply: '{{nombre}} បាន​ឆ្លើយតប​នឹង​មតិ​របស់អ្នក',
  communityPost: '{{nombre}} បាន​បង្ហោះ​ក្នុង {{comunidad}}',
  aCommunity: 'សហគមន៍​មួយ',
  generic: '{{nombre}} បាន​ធ្វើ​អន្តរកម្ម​ជាមួយ​អ្នក',
  now: 'ឥឡូវនេះ',
  markAllRead: 'សម្គាល់​ទាំងអស់​ថា​បាន​អាន',
  all: 'ទាំងអស់',
  unread: 'មិនទាន់​អាន',
  unreadWithCount: 'មិនទាន់​អាន ({{total}})',
};
