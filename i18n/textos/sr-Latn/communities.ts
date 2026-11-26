/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica, ekavski) — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español. El nombre y la descripción de una comunidad los
 * escribe una persona y entran por `{{nombre}}` sin tocar. Los contadores de
 * miembros y de objavas llevan one / few / other con `ConPlurales`. El «&» de
 * los nombres oficiales se dice con «i», como se escribe en serbio.
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
  memberOf: 'Član',
  join: 'Pridruži se',

  leaveTitle: 'Napusti zajednicu',
  leaveConfirm: 'Da li sigurno želiš da napustiš „{{nombre}}“?',
  leave: 'Napusti',
  leaveFailed: 'Nije moguće napustiti zajednicu',
  actionFailed: 'Radnja nije mogla da se završi',

  newCommunity: 'Nova zajednica',
  name: 'Naziv',
  namePlaceholder: 'Npr. Ljubitelji kafe',
  description: 'Opis',
  descriptionPlaceholder: 'O čemu je ova zajednica?',
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
  beTheFirst: 'Napravi prvu objavu u ovoj zajednici',
  createPost: 'Kreiraj objavu',
  understoodJoin: 'Razumem, pridružujem se',
  memberCount_one: '{{cantidad}} član',
  memberCount_few: '{{cantidad}} člana',
  memberCount_other: '{{cantidad}} članova',
  postCount_one: '{{contador}} objava',
  postCount_few: '{{contador}} objave',
  postCount_other: '{{contador}} objava',
  officialNameFilmAnimation: 'Film i animacija',
  officialNameArtCreativity: 'Umetnost i kreativnost',
  officialNameCreatorsInfluencers: 'Kreatori i influenseri',
  officialNameBusinessEntrepreneurship: 'Biznis i preduzetništvo',
  officialNameTechAi: 'Tehnologija i veštačka inteligencija',
  officialNameGamingVirtualWorlds: 'Gejming i virtuelni svetovi',
  officialNameEducationLearning: 'Obrazovanje i učenje',
  officialNameFutureSociety: 'Budućnost i društvo',
  officialRuleShare: 'Deli ono što je nastalo uz veštačku inteligenciju i ispričaj kako',
  officialRuleRespect: 'Pitaj i odgovaraj s poštovanjem',
  officialRuleNoSpam: 'Bez spama i sadržaja koji nije tvoj',
  popularDescFilmmakers: 'Ljudi koji koriste veštačku inteligenciju za film i audio-vizuelnu produkciju. Pokaži svoj proces i uči od drugih.',
  popularDescInfluencers: 'Influenseri i kreatori sadržaja koji stvaraju uz veštačku inteligenciju.',
  popularDescDesigners: 'Dizajneri koji rade s veštačkom inteligencijom: brending, ilustracija, digitalna umetnost.',
  popularDescWriters: 'Pisci koji stvaraju uz veštačku inteligenciju: knjige, scenariji, članci i poezija.',
  popularDescMusicians: 'Kreatori muzike i audija uz veštačku inteligenciju.',
  popularDescDevelopers: 'Programeri koji razvijaju softver uz veštačku inteligenciju.',
  popularDescEntrepreneurs: 'Preduzetnici koji koriste veštačku inteligenciju u svom poslu.',
  popularDescGamers: 'Veštačka inteligencija i video-igre: likovi, svetovi i iskustva.',
};
