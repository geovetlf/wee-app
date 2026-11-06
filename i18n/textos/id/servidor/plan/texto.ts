/*
 * INDONESIO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los huecos que llevan una opción se rellenan con `../opciones.ts`, sin emoji y con la inicial en minúscula. Las
 * `…Decision…` completan «Karena Anda belum yakin, …». Los idiomas (`writerIdioma…`) entran detrás de «ke».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Saya akan mencari kutipan nyata tentang topik ini dan memberikan sumber masing-masing agar dapat Anda periksa.',
  writerPasoCitas: 'Cari kutipan dan sumbernya',

  writerExplicaTraducir: 'Saya akan menerjemahkan teks Anda ke {{idioma}}, dengan tetap menjaga makna dan nadanya.',
  writerPasoTraducir: 'Terjemahkan ke {{idioma}}',
  writerDecisionIdiomaIngles: 'saya akan menerjemahkannya ke bahasa Inggris',
  writerIdiomaEn: 'bahasa Inggris',
  writerIdiomaPt: 'bahasa Portugis',
  writerIdiomaFr: 'bahasa Prancis',
  writerIdiomaIt: 'bahasa Italia',

  writerExplicaResumir: 'Saya akan meringkas teks Anda menjadi ide-ide utamanya, dalam beberapa baris saja.',
  writerPasoResumir: 'Ringkas menjadi ide-ide utama',
  writerExplicaCorregir: 'Saya akan memperbaiki ejaan serta menyempurnakan gaya dan kejelasan tanpa mengubah maksud Anda.',
  writerPasoCorregir: 'Perbaiki ejaan, gaya, dan kejelasan',
  writerExplicaIdeas: 'Saya akan menyarankan beberapa ide dan titik awal agar Anda dapat menulis tanpa macet.',
  writerPasoIdeas: 'Sarankan ide untuk tulisan Anda',

  writerExplicaPortada: 'Saya akan menentukan konsep sampul dan membuat tiga desain untuk Anda pilih.',
  writerPasoConceptoPortada: 'Tentukan konsep sampul',
  writerPasoPropuestasPortada: 'Buat 3 desain sampul',

  writerExplicaReescribir: 'Saya akan menulis ulang teks Anda dengan nada {{tono}}, dengan tetap menjaga idenya.',
  writerPasoReescribir: 'Tulis ulang teks',
  writerExplicaCv: 'Saya akan menulis CV Anda dengan nada {{tono}}, siap dibuka di editor dan dikirim.',
  writerPasoCv: 'Tulis CV Anda',

  writerExplicaPublicacion: 'Saya akan menulis postingan dengan nada {{tono}} lalu memolesnya hingga siap digunakan.',
  writerExplicaHistoria: 'Saya akan menulis cerita dengan nada {{tono}} lalu memolesnya hingga siap digunakan.',
  writerExplicaGuion: 'Saya akan menulis naskah dengan nada {{tono}} lalu memolesnya hingga siap digunakan.',
  writerExplicaArticulo: 'Saya akan menulis artikel dengan nada {{tono}} lalu memolesnya hingga siap digunakan.',
  writerExplicaEmail: 'Saya akan menyusun email dengan nada {{tono}} lalu memolesnya hingga siap digunakan.',
  writerExplicaDocumento: 'Saya akan menyusun dokumen dengan nada {{tono}} lalu memolesnya hingga siap digunakan.',
  writerPasoPublicacion: 'Tulis postingan',
  writerPasoHistoria: 'Tulis cerita',
  writerPasoGuion: 'Tulis naskah',
  writerPasoArticulo: 'Tulis artikel',
  writerPasoEmail: 'Susun email',
  writerPasoDocumento: 'Susun dokumen',
  writerPasoPulir: 'Poles teks dan siapkan',

  writerDecisionEmpiezoPublicacion: 'saya akan mulai dengan postingan',
  writerDecisionTonoCercano: 'saya akan memakai nada ramah',
  writerDecisionTonoProfesional: 'saya akan memakai nada profesional',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Saya akan menyiapkan teks dan merekamnya dengan suara {{voz}}.',
  musicExplicaVozCalida: 'Saya akan menyiapkan teks dan merekamnya dengan suara yang hangat dan jelas.',
  musicPasoTextoNarracion: 'Siapkan teks narasi',
  musicPasoGrabarVoz: 'Rekam suara',

  musicExplicaLetra: 'Saya akan menulis lirik lengkap dengan gaya {{estilo}}.',
  musicPasoLetraCompleta: 'Tulis lirik lengkap',

  musicExplicaMezcla: 'Saya akan mendengarkan lagu Anda, lalu melakukan mixing dan mastering agar terdengar profesional.',
  musicPasoAnotarMezcla: 'Dengarkan lagu Anda dan rencanakan mixing-nya',
  musicPasoMasterizar: 'Mixing dan mastering',

  musicExplicaVideoclip: 'Saya akan membuat lagu ({{estilo}}, {{animo}}) dan adegannya, lalu menyusun seluruh video klip Anda. Anda tidak perlu keluar dari Weë Music.',
  musicPasoIdeaYLetra: 'Tulis ide dan lirik',
  musicPasoEscenas: 'Buat adegan video klip',
  musicPasoArmarVideoclip: 'Susun video klip dengan lagu Anda',

  musicExplicaJingle: 'Saya akan membuat jingle pendek yang mudah diingat dengan gaya {{estilo}} dan suasana {{animo}}.',
  musicPasoFraseJingle: 'Tulis frasa utama jingle',
  musicPasoJingle: 'Buat jingle',
  musicExplicaBeat: 'Saya akan membuat beat dengan gaya {{estilo}} dan suasana {{animo}}.',
  musicPasoIdeaMusical: 'Tentukan ide musik',
  musicPasoBeat: 'Buat beat',

  musicExplicaCancion: 'Saya akan menulis lirik, membuat lagu dengan gaya {{estilo}} dan suasana {{animo}}, serta mendesain sampulnya.',
  musicPasoLetra: 'Tulis lirik',
  musicPasoCancion: 'Buat lagu',
  musicPasoPortada: 'Desain sampul',

  musicDecisionEmpiezoCancion: 'saya akan mulai dengan lagu',
  musicDecisionEstiloPop: 'saya memilih pop',
  musicDecisionAnimoAlegre: 'saya memilih suasana ceria',
  musicDecisionVozCalida: 'saya memilih suara yang hangat dan jelas',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Saya akan melihat foto Anda dan menyusun rutinitas perawatan kulit sederhana, dengan produk yang mudah ditemukan.',
  beautyPasoRutina: 'Susun rutinitas perawatan kulit Anda',

  beautyExplicaRostro: 'Saya akan melihat wajah Anda, merekomendasikan potongan dan gaya yang paling cocok, dan mencoba dua di antaranya pada foto Anda.',
  beautyPasoMirarRostro: 'Lihat wajah Anda',
  beautyPasoRecomendar: 'Rekomendasikan potongan, kacamata, dan gaya',
  beautyPasoProbarDosEstilos: 'Coba dua gaya yang paling cocok untuk Anda',

  beautyExplicaProbar: 'Saya akan mencoba {{cambio}} untuk {{ocasion}} dalam dua versi, dengan tetap menjaga wajah, kulit, dan pencahayaan foto Anda.',
  beautyPasoProbar: 'Coba {{cambio}}, wajah Anda tetap seperti aslinya',
  beautyOcasionElDiaADia: 'sehari-hari',

  beautyDecisionCambioCompleto: 'saya menyarankan penampilan baru sepenuhnya',
  beautyDecisionOcasionDiaADia: 'saya merencanakannya untuk sehari-hari',
};
