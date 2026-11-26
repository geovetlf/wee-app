/*
 * PERSA — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` no lleva «یک» y entra delante de «را» o tras la ezafe («مبلمان اتاق خواب»). `{{comensales}}` ya trae su
 * «برای». `{{estilo}}` sigue a «سبک».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'از عکس شما شروع می‌کنم و نور را بهتر می‌کنم. غذا دقیقاً همان‌طور که هست می‌ماند.',
  chefExplicaRetoqueFondo: 'از عکس شما شروع می‌کنم و پس‌زمینه را تغییر می‌دهم. غذا دقیقاً همان‌طور که هست می‌ماند.',
  chefExplicaRetoqueApetitoso: 'از عکس شما شروع می‌کنم و کاری می‌کنم اشتهاآورتر به نظر برسد. غذا دقیقاً همان‌طور که هست می‌ماند.',
  chefExplicaRetoqueRestaurante: 'از عکس شما شروع می‌کنم و ظاهر عکس رستوران به آن می‌دهم. غذا دقیقاً همان‌طور که هست می‌ماند.',
  chefExplicaRetoqueQuitar: 'از عکس شما شروع می‌کنم و چیزهای اضافه را حذف می‌کنم. غذا دقیقاً همان‌طور که هست می‌ماند.',
  chefExplicaRetoqueNoSe: 'از عکس شما شروع می‌کنم و ظاهرش را بدون تغییر غذا بهتر می‌کنم. غذا دقیقاً همان‌طور که هست می‌ماند.',
  chefExplicaRetoqueLibre: 'از عکس شما شروع می‌کنم و فقط تغییراتی را که گفتید اعمال می‌کنم. غذا دقیقاً همان‌طور که هست می‌ماند.',

  chefExplicaMenuTresDias: 'یک منو برای سه روز می‌سازم، {{comensales}}، و فهرست خرید را هم برایتان می‌گذارم.',
  chefExplicaMenuTodaLaSemana: 'یک منو برای تمام هفته می‌سازم، {{comensales}}، و فهرست خرید را هم برایتان می‌گذارم.',
  chefExplicaMenuParaLaSemana: 'یک منو برای هفته می‌سازم، {{comensales}}، و فهرست خرید را هم برایتان می‌گذارم.',
  chefExplicaMenu: 'یک منو برای {{duracion}} می‌سازم، {{comensales}}، و فهرست خرید را هم برایتان می‌گذارم.',

  chefExplicaRecetaEnTiempo: 'یک دستور پخت مرحله‌به‌مرحله در {{tiempo}} آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',
  chefExplicaRecetaSinApuro: 'یک دستور پخت مرحله‌به‌مرحله بدون عجله آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',
  chefExplicaConLoQueTienesEnTiempo: 'یک دستور پخت با آنچه در خانه دارید در {{tiempo}} آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',
  chefExplicaConLoQueTienesSinApuro: 'یک دستور پخت با آنچه در خانه دارید بدون عجله آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',
  chefExplicaSaludableEnTiempo: 'یک دستور پخت سالم در {{tiempo}} آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',
  chefExplicaSaludableSinApuro: 'یک دستور پخت سالم بدون عجله آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',
  chefExplicaPostreEnTiempo: 'یک دسر در {{tiempo}} آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',
  chefExplicaPostreSinApuro: 'یک دسر بدون عجله آماده می‌کنم، {{comensales}}، و یک عکس از غذای آماده.',

  chefDecisionAlgoRico: 'چیزی خوشمزه و آسان با موادی که معمولاً در خانه دارید پیشنهاد می‌کنم',
  chefDecisionParaDos: 'آن را برای دو نفر در نظر گرفتم',
  chefDecisionSinApuro: 'بدون عجله',
  chefDecisionTodaLaSemana: 'آن را برای تمام هفته آماده می‌کنم',

  chefPasoMirarIngredientes: 'بررسی موادی که دارید',
  chefPasoEscribirReceta: 'نوشتن دستور پخت مرحله‌به‌مرحله',
  chefPasoFotoDelPlato: 'ساخت عکس غذا',
  chefPasoArmarMenu: 'ساخت منو',
  chefPasoPreciosIngredientes: 'بررسی قیمت مواد',
  chefPasoListaDeCompras: 'تهیهٔ فهرست خرید',
  chefPasoRetocarFoto: 'روتوش عکس غذای شما',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: '{{espacio}} را نگاه می‌کنم و می‌گویم چه چیزهایی را تغییر می‌دادم (مبلمان، رنگ‌ها، چیدمان) تا انتخاب کنید از کجا شروع کنید. فعلاً هیچ تصویری نمی‌سازم.',
  homeExplicaIdeas: 'سه ایده برای {{espacio}} به سبک {{estilo}} پیدا می‌کنم و توضیح می‌دهم چطور به آن‌ها برسید.',
  homeExplicaDistribucion: '{{espacio}} را نگاه می‌کنم، چیدمانی پیشنهاد می‌کنم که از فضا بهتر استفاده کند و نشان می‌دهم با همین مبلمان چطور می‌شود.',
  homeExplicaRedisenar: '{{espacio}} را به سبک {{estilo}} دوباره طراحی می‌کنم، در دو پیشنهاد، و فهرست تغییرات و خریدها را برایتان می‌گذارم.',
  homeExplicaMuebles: 'مبلمان {{espacio}} را به سبک {{estilo}} تغییر می‌دهم، در دو پیشنهاد، و فهرست تغییرات و خریدها را برایتان می‌گذارم.',
  homeExplicaColores: 'ظاهر و رنگ‌های {{espacio}} را به سبک {{estilo}} تغییر می‌دهم، در دو پیشنهاد، و فهرست تغییرات و خریدها را برایتان می‌گذارم.',
  homeExplicaExterior: 'فضای بیرون شما را به سبک {{estilo}} طراحی می‌کنم، در دو پیشنهاد، و فهرست تغییرات و خریدها را برایتان می‌گذارم.',

  homeDecisionEmpiezoPorLaSala: 'از اتاق نشیمن شروع می‌کنم',
  homeDecisionEstiloAcogedor: 'سبکی دنج انتخاب کردم',

  homePasoMirarFotoDelEspacio: 'بررسی عکس فضا',
  homePasoRedisenar: 'طراحی دوبارهٔ {{espacio}} به سبک {{estilo}}',
  homePasoMuebles: 'تغییر مبلمان {{espacio}} به سبک {{estilo}}',
  homePasoColores: 'تغییر ظاهر و رنگ‌های {{espacio}} به سبک {{estilo}}',
  homePasoExterior: 'طراحی فضای بیرون شما به سبک {{estilo}}',
  homePasoListaDeCambios: 'تهیهٔ فهرست تغییرات و خریدها',
  homePasoProponerDistribucion: 'پیشنهاد چیدمانی بهتر',
  homePasoMostrarComoQuedaria: 'نشان دادن نتیجه به شما',
  homePasoBuscarIdeas: 'جستجوی ایده برای {{espacio}}',
  homePasoExplicarComoLograrlo: 'توضیح راه رسیدن به آن',
  homePasoMirarFotoDeTuEspacio: 'بررسی عکس فضای شما',
  homePasoContarQueVeo: 'گفتن آنچه می‌بینم و آنچه می‌کردم',

  /* La voz de quien habla: aquí Weë habla de «شما». */
  chefComensalesSoloParaMi: 'فقط برای خودتان',
  homeEspacioMiOficina: 'دفتر کارتان',
};
