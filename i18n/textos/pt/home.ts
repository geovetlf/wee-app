/*
 * PORTUGUÉS (pt-BR) — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). El nombre de quien entra llega por `{{nombre}}` y
 * sale sin tocar; "Weël" y "Weë" son marca. La flecha → de `seeAll` se copia tal
 * cual. Apóstrofo tipográfico ’ siempre.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Olá, {{nombre}}',
  greetingGuest: 'Olá',
  composerPlaceholder: 'O que você quer compartilhar?',
  seeAll: 'Ver todos →',
  createWeel: 'Criar Weël',
  openMenu: 'Abrir menu',
  search: 'Buscar',
  logoHome: 'Weë, ir para o começo',
  filterBy: 'Filtrar: {{nombre}}',
  filterAll: 'Tudo',
  bannerOf: 'Banner {{numero}} de {{total}}',
  weelSample: 'Exemplo de Weël: {{titulo}}',
  exploreCommunities: 'Explore comunidades',
  moreCategories: 'Ver mais categorias',
  popularCommunities: 'Comunidades populares',
  seeAllOf: 'Ver todas',
  topicOfTheDay: 'Tema do dia',
  heatedDebate: 'Debate intenso',
  featuredOpinion: 'Opinião em destaque',
  featured: 'Destaques',
};
