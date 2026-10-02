/*
 * TURCO — Weë Writer, dentro de Weë Studio: el editor y las herramientas que
 * trabajan el texto de la persona. Ese texto NUNCA pasa por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los «…Goal» son la petición que viaja a Weë Brain, y el código les pega
 * `: "extracto"` detrás: van en imperativo de «sen», como se le pide algo a Weë
 * (Bu metni çevir), y sin punto. «Documento» es belge y «Mis documentos»,
 * Belgelerim, como Projelerim; es el nombre de una sección, así que su sufijo va
 * con apóstrofo (Belgelerim'e). «Editado {{cuando}}» va como etiqueta —Son
 * düzenleme: {{cuando}}— porque {{cuando}} lo escribe Intl («dün», «3 gün önce»)
 * y no puede llevar sufijo. Tras la cifra, singular en las dos formas del plural:
 * «{{contador}} kelime». «Editor» se escribe a la turca: Editör.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Weë\'den iste',
  writeSomethingFirst: 'Önce bir şeyler yaz',
  writeSomethingHint: 'Önce bir şeyler yaz, sonra Weë seninle birlikte üzerinde çalışsın.',
  save: 'Kaydet',
  saving: 'Kaydediliyor…',
  deleteDocument: 'Belgeyi sil',
  improve: 'İyileştir',
  improveGoal: 'Bu metni iyileştir',
  shorten: 'Kısalt',
  shortenGoal: 'Bu metni önemli noktaları kaybetmeden kısalt',
  expand: 'Uzat',
  expandGoal: 'Bu metni genişlet ve ayrıntılandır',
  fix: 'Düzelt',
  fixGoal: 'Bu metindeki yazım ve stil hatalarını düzelt',
  tone: 'Tonu değiştir',
  toneGoal: 'Bu metni farklı bir tonda yeniden yaz',
  summarize: 'Özetle',
  summarizeGoal: 'Bu metni ana fikirleriyle özetle',
  translate: 'Çevir',
  translateGoal: 'Bu metni çevir',
  words_one: '{{contador}} kelime',
  words_other: '{{contador}} kelime',
  savedInDocuments: ' · Belgelerim\'e kaydedildi',
  couldNotSaveToDocuments: 'Belgelerim\'e kaydedilemedi',
  myDocuments: 'Belgelerim',
  newDocument: 'Yeni belge',
  noDocumentsYet: 'Henüz belgen yok. Yeni bir tane yaz ya da Weë\'den senin için başlamasını iste.',
  editedWhen: 'Son düzenleme: {{cuando}}',
  titleLabel: 'Belge başlığı',
  bodyLabel: 'Belge metni',
  editorTitle: '✍️ Editör',
  docTitlePlaceholder: 'Belge başlığı',
  bodyPlaceholder: 'Buraya yaz. İstediğin zaman Weë\'den metni iyileştirmesini, düzeltmesini ya da çevirmesini iste.',
  resultHint: 'Weë yazdıkların üzerinde çalışır ve sonucu buraya getirir; düzenlemeye kaldığın yerden devam edersin.',
  weeWorksWithYou: 'Weë seninle birlikte üzerinde çalışır.',
  saved: '✓ Kaydedildi',
};
