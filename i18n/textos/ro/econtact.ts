/*
 * RUMANO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran por {{lista}}, sin artículo ni declinación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El rumano no puede pegarle a un hueco ni el artículo ni el «pe» con clítico
 * («acceptă-l pe…», que exige saber el género): por eso aquí se acepta o se
 * rechaza «cererea de la {{nombre}}» (la solicitud de…) y la lista es «lista
 * ta de {{lista}}». El contador lleva las tres formas: «20 de ËContact».
 */
import { ConPlurales } from '../ru/plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Cereri primite',
  requestsSent: 'Cereri trimise',
  yours: 'Lista ta de {{lista}}',
  yoursWhenYouSignIn: 'Lista ta de {{lista}}, când te conectezi',
  yoursWhenYouSignInSubtitle: '{{lista}} păstrează conexiunile tale din Weë. Conectează-te pentru a le vedea.',
  noneYet: 'Încă nu ai {{lista}}',
  noneYetSubtitle: 'Aici vor fi oamenii tăi din Weë. O conexiune se face în doi: o persoană o propune și cealaltă acceptă.',
  noAgenda: 'Acest profil nu are agendă',
  noAgendaSubtitle: '{{lista}} este locul unde se află conexiunile tale cu alte persoane. Treci la Profilul tău real sau la Profilul tău Weë pentru a le vedea.',
  wantsToConnect: '{{lista}} · vrea să se conecteze cu tine',
  accept: 'Acceptă cererea de la {{nombre}}',
  reject: 'Refuză cererea de la {{nombre}}',
  withdraw: 'Retrage cererea către {{nombre}}',
  removeFrom: 'Elimină {{nombre}} din lista ta de {{lista}}',
  openProfile: 'Deschide {{etiqueta}} pentru {{nombre}}',
  rejectTitle: 'Refuză cererea',
  rejectConfirm: 'Refuzi cererea de la {{nombre}}?',
  withdrawTitle: 'Retrage cererea',
  withdrawConfirm: 'Retragi cererea ta către {{nombre}}?',
  removeTitle: 'Elimină {{lista}}',
  removeConfirm: 'Elimini {{nombre}} din lista ta de {{lista}}?',
  failed: 'Acțiunea nu a putut fi finalizată',
  count_one: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_other: '{{contador}} de {{lista}}',
  somePerson: 'această persoană',
  acceptLabel: 'Acceptă {{lista}}',
  rejectRequestLabel: 'Refuză cererea de {{lista}}',
  requestSent: 'Cerere trimisă',
  errSignIn: 'Conectează-te pentru a folosi ËContact.',
  errNotYours: 'Acel profil nu este al tău.',
  errNotAPerson: 'Acel profil nu poate folosi ËContact.',
  errSameProfile: 'Un profil nu se poate conecta cu el însuși.',
  errOffline: 'Nu s-a putut stabili conexiunea cu Weë.',
  errNoRequestToReject: 'Nu există nicio cerere a ta de refuzat.',
  errNoPendingRequest: 'Nu ai nicio cerere în așteptare cu acest profil.',
  errNotConnected: 'Nu ai nicio conexiune cu acest profil.',
  errNoActiveProfile: 'Nu există niciun profil activ cu care să faci asta.',
};
