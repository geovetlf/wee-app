/*
 * INDONESIO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae lo suyo (`weeai.tripOneDay`, `tripSameMonth`, `tripRange`), así que entra detrás de «perjalanan». `{{contador}}` son los días y `{{lasNoches}}` es
 * `travelLasNoches`. Plural: el indonesio solo tiene «other», así que `_one` y `_other` son idénticas.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Saya akan mengenal bisnis Anda, menulis postingan dengan nada {{tono}}, dan membuat gambar pendampingnya.',
  businessExplicaCalendario: 'Saya akan menyusun jadwal posting Anda untuk minggu ini, dengan hari, jam, dan jaringan untuk setiap postingan.',
  businessExplicaPublicar: 'Saya akan menyiapkan postingan dan menyesuaikannya untuk tiap jaringan, siap untuk Anda salin dan terbitkan sendiri. Weë belum terhubung ke media sosial Anda, jadi Weë tidak menerbitkannya untuk Anda.',
  businessExplicaRespuesta: 'Saya akan menulis balasan yang ramah dan jelas untuk pelanggan Anda, siap dikirim.',
  businessExplicaResultados: 'Saya akan meninjau hasil Anda dan memberi tahu apa yang berhasil dan apa yang layak dilakukan minggu ini.',
  businessExplicaCampana: 'Saya akan mengenal bisnis Anda, merancang kampanye dengan nada {{tono}}, dan membuat gambar utamanya.',
  businessExplicaCv: 'Saya akan mengenal pengalaman Anda dan menulis CV dengan nada {{tono}}, siap digunakan.',
  businessExplicaPresentacion: 'Pertama saya akan mengenal bisnis Anda, lalu menulis presentasi slide demi slide dengan nada {{tono}}.',
  businessExplicaDocumento: 'Pertama saya akan mengenal bisnis Anda, lalu menyusun dokumen dengan nada {{tono}}.',
  businessExplicaIdeas: 'Pertama saya akan mengenal bisnis Anda, lalu menyarankan ide konkret dan strategi untuk berkembang.',

  businessTonoProfesionalPeroCercano: 'profesional tetapi ramah',

  businessDecisionTonoProfesionalPeroCercano: 'saya akan memakai nada profesional tetapi ramah',
  businessDecisionTonoCercanoYProfesional: 'saya akan memakai nada ramah dan profesional',
  businessDecisionTonoProfesional: 'saya akan memakai nada profesional',
  businessDecisionIdeasConcretas: 'saya akan mulai dengan ide konkret',

  businessPasoEntender: 'Pahami bisnis dan tujuan Anda',
  businessPasoImagenPublicacion: 'Buat gambar untuk postingan',
  businessPasoCalendario: 'Susun jadwal posting',
  businessPasoPrepararPublicacion: 'Siapkan postingan',
  businessPasoAdaptarACadaRed: 'Sesuaikan untuk tiap jaringan',
  businessPasoRespuesta: 'Tulis balasan untuk pelanggan Anda',
  businessPasoResultados: 'Tinjau dan jelaskan hasil Anda',
  businessPasoCampana: 'Rancang kampanye',
  businessPasoImagenCampana: 'Buat gambar kampanye',
  businessPasoPresentacion: 'Tulis presentasi (slide demi slide)',
  businessPasoMercado: 'Cari tahu kondisi pasar Anda saat ini',
  businessPasoIdeas: 'Sarankan ide dan strategi',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Saya akan menyarankan tiga destinasi untuk perjalanan {{fechas}}, mengingat Anda mencari {{busca}}. Pilih satu dan saya akan menyiapkan seluruh perjalanannya.',
  travelExplicaDestinosDias_one: 'Saya akan menyarankan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, mengingat Anda mencari {{busca}}. Pilih satu dan saya akan menyiapkan seluruh perjalanannya.',
  travelExplicaDestinosDias_other: 'Saya akan menyarankan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, mengingat Anda mencari {{busca}}. Pilih satu dan saya akan menyiapkan seluruh perjalanannya.',
  travelExplicaDestinosDiasAviso_one: 'Saya akan menyarankan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, mengingat Anda mencari {{busca}}. Pilih satu dan saya akan menyiapkan seluruh perjalanannya. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya.',
  travelExplicaDestinosDiasAviso_other: 'Saya akan menyarankan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, mengingat Anda mencari {{busca}}. Pilih satu dan saya akan menyiapkan seluruh perjalanannya. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya.',
  travelExplicaDestinosTuViaje: 'Saya akan menyarankan tiga destinasi untuk perjalanan Anda, mengingat Anda mencari {{busca}}. Pilih satu dan saya akan menyiapkan seluruh perjalanannya.',
  travelExplicaDestinosTuViajeAviso: 'Saya akan menyarankan tiga destinasi untuk perjalanan Anda, mengingat Anda mencari {{busca}}. Pilih satu dan saya akan menyiapkan seluruh perjalanannya. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya.',

  travelBuscaSorpresa: 'sesuatu yang akan mengejutkan Anda',

  travelExplicaItinerarioFechas_one: 'Saya akan menyiapkan rencana perjalanan harian Anda {{fechas}} ({{contador}} hari · {{lasNoches}}), dengan perkiraan anggaran.',
  travelExplicaItinerarioFechas_other: 'Saya akan menyiapkan rencana perjalanan harian Anda {{fechas}} ({{contador}} hari · {{lasNoches}}), dengan perkiraan anggaran.',
  travelExplicaItinerarioDias_one: 'Saya akan menyiapkan rencana perjalanan harian Anda untuk {{contador}} hari · {{lasNoches}}, dengan perkiraan anggaran.',
  travelExplicaItinerarioDias_other: 'Saya akan menyiapkan rencana perjalanan harian Anda untuk {{contador}} hari · {{lasNoches}}, dengan perkiraan anggaran.',
  travelExplicaItinerarioDiasAviso_one: 'Saya akan menyiapkan rencana perjalanan harian Anda untuk {{contador}} hari · {{lasNoches}}, dengan perkiraan anggaran. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya.',
  travelExplicaItinerarioDiasAviso_other: 'Saya akan menyiapkan rencana perjalanan harian Anda untuk {{contador}} hari · {{lasNoches}}, dengan perkiraan anggaran. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya.',
  travelExplicaItinerarioTuViaje: 'Saya akan menyiapkan rencana harian untuk perjalanan Anda, dengan perkiraan anggaran.',
  travelExplicaItinerarioTuViajeAviso: 'Saya akan menyiapkan rencana harian untuk perjalanan Anda, dengan perkiraan anggaran. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya.',

  travelExplicaQueHacer: 'Saya akan mencari tempat yang layak dikunjungi dan tempat makan, lengkap dengan sumbernya agar dapat Anda periksa.',
  travelExplicaMoverse: 'Saya akan mencari cara berkeliling, dengan perkiraan waktu dan biaya masing-masing.',

  travelLasNoches_one: '{{contador}} malam',
  travelLasNoches_other: '{{contador}} malam',

  travelDecisionTresViajes: 'saya menyarankan tiga perjalanan yang sangat berbeda',
  travelDecisionTresViajesAviso: 'saya menyarankan tiga perjalanan yang sangat berbeda. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya',
  travelDecisionReparto: 'saya akan membagi hari-harinya untuk yang terbaik dari semuanya',
  travelDecisionRepartoAviso: 'saya akan membagi hari-harinya untuk yang terbaik dari semuanya. Setelah tahu tanggalnya, beri tahu saya dan saya akan menyesuaikan rencana dengan musimnya',

  travelPasoDestinos: 'Cari tiga destinasi yang cocok',
  travelPasoQueHacer: 'Cari tempat yang layak dikunjungi dan tempat makan',
  travelPasoMoverse: 'Cari tahu cara berkeliling',
  travelPasoItinerario_one: 'Siapkan rencana perjalanan {{contador}} hari',
  travelPasoItinerario_other: 'Siapkan rencana perjalanan {{contador}} hari',
  travelPasoItinerarioTuViaje: 'Siapkan rencana untuk perjalanan Anda',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Saya akan memastikan memahami kebutuhan Anda dan menyiapkan jawaban yang jelas, dengan langkah berikutnya.',
  brainDecisionPuntoDePartida: 'saya menyarankan titik awal dan, jika perlu, saya akan mengarahkan Anda ke spesialis Weë yang tepat',
  brainPasoEntender: 'Pahami dengan tepat apa yang Anda butuhkan',
  brainPasoRespuesta: 'Siapkan jawaban yang jelas dengan langkah berikutnya',
};
