/*
 * CHINO TRADICIONAL (TAIWÁN) — el Home: saludo, compositor y las filas de
 * arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El saludo pone el nombre detrás de una coma de ancho completo —«你好，
 * {{nombre}}»—, que separa sin necesidad de espacio venga lo que venga por el
 * hueco. `bannerOf` reordena los dos huecos —«第 {{numero}} 張，共 {{total}} 張»—,
 * que es como el chino cuenta; los nombres de los huecos no se tocan.
 *
 * Vocabulario de Taiwán, no del continente: 搜尋 (no 搜索), 社群 (no 社區),
 * 建立 (no 創建), 選單 (no 菜單) y 範例 (no 示例).
 *
 * La flecha → de `seeAll` se copia tal cual, con su espacio delante, y Weë y
 * Weël son marca: se quedan en alfabeto latino dentro del hanzi.
 */
export const home: typeof import('../es/home').home = {
  greeting: '你好，{{nombre}}',
  greetingGuest: '你好',
  composerPlaceholder: '想分享點什麼？',
  seeAll: '查看全部 →',
  createWeel: '建立 Weël',
  openMenu: '開啟選單',
  search: '搜尋',
  logoHome: 'Weë，回到最上面',
  filterBy: '篩選：{{nombre}}',
  filterAll: '全部',
  bannerOf: '第 {{numero}} 張橫幅，共 {{total}} 張',
  weelSample: 'Weël 範例：{{titulo}}',
  exploreCommunities: '探索社群',
  moreCategories: '查看更多分類',
  popularCommunities: '熱門社群',
  seeAllOf: '查看全部',
  topicOfTheDay: '今日話題',
  heatedDebate: '激烈討論',
  featuredOpinion: '精選觀點',
  featured: '精選',
};
