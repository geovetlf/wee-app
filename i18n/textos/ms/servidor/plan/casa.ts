/*
 * MALAYO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` ya trae «untuk» («untuk dua orang»); `{{tiempo}}`, `{{espacio}}` y `{{estilo}}` entran tal cual.
 * Las `…Decision…` completan «Memandangkan anda belum pasti, …», por eso empiezan en minúscula.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Saya akan menggunakan foto anda dan membaiki pencahayaannya. Hidangan itu kekal seperti asal.',
  chefExplicaRetoqueFondo: 'Saya akan menggunakan foto anda dan menukar latar belakangnya. Hidangan itu kekal seperti asal.',
  chefExplicaRetoqueApetitoso: 'Saya akan menggunakan foto anda dan menjadikannya lebih menyelerakan. Hidangan itu kekal seperti asal.',
  chefExplicaRetoqueRestaurante: 'Saya akan menggunakan foto anda dan menjadikannya seperti foto restoran. Hidangan itu kekal seperti asal.',
  chefExplicaRetoqueQuitar: 'Saya akan menggunakan foto anda dan membuang perkara yang tidak anda mahu. Hidangan itu kekal seperti asal.',
  chefExplicaRetoqueNoSe: 'Saya akan menggunakan foto anda dan menjadikannya lebih cantik tanpa mengubah hidangan. Hidangan itu kekal seperti asal.',
  chefExplicaRetoqueLibre: 'Saya akan menggunakan foto anda dan hanya membuat perubahan yang anda minta. Hidangan itu kekal seperti asal.',

  chefExplicaMenuTresDias: 'Saya akan menyusun menu tiga hari {{comensales}} dan memberikan senarai beli-belah.',
  chefExplicaMenuTodaLaSemana: 'Saya akan menyusun menu seminggu penuh {{comensales}} dan memberikan senarai beli-belah.',
  chefExplicaMenuParaLaSemana: 'Saya akan menyusun menu untuk minggu ini {{comensales}} dan memberikan senarai beli-belah.',
  chefExplicaMenu: 'Saya akan menyusun menu untuk {{duracion}}, {{comensales}}, dan memberikan senarai beli-belah.',

  chefExplicaRecetaEnTiempo: 'Saya akan menyediakan resipi langkah demi langkah {{comensales}}, siap dalam {{tiempo}}, berserta foto hasil hidangan.',
  chefExplicaRecetaSinApuro: 'Saya akan menyediakan resipi langkah demi langkah {{comensales}}, tanpa had masa, berserta foto hasil hidangan.',
  chefExplicaConLoQueTienesEnTiempo: 'Saya akan menyediakan resipi {{comensales}} dengan bahan yang ada di rumah anda, siap dalam {{tiempo}}, berserta foto hasil hidangan.',
  chefExplicaConLoQueTienesSinApuro: 'Saya akan menyediakan resipi {{comensales}} dengan bahan yang ada di rumah anda, tanpa had masa, berserta foto hasil hidangan.',
  chefExplicaSaludableEnTiempo: 'Saya akan menyediakan resipi sihat {{comensales}}, siap dalam {{tiempo}}, berserta foto hasil hidangan.',
  chefExplicaSaludableSinApuro: 'Saya akan menyediakan resipi sihat {{comensales}}, tanpa had masa, berserta foto hasil hidangan.',
  chefExplicaPostreEnTiempo: 'Saya akan menyediakan pencuci mulut {{comensales}}, siap dalam {{tiempo}}, berserta foto hasil hidangan.',
  chefExplicaPostreSinApuro: 'Saya akan menyediakan pencuci mulut {{comensales}}, tanpa had masa, berserta foto hasil hidangan.',

  chefDecisionAlgoRico: 'saya mencadangkan sesuatu yang sedap dan mudah dengan bahan yang biasa ada di rumah',
  chefDecisionParaDos: 'saya merancangnya untuk dua orang',
  chefDecisionSinApuro: 'saya tidak menetapkan had masa',
  chefDecisionTodaLaSemana: 'saya akan menyediakannya untuk seminggu penuh',

  chefPasoMirarIngredientes: 'Lihat bahan yang anda ada',
  chefPasoEscribirReceta: 'Tulis resipi langkah demi langkah',
  chefPasoFotoDelPlato: 'Cipta foto hidangan',
  chefPasoArmarMenu: 'Susun menu',
  chefPasoPreciosIngredientes: 'Semak harga bahan',
  chefPasoListaDeCompras: 'Sediakan senarai beli-belah',
  chefPasoRetocarFoto: 'Perhalusi foto hidangan anda',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Saya akan melihat {{espacio}} dan memberitahu perkara yang akan saya ubah —perabot, warna, susun atur— supaya anda boleh memilih tempat untuk bermula. Saya belum akan mencipta sebarang imej.',
  homeExplicaIdeas: 'Saya akan mencari tiga idea untuk {{espacio}} dengan gaya {{estilo}} dan menerangkan cara mencapainya.',
  homeExplicaDistribucion: 'Saya akan melihat {{espacio}}, mencadangkan susun atur yang memanfaatkan ruang dengan lebih baik dan menunjukkan hasilnya dengan perabot anda sendiri.',
  homeExplicaRedisenar: 'Saya akan mereka bentuk semula {{espacio}} dengan gaya {{estilo}}, dalam dua versi, dan memberikan senarai perubahan serta barang yang perlu dibeli.',
  homeExplicaMuebles: 'Saya akan menukar perabot di {{espacio}} kepada gaya {{estilo}}, dalam dua versi, dan memberikan senarai perubahan serta barang yang perlu dibeli.',
  homeExplicaColores: 'Saya akan menukar rupa dan warna {{espacio}} kepada gaya {{estilo}}, dalam dua versi, dan memberikan senarai perubahan serta barang yang perlu dibeli.',
  homeExplicaExterior: 'Saya akan mereka bentuk ruang luar anda dengan gaya {{estilo}}, dalam dua versi, dan memberikan senarai perubahan serta barang yang perlu dibeli.',

  homeDecisionEmpiezoPorLaSala: 'saya akan bermula dengan ruang tamu',
  homeDecisionEstiloAcogedor: 'saya memilih gaya yang selesa',

  homePasoMirarFotoDelEspacio: 'Lihat foto ruang itu',
  homePasoRedisenar: 'Reka bentuk semula {{espacio}} dengan gaya {{estilo}}',
  homePasoMuebles: 'Tukar perabot di {{espacio}} kepada gaya {{estilo}}',
  homePasoColores: 'Tukar rupa dan warna {{espacio}} kepada gaya {{estilo}}',
  homePasoExterior: 'Reka bentuk ruang luar anda dengan gaya {{estilo}}',
  homePasoListaDeCambios: 'Susun senarai perubahan dan barang yang perlu dibeli',
  homePasoProponerDistribucion: 'Cadangkan susun atur yang lebih baik',
  homePasoMostrarComoQuedaria: 'Tunjukkan hasilnya',
  homePasoBuscarIdeas: 'Cari idea untuk {{espacio}}',
  homePasoExplicarComoLograrlo: 'Terangkan cara mencapainya',
  homePasoMirarFotoDeTuEspacio: 'Lihat foto ruang anda',
  homePasoContarQueVeo: 'Beritahu apa yang saya lihat dan apa yang akan saya lakukan',

  /* La voz de quien habla: Weë dice «anda», no «saya» (ver el catálogo español). */
  chefComensalesSoloParaMi: 'hanya untuk anda',
  homeEspacioMiOficina: 'bilik kerja anda',
};
