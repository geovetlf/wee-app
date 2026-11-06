/*
 * IRLANDÉS — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran
 * como valor, no se traducen ni se mutan (por eso «in ËContact» y nunca «le hËContact»).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `count` cuenta una marca, que no muta: las cinco formas son iguales y todas llevan `{{contador}}`
 * (el español escribe «1» a mano en `_one`; aquí no, porque el número lo pone Intl).
 */
import { ConPlurales } from './plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Iarratais faighte',
  requestsSent: 'Iarratais seolta',
  yours: 'Do {{lista}}',
  yoursWhenYouSignIn: 'Do {{lista}}, nuair a logálann tú isteach',
  yoursWhenYouSignInSubtitle: 'Coinníonn {{lista}} do naisc ar Weë. Logáil isteach chun iad a fheiceáil.',
  noneYet: 'Níl aon {{lista}} agat fós',
  noneYetSubtitle: 'Anseo a bheidh do mhuintir ar Weë. Déantar nasc idir beirt: molann duine amháin é agus glacann an duine eile leis.',
  noAgenda: 'Níl aon liosta teagmhálaithe ag an bpróifíl seo',
  noAgendaSubtitle: 'Is in {{lista}} atá do naisc le daoine eile. Athraigh go dtí d\'Fhíorphróifíl nó go dtí do Phróifíl Weë chun iad a fheiceáil.',
  wantsToConnect: '{{lista}} · ag iarraidh nascadh leat',
  accept: 'Glac le {{nombre}}',
  reject: 'Diúltaigh do {{nombre}}',
  withdraw: 'Tarraing siar an t-iarratas chuig {{nombre}}',
  removeFrom: 'Bain {{nombre}} de do {{lista}}',
  openProfile: 'Oscail {{etiqueta}} {{nombre}}',
  rejectTitle: 'Diúltaigh don iarratas',
  rejectConfirm: 'Diúltú d\'iarratas {{nombre}}?',
  withdrawTitle: 'Tarraing siar an t-iarratas',
  withdrawConfirm: 'D\'iarratas chuig {{nombre}} a tharraingt siar?',
  removeTitle: 'Bain {{lista}}',
  removeConfirm: '{{nombre}} a bhaint de do {{lista}}?',
  failed: 'Níorbh fhéidir é a chur i gcrích',
  count_one: '{{contador}} {{lista}}',
  count_two: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_many: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'an duine seo',
  acceptLabel: 'Glac le {{lista}}',
  rejectRequestLabel: 'Diúltaigh d\'iarratas {{lista}}',
  requestSent: 'Iarratas seolta',
  errSignIn: 'Logáil isteach chun ËContact a úsáid.',
  errNotYours: 'Ní leatsa an phróifíl sin.',
  errNotAPerson: 'Ní féidir leis an bpróifíl sin ËContact a úsáid.',
  errSameProfile: 'Ní féidir le próifíl nascadh léi féin.',
  errOffline: 'Níorbh fhéidir nascadh le Weë.',
  errNoRequestToReject: 'Níl aon iarratas uait le diúltú.',
  errNoPendingRequest: 'Níl aon iarratas ar feitheamh agat leis an bpróifíl seo.',
  errNotConnected: 'Níl tú nasctha leis an bpróifíl seo.',
  errNoActiveProfile: 'Níl aon phróifíl ghníomhach ann chun é seo a dhéanamh.',
};
