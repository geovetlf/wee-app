/*
 * INDONESIO — Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce (nunca
 * «Kredit»); todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Isi ulang» es recargar (la palabra de las recargas de saldo de celular, que todo el mundo conoce).
 * «Uji coba» es «de prueba». El reembolso es «Pengembalian» a secas, sin «dana» (dinero): lo que
 * vuelve son Credits, y no se repite la marca donde el español no la pone.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits tersedia',
  yourBalance: 'Saldo Anda',
  currentBalance: 'Saldo saat ini',
  free: 'Gratis',
  testTopUp: 'Isi ulang uji coba',
  testTopUpReady: 'Isi ulang uji coba siap',
  testPrices: 'Harga uji coba selama kami membangun Weë AI',
  topUp: 'Isi ulang',
  seeHistory: 'Lihat riwayat →',
  seeHistoryLabel: 'Lihat riwayat',
  history: 'Riwayat',
  myWallet: 'Dompet Saya',
  earned: 'Diperoleh',
  spent: 'Terpakai',
  noMovements: 'Belum ada transaksi',
  testTopUpDone: '{{cantidad}} Credits ditambahkan ke akun Anda. Ini isi ulang uji coba: tidak ada biaya yang ditagih.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Isi ulang tidak dapat diselesaikan. Coba lagi.',
  terms: 'Isi ulang uji coba: belum ada biaya yang ditagih. Harga final akan hadir saat Weë AI memakai AI sungguhan; sementara itu, setiap karya menampilkan biaya uji cobanya sebelum dimulai.',
  youHaveLabel: 'Anda punya {{saldo}} Credits',
  topUpButton: 'Isi ulang {{cantidad}} Credits · uji coba',
  txPurchase: 'Pembelian Credits',
  txGrant: 'Credits diterima',
  txRefund: 'Pengembalian',
  txUsage: 'Penggunaan Credits',
  txRefunded: 'Dikembalikan',
  txPending: 'Dalam proses',
  purchasesComingSoon: 'Pembelian Credits akan segera hadir. Untuk saat ini, isi ulang belum dapat dilakukan di sini.',
  topUpFailedTitle: 'Ups',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Berapa banyak Credits yang Anda inginkan?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Beli {{cantidad}} Credits · {{precio}}',
  buyLess: 'Kurangi',
  buyMore: 'Tambah',
  buyNoticeTitle: 'Pembayaran belum terhubung',
  buyNoticeBody: 'Tidak ada biaya yang ditagih dan saldo Anda tetap sama.',
  buyChecking: 'Memeriksa toko…',
  buyCatalogError: 'Tidak dapat menghubungi toko. Ketuk untuk mencoba lagi.',
  buyMarketUnavailable: 'Pembayaran dalam mata uang ini belum tersedia. Tidak ada biaya yang ditagih.',
  historyLoading: 'Memuat transaksi…',
  historyError: 'Riwayat tidak dapat dimuat.',
  historyRetry: 'Coba lagi',
};
