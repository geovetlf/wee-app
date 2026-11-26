/*
 * FINÉS — ËContact y ẄContact. Tipado contra el español: si allí hay una clave
 * que aquí falta, no compila.
 *
 * Los dos nombres son marca —cambian con el perfil activo— y entran por
 * `{{lista}}` sin declinarse: cuando hace falta un caso se compone
 * («{{lista}}-yhteyksiä», «{{lista}}-pyyntö»). Los nombres de persona entran
 * en nominativo: como objeto de un imperativo o de un pasivo («Hyväksy
 * {{nombre}}», «Poistetaanko {{nombre}}») eso es lo correcto, y donde hace
 * falta otro caso lo lleva la palabra anterior («käyttäjältä {{nombre}}»,
 * «käyttäjän {{nombre}} {{etiqueta}}»). `count_one` escribe «{{contador}}
 * {{lista}}», nunca un «1» a mano.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Saapuneet pyynnöt',
  requestsSent: 'Lähetetyt pyynnöt',
  yours: 'Omat {{lista}}',
  yoursWhenYouSignIn: 'Omat {{lista}}, kun kirjaudut sisään',
  yoursWhenYouSignInSubtitle: '{{lista}} säilyttää Weë-yhteytesi. Kirjaudu sisään nähdäksesi ne.',
  noneYet: 'Sinulla ei ole vielä {{lista}}-yhteyksiä',
  noneYetSubtitle: 'Täällä ovat sinun ihmisesi Weë-yhteisössä. Yhteys syntyy kahden välillä: toinen ehdottaa sitä ja toinen hyväksyy.',
  noAgenda: 'Tällä profiililla ei ole yhteystietoja',
  noAgendaSubtitle: '{{lista}} on paikka, jossa ovat yhteytesi muihin ihmisiin. Vaihda Oikeaan profiiliin tai Weë-profiiliin nähdäksesi ne.',
  wantsToConnect: '{{lista}} · haluaa luoda yhteyden kanssasi',
  accept: 'Hyväksy {{nombre}}',
  reject: 'Hylkää {{nombre}}',
  withdraw: 'Peru pyyntösi käyttäjälle {{nombre}}',
  removeFrom: 'Poista {{nombre}} omista {{lista}}-yhteyksistä',
  openProfile: 'Avaa käyttäjän {{nombre}} {{etiqueta}}',
  rejectTitle: 'Hylkää pyyntö',
  rejectConfirm: 'Hylätäänkö pyyntö käyttäjältä {{nombre}}?',
  withdrawTitle: 'Peru pyyntö',
  withdrawConfirm: 'Perutaanko pyyntösi käyttäjälle {{nombre}}?',
  removeTitle: 'Poista {{lista}}',
  removeConfirm: 'Poistetaanko {{nombre}} omista {{lista}}-yhteyksistä?',
  failed: 'Ei onnistunut',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'tämä henkilö',
  acceptLabel: 'Hyväksy {{lista}}',
  rejectRequestLabel: 'Hylkää {{lista}}-pyyntö',
  requestSent: 'Pyyntö lähetetty',
  errSignIn: 'Kirjaudu sisään käyttääksesi ËContact-palvelua.',
  errNotYours: 'Tuo profiili ei ole sinun.',
  errNotAPerson: 'Tuo profiili ei voi käyttää ËContact-palvelua.',
  errSameProfile: 'Profiili ei voi luoda yhteyttä itseensä.',
  errOffline: 'Yhteyttä Weë-palveluun ei saatu.',
  errNoRequestToReject: 'Sinulla ei ole pyyntöä, jonka voisi hylätä.',
  errNoPendingRequest: 'Sinulla ei ole odottavaa pyyntöä tämän profiilin kanssa.',
  errNotConnected: 'Et ole yhteydessä tähän profiiliin.',
  errNoActiveProfile: 'Ei aktiivista profiilia, jolla tämän voisi tehdä.',
};
