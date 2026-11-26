/*
 * BOSNIO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Ni la marca ({{lista}}) ni el nombre de la persona ({{nombre}}) se declinan:
 * donde el caso lo pide va el sustantivo puente («korisnika {{nombre}}»,
 * «s liste {{lista}}»).
 *
 * PLURALES: one / few / other. `count` lleva `_few` y las tres formas llevan
 * {{contador}}: la marca es indeclinable, así que las tres se leen igual.
 */
import { ConPlurales } from '../ru/plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Primljeni zahtjevi',
  requestsSent: 'Poslani zahtjevi',
  yours: 'Tvoj {{lista}}',
  yoursWhenYouSignIn: 'Tvoj {{lista}}, kad se prijaviš',
  yoursWhenYouSignInSubtitle: '{{lista}} čuva tvoje veze u aplikaciji Weë. Prijavi se da ih vidiš.',
  noneYet: 'Tvoj {{lista}} je još prazan',
  noneYetSubtitle: 'Ovdje će biti tvoji ljudi u aplikaciji Weë. Veza se pravi udvoje: jedna osoba je predloži, a druga prihvati.',
  noAgenda: 'Ovaj profil nema imenik',
  noAgendaSubtitle: '{{lista}} je mjesto gdje su tvoje veze s drugim ljudima. Prebaci se na svoj Pravi profil ili Weë profil da ih vidiš.',
  wantsToConnect: '{{lista}} · želi se povezati s tobom',
  accept: 'Prihvati korisnika {{nombre}}',
  reject: 'Odbij korisnika {{nombre}}',
  withdraw: 'Povuci zahtjev korisniku {{nombre}}',
  removeFrom: 'Ukloni korisnika {{nombre}} s liste {{lista}}',
  openProfile: 'Otvori {{etiqueta}} korisnika {{nombre}}',
  rejectTitle: 'Odbij zahtjev',
  rejectConfirm: 'Odbiti zahtjev korisnika {{nombre}}?',
  withdrawTitle: 'Povuci zahtjev',
  withdrawConfirm: 'Povući svoj zahtjev korisniku {{nombre}}?',
  removeTitle: 'Ukloni s liste {{lista}}',
  removeConfirm: 'Ukloniti korisnika {{nombre}} s liste {{lista}}?',
  failed: 'Nije uspjelo',
  count_one: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'ova osoba',
  acceptLabel: 'Prihvati {{lista}}',
  rejectRequestLabel: 'Odbij {{lista}} zahtjev',
  requestSent: 'Zahtjev poslan',
  errSignIn: 'Prijavi se da koristiš ËContact.',
  errNotYours: 'Taj profil nije tvoj.',
  errNotAPerson: 'Taj profil ne može koristiti ËContact.',
  errSameProfile: 'Profil se ne može povezati sam sa sobom.',
  errOffline: 'Nije moguće povezati se s aplikacijom Weë.',
  errNoRequestToReject: 'Nema zahtjeva koji bi se mogao odbiti.',
  errNoPendingRequest: 'Nemaš nijedan zahtjev na čekanju s ovim profilom.',
  errNotConnected: 'Nemaš vezu s ovim profilom.',
  errNoActiveProfile: 'Nema aktivnog profila s kojim bi se to moglo uraditi.',
};
