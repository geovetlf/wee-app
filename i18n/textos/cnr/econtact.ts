/*
 * ËContact y ẄContact en montenegrino (ijekaviano, latino). Los dos nombres son marca y entran por {{lista}} sin declinar;
 * los nombres de persona entran por {{nombre}} y tampoco se declinan (no se pega ninguna letra al hueco).
 * `count` lleva las tres formas (one / few / other) con {{contador}}.
 */
import { ConPlurales } from '../ru/plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Primljeni zahtjevi',
  requestsSent: 'Poslati zahtjevi',
  yours: 'Tvoji {{lista}}',
  yoursWhenYouSignIn: 'Tvoji {{lista}}, kad se prijaviš',
  yoursWhenYouSignInSubtitle: '{{lista}} čuva tvoje veze u aplikaciji Weë. Prijavi se da ih vidiš.',
  noneYet: 'Još nemaš {{lista}}',
  noneYetSubtitle: 'Ovdje će biti tvoji ljudi u aplikaciji Weë. Veza se pravi udvoje: jedna osoba je predloži, a druga prihvati.',
  noAgenda: 'Ovaj profil nema imenik',
  noAgendaSubtitle: '{{lista}} je mjesto gdje su tvoje veze s drugim ljudima. Pređi na svoj Pravi profil ili Weë profil da ih vidiš.',
  wantsToConnect: '{{lista}} · želi da se poveže s tobom',
  accept: 'Prihvati {{nombre}}',
  reject: 'Odbij {{nombre}}',
  withdraw: 'Povuci zahtjev za {{nombre}}',
  removeFrom: 'Ukloni {{nombre}} iz svojih {{lista}}',
  openProfile: 'Otvori {{etiqueta}} korisnika {{nombre}}',
  rejectTitle: 'Odbij zahtjev',
  rejectConfirm: 'Odbiti zahtjev od {{nombre}}?',
  withdrawTitle: 'Povuci zahtjev',
  withdrawConfirm: 'Povući svoj zahtjev za {{nombre}}?',
  removeTitle: 'Ukloni {{lista}}',
  removeConfirm: 'Ukloniti {{nombre}} iz svojih {{lista}}?',
  failed: 'Nije moglo da se završi',
  count_one: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'ova osoba',
  acceptLabel: 'Prihvati {{lista}}',
  rejectRequestLabel: 'Odbij zahtjev za {{lista}}',
  requestSent: 'Zahtjev je poslat',
  errSignIn: 'Prijavi se da koristiš ËContact.',
  errNotYours: 'Taj profil nije tvoj.',
  errNotAPerson: 'Taj profil ne može da koristi ËContact.',
  errSameProfile: 'Profil ne može da se poveže sam sa sobom.',
  errOffline: 'Povezivanje s Weë nije uspjelo.',
  errNoRequestToReject: 'Nema nijednog tvog zahtjeva koji bi se odbio.',
  errNoPendingRequest: 'Nemaš nijedan zahtjev na čekanju s ovim profilom.',
  errNotConnected: 'Nemaš vezu s ovim profilom.',
  errNoActiveProfile: 'Nema aktivnog profila s kojim bi se ovo uradilo.',
};
