/*
 * MALAYO — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los motivos están en lenguaje normal, no son términos legales. La confirmación dice solo que el
 * reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Laporkan',
  subtitle: 'Beritahu kami apa yang berlaku dengan kandungan ini.',
  chooseReason: 'Pilih sebab',
  send: 'Hantar laporan',
  sending: 'Menghantar laporan…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Gangguan atau ugutan',
  reasonHate: 'Kebencian atau diskriminasi',
  reasonSexual: 'Kebogelan atau kandungan seksual',
  reasonViolence: 'Keganasan',
  reasonScam: 'Penipuan',
  reasonImpersonation: 'Penyamaran identiti',
  reasonIllegal: 'Kandungan yang menyalahi undang-undang',
  reasonIntellectualProperty: 'Harta intelek',
  reasonOther: 'Sebab lain',
  successTitle: 'Laporan diterima',
  successBody: 'Terima kasih kerana membantu kami memastikan Weë selamat.',
  duplicateTitle: 'Anda telah melaporkannya',
  duplicateBody: 'Kami telah menerima laporan anda tentang kandungan ini.',
  errorTitle: 'Kami tidak dapat menghantar laporan anda.',
  errorBody: 'Sila cuba lagi.',
  errorOffline: 'Tiada sambungan. Sila cuba lagi.',
  errorRateLimited: 'Anda telah menghantar terlalu banyak laporan berturut-turut. Cuba lagi nanti.',
  errorUnavailable: 'Kandungan ini tidak lagi tersedia.',
};
