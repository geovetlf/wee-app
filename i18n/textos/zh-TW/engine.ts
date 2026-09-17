/*
 * CHINO TRADICIONAL (TAIWÁN) — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la precisión.
 * Nada de 操作失敗 a secas: cada aviso dice qué pasó. Los identificadores del motor
 * no se traducen: ids de proveedor y de modelo, las capacidades (`text.generate`),
 * las colecciones de Firestore (`aiProviders`, `aiRouting`, `aiSettings`), el
 * callable `engineAdmin` y los nombres —Gemini, Seedance, ElevenLabs—. «engine»,
 * «fallback» y «Credits» se quedan igual que en los demás idiomas: son la palabra
 * que usa quien lee esto. Credits nunca es 點數.
 *
 * VOCABULARIO DE TAIWÁN, NO CONVERSIÓN DE CARACTERES: los ajustes son 設定 y nunca
 * 設置; la calidad es 品質 y nunca 質量; lo de fábrica es 預設 y nunca 默認; el
 * código es 程式碼; el servidor es un 伺服器; la clave de API es una 金鑰; recargar
 * es 重新整理 y no 刷新; y el vídeo es 影片, nunca 視頻.
 *
 * EL CHINO NO TIENE PLURAL: `recentFailures_one` no se lee nunca y dice lo mismo
 * que `_other`. El clasificador es 次: «最近 3 次失敗».
 *
 * `upToSeconds` y `pendingVerification` empiezan por espacio A PROPÓSITO: la
 * pantalla las pega detrás de `modelLine`, después del `·`.
 *
 * En `configFrom` el hueco puede traer «Firestore (aiProviders · aiRouting ·
 * aiSettings)» o `sourceDefaults`, así que va entre espacios: el caso normal
 * empieza en alfabeto latino y ahí el espacio es obligatorio.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: '重新整理',
  statusFailed: '讀不到 engine 的狀態。伺服器啟動了嗎？',
  changeFailed: '這次修改沒有生效',

  adminOnly: '僅限管理員',
  adminOnlyNote: '這個面板是給 Weë 團隊用的。如果你也是團隊成員，可以請同事把你的帳號加為管理員。',

  settingsTitle: '設定',
  settingsLine: '價格：{{precios}} · 每 USD {{credits}} Credits · 毛利率 {{margen}} % · 策略 {{politica}} · 示範模式作為最後手段：{{demo}}',
  pricesTest: '測試價',
  pricesReal: '實際價',
  yes: '是',
  no: '否',
  configFrom: '設定讀取自 {{origen}}。',
  sourceDefaults: '程式碼裡的預設值',
  resetHealth: '重設健康狀態',
  healthReset: '健康狀態已重設。',
  seedDone: '預設值已儲存到 Firestore。',

  providers: '服務供應商',
  priority: '優先順序 {{numero}}',
  enable: '啟用 {{proveedor}}',
  disable: '停用 {{proveedor}}',
  withKey: '已設定金鑰',
  withoutKey: '未設定金鑰',
  active: '已啟用',
  inactive: '未啟用',
  pausedByFailures: '因連續失敗已暫停',
  recentFailures_one: '最近 {{contador}} 次失敗',
  recentFailures_other: '最近 {{contador}} 次失敗',
  modelLine: '• {{id}} · 品質 {{calidad}}/5 · 速度 {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · 最長 {{segundos}} 秒',
  pendingVerification: ' · 待驗證',

  chains: 'fallback 鏈',
  policyLabel: '{{capacidad}} 的策略：{{politica}}',
  onlyDemo: '只有示範模式（還沒有接上真正的供應商）',
  editNote: '要改一條鏈的順序或固定某個模型，請在 Firestore 裡編輯 aiRouting/{{capacidad}}，或者用 engineAdmin · setRouting。',

  policyQualityFirst: '品質優先',
  policyBalanced: '均衡',
  policyCostFirst: '成本優先',

  modalityText: '文字',
  modalityVision: '視覺',
  modalityImage: '圖像',
  modalityVideo: '影片',
  modalityVoice: '語音',
  modalityMusic: '音樂',
  modalityDoc: '文件',
  rowSubtitle: '服務供應商、fallback 鏈和設定（僅限管理員）',
};
