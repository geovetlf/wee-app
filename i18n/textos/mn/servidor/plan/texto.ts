/*
 * MONGOL — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}` va delante de «хэл рүү» («англи хэл рүү»). `{{tono}}`, `{{estilo}}`, `{{animo}}` y `{{voz}}` son adjetivos
 * delante de su nombre y no se declinan. `{{cambio}}` y `{{ocasion}}` son nombres: van detrás de dos puntos.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Сэдвийн талаар бодит ишлэлүүд хайж, шалгаж болохоор тус бүрийн эх сурвалжийг өгнө.',
  writerPasoCitas: 'Ишлэл, тэдгээрийн эх сурвалжийг хайх',

  writerExplicaTraducir: 'Таны бичвэрийг утга, өнгө аясыг нь хадгалан {{idioma}} хэл рүү орчуулна.',
  writerPasoTraducir: '{{idioma}} хэл рүү орчуулах',
  writerDecisionIdiomaIngles: 'англи хэл рүү орчуулна',
  writerIdiomaEn: 'англи',
  writerIdiomaPt: 'португал',
  writerIdiomaFr: 'франц',
  writerIdiomaIt: 'итали',

  writerExplicaResumir: 'Таны бичвэрийг гол санаануудаар нь цөөн мөрөнд хураангуйлна.',
  writerPasoResumir: 'Гол санаануудаар хураангуйлах',
  writerExplicaCorregir: 'Таны хэлэх гэснийг өөрчлөхгүйгээр зөв бичгийн дүрэм, найруулга, тодорхой байдлыг засна.',
  writerPasoCorregir: 'Зөв бичгийн дүрэм, найруулга, тодорхой байдлыг засах',
  writerExplicaIdeas: 'Саадгүй бичихэд тань туслах хэд хэдэн санаа, эхлэх цэгийг санал болгоно.',
  writerPasoIdeas: 'Бичих санаа санал болгох',

  writerExplicaPortada: 'Хавтасны үзэл баримтлалыг тодорхойлж, сонгоход тань гурван санал бэлдэнэ.',
  writerPasoConceptoPortada: 'Хавтасны үзэл баримтлалыг тодорхойлох',
  writerPasoPropuestasPortada: 'Хавтасны 3 санал бэлдэх',

  writerExplicaReescribir: 'Таны бичвэрийг санааг нь хадгалан {{tono}} өнгө аясаар дахин бичнэ.',
  writerPasoReescribir: 'Бичвэрийг дахин бичих',
  writerExplicaCv: 'Таны CV-г {{tono}} өнгө аясаар бичиж, засварлаад илгээхэд бэлэн болгоно.',
  writerPasoCv: 'Таны CV-г бичих',

  writerExplicaPublicacion: 'Нийтлэлийг {{tono}} өнгө аясаар бичээд, дараа нь өнгөлж бэлэн болгоно.',
  writerExplicaHistoria: 'Түүхийг {{tono}} өнгө аясаар бичээд, дараа нь өнгөлж бэлэн болгоно.',
  writerExplicaGuion: 'Зохиолыг {{tono}} өнгө аясаар бичээд, дараа нь өнгөлж бэлэн болгоно.',
  writerExplicaArticulo: 'Өгүүллийг {{tono}} өнгө аясаар бичээд, дараа нь өнгөлж бэлэн болгоно.',
  writerExplicaEmail: 'Имэйлийг {{tono}} өнгө аясаар бичээд, дараа нь өнгөлж бэлэн болгоно.',
  writerExplicaDocumento: 'Баримт бичгийг {{tono}} өнгө аясаар боловсруулаад, дараа нь өнгөлж бэлэн болгоно.',
  writerPasoPublicacion: 'Нийтлэл бичих',
  writerPasoHistoria: 'Түүх бичих',
  writerPasoGuion: 'Зохиол бичих',
  writerPasoArticulo: 'Өгүүлэл бичих',
  writerPasoEmail: 'Имэйл бичих',
  writerPasoDocumento: 'Баримт бичиг боловсруулах',
  writerPasoPulir: 'Бичвэрийг өнгөлж бэлэн болгох',

  writerDecisionEmpiezoPublicacion: 'нийтлэлээс эхэлнэ',
  writerDecisionTonoCercano: 'дотно өнгө аяс ашиглана',
  writerDecisionTonoProfesional: 'мэргэжлийн өнгө аяс ашиглана',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Бичвэрийг бэлдэж, {{voz}} дуу хоолойгоор бичнэ.',
  musicExplicaVozCalida: 'Бичвэрийг бэлдэж, дулаан, тод дуу хоолойгоор бичнэ.',
  musicPasoTextoNarracion: 'Өгүүлэмжийн бичвэрийг бэлдэх',
  musicPasoGrabarVoz: 'Дуу хоолойг бичих',

  musicExplicaLetra: '{{estilo}} хэв маягаар дууны үгийг бүтэн бичнэ.',
  musicPasoLetraCompleta: 'Дууны үгийг бүтэн бичих',

  musicExplicaMezcla: 'Дууг тань сонсож, мэргэжлийн түвшинд сонсогдохоор холиод мастеринг хийнэ.',
  musicPasoAnotarMezcla: 'Дууг тань сонсож, холилтын тэмдэглэл хийх',
  musicPasoMasterizar: 'Холих, мастеринг хийх',

  musicExplicaVideoclip: 'Дуу ({{estilo}}, {{animo}}), үзэгдлүүдийг бүтээж, таны клипийг бүрэн угсарна. Та Weë Music-ээс гарах шаардлагагүй.',
  musicPasoIdeaYLetra: 'Санаа, дууны үгийг бичих',
  musicPasoEscenas: 'Клипийн үзэгдлүүдийг бүтээх',
  musicPasoArmarVideoclip: 'Таны дуугаар клипийг угсрах',

  musicExplicaJingle: '{{estilo}} хэв маягтай, {{animo}} уур амьсгалтай, богино, сэтгэлд хоногшмоор жингл бүтээнэ.',
  musicPasoFraseJingle: 'Жинглийн хэллэгийг бичих',
  musicPasoJingle: 'Жингл бүтээх',
  musicExplicaBeat: '{{estilo}} хэв маягтай, {{animo}} уур амьсгалтай бийт бүтээнэ.',
  musicPasoIdeaMusical: 'Хөгжмийн санааг тодорхойлох',
  musicPasoBeat: 'Бийт бүтээх',

  musicExplicaCancion: 'Дууны үгийг бичиж, {{estilo}} хэв маягтай, {{animo}} уур амьсгалтай дуу бүтээгээд, хавтсыг нь зохион бүтээнэ.',
  musicPasoLetra: 'Дууны үг бичих',
  musicPasoCancion: 'Дуу бүтээх',
  musicPasoPortada: 'Хавтас зохион бүтээх',

  musicDecisionEmpiezoCancion: 'дуунаас эхэлнэ',
  musicDecisionEstiloPop: 'поп хэв маяг сонголоо',
  musicDecisionAnimoAlegre: 'баяр хөөртэй уур амьсгал сонголоо',
  musicDecisionVozCalida: 'дулаан, тод дуу хоолой сонголоо',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Таны зургийг харж, олоход хялбар бүтээгдэхүүнтэй энгийн арьс арчилгааны дэглэм гаргана.',
  beautyPasoRutina: 'Таны арчилгааны дэглэмийг гаргах',

  beautyExplicaRostro: 'Таны нүүрийг харж, хамгийн сайн тохирох үс засалт, хэв маягийг зөвлөөд, хоёрыг нь зураг дээр тань туршина.',
  beautyPasoMirarRostro: 'Таны нүүрийг харах',
  beautyPasoRecomendar: 'Үс засалт, нүдний шил, хэв маягийг зөвлөх',
  beautyPasoProbarDosEstilos: 'Танд хамгийн сайн тохирох хоёр хэв маягийг турших',

  beautyExplicaProbar: 'Хоёр хувилбараар туршина: {{cambio}}, тохиолдол: {{ocasion}}. Таны нүүр, арьс, зургийн гэрэл хэвээр үлдэнэ.',
  beautyPasoProbar: 'Нүүрийг тань хэвээр нь үлдээн турших: {{cambio}}',
  beautyOcasionElDiaADia: 'өдөр тутам',

  beautyDecisionCambioCompleto: 'бүрэн төрх өөрчлөлт санал болгоно',
  beautyDecisionOcasionDiaADia: 'өдөр тутамд зориулж бодлоо',
};
