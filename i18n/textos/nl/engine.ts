/*
 * NEERLANDÉS — El panel del WEË AI ENGINE (solo administración). Tipado contra el español.
 * Ids, capacidades, colecciones de Firestore, `engineAdmin · setRouting` y nombres de proveedores se copian tal cual.
 * «fallback» se deja como préstamo técnico, igual que en el español.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Vernieuwen',
  statusFailed: 'Ik kon de status van de engine niet lezen. Draait de server?',
  changeFailed: 'De wijziging kon niet worden toegepast',

  adminOnly: 'Alleen voor beheerders',
  adminOnlyNote: 'Dit paneel is voor het Weë-team. Hoor je bij het team, vraag dan of je account als beheerder wordt toegevoegd.',

  settingsTitle: 'Instellingen',
  settingsLine: 'Prijzen: {{precios}} · {{credits}} Credits per USD · marge {{margen}} % · beleid {{politica}} · demomodus als laatste redmiddel: {{demo}}',
  pricesTest: 'test',
  pricesReal: 'echt',
  yes: 'ja',
  no: 'nee',
  configFrom: 'Configuratie gelezen uit {{origen}}.',
  sourceDefaults: 'de standaardwaarden in de code',
  resetHealth: 'Status resetten',
  healthReset: 'Status gereset.',
  seedDone: 'Standaardwaarden opgeslagen in Firestore.',

  providers: 'Providers',
  priority: 'prioriteit {{numero}}',
  enable: '{{proveedor}} inschakelen',
  disable: '{{proveedor}} uitschakelen',
  withKey: 'met sleutel',
  withoutKey: 'zonder sleutel',
  active: 'actief',
  inactive: 'inactief',
  pausedByFailures: 'gepauzeerd na fouten',
  recentFailures_one: '{{contador}} recente fout',
  recentFailures_other: '{{contador}} recente fouten',
  modelLine: '• {{id}} · kwaliteit {{calidad}}/5 · snelheid {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · tot {{segundos}} s',
  pendingVerification: ' · nog te verifiëren',

  chains: 'Fallbackketens',
  policyLabel: 'Beleid voor {{capacidad}}: {{politica}}',
  onlyDemo: 'alleen demomodus (nog geen echte provider)',
  editNote: 'Om de volgorde van een keten te wijzigen of een model vast te zetten, bewerk je aiRouting/{{capacidad}} in Firestore of gebruik je engineAdmin · setRouting.',

  policyQualityFirst: 'Kwaliteit eerst',
  policyBalanced: 'Gebalanceerd',
  policyCostFirst: 'Kosten eerst',

  modalityText: 'tekst',
  modalityVision: 'beeldanalyse',
  modalityImage: 'afbeelding',
  modalityVideo: 'video',
  modalityVoice: 'stem',
  modalityMusic: 'muziek',
  modalityDoc: 'documenten',
  rowSubtitle: 'Providers, fallbackketens en instellingen (alleen voor beheerders)',
};
