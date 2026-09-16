import { GrupoDeAjustes } from './ajustesContextuales';

/*
 * EL CATÁLOGO DE WEË CHEF.
 *
 * Aquí viven el orden, los iconos y las CLAVES de texto. No las frases: este
 * archivo se importa fuera de React, donde no hay traductor, así que traducir al
 * construirlo congelaría el idioma del arranque. Quien pinta resuelve, con
 * `t(clave)` — el mismo patrón de `constants/studioTools.ts` y `specialists.ts`.
 *
 * Los iconos son de Ionicons en su variante `-outline`, como el resto del
 * taller, y se pintan con el color del texto: un solo trazo, una sola familia,
 * sin emojis y sin fotografías. Weë Chef no es una app de recetas con banners;
 * es el mismo sitio de trabajo que Weë Studio, con la cocina dentro.
 */

/**
 * LAS OCHO FUNCIONES, EN ESTE ORDEN.
 *
 * Cinco abren la conversación guiada de siempre —son las mismas de
 * `constants/specialists.ts`, con su `preset` intacto, porque ese identificador
 * viaja al servidor y está dentro de los trabajos ya guardados de la gente—. Las
 * tres nuevas abren un panel dentro de la propia pantalla: no hay nada nuevo
 * detrás, solo una forma de empezar la frase sabiendo ya de qué va.
 *
 * El postre y el retoque de la foto siguen existiendo: se piden escribiéndolos
 * o desde la propia conversación, que es donde estaban sus preguntas.
 */
export interface TarjetaDeChef {
  id: string;
  claveTitulo: string;
  claveSubtitulo: string;
  icono: string;
  /** La opción de la conversación guiada. No se traduce ni se renombra. */
  preset?: { questionId: string; optionId: string };
  /** El panel que abre, para las que no abren conversación. */
  panel?: PanelDeChef;
}

/** Los tres paneles nuevos. El id es el panel y el panel es el id. */
export type PanelDeChef = 'nutrition' | 'swap' | 'shopping';

export const TARJETAS_DE_CHEF: TarjetaDeChef[] = [
  {
    id: 'ingredients',
    claveTitulo: 'catalogo.chefAcIngredientsTitle',
    claveSubtitulo: 'catalogo.chefAcIngredientsSubtitle',
    icono: 'basket-outline',
    preset: { questionId: 'what', optionId: 'cook' },
  },
  {
    id: 'recipe',
    claveTitulo: 'catalogo.chefAcRecipeTitle',
    claveSubtitulo: 'catalogo.chefAcRecipeSubtitle',
    icono: 'restaurant-outline',
    preset: { questionId: 'what', optionId: 'recipe' },
  },
  {
    id: 'menu',
    claveTitulo: 'catalogo.chefAcMenuTitle',
    claveSubtitulo: 'catalogo.chefAcMenuSubtitle',
    icono: 'list-outline',
    preset: { questionId: 'what', optionId: 'menu' },
  },
  {
    id: 'healthy',
    claveTitulo: 'catalogo.chefAcHealthyTitle',
    claveSubtitulo: 'catalogo.chefAcHealthySubtitle',
    icono: 'leaf-outline',
    preset: { questionId: 'what', optionId: 'healthy' },
  },
  {
    id: 'nutrition',
    claveTitulo: 'chef.nutritionTitle',
    claveSubtitulo: 'chef.nutritionSubtitle',
    icono: 'analytics-outline',
    panel: 'nutrition',
  },
  {
    id: 'swap',
    claveTitulo: 'chef.swapTitle',
    claveSubtitulo: 'chef.swapSubtitle',
    icono: 'swap-horizontal-outline',
    panel: 'swap',
  },
  {
    id: 'shopping',
    claveTitulo: 'chef.shoppingTitle',
    claveSubtitulo: 'chef.shoppingSubtitle',
    icono: 'cart-outline',
    panel: 'shopping',
  },
  {
    id: 'idk',
    claveTitulo: 'catalogo.chefAcIdkTitle',
    claveSubtitulo: 'catalogo.chefAcIdkSubtitle',
    icono: 'bulb-outline',
    preset: { questionId: 'what', optionId: 'idk' },
  },
];

/** Por dónde empezar, dentro de un panel. */
export interface EntradaDeChef {
  id: string;
  clave: string;
  icono: string;
}

const e = (id: string, clave: string, icono: string): EntradaDeChef => ({ id, clave, icono });

/**
 * LO QUE HAY DENTRO DE CADA PANEL.
 *
 * No son ajustes ni formularios: son maneras de empezar la frase. Se elige una y
 * se vuelve a la caja con la idea empezada, igual que en Weë Studio. Lo que
 * decide de verdad —el plato, los ingredientes— lo pone la persona con sus
 * palabras, porque es lo único que Weë no puede adivinar.
 */
