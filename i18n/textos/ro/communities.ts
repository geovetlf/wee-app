/*
 * RUMANO — la pantalla donde se buscan, se crean y se dejan las comunidades. Tipado contra el español.
 *
 * Miembros y posts llevan `_few` además de `_one`/`_other`: el rumano tiene
 * tres plurales («1 membru», «2 membri», «20 de membri»). El nombre de una
 * comunidad que escribe una persona entra por `{{nombre}}` y sale sin tocar.
 */
import { ConPlurales } from '../ru/plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Creează o comunitate',
  searchPlaceholder: 'Caută comunități...',
  loading: 'Se încarcă comunitățile...',

  joinedSection: 'Comunități din care faci parte',
  discoverSection: 'Descoperă comunități',

  official: 'Oficială',
  members_one: '{{contador}} membru',
  members_few: '{{contador}} membri',
  members_other: '{{contador}} de membri',
  memberOf: 'Membru',
  join: 'Alătură-te',

  leaveTitle: 'Părăsește comunitatea',
  leaveConfirm: 'Sigur vrei să părăsești „{{nombre}}”?',
  leave: 'Părăsește',
  leaveFailed: 'Nu s-a putut părăsi comunitatea',
  actionFailed: 'Acțiunea nu a putut fi finalizată',

  newCommunity: 'Comunitate nouă',
  name: 'Nume',
  namePlaceholder: 'Ex.: Iubitorii de cafea',
  description: 'Descriere',
  descriptionPlaceholder: 'Despre ce este această comunitate?',
  createFailed: 'Comunitatea nu a putut fi creată',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Comunitatea {{nombre}}',
  empty: 'Nu există comunități disponibile',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Găsește-le pe ale tale.',
  searchLabel: 'Caută comunități',
  members: 'membri',
  posts: 'postări',
  rules: 'Regulile comunității',
  one: 'Comunitate',
  loadFailed: 'Comunitatea nu a putut fi încărcată',
  noPosts: 'Nu există postări',
  beTheFirst: 'Fii prima persoană care publică în această comunitate',
  createPost: 'Creează o postare',
  understoodJoin: 'Am înțeles, mă alătur',
  memberCount_one: '{{cantidad}} membru',
  memberCount_few: '{{cantidad}} membri',
  memberCount_other: '{{cantidad}} de membri',
  postCount_one: '{{contador}} postare',
  postCount_few: '{{contador}} postări',
  postCount_other: '{{contador}} de postări',
  officialNameFilmAnimation: 'Film & Animație',
  officialNameArtCreativity: 'Artă & Creativitate',
  officialNameCreatorsInfluencers: 'Creatori & Influenceri',
  officialNameBusinessEntrepreneurship: 'Afaceri & Antreprenoriat',
  officialNameTechAi: 'Tehnologie & IA',
  officialNameGamingVirtualWorlds: 'Gaming & Lumi Virtuale',
  officialNameEducationLearning: 'Educație & Învățare',
  officialNameFutureSociety: 'Viitor & Societate',
  officialRuleShare: 'Împărtășește ce ai creat cu IA și povestește cum ai făcut-o',
  officialRuleRespect: 'Întreabă și răspunde cu respect',
  officialRuleNoSpam: 'Fără spam și fără conținut care nu este al tău',
  popularDescFilmmakers: 'Persoane care folosesc IA pentru film și producție audiovizuală. Arată-ți procesul și învață din al altora.',
  popularDescInfluencers: 'Influenceri și creatori de conținut care produc cu IA.',
  popularDescDesigners: 'Designeri care lucrează cu IA: branding, ilustrație, artă digitală.',
  popularDescWriters: 'Scriitori care creează cu IA: cărți, scenarii, articole și poezie.',
  popularDescMusicians: 'Creatori de muzică și audio cu IA.',
  popularDescDevelopers: 'Programatori care construiesc cu IA.',
  popularDescEntrepreneurs: 'Antreprenori care folosesc IA în afacerile lor.',
  popularDescGamers: 'IA și jocuri video: personaje, lumi și experiențe.',
};
