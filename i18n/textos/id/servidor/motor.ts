/*
 * INDONESIO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * `{{campo}}` y `{{archivo}}` se rellenan con las piezas `campo…` y `archivo…` de este mismo archivo. Weë no nombra
 * proveedores: donde el servidor dice «el proveedor», aquí se dice sin nombrarlo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Ada yang kurang dalam permintaan Anda. Periksa lalu coba lagi.',
  unauthorized: 'Masuk untuk berkarya dengan Weë.',
  providerError: 'AI tidak dapat menyelesaikan karya Anda kali ini. Anda tidak dikenai biaya: coba lagi sebentar.',
  generationFailed: 'Saya tidak dapat menyelesaikan karya Anda. Anda tidak dikenai biaya: coba lagi.',
  timeout: 'Prosesnya terlalu lama, jadi saya menghentikannya. Anda tidak dikenai biaya: coba lagi.',
  rateLimited: 'Anda sudah membuat banyak karya berturut-turut. Anda tidak dikenai biaya: tunggu sebentar lalu coba lagi.',
  duplicate: 'Karya itu sedang dikerjakan.',
  notAvailable: 'Fitur ini belum tersedia.',
  inputRejected: 'Foto atau video tersebut tidak dapat digunakan untuk membuat ini: wajah orang sungguhan dan konten semacam itu tidak diterima. Coba gambar atau deskripsi lain.',
  faltaCampo: 'Silakan tambahkan {{campo}}.',
  revisaCampo: 'Periksa {{campo}}: panjangnya harus antara 1 dan {{max}} karakter.',
  campoMensaje: 'pesan Anda',
  campoDescripcionVideo: 'deskripsi video',
  conversacionNoEncontrada: 'Percakapan ini tidak ditemukan.',
  sinPlan: 'Pekerjaan ini belum memiliki rencana.',
  sinUnPlan: 'Pekerjaan ini belum memiliki rencana.',
  yaTienePlan: 'Pekerjaan ini sudah memiliki rencana.',
  subeFoto: 'Unggah foto agar Weë dapat mengerjakannya.',
  trabajoNoEncontrado: 'Pekerjaan ini tidak ditemukan.',
  trabajoAjeno: 'Pekerjaan ini bukan milik Anda.',
  experienciaDesconocida: 'Pengalaman tidak dikenal.',
  faltaTrabajo: 'Pekerjaannya tidak ada.',
  intentoSinTiempo: 'Waktu percobaan itu habis, jadi Credits Anda saya kembalikan. Anda bisa mencoba lagi.',
  fotoDireccion: 'Tautan ke foto tidak valid.',
  fotoSubir: 'Foto harus diunggah ke Weë sebelum dapat digunakan.',
  fotoAjena: 'Foto itu bukan milik Anda.',
  archivoSube: 'Unggah {{archivo}} agar Weë dapat membacanya.',
  archivoDireccion: 'Tautan ke {{archivo}} tidak valid.',
  archivoSubir: '{{archivo}} harus diunggah ke Weë sebelum dapat digunakan.',
  archivoAjeno: '{{archivo}} itu bukan milik Anda.',
  archivoDocumento: 'dokumen',
  archivoAudio: 'file audio',
  sinTiempoAntes: 'Waktunya habis sebelum proses dimulai. Anda tidak dikenai biaya.',
  sinProveedor: 'Saat ini tidak ada AI yang tersedia untuk ini. Silakan coba lagi nanti.',
  noDisponibleActualmente: 'Fitur ini saat ini tidak tersedia.',
  noDisponibleAhora: 'Fitur ini sedang tidak tersedia. Coba lagi nanti.',
  noDisponibleRegion: 'Fitur ini saat ini tidak tersedia di wilayah Anda.',
  noDisponiblePais: 'Untuk menggunakan fitur ini, tambahkan negara Anda ke Profil Asli.',
  noDisponibleOpciones: 'Fitur ini tidak tersedia dengan opsi yang Anda pilih. Coba opsi lain.',
  describeVideo: 'Ceritakan video apa yang ingin Anda buat.',
  creacionTerminada: 'Karya itu sudah selesai dan tidak akan dibuat lagi. Anda dapat menemukannya di karya Anda.',
  tomaInvalida: 'Take itu tidak valid.',
  planoInvalido: 'Shot itu tidak valid.',
  produccionNoEncontrada: 'Produksi itu tidak ditemukan.',
  tomaNoGenerable: 'Take itu tidak dapat dihasilkan dengan cara ini.',
  creacionNoEncontrada: 'Karya itu tidak ditemukan.',
  debesIniciarSesion: 'Anda perlu masuk',
};
