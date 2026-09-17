/*
 * CHINO SIMPLIFICADO — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El saludo pone el nombre detrás de una coma de ancho completo —«你好，
 * {{nombre}}»—, que separa sin necesidad de espacio venga lo que venga por el
 * hueco. `bannerOf` reordena los dos huecos —«第 {{numero}} 张，共 {{total}} 张»—,
 * que es como el chino cuenta; los nombres de los huecos no se tocan.
 *
 * La flecha → de `seeAll` se copia tal cual, con su espacio delante, y Weë y
 * Weël son marca: se quedan en alfabeto latino dentro del hanzi.
 */
export const home: typeof import('../es/home').home = {
  greeting: '你好，{{nombre}}',
  greetingGuest: '你好',
  composerPlaceholder: '想分享点什么？',
  seeAll: '查看全部 →',
  createWeel: '创建 Weël',
  openMenu: '打开菜单',
  search: '搜索',
  logoHome: 'Weë，回到最上面',
  filterBy: '筛选：{{nombre}}',
  filterAll: '全部',
  bannerOf: '第 {{numero}} 张横幅，共 {{total}} 张',
  weelSample: 'Weël 示例：{{titulo}}',
  exploreCommunities: '探索社区',
  moreCategories: '查看更多分类',
  popularCommunities: '热门社区',
  seeAllOf: '查看全部',
  topicOfTheDay: '今日话题',
  heatedDebate: '激烈讨论',
  featuredOpinion: '精选观点',
  featured: '精选',
};
