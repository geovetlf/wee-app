/*
 * El panel del WEË AI ENGINE en montenegrino (ijekaviano, latino). Solo administración.
 * Los identificadores del motor (proveedores, modelos, capacidades, colecciones) se copian tal cual.
 * `recentFailures` lleva las tres formas (one / few / other) con {{contador}}.
 */
import { ConPlurales } from '../ru/plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Osvježi',
  statusFailed: 'Ne mogu da pročitam stanje engine-a. Da li je server uključen?',
  changeFailed: 'Promjena nije mogla da se primijeni',

  adminOnly: 'Samo za administraciju',
  adminOnlyNote: 'Ovaj panel je za Weë tim. Ako si dio tima, zatraži da tvoj nalog dodaju kao administratorski.',

  settingsTitle: 'Podešavanja',
  settingsLine: 'Cijene: {{precios}} · {{credits}} Credits po USD · marža {{margen}} % · politika {{politica}} · demo režim kao posljednje rješenje: {{demo}}',
  pricesTest: 'probne',
  pricesReal: 'stvarne',
  yes: 'da',
  no: 'ne',
  configFrom: 'Konfiguracija je pročitana iz {{origen}}.',
  sourceDefaults: 'podrazumijevanih vrijednosti u kodu',
  resetHealth: 'Resetuj zdravlje',
  healthReset: 'Zdravlje je resetovano.',
  seedDone: 'Podrazumijevane vrijednosti su sačuvane u Firestore.',

  providers: 'Provajderi',
  priority: 'prioritet {{numero}}',
  enable: 'Uključi {{proveedor}}',
  disable: 'Isključi {{proveedor}}',
  withKey: 'sa ključem',
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
  onlyDemo: 'samo demo režim (još nema stvarnog provajdera)',
  editNote: 'Da promijeniš redosljed lanca ili fiksiraš model, izmijeni aiRouting/{{capacidad}} u Firestore-u ili koristi engineAdmin · setRouting.',

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
  rowSubtitle: 'Provajderi, rezervni lanci i podešavanja (samo za administraciju)',
};
