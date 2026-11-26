/*
 * INDONESIO — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier
 * sitio de Weë. Es transversal, y por eso tiene módulo propio.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los motivos son categorías en lenguaje normal, no términos legales. La confirmación dice solo que el
 * reporte se RECIBIÓ («Laporan diterima»). «Laporkan» es el verbo del botón y «laporan» el sustantivo.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Laporkan',
  subtitle: 'Ceritakan apa yang terjadi dengan konten ini.',
  chooseReason: 'Pilih alasan',
  send: 'Kirim laporan',
  sending: 'Mengirim laporan…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Pelecehan atau intimidasi',
  reasonHate: 'Kebencian atau diskriminasi',
  reasonSexual: 'Konten seksual',
  reasonViolence: 'Kekerasan',
  reasonScam: 'Penipuan atau kecurangan',
  reasonImpersonation: 'Peniruan identitas',
  reasonIllegal: 'Konten ilegal',
  reasonSelfHarm: 'Melukai diri sendiri atau bunuh diri',
  reasonOther: 'Alasan lain',
  successTitle: 'Laporan diterima',
  successBody: 'Terima kasih telah membantu kami menjaga Weë tetap aman.',
  duplicateTitle: 'Anda sudah pernah melaporkannya',
  duplicateBody: 'Kami sudah menerima laporan Anda tentang konten ini.',
  errorTitle: 'Kami tidak dapat mengirim laporan Anda.',
  errorBody: 'Coba lagi.',
  errorOffline: 'Tidak ada koneksi. Coba lagi.',
  errorRateLimited: 'Anda mengirim terlalu banyak laporan berturut-turut. Coba lagi nanti.',
  errorUnavailable: 'Konten ini sudah tidak tersedia.',
};
