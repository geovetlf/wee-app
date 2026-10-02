/*
 * ALEMÁN — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). "Community" se dice igual en alemán y su plural
 * es "Communitys". El nombre de una comunidad lo escribe una persona: entra
 * por `{{nombre}}` y sale sin tocar.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Community erstellen',
  searchPlaceholder: 'Communitys suchen...',
  loading: 'Communitys werden geladen...',

  joinedSection: 'Deine Communitys',
  discoverSection: 'Communitys entdecken',

  official: 'Offiziell',
  members_one: '{{contador}} Mitglied',
  members_other: '{{contador}} Mitglieder',
  memberOf: 'Beigetreten',
  join: 'Beitreten',

  leaveTitle: 'Community verlassen',
  leaveConfirm: 'Willst du "{{nombre}}" wirklich verlassen?',
  leave: 'Verlassen',
  leaveFailed: 'Die Community konnte nicht verlassen werden',
  actionFailed: 'Die Aktion konnte nicht abgeschlossen werden',

  newCommunity: 'Neue Community',
  name: 'Name',
  namePlaceholder: 'Z. B. Kaffeeliebhaber',
  description: 'Beschreibung',
  descriptionPlaceholder: 'Worum geht es in dieser Community?',
  createFailed: 'Die Community konnte nicht erstellt werden',
  defaultDescription: 'Community von {{nombre}}',
  empty: 'Es gibt keine Communitys',
  findYours: 'Finde deine.',
  searchLabel: 'Communitys suchen',
  members: 'Mitglieder',
  posts: 'Beiträge',
  rules: 'Community-Regeln',
  one: 'Community',
  loadFailed: 'Die Community konnte nicht geladen werden',
  noPosts: 'Es gibt keine Beiträge',
  beTheFirst: 'Mach den ersten Beitrag in dieser Community',
  createPost: 'Beitrag erstellen',
  understoodJoin: 'Verstanden, beitreten',
  memberCount_one: '{{cantidad}} Mitglied',
  memberCount_other: '{{cantidad}} Mitglieder',
  postCount_one: '{{contador}} Beitrag',
  postCount_other: '{{contador}} Beiträge',
  officialNameFilmAnimation: 'Film & Animation',
  officialNameArtCreativity: 'Kunst & Kreativität',
  officialNameCreatorsInfluencers: 'Creator & Influencer',
  officialNameBusinessEntrepreneurship: 'Business & Unternehmertum',
  officialNameTechAi: 'Technologie & KI',
  officialNameGamingVirtualWorlds: 'Gaming & virtuelle Welten',
  officialNameEducationLearning: 'Bildung & Lernen',
  officialNameFutureSociety: 'Zukunft & Gesellschaft',
  officialRuleShare: 'Teile, was du mit KI erstellt hast, und erzähl, wie du es gemacht hast',
  officialRuleRespect: 'Frag und antworte respektvoll',
  officialRuleNoSpam: 'Kein Spam und keine Inhalte, die nicht von dir sind',
  popularDescFilmmakers: 'Menschen, die KI für Film und audiovisuelle Produktion nutzen. Zeig, wie du arbeitest, und lerne von anderen.',
  popularDescInfluencers: 'Influencer und Content Creator, die mit KI produzieren.',
  popularDescDesigners: 'Designerinnen und Designer, die mit KI arbeiten: Branding, Illustration und digitale Kunst.',
  popularDescWriters: 'Autorinnen und Autoren, die mit KI schreiben: Bücher, Drehbücher, Artikel und Lyrik.',
  popularDescMusicians: 'Menschen, die mit KI Musik und Audio erschaffen.',
  popularDescDevelopers: 'Programmiererinnen und Programmierer, die mit KI entwickeln.',
  popularDescEntrepreneurs: 'Gründerinnen und Gründer, die KI in ihren Unternehmen nutzen.',
  popularDescGamers: 'KI und Videospiele: Figuren, Welten und Erlebnisse.',
};
