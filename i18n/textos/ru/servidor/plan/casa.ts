/*
 * RUSO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega en nominativo («гостиная», «мой кабинет») y entra detrás de dos puntos o entre paréntesis: nunca
 * donde pediría otro caso. `{{estilo}}` y `{{tiempo}}`, igual, detrás de su etiqueta.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Возьму ваше фото за основу и улучшу свет. Само блюдо останется в точности таким же.',
  chefExplicaRetoqueFondo: 'Возьму ваше фото за основу и заменю фон. Само блюдо останется в точности таким же.',
  chefExplicaRetoqueApetitoso: 'Возьму ваше фото за основу и сделаю его аппетитнее. Само блюдо останется в точности таким же.',
  chefExplicaRetoqueRestaurante: 'Возьму ваше фото за основу и придам ему вид ресторанного снимка. Само блюдо останется в точности таким же.',
  chefExplicaRetoqueQuitar: 'Возьму ваше фото за основу и уберу лишнее. Само блюдо останется в точности таким же.',
  chefExplicaRetoqueNoSe: 'Возьму ваше фото за основу и улучшу его вид, не меняя блюдо. Само блюдо останется в точности таким же.',
  chefExplicaRetoqueLibre: 'Возьму ваше фото за основу и внесу только те изменения, которые вы указали. Само блюдо останется в точности таким же.',

  chefExplicaMenuTresDias: 'Составлю меню на три дня ({{comensales}}) и оставлю вам список покупок.',
  chefExplicaMenuTodaLaSemana: 'Составлю меню на всю неделю ({{comensales}}) и оставлю вам список покупок.',
  chefExplicaMenuParaLaSemana: 'Составлю меню на неделю ({{comensales}}) и оставлю вам список покупок.',
  chefExplicaMenu: 'Составлю меню (срок: {{duracion}}; {{comensales}}) и оставлю вам список покупок.',

  chefExplicaRecetaEnTiempo: 'Подготовлю пошаговый рецепт (время: {{tiempo}}; {{comensales}}) и фото готового блюда.',
  chefExplicaRecetaSinApuro: 'Подготовлю пошаговый рецепт без спешки ({{comensales}}) и фото готового блюда.',
  chefExplicaConLoQueTienesEnTiempo: 'Подготовлю рецепт из того, что есть у вас дома (время: {{tiempo}}; {{comensales}}), и фото готового блюда.',
  chefExplicaConLoQueTienesSinApuro: 'Подготовлю рецепт из того, что есть у вас дома, без спешки ({{comensales}}), и фото готового блюда.',
  chefExplicaSaludableEnTiempo: 'Подготовлю полезный рецепт (время: {{tiempo}}; {{comensales}}) и фото готового блюда.',
  chefExplicaSaludableSinApuro: 'Подготовлю полезный рецепт без спешки ({{comensales}}) и фото готового блюда.',
  chefExplicaPostreEnTiempo: 'Подготовлю десерт (время: {{tiempo}}; {{comensales}}) и фото готового блюда.',
  chefExplicaPostreSinApuro: 'Подготовлю десерт без спешки ({{comensales}}) и фото готового блюда.',

  chefDecisionAlgoRico: 'предложу что-нибудь вкусное и простое из того, что обычно есть дома',
  chefDecisionParaDos: 'рассчитываю на двоих',
  chefDecisionSinApuro: 'без спешки',
  chefDecisionTodaLaSemana: 'сделаю на всю неделю',

  chefPasoMirarIngredientes: 'Посмотреть, какие у вас есть продукты',
  chefPasoEscribirReceta: 'Написать пошаговый рецепт',
  chefPasoFotoDelPlato: 'Создать фото блюда',
  chefPasoArmarMenu: 'Составить меню',
  chefPasoPreciosIngredientes: 'Посмотреть, сколько стоят продукты',
  chefPasoListaDeCompras: 'Составить список покупок',
  chefPasoRetocarFoto: 'Отретушировать фото вашего блюда',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Посмотрю на ваше пространство ({{espacio}}) и подскажу, что стоит изменить: мебель, цвета, планировку, — чтобы вы выбрали, с чего начать. Изображения пока создавать не буду.',
  homeExplicaIdeas: 'Подберу три идеи (пространство: {{espacio}}; стиль: {{estilo}}) и объясню, как их воплотить.',
  homeExplicaDistribucion: 'Посмотрю на ваше пространство ({{espacio}}), предложу планировку, которая лучше его использует, и покажу результат с вашей же мебелью.',
  homeExplicaRedisenar: 'Обновлю дизайн (пространство: {{espacio}}; стиль: {{estilo}}) в двух вариантах и оставлю список изменений и покупок.',
  homeExplicaMuebles: 'Обновлю пространство ({{espacio}}) с другой мебелью (стиль: {{estilo}}) в двух вариантах и оставлю список изменений и покупок.',
  homeExplicaColores: 'Обновлю пространство ({{espacio}}), сменив стиль и цвета (стиль: {{estilo}}), в двух вариантах и оставлю список изменений и покупок.',
  homeExplicaExterior: 'Разработаю дизайн вашего двора или сада (стиль: {{estilo}}) в двух вариантах и оставлю список изменений и покупок.',

  homeDecisionEmpiezoPorLaSala: 'начну с гостиной',
  homeDecisionEstiloAcogedor: 'выбираю уютный стиль',

  homePasoMirarFotoDelEspacio: 'Посмотреть фото пространства',
  homePasoRedisenar: 'Обновить дизайн (пространство: {{espacio}}; стиль: {{estilo}})',
  homePasoMuebles: 'Обновить мебель (пространство: {{espacio}}; стиль: {{estilo}})',
  homePasoColores: 'Обновить цвета (пространство: {{espacio}}; стиль: {{estilo}})',
  homePasoExterior: 'Разработать дизайн двора или сада (стиль: {{estilo}})',
  homePasoListaDeCambios: 'Составить список изменений и покупок',
  homePasoProponerDistribucion: 'Предложить планировку получше',
  homePasoMostrarComoQuedaria: 'Показать вам результат',
  homePasoBuscarIdeas: 'Подобрать идеи (пространство: {{espacio}})',
  homePasoExplicarComoLograrlo: 'Объяснить, как их воплотить',
  homePasoMirarFotoDeTuEspacio: 'Посмотреть фото вашего пространства',
  homePasoContarQueVeo: 'Рассказать, что я вижу и что предлагаю',

  /* La voz de quien habla: en la frase de Weë, la opción «Только для меня» pasa a hablar de «вас». */
  chefComensalesSoloParaMi: 'только для вас',
  homeEspacioMiOficina: 'ваш кабинет',
};
