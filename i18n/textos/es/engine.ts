/*
 * El panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * LO QUE NO ENTRA AQUÍ, aunque se lea en el panel: los identificadores del
 * motor. Los ids de proveedor y de modelo, los nombres de las capacidades
 * (`text.generate`), las colecciones de Firestore (`aiProviders`, `aiRouting`,
 * `aiSettings`), el callable `engineAdmin` y los nombres de los proveedores
 * —Gemini, Seedance, ElevenLabs— viajan al servidor o son de quien los hizo:
 * se copian tal cual. Y las notas y los errores que manda el propio motor se
 * enseñan como vienen, porque son suyos.
 */
export const engine = {
  refresh: 'Actualizar',
  statusFailed: 'No pude leer el estado del engine. ¿Está encendido el servidor?',
  changeFailed: 'No se pudo aplicar el cambio',

  adminOnly: 'Solo administración',
  adminOnlyNote: 'Este panel es para el equipo de Weë. Si eres parte del equipo, pide que añadan tu cuenta como administradora.',

  settingsTitle: 'Ajustes',
  settingsLine: 'Precios: {{precios}} · {{credits}} Credits por USD · margen {{margen}} % · política {{politica}} · modo demo como último recurso: {{demo}}',
  pricesTest: 'de prueba',
  pricesReal: 'reales',
  yes: 'sí',
  no: 'no',
  configFrom: 'Configuración leída de {{origen}}.',
  sourceDefaults: 'los valores por defecto del código',
  resetHealth: 'Reiniciar salud',
  healthReset: 'Salud reiniciada.',
  seedDone: 'Valores por defecto guardados en Firestore.',

  providers: 'Proveedores',
  priority: 'prioridad {{numero}}',
  enable: 'Activar {{proveedor}}',
  disable: 'Desactivar {{proveedor}}',
  withKey: 'con clave',
  withoutKey: 'sin clave',
  active: 'activo',
  inactive: 'inactivo',
  pausedByFailures: 'en pausa por fallos',
  recentFailures_one: '{{contador}} fallo reciente',
  recentFailures_other: '{{contador}} fallos recientes',
  modelLine: '• {{id}} · calidad {{calidad}}/5 · velocidad {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · hasta {{segundos}} s',
  pendingVerification: ' · pendiente de verificar',

  chains: 'Cadenas de fallback',
  policyLabel: 'Política de {{capacidad}}: {{politica}}',
  onlyDemo: 'solo modo demo (sin proveedor real todavía)',
  editNote: 'Para cambiar el orden de una cadena o fijar un modelo, edita aiRouting/{{capacidad}} en Firestore o usa engineAdmin · setRouting.',

  policyQualityFirst: 'Calidad primero',
  policyBalanced: 'Equilibrado',
  policyCostFirst: 'Coste primero',

  modalityText: 'texto',
  modalityVision: 'visión',
  modalityImage: 'imagen',
  modalityVideo: 'video',
  modalityVoice: 'voz',
  modalityMusic: 'música',
  modalityDoc: 'documentos',
  rowSubtitle: 'Proveedores, cadenas de fallback y ajustes (solo administración)',
};
