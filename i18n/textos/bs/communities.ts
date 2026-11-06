/*
 * BOSNIO (bs-BA, ijekaviano, latino) — la pantalla donde se buscan, se crean y
 * se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre y la descripción de una comunidad los escribe una persona y entran
 * por `{{nombre}}` sin tocar. Tuteo.
 *
 * PLURALES: `members`, `memberCount` y `postCount` llevan `_few` con
 * `ConPlurales` (član / člana / članova; objava / objave / objava).
 */
import { ConPlurales } from '../ru/plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Kreiraj zajednicu',
  searchPlaceholder: 'Pretraži zajednice...',
  loading: 'Učitavanje zajednica...',

  joinedSection: 'Moje zajednice',
  discoverSection: 'Otkrij zajednice',

  official: 'Zvanična',
  members_one: '{{contador}} član',
  members_few: '{{contador}} člana',
  members_other: '{{contador}} članova',
  memberOf: 'Član si',
  join: 'Pridruži se',

  leaveTitle: 'Napusti zajednicu',
  leaveConfirm: 'Sigurno želiš napustiti „{{nombre}}“?',
  leave: 'Napusti',
  leaveFailed: 'Nije bilo moguće napustiti zajednicu',
  actionFailed: 'Radnju nije bilo moguće izvršiti',

  newCommunity: 'Nova zajednica',
  name: 'Naziv',
  namePlaceholder: 'Npr.: Ljubitelji kahve',
  description: 'Opis',
  descriptionPlaceholder: 'O čemu je ova zajednica?',
  createFailed: 'Zajednicu nije bilo moguće kreirati',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Zajednica {{nombre}}',
  empty: 'Nema dostupnih zajednica',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Pronađi svoje.',
  searchLabel: 'Pretraži zajednice',
  members: 'članova',
  posts: 'objava',
  rules: 'Pravila zajednice',
  one: 'Zajednica',
  loadFailed: 'Zajednicu nije bilo moguće učitati',
  noPosts: 'Nema objava',
  beTheFirst: 'Ostavi prvu objavu u ovoj zajednici',
  createPost: 'Kreiraj objavu',
  understoodJoin: 'Razumijem, pridružujem se',
  memberCount_one: '{{cantidad}} član',
  memberCount_few: '{{cantidad}} člana',
  memberCount_other: '{{cantidad}} članova',
  postCount_one: '{{contador}} objava',
  postCount_few: '{{contador}} objave',
  postCount_other: '{{contador}} objava',
  officialNameFilmAnimation: 'Film & Animacija',
  officialNameArtCreativity: 'Umjetnost & Kreativnost',
  officialNameCreatorsInfluencers: 'Kreatori & Influenseri',
  officialNameBusinessEntrepreneurship: 'Biznis & Poduzetništvo',
  officialNameTechAi: 'Tehnologija & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Virtuelni svjetovi',
  officialNameEducationLearning: 'Obrazovanje & Učenje',
  officialNameFutureSociety: 'Budućnost & Društvo',
  officialRuleShare: 'Podijeli svoje AI kreacije i ispričaj kako su nastale',
  officialRuleRespect: 'Pitaj i odgovaraj s poštovanjem',
  officialRuleNoSpam: 'Bez spama i sadržaja koji nije tvoj',
  popularDescFilmmakers: 'Ljudi koji koriste AI za film i audiovizuelnu produkciju. Pokaži svoj proces i uči od drugih.',
  popularDescInfluencers: 'Influenseri i kreatori sadržaja koji stvaraju uz AI.',
  popularDescDesigners: 'Dizajneri koji rade uz AI: brending, ilustracija, digitalna umjetnost.',
  popularDescWriters: 'Pisci koji stvaraju uz AI: knjige, scenariji, članci i poezija.',
  popularDescMusicians: 'Kreatori muzike i audija uz AI.',
  popularDescDevelopers: 'Programeri koji grade uz AI.',
  popularDescEntrepreneurs: 'Poduzetnici koji koriste AI u svom poslovanju.',
  popularDescGamers: 'AI i videoigre: likovi, svjetovi i iskustva.',
};
