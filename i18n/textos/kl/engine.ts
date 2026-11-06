/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — el panel del WEË AI ENGINE (Configuración → Weë AI Engine).
 * Solo administración. Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés. Los identificadores del motor (`aiRouting/…`, `engineAdmin · setRouting`, ids de
 * proveedor y de modelo) y los nombres propios técnicos (Firestore, USD) se copian tal cual y sin sufijo: van
 * entre paréntesis o tras dos puntos. Los huecos van tras dos puntos o en absolutivo. Proveedor = «pilersuisoq»,
 * cadena de fallback = «taarsiutissat tulleriiaarneri», modo demo = «takutitsineq» (demostración); activo /
 * inactivo = «ikitaq / qamitaq» (glosario). Casi todo «pendiente de confirmación nativa».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Nutarteruk',
  statusFailed: 'Engine qanoq ittoq atuarsinnaanngilara. Serveri ikitaava?',
  changeFailed: 'Allanngortitsineq iluatsinngilaq',

  adminOnly: 'Aqutsisunut kisimi',
  adminOnlyNote: 'Aqutsivik una suleqatigiinnut Weë kisimi atugassaavoq. Suleqatigiinni ilaaguit, kontut aqutsisutut ilanngunneqaqqullugu qinnuteqarit.',

  settingsTitle: 'Aaqqissuussinerit',
  settingsLine: 'Akit: {{precios}} · {{credits}} Credits USD-mut ataatsimut · iluanaarut {{margen}} % · periuseq {{politica}} · takutitsineq kingullertut periarfissaq: {{demo}}',
  pricesTest: 'misiligutitut',
  pricesReal: 'piviusut',
  yes: 'aap',
  no: 'naamik',
  configFrom: 'Aaqqissuussinerit atuarneqarput: {{origen}}.',
  sourceDefaults: 'programmimi nalinginnaasumik aalajangersakkat',
  resetHealth: 'Peqqissuseq aallarteqqiguk',
  healthReset: 'Peqqissuseq aallarteqqinneqarpoq.',
  seedDone: 'Nalinginnaasut toqqorneqarput (Firestore).',

  providers: 'Pilersuisut',
  priority: 'salliutitsineq {{numero}}',
  enable: 'Ikiguk: {{proveedor}}',
  disable: 'Qamiguk: {{proveedor}}',
  withKey: 'matuersaatilik',
  withoutKey: 'matuersaateqanngitsoq',
  active: 'ikitaq',
  inactive: 'qamitaq',
  pausedByFailures: 'kukkunerit pissutigalugit unitsikkallarneqarpoq',
  recentFailures_one: '{{contador}} kukkuneq kingulleq',
  recentFailures_other: '{{contador}} kukkunerit kingulliit',
  modelLine: '• {{id}} · pitsaassuseq {{calidad}}/5 · sukkassuseq {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · annerpaamik {{segundos}} s',
  pendingVerification: ' · misissorneqartussaq',

  chains: 'Taarsiutissat tulleriiaarneri',
  policyLabel: 'Periuseq ({{capacidad}}): {{politica}}',
  onlyDemo: 'takutitsineq kisiat (pilersuisoq piviusoq suli peqanngilaq)',
  editNote: 'Tulleriiaarnerup allanngortinnissaanut modelilluunniit aalajangersarnissaanut aiRouting/{{capacidad}} aaqqissoruk (Firestore), imaluunniit engineAdmin · setRouting atoruk.',

  policyQualityFirst: 'Pitsaassuseq siulliullugu',
  policyBalanced: 'Oqimaaqatigiissitaq',
  policyCostFirst: 'Akia siulliullugu',

  modalityText: 'allagaq',
  modalityVision: 'takusinnaaneq',
  modalityImage: 'assi',
  modalityVideo: 'video',
  modalityVoice: 'nipi',
  modalityMusic: 'nipilersorneq',
  modalityDoc: 'allakkiat',
  rowSubtitle: 'Pilersuisut, taarsiutissat tulleriiaarneri aaqqissuussinerillu (aqutsisunut kisimi)',
};
