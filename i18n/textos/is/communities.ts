/*
 * ISLANDÉS (is · is-IS) — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Samfélag» = comunidad; «Stofna samfélag», «Ganga í», «Hætta í» (glosario). El nombre de una comunidad lo
 * escribe una persona: va entre comillas „…“ o en aposición tras «samfélagið», nunca declinado.
 * Los nombres oficiales usan «og» en lugar de «&» (en islandés el «&» se lee raro en un nombre).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Stofna samfélag',
  searchPlaceholder: 'Leita að samfélögum…',
  loading: 'Hleður samfélögum…',

  joinedSection: 'Samfélögin mín',
  discoverSection: 'Uppgötva samfélög',

  official: 'Opinbert',
  members_one: '{{contador}} meðlimur',
  members_other: '{{contador}} meðlimir',
  memberOf: 'Meðlimur',
  join: 'Ganga í',

  leaveTitle: 'Hætta í samfélagi',
  leaveConfirm: 'Ertu viss um að þú viljir hætta í samfélaginu „{{nombre}}“?',
  leave: 'Hætta í',
  leaveFailed: 'Ekki tókst að hætta í samfélaginu',
  actionFailed: 'Ekki tókst að ljúka aðgerðinni',

  newCommunity: 'Nýtt samfélag',
  name: 'Nafn',
  namePlaceholder: 'T.d. Kaffiunnendur',
  description: 'Lýsing',
  descriptionPlaceholder: 'Um hvað er þetta samfélag?',
  createFailed: 'Ekki tókst að stofna samfélagið',
  defaultDescription: 'Samfélagið {{nombre}}',
  empty: 'Engin samfélög í boði',

  /* La entrada del Home. */
  findYours: 'Finndu þín samfélög.',
  searchLabel: 'Leita að samfélögum',
  members: 'meðlimir',
  posts: 'færslur',
  rules: 'Reglur samfélagsins',
  one: 'Samfélag',
  loadFailed: 'Ekki tókst að hlaða samfélaginu',
  noPosts: 'Engar færslur',
  beTheFirst: 'Vertu fyrst til að birta í þessu samfélagi',
  createPost: 'Búa til færslu',
  understoodJoin: 'Ég skil, ganga í',
  memberCount_one: '{{cantidad}} meðlimur',
  memberCount_other: '{{cantidad}} meðlimir',
  postCount_one: '{{contador}} færsla',
  postCount_other: '{{contador}} færslur',
  officialNameFilmAnimation: 'Kvikmyndir og hreyfimyndir',
  officialNameArtCreativity: 'List og sköpun',
  officialNameCreatorsInfluencers: 'Efnishöfundar og áhrifavaldar',
  officialNameBusinessEntrepreneurship: 'Viðskipti og frumkvöðlastarf',
  officialNameTechAi: 'Tækni og gervigreind',
  officialNameGamingVirtualWorlds: 'Tölvuleikir og sýndarheimar',
  officialNameEducationLearning: 'Menntun og nám',
  officialNameFutureSociety: 'Framtíð og samfélag',
  officialRuleShare: 'Deildu því sem þú bjóst til með gervigreind og segðu frá hvernig þú fórst að',
  officialRuleRespect: 'Spurðu og svaraðu af virðingu',
  officialRuleNoSpam: 'Ekkert ruslefni og ekkert efni sem er ekki þitt',
  popularDescFilmmakers: 'Fólk sem notar gervigreind í kvikmyndagerð og myndmiðlun. Sýndu ferlið þitt og lærðu af öðrum.',
  popularDescInfluencers: 'Áhrifavaldar og efnishöfundar sem skapa með gervigreind.',
  popularDescDesigners: 'Hönnuðir sem vinna með gervigreind: vörumerki, teikningar, stafræn list.',
  popularDescWriters: 'Höfundar sem skrifa með gervigreind: bækur, handrit, greinar og ljóð.',
  popularDescMusicians: 'Fólk sem skapar tónlist og hljóð með gervigreind.',
  popularDescDevelopers: 'Forritarar sem smíða með gervigreind.',
  popularDescEntrepreneurs: 'Frumkvöðlar sem nota gervigreind í rekstri sínum.',
  popularDescGamers: 'Gervigreind og tölvuleikir: persónur, heimar og upplifanir.',
};
