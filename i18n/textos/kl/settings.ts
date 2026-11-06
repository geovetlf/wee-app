/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Configuración.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Configuración = «Aaqqissuussinerit», privacidad = «Paasissutissanik illersuineq»
 * (guía §4.8). «Weë» y «Weë AI Engine» (nombre del panel de administración, marca interna)
 * quedan intactos; «Weë» va como sujeto intransitivo («Weë … ilisimasaqarpoq»).
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Aaqqissuussinerit',
  sectionContent: 'Imaq',
  sectionPrivacy: 'Paasissutissanik illersuineq',
  sectionPreferences: 'Kissaatigisat',
  sectionSupport: 'Ikiuineq',
  myCommunities: 'Peqatigiiffikka',
  communitiesJoined_one: '{{contador}} peqatigiiffik ilaasortaaffigisaq',
  communitiesJoined_other: '{{contador}} peqatigiiffiit ilaasortaaffigisat',
  privateReplies: 'Akissutit isertortut',
  privateRepliesHint: 'Inuit allat oqariartuutinik isertortunik ilinnut nassiussinissaat akueriuk',
  pushNotifications: 'Nalunaarutit oqarasuaammut',
  language: 'Oqaatsit',
  languageSubtitle: 'Weë qanoq oqaaseqassanersoq toqqaruk',
  help: 'Ikiuineq',
  privacyPolicy: 'Paasissutissanik illersuinermut maleruagassat',
  about: 'Weë pillugu',
  signOut: 'Anigit',
  signOutFailed: 'Anineq iluatsinngilaq',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Aallaqqaasiutit ikkussukkit',
  seedDefaultsConfirm: 'Pilersuisut, tulleriiaarinerit aaqqissuussinerillu aallaqqaasiutit suli peqanngitsut allanneqassapput (Firestore). Sumik peerisoqassanngilaq.',
  seed: 'Ikkussigit',
  sectionNotifications: 'Nalunaarutit',
  sectionInfo: 'Paasissutissat',
  sectionAccount: 'Kontu',
  privacyPolicyHint: 'Paasissutissatit qanoq atortarnerivut, oqaatsinik paasiuminartunik',
  pushNotificationsHint: 'Oqariartuutit nutaat pisullu pillugit nalunaarutinik tigusigit',
  aboutHint: 'Weë suunersoq, nutarternerlu sorleq atorneriuk',
  helpHint: 'Apeqqutit akulikitsumik apeqqutigineqartartut, attaveqarnissamullu paasissutissat',
  signOutHint: 'Kontunnit anigit',
  aboutBody: 'Weë (World Encode Entity) tassaavoq inunnut qarasaasiap silaa atorlugu pilersitsisartunut attaveqatigiiffik.\n\nNutarterneq 1.0.0 · © {{anio}} Weë. Pisinnaatitaaffiit tamarmik illersorneqarput.\n\nSumiiffinnut paasissutissat: GeoNames (geonames.org), CC BY 4.0.',
  location: 'Sumiiffik',
  locationLine: '{{estado}} Sumiiffit eqqoqqissaartoq tamanut takutinneqarneq ajorpoq.',
  locationOff: 'Qamitaq. Weë sumiiffimmik eqqoqqissaanngitsumik atuisinnaatiguk: taamaalilluni eqqaanni sumiiffinnik siunnersuisinnaassaaq, saqqummiussamullu sumiiffimmik ilanngussigaangavit najukkat takutissinnaassallugu. Sumiiffit eqqoqqissaartoq tamanut takutinneqarneq ajorpoq.',
  locationUnavailable: 'Atortoq una sumiiffimmik paasititsisinnaanngilaq.',
  locationDisabled: 'Sumiiffik atortunni aaqqissuussinerni qamitaavoq.',
  locationPermissionDenied: 'Atortup apeqquteqarnerani naamik akivutit. Atortunni aaqqissuussinerni allanngortinniarukku maani attoruk.',
  locationPermissionNotDetermined: 'Weë pisariaqartitsigaangat akuersissummik qinnuteqassaaq.',
  locationApproximate: 'Weë najukkannik ilisimasaqarpoq, sumiiffimmilli eqqoqqissaartumik ilisimasaqanngilaq.',
  locationPrecise: 'Periarfissap pisariaqartitsigaangat Weë sumiiffinnik eqqoqqissaartumik atuisinnaavoq.',
};
