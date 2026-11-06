/*
 * NEERLANDÉS — La pantalla donde se buscan, se crean y se dejan las comunidades.
 * Tipado contra el español.
 *
 * «Comunidad» es «community» (mv. «community's»); «post» es «bericht». Los nombres de las comunidades oficiales
 * son interfaz y se traducen, conservando el «&» del original.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Community maken',
  searchPlaceholder: 'Community\'s zoeken...',
  loading: 'Community\'s laden...',

  joinedSection: 'Community\'s waar je lid van bent',
  discoverSection: 'Community\'s ontdekken',

  official: 'Officieel',
  members_one: '{{contador}} lid',
  members_other: '{{contador}} leden',
  memberOf: 'Lid',
  join: 'Lid worden',

  leaveTitle: 'Community verlaten',
  leaveConfirm: 'Weet je zeker dat je “{{nombre}}” wilt verlaten?',
  leave: 'Verlaten',
  leaveFailed: 'De community verlaten is niet gelukt',
  actionFailed: 'De actie kon niet worden voltooid',

  newCommunity: 'Nieuwe community',
  name: 'Naam',
  namePlaceholder: 'Bijv. Koffieliefhebbers',
  description: 'Beschrijving',
  descriptionPlaceholder: 'Waar gaat deze community over?',
  createFailed: 'De community kon niet worden gemaakt',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Community van {{nombre}}',
  empty: 'Er zijn geen community\'s beschikbaar',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Vind de jouwe.',
  searchLabel: 'Community\'s zoeken',
  members: 'leden',
  posts: 'berichten',
  rules: 'Communityregels',
  one: 'Community',
  loadFailed: 'De community kon niet worden geladen',
  noPosts: 'Er zijn geen berichten',
  beTheFirst: 'Plaats als eerste een bericht in deze community',
  createPost: 'Bericht maken',
  understoodJoin: 'Begrepen, lid worden',
  memberCount_one: '{{cantidad}} lid',
  memberCount_other: '{{cantidad}} leden',
  postCount_one: '{{contador}} bericht',
  postCount_other: '{{contador}} berichten',
  officialNameFilmAnimation: 'Film & Animatie',
  officialNameArtCreativity: 'Kunst & Creativiteit',
  officialNameCreatorsInfluencers: 'Makers & Influencers',
  officialNameBusinessEntrepreneurship: 'Zaken & Ondernemen',
  officialNameTechAi: 'Technologie & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Virtuele werelden',
  officialNameEducationLearning: 'Onderwijs & Leren',
  officialNameFutureSociety: 'Toekomst & Samenleving',
  officialRuleShare: 'Deel wat je met AI hebt gemaakt en vertel hoe je het hebt gedaan',
  officialRuleRespect: 'Stel vragen en geef antwoorden met respect',
  officialRuleNoSpam: 'Geen spam en geen content die niet van jou is',
  popularDescFilmmakers: 'Mensen die AI gebruiken voor film en audiovisuele productie. Laat je proces zien en leer van dat van anderen.',
  popularDescInfluencers: 'Influencers en contentmakers die met AI produceren.',
  popularDescDesigners: 'Ontwerpers die met AI werken: branding, illustratie, digitale kunst.',
  popularDescWriters: 'Schrijvers die met AI creëren: boeken, scripts, artikelen en poëzie.',
  popularDescMusicians: 'Makers van muziek en audio met AI.',
  popularDescDevelopers: 'Programmeurs die met AI bouwen.',
  popularDescEntrepreneurs: 'Ondernemers die AI in hun bedrijf gebruiken.',
  popularDescGamers: 'AI en videogames: personages, werelden en ervaringen.',
};
