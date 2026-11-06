/*
 * ËContact y ẄContact en croata. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). El nombre de la persona entra sin declinar; donde el croata
 * pide un caso se apoya en «korisnik» («zahtjev korisnika {{nombre}}»).
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `count`. La marca
 * {{lista}} no se declina, así que las tres formas son iguales y llevan
 * {{contador}} —nunca un «1» a mano—.
 */
import { ConPlurales } from '../ru/plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Primljeni zahtjevi',
  requestsSent: 'Poslani zahtjevi',
  yours: 'Tvoji {{lista}}',
  yoursWhenYouSignIn: 'Tvoji {{lista}}, kad se prijaviš',
  yoursWhenYouSignInSubtitle: '{{lista}} čuva tvoje veze u aplikaciji Weë. Prijavi se da ih vidiš.',
  noneYet: 'Još nemaš {{lista}}',
  noneYetSubtitle: 'Ovdje će biti tvoji ljudi u aplikaciji Weë. Veza se stvara udvoje: jedna je osoba predloži, a druga prihvati.',
  noAgenda: 'Ovaj profil nema imenik',
  noAgendaSubtitle: '{{lista}} je mjesto gdje su tvoje veze s drugim ljudima. Prebaci se na svoj Pravi profil ili Weë profil da ih vidiš.',
  wantsToConnect: '{{lista}} · želi se povezati s tobom',
  accept: 'Prihvati {{nombre}}',
  reject: 'Odbij {{nombre}}',
  withdraw: 'Povuci zahtjev za {{nombre}}',
  removeFrom: 'Ukloni {{nombre}} iz svojih {{lista}}',
  openProfile: 'Otvori {{etiqueta}} korisnika {{nombre}}',
  rejectTitle: 'Odbij zahtjev',
  rejectConfirm: 'Odbiti zahtjev korisnika {{nombre}}?',
  withdrawTitle: 'Povuci zahtjev',
  withdrawConfirm: 'Povući svoj zahtjev za {{nombre}}?',
  removeTitle: 'Ukloni {{lista}}',
  removeConfirm: 'Ukloniti {{nombre}} iz svojih {{lista}}?',
  failed: 'Nije bilo moguće dovršiti',
  count_one: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'ova osoba',
  acceptLabel: 'Prihvati {{lista}}',
  rejectRequestLabel: 'Odbij zahtjev za {{lista}}',
  requestSent: 'Zahtjev poslan',
  errSignIn: 'Prijavi se da koristiš ËContact.',
  errNotYours: 'Taj profil nije tvoj.',
  errNotAPerson: 'Taj profil ne može koristiti ËContact.',
  errSameProfile: 'Profil se ne može povezati sam sa sobom.',
  errOffline: 'Nije bilo moguće povezati se s aplikacijom Weë.',
  errNoRequestToReject: 'Nema nijednog zahtjeva koji bi se mogao odbiti.',
  errNoPendingRequest: 'Nemaš nijedan zahtjev na čekanju s ovim profilom.',
  errNotConnected: 'Ovaj profil nije među tvojim vezama.',
  errNoActiveProfile: 'Nema aktivnog profila s kojim bi se to moglo napraviti.',
};
