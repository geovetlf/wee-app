/*
 * JEMER — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de un proyecto y la meta de una creación los escribe la persona y entran por
 * interpolación. El jemer no tiene plural: `creations_one` y `creations_other` son idénticas.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'ស្នាដៃ​របស់អ្នក រៀប​តាម​គម្រោង',
  introText: 'គម្រោង​មួយ​អាច​មាន​ឡូហ្គោ រូបថត ការផ្សាយ​ពាណិជ្ជកម្ម វីដេអូ តន្ត្រី និង​ឯកសារ។ រក្សាទុក​លទ្ធផល​នីមួយៗ​ក្នុង​គម្រោង​របស់វា​ពី "{{accion}}"។',
  sectionTitle: 'គម្រោង',
  emojiLabel: 'អេម៉ូជី {{emoji}}',
  namePlaceholder: 'ឧទាហរណ៍៖ ភោជនីយដ្ឋាន​របស់ខ្ញុំ',
  emptyTitle: 'អ្នក​មិនទាន់​មាន​គម្រោង​នៅឡើយទេ',
  emptyText: 'បង្កើត​គម្រោង​ដំបូង ឬ​រក្សាទុក​ស្នាដៃ​មួយ​ក្នុង​គម្រោង​ពី​លទ្ធផល​របស់វា។',
  emptyAction: 'បង្កើត​គម្រោង​ដំបូង​របស់ខ្ញុំ',
  open: 'បើក',
  fallbackTitle: 'គម្រោង',
  notFound: 'យើង​រក​មិន​ឃើញ​គម្រោង​នេះ​ទេ។',
  saveName: 'រក្សាទុក​ឈ្មោះ',
  rename: 'ប្តូរ​ឈ្មោះ',
  deleteProject: 'លុប​គម្រោង',
  deleteConfirmWeb: 'លុប​គម្រោង "{{nombre}}" ឬ? ស្នាដៃ​របស់អ្នក​មិន​ត្រូវបាន​លុប​ទេ។',
  deleteConfirm: 'លុប "{{nombre}}" ឬ? ស្នាដៃ​របស់អ្នក​មិន​ត្រូវបាន​លុប​ទេ។',
  creations_one: '{{contador}} ស្នាដៃ',
  creations_other: '{{contador}} ស្នាដៃ',
  creationsTitle: 'ស្នាដៃ',
  add: 'បន្ថែម',
  noCreations: 'មិនទាន់​មាន​ស្នាដៃ​នៅទីនេះ​ទេ។ បង្កើត​អ្វីមួយ​ជាមួយ​អ្នកជំនាញ​ណា​ក៏បាន ហើយ​រក្សាទុក​ក្នុង​គម្រោង​នេះ។',
  whatIsMissing: 'តើ​គម្រោង​នេះ​ខ្វះ​អ្វី?',
  whatIsMissingNote: 'ឡូហ្គោ រូបថត ការផ្សាយ​ពាណិជ្ជកម្ម វីដេអូ តន្ត្រី ឬ​ឯកសារ៖ អ្នកជំនាញ​ណា​ក៏ដោយ​របស់ Weë អាច​បន្ថែម​នៅទីនេះ​បាន។',
  createSomethingNew: 'បង្កើត​អ្វី​ថ្មី',
};
