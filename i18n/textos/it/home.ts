/*
 * ITALIANO — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El nombre de quien entra llega por `{{nombre}}` y
 * sale sin tocar; "Weël" y "Weë" son marca. Apóstrofo tipográfico ’ siempre.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Ciao, {{nombre}}',
  greetingGuest: 'Ciao',
  composerPlaceholder: 'Cosa vuoi condividere?',
  seeAll: 'Vedi tutto →',
  createWeel: 'Crea un Weël',
  openMenu: 'Apri il menu',
  search: 'Cerca',
  logoHome: 'Weë, torna all’inizio',
  filterBy: 'Filtro: {{nombre}}',
  filterAll: 'Tutto',
  bannerOf: 'Banner {{numero}} di {{total}}',
  weelSample: 'Esempio di Weël: {{titulo}}',
  exploreCommunities: 'Esplora le community',
  moreCategories: 'Vedi altre categorie',
  popularCommunities: 'Community popolari',
  seeAllOf: 'Vedi tutte',
  topicOfTheDay: 'Tema del giorno',
  heatedDebate: 'Dibattito acceso',
  featuredOpinion: 'Opinione in evidenza',
  featured: 'In evidenza',
};
