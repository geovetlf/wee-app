/*
 * DANÉS — ËContact y ẄContact: las conexiones de Weë y sus solicitudes. Los dos nombres son marca
 * —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ËContact y ẄContact no se declinan nunca (ni forma definida ni genitivo): la frase lleva una
 * preposición («i ËContact», «fra dine ËContacts») o un compuesto con guion («ËContact-anmodning»,
 * guía § 3). El código pasa `{{lista}}` a veces con una «s» de plural que pone él (ËContacts): esas
 * frases lo tratan como un plural («dine {{lista}}», «Ingen {{lista}} endnu»), que es como se lee;
 * ninguna le pega nada. `wantsToConnect` y `openProfile` no reciben la agenda sino la CARA de la
 * persona —«Ægte profil» o «Weë-profil»—, así que `openProfile` la pone entre paréntesis en vez de
 * declinarla. Una solicitud es «anmodning»; aceptar, rechazar y retirar, «Accepter» / «Afvis» /
 * «Træk tilbage» (glosario § 9.6). Una conexión es «forbindelse», como en LinkedIn; «quiere
 * conectar contigo» es «vil gerne i kontakt med dig». Quitar a alguien de la lista no destruye
 * nada: es «Fjern» (como «Fjern blokering»), no «Slet». `{{nombre}}` no lleva nada pegado: va de
 * objeto o detrás de «fra» / «til». Si el nombre aún no ha cargado, el hueco se rellena con
 * `somePerson`, que cae en mitad de la frase: por eso es «denne person», en minúscula. Las
 * etiquetas de los botones de icono (solo las oye el lector de pantalla) dicen la acción entera.
 * `count_one` usa {{contador}} y no un «1» escrito (guía § 6).
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Modtagne anmodninger',
  requestsSent: 'Sendte anmodninger',
  yours: 'Dine {{lista}}',
  yoursWhenYouSignIn: 'Dine {{lista}} vises, når du logger ind',
  yoursWhenYouSignInSubtitle: '{{lista}} samler dine forbindelser på Weë. Log ind for at se dem.',
  noneYet: 'Ingen {{lista}} endnu',
  noneYetSubtitle: 'Her samles dine forbindelser på Weë. En forbindelse kræver to: Den ene sender en anmodning, og den anden accepterer den.',
  noAgenda: 'Denne profil har ingen kontaktliste',
  noAgendaSubtitle: 'I {{lista}} finder du dine forbindelser til andre. Skift til din ægte profil eller din Weë-profil for at se dem.',
  wantsToConnect: '{{lista}} · vil gerne i kontakt med dig',
  accept: 'Accepter anmodning fra {{nombre}}',
  reject: 'Afvis anmodning fra {{nombre}}',
  withdraw: 'Træk din anmodning til {{nombre}} tilbage',
  removeFrom: 'Fjern {{nombre}} fra dine {{lista}}',
  openProfile: 'Åbn profilen for {{nombre}} ({{etiqueta}})',
  rejectTitle: 'Afvis anmodning',
  rejectConfirm: 'Vil du afvise anmodningen fra {{nombre}}?',
  withdrawTitle: 'Træk anmodning tilbage',
  withdrawConfirm: 'Vil du trække din anmodning til {{nombre}} tilbage?',
  removeTitle: 'Fjern fra {{lista}}',
  removeConfirm: 'Vil du fjerne {{nombre}} fra dine {{lista}}?',
  failed: 'Handlingen kunne ikke gennemføres',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'denne person',
  acceptLabel: 'Accepter {{lista}}',
  rejectRequestLabel: 'Afvis {{lista}}-anmodning',
  requestSent: 'Anmodning sendt',
  errSignIn: 'Log ind for at bruge ËContact.',
  errNotYours: 'Den profil er ikke din.',
  errNotAPerson: 'Den profil kan ikke bruge ËContact.',
  errSameProfile: 'En profil kan ikke oprette forbindelse til sig selv.',
  errOffline: 'Der kunne ikke oprettes forbindelse til Weë. Prøv igen.',
  errNoRequestToReject: 'Der er ingen anmodning at afvise.',
  errNoPendingRequest: 'Du har ingen ventende anmodning til denne profil.',
  errNotConnected: 'Du er ikke forbundet med denne profil.',
  errNoActiveProfile: 'Der er ingen aktiv profil at gøre det med.',
};
