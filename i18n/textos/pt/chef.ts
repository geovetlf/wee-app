/*
 * PORTUGUÉS — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las siete funciones que ya existían siguen en `weeai.chefAc…`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Receitas, cardápios e ingredientes.\nCom o que você já tem em casa.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Escreva sua ideia, seus ingredientes ou use uma foto',
  addLabel: 'Adicionar uma foto',
  cameraLabel: 'Tirar uma foto',
  galleryLabel: 'Escolher uma foto da galeria',
  photoReady: 'Foto adicionada',
  settingsLabel: 'Configurações da receita',
  voiceLabel: 'Ditar',
  sendLabel: 'Cozinhar',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'O que você quer fazer?',
  nutritionTitle: 'Informação nutricional',
  nutritionSubtitle: 'Calorias, macros e alérgenos',
  swapTitle: 'Substituir ingredientes',
  swapSubtitle: 'Troque o que você não tem ou não pode comer',
  shoppingTitle: 'Lista de compras',
  shoppingSubtitle: 'O que falta comprar',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Escolha por onde começar e termine a frase com suas palavras.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Informação nutricional */
  nuCalories: 'Calorias',
  nuProtein: 'Proteínas',
  nuFat: 'Gorduras',
  nuCarbs: 'Carboidratos',
  nuSugar: 'Açúcar',
  nuSodium: 'Sódio',
  nuAllergens: 'Alérgenos',
  nuPortion: 'Por porção',
  nuAll: 'Tudo',

  /* Substituir ingredientes */
  swMissing: 'Falta um ingrediente',
  swLactose: 'Sem lactose',
  swGluten: 'Sem glúten',
  swEgg: 'Sem ovo',
  swNuts: 'Sem oleaginosas',
  swVegetarian: 'Vegetariano',
  swVegan: 'Vegano',
  swSugar: 'Sem açúcar',
  swCheaper: 'Mais barato',
  swPantry: 'Com o que eu tenho',

  /* Lista de compras */
  shRecipe: 'De uma receita',
  shMenu: 'De um cardápio',
  shWeek: 'Para a semana',
  shOccasion: 'Para uma ocasião',
  shPantry: 'O básico da despensa',
  shAisles: 'Organizada por corredores',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'O que é preciso saber para cozinhar',
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
  valAnyLevel: 'Tanto faz',
  valEasy: 'Fácil',
  valMedium: 'Média',
  valPro: 'De chef',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Meus projetos',
  seeAll: 'Ver todos',
  projectsEmpty: 'Você ainda não cozinhou nada com Weë.',
  projectsEmptyHint: 'O que você criar aqui fica salvo e você encontra de novo nesta fila.',
};
