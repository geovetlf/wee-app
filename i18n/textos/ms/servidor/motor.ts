/*
 * MALAYO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * `{{campo}}` y `{{archivo}}` se rellenan con las piezas `campo…` y `archivo…` de este mismo archivo. Weë no nombra
 * proveedores: donde el servidor dice «el proveedor», aquí se dice sin nombrarlo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Ada sesuatu yang tertinggal dalam permintaan anda. Semak dan cuba lagi.',
  unauthorized: 'Log masuk untuk berkarya dengan Weë.',
  providerError: 'AI tidak dapat menyiapkan ciptaan anda kali ini. Anda tidak dikenakan bayaran: cuba lagi sebentar nanti.',
  generationFailed: 'Saya tidak dapat menyiapkan ciptaan anda. Anda tidak dikenakan bayaran: cuba lagi.',
  timeout: 'Prosesnya mengambil masa terlalu lama, jadi saya menghentikannya. Anda tidak dikenakan bayaran: cuba lagi.',
  rateLimited: 'Anda telah mencipta banyak karya berturut-turut. Anda tidak dikenakan bayaran: tunggu sebentar dan cuba lagi.',
  duplicate: 'Ciptaan itu sedang diusahakan.',
  notAvailable: 'Ciri ini belum tersedia.',
  inputRejected: 'Foto atau video tersebut tidak boleh digunakan untuk mencipta ini: wajah orang sebenar dan kandungan seperti itu tidak diterima. Cuba imej atau penerangan lain.',
  faltaCampo: 'Sila tambah {{campo}}.',
  revisaCampo: 'Semak {{campo}}: panjangnya mesti antara 1 hingga {{max}} aksara.',
  campoMensaje: 'mesej anda',
  campoDescripcionVideo: 'penerangan video',
  conversacionNoEncontrada: 'Perbualan ini tidak ditemui.',
  sinPlan: 'Kerja ini belum mempunyai pelan.',
  sinUnPlan: 'Kerja ini belum mempunyai pelan.',
  yaTienePlan: 'Kerja ini sudah mempunyai pelan.',
  subeFoto: 'Muat naik foto supaya Weë dapat mengusahakannya.',
  trabajoNoEncontrado: 'Kerja ini tidak ditemui.',
  trabajoAjeno: 'Kerja ini bukan milik anda.',
  experienciaDesconocida: 'Pengalaman tidak dikenali.',
  faltaTrabajo: 'Kerja tersebut tiada.',
  intentoSinTiempo: 'Masa untuk cubaan itu telah tamat, jadi Credits anda telah saya pulangkan. Anda boleh mencuba lagi.',
  fotoDireccion: 'Pautan ke foto tidak sah.',
  fotoSubir: 'Foto mesti dimuat naik ke Weë sebelum boleh digunakan.',
  fotoAjena: 'Foto itu bukan milik anda.',
  archivoSube: 'Muat naik {{archivo}} supaya Weë dapat membacanya.',
  archivoDireccion: 'Pautan ke {{archivo}} tidak sah.',
  archivoSubir: '{{archivo}} mesti dimuat naik ke Weë sebelum boleh digunakan.',
  archivoAjeno: '{{archivo}} itu bukan milik anda.',
  archivoDocumento: 'dokumen',
  archivoAudio: 'fail audio',
  sinTiempoAntes: 'Masa telah tamat sebelum proses bermula. Anda tidak dikenakan bayaran.',
  sinProveedor: 'Tiada AI yang tersedia untuk ini buat masa ini. Sila cuba lagi nanti.',
  noDisponibleActualmente: 'Ciri ini tidak tersedia buat masa ini.',
  noDisponibleAhora: 'Ciri ini tidak tersedia pada masa ini. Cuba lagi sebentar nanti.',
  noDisponibleRegion: 'Ciri ini tidak tersedia di rantau anda buat masa ini.',
  noDisponiblePais: 'Untuk menggunakan ciri ini, tambahkan negara anda pada Profil Sebenar.',
  noDisponibleOpciones: 'Ciri ini tidak tersedia dengan pilihan yang anda buat. Cuba pilihan lain.',
  describeVideo: 'Beritahu saya video apa yang anda mahu cipta.',
  creacionTerminada: 'Ciptaan itu sudah siap dan tidak akan dibuat semula. Anda boleh menemuinya dalam ciptaan anda.',
  tomaInvalida: 'Rakaman itu tidak sah.',
  planoInvalido: 'Syot itu tidak sah.',
  produccionNoEncontrada: 'Produksi itu tidak ditemui.',
  tomaNoGenerable: 'Rakaman itu tidak boleh dijana dengan cara ini.',
  creacionNoEncontrada: 'Ciptaan itu tidak ditemui.',
  debesIniciarSesion: 'Anda perlu log masuk',
};
