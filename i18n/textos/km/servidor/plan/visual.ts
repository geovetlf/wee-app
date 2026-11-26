/*
 * JEMER — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los huecos entran sin concordar. «រចនាប័ទ្ម» para arte y formato (glosario). El número va delante del sustantivo que
 * cuenta, entre espacios normales.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'ខ្ញុំ​នឹង​បង្កើត​ឡូហ្គោ {{numero}} សម្រាប់ "{{nombre}}"។',
  designExplicaLogoConNombreYAlma: 'ខ្ញុំ​នឹង​បង្កើត​ឡូហ្គោ {{numero}} សម្រាប់ "{{nombre}}" {{alma}}។',
  designAlmaSerious: 'ដែល​មើល​ទៅ​ម៉ឺងម៉ាត់​និង​គួរ​ឱ្យ​ទុកចិត្ត',
  designAlmaModern: 'ដែល​មើល​ទៅ​ទំនើប',
  designAlmaClose: 'ដែល​មើល​ទៅ​ស្និទ្ធស្នាល​និង​សប្បាយ',
  designAlmaLuxury: 'ដែល​មើល​ទៅ​ប្រណីត',
  designAlmaNatural: 'ដែល​មើល​ទៅ​ធម្មជាតិ',

  designExplicaAnuncio: 'ខ្ញុំ​នឹង​បង្កើត​សំណើ {{numero}} ដើម្បី​ប្រកាស {{anuncio}}។',
  designExplicaAnuncioConDonde: 'ខ្ញុំ​នឹង​បង្កើត​សំណើ {{numero}} ដើម្បី​ប្រកាស {{anuncio}} {{donde}}។',
  designDondeFeed: 'ជា​ទម្រង់​ការ៉េ សម្រាប់ Instagram ឬ Facebook',
  designDondeStory: 'ជា​ទម្រង់​បញ្ឈរ សម្រាប់ Story',
  designDondeWhatsapp: 'ជា​ទម្រង់​ងាយ​ចែករំលែក​តាម WhatsApp',
  designDondePrint: 'ជា​ទម្រង់ A4 រួចរាល់​សម្រាប់​បោះពុម្ព',

  designExplicaPropuestas: 'ខ្ញុំ​នឹង​បង្កើត​សំណើ {{numero}} សម្រាប់ {{cosa}}។',
  designExplicaPropuestasConMatiz: 'ខ្ញុំ​នឹង​បង្កើត​សំណើ {{numero}} សម្រាប់ {{cosa}} {{matiz}}។',
  designMatizLookClean: 'មាន​រូបរាង​ទំនើប​និង​ស្អាត',
  designMatizLookNatural: 'មាន​រូបរាង​ធម្មជាតិ',
  designMatizLookLuxury: 'មាន​រូបរាង​ប្រណីត',
  designMatizLookFun: 'មាន​រូបរាង​សប្បាយ​និង​ចម្រុះ​ពណ៌',
  designMatizLookIndustrial: 'មាន​រូបរាង​បែប​ឧស្សាហកម្ម',
  designMatizEraFuture: 'ពី​អនាគត',
  designMatizEraNow: 'សម័យ​បច្ចុប្បន្ន',
  designMatizEraClassic: 'រចនាប័ទ្ម​បុរាណ',
  designMatizEraScifi: 'បែប​វិទ្យាសាស្ត្រ​ប្រឌិត',
  designMatizInoutOutside: 'មើល​ពី​ខាងក្រៅ',
  designMatizInoutInside: 'មើល​ពី​ខាងក្នុង',
  designMatizInoutWide: 'ជា​ទិដ្ឋភាព​ទូលាយ',
  designMatizDrawCartoon: 'រចនាប័ទ្ម​តុក្កតា',
  designMatizDrawReal: 'រចនាប័ទ្ម​ដូច​ពិត',
  designMatizDrawGame: 'បែប​វីដេអូហ្គេម',
  designMatizDrawPencil: 'គូរ​ដោយ​ខ្មៅដៃ',
  designMatizDrawCute: 'មើល​ទៅ​គួរ​ឱ្យ​ស្រឡាញ់',

  designPasoConcepto: 'កំណត់​គំនិត',
  designPasoLogos: 'បង្កើត​ឡូហ្គោ {{numero}}',
  designPasoPropuestas: 'បង្កើត​សំណើ {{numero}}',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'ខ្ញុំ​នឹង​មើល​រូបថត​របស់អ្នក​ហើយ​ធ្វើ​ឱ្យ​មាន​ចលនា​ដោយ​រចនាប័ទ្ម {{estilo}}៖ ឃ្លីប {{segundos}} វិនាទី រួចរាល់​សម្រាប់​ចែករំលែក។',

  studioExplicaVideo: 'ខ្ញុំ​នឹង​សរសេរ​អត្ថបទរឿង​ខ្លី បង្កើត {{video}} {{segundos}} វិនាទី {{formato}} រចនាប័ទ្ម {{estilo}} ហើយ​ថត​ការនិទាន។',
  studioExplicaVideoPromo: 'ខ្ញុំ​នឹង​សរសេរ​អត្ថបទរឿង​ខ្លី បង្កើត​វីដេអូ {{segundos}} វិនាទី​ដើម្បី​ផ្សព្វផ្សាយ​អ្វីមួយ {{formato}} រចនាប័ទ្ម {{estilo}} ហើយ​ថត​ការនិទាន។',
  studioExplicaVideoMisRedes: 'ខ្ញុំ​នឹង​សរសេរ​អត្ថបទរឿង​ខ្លី បង្កើត​វីដេអូ {{segundos}} វិនាទី​សម្រាប់​បណ្តាញ​របស់អ្នក {{formato}} រចនាប័ទ្ម {{estilo}} ហើយ​ថត​ការនិទាន។',
  studioVideoRedes: 'វីដេអូ​សម្រាប់​បណ្តាញ​របស់អ្នក',
  studioEstiloRitmo: 'ស្និទ្ធស្នាល​និង​មាន​ចង្វាក់',
  studioFormatoVertical: 'ទម្រង់​បញ្ឈរ​សម្រាប់ Instagram និង TikTok',
  studioFormatoHorizontal: 'ទម្រង់​ផ្តេក​សម្រាប់ YouTube',
  studioFormatoCuadrado: 'ទម្រង់​ការ៉េ​សម្រាប់ WhatsApp និង Facebook',
  studioDecisionRedes: 'ខ្ញុំ​រៀបចំ​សម្រាប់​បណ្តាញ​របស់អ្នក',
  studioDecisionEstilo: 'ខ្ញុំ​បាន​ជ្រើស​រចនាប័ទ្ម​ស្និទ្ធស្នាល​និង​មាន​ចង្វាក់',
  studioDecisionVertical: 'ខ្ញុំ​ធ្វើ​ជា​ទម្រង់​បញ្ឈរ ដែល​សម​សម្រាប់ Instagram និង TikTok',

  studioPasoMirarFoto: 'មើល​រូបថត​របស់អ្នក',
  studioPasoMovimiento: 'ធ្វើ​ឱ្យ​រូបថត​មាន​ចលនា',
  studioPasoGuion: 'សរសេរ​អត្ថបទរឿង {{numero}} ឈុត',
  studioPasoVideo: 'បង្កើត​វីដេអូ',
  studioPasoNarracion: 'ថត​ការនិទាន',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'ខ្ញុំ​នឹង​បង្កើត​រូបភាព {{numero}} ពី​អ្វី​ដែល​អ្នក​បាន​ប្រាប់ {{como}}។',

  photoExplicaMejorarCalidad: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​កែលម្អ​គុណភាព​និង​កម្រិត​ច្បាស់ {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaQuitarAlgo: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​ដក​អ្វី​ដែល​លើស​ចេញ {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaFondo: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​ប្តូរ​ឬ​ដក​ផ្ទៃ​ខាងក្រោយ {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaRestaurar: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​ជួសជុល​រូបថត​ចាស់ {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaRetoque: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​កែ​ផ្ទៃមុខ​បែប​ធម្មជាតិ {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaColorizar: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​បន្ថែម​ពណ៌​លើ​រូប​ស​ខ្មៅ {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaTransformar: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​បំប្លែង​ជាមួយ​រចនាប័ទ្ម {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaSinAccion: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​កែលម្អ​គុណភាព {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoExplicaAccion: 'ដំបូង​ខ្ញុំ​មើល​រូបថត​របស់អ្នក ហើយ​បន្ទាប់​មក​ធ្វើ៖ {{accion}} {{como}}។ អ្វី​ផ្សេង​នៅ​ដដែល។',
  photoComoNatural: 'ឱ្យ​ធម្មជាតិ​បំផុត',
  photoDecisionCalidad: 'ខ្ញុំ​ចាប់ផ្តើម​ដោយ​កែលម្អ​គុណភាព',
  photoDecisionNatural: 'ខ្ញុំ​ធ្វើ​ឱ្យ​ធម្មជាតិ​បំផុត',
  photoDecisionNaturales: 'ខ្ញុំ​ធ្វើ​រូបភាព​ឱ្យ​ធម្មជាតិ​បំផុត',

  photoPasoMirarFoto: 'មើល​រូបថត​ដើម្បី​យល់​ពី​អ្វី​ដែល​មាន',
  photoPasoImagenes: 'បង្កើត​រូបភាព {{numero}}',
  photoPasoMejorarFoto: 'កែលម្អ​រូបថត',
  photoPasoMejorarCalidad: 'កែលម្អ​គុណភាព​និង​កម្រិត​ច្បាស់',
  photoPasoQuitarAlgo: 'ដក​អ្វី​ដែល​លើស​ចេញ',
  photoPasoFondo: 'ប្តូរ​ឬ​ដក​ផ្ទៃ​ខាងក្រោយ',
  photoPasoRestaurar: 'ជួសជុល​រូបថត​ចាស់',
  photoPasoRetoque: 'កែ​ផ្ទៃមុខ​បែប​ធម្មជាតិ',
  photoPasoColorizar: 'បន្ថែម​ពណ៌​លើ​រូប​ស​ខ្មៅ',
  photoPasoTransformar: 'បំប្លែង​ជាមួយ​រចនាប័ទ្ម',

  /* La voz de quien habla: esta pieza manda sobre la opción y Weë habla de «អ្នក». */
  designCosaMascota: 'តួ​និមិត្តសញ្ញា​សម្រាប់​ម៉ាក​របស់អ្នក',
};
