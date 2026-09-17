/*
 * PORTUGUÉS (pt-BR) — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Los identificadores del motor no están aquí: ids de proveedor y de
 * modelo, capacidades (`text.generate`), colecciones (`aiProviders`,
 * `aiRouting`, `aiSettings`), el callable `engineAdmin` y los nombres
 * —Gemini, Seedance, ElevenLabs— se copian tal cual. "engine", "fallback" y
 * "Firestore" se dejan como en inglés, alemán, francés e italiano: es la
 * palabra que usa quien lee este panel. OJO CON EL CERO: en portugués el 0 cae
 * en `_one`, así que `recentFailures_one` nunca lleva un "1" escrito a mano.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Atualizar',
  statusFailed: 'Não consegui ler o estado do engine. O servidor está ligado?',
  changeFailed: 'Não foi possível aplicar a alteração',

  adminOnly: 'Somente administração',
  adminOnlyNote: 'Este painel é para o time do Weë. Se você faz parte do time, peça para adicionarem a sua conta como administradora.',

  settingsTitle: 'Configurações',
  settingsLine: 'Preços: {{precios}} · {{credits}} Credits por USD · margem {{margen}} % · política {{politica}} · modo demo como último recurso: {{demo}}',
  pricesTest: 'de teste',
  pricesReal: 'reais',
  yes: 'sim',
  no: 'não',
  configFrom: 'Configuração lida de {{origen}}.',
  sourceDefaults: 'os valores padrão do código',
  resetHealth: 'Reiniciar a saúde',
  healthReset: 'Saúde reiniciada.',
  seedDone: 'Valores padrão salvos no Firestore.',

  providers: 'Provedores',
  priority: 'prioridade {{numero}}',
  enable: 'Ativar {{proveedor}}',
  disable: 'Desativar {{proveedor}}',
  withKey: 'com chave',
  withoutKey: 'sem chave',
  active: 'ativo',
  inactive: 'inativo',
  pausedByFailures: 'em pausa por falhas',
  recentFailures_one: '{{contador}} falha recente',
  recentFailures_other: '{{contador}} falhas recentes',
  modelLine: '• {{id}} · qualidade {{calidad}}/5 · velocidade {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · até {{segundos}} s',
  pendingVerification: ' · pendente de verificação',

  chains: 'Cadeias de fallback',
  policyLabel: 'Política de {{capacidad}}: {{politica}}',
  onlyDemo: 'somente modo demo (ainda sem provedor real)',
  editNote: 'Para mudar a ordem de uma cadeia ou fixar um modelo, edite aiRouting/{{capacidad}} no Firestore ou use engineAdmin · setRouting.',

  policyQualityFirst: 'Qualidade primeiro',
  policyBalanced: 'Equilibrado',
  policyCostFirst: 'Custo primeiro',

  modalityText: 'texto',
  modalityVision: 'visão',
  modalityImage: 'imagem',
  modalityVideo: 'vídeo',
  modalityVoice: 'voz',
  modalityMusic: 'música',
  modalityDoc: 'documentos',
  rowSubtitle: 'Provedores, cadeias de fallback e configurações (somente administração)',
};
