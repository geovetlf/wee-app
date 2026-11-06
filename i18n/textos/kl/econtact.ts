/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — ËContact y ẄContact.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Los dos nombres son marca y entran por {{lista}}: van aislados tras «·» o
 * dos puntos, o como sujeto en absolutivo, nunca con sufijo. Contacto = «attaveqat»
 * (pl. «attaveqatit»), solicitud = «qinnut». {{nombre}} va aislado tras dos puntos.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Qinnutit tigusat',
  requestsSent: 'Qinnutit nassiussat',
  yours: 'Attaveqatitit · {{lista}}',
  yoursWhenYouSignIn: 'Attaveqatitit · {{lista}}, iseruit',
  yoursWhenYouSignInSubtitle: '{{lista}} Weë atorlugu attaveqatinnik toqqorsisarpoq. Takuniarukkit iserit.',
  noneYet: 'Suli attaveqateqanngilatit · {{lista}}',
  noneYetSubtitle: 'Maani inuttit takussaassapput. Attaveqatigiinneq inunnit marlunnit pilersinneqartarpoq: ataaseq siunnersuuteqartarpoq, aappaalu akuersisarluni.',
  noAgenda: 'Profili una allattuiveqanngilaq',
  noAgendaSubtitle: '{{lista}}: tassani attaveqatitit inuit allat takussaapput. Takuniarukkit Profili piviusoq imaluunniit Profili Weë atoruk.',
  wantsToConnect: '{{lista}} · ilinnut attaveqalerusuppoq',
  accept: 'Akueriuk: {{nombre}}',
  reject: 'Itigartiguk: {{nombre}}',
  withdraw: 'Qinnut utertiguk: {{nombre}}',
  removeFrom: 'Attaveqatinnit peeruk: {{nombre}} · {{lista}}',
  openProfile: 'Ammaruk: {{etiqueta}} · {{nombre}}',
  rejectTitle: 'Qinnut itigartiguk',
  rejectConfirm: 'Qinnut itigarniarpiuk? Qinnuteqartoq: {{nombre}}',
  withdrawTitle: 'Qinnut utertiguk',
  withdrawConfirm: 'Qinnutit utertinniarpiuk? Qinnuteqarfigisat: {{nombre}}',
  removeTitle: 'Peeruk · {{lista}}',
  removeConfirm: '{{lista}}: {{nombre}} attaveqatinnit peerniarpiuk?',
  failed: 'Naammassineqarsinnaanngilaq',
  count_one: '{{contador}} attaveqat · {{lista}}',
  count_other: '{{contador}} attaveqatit · {{lista}}',
  somePerson: 'inuk una',
  acceptLabel: 'Akueriuk · {{lista}}',
  rejectRequestLabel: 'Qinnut itigartiguk · {{lista}}',
  requestSent: 'Qinnut nassiunneqarpoq',
  errSignIn: 'ËContact atorniarukku iserit.',
  errNotYours: 'Profili taanna pigisarinngilat.',
  errNotAPerson: 'Profili taassuma ËContact atorsinnaanngilaa.',
  errSameProfile: 'Profili nammineq imminut attaveqarsinnaanngilaq.',
  errOffline: 'Weë attavigineqarsinnaanngilaq.',
  errNoRequestToReject: 'Qinnummik itigartitassamik peqanngilaq.',
  errNoPendingRequest: 'Profilimut matumunnga qinnummik utaqqisumik peqanngilatit.',
  errNotConnected: 'Profilimut matumunnga attaveqanngilatit.',
  errNoActiveProfile: 'Profilimik atorneqartumik peqanngilaq.',
};
