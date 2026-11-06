/*
 * ISLANDÉS (is · is-IS) — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los identificadores del motor (ids de proveedor y modelo, `text.generate`, `aiRouting`, `engineAdmin`, Gemini,
 * Seedance, ElevenLabs) se copian tal cual. «Engine» se dice «vél» en prosa; «fallback» es «varaleið» (P);
 * «salud» del proveedor, «ástand». Botones en infinitivo sin «að». «%» pegado a la cifra, como `Intl` en `is-IS`.
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Uppfæra',
  statusFailed: 'Ekki tókst að lesa stöðu vélarinnar. Er kveikt á þjóninum?',
  changeFailed: 'Ekki tókst að beita breytingunni',

  adminOnly: 'Aðeins fyrir stjórnendur',
  adminOnlyNote: 'Þetta stjórnborð er fyrir teymi Weë. Ef þú ert í teyminu skaltu biðja um að aðgangurinn þinn verði gerður að stjórnandaaðgangi.',

  settingsTitle: 'Stillingar',
  settingsLine: 'Verð: {{precios}} · {{credits}} Credits á hvern USD · álagning {{margen}}% · stefna {{politica}} · prufuhamur sem síðasta úrræði: {{demo}}',
  pricesTest: 'prufuverð',
  pricesReal: 'raunverð',
  yes: 'já',
  no: 'nei',
  configFrom: 'Stillingar lesnar úr: {{origen}}.',
  sourceDefaults: 'sjálfgefin gildi kóðans',
  resetHealth: 'Endurstilla ástand',
  healthReset: 'Ástand endurstillt.',
  seedDone: 'Sjálfgefin gildi vistuð í Firestore.',

  providers: 'Þjónustuaðilar',
  priority: 'forgangur {{numero}}',
  enable: 'Virkja {{proveedor}}',
  disable: 'Óvirkja {{proveedor}}',
  withKey: 'með lykli',
  withoutKey: 'án lykils',
  active: 'virkur',
  inactive: 'óvirkur',
  pausedByFailures: 'í hléi vegna villna',
  recentFailures_one: '{{contador}} nýleg villa',
  recentFailures_other: '{{contador}} nýlegar villur',
  modelLine: '• {{id}} · gæði {{calidad}}/5 · hraði {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · allt að {{segundos}} sek.',
  pendingVerification: ' · á eftir að staðfesta',

  chains: 'Varaleiðakeðjur',
  policyLabel: 'Stefna fyrir {{capacidad}}: {{politica}}',
  onlyDemo: 'aðeins prufuhamur (enginn raunverulegur þjónustuaðili enn)',
  editNote: 'Til að breyta röð keðju eða festa líkan skaltu breyta aiRouting/{{capacidad}} í Firestore eða nota engineAdmin · setRouting.',

  policyQualityFirst: 'Gæði fyrst',
  policyBalanced: 'Jafnvægi',
  policyCostFirst: 'Kostnaður fyrst',

  modalityText: 'texti',
  modalityVision: 'sjón',
  modalityImage: 'mynd',
  modalityVideo: 'myndband',
  modalityVoice: 'rödd',
  modalityMusic: 'tónlist',
  modalityDoc: 'skjöl',
  rowSubtitle: 'Þjónustuaðilar, varaleiðakeðjur og stillingar (aðeins fyrir stjórnendur)',
};
