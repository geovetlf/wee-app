/*
 * MONGOL — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = УСТГАХ, el «Устгах» del botón «Eliminar» (common.delete) en mayúsculas.
 * Las terminaciones de caso van con guion tras la marca (Weë AI-д), nunca pegadas a un {{hueco}}.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Бүртгэл устгах',
  sectionDanger: 'Аюултай бүс',
  title: 'Бүртгэл устгах',
  goesFaces: 'Таны бүх профайл: Бодит профайл ба таны өөр дүрүүд',
  goesCharacter: 'Таны дүр болон түүний аватар',
  goesPosts: 'Таны нийтлэл, сэтгэгдэл, хариу үйлдэл',
  goesMessages: 'WeeTalk дээрх таны мессежүүд: хоосорч, нөгөө хүний харилцан яриа тэдгүйгээр үлдэнэ',
  goesCreations: 'Weë AI дээрх таны бүтээл, төсөл, яриа',
  goesContacts: 'Таны харилцагчид, нийгэмлэгүүд, хадгалсан зүйлс',
  goesCredits: 'Үлдсэн Credits: алга болж, буцаан олгогдохгүй',
  whatStaysTitle: 'Юу хадгалагдах вэ',
  staysRecords: 'Credits болон төлбөрийн нягтлан бодох бүртгэл. Эдгээр нь Weë-ийн нягтлан бодох бүртгэл тул таны нэр, профайлын мэдээлэлгүйгээр хадгалагдана.',
  confirmLabel: 'Баталгаажуулахын тулд «{{palabra}}» гэж бичнэ үү',
  confirmWord: 'УСТГАХ',
  confirmPlaceholder: 'Үгээ энд бичнэ үү',
  dialogTitle: 'Бүртгэлээ устгах уу?',
  dialogConfirm: 'Устгах',
  doneTitle: 'Таны бүртгэл устлаа',
  doneBody: 'Weë-ийн нэг хэсэг байсанд баярлалаа.',
  reauthTitle: 'Дахин нэвтэрнэ үү',
  reauthBody: 'Аюулгүй байдлын үүднээс бүртгэлээ устгахын тулд саяхан нэвтэрсэн байх шаардлагатай. Гараад, дахин нэвтэрч, эдгээр алхмыг давтана уу.',
  reauthButton: 'Дахин нэвтрэхийн тулд гарах',
  errorTitle: 'Дуусгаж чадсангүй',
  errorBody: 'Явцын дунд алдаа гарлаа. Дахин оролдоно уу: зогссон газраасаа үргэлжилнэ.',
  retry: 'Дахин оролдох',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Идэвхгүй болж, 30 хоногийн дараа бүх зүйл устана',
  introDesactivar: 'Таны бүртгэл одоо идэвхгүй болох бөгөөд 30 хоногийн дотор эргэж ирэхгүй бол бүх зүйл бүрмөсөн устана.',
  nowTitle: 'Одоо юу болох вэ',
  nowHidden: 'Таны бүртгэл харагдахаа болино: хэн ч таны профайл, нийтлэлийг харахгүй',
  nowCharacterOff: 'Таны дүрийн бие даалт унтарч, төлбөр тооцохоо болино',
  nowComeBack_one: 'Эргэж ирэхэд танд {{contador}} хоног байна: дахин нэвтэрч, «Бүртгэл идэвхжүүлэх» гэснийг сонгоно уу',
  nowComeBack_other: 'Эргэж ирэхэд танд {{contador}} хоног байна: дахин нэвтэрч, «Бүртгэл идэвхжүүлэх» гэснийг сонгоно уу',
  whatGoesLaterTitle: 'Эргэж ирэхгүй бол юу устах вэ',
  deactivateButton: 'Бүртгэлээ устгах',
  dialogBodyDesactivar: 'Таны бүртгэл харагдахаа болино. 30 хоногийн дотор эргэж ирэхгүй бол бүх зүйл устах бөгөөд сэргээх боломжгүй.',
  deactivating: 'Таны бүртгэлийг идэвхгүй болгож байна…',
  deactivatedTitle: 'Таны бүртгэл идэвхгүй байна',
  deactivatedBody: 'Эргэж ирэх эцсийн хугацаа: {{fecha}}. Үүний дараа бүх зүйл бүрмөсөн устана.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Таны бүртгэл идэвхгүй байна',
  activarBody: 'Та бүртгэлээ устгахыг хүссэн. Идэвхгүй байх хугацаанд хэн ч таны профайл, нийтлэлийг харахгүй.',
  activarDaysLeft_one: 'Бүрмөсөн устах хүртэл {{contador}} хоног үлдлээ',
  activarDaysLeft_other: 'Бүрмөсөн устах хүртэл {{contador}} хоног үлдлээ',
  activarDate: 'Идэвхжүүлэхгүй бол бүрмөсөн устах өдөр: {{fecha}}.',
  activarCharacterNote: 'Таны дүрийн бие даалт унтраастай хэвээр байна; хүссэн үедээ дахин төлөвлөж болно.',
  activarButton: 'Бүртгэл идэвхжүүлэх',
  activating: 'Таны бүртгэлийг идэвхжүүлж байна…',
  activatedTitle: 'Таны бүртгэл дахин идэвхтэй боллоо',
  activarExpiredTitle: 'Эргэж ирэх хугацаа дууслаа',
  activarExpiredBody: 'Таны бүртгэл ойрын хэдэн цагт бүрэн устана.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Үлдсэн {{creditos}} Credits: алга болж, буцаан олгогдохгүй',
};
