/*
 * FRANCÉS — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). El nombre de quien entra llega por `{{nombre}}` y
 * sale sin tocar; "Weël" y "Weë" son marca.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Salut, {{nombre}}',
  greetingGuest: 'Salut',
  composerPlaceholder: 'Que veux-tu partager ?',
  seeAll: 'Tout voir →',
  createWeel: 'Créer un Weël',
  openMenu: 'Ouvrir le menu',
  search: 'Rechercher',
  logoHome: 'Weë, revenir en haut',
  filterBy: 'Filtre : {{nombre}}',
  filterAll: 'Tout',
  bannerOf: 'Bannière {{numero}} sur {{total}}',
  weelSample: 'Exemple de Weël : {{titulo}}',
  exploreCommunities: 'Explore les communautés',
  moreCategories: 'Voir plus de catégories',
  popularCommunities: 'Communautés populaires',
  seeAllOf: 'Tout voir',
  topicOfTheDay: 'Sujet du jour',
  heatedDebate: 'Débat animé',
  featuredOpinion: 'Opinion en vedette',
  featured: 'À la une',
};
