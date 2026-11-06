/*
 * MONGOL — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición y la escribe la app. `{{tono}}` es adjetivo delante de «өнгө аяс». `{{busca}}` es un
 * nombre sin caso y va detrás de dos puntos. El mongol no marca plural tras un número: `_one` y `_other` dicen lo mismo.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Таны бизнесийг ойлгож, нийтлэлийг {{tono}} өнгө аясаар бичээд, дагалдах зургийг нь бүтээнэ.',
  businessExplicaCalendario: 'Долоо хоногийн нийтлэлийн хуваарийг өдөр, цаг, сүлжээтэй нь гаргана.',
  businessExplicaPublicar: 'Нийтлэлийг бэлдэж, сүлжээ бүрд тохируулна, ингэснээр та хуулж аваад өөрөө нийтэлнэ. Weë одоогоор таны сүлжээнүүдтэй холбогдоогүй тул таны өмнөөс нийтлэхгүй.',
  businessExplicaRespuesta: 'Үйлчлүүлэгчдээ илгээхэд бэлэн, эелдэг, ойлгомжтой хариулт бичнэ.',
  businessExplicaResultados: 'Таны үр дүнг хянаж, юу үр дүнтэй байсан, энэ долоо хоногт юу хийх нь зүйтэйг хэлнэ.',
  businessExplicaCampana: 'Таны бизнесийг ойлгож, кампанит ажлыг {{tono}} өнгө аясаар зохиож, гол зургийг нь бүтээнэ.',
  businessExplicaCv: 'Таны туршлагыг ойлгож, CV-г тань {{tono}} өнгө аясаар бичиж, ашиглахад бэлэн болгоно.',
  businessExplicaPresentacion: 'Эхлээд бизнесийг тань ойлгоод, дараа нь илтгэлийг слайд бүрээр {{tono}} өнгө аясаар бичнэ.',
  businessExplicaDocumento: 'Эхлээд бизнесийг тань ойлгоод, дараа нь баримт бичгийг {{tono}} өнгө аясаар боловсруулна.',
  businessExplicaIdeas: 'Эхлээд бизнесийг тань ойлгоод, дараа нь тодорхой санаанууд болон өсөлтийн стратеги санал болгоно.',

  businessTonoProfesionalPeroCercano: 'мэргэжлийн мөртлөө дотно',

  businessDecisionTonoProfesionalPeroCercano: 'мэргэжлийн мөртлөө дотно өнгө аяс ашиглана',
  businessDecisionTonoCercanoYProfesional: 'дотно, мэргэжлийн өнгө аяс ашиглана',
  businessDecisionTonoProfesional: 'мэргэжлийн өнгө аяс ашиглана',
  businessDecisionIdeasConcretas: 'тодорхой санаануудаас эхэлнэ',

  businessPasoEntender: 'Таны бизнес, зорилгыг ойлгох',
  businessPasoImagenPublicacion: 'Нийтлэлийн зургийг бүтээх',
  businessPasoCalendario: 'Нийтлэлийн хуваарь гаргах',
  businessPasoPrepararPublicacion: 'Нийтлэлийг бэлдэх',
  businessPasoAdaptarACadaRed: 'Сүлжээ бүрд тохируулах',
  businessPasoRespuesta: 'Үйлчлүүлэгчид тань хариулт бичих',
  businessPasoResultados: 'Таны үр дүнг хянаж тайлбарлах',
  businessPasoCampana: 'Кампанит ажлыг зохиох',
  businessPasoImagenCampana: 'Кампанит ажлын зургийг бүтээх',
  businessPasoPresentacion: 'Илтгэлийг бичих (слайд бүрээр)',
  businessPasoMercado: 'Таны зах зээлийн өнөөгийн байдлыг судлах',
  businessPasoIdeas: 'Санаа, стратеги санал болгох',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: '{{fechas}} гурван чиглэл санал болгоно. Таны хайж буй зүйл: {{busca}}. Сонгосон чиглэлээр тань аяллыг бүхэлд нь бэлдэнэ.',
  travelExplicaDestinosDias_one: 'Гурван чиглэл санал болгоно ({{contador}} өдөр · {{lasNoches}}). Таны хайж буй зүйл: {{busca}}. Сонгосон чиглэлээр тань аяллыг бүхэлд нь бэлдэнэ.',
  travelExplicaDestinosDias_other: 'Гурван чиглэл санал болгоно ({{contador}} өдөр · {{lasNoches}}). Таны хайж буй зүйл: {{busca}}. Сонгосон чиглэлээр тань аяллыг бүхэлд нь бэлдэнэ.',
  travelExplicaDestinosDiasAviso_one: 'Гурван чиглэл санал болгоно ({{contador}} өдөр · {{lasNoches}}). Таны хайж буй зүйл: {{busca}}. Сонгосон чиглэлээр тань аяллыг бүхэлд нь бэлдэнэ. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя.',
  travelExplicaDestinosDiasAviso_other: 'Гурван чиглэл санал болгоно ({{contador}} өдөр · {{lasNoches}}). Таны хайж буй зүйл: {{busca}}. Сонгосон чиглэлээр тань аяллыг бүхэлд нь бэлдэнэ. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя.',
  travelExplicaDestinosTuViaje: 'Таны аялалд гурван чиглэл санал болгоно. Таны хайж буй зүйл: {{busca}}. Сонгосон чиглэлээр тань аяллыг бүхэлд нь бэлдэнэ.',
  travelExplicaDestinosTuViajeAviso: 'Таны аялалд гурван чиглэл санал болгоно. Таны хайж буй зүйл: {{busca}}. Сонгосон чиглэлээр тань аяллыг бүхэлд нь бэлдэнэ. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя.',

  travelBuscaSorpresa: 'гэнэтийн сонирхолтой зүйл',

  travelExplicaItinerarioFechas_one: '{{fechas}} аяллын маршрутыг ({{contador}} өдөр · {{lasNoches}}) өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ.',
  travelExplicaItinerarioFechas_other: '{{fechas}} аяллын маршрутыг ({{contador}} өдөр · {{lasNoches}}) өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ.',
  travelExplicaItinerarioDias_one: 'Аяллын маршрутыг ({{contador}} өдөр · {{lasNoches}}) өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ.',
  travelExplicaItinerarioDias_other: 'Аяллын маршрутыг ({{contador}} өдөр · {{lasNoches}}) өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ.',
  travelExplicaItinerarioDiasAviso_one: 'Аяллын маршрутыг ({{contador}} өдөр · {{lasNoches}}) өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя.',
  travelExplicaItinerarioDiasAviso_other: 'Аяллын маршрутыг ({{contador}} өдөр · {{lasNoches}}) өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя.',
  travelExplicaItinerarioTuViaje: 'Таны аяллын маршрутыг өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ.',
  travelExplicaItinerarioTuViajeAviso: 'Таны аяллын маршрутыг өдөр бүрээр, ойролцоо төсөвтэй нь бэлдэнэ. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя.',

  travelExplicaQueHacer: 'Юу үзэх нь зүйтэй, хаана хооллохыг хайж, шалгаж болохоор тус бүрийн эх сурвалжийг өгнө.',
  travelExplicaMoverse: 'Зорчих аргуудыг хайж, ойролцоогоор хэр удаж, хэр их зардал гарахыг нь хэлнэ.',

  travelLasNoches_one: '{{contador}} шөнө',
  travelLasNoches_other: '{{contador}} шөнө',

  travelDecisionTresViajes: 'бие биеэсээ ялгаатай гурван аялал санал болгоно',
  travelDecisionTresViajesAviso: 'бие биеэсээ ялгаатай гурван аялал санал болгоно. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя',
  travelDecisionReparto: 'өдрүүдийг хамгийн сайхан зүйлсийн хооронд хуваарилна',
  travelDecisionRepartoAviso: 'өдрүүдийг хамгийн сайхан зүйлсийн хооронд хуваарилна. Огноогоо мэдсэн үедээ хэлээрэй, улиралд нь тааруулъя',

  travelPasoDestinos: 'Тохирох гурван чиглэл хайх',
  travelPasoQueHacer: 'Юу үзэх нь зүйтэй, хаана хооллохыг хайх',
  travelPasoMoverse: 'Хэрхэн зорчихыг хайх',
  travelPasoItinerario_one: '{{contador}} өдрийн маршрут бэлдэх',
  travelPasoItinerario_other: '{{contador}} өдрийн маршрут бэлдэх',
  travelPasoItinerarioTuViaje: 'Таны аяллын маршрутыг бэлдэх',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Танд юу хэрэгтэйг сайн ойлгож, тодорхой хариулт, дараагийн алхмуудыг бэлдэнэ.',
  brainDecisionPuntoDePartida: 'эхлэх цэг санал болгоод, шаардлагатай бол Weë-ийн тохирох мэргэжилтэн рүү хөтөлнө',
  brainPasoEntender: 'Танд юу хэрэгтэйг сайн ойлгох',
  brainPasoRespuesta: 'Тодорхой хариулт, дараагийн алхмуудыг бэлдэх',
};
