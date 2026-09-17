/*
 * COREANO — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. El saludo usa 님 detrás del nombre, que es como se trata a
 * una persona en coreano y además resuelve el problema de las partículas: 님
 * acaba siempre en ㅁ, así que lo que venga detrás no depende de lo que traiga
 * el hueco.
 *
 * `bannerOf` reordena los dos huecos —«{{total}}개 중 {{numero}}번째»—, que es
 * como el coreano cuenta; los nombres de los huecos no se tocan. La flecha → de
 * `seeAll` y la marca Weë se copian tal cual.
 */
export const home: typeof import('../es/home').home = {
  greeting: '{{nombre}} 님, 안녕하세요',
  greetingGuest: '안녕하세요',
  composerPlaceholder: '무엇을 공유하고 싶으세요?',
  seeAll: '전체 보기 →',
  createWeel: 'Weël 만들기',
  openMenu: '메뉴 열기',
  search: '검색',
  logoHome: 'Weë, 처음으로 이동',
  filterBy: '필터: {{nombre}}',
  filterAll: '전체',
  bannerOf: '배너 {{total}}개 중 {{numero}}번째',
  weelSample: 'Weël 예시: {{titulo}}',
  exploreCommunities: '커뮤니티 둘러보기',
  moreCategories: '카테고리 더 보기',
  popularCommunities: '인기 커뮤니티',
  seeAllOf: '전체 보기',
  topicOfTheDay: '오늘의 주제',
  heatedDebate: '뜨거운 논쟁',
  featuredOpinion: '주목받는 의견',
  featured: '추천',
};
