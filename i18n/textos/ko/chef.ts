/*
 * COREANO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las siete funciones que ya existían siguen en `weeai.chefAc…`.
 *
 * `panelStart` y `goalWith` son PLANTILLAS: los huecos y los separadores se
 * copian tal cual, con el espacio final incluido, porque lo que queda escrito
 * en la caja es una frase empezada que termina la persona.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: '레시피, 메뉴, 재료까지.\n집에 있는 것으로 만들어요.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '아이디어나 재료를 적거나 사진을 올려 보세요',
  addLabel: '사진 추가',
  cameraLabel: '사진 찍기',
  galleryLabel: '갤러리에서 사진 선택',
  photoReady: '사진 추가됨',
  settingsLabel: '레시피 설정',
  voiceLabel: '음성 입력',
  sendLabel: '요리하기',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: '무엇을 해 볼까요?',
  nutritionTitle: '영양 정보',
  nutritionSubtitle: '칼로리, 영양소, 알레르기 성분',
  swapTitle: '재료 바꾸기',
  swapSubtitle: '없는 재료, 못 먹는 재료를 바꿔요',
  shoppingTitle: '장보기 목록',
  shoppingSubtitle: '사야 할 것들',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: '시작할 항목을 고르고, 뒤는 직접 적어 완성하세요.',
  panelStart: '{{panel}} · {{que}}: ',

  /* 영양 정보 */
  nuCalories: '칼로리',
  nuProtein: '단백질',
  nuFat: '지방',
  nuCarbs: '탄수화물',
  nuSugar: '당류',
  nuSodium: '나트륨',
  nuAllergens: '알레르기 성분',
  nuPortion: '1인분 기준',
  nuAll: '전체',

  /* 재료 바꾸기 */
  swMissing: '없는 재료가 있어요',
  swLactose: '유당 없이',
  swGluten: '글루텐 없이',
  swEgg: '달걀 없이',
  swNuts: '견과류 없이',
  swVegetarian: '채식',
  swVegan: '비건',
  swSugar: '설탕 없이',
  swCheaper: '더 저렴하게',
  swPantry: '집에 있는 재료로',

  /* 장보기 목록 */
  shRecipe: '레시피에서',
  shMenu: '메뉴에서',
  shWeek: '일주일치',
  shOccasion: '특별한 날',
  shPantry: '기본 식재료',
  shAisles: '매장 코너별 정리',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: '요리하는 데 필요한 것들',
  optPeople: '인원',
  optTime: '시간',
  optDiet: '식단',
  optLevel: '난이도',
  valAnyone: '상관없어요',
  valOne: '혼자',
  valTwo: '둘이서',
  valFamily: '가족과',
  valMany: '여럿이',
  valAnyTime: '얼마든지',
  valQuick: '15분',
  valHalfHour: '30분',
  valLong: '1시간 이상',
  valNoDiet: '제한 없음',
  valVegetarian: '채식',
  valVegan: '비건',
  valGlutenFree: '글루텐 없음',
  valLactoseFree: '유당 없음',
  valSugarFree: '설탕 없음',
  valAnyLevel: '상관없어요',
  valEasy: '쉬움',
  valMedium: '보통',
  valPro: '셰프급',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: '내 프로젝트',
  seeAll: '전체 보기',
  projectsEmpty: '아직 Weë로 요리한 게 없어요.',
  projectsEmptyHint: '여기서 만든 건 저장되어 이 줄에서 다시 볼 수 있어요.',
};
