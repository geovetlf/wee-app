/*
 * NORUEGO BOKMÅL — la pantalla donde se buscan, se crean y se dejan las
 * comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Comunidad» es «fellesskap» (invariable en plural: «fellesskapene» con
 * artículo). «Miembro» es «medlem» (pl. «medlemmer»); «post» es «innlegg»
 * (invariable). Los nombres oficiales conservan la «&». El nombre de una
 * comunidad entra por hueco y sale sin tocar.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Opprett fellesskap',
  searchPlaceholder: 'Søk etter fellesskap…',
  loading: 'Laster fellesskap…',

  joinedSection: 'Fellesskap du er med i',
  discoverSection: 'Oppdag fellesskap',

  official: 'Offisielt',
  members_one: '{{contador}} medlem',
  members_other: '{{contador}} medlemmer',
  memberOf: 'Medlem',
  join: 'Bli med',

  leaveTitle: 'Forlat fellesskap',
  leaveConfirm: 'Er du sikker på at du vil forlate «{{nombre}}»?',
  leave: 'Forlat',
  leaveFailed: 'Kunne ikke forlate fellesskapet',
  actionFailed: 'Kunne ikke fullføre handlingen',

  newCommunity: 'Nytt fellesskap',
  name: 'Navn',
  namePlaceholder: 'F.eks. Kaffeelskere',
  description: 'Beskrivelse',
  descriptionPlaceholder: 'Hva handler dette fellesskapet om?',
  createFailed: 'Kunne ikke opprette fellesskapet',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Fellesskapet {{nombre}}',
  empty: 'Ingen fellesskap tilgjengelig',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Finn dine.',
  searchLabel: 'Søk etter fellesskap',
  members: 'medlemmer',
  posts: 'innlegg',
  rules: 'Regler for fellesskapet',
  one: 'Fellesskap',
  loadFailed: 'Kunne ikke laste fellesskapet',
  noPosts: 'Ingen innlegg',
  beTheFirst: 'Bli den første som publiserer i dette fellesskapet',
  createPost: 'Lag innlegg',
  understoodJoin: 'Jeg forstår, bli med',
  memberCount_one: '{{cantidad}} medlem',
  memberCount_other: '{{cantidad}} medlemmer',
  postCount_one: '{{contador}} innlegg',
  postCount_other: '{{contador}} innlegg',
  officialNameFilmAnimation: 'Film & animasjon',
  officialNameArtCreativity: 'Kunst & kreativitet',
  officialNameCreatorsInfluencers: 'Skapere & influensere',
  officialNameBusinessEntrepreneurship: 'Næringsliv & gründerskap',
  officialNameTechAi: 'Teknologi & KI',
  officialNameGamingVirtualWorlds: 'Gaming & virtuelle verdener',
  officialNameEducationLearning: 'Utdanning & læring',
  officialNameFutureSociety: 'Fremtid & samfunn',
  officialRuleShare: 'Del det du har laget med KI, og fortell hvordan du gjorde det',
  officialRuleRespect: 'Spør og svar med respekt',
  officialRuleNoSpam: 'Ingen spam og ikke noe innhold som ikke er ditt',
  popularDescFilmmakers: 'Folk som bruker KI til film og audiovisuell produksjon. Vis frem prosessen din og lær av andres.',
  popularDescInfluencers: 'Influensere og innholdsskapere som produserer med KI.',
  popularDescDesigners: 'Designere som jobber med KI: merkevare, illustrasjon, digital kunst.',
  popularDescWriters: 'Forfattere som skaper med KI: bøker, manus, artikler og poesi.',
  popularDescMusicians: 'Folk som lager musikk og lyd med KI.',
  popularDescDevelopers: 'Utviklere som bygger med KI.',
  popularDescEntrepreneurs: 'Gründere som bruker KI i bedriftene sine.',
  popularDescGamers: 'KI og dataspill: karakterer, verdener og opplevelser.',
};
