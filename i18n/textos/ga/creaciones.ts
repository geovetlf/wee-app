/*
 * IRLANDÉS — Mis creaciones: la biblioteca de material de la CUENTA y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo. «cruthú» (creación) lleva las cinco formas de Intl con la mutación en
 * la palabra: «cruthú / chruthú / chruthú / gcruthú / cruthú». Los nombres de
 * experiencias llegan por hueco y no se traducen; «Próifíl Weë» muta solo en la
 * palabra irlandesa («ón bPróifíl Weë»), nunca en la marca.
 */
import { ConPlurales } from './plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Mo chruthuithe',
  intro: 'Gach a bhfuil cruthaithe agat le Weë AI, in aon áit amháin. Is le do chuntas é: feiceann tú mar an gcéanna é ón bhFíorphróifíl agus ón bPróifíl Weë.',

  /* Filtros por tipo. */
  filterAll: 'Uile',
  filterImages: 'Íomhánna',
  filterVideos: 'Físeáin',
  filterAudio: 'Fuaim',
  filterDocuments: 'Doiciméid',
  filterModel3d: '3D',
  filterLabel: 'Scag de réir cineáil',

  /* Orden. */
  sortRecent: 'Is déanaí',
  sortOldest: 'Is sine',
  sortLabel: 'Sórtáil',

  /* Estados de la lista. */
  loading: 'Do chruthuithe á lódáil…',
  loadFailed: 'Níorbh fhéidir linn do chruthuithe a lódáil.',
  retry: 'Bain triail eile as',
  loadMore: 'Lódáil tuilleadh',
  emptyTitle: 'Níl aon chruthuithe agat fós',
  emptyText: 'Gach a ndéanann tú le Weë AI, beidh sé le feiceáil anseo, lena íomhá, lena fhíseán nó lena fhuaim.',
  emptyAction: 'Cruthaigh rud éigin le Weë AI',
  emptyFiltered: 'Níl aon chruthuithe den chineál seo ann.',
  count_one: '{{contador}} cruthú',
  count_two: '{{contador}} chruthú',
  count_few: '{{contador}} chruthú',
  count_many: '{{contador}} gcruthú',
  count_other: '{{contador}} cruthú',

  /* Estados de una creación. */
  statusUploading: 'Á uaslódáil',
  statusProcessing: 'Á phróiseáil',
  statusReady: 'Réidh',
  statusFailed: 'Níor éirigh leis',
  statusDeleted: 'Scriosta',
  pendingDeletion: 'Bainfear an comhad go luath.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Íomhá',
  kindVideo: 'Físeán',
  kindAudio: 'Fuaim',
  kindDocument: 'Doiciméad',
  kindModel3d: '3D',
  kindText: 'Téacs',

  /* Acciones sobre una creación. */
  open: 'Oscail',
  openCreation: 'Oscail an cruthú: {{nombre}}',
  download: 'Íoslódáil',
  downloaded: 'Sábháilte i do ghailearaí.',
  downloadFailed: 'Níorbh fhéidir linn é a íoslódáil. Bain triail eile as.',
  downloadPermission: 'Tá cead ag teastáil ó Weë chun sábháil i do ghailearaí.',
  savedInCreations: 'Sábháilte i do chruthuithe',
  save: 'Sábháil',
  saved: 'Sábháilte',
  useInProject: 'Úsáid i dtionscadal',
  publish: 'Foilsigh',
  share: 'Roinn',
  delete: 'Scrios',
  deleteConfirm: 'An cruthú seo a scriosadh? Scriostar an comhad. Ní athraíonn a bhfuil foilsithe agat cheana.',
  deleteConfirmWeb: 'An cruthú seo a scriosadh? Scriostar an comhad. Ní athraíonn a bhfuil foilsithe agat cheana.',
  deleted: 'Cruthú scriosta.',
  deleteFailed: 'Níorbh fhéidir linn é a scriosadh. Bain triail eile as.',
  createdWith: 'Cruthaithe le {{nombre}}',
  createdOn: 'Cruthaithe an {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: 'Tá {{nombre}} ag obair',
  progressStarting: 'Ag tosú…',
  progressSteps: '{{hechos}} as {{total}} céim réidh',
  progressFindLater: 'Is féidir leat an scáileán seo a fhágáil; gheobhaidh tú é in “Mo chruthuithe” nuair a bheidh sé réidh.',

  /* Mundos 3D: su tipo, el visor que aún no existe y lo que deja hacer la licencia. */
  filterWorlds: 'Domhain 3D',
  kindWorld: 'Domhan 3D',
  noViewer3d: 'Níl amharcóir 3D ag Weë go fóill. Íoslódáil é chun é a oscailt in aip 3D.',
  rightsTitle: 'Cad is féidir leat a dhéanamh leis',
  rightsProvenance: 'Déanta le hIS ar Weë, le samhail tríú páirtí a bhfuil a ceadúnas féin aici.',
  rightsCommercialAllowed: 'Is féidir leat é a úsáid chun críocha tráchtála.',
  rightsCommercialRestricted: 'Tá coinníollacha ag baint lena úsáid tráchtála.',
  rightsCommercialUnclear: 'Níl sé soiléir go fóill an féidir é a úsáid chun críocha tráchtála.',
  rightsCommercialNotAllowed: 'Ní féidir é a úsáid chun críocha tráchtála.',
  rightsAttribution: 'Éilíonn a cheadúnas aitheantas a thabhairt.',
  rightsBlockedIn: 'Ní féidir é a úsáid ná a thaispeáint in: {{lugares}}.',
};
