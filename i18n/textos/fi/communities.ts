/*
 * FINÉS — Buscar, crear y dejar comunidades. Tipado contra el español: si allí
 * hay una clave que aquí falta, no compila.
 *
 * El nombre de una comunidad entra por `{{nombre}}` y no se declina: la
 * confirmación de salida lo pone entre comillas tras la palabra que lleva el
 * caso («yhteisöstä ”{{nombre}}”»), y la descripción por defecto lo deja como
 * aposición («Yhteisö: {{nombre}}»). Los nombres de comunidades OFICIALES y
 * sus descripciones son interfaz y se traducen; «Influencers», «Gaming»,
 * «startup», «branding» y «spam» son préstamos corrientes en finés.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Luo yhteisö',
  searchPlaceholder: 'Hae yhteisöjä...',
  loading: 'Ladataan yhteisöjä...',

  joinedSection: 'Yhteisösi',
  discoverSection: 'Löydä yhteisöjä',

  official: 'Virallinen',
  members_one: '{{contador}} jäsen',
  members_other: '{{contador}} jäsentä',
  memberOf: 'Liitytty',
  join: 'Liity',

  leaveTitle: 'Poistu yhteisöstä',
  leaveConfirm: 'Haluatko varmasti poistua yhteisöstä ”{{nombre}}”?',
  leave: 'Poistu',
  leaveFailed: 'Yhteisöstä poistuminen ei onnistunut',
  actionFailed: 'Toimintoa ei voitu suorittaa',

  newCommunity: 'Uusi yhteisö',
  name: 'Nimi',
  namePlaceholder: 'Esim. Kahvin ystävät',
  description: 'Kuvaus',
  descriptionPlaceholder: 'Mistä tässä yhteisössä on kyse?',
  createFailed: 'Yhteisöä ei voitu luoda',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Yhteisö: {{nombre}}',
  empty: 'Yhteisöjä ei ole saatavilla',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Löydä omasi.',
  searchLabel: 'Hae yhteisöjä',
  members: 'jäsentä',
  posts: 'julkaisua',
  rules: 'Yhteisön säännöt',
  one: 'Yhteisö',
  loadFailed: 'Yhteisöä ei voitu ladata',
  noPosts: 'Ei julkaisuja',
  beTheFirst: 'Julkaise ensimmäisenä tässä yhteisössä',
  createPost: 'Luo julkaisu',
  understoodJoin: 'Ymmärrän, liity',
  memberCount_one: '{{cantidad}} jäsen',
  memberCount_other: '{{cantidad}} jäsentä',
  postCount_one: '{{contador}} julkaisu',
  postCount_other: '{{contador}} julkaisua',
  officialNameFilmAnimation: 'Elokuva & animaatio',
  officialNameArtCreativity: 'Taide & luovuus',
  officialNameCreatorsInfluencers: 'Sisällöntuottajat & influencerit',
  officialNameBusinessEntrepreneurship: 'Liiketoiminta & yrittäjyys',
  officialNameTechAi: 'Teknologia & tekoäly',
  officialNameGamingVirtualWorlds: 'Pelaaminen & virtuaalimaailmat',
  officialNameEducationLearning: 'Koulutus & oppiminen',
  officialNameFutureSociety: 'Tulevaisuus & yhteiskunta',
  officialRuleShare: 'Jaa, mitä loit tekoälyllä, ja kerro, miten teit sen',
  officialRuleRespect: 'Kysy ja vastaa kunnioittavasti',
  officialRuleNoSpam: 'Ei roskasisältöä eikä muiden tekemää sisältöä',
  popularDescFilmmakers: 'Ihmisiä, jotka käyttävät tekoälyä elokuviin ja audiovisuaaliseen tuotantoon. Näytä prosessisi ja opi muiden prosesseista.',
  popularDescInfluencers: 'Influencereita ja sisällöntuottajia, jotka luovat tekoälyllä.',
  popularDescDesigners: 'Suunnittelijoita, jotka työskentelevät tekoälyn kanssa: brändäys, kuvitus, digitaalinen taide.',
  popularDescWriters: 'Kirjoittajia, jotka luovat tekoälyllä: kirjoja, käsikirjoituksia, artikkeleita ja runoutta.',
  popularDescMusicians: 'Musiikin ja äänen tekijöitä, jotka luovat tekoälyllä.',
  popularDescDevelopers: 'Ohjelmoijia, jotka rakentavat tekoälyllä.',
  popularDescEntrepreneurs: 'Yrittäjiä, jotka käyttävät tekoälyä liiketoiminnassaan.',
  popularDescGamers: 'Tekoäly ja videopelit: hahmoja, maailmoja ja elämyksiä.',
};
