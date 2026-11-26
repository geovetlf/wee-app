/*
 * ISLANDÉS (is · is-IS) — ËContact y ẄContact (marca; cambian con el perfil activo y entran por {{lista}}).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Ni {{lista}} (marca) ni {{nombre}} (una persona) se declinan: van de sujeto, tras dos puntos o en
 * aposición tras un sustantivo islandés que sí se declina («tengiliðalistanum {{lista}}»).
 * «Beiðni» = solicitud; «Tenging» = conexión. El contador `_one` lleva {{contador}} y no un «1» escrito:
 * en islandés `one` cubre también 21, 31…
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Mótteknar beiðnir',
  requestsSent: 'Sendar beiðnir',
  yours: '{{lista}} – tengiliðirnir þínir',
  yoursWhenYouSignIn: '{{lista}} – tengiliðirnir þínir, þegar þú skráir þig inn',
  yoursWhenYouSignInSubtitle: '{{lista}} geymir tengingar þínar í Weë. Skráðu þig inn til að sjá þær.',
  noneYet: 'Engir tengiliðir enn í {{lista}}',
  noneYetSubtitle: 'Hér verður fólkið þitt í Weë. Tenging verður til milli tveggja: annar sendir beiðni og hinn samþykkir.',
  noAgenda: 'Þessi prófíll er ekki með tengiliðaskrá',
  noAgendaSubtitle: '{{lista}} er þar sem tengingar þínar við annað fólk eru. Skiptu yfir í Raunprófílinn eða Weë-prófílinn til að sjá þær.',
  wantsToConnect: '{{lista}} · vill tengjast þér',
  accept: 'Samþykkja: {{nombre}}',
  reject: 'Hafna: {{nombre}}',
  withdraw: 'Draga beiðni til baka: {{nombre}}',
  removeFrom: 'Fjarlægja úr {{lista}}: {{nombre}}',
  openProfile: 'Opna {{etiqueta}}: {{nombre}}',
  rejectTitle: 'Hafna beiðni',
  rejectConfirm: 'Hafna beiðninni? Frá: {{nombre}}',
  withdrawTitle: 'Draga beiðni til baka',
  withdrawConfirm: 'Draga beiðnina þína til baka? Til: {{nombre}}',
  removeTitle: 'Fjarlægja úr {{lista}}',
  removeConfirm: 'Fjarlægja úr {{lista}}? Tengiliður: {{nombre}}',
  failed: 'Ekki tókst að ljúka þessu',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'þessi manneskja',
  acceptLabel: 'Samþykkja {{lista}}',
  rejectRequestLabel: 'Hafna beiðni um {{lista}}',
  requestSent: 'Beiðni send',
  errSignIn: 'Skráðu þig inn til að nota ËContact.',
  errNotYours: 'Þessi prófíll er ekki þinn.',
  errNotAPerson: 'Þessi prófíll getur ekki notað ËContact.',
  errSameProfile: 'Prófíll getur ekki tengst sjálfum sér.',
  errOffline: 'Ekki náðist samband við Weë.',
  errNoRequestToReject: 'Það er engin beiðni frá þér til að hafna.',
  errNoPendingRequest: 'Þú átt enga opna beiðni við þennan prófíl.',
  errNotConnected: 'Engin tenging er á milli þín og þessa prófíls.',
  errNoActiveProfile: 'Enginn prófíll er virkur til að gera þetta.',
};
