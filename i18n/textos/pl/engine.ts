/*
 * POLACO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ids de proveedor y modelo, las capacidades, las colecciones de Firestore
 * y el callable se copian tal cual. «fallback» se dice «rezerwowy»; «video»
 * aquí es «film», que es como lo llama la interfaz polaca.
 *
 * `recentFailures` lleva las cuatro formas del polaco (1 → one; 2-4 → few;
 * 0, 5-21 → many; decimales → other) con `ConPlurales`.
 */
import { ConPlurales } from '../ru/plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Odśwież',
  statusFailed: 'Nie mogę odczytać stanu silnika. Czy serwer jest włączony?',
  changeFailed: 'Nie udało się zastosować zmiany',

  adminOnly: 'Tylko administracja',
  adminOnlyNote: 'Ten panel jest dla zespołu Weë. Jeśli należysz do zespołu, poproś o dodanie swojego konta jako administracyjnego.',

  settingsTitle: 'Ustawienia',
  settingsLine: 'Ceny: {{precios}} · {{credits}} Credits za USD · marża {{margen}} % · polityka {{politica}} · tryb demo w ostateczności: {{demo}}',
  pricesTest: 'testowe',
  pricesReal: 'rzeczywiste',
  yes: 'tak',
  no: 'nie',
  configFrom: 'Źródło konfiguracji: {{origen}}.',
  sourceDefaults: 'wartości domyślne z kodu',
  resetHealth: 'Zresetuj kondycję',
  healthReset: 'Kondycja zresetowana.',
  seedDone: 'Wartości domyślne zapisane w Firestore.',

  providers: 'Dostawcy',
  priority: 'priorytet {{numero}}',
  enable: 'Włącz {{proveedor}}',
  disable: 'Wyłącz {{proveedor}}',
  withKey: 'z kluczem',
  withoutKey: 'bez klucza',
  active: 'aktywny',
  inactive: 'nieaktywny',
  pausedByFailures: 'wstrzymany z powodu błędów',
  recentFailures_one: '{{contador}} niedawny błąd',
  recentFailures_few: '{{contador}} niedawne błędy',
  recentFailures_many: '{{contador}} niedawnych błędów',
  recentFailures_other: '{{contador}} niedawnego błędu',
  modelLine: '• {{id}} · jakość {{calidad}}/5 · szybkość {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · do {{segundos}} s',
  pendingVerification: ' · oczekuje na weryfikację',

  chains: 'Łańcuchy rezerwowe',
  policyLabel: 'Polityka dla {{capacidad}}: {{politica}}',
  onlyDemo: 'tylko tryb demo (nie ma jeszcze prawdziwego dostawcy)',
  editNote: 'Aby zmienić kolejność łańcucha lub ustawić model, edytuj aiRouting/{{capacidad}} w Firestore albo użyj engineAdmin · setRouting.',

  policyQualityFirst: 'Najpierw jakość',
  policyBalanced: 'Zrównoważona',
  policyCostFirst: 'Najpierw koszt',

  modalityText: 'tekst',
  modalityVision: 'wizja',
  modalityImage: 'obraz',
  modalityVideo: 'film',
  modalityVoice: 'głos',
  modalityMusic: 'muzyka',
  modalityDoc: 'dokumenty',
  rowSubtitle: 'Dostawcy, łańcuchy rezerwowe i ustawienia (tylko administracja)',
};
