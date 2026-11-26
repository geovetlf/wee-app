/*
 * CROATA — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). El nombre y la descripción de una comunidad los escribe una
 * persona: entran por `{{nombre}}` y salen sin tocar. «Comunidad» es
 * «zajednica» y «post» es «objava».
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `members`,
 * `memberCount` y `postCount`.
 */
import { ConPlurales } from '../ru/plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Stvori zajednicu',
  searchPlaceholder: 'Pretraži zajednice...',
  loading: 'Učitavanje zajednica...',

  joinedSection: 'Tvoje zajednice',
  discoverSection: 'Otkrij zajednice',

  official: 'Službeno',
  members_one: '{{contador}} član',
  members_few: '{{contador}} člana',
  members_other: '{{contador}} članova',
  memberOf: 'Član si',
  join: 'Pridruži se',

  leaveTitle: 'Napusti zajednicu',
  leaveConfirm: 'Sigurno želiš napustiti „{{nombre}}“?',
  leave: 'Napusti',
  leaveFailed: 'Zajednicu nije bilo moguće napustiti',
  actionFailed: 'Radnju nije bilo moguće dovršiti',

  newCommunity: 'Nova zajednica',
  name: 'Naziv',
  namePlaceholder: 'Npr. Ljubitelji kave',
  description: 'Opis',
  descriptionPlaceholder: 'O čemu je ova zajednica?',
  createFailed: 'Zajednicu nije bilo moguće stvoriti',
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
  beTheFirst: 'Napiši prvu objavu u ovoj zajednici',
  createPost: 'Stvori objavu',
  understoodJoin: 'Razumijem, želim se pridružiti',
  memberCount_one: '{{cantidad}} član',
  memberCount_few: '{{cantidad}} člana',
  memberCount_other: '{{cantidad}} članova',
  postCount_one: '{{contador}} objava',
  postCount_few: '{{contador}} objave',
  postCount_other: '{{contador}} objava',
  officialNameFilmAnimation: 'Film & Animacija',
  officialNameArtCreativity: 'Umjetnost & Kreativnost',
  officialNameCreatorsInfluencers: 'Kreatori & Influenceri',
  officialNameBusinessEntrepreneurship: 'Poslovanje & Poduzetništvo',
  officialNameTechAi: 'Tehnologija & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Virtualni svjetovi',
  officialNameEducationLearning: 'Obrazovanje & Učenje',
  officialNameFutureSociety: 'Budućnost & Društvo',
  officialRuleShare: 'Podijeli svoje AI kreacije i ispričaj kako su nastale',
  officialRuleRespect: 'Pitaj i odgovaraj s poštovanjem',
  officialRuleNoSpam: 'Bez spama i sadržaja koji nije tvoj',
  popularDescFilmmakers: 'Ljudi koji koriste AI za film i audiovizualnu produkciju. Pokaži svoj proces i uči od drugih.',
  popularDescInfluencers: 'Influenceri i kreatori sadržaja koji stvaraju uz AI.',
  popularDescDesigners: 'Dizajneri koji rade uz AI: branding, ilustracija, digitalna umjetnost.',
  popularDescWriters: 'Pisci koji stvaraju uz AI: knjige, scenariji, članci i poezija.',
  popularDescMusicians: 'Kreatori glazbe i zvuka uz AI.',
  popularDescDevelopers: 'Programeri koji razvijaju softver uz AI.',
  popularDescEntrepreneurs: 'Poduzetnici koji koriste AI u svojem poslovanju.',
  popularDescGamers: 'AI i videoigre: likovi, svjetovi i iskustva.',
};
