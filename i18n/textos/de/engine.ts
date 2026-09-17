/*
 * ALEMÁN — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Los identificadores del motor no están aquí: ids de proveedor y de
 * modelo, capacidades (`text.generate`), colecciones (`aiProviders`,
 * `aiRouting`, `aiSettings`), el callable `engineAdmin` y los nombres
 * —Gemini, Seedance, ElevenLabs— se copian tal cual.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Aktualisieren',
  statusFailed: 'Ich konnte den Status des Engines nicht lesen. Läuft der Server?',
  changeFailed: 'Die Änderung konnte nicht übernommen werden',

  adminOnly: 'Nur für Admins',
  adminOnlyNote: 'Dieses Panel ist für das Weë Team. Wenn du zum Team gehörst, bitte darum, dein Konto als Administrator hinzuzufügen.',

  settingsTitle: 'Einstellungen',
  settingsLine: 'Preise: {{precios}} · {{credits}} Credits pro USD · Marge {{margen}} % · Richtlinie {{politica}} · Demo-Modus als letzte Möglichkeit: {{demo}}',
  pricesTest: 'Test',
  pricesReal: 'echt',
  yes: 'ja',
  no: 'nein',
  configFrom: 'Konfiguration gelesen aus {{origen}}.',
  sourceDefaults: 'den Standardwerten im Code',
  resetHealth: 'Zustand zurücksetzen',
  healthReset: 'Zustand zurückgesetzt.',
  seedDone: 'Standardwerte in Firestore gespeichert.',

  providers: 'Anbieter',
  priority: 'Priorität {{numero}}',
  enable: '{{proveedor}} aktivieren',
  disable: '{{proveedor}} deaktivieren',
  withKey: 'mit Schlüssel',
  withoutKey: 'ohne Schlüssel',
  active: 'aktiv',
  inactive: 'inaktiv',
  pausedByFailures: 'nach Fehlern pausiert',
  recentFailures_one: '{{contador}} kürzlicher Fehler',
  recentFailures_other: '{{contador}} kürzliche Fehler',
  modelLine: '• {{id}} · Qualität {{calidad}}/5 · Geschwindigkeit {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · bis zu {{segundos}} s',
  pendingVerification: ' · noch zu prüfen',

  chains: 'Fallback-Ketten',
  policyLabel: 'Richtlinie für {{capacidad}}: {{politica}}',
  onlyDemo: 'nur Demo-Modus (noch kein echter Anbieter)',
  editNote: 'Um die Reihenfolge einer Kette zu ändern oder ein Modell festzulegen, bearbeite aiRouting/{{capacidad}} in Firestore oder nutze engineAdmin · setRouting.',

  policyQualityFirst: 'Qualität zuerst',
  policyBalanced: 'Ausgewogen',
  policyCostFirst: 'Kosten zuerst',

  modalityText: 'Text',
  modalityVision: 'Bilderkennung',
  modalityImage: 'Bild',
  modalityVideo: 'Video',
  modalityVoice: 'Stimme',
  modalityMusic: 'Musik',
  modalityDoc: 'Dokumente',
  rowSubtitle: 'Anbieter, Fallback-Ketten und Einstellungen (nur für Admins)',
};
