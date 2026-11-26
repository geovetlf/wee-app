/*
 * MONTENEGRINO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Ijekaviano, latino. Tipado contra el español CON PLURALES: `ConPlurales`
 * deja añadir la forma `_few` (2-4, 22-24…) a `members`, `memberCount` y
 * `postCount`, además de `_one` (1, 21…) y `_other` (0, 5-20…). El nombre de
 * una comunidad lo escribe una persona y entra por `{{nombre}}` sin tocar.
 */
import { ConPlurales } from '../ru/plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Kreiraj zajednicu',
  searchPlaceholder: 'Pretraži zajednice...',
  loading: 'Učitavanje zajednica...',

  joinedSection: 'Zajednice kojima pripadaš',
  discoverSection: 'Otkrij zajednice',

  official: 'Zvanična',
  members_one: '{{contador}} član',
  members_few: '{{contador}} člana',
  members_other: '{{contador}} članova',
  memberOf: 'Pridružen/a',
  join: 'Pridruži se',

  leaveTitle: 'Napusti zajednicu',
  leaveConfirm: 'Da li si siguran/na da želiš da napustiš „{{nombre}}“?',
  leave: 'Napusti',
  leaveFailed: 'Nije moguće napustiti zajednicu',
  actionFailed: 'Radnja nije mogla da se izvrši',

  newCommunity: 'Nova zajednica',
  name: 'Naziv',
  namePlaceholder: 'Npr.: Ljubitelji kafe',
  description: 'Opis',
  descriptionPlaceholder: 'O čemu se radi u ovoj zajednici?',
  createFailed: 'Zajednica nije mogla da se kreira',
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
  loadFailed: 'Zajednica nije mogla da se učita',
  noPosts: 'Nema objava',
  beTheFirst: 'Budi prva osoba koja će objaviti u ovoj zajednici',
  createPost: 'Kreiraj objavu',
  understoodJoin: 'Razumijem, pridruži me',
  memberCount_one: '{{cantidad}} član',
  memberCount_few: '{{cantidad}} člana',
  memberCount_other: '{{cantidad}} članova',
  postCount_one: '{{contador}} objava',
  postCount_few: '{{contador}} objave',
  postCount_other: '{{contador}} objava',
  officialNameFilmAnimation: 'Film i animacija',
  officialNameArtCreativity: 'Umjetnost i kreativnost',
  officialNameCreatorsInfluencers: 'Kreatori i influenseri',
  officialNameBusinessEntrepreneurship: 'Biznis i preduzetništvo',
  officialNameTechAi: 'Tehnologija i AI',
  officialNameGamingVirtualWorlds: 'Gejming i virtuelni svjetovi',
  officialNameEducationLearning: 'Obrazovanje i učenje',
  officialNameFutureSociety: 'Budućnost i društvo',
  officialRuleShare: 'Podijeli ono što si kreirao/la uz AI i ispričaj kako si to napravio/la',
  officialRuleRespect: 'Pitaj i odgovaraj s poštovanjem',
  officialRuleNoSpam: 'Bez spama i sadržaja koji nije tvoj',
  popularDescFilmmakers: 'Ljudi koji koriste AI za film i audio-vizuelnu produkciju. Pokaži svoj proces i uči od drugih.',
  popularDescInfluencers: 'Influenseri i kreatori sadržaja koji stvaraju uz AI.',
  popularDescDesigners: 'Dizajneri koji rade uz AI: brendiranje, ilustracija, digitalna umjetnost.',
  popularDescWriters: 'Pisci koji stvaraju uz AI: knjige, scenarija, članci i poezija.',
  popularDescMusicians: 'Kreatori muzike i audija uz AI.',
  popularDescDevelopers: 'Programeri koji grade uz AI.',
  popularDescEntrepreneurs: 'Preduzetnici koji koriste AI u svojim poslovima.',
  popularDescGamers: 'AI i videoigre: likovi, svjetovi i iskustva.',
};
