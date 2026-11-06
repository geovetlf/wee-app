/*
 * JEMER — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * El jemer no tiene plural: las dos formas del contador son idénticas. «សមតុល្យ» = saldo; «ការបង្វិលសងវិញ» = reembolso.
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'សមតុល្យ​មុន',
  bienvenida: 'Credits ស្វាគមន៍',
  ajusteMenos: 'ការកែតម្រូវ៖ ចំណាយ​តិច​ជាង​ចំនួន​ដែល​បាន​កក់',
  reembolsoFallida: 'ការបង្វិលសងវិញ​ដោយសារ​ការបង្កើត​បរាជ័យ',
  compra: 'ការទិញ Credits',
  regalo: 'Credits អំណោយ',
  recargaPrueba: 'ការបញ្ចូលបន្ថែម​សាកល្បង',
  compraRestaurada: 'ការទិញ​ដែល​បាន​ស្តារ',
  reembolsoAdmin: 'ការបង្វិលសងវិញ​ដោយ​អ្នកគ្រប់គ្រង',
  avatar: 'អវតារ Weë',
  fotoConAvatar: 'រូបថត​ជាមួយ​អវតារ Weë របស់អ្នក',
  noSePudoTerminar: '{{base}} · មិនអាច​បញ្ចប់​បានទេ',
  brainBusqueda: 'Weë Brain · ការស្វែងរក',
  brainRespuestas_one: 'Weë Brain · ចម្លើយ {{contador}}',
  brainRespuestas_other: 'Weë Brain · ចម្លើយ {{contador}}',
  brainNoPudo: 'Weë Brain · មិនអាច​ឆ្លើយ​បានទេ',
  studioVideo: 'Weë Studio · វីដេអូ',
  studioSinTiempo: 'Weë Studio · ការព្យាយាម​មុន​អស់​ពេល',
  studioNoSePudo: 'Weë Studio · មិនអាច​បង្កើត​វីដេអូ​បានទេ',
  studioMundo: 'Weë Studio · ពិភព 3D',
  studioMundoNoSePudo: 'Weë Studio · មិនអាច​បង្កើត​ពិភព 3D បានទេ',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · ប្រតិបត្តិការ​មិន​បាន​បញ្ចប់',
  servicioAiImageLite: 'រូបភាព​ស្តង់ដារ',
  servicioAiImageEnhanceLite: 'ការកែសម្រួល​ស្តង់ដារ',
  servicioAiImage: 'ការបង្កើត​រូបភាព',
  servicioAiImageEnhance: 'ការកែសម្រួល​រូបភាព',
  servicioAiImagePro: 'រូបភាព​ភាពជាក់លាក់​ខ្ពស់​បំផុត',
  servicioAiTryon: 'ការសាកល្បង​សម្លៀកបំពាក់',
  servicioAiVideoDraft: 'វីដេអូ​មើល​ជាមុន',
  servicioAiVideo: 'ការបង្កើត​វីដេអូ',
  servicioAiVideoHd: 'វីដេអូ​គុណភាព​ខ្ពស់',
  servicioAiVideoAdvanced: 'វីដេអូ​កម្រិត​ខ្ពស់',
  servicioAiVideoMax: 'វីដេអូ​គុណភាព​ខ្ពស់​បំផុត',
  servicioAiVideoEdit: 'ការកាត់តរ​វីដេអូ',
  servicioAiAudio: 'ការបង្កើត​សំឡេង',
  servicioAiTranscribe: 'ការចម្លង​អត្ថបទ​និង​អក្សររត់',
  servicioAiMusic: 'ការបង្កើត​តន្ត្រី',
  servicioAiWorld: 'ការបង្កើត​ពិភព 3D',
  servicioAiBrain: 'ចម្លើយ​ពី Weë Brain',
  servicioAiText: 'ការបង្កើត​អត្ថបទ',
  servicioAiTextPro: 'អត្ថបទ​វែង​គុណភាព​ខ្ពស់​បំផុត',
  servicioAiSearch: 'ការស្វែងរក​ជាមួយ AI',
  servicioAiBook: 'ការបង្កើត​សៀវភៅ',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost សារបង្ហោះ',
  boostNoIniciado: 'Boost មិនទាន់​ចាប់ផ្តើម',
  boostSinEntregas: 'Boost គ្មាន​ការបង្ហាញ · បាន​បង្វិល​សង​វិញ​ទាំងអស់',
};
