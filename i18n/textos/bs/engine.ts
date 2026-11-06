/*
 * BOSNIO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los ids de proveedor y de modelo, las capacidades, las colecciones de
 * Firestore, `engineAdmin` y los nombres de los proveedores se copian tal cual.
 *
 * PLURALES: one / few / other, así que `recentFailures` lleva `_few`
 * («1 nedavna greška», «2 nedavne greške», «5 nedavnih grešaka»).
 */
import { ConPlurales } from '../ru/plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Osvježi',
  statusFailed: 'Ne mogu pročitati stanje motora. Je li server uključen?',
  changeFailed: 'Nismo mogli primijeniti promjenu',

  adminOnly: 'Samo administracija',
  adminOnlyNote: 'Ovaj panel je za Weë tim. Ako si dio tima, zatraži da tvoj račun dodaju kao administratorski.',

  settingsTitle: 'Postavke',
  settingsLine: 'Cijene: {{precios}} · {{credits}} Credits po USD · marža {{margen}} % · politika {{politica}} · demo način kao posljednje rješenje: {{demo}}',
  pricesTest: 'probne',
  pricesReal: 'stvarne',
  yes: 'da',
  no: 'ne',
  configFrom: 'Konfiguracija pročitana iz {{origen}}.',
  sourceDefaults: 'zadanih vrijednosti u kodu',
  resetHealth: 'Resetuj zdravlje',
  healthReset: 'Zdravlje resetovano.',
  seedDone: 'Zadane vrijednosti sačuvane u Firestore.',

  providers: 'Provajderi',
  priority: 'prioritet {{numero}}',
  enable: 'Uključi {{proveedor}}',
  disable: 'Isključi {{proveedor}}',
  withKey: 's ključem',
  withoutKey: 'bez ključa',
  active: 'aktivan',
  inactive: 'neaktivan',
  pausedByFailures: 'pauziran zbog grešaka',
  recentFailures_one: '{{contador}} nedavna greška',
  recentFailures_few: '{{contador}} nedavne greške',
  recentFailures_other: '{{contador}} nedavnih grešaka',
  modelLine: '• {{id}} · kvalitet {{calidad}}/5 · brzina {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · do {{segundos}} s',
  pendingVerification: ' · čeka provjeru',

  chains: 'Rezervni lanci',
  policyLabel: 'Politika za {{capacidad}}: {{politica}}',
  onlyDemo: 'samo demo način (još nema stvarnog provajdera)',
  editNote: 'Da promijeniš redoslijed lanca ili fiksiraš model, uredi aiRouting/{{capacidad}} u Firestoreu ili koristi engineAdmin · setRouting.',

  policyQualityFirst: 'Prvo kvalitet',
  policyBalanced: 'Uravnoteženo',
  policyCostFirst: 'Prvo cijena',

  modalityText: 'tekst',
  modalityVision: 'vizija',
  modalityImage: 'slika',
  modalityVideo: 'video',
  modalityVoice: 'glas',
  modalityMusic: 'muzika',
  modalityDoc: 'dokumenti',
  rowSubtitle: 'Provajderi, rezervni lanci i postavke (samo administracija)',
};
