/*
 * COREANO — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Weë Design comparte con Weë Studio —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"— vive en `studio` y se lee de allí.
 *
 * Las puertas de entrada («Un salón», «Una silla») van en coreano como se
 * nombran las cosas, sin artículo y sin verbo: 거실, 의자. Es una rejilla de
 * etiquetas, no una lista de frases.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: '한계 없이 디자인하세요.',
  description: '공간, 제품, 사물까지 무엇이든.\n아이디어에 형태를 더하세요.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '오늘은 무엇을 디자인할까요?',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: '둘러보기',
  allTitle: '디자인할 수 있는 모든 것',
  allHint: '여기 있는 건 시작점일 뿐이에요. 위에 적으면 무엇이든 디자인할 수 있어요.',
  startWith: '이렇게 시작해 보세요',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: '인테리어',
  interiorsHint: '실내 공간을 디자인하고 시각화해요.',
  architectureTitle: '건축',
  architectureHint: '건축 프로젝트를 만들고 시각화해요.',
  spacesTitle: '공간',
  spacesHint: '야외, 도시, 상업 공간을 디자인해요.',
  furnitureTitle: '가구',
  furnitureHint: '가구와 소품을 만들고 원하는 대로 바꿔요.',
  productTitle: '제품',
  productHint: '어떤 사물이나 제품이든 디자인해요.',
  vehiclesTitle: '탈것',
  vehiclesHint: '자동차, 오토바이, 배, 비행기까지.',
  rendersTitle: '렌더와 3D',
  rendersHint: '아이디어를 실사에 가깝게 시각화해요.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: '거실',
  inKitchen: '주방',
  inBedroom: '침실',
  inBathroom: '욕실',
  inRemodel: '공간 리모델링',
  arHouse: '모던한 주택',
  arFacade: '건물 외관',
  arBuilding: '건물',
  arCabin: '오두막',
  arExtension: '증축',
  spGarden: '정원',
  spTerrace: '테라스',
  spShop: '매장',
  spRestaurant: '레스토랑',
  spPublic: '공공 공간',
  fuChair: '의자',
  fuSofa: '소파',
  fuTable: '테이블',
  fuShelf: '선반',
  fuLamp: '조명',
  prEveryday: '일상용품',
  prPackaging: '패키지',
  prAccessory: '액세서리',
  prGadget: '전자기기',
  prJewel: '주얼리',
  veCar: '자동차',
  veMotorbike: '오토바이',
  veBoat: '배나 요트',
  vePlane: '비행기',
  veDrone: '드론',
  reRealistic: '사실적인 렌더',
  reModel: '3D 모형',
  reAerial: '조감도',
  reWalkthrough: '공간 투어',
  reBeforeAfter: '비포 애프터',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: '스타일',
  optMaterials: '소재',
  optLighting: '조명',
  valModern: '모던',
  valMinimal: '미니멀',
  valClassic: '클래식',
  valIndustrial: '인더스트리얼',
  valWood: '우드',
  valMetal: '메탈',
  valGlass: '유리',
  valMixed: '혼합',
  valNatural: '자연광',
  valWarm: '따뜻한 빛',
  /* «De estudio» es la luz de un plató, no Weë Studio: por eso 촬영 조명, sin la marca. */
  valStudioLight: '촬영 조명',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: '인테리어',
  kindArchitecture: '건축',
  kindBoat: '배',
  kindFurniture: '가구',
};
