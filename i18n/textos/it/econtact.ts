/*
 * ITALIANO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). `{{lista}}` es el nombre de la agenda y `{{nombre}}`
 * el de una persona: las frases están escritas para que el hueco caiga donde el
 * italiano lo pide, sin pegar cadenas. En italiano el cero cae en la forma
 * plural, igual que en español, así que `count_one` es solo el 1.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Richieste ricevute',
  requestsSent: 'Richieste inviate',
  yours: 'I tuoi {{lista}}',
  yoursWhenYouSignIn: 'I tuoi {{lista}}, quando accedi',
  yoursWhenYouSignInSubtitle: '{{lista}} custodisce le tue connessioni su Weë. Accedi per vederle.',
  noneYet: 'Non hai ancora {{lista}}',
  noneYetSubtitle: 'Qui ci sarà la tua gente su Weë. Una connessione si fa in due: una persona la propone e l’altra accetta.',
  noAgenda: 'Questo profilo non ha una rubrica',
  noAgendaSubtitle: '{{lista}} è il posto dove vivono le tue connessioni con altre persone. Passa al tuo Profilo Reale o al tuo Profilo Weë per vederle.',
  wantsToConnect: '{{lista}} · vuole connettersi con te',
  accept: 'Accetta {{nombre}}',
  reject: 'Rifiuta {{nombre}}',
  withdraw: 'Ritira la richiesta a {{nombre}}',
  removeFrom: 'Rimuovi {{nombre}} dai tuoi {{lista}}',
  openProfile: 'Apri il {{etiqueta}} di {{nombre}}',
  rejectTitle: 'Rifiuta la richiesta',
  rejectConfirm: 'Vuoi rifiutare la richiesta di {{nombre}}?',
  withdrawTitle: 'Ritira la richiesta',
  withdrawConfirm: 'Vuoi ritirare la tua richiesta a {{nombre}}?',
  removeTitle: 'Rimuovi {{lista}}',
  removeConfirm: 'Vuoi rimuovere {{nombre}} dai tuoi {{lista}}?',
  failed: 'Non è stato possibile completare',
  count_one: '1 {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'questa persona',
  acceptLabel: 'Accetta {{lista}}',
  rejectRequestLabel: 'Rifiuta la richiesta {{lista}}',
  requestSent: 'Richiesta inviata',
};
