/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — La pantalla donde se buscan, se crean y se dejan las comunidades.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Comunidad = «peqatigiiffik» (pl. «peqatigiiffiit»), miembro =
 * «ilaasortaq», unirse = «ilaasortanngorit», salir = «qimaguk» (guía §4.3). El nombre de
 * una comunidad ({{nombre}}) lo escribe una persona: va entre »…« en absolutivo o tras dos
 * puntos, nunca con sufijo. «Post(s)» se traduce como «saqqummiussaq/-at», igual que
 * «publicación». Los nombres oficiales se repiten idénticos en help.a7.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Peqatigiiffimmik pilersitsigit',
  searchPlaceholder: 'Peqatigiiffinnik ujarlerit…',
  loading: 'Peqatigiiffiit takutinneqalerput…',

  joinedSection: 'Peqatigiiffiit ilaasortaaffigisatit',
  discoverSection: 'Peqatigiiffinnik nassaarsigit',

  official: 'Pisortatigoortoq',
  members_one: '{{contador}} ilaasortaq',
  members_other: '{{contador}} ilaasortat',
  memberOf: 'Ilaasortaavutit',
  join: 'Ilaasortanngorit',

  leaveTitle: 'Peqatigiiffik qimaguk',
  leaveConfirm: '»{{nombre}}« qimakkusuppiuk?',
  leave: 'Qimaguk',
  leaveFailed: 'Peqatigiiffiup qimannera iluatsinngilaq',
  actionFailed: 'Iliuuseq naammassineqarsinnaanngilaq',

  newCommunity: 'Peqatigiiffik nutaaq',
  name: 'Ateq',
  namePlaceholder: 'Assersuut: Kaffimik nuannarinnittut',
  description: 'Nassuiaat',
  descriptionPlaceholder: 'Peqatigiiffik una suna pillugu?',
  createFailed: 'Peqatigiiffiup pilersinnera iluatsinngilaq',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Peqatigiiffik: {{nombre}}',
  empty: 'Peqatigiiffinnik atorneqarsinnaasunik peqanngilaq',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Peqatigiiffitit nassaakkit.',
  searchLabel: 'Peqatigiiffinnik ujarlerit',
  members: 'ilaasortat',
  posts: 'saqqummiussat',
  rules: 'Peqatigiiffiup maleruagassai',
  one: 'Peqatigiiffik',
  loadFailed: 'Peqatigiiffik takutinneqarsinnaanngilaq',
  noPosts: 'Saqqummiussaqanngilaq',
  beTheFirst: 'Peqatigiiffimmi matumani siullerpaasutit saqqummiussigit',
  createPost: 'Saqqummiussamik pilersitsigit',
  understoodJoin: 'Paasivara, ilaasortanngorniarpunga',
  memberCount_one: '{{cantidad}} ilaasortaq',
  memberCount_other: '{{cantidad}} ilaasortat',
  postCount_one: '{{contador}} saqqummiussaq',
  postCount_other: '{{contador}} saqqummiussat',
  officialNameFilmAnimation: 'Filmit & Assilissat aalasut',
  officialNameArtCreativity: 'Eqqumiitsuliorneq & Pilersitsisinnaassuseq',
  officialNameCreatorsInfluencers: 'Pilersitsisut & Sunniisut',
  officialNameBusinessEntrepreneurship: 'Niuerneq & Suliffeqarfiliorneq',
  officialNameTechAi: 'Atortorissaarutit & AI',
  officialNameGamingVirtualWorlds: 'Pinnguarneq & Silarsuit qarasaasiakkut',
  officialNameEducationLearning: 'Ilinniartitaaneq & Ilinniarneq',
  officialNameFutureSociety: 'Siunissaq & Inuiaqatigiit',
  officialRuleShare: 'AI atorlugu pilersitatit siammartikkit, qanorlu iliorlutit pilersissimanerlugit oqaluttuarilugu',
  officialRuleRespect: 'Ataqqinnilluni apeqquteqarit akisarillu',
  officialRuleNoSpam: 'Spam imaluunniit imaq nammineq pigisanngisat ilanngunneqassanngillat',
  popularDescFilmmakers: 'Inuit AI atorlugu filmiliortut takussutissiortullu. Suliarinninnerit takutiguk, allallu suliarinninnerannit ilinniarit.',
  popularDescInfluencers: 'Sunniisut imassiortullu AI atorlugu suliaqartut.',
  popularDescDesigners: 'Ilusilersuisut AI atorlugu suliaqartut: ilisarnaatiliorneq, titartaaneq, qarasaasiakkut eqqumiitsuliorneq.',
  popularDescWriters: 'Allattut AI atorlugu pilersitsisut: atuakkat, filmimut allaaserisat, allaaserisat taallallu.',
  popularDescMusicians: 'Nipilersortartut nipiliortullu AI atorlugu pilersitsisut.',
  popularDescDevelopers: 'Programmiliortut AI atorlugu sanaartortut.',
  popularDescEntrepreneurs: 'Suliffeqarfiliortut AI niuernerminni atortartut.',
  popularDescGamers: 'AI qarasaasiakkullu pinnguaatit: inuttaasut, silarsuit misigisassallu.',
};
