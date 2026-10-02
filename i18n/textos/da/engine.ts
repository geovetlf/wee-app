/*
 * DANÉS — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo
 * administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Danés técnico de administración, con las palabras del glosario
 * § 9.6: «udbyder» (proveedor), «politik» (política), «testtilstand» /
 * «live-tilstand» para el modo de los precios. La salud de un proveedor, lo que
 * se reinicia, es «sundhedsstatus» (no «tilstand», que ya es el modo). El margen
 * es «avance», la palabra danesa del comercio. «Fallback» se queda como en el
 * español del panel, porque es la palabra del oficio, en un compuesto con guion:
 * «Fallback-kæder». Los identificadores del motor (aiRouting, engineAdmin ·
 * setRouting, Firestore, `text.generate`) y los nombres de los proveedores se
 * copian tal cual. El error no personifica al panel («No pude leer…» es
 * «Motorens status kunne ikke læses»), y la nota de editar sigue el patrón
 * «Hvis du vil X, skal du Y» (guía § 2).
 *
 * Entre la cifra y su unidad va un espacio fijo (U+00A0), como pide la guía:
 * «{{margen}} %», «{{credits}} Credits», «{{segundos}} s». Las modalidades van en
 * minúscula dentro de la línea «tekst · billede · video · prioritet 1»; «video»
 * se escribe igual que en español porque es la palabra danesa, y «visión» es
 * «billedanalyse». «Coste primero» es «Pris først» (coste = pris, glosario
 * § 9.6). «Sí» y «no» son «ja» y «nej».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Opdater',
  statusFailed: 'Motorens status kunne ikke læses. Kører serveren?',
  changeFailed: 'Ændringen kunne ikke gennemføres',

  adminOnly: 'Kun for administratorer',
  adminOnlyNote: 'Dette panel er til Weë-teamet. Hvis du er en del af teamet, kan du bede om at få din konto tilføjet som administrator.',

  settingsTitle: 'Indstillinger',
  settingsLine: 'Priser: {{precios}} · {{credits}} Credits pr. USD · avance {{margen}} % · politik {{politica}} · demotilstand som sidste udvej: {{demo}}',
  pricesTest: 'testtilstand',
  pricesReal: 'live-tilstand',
  yes: 'ja',
  no: 'nej',
  configFrom: 'Konfigurationen er læst fra {{origen}}.',
  sourceDefaults: 'standardværdierne i koden',
  resetHealth: 'Nulstil sundhedsstatus',
  healthReset: 'Sundhedsstatus er nulstillet.',
  seedDone: 'Standardværdierne er gemt i Firestore.',

  providers: 'Udbydere',
  priority: 'prioritet {{numero}}',
  enable: 'Aktiver {{proveedor}}',
  disable: 'Deaktiver {{proveedor}}',
  withKey: 'med nøgle',
  withoutKey: 'uden nøgle',
  active: 'aktiv',
  inactive: 'inaktiv',
  pausedByFailures: 'sat på pause på grund af fejl',
  recentFailures_one: '{{contador}} nylig fejl',
  recentFailures_other: '{{contador}} nylige fejl',
  modelLine: '• {{id}} · kvalitet {{calidad}}/5 · hastighed {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · op til {{segundos}} s',
  pendingVerification: ' · afventer bekræftelse',

  chains: 'Fallback-kæder',
  policyLabel: 'Politik for {{capacidad}}: {{politica}}',
  onlyDemo: 'kun demotilstand (ingen rigtig udbyder endnu)',
  editNote: 'Hvis du vil ændre rækkefølgen i en kæde eller låse en model fast, skal du redigere aiRouting/{{capacidad}} i Firestore eller bruge engineAdmin · setRouting.',

  policyQualityFirst: 'Kvalitet først',
  policyBalanced: 'Balanceret',
  policyCostFirst: 'Pris først',

  modalityText: 'tekst',
  modalityVision: 'billedanalyse',
  modalityImage: 'billede',
  modalityVideo: 'video',
  modalityVoice: 'stemme',
  modalityMusic: 'musik',
  modalityDoc: 'dokumenter',
  rowSubtitle: 'Udbydere, fallback-kæder og indstillinger (kun for administratorer)',
};
