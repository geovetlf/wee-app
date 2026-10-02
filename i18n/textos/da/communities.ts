/*
 * DANÉS — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una comunidad es «fællesskab» (et fællesskab, fællesskabet, fællesskaber: glosario 9.2), la
 * palabra de Microsoft y de los grupos daneses. Unirse es «Bliv medlem», estar dentro, «Medlem», y
 * salir, «Forlad» (glosario 9.6). El nombre de una comunidad lo escribe una persona: entra por
 * `{{nombre}}`, entre ”…” cuando la frase lo cita, y sin nada pegado. `leaveConfirm` pregunta con
 * «Vil du …?»: salir no borra nada, así que no hace falta «Er du sikker på …» (guía § 2).
 * `defaultDescription` se GUARDA como descripción cuando quien crea la comunidad no escribe
 * ninguna: «Fællesskabet {{nombre}}». `members` y `posts` son la etiqueta bajo la cifra y van en
 * minúscula, como en español. El plural cambia en «medlem» / «medlemmer»; «opslag» es invariable.
 * Los buscadores siguen el patrón «Søg …» de la guía (§ 8), sin puntos suspensivos: «Søg efter
 * fællesskaber», igual que en Buscar. El nombre de ejemplo es «Vi, der elsker kaffe», como se
 * llaman en danés los grupos de aficionados («Fx Kaffeelskere» se leería como Mayúscula En Cada
 * Palabra). `createPost` es «Opret opslag», el botón de Facebook en danés. Los errores son frases
 * completas con punto y el paso siguiente; `loadFailed` dice «senere» porque esa pantalla solo
 * ofrece «Tilbage», no un botón de reintentar.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Opret fællesskab',
  searchPlaceholder: 'Søg efter fællesskaber',
  loading: 'Indlæser fællesskaber…',

  joinedSection: 'Fællesskaber, du er med i',
  discoverSection: 'Opdag fællesskaber',

  official: 'Officiel',
  members_one: '{{contador}} medlem',
  members_other: '{{contador}} medlemmer',
  memberOf: 'Medlem',
  join: 'Bliv medlem',

  leaveTitle: 'Forlad fællesskab',
  leaveConfirm: 'Vil du forlade ”{{nombre}}”?',
  leave: 'Forlad',
  leaveFailed: 'Det lykkedes ikke at forlade fællesskabet. Prøv igen.',
  actionFailed: 'Handlingen kunne ikke gennemføres. Prøv igen.',

  newCommunity: 'Nyt fællesskab',
  name: 'Navn',
  namePlaceholder: 'Fx Vi, der elsker kaffe',
  description: 'Beskrivelse',
  descriptionPlaceholder: 'Hvad handler fællesskabet om?',
  createFailed: 'Fællesskabet kunne ikke oprettes. Prøv igen.',
  defaultDescription: 'Fællesskabet {{nombre}}',
  empty: 'Ingen fællesskaber at vise',
  findYours: 'Find dem, der passer til dig.',
  searchLabel: 'Søg efter fællesskaber',
  members: 'medlemmer',
  posts: 'opslag',
  rules: 'Regler for fællesskabet',
  one: 'Fællesskab',
  loadFailed: 'Fællesskabet kunne ikke indlæses. Prøv igen senere.',
  noPosts: 'Ingen opslag endnu',
  beTheFirst: 'Vær den første til at slå noget op i fællesskabet',
  createPost: 'Opret opslag',
  understoodJoin: 'Forstået – bliv medlem',
  memberCount_one: '{{cantidad}} medlem',
  memberCount_other: '{{cantidad}} medlemmer',
  postCount_one: '{{contador}} opslag',
  postCount_other: '{{contador}} opslag',
  officialNameFilmAnimation: 'Film og animation',
  officialNameArtCreativity: 'Kunst og kreativitet',
  officialNameCreatorsInfluencers: 'Skabere og influencere',
  officialNameBusinessEntrepreneurship: 'Forretning og iværksætteri',
  officialNameTechAi: 'Teknologi og AI',
  officialNameGamingVirtualWorlds: 'Gaming og virtuelle verdener',
  officialNameEducationLearning: 'Uddannelse og læring',
  officialNameFutureSociety: 'Fremtid og samfund',
  officialRuleShare: 'Del det, du har lavet med AI, og fortæl, hvordan du gjorde det',
  officialRuleRespect: 'Spørg og svar med respekt',
  officialRuleNoSpam: 'Ingen spam og intet indhold, der ikke er dit',
  popularDescFilmmakers: 'Folk, der bruger AI til film og videoproduktion. Vis din proces, og lær af andres.',
  popularDescInfluencers: 'Influencere og indholdsskabere, der producerer med AI.',
  popularDescDesigners: 'Designere, der arbejder med AI: branding, illustration og digital kunst.',
  popularDescWriters: 'Forfattere, der skaber med AI: bøger, manuskripter, artikler og poesi.',
  popularDescMusicians: 'Folk, der laver musik og lyd med AI.',
  popularDescDevelopers: 'Udviklere, der bygger med AI.',
  popularDescEntrepreneurs: 'Iværksættere, der bruger AI i deres virksomhed.',
  popularDescGamers: 'AI og computerspil: figurer, verdener og oplevelser.',
};
