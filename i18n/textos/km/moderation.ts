/*
 * JEMER — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde
 * cualquier sitio de Weë. Es transversal, y por eso tiene módulo propio.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los motivos están en lenguaje normal, no legal; la confirmación dice solo que el reporte
 * se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'រាយការណ៍',
  subtitle: 'ប្រាប់​យើង​ថា​មាន​អ្វី​កើតឡើង​ជាមួយ​មាតិកា​នេះ។',
  chooseReason: 'ជ្រើសរើស​ហេតុផល',
  send: 'ផ្ញើ​របាយការណ៍',
  sending: 'កំពុង​ផ្ញើ​របាយការណ៍…',
  reasonSpam: 'សារ​ឥតបានការ',
  reasonHarassment: 'ការបៀតបៀន ឬ​ការគំរាមកំហែង',
  reasonHate: 'ការស្អប់ខ្ពើម ឬ​ការរើសអើង',
  reasonSexual: 'មាតិកា​ផ្លូវភេទ',
  reasonViolence: 'អំពើហិង្សា',
  reasonScam: 'ការបោកប្រាស់ ឬ​ការឆបោក',
  reasonImpersonation: 'ការក្លែងបន្លំ​អត្តសញ្ញាណ',
  reasonIllegal: 'មាតិកា​ខុសច្បាប់',
  reasonSelfHarm: 'ការធ្វើបាប​ខ្លួនឯង ឬ​ការធ្វើអត្តឃាត',
  reasonOther: 'ហេតុផល​ផ្សេងទៀត',
  successTitle: 'បាន​ទទួល​របាយការណ៍',
  successBody: 'អរគុណ​ដែល​ជួយ​យើង​រក្សា Weë ឱ្យ​មាន​សុវត្ថិភាព។',
  duplicateTitle: 'អ្នក​បាន​រាយការណ៍​រួចហើយ',
  duplicateBody: 'យើង​បាន​ទទួល​របាយការណ៍​របស់អ្នក​អំពី​មាតិកា​នេះ​រួចហើយ។',
  errorTitle: 'យើង​មិនអាច​ផ្ញើ​របាយការណ៍​របស់អ្នក​បានទេ។',
  errorBody: 'សូម​ព្យាយាម​ម្តងទៀត។',
  errorOffline: 'គ្មាន​ការតភ្ជាប់។ សូម​ព្យាយាម​ម្តងទៀត។',
  errorRateLimited: 'អ្នក​បាន​ផ្ញើ​របាយការណ៍​ច្រើន​ពេក​ជាប់ៗគ្នា។ សូម​ព្យាយាម​ម្តងទៀត​នៅពេលក្រោយ។',
  errorUnavailable: 'មាតិកា​នេះ​លែង​មាន​ទៀត​ហើយ។',
};
