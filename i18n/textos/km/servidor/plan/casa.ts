/*
 * JEMER — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` ya trae «សម្រាប់» y los demás huecos entran sin concordar. «ស្ទីល» y «រចនាប័ទ្ម» siguen el reparto del
 * glosario: en Home, «រចនាប័ទ្ម».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'ខ្ញុំ​នឹង​ចាប់ផ្តើម​ពី​រូបថត​របស់អ្នក ហើយ​កែលម្អ​ពន្លឺ។ ម្ហូប​នៅ​ដដែល​ទាំងស្រុង។',
  chefExplicaRetoqueFondo: 'ខ្ញុំ​នឹង​ចាប់ផ្តើម​ពី​រូបថត​របស់អ្នក ហើយ​ប្តូរ​ផ្ទៃ​ខាងក្រោយ។ ម្ហូប​នៅ​ដដែល​ទាំងស្រុង។',
  chefExplicaRetoqueApetitoso: 'ខ្ញុំ​នឹង​ចាប់ផ្តើម​ពី​រូបថត​របស់អ្នក ហើយ​ធ្វើ​ឱ្យ​មើល​ទៅ​គួរ​ឱ្យ​ឃ្លាន​ជាង​មុន។ ម្ហូប​នៅ​ដដែល​ទាំងស្រុង។',
  chefExplicaRetoqueRestaurante: 'ខ្ញុំ​នឹង​ចាប់ផ្តើម​ពី​រូបថត​របស់អ្នក ហើយ​ធ្វើ​ឱ្យ​ដូច​រូបថត​ភោជនីយដ្ឋាន។ ម្ហូប​នៅ​ដដែល​ទាំងស្រុង។',
  chefExplicaRetoqueQuitar: 'ខ្ញុំ​នឹង​ចាប់ផ្តើម​ពី​រូបថត​របស់អ្នក ហើយ​ដក​អ្វី​ដែល​លើស​ចេញ។ ម្ហូប​នៅ​ដដែល​ទាំងស្រុង។',
  chefExplicaRetoqueNoSe: 'ខ្ញុំ​នឹង​ចាប់ផ្តើម​ពី​រូបថត​របស់អ្នក ហើយ​កែលម្អ​រូបរាង​ដោយ​មិន​ប្តូរ​ម្ហូប។ ម្ហូប​នៅ​ដដែល​ទាំងស្រុង។',
  chefExplicaRetoqueLibre: 'ខ្ញុំ​នឹង​ចាប់ផ្តើម​ពី​រូបថត​របស់អ្នក ហើយ​ធ្វើ​តែ​ការផ្លាស់ប្តូរ​ដែល​អ្នក​បាន​ប្រាប់។ ម្ហូប​នៅ​ដដែល​ទាំងស្រុង។',

  chefExplicaMenuTresDias: 'ខ្ញុំ​នឹង​រៀបចំ​ម៉ឺនុយ​បី​ថ្ងៃ {{comensales}} ហើយ​ទុក​បញ្ជី​ទិញ​ឥវ៉ាន់​ជូន​អ្នក។',
  chefExplicaMenuTodaLaSemana: 'ខ្ញុំ​នឹង​រៀបចំ​ម៉ឺនុយ​ពេញ​មួយ​សប្តាហ៍ {{comensales}} ហើយ​ទុក​បញ្ជី​ទិញ​ឥវ៉ាន់​ជូន​អ្នក។',
  chefExplicaMenuParaLaSemana: 'ខ្ញុំ​នឹង​រៀបចំ​ម៉ឺនុយ​សម្រាប់​សប្តាហ៍ {{comensales}} ហើយ​ទុក​បញ្ជី​ទិញ​ឥវ៉ាន់​ជូន​អ្នក។',
  chefExplicaMenu: 'ខ្ញុំ​នឹង​រៀបចំ​ម៉ឺនុយ {{duracion}} {{comensales}} ហើយ​ទុក​បញ្ជី​ទិញ​ឥវ៉ាន់​ជូន​អ្នក។',

  chefExplicaRecetaEnTiempo: 'ខ្ញុំ​នឹង​រៀបចំ​រូបមន្ត​មួយ​ជំហាន​ម្តងៗ ក្នុង​រយៈពេល {{tiempo}} {{comensales}} និង​រូបថត​ម្ហូប​ពេល​ធ្វើ​រួច។',
  chefExplicaRecetaSinApuro: 'ខ្ញុំ​នឹង​រៀបចំ​រូបមន្ត​មួយ​ជំហាន​ម្តងៗ ដោយ​មិន​ប្រញាប់ {{comensales}} និង​រូបថត​ម្ហូប​ពេល​ធ្វើ​រួច។',
  chefExplicaConLoQueTienesEnTiempo: 'ខ្ញុំ​នឹង​រៀបចំ​រូបមន្ត​ជាមួយ​អ្វី​ដែល​អ្នក​មាន​នៅ​ផ្ទះ ក្នុង​រយៈពេល {{tiempo}} {{comensales}} និង​រូបថត​ម្ហូប​ពេល​ធ្វើ​រួច។',
  chefExplicaConLoQueTienesSinApuro: 'ខ្ញុំ​នឹង​រៀបចំ​រូបមន្ត​ជាមួយ​អ្វី​ដែល​អ្នក​មាន​នៅ​ផ្ទះ ដោយ​មិន​ប្រញាប់ {{comensales}} និង​រូបថត​ម្ហូប​ពេល​ធ្វើ​រួច។',
  chefExplicaSaludableEnTiempo: 'ខ្ញុំ​នឹង​រៀបចំ​រូបមន្ត​មាន​សុខភាព​ល្អ ក្នុង​រយៈពេល {{tiempo}} {{comensales}} និង​រូបថត​ម្ហូប​ពេល​ធ្វើ​រួច។',
  chefExplicaSaludableSinApuro: 'ខ្ញុំ​នឹង​រៀបចំ​រូបមន្ត​មាន​សុខភាព​ល្អ ដោយ​មិន​ប្រញាប់ {{comensales}} និង​រូបថត​ម្ហូប​ពេល​ធ្វើ​រួច។',
  chefExplicaPostreEnTiempo: 'ខ្ញុំ​នឹង​រៀបចំ​បង្អែម ក្នុង​រយៈពេល {{tiempo}} {{comensales}} និង​រូបថត​ពេល​ធ្វើ​រួច។',
  chefExplicaPostreSinApuro: 'ខ្ញុំ​នឹង​រៀបចំ​បង្អែម ដោយ​មិន​ប្រញាប់ {{comensales}} និង​រូបថត​ពេល​ធ្វើ​រួច។',

  chefDecisionAlgoRico: 'ខ្ញុំ​ស្នើ​អ្វីមួយ​ឆ្ងាញ់​និង​ងាយ​ជាមួយ​អ្វី​ដែល​អ្នក​តែង​មាន​នៅ​ផ្ទះ',
  chefDecisionParaDos: 'ខ្ញុំ​គិត​សម្រាប់​ពីរ​នាក់',
  chefDecisionSinApuro: 'ដោយ​មិន​ប្រញាប់',
  chefDecisionTodaLaSemana: 'ខ្ញុំ​ធ្វើ​សម្រាប់​ពេញ​មួយ​សប្តាហ៍',

  chefPasoMirarIngredientes: 'មើល​គ្រឿងផ្សំ​ដែល​អ្នក​មាន',
  chefPasoEscribirReceta: 'សរសេរ​រូបមន្ត​ជំហាន​ម្តងៗ',
  chefPasoFotoDelPlato: 'បង្កើត​រូបថត​ម្ហូប',
  chefPasoArmarMenu: 'រៀបចំ​ម៉ឺនុយ',
  chefPasoPreciosIngredientes: 'មើល​តម្លៃ​គ្រឿងផ្សំ',
  chefPasoListaDeCompras: 'ធ្វើ​បញ្ជី​ទិញ​ឥវ៉ាន់',
  chefPasoRetocarFoto: 'កែ​រូបថត​ម្ហូប​របស់អ្នក',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'ខ្ញុំ​នឹង​មើល {{espacio}} ហើយ​ប្រាប់​អ្នក​ពី​អ្វី​ដែល​ខ្ញុំ​នឹង​ប្តូរ —គ្រឿងសង្ហារិម ពណ៌ ការរៀបចំ​ប្លង់— ដើម្បី​ឱ្យ​អ្នក​ជ្រើស​កន្លែង​ចាប់ផ្តើម។ ខ្ញុំ​មិនទាន់​បង្កើត​រូបភាព​ទេ។',
  homeExplicaIdeas: 'ខ្ញុំ​នឹង​ស្វែងរក​គំនិត​បី​សម្រាប់ {{espacio}} ក្នុង​រចនាប័ទ្ម {{estilo}} ហើយ​ពន្យល់​ពី​របៀប​ធ្វើ។',
  homeExplicaDistribucion: 'ខ្ញុំ​នឹង​មើល {{espacio}} ស្នើ​ការរៀបចំ​ប្លង់​ដែល​ប្រើ​កន្លែង​បាន​ល្អ​ជាង ហើយ​បង្ហាញ​លទ្ធផល​ជាមួយ​គ្រឿងសង្ហារិម​ដដែល​របស់អ្នក។',
  homeExplicaRedisenar: 'ខ្ញុំ​នឹង​រចនា {{espacio}} ឡើងវិញ​ក្នុង​រចនាប័ទ្ម {{estilo}} ជា​ពីរ​សំណើ ហើយ​ទុក​បញ្ជី​ការផ្លាស់ប្តូរ​និង​ការទិញ​ជូន​អ្នក។',
  homeExplicaMuebles: 'ខ្ញុំ​នឹង​ប្តូរ​គ្រឿងសង្ហារិម​នៃ {{espacio}} ក្នុង​រចនាប័ទ្ម {{estilo}} ជា​ពីរ​សំណើ ហើយ​ទុក​បញ្ជី​ការផ្លាស់ប្តូរ​និង​ការទិញ​ជូន​អ្នក។',
  homeExplicaColores: 'ខ្ញុំ​នឹង​ប្តូរ​រចនាប័ទ្ម​និង​ពណ៌​នៃ {{espacio}} ទៅ​រចនាប័ទ្ម {{estilo}} ជា​ពីរ​សំណើ ហើយ​ទុក​បញ្ជី​ការផ្លាស់ប្តូរ​និង​ការទិញ​ជូន​អ្នក។',
  homeExplicaExterior: 'ខ្ញុំ​នឹង​រចនា​ផ្នែក​ខាងក្រៅ​របស់អ្នក​ក្នុង​រចនាប័ទ្ម {{estilo}} ជា​ពីរ​សំណើ ហើយ​ទុក​បញ្ជី​ការផ្លាស់ប្តូរ​និង​ការទិញ​ជូន​អ្នក។',

  homeDecisionEmpiezoPorLaSala: 'ខ្ញុំ​ចាប់ផ្តើម​ពី​បន្ទប់​ទទួល​ភ្ញៀវ',
  homeDecisionEstiloAcogedor: 'ខ្ញុំ​បាន​ជ្រើស​រចនាប័ទ្ម​កក់ក្តៅ',

  homePasoMirarFotoDelEspacio: 'មើល​រូបថត​កន្លែង',
  homePasoRedisenar: 'រចនា {{espacio}} ឡើងវិញ​ក្នុង​រចនាប័ទ្ម {{estilo}}',
  homePasoMuebles: 'ប្តូរ​គ្រឿងសង្ហារិម​នៃ {{espacio}} ក្នុង​រចនាប័ទ្ម {{estilo}}',
  homePasoColores: 'ប្តូរ​រចនាប័ទ្ម​និង​ពណ៌​នៃ {{espacio}} ទៅ​រចនាប័ទ្ម {{estilo}}',
  homePasoExterior: 'រចនា​ផ្នែក​ខាងក្រៅ​របស់អ្នក​ក្នុង​រចនាប័ទ្ម {{estilo}}',
  homePasoListaDeCambios: 'ធ្វើ​បញ្ជី​ការផ្លាស់ប្តូរ​និង​ការទិញ',
  homePasoProponerDistribucion: 'ស្នើ​ការរៀបចំ​ប្លង់​ល្អ​ជាង',
  homePasoMostrarComoQuedaria: 'បង្ហាញ​លទ្ធផល​ជូន​អ្នក',
  homePasoBuscarIdeas: 'ស្វែងរក​គំនិត​សម្រាប់ {{espacio}}',
  homePasoExplicarComoLograrlo: 'ពន្យល់​ពី​របៀប​ធ្វើ',
  homePasoMirarFotoDeTuEspacio: 'មើល​រូបថត​កន្លែង​របស់អ្នក',
  homePasoContarQueVeo: 'ប្រាប់​ពី​អ្វី​ដែល​ខ្ញុំ​ឃើញ​និង​នឹង​ធ្វើ',

  /* La voz de quien habla: esta pieza manda sobre la opción y Weë habla de «អ្នក». */
  chefComensalesSoloParaMi: 'សម្រាប់​តែ​អ្នក',
  homeEspacioMiOficina: 'ការិយាល័យ​របស់អ្នក',
};
