/*
 * NORUEGO BOKMÅL — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los identificadores del motor —ids de proveedor y de modelo, capacidades, colecciones de
 * Firestore, `engineAdmin`, nombres de proveedores— se copian tal cual. «Política» de una
 * cadena se dice «strategi»; «fallback» se dice «reserve-».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Oppdater',
  statusFailed: 'Kunne ikke lese statusen til motoren. Er serveren på?',
  changeFailed: 'Kunne ikke ta i bruk endringen',

  adminOnly: 'Bare for administrasjon',
  adminOnlyNote: 'Dette panelet er for teamet bak Weë. Er du med i teamet, be om at kontoen din legges til som administrator.',

  settingsTitle: 'Innstillinger',
  settingsLine: 'Priser: {{precios}} · {{credits}} Credits per USD · margin {{margen}} % · strategi {{politica}} · demomodus som siste utvei: {{demo}}',
  pricesTest: 'test',
  pricesReal: 'ekte',
  yes: 'ja',
  no: 'nei',
  configFrom: 'Konfigurasjon lest fra {{origen}}.',
  sourceDefaults: 'standardverdiene i koden',
  resetHealth: 'Nullstill helse',
  healthReset: 'Helse nullstilt.',
  seedDone: 'Standardverdier lagret i Firestore.',

  providers: 'Leverandører',
  priority: 'prioritet {{numero}}',
  enable: 'Aktiver {{proveedor}}',
  disable: 'Deaktiver {{proveedor}}',
  withKey: 'med nøkkel',
  withoutKey: 'uten nøkkel',
  active: 'aktiv',
  inactive: 'inaktiv',
  pausedByFailures: 'satt på pause på grunn av feil',
  recentFailures_one: '{{contador}} nylig feil',
  recentFailures_other: '{{contador}} nylige feil',
  modelLine: '• {{id}} · kvalitet {{calidad}}/5 · hastighet {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · opptil {{segundos}} s',
  pendingVerification: ' · venter på verifisering',

  chains: 'Reservekjeder',
  policyLabel: 'Strategi for {{capacidad}}: {{politica}}',
  onlyDemo: 'bare demomodus (ingen ekte leverandør ennå)',
  editNote: 'For å endre rekkefølgen i en kjede eller låse en modell, rediger aiRouting/{{capacidad}} i Firestore eller bruk engineAdmin · setRouting.',

  policyQualityFirst: 'Kvalitet først',
  policyBalanced: 'Balansert',
  policyCostFirst: 'Kostnad først',

  modalityText: 'tekst',
  modalityVision: 'syn',
  modalityImage: 'bilde',
  modalityVideo: 'video',
  modalityVoice: 'stemme',
  modalityMusic: 'musikk',
  modalityDoc: 'dokumenter',
  rowSubtitle: 'Leverandører, reservekjeder og innstillinger (bare for administrasjon)',
};
