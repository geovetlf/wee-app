/*
 * FRANCÉS — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Los identificadores del motor no están aquí: ids de proveedor y de
 * modelo, capacidades (`text.generate`), colecciones (`aiProviders`,
 * `aiRouting`, `aiSettings`), el callable `engineAdmin` y los nombres
 * —Gemini, Seedance, ElevenLabs— se copian tal cual. "fallback" se deja como en
 * alemán: es la palabra que usa quien lee este panel.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Actualiser',
  statusFailed: 'Je n’ai pas pu lire l’état de l’engine. Le serveur est-il démarré ?',
  changeFailed: 'La modification n’a pas pu être appliquée',

  adminOnly: 'Administration uniquement',
  adminOnlyNote: 'Ce panneau est réservé à l’équipe Weë. Si tu fais partie de l’équipe, demande que ton compte soit ajouté comme administrateur.',

  settingsTitle: 'Réglages',
  settingsLine: 'Prix : {{precios}} · {{credits}} Credits par USD · marge {{margen}} % · politique {{politica}} · mode démo en dernier recours : {{demo}}',
  pricesTest: 'de test',
  pricesReal: 'réels',
  yes: 'oui',
  no: 'non',
  configFrom: 'Configuration lue depuis {{origen}}.',
  sourceDefaults: 'les valeurs par défaut du code',
  resetHealth: 'Réinitialiser la santé',
  healthReset: 'Santé réinitialisée.',
  seedDone: 'Valeurs par défaut enregistrées dans Firestore.',

  providers: 'Fournisseurs',
  priority: 'priorité {{numero}}',
  enable: 'Activer {{proveedor}}',
  disable: 'Désactiver {{proveedor}}',
  withKey: 'avec clé',
  withoutKey: 'sans clé',
  active: 'actif',
  inactive: 'inactif',
  pausedByFailures: 'en pause après des échecs',
  recentFailures_one: '{{contador}} échec récent',
  recentFailures_other: '{{contador}} échecs récents',
  modelLine: '• {{id}} · qualité {{calidad}}/5 · vitesse {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · jusqu’à {{segundos}} s',
  pendingVerification: ' · en attente de vérification',

  chains: 'Chaînes de fallback',
  policyLabel: 'Politique de {{capacidad}} : {{politica}}',
  onlyDemo: 'mode démo uniquement (pas encore de fournisseur réel)',
  editNote: 'Pour changer l’ordre d’une chaîne ou fixer un modèle, modifie aiRouting/{{capacidad}} dans Firestore ou utilise engineAdmin · setRouting.',

  policyQualityFirst: 'Qualité d’abord',
  policyBalanced: 'Équilibré',
  policyCostFirst: 'Coût d’abord',

  modalityText: 'texte',
  modalityVision: 'vision',
  modalityImage: 'image',
  modalityVideo: 'vidéo',
  modalityVoice: 'voix',
  modalityMusic: 'musique',
  modalityDoc: 'documents',
  rowSubtitle: 'Fournisseurs, chaînes de fallback et réglages (administration uniquement)',
};
