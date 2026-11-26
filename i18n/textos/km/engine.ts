/*
 * JEMER — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los identificadores del motor (ids de proveedor y modelo, capacidades, colecciones de
 * Firestore, `engineAdmin`, Gemini/Seedance/ElevenLabs) se copian tal cual. «engine» se deja
 * en latino, como en el español. El jemer no tiene plural: las dos formas del contador son
 * idénticas y el número va delante de «ដង» (veces).
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'ធ្វើ​បច្ចុប្បន្នភាព',
  statusFailed: 'ខ្ញុំ​មិនអាច​អាន​ស្ថានភាព​របស់ engine បានទេ។ តើ​ម៉ាស៊ីនមេ​កំពុង​ដំណើរការ​ទេ?',
  changeFailed: 'មិនអាច​អនុវត្ត​ការផ្លាស់ប្តូរ​បានទេ',

  adminOnly: 'សម្រាប់​តែ​អ្នកគ្រប់គ្រង',
  adminOnlyNote: 'ផ្ទាំង​នេះ​សម្រាប់​ក្រុមការងារ Weë។ ប្រសិនបើ​អ្នក​ជា​សមាជិក​ក្រុម សូម​ស្នើ​ឱ្យ​បន្ថែម​គណនី​របស់អ្នក​ជា​អ្នកគ្រប់គ្រង។',

  settingsTitle: 'ការកំណត់',
  settingsLine: 'តម្លៃ៖ {{precios}} · {{credits}} Credits ក្នុង​មួយ USD · កម្រៃ {{margen}} % · គោលការណ៍ {{politica}} · របៀប​សាកល្បង​ជា​ជម្រើស​ចុងក្រោយ៖ {{demo}}',
  pricesTest: 'សាកល្បង',
  pricesReal: 'ពិតប្រាកដ',
  yes: 'បាទ/ចាស',
  no: 'ទេ',
  configFrom: 'ការកំណត់​បាន​អាន​ពី {{origen}}។',
  sourceDefaults: 'តម្លៃ​លំនាំដើម​ក្នុង​កូដ',
  resetHealth: 'កំណត់​សុខភាព​ឡើងវិញ',
  healthReset: 'បាន​កំណត់​សុខភាព​ឡើងវិញ។',
  seedDone: 'បាន​រក្សាទុក​តម្លៃ​លំនាំដើម​ក្នុង Firestore។',

  providers: 'អ្នកផ្តល់សេវា',
  priority: 'អាទិភាព {{numero}}',
  enable: 'បើក {{proveedor}}',
  disable: 'បិទ {{proveedor}}',
  withKey: 'មាន​សោ API',
  withoutKey: 'គ្មាន​សោ API',
  active: 'សកម្ម',
  inactive: 'អសកម្ម',
  pausedByFailures: 'ផ្អាក​ដោយសារ​បរាជ័យ',
  recentFailures_one: 'បរាជ័យ​ថ្មីៗ {{contador}} ដង',
  recentFailures_other: 'បរាជ័យ​ថ្មីៗ {{contador}} ដង',
  modelLine: '• {{id}} · គុណភាព {{calidad}}/5 · ល្បឿន {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · រហូតដល់ {{segundos}} វិនាទី',
  pendingVerification: ' · រង់ចាំ​ការផ្ទៀងផ្ទាត់',

  chains: 'ខ្សែសង្វាក់​បម្រុង',
  policyLabel: 'គោលការណ៍​នៃ {{capacidad}}៖ {{politica}}',
  onlyDemo: 'របៀប​សាកល្បង​តែប៉ុណ្ណោះ (មិនទាន់​មាន​អ្នកផ្តល់សេវា​ពិតប្រាកដ)',
  editNote: 'ដើម្បី​ផ្លាស់ប្តូរ​លំដាប់​ខ្សែសង្វាក់ ឬ​កំណត់​ម៉ូដែល សូម​កែ aiRouting/{{capacidad}} ក្នុង Firestore ឬ​ប្រើ engineAdmin · setRouting។',

  policyQualityFirst: 'គុណភាព​ជាមុន',
  policyBalanced: 'តុល្យភាព',
  policyCostFirst: 'ថ្លៃដើម​ជាមុន',

  modalityText: 'អត្ថបទ',
  modalityVision: 'ការមើលឃើញ',
  modalityImage: 'រូបភាព',
  modalityVideo: 'វីដេអូ',
  modalityVoice: 'សំឡេង',
  modalityMusic: 'តន្ត្រី',
  modalityDoc: 'ឯកសារ',
  rowSubtitle: 'អ្នកផ្តល់សេវា ខ្សែសង្វាក់​បម្រុង និង​ការកំណត់ (សម្រាប់​តែ​អ្នកគ្រប់គ្រង)',
};
