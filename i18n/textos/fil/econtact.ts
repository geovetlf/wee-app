/*
 * FILIPINO — ËContact y ẄContact: las conexiones de Weë y sus solicitudes. Los dos nombres son marca
 * —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ËContact y ẄContact no llevan nada pegado (ni afijo, ni enlace, ni `mga` delante: el código ya les
 * pone una «s» de plural, `ËContacts`, y `mga ËContacts` sería un plural doble). La marca va con su
 * marcador de cosa o delante del sustantivo, como escribe Facebook en filipino: `sa {{lista}}`,
 * `{{lista}} mo`, `{{lista}} request` (guía § 6). Una solicitud es «request»; aceptar, rechazar y
 * retirar, «Tanggapin» / «Tanggihan» / «Bawiin»; quitar a alguien de la lista no destruye nada, así que
 * es «Alisin» y no «I-delete» (glosario § 11.2). Una conexión es «koneksyon».
 *
 * El nombre de la persona va con los marcadores de persona: `si {{nombre}}` (sujeto), `ni {{nombre}}`
 * (poseedor o agente) y `kay {{nombre}}` (a una persona), como en los casos difíciles del § 12. Las
 * confirmaciones van directas, como en el § 12 («Bawiin ang request mo kay {{nombre}}?»).
 * `wantsToConnect` y `openProfile` no reciben la agenda sino la CARA de la persona —«Tunay na profile» o
 * «Weë profile»—: `Buksan ang {{etiqueta}} ni {{nombre}}`.
 *
 * `somePerson` es «esta persona» cuando el perfil aún no tiene nombre: «taong ito». Detrás de `si/ni/kay`
 * no cabe —no admiten un sustantivo común («ni taong ito» es agramatical, § 12)—. Esta base no tiene frases
 * `<clave>SinNombre`, así que ese caso sigue pendiente: guía § 16, decisión 6.
 *
 * `count_one` usa {{contador}} y no el «1» del español (§ 8.3, regla 3): `_one` sale también para 0, 2,
 * 3, 5… y `_other` lleva el enlace `na` (`4 na ËContacts`). «Agenda» es «listahan ng contact».
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Mga natanggap na request',
  requestsSent: 'Mga naipadalang request',
  yours: '{{lista}} mo',
  yoursWhenYouSignIn: 'Makikita mo ang {{lista}} mo kapag nag-sign in ka',
  yoursWhenYouSignInSubtitle: 'Nasa {{lista}} ang mga koneksyon mo sa Weë. Mag-sign in para makita ang mga ito.',
  noneYet: 'Wala ka pang {{lista}}',
  noneYetSubtitle: 'Dito makikita ang mga kakilala mo sa Weë. Dalawa ang kailangan sa isang koneksyon: ang isa ang nagpapadala ng request, at ang isa naman ang tumatanggap.',
  noAgenda: 'Walang listahan ng contact ang profile na ito',
  noAgendaSubtitle: 'Nasa {{lista}} ang mga koneksyon mo sa ibang tao. Lumipat sa Tunay na profile mo o sa Weë profile mo para makita ang mga ito.',
  wantsToConnect: '{{lista}} · gustong kumonekta sa iyo',
  accept: 'Tanggapin ang request ni {{nombre}}',
  reject: 'Tanggihan ang request ni {{nombre}}',
  withdraw: 'Bawiin ang request mo kay {{nombre}}',
  removeFrom: 'Alisin si {{nombre}} sa {{lista}} mo',
  openProfile: 'Buksan ang {{etiqueta}} ni {{nombre}}',
  rejectTitle: 'Tanggihan ang request',
  rejectConfirm: 'Tanggihan ang request ni {{nombre}}?',
  withdrawTitle: 'Bawiin ang request',
  withdrawConfirm: 'Bawiin ang request mo kay {{nombre}}?',
  removeTitle: 'Alisin sa {{lista}}',
  removeConfirm: 'Alisin si {{nombre}} sa {{lista}} mo?',
  failed: 'Hindi natuloy',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} na {{lista}}',
  somePerson: 'taong ito',
  acceptLabel: 'Tanggapin sa {{lista}}',
  rejectRequestLabel: 'Tanggihan ang {{lista}} request',
  requestSent: 'Naipadala ang request',
  errSignIn: 'Mag-sign in para magamit ang ËContact.',
  errNotYours: 'Hindi sa iyo ang profile na iyan.',
  errNotAPerson: 'Hindi puwedeng gumamit ng ËContact ang profile na iyan.',
  errSameProfile: 'Hindi puwedeng kumonekta ang isang profile sa sarili nito.',
  errOffline: 'Hindi makakonekta sa Weë.',
  errNoRequestToReject: 'Wala kang request na tatanggihan.',
  errNoPendingRequest: 'Wala kang nakabinbing request sa profile na ito.',
  errNotConnected: 'Hindi ka konektado sa profile na ito.',
  errNoActiveProfile: 'Walang aktibong profile na magagamit para dito.',
};
