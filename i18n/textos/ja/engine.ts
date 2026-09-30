/*
 * JAPONÉS — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Japonés técnico de administración, en katakana donde el oficio lo dice así: プロバイダー、フォールバックチェーン、
 * ポリシー、ヘルス状態. Los identificadores del motor (aiRouting, engineAdmin · setRouting, Firestore) y los nombres
 * de los proveedores se copian tal cual. «de prueba» / «reales» completan «価格：…»: テスト用 / 本番用.
 * «Fallos» es 失敗 en las dos insignias que van juntas (一時停止中 y 直近の失敗).
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: '更新',
  statusFailed: 'エンジンの状態を取得できませんでした。サーバーは起動していますか？',
  changeFailed: '変更を適用できませんでした',

  adminOnly: '管理者専用',
  adminOnlyNote: 'このパネルはWeëチーム専用です。チームのメンバーであれば、自分のアカウントを管理者として追加するよう依頼してください。',

  settingsTitle: '設定',
  settingsLine: '価格：{{precios}} · 1 USDあたり{{credits}} Credits · マージン{{margen}}% · ポリシー：{{politica}} · 最後の手段としてデモモードを使用：{{demo}}',
  pricesTest: 'テスト用',
  pricesReal: '本番用',
  yes: 'はい',
  no: 'いいえ',
  configFrom: '{{origen}}から設定を読み込みました。',
  sourceDefaults: 'コード内のデフォルト値',
  resetHealth: 'ヘルス状態をリセット',
  healthReset: 'ヘルス状態をリセットしました。',
  seedDone: 'デフォルト値をFirestoreに保存しました。',

  providers: 'プロバイダー',
  priority: '優先度{{numero}}',
  enable: '{{proveedor}}を有効化',
  disable: '{{proveedor}}を無効化',
  withKey: 'APIキーあり',
  withoutKey: 'APIキーなし',
  active: '有効',
  inactive: '無効',
  pausedByFailures: '失敗により一時停止中',
  recentFailures_one: '直近の失敗{{contador}}回',
  recentFailures_other: '直近の失敗{{contador}}回',
  modelLine: '• {{id}} · 品質{{calidad}}/5 · 速度{{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · 最大{{segundos}}秒',
  pendingVerification: ' · 検証待ち',

  chains: 'フォールバックチェーン',
  policyLabel: '{{capacidad}}のポリシー：{{politica}}',
  onlyDemo: 'デモモードのみ（実際のプロバイダーはまだありません）',
  editNote: 'チェーンの順序を変更したり、モデルを固定したりするには、FirestoreのaiRouting/{{capacidad}}を編集するか、engineAdmin · setRoutingを使ってください。',

  policyQualityFirst: '品質優先',
  policyBalanced: 'バランス',
  policyCostFirst: 'コスト優先',

  modalityText: 'テキスト',
  modalityVision: '画像認識',
  modalityImage: '画像',
  modalityVideo: '動画',
  modalityVoice: '音声',
  modalityMusic: '音楽',
  modalityDoc: 'ドキュメント',
  rowSubtitle: 'プロバイダー、フォールバックチェーン、設定（管理者専用）',
};
