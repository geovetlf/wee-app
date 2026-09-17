/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — el panel del WEË AI ENGINE (Definições → Weë
 * AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: habla de fallos de proveedores de IA, así que manda la
 * precisión. Los identificadores del motor no están aquí: ids de proveedor y de
 * modelo, capacidades (`text.generate`), colecciones (`aiProviders`,
 * `aiRouting`, `aiSettings`), el callable `engineAdmin · setRouting` y los
 * nombres —Gemini, Seedance, ElevenLabs— se copian tal cual. "engine",
 * "fallback" y "Firestore" se dejan como en inglés, alemán, francés, italiano y
 * brasileño: es la palabra que usa quien lee este panel. Y "Credits" es marca.
 *
 * ESTO NO ES EL BRASILEÑO CON OTRAS PALABRAS:
 *
 *   TRATO DE "TU": "Se fazes parte da equipa", "a tua conta", "Para mudares a
 *   ordem de uma cadeia ou fixares um modelo" —infinitivo personal—.
 *
 * Y el vocabulario, término a término:
 *
 *   definições (no configurações) · equipa (no time) · apenas (no somente)
 *   predefinidos (no padrão) · guardados (no salvos) · alteração (no mudança)
 *   fornecedores (no provedores), que es como Portugal llama a quien presta el
 *   servicio; el hueco `{{proveedor}}` es el NOMBRE de la variable y no se toca
 *
 * EL CERO CAE AL REVÉS QUE EN BRASIL: `Intl.PluralRules('pt-PT')` deja el 0 en
 * `other` —«0 falhas recentes»—. Con {{contador}} en las dos formas sale bien.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Atualizar',
  statusFailed: 'Não consegui ler o estado do engine. O servidor está ligado?',
  changeFailed: 'Não foi possível aplicar a alteração',

  adminOnly: 'Apenas administração',
  adminOnlyNote: 'Este painel é para a equipa do Weë. Se fazes parte da equipa, pede para adicionarem a tua conta como administradora.',

  settingsTitle: 'Definições',
  settingsLine: 'Preços: {{precios}} · {{credits}} Credits por USD · margem {{margen}} % · política {{politica}} · modo demo como último recurso: {{demo}}',
  pricesTest: 'de teste',
  pricesReal: 'reais',
  yes: 'sim',
  no: 'não',
  configFrom: 'Configuração lida de {{origen}}.',
  sourceDefaults: 'os valores predefinidos do código',
  resetHealth: 'Reiniciar a saúde',
  healthReset: 'Saúde reiniciada.',
  seedDone: 'Valores predefinidos guardados no Firestore.',

  providers: 'Fornecedores',
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
  onlyDemo: 'apenas modo demo (ainda sem fornecedor real)',
  editNote: 'Para mudares a ordem de uma cadeia ou fixares um modelo, edita aiRouting/{{capacidad}} no Firestore ou usa engineAdmin · setRouting.',

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
  rowSubtitle: 'Fornecedores, cadeias de fallback e definições (apenas administração)',
};
