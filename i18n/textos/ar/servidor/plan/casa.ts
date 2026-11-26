/*
 * ÁRABE — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`). Traducción de IA
 * pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Los comensales ya traen su preposición
 * («لشخصين»), el tiempo va tras «في» y el espacio, con su artículo, tras «لتجديد» o como complemento directo. El estilo
 * concuerda con «أسلوب», en masculino.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'سأبدأ من صورتك وأحسّن الإضاءة. ويبقى الطبق كما هو تمامًا.',
  chefExplicaRetoqueFondo: 'سأبدأ من صورتك وأغيّر الخلفية. ويبقى الطبق كما هو تمامًا.',
  chefExplicaRetoqueApetitoso: 'سأبدأ من صورتك وأجعله يبدو أشهى. ويبقى الطبق كما هو تمامًا.',
  chefExplicaRetoqueRestaurante: 'سأبدأ من صورتك وأمنحها مظهر صور المطاعم. ويبقى الطبق كما هو تمامًا.',
  chefExplicaRetoqueQuitar: 'سأبدأ من صورتك وأزيل ما هو زائد. ويبقى الطبق كما هو تمامًا.',
  chefExplicaRetoqueNoSe: 'سأبدأ من صورتك وأحسّن مظهرها دون تغيير الطبق. ويبقى الطبق كما هو تمامًا.',
  chefExplicaRetoqueLibre: 'سأبدأ من صورتك وأجري التغييرات التي طلبتها فقط. ويبقى الطبق كما هو تمامًا.',

  chefExplicaMenuTresDias: 'سأعدّ قائمة طعام لثلاثة أيام، {{comensales}}، وأترك لك قائمة التسوق.',
  chefExplicaMenuTodaLaSemana: 'سأعدّ قائمة طعام للأسبوع كله، {{comensales}}، وأترك لك قائمة التسوق.',
  chefExplicaMenuParaLaSemana: 'سأعدّ قائمة طعام للأسبوع، {{comensales}}، وأترك لك قائمة التسوق.',
  chefExplicaMenu: 'سأعدّ قائمة طعام لمدة {{duracion}}، {{comensales}}، وأترك لك قائمة التسوق.',

  chefExplicaRecetaEnTiempo: 'سأعدّ وصفة خطوة بخطوة في {{tiempo}}، {{comensales}}، وصورة تُظهر شكل الطبق.',
  chefExplicaRecetaSinApuro: 'سأعدّ وصفة خطوة بخطوة بلا استعجال، {{comensales}}، وصورة تُظهر شكل الطبق.',
  chefExplicaConLoQueTienesEnTiempo: 'سأعدّ وصفة بما لديك في المنزل في {{tiempo}}، {{comensales}}، وصورة تُظهر شكل الطبق.',
  chefExplicaConLoQueTienesSinApuro: 'سأعدّ وصفة بما لديك في المنزل بلا استعجال، {{comensales}}، وصورة تُظهر شكل الطبق.',
  chefExplicaSaludableEnTiempo: 'سأعدّ وصفة صحية في {{tiempo}}، {{comensales}}، وصورة تُظهر شكل الطبق.',
  chefExplicaSaludableSinApuro: 'سأعدّ وصفة صحية بلا استعجال، {{comensales}}، وصورة تُظهر شكل الطبق.',
  chefExplicaPostreEnTiempo: 'سأعدّ حلوى في {{tiempo}}، {{comensales}}، وصورة تُظهر شكل الطبق.',
  chefExplicaPostreSinApuro: 'سأعدّ حلوى بلا استعجال، {{comensales}}، وصورة تُظهر شكل الطبق.',

  chefDecisionAlgoRico: 'أقترح عليك شيئًا لذيذًا وسهلًا بما يتوفر عادةً في منزلك',
  chefDecisionParaDos: 'أعددته لشخصين',
  chefDecisionSinApuro: 'لن أتقيد بوقت محدد',
  chefDecisionTodaLaSemana: 'سأعدّه للأسبوع كله',

  chefPasoMirarIngredientes: 'النظر في المكونات المتوفرة لديك',
  chefPasoEscribirReceta: 'كتابة الوصفة خطوة بخطوة',
  chefPasoFotoDelPlato: 'إنشاء صورة للطبق',
  chefPasoArmarMenu: 'إعداد قائمة الطعام',
  chefPasoPreciosIngredientes: 'معرفة تكلفة المكونات',
  chefPasoListaDeCompras: 'إعداد قائمة التسوق',
  chefPasoRetocarFoto: 'تعديل صورة طبقك',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'سأنظر في {{espacio}} وأخبرك بما كنت سأغيّره —الأثاث والألوان وتوزيع المساحة— لتختار من أين تبدأ. لن أنشئ أي صورة بعد.',
  homeExplicaIdeas: 'سأبحث عن ثلاث أفكار لتجديد {{espacio}} بأسلوب {{estilo}} وأشرح لك كيف تحققها.',
  homeExplicaDistribucion: 'سأنظر في {{espacio}} وأقترح عليك توزيعًا يستفيد من المساحة بشكل أفضل، وأريك كيف سيبدو بأثاثك نفسه.',
  homeExplicaRedisenar: 'سأعيد تصميم {{espacio}} بأسلوب {{estilo}}، في مقترحين، وأترك لك قائمة التغييرات والمشتريات.',
  homeExplicaMuebles: 'سأغيّر أثاث {{espacio}} بأسلوب {{estilo}}، في مقترحين، وأترك لك قائمة التغييرات والمشتريات.',
  homeExplicaColores: 'سأغيّر طراز {{espacio}} وألوانه بأسلوب {{estilo}}، في مقترحين، وأترك لك قائمة التغييرات والمشتريات.',
  homeExplicaExterior: 'سأصمّم مساحتك الخارجية بأسلوب {{estilo}}، في مقترحين، وأترك لك قائمة التغييرات والمشتريات.',

  homeDecisionEmpiezoPorLaSala: 'سأبدأ بغرفة المعيشة',
  homeDecisionEstiloAcogedor: 'اخترت أسلوبًا مريحًا',

  homePasoMirarFotoDelEspacio: 'النظر في صورة المكان',
  homePasoRedisenar: 'إعادة تصميم {{espacio}} بأسلوب {{estilo}}',
  homePasoMuebles: 'تغيير أثاث {{espacio}} بأسلوب {{estilo}}',
  homePasoColores: 'تغيير طراز {{espacio}} وألوانه بأسلوب {{estilo}}',
  homePasoExterior: 'تصميم مساحتك الخارجية بأسلوب {{estilo}}',
  homePasoListaDeCambios: 'إعداد قائمة التغييرات والمشتريات',
  homePasoProponerDistribucion: 'اقتراح توزيع أفضل',
  homePasoMostrarComoQuedaria: 'أن أريك كيف سيبدو',
  homePasoBuscarIdeas: 'البحث عن أفكار لتجديد {{espacio}}',
  homePasoExplicarComoLograrlo: 'أن أشرح لك كيف تحقق ذلك',
  homePasoMirarFotoDeTuEspacio: 'النظر في صورة مكانك',
  homePasoContarQueVeo: 'أن أخبرك بما أراه وما كنت سأفعله',

  /* Weë se dirige a la persona: esta pieza manda sobre la opción, escrita con su voz. */
  chefComensalesSoloParaMi: 'لك فقط',
  homeEspacioMiOficina: 'مكتبك',
};
