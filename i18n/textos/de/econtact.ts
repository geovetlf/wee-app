/*
 * ALEMÁN — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). `{{lista}}` es el nombre de la agenda y `{{nombre}}`
 * el de una persona: las frases están escritas para que el hueco caiga donde el
 * alemán lo pide, sin pegar cadenas.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Erhaltene Anfragen',
  requestsSent: 'Gesendete Anfragen',
  yours: 'Deine {{lista}}',
  yoursWhenYouSignIn: 'Deine {{lista}}, sobald du dich anmeldest',
  yoursWhenYouSignInSubtitle: '{{lista}} bewahrt deine Verbindungen auf Weë auf. Melde dich an, um sie zu sehen.',
  noneYet: 'Du hast noch keine {{lista}}',
  noneYetSubtitle: 'Hier stehen deine Leute auf Weë. Eine Verbindung entsteht zu zweit: Eine Person schlägt sie vor, die andere nimmt sie an.',
  noAgenda: 'Dieses Profil hat keine Kontaktliste',
  noAgendaSubtitle: 'In {{lista}} stehen deine Verbindungen zu anderen Menschen. Wechsle zu deinem Realen Profil oder deinem Weë Profil, um sie zu sehen.',
  wantsToConnect: '{{lista}} · möchte sich mit dir verbinden',
  accept: '{{nombre}} annehmen',
  reject: '{{nombre}} ablehnen',
  withdraw: 'Deine Anfrage an {{nombre}} zurückziehen',
  removeFrom: '{{nombre}} aus deinen {{lista}} entfernen',
  openProfile: '{{etiqueta}} von {{nombre}} öffnen',
  rejectTitle: 'Anfrage ablehnen',
  rejectConfirm: 'Anfrage von {{nombre}} ablehnen?',
  withdrawTitle: 'Anfrage zurückziehen',
  withdrawConfirm: 'Deine Anfrage an {{nombre}} zurückziehen?',
  removeTitle: '{{lista}} entfernen',
  removeConfirm: '{{nombre}} aus deinen {{lista}} entfernen?',
  failed: 'Das hat nicht geklappt',
  count_one: '1 {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'diese Person',
  acceptLabel: '{{lista}} annehmen',
  rejectRequestLabel: '{{lista}}-Anfrage ablehnen',
  requestSent: 'Anfrage gesendet',
};
