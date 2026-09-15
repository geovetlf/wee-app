/*
 * ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Requests received',
  requestsSent: 'Requests sent',
  yours: 'Your {{lista}}',
  yoursWhenYouSignIn: 'Your {{lista}}, once you sign in',
  noneYet: 'You do not have any {{lista}} yet',
  noAgenda: 'This profile has no contact list',
  wantsToConnect: '{{lista}} · wants to connect with you',
  accept: 'Accept {{nombre}}',
  reject: 'Decline {{nombre}}',
  withdraw: 'Withdraw your request to {{nombre}}',
  removeFrom: 'Remove {{nombre}} from your {{lista}}',
  openProfile: 'Open {{nombre}}’s {{etiqueta}}',
  rejectTitle: 'Decline request',
  rejectConfirm: 'Decline {{nombre}}’s request?',
  withdrawTitle: 'Withdraw request',
  withdrawConfirm: 'Withdraw your request to {{nombre}}?',
  removeTitle: 'Remove {{lista}}',
  removeConfirm: 'Remove {{nombre}} from your {{lista}}?',
  failed: 'That did not work',
  count_one: '1 {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'this person',
  acceptLabel: 'Accept {{lista}}',
  rejectRequestLabel: 'Decline {{lista}} request',
  requestSent: 'Request sent',
};
