/*
 * CATALÁN — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los ids de proveedor y modelo, las capacidades, las colecciones de Firestore, `engineAdmin`
 * y «fallback» (término del panel) se copian tal cual.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Actualitza',
  statusFailed: 'No he pogut llegir l\'estat de l\'engine. El servidor està encès?',
  changeFailed: 'No s\'ha pogut aplicar el canvi',

  adminOnly: 'Només administració',
  adminOnlyNote: 'Aquest tauler és per a l\'equip de Weë. Si formes part de l\'equip, demana que afegeixin el teu compte com a administrador.',

  settingsTitle: 'Ajustos',
  settingsLine: 'Preus: {{precios}} · {{credits}} Credits per USD · marge {{margen}} % · política {{politica}} · mode demo com a últim recurs: {{demo}}',
  pricesTest: 'de prova',
  pricesReal: 'reals',
  yes: 'sí',
  no: 'no',
  configFrom: 'Font de la configuració: {{origen}}.',
  sourceDefaults: 'els valors per defecte del codi',
  resetHealth: 'Reinicia la salut',
  healthReset: 'Salut reiniciada.',
  seedDone: 'Valors per defecte desats a Firestore.',

  providers: 'Proveïdors',
  priority: 'prioritat {{numero}}',
  enable: 'Activa {{proveedor}}',
  disable: 'Desactiva {{proveedor}}',
  withKey: 'amb clau',
  withoutKey: 'sense clau',
  active: 'actiu',
  inactive: 'inactiu',
  pausedByFailures: 'en pausa per errors',
  recentFailures_one: '{{contador}} error recent',
  recentFailures_other: '{{contador}} errors recents',
  modelLine: '• {{id}} · qualitat {{calidad}}/5 · velocitat {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · fins a {{segundos}} s',
  pendingVerification: ' · pendent de verificar',

  chains: 'Cadenes de fallback',
  policyLabel: 'Política de {{capacidad}}: {{politica}}',
  onlyDemo: 'només mode demo (encara sense proveïdor real)',
  editNote: 'Per canviar l\'ordre d\'una cadena o fixar un model, edita aiRouting/{{capacidad}} a Firestore o fes servir engineAdmin · setRouting.',

  policyQualityFirst: 'Qualitat primer',
  policyBalanced: 'Equilibrat',
  policyCostFirst: 'Cost primer',

  modalityText: 'text',
  modalityVision: 'visió',
  modalityImage: 'imatge',
  modalityVideo: 'vídeo',
  modalityVoice: 'veu',
  modalityMusic: 'música',
  modalityDoc: 'documents',
  rowSubtitle: 'Proveïdors, cadenes de fallback i ajustos (només administració)',
};
