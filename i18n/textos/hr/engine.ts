/*
 * El panel del WEË AI ENGINE en croata (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los identificadores del motor —ids de proveedor y de modelo, capacidades,
 * colecciones de Firestore, `engineAdmin`, Gemini, Seedance, ElevenLabs— se
 * copian tal cual. «Firestore» no se declina: se dice «u bazi Firestore».
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `recentFailures`.
 */
import { ConPlurales } from '../ru/plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Osvježi',
  statusFailed: 'Stanje motora nije bilo moguće pročitati. Je li poslužitelj uključen?',
  changeFailed: 'Promjenu nije bilo moguće primijeniti',

  adminOnly: 'Samo za administraciju',
  adminOnlyNote: 'Ova je ploča za tim Weë. Ako si dio tima, zatraži da tvoj račun dodaju kao administratorski.',

  settingsTitle: 'Postavke',
  settingsLine: 'Cijene: {{precios}} · {{credits}} Credits po USD · marža {{margen}} % · politika {{politica}} · demo način kao posljednja mogućnost: {{demo}}',
  pricesTest: 'probne',
  pricesReal: 'stvarne',
  yes: 'da',
  no: 'ne',
  configFrom: 'Konfiguracija pročitana iz {{origen}}.',
  sourceDefaults: 'zadanih vrijednosti u kodu',
  resetHealth: 'Resetiraj zdravlje',
  healthReset: 'Zdravlje je resetirano.',
  seedDone: 'Zadane vrijednosti spremljene su u Firestore.',

  providers: 'Pružatelji',
  priority: 'prioritet {{numero}}',
  enable: 'Uključi {{proveedor}}',
  disable: 'Isključi {{proveedor}}',
  withKey: 's ključem',
  withoutKey: 'bez ključa',
  active: 'aktivan',
  inactive: 'neaktivan',
  pausedByFailures: 'pauziran zbog pogrešaka',
  recentFailures_one: '{{contador}} nedavna pogreška',
  recentFailures_few: '{{contador}} nedavne pogreške',
  recentFailures_other: '{{contador}} nedavnih pogrešaka',
  modelLine: '• {{id}} · kvaliteta {{calidad}}/5 · brzina {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · do {{segundos}} s',
  pendingVerification: ' · čeka provjeru',

  chains: 'Rezervni lanci',
  policyLabel: 'Politika za {{capacidad}}: {{politica}}',
  onlyDemo: 'samo demo način (još nema stvarnog pružatelja)',
  editNote: 'Da promijeniš redoslijed lanca ili fiksiraš model, uredi aiRouting/{{capacidad}} u bazi Firestore ili upotrijebi engineAdmin · setRouting.',

  policyQualityFirst: 'Kvaliteta prije svega',
  policyBalanced: 'Uravnoteženo',
  policyCostFirst: 'Trošak prije svega',

  modalityText: 'tekst',
  modalityVision: 'vid',
  modalityImage: 'slika',
  modalityVideo: 'video',
  modalityVoice: 'glas',
  modalityMusic: 'glazba',
  modalityDoc: 'dokumenti',
  rowSubtitle: 'Pružatelji, rezervni lanci i postavke (samo administracija)',
};
