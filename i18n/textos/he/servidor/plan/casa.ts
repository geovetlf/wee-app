/*
 * HEBREO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con artículo («הסלון», «חדר השינה»), así que entra detrás de «את», «של» o «עבור», sueltos.
 * `{{comensales}}` ya trae su preposición («לשניים»). `{{estilo}}` en masculino, detrás de «בסגנון».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'אתחיל מהתמונה שלך ואשפר את התאורה. המנה תישאר בדיוק כמו שהיא.',
  chefExplicaRetoqueFondo: 'אתחיל מהתמונה שלך ואחליף את הרקע. המנה תישאר בדיוק כמו שהיא.',
  chefExplicaRetoqueApetitoso: 'אתחיל מהתמונה שלך ואגרום למנה להיראות מעוררת תיאבון יותר. המנה תישאר בדיוק כמו שהיא.',
  chefExplicaRetoqueRestaurante: 'אתחיל מהתמונה שלך ואתן לה מראה של צילום ממסעדה. המנה תישאר בדיוק כמו שהיא.',
  chefExplicaRetoqueQuitar: 'אתחיל מהתמונה שלך ואסיר את מה שמיותר. המנה תישאר בדיוק כמו שהיא.',
  chefExplicaRetoqueNoSe: 'אתחיל מהתמונה שלך ואשפר את המראה שלה בלי לשנות את המנה. המנה תישאר בדיוק כמו שהיא.',
  chefExplicaRetoqueLibre: 'אתחיל מהתמונה שלך ואבצע רק את השינויים שביקשת. המנה תישאר בדיוק כמו שהיא.',

  chefExplicaMenuTresDias: 'אכין תפריט לשלושה ימים, {{comensales}}, ואשאיר לך רשימת קניות.',
  chefExplicaMenuTodaLaSemana: 'אכין תפריט לכל השבוע, {{comensales}}, ואשאיר לך רשימת קניות.',
  chefExplicaMenuParaLaSemana: 'אכין תפריט לשבוע, {{comensales}}, ואשאיר לך רשימת קניות.',
  chefExplicaMenu: 'אכין תפריט למשך {{duracion}}, {{comensales}}, ואשאיר לך רשימת קניות.',

  chefExplicaRecetaEnTiempo: 'אכין מתכון צעד אחר צעד תוך {{tiempo}}, {{comensales}}, ותמונה של המנה המוכנה.',
  chefExplicaRecetaSinApuro: 'אכין מתכון צעד אחר צעד בלי לחץ של זמן, {{comensales}}, ותמונה של המנה המוכנה.',
  chefExplicaConLoQueTienesEnTiempo: 'אכין מתכון ממה שיש לך בבית תוך {{tiempo}}, {{comensales}}, ותמונה של המנה המוכנה.',
  chefExplicaConLoQueTienesSinApuro: 'אכין מתכון ממה שיש לך בבית בלי לחץ של זמן, {{comensales}}, ותמונה של המנה המוכנה.',
  chefExplicaSaludableEnTiempo: 'אכין מתכון בריא תוך {{tiempo}}, {{comensales}}, ותמונה של המנה המוכנה.',
  chefExplicaSaludableSinApuro: 'אכין מתכון בריא בלי לחץ של זמן, {{comensales}}, ותמונה של המנה המוכנה.',
  chefExplicaPostreEnTiempo: 'אכין קינוח תוך {{tiempo}}, {{comensales}}, ותמונה של המנה המוכנה.',
  chefExplicaPostreSinApuro: 'אכין קינוח בלי לחץ של זמן, {{comensales}}, ותמונה של המנה המוכנה.',

  chefDecisionAlgoRico: 'אציע לך משהו טעים וקל ממה שבדרך כלל יש בבית',
  chefDecisionParaDos: 'תכננתי את זה לשניים',
  chefDecisionSinApuro: 'בלי לחץ של זמן',
  chefDecisionTodaLaSemana: 'אכין את זה לכל השבוע',

  chefPasoMirarIngredientes: 'בדיקה של המצרכים שיש לך',
  chefPasoEscribirReceta: 'כתיבת המתכון צעד אחר צעד',
  chefPasoFotoDelPlato: 'יצירת תמונה של המנה',
  chefPasoArmarMenu: 'הרכבת התפריט',
  chefPasoPreciosIngredientes: 'בדיקה של מחירי המצרכים',
  chefPasoListaDeCompras: 'הכנת רשימת הקניות',
  chefPasoRetocarFoto: 'ריטוש התמונה של המנה שלך',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'אסתכל על {{espacio}} ואספר לך מה הייתי משנה — רהיטים, צבעים, סידור — כדי שאפשר יהיה לבחור מאיפה להתחיל. בשלב הזה לא אצור שום תמונה.',
  homeExplicaIdeas: 'אחפש שלושה רעיונות עבור {{espacio}} בסגנון {{estilo}} ואסביר לך איך להגיע אליהם.',
  homeExplicaDistribucion: 'אסתכל על {{espacio}}, אציע סידור שמנצל טוב יותר את החלל ואראה לך איך זה ייראה עם אותם רהיטים.',
  homeExplicaRedisenar: 'אעצב מחדש את {{espacio}} בסגנון {{estilo}}, בשתי הצעות, ואשאיר לך רשימה של שינויים וקניות.',
  homeExplicaMuebles: 'אחליף את הרהיטים של {{espacio}} בסגנון {{estilo}}, בשתי הצעות, ואשאיר לך רשימה של שינויים וקניות.',
  homeExplicaColores: 'אשנה את המראה והצבעים של {{espacio}} בסגנון {{estilo}}, בשתי הצעות, ואשאיר לך רשימה של שינויים וקניות.',
  homeExplicaExterior: 'אעצב את החלל החיצוני שלך בסגנון {{estilo}}, בשתי הצעות, ואשאיר לך רשימה של שינויים וקניות.',

  homeDecisionEmpiezoPorLaSala: 'אתחיל מהסלון',
  homeDecisionEstiloAcogedor: 'בחרתי סגנון נעים',

  homePasoMirarFotoDelEspacio: 'בדיקת התמונה של החלל',
  homePasoRedisenar: 'עיצוב מחדש של {{espacio}} בסגנון {{estilo}}',
  homePasoMuebles: 'החלפת הרהיטים של {{espacio}} בסגנון {{estilo}}',
  homePasoColores: 'שינוי המראה והצבעים של {{espacio}} בסגנון {{estilo}}',
  homePasoExterior: 'עיצוב החלל החיצוני שלך בסגנון {{estilo}}',
  homePasoListaDeCambios: 'הכנת רשימת השינויים והקניות',
  homePasoProponerDistribucion: 'הצעה לסידור טוב יותר',
  homePasoMostrarComoQuedaria: 'הדמיה של התוצאה',
  homePasoBuscarIdeas: 'חיפוש רעיונות עבור {{espacio}}',
  homePasoExplicarComoLograrlo: 'הסבר איך להגיע לזה',
  homePasoMirarFotoDeTuEspacio: 'בדיקת התמונה של החלל שלך',
  homePasoContarQueVeo: 'מה אני רואה ומה הייתי עושה',

  /* La voz de quien habla: aquí Weë habla de «ti». */
  chefComensalesSoloParaMi: 'רק בשבילך',
  homeEspacioMiOficina: 'המשרד שלך',
};
