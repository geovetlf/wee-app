/*
 * GRIEGO — La pantalla donde se buscan, se crean y se dejan las comunidades,
 * con los nombres, reglas y descripciones de las comunidades oficiales.
 * Tipado contra el español.
 *
 * «Unido» (estado) se dice «Μέλος», que evita marcar género; «Unirse» es el
 * sustantivo «Συμμετοχή». «post» y «publicación» son «ανάρτηση».
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Δημιουργία κοινότητας',
  searchPlaceholder: 'Αναζήτηση κοινοτήτων…',
  loading: 'Φόρτωση κοινοτήτων…',

  joinedSection: 'Οι κοινότητές σου',
  discoverSection: 'Ανακάλυψε κοινότητες',

  official: 'Επίσημη',
  members_one: '{{contador}} μέλος',
  members_other: '{{contador}} μέλη',
  memberOf: 'Μέλος',
  join: 'Συμμετοχή',

  leaveTitle: 'Αποχώρηση από την κοινότητα',
  leaveConfirm: 'Σίγουρα θέλεις να αποχωρήσεις από την «{{nombre}}»;',
  leave: 'Αποχώρηση',
  leaveFailed: 'Δεν ήταν δυνατή η αποχώρηση από την κοινότητα',
  actionFailed: 'Δεν ήταν δυνατή η ολοκλήρωση της ενέργειας',

  newCommunity: 'Νέα κοινότητα',
  name: 'Όνομα',
  namePlaceholder: 'Π.χ. Λάτρεις του καφέ',
  description: 'Περιγραφή',
  descriptionPlaceholder: 'Τι αφορά αυτή η κοινότητα;',
  createFailed: 'Δεν ήταν δυνατή η δημιουργία της κοινότητας',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Κοινότητα {{nombre}}',
  empty: 'Δεν υπάρχουν διαθέσιμες κοινότητες',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Βρες τις δικές σου.',
  searchLabel: 'Αναζήτηση κοινοτήτων',
  members: 'μέλη',
  posts: 'αναρτήσεις',
  rules: 'Κανόνες της κοινότητας',
  one: 'Κοινότητα',
  loadFailed: 'Δεν ήταν δυνατή η φόρτωση της κοινότητας',
  noPosts: 'Δεν υπάρχουν αναρτήσεις',
  beTheFirst: 'Κάνε εσύ την πρώτη ανάρτηση σε αυτή την κοινότητα',
  createPost: 'Δημιουργία ανάρτησης',
  understoodJoin: 'Κατάλαβα, συμμετοχή',
  memberCount_one: '{{cantidad}} μέλος',
  memberCount_other: '{{cantidad}} μέλη',
  postCount_one: '{{contador}} ανάρτηση',
  postCount_other: '{{contador}} αναρτήσεις',
  officialNameFilmAnimation: 'Κινηματογράφος & Animation',
  officialNameArtCreativity: 'Τέχνη & Δημιουργικότητα',
  officialNameCreatorsInfluencers: 'Δημιουργοί & Influencers',
  officialNameBusinessEntrepreneurship: 'Επιχειρήσεις & Επιχειρηματικότητα',
  officialNameTechAi: 'Τεχνολογία & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Εικονικοί κόσμοι',
  officialNameEducationLearning: 'Εκπαίδευση & Μάθηση',
  officialNameFutureSociety: 'Μέλλον & Κοινωνία',
  officialRuleShare: 'Μοιράσου ό,τι έφτιαξες με AI και πες πώς το έκανες',
  officialRuleRespect: 'Ρώτα και απάντα με σεβασμό',
  officialRuleNoSpam: 'Όχι spam ούτε περιεχόμενο που δεν είναι δικό σου',
  popularDescFilmmakers: 'Άτομα που χρησιμοποιούν AI για κινηματογράφο και οπτικοακουστική παραγωγή. Δείξε τη διαδικασία σου και μάθε από των άλλων.',
  popularDescInfluencers: 'Influencers και δημιουργοί που παράγουν περιεχόμενο με AI.',
  popularDescDesigners: 'Σχεδιαστές που δουλεύουν με AI: branding, εικονογράφηση, ψηφιακή τέχνη.',
  popularDescWriters: 'Συγγραφείς που δημιουργούν με AI: βιβλία, σενάρια, άρθρα και ποίηση.',
  popularDescMusicians: 'Δημιουργοί μουσικής και ήχου με AI.',
  popularDescDevelopers: 'Προγραμματιστές που αναπτύσσουν εφαρμογές με AI.',
  popularDescEntrepreneurs: 'Επιχειρηματίες που χρησιμοποιούν την AI στις επιχειρήσεις τους.',
  popularDescGamers: 'AI και βιντεοπαιχνίδια: χαρακτήρες, κόσμοι και εμπειρίες.',
};
