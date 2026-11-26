/*
 * INDONESIO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` ya trae «untuk» («untuk dua orang»); `{{tiempo}}`, `{{espacio}}` y `{{estilo}}` entran tal cual.
 * Las `…Decision…` completan «Karena Anda belum yakin, …», por eso empiezan en minúscula.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Saya akan memakai foto Anda dan memperbaiki pencahayaannya. Hidangannya tetap persis seperti aslinya.',
  chefExplicaRetoqueFondo: 'Saya akan memakai foto Anda dan mengganti latar belakangnya. Hidangannya tetap persis seperti aslinya.',
  chefExplicaRetoqueApetitoso: 'Saya akan memakai foto Anda dan membuatnya tampak lebih menggugah selera. Hidangannya tetap persis seperti aslinya.',
  chefExplicaRetoqueRestaurante: 'Saya akan memakai foto Anda dan membuatnya tampak seperti foto restoran. Hidangannya tetap persis seperti aslinya.',
  chefExplicaRetoqueQuitar: 'Saya akan memakai foto Anda dan menghapus hal yang tidak Anda inginkan. Hidangannya tetap persis seperti aslinya.',
  chefExplicaRetoqueNoSe: 'Saya akan memakai foto Anda dan membuatnya tampak lebih baik tanpa mengubah hidangannya. Hidangannya tetap persis seperti aslinya.',
  chefExplicaRetoqueLibre: 'Saya akan memakai foto Anda dan hanya melakukan perubahan yang Anda minta. Hidangannya tetap persis seperti aslinya.',

  chefExplicaMenuTresDias: 'Saya akan menyusun menu tiga hari {{comensales}} dan memberikan daftar belanjanya.',
  chefExplicaMenuTodaLaSemana: 'Saya akan menyusun menu seminggu penuh {{comensales}} dan memberikan daftar belanjanya.',
  chefExplicaMenuParaLaSemana: 'Saya akan menyusun menu untuk minggu ini {{comensales}} dan memberikan daftar belanjanya.',
  chefExplicaMenu: 'Saya akan menyusun menu untuk {{duracion}}, {{comensales}}, dan memberikan daftar belanjanya.',

  chefExplicaRecetaEnTiempo: 'Saya akan menyiapkan resep langkah demi langkah {{comensales}}, siap dalam {{tiempo}}, beserta foto hasil hidangannya.',
  chefExplicaRecetaSinApuro: 'Saya akan menyiapkan resep langkah demi langkah {{comensales}}, tanpa batas waktu, beserta foto hasil hidangannya.',
  chefExplicaConLoQueTienesEnTiempo: 'Saya akan menyiapkan resep {{comensales}} dengan bahan yang ada di rumah Anda, siap dalam {{tiempo}}, beserta foto hasil hidangannya.',
  chefExplicaConLoQueTienesSinApuro: 'Saya akan menyiapkan resep {{comensales}} dengan bahan yang ada di rumah Anda, tanpa batas waktu, beserta foto hasil hidangannya.',
  chefExplicaSaludableEnTiempo: 'Saya akan menyiapkan resep sehat {{comensales}}, siap dalam {{tiempo}}, beserta foto hasil hidangannya.',
  chefExplicaSaludableSinApuro: 'Saya akan menyiapkan resep sehat {{comensales}}, tanpa batas waktu, beserta foto hasil hidangannya.',
  chefExplicaPostreEnTiempo: 'Saya akan menyiapkan hidangan penutup {{comensales}}, siap dalam {{tiempo}}, beserta foto hasil hidangannya.',
  chefExplicaPostreSinApuro: 'Saya akan menyiapkan hidangan penutup {{comensales}}, tanpa batas waktu, beserta foto hasil hidangannya.',

  chefDecisionAlgoRico: 'saya menyarankan sesuatu yang enak dan mudah dengan bahan yang biasa ada di rumah',
  chefDecisionParaDos: 'saya merencanakannya untuk dua orang',
  chefDecisionSinApuro: 'saya tidak menetapkan batas waktu',
  chefDecisionTodaLaSemana: 'saya akan membuatnya untuk seminggu penuh',

  chefPasoMirarIngredientes: 'Lihat bahan yang Anda miliki',
  chefPasoEscribirReceta: 'Tulis resep langkah demi langkah',
  chefPasoFotoDelPlato: 'Buat foto hidangan',
  chefPasoArmarMenu: 'Susun menu',
  chefPasoPreciosIngredientes: 'Periksa harga bahan',
  chefPasoListaDeCompras: 'Buat daftar belanja',
  chefPasoRetocarFoto: 'Perhalus foto hidangan Anda',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Saya akan melihat {{espacio}} dan memberi tahu apa yang akan saya ubah —furnitur, warna, tata letak— agar Anda bisa memilih dari mana memulainya. Saya belum akan membuat gambar.',
  homeExplicaIdeas: 'Saya akan mencari tiga ide untuk {{espacio}} dengan gaya {{estilo}} dan menjelaskan cara mewujudkannya.',
  homeExplicaDistribucion: 'Saya akan melihat {{espacio}}, menyarankan tata letak yang memanfaatkan ruang dengan lebih baik, dan menunjukkan hasilnya dengan furnitur Anda sendiri.',
  homeExplicaRedisenar: 'Saya akan mendesain ulang {{espacio}} dengan gaya {{estilo}}, dalam dua versi, dan memberikan daftar perubahan serta barang yang perlu dibeli.',
  homeExplicaMuebles: 'Saya akan mengganti furnitur di {{espacio}} dengan gaya {{estilo}}, dalam dua versi, dan memberikan daftar perubahan serta barang yang perlu dibeli.',
  homeExplicaColores: 'Saya akan mengubah tampilan dan warna {{espacio}} ke gaya {{estilo}}, dalam dua versi, dan memberikan daftar perubahan serta barang yang perlu dibeli.',
  homeExplicaExterior: 'Saya akan mendesain ruang luar Anda dengan gaya {{estilo}}, dalam dua versi, dan memberikan daftar perubahan serta barang yang perlu dibeli.',

  homeDecisionEmpiezoPorLaSala: 'saya akan mulai dari ruang tamu',
  homeDecisionEstiloAcogedor: 'saya memilih gaya yang nyaman',

  homePasoMirarFotoDelEspacio: 'Lihat foto ruangannya',
  homePasoRedisenar: 'Desain ulang {{espacio}} dengan gaya {{estilo}}',
  homePasoMuebles: 'Ganti furnitur di {{espacio}} dengan gaya {{estilo}}',
  homePasoColores: 'Ubah tampilan dan warna {{espacio}} ke gaya {{estilo}}',
  homePasoExterior: 'Desain ruang luar Anda dengan gaya {{estilo}}',
  homePasoListaDeCambios: 'Susun daftar perubahan dan barang yang perlu dibeli',
  homePasoProponerDistribucion: 'Sarankan tata letak yang lebih baik',
  homePasoMostrarComoQuedaria: 'Tunjukkan hasilnya',
  homePasoBuscarIdeas: 'Cari ide untuk {{espacio}}',
  homePasoExplicarComoLograrlo: 'Jelaskan cara mewujudkannya',
  homePasoMirarFotoDeTuEspacio: 'Lihat foto ruangan Anda',
  homePasoContarQueVeo: 'Ceritakan apa yang saya lihat dan apa yang akan saya lakukan',

  /* La voz de quien habla: Weë dice «Anda», no «saya» (ver el catálogo español). */
  chefComensalesSoloParaMi: 'hanya untuk Anda',
  homeEspacioMiOficina: 'ruang kerja Anda',
};
