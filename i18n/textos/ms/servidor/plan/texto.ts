/*
 * MALAYO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los huecos que llevan una opción se rellenan con `../opciones.ts`, sin emoji y con la inicial en minúscula. Las
 * `…Decision…` completan «Memandangkan anda belum pasti, …». Los idiomas (`writerIdioma…`) entran detrás de «ke dalam».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Saya akan mencari petikan sebenar tentang topik ini dan memberikan sumber setiap satu supaya anda boleh menyemaknya.',
  writerPasoCitas: 'Cari petikan dan sumbernya',

  writerExplicaTraducir: 'Saya akan menterjemah teks anda ke dalam {{idioma}}, dengan mengekalkan maksud dan nadanya.',
  writerPasoTraducir: 'Terjemah ke dalam {{idioma}}',
  writerDecisionIdiomaIngles: 'saya akan menterjemahkannya ke dalam bahasa Inggeris',
  writerIdiomaEn: 'bahasa Inggeris',
  writerIdiomaPt: 'bahasa Portugis',
  writerIdiomaFr: 'bahasa Perancis',
  writerIdiomaIt: 'bahasa Itali',

  writerExplicaResumir: 'Saya akan meringkaskan teks anda kepada idea utamanya, dalam beberapa baris sahaja.',
  writerPasoResumir: 'Ringkaskan kepada idea utama',
  writerExplicaCorregir: 'Saya akan membetulkan ejaan serta memperbaik gaya dan kejelasan tanpa mengubah maksud anda.',
  writerPasoCorregir: 'Betulkan ejaan, gaya dan kejelasan',
  writerExplicaIdeas: 'Saya akan mencadangkan beberapa idea dan titik permulaan supaya anda boleh menulis tanpa tersekat.',
  writerPasoIdeas: 'Cadangkan idea untuk tulisan anda',

  writerExplicaPortada: 'Saya akan menentukan konsep kulit buku dan mencipta tiga reka bentuk untuk anda pilih.',
  writerPasoConceptoPortada: 'Tentukan konsep kulit buku',
  writerPasoPropuestasPortada: 'Cipta 3 reka bentuk kulit buku',

  writerExplicaReescribir: 'Saya akan menulis semula teks anda dengan nada {{tono}}, dengan mengekalkan ideanya.',
  writerPasoReescribir: 'Tulis semula teks',
  writerExplicaCv: 'Saya akan menulis CV anda dengan nada {{tono}}, sedia untuk dibuka dalam editor dan dihantar.',
  writerPasoCv: 'Tulis CV anda',

  writerExplicaPublicacion: 'Saya akan menulis siaran dengan nada {{tono}} dan kemudian memperkemasnya sehingga sedia digunakan.',
  writerExplicaHistoria: 'Saya akan menulis cerita dengan nada {{tono}} dan kemudian memperkemasnya sehingga sedia digunakan.',
  writerExplicaGuion: 'Saya akan menulis skrip dengan nada {{tono}} dan kemudian memperkemasnya sehingga sedia digunakan.',
  writerExplicaArticulo: 'Saya akan menulis artikel dengan nada {{tono}} dan kemudian memperkemasnya sehingga sedia digunakan.',
  writerExplicaEmail: 'Saya akan mendraf e-mel dengan nada {{tono}} dan kemudian memperkemasnya sehingga sedia digunakan.',
  writerExplicaDocumento: 'Saya akan mendraf dokumen dengan nada {{tono}} dan kemudian memperkemasnya sehingga sedia digunakan.',
  writerPasoPublicacion: 'Tulis siaran',
  writerPasoHistoria: 'Tulis cerita',
  writerPasoGuion: 'Tulis skrip',
  writerPasoArticulo: 'Tulis artikel',
  writerPasoEmail: 'Draf e-mel',
  writerPasoDocumento: 'Draf dokumen',
  writerPasoPulir: 'Perkemas teks dan sediakan',

  writerDecisionEmpiezoPublicacion: 'saya akan bermula dengan siaran',
  writerDecisionTonoCercano: 'saya akan menggunakan nada mesra',
  writerDecisionTonoProfesional: 'saya akan menggunakan nada profesional',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Saya akan menyediakan teks dan merakamnya dengan suara {{voz}}.',
  musicExplicaVozCalida: 'Saya akan menyediakan teks dan merakamnya dengan suara yang mesra dan jelas.',
  musicPasoTextoNarracion: 'Sediakan teks narasi',
  musicPasoGrabarVoz: 'Rakam suara',

  musicExplicaLetra: 'Saya akan menulis lirik lengkap dengan gaya {{estilo}}.',
  musicPasoLetraCompleta: 'Tulis lirik lengkap',

  musicExplicaMezcla: 'Saya akan mendengar lagu anda, kemudian mengadun dan memasterkannya supaya kedengaran profesional.',
  musicPasoAnotarMezcla: 'Dengar lagu anda dan rancang adunannya',
  musicPasoMasterizar: 'Adun dan masterkan',

  musicExplicaVideoclip: 'Saya akan mencipta lagu ({{estilo}}, {{animo}}) dan adegannya, kemudian menyusun keseluruhan video muzik anda. Anda tidak perlu keluar dari Weë Music.',
  musicPasoIdeaYLetra: 'Tulis idea dan lirik',
  musicPasoEscenas: 'Cipta adegan video muzik',
  musicPasoArmarVideoclip: 'Susun video muzik dengan lagu anda',

  musicExplicaJingle: 'Saya akan mencipta jingle pendek yang mudah melekat dengan gaya {{estilo}} dan suasana {{animo}}.',
  musicPasoFraseJingle: 'Tulis frasa utama jingle',
  musicPasoJingle: 'Cipta jingle',
  musicExplicaBeat: 'Saya akan mencipta beat dengan gaya {{estilo}} dan suasana {{animo}}.',
  musicPasoIdeaMusical: 'Tentukan idea muzik',
  musicPasoBeat: 'Cipta beat',

  musicExplicaCancion: 'Saya akan menulis lirik, mencipta lagu dengan gaya {{estilo}} dan suasana {{animo}}, serta mereka bentuk kulitnya.',
  musicPasoLetra: 'Tulis lirik',
  musicPasoCancion: 'Cipta lagu',
  musicPasoPortada: 'Reka bentuk kulit',

  musicDecisionEmpiezoCancion: 'saya akan bermula dengan lagu',
  musicDecisionEstiloPop: 'saya memilih pop',
  musicDecisionAnimoAlegre: 'saya memilih suasana ceria',
  musicDecisionVozCalida: 'saya memilih suara yang mesra dan jelas',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Saya akan melihat foto anda dan menyusun rutin penjagaan kulit yang ringkas, dengan produk yang mudah didapati.',
  beautyPasoRutina: 'Susun rutin penjagaan kulit anda',

  beautyExplicaRostro: 'Saya akan melihat wajah anda, mengesyorkan potongan dan gaya yang paling sesuai dan mencuba dua daripadanya pada foto anda.',
  beautyPasoMirarRostro: 'Lihat wajah anda',
  beautyPasoRecomendar: 'Syorkan potongan, cermin mata dan gaya',
  beautyPasoProbarDosEstilos: 'Cuba dua gaya yang paling sesuai untuk anda',

  beautyExplicaProbar: 'Saya akan mencuba {{cambio}} untuk {{ocasion}} dalam dua versi, dengan mengekalkan wajah, kulit dan pencahayaan foto anda.',
  beautyPasoProbar: 'Cuba {{cambio}}, wajah anda kekal seperti asal',
  beautyOcasionElDiaADia: 'kegunaan harian',

  beautyDecisionCambioCompleto: 'saya mencadangkan penampilan baharu sepenuhnya',
  beautyDecisionOcasionDiaADia: 'saya merancangnya untuk kegunaan harian',
};
