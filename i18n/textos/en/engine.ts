/*
 * ENGLISH — el panel del WEË AI ENGINE.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 *
 * "video" y "no" se escriben igual en los dos idiomas: son la misma palabra.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Refresh',
  statusFailed: 'I could not read the engine status. Is the server running?',
  changeFailed: 'The change could not be applied',

  adminOnly: 'Administrators only',
  adminOnlyNote: 'This panel is for the Weë team. If you are on the team, ask them to add your account as an administrator.',

  settingsTitle: 'Settings',
  settingsLine: 'Prices: {{precios}} · {{credits}} Credits per USD · margin {{margen}} % · policy {{politica}} · demo mode as a last resort: {{demo}}',
  pricesTest: 'test',
  pricesReal: 'real',
  yes: 'yes',
  no: 'no',
  configFrom: 'Configuration read from {{origen}}.',
  sourceDefaults: 'the default values in the code',
  resetHealth: 'Reset health',
  healthReset: 'Health reset.',
  seedDone: 'Default values saved to Firestore.',

  providers: 'Providers',
  priority: 'priority {{numero}}',
  enable: 'Enable {{proveedor}}',
  disable: 'Disable {{proveedor}}',
  withKey: 'with key',
  withoutKey: 'without key',
  active: 'active',
  inactive: 'inactive',
  pausedByFailures: 'paused after failures',
  recentFailures_one: '{{contador}} recent failure',
  recentFailures_other: '{{contador}} recent failures',
  modelLine: '• {{id}} · quality {{calidad}}/5 · speed {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · up to {{segundos}} s',
  pendingVerification: ' · pending verification',

  chains: 'Fallback chains',
  policyLabel: '{{capacidad}} policy: {{politica}}',
  onlyDemo: 'demo mode only (no real provider yet)',
  editNote: 'To change the order of a chain or pin a model, edit aiRouting/{{capacidad}} in Firestore or use engineAdmin · setRouting.',

  policyQualityFirst: 'Quality first',
  policyBalanced: 'Balanced',
  policyCostFirst: 'Cost first',

  modalityText: 'text',
  modalityVision: 'vision',
  modalityImage: 'image',
  modalityVideo: 'video',
  modalityVoice: 'voice',
  modalityMusic: 'music',
  modalityDoc: 'documents',
};
