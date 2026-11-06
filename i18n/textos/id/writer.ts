/*
 * INDONESIO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí:
 * solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los botones de la fila son verbos base cortos y distintos entre sí: «Sempurnakan» (mejorar),
 * «Persingkat» (acortar), «Perpanjang» (alargar), «Koreksi» (corregir), «Ubah nada», «Ringkas»,
 * «Terjemahkan». «Menggarap» es «trabajar un texto». «Kata» es invariable: las dos formas del
 * contador son idénticas.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Minta Weë',
  writeSomethingFirst: 'Tulis sesuatu dulu',
  writeSomethingHint: 'Tulis sesuatu dulu, lalu Weë menggarapnya bersama Anda.',
  save: 'Simpan',
  saving: 'Menyimpan…',
  deleteDocument: 'Hapus dokumen',
  improve: 'Sempurnakan',
  improveGoal: 'Sempurnakan teks ini',
  shorten: 'Persingkat',
  shortenGoal: 'Persingkat teks ini tanpa kehilangan hal yang penting',
  expand: 'Perpanjang',
  expandGoal: 'Kembangkan teks ini lebih jauh',
  fix: 'Koreksi',
  fixGoal: 'Koreksi ejaan dan gaya teks ini',
  tone: 'Ubah nada',
  toneGoal: 'Tulis ulang teks ini dengan nada lain',
  summarize: 'Ringkas',
  summarizeGoal: 'Ringkas teks ini menjadi poin-poin utama',
  translate: 'Terjemahkan',
  translateGoal: 'Terjemahkan teks ini',
  words_one: '{{contador}} kata',
  words_other: '{{contador}} kata',
  savedInDocuments: ' · tersimpan di Dokumen Saya',
  couldNotSaveToDocuments: 'Tidak dapat menyimpan ke Dokumen Saya',
  myDocuments: 'Dokumen Saya',
  newDocument: 'Dokumen baru',
  noDocumentsYet: 'Anda belum punya dokumen. Tulis yang baru atau minta Weë memulainya untuk Anda.',
  editedWhen: 'Diedit {{cuando}}',
  titleLabel: 'Judul dokumen',
  bodyLabel: 'Teks dokumen',
  editorTitle: '✍️ Editor',
  docTitlePlaceholder: 'Judul dokumen',
  bodyPlaceholder: 'Tulis di sini. Kapan saja, minta Weë untuk menyempurnakan, mengoreksi, atau menerjemahkannya.',
  resultHint: 'Weë menggarap apa yang Anda tulis dan mengembalikan hasilnya di sini, siap untuk terus diedit.',
  weeWorksWithYou: 'Weë menggarapnya bersama Anda.',
  saved: '✓ Tersimpan',
};
