/*
 * COREANO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Los identificadores del motor no se traducen: ids de proveedor y de
 * modelo, las capacidades (`text.generate`), las colecciones de Firestore
 * (`aiProviders`, `aiRouting`, `aiSettings`), el callable `engineAdmin` y los
 * nombres —Gemini, Seedance, ElevenLabs—. «engine», «fallback» y «Credits» se
 * quedan igual que en los demás idiomas: son la palabra que usa quien lee esto.
 *
 * EL COREANO NO TIENE PLURAL: `recentFailures_one` no se lee nunca y dice lo
 * mismo que `_other`. El contador 건 va pegado al número, que es lo normal:
 * «최근 오류 3건».
 *
 * `upToSeconds` y `pendingVerification` empiezan por espacio a propósito: la
 * pantalla las pega detrás de `modelLine`.
 *
 * En `editNote` el hueco de la capacidad va seguido de 문서, no de una partícula:
 * `aiRouting/{{capacidad}} 문서를` funciona con cualquier valor, mientras que
 * `aiRouting/{{capacidad}}를` se equivocaría la mitad de las veces.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: '새로고침',
  statusFailed: 'engine 상태를 읽지 못했어요. 서버가 켜져 있나요?',
  changeFailed: '변경 사항을 적용하지 못했어요',

  adminOnly: '관리자 전용',
  adminOnlyNote: '이 패널은 Weë 팀을 위한 곳이에요. 팀원이라면 본인 계정을 관리자로 추가해 달라고 요청하세요.',

  settingsTitle: '설정',
  settingsLine: '가격: {{precios}} · USD당 {{credits}} Credits · 마진 {{margen}} % · 정책 {{politica}} · 최후의 수단으로 데모 모드: {{demo}}',
  pricesTest: '테스트용',
  pricesReal: '실제',
  yes: '예',
  no: '아니요',
  configFrom: '{{origen}}에서 읽은 설정이에요.',
  sourceDefaults: '코드의 기본값',
  resetHealth: '상태 초기화',
  healthReset: '상태를 초기화했어요.',
  seedDone: '기본값을 Firestore에 저장했어요.',

  providers: '제공업체',
  priority: '우선순위 {{numero}}',
  enable: '{{proveedor}} 활성화',
  disable: '{{proveedor}} 비활성화',
  withKey: '키 있음',
  withoutKey: '키 없음',
  active: '활성',
  inactive: '비활성',
  pausedByFailures: '오류로 일시 중지됨',
  recentFailures_one: '최근 오류 {{contador}}건',
  recentFailures_other: '최근 오류 {{contador}}건',
  modelLine: '• {{id}} · 품질 {{calidad}}/5 · 속도 {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · 최대 {{segundos}}초',
  pendingVerification: ' · 확인 필요',

  chains: 'fallback 체인',
  policyLabel: '{{capacidad}} 정책: {{politica}}',
  onlyDemo: '데모 모드만 (아직 실제 제공업체 없음)',
  editNote: '체인 순서를 바꾸거나 모델을 고정하려면 Firestore에서 aiRouting/{{capacidad}} 문서를 수정하거나 engineAdmin · setRouting을 사용하세요.',

  policyQualityFirst: '품질 우선',
  policyBalanced: '균형',
  policyCostFirst: '비용 우선',

  modalityText: '텍스트',
  modalityVision: '비전',
  modalityImage: '이미지',
  modalityVideo: '영상',
  modalityVoice: '음성',
  modalityMusic: '음악',
  modalityDoc: '문서',
  rowSubtitle: '제공업체, fallback 체인, 설정 (관리자 전용)',
};
