/*
 * PORTUGUÉS DE PORTUGAL — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las siete funciones que ya existían siguen en `weeai.chefAc…`.
 *
 * NO ES EL BRASILEÑO CON PALABRAS CAMBIADAS. Se tutea con «tu» —«tens»,
 * «queres», «a tua ideia», «Escolhe», «Termina»—, el pronombre va DETRÁS del
 * verbo («Falta-me um ingrediente») y delante del infinitivo («para o
 * cozinhar», que en Brasil sería «para cozinhá-lo»). En `projectsEmptyHint` el
 * futuro de subjuntivo —«O que criares aqui»— es lo que allí se dice.
 *
 * LA COCINA, EN PORTUGAL: una carta es una EMENTA, no un cardápio; los
 * carbohidratos son HIDRATOS DE CARBONO; los frutos secos son FRUTOS SECOS, no
 * oleaginosas; y un alérgeno es un ALERGÉNIO. Los ajustes son DEFINIÇÕES.
 *
 * DOS PLANTILLAS QUE NO SE TOCAN: `panelStart` ('{{panel}} · {{que}}: ', con su
 * espacio final, que es lo que deja el cursor separado de lo ya escrito) y
 * `goalWith` ('{{idea}} ({{ajustes}})'). Ahí no hay nada que traducir.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Receitas, ementas e ingredientes.\nCom o que já tens em casa.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Escreve a tua ideia, os teus ingredientes ou usa uma foto',
  addLabel: 'Adicionar uma foto',
  cameraLabel: 'Tirar uma foto',
  galleryLabel: 'Escolher uma foto da galeria',
  photoReady: 'Foto adicionada',
  settingsLabel: 'Definições da receita',
  voiceLabel: 'Ditar',
  sendLabel: 'Cozinhar',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'O que queres fazer?',
  nutritionTitle: 'Informação nutricional',
  nutritionSubtitle: 'Calorias, macros e alergénios',
  swapTitle: 'Substituir ingredientes',
  swapSubtitle: 'Troca o que não tens ou não podes comer',
  shoppingTitle: 'Lista de compras',
  shoppingSubtitle: 'O que falta comprar',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Escolhe por onde começar e termina a frase com as tuas palavras.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Informação nutricional */
  nuCalories: 'Calorias',
  nuProtein: 'Proteínas',
  nuFat: 'Gorduras',
  nuCarbs: 'Hidratos de carbono',
  nuSugar: 'Açúcar',
  nuSodium: 'Sódio',
  nuAllergens: 'Alergénios',
  nuPortion: 'Por dose',
  nuAll: 'Tudo',

  /* Substituir ingredientes */
  swMissing: 'Falta-me um ingrediente',
  swLactose: 'Sem lactose',
  swGluten: 'Sem glúten',
  swEgg: 'Sem ovo',
  swNuts: 'Sem frutos secos',
  swVegetarian: 'Vegetariano',
  swVegan: 'Vegano',
  swSugar: 'Sem açúcar',
  swCheaper: 'Mais barato',
  swPantry: 'Com o que tenho',

  /* Lista de compras */
  shRecipe: 'De uma receita',
  shMenu: 'De uma ementa',
  shWeek: 'Para a semana',
  shOccasion: 'Para uma ocasião',
  shPantry: 'O básico da despensa',
  shAisles: 'Organizada por corredores',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'O que é preciso saber para o cozinhar',
  optPeople: 'Pessoas',
  optTime: 'Tempo',
  optDiet: 'Dieta',
  optLevel: 'Dificuldade',
  valAnyone: 'Quantas forem',
  valOne: 'Para mim',
  valTwo: 'Para dois',
  valFamily: 'Para a família',
  valMany: 'Para muitos',
  valAnyTime: 'O tempo que for preciso',
  valQuick: '15 minutos',
  valHalfHour: 'Meia hora',
  valLong: 'Uma hora ou mais',
  valNoDiet: 'Sem restrições',
  valVegetarian: 'Vegetariana',
  valVegan: 'Vegana',
  valGlutenFree: 'Sem glúten',
  valLactoseFree: 'Sem lactose',
  valSugarFree: 'Sem açúcar',
  valAnyLevel: 'A que for',
  valEasy: 'Fácil',
  valMedium: 'Média',
  valPro: 'De chef',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Os meus projetos',
  seeAll: 'Ver todos',
  projectsEmpty: 'Ainda não cozinhaste nada com Weë.',
  projectsEmptyHint: 'O que criares aqui fica guardado e voltas a encontrá-lo nesta fila.',
};
