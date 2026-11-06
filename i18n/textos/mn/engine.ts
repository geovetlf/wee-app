/*
 * MONGOL — El panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 * Tipado contra el español. Los identificadores del motor (proveedores, modelos,
 * capacidades, colecciones, callables) se copian tal cual.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Шинэчлэх',
  statusFailed: 'Engine-ийн төлөвийг уншиж чадсангүй. Сервер асаалттай юу?',
  changeFailed: 'Өөрчлөлтийг хэрэгжүүлж чадсангүй',

  adminOnly: 'Зөвхөн удирдлагад',
  adminOnlyNote: 'Энэ самбар Weë багийнх юм. Хэрэв та багийн гишүүн бол бүртгэлээ удирдагчаар нэмүүлэхийг хүснэ үү.',

  settingsTitle: 'Тохиргоо',
  settingsLine: 'Үнэ: {{precios}} · нэг USD тутамд {{credits}} Credits · ашгийн хувь {{margen}} % · бодлого {{politica}} · сүүлчийн арга болгон демо горим: {{demo}}',
  pricesTest: 'туршилтын',
  pricesReal: 'бодит',
  yes: 'тийм',
  no: 'үгүй',
  configFrom: 'Тохиргоог уншсан эх сурвалж: {{origen}}.',
  sourceDefaults: 'кодын анхдагч утгууд',
  resetHealth: 'Төлөвийг дахин тохируулах',
  healthReset: 'Төлөвийг дахин тохируулсан.',
  seedDone: 'Анхдагч утгуудыг Firestore-д хадгалсан.',

  providers: 'Нийлүүлэгчид',
  priority: 'давуу эрэмбэ {{numero}}',
  enable: 'Идэвхжүүлэх: {{proveedor}}',
  disable: 'Идэвхгүй болгох: {{proveedor}}',
  withKey: 'түлхүүртэй',
  withoutKey: 'түлхүүргүй',
  active: 'идэвхтэй',
  inactive: 'идэвхгүй',
  pausedByFailures: 'алдаанаас болж түр зогссон',
  recentFailures_one: 'сүүлийн үеийн {{contador}} алдаа',
  recentFailures_other: 'сүүлийн үеийн {{contador}} алдаа',
  modelLine: '• {{id}} · чанар {{calidad}}/5 · хурд {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · {{segundos}} с хүртэл',
  pendingVerification: ' · баталгаажуулалт хүлээгдэж байна',

  chains: 'Нөөц гинжин хэлхээ',
  policyLabel: 'Бодлого — {{capacidad}}: {{politica}}',
  onlyDemo: 'зөвхөн демо горим (бодит нийлүүлэгч хараахан алга)',
  editNote: 'Гинжин хэлхээний дарааллыг өөрчлөх эсвэл загварыг тогтоохын тулд Firestore дахь aiRouting/{{capacidad}} баримтыг засах эсвэл engineAdmin · setRouting ашиглана уу.',

  policyQualityFirst: 'Чанар түрүүнд',
  policyBalanced: 'Тэнцвэртэй',
  policyCostFirst: 'Зардал түрүүнд',

  modalityText: 'текст',
  modalityVision: 'хараа',
  modalityImage: 'зураг',
  modalityVideo: 'видео',
  modalityVoice: 'дуу хоолой',
  modalityMusic: 'хөгжим',
  modalityDoc: 'баримт бичиг',
  rowSubtitle: 'Нийлүүлэгчид, нөөц гинжин хэлхээ ба тохиргоо (зөвхөн удирдлагад)',
};
