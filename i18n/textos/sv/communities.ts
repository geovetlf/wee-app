/*
 * SUECO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una comunidad es «community» (en community, communityn, communities: glosario 9.1), la palabra
 * de YouTube, Meta y TikTok en sueco; «Community» a secas se escribe igual que en inglés porque
 * es la palabra sueca. Unirse es «Gå med» y estar dentro, «Gått med», como en los grupos de
 * Facebook; salir es «Lämna». El nombre de una comunidad lo escribe una persona: entra por
 * `{{nombre}}`, entre ”…” cuando la frase lo cita, y sin nada pegado. `defaultDescription` se
 * GUARDA como descripción cuando quien crea la comunidad no escribe ninguna: «Communityn
 * {{nombre}}», como se nombra en sueco un grupo («Föreningen …»). `members` y `posts` son la
 * etiqueta bajo la cifra y van en minúscula, como en español. El plural cambia en «medlem» /
 * «medlemmar»; «inlägg» es invariable. Los buscadores siguen el patrón «Sök …» de la guía (§ 8),
 * sin puntos suspensivos. El nombre de ejemplo es «Vi som älskar kaffe», como se llaman en sueco
 * los grupos de aficionados (y «T.ex. Kaffeälskare» se leería como Mayúscula En Cada Palabra).
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Skapa community',
  searchPlaceholder: 'Sök communities',
  loading: 'Laddar communities…',

  joinedSection: 'Communities du är med i',
  discoverSection: 'Upptäck communities',

  official: 'Officiell',
  members_one: '{{contador}} medlem',
  members_other: '{{contador}} medlemmar',
  memberOf: 'Gått med',
  join: 'Gå med',

  leaveTitle: 'Lämna community',
  leaveConfirm: 'Vill du lämna ”{{nombre}}”?',
  leave: 'Lämna',
  leaveFailed: 'Det gick inte att lämna communityn',
  actionFailed: 'Det gick inte att slutföra åtgärden',

  newCommunity: 'Ny community',
  name: 'Namn',
  namePlaceholder: 'T.ex. Vi som älskar kaffe',
  description: 'Beskrivning',
  descriptionPlaceholder: 'Vad handlar communityn om?',
  createFailed: 'Det gick inte att skapa communityn',
  defaultDescription: 'Communityn {{nombre}}',
  empty: 'Inga communities att visa',
  findYours: 'Hitta de som passar dig.',
  searchLabel: 'Sök communities',
  members: 'medlemmar',
  posts: 'inlägg',
  rules: 'Communityns regler',
  one: 'Community',
  loadFailed: 'Det gick inte att ladda communityn',
  noPosts: 'Inga inlägg ännu',
  beTheFirst: 'Bli först med att publicera i den här communityn',
  createPost: 'Skapa inlägg',
  understoodJoin: 'Jag förstår, gå med',
  memberCount_one: '{{cantidad}} medlem',
  memberCount_other: '{{cantidad}} medlemmar',
  postCount_one: '{{contador}} inlägg',
  postCount_other: '{{contador}} inlägg',
  officialNameFilmAnimation: 'Film och animation',
  officialNameArtCreativity: 'Konst och kreativitet',
  officialNameCreatorsInfluencers: 'Kreatörer och influencers',
  officialNameBusinessEntrepreneurship: 'Företag och entreprenörskap',
  officialNameTechAi: 'Teknik och AI',
  officialNameGamingVirtualWorlds: 'Gaming och virtuella världar',
  officialNameEducationLearning: 'Utbildning och lärande',
  officialNameFutureSociety: 'Framtid och samhälle',
  officialRuleShare: 'Dela det du har skapat med AI och berätta hur du gjorde',
  officialRuleRespect: 'Fråga och svara med respekt',
  officialRuleNoSpam: 'Ingen spam och inget innehåll som inte är ditt',
  popularDescFilmmakers: 'Personer som använder AI i film- och videoproduktion. Visa hur du jobbar och lär dig av andra.',
  popularDescInfluencers: 'Influencers och innehållsskapare som producerar med AI.',
  popularDescDesigners: 'Designer som jobbar med AI: branding, illustration och digital konst.',
  popularDescWriters: 'Skribenter som skapar med AI: böcker, manus, artiklar och poesi.',
  popularDescMusicians: 'Personer som gör musik och ljud med AI.',
  popularDescDevelopers: 'Utvecklare som bygger med AI.',
  popularDescEntrepreneurs: 'Entreprenörer som använder AI i sina företag.',
  popularDescGamers: 'AI och spel: karaktärer, världar och upplevelser.',
};
