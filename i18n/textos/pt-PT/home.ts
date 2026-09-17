/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» y el gerundio va `estar a + infinitivo`. El
 * nombre de quien entra llega por `{{nombre}}` y sale sin tocar; «Weël» y «Weë»
 * son marca. Lo que en Brasil se «compartilha» aquí se «partilha», y el botón de
 * buscar dice «Procurar», igual que en `nav` y en `search`. La flecha → de
 * `seeAll` se copia tal cual. Apóstrofo tipográfico ’ siempre.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Olá, {{nombre}}',
  greetingGuest: 'Olá',
  composerPlaceholder: 'O que queres partilhar?',
  seeAll: 'Ver todos →',
  createWeel: 'Criar Weël',
  openMenu: 'Abrir menu',
  search: 'Procurar',
  logoHome: 'Weë, ir para o início',
  filterBy: 'Filtrar: {{nombre}}',
  filterAll: 'Tudo',
  bannerOf: 'Banner {{numero}} de {{total}}',
  weelSample: 'Exemplo de Weël: {{titulo}}',
  exploreCommunities: 'Explora comunidades',
  moreCategories: 'Ver mais categorias',
  popularCommunities: 'Comunidades populares',
  seeAllOf: 'Ver todas',
  topicOfTheDay: 'Tema do dia',
  heatedDebate: 'Debate intenso',
  featuredOpinion: 'Opinião em destaque',
  featured: 'Destaques',
};
