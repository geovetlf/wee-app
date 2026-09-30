/*
 * TURCO — ËContact y ẄContact: las conexiones de Weë y sus solicitudes. Los dos nombres son marca
 * —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ËContact y ẄContact no admiten ningún sufijo (guía § 9): el caso lo lleva «liste» —«{{lista}}
 * listen», «{{lista}} listende», «{{lista}} listenden»—. El código pasa a veces el nombre con una
 * «s» de plural (ËContacts); con «liste» detrás se lee igual. Una solicitud es «istek»; aceptar,
 * «kabul et»; rechazar, «reddet»; retirar, «geri çek».
 *
 * `{{nombre}}` tampoco lleva sufijo. Las etiquetas de los botones de icono (solo las oye el lector
 * de pantalla) van como etiqueta y valor: «Kabul et: {{nombre}}». Las tres confirmaciones ponen el
 * nombre de sujeto, al principio, o delante de «ile», que no cambia con la palabra. En el perfil de
 * otra persona, si su nombre aún no ha cargado, el hueco se rellena con `somePerson`: por eso es
 * «Bu kişi», con mayúscula, porque siempre abre la frase. `wantsToConnect` recibe la cara de la
 * persona (Gerçek profil / Weë profili), no el nombre de la agenda. La cuenta se dice en personas y
 * las dos formas llevan su cifra: «{{lista}} listende {{contador}} kişi».
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Gelen istekler',
  requestsSent: 'Gönderilen istekler',
  yours: '{{lista}} listen',
  yoursWhenYouSignIn: 'Giriş yaptığında {{lista}} listen burada olacak',
  yoursWhenYouSignInSubtitle: '{{lista}} listen, Weë\'deki bağlantılarını tutar. Görmek için giriş yap.',
  noneYet: '{{lista}} listen henüz boş',
  noneYetSubtitle: 'Weë\'deki insanların burada görünecek. Bağlantı iki kişi arasında kurulur: biri istek gönderir, diğeri kabul eder.',
  noAgenda: 'Bu profilin kişi listesi yok',
  noAgendaSubtitle: 'Diğer insanlarla bağlantıların {{lista}} listende durur. Görmek için Gerçek profiline ya da Weë profiline geç.',
  wantsToConnect: '{{lista}} · seninle bağlantı kurmak istiyor',
  accept: 'Kabul et: {{nombre}}',
  reject: 'Reddet: {{nombre}}',
  withdraw: 'İsteği geri çek: {{nombre}}',
  removeFrom: '{{lista}} listenden çıkar: {{nombre}}',
  openProfile: 'Profili aç: {{nombre}} ({{etiqueta}})',
  rejectTitle: 'İsteği reddet',
  rejectConfirm: '{{nombre}} ile bağlantı isteği reddedilsin mi?',
  withdrawTitle: 'İsteği geri çek',
  withdrawConfirm: '{{nombre}} ile bağlantı isteğin geri çekilsin mi?',
  removeTitle: '{{lista}} listenden çıkar',
  removeConfirm: '{{nombre}}, {{lista}} listenden çıkarılsın mı?',
  failed: 'İşlem tamamlanamadı',
  count_one: '{{lista}} listende {{contador}} kişi',
  count_other: '{{lista}} listende {{contador}} kişi',
  somePerson: 'Bu kişi',
  acceptLabel: '{{lista}} isteğini kabul et',
  rejectRequestLabel: '{{lista}} isteğini reddet',
  requestSent: 'İstek gönderildi',
  errSignIn: 'ËContact kullanmak için giriş yap.',
  errNotYours: 'Bu profil senin değil.',
  errNotAPerson: 'Bu profilde ËContact kullanılamaz.',
  errOffline: 'Weë\'ye bağlanılamadı.',
  errNoRequestToReject: 'Reddedilecek bir istek yok.',
  errNoPendingRequest: 'Bu profille bekleyen bir isteğin yok.',
  errNotConnected: 'Bu profille bağlantın yok.',
  errNoActiveProfile: 'Bunu yapabileceğin aktif bir profil yok.',
};
