/*
 * SUECO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo
 * administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Sueco técnico de administración: «leverantör» (proveedor),
 * «policy», «hälsostatus» (la salud de un proveedor, lo que se reinicia), y
 * «testläge» / «skarpt läge» para el modo de los precios, que es como se dice en
 * sueco «de prueba» frente a «de verdad». «Fallback» se queda como en el español
 * del panel, porque es la palabra del oficio, en un compuesto con guion:
 * «Fallback-kedjor». Los identificadores del motor (aiRouting, engineAdmin ·
 * setRouting, Firestore, `text.generate`) y los nombres de los proveedores se
 * copian tal cual. El error no personifica al panel («No pude leer…» es «Det
 * gick inte att läsa…»), y la nota de editar sigue el patrón sueco «Om du vill X
 * … gör du Y».
 *
 * Entre la cifra y su unidad va un espacio fijo (U+00A0), como pide la guía:
 * «{{margen}} %», «{{credits}} Credits», «{{segundos}} s». Las modalidades van en
 * minúscula dentro de la línea «text · bild · video · prioritet 1»; «text» y
 * «video» se escriben igual que en inglés (y «video» igual que en español)
 * porque son las palabras suecas, y «visión» es «bildanalys», que se entiende
 * mejor que «datorseende». «Sí» y «no» son «ja» y «nej».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Uppdatera',
  statusFailed: 'Det gick inte att läsa motorns status. Är servern igång?',
  changeFailed: 'Det gick inte att tillämpa ändringen',

  adminOnly: 'Endast för administratörer',
  adminOnlyNote: 'Den här panelen är till för Weë-teamet. Om du är med i teamet kan du be någon att lägga till ditt konto som administratör.',

  settingsTitle: 'Inställningar',
  settingsLine: 'Priser: {{precios}} · {{credits}} Credits per USD · marginal {{margen}} % · policy {{politica}} · demoläge som sista utväg: {{demo}}',
  pricesTest: 'testläge',
  pricesReal: 'skarpt läge',
  yes: 'ja',
  no: 'nej',
  configFrom: 'Konfigurationen lästes från {{origen}}.',
  sourceDefaults: 'standardvärdena i koden',
  resetHealth: 'Återställ hälsostatus',
  healthReset: 'Hälsostatusen har återställts.',
  seedDone: 'Standardvärdena har sparats i Firestore.',

  providers: 'Leverantörer',
  priority: 'prioritet {{numero}}',
  enable: 'Aktivera {{proveedor}}',
  disable: 'Inaktivera {{proveedor}}',
  withKey: 'med nyckel',
  withoutKey: 'utan nyckel',
  active: 'aktiv',
  inactive: 'inaktiv',
  pausedByFailures: 'pausad efter fel',
  recentFailures_one: '{{contador}} fel nyligen',
  recentFailures_other: '{{contador}} fel nyligen',
  modelLine: '• {{id}} · kvalitet {{calidad}}/5 · hastighet {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · upp till {{segundos}} s',
  pendingVerification: ' · väntar på verifiering',

  chains: 'Fallback-kedjor',
  policyLabel: 'Policy för {{capacidad}}: {{politica}}',
  onlyDemo: 'endast demoläge (ingen riktig leverantör ännu)',
  editNote: 'Om du vill ändra ordningen i en kedja eller låsa en modell redigerar du aiRouting/{{capacidad}} i Firestore eller använder engineAdmin · setRouting.',

  policyQualityFirst: 'Kvalitet först',
  policyBalanced: 'Balanserad',
  policyCostFirst: 'Kostnad först',

  modalityText: 'text',
  modalityVision: 'bildanalys',
  modalityImage: 'bild',
  modalityVideo: 'video',
  modalityVoice: 'röst',
  modalityMusic: 'musik',
  modalityDoc: 'dokument',
  rowSubtitle: 'Leverantörer, fallback-kedjor och inställningar (endast för administratörer)',
};
