/*
 * TURCO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Tras una cifra, singular: `_one` y `_other` dicen lo mismo. La duración de un viaje se dice «10 gece 11 gün», las
 * noches primero (guía § 6). `{{fechas}}` ya llega escrita para el turco («12–18 Ekim 2026») y va como etiqueta, porque
 * «tarihinde» no vale para un rango ni «tarihleri» para un solo día. `{{busca}}` también va como etiqueta.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'İşletmeni anlayacağım, gönderiyi {{tono}} bir tonla yazacağım ve ona eşlik edecek görseli oluşturacağım.',
  businessExplicaCalendario: 'Haftanın gönderi takvimini, her gönderi için gün, saat ve sosyal ağ belirterek hazırlayacağım.',
  businessExplicaPublicar: 'Gönderiyi hazırlayıp her sosyal ağa uyarlayacağım; sen de kopyalayıp paylaşacaksın. Weë henüz sosyal ağlarına bağlı değil, bu yüzden senin yerine paylaşım yapmaz.',
  businessExplicaRespuesta: 'Müşterin için nazik ve açık, göndermeye hazır bir yanıt yazacağım.',
  businessExplicaResultados: 'Sonuçlarını inceleyeceğim, neyin işe yaradığını ve bu hafta ne yapman gerektiğini anlatacağım.',
  businessExplicaCampana: 'İşletmeni anlayacağım, kampanyayı {{tono}} bir tonla tasarlayacağım ve ana görselini oluşturacağım.',
  businessExplicaCv: 'Deneyimini anlayıp CV\'ni {{tono}} bir tonla hazırlayacağım: kullanmaya hazır.',
  businessExplicaPresentacion: 'Önce işletmeni anlayacağım, sonra sunumu slayt slayt {{tono}} bir tonla yazacağım.',
  businessExplicaDocumento: 'Önce işletmeni anlayacağım, sonra belgeyi {{tono}} bir tonla hazırlayacağım.',
  businessExplicaIdeas: 'Önce işletmeni anlayacağım, sonra büyümen için somut fikirler ve bir strateji önereceğim.',

  businessTonoProfesionalPeroCercano: 'profesyonel ama samimi',

  businessDecisionTonoProfesionalPeroCercano: 'profesyonel ama samimi bir ton kullanıyorum',
  businessDecisionTonoCercanoYProfesional: 'samimi ve profesyonel bir ton kullanıyorum',
  businessDecisionTonoProfesional: 'profesyonel bir ton kullanıyorum',
  businessDecisionIdeasConcretas: 'somut fikirlerle başlıyorum',

  businessPasoEntender: 'İşletmeni ve hedefini anlama',
  businessPasoImagenPublicacion: 'Gönderi görseli oluşturma',
  businessPasoCalendario: 'Gönderi takvimi hazırlama',
  businessPasoPrepararPublicacion: 'Gönderi hazırlığı',
  businessPasoAdaptarACadaRed: 'Her sosyal ağa uyarlama',
  businessPasoRespuesta: 'Müşteri yanıtı yazımı',
  businessPasoResultados: 'Sonuçların incelenmesi ve açıklaması',
  businessPasoCampana: 'Kampanya tasarımı',
  businessPasoImagenCampana: 'Kampanya görseli oluşturma',
  businessPasoPresentacion: 'Sunum yazımı (slayt slayt)',
  businessPasoMercado: 'Pazarının güncel durumuna bakış',
  businessPasoIdeas: 'Fikir ve strateji önerisi',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Sana üç rota önereceğim. Tarih: {{fechas}}. Aradığın şey: {{busca}}. Hangisini seçersen, tüm gezini ona göre hazırlarım.',
  travelExplicaDestinosDias_one: 'Sana üç rota önereceğim. Süre: {{lasNoches}} {{contador}} gün. Aradığın şey: {{busca}}. Hangisini seçersen, tüm gezini ona göre hazırlarım.',
  travelExplicaDestinosDias_other: 'Sana üç rota önereceğim. Süre: {{lasNoches}} {{contador}} gün. Aradığın şey: {{busca}}. Hangisini seçersen, tüm gezini ona göre hazırlarım.',
  travelExplicaDestinosDiasAviso_one: 'Sana üç rota önereceğim. Süre: {{lasNoches}} {{contador}} gün. Aradığın şey: {{busca}}. Hangisini seçersen, tüm gezini ona göre hazırlarım. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım.',
  travelExplicaDestinosDiasAviso_other: 'Sana üç rota önereceğim. Süre: {{lasNoches}} {{contador}} gün. Aradığın şey: {{busca}}. Hangisini seçersen, tüm gezini ona göre hazırlarım. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım.',
  travelExplicaDestinosTuViaje: 'Gezin için sana üç rota önereceğim. Aradığın şey: {{busca}}. Hangisini seçersen, tüm gezini ona göre hazırlarım.',
  travelExplicaDestinosTuViajeAviso: 'Gezin için sana üç rota önereceğim. Aradığın şey: {{busca}}. Hangisini seçersen, tüm gezini ona göre hazırlarım. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım.',

  travelBuscaSorpresa: 'seni şaşırtacak bir şey',

  travelExplicaItinerarioFechas_one: 'Gezi programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım. Tarih: {{fechas}} ({{lasNoches}} {{contador}} gün).',
  travelExplicaItinerarioFechas_other: 'Gezi programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım. Tarih: {{fechas}} ({{lasNoches}} {{contador}} gün).',
  travelExplicaItinerarioDias_one: 'Gezi programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım. Süre: {{lasNoches}} {{contador}} gün.',
  travelExplicaItinerarioDias_other: 'Gezi programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım. Süre: {{lasNoches}} {{contador}} gün.',
  travelExplicaItinerarioDiasAviso_one: 'Gezi programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım. Süre: {{lasNoches}} {{contador}} gün. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım.',
  travelExplicaItinerarioDiasAviso_other: 'Gezi programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım. Süre: {{lasNoches}} {{contador}} gün. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım.',
  travelExplicaItinerarioTuViaje: 'Gezinin programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım.',
  travelExplicaItinerarioTuViajeAviso: 'Gezinin programını gün gün ve yaklaşık bir bütçeyle hazırlayacağım. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım.',

  travelExplicaQueHacer: 'Görmeye değer yerleri ve yemek yenecek yerleri arayacağım, kontrol edebilmen için her birinin kaynağını ekleyeceğim.',
  travelExplicaMoverse: 'Ulaşım seçeneklerini, yaklaşık süre ve ücretleriyle birlikte arayacağım.',

  travelLasNoches_one: '{{contador}} gece',
  travelLasNoches_other: '{{contador}} gece',

  travelDecisionTresViajes: 'birbirinden farklı üç gezi öneriyorum',
  travelDecisionTresViajesAviso: 'birbirinden farklı üç gezi öneriyorum. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım',
  travelDecisionReparto: 'günleri her şeyin en iyisine göre paylaştırıyorum',
  travelDecisionRepartoAviso: 'günleri her şeyin en iyisine göre paylaştırıyorum. Tarihleri öğrenince bana söyle, mevsime göre ayarlayayım',

  travelPasoDestinos: 'Sana uygun üç rota araması',
  travelPasoQueHacer: 'Görmeye değer yerler ve yemek yerleri araması',
  travelPasoMoverse: 'Ulaşım seçenekleri araması',
  travelPasoItinerario_one: '{{contador}} günlük gezi programı hazırlama',
  travelPasoItinerario_other: '{{contador}} günlük gezi programı hazırlama',
  travelPasoItinerarioTuViaje: 'Gezi programı hazırlama',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Neye ihtiyacın olduğunu iyice anlayacağım ve sonraki adımlarıyla birlikte açık bir yanıt hazırlayacağım.',
  brainDecisionPuntoDePartida: 'bir başlangıç noktası öneriyorum ve gerekirse seni uygun Weë uzmanına götürüyorum',
  brainPasoEntender: 'İhtiyacını iyice anlama',
  brainPasoRespuesta: 'Sonraki adımlarıyla açık bir yanıt hazırlama',
};
