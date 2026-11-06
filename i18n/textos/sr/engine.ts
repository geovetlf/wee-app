/*
 * SERBIO (ћирилица) — el panel del WEË AI ENGINE (Подешавања → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los identificadores del motor (ids de proveedor y modelo, `aiRouting`, `Firestore`,
 * `engineAdmin · setRouting`) se copian tal cual, en latino: viajan al servidor.
 * «fallo» se traduce como «грешка» y por eso `recentFailures` lleva las tres
 * formas del plural serbio (one / few / other), todas con {{contador}}.
 */
import { ConPlurales } from '../ru/plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Освежи',
  statusFailed: 'Није било могуће прочитати стање мотора. Да ли је сервер укључен?',
  changeFailed: 'Промена није могла да се примени',

  adminOnly: 'Само за администрацију',
  adminOnlyNote: 'Овај панел је за Weë тим. Ако си део тима, затражи да твој налог додају као администраторски.',

  settingsTitle: 'Подешавања',
  settingsLine: 'Цене: {{precios}} · {{credits}} Credits по долару · маржа {{margen}} % · политика {{politica}} · demo режим као последње решење: {{demo}}',
  pricesTest: 'пробне',
  pricesReal: 'праве',
  yes: 'да',
  no: 'не',
  configFrom: 'Подешавања су прочитана из {{origen}}.',
  sourceDefaults: 'подразумеваних вредности из кода',
  resetHealth: 'Ресетуј стање',
  healthReset: 'Стање је ресетовано.',
  seedDone: 'Подразумеване вредности су сачуване у Firestore.',

  providers: 'Провајдери',
  priority: 'приоритет {{numero}}',
  enable: 'Укључи {{proveedor}}',
  disable: 'Искључи {{proveedor}}',
  withKey: 'са кључем',
  withoutKey: 'без кључа',
  active: 'активан',
  inactive: 'неактиван',
  pausedByFailures: 'паузиран због грешака',
  recentFailures_one: '{{contador}} недавна грешка',
  recentFailures_few: '{{contador}} недавне грешке',
  recentFailures_other: '{{contador}} недавних грешака',
  modelLine: '• {{id}} · квалитет {{calidad}}/5 · брзина {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · до {{segundos}} с',
  pendingVerification: ' · чека проверу',

  chains: 'Резервни ланци',
  policyLabel: 'Политика за {{capacidad}}: {{politica}}',
  onlyDemo: 'само demo режим (још нема правог провајдера)',
  editNote: 'Да промениш редослед ланца или фиксираш модел, измени aiRouting/{{capacidad}} у Firestore или користи engineAdmin · setRouting.',

  policyQualityFirst: 'Прво квалитет',
  policyBalanced: 'Уравнотежено',
  policyCostFirst: 'Прво цена',

  modalityText: 'текст',
  modalityVision: 'вид',
  modalityImage: 'слика',
  modalityVideo: 'видео',
  modalityVoice: 'глас',
  modalityMusic: 'музика',
  modalityDoc: 'документи',
  rowSubtitle: 'Провајдери, резервни ланци и подешавања (само за администрацију)',
};
