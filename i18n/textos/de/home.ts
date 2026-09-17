/*
 * ALEMÁN — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). El nombre de quien entra llega por `{{nombre}}` y
 * sale sin tocar; "Weël" y "Weë" son marca.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Hallo, {{nombre}}',
  greetingGuest: 'Hallo',
  composerPlaceholder: 'Was möchtest du teilen?',
  seeAll: 'Alle ansehen →',
  createWeel: 'Weël erstellen',
  openMenu: 'Menü öffnen',
  search: 'Suchen',
  logoHome: 'Weë, nach oben',
  filterBy: 'Filter: {{nombre}}',
  filterAll: 'Alles',
  bannerOf: 'Banner {{numero}} von {{total}}',
  weelSample: 'Weël Beispiel: {{titulo}}',
  exploreCommunities: 'Communitys entdecken',
  moreCategories: 'Mehr Kategorien ansehen',
  popularCommunities: 'Beliebte Communitys',
  seeAllOf: 'Alle ansehen',
  topicOfTheDay: 'Thema des Tages',
  heatedDebate: 'Hitzige Debatte',
  featuredOpinion: 'Ausgewählte Meinung',
  featured: 'Highlights',
};
