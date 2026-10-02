/*
 * SUECO — ËContact y ẄContact: las conexiones de Weë y sus solicitudes. Los dos nombres son marca
 * —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ËContact y ẄContact no se declinan nunca (ni forma definida ni genitivo): la frase lleva una
 * preposición («i ËContact», «från ËContact») o un compuesto con guion («ËContact-förfrågan»). El
 * código pasa `{{lista}}` a veces con una «s» de plural que pone él (ËContacts): esas frases lo
 * tratan como un plural («dina {{lista}}», «inga {{lista}}»), que es como se lee; ninguna le pega
 * nada. `wantsToConnect` y `openProfile` no reciben la agenda sino la CARA de la persona —«Riktig
 * profil» o «Weë-profil»—, así que `openProfile` la pone entre paréntesis, con el patrón de
 * etiqueta, en vez de declinarla. Una conexión es «kontakt» (glosario 9.1); una solicitud,
 * «förfrågan» (pl. förfrågningar); aceptar y rechazar, «Acceptera» / «Avböj», la pareja de las
 * invitaciones en sueco; retirar, «Dra tillbaka». `{{nombre}}` tampoco lleva nada pegado: va de
 * objeto o detrás de «från» / «till». En el perfil de otra persona, si su nombre aún no ha
 * cargado, el hueco se rellena con `somePerson`, que siempre cae en mitad de la frase: por eso es
 * «den här personen», en minúscula. Las etiquetas de los botones de icono (solo las oye el lector
 * de pantalla) dicen la acción entera: «Acceptera förfrågan från {{nombre}}».
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Mottagna förfrågningar',
  requestsSent: 'Skickade förfrågningar',
  yours: 'Dina {{lista}}',
  yoursWhenYouSignIn: 'Dina {{lista}} visas när du loggar in',
  yoursWhenYouSignInSubtitle: '{{lista}} samlar dina kontakter på Weë. Logga in för att se dem.',
  noneYet: 'Du har inga {{lista}} ännu',
  noneYetSubtitle: 'Här samlas dina kontakter på Weë. En kontakt kräver två: den ena skickar en förfrågan och den andra accepterar den.',
  noAgenda: 'Den här profilen har ingen kontaktlista',
  noAgendaSubtitle: 'I {{lista}} finns dina kontakter med andra personer. Om du vill se dem byter du till din riktiga profil eller din Weë-profil.',
  wantsToConnect: '{{lista}} · vill lägga till dig som kontakt',
  accept: 'Acceptera förfrågan från {{nombre}}',
  reject: 'Avböj förfrågan från {{nombre}}',
  withdraw: 'Dra tillbaka förfrågan till {{nombre}}',
  removeFrom: 'Ta bort {{nombre}} från dina {{lista}}',
  openProfile: 'Öppna profilen för {{nombre}} ({{etiqueta}})',
  rejectTitle: 'Avböj förfrågan',
  rejectConfirm: 'Vill du avböja förfrågan från {{nombre}}?',
  withdrawTitle: 'Dra tillbaka förfrågan',
  withdrawConfirm: 'Vill du dra tillbaka förfrågan till {{nombre}}?',
  removeTitle: 'Ta bort från {{lista}}',
  removeConfirm: 'Vill du ta bort {{nombre}} från dina {{lista}}?',
  failed: 'Det gick inte att slutföra',
  count_one: '1 {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'den här personen',
  acceptLabel: 'Acceptera {{lista}}',
  rejectRequestLabel: 'Avböj förfrågan i {{lista}}',
  requestSent: 'Förfrågan skickad',
  errSignIn: 'Logga in för att använda ËContact.',
  errNotYours: 'Den profilen är inte din.',
  errNotAPerson: 'Den profilen kan inte använda ËContact.',
  errSameProfile: 'En profil kan inte lägga till sig själv som kontakt.',
  errOffline: 'Det gick inte att ansluta till Weë.',
  errNoRequestToReject: 'Det finns ingen förfrågan att avböja.',
  errNoPendingRequest: 'Du har ingen väntande förfrågan till den här profilen.',
  errNotConnected: 'Den här profilen finns inte bland dina kontakter.',
  errNoActiveProfile: 'Det finns ingen aktiv profil att göra det här med.',
};
