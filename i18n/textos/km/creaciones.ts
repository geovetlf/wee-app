/*
 * JEMER — Mis creaciones: la biblioteca de material de la CUENTA, y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Mis creaciones» es «ស្នាដៃរបស់ខ្ញុំ» (glosario § 4) y una creación «ស្នាដៃ»,
 * invariable: las dos formas del contador son idénticas con `{{contador}}`.
 * «Perfil Real» / «Perfil Weë» = «ប្រវត្តិរូបពិត» / «ប្រវត្តិរូប Weë». Los nombres
 * de experiencia y de creación entran por hueco sin tocarse. «3D» y «AI» se
 * quedan en latino. Entre palabras va ZWSP (U+200B).
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'ស្នាដៃ​របស់ខ្ញុំ',
  intro: 'អ្វីគ្រប់យ៉ាង​ដែល​អ្នក​បាន​បង្កើត​ជាមួយ Weë AI នៅ​កន្លែង​តែមួយ។ វា​ជា​របស់​គណនី​អ្នក៖ អ្នក​ឃើញ​វា​ដូចគ្នា​ពី​ប្រវត្តិរូបពិត​និង​ពី​ប្រវត្តិរូប Weë។',

  /* Filtros por tipo. */
  filterAll: 'ទាំងអស់',
  filterImages: 'រូបភាព',
  filterVideos: 'វីដេអូ',
  filterAudio: 'សំឡេង',
  filterDocuments: 'ឯកសារ',
  filterModel3d: '3D',
  filterLabel: 'ត្រង​តាម​ប្រភេទ',

  /* Orden. */
  sortRecent: 'ថ្មីៗ',
  sortOldest: 'ចាស់បំផុត',
  sortLabel: 'តម្រៀប',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'កំពុង​ផ្ទុក​ស្នាដៃ​របស់អ្នក…',
  loadFailed: 'យើង​មិនអាច​ផ្ទុក​ស្នាដៃ​របស់អ្នក​បានទេ។',
  retry: 'ព្យាយាម​ម្តង​ទៀត',
  loadMore: 'ផ្ទុក​បន្ថែម',
  emptyTitle: 'អ្នក​មិនទាន់​មាន​ស្នាដៃ​នៅឡើយទេ',
  emptyText: 'អ្វីគ្រប់យ៉ាង​ដែល​អ្នក​ធ្វើ​ជាមួយ Weë AI នឹង​បង្ហាញ​នៅទីនេះ ជាមួយ​រូបភាព វីដេអូ ឬ​សំឡេង​របស់វា។',
  emptyAction: 'បង្កើត​អ្វីមួយ​ជាមួយ Weë AI',
  emptyFiltered: 'គ្មាន​ស្នាដៃ​ប្រភេទ​នេះទេ។',
  count_one: '{{contador}} ស្នាដៃ',
  count_other: '{{contador}} ស្នាដៃ',

  /* Estados de una creación. */
  statusUploading: 'កំពុង​បង្ហោះឡើង',
  statusProcessing: 'កំពុង​ដំណើរការ',
  statusReady: 'រួចរាល់',
  statusFailed: 'មិនបាន​សម្រេច',
  statusDeleted: 'បាន​លុប',
  pendingDeletion: 'ឯកសារ​នឹង​ត្រូវ​ដកចេញ​ក្នុងពេល​ឆាប់ៗនេះ។',

  /* Tipos, para la tarjeta. */
  kindImage: 'រូបភាព',
  kindVideo: 'វីដេអូ',
  kindAudio: 'សំឡេង',
  kindDocument: 'ឯកសារ',
  kindModel3d: '3D',
  kindText: 'អត្ថបទ',

  /* Acciones sobre una creación. */
  open: 'បើក',
  openCreation: 'បើក​ស្នាដៃ៖ {{nombre}}',
  download: 'ទាញយក',
  downloaded: 'បាន​រក្សាទុក​ក្នុង​វិចិត្រសាល​របស់អ្នក។',
  downloadFailed: 'យើង​មិនអាច​ទាញយក​វា​បានទេ។ សូម​ព្យាយាម​ម្តងទៀត។',
  downloadPermission: 'Weë ត្រូវការ​ការអនុញ្ញាត​ដើម្បី​រក្សាទុក​ក្នុង​វិចិត្រសាល​របស់អ្នក។',
  savedInCreations: 'បាន​រក្សាទុក​ក្នុង​ស្នាដៃ​របស់អ្នក',
  save: 'រក្សាទុក',
  saved: 'បាន​រក្សាទុក',
  useInProject: 'ប្រើ​ក្នុង​គម្រោង',
  publish: 'បង្ហោះ',
  share: 'ចែករំលែក',
  delete: 'លុប',
  deleteConfirm: 'លុប​ស្នាដៃ​នេះ? ឯកសារ​នឹង​ត្រូវ​លុប។ អ្វី​ដែល​អ្នក​បាន​បង្ហោះ​រួចហើយ​មិន​ផ្លាស់ប្តូរ​ទេ។',
  deleteConfirmWeb: 'លុប​ស្នាដៃ​នេះ? ឯកសារ​នឹង​ត្រូវ​លុប។ អ្វី​ដែល​អ្នក​បាន​បង្ហោះ​រួចហើយ​មិន​ផ្លាស់ប្តូរ​ទេ។',
  deleted: 'បាន​លុប​ស្នាដៃ។',
  deleteFailed: 'យើង​មិនអាច​លុប​វា​បានទេ។ សូម​ព្យាយាម​ម្តងទៀត។',
  createdWith: 'បង្កើត​ដោយ​ប្រើ {{nombre}}',
  createdOn: 'បង្កើត​នៅ {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} កំពុង​ធ្វើការ',
  progressStarting: 'កំពុង​ចាប់ផ្តើម…',
  progressSteps: 'រួចរាល់ {{hechos}} នៃ {{total}} ជំហាន',
  progressFindLater: 'អ្នក​អាច​ចាកចេញ​ពី​អេក្រង់​នេះ។ អ្នក​នឹង​ឃើញ​វា​ក្នុង «ស្នាដៃ​របស់ខ្ញុំ» នៅពេល​វា​រួចរាល់។',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer. */
  filterWorlds: 'ពិភព 3D',
  kindWorld: 'ពិភព 3D',
  noViewer3d: 'Weë មិនទាន់​មាន​កម្មវិធី​មើល 3D នៅឡើយទេ។ ទាញយក​វា​ដើម្បី​បើក​ក្នុង​កម្មវិធី 3D។',
  rightsTitle: 'អ្វី​ដែល​អ្នក​អាច​ធ្វើ​ជាមួយ​វា',
  rightsProvenance: 'បង្កើត​ដោយ AI នៅលើ Weë ដោយ​ប្រើ​ម៉ូដែល​របស់​ភាគី​ទីបី​ដែល​មាន​អាជ្ញាបណ្ណ​ផ្ទាល់ខ្លួន។',
  rightsCommercialAllowed: 'អ្នក​អាច​ប្រើ​វា​ក្នុង​គោលបំណង​ពាណិជ្ជកម្ម។',
  rightsCommercialRestricted: 'ការប្រើប្រាស់​ពាណិជ្ជកម្ម​របស់វា​មាន​លក្ខខណ្ឌ។',
  rightsCommercialUnclear: 'មិនទាន់​ច្បាស់​ថា​អាច​ប្រើ​វា​ក្នុង​គោលបំណង​ពាណិជ្ជកម្ម​បាន​ឬអត់។',
  rightsCommercialNotAllowed: 'មិនអាច​ប្រើ​វា​ក្នុង​គោលបំណង​ពាណិជ្ជកម្ម​បានទេ។',
  rightsAttribution: 'អាជ្ញាបណ្ណ​របស់វា​តម្រូវ​ឱ្យ​បញ្ជាក់​ប្រភព។',
  rightsBlockedIn: 'មិនអាច​ប្រើ​ឬ​បង្ហាញ​នៅក្នុង៖ {{lugares}}។',
};
