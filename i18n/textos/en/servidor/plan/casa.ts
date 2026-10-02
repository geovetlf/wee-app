/*
 * ENGLISH — El plan de Weë Chef y Weë Home. Ver `../../../es/servidor/plan/casa.ts`.
 *
 * `{{comensales}}`, `{{tiempo}}`, `{{espacio}}` y `{{estilo}}` los rellena la etiqueta inglesa de `../opciones.ts`, sin
 * emoji y con la inicial en minúscula («for two», «half an hour», «the living room», «cosy»). Las `…Decision…`
 * completan «Since you weren’t sure, …».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'I’ll start from your photo and improve the lighting. The dish stays exactly as it is.',
  chefExplicaRetoqueFondo: 'I’ll start from your photo and change the background. The dish stays exactly as it is.',
  chefExplicaRetoqueApetitoso: 'I’ll start from your photo and make it look more appetising. The dish stays exactly as it is.',
  chefExplicaRetoqueRestaurante: 'I’ll start from your photo and make it look like a restaurant shot. The dish stays exactly as it is.',
  chefExplicaRetoqueQuitar: 'I’ll start from your photo and remove what you don’t want. The dish stays exactly as it is.',
  chefExplicaRetoqueNoSe: 'I’ll start from your photo and make it look better without changing the dish. The dish stays exactly as it is.',
  chefExplicaRetoqueLibre: 'I’ll start from your photo and make only the changes you asked for. The dish stays exactly as it is.',

  chefExplicaMenuTresDias: 'I’ll put together a three-day menu {{comensales}} and give you the shopping list.',
  chefExplicaMenuTodaLaSemana: 'I’ll put together a menu for the whole week {{comensales}} and give you the shopping list.',
  chefExplicaMenuParaLaSemana: 'I’ll put together a menu for the week {{comensales}} and give you the shopping list.',
  chefExplicaMenu: 'I’ll put together a menu for {{duracion}}, {{comensales}}, and give you the shopping list.',

  chefExplicaRecetaEnTiempo: 'I’ll prepare a step-by-step recipe {{comensales}}, ready in {{tiempo}}, plus a photo of how the dish turns out.',
  chefExplicaRecetaSinApuro: 'I’ll prepare a step-by-step recipe {{comensales}}, with no time limit, plus a photo of how the dish turns out.',
  chefExplicaConLoQueTienesEnTiempo: 'I’ll prepare a recipe {{comensales}} with what you have at home, ready in {{tiempo}}, plus a photo of how the dish turns out.',
  chefExplicaConLoQueTienesSinApuro: 'I’ll prepare a recipe {{comensales}} with what you have at home, with no time limit, plus a photo of how the dish turns out.',
  chefExplicaSaludableEnTiempo: 'I’ll prepare a healthy recipe {{comensales}}, ready in {{tiempo}}, plus a photo of how the dish turns out.',
  chefExplicaSaludableSinApuro: 'I’ll prepare a healthy recipe {{comensales}}, with no time limit, plus a photo of how the dish turns out.',
  chefExplicaPostreEnTiempo: 'I’ll prepare a dessert {{comensales}}, ready in {{tiempo}}, plus a photo of how the dish turns out.',
  chefExplicaPostreSinApuro: 'I’ll prepare a dessert {{comensales}}, with no time limit, plus a photo of how the dish turns out.',

  chefDecisionAlgoRico: 'I’m suggesting something tasty and easy with what you usually have at home',
  chefDecisionParaDos: 'I planned it for two',
  chefDecisionSinApuro: 'I didn’t set a time limit',
  chefDecisionTodaLaSemana: 'I’ll make it for the whole week',

  chefPasoMirarIngredientes: 'Look at what ingredients you have',
  chefPasoEscribirReceta: 'Write the step-by-step recipe',
  chefPasoFotoDelPlato: 'Create a photo of the dish',
  chefPasoArmarMenu: 'Put together the menu',
  chefPasoPreciosIngredientes: 'Check how much the ingredients cost',
  chefPasoListaDeCompras: 'Make the shopping list',
  chefPasoRetocarFoto: 'Retouch the photo of your dish',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'I’ll look at {{espacio}} and tell you what I’d change — furniture, colours, layout — so you can choose where to start. I won’t create any images yet.',
  homeExplicaIdeas: 'I’ll find three ideas for {{espacio}} in a {{estilo}} style and explain how to achieve them.',
  homeExplicaDistribucion: 'I’ll look at {{espacio}}, suggest a layout that makes better use of the space and show you how it would look with your own furniture.',
  homeExplicaRedisenar: 'I’ll redesign {{espacio}} in a {{estilo}} style, in two versions, and give you a list of changes and things to buy.',
  homeExplicaMuebles: 'I’ll change the furniture in {{espacio}} to a {{estilo}} style, in two versions, and give you a list of changes and things to buy.',
  homeExplicaColores: 'I’ll change the look and colours of {{espacio}} to a {{estilo}} style, in two versions, and give you a list of changes and things to buy.',
  homeExplicaExterior: 'I’ll design your outdoor space in a {{estilo}} style, in two versions, and give you a list of changes and things to buy.',

  homeDecisionEmpiezoPorLaSala: 'I’ll start with the living room',
  homeDecisionEstiloAcogedor: 'I went with a cosy style',

  homePasoMirarFotoDelEspacio: 'Look at the photo of the space',
  homePasoRedisenar: 'Redesign {{espacio}} in a {{estilo}} style',
  homePasoMuebles: 'Change the furniture in {{espacio}} to a {{estilo}} style',
  homePasoColores: 'Change the look and colours of {{espacio}} to a {{estilo}} style',
  homePasoExterior: 'Design your outdoor space in a {{estilo}} style',
  homePasoListaDeCambios: 'Put together the list of changes and things to buy',
  homePasoProponerDistribucion: 'Suggest a better layout',
  homePasoMostrarComoQuedaria: 'Show you how it would look',
  homePasoBuscarIdeas: 'Find ideas for {{espacio}}',
  homePasoExplicarComoLograrlo: 'Explain how to achieve it',
  homePasoMirarFotoDeTuEspacio: 'Look at the photo of your space',
  homePasoContarQueVeo: 'Tell you what I see and what I’d do',

  /*
   * La voz de quien habla: Weë dice «you», no «me» (ver el catálogo español).
   */
  chefComensalesSoloParaMi: 'just for you',
  homeEspacioMiOficina: 'your office',
};
