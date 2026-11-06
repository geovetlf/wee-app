/*
 * POLACO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Comunidad» es «społeczność». Los contadores de miembros y posts llevan las
 * CUATRO formas del polaco con `ConPlurales`. El nombre de una comunidad lo
 * escribe una persona y entra por `{{nombre}}` sin tocar.
 */
import { ConPlurales } from '../ru/plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Utwórz społeczność',
  searchPlaceholder: 'Szukaj społeczności...',
  loading: 'Wczytywanie społeczności...',

  joinedSection: 'Twoje społeczności',
  discoverSection: 'Odkrywaj społeczności',

  official: 'Oficjalna',
  members_one: '{{contador}} członek',
  members_few: '{{contador}} członków',
  members_many: '{{contador}} członków',
  members_other: '{{contador}} członka',
  memberOf: 'Dołączono',
  join: 'Dołącz',

  leaveTitle: 'Opuść społeczność',
  leaveConfirm: 'Czy na pewno chcesz opuścić „{{nombre}}”?',
  leave: 'Opuść',
  leaveFailed: 'Nie udało się opuścić społeczności',
  actionFailed: 'Nie udało się wykonać tej czynności',

  newCommunity: 'Nowa społeczność',
  name: 'Nazwa',
  namePlaceholder: 'Np. Miłośnicy kawy',
  description: 'Opis',
  descriptionPlaceholder: 'Czego dotyczy ta społeczność?',
  createFailed: 'Nie udało się utworzyć społeczności',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Społeczność {{nombre}}',
  empty: 'Brak dostępnych społeczności',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Znajdź swoje.',
  searchLabel: 'Szukaj społeczności',
  members: 'członków',
  posts: 'postów',
  rules: 'Zasady społeczności',
  one: 'Społeczność',
  loadFailed: 'Nie udało się wczytać społeczności',
  noPosts: 'Nie ma postów',
  beTheFirst: 'Bądź pierwszą osobą, która opublikuje coś w tej społeczności',
  createPost: 'Utwórz post',
  understoodJoin: 'Rozumiem, dołączam',
  memberCount_one: '{{cantidad}} członek',
  memberCount_few: '{{cantidad}} członków',
  memberCount_many: '{{cantidad}} członków',
  memberCount_other: '{{cantidad}} członka',
  postCount_one: '{{contador}} post',
  postCount_few: '{{contador}} posty',
  postCount_many: '{{contador}} postów',
  postCount_other: '{{contador}} posta',
  officialNameFilmAnimation: 'Kino & Animacja',
  officialNameArtCreativity: 'Sztuka & Kreatywność',
  officialNameCreatorsInfluencers: 'Twórcy & Influencerzy',
  officialNameBusinessEntrepreneurship: 'Biznes & Przedsiębiorczość',
  officialNameTechAi: 'Technologia & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Wirtualne światy',
  officialNameEducationLearning: 'Edukacja & Nauka',
  officialNameFutureSociety: 'Przyszłość & Społeczeństwo',
  officialRuleShare: 'Dziel się tym, co tworzysz z AI, i opowiadaj, jak to powstało',
  officialRuleRespect: 'Pytaj i odpowiadaj z szacunkiem',
  officialRuleNoSpam: 'Żadnego spamu ani treści, które nie są twoje',
  popularDescFilmmakers: 'Osoby, które używają AI w kinie i produkcji audiowizualnej. Pokaż swój proces i ucz się od innych.',
  popularDescInfluencers: 'Influencerzy i twórcy treści, którzy tworzą z AI.',
  popularDescDesigners: 'Projektanci pracujący z AI: branding, ilustracja, sztuka cyfrowa.',
  popularDescWriters: 'Pisarze tworzący z AI: książki, scenariusze, artykuły i poezja.',
  popularDescMusicians: 'Twórcy muzyki i dźwięku korzystający z AI.',
  popularDescDevelopers: 'Programiści, którzy tworzą oprogramowanie z pomocą AI.',
  popularDescEntrepreneurs: 'Przedsiębiorcy, którzy używają AI w swoich firmach.',
  popularDescGamers: 'AI i gry: postacie, światy i doświadczenia.',
};
