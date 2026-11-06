/*
 * RUMANO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ids de proveedor y de modelo, las capacidades, las colecciones de
 * Firestore, el callable `engineAdmin` y los nombres de los proveedores se
 * copian tal cual. El contador de fallos lleva las tres formas del rumano.
 */
import { ConPlurales } from '../ru/plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Actualizează',
  statusFailed: 'Nu am putut citi starea engine-ului. Este pornit serverul?',
  changeFailed: 'Modificarea nu a putut fi aplicată',

  adminOnly: 'Doar pentru administratori',
  adminOnlyNote: 'Acest panou este pentru echipa Weë. Dacă faci parte din echipă, cere să îți fie adăugat contul ca administrator.',

  settingsTitle: 'Setări',
  settingsLine: 'Prețuri: {{precios}} · {{credits}} Credits per USD · marjă {{margen}} % · politică {{politica}} · mod demo ca ultimă soluție: {{demo}}',
  pricesTest: 'de probă',
  pricesReal: 'reale',
  yes: 'da',
  no: 'nu',
  configFrom: 'Configurație citită din {{origen}}.',
  sourceDefaults: 'valorile implicite din cod',
  resetHealth: 'Resetează starea de sănătate',
  healthReset: 'Starea de sănătate a fost resetată.',
  seedDone: 'Valorile implicite au fost salvate în Firestore.',

  providers: 'Furnizori',
  priority: 'prioritate {{numero}}',
  enable: 'Activează {{proveedor}}',
  disable: 'Dezactivează {{proveedor}}',
  withKey: 'cu cheie',
  withoutKey: 'fără cheie',
  active: 'activ',
  inactive: 'inactiv',
  pausedByFailures: 'în pauză din cauza erorilor',
  recentFailures_one: '{{contador}} eroare recentă',
  recentFailures_few: '{{contador}} erori recente',
  recentFailures_other: '{{contador}} de erori recente',
  modelLine: '• {{id}} · calitate {{calidad}}/5 · viteză {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · până la {{segundos}} s',
  pendingVerification: ' · în așteptarea verificării',

  chains: 'Lanțuri de fallback',
  policyLabel: 'Politica pentru {{capacidad}}: {{politica}}',
  onlyDemo: 'doar mod demo (încă fără furnizor real)',
  editNote: 'Pentru a schimba ordinea unui lanț sau a fixa un model, editează aiRouting/{{capacidad}} în Firestore sau folosește engineAdmin · setRouting.',

  policyQualityFirst: 'Calitatea pe primul loc',
  policyBalanced: 'Echilibrat',
  policyCostFirst: 'Costul pe primul loc',

  modalityText: 'text',
  modalityVision: 'viziune',
  modalityImage: 'imagine',
  modalityVideo: 'video',
  modalityVoice: 'voce',
  modalityMusic: 'muzică',
  modalityDoc: 'documente',
  rowSubtitle: 'Furnizori, lanțuri de fallback și setări (doar pentru administratori)',
};
