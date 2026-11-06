/*
 * MALAYO — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ids de proveedor y de modelo, las capacidades, las colecciones de Firestore, el callable
 * `engineAdmin` y los nombres de los proveedores se copian tal cual. «fallback» se dice «sandaran».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Muat semula',
  statusFailed: 'Saya tidak dapat membaca status enjin. Adakah pelayan sedang berjalan?',
  changeFailed: 'Perubahan tidak dapat digunakan',

  adminOnly: 'Pentadbiran sahaja',
  adminOnlyNote: 'Panel ini untuk pasukan Weë. Jika anda sebahagian daripada pasukan, minta akaun anda ditambah sebagai pentadbir.',

  settingsTitle: 'Tetapan',
  settingsLine: 'Harga: {{precios}} · {{credits}} Credits setiap USD · margin {{margen}} % · dasar {{politica}} · mod demo sebagai pilihan terakhir: {{demo}}',
  pricesTest: 'ujian',
  pricesReal: 'sebenar',
  yes: 'ya',
  no: 'tidak',
  configFrom: 'Konfigurasi dibaca daripada {{origen}}.',
  sourceDefaults: 'nilai lalai dalam kod',
  resetHealth: 'Set semula kesihatan',
  healthReset: 'Kesihatan telah diset semula.',
  seedDone: 'Nilai lalai disimpan dalam Firestore.',

  providers: 'Pembekal',
  priority: 'keutamaan {{numero}}',
  enable: 'Aktifkan {{proveedor}}',
  disable: 'Nyahaktifkan {{proveedor}}',
  withKey: 'dengan kunci',
  withoutKey: 'tanpa kunci',
  active: 'aktif',
  inactive: 'tidak aktif',
  pausedByFailures: 'dijeda kerana kegagalan',
  recentFailures_one: '{{contador}} kegagalan terkini',
  recentFailures_other: '{{contador}} kegagalan terkini',
  modelLine: '• {{id}} · kualiti {{calidad}}/5 · kelajuan {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · sehingga {{segundos}} s',
  pendingVerification: ' · belum disahkan',

  chains: 'Rantaian sandaran',
  policyLabel: 'Dasar {{capacidad}}: {{politica}}',
  onlyDemo: 'mod demo sahaja (belum ada pembekal sebenar)',
  editNote: 'Untuk mengubah susunan rantaian atau menetapkan model, sunting aiRouting/{{capacidad}} dalam Firestore atau gunakan engineAdmin · setRouting.',

  policyQualityFirst: 'Kualiti dahulu',
  policyBalanced: 'Seimbang',
  policyCostFirst: 'Kos dahulu',

  modalityText: 'teks',
  modalityVision: 'penglihatan',
  modalityImage: 'imej',
  modalityVideo: 'video',
  modalityVoice: 'suara',
  modalityMusic: 'muzik',
  modalityDoc: 'dokumen',
  rowSubtitle: 'Pembekal, rantaian sandaran dan tetapan (pentadbiran sahaja)',
};
