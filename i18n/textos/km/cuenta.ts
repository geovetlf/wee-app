/*
 * JEMER — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = លុប, la misma palabra que el botón «Eliminar» (common.delete); el jemer no tiene mayúsculas.
 * ZWSP (U+200B) entre palabras jemeres, nunca junto a marcas, huecos ni espacios.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'លុប​គណនី',
  sectionDanger: 'តំបន់​គ្រោះ​ថ្នាក់',
  title: 'លុប​គណនី',
  goesFaces: 'ប្រវត្តិរូប​ទាំងអស់​របស់​អ្នក៖ ប្រវត្តិរូប​ពិត និង​អត្តសញ្ញាណ​ទីពីរ​របស់​អ្នក',
  goesCharacter: 'តួអង្គ​របស់​អ្នក និង​អាវ៉ាតា​របស់​វា',
  goesPosts: 'ការ​បង្ហោះ មតិ និង​ប្រតិកម្ម​របស់​អ្នក',
  goesMessages: 'សារ WeeTalk របស់​អ្នក៖ ត្រូវ​បាន​សម្អាត ហើយ​ការ​សន្ទនា​របស់​ម្នាក់​ទៀត​នៅ​សល់​ដោយ​គ្មាន​សារ​ទាំង​នោះ',
  goesCreations: 'ស្នាដៃ គម្រោង និង​ការ​សន្ទនា Weë AI របស់​អ្នក',
  goesContacts: 'ទំនាក់ទំនង សហគមន៍ និង​អ្វី​ដែល​បាន​រក្សាទុក​របស់​អ្នក',
  goesCredits: 'Credits ដែល​នៅ​សល់៖ នឹង​បាត់ ហើយ​មិន​ត្រូវ​បាន​សង​វិញ​ទេ',
  whatStaysTitle: 'អ្វី​ដែល​ត្រូវ​រក្សាទុក',
  staysRecords: 'កំណត់ត្រា​គណនេយ្យ​នៃ Credits និង​ការ​ទូទាត់។ វា​ត្រូវ​បាន​រក្សាទុក​ដោយ​គ្មាន​ឈ្មោះ ឬ​ព័ត៌មាន​ប្រវត្តិរូប​របស់​អ្នក ព្រោះ​វា​ជា​គណនេយ្យ​របស់ Weë។',
  confirmLabel: 'ដើម្បី​បញ្ជាក់ សូម​វាយ "{{palabra}}"',
  confirmWord: 'លុប',
  confirmPlaceholder: 'វាយ​ពាក្យ​នៅ​ទីនេះ',
  dialogTitle: 'លុប​គណនី​របស់​អ្នក?',
  dialogConfirm: 'លុប',
  doneTitle: 'គណនី​របស់​អ្នក​ត្រូវ​បាន​លុប',
  doneBody: 'អរគុណ​ដែល​បាន​ចូលរួម​ជា​ផ្នែក​មួយ​នៃ Weë។',
  reauthTitle: 'ចូល​ម្តង​ទៀត',
  reauthBody: 'ដើម្បី​សុវត្ថិភាព អ្នក​ត្រូវ​តែ​បាន​ចូល​ថ្មីៗ​នេះ ទើប​អាច​លុប​គណនី​បាន។ សូម​ចាកចេញ ចូល​ម្តង​ទៀត ហើយ​ធ្វើ​ជំហាន​ទាំង​នេះ​ម្តង​ទៀត។',
  reauthButton: 'ចាកចេញ ដើម្បី​ចូល​ម្តង​ទៀត',
  errorTitle: 'មិន​អាច​បញ្ចប់​បាន',
  errorBody: 'មាន​អ្វី​មួយ​បរាជ័យ​នៅ​ពាក់​កណ្តាល​ផ្លូវ។ សូម​ព្យាយាម​ម្តង​ទៀត៖ វា​នឹង​បន្ត​ពី​កន្លែង​ដែល​វា​បាន​ឈប់។',
  retry: 'ព្យាយាម​ម្តង​ទៀត',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'គណនី​ត្រូវ​បិទ ហើយ​ក្រោយ 30 ថ្ងៃ អ្វីៗ​ទាំង​អស់​ត្រូវ​លុប',
  introDesactivar: 'គណនី​របស់អ្នក​ត្រូវ​បិទ​ឥឡូវ​នេះ ហើយ​បើ​អ្នក​មិន​ត្រឡប់​មក​វិញ​ក្នុង​រយៈ​ពេល 30 ថ្ងៃ អ្វីៗ​ទាំង​អស់​នឹង​ត្រូវ​លុប​ជា​រៀង​រហូត។',
  nowTitle: 'អ្វី​ដែល​កើត​ឡើង​ឥឡូវ​នេះ',
  nowHidden: 'គណនី​របស់អ្នក​លែង​បង្ហាញ៖ គ្មាន​នរណា​ម្នាក់​ឃើញ​ប្រវត្តិរូប ឬ​ការបង្ហោះ​របស់អ្នក​ទៀត​ទេ',
  nowCharacterOff: 'ស្វ័យភាព​របស់​តួអង្គ​អ្នក​ត្រូវ​បិទ ហើយ​ឈប់​គិត​ថ្លៃ',
  nowComeBack_one: 'អ្នក​មាន {{contador}} ថ្ងៃ​ដើម្បី​ត្រឡប់​មក​វិញ៖ ចូល​ម្តង​ទៀត ហើយ​ជ្រើស "បើក​គណនី​ឡើង​វិញ"',
  nowComeBack_other: 'អ្នក​មាន {{contador}} ថ្ងៃ​ដើម្បី​ត្រឡប់​មក​វិញ៖ ចូល​ម្តង​ទៀត ហើយ​ជ្រើស "បើក​គណនី​ឡើង​វិញ"',
  whatGoesLaterTitle: 'អ្វី​ដែល​ត្រូវ​លុប​បើ​អ្នក​មិន​ត្រឡប់​មក​វិញ',
  deactivateButton: 'លុប​គណនី​របស់ខ្ញុំ',
  dialogBodyDesactivar: 'គណនី​របស់អ្នក​នឹង​លែង​បង្ហាញ។ បើ​អ្នក​មិន​ត្រឡប់​មក​វិញ​ក្នុង​រយៈ​ពេល 30 ថ្ងៃ អ្វីៗ​ទាំង​អស់​នឹង​ត្រូវ​លុប ហើយ​អ្នក​នឹង​មិន​អាច​យក​មក​វិញ​បាន​ទេ។',
  deactivating: 'កំពុង​បិទ​គណនី​របស់អ្នក…',
  deactivatedTitle: 'គណនី​របស់អ្នក​ត្រូវ​បាន​បិទ',
  deactivatedBody: 'អ្នក​មាន​ពេល​រហូត​ដល់ {{fecha}} ដើម្បី​ត្រឡប់​មក​វិញ។ បន្ទាប់​មក អ្វីៗ​ទាំង​អស់​នឹង​ត្រូវ​លុប​ជា​រៀង​រហូត។',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'គណនី​របស់អ្នក​ត្រូវ​បាន​បិទ',
  activarBody: 'អ្នក​បាន​ស្នើ​លុប​គណនី​របស់អ្នក។ ខណៈ​ដែល​វា​ត្រូវ​បាន​បិទ គ្មាន​នរណា​ម្នាក់​ឃើញ​ប្រវត្តិរូប ឬ​ការបង្ហោះ​របស់អ្នក​ទេ។',
  activarDaysLeft_one: 'នៅ​សល់ {{contador}} ថ្ងៃ​ទៀត​មុន​ការ​លុប​ជា​ស្ថាពរ',
  activarDaysLeft_other: 'នៅ​សល់ {{contador}} ថ្ងៃ​ទៀត​មុន​ការ​លុប​ជា​ស្ថាពរ',
  activarDate: 'បើ​អ្នក​មិន​បើក​វា​ឡើង​វិញ​ទេ វា​នឹង​ត្រូវ​លុប​ជា​រៀង​រហូត​នៅ {{fecha}}។',
  activarCharacterNote: 'ស្វ័យភាព​របស់​តួអង្គ​អ្នក​នឹង​នៅ​តែ​បិទ អ្នក​អាច​កំណត់​កាលវិភាគ​វា​ឡើង​វិញ​ពេល​ណា​ក៏​បាន។',
  activarButton: 'បើក​គណនី​ឡើង​វិញ',
  activating: 'កំពុង​បើក​គណនី​របស់អ្នក​ឡើង​វិញ…',
  activatedTitle: 'គណនី​របស់អ្នក​ដំណើរការ​ឡើង​វិញ​ហើយ',
  activarExpiredTitle: 'ពេលវេលា​ដើម្បី​ត្រឡប់​មក​វិញ​បាន​ផុត​ហើយ',
  activarExpiredBody: 'គណនី​របស់អ្នក​នឹង​ត្រូវ​លុប​ទាំង​ស្រុង​ក្នុង​ប៉ុន្មាន​ម៉ោង​ខាង​មុខ។',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits ដែល​នៅ​សល់៖ នឹង​បាត់ ហើយ​មិន​ត្រូវ​បាន​សង​វិញ​ទេ',
};
