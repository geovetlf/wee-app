/*
 * CHINO SIMPLIFICADO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la precisión.
 * Nada de 操作失败 a secas: cada aviso dice qué pasó. Los identificadores del motor
 * no se traducen: ids de proveedor y de modelo, las capacidades (`text.generate`),
 * las colecciones de Firestore (`aiProviders`, `aiRouting`, `aiSettings`), el
 * callable `engineAdmin` y los nombres —Gemini, Seedance, ElevenLabs—. «engine»,
 * «fallback» y «Credits» se quedan igual que en los demás idiomas: son la palabra
 * que usa quien lee esto. Credits nunca es 积分.
 *
 * EL CHINO NO TIENE PLURAL: `recentFailures_one` no se lee nunca y dice lo mismo
 * que `_other`. El clasificador es 次: «最近 3 次失败».
 *
 * `upToSeconds` y `pendingVerification` empiezan por espacio A PROPÓSITO: la
 * pantalla las pega detrás de `modelLine`, después del `·`.
 *
 * En `configFrom` el hueco puede traer «Firestore (aiProviders · aiRouting ·
 * aiSettings)» o `sourceDefaults`, así que va entre espacios: el caso normal
 * empieza en alfabeto latino y ahí el espacio es obligatorio.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: '刷新',
  statusFailed: '读不到 engine 的状态。服务器启动了吗？',
  changeFailed: '这次修改没有生效',

  adminOnly: '仅限管理员',
  adminOnlyNote: '这个面板是给 Weë 团队用的。如果你也是团队成员，可以找同事把你的账号加为管理员。',

  settingsTitle: '设置',
  settingsLine: '价格：{{precios}} · 每 USD {{credits}} Credits · 毛利率 {{margen}} % · 策略 {{politica}} · 演示模式作为最后手段：{{demo}}',
  pricesTest: '测试价',
  pricesReal: '实际价',
  yes: '是',
  no: '否',
  configFrom: '配置读取自 {{origen}}。',
  sourceDefaults: '代码里的默认值',
  resetHealth: '重置健康状态',
  healthReset: '健康状态已重置。',
  seedDone: '默认值已保存到 Firestore。',

  providers: '服务商',
  priority: '优先级 {{numero}}',
  enable: '启用 {{proveedor}}',
  disable: '停用 {{proveedor}}',
  withKey: '已配置密钥',
  withoutKey: '未配置密钥',
  active: '已启用',
  inactive: '未启用',
  pausedByFailures: '因连续失败已暂停',
  recentFailures_one: '最近 {{contador}} 次失败',
  recentFailures_other: '最近 {{contador}} 次失败',
  modelLine: '• {{id}} · 质量 {{calidad}}/5 · 速度 {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · 最长 {{segundos}} 秒',
  pendingVerification: ' · 待验证',

  chains: 'fallback 链',
  policyLabel: '{{capacidad}} 的策略：{{politica}}',
  onlyDemo: '只有演示模式（还没有接入真实服务商）',
  editNote: '要改一条链的顺序或固定某个模型，请在 Firestore 里编辑 aiRouting/{{capacidad}}，或者用 engineAdmin · setRouting。',

  policyQualityFirst: '质量优先',
  policyBalanced: '均衡',
  policyCostFirst: '成本优先',

  modalityText: '文本',
  modalityVision: '视觉',
  modalityImage: '图像',
  modalityVideo: '视频',
  modalityVoice: '语音',
  modalityMusic: '音乐',
  modalityDoc: '文档',
  rowSubtitle: '服务商、fallback 链和设置（仅限管理员）',
};
