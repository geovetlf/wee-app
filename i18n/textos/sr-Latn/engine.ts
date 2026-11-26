/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica) — el panel del WEË AI ENGINE (Podešavanja → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los identificadores del motor (ids de proveedor y modelo, `aiRouting`, `Firestore`,
 * `engineAdmin · setRouting`) se copian tal cual, en latino: viajan al servidor.
 * «fallo» se traduce como «greška» y por eso `recentFailures` lleva las tres
 * formas del plural serbio (one / few / other), todas con {{contador}}.
 */
import { ConPlurales } from '../ru/plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Osveži',
  statusFailed: 'Nije bilo moguće pročitati stanje motora. Da li je server uključen?',
  changeFailed: 'Promena nije mogla da se primeni',

  adminOnly: 'Samo za administraciju',
  adminOnlyNote: 'Ovaj panel je za Weë tim. Ako si deo tima, zatraži da tvoj nalog dodaju kao administratorski.',

  settingsTitle: 'Podešavanja',
  settingsLine: 'Cene: {{precios}} · {{credits}} Credits po dolaru · marža {{margen}} % · politika {{politica}} · demo režim kao poslednje rešenje: {{demo}}',
  pricesTest: 'probne',
  pricesReal: 'prave',
  yes: 'da',
  no: 'ne',
  configFrom: 'Podešavanja su pročitana iz {{origen}}.',
  sourceDefaults: 'podrazumevanih vrednosti iz koda',
  resetHealth: 'Resetuj stanje',
  healthReset: 'Stanje je resetovano.',
  seedDone: 'Podrazumevane vrednosti su sačuvane u Firestore.',

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
  pendingVerification: ' · čeka proveru',

  chains: 'Rezervni lanci',
  policyLabel: 'Politika za {{capacidad}}: {{politica}}',
  onlyDemo: 'samo demo režim (još nema pravog provajdera)',
  editNote: 'Da promeniš redosled lanca ili fiksiraš model, izmeni aiRouting/{{capacidad}} u Firestore ili koristi engineAdmin · setRouting.',

  policyQualityFirst: 'Prvo kvalitet',
  policyBalanced: 'Uravnoteženo',
  policyCostFirst: 'Prvo cena',

  modalityText: 'tekst',
  modalityVision: 'vid',
  modalityImage: 'slika',
  modalityVideo: 'video',
  modalityVoice: 'glas',
  modalityMusic: 'muzika',
  modalityDoc: 'dokumenti',
  rowSubtitle: 'Provajderi, rezervni lanci i podešavanja (samo za administraciju)',
};
