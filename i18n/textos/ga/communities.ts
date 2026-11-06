/*
 * IRLANDÉS — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo. Comunidad = «pobal». Los contadores llevan las cinco formas de Intl con
 * la mutación en la palabra: «ball / bhall / bhall / mball / ball» y «postáil /
 * phostáil / phostáil / bpostáil / postáil». El nombre de una comunidad entra
 * por hueco y sale sin tocar.
 */
import { ConPlurales } from './plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Cruthaigh pobal',
  searchPlaceholder: 'Cuardaigh pobail...',
  loading: 'Pobail á lódáil...',

  joinedSection: 'Pobail a bhfuil tú iontu',
  discoverSection: 'Aimsigh pobail',

  official: 'Oifigiúil',
  members_one: '{{contador}} ball',
  members_two: '{{contador}} bhall',
  members_few: '{{contador}} bhall',
  members_many: '{{contador}} mball',
  members_other: '{{contador}} ball',
  memberOf: 'Ball',
  join: 'Téigh isteach',

  leaveTitle: 'Fág an pobal',
  leaveConfirm: 'An bhfuil tú cinnte gur mhaith leat "{{nombre}}" a fhágáil?',
  leave: 'Fág',
  leaveFailed: 'Níorbh fhéidir an pobal a fhágáil',
  actionFailed: 'Níorbh fhéidir an gníomh a chur i gcrích',

  newCommunity: 'Pobal nua',
  name: 'Ainm',
  namePlaceholder: 'M.sh.: Lucht an chaife',
  description: 'Cur síos',
  descriptionPlaceholder: 'Cad faoi a bhfuil an pobal seo?',
  createFailed: 'Níorbh fhéidir an pobal a chruthú',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Pobal {{nombre}}',
  empty: 'Níl aon phobail ar fáil',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Aimsigh do chuid féin.',
  searchLabel: 'Cuardaigh pobail',
  members: 'baill',
  posts: 'postálacha',
  rules: 'Rialacha an phobail',
  one: 'Pobal',
  loadFailed: 'Níorbh fhéidir an pobal a lódáil',
  noPosts: 'Níl aon phostálacha ann',
  beTheFirst: 'Bí ar an gcéad duine a fhoilsíonn sa phobal seo',
  createPost: 'Cruthaigh postáil',
  understoodJoin: 'Tuigim, téigh isteach',
  memberCount_one: '{{cantidad}} ball',
  memberCount_two: '{{cantidad}} bhall',
  memberCount_few: '{{cantidad}} bhall',
  memberCount_many: '{{cantidad}} mball',
  memberCount_other: '{{cantidad}} ball',
  postCount_one: '{{contador}} postáil',
  postCount_two: '{{contador}} phostáil',
  postCount_few: '{{contador}} phostáil',
  postCount_many: '{{contador}} bpostáil',
  postCount_other: '{{contador}} postáil',
  officialNameFilmAnimation: 'Scannánaíocht & Beochan',
  officialNameArtCreativity: 'Ealaín & Cruthaitheacht',
  officialNameCreatorsInfluencers: 'Cruthaitheoirí & Tionchairí',
  officialNameBusinessEntrepreneurship: 'Gnó & Fiontraíocht',
  officialNameTechAi: 'Teicneolaíocht & IS',
  officialNameGamingVirtualWorlds: 'Cluichíocht & Saolta Fíorúla',
  officialNameEducationLearning: 'Oideachas & Foghlaim',
  officialNameFutureSociety: 'Todhchaí & Sochaí',
  officialRuleShare: 'Roinn a bhfuil cruthaithe agat le hIS agus inis conas a rinne tú é',
  officialRuleRespect: 'Fiafraigh agus freagair le meas',
  officialRuleNoSpam: 'Gan turscar ná ábhar nach leat féin é',
  popularDescFilmmakers: 'Daoine a úsáideann IS don scannánaíocht agus don léiriú closamhairc. Taispeáin do phróiseas agus foghlaim ó phróiseas daoine eile.',
  popularDescInfluencers: 'Tionchairí agus cruthaitheoirí ábhair a tháirgeann le hIS.',
  popularDescDesigners: 'Dearthóirí a oibríonn le hIS: brandáil, léaráidí, ealaín dhigiteach.',
  popularDescWriters: 'Scríbhneoirí a chruthaíonn le hIS: leabhair, scripteanna, ailt agus filíocht.',
  popularDescMusicians: 'Cruthaitheoirí ceoil agus fuaime le hIS.',
  popularDescDevelopers: 'Ríomhchláraitheoirí a thógann le hIS.',
  popularDescEntrepreneurs: 'Fiontraithe a úsáideann IS ina gcuid gnólachtaí.',
  popularDescGamers: 'IS agus físchluichí: carachtair, saolta agus eispéiris.',
};
