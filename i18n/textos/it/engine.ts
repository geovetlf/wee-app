/*
 * ITALIANO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Los identificadores del motor no están aquí: ids de proveedor y de
 * modelo, capacidades (`text.generate`), colecciones (`aiProviders`,
 * `aiRouting`, `aiSettings`), el callable `engineAdmin` y los nombres
 * —Gemini, Seedance, ElevenLabs— se copian tal cual. "fallback" se deja como en
 * alemán y en francés: es la palabra que usa quien lee este panel. Apóstrofo
 * tipográfico ’ (U+2019) siempre.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Aggiorna',
  statusFailed: 'Non sono riuscito a leggere lo stato dell’engine. Il server è acceso?',
  changeFailed: 'Non è stato possibile applicare la modifica',

  adminOnly: 'Solo amministrazione',
  adminOnlyNote: 'Questo pannello è per il team di Weë. Se fai parte del team, chiedi che aggiungano il tuo account come amministratore.',

  settingsTitle: 'Impostazioni',
  settingsLine: 'Prezzi: {{precios}} · {{credits}} Credits per USD · margine {{margen}} % · politica {{politica}} · modalità demo come ultima risorsa: {{demo}}',
  pricesTest: 'di prova',
  pricesReal: 'reali',
  yes: 'sì',
  no: 'no',
  configFrom: 'Configurazione letta da {{origen}}.',
  sourceDefaults: 'i valori predefiniti del codice',
  resetHealth: 'Reimposta lo stato',
  healthReset: 'Stato reimpostato.',
  seedDone: 'Valori predefiniti salvati in Firestore.',

  providers: 'Fornitori',
  priority: 'priorità {{numero}}',
  enable: 'Attiva {{proveedor}}',
  disable: 'Disattiva {{proveedor}}',
  withKey: 'con chiave',
  withoutKey: 'senza chiave',
  active: 'attivo',
  inactive: 'inattivo',
  pausedByFailures: 'in pausa per errori',
  recentFailures_one: '{{contador}} errore recente',
  recentFailures_other: '{{contador}} errori recenti',
  modelLine: '• {{id}} · qualità {{calidad}}/5 · velocità {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · fino a {{segundos}} s',
  pendingVerification: ' · da verificare',

  chains: 'Catene di fallback',
  policyLabel: 'Politica di {{capacidad}}: {{politica}}',
  onlyDemo: 'solo modalità demo (ancora nessun fornitore reale)',
  editNote: 'Per cambiare l’ordine di una catena o fissare un modello, modifica aiRouting/{{capacidad}} in Firestore o usa engineAdmin · setRouting.',

  policyQualityFirst: 'Prima la qualità',
  policyBalanced: 'Equilibrato',
  policyCostFirst: 'Prima il costo',

  modalityText: 'testo',
  modalityVision: 'visione',
  modalityImage: 'immagine',
  modalityVideo: 'video',
  modalityVoice: 'voce',
  modalityMusic: 'musica',
  modalityDoc: 'documenti',
  rowSubtitle: 'Fornitori, catene di fallback e impostazioni (solo amministrazione)',
};
