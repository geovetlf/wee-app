/*
 * JEMER — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * «សំនៀង» = tono; «រូបរាង» y «ស្ទីល» para el look. Los huecos entran sin concordar.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'ខ្ញុំ​នឹង​ស្វែងរក​សម្រង់​ពិតៗ​អំពី​ប្រធានបទ ហើយ​ទុក​ប្រភព​នៃ​សម្រង់​នីមួយៗ​ដើម្បី​ឱ្យ​អ្នក​អាច​ពិនិត្យ។',
  writerPasoCitas: 'ស្វែងរក​សម្រង់​និង​ប្រភព',

  writerExplicaTraducir: 'ខ្ញុំ​នឹង​បកប្រែ​អត្ថបទ​របស់អ្នក​ទៅ​ភាសា {{idioma}} ដោយ​រក្សា​អត្ថន័យ​និង​សំនៀង។',
  writerPasoTraducir: 'បកប្រែ​ទៅ​ភាសា {{idioma}}',
  writerDecisionIdiomaIngles: 'ខ្ញុំ​បកប្រែ​ទៅ​ភាសា​អង់គ្លេស',
  writerIdiomaEn: 'អង់គ្លេស',
  writerIdiomaPt: 'ព័រទុយហ្គាល់',
  writerIdiomaFr: 'បារាំង',
  writerIdiomaIt: 'អ៊ីតាលី',

  writerExplicaResumir: 'ខ្ញុំ​នឹង​សង្ខេប​អត្ថបទ​របស់អ្នក​ជា​គំនិត​សំខាន់ៗ ក្នុង​បន្ទាត់​ពីរ​បី។',
  writerPasoResumir: 'សង្ខេប​ជា​គំនិត​សំខាន់ៗ',
  writerExplicaCorregir: 'ខ្ញុំ​នឹង​កែតម្រូវ​អក្ខរាវិរុទ្ធ រចនាបទ​សរសេរ និង​ភាព​ច្បាស់​លាស់ ដោយ​មិន​ប្តូរ​អ្វី​ដែល​អ្នក​ចង់​និយាយ។',
  writerPasoCorregir: 'កែតម្រូវ​អក្ខរាវិរុទ្ធ រចនាបទ​សរសេរ និង​ភាព​ច្បាស់​លាស់',
  writerExplicaIdeas: 'ខ្ញុំ​នឹង​ស្នើ​គំនិត​ច្រើន​និង​ចំណុច​ចាប់ផ្តើម ដើម្បី​ឱ្យ​អ្នក​សរសេរ​ដោយ​មិន​ជាប់​គាំង។',
  writerPasoIdeas: 'ស្នើ​គំនិត​សម្រាប់​សរសេរ',

  writerExplicaPortada: 'ខ្ញុំ​នឹង​កំណត់​គំនិត​គម្រប​ហើយ​បង្កើត​សំណើ​បី​ឱ្យ​អ្នក​ជ្រើស។',
  writerPasoConceptoPortada: 'កំណត់​គំនិត​គម្រប',
  writerPasoPropuestasPortada: 'បង្កើត​សំណើ​គម្រប 3',

  writerExplicaReescribir: 'ខ្ញុំ​នឹង​សរសេរ​អត្ថបទ​របស់អ្នក​ឡើងវិញ​ដោយ​សំនៀង {{tono}} និង​រក្សា​គំនិត​ដើម។',
  writerPasoReescribir: 'សរសេរ​អត្ថបទ​ឡើងវិញ',
  writerExplicaCv: 'ខ្ញុំ​នឹង​សរសេរ CV របស់អ្នក​ដោយ​សំនៀង {{tono}} រួចរាល់​សម្រាប់​ប្រើ​ក្នុង​កម្មវិធី​កែសម្រួល​និង​ផ្ញើ។',
  writerPasoCv: 'សរសេរ CV របស់អ្នក',

  writerExplicaPublicacion: 'ខ្ញុំ​នឹង​សរសេរ​សារបង្ហោះ​ដោយ​សំនៀង {{tono}} ហើយ​កែ​ឱ្យ​ល្អ​រហូត​រួចរាល់។',
  writerExplicaHistoria: 'ខ្ញុំ​នឹង​សរសេរ​រឿង​ដោយ​សំនៀង {{tono}} ហើយ​កែ​ឱ្យ​ល្អ​រហូត​រួចរាល់។',
  writerExplicaGuion: 'ខ្ញុំ​នឹង​សរសេរ​អត្ថបទរឿង​ដោយ​សំនៀង {{tono}} ហើយ​កែ​ឱ្យ​ល្អ​រហូត​រួចរាល់។',
  writerExplicaArticulo: 'ខ្ញុំ​នឹង​សរសេរ​អត្ថបទ​ដោយ​សំនៀង {{tono}} ហើយ​កែ​ឱ្យ​ល្អ​រហូត​រួចរាល់។',
  writerExplicaEmail: 'ខ្ញុំ​នឹង​សរសេរ​អ៊ីមែល​ដោយ​សំនៀង {{tono}} ហើយ​កែ​ឱ្យ​ល្អ​រហូត​រួចរាល់។',
  writerExplicaDocumento: 'ខ្ញុំ​នឹង​សរសេរ​ឯកសារ​ដោយ​សំនៀង {{tono}} ហើយ​កែ​ឱ្យ​ល្អ​រហូត​រួចរាល់។',
  writerPasoPublicacion: 'សរសេរ​សារបង្ហោះ',
  writerPasoHistoria: 'សរសេរ​រឿង',
  writerPasoGuion: 'សរសេរ​អត្ថបទរឿង',
  writerPasoArticulo: 'សរសេរ​អត្ថបទ',
  writerPasoEmail: 'សរសេរ​អ៊ីមែល',
  writerPasoDocumento: 'សរសេរ​ឯកសារ',
  writerPasoPulir: 'កែ​អត្ថបទ​ឱ្យ​ល្អ​រហូត​រួចរាល់',

  writerDecisionEmpiezoPublicacion: 'ខ្ញុំ​ចាប់ផ្តើម​ពី​សារបង្ហោះ',
  writerDecisionTonoCercano: 'ខ្ញុំ​ប្រើ​សំនៀង​ស្និទ្ធស្នាល',
  writerDecisionTonoProfesional: 'ខ្ញុំ​ប្រើ​សំនៀង​វិជ្ជាជីវៈ',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'ខ្ញុំ​នឹង​រៀបចំ​អត្ថបទ​ហើយ​ថត​ជាមួយ​សំឡេង {{voz}}។',
  musicExplicaVozCalida: 'ខ្ញុំ​នឹង​រៀបចំ​អត្ថបទ​ហើយ​ថត​ជាមួយ​សំឡេង​កក់ក្តៅ​និង​ច្បាស់។',
  musicPasoTextoNarracion: 'រៀបចំ​អត្ថបទ​និទាន',
  musicPasoGrabarVoz: 'ថត​សំឡេង',

  musicExplicaLetra: 'ខ្ញុំ​នឹង​សរសេរ​ទំនុក​ច្រៀង​ពេញលេញ រចនាប័ទ្ម {{estilo}}។',
  musicPasoLetraCompleta: 'សរសេរ​ទំនុក​ច្រៀង​ពេញលេញ',

  musicExplicaMezcla: 'ខ្ញុំ​នឹង​ស្តាប់​បទចម្រៀង​របស់អ្នក ធ្វើ Mix និង Master ដើម្បី​ឱ្យ​សំឡេង​មាន​លក្ខណៈ​វិជ្ជាជីវៈ។',
  musicPasoAnotarMezcla: 'ស្តាប់​បទចម្រៀង​របស់អ្នក​និង​កត់ចំណាំ​សម្រាប់ Mix',
  musicPasoMasterizar: 'ធ្វើ Mix និង Master',

  musicExplicaVideoclip: 'ខ្ញុំ​នឹង​បង្កើត​បទចម្រៀង ({{estilo}}, {{animo}}) ឈុត​នានា ហើយ​កាត់តរ​វីដេអូ​ចម្រៀង​ពេញលេញ។ អ្នក​មិន​ចាំបាច់​ចាកចេញ​ពី Weë Music ទេ។',
  musicPasoIdeaYLetra: 'សរសេរ​គំនិត​និង​ទំនុក​ច្រៀង',
  musicPasoEscenas: 'បង្កើត​ឈុត​នៃ​វីដេអូ​ចម្រៀង',
  musicPasoArmarVideoclip: 'កាត់តរ​វីដេអូ​ចម្រៀង​ជាមួយ​បទ​របស់អ្នក',

  musicExplicaJingle: 'ខ្ញុំ​នឹង​បង្កើត Jingle ខ្លី​និង​ងាយ​ចាំ រចនាប័ទ្ម {{estilo}} អារម្មណ៍ {{animo}}។',
  musicPasoFraseJingle: 'សរសេរ​ឃ្លា​នៃ Jingle',
  musicPasoJingle: 'បង្កើត Jingle',
  musicExplicaBeat: 'ខ្ញុំ​នឹង​បង្កើត Beat រចនាប័ទ្ម {{estilo}} អារម្មណ៍ {{animo}}។',
  musicPasoIdeaMusical: 'កំណត់​គំនិត​តន្ត្រី',
  musicPasoBeat: 'បង្កើត Beat',

  musicExplicaCancion: 'ខ្ញុំ​នឹង​សរសេរ​ទំនុក​ច្រៀង បង្កើត​បទចម្រៀង​រចនាប័ទ្ម {{estilo}} អារម្មណ៍ {{animo}} ហើយ​រចនា​គម្រប។',
  musicPasoLetra: 'សរសេរ​ទំនុក​ច្រៀង',
  musicPasoCancion: 'បង្កើត​បទចម្រៀង',
  musicPasoPortada: 'រចនា​គម្រប',

  musicDecisionEmpiezoCancion: 'ខ្ញុំ​ចាប់ផ្តើម​ពី​បទចម្រៀង',
  musicDecisionEstiloPop: 'ខ្ញុំ​បាន​ជ្រើស​រចនាប័ទ្ម Pop',
  musicDecisionAnimoAlegre: 'ជាមួយ​អារម្មណ៍​រីករាយ',
  musicDecisionVozCalida: 'ខ្ញុំ​បាន​ជ្រើស​សំឡេង​កក់ក្តៅ​និង​ច្បាស់',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'ខ្ញុំ​នឹង​មើល​រូបថត​របស់អ្នក​ហើយ​រៀបចំ​របៀប​ថែរក្សា​ស្បែក​សាមញ្ញ ជាមួយ​ផលិតផល​ងាយ​រក។',
  beautyPasoRutina: 'រៀបចំ​របៀប​ថែរក្សា​របស់អ្នក',

  beautyExplicaRostro: 'ខ្ញុំ​នឹង​មើល​ផ្ទៃមុខ​របស់អ្នក ណែនាំ​ការកាត់សក់​និង​ស្ទីល​ដែល​សម​បំផុត ហើយ​សាកល្បង​ពីរ​លើ​រូបថត​របស់អ្នក។',
  beautyPasoMirarRostro: 'មើល​ផ្ទៃមុខ​របស់អ្នក',
  beautyPasoRecomendar: 'ណែនាំ​ការកាត់សក់ វ៉ែនតា និង​ស្ទីល',
  beautyPasoProbarDosEstilos: 'សាកល្បង​ស្ទីល​ពីរ​ដែល​សម​បំផុត',

  beautyExplicaProbar: 'ខ្ញុំ​នឹង​សាកល្បង {{cambio}} សម្រាប់ {{ocasion}} ជា​ពីរ​កំណែ ដោយ​រក្សា​ផ្ទៃមុខ ស្បែក និង​ពន្លឺ​នៃ​រូបថត។',
  beautyPasoProbar: 'សាកល្បង {{cambio}} ដោយ​រក្សា​ផ្ទៃមុខ​របស់អ្នក',
  beautyOcasionElDiaADia: 'ជីវិត​ប្រចាំថ្ងៃ',

  beautyDecisionCambioCompleto: 'ខ្ញុំ​ស្នើ​ការផ្លាស់ប្តូរ​រូបរាង​ទាំងស្រុង',
  beautyDecisionOcasionDiaADia: 'ខ្ញុំ​គិត​សម្រាប់​ជីវិត​ប្រចាំថ្ងៃ',
};
