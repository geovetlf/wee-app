/*
 * RUSO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
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
 * `recentFailures` cuenta, y en ruso contar son cuatro formas: сбой / сбоя /
 * сбоев. Por eso este módulo se declara con `ConPlurales`.
 *
 * Trato de «вы» en minúscula.
 */
import { ConPlurales } from './plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Обновить',
  statusFailed: 'Не удалось прочитать состояние engine. Сервер запущен?',
  changeFailed: 'Не удалось применить изменение',

  adminOnly: 'Только для администрации',
  adminOnlyNote: 'Эта панель — для команды Weë. Если вы в команде, попросите добавить ваш аккаунт как администратора.',

  settingsTitle: 'Настройки',
  settingsLine: 'Цены: {{precios}} · {{credits}} Credits за USD · маржа {{margen}} % · политика {{politica}} · демо-режим как крайняя мера: {{demo}}',
  pricesTest: 'тестовые',
  pricesReal: 'реальные',
  yes: 'да',
  no: 'нет',
  configFrom: 'Конфигурация прочитана из {{origen}}.',
  sourceDefaults: 'значений по умолчанию в коде',
  resetHealth: 'Сбросить состояние',
  healthReset: 'Состояние сброшено.',
  seedDone: 'Значения по умолчанию сохранены в Firestore.',

  providers: 'Провайдеры',
  priority: 'приоритет {{numero}}',
  enable: 'Включить {{proveedor}}',
  disable: 'Отключить {{proveedor}}',
  withKey: 'с ключом',
  withoutKey: 'без ключа',
  active: 'активен',
  inactive: 'неактивен',
  pausedByFailures: 'на паузе из-за сбоев',
  recentFailures_one: '{{contador}} недавний сбой',
  recentFailures_few: '{{contador}} недавних сбоя',
  recentFailures_many: '{{contador}} недавних сбоев',
  recentFailures_other: '{{contador}} недавних сбоев',
  modelLine: '• {{id}} · качество {{calidad}}/5 · скорость {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · до {{segundos}} с',
  pendingVerification: ' · требует проверки',

  chains: 'Цепочки fallback',
  policyLabel: 'Политика {{capacidad}}: {{politica}}',
  onlyDemo: 'только демо-режим (реального провайдера пока нет)',
  editNote: 'Чтобы изменить порядок цепочки или закрепить модель, отредактируйте aiRouting/{{capacidad}} в Firestore или используйте engineAdmin · setRouting.',

  policyQualityFirst: 'Сначала качество',
  policyBalanced: 'Баланс',
  policyCostFirst: 'Сначала стоимость',

  modalityText: 'текст',
  modalityVision: 'зрение',
  modalityImage: 'изображение',
  modalityVideo: 'видео',
  modalityVoice: 'голос',
  modalityMusic: 'музыка',
  modalityDoc: 'документы',
  rowSubtitle: 'Провайдеры, цепочки fallback и настройки (только для администрации)',
};
