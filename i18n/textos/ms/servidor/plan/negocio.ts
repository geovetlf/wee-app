/*
 * MALAYO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae lo suyo (`weeai.tripOneDay`, `tripSameMonth`, `tripRange`), así que entra detrás de «perjalanan». `{{contador}}` son los días y `{{lasNoches}}` es
 * `travelLasNoches`. Plural: el malayo solo tiene «other», así que `_one` y `_other` son idénticas.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Saya akan mengenali perniagaan anda, menulis siaran dengan nada {{tono}} dan mencipta imej yang sepadan.',
  businessExplicaCalendario: 'Saya akan menyusun jadual siaran anda untuk minggu ini, dengan hari, masa dan rangkaian bagi setiap siaran.',
  businessExplicaPublicar: 'Saya akan menyediakan siaran dan menyesuaikannya untuk setiap rangkaian, sedia untuk anda salin dan siarkan sendiri. Weë belum disambungkan ke media sosial anda, jadi Weë tidak menyiarkannya bagi pihak anda.',
  businessExplicaRespuesta: 'Saya akan menulis balasan yang mesra dan jelas untuk pelanggan anda, sedia untuk dihantar.',
  businessExplicaResultados: 'Saya akan menyemak hasil anda dan memberitahu perkara yang berkesan dan yang berbaloi dilakukan minggu ini.',
  businessExplicaCampana: 'Saya akan mengenali perniagaan anda, mereka bentuk kempen dengan nada {{tono}} dan mencipta imej utamanya.',
  businessExplicaCv: 'Saya akan mengenali pengalaman anda dan menulis CV dengan nada {{tono}}, sedia untuk digunakan.',
  businessExplicaPresentacion: 'Mula-mula saya akan mengenali perniagaan anda, kemudian menulis pembentangan slaid demi slaid dengan nada {{tono}}.',
  businessExplicaDocumento: 'Mula-mula saya akan mengenali perniagaan anda, kemudian menyediakan dokumen dengan nada {{tono}}.',
  businessExplicaIdeas: 'Mula-mula saya akan mengenali perniagaan anda, kemudian mencadangkan idea konkrit dan strategi untuk berkembang.',

  businessTonoProfesionalPeroCercano: 'profesional tetapi mesra',

  businessDecisionTonoProfesionalPeroCercano: 'saya akan menggunakan nada profesional tetapi mesra',
  businessDecisionTonoCercanoYProfesional: 'saya akan menggunakan nada mesra dan profesional',
  businessDecisionTonoProfesional: 'saya akan menggunakan nada profesional',
  businessDecisionIdeasConcretas: 'saya akan bermula dengan idea konkrit',

  businessPasoEntender: 'Fahami perniagaan dan matlamat anda',
  businessPasoImagenPublicacion: 'Cipta imej untuk siaran',
  businessPasoCalendario: 'Susun jadual siaran',
  businessPasoPrepararPublicacion: 'Sediakan siaran',
  businessPasoAdaptarACadaRed: 'Sesuaikan untuk setiap rangkaian',
  businessPasoRespuesta: 'Tulis balasan untuk pelanggan anda',
  businessPasoResultados: 'Semak dan terangkan hasil anda',
  businessPasoCampana: 'Reka bentuk kempen',
  businessPasoImagenCampana: 'Cipta imej kempen',
  businessPasoPresentacion: 'Tulis pembentangan (slaid demi slaid)',
  businessPasoMercado: 'Semak keadaan pasaran anda sekarang',
  businessPasoIdeas: 'Cadangkan idea dan strategi',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Saya akan mencadangkan tiga destinasi untuk perjalanan {{fechas}}, memandangkan anda mencari {{busca}}. Pilih satu dan saya akan menyediakan keseluruhan perjalanan.',
  travelExplicaDestinosDias_one: 'Saya akan mencadangkan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, memandangkan anda mencari {{busca}}. Pilih satu dan saya akan menyediakan keseluruhan perjalanan.',
  travelExplicaDestinosDias_other: 'Saya akan mencadangkan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, memandangkan anda mencari {{busca}}. Pilih satu dan saya akan menyediakan keseluruhan perjalanan.',
  travelExplicaDestinosDiasAviso_one: 'Saya akan mencadangkan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, memandangkan anda mencari {{busca}}. Pilih satu dan saya akan menyediakan keseluruhan perjalanan. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim.',
  travelExplicaDestinosDiasAviso_other: 'Saya akan mencadangkan tiga destinasi untuk {{contador}} hari · {{lasNoches}}, memandangkan anda mencari {{busca}}. Pilih satu dan saya akan menyediakan keseluruhan perjalanan. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim.',
  travelExplicaDestinosTuViaje: 'Saya akan mencadangkan tiga destinasi untuk perjalanan anda, memandangkan anda mencari {{busca}}. Pilih satu dan saya akan menyediakan keseluruhan perjalanan.',
  travelExplicaDestinosTuViajeAviso: 'Saya akan mencadangkan tiga destinasi untuk perjalanan anda, memandangkan anda mencari {{busca}}. Pilih satu dan saya akan menyediakan keseluruhan perjalanan. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim.',

  travelBuscaSorpresa: 'sesuatu yang akan mengejutkan anda',

  travelExplicaItinerarioFechas_one: 'Saya akan menyediakan jadual perjalanan harian anda, {{fechas}} ({{contador}} hari · {{lasNoches}}), dengan anggaran bajet.',
  travelExplicaItinerarioFechas_other: 'Saya akan menyediakan jadual perjalanan harian anda, {{fechas}} ({{contador}} hari · {{lasNoches}}), dengan anggaran bajet.',
  travelExplicaItinerarioDias_one: 'Saya akan menyediakan jadual perjalanan harian anda untuk {{contador}} hari · {{lasNoches}}, dengan anggaran bajet.',
  travelExplicaItinerarioDias_other: 'Saya akan menyediakan jadual perjalanan harian anda untuk {{contador}} hari · {{lasNoches}}, dengan anggaran bajet.',
  travelExplicaItinerarioDiasAviso_one: 'Saya akan menyediakan jadual perjalanan harian anda untuk {{contador}} hari · {{lasNoches}}, dengan anggaran bajet. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim.',
  travelExplicaItinerarioDiasAviso_other: 'Saya akan menyediakan jadual perjalanan harian anda untuk {{contador}} hari · {{lasNoches}}, dengan anggaran bajet. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim.',
  travelExplicaItinerarioTuViaje: 'Saya akan menyediakan jadual harian untuk perjalanan anda, dengan anggaran bajet.',
  travelExplicaItinerarioTuViajeAviso: 'Saya akan menyediakan jadual harian untuk perjalanan anda, dengan anggaran bajet. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim.',

  travelExplicaQueHacer: 'Saya akan mencari tempat yang berbaloi dilawati dan tempat makan, berserta sumber setiap satu supaya anda boleh menyemaknya.',
  travelExplicaMoverse: 'Saya akan mencari cara untuk bergerak, dengan anggaran masa dan kos bagi setiap satu.',

  travelLasNoches_one: '{{contador}} malam',
  travelLasNoches_other: '{{contador}} malam',

  travelDecisionTresViajes: 'saya mencadangkan tiga perjalanan yang sangat berbeza',
  travelDecisionTresViajesAviso: 'saya mencadangkan tiga perjalanan yang sangat berbeza. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim',
  travelDecisionReparto: 'saya akan membahagikan hari-hari itu untuk yang terbaik daripada semuanya',
  travelDecisionRepartoAviso: 'saya akan membahagikan hari-hari itu untuk yang terbaik daripada semuanya. Apabila anda tahu tarikhnya, beritahu saya dan saya akan menyesuaikan pelan mengikut musim',

  travelPasoDestinos: 'Cari tiga destinasi yang sesuai',
  travelPasoQueHacer: 'Cari tempat yang berbaloi dilawati dan tempat makan',
  travelPasoMoverse: 'Ketahui cara untuk bergerak',
  travelPasoItinerario_one: 'Sediakan jadual perjalanan {{contador}} hari',
  travelPasoItinerario_other: 'Sediakan jadual perjalanan {{contador}} hari',
  travelPasoItinerarioTuViaje: 'Sediakan jadual untuk perjalanan anda',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Saya akan memastikan saya memahami keperluan anda dan menyediakan jawapan yang jelas, dengan langkah seterusnya.',
  brainDecisionPuntoDePartida: 'saya mencadangkan titik permulaan dan, jika perlu, saya akan membawa anda kepada pakar Weë yang sesuai',
  brainPasoEntender: 'Fahami dengan tepat apa yang anda perlukan',
  brainPasoRespuesta: 'Sediakan jawapan yang jelas dengan langkah seterusnya',
};
