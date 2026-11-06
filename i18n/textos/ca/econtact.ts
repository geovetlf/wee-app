/*
 * CATALÁN — ËContact y ẄContact. Los dos nombres son marca —entran por `{{lista}}`— y no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El catalán tiene singular y plural, pero la marca es invariable y el número lo pone la cifra:
 * por eso `count_one` lleva `{{contador}}` y no un 1 escrito a mano.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Sol·licituds rebudes',
  requestsSent: 'Sol·licituds enviades',
  yours: 'Els teus {{lista}}',
  yoursWhenYouSignIn: 'Els teus {{lista}}, quan entris',
  yoursWhenYouSignInSubtitle: '{{lista}} desa les teves connexions de Weë. Inicia la sessió per veure-les.',
  noneYet: 'Encara no tens {{lista}}',
  noneYetSubtitle: 'Aquí hi haurà la teva gent a Weë. Una connexió es fa entre dos: una persona la proposa i l\'altra l\'accepta.',
  noAgenda: 'Aquest perfil no té agenda',
  noAgendaSubtitle: '{{lista}} és on hi ha les teves connexions amb altres persones. Canvia al teu Perfil real o al teu Perfil Weë per veure-les.',
  wantsToConnect: '{{lista}} · vol connectar amb tu',
  accept: 'Accepta {{nombre}}',
  reject: 'Rebutja {{nombre}}',
  withdraw: 'Retira la sol·licitud a {{nombre}}',
  removeFrom: 'Elimina {{nombre}} dels teus {{lista}}',
  openProfile: '{{nombre}}: obre el {{etiqueta}}',
  rejectTitle: 'Rebutja la sol·licitud',
  rejectConfirm: '{{nombre}}: vols rebutjar la sol·licitud?',
  withdrawTitle: 'Retira la sol·licitud',
  withdrawConfirm: 'Vols retirar la sol·licitud a {{nombre}}?',
  removeTitle: 'Elimina {{lista}}',
  removeConfirm: 'Vols eliminar {{nombre}} dels teus {{lista}}?',
  failed: 'No s\'ha pogut completar',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'aquesta persona',
  acceptLabel: 'Accepta {{lista}}',
  rejectRequestLabel: 'Rebutja la sol·licitud d\'{{lista}}',
  requestSent: 'Sol·licitud enviada',
  errSignIn: 'Inicia la sessió per fer servir ËContact.',
  errNotYours: 'Aquest perfil no és teu.',
  errNotAPerson: 'Aquest perfil no pot fer servir ËContact.',
  errSameProfile: 'Un perfil no es pot connectar amb si mateix.',
  errOffline: 'No s\'ha pogut connectar amb Weë.',
  errNoRequestToReject: 'No hi ha cap sol·licitud teva per rebutjar.',
  errNoPendingRequest: 'No tens cap sol·licitud pendent amb aquest perfil.',
  errNotConnected: 'No estàs connectat amb aquest perfil.',
  errNoActiveProfile: 'No hi ha cap perfil actiu amb què fer això.',
};
