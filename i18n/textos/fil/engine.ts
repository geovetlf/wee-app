/*
 * FILIPINO — el panel del WEË AI ENGINE (Mga setting → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la precisión. Es el filipino técnico de quien
 * administra, con la fila «Administración (motor)» del glosario (§ 11.11): «provider» (proveedor), «patakaran»
 * (política), «status» (estado), «test mode» / «live mode» para el modo de los precios y «default na value» (como
 * `settings.seedDefaults`). La salud de un proveedor, lo que se reinicia, es «health status», la palabra del oficio;
 * «fallback» también se queda: «Mga fallback chain» (el plural lo pone «mga», nunca la «-s», § 4). Un fallo es
 * «error». Administración es «admin» («Para lang sa mga admin»). Activar y desactivar un proveedor es «I-on» /
 * «I-off» (§ 11.2), y su estado, «aktibo» / «hindi aktibo». El error no personifica al panel («No pude leer…» es
 * «Hindi mabasa ang status ng engine») y la nota de editar empieza por «Para …» (§ 2).
 *
 * LO QUE NO SE TOCA: los identificadores del motor (aiRouting, engineAdmin · setRouting, Firestore,
 * `text.generate`) y los nombres de los proveedores, que viajan al servidor o son de quien los hizo.
 *
 * Cifras: el `%` va pegado a la cifra (§ 7: «{{margen}}%»), «{{credits}} Credits» sin enlace (§ 8.3, regla 7) y los
 * segundos con la unidad corta que escribe `Intl` en filipino, «seg.» (§ 8.1). El plural de `recentFailures` pone el
 * enlace tras la cifra en `_other` (§ 8.3): «{{contador}} error kamakailan» / «{{contador}} na error kamakailan».
 * Las modalidades van en minúscula dentro de la línea «text · larawan · video · priyoridad 1»; «visión» es
 * «pagsusuri ng larawan». «Coste primero» es «Halaga muna» (coste = halaga, § 11.9). «Sí» y «no», «oo» y «hindi».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'I-refresh',
  statusFailed: 'Hindi mabasa ang status ng engine. Naka-on ba ang server?',
  changeFailed: 'Hindi mailapat ang pagbabago',

  adminOnly: 'Para lang sa mga admin',
  adminOnlyNote: 'Para sa team ng Weë ang panel na ito. Kung kasama ka sa team, hilingin na idagdag ang account mo bilang admin.',

  settingsTitle: 'Mga setting',
  settingsLine: 'Mga presyo: {{precios}} · {{credits}} Credits kada USD · margin {{margen}}% · patakaran: {{politica}} · demo mode bilang huling opsyon: {{demo}}',
  pricesTest: 'test mode',
  pricesReal: 'live mode',
  yes: 'oo',
  no: 'hindi',
  configFrom: 'Binasa ang configuration mula sa {{origen}}.',
  sourceDefaults: 'mga default na value sa code',
  resetHealth: 'I-reset ang health status',
  healthReset: 'Na-reset ang health status.',
  seedDone: 'Na-save sa Firestore ang mga default na value.',

  providers: 'Mga provider',
  priority: 'priyoridad {{numero}}',
  enable: 'I-on ang {{proveedor}}',
  disable: 'I-off ang {{proveedor}}',
  withKey: 'may key',
  withoutKey: 'walang key',
  active: 'aktibo',
  inactive: 'hindi aktibo',
  pausedByFailures: 'naka-pause dahil sa mga error',
  recentFailures_one: '{{contador}} error kamakailan',
  recentFailures_other: '{{contador}} na error kamakailan',
  modelLine: '• {{id}} · kalidad {{calidad}}/5 · bilis {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · hanggang {{segundos}} seg.',
  pendingVerification: ' · hindi pa na-verify',

  chains: 'Mga fallback chain',
  policyLabel: 'Patakaran para sa {{capacidad}}: {{politica}}',
  onlyDemo: 'demo mode lang (wala pang totoong provider)',
  editNote: 'Para baguhin ang pagkakasunod-sunod ng isang chain o i-pin ang isang model, i-edit ang aiRouting/{{capacidad}} sa Firestore o gamitin ang engineAdmin · setRouting.',

  policyQualityFirst: 'Kalidad muna',
  policyBalanced: 'Balanse',
  policyCostFirst: 'Halaga muna',

  modalityText: 'text',
  modalityVision: 'pagsusuri ng larawan',
  modalityImage: 'larawan',
  modalityVideo: 'video',
  modalityVoice: 'boses',
  modalityMusic: 'musika',
  modalityDoc: 'dokumento',
  rowSubtitle: 'Mga provider, fallback chain at setting (para lang sa mga admin)',
};
