/*
 * MONGOL — Mis creaciones: la biblioteca de material de la cuenta y el progreso de un
 * trabajo de Weë AI. Tipado contra el español.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Миний бүтээлүүд',
  intro: 'Weë AI ашиглан бүтээсэн бүх зүйл тань нэг дор. Энэ нь таны бүртгэлийнх: Бодит профайл болон Weë профайлаас адилхан харагдана.',

  /* Filtros por tipo. */
  filterAll: 'Бүгд',
  filterImages: 'Зураг',
  filterVideos: 'Видео',
  filterAudio: 'Аудио',
  filterDocuments: 'Баримт бичиг',
  filterModel3d: '3D',
  filterLabel: 'Төрлөөр шүүх',

  /* Orden. */
  sortRecent: 'Сүүлийн үеийн',
  sortOldest: 'Хамгийн хуучин',
  sortLabel: 'Эрэмбэлэх',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'Таны бүтээлүүдийг ачаалж байна…',
  loadFailed: 'Таны бүтээлүүдийг ачаалж чадсангүй.',
  retry: 'Дахин оролдох',
  loadMore: 'Цааш ачаалах',
  emptyTitle: 'Танд одоогоор бүтээл алга',
  emptyText: 'Weë AI ашиглан хийсэн бүх зүйл тань зураг, видео, аудионыхоо хамт энд гарч ирнэ.',
  emptyAction: 'Weë AI ашиглан ямар нэг зүйл бүтээх',
  emptyFiltered: 'Энэ төрлийн бүтээл алга.',
  count_one: '{{contador}} бүтээл',
  count_other: '{{contador}} бүтээл',

  /* Estados de una creación. */
  statusUploading: 'Байршуулж байна',
  statusProcessing: 'Боловсруулж байна',
  statusReady: 'Бэлэн',
  statusFailed: 'Амжилтгүй боллоо',
  statusDeleted: 'Устгагдсан',
  pendingDeletion: 'Файл удахгүй устгагдана.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Зураг',
  kindVideo: 'Видео',
  kindAudio: 'Аудио',
  kindDocument: 'Баримт бичиг',
  kindModel3d: '3D',
  kindText: 'Текст',

  /* Acciones sobre una creación. */
  open: 'Нээх',
  openCreation: 'Бүтээл нээх: {{nombre}}',
  download: 'Татаж авах',
  downloaded: 'Таны галерейд хадгалагдлаа.',
  downloadFailed: 'Татаж чадсангүй. Дахин оролдоно уу.',
  downloadPermission: 'Weë аппад галерейд хадгалах зөвшөөрөл хэрэгтэй.',
  savedInCreations: 'Таны бүтээлүүдэд хадгалагдлаа',
  save: 'Хадгалах',
  saved: 'Хадгалагдсан',
  useInProject: 'Төсөлд ашиглах',
  publish: 'Нийтлэх',
  share: 'Хуваалцах',
  delete: 'Устгах',
  deleteConfirm: 'Энэ бүтээлийг устгах уу? Файл устгагдана. Аль хэдийн нийтэлсэн зүйл тань өөрчлөгдөхгүй.',
  deleteConfirmWeb: 'Энэ бүтээлийг устгах уу? Файл устгагдана. Аль хэдийн нийтэлсэн зүйл тань өөрчлөгдөхгүй.',
  deleted: 'Бүтээл устгагдлаа.',
  deleteFailed: 'Устгаж чадсангүй. Дахин оролдоно уу.',
  createdWith: 'Бүтээхэд ашигласан: {{nombre}}',
  createdOn: 'Бүтээсэн огноо: {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} ажиллаж байна',
  progressStarting: 'Эхэлж байна…',
  progressSteps: '{{total}} алхмаас {{hechos}} нь бэлэн',
  progressFindLater: 'Та энэ дэлгэцээс гарч болно; бэлэн болмогц «Миний бүтээлүүд» хэсгээс олох болно.',

  /* Mundos 3D. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: '3D ертөнц',
  kindWorld: '3D ертөнц',
  noViewer3d: 'Weë аппад 3D үзүүлэгч одоогоор байхгүй. Татаж аваад 3D аппаар нээнэ үү.',
  rightsTitle: 'Үүгээр юу хийж болох вэ',
  rightsProvenance: 'Weë дээр хиймэл оюунаар, өөрийн гэсэн лицензтэй гуравдагч талын загвараар бүтээсэн.',
  rightsCommercialAllowed: 'Арилжааны зорилгоор ашиглаж болно.',
  rightsCommercialRestricted: 'Арилжааны зорилгоор ашиглахад нөхцөл бий.',
  rightsCommercialUnclear: 'Арилжааны зорилгоор ашиглаж болох эсэх нь одоогоор тодорхойгүй.',
  rightsCommercialNotAllowed: 'Арилжааны зорилгоор ашиглах боломжгүй.',
  rightsAttribution: 'Лиценз нь эх сурвалжийг дурдахыг шаарддаг.',
  rightsBlockedIn: 'Дараах газруудад ашиглах, үзүүлэх боломжгүй: {{lugares}}.',
};
