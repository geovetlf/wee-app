/*
 * HÚNGARO — Buscar, crear y dejar comunidades. Tipado contra el español.
 *
 * El nombre que escribe una persona entra por hueco y no lleva sufijo pegado.
 * Los nombres y descripciones de las comunidades oficiales son interfaz y se
 * traducen.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Közösség létrehozása',
  searchPlaceholder: 'Közösségek keresése...',
  loading: 'Közösségek betöltése...',

  joinedSection: 'Közösségeid',
  discoverSection: 'Közösségek felfedezése',

  official: 'Hivatalos',
  members_one: '{{contador}} tag',
  members_other: '{{contador}} tag',
  memberOf: 'Tag vagy',
  join: 'Csatlakozás',

  leaveTitle: 'Kilépés a közösségből',
  leaveConfirm: 'Biztosan ki szeretnél lépni ebből a közösségből? „{{nombre}}”',
  leave: 'Kilépés',
  leaveFailed: 'Nem sikerült kilépni a közösségből',
  actionFailed: 'Nem sikerült végrehajtani a műveletet',

  newCommunity: 'Új közösség',
  name: 'Név',
  namePlaceholder: 'Pl.: Kávérajongók',
  description: 'Leírás',
  descriptionPlaceholder: 'Miről szól ez a közösség?',
  createFailed: 'Nem sikerült létrehozni a közösséget',
  defaultDescription: 'Közösség: {{nombre}}',
  empty: 'Nincsenek elérhető közösségek',

  findYours: 'Találd meg a hozzád illőket.',
  searchLabel: 'Közösségek keresése',
  members: 'tag',
  posts: 'bejegyzés',
  rules: 'A közösség szabályai',
  one: 'Közösség',
  loadFailed: 'Nem sikerült betölteni a közösséget',
  noPosts: 'Nincsenek bejegyzések',
  beTheFirst: 'Légy te az első, aki közzétesz valamit ebben a közösségben',
  createPost: 'Bejegyzés létrehozása',
  understoodJoin: 'Értem, csatlakozom',
  memberCount_one: '{{cantidad}} tag',
  memberCount_other: '{{cantidad}} tag',
  postCount_one: '{{contador}} bejegyzés',
  postCount_other: '{{contador}} bejegyzés',
  officialNameFilmAnimation: 'Film és animáció',
  officialNameArtCreativity: 'Művészet és kreativitás',
  officialNameCreatorsInfluencers: 'Alkotók és influencerek',
  officialNameBusinessEntrepreneurship: 'Üzlet és vállalkozás',
  officialNameTechAi: 'Technológia és AI',
  officialNameGamingVirtualWorlds: 'Gaming és virtuális világok',
  officialNameEducationLearning: 'Oktatás és tanulás',
  officialNameFutureSociety: 'Jövő és társadalom',
  officialRuleShare: 'Oszd meg, amit AI-jal készítettél, és meséld el, hogyan csináltad',
  officialRuleRespect: 'Kérdezz és válaszolj tisztelettel',
  officialRuleNoSpam: 'Se spam, se olyan tartalom, ami nem a tiéd',
  popularDescFilmmakers: 'Emberek, akik AI-t használnak filmhez és audiovizuális gyártáshoz. Mutasd meg a folyamatodat, és tanulj másokéból.',
  popularDescInfluencers: 'Influencerek és tartalomkészítők, akik AI-jal alkotnak.',
  popularDescDesigners: 'AI-jal dolgozó tervezők: branding, illusztráció, digitális művészet.',
  popularDescWriters: 'AI-jal alkotó írók: könyvek, forgatókönyvek, cikkek és versek.',
  popularDescMusicians: 'Zenét és hanganyagot AI-jal készítő alkotók.',
  popularDescDevelopers: 'Programozók, akik AI-jal építenek.',
  popularDescEntrepreneurs: 'Vállalkozók, akik AI-t használnak az üzletükben.',
  popularDescGamers: 'AI és videójátékok: karakterek, világok és élmények.',
};