export const ENTRADAS_POR_PANEL: Record<PanelDeChef, EntradaDeChef[]> = {
  nutrition: [
    e('all', 'chef.nuAll', 'apps-outline'),
    e('calories', 'chef.nuCalories', 'flame-outline'),
    e('protein', 'chef.nuProtein', 'barbell-outline'),
    e('fat', 'chef.nuFat', 'water-outline'),
    e('carbs', 'chef.nuCarbs', 'pie-chart-outline'),
    e('sugar', 'chef.nuSugar', 'cube-outline'),
    e('sodium', 'chef.nuSodium', 'flask-outline'),
    e('allergens', 'chef.nuAllergens', 'alert-circle-outline'),
    e('portion', 'chef.nuPortion', 'resize-outline'),
  ],
  swap: [
    e('missing', 'chef.swMissing', 'help-circle-outline'),
    e('pantry', 'chef.swPantry', 'basket-outline'),
    e('lactose', 'chef.swLactose', 'cafe-outline'),
    e('gluten', 'chef.swGluten', 'pizza-outline'),
    e('egg', 'chef.swEgg', 'egg-outline'),
    e('nuts', 'chef.swNuts', 'alert-circle-outline'),
    e('vegetarian', 'chef.swVegetarian', 'leaf-outline'),
    e('vegan', 'chef.swVegan', 'flower-outline'),
    e('sugar', 'chef.swSugar', 'cube-outline'),
    e('cheaper', 'chef.swCheaper', 'pricetag-outline'),
  ],
  shopping: [
    e('recipe', 'chef.shRecipe', 'restaurant-outline'),
    e('menu', 'chef.shMenu', 'list-outline'),
    e('week', 'chef.shWeek', 'calendar-outline'),
    e('occasion', 'chef.shOccasion', 'people-outline'),
    e('pantry', 'chef.shPantry', 'home-outline'),
    e('aisles', 'chef.shAisles', 'navigate-outline'),
  ],
};

/** El nombre de cada panel, para su cabecera y para la frase que deja empezada. */
export const CLAVE_DEL_PANEL: Record<PanelDeChef, string> = {
  nutrition: 'chef.nutritionTitle',
  swap: 'chef.swapTitle',
  shopping: 'chef.shoppingTitle',
};

/**
 * LOS AJUSTES DE LA RECETA.
 *
 * La misma mecánica de Weë Studio (`constants/ajustesContextuales.ts`) con el
 * catálogo propio que esa mecánica ya sabe recibir: a una creación se le
 * pregunta formato y duración; a una comida, para cuántos, cuánto tiempo hay y
 * si algo no se puede comer. Todo se decide aquí, en el teléfono: abrir los
 * ajustes o tocar una píldora no llama a nadie y no cuesta un Credit.
 *
 * La primera opción de cada grupo es la que no decide nada, y es la que está
 * puesta de entrada: quien no quiera contestar, no contesta.
 */
export const AJUSTES_DE_COCINA: GrupoDeAjustes[] = [
  {
    id: 'people',
    clave: 'chef.optPeople',
    contextos: ['general'],
    opciones: [
      { id: 'auto', clave: 'chef.valAnyone' },
      { id: '1', clave: 'chef.valOne' },
      { id: '2', clave: 'chef.valTwo' },
      { id: '4', clave: 'chef.valFamily' },
      { id: '8', clave: 'chef.valMany' },
    ],
  },
  {
    id: 'time',
    clave: 'chef.optTime',
    contextos: ['general'],
    opciones: [
      { id: 'auto', clave: 'chef.valAnyTime' },
      { id: '15', clave: 'chef.valQuick' },
      { id: '30', clave: 'chef.valHalfHour' },
      { id: '60', clave: 'chef.valLong' },
    ],
  },
  {
    id: 'diet',
    clave: 'chef.optDiet',
    contextos: ['general'],
    opciones: [
      { id: 'auto', clave: 'chef.valNoDiet' },
      { id: 'vegetarian', clave: 'chef.valVegetarian' },
      { id: 'vegan', clave: 'chef.valVegan' },
      { id: 'glutenFree', clave: 'chef.valGlutenFree' },
      { id: 'lactoseFree', clave: 'chef.valLactoseFree' },
      { id: 'sugarFree', clave: 'chef.valSugarFree' },
    ],
  },
  {
    id: 'level',
    clave: 'chef.optLevel',
    contextos: ['general'],
    opciones: [
      { id: 'auto', clave: 'chef.valAnyLevel' },
      { id: 'easy', clave: 'chef.valEasy' },
      { id: 'medium', clave: 'chef.valMedium' },
      { id: 'pro', clave: 'chef.valPro' },
    ],
  },
];
