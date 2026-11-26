/*
 * IRLANDÉS — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ids de proveedor y de modelo, las capacidades, las colecciones de Firestore, `engineAdmin`
 * y los nombres de los proveedores se copian tal cual. «engine» se deja en latino, como hace el
 * español, porque aquí nombra al Weë AI Engine. El contador de fallos lleva las cinco formas:
 * «teip» (1, 0 y 11+), «theip» (2-6, lenición), «dteip» (7-10, eclipsis).
 */
import { ConPlurales } from './plurales';

export const engine: ConPlurales<typeof import('../es/engine').engine> = {
  refresh: 'Athnuaigh',
  statusFailed: 'Níorbh fhéidir liom stádas an engine a léamh. An bhfuil an freastalaí ar siúl?',
  changeFailed: 'Níorbh fhéidir an t-athrú a chur i bhfeidhm',

  adminOnly: 'Riarachán amháin',
  adminOnlyNote: 'Is d\'fhoireann Weë an painéal seo. Más ball den fhoireann tú, iarr go gcuirfí do chuntas leis mar riarthóir.',

  settingsTitle: 'Socruithe',
  settingsLine: 'Praghsanna: {{precios}} · {{credits}} Credits in aghaidh an USD · corrlach {{margen}} % · polasaí {{politica}} · mód demo mar rogha dheireanach: {{demo}}',
  pricesTest: 'tástála',
  pricesReal: 'fíora',
  yes: 'tá',
  no: 'níl',
  configFrom: 'Cumraíocht léite ó {{origen}}.',
  sourceDefaults: 'luachanna réamhshocraithe an chóid',
  resetHealth: 'Athshocraigh an tsláinte',
  healthReset: 'Sláinte athshocraithe.',
  seedDone: 'Luachanna réamhshocraithe sábháilte in Firestore.',

  providers: 'Soláthraithe',
  priority: 'tosaíocht {{numero}}',
  enable: 'Cumasaigh {{proveedor}}',
  disable: 'Díchumasaigh {{proveedor}}',
  withKey: 'le heochair',
  withoutKey: 'gan eochair',
  active: 'gníomhach',
  inactive: 'neamhghníomhach',
  pausedByFailures: 'ar sos de bharr teipeanna',
  recentFailures_one: '{{contador}} teip le déanaí',
  recentFailures_two: '{{contador}} theip le déanaí',
  recentFailures_few: '{{contador}} theip le déanaí',
  recentFailures_many: '{{contador}} dteip le déanaí',
  recentFailures_other: '{{contador}} teip le déanaí',
  modelLine: '• {{id}} · cáilíocht {{calidad}}/5 · luas {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · suas le {{segundos}} s',
  pendingVerification: ' · le fíorú fós',

  chains: 'Slabhraí cúltaca',
  policyLabel: 'Polasaí {{capacidad}}: {{politica}}',
  onlyDemo: 'mód demo amháin (gan fíorsholáthraí fós)',
  editNote: 'Chun ord slabhra a athrú nó samhail a shocrú, cuir aiRouting/{{capacidad}} in eagar in Firestore nó úsáid engineAdmin · setRouting.',

  policyQualityFirst: 'Cáilíocht ar dtús',
  policyBalanced: 'Cothrom',
  policyCostFirst: 'Costas ar dtús',

  modalityText: 'téacs',
  modalityVision: 'amharc',
  modalityImage: 'íomhá',
  modalityVideo: 'físeán',
  modalityVoice: 'guth',
  modalityMusic: 'ceol',
  modalityDoc: 'doiciméid',
  rowSubtitle: 'Soláthraithe, slabhraí cúltaca agus socruithe (riarachán amháin)',
};
