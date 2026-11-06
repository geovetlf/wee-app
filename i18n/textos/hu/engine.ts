/*
 * HÚNGARO — Panel del Weë AI Engine (solo administración). Tipado contra el
 * español.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Frissítés',
  statusFailed: 'Nem sikerült beolvasni az engine állapotát. Fut a szerver?',
  changeFailed: 'Nem sikerült alkalmazni a módosítást',

  adminOnly: 'Csak adminisztrátoroknak',
  adminOnlyNote: 'Ez a panel a Weë csapatának szól. Ha a csapat tagja vagy, kérd meg őket, hogy adják hozzá a fiókodat adminisztrátorként.',

  settingsTitle: 'Beállítások',
  settingsLine: 'Árak: {{precios}} · {{credits}} Credits / USD · árrés: {{margen}}% · irányelv: {{politica}} · demó mód végső megoldásként: {{demo}}',
  pricesTest: 'teszt',
  pricesReal: 'valós',
  yes: 'igen',
  no: 'nem',
  configFrom: 'A konfiguráció forrása: {{origen}}.',
  sourceDefaults: 'a kód alapértelmezett értékei',
  resetHealth: 'Állapot visszaállítása',
  healthReset: 'Állapot visszaállítva.',
  seedDone: 'Az alapértelmezett értékek mentve a Firestore-ba.',

  providers: 'Szolgáltatók',
  priority: 'prioritás: {{numero}}',
  enable: 'Bekapcsolás: {{proveedor}}',
  disable: 'Kikapcsolás: {{proveedor}}',
  withKey: 'kulccsal',
  withoutKey: 'kulcs nélkül',
  active: 'aktív',
  inactive: 'inaktív',
  pausedByFailures: 'hibák miatt szüneteltetve',
  recentFailures_one: '{{contador}} friss hiba',
  recentFailures_other: '{{contador}} friss hiba',
  modelLine: '• {{id}} · minőség: {{calidad}}/5 · sebesség: {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · legfeljebb {{segundos}} mp',
  pendingVerification: ' · ellenőrzésre vár',

  chains: 'Fallback-láncok',
  policyLabel: 'Irányelv ({{capacidad}}): {{politica}}',
  onlyDemo: 'csak demó mód (még nincs valódi szolgáltató)',
  editNote: 'Egy lánc sorrendjének módosításához vagy egy modell rögzítéséhez szerkeszd az aiRouting/{{capacidad}} dokumentumot a Firestore-ban, vagy használd ezt: engineAdmin · setRouting.',

  policyQualityFirst: 'Minőség az első',
  policyBalanced: 'Kiegyensúlyozott',
  policyCostFirst: 'Költség az első',

  modalityText: 'szöveg',
  modalityVision: 'látás',
  modalityImage: 'kép',
  modalityVideo: 'videó',
  modalityVoice: 'hang',
  modalityMusic: 'zene',
  modalityDoc: 'dokumentumok',
  rowSubtitle: 'Szolgáltatók, fallback-láncok és beállítások (csak adminisztrátoroknak)',
};
