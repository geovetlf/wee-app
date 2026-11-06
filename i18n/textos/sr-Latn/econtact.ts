/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica) — ËContact y ẄContact. Los dos nombres son marca —cambian con el
 * perfil activo— y entran por {{lista}}, sin traducir ni declinar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres de persona ({{nombre}}) tampoco se declinan: se coloca el hueco
 * donde el serbio admite el nominativo. `count` lleva one / few / other, las
 * tres con {{contador}} (la marca no cambia de forma).
 */
import { ConPlurales } from '../ru/plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Primljeni zahtevi',
  requestsSent: 'Poslati zahtevi',
  yours: 'Tvoji {{lista}}',
  yoursWhenYouSignIn: 'Tvoji {{lista}}, kada se prijaviš',
  yoursWhenYouSignInSubtitle: '{{lista}} čuva tvoje veze u aplikaciji Weë. Prijavi se da ih vidiš.',
  noneYet: 'Još nemaš {{lista}}',
  noneYetSubtitle: 'Ovde će biti tvoji ljudi u aplikaciji Weë. Veza nastaje između dvoje: jedna osoba je predloži, a druga prihvati.',
  noAgenda: 'Ovaj profil nema imenik',
  noAgendaSubtitle: '{{lista}} je mesto gde su tvoje veze s drugim ljudima. Pređi na svoj Pravi profil ili Weë profil da ih vidiš.',
  wantsToConnect: '{{lista}} · želi da se poveže s tobom',
  accept: 'Prihvati {{nombre}}',
  reject: 'Odbij {{nombre}}',
  withdraw: 'Povuci zahtev za {{nombre}}',
  removeFrom: 'Ukloni {{nombre}} iz svojih {{lista}}',
  openProfile: 'Otvori {{etiqueta}} korisnika {{nombre}}',
  rejectTitle: 'Odbij zahtev',
  rejectConfirm: 'Odbiti zahtev od {{nombre}}?',
  withdrawTitle: 'Povuci zahtev',
  withdrawConfirm: 'Povući zahtev za {{nombre}}?',
  removeTitle: 'Ukloni {{lista}}',
  removeConfirm: 'Ukloniti {{nombre}} iz svojih {{lista}}?',
  failed: 'Nije uspelo',
  count_one: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'ova osoba',
  acceptLabel: 'Prihvati {{lista}}',
  rejectRequestLabel: 'Odbij zahtev za {{lista}}',
  requestSent: 'Zahtev je poslat',
  errSignIn: 'Prijavi se da koristiš ËContact.',
  errNotYours: 'Taj profil nije tvoj.',
  errNotAPerson: 'Taj profil ne može da koristi ËContact.',
  errSameProfile: 'Profil ne može da se poveže sam sa sobom.',
  errOffline: 'Nije bilo moguće povezati se sa aplikacijom Weë.',
  errNoRequestToReject: 'Nema nijednog zahteva koji bi mogao da se odbije.',
  errNoPendingRequest: 'Nemaš nijedan zahtev na čekanju s ovim profilom.',
  errNotConnected: 'Nemaš vezu s ovim profilom.',
  errNoActiveProfile: 'Nema aktivnog profila s kojim bi ovo moglo da se uradi.',
};
