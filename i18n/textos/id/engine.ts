/*
 * INDONESIO — El panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los identificadores del motor —ids de proveedor y modelo, capacidades, colecciones de Firestore,
 * `engineAdmin`, Gemini/Seedance/ElevenLabs— se copian tal cual. «engine» se deja como en el
 * español porque es el Weë AI Engine. «Rantai fallback» conserva el término técnico «fallback».
 * El porcentaje va pegado a la cifra, que es la convención indonesia («20%»).
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Perbarui',
  statusFailed: 'Status engine tidak dapat dibaca. Apakah servernya menyala?',
  changeFailed: 'Perubahan tidak dapat diterapkan',

  adminOnly: 'Khusus administrasi',
  adminOnlyNote: 'Panel ini untuk tim Weë. Jika Anda bagian dari tim, minta agar akun Anda ditambahkan sebagai administrator.',

  settingsTitle: 'Pengaturan',
  settingsLine: 'Harga: {{precios}} · {{credits}} Credits per USD · margin {{margen}}% · kebijakan {{politica}} · mode demo sebagai pilihan terakhir: {{demo}}',
  pricesTest: 'uji coba',
  pricesReal: 'sebenarnya',
  yes: 'ya',
  no: 'tidak',
  configFrom: 'Konfigurasi dibaca dari {{origen}}.',
  sourceDefaults: 'nilai default dalam kode',
  resetHealth: 'Setel ulang kesehatan',
  healthReset: 'Kesehatan disetel ulang.',
  seedDone: 'Nilai default tersimpan di Firestore.',

  providers: 'Penyedia',
  priority: 'prioritas {{numero}}',
  enable: 'Aktifkan {{proveedor}}',
  disable: 'Nonaktifkan {{proveedor}}',
  withKey: 'dengan kunci',
  withoutKey: 'tanpa kunci',
  active: 'aktif',
  inactive: 'tidak aktif',
  pausedByFailures: 'dijeda karena kegagalan',
  recentFailures_one: '{{contador}} kegagalan terbaru',
  recentFailures_other: '{{contador}} kegagalan terbaru',
  modelLine: '• {{id}} · kualitas {{calidad}}/5 · kecepatan {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · hingga {{segundos}} detik',
  pendingVerification: ' · menunggu verifikasi',

  chains: 'Rantai fallback',
  policyLabel: 'Kebijakan {{capacidad}}: {{politica}}',
  onlyDemo: 'hanya mode demo (belum ada penyedia sungguhan)',
  editNote: 'Untuk mengubah urutan rantai atau menetapkan model, edit aiRouting/{{capacidad}} di Firestore atau gunakan engineAdmin · setRouting.',

  policyQualityFirst: 'Kualitas dulu',
  policyBalanced: 'Seimbang',
  policyCostFirst: 'Biaya dulu',

  modalityText: 'teks',
  modalityVision: 'visi',
  modalityImage: 'gambar',
  modalityVideo: 'video',
  modalityVoice: 'suara',
  modalityMusic: 'musik',
  modalityDoc: 'dokumen',
  rowSubtitle: 'Penyedia, rantai fallback, dan pengaturan (khusus administrasi)',
};
